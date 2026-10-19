import React, { useState, useEffect, useRef } from 'react';
import { PHONICS_DB } from './PhonicsData'; 

interface PhonicsLearnProps {
  day: number; 
  onBack: () => void;
  onFinish: () => void;
}

export default function PhonicsLearn({ day, onBack, onFinish }: PhonicsLearnProps) {
  const dayWords = PHONICS_DB.filter((item: any) => item.day === day);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isListening, setIsListening] = useState(false);
  
  // 💡 [추가] 3번 실패했을 때 보여줄 'giveup' 상태 추가!
  const [feedback, setFeedback] = useState<'none' | 'success' | 'fail' | 'niceTry' | 'giveup'>('none');
  const [attempts, setAttempts] = useState(0);
  
  const [lastSpeech, setLastSpeech] = useState<string>(''); 
  
  const recognitionRef = useRef<any>(null);
  const currentItem = dayWords[currentIndex];

  useEffect(() => {
    setAttempts(0);
    setLastSpeech('');
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
        setLastSpeech(transcript); 
        
        if (transcript.includes(currentItem.word.toLowerCase())) {
          handleSuccess();
        } else {
          const newAttempts = attempts + 1;
          setAttempts(newAttempts);
          
          // 💡 [핵심 패치] 3번 틀리면 좌절하지 않게 'giveup' 화면 띄우기
          if (newAttempts >= 3) {
            setFeedback('giveup');
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
    moveToNext(2000);
  };

  const handleSkip = () => {
    moveToNext(0); // 바로 넘어가기
  };

  const handleRetry = () => {
    setAttempts(0);
    setFeedback('none');
    speakTeacher();
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
      
      <style>{`@keyframes ripple { 0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); } 70% { box-shadow: 0 0 0 40px rgba(239, 68, 68, 0); } 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); } }`}</style>

      <div style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '20px' }}>
        <button onClick={onBack} style={{ width: '50px', height: '50px', borderRadius: '50%', backgroundColor: 'white', border: 'none', fontSize: '24px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>←</button>
        <div style={{ flex: 1, height: '20px', backgroundColor: '#e0e7ff', borderRadius: '10px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${((currentIndex) / dayWords.length) * 100}%`, backgroundColor: '#3b82f6', transition: 'width 0.3s ease' }}></div>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
        
        {feedback === 'success' && <div style={{ position: 'absolute', top: '5%', fontSize: '60px', color: '#10b981', fontWeight: '900', textShadow: '0 4px 10px rgba(0,0,0,0.2)', zIndex: 10 }}>🎉 Excellent! 🎉</div>}
        {feedback === 'fail' && <div style={{ position: 'absolute', top: '5%', fontSize: '32px', color: '#ef4444', fontWeight: '900', zIndex: 10 }}>🤔 다시 한번 크게 말해볼까요? (남은 기회: {3 - attempts}번)</div>}
        
        {/* 💡 [핵심 패치] 3번 틀렸을 때 보여줄 친절한 구제 창 */}
        {feedback === 'giveup' && (
          <div style={{ position: 'absolute', top: '2%', display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 10, backgroundColor: 'white', padding: '30px', borderRadius: '30px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ fontSize: '50px', color: '#f59e0b', fontWeight: '900' }}>😅 조금 어려웠나요?</div>
            <div style={{ fontSize: '20px', color: '#64748b', fontWeight: 'bold', marginTop: '10px', marginBottom: '20px' }}>선생님과 함께 나중에 다시 연습해봐도 괜찮아요!</div>
            <div style={{ display: 'flex', gap: '20px' }}>
              <button onClick={handleRetry} style={{ padding: '16px 30px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '20px', fontSize: '20px', fontWeight: 'bold', cursor: 'pointer' }}>🔄 한 번 더 도전!</button>
              <button onClick={handleSkip} style={{ padding: '16px 30px', backgroundColor: '#e2e8f0', color: '#475569', border: 'none', borderRadius: '20px', fontSize: '20px', fontWeight: 'bold', cursor: 'pointer' }}>⏭️ 일단 넘어가기</button>
            </div>
          </div>
        )}

        <div style={{ backgroundColor: 'white', padding: '60px', borderRadius: '40px', boxShadow: '0 20px 40px rgba(0,0,0,0.08)', textAlign: 'center', transform: (feedback === 'success' || feedback === 'niceTry') ? 'scale(1.1)' : 'scale(1)', transition: 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}>
          <div style={{ fontSize: '120px', lineHeight: '1', margin: '0' }}>{currentItem.icon}</div>
          <div style={{ fontSize: '140px', fontWeight: '900', color: '#1e3a8a', margin: '20px 0', lineHeight: '1' }}>{currentItem.letter}</div>
          <div style={{ fontSize: '40px', fontWeight: '800', color: '#64748b' }}>{currentItem.word}</div>
        </div>
        
        <div style={{ display: 'flex', gap: '30px', marginTop: '60px' }}>
          <button onClick={speakTeacher} disabled={feedback === 'giveup'} style={{ width: '100px', height: '100px', borderRadius: '50%', backgroundColor: '#f8fafc', border: '4px solid #cbd5e1', fontSize: '40px', cursor: 'pointer', boxShadow: '0 8px 16px rgba(0,0,0,0.1)' }}>🔊</button>
          <button 
            onClick={toggleListening} 
            disabled={feedback === 'success' || feedback === 'niceTry' || feedback === 'giveup'}
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