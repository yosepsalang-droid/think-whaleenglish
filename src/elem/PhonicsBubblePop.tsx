import React, { useState, useEffect } from 'react';

interface BubblePopProps {
  onComplete: () => void; 
}

// 💡 [수정] 기호(~)를 빼고 쉼표를 넣어 자연스럽게 쉬도록 했으며, 깔끔하게 소리 냅니다.
const TARGETS = [
  { letter: 'Aa', sound: '에이, 애' },
  { letter: 'Bb', sound: '비, 브' },
  { letter: 'Cc', sound: '씨, 크' },
  { letter: 'Dd', sound: '디, 드' }
];

export default function PhonicsBubblePop({ onComplete }: BubblePopProps) {
  const [step, setStep] = useState(0);
  const [bubbles, setBubbles] = useState<string[]>([]);
  const [isWrong, setIsWrong] = useState(false);
  
  const [poppingBubble, setPoppingBubble] = useState<string | null>(null);

  const currentTarget = TARGETS[step];

  useEffect(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
    }
  }, []);

  useEffect(() => {
    if (step < TARGETS.length) {
      const letters = TARGETS.map(t => t.letter);
      const shuffled = letters.sort(() => Math.random() - 0.5);
      setBubbles(shuffled);
      
      setTimeout(() => speakTeacher(TARGETS[step].sound), 500);
    }
  }, [step]);

  const speakTeacher = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      
      utterance.lang = 'ko-KR'; 
      utterance.rate = 0.85; 
      utterance.pitch = 1.1; 

      const voices = window.speechSynthesis.getVoices();
      const bestVoice = voices.find(v => v.name.includes('Google 한국어') || v.name.includes('Google Korean'))
                     || voices.find(v => v.name.includes('Siri') || v.name.includes('Yuna'))
                     || voices.find(v => v.lang.includes('ko'));
                     
      if (bestVoice) utterance.voice = bestVoice;

      window.speechSynthesis.speak(utterance);
    }
  };

  const handlePop = (clickedLetter: string) => {
    if (poppingBubble) return;

    if (clickedLetter === currentTarget.letter) {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      setPoppingBubble(clickedLetter);

      setTimeout(() => {
        setPoppingBubble(null);
        if (step + 1 < TARGETS.length) {
          setStep(prev => prev + 1); 
        } else {
          onComplete();
        }
      }, 800); 

    } else {
      setIsWrong(true);
      speakTeacher("아니야, " + currentTarget.sound);
      setTimeout(() => setIsWrong(false), 500);
    }
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: '#0ea5e9', display: 'flex', flexDirection: 'column', zIndex: 2000, fontFamily: 'Pretendard, sans-serif', overflow: 'hidden' }}>
      
      <style>
        {`
          @keyframes floatBubble {
            0% { transform: translateY(0) translateX(0); }
            33% { transform: translateY(-20px) translateX(10px); }
            66% { transform: translateY(10px) translateX(-10px); }
            100% { transform: translateY(0) translateX(0); }
          }
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-10px); }
            75% { transform: translateX(10px); }
          }
          @keyframes popAction {
            0% { transform: scale(1); opacity: 1; }
            40% { transform: scale(1.4); opacity: 0.9; background-color: #fde047; border-color: #fef08a; }
            100% { transform: scale(2.2); opacity: 0; }
          }
        `}
      </style>

      <div style={{ padding: '30px', textAlign: 'center', backgroundColor: 'rgba(255,255,255,0.2)' }}>
        <div style={{ fontSize: '24px', color: 'white', fontWeight: 'bold' }}>Step 2. 알파벳 방울 터트리기!</div>
        <div style={{ fontSize: '18px', color: '#e0f2fe', marginTop: '10px' }}>고래가 말하는 소리를 듣고 맞는 방울을 톡! 터트리세요.</div>
      </div>

      <div 
        onClick={() => speakTeacher(currentTarget.sound)}
        style={{ margin: '40px auto', fontSize: '80px', cursor: 'pointer', filter: 'drop-shadow(0 10px 10px rgba(0,0,0,0.2))', animation: isWrong ? 'shake 0.5s' : 'floatBubble 3s infinite' }}
      >
        {poppingBubble ? '🎉' : '🐳'}
      </div>

      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '30px', padding: '40px', flexWrap: 'wrap' }}>
        {bubbles.map((letter, idx) => {
          const isPopping = poppingBubble === letter;
          
          return (
            <button
              key={idx}
              onClick={() => handlePop(letter)}
              style={{
                width: '130px', height: '130px', borderRadius: '50%',
                backgroundColor: 'rgba(255, 255, 255, 0.8)',
                border: '4px solid rgba(255, 255, 255, 0.9)',
                fontSize: '48px', fontWeight: '900', color: '#0369a1',
                cursor: isPopping ? 'default' : 'pointer',
                boxShadow: isPopping ? 'none' : 'inset -10px -10px 20px rgba(0,0,0,0.1), 0 10px 20px rgba(0,0,0,0.2)',
                animation: isPopping ? 'popAction 0.8s ease-out forwards' : `floatBubble ${2 + (idx * 0.5)}s ease-in-out infinite`,
                transition: 'transform 0.1s',
                pointerEvents: isPopping ? 'none' : 'auto'
              }}
              onMouseDown={(e) => { if (!isPopping) e.currentTarget.style.transform = 'scale(0.9)'; }}
              onMouseUp={(e) => { if (!isPopping) e.currentTarget.style.transform = 'scale(1)'; }}
            >
              {isPopping ? '✨' : letter}
            </button>
          );
        })}
      </div>
    </div>
  );
}