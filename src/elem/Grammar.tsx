import React, { useState, useEffect } from 'react';
import { CONFIG } from '../config';

export default function Grammar({ onBack, student }: { onBack: () => void, student?: any }) {
  // 💡 상태(LOBBY, GAME, TRANSITION, RESULT)
  const [gameState, setGameState] = useState('LOBBY');
  const [studentName, setStudentName] = useState(student?.name || '');
  
  const [stage, setStage] = useState(1);
  const [qCount, setQCount] = useState(1);
  
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [timeLeft, setTimeLeft] = useState(10);
  
  const [allData, setAllData] = useState<any[]>([]);
  const [currentQ, setCurrentQ] = useState<any>(null);
  
  const [rankings, setRankings] = useState<{thisMonth: any[], lastMonth: any[]}>({ thisMonth: [], lastMonth: [] });
  const [loadingRank, setLoadingRank] = useState(false);

  // 1️⃣ 랭킹 및 시트 데이터 불러오기
  useEffect(() => {
    setLoadingRank(true);
    fetch(CONFIG.WEB_APP_URL, {
      method: 'POST',
      body: JSON.stringify({ type: "getRanking", taskType: "문법게임" })
    })
    .then(res => res.json())
    .then(data => {
      setRankings({ thisMonth: data.thisMonth || [], lastMonth: data.lastMonth || [] });
      setLoadingRank(false);
    })
    .catch(() => setLoadingRank(false));

    fetch(CONFIG.SHEETS.ELEM_GRAMMAR)
      .then(res => res.text())
      .then(text => {
        const rows = text.split(/\r?\n/).slice(1);
        const parsed = rows.map(r => { 
            const c = r.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/); 
            return { 
              book: c[0]?.trim(), 
              eng: c[4]?.replace(/^"|"$/g, '').trim(), 
              kor: c[5]?.replace(/^"|"$/g, '').trim() 
            }; 
        }).filter(i => i.eng && i.kor);

        setAllData(parsed);
      });
  }, []);

  const getBooksForStage = (currentStage: number) => {
    switch (currentStage) {
      case 1: return ['240_1', '240_2', '240_3'];
      case 2: return ['240_4', '240_5', '240_6'];
      case 3: return ['520_1', '520_2', '520_3'];
      case 4: return ['520_4', '520_5', '520_6']; 
      case 5: return ['860_1', '860_2', '860_3']; 
      case 6: return ['860_4', '860_5', '860_6']; 
      case 7: return ['1240_1', '1240_2', '1240_3']; 
      case 8: return ['1240_4', '1240_5', '1240_6']; 
      case 9: return ['1680_1', '1680_2', '1680_3']; 
      case 10: return ['1680_4', '1680_5', '1680_6']; 
      default: return ['240_1']; 
    }
  };

  // 2️⃣ 동적 문제 생성 로직 (✅ 빈칸 무조건 나오도록 로직 완전 수정)
  const generateProblem = (pool: any[], currentStage: number) => {
    const targetBooks = getBooksForStage(currentStage);
    const stagePool = pool.filter(item => targetBooks.includes(item.book));

    if (stagePool.length < 4) return null; // 문제 부족
    
    const target = stagePool[Math.floor(Math.random() * stagePool.length)];
    const tokens = target.eng.split(' '); // 공백 기준으로 정확히 분리

    // 알파벳 3글자 이상 포함된 토큰만 후보로 선택
    const candidateIndices = tokens
      .map((t: string, i: number) => /[a-zA-Z]{3,}/.test(t) ? i : -1)
      .filter((i: number) => i !== -1);
    
    const targetIndex = candidateIndices.length > 0 
      ? candidateIndices[Math.floor(Math.random() * candidateIndices.length)] 
      : 0;
    
    const originalToken = tokens[targetIndex];
    const answerMatch = originalToken.match(/[a-zA-Z]+/); // 순수 영단어만 추출 (문장 부호 무시)
    const targetWord = answerMatch ? answerMatch[0] : originalToken;
    
    // 타겟 단어가 포함된 토큰에서 '영단어 부분만' 빈칸으로 치환 (점, 쉼표 보존)
    tokens[targetIndex] = originalToken.replace(/[a-zA-Z]+/, '__________');
    const sentence = tokens.join(' '); // 문장 재조립
    
    // 오답 생성
    const wrong = Array.from(new Set(pool.flatMap(d => d.eng.split(/\s+/).map((w:string) => w.replace(/[^a-zA-Z]/g, ''))).filter(w => w.length > 2)))
      .filter(w => w.toLowerCase() !== targetWord.toLowerCase())
      .sort(() => 0.5 - Math.random())
      .slice(0, 3);
      
    const options = [targetWord.toLowerCase(), ...wrong.map(w => w.toLowerCase())].sort(() => 0.5 - Math.random());
    
    return { sentence, answer: targetWord.toLowerCase(), options, kor: target.kor };
  };

  // 3️⃣ 게임 시작
  const startGame = () => {
    if (!studentName.trim()) { alert("이름을 입력해주세요!"); return; }
    
    const initialQuestion = generateProblem(allData, 1);
    if (!initialQuestion) { 
      alert("시트에 1단계(240_1~3) 문제 데이터가 부족합니다."); 
      return; 
    }
    
    setStage(1);
    setQCount(1); 
    setScore(0);
    setLives(3);
    setTimeLeft(10);
    setCurrentQ(initialQuestion);
    setGameState('GAME');
  };

  // 4️⃣ 타이머
  useEffect(() => {
    if (gameState !== 'GAME') return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { handleTimeOut(); return 10; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [gameState, stage, qCount, lives]); 

  const handleTimeOut = () => {
    setLives(prev => {
      const next = prev - 1;
      if (next <= 0) endGame(score);
      else moveToNextStage(score);
      return next;
    });
  };

  // 5️⃣ 정답 처리 로직 (✅ 남은 초 비례, 최대 10점 적용)
  const handleAnswer = (selectedOption: string) => {
    let newScore = score;
    if (selectedOption === currentQ.answer) {
      // 맞췄을 때 점수: 1 ~ 10점 (남은 시간에 비례)
      const earnedPoints = Math.max(1, timeLeft); 
      newScore = score + earnedPoints;
      setScore(newScore);
      
      const utterance = new SpeechSynthesisUtterance(currentQ.answer);
      utterance.lang = 'en-US';
      window.speechSynthesis.speak(utterance);
    } else {
      const nextLives = lives - 1;
      setLives(nextLives);
      if (nextLives <= 0) { endGame(newScore); return; }
    }
    moveToNextStage(newScore);
  };

  // 6️⃣ 다음 단계 이동 및 알림 화면 적용 (✅ TRANSITION 화면 추가)
  const moveToNextStage = (currentScore: number) => {
    if (qCount < 10) {
      const nextQuestion = generateProblem(allData, stage);
      setQCount(prev => prev + 1);
      setTimeLeft(10);
      setCurrentQ(nextQuestion);
    } else if (stage < 10) {
      const nextStage = stage + 1;
      const nextQuestion = generateProblem(allData, nextStage);
      
      if (!nextQuestion) {
        alert(`시트에 ${nextStage}단계 교재 데이터가 부족하여 여기까지만 진행됩니다!`);
        endGame(currentScore);
        return;
      }

      setStage(nextStage);
      setQCount(1);
      setCurrentQ(nextQuestion);
      setTimeLeft(10);
      // 게임 멈추고 전환 화면 띄우기
      setGameState('TRANSITION');
    } else {
      endGame(currentScore);
    }
  };

  // 7️⃣ 종료 및 점수 저장
  const endGame = (finalScore: number) => {
    setGameState('RESULT');
    fetch(CONFIG.WEB_APP_URL, {
      method: 'POST',
      body: JSON.stringify({
        type: "saveLog",
        studentName: studentName,
        grade: student?.grade || "미지정",
        score: finalScore,
        stage: stage,
        taskType: "문법게임"
      })
    }).catch(err => console.error(err));
  };

  const myRankIndex = rankings.thisMonth.findIndex(r => r.studentName === studentName);
  const myRankText = myRankIndex !== -1 ? `${myRankIndex + 1}위` : '-';
  const myCurrentScore = myRankIndex !== -1 ? rankings.thisMonth[myRankIndex].score : 0;

  // ================= 🎨 화면 렌더링 =================
  if (gameState === 'LOBBY') {
    return (
      <div style={styles.container}>
        <button onClick={onBack} style={styles.backBtn}>⬅ 돌아가기</button>
        <div style={styles.card}>
          <h1 style={styles.title}>⚡ 스피드 문법 퀴즈</h1>
          
          <div style={styles.myInfoBox}>
            <input
              type="text"
              placeholder="이름 입력"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              style={styles.nameInput}
              readOnly={!!student?.name}
            />
            {studentName && (
              <div style={styles.myStats}>
                <span style={{color:'#475569'}}>🏆 랭킹: <strong style={{color:'#d97706'}}>{myRankText}</strong></span>
                <span style={{color: '#cbd5e1'}}>|</span>
                <span style={{color:'#475569'}}>🔥 현재 점수: <strong style={{color:'#2563eb'}}>{myCurrentScore}점</strong></span>
              </div>
            )}
          </div>
          
          <div style={styles.rankContainer}>
            <div style={styles.rankBox}>
              <h3 style={styles.rankTitle}>🏆 지난달 명예의 전당 (TOP 3)</h3>
              {loadingRank ? <p style={{color: '#64748b'}}>불러오는 중...</p> : (
                rankings.lastMonth.length === 0 ? <p style={styles.empty}>아직 기록이 없습니다.</p> :
                rankings.lastMonth.slice(0,3).map((r: any, idx: number) => (
                  <div key={idx} style={styles.rankRow}>
                    <span style={{color: '#475569'}}>{idx + 1}위. {r.studentName}</span>
                    <strong style={{color: '#d97706'}}>{r.score}점</strong>
                  </div>
                ))
              )}
            </div>

            <div style={styles.rankBox}>
              <h3 style={styles.rankTitle}>🔥 이번달 실시간 랭킹 (TOP 5)</h3>
              {loadingRank ? <p style={{color: '#64748b'}}>불러오는 중...</p> : (
                rankings.thisMonth.length === 0 ? <p style={styles.empty}>아직 기록이 없습니다.</p> :
                rankings.thisMonth.slice(0,5).map((r: any, idx: number) => (
                  <div key={idx} style={styles.rankRow}>
                    <span style={{color: '#475569'}}>{idx + 1}위. {r.studentName}</span>
                    <strong style={{color: '#2563eb'}}>{r.score}점</strong>
                  </div>
                ))
              )}
            </div>
          </div>

          <button onClick={startGame} style={styles.startBtn}>스피드 문법 게임 시작하기</button>
        </div>
      </div>
    );
  }

  // ✅ 새로운 알림 화면: 단계 넘어갈 때 대기
  if (gameState === 'TRANSITION') {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <h1 style={{fontSize: '32px', color: '#16a34a', marginBottom: '15px'}}>🎉 STAGE {stage - 1} 클리어!</h1>
          <p style={{fontSize: '18px', color: '#475569', marginBottom: '25px', wordBreak: 'keep-all'}}>
            대단해요! 이제 조금 더 어려운 <b>STAGE {stage}</b> 문제로 넘어갑니다.
          </p>
          <div style={styles.finalScoreBox}>
            <span style={{fontSize: '16px', color: '#475569'}}>현재 누적 점수</span>
            <strong style={{fontSize: '36px', color: '#2563eb', display: 'block'}}>{score}점</strong>
          </div>
          <button 
            onClick={() => setGameState('GAME')} 
            style={{...styles.startBtn, backgroundColor: '#16a34a'}}
          >
            다음 단계 시작하기 🚀
          </button>
        </div>
      </div>
    );
  }

  if (gameState === 'GAME') {
    const progressPercent = ((((stage - 1) * 10) + qCount) / 100) * 100;

    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.gameHeader}>
            <span style={styles.badge}>STAGE {stage} ({qCount}/10)</span>
            <span style={styles.timer}>⏳ {timeLeft}초</span>
            <span style={styles.scoreText}>점수: {score}</span>
            <span style={styles.lives}>{"❤️".repeat(lives)}</span>
          </div>
          <div style={styles.progressBg}>
            <div style={{...styles.progressBar, width: `${progressPercent}%`}} />
          </div>
          <p style={{fontSize:'16px', color:'#64748b', textAlign:'center', marginTop: '10px'}}>{currentQ?.kor}</p>
          <h2 style={styles.questionText}>{currentQ?.sentence}</h2>
          <div style={styles.grid}>
            {currentQ?.options.map((opt: string, idx: number) => (
              <button key={idx} onClick={() => handleAnswer(opt)} style={styles.optionBtn}>{opt}</button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ✅ 결과 화면 수정: 리로드 하지 않고 로비로 이동
  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={{fontSize: '28px', color: '#1e293b', marginBottom: '10px'}}>🎉 게임 종료!</h1>
        <p style={{fontSize: '18px', color: '#64748b', marginBottom: '20px'}}>{studentName} 학생의 최종 성적</p>
        <div style={styles.finalScoreBox}>
          <span style={{fontSize: '16px', color: '#475569'}}>최종 점수</span>
          <strong style={{fontSize: '40px', color: '#2563eb', display: 'block'}}>{score}점</strong>
          <span style={{fontSize: '14px', color: '#64748b', marginTop: '5px'}}>최고 도달: STAGE {stage}</span>
        </div>
        <button 
          onClick={() => {
            setGameState('LOBBY'); // 로그아웃 방지, 로비로 돌아감
            setStage(1);
            setQCount(1);
            setScore(0);
          }} 
          style={styles.startBtn}
        >
          처음으로 돌아가기
        </button>
      </div>
    </div>
  );
}

// ✅ 다크 모드 무시를 위한 색상 하드코딩 강화
const styles: { [key: string]: React.CSSProperties } = {
  container: { minHeight: '100vh', backgroundColor: '#f1f5f9', color: '#0f172a', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', fontFamily: 'Pretendard, sans-serif' },
  card: { backgroundColor: '#ffffff', color: '#0f172a', padding: '30px', borderRadius: '20px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', width: '100%', maxWidth: '600px', textAlign: 'center' },
  backBtn: { position: 'absolute', top: '20px', left: '20px', padding: '10px 15px', borderRadius: '10px', background: '#e2e8f0', color: '#0f172a', border: 'none', cursor: 'pointer', fontWeight: 'bold' },
  title: { fontSize: '28px', fontWeight: 'bold', color: '#1e293b', marginBottom: '25px' },
  myInfoBox: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px 20px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '25px' },
  nameInput: { fontSize: '18px', fontWeight: 'bold', color: '#0f172a', backgroundColor: 'transparent', border: 'none', outline: 'none', width: '100px' },
  myStats: { display: 'flex', gap: '12px', fontSize: '15px' },
  rankContainer: { display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '30px' },
  rankBox: { backgroundColor: '#ffffff', padding: '15px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'left', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' },
  rankTitle: { fontSize: '16px', fontWeight: 'bold', color: '#334155', marginBottom: '10px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' },
  rankRow: { display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '15px' },
  empty: { color: '#94a3b8', fontSize: '14px', textAlign: 'center', margin: '10px 0' },
  startBtn: { width: '100%', padding: '18px', backgroundColor: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '12px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer', transition: 'background 0.2s' },
  gameHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', fontSize: '16px', fontWeight: 'bold' },
  badge: { backgroundColor: '#e0f2fe', color: '#0369a1', padding: '5px 12px', borderRadius: '20px', fontSize: '14px' },
  timer: { color: '#ef4444', fontWeight: '800' },
  scoreText: { color: '#475569' },
  lives: { fontSize: '18px' },
  progressBg: { width: '100%', height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden', marginBottom: '8px' },
  progressBar: { height: '100%', backgroundColor: '#2563eb', transition: 'width 0.3s' },
  questionText: { fontSize: '28px', fontWeight: 'bold', color: '#0f172a', margin: '20px 0 40px 0', wordBreak: 'keep-all' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' },
  optionBtn: { padding: '20px', backgroundColor: '#f8fafc', border: '2px solid #e2e8f0', borderRadius: '12px', fontSize: '18px', fontWeight: '600', color: '#334155', cursor: 'pointer' },
  finalScoreBox: { backgroundColor: '#f8fafc', padding: '25px', borderRadius: '16px', border: '1px solid #e2e8f0', margin: '20px 0 30px 0' }
};