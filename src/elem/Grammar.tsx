import React, { useState, useEffect } from 'react';
import { CONFIG, withCacheBust } from '../config'; 
import Ranking from './Ranking'; 
// 💡 수파베이스 연동을 위한 import 추가!
import { supabase } from '../lib/supabase'; 

interface RankEntry {
  studentName: string;
  score: number;
}

interface GrammarProps {
  onBack: () => void;
  student?: { name?: string; grade?: string };
  totalScore?: number;
  myRank?: number | null;
  rankings?: { thisMonth: RankEntry[]; lastMonth: RankEntry[] };
  loadingRank?: boolean;
  onGameComplete?: (addedScore?: number) => void;
}

export default function Grammar({
  onBack,
  student,
  totalScore: externalTotalScore = 0,
  myRank: externalMyRank = null,
  onGameComplete,
}: GrammarProps) {
  const [gameState, setGameState] = useState('LOBBY');
  const [studentName, setStudentName] = useState(student?.name || '');
  
  const [stage, setStage] = useState(1);
  const [qCount, setQCount] = useState(1);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [timeLeft, setTimeLeft] = useState(10);
  
  const [allData, setAllData] = useState<any[]>([]);
  const [currentQ, setCurrentQ] = useState<any>(null);

  const [myRank, setMyRank] = useState<number | null>(externalMyRank);
  const [myTotalScore, setMyTotalScore] = useState<number>(externalTotalScore);
  const [localRankings, setLocalRankings] = useState<{ thisMonth: RankEntry[]; lastMonth: RankEntry[] }>({ thisMonth: [], lastMonth: [] });
  const [isRankLoading, setIsRankLoading] = useState<boolean>(true);

  // 1️⃣ 교재 문제 데이터 불러오기 (✨ 구글 시트 -> 수파베이스 sentence 테이블로 교체 완료!)
  useEffect(() => {
    const fetchSentences = async () => {
      try {
        const { data, error } = await supabase
          .from('sentence')
          .select('*');

        if (error) throw error;

        if (data) {
          // eng와 kor 데이터가 모두 존재하는 유효한 문장만 필터링하여 게임 데이터로 세팅
          const validData = data.filter(item => item.eng && item.kor);
          setAllData(validData);
        }
      } catch (error) {
        console.error("수파베이스 sentence 데이터 불러오기 에러:", error);
      }
    };

    fetchSentences();
  }, []);

  // 💡 실시간 랭킹 만들기 (기존 로직 유지)
  const fetchAndCalculateRank = (options?: { delayMs?: number }) => {
    const { delayMs = 0 } = options ?? {};
    const logSheetUrl = CONFIG.SHEETS.GRAMMAR_LOG;

    if (!logSheetUrl || !studentName.trim()) return;

    setIsRankLoading(true);

    const doFetch = () => {
      fetch(withCacheBust(logSheetUrl))
      .then(res => res.text())
      .then(text => {
        const rows = text.split(/\r?\n/).slice(1);
        
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;
        const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1;
        const lastMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear;

        const thisMonthScores: { [name: string]: number } = {};
        const lastMonthScores: { [name: string]: number } = {};

        rows.forEach(row => {
          const cols = row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
          if (cols.length < 6) return;

          const dateStr = cols[0]?.replace(/^"|"$/g, '').trim(); 
          const name = cols[1]?.replace(/^"|"$/g, '').trim();   
          const scoreVal = parseInt(cols[3]?.replace(/^"|"$/g, '').trim() || '0', 10);
          const taskType = cols[5]?.replace(/^"|"$/g, '').trim();

          if (!name || isNaN(scoreVal) || scoreVal <= 0) return;
          if (taskType !== '문법게임' && taskType !== '단어게임') return;

          let rowYear = 0;
          let rowMonth = 0;
          const match = dateStr.match(/(\d{4})[./-]\s*(\d{1,2})/);
          if (match) {
            rowYear = parseInt(match[1], 10);
            rowMonth = parseInt(match[2], 10);
          }

          if (rowYear === currentYear && rowMonth === currentMonth) {
            thisMonthScores[name] = (thisMonthScores[name] || 0) + scoreVal;
          } else if (rowYear === lastMonthYear && rowMonth === lastMonth) {
            lastMonthScores[name] = (lastMonthScores[name] || 0) + scoreVal;
          }
        });

        const sortScores = (scoresObj: { [name: string]: number }) => {
          return Object.entries(scoresObj)
            .map(([sName, total]) => ({ studentName: sName, score: total }))
            .sort((a, b) => b.score - a.score);
        };

        const thisMonthRankings = sortScores(thisMonthScores);
        const lastMonthRankings = sortScores(lastMonthScores);

        setLocalRankings({
          thisMonth: thisMonthRankings,
          lastMonth: lastMonthRankings
        });

        const myIdx = thisMonthRankings.findIndex(item => item.studentName === studentName.trim());
        if (myIdx !== -1) {
          setMyRank(myIdx + 1);
          setMyTotalScore(thisMonthRankings[myIdx].score);
        } else {
          setMyRank(null);
          setMyTotalScore(0);
        }

        setIsRankLoading(false);
      })
      .catch(err => {
        console.error("랭킹 계산 실패:", err);
        setIsRankLoading(false);
      });
    };

    if (delayMs > 0) setTimeout(doFetch, delayMs);
    else doFetch();
  };

  useEffect(() => {
    fetchAndCalculateRank();
  }, [studentName]);

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

  const generateProblem = (pool: any[], currentStage: number) => {
    const targetBooks = getBooksForStage(currentStage);
    const stagePool = pool.filter(item => targetBooks.includes(item.book));

    if (stagePool.length < 4) return null; 
    
    const target = stagePool[Math.floor(Math.random() * stagePool.length)];
    const tokens = target.eng.split(' '); 

    const candidateIndices = tokens
      .map((t: string, i: number) => /[a-zA-Z]{3,}/.test(t) ? i : -1)
      .filter((i: number) => i !== -1);
    
    const targetIndex = candidateIndices.length > 0 
      ? candidateIndices[Math.floor(Math.random() * candidateIndices.length)] 
      : 0;
    
    const originalToken = tokens[targetIndex];
    const answerMatch = originalToken.match(/[a-zA-Z]+/); 
    const targetWord = answerMatch ? answerMatch[0] : originalToken;
    
    tokens[targetIndex] = originalToken.replace(/[a-zA-Z]+/, '__________');
    const sentence = tokens.join(' '); 
    
    const wrong = Array.from(new Set(pool.flatMap(d => d.eng.split(/\s+/).map((w:string) => w.replace(/[^a-zA-Z]/g, ''))).filter(w => w.length > 2)))
      .filter(w => w.toLowerCase() !== targetWord.toLowerCase())
      .sort(() => 0.5 - Math.random())
      .slice(0, 3);
      
    const options = [targetWord.toLowerCase(), ...wrong.map(w => w.toLowerCase())].sort(() => 0.5 - Math.random());
    
    return { sentence, answer: targetWord.toLowerCase(), options, kor: target.kor };
  };

  const startGame = () => {
    if (!studentName.trim()) { alert("이름을 입력해주세요!"); return; }
    
    const initialQuestion = generateProblem(allData, 1);
    if (!initialQuestion) { 
      alert("시트에 1단계 문제 데이터가 부족합니다. 데이터 로딩을 확인해주세요."); 
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

  const handleAnswer = (selectedOption: string) => {
    let newScore = score;
    if (selectedOption === currentQ.answer) {
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
        alert(`데이터가 부족하여 여기까지만 진행됩니다!`);
        endGame(currentScore);
        return;
      }

      setStage(nextStage);
      setQCount(1);
      setCurrentQ(nextQuestion);
      setTimeLeft(10);
      setGameState('TRANSITION');
    } else {
      endGame(currentScore);
    }
  };

  const endGame = (finalScore: number) => {
    setGameState('RESULT');
    setMyTotalScore(prev => prev + finalScore);
    
    const payload = {
      type: "saveLog",
      studentName: studentName.trim(),
      grade: student?.grade || "미지정",
      score: finalScore,
      stage: stage,
      taskType: "문법게임",
      sheetName: 'GRAMMAR_LOG',
    };

    const sendLog = () => {
      return fetch(CONFIG.WEB_APP_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      });
    };

    const refreshAfterSave = () => {
      onGameComplete?.(finalScore);
      fetchAndCalculateRank({ delayMs: 1500 }); 
    };

    sendLog()
      .then(() => refreshAfterSave())
      .catch(err => {
        console.error("1차 저장 실패, 1초 뒤 재시도합니다:", err);
        setTimeout(() => {
          sendLog()
            .then(() => refreshAfterSave())
            .catch(e => console.error("최종 저장 실패:", e));
        }, 1000);
      });
  };

  if (gameState === 'LOBBY') {
    return (
      <div style={styles.container}>
        <button onClick={onBack} style={styles.backBtn}>⬅ 돌아가기</button>
        <div style={styles.card}>
          <h1 style={styles.title}>⚡ 스피드 문법 퀴즈</h1>
          
          <div style={{ marginBottom: '24px', backgroundColor: '#f8fafc', padding: '12px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'inline-block' }}>
            <span style={{ fontSize: '14px', color: '#64748b', fontWeight: 'bold', marginRight: '8px' }}>도전자:</span>
            <input
              type="text"
              placeholder="이름 입력"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              style={styles.nameInput}
              readOnly={!!student?.name}
            />
          </div>

          {studentName && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginBottom: '24px', backgroundColor: 'white', padding: '15px 25px', borderRadius: '12px', border: '1px solid #cbd5e1', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold', marginBottom: '4px' }}>🏆 내 랭킹</span>
                <strong style={{ fontSize: '18px', color: '#d97706' }}>{myRank !== null ? `${myRank}위` : '-'}</strong>
              </div>
              <div style={{ width: '1px', backgroundColor: '#e2e8f0' }}></div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold', marginBottom: '4px' }}>🔥 총 합산 점수</span>
                <strong style={{ fontSize: '18px', color: '#2563eb' }}>{myTotalScore.toLocaleString()}점</strong>
              </div>
            </div>
          )}
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '30px' }}>
            <Ranking 
              title="🏆 지난달 명예의 전당 (TOP 3)"
              data={localRankings.lastMonth.slice(0, 3)}
              isLoading={isRankLoading}
            />
            <Ranking 
              title="🔥 이번달 실시간 랭킹 (TOP 5)"
              data={localRankings.thisMonth.slice(0, 5)}
              isLoading={isRankLoading}
            />
          </div>

          <button onClick={startGame} style={{...styles.startBtn, marginTop: '20px'}}>스피드 문법 게임 시작하기</button>
        </div>
      </div>
    );
  }

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
    const timerPercent = (timeLeft / 10) * 100;
    const timerBarColor = timeLeft <= 3 ? '#ef4444' : (timeLeft <= 5 ? '#f97316' : '#10b981');

    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.gameHeader}>
            <span style={styles.badge}>STAGE {stage} ({qCount}/10)</span>
            <span style={styles.timer}>⏳ {timeLeft}초</span>
            <span style={styles.scoreText}>점수: {score}</span>
            <span style={styles.lives}>{"❤️".repeat(lives)}</span>
          </div>

          <div style={styles.timerBg}>
            <div style={{...styles.timerBar, width: `${timerPercent}%`, backgroundColor: timerBarColor}} />
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
            setGameState('LOBBY'); 
            setStage(1);
            setQCount(1);
            setScore(0);
          }} 
          style={styles.startBtn}
        >        처음으로 돌아가기
        </button>
      </div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: { minHeight: '100vh', backgroundColor: '#f1f5f9', color: '#0f172a', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', fontFamily: 'Pretendard, sans-serif' },
  card: { backgroundColor: '#ffffff', color: '#0f172a', padding: '30px', borderRadius: '20px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', width: '100%', maxWidth: '600px', textAlign: 'center' },
  backBtn: { position: 'absolute', top: '20px', left: '20px', padding: '10px 15px', borderRadius: '10px', background: '#e2e8f0', color: '#0f172a', border: 'none', cursor: 'pointer', fontWeight: 'bold' },
  title: { fontSize: '28px', fontWeight: 'bold', color: '#1e293b', marginBottom: '25px' },
  nameInput: { fontSize: '18px', fontWeight: 'bold', color: '#0f172a', backgroundColor: 'transparent', border: 'none', outline: 'none', width: '100px', textAlign: 'center' },
  startBtn: { width: '100%', padding: '18px', backgroundColor: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '12px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer', transition: 'background 0.2s' },
  gameHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', fontSize: '16px', fontWeight: 'bold' },
  badge: { backgroundColor: '#e0f2fe', color: '#0369a1', padding: '5px 12px', borderRadius: '20px', fontSize: '14px' },
  timer: { color: '#ef4444', fontWeight: '800' },
  scoreText: { color: '#475569' },
  lives: { fontSize: '18px' },
  timerBg: { width: '100%', height: '10px', backgroundColor: '#f1f5f9', borderRadius: '5px', overflow: 'hidden', marginBottom: '8px', border: '1px solid #e2e8f0' },
  timerBar: { height: '100%', transition: 'width 1s linear, background-color 0.3s' },
  progressBg: { width: '100%', height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px', overflow: 'hidden', marginBottom: '8px' },
  progressBar: { height: '100%', backgroundColor: '#3b82f6', transition: 'width 0.3s' },
  questionText: { fontSize: '28px', fontWeight: 'bold', color: '#0f172a', margin: '20px 0 40px 0', wordBreak: 'keep-all' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' },
  optionBtn: { padding: '20px', backgroundColor: '#f8fafc', border: '2px solid #e2e8f0', borderRadius: '12px', fontSize: '18px', fontWeight: '600', color: '#334155', cursor: 'pointer' },
  finalScoreBox: { backgroundColor: '#f8fafc', padding: '25px', borderRadius: '16px', border: '1px solid #e2e8f0', margin: '20px 0 30px 0' }
};