import React, { useState, useRef, useEffect } from 'react';
import { CONFIG } from '../config';
import { supabase } from '../lib/supabase';

interface WhaleChatProps {
  onBack: () => void;
  studentId?: string;
  studentName?: string;
}

interface Message {
  sender: 'user' | 'whale' | 'system';
  text: string;
}

export default function WhaleChat({ onBack, studentId = "ST_TEST", studentName = "테스트학생" }: WhaleChatProps) {
  const [chatPhase, setChatPhase] = useState<'intro' | 'chatting' | 'typing' | 'result'>('intro');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isAIThinking, setIsAIThinking] = useState(false);

  const [diaryEng, setDiaryEng] = useState('');
  const [diaryKor, setDiaryKor] = useState('');
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

  const callGeminiAPI = async (promptText: string) => {
    const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || (CONFIG as any)?.GEMINI?.API_KEY || (CONFIG as any)?.GEMINI_API_KEY;
    if (!apiKey) throw new Error("API 키를 찾을 수 없습니다.");

    const modelsToTry = ['gemini-3.7-flash', 'gemini-3.1-pro', 'gemini-3.5-flash-lite', 'gemini-1.5-flash', 'gemini-pro'];
    let textResponse = '';
    let success = false;
    let lastErrorMsg = '';

    for (const model of modelsToTry) {
      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: promptText }] }],
            generationConfig: { temperature: 0.7 }
          })
        });

        const data = await response.json();
        if (data.error) throw new Error(data.error.message);

        textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
        if (!textResponse) throw new Error("응답이 비어있습니다.");

        success = true; 
        break; 
      } catch (error: any) {
        console.warn(`${model} 호출 실패, 다음 모델 시도...`, error.message);
        lastErrorMsg = error.message;
      }
    }

    if (!success) throw new Error(`모든 AI 통신망 접속에 실패했습니다. (에러: ${lastErrorMsg})`);
    return textResponse;
  };

  const handleStartChat = () => {
    setChatPhase('chatting');
    const firstQ = "Hello! I'm Whale. Let's write a diary together! 🐋\nWho did you spend time with today?\n(오늘 누구랑 재미있는 시간을 보냈니?)";
    setMessages([{ sender: 'whale', text: firstQ }]);
    speakWhale(firstQ);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isAIThinking) return;

    const userText = input;
    const newMessages: Message[] = [...messages, { sender: 'user', text: userText }];
    setMessages(newMessages);
    setInput('');
    setIsAIThinking(true);

    try {
      const conversationHistory = newMessages.map(m => `${m.sender === 'user' ? '학생' : '고래'}: ${m.text}`).join('\n');
      
      const coachPrompt = `
        너는 초등학생의 영어 일기 작성을 돕는 유쾌한 원어민 고래 친구 'Whale'이야.
        목표: 학생과 대화하며 일기 작성에 필요한 4가지 정보(1.누구와 2.어디서 3.무엇을 4.기분)를 자연스럽게 수집할 것.
        
        [대화 기록]
        ${conversationHistory}
        
        [고래의 답변 규칙]
        1. [오류 교정]: 학생의 마지막 대답에 명백한 오타(예: fist -> first)나 틀린 영어가 있다면, 꼰대 선생님처럼 혼내지 말고 "앗, fist(주먹)라고 썼네? first(첫째)를 말하고 싶었던 거지? 😆" 처럼 가볍고 장난스럽게 짚어준 뒤 올바른 표현을 알려줘.
        2. [유연한 흐름]: 학생이 한 번의 대답에 여러 정보(예: "집에서 폰게임 했어" -> 어디서, 무엇을)를 말했다면 눈치껏 모두 파악하고, 이미 대답한 내용을 또 묻지 마.
        3. [질문 이어가기]: 공감 리액션을 한 뒤, 아직 파악하지 못한 남은 정보가 있다면 다음 질문을 이어가. (질문은 항상 "영어 1문장\\n(한글 뜻)" 형태로 해줘)
        4. [일기 작성 단계]: 만약 4가지 정보(누구, 어디, 무엇, 기분)를 모두 파악했다면, 더 이상 질문하지 말고 "이제 이 이야기들로 멋진 일기를 만들어볼까?" 라고 말한 뒤, 네 답변 맨 마지막 줄에 반드시 '[일기작성시작]' 이라는 태그를 적어줘.
      `;
      
      let coachReply = await callGeminiAPI(coachPrompt);
      
      if (coachReply.includes('[일기작성시작]')) {
        coachReply = coachReply.replace('[일기작성시작]', '').trim();
        setMessages(prev => [...prev, { sender: 'whale', text: coachReply }]);
        speakWhale(coachReply);

        setTimeout(async () => {
          setMessages(prev => [...prev, { sender: 'system', text: "✨ 마법의 고래가 너의 대답을 모아 영어 일기를 만들고 있어요..." }]);
          
          const diaryPrompt = `
            다음 [대화 기록]을 바탕으로, 초등학생 수준의 쉽고 자연스러운 영어 일기를 딱 3문장으로 작성해줘.
            
            [대화 기록]
            ${conversationHistory}
            
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
        }, 3000);

      } else {
        setMessages(prev => [...prev, { sender: 'whale', text: coachReply }]);
        speakWhale(coachReply);
        setIsAIThinking(false);
      }
    } catch (err: any) {
      console.error("AI 오류:", err);
      setMessages(prev => [...prev, { sender: 'system', text: `앗, 구글 AI 서버가 잠깐 혼잡한 것 같아요. 다시 한번 전송 버튼을 눌러주세요! (${err.message})` }]);
      setIsAIThinking(false);
    }
  };

  const handleTypingChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setTypingInput(val);
    
    const cleanEng = diaryEng.replace(/\s+/g, '').toLowerCase();
    const cleanInput = val.replace(/\s+/g, '').toLowerCase();
    
    if (cleanEng === cleanInput && cleanEng.length > 0) setIsTypingSuccess(true);
    else setIsTypingSuccess(false);
  };

  // 💡 [핵심] 아이폰 사파리에서 수파베이스 전송이 차단되는 것을 감지하고 잡아내는 로직 적용!
  const handleFinishMission = async () => {
    try {
      // 1. 사파리 날짜 파싱 오류를 막는 가장 안전한 한국 표준시(KST) 구하기
      const now = new Date();
      const offset = now.getTimezoneOffset() * 60000;
      const dateOffset = new Date(now.getTime() - offset);
      const todayStr = dateOffset.toISOString().split('T')[0];
      
      // 2. insert 후 에러가 있으면 반드시 throw 하도록 강제 체크 (.error 확인)
      const { error: diaryError } = await supabase.from('whale_diaries').insert([{
        student_id: studentId,
        student_name: studentName,
        eng_diary: diaryEng,
        kor_diary: diaryKor,
        log_date: todayStr
      }]);
      if (diaryError) throw diaryError;

      const { error: logError } = await supabase.from('learning_logs').insert([{
        student_id: studentId,
        student_name: studentName,
        task_type: 'AI회화', 
        book_info: '오늘의 일기', 
        status: '완료',
        score: 100,
        attempt: 1,
        log_date: todayStr
      }]);
      if (logError) throw logError;

      // 3. 통신이 모두 성공했을 때만 완료 화면으로 넘어감
      setChatPhase('result');
    } catch (err: any) {
      console.error("DB 저장 실패:", err);
      // 4. 아이폰에서 몰래 삼키지 못하도록 무조건 경고창 띄우기
      alert(`🚨 [데이터 저장 실패]\n원장님께 화면을 보여주세요!\n원인: ${err.message || '네트워크 오류'}`);
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
            고래 선생님이 물어보는 질문에 편하게 대답해 봐! <br/>
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