import React, { useState, useEffect } from 'react';

// 💡 [중요] 원장님의 구글 앱스스크립트 웹앱 주소(URL)를 따옴표 안에 넣어주세요!
const SCRIPT_URL = "원장님의_앱스스크립트_WEB_APP_URL_여기에_붙여넣기";

// 📚 스테이지별 문법 문제 데이터 (예시: 빈칸 '____'을 명확히 넣어 문장이 다 보이지 않게 처리!)
const QUESTION_POOL = [
  { stage: 1, sentence: "It ____ red.", answer: "is", options: ["is", "are", "am", "be"], explanation: "It은 3인칭 단수이므로 is를 씁니다." },
  { stage: 1, sentence: "They ____ my friends.", answer: "are", options: ["is", "are", "am", "was"], explanation: "They는 복수이므로 are를 씁니다." },
  { stage: 2, sentence: "I ____ a student.", answer: "am", options: ["is", "are", "am", "were"], explanation: "I와 짝꿍인 be동사는 am입니다." },
  { stage: 2, sentence: "She ____ apples every day.", answer: "eats", options: ["eat", "eats", "eating", "eaten"], explanation: "3인칭 단수 현재 시제는 동사에 -s를 붙입니다." },
  { stage: 3, sentence: "We ____ TV yesterday.", answer: "watched", options: ["watch", "watches", "watched", "watching"], explanation: "yesterday(어제)가 있으므로 과거형을 씁니다." },
  // 💡 원장님께서 여기에 문제들을 계속 추가해 주시면 됩니다! ( stage 1 ~ 10 )
];

