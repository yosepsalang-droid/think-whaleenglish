import React, { useState, useEffect, useMemo } from 'react';
import { CONFIG } from '../config';
import Ranking from './Ranking';

const GAME_LEVEL = 1; 

const style: { [key: string]: React.CSSProperties } = {
  container: { padding: '20px', maxWidth: '600px', margin: '0 auto', fontFamily: 'Pretendard, sans-serif' },
  card: { background: '#ffffff', borderRadius: '25px', padding: '30px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', marginBottom: '20px', border: '1px solid #f0f0f0' },
  title: { fontSize: '24px', fontWeight: '800', color: '#1e293b', textAlign: 'center', marginBottom: '20px' },
  button: { background: '#3b82f6', color: '#fff', border: 'none', padding: '18px', borderRadius: '20px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer', width: '100%', marginBottom: '10px' },
  choiceBtn: { background: '#f1f5f9', border: '2px solid #e2e8f0', padding: '15px', borderRadius: '15px', fontSize: '16px', cursor: 'pointer', fontWeight: '600', color: '#334155', width: '100%', transition: '0.2s' },
  header: { display: 'flex', justifyContent: 'space-between', marginBottom: '20px', color: '#64748b', fontSize: '16px', fontWeight: '600' }
};

export default function Grammar({ onBack, student }: { onBack: () => void, student?: any }) {
  const [activePool, setActivePool] = useState<any[]>([]);
  const [rankingData, setRankingData] = useState<{thisMonth: any[], lastMonth: any[]}>({ thisMonth: [], lastMonth: [] });
  const [isRankingLoading, setIsRankingLoading] = useState(true);
  
  const [stage, setStage] = useState(0); 
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3); 
  const [currentProblem, setCurrentProblem] = useState<any>(null);
  const [choices, setChoices] = useState<string[]>([]);
  const [isFinished, setIsFinished] = useState(false);

  // 1. 데이터 로드 및 랭킹 초기화
  useEffect(() => {
    fetch(CONFIG.WEB_APP_URL, { method: "POST", body: JSON.stringify({ type: "getRanking", taskType: "문법게임" }) })
      .then(res => res.json())
      .then(data => { setRankingData({ thisMonth: data.thisMonth || [], lastMonth: data.lastMonth || [] }); setIsRankingLoading(false); });

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

  // 2. 점수 자동 저장 (Sheet 5 기록)
  useEffect(() => {
    if (isFinished && score > 0) {
      fetch(CONFIG.WEB_APP_URL, {
        method: "POST",
        body: JSON.stringify({ type: "saveLog", studentName: student?.name || "학생", score, taskType: "문법게임" }),
      });
    }
  }, [isFinished, score]);

  const startGame = () => {
    if (activePool.length === 0) { alert("문제를 불러오는 중입니다. 잠시만 기다려주세요."); return; }
    setScore(0); setLives(3); setStage(0); setIsFinished(false);
    generateProblem(0);
  };

  const generateProblem = (currentStage: number) => {
    if (currentStage >= 10) { setIsFinished(true); return; }
    
    const target = activePool[Math.floor(Math.random() * activePool.length)];
    const words = target.eng.split(/\s+/).filter((w: string) => w.length > 2);
    const targetWord = words[Math.floor(Math.random() * words.length)];
    const sentenceWithBlank = target.eng.replace(new RegExp(`\\b${targetWord}\\b`, 'i'), '__________');
    
    const wrong = activePool.flatMap((d: any) => d.eng.split(/\s+/)).filter((w: string) => w.length > 2 && w.toLowerCase() !== targetWord.toLowerCase()).sort(() => 0.5 - Math.random()).slice(0, 3);
    
    setCurrentProblem({ ...target, sentenceWithBlank, targetWord: targetWord.toLowerCase() });
    setChoices([targetWord.toLowerCase(), ...wrong].sort(() => 0.5 - Math.random()));
    setStage(currentStage + 1);
  };

  const handleAnswer = (selected: string) => {
    if (selected === currentProblem.targetWord) {
      setScore(s => s + 100);
      generateProblem(stage);
    } else {
      const nextLives = lives - 1;
      setLives(nextLives);
      if (nextLives <= 0) setIsFinished(true);
      else alert(`틀렸어요! 목숨이 ${nextLives}개 남았습니다.`);
    }
  };

  return (
    <div style={style.container}>
      <button onClick={onBack} style={{marginBottom:'20px', padding:'10px', borderRadius:'10px', border:'none', cursor:'pointer'}}>⬅ 돌아가기</button>
      {stage === 0 ? (
        <div style={style.card}>
          <h2 style={style.title}>⚡ 스피드 문법 퀴즈</h2>
          <Ranking title="6월 명예의 전당 (1-3등)" data={rankingData.lastMonth.slice(0, 3)} isLoading={isRankingLoading} />
          <Ranking title="7월 실시간 랭킹" data={rankingData.thisMonth} isLoading={isRankingLoading} />
          <button style={style.button} onClick={startGame}>게임 시작하기</button>
        </div>
      ) : isFinished ? (
        <div style={style.card}>
          <h2 style={style.title}>게임 종료!</h2>
          <p style={{textAlign:'center', fontSize:'24px', fontWeight:'bold'}}>최종 점수: {score}점</p>
          <button style={style.button} onClick={startGame}>다시 시작하기</button>
        </div>
      ) : (
        <div style={style.card}>
          <div style={style.header}>
            <span>문제 {stage} / 10</span>
            <span>점수: {score}</span>
            <span style={{color: '#ef4444'}}>❤️ 목숨: {lives}</span>
          </div>
          <p style={{fontSize:'18px', color:'#64748b', textAlign:'center', marginBottom:'10px'}}>{currentProblem?.kor}</p>
          <h2 style={{fontSize:'22px', textAlign:'center', margin:'20px 0', lineHeight:'1.6'}}>{currentProblem?.sentenceWithBlank}</h2>
          <div style={{display:'grid', gap:'10px'}}>
            {choices.map((c: string, i: number) => <button key={i} style={style.choiceBtn} onClick={() => handleAnswer(c)}>{c}</button>)}
          </div>
        </div>
      )}
    </div>
  );
}