import React, { useState, useEffect } from 'react';
import { CONFIG } from '../config';
import Ranking from './Ranking';

// 디자인을 위한 스타일 (아이들이 좋아할 따뜻하고 둥근 느낌)
const style = {
  container: { padding: '20px', maxWidth: '600px', margin: '0 auto', fontFamily: 'Pretendard, sans-serif' },
  card: { background: '#ffffff', borderRadius: '25px', padding: '30px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', marginBottom: '20px', border: '1px solid #f0f0f0' },
  title: { fontSize: '24px', fontWeight: 'bold', color: '#333', textAlign: 'center', marginBottom: '20px' },
  button: { background: '#6366f1', color: '#fff', border: 'none', padding: '18px', borderRadius: '20px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer', width: '100%', marginBottom: '10px' },
  choiceBtn: { background: '#f8fafc', border: '2px solid #e2e8f0', padding: '20px', borderRadius: '20px', fontSize: '18px', cursor: 'pointer', fontWeight: '600', color: '#475569', transition: 'all 0.2s' },
  blank: { color: '#6366f1', borderBottom: '3px solid #6366f1', padding: '0 10px', fontSize: '24px', fontWeight: 'bold' },
  header: { display: 'flex', justifyContent: 'space-between', marginBottom: '20px', color: '#64748b', fontSize: '16px', fontWeight: '600' }
};

export default function Grammar({ onBack, student, studentName = student?.name || "테스트학생" }: any) {
  const [allData, setAllData] = useState<any[]>([]);
  const [rankingData, setRankingData] = useState({ thisMonth: [], lastMonth: [] });
  
  const [stage, setStage] = useState(1);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [currentProblem, setCurrentProblem] = useState<any>(null);
  const [choices, setChoices] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<{msg: string, isCorrect: boolean} | null>(null);
  const [isFinished, setIsFinished] = useState(false);

  // 1. 데이터 및 랭킹 불러오기
  useEffect(() => {
    // 랭킹 데이터 요청
    fetch(CONFIG.WEB_APP_URL, { method: "POST", body: JSON.stringify({ type: "getRanking", taskType: "문법게임" }) })
      .then(res => res.json()).then(data => setRankingData(data)).catch(console.error);

    // 문제 데이터 요청 (시트3)
    fetch(CONFIG.SHEETS.ELEM_GRAMMAR)
      .then(res => res.text())
      .then(text => {
        const rows = text.split(/\r?\n/).slice(1);
        const parsed = rows.map(r => { 
          const c = r.split(','); 
          return { book: c[0], english: c[4], korean: c[5] }; 
        }).filter(item => item.english && item.korean);
        setAllData(parsed);
      });
  }, []);

  // 2. 문제 만들기 (빈칸 뚫기 로직)
  const generateProblem = () => {
    if (stage > 10) { setIsFinished(true); return; }
    const target = allData[Math.floor(Math.random() * allData.length)];
    const words = target.english.replace(/[?.!]/g, '').split(' ');
    const targetIdx = Math.floor(Math.random() * words.length);
    const targetWord = words[targetIdx];
    
    // 빈칸 문장 생성
    const sentenceWithBlank = target.english.replace(targetWord, '____');
    
    // 오답 3개 + 정답 1개 섞기
    const wrong = allData.map(d => d.english.split(' ')).flat().filter(w => w !== targetWord && w.length > 1).slice(0, 3);
    setCurrentProblem({ ...target, sentenceWithBlank, answer: targetWord });
    setChoices([targetWord, ...wrong].sort(() => 0.5 - Math.random()));
    setFeedback(null);
  };

  // 3. 정답 확인 및 점수 저장
  const handleAnswer = (selected: string) => {
    if (feedback) return;
    const isCorrect = selected === currentProblem.answer;
    
    if (isCorrect) {
      setScore(s => s + 100);
      setFeedback({ msg: "정답이야! 참 잘했어요! 🌟", isCorrect: true });
    } else {
      setLives(l => l - 1);
      setFeedback({ msg: `틀렸어! 정답은 '${currentProblem.answer}' 야. 힘내! 💪`, isCorrect: false });
      if (lives - 1 <= 0) { setIsFinished(true); return; }
    }

    setTimeout(() => {
      if (stage < 10) { setStage(s => s + 1); generateProblem(); }
      else { setIsFinished(true); }
    }, 1500);
  };

  // 4. 최종 점수 서버 저장
  useEffect(() => {
    if (isFinished && score > 0) {
      fetch(CONFIG.WEB_APP_URL, {
        method: "POST",
        body: JSON.stringify({ type: "saveLog", studentName, score, stage: "10단계 완주", taskType: "문법게임" }),
      });
    }
  }, [isFinished]);

  return (
    <div style={style.container}>
      <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', marginBottom: '10px' }}>⬅ 돌아가기</button>
      
      {!currentProblem && !isFinished ? (
        <div style={style.card}>
          <h2 style={style.title}>문법 퀴즈 도전! 🚀</h2>
          <Ranking title="지난 달 명예의 전당" data={rankingData.lastMonth} isLoading={false} isHonorRoll={true} />
          <Ranking title="이번 달 실시간 랭킹" data={rankingData.thisMonth} isLoading={false} />
          <button style={style.button} onClick={generateProblem}>게임 시작하기</button>
        </div>
      ) : isFinished ? (
        <div style={style.card}>
          <h2 style={style.title}>게임 종료! 🏆</h2>
          <p style={{textAlign:'center', fontSize:'24px'}}>최종 점수: {score}점</p>
          <button style={style.button} onClick={() => window.location.reload()}>다시 도전하기</button>
        </div>
      ) : (
        <div style={style.card}>
          <div style={style.header}>
            <span>단계: {stage} / 10</span>
            <span>점수: {score}</span>
            <span>생명: {'❤️'.repeat(lives)}</span>
          </div>
          <div style={{ textAlign: 'center', margin: '40px 0' }}>
            <h3 style={{ color: '#475569', marginBottom: '10px' }}>{currentProblem.korean}</h3>
            <div style={{ fontSize: '28px', fontWeight: '800', marginTop: '10px' }}>
              {currentProblem.sentenceWithBlank.split('____')[0]}
              <span style={style.blank}>?</span>
              {currentProblem.sentenceWithBlank.split('____')[1]}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            {choices.map(c => (
              <button key={c} onClick={() => handleAnswer(c)} style={style.choiceBtn} onMouseOver={(e) => (e.currentTarget.style.background = '#eef2ff')}>{c}</button>
            ))}
          </div>
          {feedback && <div style={{ textAlign: 'center', marginTop: '20px', color: feedback.isCorrect ? '#4f46e5' : '#e11d48', fontWeight: 'bold' }}>{feedback.msg}</div>}
        </div>
      )}
    </div>
  );
}