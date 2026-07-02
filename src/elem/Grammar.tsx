import React, { useState, useEffect, useMemo } from 'react';
import { CONFIG } from '../config';
import Ranking from './Ranking';

// 🚨 버셀 에러 해결을 위한 타입 지정
const style: { [key: string]: React.CSSProperties } = {
  container: { padding: '20px', maxWidth: '600px', margin: '0 auto', fontFamily: 'Pretendard, sans-serif' },
  card: { background: '#ffffff', borderRadius: '25px', padding: '30px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', marginBottom: '20px', border: '1px solid #f0f0f0' },
  title: { fontSize: '24px', fontWeight: 'bold', color: '#333', textAlign: 'center', marginBottom: '20px' },
  button: { background: '#007aff', color: '#fff', border: 'none', padding: '18px', borderRadius: '20px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer', width: '100%', marginBottom: '10px', boxShadow: '0 4px 12px rgba(0,122,255,0.3)' },
  choiceBtn: { background: '#f8fafc', border: '2px solid #e2e8f0', padding: '15px', borderRadius: '15px', fontSize: '18px', cursor: 'pointer', fontWeight: '700', color: '#334155', transition: 'all 0.2s', width: '100%', textAlign: 'center', wordBreak: 'keep-all' },
  header: { display: 'flex', justifyContent: 'space-between', marginBottom: '20px', color: '#64748b', fontSize: '16px', fontWeight: '800' }
};

interface GrammarData {
  eng: string;
  kor: string;
}

interface CurrentProblemData extends GrammarData {
  sentenceWithBlank: string;
  targetWord: string;
}

