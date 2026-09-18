import React, { useState, useEffect, useRef } from 'react';
iimport { PHONICS_DB } from '../data/phonics_db';

interface PhonicsLearnProps {
  day: number; 
  onBack: () => void;
  onFinish: () => void;
}

export default function PhonicsLearn({ day, onBack, onFinish }: PhonicsLearnProps) {
  // 💡 [에러 해결] item이 어떤 타입인지 Vercel이 헷갈리지 않도록 (item: any)로 명확히 지정!
  const dayWords = PHONICS_DB.filter((item: any) => item.day === day);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isListening, setIsListening] = useState(false);
  
  const [feedback, setFeedback] = useState<'none' | 'success' | 'fail' | 'niceTry'>('none');
  const [attempts, setAttempts] = useState(0);
  
  // 💡 [추가] 마이크가 인식한 텍스트를 화면에 띄워주기 위한 상태
  const [lastSpeech, setLastSpeech] = useState<string>(''); 
  
  const recognitionRef = useRef<any>(null);
  const currentItem = dayWords[currentIndex];

  useEffect(() => {
    setAttempts(0);
    setLastSpeech(''); // 단어가 바뀔 때마다 인식된 글자도 초기화
    setTimeout(() => speakTeacher(), 500);
  }, [currentIndex]);

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
        const transcript = event.results[0][0].transcript.toLowerCase();
        
        // 💡 화면에 인식된 말 띄워주기
        setLastSpeech(transcript); 
        
        // 💡 [핵심 수정] 첫 글자만 맞으면 통과시켜주던 꼼수 삭제! 
        // 반드시 타겟 단어(word)가 포함되어 있어야만 통과됩니다.
        if (transcript.includes(currentItem.word.toLowerCase())) {
          handleSuccess();
        } else {
          const newAttempts = attempts + 1;
          setAttempts(newAttempts);
          
          if (newAttempts >= 3) {
            handleNiceTry();
          } else {
            setFeedback('fail');
            setTimeout(() => setFeedback('none'), 1500);
          }
        }
      };
      recognition.onerror = () => setIsListening(false);
      recognitionRef.current = recognition;
    }
  }, [currentIndex, currentItem, attempts]);

  const speakTeacher = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(currentItem.word);
      utterance.lang = 'en-US';
      utterance.rate = 0.8;
      
      const voices = window.speechSynthesis.getVoices();
      const bestVoice = voices.find(v => v.lang === 'en-US' && (v.name.includes('Google') || v.name.includes('Natural'))) || voices.find(v => v.lang === 'en-US');
      if (bestVoice) utterance.voice = bestVoice;

      window.speechSynthesis.speak(utterance);
    }
  };

  const toggleListening = () => {
    if (!recognitionRef.current) return alert("크롬 브라우저에서 마이크를 허용해주세요.");
    isListening ? recognitionRef.current.stop() : recognitionRef.current.start();
  };

  const handleSuccess = () => {
    setFeedback('success');
    moveToNext();
  };

  const handleNiceTry = () => {
    setFeedback('niceTry');
    moveToNext(2500); 
  };

  const moveToNext = (delay = 2000) => {
    setTimeout(() => {
      setFeedback('none');
      if (currentIndex < dayWords.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else {
        onFinish(); 
      }
    }, delay);
  };

  if (!currentItem) return null;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: '#eff6ff', display: 'flex', flexDirection: 'column', zIndex: 2000, fontFamily: 'Pretendard, sans-serif' }}>
      
      <style>
        {`
          @keyframes ripple {
            0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
            70% { box-shadow: 0 0 0 40px rgba(239, 68, 68, 0); }
            100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
          }
        `}
      </style>

      <div style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '20px' }}>
        <button onClick={onBack} style={{ width: '50px', height: '50px', borderRadius: '50%', backgroundColor: 'white', border: 'none', fontSize: '24px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>←</button>
        <div style={{ flex: 1, height: '20px', backgroundColor: '#e0e7ff', borderRadius: '10px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${((currentIndex) / dayWords.length) * 100}%`, backgroundColor: '#3b82f6', transition: 'width 0.3s ease' }}></div>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
        
        {feedback === 'success' && <div style={{ position: 'absolute', top: '5%', fontSize: '60px', color: '#10b981', fontWeight: '900', textShadow: '0 4px 10px rgba(0,0,0,0.2)', zIndex: 10 }}>🎉 Excellent! 🎉</div>}
        {feedback === 'fail' && <div style={{ position: 'absolute', top: '5%', fontSize: '32px', color: '#ef4444', fontWeight: '900', zIndex: 10 }}>🤔 다시 한번 크게 말해볼까요? (남은 기회: {3 - attempts}번)</div>}
        
        {feedback === 'niceTry' && (
          <div style={{ position: 'absolute', top: '5%', display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 10 }}>
            <div style={{ fontSize: '50px', color: '#f59e0b', fontWeight: '900', textShadow: '0 4px 10px rgba(0,0,0,0.2)' }}>👍 Good Try!</div>
            <div style={{ fontSize: '24px', color: '#d97706', fontWeight: 'bold', marginTop: '10px' }}>일치율 75%! 점점 좋아지고 있어요. 다음으로 고고! 🚀</div>
          </div>
        )}

        <div style={{ backgroundColor: 'white', padding: '60px', borderRadius: '40px', boxShadow: '0 20px 40px rgba(0,0,0,0.08)', textAlign: 'center', transform: (feedback === 'success' || feedback === 'niceTry') ? 'scale(1.1)' : 'scale(1)', transition: 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}>
          <div style={{ fontSize: '120px', lineHeight: '1', margin: '0' }}>{currentItem.icon}</div>
          <div style={{ fontSize: '140px', fontWeight: '900', color: '#1e3a8a', margin: '20px 0', lineHeight: '1' }}>{currentItem.letter}</div>
          <div style={{ fontSize: '40px', fontWeight: '800', color: '#64748b' }}>{currentItem.word}</div>
        </div>
        
        <div style={{ display: 'flex', gap: '30px', marginTop: '60px' }}>
          <button onClick={speakTeacher} style={{ width: '100px', height: '100px', borderRadius: '50%', backgroundColor: '#f8fafc', border: '4px solid #cbd5e1', fontSize: '40px', cursor: 'pointer', boxShadow: '0 8px 16px rgba(0,0,0,0.1)' }}>🔊</button>
          <button 
            onClick={toggleListening} 
            disabled={feedback === 'success' || feedback === 'niceTry'}
            style={{ 
              width: '100px', height: '100px', borderRadius: '50%', border: 'none', fontSize: '40px', cursor: 'pointer',
              backgroundColor: isListening ? '#ef4444' : '#3b82f6', color: 'white',
              boxShadow: isListening ? 'none' : '0 8px 16px rgba(59, 130, 246, 0.3)',
              transform: isListening ? 'scale(1.1)' : 'scale(1)', transition: 'all 0.2s',
              animation: isListening ? 'ripple 1.5s infinite' : 'none'
            }}
          >
            {isListening ? '🛑' : '🎙️'}
          </button>
        </div>
        
        {/* 💡 [추가] 인식된 소리를 화면에 출력해주는 자막 영역 (디버깅/테스트용) */}
        <div style={{ marginTop: '24px', fontSize: '20px', fontWeight: 'bold', color: isListening ? '#ef4444' : '#64748b' }}>
          {isListening ? "듣고 있어요! 크게 말해주세요... 〰️" : "마이크를 누르고 말해보세요."}
        </div>
        
        {lastSpeech && (
          <div style={{ marginTop: '16px', fontSize: '18px', color: '#94a3b8', backgroundColor: '#f1f5f9', padding: '8px 16px', borderRadius: '12px' }}>
            🎤 인식된 소리: "{lastSpeech}"
          </div>
        )}
      </div>
    </div>
  );
}