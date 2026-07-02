import React, { useState, useRef, useEffect, useMemo } from 'react';
import { CONFIG } from '../config';

interface WhaleChatProps {
  onBack: () => void;
  studentId?: string;
  studentName?: string;
}

interface Message {
  sender: 'user' | 'whale';
  text: string;
}

// 💡 true일 때는 시뮬레이션 모드, false로 바꾸면 실제 제미나이 API를 호출합니다.
const IS_TEST_MODE = true; 

export default function WhaleChat({ onBack, studentId = "ST_TEST", studentName = "테스트학생" }: WhaleChatProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [allSentences, setAllSentences] = useState<any[]>([]);

  // 1️⃣ 진도 맞춤형 대화를 위한 드롭다운 상태
  const [book, setBook] = useState('');
  const [unit, setUnit] = useState('');
  const [day, setDay] = useState('');
  const [isChatStarted, setIsChatStarted] = useState(false);
  const [targetKeywords, setTargetKeywords] = useState<string>('');

  // 2️⃣ 채팅 및 음성 인식 상태
  const [messages, setMessages] = useState<Message[]>([
    { sender: 'whale', text: "Hello! I'm your AI English friend, Whale. Choose your lesson and let's talk! (안녕! 난 너의 AI 영어 친구 고래야. 단원을 선택하고 대화를 시작하자!)" }
  ]);
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false); // 마이크 작동 여부
  const [isAIThinking, setIsAIThinking] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // 스크롤 하단 자동 이동
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 3️⃣ 구글 시트에서 문장/단어 데이터 로드 (AI에게 "오늘의 핵심 학습 범위"를 인지시키기 위함)
  useEffect(() => {
    const fetchSheetData = async () => {
      try {
        const response = await fetch(CONFIG.SHEETS.ELEM_SENTENCE);
        const csvText = await response.text();
        const rows = csvText.split(/\r?\n/);
        const parsed: any[] = [];

        rows.forEach((row, idx) => {
          if (idx === 0 || !row.trim()) return;
          // 간단한 쉼표 파싱 (Sentence.tsx와 동일 규격)
          const cells = row.split(',').map(c => c.replace(/^"|"$/g, '').trim());
          if (cells.length >= 6) {
            parsed.push({ book: cells[0], lesson: cells[1], day: cells[2], eng: cells[4], kor: cells[5] });
          }
        });
        setAllSentences(parsed);
        setIsLoading(false);
      } catch (err) {
        console.error("데이터 로드 실패:", err);
        setIsLoading(false);
      }
    };
    fetchSheetData();
  }, []);

  // 드롭다운 바인딩용 필터
  const books = useMemo(() => Array.from(new Set(allSentences.map(s => s.book))).filter(Boolean).sort(), [allSentences]);
  const units = useMemo(() => Array.from(new Set(allSentences.filter(s => s.book === book).map(s => s.lesson))).filter(Boolean), [allSentences, book]);
  const days = useMemo(() => Array.from(new Set(allSentences.filter(s => s.book === book && s.lesson === unit).map(s => s.day))).filter(Boolean), [allSentences, book, unit]);

  // 4️⃣ 크롬 내장 음성인식(STT) 설정
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US'; // 영어 음성 인식

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onresult = (event: any) => {
        const speechToText = event.results[0][0].transcript;
        setInput(speechToText);
      };
      recognition.onerror = (err: any) => console.error("음성 인식 오류:", err);
      recognitionRef.current = recognition;
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("이 브라우저는 음성 인식을 지원하지 않습니다. (크롬 권장)");
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
  };

  // TTS 원어민 발음 기능 (괄호 안의 한국어는 읽지 않음)
  const speakWhale = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const englishPart = text.split('(')[0].trim();
      const utterance = new SpeechSynthesisUtterance(englishPart);
      utterance.lang = 'en-US';
      utterance.rate = 0.95; // 아이들이 듣기 좋은 약간 느린 속도
      window.speechSynthesis.speak(utterance);
    }
  };

  // 5️⃣ 대화 시작: 선택한 진도의 문장들을 수집하여 AI 프롬프트 기반 마련
  const handleStartChat = () => {
    if (!book || !unit || !day) {
      alert("교재, Unit, Day를 모두 선택해주세요.");
      return;
    }
    const filtered = allSentences.filter(s => s.book === book && s.lesson === unit && s.day === day);
    const keywords = filtered.map(s => `[Eng: ${s.eng} / Kor: ${s.kor}]`).join(', ');
    setTargetKeywords(keywords);
    setIsChatStarted(true);

    const welcomeMsg = `Great! Let's talk about today's lesson. Are you ready? (좋아! 오늘 배운 단원으로 대화해 보자. 준비됐니?)`;
    setMessages([{ sender: 'whale', text: welcomeMsg }]);
    speakWhale(welcomeMsg);
  };

  // 6️⃣ 제미나이 AI 호출 코어 로직
  const fetchGeminiResponse = async (userMessage: string, history: Message[]) => {
    if (IS_TEST_MODE) {
      // 테스트 시뮬레이션 모드 작동
      await new Promise(res => setTimeout(res, 1000));
      const mockReplies = [
        `That sounds wonderful! Can you use "${book}" words again? (멋진 말이네! 오늘 배운 표현을 다시 써볼래?)`,
        `Good job! Tell me more about it. (잘했어! 그것에 대해 더 자세히 말해줘.)`,
        `I understand! You are doing great. (이해했어! 정말 잘하고 있어.)`
      ];
      return mockReplies[Math.floor(Math.random() * mockReplies.length)];
    }

    // 💡 실제 제미나이 1.5 플래시 API 연동 규격
    const apiKey = CONFIG.GEMINI.API_KEY;
    const model = CONFIG.GEMINI.MODEL || "gemini-1.5-flash";
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    // 제미나이가 인식할 대화 히스토리 포맷 변환
    const contents = [
      {
        role: "user",
        parts: [{
          text: `You are 'Whale', a friendly AI English tutor for elementary school students. 
          The student is currently learning these target sentences: ${targetKeywords}.
          
          [Rules]
          1. Speak in VERY simple, short English (under 2 sentences).
          2. Try to naturally guide the student to practice or use the target expressions.
          3. At the very end of your response, ALWAYS provide a natural Korean translation inside parentheses, like this: "Hello! (안녕!)"
          4. Keep the conversation engaging and encouraging.`
        }]
      },
      ...history.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }]
      })),
      {
        role: "user",
        parts: [{ text: userMessage }]
      }
    ];

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents })
    });

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
  };

  // 7️⃣ 대화 전송 및 완료 처리
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isAIThinking) return;

    const userText = input;
    const updatedMessages = [...messages, { sender: 'user', text: userText } as Message];
    setMessages(updatedMessages);
    setInput('');
    setIsAIThinking(true);

    try {
      const aiReply = await fetchGeminiResponse(userText, messages);
      setMessages(prev => [...prev, { sender: 'whale', text: aiReply }]);
      speakWhale(aiReply);
    } catch (err) {
      console.error("AI 응답 오류:", err);
      setMessages(prev => [...prev, { sender: 'whale', text: "Sorry, something went wrong. (미안해, 오류가 발생했어.)" }]);
    } finally {
      setIsAIThinking(false);
    }
  };

  // 대화 종료 및 구글 시트 저장
  const handleFinishChat = async () => {
    if (window.confirm("AI 대화를 종료하고 학습 기록을 저장할까요?")) {
      try {
        await fetch(CONFIG.WEB_APP_URL, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({
            type: "saveLog",
            studentId,
            studentName,
            taskType: "AI회화",
            status: "완료",
            score: "100" // 통과 여부 개념으로 100점 부여
          }),
        });
        alert("학습 결과가 구글 시트에 안전하게 기록되었습니다!");
      } catch (err) {
        console.error("로그 저장 실패:", err);
      }
      onBack();
    }
  };

  if (isLoading) {
    return <div style={{ textAlign: 'center', marginTop: '100px' }}><h2>🐋 고래 엔진 가동 중...</h2></div>;
  }

  return (
    <div style={{ fontFamily: 'Pretendard, sans-serif', padding: '16px', maxWidth: '500px', margin: '0 auto', height: '92vh', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
      
      {/* 상단 헤더 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <button onClick={onBack} style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #ccc', backgroundColor: 'white', cursor: 'pointer' }}>← 나가기</button>
        <span style={{ fontWeight: 'bold', color: '#007aff' }}>Whale Chat 💬</span>
        {isChatStarted && (
          <button onClick={handleFinishChat} style={{ padding: '6px 12px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>종료/저장</button>
        )}
      </div>

      {/* 진도 선택창 (대화 시작 전에만 표시) */}
      {!isChatStarted ? (
        <div style={{ padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '16px', textAlign: 'center', border: '1px solid #e9ecef' }}>
          <h3 style={{ margin: '0 0 16px 0' }}>오늘 말하기 연습할 단원 선택</h3>
          <div style={{ display: 'flex', gap: '6px', marginBottom: '16px' }}>
            <select value={book} onChange={(e) => { setBook(e.target.value); setUnit(''); setDay(''); }} style={selectStyle}>
              <option value="">교재</option>
              {books.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
            <select value={unit} onChange={(e) => { setUnit(e.target.value); setDay(''); }} disabled={!book} style={selectStyle}>
              <option value="">Unit</option>
              {units.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
            <select value={day} onChange={(e) => setDay(e.target.value)} disabled={!unit} style={selectStyle}>
              <option value="">Day</option>
              {days.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <button onClick={handleStartChat} style={{ width: '100%', padding: '14px', backgroundColor: '#007aff', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer' }}>고래 친구와 대화 시작하기 🚀</button>
        </div>
      ) : (
        /* 채팅 인터페이스 영역 */
        <>
          <div style={{ flex: 1, backgroundColor: '#f0f4f8', borderRadius: '16px', padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {messages.map((msg, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{ 
                  maxWidth: '80%', padding: '12px 16px', borderRadius: '16px', fontSize: '15px', lineHeight: '1.4',
                  backgroundColor: msg.sender === 'user' ? '#007aff' : 'white', 
                  color: msg.sender === 'user' ? 'white' : '#333',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                }}>
                  {msg.text}
                </div>
              </div>
            ))}
            {isAIThinking && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{ padding: '12px 16px', backgroundColor: '#e2e8f0', borderRadius: '16px', color: '#666', fontSize: '14px' }}>🐋 고래가 문장을 생각하고 있어요...</div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* 입력창 및 음성인식 버튼 기능 */}
          <form onSubmit={handleSend} style={{ marginTop: '12px', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button type="button" onClick={toggleListening} style={{
              width: '50px', height: '50px', borderRadius: '50%', border: 'none',
              backgroundColor: isListening ? '#dc3545' : '#6c757d', color: 'white',
              fontSize: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
            }}>
              {isListening ? "🛑" : "🎙️"}
            </button>
            <input 
              value={input} 
              onChange={(e) => setInput(e.target.value)} 
              placeholder={isListening ? "말씀하세요..." : "영어로 대답을 입력하거나 마이크를 누르세요"} 
              disabled={isAIThinking}
              style={{ flex: 1, padding: '14px', borderRadius: '24px', border: '1px solid #ccc', outline: 'none', fontSize: '15px' }} 
            />
            <button type="submit" disabled={!input.trim() || isAIThinking} style={{
              padding: '14px 20px', backgroundColor: '#007aff', color: 'white', border: 'none', borderRadius: '24px', fontWeight: 'bold', cursor: 'pointer'
            }}>전송</button>
          </form>
        </>
      )}
    </div>
  );
}

const selectStyle = {
  width: '33.3%',
  padding: '10px',
  borderRadius: '8px',
  border: '1px solid #ccc',
  fontSize: '14px',
  backgroundColor: 'white'
};