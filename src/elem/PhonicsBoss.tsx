import React, { useState, useEffect } from 'react';

interface PhonicsBossProps {
  onBack: () => void;
  onComplete: () => void;
}

// 💡 [수정] 알파벳당 3개씩, 총 12개의 단어로 꽉 채웠습니다!
const PHONICS_DB = [
  { id: 1, letter: 'Aa', word: 'apple', icon: '🍎', sound: 'apple' },
  { id: 2, letter: 'Aa', word: 'ant', icon: '🐜', sound: 'ant' },
  { id: 3, letter: 'Aa', word: 'alligator', icon: '🐊', sound: 'alligator' },
  { id: 4, letter: 'Bb', word: 'bear', icon: '🐻', sound: 'bear' },
  { id: 5, letter: 'Bb', word: 'bus', icon: '🚌', sound: 'bus' },
  { id: 6, letter: 'Bb', word: 'banana', icon: '🍌', sound: 'banana' },
  { id: 7, letter: 'Cc', word: 'cat', icon: '🐱', sound: 'cat' },
  { id: 8, letter: 'Cc', word: 'cup', icon: '☕', sound: 'cup' },
  { id: 9, letter: 'Cc', word: 'cake', icon: '🍰', sound: 'cake' },
  { id: 10, letter: 'Dd', word: 'dog', icon: '🐶', sound: 'dog' },
  { id: 11, letter: 'Dd', word: 'duck', icon: '🦆', sound: 'duck' },
  { id: 12, letter: 'Dd', word: 'dinosaur', icon: '🦕', sound: 'dinosaur' }
];

