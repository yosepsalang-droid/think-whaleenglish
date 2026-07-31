import React, { useState, useRef, useEffect, useMemo } from 'react';
import { CONFIG } from '../config';
import { supabase } from '../lib/supabase';

interface WhaleChatProps {
  onBack: () => void;
  studentId?: string;
  studentName?: string;
  currentBook?: string;
}

interface Message {
  sender: 'user' | 'whale' | 'system';
  text: string;
}

const IS_TEST_MODE = false; 

export default function WhaleChat({ onBack, studentId = "ST_TEST", studentName = "테스트학생", currentBook = "" }: WhaleChatProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [availableLessons, setAvailableLessons] = useState<any[]>([]);

  const [book, setBook] = useState(currentBook);
  const [unit, setUnit] = useState('');
  const [day, setDay] = useState('');
  
  const [isChatStarted, setIsChatStarted] = useState(false);
  const [isChatEnded, setIsChatEnded] = useState(false);
  
  const [systemPrompt, setSystemPrompt] = useState<string>('');
  const [apiHistory, setApiHistory] = useState<any[]>([]);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isAIThinking, setIsAIThinking] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const fetchLessons = async () => {
      try {
        const { data, error } = await supabase.from('sentences').select('book, unit, day');
        if (error) throw error;
        setAvailableLessons(data || []);
      } catch (err) {
        console.error("진도 데이터 로드 실패:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchLessons();
  }, []);

  useEffect(() => {
    if (currentBook) setBook(currentBook);
  }, [currentBook]);

  const books = useMemo(() => {
    const uniqueBooks = Array.from(new Set(availableLessons.map(s => s.book?.trim()))).filter(Boolean);
    const order = ['240', '520', '860', '1240', '1680'];
    return uniqueBooks.sort((a, b) => {
      const numA = a.match(/\d+/)?.[0] || '';
      const numB = b.match(/\d+/)?.[0] || '';
      const indexA = order.indexOf(numA);
      const indexB = order.indexOf(numB);
      const posA = indexA === -1 ? 9999 : indexA;
      const posB = indexB === -1 ? 9999 : indexB;
      if (posA !== posB) return posA - posB;
      return a.localeCompare(b);
    });
  }, [availableLessons]);

  const units = useMemo(() => Array.from(new Set(availableLessons.filter(s => s.book === book).map(s => s.unit.toString()))).filter(Boolean), [availableLessons, book]);
  const days = useMemo(() => Array.from(new Set(availableLessons.filter(s => s.book === book && s.unit.toString() === unit).map(s => s.day.toString()))).filter(Boolean), [availableLessons, book, unit]);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US'; 
      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onresult = (event: any) => {
        setInput(event.results[0][0].transcript);
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
    isListening ? recognitionRef.current.stop() : recognitionRef.current.start();
  };

  const speakWhale = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      
      let englishPart = text.split('[')[0]; 
      
      englishPart = englishPart
        .replace(/\(.*?\)/g, '')
        .replace(/[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/g, '') 
        .trim();
      
      if (!englishPart) return;

      const utterance = new SpeechSynthesisUtterance(englishPart);
      utterance.lang = 'en-US';
      utterance.rate = 0.95; 
      utterance.pitch = 1.0; 
      
      const voices = window.speechSynthesis.getVoices();
      const bestVoice = voices.find(v => 
        v.name.includes('Google US English') || 
        v.name.includes('Microsoft Aria') || 
        v.name.includes('Microsoft Zira') || 
        v.name.includes('Samantha') || 
        v.name.includes('Alex')
      ) || voices.find(v => v.lang === 'en-US');

      if (bestVoice) {
        utterance.voice = bestVoice;
      }
      
      window.speechSynthesis.speak(utterance);
    }
  };

  useEffect(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
    }
  }, []);

  const handleStartChat = async () => {
    if (!book || !unit || !day) {
      alert("교재, Unit, Day를 모두 선택해주세요.");
      return;
    }
    setIsAIThinking(true);

    try {
      const { data: wordsData } = await supabase.from('words').select('eng, kor').eq('book', book).eq('unit', unit).eq('day', day);
      const { data: sentencesData } = await supabase.from('sentences').select('eng, kor').eq('book', book).eq('unit', unit).eq('day', day);

      const targetWords = wordsData?.map(w => `${w.eng}(${w.kor})`).join(', ') || '없음';
      const targetSentences = sentencesData?.map(s => `${s.eng}(${s.kor})`).join(', ') || '없음';

      const instruction = `
        너는 초등학생에게 영어를 가르쳐주는 친근하고 발랄한 원어민 고래 선생님(Whale)이야.
        로봇처럼 딱딱하게 굴지 말고, 진짜 외국인 친구처럼 아주 부드럽고 자연스럽게 대화해줘.
        
        [오늘의 학습 목표: 교재 단어와 문장]
        - 단어: ${targetWords}
        - 문장: ${targetSentences}

        [매우 중요 규칙 1: 대화의 유연성 (창의적 대답 대환영!)]
        아이가 교재에 있는 목표 단어(예: orange) 대신 다른 단어(예: tomato, apple)를 사용해서 대답하더라도, 문맥상 말이 되고 영어 문법이 맞다면 절대 틀렸다고 하지 마! 
        오히려 "Wow, tomatoes! Are they red or green?" 처럼 아이의 창의적인 대답을 받아쳐 주고 아주 자연스럽게 대화를 이어가줘. 

        [매우 중요 규칙 2: 틀린 문장 교정]
        만약 아이가 보낸 문장의 문법이 정말로 심각하게 틀렸거나 뜻이 아예 안 통할 때만:
        1. 먼저 영어로 짧게 격려해줘. (예: Good try! But let's try it again.)
        2. 그 다음, 어디가 틀렸고 올바른 표현은 무엇인지 한국어로 설명하는데, 이 한국어 설명은 **반드시 괄호 ( ) 안에** 적어야 해!!

        [매우 중요 규칙 3: 대화 종료]
        아이가 "Bye", "Goodbye", "잘 가", "그만할래" 등 작별 인사를 하거나 대화를 끝내려 한다면, 따뜻한 작별 인사를 건넨 후 네 응답의 맨 마지막에 반드시 [END_CHAT] 이라는 키워드를 적어줘.

        [응답 형식 규칙]
        - 네가 하는 대화 문장 뒤에는 괄호()를 치고 자연스러운 한국어 번역을 넣어줘.
        - 대답 맨 밑에는 항상 [추천 대답] 이라는 제목으로 아이가 대답할 수 있는 영어 문장과 (한국어 뜻)을 1~2개 제시해줘.
      `;
      
      setSystemPrompt(instruction);

      const welcomeMsg = `Hello! I'm Whale. What is your name? (안녕! 난 고래야. 네 이름은 뭐니?) \n\n[추천 대답]\n- My name is... (내 이름은 ...야.)`;
      
      setApiHistory([
        { role: "user", parts: [{ text: "채팅을 시작할게. 나에게 먼저 반갑게 인사하고 내 이름을 물어봐줘!" }] },
        { role: "model", parts: [{ text: welcomeMsg }] }
      ]);

      setMessages([{ sender: 'whale', text: welcomeMsg }]);
      speakWhale(welcomeMsg);
      setIsChatStarted(true);
      setIsChatEnded(false);

    } catch (err) {
      console.error("채팅 준비 에러:", err);
      alert("데이터를 불러오는 중 문제가 발생했습니다.");
    } finally {
      setIsAIThinking(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isAIThinking || isChatEnded) return;

    const userText = input;
    setMessages(prev => [...prev, { sender: 'user', text: userText }]);
    setInput('');
    setIsAIThinking(true);

    try {
      if (IS_TEST_MODE) {
        await new Promise(res => setTimeout(res, 1000));
        const mockReply = `Nice to meet you! (만나서 반가워!) \n\n[추천 대답]\n- Me too! (나도 반가워!)`;
        setMessages(prev => [...prev, { sender: 'whale', text: mockReply }]);
        speakWhale(mockReply);
      } else {
        const newUserMsg = { role: "user", parts: [{ text: userText }] };
        const currentHistory = [...apiHistory, newUserMsg];
        
        const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || CONFIG.GEMINI.API_KEY;
        const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + API_KEY;
        
        let aiReply = "";
        let attempt = 0;
        const maxAttempts = 3; // 💡 3번까지 재시도 설정

        // 💡 [핵심 강화] 통신 지연 대비: 최대 3회 재시도 및 10초 타임아웃 
        while (attempt < maxAttempts) {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10초 넘어가면 강제 취소

            const response = await fetch(url, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                systemInstruction: { parts: [{ text: systemPrompt }] },
                contents: currentHistory
              }),
              signal: controller.signal // 타임아웃 컨트롤러 연결
            });
            
            clearTimeout(timeoutId);

            const data = await response.json();
            if (data.error) throw new Error(data.error.message || "Gemini API 통신 에러");

            aiReply = data.candidates?.[0]?.content?.parts?.[0]?.text;
            
            if (!aiReply) {
              throw new Error("AI가 빈 응답을 반환했습니다.");
            }
            
            break; // 💡 성공적으로 응답을 받으면 반복문(재시도) 탈출
          } catch (err: any) {
            attempt++;
            console.warn(`API 호출 실패 (시도 ${attempt}/${maxAttempts}):`, err);
            
            if (attempt >= maxAttempts) {
              throw err; // 3번 모두 실패하면 최종 에러 발생
            }
            // 💡 실패 시 1.5초 대기 후 재시도 (API 서버 부하 방지)
            await new Promise(res => setTimeout(res, 1500));
          }
        }
        
        let isEndingNow = false;
        if (aiReply.includes('[END_CHAT]')) {
          isEndingNow = true;
          aiReply = aiReply.replace('[END_CHAT]', '').trim(); 
        }
        
        setMessages(prev => [...prev, { sender: 'whale', text: aiReply }]);
        setApiHistory([...currentHistory, { role: "model", parts: [{ text: aiReply }] }]);
        speakWhale(aiReply);

        if (isEndingNow) {
          setIsChatEnded(true);
          setTimeout(() => {
            setMessages(prev => [...prev, { sender: 'system', text: "🛑 대화가 중지되었습니다. 우측 상단의 [종료/저장] 버튼을 눌러 학습을 완료해주세요." }]);
          }, 1500);
        }
      }
    } catch (err) {
      console.error("AI 응답 오류 (최종 실패):", err);
      setMessages(prev => [...prev, { sender: 'system', text: `앗, 고래 선생님과 통신이 잠시 끊겼어요. 다시 한 번 말해줄래요? (오류: 통신 지연)` }]);
    } finally {
      setIsAIThinking(false);
    }
  };

  const handleFinishChat = async () => {
    if (window.confirm("학습 기록을 저장하고 채팅을 종료할까요?")) {
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
            score: "100" 
          }),
        });
        alert("학습 결과가 성공적으로 기록되었습니다!");
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
          <button onClick={handleFinishChat} style={{ padding: '6px 12px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', animation: isChatEnded ? 'pulse 2s infinite' : 'none' }}>
            종료/저장
          </button>
        )}
      </div>

      {/* 진도 선택창 */}
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
          <button onClick={handleStartChat} disabled={isAIThinking} style={{ width: '100%', padding: '14px', backgroundColor: '#007aff', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer' }}>
            {isAIThinking ? "고래 선생님 모시는 중... 🐳" : "고래 친구와 대화 시작하기 🚀"}
          </button>
        </div>
      ) : (
        /* 채팅 인터페이스 영역 */
        <>
          <div style={{ flex: 1, backgroundColor: '#f0f4f8', borderRadius: '16px', padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {messages.map((msg, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{ 
                  maxWidth: '85%', padding: '12px 16px', borderRadius: '16px', fontSize: '15px', lineHeight: '1.5',
                  backgroundColor: msg.sender === 'user' ? '#007aff' : msg.sender === 'system' ? '#ffeeba' : 'white', 
                  color: msg.sender === 'user' ? 'white' : '#333',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)', whiteSpace: 'pre-wrap',
                  fontWeight: msg.sender === 'system' ? 'bold' : 'normal',
                  textAlign: msg.sender === 'system' ? 'center' : 'left'
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
            <button type="button" onClick={toggleListening} disabled={isChatEnded} style={{
              width: '50px', height: '50px', borderRadius: '50%', border: 'none',
              backgroundColor: isChatEnded ? '#ccc' : isListening ? '#dc3545' : '#6c757d', color: 'white',
              fontSize: '20px', cursor: isChatEnded ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
            }}>
              {isListening ? "🛑" : "🎙️"}
            </button>
            <input 
              value={input} 
              onChange={(e) => setInput(e.target.value)} 
              placeholder={isChatEnded ? "대화가 종료되었습니다." : isListening ? "말씀하세요..." : "영어로 대답을 입력하거나 마이크를 누르세요"} 
              disabled={isAIThinking || isChatEnded}
              style={{ flex: 1, padding: '14px', borderRadius: '24px', border: '1px solid #ccc', outline: 'none', fontSize: '15px', backgroundColor: isChatEnded ? '#e9ecef' : 'white' }} 
            />
            <button type="submit" disabled={!input.trim() || isAIThinking || isChatEnded} style={{
              padding: '14px 20px', backgroundColor: isChatEnded ? '#ccc' : '#007aff', color: 'white', border: 'none', borderRadius: '24px', fontWeight: 'bold', cursor: isChatEnded ? 'not-allowed' : 'pointer'
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