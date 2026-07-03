import React, { useState, useEffect } from 'react';
import { CONFIG } from '../config';
import Ranking from './Ranking';

const GAME_LEVEL = 1; 

const style: { [key: string]: React.CSSProperties } = {
  container: { padding: '20px', maxWidth: '600px', margin: '0 auto', fontFamily: 'Pretendard, sans-serif' },
  card: { background: '#ffffff', borderRadius: '25px', padding: '30px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', marginBottom: '20px', border: '1px solid #f0f0f0' },
  title: { fontSize: '24px', fontWeight: '800', color: '#1e293b', textAlign: 'center', marginBottom: '20px' },
  button: { background: '#3b82f6', color: '#fff', border: 'none', padding: '18px', borderRadius: '20px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer', width: '100%', marginBottom: '10px' },
  // 👇 보기 버튼: 크기 고정(height 80px) & 글자 길이에 따른 자동 폰트 크기 조절(clamp)
  choiceBtn: { 
    background: '#f1f5f9', 
    border: '2px solid #e2e8f0', 
    padding: '10px 15px', 
    borderRadius: '15px', 
    fontSize: 'clamp(14px, 3.5vw, 18px)', 
    cursor: 'pointer', 
    fontWeight: '600', 
    color: '#334155', 
    width: '100%', 
    height: '80px', 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center', 
    textAlign: 'center', 
    wordBreak: 'break-word', 
    transition: '0.2s' 
  },
  header: { display: 'flex', justifyContent: 'space-between', marginBottom: '15px', color: '#64748b', fontSize: '16px', fontWeight: '600' },
  timerBar: { height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden', marginBottom: '20px' }
};

export default function Grammar({ onBack, student }: { onBack: () => void, student?: any }) {
  const [activePool, setActivePool] = useState<any[]>([]);
  const [rankingData, setRankingData] = useState<{thisMonth: any[], lastMonth: any[]}>({ thisMonth: [], lastMonth: [] });
  const [isRankingLoading, setIsRankingLoading] = useState(true);
  
  const [stage, setStage] = useState(0); 
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3); 
  const [timeLeft, setTimeLeft] = useState(10); // ⏳ 10초 카운트다운 타이머
  const [currentProblem, setCurrentProblem] = useState<any>(null);
  const [choices, setChoices] = useState<string[]>([]);
  const [isFinished, setIsFinished] = useState(false);

  // 1. 데이터 로드 및 랭킹 초기화
  useEffect(() => {
    fetch(CONFIG.WEB_APP_URL, { method: "POST", body: JSON.stringify({ type: "getRanking", taskType: "문법게임" }) })
      .then(res => res.json())
      .then(data => { setRankingData({ thisMonth: data.thisMonth || [], lastMonth: data.lastMonth || [] }); setIsRankingLoading(false); })
      .catch(err => console.error("랭킹 로드 실패:", err));

    fetch(CONFIG.SHEETS.ELEM_GRAMMAR)
      .then(res => res.text())
      .then(text => {
        const rows = text.split(/\r?\n/).slice(1);
        const allParsed = rows.map(r => { 
            const c = r.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/); 
            return { book: c[0]?.trim(), eng: c[4]?.replace(/^"|"$/g, '').trim(), kor: c[5]?.replace(/^"|"$/g, '').trim() }; 
        }).filter(i => i.eng && i.kor);

        let targetBooks = GAME_LEVEL === 1 ? ['240_1', '240_2', '240_3'] : ['520_1'];
        setActivePool(allParsed.filter(i => targetBooks.includes(i.book)));
      });
  }, []);

  // 2. 점수 자동 저장 (Sheet 5 기록 - grade, stage 파라미터 완벽 보완!)
  useEffect(() => {
    if (isFinished && score > 0) {
      console.log("📊 [점수 저장 시도] 시트5 전송 중...", { studentName: student?.name || "학생", score, stage });
      
      fetch(CONFIG.WEB_APP_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ 
          type: "saveLog", 
          studentName: student?.name || "학생", 
          grade: student?.grade || "초등", // Apps Script 파라미터 대응
          score: score, 
          stage: stage,                    // Apps Script 파라미터 대응
          taskType: "문법게임" 
        }),
      })
      .then(res => res.json())
      .then(res => console.log("✅ [점수 저장 성공] 구글 시트 응답:", res))
      .catch(err => console.error("❌ [점수 저장 실패]:", err));
    }
  }, [isFinished, score, student, stage]);

  // 3. ⏳ 10초 제한시간 카운트다운 타이머 로직
  useEffect(() => {
    if (stage > 0 && !isFinished) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleTimeout(); // 10초 초과 시 오답 처리
            return 10;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [stage, isFinished, lives, currentProblem]);

  const handleTimeout = () => {
    const nextLives = lives - 1;
    setLives(nextLives);
    if (nextLives <= 0) {
      setIsFinished(true);
    } else {
      alert(`⏰ 시간 초과! 목숨이 ${nextLives}개 남았습니다.`);
      generateProblem(stage);
      setTimeLeft(10);
    }
  };

  const startGame = () => {
    if (activePool.length === 0) { alert("문제를 불러오는 중입니다. 잠시만 기다려주세요."); return; }
    setScore(0); setLives(3); setStage(0); setIsFinished(false); setTimeLeft(10);
    generateProblem(0);
  };

  const generateProblem = (currentStage: number) => {
    if (currentStage >= 10) { setIsFinished(true); return; }
    
    const target = activePool[Math.floor(Math.random() * activePool.length)];
    
    // 👇 [빈칸 버그 수정] 마침표, 쉼표 등 구두점을 제거한 순수 단어만 추출하여 블랭크 생성 실패 방지!
    const cleanWords = target.eng.split(/\s+/).map((w: string) => w.replace(/[^a-zA-Z]/g, '')).filter((w: string) => w.length > 2);
    const targetWord = (cleanWords[Math.floor(Math.random() * cleanWords.length)] || "the").toLowerCase();
    
    // 대소문자 구분 없이 해당 단어만 빈칸 변환 (구두점은 그대로 유지)
    const sentenceWithBlank = target.eng.replace(new RegExp(`(${targetWord})`, 'i'), '__________');
    
    const wrong = activePool.flatMap((d: any) => d.eng.split(/\s+/))
      .map((w: string) => w.replace(/[^a-zA-Z]/g, '').toLowerCase())
      .filter((w: string) => w.length > 2 && w !== targetWord)
      .sort(() => 0.5 - Math.random())
      .slice(0, 3);
    
    setCurrentProblem({ ...target, sentenceWithBlank, targetWord });
    setChoices([targetWord, ...wrong].sort(() => 0.5 - Math.random()));
    setStage(currentStage + 1);
    setTimeLeft(10); // 문제 시작 시 10초 리셋
  };

  const handleAnswer = (selected: string) => {
    if (selected.toLowerCase() === currentProblem.targetWord.toLowerCase()) {
      setScore(s => s + 100);
      generateProblem(stage);
    } else {
      const nextLives = lives - 1;
      setLives(nextLives);
      if (nextLives <= 0) setIsFinished(true);
      else {
        alert(`틀렸어요! 목숨이 ${nextLives}개 남았습니다.`);
        setTimeLeft(10);
      }
    }
  };

  // 4. 👑 내 이번 달 실시간 등수 & 점수 계산
  const getMyRankInfo = () => {
    const myName = student?.name;
    if (!myName) return null;
    const index = rankingData.thisMonth.findIndex((r: any) => r.studentName === myName);
    return index !== -1 ? `${index + 1}위 (${rankingData.thisMonth[index].score}점)` : "기록 없음 (도전해보세요!)";
  };

  return (
    <div style={style.container}>
      <button onClick={onBack} style={{marginBottom:'20px', padding:'10px', borderRadius:'10px', border:'none', cursor:'pointer', fontWeight:'bold'}}>⬅ 돌아가기</button>
      
      {stage === 0 ? (
        <div style={style.card}>
          <h2 style={style.title}>⚡ 스피드 문법 퀴즈</h2>
          
          {/* 👇 학생 로그인 시 내 실시간 등수 노출 */}
          {student?.name && (
            <div style={{ background: '#eff6ff', padding: '15px', borderRadius: '15px', marginBottom: '20px', border: '1px solid #bfdbfe', textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: '16px', color: '#1e3a8a' }}>
                👤 <strong>{student.name}</strong> 학생의 7월 실시간 랭킹: <strong style={{ color: '#2563eb', fontSize:'18px' }}>{getMyRankInfo()}</strong>
              </p>
            </div>
          )}

          <Ranking title="6월 명예의 전당 (1-3등)" data={rankingData.lastMonth.slice(0, 3)} isLoading={isRankingLoading} />
          <Ranking title="7월 실시간 랭킹" data={rankingData.thisMonth} isLoading={isRankingLoading} />
          <button style={style.button} onClick={startGame}>게임 시작하기</button>
        </div>
      ) : isFinished ? (
        <div style={style.card}>
          <h2 style={style.title}>🎉 게임 종료!</h2>
          <p style={{textAlign:'center', fontSize:'32px', fontWeight:'800', color:'#3b82f6', margin:'20px 0'}}>최종 점수: {score}점</p>
          {student?.name && (
            <p style={{textAlign:'center', fontSize:'18px', color:'#64748b', marginBottom:'25px'}}>
              현재 7월 실시간 순위: <strong style={{color:'#1e293b'}}>{getMyRankInfo()}</strong>
            </p>
          )}
          <button style={style.button} onClick={startGame}>다시 시작하기</button>
        </div>
      ) : (
        <div style={style.card}>
          <div style={style.header}>
            <span>문제 {stage} / 10</span>
            <span style={{color: '#3b82f6'}}>⏳ 10초 중 <strong>{timeLeft}초</strong> 남음</span>
            <span>점수: {score}</span>
            <span style={{color: '#ef4444'}}>❤️ {lives}</span>
          </div>

          {/* ⏳ 시각적 타이머 바 (남은 시간에 따라 줄어듦) */}
          <div style={style.timerBar}>
            <div style={{ width: `${(timeLeft / 10) * 100}%`, height: '100%', background: timeLeft <= 3 ? '#ef4444' : '#3b82f6', transition: 'width 1s linear' }} />
          </div>

          <p style={{fontSize:'18px', color:'#64748b', textAlign:'center', marginBottom:'10px', minHeight:'27px'}}>{currentProblem?.kor}</p>
          <h2 style={{fontSize:'22px', textAlign:'center', margin:'20px 0', lineHeight:'1.6', wordBreak:'break-word'}}>{currentProblem?.sentenceWithBlank}</h2>
          
          {/* 👇 보기 4개 Grid: 2x2 비율로 크기 균일하게 고정 & CSS style의 clamp로 글자크기 자동 조절 */}
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px'}}>
            {choices.map((c: string, i: number) => (
              <button key={i} style={style.choiceBtn} onClick={() => handleAnswer(c)}>
                {c}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}