export default function PhonicsBoss({ onBack, onComplete }: PhonicsBossProps) {
  const [gameState, setGameState] = useState<'intro' | 'playing' | 'result'>('intro');
  const [targetLetter, setTargetLetter] = useState('Aa');
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(40); // 💡 제한 시간 40초로 연장
  const [moles, setMoles] = useState<any[]>([]);

  useEffect(() => {
    const letters = ['Aa', 'Bb', 'Cc', 'Dd'];
    setTargetLetter(letters[Math.floor(Math.random() * letters.length)]);
  }, []);

  const speakWord = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 1.0; 
      
      const voices = window.speechSynthesis.getVoices();
      const bestVoice = voices.find(v => v.lang === 'en-US' && (v.name.includes('Google') || v.name.includes('Natural'))) || voices.find(v => v.lang === 'en-US');
      if (bestVoice) utterance.voice = bestVoice;
      
      window.speechSynthesis.speak(utterance);
    }
  };

  const startGame = () => {
    setGameState('playing');
    setScore(0);
    setTimeLeft(40); // 💡 40초 세팅
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance("Ready, Go!");
      utterance.lang = 'en-US';
      window.speechSynthesis.speak(utterance);
    }
  };

  useEffect(() => {
    if (gameState !== 'playing') return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setGameState('result');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [gameState]);

  // 💡 [수정] 아이들 맞춤형 속도 조절 (천천히 등장하고, 오래 머무름)
  useEffect(() => {
    if (gameState !== 'playing') return;
    
    const spawnTimer = setInterval(() => {
      const randomItem = PHONICS_DB[Math.floor(Math.random() * PHONICS_DB.length)];
      
      const newMole = {
        uid: Math.random(),
        ...randomItem,
        left: Math.floor(Math.random() * 70) + 10, 
        top: Math.floor(Math.random() * 60) + 20,  
      };
      
      setMoles(prev => [...prev, newMole]);

      // 💡 3초(3000ms) 동안 화면에 유지되어 아이들이 충분히 누를 수 있음
      setTimeout(() => {
        setMoles(prev => prev.filter(m => m.uid !== newMole.uid));
      }, 3000);
      
    }, 1200); // 💡 1.2초(1200ms)마다 하나씩 천천히 스폰

    return () => clearInterval(spawnTimer);
  }, [gameState]);

  const handlePop = (clickedMole: any, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (clickedMole.letter === targetLetter) {
      setScore(prev => prev + 10);
      speakWord(clickedMole.sound);
    } else {
      setScore(prev => Math.max(0, prev - 5));
    }
    
    setMoles(prev => prev.filter(m => m.uid !== clickedMole.uid));
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)', display: 'flex', flexDirection: 'column', zIndex: 2000, fontFamily: 'Pretendard, sans-serif', overflow: 'hidden' }}>
      
      <style>
        {`
          @keyframes popUp { 0% { transform: scale(0); opacity: 0; } 50% { transform: scale(1.2); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }
          @keyframes pulseText { 0% { transform: scale(1); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } }
        `}
      </style>

      <div style={{ position: 'absolute', top: '24px', left: '24px', zIndex: 50 }}>
        <button onClick={onBack} style={{ width: '50px', height: '50px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.2)', color: 'white', border: 'none', fontSize: '24px', fontWeight: 'bold', cursor: 'pointer' }}>
          ←
        </button>
      </div>

      {gameState === 'intro' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ fontSize: '80px', marginBottom: '20px' }}>👾</div>
          <h1 style={{ fontSize: '48px', color: '#fde047', fontWeight: '900', margin: '0 0 20px 0', textShadow: '0 4px 10px rgba(0,0,0,0.5)' }}>미니 보스전!</h1>
          <p style={{ fontSize: '24px', color: '#e0e7ff', marginBottom: '40px' }}>
            목표: <strong style={{ color: '#f472b6', fontSize: '32px' }}>{targetLetter}</strong> 로 시작하는 그림만 모두 터트리세요!
          </p>
          <button onClick={startGame} style={{ padding: '20px 60px', fontSize: '28px', fontWeight: '900', backgroundColor: '#ec4899', color: 'white', border: 'none', borderRadius: '40px', cursor: 'pointer', boxShadow: '0 10px 20px rgba(236, 72, 153, 0.4)' }} onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'} onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}>
            게임 시작 🚀
          </button>
        </div>
      )}

      {gameState === 'playing' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '30px 100px', backgroundColor: 'rgba(0,0,0,0.3)' }}>
            <div style={{ fontSize: '32px', color: '#f472b6', fontWeight: '900', animation: 'pulseText 1s infinite' }}>
              Target: {targetLetter}
            </div>
            <div style={{ fontSize: '40px', color: '#fde047', fontWeight: '900' }}>
              SCORE: {score}
            </div>
            <div style={{ fontSize: '32px', color: timeLeft <= 10 ? '#ef4444' : '#4ade80', fontWeight: '900' }}>
              ⏳ {timeLeft}초
            </div>
          </div>

          <div style={{ flex: 1, position: 'relative' }}>
            {moles.map((mole) => (
              <button
                key={mole.uid}
                onClick={(e) => handlePop(mole, e)}
                style={{
                  position: 'absolute', left: `${mole.left}%`, top: `${mole.top}%`,
                  width: '140px', height: '140px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.9)',
                  border: '6px solid #818cf8', fontSize: '80px', display: 'flex', justifyContent: 'center', alignItems: 'center',
                  cursor: 'crosshair', boxShadow: '0 15px 30px rgba(0,0,0,0.3)',
                  animation: 'popUp 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
                  transform: 'translate(-50%, -50%)'
                }}
              >
                {mole.icon}
              </button>
            ))}
          </div>
        </>
      )}

      {gameState === 'result' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.8)' }}>
          <div style={{ fontSize: '100px', animation: 'pulseText 1s infinite' }}>🏆</div>
          <h1 style={{ fontSize: '50px', color: '#fde047', fontWeight: '900', margin: '20px 0' }}>Time Over!</h1>
          <p style={{ fontSize: '32px', color: 'white', marginBottom: '40px' }}>최종 점수: <span style={{ color: '#4ade80', fontWeight: '900' }}>{score}</span>점</p>
          <button onClick={onComplete} style={{ padding: '24px 80px', fontSize: '28px', fontWeight: '900', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '40px', cursor: 'pointer', boxShadow: '0 10px 20px rgba(59, 130, 246, 0.4)' }}>
            보상 받기 🌟
          </button>
        </div>
      )}

    </div>
  );
}