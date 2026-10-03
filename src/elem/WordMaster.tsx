import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabase';

interface WordItem {
  book: string;
  lesson?: string;
  day?: string;
  eng: string;
  kor: string;
}

interface WordMasterProps {
  onBack: () => void;
  studentId?: string; 
  studentName?: string;
  grade?: string;
  onGameComplete?: (addedScore?: number) => void;
}

export default function WordMaster({
  onBack,
  studentId = 'ST_TEST',
  studentName = '테스트학생',
  grade = '초5',
  onGameComplete,
}: WordMasterProps) {
  
  // --- 상태 관리 ---
  const [allWords, setAllWords] = useState<WordItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // 💡 [핵심 패치 1] 자체적으로 수파베이스에서 내 랭킹을 불러옵니다!
  const [myRank, setMyRank] = useState<number | null>(null);
  const [myTotalScore, setMyTotalScore] = useState<number>(0);
  const [loadingRank, setLoadingRank] = useState<boolean>(true);

  const [gameState, setGameState] = useState<'SELECT_BOOK' | 'PLAYING' | 'RESULT'>('SELECT_BOOK');
  const [selectedBook, setSelectedBook] = useState<string>('');
  
  const [selectedSeries, setSelectedSeries] = useState<string>('');
  const [selectedVol, setSelectedVol] = useState<string>('');

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

  // 🏆 1. 내 랭킹 및 합산 점수 가져오기 (수파베이스 연동)
  const fetchMyRank = async () => {
    try {
      setLoadingRank(true);
      const now = new Date();
      const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      let allLogs: any[] = [];
      let from = 0;
      const step = 1000;

      while (true) {
        const { data, error } = await supabase
          .from('learning_logs')
          .select('student_name, score')
          .gte('created_at', startOfThisMonth)
          .eq('status', '완료')
          .range(from, from + step - 1);

        if (error) throw error;
        if (data && data.length > 0) {
          allLogs = [...allLogs, ...data];
          if (data.length < step) break;
          from += step;
        } else {
          break;
        }
      }

      const scoresMap = new Map<string, number>();
      allLogs.forEach(log => {
        if (log.student_name && typeof log.score === 'number') {
          scoresMap.set(log.student_name, (scoresMap.get(log.student_name) || 0) + log.score);
        }
      });

      const sortedList = Array.from(scoresMap.entries())
        .map(([name, total]) => ({ name, total }))
        .sort((a, b) => b.total - a.total);

      const myIdx = sortedList.findIndex(item => item.name === studentName.trim());
      if (myIdx !== -1) {
        setMyRank(myIdx + 1);
        setMyTotalScore(sortedList[myIdx].total);
      } else {
        setMyRank(null);
        setMyTotalScore(0);
      }
    } catch (err) {
      console.error("랭킹 계산 실패:", err);
    } finally {
      setLoadingRank(false);
    }
  };

  // 2. 단어장 데이터 가져오기
  useEffect(() => {
    const fetchWords = async () => {
      try {
        let allFetchedData: any[] = [];
        let from = 0;
        const step = 1000;

        while (true) {
          const { data, error } = await supabase
            .from('words')
            .select('book, unit, day, eng, kor')
            .range(from, from + step - 1);

          if (error) throw error;
          
          if (data && data.length > 0) {
            allFetchedData = [...allFetchedData, ...data];
            if (data.length < step) break; 
            from += step;
          } else {
            break;
          }
        }

        const parsed: WordItem[] = allFetchedData
          .map((row) => ({
            book: String(row.book || '').trim(),
            lesson: String(row.unit || '').trim(),
            day: String(row.day || '').trim(),
            eng: String(row.eng || '').trim(),
            kor: String(row.kor || '').trim(),
          }))
          .filter((w) => w.eng && w.kor && w.book);

        setAllWords(parsed);
      } catch (error) {
        console.error('단어 리스트 로딩 실패:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchWords();
    fetchMyRank(); // 랭킹도 같이 불러옵니다.
  }, [studentName]);

  const seriesList = useMemo(() => {
    const uniqueSeries = new Set<string>();
    allWords.forEach(w => {
      const match = w.book.match(/(\d+)/);
      if (match) uniqueSeries.add(match[1]);
    });
    return Array.from(uniqueSeries).sort((a, b) => parseInt(a) - parseInt(b));
  }, [allWords]);

  const volumeList = useMemo(() => {
    if (!selectedSeries) return [];
    const uniqueVols = new Set<string>();
    allWords.forEach(w => {
      if (w.book.startsWith(selectedSeries)) {
        const match = w.book.match(/_(\d+)/);
        if (match) uniqueVols.add(match[1]);
      }
    });
    return Array.from(uniqueVols).sort((a, b) => parseInt(a) - parseInt(b));
  }, [selectedSeries, allWords]);

  useEffect(() => {
    if (gameState === 'PLAYING' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [gameState, currentIndex]);

  const startGame = () => {
    if (!selectedSeries || !selectedVol) {
      return alert("교재 시리즈와 호수를 모두 선택해주세요!");
    }

    const fullBookName = `${selectedSeries}_${selectedVol}`;
    setSelectedBook(fullBookName);

    const filtered = allWords.filter((w) => w.book === fullBookName);
    const shuffled = [...filtered].sort(() => Math.random() - 0.5).slice(0, 20);

    if (shuffled.length === 0) {
      alert(`[${fullBookName}] 교재에 등록된 단어 데이터가 없습니다!`);
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWord || !userAnswer.trim() || feedback?.isCorrect) return;

    const isCorrect = userAnswer.trim().toLowerCase() === currentWord.eng.toLowerCase();
    speakWord(currentWord.eng);

    if (isCorrect) {
      // 💡 [핵심 패치 2] 1문제당 깔끔하게 1점으로 밸런스 조정 완료!
      const earnedPoints = 1; 
      const nextScore = score + earnedPoints;

      setScore(nextScore);
      setCombo((prev) => prev + 1);

      const praises = ['Perfect! ✨', 'Awesome! 🔥', 'Great Job! 👍', 'Unbelievable! 🚀'];
      const randomPraise = praises[Math.floor(Math.random() * praises.length)];
      setFeedback({ isCorrect: true, msg: `${randomPraise} (+1점)` });

      moveToNextQuestion(nextScore, 1000);
    } else {
      const nextWrongCount = wrongCount + 1;
      setWrongCount(nextWrongCount);
      setAttempts((prev) => prev + 1);
      setCombo(0);

      if (nextWrongCount >= 3) {
        setShowHalfHint(true);
        setFeedback({
          isCorrect: false,
          msg: '💡 50% 힌트가 열렸습니다. (침착하게 써보세요)',
        });
      } else {
        setFeedback({ isCorrect: false, msg: 'Oops! 다시 타이핑 해보세요! 🔍' });
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
    setFeedback({ isCorrect: false, msg: '⏩ 패스! 0점 처리 후 이동합니다.' });
    moveToNextQuestion(score, 600);
  };

  const handleBackDuringGame = () => {
    handleFinishGame(score);
  };

  const handleFinishGame = async (finalScore: number) => {
    setGameState('RESULT');
    
    if (finalScore === 0) return;

    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    try {
      await supabase.from('learning_logs').insert([{
        student_id: studentId,
        student_name: studentName,
        task_type: '단어게임', 
        book_info: selectedBook,
        score: finalScore,
        status: '완료', 
        attempt: 1,
        log_date: dateStr
      }]);
      
      if (onGameComplete) onGameComplete(finalScore);
      fetchMyRank(); // DB 저장 후 랭킹 즉시 새로고침
    } catch (err) {
      console.error("DB 점수 저장 오류:", err);
    }
  };

  if (isLoading || loadingRank) {
    return (
      <div style={styles.container}>
        <h2 style={{ color: '#64748b' }}>데이터를 불러오는 중입니다... 🚀</h2>
      </div>
    );
  }

  if (gameState === 'SELECT_BOOK') {
    const myRankText = myRank !== null ? `${myRank}위` : '-';
    
    return (
      <div style={styles.container}>
        <button onClick={onBack} style={styles.backBtn}>⬅ 돌아가기</button>
        <div style={styles.card}>
          <h1 style={styles.title}>⌨️ Word Master</h1>
          <p style={styles.subtitle}>{studentName} 학생, 도전할 고래영어 교재를 선택하세요!</p>
          
          <div style={styles.myStatsContainer}>
            <div style={styles.statCol}>
              <span style={styles.statLabel}>🏅 통합 랭킹</span>
              <strong style={styles.statRankValue}>{myRankText}</strong>
            </div>
            <div style={styles.statDivider} />
            <div style={styles.statCol}>
              <span style={styles.statLabel}>🔥 총 합산 점수</span>
              <strong style={styles.statScoreValue}>{`${myTotalScore.toLocaleString()}점`}</strong>
            </div>
          </div>

          <div style={{ width: '100%', marginBottom: '20px', padding: '16px', backgroundColor: '#f8f9fa', borderRadius: '12px', border: '1px solid #e9ecef', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', gap: '10px' }}>
              <select 
                value={selectedSeries} 
                onChange={(e) => { setSelectedSeries(e.target.value); setSelectedVol(''); }} 
                style={styles.selectBox}
              >
                <option value="">시리즈 선택</option>
                {seriesList.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              
              <select 
                value={selectedVol} 
                onChange={(e) => setSelectedVol(e.target.value)} 
                disabled={!selectedSeries} 
                style={styles.selectBox}
              >
                <option value="">호수 선택</option>
                {volumeList.map(v => <option key={v} value={v}>{v}호</option>)}
              </select>
            </div>

            <button 
              onClick={startGame} 
              disabled={!selectedSeries || !selectedVol}
              style={{
                width: '100%', marginTop: '12px', padding: '14px', borderRadius: '12px',
                fontSize: '16px', fontWeight: 'bold', border: 'none',
                backgroundColor: (!selectedSeries || !selectedVol) ? '#cbd5e1' : '#333',
                color: 'white', cursor: (!selectedSeries || !selectedVol) ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s'
              }}
            >
              도전 시작하기 🚀
            </button>
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
          <button onClick={() => setGameState('SELECT_BOOK')} style={styles.finishBtn}>다른 교재 도전하기 🚀</button>
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
          {combo >= 2 && <span style={styles.comboBadge}>🔥 {combo} COMBO !</span>}
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
        <button type="button" onClick={handleSkipQuestion} disabled={feedback?.isCorrect === true} style={styles.skipBtn}>
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
              💡 첫 글자 힌트 보기
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
  
  selectBox: { width: '50%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '15px', fontWeight: 'bold', backgroundColor: 'white', color: '#1e293b' },

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