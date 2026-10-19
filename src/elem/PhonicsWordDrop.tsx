import React, { useState, useEffect } from 'react';
import { PHONICS_DB } from './PhonicsData';

interface WordDropProps {
  day: number;
  onComplete: () => void;
}

export default function PhonicsWordDrop({ day, onComplete }: WordDropProps) {
  // 💡 DB에서 그날 배운 단어들만 가져옵니다!
  const dayWords = PHONICS_DB.filter((item: any) => item.day === day);

  const [step, setStep] = useState(0);
  const [dropY, setDropY] = useState(0); 
  const [isPopping, setIsPopping] = useState(false);
  const [isWrong, setIsWrong] = useState(false);
  const [gameSequence, setGameSequence] = useState<typeof dayWords>([]);

  useEffect(() => {
    const shuffled = [...dayWords].sort(() => Math.random() - 0.5);
    setGameSequence(shuffled);
  }, []);

  const currentItem = gameSequence[step];

  const speakWord = (word: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.lang = 'en-US'; 
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  useEffect(() => {
    if (currentItem && !isPopping && dropY === 0) {
      speakWord(currentItem.word);
    }
  }, [step, currentItem, dropY, isPopping]);

  useEffect(() => {
    if (step >= dayWords.length || isPopping || gameSequence.length === 0) return;

    const timer = setInterval(() => {
      setDropY(prev => {
        if (prev >= 75) {
          setIsWrong(true);
          setTimeout(() => setIsWrong(false), 500);
          return 0; 
        }
        return prev + 1.2; 
      });
    }, 50);

    return () => clearInterval(timer);
  }, [step, isPopping, gameSequence]);

  const handleButtonClick = (clickedLetter: string) => {
    if (isPopping || !currentItem) return;

    if (clickedLetter === currentItem.letter) {
      setIsPopping(true);
      if ('speechSynthesis' in window) window.speechSynthesis.cancel(); 
      
      setTimeout(() => {
        setDropY(0);
        setIsPopping(false);
        if (step + 1 < gameSequence.length) {
          setStep(prev => prev + 1);
        } else {
          onComplete();
        }
      }, 800);
    } else {
      setIsWrong(true);
      setTimeout(() => setIsWrong(false), 500);
    }
  };

  if (gameSequence.length === 0) return null;

  // 화면 아래에 보여줄 버튼들 (중복 없는 알파벳 리스트)
  const uniqueLetters = Array.from(new Set(dayWords.map(w => w.letter)));

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'linear-gradient(to bottom, #1e3a8a, #3b82f6)', display: 'flex', flexDirection: 'column', zIndex: 2000, fontFamily: 'Pretendard, sans-serif', overflow: 'hidden' }}>
      
      <style>
        {`
          @keyframes popAction { 0% { transform: scale(1); opacity: 1; } 40% { transform: scale(2); opacity: 0.9; } 100% { transform: scale(3); opacity: 0; } }
          @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-15px); } 75% { transform: translateX(15px); } }
        `}
      </style>

      <div style={{ padding: '20px', textAlign: 'center', backgroundColor: 'rgba(0,0,0,0.3)' }}>
        <div style={{ fontSize: '24px', color: '#fde047', fontWeight: '900' }}>Step 4. 단어 떨어지기!</div>
        <div style={{ fontSize: '18px', color: 'white', marginTop: '8px' }}>그림이 바닥에 닿기 전에 올바른 첫 글자를 누르세요!</div>
      </div>

      <div style={{ flex: 1, position: 'relative', animation: isWrong ? 'shake 0.5s' : 'none' }}>
        {currentItem && (
          <div style={{ position: 'absolute', left: '50%', top: `${dropY}vh`, transform: 'translateX(-50%)', fontSize: '100px', animation: isPopping ? 'popAction 0.8s ease-out forwards' : 'none', filter: 'drop-shadow(0 10px 15px rgba(0,0,0,0.3))' }}>
            {isPopping ? '✨' : currentItem.icon}
          </div>
        )}
      </div>

      <div style={{ height: '20px', backgroundColor: '#ef4444', opacity: 0.8, boxShadow: '0 -10px 20px rgba(239, 68, 68, 0.5)' }}></div>

      <div style={{ height: '200px', backgroundColor: 'white', display: 'flex', justifyContent: 'space-evenly', alignItems: 'center', padding: '0 20px', borderRadius: '40px 40px 0 0', boxShadow: '0 -10px 30px rgba(0,0,0,0.2)', flexWrap: 'wrap' }}>
        {uniqueLetters.map((letter, idx) => (
          <button
            key={idx} onClick={() => handleButtonClick(letter)}
            style={{ width: '120px', height: '120px', borderRadius: '24px', backgroundColor: '#f1f5f9', border: '4px solid #cbd5e1', fontSize: '48px', fontWeight: '900', color: '#0f172a', cursor: 'pointer', boxShadow: '0 10px 0 #94a3b8', transition: 'all 0.1s', margin: '10px' }}
            onMouseDown={(e) => { e.currentTarget.style.transform = 'translateY(10px)'; e.currentTarget.style.boxShadow = '0 0 0 #94a3b8'; }}
            onMouseUp={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 10px 0 #94a3b8'; }}
          >
            {letter}
          </button>
        ))}
      </div>
    </div>
  );
}