import React, { useState, useRef, useEffect } from 'react';
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

// 💡 육하원칙 질문 리스트 (영어 + 한글 번역)
const DIARY_QUESTIONS = [
  { key: 'who', q: "Who did you spend time with today?\n(오늘 누구랑 재미있는 시간을 보냈니?)" },
  { key: 'where', q: "Where were you?\n(어디에서 놀았어?)" },
  { key: 'what', q: "What did you do there?\n(거기서 무엇을 하면서 놀았어?)" },
  { key: 'feeling', q: "How did you feel?\n(기분이 어땠어?)" }
];

export default function WhaleChat({ onBack, studentId = "ST_TEST", studentName = "테스트학생" }: WhaleChatProps) {
  const [chatPhase, setChatPhase] = useState<'intro' | 'chatting' | 'typing' | 'result'>('intro');
  const [currentStep, setCurrentStep] = useState(0); 
  const [answers, setAnswers] = useState<string[]>([]);
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isAIThinking, setIsAIThinking] = useState(false);

  // 💡 완성된 일기 저장용 상태
  const [diaryEng, setDiaryEng] = useState('');
  const [diaryKor, setDiaryKor] = useState('');
  
  // 💡 마지막 타자 미션용 상태
  const [typingInput, setTypingInput] = useState('');
  const [isTypingSuccess, setIsTypingSuccess] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingInputRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isAIThinking]);

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
      // 영어만 발음하도록 한글 및 괄호 내용 제거
      let englishPart = text.replace(/\(.*?\)/g, '').replace(/[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/g, '').trim();
      if (!englishPart) return;

      const utterance = new SpeechSynthesisUtterance(englishPart);
      utterance.lang = 'en-US';
      utterance.rate = 0.95; 
      
      const voices = window.speechSynthesis.getVoices();
      const bestVoice = voices.find(v => v.name.includes('Google US English') || v.name.includes('Samantha') || v.name.includes('Alex')) || voices.find(v => v.lang === 'en-US');
      if (bestVoice) utterance.voice = bestVoice;
      
      window.speechSynthesis.speak(utterance);
    }
  };

  // 💡 [오류 해결] gemini-1.5-flash-latest 로 모델명 정확하게 수정!
  const callGeminiAPI = async (promptText: string) => {
    const API_KEY = (import.meta.env.VITE_GEMINI_API_KEY || CONFIG?.GEMINI?.API_KEY || "").trim();
    if (!API_KEY) throw new Error("API 키가 누락되었습니다.");

    const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=" + API_KEY;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: promptText }] }] })
    });
    
    const data = await response.json();
    if (data.error) throw new Error(data.error.message || "API 서버 에러");
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  };

  const handleStartChat = () => {
    setChatPhase('chatting');
    const firstQ = `Hello! I'm Whale. Let's write a diary together! 🐋\n\n${DIARY_QUESTIONS[0].q}`;
    setMessages([{ sender: 'whale', text: firstQ }]);
    speakWhale(firstQ);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isAIThinking) return;

    const userText = input;
    setMessages(prev => [...prev, { sender: 'user', text: userText }]);
    setInput('');
    setIsAIThinking(true);

    const updatedAnswers = [...answers, userText];
    setAnswers(updatedAnswers);

    try {
      const coachPrompt = `
        너는 초등학생에게 영어를 가르쳐주는 친절하고 발랄한 고래 선생님이야.
        내가 방금 한 질문: "${DIARY_QUESTIONS[currentStep].q}"
        초등학생의 대답: "${userText}"
        
        [지시사항]
        1. 학생의 대답을 보고 칭찬하고 공감해줘. (한국어로 작성)
        2. 학생의 대답(한글이든 어색한 영어든)을 자연스러운 1~2단어짜리 '초등학생용 영어 표현'으로 어떻게 말하는지 코칭해줘.
        3. 전체 답변 길이는 2~3문장으로 아주 짧고 친근하게 작성해.
        예시: "우와, 동생이랑 놀았구나! '동생과 함께'는 영어로 'with my brother'라고 해. 참 잘했어! 👏"
      `;
      
      const coachReply = await callGeminiAPI(coachPrompt);
      setMessages(prev => [...prev, { sender: 'whale', text: coachReply }]);

      if (currentStep < 3) {
        setTimeout(() => {
          const nextQ = DIARY_QUESTIONS[currentStep + 1].q;
          setMessages(prev => [...prev, { sender: 'whale', text: nextQ }]);
          speakWhale(nextQ);
          setCurrentStep(currentStep + 1);
          setIsAIThinking(false);
        }, 2000); 
      } else {
        setTimeout(async () => {
          setMessages(prev => [...prev, { sender: 'system', text: "✨ 마법의 고래가 너의 대답을 모아 영어 일기를 만들고 있어요..." }]);
          
          const diaryPrompt = `
            다음 4가지 정보를 바탕으로 초등학생 수준의 쉽고 자연스러운 영어 일기를 딱 3문장으로 작성해줘.
            누구랑: ${updatedAnswers[0]}
            어디서: ${updatedAnswers[1]}
            무엇을: ${updatedAnswers[2]}
            느낌: ${updatedAnswers[3]}
            
            [매우 중요: 출력 형식]
            반드시 아래 형식에 맞춰서 텍스트만 출력해. 다른 말은 절대 추가하지 마.
            
            [ENG]
            (여기에 영어 일기 3문장)
            [KOR]
            (여기에 한국어 번역 3문장)
          `;

          const diaryReply = await callGeminiAPI(diaryPrompt);
          
          const engMatch = diaryReply.match(/\[ENG\]([\s\S]*?)\[KOR\]/);
          const korMatch = diaryReply.match(/\[KOR\]([\s\S]*)/);
          
          if (engMatch && korMatch) {
            const finalEng = engMatch[1].trim();
            const finalKor = korMatch[1].trim();
            
            setDiaryEng(finalEng);
            setDiaryKor(finalKor);
            
            const finishMsg = `짜잔! 🎉 너의 이야기로 멋진 영어 일기가 완성되었어!\n\n${finalEng}\n\n이제 이 일기를 똑같이 따라 쳐보는 마지막 미션을 시작할게!`;
            setMessages(prev => [...prev, { sender: 'whale', text: finishMsg }]);
            speakWhale(finalEng); 
            
            setTimeout(() => {
              setChatPhase('typing');
            }, 4000);
          } else {
            throw new Error("일기 생성 형식 오류");
          }
          setIsAIThinking(false);
        }, 2000);
      }
    } catch (err: any) {
      console.error("AI 오류:", err);
      setMessages(prev => [...prev, { sender: 'system', text: `앗, 고래 선생님과 통신이 잠시 끊겼어요. (${err.message})` }]);
      setIsAIThinking(false);
    }
  };

  const handleTypingChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setTypingInput(val);
    
    const cleanEng = diaryEng.replace(/\s+/g, '').toLowerCase();
    const cleanInput = val.replace(/\s+/g, '').toLowerCase();
    
    if (cleanEng === cleanInput && cleanEng.length > 0) {
      setIsTypingSuccess(true);
    } else {
      setIsTypingSuccess(false);
    }
  };

  const handleFinishMission = async () => {
    try {
      const now = new Date();
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      
      await supabase.from('whale_diaries').insert([{
        student_id: studentId,
        student_name: studentName,
        eng_diary: diaryEng,
        kor_diary: diaryKor,
        log_date: todayStr
      }]);

      await supabase.from('learning_logs').insert([{
        student_id: studentId,
        student_name: studentName,
        task_type: 'AI회화', 
        book_info: '오늘의 일기', 
        status: '완료',
        score: 100,
        attempt: 1,
        log_date: todayStr
      }]);

      setChatPhase('result');
    } catch (err) {
      console.error("DB 저장 실패:", err);
      alert("기록 저장 중 문제가 발생했습니다.");
    }
  };

  return (
    <div style={{ fontFamily: 'Pretendard, sans-serif', padding: '16px', maxWidth: '500px', margin: '0 auto', height: '92vh', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <button onClick={onBack} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #ccc', backgroundColor: 'white', cursor: 'pointer', fontWeight: 'bold' }}>← 나가기</button>
        <span style={{ fontWeight: 'bold', color: '#007aff', fontSize: '18px' }}>Whale Diary 🐋</span>
        <div style={{ width: '70px' }}></div>
      </div>

      {chatPhase === 'intro' && (
        <div style={{ padding: '40px 20px', backgroundColor: 'white', borderRadius: '24px', textAlign: 'center', boxShadow: '0 12px 32px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>📝</div>
          <h2 style={{ margin: '0 0 12px 0', fontSize: '24px', fontWeight: '900', color: '#111' }}>고래와 함께 영어 일기 쓰기</h2>
          <p style={{ fontSize: '15px', color: '#666', lineHeight: '1.6', marginBottom: '32px' }}>
            고래 선생님이 물어보는 4가지 질문에 편하게 대답해 봐! <br/>
            한글로 대답해도 똑똑한 고래가 다 알아듣고 <br/>멋진 영어 일기로 만들어 줄 거야. ✨
          </p>
          <button onClick={handleStartChat} style={{ width: '100%', padding: '18px', background: 'linear-gradient(135deg, #007aff, #0056b3)', color: 'white', border: 'none', borderRadius: '16px', fontWeight: '800', fontSize: '18px', cursor: 'pointer', boxShadow: '0 6px 16px rgba(0,122,255,0.2)' }}>
            일기 쓰기 시작! 🚀
          </button>
        </div>
      )}

      {chatPhase === 'chatting' && (
        <>
          <div style={{ flex: 1, backgroundColor: '#f0f4f8', borderRadius: '16px', padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {messages.map((msg, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{ 
                  maxWidth: '85%', padding: '14px 18px', borderRadius: '20px', fontSize: '15px', lineHeight: '1.5',
                  backgroundColor: msg.sender === 'user' ? '#007aff' : msg.sender === 'system' ? '#fffdf0' : 'white', 
                  color: msg.sender === 'user' ? 'white' : '#111',
                  border: msg.sender === 'system' ? '1px solid #ffda79' : 'none',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.02)', whiteSpace: 'pre-wrap',
                  fontWeight: msg.sender === 'system' ? 'bold' : 'normal',
                  textAlign: msg.sender === 'system' ? 'center' : 'left'
                }}>
                  {msg.text}
                </div>
              </div>
            ))}
            {isAIThinking && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{ padding: '12px 16px', backgroundColor: '#e2e8f0', borderRadius: '20px', color: '#666', fontSize: '14px', fontWeight: 'bold' }}>
                  🐋 고래가 생각하고 있어요...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSend} style={{ marginTop: '12px', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button type="button" onClick={toggleListening} disabled={isAIThinking} style={{
              width: '52px', height: '52px', borderRadius: '50%', border: 'none',
              backgroundColor: isListening ? '#ff3b30' : '#8e8e93', color: 'white',
              fontSize: '22px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
            }}>
              {isListening ? "🛑" : "🎙️"}
            </button>
            <input 
              value={input} 
              onChange={(e) => setInput(e.target.value)} 
              placeholder={isListening ? "듣고 있어요..." : "한글이나 영어로 대답해봐요!"} 
              disabled={isAIThinking}
              autoFocus
              style={{ flex: 1, padding: '16px', borderRadius: '26px', border: '1px solid #ccc', outline: 'none', fontSize: '15px', fontWeight: 'bold' }} 
            />
            <button type="submit" disabled={!input.trim() || isAIThinking} style={{
              padding: '16px 20px', backgroundColor: '#007aff', color: 'white', border: 'none', borderRadius: '26px', fontWeight: '900', cursor: 'pointer'
            }}>전송</button>
          </form>
        </>
      )}

      {chatPhase === 'typing' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '20px', boxShadow: '0 8px 24px rgba(0,0,0,0.06)' }}>
            <h3 style={{ margin: '0 0 12px 0', color: '#007aff', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              📝 마법의 영어 일기 완성!
            </h3>
            <div style={{ fontSize: '17px', fontWeight: '800', color: '#111', lineHeight: '1.6', wordBreak: 'keep-all' }}>
              {diaryEng}
            </div>
            <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px dashed #eee', fontSize: '14px', color: '#666', lineHeight: '1.5', wordBreak: 'keep-all' }}>
              {diaryKor}
            </div>
            <button onClick={() => speakWhale(diaryEng)} style={{ marginTop: '16px', padding: '8px 16px', backgroundColor: '#eef2ff', color: '#4f46e5', border: 'none', borderRadius: '12px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}>
              🔊 선생님 발음 다시 듣기
            </button>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: '14px', fontWeight: '800', color: '#111', marginBottom: '8px' }}>
              ⌨️ 아래 빈칸에 똑같이 따라서 적어보세요!
            </div>
            <textarea
              ref={typingInputRef}
              value={typingInput}
              onChange={handleTypingChange}
              placeholder="위의 영어 일기를 똑같이 따라 치면 미션 완료! (대소문자, 띄어쓰기 주의)"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              autoFocus
              style={{
                flex: 1, width: '100%', padding: '16px', borderRadius: '16px', border: `2px solid ${isTypingSuccess ? '#4caf50' : '#ccc'}`,
                backgroundColor: isTypingSuccess ? '#f0fdf4' : 'white', fontSize: '16px', fontWeight: '700', lineHeight: '1.6', 
                resize: 'none', outline: 'none', boxSizing: 'border-box'
              }}
            />
          </div>

          <button 
            onClick={handleFinishMission} 
            disabled={!isTypingSuccess}
            style={{ 
              width: '100%', padding: '18px', backgroundColor: isTypingSuccess ? '#111' : '#ccc', color: 'white', 
              border: 'none', borderRadius: '16px', fontWeight: '800', fontSize: '18px', cursor: isTypingSuccess ? 'pointer' : 'not-allowed',
              boxShadow: isTypingSuccess ? '0 6px 16px rgba(0,0,0,0.2)' : 'none'
            }}
          >
            {isTypingSuccess ? "🎉 완벽해요! 도장 받기" : "아직 스펠링이 조금 달라요 😅"}
          </button>
        </div>
      )}

      {chatPhase === 'result' && (
        <div style={{ padding: '40px 20px', backgroundColor: 'white', borderRadius: '24px', textAlign: 'center', boxShadow: '0 12px 32px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>🏆</div>
          <h2 style={{ margin: '0 0 12px 0', fontSize: '26px', fontWeight: '900', color: '#111' }}>일기 쓰기 완료!</h2>
          <p style={{ fontSize: '15px', color: '#666', lineHeight: '1.6', marginBottom: '32px' }}>
            오늘 하루를 영어로 정말 멋지게 표현했어! <br/>너의 빛나는 일기를 선생님께 잘 전달할게.
          </p>
          <button onClick={onBack} style={{ width: '100%', padding: '18px', backgroundColor: '#111', color: 'white', border: 'none', borderRadius: '16px', fontWeight: '800', fontSize: '18px', cursor: 'pointer' }}>
            학습 홈으로 돌아가기
          </button>
        </div>
      )}

    </div>
  );
}