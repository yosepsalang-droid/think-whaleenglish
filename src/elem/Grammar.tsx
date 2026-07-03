import React, { useState, useEffect } from 'react';
import { CONFIG } from '../config';

// 🚨 레벨 설정 (1: 240_1~3권, 2: 240_4~6권, 3: 520_1~3권)
const GAME_LEVEL = 1;

export default function Grammar({ onBack }: { onBack: () => void }) {
  // 화면 상태: 'LOBBY' (시작/랭킹화면), 'GAME' (게임중), 'RESULT' (종료)
  const [gameState, setGameState] = useState('LOBBY');
  
  // 사용자 정보
  const [studentName, setStudentName] = useState('');
  const [grade, setGrade] = useState('초5');
  
  // 게임 진행 상태
  const [stage, setStage] = useState(1);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [timeLeft, setTimeLeft] = useState(10); // 문제당 10초
  
  // 구글 시트에서 불러온 전체 데이터와 현재 문제
  const [allData, setAllData] = useState<any[]>([]);
  const [currentQ, setCurrentQ] = useState<any>(null);
  
  // 랭킹 데이터
  const [rankings, setRankings] = useState<{thisMonth: any[], lastMonth: any[]}>({ thisMonth: [], lastMonth: [] });
  const [loadingRank, setLoadingRank] = useState(false);

  // 1️⃣ 랭킹 및 시트 데이터 불러오기
  useEffect(() => {
    // 랭킹 로드
    setLoadingRank(true);
    fetch(CONFIG.WEB_APP_URL, {
      method: 'POST',
      body: JSON.stringify({ type: "getRanking", taskType: "문법게임" })
    })
    .then((res: Response) => res.json())
    .then((data: any) => {
      setRankings({ thisMonth: data.thisMonth || [], lastMonth: data.lastMonth || [] });
      setLoadingRank(false);
    })
    .catch(() => setLoadingRank(false));

    // 구글 시트(시트3)에서 문제 데이터 로드
    fetch(CONFIG.SHEETS.ELEM_GRAMMAR)
      .then((res: Response) => res.text())
      .then((text: string) => {
        const rows = text.split(/\r?\n/).slice(1);
        const parsed = rows.map((r: string) => { 
            const c = r.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/); 
            return { book: c[1]?.trim(), eng: c[3]?.replace(/^"|"$/g, '').trim(), kor: c[4]?.replace(/^"|"$/g, '').trim() }; 
        }).filter((i: any) => i.eng && i.kor);

        // 🚨 1단계 교재만 필터링
        let targetBooks: string[] = [];
        if (GAME_LEVEL === 1) targetBooks = ['240_1', '240_2', '240_3'];
        else if (GAME_LEVEL === 2) targetBooks = ['240_4', '240_5', '240_6'];
        else if (GAME_LEVEL === 3) targetBooks = ['520_1', '520_2', '520_3'];

        const pool = parsed.filter((item: any) => targetBooks.includes(item.book));
        setAllData(pool);
      });
  }, []);

  // 2️⃣ 동적 문제 생성 로직 (시트 데이터를 바탕으로 빈칸 뚫기)
  const generateProblem = (pool: any[]) => {
    const target = pool[Math.floor(Math.random() * pool.length)];
    if (!target) return null;
    
    // 타겟 단어 선정 (길이 2 이상인 알파벳)
    const words = target.eng.split(/\s+/).map((w: string) => w.replace(/[^a-zA-Z]/g, '')).filter((w: string) => w.length > 2);
    const targetWord = words[Math.floor(Math.random() * words.length)];
    const sentence = target.eng.replace(new RegExp(`\\b${targetWord}\\b`, 'i'), '__________');
    
    // 오답 3개 무작위 추출
    const wrong = Array.from(new Set(pool.flatMap((d: any) => d.eng.split(/\s+/).map((w: string) => w.replace(/[^a-zA-Z]/g, ''))).filter((w: string) => w.length > 2))).filter((w: string) => w.toLowerCase() !== targetWord.toLowerCase()).sort(() => 0.5 - Math.random()).slice(0, 3);
    
    // 정답 + 오답 섞어서 보기 배열 생성
    const options = [targetWord.toLowerCase(), ...wrong].sort(() => 0.5 - Math.random());
    
    return { sentence, answer: targetWord.toLowerCase(), options, kor: target.kor };
  };

  // 3️⃣ 게임 시작
  const startGame = () => {
    if (!studentName.trim()) { alert("이름을 입력해주세요!"); return; }
    if (allData.length < 4) { alert("구글 시트에서 문제 데이터를 불러오는 중이거나 문제가 부족합니다."); return; }
    
    setStage(1);
    setScore(0);
    setLives(3);
    setTimeLeft(10);
    setCurrentQ(generateProblem(allData));
    setGameState('GAME');
  };

  // 4️⃣ 타이머 로직
  useEffect(() => {
    if (gameState !== 'GAME') return;
    
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleTimeOut();
          return 10;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState, stage, lives]);

  // 시간 초과 처리
  const handleTimeOut = () => {
    setLives((prevLives) => {
      const nextLives = prevLives - 1;
      if (nextLives <= 0) {
        endGame(score);
      } else {
        moveToNextStage();
      }
      return nextLives;
    });
  };

  // 5️⃣ 정답 제출 및 점수 계산
  const handleAnswer = (selectedOption: string) => {
    let newScore = score;

    if (selectedOption === currentQ.answer) {
      // 💡 남은 시간 비례 점수 (최대 100점 ~ 최소 10점 단위로 스케일업!)
      const earnedPoints = Math.max(1, Math.round((timeLeft / 10) * 10)) * 10;
      newScore = score + earnedPoints;
      setScore(newScore);
      
      const utterance = new SpeechSynthesisUtterance(currentQ.answer);
      utterance.lang = 'en-US';
      window.speechSynthesis.speak(utterance);
    } else {
      const nextLives = lives - 1;
      setLives(nextLives);
      if (nextLives <= 0) {
        endGame(newScore);
        return;
      }
    }

    moveToNextStage(newScore);
  };

  // 6️⃣ 스테이지 이동 (10스테이지까지)
  const moveToNextStage = (currentScore = score) => {
    if (stage < 10) {
      setStage(prev => prev + 1);
      setTimeLeft(10);
      setCurrentQ(generateProblem(allData));
    } else {
      endGame(currentScore);
    }
  };

  // 7️⃣ 게임 종료 및 기록 저장
  const endGame = (finalScore: number) => {
    setGameState('RESULT');
    
    fetch(CONFIG.WEB_APP_URL, {
      method: 'POST',
      body: JSON.stringify({
        type: "saveLog",
        studentName: studentName,
        grade: grade,
        score: finalScore,
        stage: stage,
        taskType: "문법게임"
      })
    })
    .catch(err => console.error("점수 저장 실패:", err));
  };


  // ================= 🎨 화면 렌더링 =================

  if (gameState === 'LOBBY') {
    return (
      <div style={styles.container}>
        <button onClick={onBack} style={{position: 'absolute', top: '20px', left: '20px', padding: '10px 15px', borderRadius: '10px', background: '#e2e8f0', border: 'none', cursor: 'pointer'}}>⬅ 돌아가기</button>
        <div style={styles.card}>
          <h1 style={styles.title}>⚡ 스피드 문법 퀴즈</h1>
          
          <div style={styles.inputSection}>
            <input
              type="text"
              placeholder="학생 이름 입력"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              style={styles.input}
            />
            <select value={grade} onChange={(e) => setGrade(e.target.value)} style={styles.select}>
              {['초1','초2','초3','초4','초5','초6','중1','중2','중3'].map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>
          
          <button onClick={startGame} style={styles.startBtn}>게임 시작하기</button>

          <div style={styles.rankContainer}>
            <div style={styles.rankBox}>
              <h3 style={styles.rankTitle}>🏆 지난달 명예의 전당 (TOP 3)</h3>
              {loadingRank ? <p>랭킹 불러오는 중...</p> : (
                rankings.lastMonth.length === 0 ? <p style={styles.empty}>아직 기록이 없습니다.</p> :
                rankings.lastMonth.slice(0,3).map((r: any, idx: number) => (
                  <div key={idx} style={styles.rankRow}>
                    <span>{idx + 1}위. {r.studentName}</span>
                    <strong style={{color: '#d97706'}}>{r.score}점</strong>
                  </div>
                ))
              )}
            </div>

            <div style={styles.rankBox}>
              <h3 style={styles.rankTitle}>🔥 이번달 실시간 랭킹 (TOP 5)</h3>
              {loadingRank ? <p>랭킹 불러오는 중...</p> : (
                rankings.thisMonth.length === 0 ? <p style={styles.empty}>아직 기록이 없습니다.</p> :
                rankings.thisMonth.slice(0,5).map((r: any, idx: number) => (
                  <div key={idx} style={styles.rankRow}>
                    <span>{idx + 1}위. {r.studentName}</span>
                    <strong style={{color: '#2563eb'}}>{r.score}점</strong>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (gameState === 'GAME') {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.gameHeader}>
            <span style={styles.badge}>STAGE {stage} / 10</span>
            <span style={styles.timer}>⏳ {timeLeft}초</span>
            <span style={styles.scoreText}>점수: {score}</span>
            <span style={styles.lives}>{"❤️".repeat(lives)}</span>
          </div>

          <div style={styles.progressBg}>
            <div style={{...styles.progressBar, width: `${(stage / 10) * 100}%`}} />
          </div>
          
          <p style={{fontSize:'16px', color:'#64748b', textAlign:'center', marginTop: '10px'}}>{currentQ?.kor}</p>
          <h2 style={styles.questionText}>{currentQ?.sentence}</h2>

          <div style={styles.grid}>
            {currentQ?.options.map((opt: string, idx: number) => (
              <button key={idx} onClick={() => handleAnswer(opt)} style={styles.optionBtn}>
                {opt}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={{fontSize: '28px', color: '#1e293b', marginBottom: '10px'}}>🎉 게임 종료!</h1>
        <p style={{fontSize: '18px', color: '#64748b', marginBottom: '20px'}}>{studentName} ({grade}) 학생의 최종 성적</p>
        
        <div style={styles.finalScoreBox}>
          <span style={{fontSize: '16px', color: '#475569'}}>최종 점수</span>
          <strong style={{fontSize: '40px', color: '#2563eb', display: 'block'}}>{score}점</strong>
          <span style={{fontSize: '14px', color: '#64748b', marginTop: '5px'}}>최고 도달: STAGE {stage}</span>
        </div>

        <button onClick={() => window.location.reload()} style={styles.startBtn}>
          처음으로 돌아가기
        </button>
      </div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: { minHeight: '100vh', backgroundColor: '#f1f5f9', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', fontFamily: 'Pretendard, sans-serif' },
  card: { backgroundColor: 'white', padding: '30px', borderRadius: '20px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', width: '100%', maxWidth: '600px', textAlign: 'center' },
  title: { fontSize: '28px', fontWeight: 'bold', color: '#1e293b', marginBottom: '25px' },
  inputSection: { display: 'flex', gap: '10px', marginBottom: '20px' },
  input: { flex: 1, padding: '15px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '16px', outline: 'none' },
  select: { padding: '15px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '16px', backgroundColor: 'white' },
  startBtn: { width: '100%', padding: '18px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '12px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer' },
  rankContainer: { marginTop: '30px', display: 'flex', flexDirection: 'column', gap: '15px' },
  rankBox: { backgroundColor: '#f8fafc', padding: '15px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'left' },
  rankTitle: { fontSize: '16px', fontWeight: 'bold', color: '#334155', marginBottom: '10px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' },
  rankRow: { display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '15px', color: '#475569' },
  empty: { color: '#94a3b8', fontSize: '14px', textAlign: 'center', margin: '10px 0' },
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