export default function App() {
  // 화면 상태: 'LOBBY' (시작/랭킹화면), 'GAME' (게임중), 'RESULT' (종료)
  const [gameState, setGameState] = useState('LOBBY');
  
  // 사용자 정보
  const [studentName, setStudentName] = useState('');
  const [grade, setGrade] = useState('초5');
  
  // 게임 진행 상태
  const [stage, setStage] = useState(1);
  const [questionIdx, setQuestionIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [timeLeft, setTimeLeft] = useState(10); // 문제당 10초
  const [currentQuestions, setCurrentQuestions] = useState([]);
  
  // 랭킹 데이터
  const [rankings, setRankings] = useState({ thisMonth: [], lastMonth: [] });
  const [loadingRank, setLoadingRank] = useState(false);

  // 1️⃣ 랭킹 불러오기
  const fetchRankings = () => {
    if (!SCRIPT_URL || SCRIPT_URL.includes("여기에")) return;
    setLoadingRank(true);
    fetch(SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify({ type: "getRanking", taskType: "문법게임" })
    })
    .then(res => res.json())
    .then(data => {
      setRankings(data);
      setLoadingRank(false);
    })
    .catch(err => {
      console.error("랭킹 로드 실패:", err);
      setLoadingRank(false);
    });
  };

  useEffect(() => {
    fetchRankings();
  }, []);

  // 2️⃣ 게임 시작 (스테이지 1부터 세팅)
  const startGame = () => {
    if (!studentName.trim()) {
      alert("이름을 입력해주세요!");
      return;
    }
    setStage(1);
    setQuestionIdx(0);
    setScore(0);
    setLives(3);
    setTimeLeft(10);
    loadStageQuestions(1);
    setGameState('GAME');
  };

  // 스테이지에 맞는 문제 불러오기 (문제가 부족하면 전체 문제에서 랜덤 10개 추출)
  const loadStageQuestions = (targetStage) => {
    let filtered = QUESTION_POOL.filter(q => q.stage === targetStage);
    if (filtered.length < 10) {
      // 등록된 문제가 10개보다 적으면 기존 pool에서 돌려쓰기 (오류 방지)
      filtered = [...QUESTION_POOL].sort(() => Math.random() - 0.5).slice(0, 10);
    }
    setCurrentQuestions(filtered);
  };

  // 3️⃣ 타이머 로직 (1초마다 감소, 0초 되면 시간초과 처리)
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
  }, [gameState, questionIdx, stage, lives]);

  // 시간 초과 시 오답 처리
  const handleTimeOut = () => {
    setLives((prevLives) => {
      const nextLives = prevLives - 1;
      if (nextLives <= 0) {
        endGame(score);
      } else {
        moveToNextQuestion();
      }
      return nextLives;
    });
  };

  // 4️⃣ [핵심] 정답 제출 및 10점 만점 시간비례 점수 계산!
  const handleAnswer = (selectedOption) => {
    const currentQ = currentQuestions[questionIdx];
    let newScore = score;

    if (selectedOption === currentQ.answer) {
      // 💡 [새 점수 시스템] 남은 시간(timeLeft)에 비례하여 최대 10점 ~ 최소 1점 부여!
      // 예: 10초 남김 -> 10점 / 5초 남김 -> 5점 / 1초 남김 -> 1점
      const earnedPoints = Math.max(1, Math.round((timeLeft / 10) * 10));
      newScore = score + earnedPoints;
      setScore(newScore);
    } else {
      // 오답 시 하트 감소
      const nextLives = lives - 1;
      setLives(nextLives);
      if (nextLives <= 0) {
        endGame(newScore);
        return;
      }
    }

    moveToNextQuestion(newScore);
  };

  // 5️⃣ [핵심] 1~10단계 자동 넘어가는 로직
  const moveToNextQuestion = (currentScore = score) => {
    if (questionIdx < currentQuestions.length - 1) {
      // 현재 스테이지에 풀 문제가 남았으면 다음 문제로!
      setQuestionIdx(prev => prev + 1);
      setTimeLeft(10);
    } else {
      // 10문제를 다 풀어서 현재 스테이지가 끝났을 때!
      if (stage < 10) {
        // 💡 10단계 미만이면 스테이지 1 올라가고 문제는 다시 1번(0번 인덱스)부터 시작!
        const nextStage = stage + 1;
        setStage(nextStage);
        setQuestionIdx(0);
        setTimeLeft(10);
        loadStageQuestions(nextStage);
      } else {
        // 💡 10단계까지 모두 완수했을 때 게임 종료!
        endGame(currentScore);
      }
    }
  };

  // 6️⃣ 게임 종료 및 구글 시트에 점수 저장
  const endGame = (finalScore) => {
    setGameState('RESULT');
    if (!SCRIPT_URL || SCRIPT_URL.includes("여기에")) return;
    
    fetch(SCRIPT_URL, {
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
    .then(res => res.json())
    .then(() => {
      fetchRankings(); // 점수 저장 후 랭킹 새로고침
    })
    .catch(err => console.error("점수 저장 실패:", err));
  };

  // ================= 🎨 화면 렌더링 =================

  // 1. 로비 (시작 & 랭킹) 화면
  if (gameState === 'LOBBY') {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <h1 style={styles.title}>⚡ 스피드 문법 퀴즈</h1>
          
          {/* 이름 & 학년 입력 */}
          <div style={styles.inputSection}>
            <input
              type="text"
              placeholder="학생 이름 입력 (예: 김철수)"
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

          {/* 랭킹 출력 */}
          <div style={styles.rankContainer}>
            <div style={styles.rankBox}>
              <h3 style={styles.rankTitle}>🏆 6월 명예의 전당 (TOP 3)</h3>
              {loadingRank ? <p>랭킹 불러오는 중...</p> : (
                rankings.lastMonth.length === 0 ? <p style={styles.empty}>아직 기록이 없습니다.</p> :
                rankings.lastMonth.map((r, idx) => (
                  <div key={idx} style={styles.rankRow}>
                    <span>{idx + 1}위. {r.studentName}</span>
                    <strong style={{color: '#d97706'}}>{r.score}점</strong>
                  </div>
                ))
              )}
            </div>

            <div style={styles.rankBox}>
              <h3 style={styles.rankTitle}>🔥 7월 실시간 랭킹 (TOP 5)</h3>
              {loadingRank ? <p>랭킹 불러오는 중...</p> : (
                rankings.thisMonth.length === 0 ? <p style={styles.empty}>아직 기록이 없습니다.</p> :
                rankings.thisMonth.map((r, idx) => (
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

  // 2. 게임 진행 화면
  if (gameState === 'GAME') {
    const currentQ = currentQuestions[questionIdx] || QUESTION_POOL[0];
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          {/* 상단 정보 (스테이지, 타이머, 점수, 하트) */}
          <div style={styles.gameHeader}>
            <span style={styles.badge}>STAGE {stage}</span>
            <span style={styles.timer}>⏳ {timeLeft}초</span>
            <span style={styles.scoreText}>점수: {score}</span>
            <span style={styles.lives}>{"❤️".repeat(lives)}</span>
          </div>

          {/* 진행바 */}
          <div style={styles.progressBg}>
            <div style={{...styles.progressBar, width: `${((questionIdx + 1) / currentQuestions.length) * 100}%`}} />
          </div>
          <p style={styles.qNum}>문제 {questionIdx + 1} / {currentQuestions.length}</p>

          {/* 💡 빈칸이 확실히 뚫린 문법 문제 출력 */}
          <h2 style={styles.questionText}>{currentQ.sentence}</h2>

          {/* 4지선다 보기 버튼들 */}
          <div style={styles.grid}>
            {currentQ.options.map((opt, idx) => (
              <button key={idx} onClick={() => handleAnswer(opt)} style={styles.optionBtn}>
                {opt}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // 3. 게임 종료 화면
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

        <button onClick={() => setGameState('LOBBY')} style={styles.startBtn}>
          처음으로 돌아가기 (랭킹 확인)
        </button>
      </div>
    </div>
  );
}

// 🎨 디자인 꾸미기 (CSS 스타일)
const styles = {
  container: { minHeight: '100vh', backgroundColor: '#f1f5f9', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', fontFamily: 'sans-serif' },
  card: { backgroundColor: 'white', padding: '30px', borderRadius: '20px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', width: '100%', maxWidth: '500px', textAlign: 'center' },
  title: { fontSize: '28px', fontWeight: 'bold', color: '#1e293b', marginBottom: '25px' },
  inputSection: { display: 'flex', gap: '10px', marginBottom: '20px' },
  input: { flex: 1, padding: '12px 15px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '16px', outline: 'none' },
  select: { padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '16px', backgroundColor: 'white' },
  startBtn: { width: '100%', padding: '15px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '12px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s', boxShadow: '0 4px 12px rgba(37,99,235,0.2)' },
  rankContainer: { marginTop: '30px', display: 'flex', flexDirection: 'column', gap: '15px' },
  rankBox: { backgroundColor: '#f8fafc', padding: '15px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'left' },
  rankTitle: { fontSize: '16px', fontWeight: 'bold', color: '#334155', marginBottom: '10px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' },
  rankRow: { display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '15px', color: '#475569' },
  empty: { color: '#94a3b8', fontSize: '14px', textAlign: 'center', margin: '10px 0' },
  gameHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', fontSize: '16px', fontWeight: 'bold' },
  badge: { backgroundColor: '#e0f2fe', color: '#0369a1', padding: '5px 12px', borderRadius: '20px', fontSize: '14px' },
  timer: { color: '#ef4444' },
  scoreText: { color: '#475569' },
  lives: { fontSize: '18px' },
  progressBg: { width: '100%', height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden', marginBottom: '8px' },
  progressBar: { height: '100%', backgroundColor: '#2563eb', transition: 'width 0.3s' },
  qNum: { fontSize: '13px', color: '#94a3b8', textAlign: 'right', marginBottom: '20px' },
  questionText: { fontSize: '24px', fontWeight: 'bold', color: '#0f172a', margin: '30px 0 40px 0', wordBreak: 'keep-all' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' },
  optionBtn: { padding: '18px', backgroundColor: '#f8fafc', border: '2px solid #e2e8f0', borderRadius: '12px', fontSize: '18px', fontWeight: '600', color: '#334155', cursor: 'pointer', transition: 'all 0.2s' },
  finalScoreBox: { backgroundColor: '#f8fafc', padding: '25px', borderRadius: '16px', border: '1px solid #e2e8f0', margin: '20px 0 30px 0' }
};