export default function Grammar({ onBack, student, studentName = student?.name || "테스트학생" }: any) {
  const [allData, setAllData] = useState<GrammarData[]>([]);
  const [rankingData, setRankingData] = useState({ thisMonth: [], lastMonth: [] });
  const [isRankingLoading, setIsRankingLoading] = useState(true);
  
  // 게임 상태
  const [stage, setStage] = useState(0); 
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [timeLeft, setTimeLeft] = useState(10);
  
  const [currentProblem, setCurrentProblem] = useState<CurrentProblemData | null>(null);
  const [choices, setChoices] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<{msg: string, isCorrect: boolean} | null>(null);
  const [isFinished, setIsFinished] = useState(false);

  const dateInfo = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    return { currentMonth, lastMonth };
  }, []);

  // 1. 초기 데이터 로드
  useEffect(() => {
    fetch(CONFIG.WEB_APP_URL, { 
      method: "POST", 
      body: JSON.stringify({ type: "getRanking", taskType: "문법게임" }) 
    })
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
        const parsed = rows.map(r => { 
          const c = r.split(','); 
          return { eng: c[3]?.trim(), kor: c[4]?.trim() }; 
        }).filter(item => item.eng && item.kor);
        setAllData(parsed);
      });
  }, []);

  // 2. 타이머 로직
  useEffect(() => {
    if (stage > 0 && stage <= 10 && !isFinished && !feedback) {
      if (timeLeft > 0) {
        const timerId = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
        return () => clearTimeout(timerId);
      } else {
        handleAnswer(null); // 시간 초과
      }
    }
  }, [timeLeft, stage, isFinished, feedback]);

  // 3. 문제 만들기 (영어 문장에서 한 단어 빈칸 뚫기)
  const generateProblem = (currentStage: number) => {
    if (currentStage > 10 || allData.length < 4) { 
      setIsFinished(true); 
      return; 
    }
    
    // 타겟 문장 선택
    const targetIdx = Math.floor(Math.random() * allData.length);
    const target = allData[targetIdx];
    
    // 영어 문장을 단어 단위로 쪼개서 빈칸 뚫을 단어 하나 선택
    const words = target.eng.split(/\s+/);
    // 특수문자 제외하고 순수 알파벳 단어만 필터링
    const cleanWords = words.map(w => w.replace(/[^a-zA-Z]/g, '')).filter(w => w.length > 0);
    const targetWord = cleanWords[Math.floor(Math.random() * cleanWords.length)];
    
    // 문장에서 해당 단어를 빈칸(____)으로 변경 (대소문자 구분 없이 정확한 단어 매칭)
    const sentenceWithBlank = target.eng.replace(new RegExp(`\\b${targetWord}\\b`, 'i'), '_____');
    
    // 오답 단어 3개 추출 (전체 데이터의 다른 단어들 중에서 무작위 추출)
    const allWordsPool = allData.flatMap(d => d.eng.split(/\s+/).map(w => w.replace(/[^a-zA-Z]/g, '')).filter(w => w.length > 1));
    const wrongChoices: string[] = [];
    let attempts = 0; // 무한 루프 방지
    
    while (wrongChoices.length < 3 && attempts < 100) {
      attempts++;
      const randWord = allWordsPool[Math.floor(Math.random() * allWordsPool.length)];
      if (randWord.toLowerCase() !== targetWord.toLowerCase() && !wrongChoices.includes(randWord.toLowerCase())) {
        wrongChoices.push(randWord.toLowerCase());
      }
    }
    
    // 보기 4개 섞기 (정답 1개 + 오답 3개) - 보기 통일을 위해 모두 소문자로 변환
    const finalChoices = [targetWord.toLowerCase(), ...wrongChoices].sort(() => 0.5 - Math.random());
    
    setCurrentProblem({ ...target, sentenceWithBlank, targetWord: targetWord.toLowerCase() });
    setChoices(finalChoices);
    setFeedback(null);
    setTimeLeft(10);
  };

  const startGame = () => {
    if (allData.length < 4) return alert("문법 데이터가 부족합니다.");
    setStage(1);
    setScore(0);
    setLives(3);
    setIsFinished(false);
    generateProblem(1);
  };

  // 4. 정답 확인 및 점수 계산
  const handleAnswer = (selected: string | null) => {
    if (feedback) return;
    
    const isCorrect = selected === currentProblem?.targetWord;
    
    if (isCorrect) {
      const earnedScore = 100 + (timeLeft * 10); // 스피드 보너스
      setScore(s => s + earnedScore);
      setFeedback({ msg: `정답이야! (+${earnedScore}점) ⚡`, isCorrect: true });
    } else {
      setLives(l => l - 1);
      const msg = selected === null 
        ? "시간 초과! ⏰" 
        : `틀렸어! 정답은 '${currentProblem?.targetWord}' 야. 💪`;
      setFeedback({ msg, isCorrect: false });
    }

    setTimeout(() => {
      if (lives - (isCorrect ? 0 : 1) <= 0 || stage >= 10) { 
        setIsFinished(true); 
      } else { 
        setStage(s => s + 1); 
        generateProblem(stage + 1); 
      }
    }, 1500);
  };

  // 5. 서버 저장
  useEffect(() => {
    if (isFinished && score > 0) {
      fetch(CONFIG.WEB_APP_URL, {
        method: "POST",
        body: JSON.stringify({ 
          type: "saveLog", 
          studentName, 
          score, 
          stage: `${stage}단계 완료`, 
          taskType: "문법게임" 
        }),
      });
    }
  }, [isFinished]);

  return (
    <div style={style.container}>
      <button onClick={onBack} style={{ background: 'white', border: '1px solid #ccc', padding: '10px 15px', borderRadius: '12px', cursor: 'pointer', marginBottom: '15px', fontWeight: 'bold' }}>⬅ 홈으로</button>
      
      {stage === 0 && !isFinished ? (
        <div style={style.card}>
          <div style={{ fontSize: '50px', textAlign: 'center', marginBottom: '10px' }}>⚡</div>
          <h2 style={style.title}>스피드 문법 퀴즈!</h2>
          <p style={{ textAlign: 'center', color: '#64748b', marginBottom: '20px' }}>빈칸에 들어갈 알맞은 단어를 10초 안에 골라봐!</p>
          
          <Ranking title={`${dateInfo.lastMonth}월 명예의 전당 🏆`} data={rankingData.lastMonth} isLoading={isRankingLoading} isHonorRoll={true} />
          <Ranking title={`${dateInfo.currentMonth}월 실시간 TOP 랭킹 🔥`} data={rankingData.thisMonth} isLoading={isRankingLoading} />
          
          <button style={style.button} onClick={startGame}>게임 시작하기 🚀</button>
        </div>
      ) : isFinished ? (
        <div style={style.card}>
          <h2 style={style.title}>게임 종료! 🏆</h2>
          <p style={{textAlign:'center', fontSize:'32px', fontWeight:'800', color:'#007aff', margin: '20px 0'}}>최종 점수: {score}점</p>
          <p style={{textAlign:'center', color:'#64748b', fontSize:'14px', marginBottom:'30px'}}>점수가 이번 달 랭킹에 자동으로 반영됩니다.</p>
          <button style={style.button} onClick={() => { setStage(0); }}>처음으로</button>
        </div>
      ) : currentProblem ? (
        <div style={style.card}>
          <div style={style.header}>
            <span>문제: {stage} / 10</span>
            <span style={{ color: timeLeft <= 3 ? '#e11d48' : '#007aff' }}>⏳ {timeLeft}초</span>
            <span>점수: {score}</span>
          </div>
          
          <div style={{ textAlign: 'center', margin: '30px 0' }}>
            <span style={{ backgroundColor: '#f1f5f9', padding: '5px 12px', borderRadius: '20px', fontSize: '14px', color: '#64748b', fontWeight: 'bold' }}>
              생명: {'❤️'.repeat(lives)}
            </span>
            
            {/* 한국어 뜻 제시 */}
            <p style={{ fontSize: '18px', color: '#64748b', margin: '20px 0 10px', fontWeight: '600' }}>
              {currentProblem.kor}
            </p>
            
            {/* 영어 문장 (빈칸 포함) */}
            <h2 style={{ fontSize: '26px', color: '#1e293b', wordBreak: 'keep-all', margin: '0 0 20px', lineHeight: '1.5' }}>
              {currentProblem.sentenceWithBlank}
            </h2>
          </div>
          
          {/* 단어 4지 선다 보기 제공 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {choices.map(c => (
              <button 
                key={c} 
                onClick={() => handleAnswer(c)} 
                style={{
                  ...style.choiceBtn,
                  backgroundColor: feedback 
                    ? (c === currentProblem.targetWord ? '#d1fae5' : '#f8fafc')
                    : '#f8fafc',
                  borderColor: feedback && c === currentProblem.targetWord ? '#10b981' : '#e2e8f0'
                }}
                disabled={feedback !== null}
              >
                {c}
              </button>
            ))}
          </div>
          
          {feedback && (
            <div style={{ textAlign: 'center', marginTop: '20px', padding: '15px', borderRadius: '15px', color: feedback.isCorrect ? '#047857' : '#be123c', backgroundColor: feedback.isCorrect ? '#d1fae5' : '#ffe4e6', fontWeight: 'bold', fontSize: '18px' }}>
              {feedback.msg}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}