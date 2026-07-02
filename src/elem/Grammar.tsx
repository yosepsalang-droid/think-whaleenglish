import React, { useState, useEffect, useMemo } from 'react';
import { CONFIG } from '../config';
import Ranking from './Ranking';

// ... (인터페이스 및 STAGE_MAPPING은 이전과 동일하게 유지)
const STAGE_MAPPING: Record<string, string[]> = {
  "1단계": ["240_1", "240_2", "240_3"], "2단계": ["240_4", "240_5", "240_6"],
  "3단계": ["520_1", "520_2", "520_3"], "4단계": ["520_4", "520_5", "520_6"],
  "5단계": ["800_1", "800_2", "800_3"], "6단계": ["800_4", "800_5", "800_6"],
  "7단계": ["1000_1", "1000_2", "1000_3"], "8단계": ["1000_4", "1000_5", "1000_6"],
  "9단계": ["1200_1", "1200_2", "1200_3"], "10단계": ["1200_4", "1200_5", "1200_6"],
};

export default function Grammar({ onBack, student, studentId = student?.id || "ST_TEST", studentName = student?.name || "테스트학생" }: any) {
  const [allGrammars, setAllGrammars] = useState<any[]>([]);
  const [lives, setLives] = useState(3); // ❤️ 목숨 3개
  const [currentStageIdx, setCurrentStageIdx] = useState(0); // 0~9 (10단계)
  const [score, setScore] = useState(0);
  const [currentQuestions, setCurrentQuestions] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [choices, setChoices] = useState<string[]>([]);
  const [isFinished, setIsFinished] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // 🛡️ 어뷰징 방지: 최소 점수 기준 및 마지막 기록 시간
  const MIN_SCORE_TO_SAVE = 300; 
  const lastSaveTime = React.useRef(0);

  // 데이터 로드
  useEffect(() => {
    fetch(CONFIG.SHEETS.ELEM_GRAMMAR)
      .then(res => res.text())
      .then(text => {
        const rows = text.split(/\r?\n/).slice(1);
        setAllGrammars(rows.map(r => { const c = r.split(','); return { book: c[0], lesson: c[1], day: c[2], eng: c[3], kor: c[4] }; }));
      });
  }, []);

  // 문제 생성 (4지 선다)
  const generateProblem = (stageIdx: number) => {
    const stageKeys = Object.values(STAGE_MAPPING)[stageIdx];
    const filtered = allGrammars.filter(g => stageKeys.includes(g.book));
    const problemSet = filtered.sort(() => 0.5 - Math.random()).slice(0, 10);
    
    setCurrentQuestions(problemSet);
    setCurrentIndex(0);
    setLives(3); // 단계 시작시 목숨 초기화 (원하시면 유지 가능)
    makeChoices(problemSet[0].eng, filtered.map(g => g.eng));
  };

  const makeChoices = (correct: string, allEng: string[]) => {
    const wrong = allEng.filter(e => e !== correct).sort(() => 0.5 - Math.random()).slice(0, 3);
    setChoices([correct, ...wrong].sort(() => 0.5 - Math.random()));
  };

  const handleAnswer = (selected: string) => {
    if (feedback) return;
    const isCorrect = selected === currentQuestions[currentIndex].eng;
    
    if (isCorrect) {
      setScore(s => s + 100);
      setFeedback("✅ 정답!");
    } else {
      setLives(l => l - 1);
      setFeedback(`❌ 오답! 정답: ${currentQuestions[currentIndex].eng}`);
      if (lives - 1 <= 0) { setIsFinished(true); return; }
    }

    setTimeout(() => {
      setFeedback(null);
      if (currentIndex + 1 < currentQuestions.length) {
        setCurrentIndex(i => i + 1);
        makeChoices(currentQuestions[currentIndex + 1].eng, allGrammars.map(g => g.eng));
      } else {
        // 한 단계 종료
        if (currentStageIdx + 1 < 10) {
          setCurrentStageIdx(i => i + 1);
          generateProblem(currentStageIdx + 1);
        } else {
          setIsFinished(true);
        }
      }
    }, 1000);
  };

  // 결과 저장 (어뷰징 방지 적용)
  useEffect(() => {
    if (isFinished && score >= MIN_SCORE_TO_SAVE && Date.now() - lastSaveTime.current > 60000) {
      fetch(CONFIG.WEB_APP_URL, {
        method: "POST",
        body: JSON.stringify({ type: "saveLog", studentName, score, stage: "10단계 완주", taskType: "문법게임" }),
      });
      lastSaveTime.current = Date.now();
    }
  }, [isFinished]);

  if (allGrammars.length === 0) return <div>로딩중...</div>;
  if (isFinished) return <div style={{textAlign:'center'}}><h2>게임 종료!</h2><p>최종 점수: {score}</p><button onClick={onBack}>홈으로</button></div>;

  return (
    <div style={{padding: '20px', maxWidth: '500px', margin: 'auto'}}>
      <div style={{display:'flex', justifyContent:'space-between'}}>
        <span>단계: {currentStageIdx + 1}</span>
        <span>목숨: {'❤️'.repeat(lives)}</span>
        <span>점수: {score}</span>
      </div>
      <h2 style={{margin:'20px 0'}}>{currentQuestions[currentIndex]?.kor}</h2>
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px'}}>
        {choices.map(c => <button key={c} onClick={() => handleAnswer(c)} style={{padding:'20px'}}>{c}</button>)}
      </div>
      {feedback && <div style={{marginTop:'20px', textAlign:'center', fontWeight:'bold'}}>{feedback}</div>}
      <button onClick={() => generateProblem(0)} style={{marginTop:'20px'}}>게임 시작/재시작</button>
    </div>
  );
}