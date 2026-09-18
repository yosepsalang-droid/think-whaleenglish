import React, { useState } from 'react';
// 💡 1~6단계 파일을 모두 불러옵니다!
import PhonicsLearn from './PhonicsLearn';
import PhonicsTrace from './PhonicsTrace';
import PhonicsBubblePop from './PhonicsBubblePop';
import PhonicsWordDrop from './PhonicsWordDrop';
import PhonicsMaster from './PhonicsMaster'; 
import PhonicsBoss from './PhonicsBoss'; // 💡 6단계 미니 보스전 추가!

interface PhonicsLobbyProps {
  onBack: () => void;
  studentName?: string;
}

export default function PhonicsLobby({ onBack, studentName = "김철수" }: PhonicsLobbyProps) {
  // 별 개수 및 진도 상태 관리
  const [stars, setStars] = useState(12);
  const [currentProgress, setCurrentProgress] = useState({ level: 1, day: 1, step: 1 });
  const [reviewLimit, setReviewLimit] = useState(5);

  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  const [selectedDay, setSelectedDay] = useState<number>(1);
  
  // 현재 실행 중인 미니게임 번호
  const [activeStep, setActiveStep] = useState<number | null>(null);

  const stages = [
    { id: 1, name: "알파벳 동굴", title: "Alphabet", x: "15%", y: "60%", emoji: "🦇" },
    { id: 2, name: "단모음 숲", title: "Short Vowels", x: "40%", y: "30%", emoji: "🌳" },
    { id: 3, name: "장모음 화산", title: "Long Vowels", x: "65%", y: "70%", emoji: "🌋" },
    { id: 4, name: "이중소리 성", title: "Digraphs", x: "85%", y: "40%", emoji: "🏰" },
  ];

  const level1Days = [
    { id: 1, title: "Day 1", target: "Aa, Bb, Cc, Dd" },
    { id: 2, title: "Day 2", target: "Ee, Ff, Gg, Hh" },
    { id: 3, title: "Day 3", target: "Ii, Jj, Kk, Ll" },
    { id: 4, title: "Day 4", target: "Mm, Nn, Oo, Pp" },
    { id: 5, title: "Day 5", target: "Qq, Rr, Ss, Tt" },
    { id: 6, title: "Day 6", target: "Uu, Vv, Ww, Xx" },
    { id: 7, title: "Day 7", target: "Yy, Zz" },
  ];

  const levelSteps = [
    { id: 1, title: "마법의 거울", desc: "말하기", emoji: "🎙️", reward: "🌟 1" },
    { id: 2, title: "마법 스케치북", desc: "따라쓰기", emoji: "✏️", reward: "🌟 1" },
    { id: 3, title: "방울 터트리기", desc: "듣고 찾기", emoji: "🫧", reward: "🌟 1" },
    { id: 4, title: "단어 떨어지기", desc: "단어 매칭", emoji: "🍎", reward: "🌟 1" },
    { id: 5, title: "파닉스 마스터", desc: "종합 퀴즈", emoji: "👑", reward: "🌟 1" },
    { id: 6, title: "미니 보스전", desc: "총정리 배틀", emoji: "👾", reward: "🌟 1" },
  ];

  // 단계를 완료했을 때 별을 1개 받고 로비로 돌아오는 함수
  const handleStepComplete = () => {
    alert("🌟 미션 완료! 별 1개를 획득했습니다!");
    setStars(prev => prev + 1);
    
    // 현재 진도를 깼다면 다음 스텝으로 넘어가기
    if (activeStep === currentProgress.step) {
      setCurrentProgress(prev => ({ ...prev, step: prev.step + 1 }));
    } else {
      // 복습인 경우 복습 찬스 차감
      setReviewLimit(prev => Math.max(0, prev - 1));
    }
    
    setActiveStep(null); // 로비로 복귀
  };

  const handleStepClick = (dayId: number, stepId: number, status: string) => {
    // 💡 6단계 막아두었던 로직을 깔끔하게 삭제했습니다!
    
    if (status === 'completed') {
      if (reviewLimit > 0) {
        setActiveStep(stepId); // 복습 진입
      } else {
        alert("오늘 복습 보상 횟수를 모두 소모했습니다. 연습 모드로 진입합니다.");
        setActiveStep(stepId); // 보상 없는 연습 진입
      }
    } else {
      setActiveStep(stepId); // 새 진도 진입
    }
  };

  // 💡 선택된 단계에 따라 1~6단계 파일을 띄워줍니다!
  // (여기에 day={selectedDay} 를 추가해서 몇 일차 수업인지 게임방에 알려줍니다!)
  if (activeStep === 1) return <PhonicsLearn day={selectedDay} onBack={() => setActiveStep(null)} onFinish={handleStepComplete} />;
  if (activeStep === 2) return <PhonicsTrace day={selectedDay} onBack={() => setActiveStep(null)} onComplete={handleStepComplete} />;
  if (activeStep === 3) return <PhonicsBubblePop day={selectedDay} onComplete={handleStepComplete} />;
  if (activeStep === 4) return <PhonicsWordDrop day={selectedDay} onComplete={handleStepComplete} />;
  if (activeStep === 5) return <PhonicsMaster day={selectedDay} onBack={() => setActiveStep(null)} onComplete={handleStepComplete} />;
  if (activeStep === 6) return <PhonicsBoss day={selectedDay} onBack={() => setActiveStep(null)} onComplete={handleStepComplete} />;

  // 기본 로비 화면
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'linear-gradient(135deg, #00b4db 0%, #0083b0 100%)', overflow: 'hidden', fontFamily: 'Pretendard, sans-serif', userSelect: 'none', zIndex: 1000 }}>
      
      <style>{`
        @keyframes float { 0% { transform: translateY(0px); } 50% { transform: translateY(-10px); } 100% { transform: translateY(0px); } }
        @keyframes slideUp { from { transform: translate(-50%, 100%); opacity: 0; } to { transform: translate(-50%, -50%); opacity: 1; } }
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>

      {/* 상단 헤더 */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 10 }}>
        <button onClick={onBack} style={{ width: '50px', height: '50px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.9)', border: 'none', fontSize: '24px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>←</button>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{ backgroundColor: 'rgba(255,255,255,0.9)', padding: '12px 24px', borderRadius: '30px', fontWeight: '900', color: '#0056b3', fontSize: '20px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>🐳 안녕, {studentName}!</div>
          <div style={{ backgroundColor: '#ffda79', padding: '12px 24px', borderRadius: '30px', fontWeight: '900', color: '#b33939', fontSize: '20px', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>🌟 {stars}</div>
        </div>
      </div>

      {/* 보물 지도 배경 선 */}
      <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1, pointerEvents: 'none' }}>
        <path d="M 200,600 Q 500,200 800,700 T 1600,400" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="6" strokeDasharray="15,15" />
      </svg>

      {/* 섬 (스테이지) 아이콘들 */}
      {stages.map((stage) => {
        const isUnlocked = stage.id <= currentProgress.level;
        const isCurrentLevel = stage.id === currentProgress.level;

        return (
          <div key={stage.id} style={{ position: 'absolute', left: stage.x, top: stage.y, transform: 'translate(-50%, -50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: isCurrentLevel ? 5 : 2, animation: isCurrentLevel ? 'float 3s ease-in-out infinite' : 'none' }}>
            <div 
              onClick={() => { if(isUnlocked) { setSelectedLevel(stage.id); setSelectedDay(currentProgress.day); } }}
              style={{ width: '140px', height: '140px', backgroundColor: isUnlocked ? '#a8e6cf' : '#b2bec3', borderRadius: '50%', border: `8px solid ${isUnlocked ? '#10ac84' : '#636e72'}`, display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '60px', boxShadow: '0 15px 25px rgba(0,0,0,0.2)', cursor: isUnlocked ? 'pointer' : 'not-allowed' }}
            >
              {isUnlocked ? stage.emoji : '🔒'}
              {isCurrentLevel && <div style={{ position: 'absolute', top: '-50px', fontSize: '50px', filter: 'drop-shadow(0 10px 5px rgba(0,0,0,0.2))' }}>🐳</div>}
            </div>
            <div style={{ marginTop: '16px', backgroundColor: isUnlocked ? 'white' : '#dfe6e9', padding: '10px 20px', borderRadius: '20px', textAlign: 'center', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', border: `2px solid ${isUnlocked ? '#10ac84' : '#b2bec3'}` }}>
              <div style={{ fontSize: '14px', fontWeight: 'bold', color: isUnlocked ? '#10ac84' : '#636e72' }}>Level {stage.id}</div>
              <div style={{ fontSize: '18px', fontWeight: '900', color: isUnlocked ? '#2d3436' : '#636e72' }}>{stage.title}</div>
            </div>
          </div>
        );
      })}

      {/* 우측 하단 상점 & 게임 버튼 */}
      <div style={{ position: 'absolute', bottom: '40px', right: '40px', display: 'flex', gap: '20px', zIndex: 10 }}>
        <button style={{ width: '90px', height: '90px', borderRadius: '24px', backgroundColor: '#ec4899', border: '4px solid #fbcfe8', fontSize: '40px', cursor: 'pointer', boxShadow: '0 10px 20px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
          👗<span style={{ fontSize: '12px', fontWeight: 'bold', marginTop: '4px' }}>캐릭터</span>
        </button>
        <button style={{ width: '90px', height: '90px', borderRadius: '24px', backgroundColor: '#8b5cf6', border: '4px solid #ddd6fe', fontSize: '40px', cursor: 'pointer', boxShadow: '0 10px 20px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
          🎮<span style={{ fontSize: '12px', fontWeight: 'bold', marginTop: '4px', backgroundColor: '#ffda79', color: '#b33939', padding: '2px 6px', borderRadius: '10px' }}>🌟 -3</span>
        </button>
      </div>

      {/* 중앙 오늘의 탐험 시작 버튼 */}
      <button onClick={() => alert("현재 열려있는 진도로 바로 이동합니다!")} style={{ position: 'absolute', bottom: '40px', left: '50%', transform: 'translateX(-50%)', backgroundColor: '#ffeb3b', color: '#b33939', border: 'none', borderRadius: '50px', padding: '24px 64px', fontSize: '28px', fontWeight: '900', cursor: 'pointer', zIndex: 20, boxShadow: '0 10px 20px rgba(0,0,0,0.2)', borderBottom: '6px solid #f39c12' }}>
        🚀 오늘의 탐험 시작하기!
      </button>

      {/* 섬 클릭 시 나타나는 진도 팝업창 */}
      {selectedLevel && (
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 3000, display: 'flex', justifyContent: 'center', alignItems: 'center' }} onClick={() => setSelectedLevel(null)}>
          <div style={{ backgroundColor: '#f8fafc', padding: '30px', borderRadius: '32px', width: '900px', height: '600px', boxShadow: '0 20px 40px rgba(0,0,0,0.3)', animation: 'slideUp 0.3s ease-out', position: 'relative', display: 'flex', gap: '30px' }} onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setSelectedLevel(null)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', fontSize: '32px', cursor: 'pointer', color: '#94a3b8', zIndex: 10 }}>✖</button>
            
            {/* 좌측 패널 (Day 리스트) */}
            <div className="no-scrollbar" style={{ width: '300px', backgroundColor: 'white', borderRadius: '24px', padding: '20px', overflowY: 'auto', border: '2px solid #e2e8f0', boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '24px', color: '#1e293b' }}>탐험 일지</h3>
                <div style={{ fontSize: '12px', fontWeight: 'bold', backgroundColor: '#fef3c7', color: '#d97706', padding: '4px 8px', borderRadius: '8px' }}>복습 찬스: {reviewLimit}/5</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {level1Days.map((day) => {
                  const isDayLocked = day.id > currentProgress.day;
                  const isSelected = day.id === selectedDay;
                  return (
                    <button key={day.id} onClick={() => !isDayLocked && setSelectedDay(day.id)} style={{ padding: '16px', borderRadius: '16px', border: isSelected ? '3px solid #3b82f6' : '2px solid #e2e8f0', backgroundColor: isDayLocked ? '#f1f5f9' : (isSelected ? '#eff6ff' : 'white'), textAlign: 'left', cursor: isDayLocked ? 'not-allowed' : 'pointer', opacity: isDayLocked ? 0.6 : 1 }}>
                      <div style={{ fontSize: '18px', fontWeight: '900', color: isSelected ? '#2563eb' : '#475569' }}>{day.title} {isDayLocked && '🔒'}</div>
                      <div style={{ fontSize: '14px', color: '#64748b', marginTop: '4px' }}>{day.target}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 우측 패널 (6단계 학습 코스) */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <h2 style={{ margin: '0 0 20px 0', fontSize: '28px', color: '#1e293b' }}>{level1Days.find(d => d.id === selectedDay)?.title} <span style={{ fontSize: '20px', color: '#64748b', fontWeight: 'normal' }}>({level1Days.find(d => d.id === selectedDay)?.target})</span></h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', flex: 1 }}>
                {levelSteps.map((step) => {
                  let status = 'locked'; 
                  if (selectedDay < currentProgress.day) status = 'completed'; 
                  else if (selectedDay === currentProgress.day) {
                    if (step.id < currentProgress.step) status = 'completed'; 
                    else if (step.id === currentProgress.step) status = 'current'; 
                  }
                  return (
                    <div key={step.id} onClick={() => status !== 'locked' && handleStepClick(selectedDay, step.id, status)} style={{ backgroundColor: status === 'locked' ? '#f1f5f9' : '#ffffff', border: `3px solid ${status === 'locked' ? '#e2e8f0' : (status === 'current' ? '#3b82f6' : '#22c55e')}`, borderRadius: '20px', padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: status === 'locked' ? 'not-allowed' : 'pointer', position: 'relative', opacity: status === 'locked' ? 0.7 : 1 }}>
                      {status === 'completed' && <div style={{ position: 'absolute', top: '-10px', right: '-10px', fontSize: '24px' }}>🟢</div>}
                      {status === 'current' && <div style={{ position: 'absolute', top: '-10px', right: '-10px', fontSize: '24px' }}>🔥</div>}
                      {status === 'locked' && <div style={{ position: 'absolute', top: '-10px', right: '-10px', fontSize: '24px' }}>🔒</div>}
                      <div style={{ fontSize: '40px', marginBottom: '8px' }}>{step.emoji}</div>
                      <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 'bold' }}>Step {step.id}</div>
                      <div style={{ fontSize: '18px', fontWeight: '900', color: '#1e293b', margin: '2px 0 8px 0', textAlign: 'center' }}>{step.title}</div>
                      <div style={{ fontSize: '13px', color: status === 'completed' && reviewLimit <= 0 ? '#94a3b8' : '#eab308', fontWeight: 'bold', backgroundColor: status === 'completed' && reviewLimit <= 0 ? '#f1f5f9' : '#fef9c3', padding: '4px 10px', borderRadius: '10px' }}>
                        {status === 'completed' ? (reviewLimit > 0 ? '🌟 복습 보상' : '연습 모드') : step.reward}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}