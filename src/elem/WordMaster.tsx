import React, { useState, useEffect, useMemo, useRef } from 'react';
import { CONFIG, withCacheBust } from '../config'; 

// 📝 구글 시트에서 불러올 단어 데이터 타입
interface WordItem {
  book: string;
  lesson?: string;
  day?: string;
  eng: string;
  kor: string;
}

// 📝 부모 컴포넌트(Home 또는 App)로부터 받을 정보
interface WordMasterProps {
  onBack: () => void;
  studentName?: string;
  grade?: string;
  totalScore?: number;
  myRank?: number | null;
  loadingRank?: boolean;
  onGameComplete?: (addedScore?: number) => void;
}

export default function WordMaster({
  onBack,
  studentName = '테스트학생',
  grade = '초5',
  totalScore: externalTotalScore = 0,
  myRank: externalMyRank = null,
  loadingRank: externalLoadingRank = false,
  onGameComplete,
}: WordMasterProps) {
  // --- 상태 관리 (State) ---
  const [allWords, setAllWords] = useState<WordItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // 🏆 자체적으로 내 랭킹과 내 점수를 계산하기 위한 state
  const [myRank, setMyRank] = useState<number | null>(externalMyRank);
  const [myTotalScore, setMyTotalScore] = useState<number>(externalTotalScore);
  const [loadingRank, setLoadingRank] = useState<boolean>(true);

  const [gameState, setGameState] = useState<'SELECT_BOOK' | 'PLAYING' | 'RESULT'>('SELECT_BOOK');
  const [selectedBook, setSelectedBook] = useState<string>('');
  const [gameWords, setGameWords] = useState<WordItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);

  const [userAnswer, setUserAnswer] = useState<string>('');
  const [score, setScore] = useState<number>(0);
  const [attempts, setAttempts] = useState<number>(0);
  const [wrongCount, setWrongCount] = useState<number>(0);
  const [combo, setCombo] = useState<number>(0);
  const [showHint, setShowHint] = useState<boolean>(false);
  const [showHalfHint, setShowHalfHint] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ isCorrect: boolean; msg: string } | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const currentWord = gameWords[currentIndex];

  // 1️⃣ 구글 시트(ELEM_WORD)에서 실시간 단어 데이터 가져오기
  useEffect(() => {
    const fetchWords = async () => {
      try {
        const response = await fetch(CONFIG.SHEETS.ELEM_WORD);
        const csvText = await response.text();
        const rows = csvText.split(/\r?\n/).slice(1); 

        const parsed: WordItem[] = rows
          .map((row) => {
            const cells = row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
            return {
              book: cells[0]?.replace(/^"|"$/g, '').trim() || '',
              lesson: cells[1]?.replace(/^"|"$/g, '').trim() || '',
              day: cells[2]?.replace(/^"|"$/g, '').trim() || '',
              eng: cells[3]?.replace(/^"|"$/g, '').trim() || '',
              kor: cells[4]?.replace(/^"|"$/g, '').trim() || '',
            };
          })
          .filter((w) => w.eng && w.kor && w.book);

        setAllWords(parsed);
        setIsLoading(false);
      } catch (error) {
        console.error('단어 리스트 로딩 실패:', error);
        alert('구글 시트에서 단어 데이터를 가져오지 못했습니다.');
        setIsLoading(false);
      }
    };

    fetchWords();
  }, []);

  // 🏆 이번 달 모든 게임 점수 합산 로직 (D열 기준)
  const fetchAndCalculateMyRank = (options?: { delayMs?: number }) => {
    const { delayMs = 0 } = options ?? {};
    const logSheetUrl = CONFIG.SHEETS.GRAMMAR_LOG;

    if (!logSheetUrl || !studentName.trim()) return;

    setLoadingRank(true);

    const doFetch = () => {
      fetch(withCacheBust(logSheetUrl))
      .then(res => res.text())
      .then(text => {
        const rows = text.split(/\r?\n/).slice(1);
        
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;

        const thisMonthScores: { [name: string]: number } = {};

        rows.forEach(row => {
          const cols = row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
          
          // 💡 [수정 완료] taskType을 읽어오기 위해 6번째 열(F열)까지 확인합니다.
          if (cols.length < 6) return;

          const dateStr = cols[0]?.replace(/^"|"$/g, '').trim(); 
          const name = cols[1]?.replace(/^"|"$/g, '').trim();   
          const scoreVal = parseInt(cols[3]?.replace(/^"|"$/g, '').trim() || '0', 10);
          
          // 💡 [수정 완료] 여기서 taskType 변수를 정상적으로 선언합니다.
          const taskType = cols[5]?.replace(/^"|"$/g, '').trim(); 

          // ✨ '단어게임'과 '문법게임' 점수만 완벽하게 합산합니다.
          if (!name || isNaN(scoreVal) || scoreVal <= 0) return;
          if (taskType !== '단어게임' && taskType !== '문법게임') return;

          let rowYear = 0;
          let rowMonth = 0;
          const match = dateStr.match(/(\d{4})[./-]\s*(\d{1,2})/);
          if (match) {
            rowYear = parseInt(match[1], 10);
            rowMonth = parseInt(match[2], 10);
          }

          if (rowYear === currentYear && rowMonth === currentMonth) {
            thisMonthScores[name] = (thisMonthScores[name] || 0) + scoreVal;
          }
        });

        const sortedList = Object.entries(thisMonthScores)
          .map(([name, total]) => ({ name, total }))
          .sort((a, b) => b.total - a.total);

        const myIdx = sortedList.findIndex(item => item.name === studentName.trim());
        if (myIdx !== -1) {
          setMyRank(myIdx + 1);
          setMyTotalScore((prev) => Math.max(prev, sortedList[myIdx].total));
        }

        setLoadingRank(false);
      })
      .catch(err => {
        console.error("내 랭킹 계산 실패:", err);
        setLoadingRank(false);
      });
    };

    if (delayMs > 0) {
      setTimeout(doFetch, delayMs);
    } else {
      doFetch();
    }
  };

  useEffect(() => {
    fetchAndCalculateMyRank();
  }, [studentName]);

  const bookList = useMemo(() => {
    const unique = Array.from(new Set(allWords.map((w) => w.book))).filter(Boolean);
    const seriesOrder = ['240', '520', '860', '1240', '1680'];

    return unique.sort((a, b) => {
      const seriesA = a.match(/\d+/)?.[0] || '';
      const seriesB = b.match(/\d+/)?.[0] || '';
      const idxA = seriesOrder.indexOf(seriesA);
      const idxB = seriesOrder.indexOf(seriesB);
      const posA = idxA === -1 ? 9999 : idxA;
      const posB = idxB === -1 ? 9999 : idxB;

      if (posA !== posB) return posA - posB;

      const volA = parseInt(a.replace(/[^0-9]/g, '').replace(seriesA, '') || '0', 10);
      const volB = parseInt(b.replace(/[^0-9]/g, '').replace(seriesB, '') || '0', 10);
      
      if (volA !== volB) return volA - volB;

      return a.localeCompare(b);
    });
  }, [allWords]);

  useEffect(() => {
    if (gameState === 'PLAYING' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [gameState, currentIndex]);

  const startGame = (bookName: string) => {
    setSelectedBook(bookName);
    const filtered = allWords.filter((w) => w.book === bookName);
    const shuffled = [...filtered].sort(() => Math.random() - 0.5).slice(0, 20);

    if (shuffled.length === 0) {
      alert('해당 교재에 등록된 단어 데이터가 없습니다!');
      return;
    }

    setGameWords(shuffled);
    setCurrentIndex(0);
    setScore(0);
    setAttempts(0);
    setWrongCount(0);
    setCombo(0);
    setUserAnswer('');
    setFeedback(null);
    setShowHint(false);
    setShowHalfHint(false);
    setGameState('PLAYING');
  };

  const speakWord = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  const generateHalfHint = (word: string): string => {
    const chars = word.split('');
    const letterIndices = chars
      .map((c, i) => (/[a-zA-Z]/.test(c) ? i : -1))
      .filter((i) => i !== -1);
    const visibleCount = Math.max(1, Math.floor(letterIndices.length * 0.5));

    const visibleSet = new Set(letterIndices.slice(0, visibleCount));
    return chars.map((c, i) => (visibleSet.has(i) ? c : '_')).join('');
  };

  const resetQuestionState = () => {
    setUserAnswer('');
    setAttempts(0);
    setWrongCount(0);
    setShowHint(false);
    setShowHalfHint(false);
    setFeedback(null);
  };

  const moveToNextQuestion = (currentScore: number, delayMs = 0) => {
    const advance = () => {
      if (currentIndex + 1 < gameWords.length) {
        setCurrentIndex((prev) => prev + 1);
        resetQuestionState();
      } else {
        handleFinishGame(currentScore);
      }
    };

    if (delayMs > 0) {
      setTimeout(advance, delayMs);
    } else {
      advance();
    }
  };

  const calculateEarnedPoints = (withHalfHint: boolean) => {
    const baseScore = Math.max(10, 50 - attempts * 10);
    const comboBonus = combo * 5;
    const rawPoints = baseScore + comboBonus;
    return withHalfHint ? Math.floor(rawPoints * 0.5) : rawPoints;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWord || !userAnswer.trim() || feedback?.isCorrect) return;

    const isCorrect = userAnswer.trim().toLowerCase() === currentWord.eng.toLowerCase();
    speakWord(currentWord.eng);

    if (isCorrect) {
      const earnedPoints = calculateEarnedPoints(showHalfHint);
      const nextScore = score + earnedPoints;

      setScore(nextScore);
      setCombo((prev) => prev + 1);

      const praises = ['Perfect! ✨', 'Awesome! 🔥', 'Great Job! 👍', 'Unbelievable! 🚀'];
      const randomPraise = praises[Math.floor(Math.random() * praises.length)];
      const penaltyNote = showHalfHint ? ' (50% 힌트 감점 적용)' : '';
      setFeedback({ isCorrect: true, msg: `${randomPraise} (+${earnedPoints}점)${penaltyNote}` });

      moveToNextQuestion(nextScore, 1300);
    } else {
      const nextWrongCount = wrongCount + 1;
      setWrongCount(nextWrongCount);
      setAttempts((prev) => prev + 1);
      setCombo(0);

      if (nextWrongCount >= 3) {
        setShowHalfHint(true);
        setFeedback({
          isCorrect: false,
          msg: '💡 3번 틀렸어요! 50% 힌트가 열렸습니다. (정답 시 50% 감점)',
        });
      } else {
        setFeedback({ isCorrect: false, msg: 'Oops! 다시 한번 타이핑 해보세요! 🔍' });
      }

      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
      }
    }
  };

  const handleSkipQuestion = () => {
    if (!currentWord || feedback?.isCorrect) return;

    setCombo(0);
    setFeedback({ isCorrect: false, msg: '⏩ 패스! 0점 처리 후 다음 문제로 이동합니다.' });
    moveToNextQuestion(score, 600);
  };

  const handleBackDuringGame = () => {
    handleFinishGame(score);
  };

  const handleFinishGame = (finalScore: number) => {
    setGameState('RESULT');
    setMyTotalScore((prev) => prev + finalScore);

    const payload = {
      type: 'saveLog',
      taskType: '단어게임',
      studentName: studentName.trim(),
      grade: grade,
      score: finalScore,
      stage: selectedBook,
      sheetName: 'GRAMMAR_LOG',
    };

    const sendLog = () => {
      return fetch(CONFIG.WEB_APP_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
      });
    };

    const refreshAfterSave = () => {
      onGameComplete?.(finalScore);
      fetchAndCalculateMyRank({ delayMs: 1500 });
    };

    sendLog()
      .then(() => refreshAfterSave())
      .catch((err) => {
        console.error('1차 저장 통신 실패, 1초 뒤 재시도:', err);
        setTimeout(() => {
          sendLog()
            .then(() => refreshAfterSave())
            .catch((e) => console.error('최종 저장 실패:', e));
        }, 1000);
      });
  };

  if (isLoading) {
    return (
      <div style={styles.container}>
        <h2 style={{ color: '#64748b' }}>🐋 실시간 단어장을 불러오는 중입니다...</h2>
      </div>
    );
  }

  if (gameState === 'SELECT_BOOK') {
    const myRankText = myRank !== null ? `${myRank}위` : '-';
    return (
      <div style={styles.container}>
        <button onClick={onBack} style={styles.backBtn}>⬅ 돌아가기</button>
        <div style={styles.card}>
          <h1 style={styles.title}>⌨️ Word Master 스피드 타자</h1>
          <p style={styles.subtitle}>{studentName} ({grade}) 학생, 도전할 고래영어 교재를 선택하세요!</p>
          <div style={styles.myStatsContainer}>
            <div style={styles.statCol}>
              <span style={styles.statLabel}>🏅 내 랭킹</span>
              <strong style={styles.statRankValue}>{myRankText}</strong>
            </div>
            <div style={styles.statDivider} />
            <div style={styles.statCol}>
              <span style={styles.statLabel}>🔥 총 합산 점수</span>
              <strong style={styles.statScoreValue}>{`${myTotalScore.toLocaleString()}점`}</strong>
            </div>
          </div>
          <div style={styles.bookGrid}>
            {bookList.map((b) => (
              <button key={b} onClick={() => startGame(b)} style={styles.bookBtn} title={`${b} 도전 (20문제)`}>
                📘 {b}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (gameState === 'RESULT') {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <h1 style={{ fontSize: '32px', color: '#10b981', margin: '0 0 10px 0' }}>🎉 미션 완료! 🎉</h1>
          <p style={{ fontSize: '18px', color: '#64748b', marginBottom: '20px' }}>{selectedBook} 단어 마스터 달성!</p>
          <div style={styles.scoreBox}>
            <span style={{ fontSize: '16px', color: '#166534', fontWeight: 'bold' }}>최종 획득 점수</span>
            <strong style={{ fontSize: '48px', color: '#166534', display: 'block', margin: '10px 0' }}>{score}점</strong>
          </div>
          <button onClick={() => { setGameState('SELECT_BOOK'); onGameComplete?.(); fetchAndCalculateMyRank(); }} style={styles.finishBtn}>다른 교재 도전하기 🚀</button>
          <button onClick={onBack} style={{ ...styles.finishBtn, backgroundColor: '#64748b', marginTop: '10px' }}>홈으로 돌아가기</button>
        </div>
      </div>
    );
  }

  const progressPercent = ((currentIndex + 1) / gameWords.length) * 100;
  return (
    <div style={styles.container}>
      <button onClick={handleBackDuringGame} style={styles.backBtn}>⬅ 돌아가기</button>
      <div style={styles.card}>
        <div style={styles.gameHeader}>
          <span style={styles.badge}>📘 {selectedBook} ({currentIndex + 1} / {gameWords.length})</span>
          <span style={styles.scoreText}>🏆 {score}점</span>
        </div>
        <div style={styles.progressBg}>
          <div style={{ ...styles.progressBar, width: `${progressPercent}%` }} />
        </div>
        <div style={{ minHeight: '30px', margin: '10px 0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {combo >= 2 && <span style={styles.comboBadge}>🔥 {combo} COMBO (+{combo * 5}점 보너스!)</span>}
        </div>
        <div style={styles.questionBox}>
          <h2 style={styles.korText}>{currentWord?.kor}</h2>
          {showHalfHint && currentWord && (
            <p style={styles.hintText}>
              💡 50% 힌트: <strong style={{ letterSpacing: '3px', color: '#dc2626', fontFamily: 'monospace' }}>
                {generateHalfHint(currentWord.eng)}
              </strong>
            </p>
          )}
          {showHint && !showHalfHint && (
            <p style={styles.hintText}>
              💡 힌트: <strong style={{ letterSpacing: '4px', color: '#2563eb' }}>
                {currentWord?.eng[0]} {currentWord?.eng.slice(1).replace(/[a-zA-Z]/g, '_ ')}
              </strong>
            </p>
          )}
        </div>
        <form onSubmit={handleSubmit} style={{ width: '100%' }}>
          <input
            ref={inputRef}
            type="text"
            value={userAnswer}
            onChange={(e) => {
              setUserAnswer(e.target.value);
              if (feedback && !feedback.isCorrect) setFeedback(null);
            }}
            disabled={feedback?.isCorrect === true}
            placeholder="영어 단어를 타이핑하세요"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck="false"
            style={{
              ...styles.input,
              borderColor: feedback?.isCorrect ? '#10b981' : feedback ? '#ef4444' : '#cbd5e1',
              backgroundColor: feedback?.isCorrect ? '#f0fdf4' : '#ffffff',
            }}
          />
          <button
            type="submit"
            disabled={feedback?.isCorrect === true || !userAnswer.trim()}
            style={{
              ...styles.submitBtn,
              backgroundColor: feedback?.isCorrect ? '#10b981' : '#2563eb',
            }}
          >
            정답 제출 ↵
          </button>
        </form>
        <button
          type="button"
          onClick={handleSkipQuestion}
          disabled={feedback?.isCorrect === true}
          style={styles.skipBtn}
        >
          ⏩ 다음 문제로 넘어가기 (0점)
        </button>
        <div style={styles.footerRow}>
          <div style={{ minHeight: '24px', flex: 1, textAlign: 'left' }}>
            {feedback && (
              <span style={{ fontWeight: 'bold', fontSize: '14px', color: feedback.isCorrect ? '#166534' : '#dc2626' }}>{feedback.msg}</span>
            )}
          </div>
          {!showHint && !showHalfHint && !feedback?.isCorrect && (
            <button type="button" onClick={() => { setShowHint(true); setAttempts((p) => p + 1); }} style={styles.hintBtn}>
              💡 첫 글자 힌트 보기 (-10점)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: { minHeight: '100vh', backgroundColor: '#f1f5f9', color: '#0f172a', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', boxSizing: 'border-box', fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, system-ui, Roboto, sans-serif' },
  card: { backgroundColor: '#ffffff', color: '#0f172a', padding: '30px', borderRadius: '20px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', width: '100%', maxWidth: '550px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', boxSizing: 'border-box' },
  backBtn: { position: 'absolute', top: '20px', left: '20px', padding: '10px 15px', borderRadius: '10px', background: '#e2e8f0', color: '#0f172a', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' },
  title: { fontSize: '26px', fontWeight: '800', color: '#1e293b', margin: '10px 0 10px 0', wordBreak: 'keep-all' },
  subtitle: { fontSize: '15px', color: '#64748b', marginBottom: '20px', wordBreak: 'keep-all' },
  myStatsContainer: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: '15px', backgroundColor: '#f8fafc', padding: '12px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '20px', width: '100%', boxSizing: 'border-box' },
  statCol: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', minWidth: '90px' },
  statLabel: { fontSize: '12px', color: '#64748b', fontWeight: 'bold' },
  statRankValue: { fontSize: '17px', color: '#d97706', fontWeight: '800' },
  statScoreValue: { fontSize: '17px', color: '#2563eb', fontWeight: '800' },
  statDivider: { width: '1px', height: '28px', backgroundColor: '#e2e8f0' },
  bookGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', boxSizing: 'border-box', width: '100%', maxHeight: '55vh', overflowY: 'auto', paddingRight: '2px' },
  bookBtn: { padding: '10px 6px', backgroundColor: '#f8fafc', border: '2px solid #e2e8f0', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold', color: '#334155', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', boxSizing: 'border-box' },
  gameHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '12px', fontSize: '15px', fontWeight: 'bold' },
  badge: { backgroundColor: '#e0f2fe', color: '#0369a1', padding: '6px 14px', borderRadius: '20px', fontSize: '14px' },
  scoreText: { color: '#d97706', fontSize: '18px' },
  progressBg: { width: '100%', height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden', marginBottom: '5px' },
  progressBar: { height: '100%', backgroundColor: '#2563eb', transition: 'width 0.3s ease' },
  comboBadge: { backgroundColor: '#fef3c7', color: '#d97706', padding: '6px 16px', borderRadius: '20px', fontSize: '14px', fontWeight: '800', border: '1px solid #fde68a', animation: 'bounce 0.3s ease' },
  questionBox: { backgroundColor: '#f8fafc', width: '100%', padding: '35px 20px', borderRadius: '16px', border: '1px solid #e2e8f0', margin: '10px 0 20px 0', boxSizing: 'border-box' },
  korText: { fontSize: '28px', fontWeight: '900', color: '#0f172a', margin: 0, wordBreak: 'keep-all', lineHeight: '1.4' },
  hintText: { fontSize: '16px', color: '#64748b', marginTop: '15px', marginBottom: 0 },
  input: { width: '100%', padding: '16px', fontSize: '20px', fontWeight: 'bold', borderRadius: '14px', border: '2px solid #cbd5e1', textAlign: 'center', outline: 'none', boxSizing: 'border-box', marginBottom: '12px', color: '#0f172a' },
  submitBtn: { width: '100%', padding: '16px', color: '#ffffff', border: 'none', borderRadius: '14px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer', transition: 'background 0.2s', boxSizing: 'border-box' },
  skipBtn: { width: '100%', padding: '12px', marginTop: '8px', backgroundColor: '#f8fafc', color: '#64748b', border: '2px solid #e2e8f0', borderRadius: '12px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', boxSizing: 'border-box' },
  footerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginTop: '10px', minHeight: '30px' },
  hintBtn: { background: 'transparent', border: 'none', color: '#64748b', fontSize: '13px', cursor: 'pointer', textDecoration: 'underline', fontWeight: '600', padding: '4px 0', whiteSpace: 'nowrap' },
  scoreBox: { backgroundColor: '#f0fdf4', border: '2px solid #bbf7d0', padding: '25px', borderRadius: '20px', width: '100%', margin: '20px 0', boxSizing: 'border-box' },
  finishBtn: { width: '100%', padding: '16px', backgroundColor: '#10b981', color: '#ffffff', border: 'none', borderRadius: '14px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 12px rgba(16,185,129,0.2)', boxSizing: 'border-box' }
};