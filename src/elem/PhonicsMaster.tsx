import React, { useState, useEffect } from 'react';

interface PhonicsMasterProps {
  onBack: () => void;
  onComplete: () => void;
}

const PHONICS_DB = [
  { id: 1, letter: 'Aa', word: 'apple', icon: '🍎', sound: 'apple' },
  { id: 2, letter: 'Aa', word: 'ant', icon: '🐜', sound: 'ant' },
  { id: 3, letter: 'Bb', word: 'bear', icon: '🐻', sound: 'bear' },
  { id: 4, letter: 'Bb', word: 'bus', icon: '🚌', sound: 'bus' },
  { id: 5, letter: 'Cc', word: 'cat', icon: '🐱', sound: 'cat' },
  { id: 6, letter: 'Cc', word: 'cup', icon: '☕', sound: 'cup' },
  { id: 7, letter: 'Dd', word: 'dog', icon: '🐶', sound: 'dog' },
  { id: 8, letter: 'Dd', word: 'duck', icon: '🦆', sound: 'duck' }
];

export default function PhonicsMaster({ onBack, onComplete }: PhonicsMasterProps) {
  const [step, setStep] = useState(0);
  
  // 💡 [핵심] 게임 시작 시 미리 겹치지 않는 5문제를 뽑아둘 리스트
  const [quizList, setQuizList] = useState<typeof PHONICS_DB>([]);
  
  const [choices, setChoices] = useState<typeof PHONICS_DB>([]);
  const [isWrong, setIsWrong] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  const TOTAL_STEPS = 5; 
  const [target, setTarget] = useState(PHONICS_DB[0]);

  // (임시) 브라우저 기본 TTS
  const speakTeacher = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 0.6; 
      utterance.pitch = 1.0; 

      const voices = window.speechSynthesis.getVoices();
      const bestVoice = voices.find(v => v.lang === 'en-US' && (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Premium')))
                     || voices.find(v => v.lang === 'en-US');
                     
      if (bestVoice) utterance.voice = bestVoice;

      window.speechSynthesis.speak(utterance);
    }
  };

  // 💡 [추가] 처음 화면이 켜질 때 딱 한 번! 전체 DB를 섞어서 중복 없는 5문제를 세팅합니다.
  useEffect(() => {
    const shuffledDB = [...PHONICS_DB].sort(() => 0.5 - Math.random());
    setQuizList(shuffledDB.slice(0, TOTAL_STEPS));
  }, []);

  // 단계가 바뀔 때마다 세팅해둔 문제 리스트에서 하나씩 꺼내옵니다.
  useEffect(() => {
    if (quizList.length > 0 && step < TOTAL_STEPS) {
      const currentTarget = quizList[step];
      setTarget(currentTarget);

      // 정답을 제외한 나머지 단어들 중에서 오답 3개를 섞어서 뽑기
      const wrongAnswers = PHONICS_DB.filter(item => item.id !== currentTarget.id)
                                     .sort(() => 0.5 - Math.random())
                                     .slice(0, 3);
      
      const mixedChoices = [...wrongAnswers, currentTarget].sort(() => 0.5 - Math.random());
      setChoices(mixedChoices);

      setTimeout(() => speakTeacher(currentTarget.sound), 500);
    }
  }, [step, quizList]);

  const handleSelect = (selectedId: number) => {
    if (isCorrect) return; 

    if (selectedId === target.id) {
      setIsCorrect(true);
      if ('speechSynthesis' in window) window.speechSynthesis.cancel(); 
      
      setTimeout(() => {
        setIsCorrect(false);
        if (step + 1 < TOTAL_STEPS) {
          setStep(prev => prev + 1);
        } else {
          onComplete(); 
        }
      }, 1500);
    } else {
      setIsWrong(true);
      speakTeacher(target.sound); 
      setTimeout(() => setIsWrong(false), 500);
    }
  };

  if (quizList.length === 0) return null; // 문제 세팅 전엔 빈 화면 유지

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'linear-gradient(to bottom, #fdf4ff, #e879f9)', display: 'flex', flexDirection: 'column', zIndex: 2000, fontFamily: 'Pretendard, sans-serif' }}>
      
      <style>
        {`
          @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-10px); } 75% { transform: translateX(10px); } }
          @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-20px); } }
        `}
      </style>

      <div style={{ position: 'absolute', top: '24px', left: '24px', zIndex: 10 }}>
        <button onClick={onBack} style={{ width: '50px', height: '50px', borderRadius: '50%', backgroundColor: 'white', border: 'none', fontSize: '24px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
          ←
        </button>
      </div>

      <div style={{ padding: '30px', display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '20px' }}>
        <div style={{ width: '60%', height: '16px', backgroundColor: '#fbcfe8', borderRadius: '8px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${(step / TOTAL_STEPS) * 100}%`, backgroundColor: '#c026d3', transition: 'width 0.3s' }}></div>
        </div>
        <div style={{ fontSize: '28px', color: '#86198f', fontWeight: '900', marginTop: '20px' }}>Step 5. 파닉스 마스터 👑</div>
        <div style={{ fontSize: '20px', color: '#a21caf', fontWeight: 'bold', marginTop: '8px' }}>소리를 듣고 알맞은 그림을 찾으세요!</div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
        {isCorrect ? (
          <div style={{ fontSize: '150px', animation: 'bounce 0.5s ease infinite', textShadow: '0 10px 20px rgba(0,0,0,0.2)' }}>⭕</div>
        ) : (
          <button 
            onClick={() => speakTeacher(target.sound)}
            style={{ 
              width: '180px', height: '180px', borderRadius: '50%', backgroundColor: 'white', 
              border: '8px solid #f472b6', fontSize: '100px', cursor: 'pointer', 
              boxShadow: '0 15px 30px rgba(0,0,0,0.1)', animation: isWrong ? 'shake 0.5s' : 'none',
              display: 'flex', justifyContent: 'center', alignItems: 'center'
            }}
          >
            🐳
          </button>
        )}
        <div style={{ marginTop: '20px', fontSize: '24px', fontWeight: 'bold', color: '#86198f' }}>
          고래를 누르면 소리가 다시 나요!
        </div>
      </div>

      <div style={{ height: '300px', backgroundColor: 'white', borderTopLeftRadius: '40px', borderTopRightRadius: '40px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '30px', padding: '0 40px', boxShadow: '0 -10px 30px rgba(0,0,0,0.1)' }}>
        {choices.map((item, idx) => (
          <button
            key={idx}
            onClick={() => handleSelect(item.id)}
            style={{
              width: '180px', height: '180px', borderRadius: '30px', backgroundColor: '#f8fafc',
              border: '4px solid #cbd5e1', fontSize: '80px', cursor: 'pointer',
              boxShadow: '0 10px 0 #cbd5e1', transition: 'all 0.1s',
              display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center'
            }}
            onMouseDown={(e) => { e.currentTarget.style.transform = 'translateY(10px)'; e.currentTarget.style.boxShadow = '0 0 0 #cbd5e1'; }}
            onMouseUp={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 10px 0 #cbd5e1'; }}
          >
            {item.icon}
            <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#64748b', marginTop: '10px' }}>{item.letter}</span>
          </button>
        ))}
      </div>

    </div>
  );
}