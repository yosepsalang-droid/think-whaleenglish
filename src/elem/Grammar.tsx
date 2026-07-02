import React, { useState, useEffect, useMemo } from 'react';
import { CONFIG } from '../config';
import Ranking from './Ranking';

const style: { [key: string]: React.CSSProperties } = {
  container: { padding: '20px', maxWidth: '600px', margin: '0 auto', fontFamily: 'Pretendard, sans-serif' },
  card: { background: '#ffffff', borderRadius: '25px', padding: '30px', boxShadow: '0 10px 30px rgba(0,0,0,0.15)', marginBottom: '20px', border: '1px solid #f0f0f0' },
  title: { fontSize: '28px', fontWeight: '800', color: '#1e293b', textAlign: 'center', marginBottom: '20px' },
  button: { background: '#3b82f6', color: '#fff', border: 'none', padding: '18px', borderRadius: '20px', fontSize: '20px', fontWeight: 'bold', cursor: 'pointer', width: '100%', marginBottom: '10px' },
  choiceBtn: { background: '#f1f5f9', border: '2px solid #e2e8f0', padding: '20px', borderRadius: '15px', fontSize: '18px', cursor: 'pointer', fontWeight: '700', color: '#334155', width: '100%' },
  header: { display: 'flex', justifyContent: 'space-between', marginBottom: '20px', color: '#64748b', fontSize: '18px', fontWeight: '700' }
};

export default function Grammar({ onBack, studentName = "테스트학생" }: any) {
  const [allData, setAllData] = useState<any[]>([]);
  const [rankingData, setRankingData] = useState({ thisMonth: [], lastMonth: [] });
  const [isRankingLoading, setIsRankingLoading] = useState(true); // 🚨 로딩 상태 추가
  
  const [stage, setStage] = useState(0);
  const [score, setScore] = useState(0);
  const [currentProblem, setCurrentProblem] = useState<any>(null);
  const [choices, setChoices] = useState<string[]>([]);
  const [isFinished, setIsFinished] = useState(false);

  const dateInfo = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    return { currentMonth, lastMonth };
  }, []);

  useEffect(() => {
    fetch(CONFIG.WEB_APP_URL, { method: "POST", body: JSON.stringify({ type: "getRanking", taskType: "문법게임" }) })
      .then(res => res.json())
      .then(data => {
        setRankingData({ thisMonth: data.thisMonth || [], lastMonth: data.lastMonth || [] });
        setIsRankingLoading(false);
      })
      .catch(() => setIsRankingLoading(false));

    fetch(CONFIG.SHEETS.ELEM_GRAMMAR)
      .then(res => res.text())
      .then(text => {
        const rows = text.split(/\r?\n/).slice(1);
        const parsed = rows.map(r => { const c = r.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/); return { eng: c[3]?.replace(/^"|"$/g, '').trim(), kor: c[4]?.replace(/^"|"$/g, '').trim() }; }).filter(i => i.eng && i.kor);
        setAllData(parsed);
      });
  }, []);

  const generateProblem = () => {
    if (stage >= 10) { setIsFinished(true); return; }
    const target = allData[Math.floor(Math.random() * allData.length)];
    const words = target.eng.split(/\s+/).map((w: string) => w.replace(/[^a-zA-Z]/g, '')).filter((w: string) => w.length > 2);
    const targetWord = words[Math.floor(Math.random() * words.length)];
    const sentenceWithBlank = target.eng.replace(new RegExp(`\\b${targetWord}\\b`, 'i'), '__________');
    
    const wrong = Array.from(new Set(allData.flatMap(d => d.eng.split(/\s+/).map((w: string) => w.replace(/[^a-zA-Z]/g, ''))).filter(w => w.length > 2))).filter(w => w.toLowerCase() !== targetWord.toLowerCase()).sort(() => 0.5 - Math.random()).slice(0, 3);
    
    setCurrentProblem({ ...target, sentenceWithBlank, targetWord: targetWord.toLowerCase() });
    setChoices([targetWord.toLowerCase(), ...wrong].sort(() => 0.5 - Math.random()));
    setStage(s => s + 1);
  };

  const handleAnswer = (selected: string) => {
    if (selected === currentProblem.targetWord) {
      setScore(s => s + 100);
      const utterance = new SpeechSynthesisUtterance(currentProblem.eng);
      utterance.lang = 'en-US';
      window.speechSynthesis.speak(utterance);
      setTimeout(generateProblem, 1000);
    } else {
      alert("틀렸어! 다시 해보자!");
    }
  };

  return (
    <div style={style.container}>
      <button onClick={onBack} style={{marginBottom:'20px', padding:'10px', borderRadius:'10px'}}>⬅ 돌아가기</button>
      {stage === 0 ? (
        <div style={style.card}>
          <h2 style={style.title}>⚡ 스피드 문법 퀴즈</h2>
          {/* 🚨 아래에 isLoading={isRankingLoading}을 명시적으로 추가하여 에러 해결 */}
          <Ranking title={`${dateInfo.lastMonth}월 명예의 전당 (1-3등)`} data={rankingData.lastMonth.slice(0, 3)} isLoading={isRankingLoading} />
          <Ranking title={`${dateInfo.currentMonth}월 실시간 랭킹`} data={rankingData.thisMonth} isLoading={isRankingLoading} />
          <button style={style.button} onClick={generateProblem}>게임 시작하기</button>
        </div>
      ) : isFinished ? (
        <div style={style.card}>
          <h2>최종 점수: {score}점</h2>
          <button style={style.button} onClick={() => window.location.reload()}>다시하기</button>
        </div>
      ) : (
        <div style={style.card}>
          <div style={style.header}><span>문제 {stage}</span><span>점수: {score}</span></div>
          <p style={{fontSize:'20px', color:'#64748b', textAlign:'center'}}>{currentProblem?.kor}</p>
          <h2 style={{fontSize:'28px', textAlign:'center', margin:'30px 0'}}>{currentProblem?.sentenceWithBlank}</h2>
          <div style={{display:'grid', gap:'10px'}}>
            {choices.map((c, i) => <button key={i} style={style.choiceBtn} onClick={() => handleAnswer(c)}>{c}</button>)}
          </div>
        </div>
      )}
    </div>
  );
}