import React, { useState, useEffect } from 'react';

interface WordDropProps {
  onComplete: () => void;
}

const ITEMS = [
  { letter: 'Aa', icon: '🍎', word: 'apple' },
  { letter: 'Bb', icon: '🐻', word: 'bear' },
  { letter: 'Cc', icon: '🐱', word: 'cat' },
  { letter: 'Dd', icon: '🐶', word: 'dog' }
];

export default function PhonicsWordDrop({ onComplete }: WordDropProps) {
  const [step, setStep] = useState(0);
  const [dropY, setDropY] = useState(0); 
  const [isPopping, setIsPopping] = useState(false);
  const [isWrong, setIsWrong] = useState(false);
  const [gameSequence, setGameSequence] = useState<typeof ITEMS>([]);

  useEffect(() => {
    const shuffled = [...ITEMS].sort(() => Math.random() - 0.5);
    setGameSequence(shuffled);
  }, []);

  const currentItem = gameSequence[step];

  // 💡 단어를 원어민 발음으로 읽어주는 함수
  const speakWord = (word: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.lang = 'en-US'; // 영어 발음
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  // 💡 새 아이템이 떨어지기 시작할 때 (step이 바뀔 때) 단어 읽어주기
  useEffect(() => {
    if (currentItem && !isPopping && dropY === 0) {
      speakWord(currentItem.word);
    }
  }, [step, currentItem, dropY, isPopping]);

  useEffect(() => {
    if (step >= ITEMS.length || isPopping || gameSequence.length === 0) return;

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
      if ('speechSynthesis' in window) window.speechSynthesis.cancel(); // 맞추면 소리 끄기
      
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

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'linear-gradient(to bottom, #1e3a8a, #3b82f6)', display: 'flex', flexDirection: 'column', zIndex: 2000, fontFamily: 'Pretendard, sans-serif', overflow: 'hidden' }}>
      
      <style>
        {`
          @keyframes popAction {
            0% { transform: scale(1); opacity: 1; }
            40% { transform: scale(2); opacity: 0.9; }
            100% { transform: scale(3); opacity: 0; }
          }
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-15px); }
            75% { transform: translateX(15px); }
          }
        `}
      </style>

      <div style={{ padding: '20px', textAlign: 'center', backgroundColor: 'rgba(0,0,0,0.3)' }}>
        <div style={{ fontSize: '24px', color: '#fde047', fontWeight: '900' }}>Step 3. 단어 떨어지기!</div>
        <div style={{ fontSize: '18px', color: 'white', marginTop: '8px' }}>그림이 바닥에 닿기 전에 맞는 알파벳을 누르세요!</div>
      </div>

      <div style={{ flex: 1, position: 'relative', animation: isWrong ? 'shake 0.5s' : 'none' }}>
        {currentItem && (
          <div style={{
            position: 'absolute',
            left: '50%',
            top: `${dropY}vh`,
            transform: 'translateX(-50%)',
            fontSize: '100px',
            animation: isPopping ? 'popAction 0.8s ease-out forwards' : 'none',
            filter: 'drop-shadow(0 10px 15px rgba(0,0,0,0.3))'
          }}>
            {isPopping ? '✨' : currentItem.icon}
          </div>
        )}
      </div>

      <div style={{ height: '20px', backgroundColor: '#ef4444', opacity: 0.8, boxShadow: '0 -10px 20px rgba(239, 68, 68, 0.5)' }}></div>

      <div style={{ height: '200px', backgroundColor: 'white', display: 'flex', justifyContent: 'space-evenly', alignItems: 'center', padding: '0 20px', borderRadius: '40px 40px 0 0', boxShadow: '0 -10px 30px rgba(0,0,0,0.2)' }}>
        {ITEMS.map((btn, idx) => (
          <button
            key={idx}
            onClick={() => handleButtonClick(btn.letter)}
            style={{
              width: '120px', height: '120px', borderRadius: '24px',
              backgroundColor: '#f1f5f9', border: '4px solid #cbd5e1',
              fontSize: '48px', fontWeight: '900', color: '#0f172a',
              cursor: 'pointer', boxShadow: '0 10px 0 #94a3b8',
              transition: 'all 0.1s'
            }}
            onMouseDown={(e) => { e.currentTarget.style.transform = 'translateY(10px)'; e.currentTarget.style.boxShadow = '0 0 0 #94a3b8'; }}
            onMouseUp={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 10px 0 #94a3b8'; }}
          >
            {btn.letter}
          </button>
        ))}
      </div>
    </div>
  );
}