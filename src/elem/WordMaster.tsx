import React, { useState, useEffect, useMemo, useRef } from 'react';
import { CONFIG } from '../config'; // 💡 파일 위치에 맞게 경로만 맞춰주세요.

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
  onGameComplete?: (finalScore: number) => void;
}

export default function WordMaster({
  onBack,
  studentName = '테스트학생',
  grade = '초5',
  onGameComplete,
}: WordMasterProps) {
  // --- 상태 관리 (State) ---
  const [allWords, setAllWords] = useState<WordItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [gameState, setGameState] = useState<'SELECT_BOOK' | 'PLAYING' | 'RESULT'>('SELECT_BOOK');
  const [selectedBook, setSelectedBook] = useState<string>('');
  const [gameWords, setGameWords] = useState<WordItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);

  const [userAnswer, setUserAnswer] = useState<string>('');
  const [score, setScore] = useState<number>(0);
  const [attempts, setAttempts] = useState<number>(0); // 현재 문제 오답 횟수
  const [combo, setCombo] = useState<number>(0); // 연속 정답 콤보
  const [showHint, setShowHint] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ isCorrect: boolean; msg: string } | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const currentWord = gameWords[currentIndex];

  // 1️⃣ 구글 시트(ELEM_WORD)에서 실시간 단어 데이터 가져오기
  useEffect(() => {
    const fetchWords = async () => {
      try {
        const response = await fetch(CONFIG.SHEETS.ELEM_WORD);
        const csvText = await response.text();
        const rows = csvText.split(/\r?\n/).slice(1); // 헤더 제외

        const parsed: WordItem[] = rows
          .map((row) => {
            // 따옴표 내 쉼표를 무시하는 안전한 CSV 분리 규칙
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

  // 2️⃣ 고래영어 교재 드롭다운 정렬 (시리즈: 240 > 520 > 860 > 1240 > 1680 순서 보장 + 각 권 1~6권 순서 보장)
  const bookList = useMemo(() => {
    const unique = Array.from(new Set(allWords.map((w) => w.book))).filter(Boolean);
    const seriesOrder = ['240', '520', '860', '1240', '1680'];

    return unique.sort((a, b) => {
      // 시리즈 숫자 추출 (예: "520 2권" -> "520")
      const seriesA = a.match(/\d+/)?.[0] || '';
      const seriesB = b.match(/\d+/)?.[0] || '';
      const idxA = seriesOrder.indexOf(seriesA);
      const idxB = seriesOrder.indexOf(seriesB);
      const posA = idxA === -1 ? 9999 : idxA;
      const posB = idxB === -1 ? 9999 : idxB;

      // 1순위: 시리즈 순서 정렬
      if (posA !== posB) return posA - posB;

      // 2순위: 같은 시리즈 내에서 권수 정렬 (예: 1권 -> 2권 -> 6권)
      const volA = parseInt(a.replace(/[^0-9]/g, '').replace(seriesA, '') || '0', 10);
      const volB = parseInt(b.replace(/[^0-9]/g, '').replace(seriesB, '') || '0', 10);
      
      if (volA !== volB) return volA - volB;

      // 3순위: 텍스트 기본 정렬
      return a.localeCompare(b);
    });
  }, [allWords]);

  // 🎯 문제 전환 또는 오답 시 입력창에 자동 포커스
  useEffect(() => {
    if (gameState === 'PLAYING' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [gameState, currentIndex]);

  // 3️⃣ 게임 시작 (랜덤 20문제 추출)
  const startGame = (bookName: string) => {
    setSelectedBook(bookName);
    const filtered = allWords.filter((w) => w.book === bookName);

    // 랜덤으로 섞어서 20개만 추출 (20개 미만이면 전체 사용)
    const shuffled = [...filtered].sort(() => Math.random() - 0.5).slice(0, 20);

    if (shuffled.length === 0) {
      alert('해당 교재에 등록된 단어 데이터가 없습니다!');
      return;
    }

    setGameWords(shuffled);
    setCurrentIndex(0);
    setScore(0);
    setAttempts(0);
    setCombo(0);
    setUserAnswer('');
    setFeedback(null);
    setShowHint(false);
    setGameState('PLAYING');
  };

  // 🔊 영어 단어 음성 읽어주기
  const speakWord = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  // 4️⃣ 정답 제출 및 점수 계산 로직
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWord || !userAnswer.trim() || feedback?.isCorrect) return;

    const isCorrect = userAnswer.trim().toLowerCase() === currentWord.eng.toLowerCase();
    speakWord(currentWord.eng);

    if (isCorrect) {
      // 💡 [흥미 유발 점수 규칙] 기본 50점 - (오답 횟수 * 10점, 최소 10점 보장) + 콤보당 5점 보너스!
      const baseScore = Math.max(10, 50 - attempts * 10);
      const comboBonus = combo * 5;
      const earnedPoints = baseScore + comboBonus;
      const nextScore = score + earnedPoints;

      setScore(nextScore);
      setCombo((prev) => prev + 1);

      const praises = ['Perfect! ✨', 'Awesome! 🔥', 'Great Job! 👍', 'Unbelievable! 🚀'];
      const randomPraise = praises[Math.floor(Math.random() * praises.length)];
      setFeedback({ isCorrect: true, msg: `${randomPraise} (+${earnedPoints}점)` });

      setTimeout(() => {
        if (currentIndex + 1 < gameWords.length) {
          setCurrentIndex((prev) => prev + 1);
          setUserAnswer('');
          setAttempts(0);
          setShowHint(false);
          setFeedback(null);
        } else {
          // 🎉 20문제 완수 시 종료 및 시트 저장 함수 호출
          handleFinishGame(nextScore);
        }
      }, 1300);
    } else {
      // ❌ 오답 시 처리: 콤보 초기화, 하트/점수 차감 유도
      setAttempts((prev) => prev + 1);
      setCombo(0);
      setFeedback({ isCorrect: false, msg: 'Oops! 다시 한번 타이핑 해보세요! 🔍' });
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
      }
    }
  };

  // 5️⃣ [핵심] 게임 종료 후 구글 앱스 스크립트(WEB_APP_URL)로 점수 전송
  const handleFinishGame = async (finalScore: number) => {
    setGameState('RESULT');

    const payload = {
      type: 'saveLog',
      taskType: '단어게임', // Grammar.tsx의 '문법게임'과 구분되면서 동일 시트에 저장
      studentName: studentName.trim(),
      grade: grade,
      score: finalScore,
      stage: selectedBook, // 진행한 교재 이름 기록
      sheetName: 'GRAMMAR_LOG', // 💡 Ranking.tsx에서 합산할 수 있도록 동일한 시트에 적재
    };

    try {
      // CORS 차단을 막기 위해 text/plain 헤더 사용
      await fetch(CONFIG.WEB_APP_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
      });
      console.log('단어게임 점수가 시트에 성공적으로 기록되었습니다.');
    } catch (err) {
      console.error('점수 저장 통신 실패:', err);
    }

    // 부모 컴포넌트에 최종 점수 전달 (필요 시 로비 랭킹 갱신용)
    if (onGameComplete) {
      onGameComplete(finalScore);
    }
  };

  // ================= 🎨 화면 렌더링 =================

  if (isLoading) {
    return (
      <div style={styles.container}>
        <h2 style={{ color: '#64748b' }}>🐋 실시간 단어장을 불러오는 중입니다...</h2>
      </div>
    );
  }

  // 1. 교재 선택 화면 (LOBBY)
  if (gameState === 'SELECT_BOOK') {
    return (
      <div style={styles.container}>
        <button onClick={onBack} style={styles.backBtn}>⬅ 돌아가기</button>
        <div style={styles.card}>
          <h1 style={styles.title}>⌨️ Word Master 스피드 타자</h1>
          <p style={styles.subtitle}>{studentName} ({grade}) 학생, 도전할 고래영어 교재를 선택하세요!</p>
          <div style={styles.bookGrid}>
            {bookList.map((b) => (
              <button key={b} onClick={() => startGame(b)} style={styles.bookBtn}>
                📘 {b} 도전 (20문제)
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // 2. 게임 결과 화면 (RESULT)
  if (gameState === 'RESULT') {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <h1 style={{ fontSize: '32px', color: '#10b981', margin: '0 0 10px 0' }}>🎉 미션 완료! 🎉</h1>
          <p style={{ fontSize: '18px', color: '#64748b', marginBottom: '20px' }}>
            {selectedBook} 단어 마스터 달성!
          </p>
          <div style={styles.scoreBox}>
            <span style={{ fontSize: '16px', color: '#166534', fontWeight: 'bold' }}>최종 획득 점수</span>
            <strong style={{ fontSize: '48px', color: '#166534', display: 'block', margin: '10px 0' }}>
              {score}점
            </strong>
          </div>
          <button onClick={() => setGameState('SELECT_BOOK')} style={styles.finishBtn}>
            다른 교재 도전하기 🚀
          </button>
          <button onClick={onBack} style={{ ...styles.finishBtn, backgroundColor: '#64748b', marginTop: '10px' }}>
            홈으로 돌아가기 (랭킹 확인)
          </button>
        </div>
      </div>
    );
  }

  // 3. 게임 진행 화면 (PLAYING)
  const progressPercent = ((currentIndex + 1) / gameWords.length) * 100;

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {/* 상단 진행 상태 & 점수 */}
        <div style={styles.gameHeader}>
          <span style={styles.badge}>📘 {selectedBook} ({currentIndex + 1} / {gameWords.length})</span>
          <span style={styles.scoreText}>🏆 {score}점</span>
        </div>

        {/* 진행도 바 */}
        <div style={styles.progressBg}>
          <div style={{ ...styles.progressBar, width: `${progressPercent}%` }} />
        </div>

        {/* 콤보 배지 (2콤보 이상일 때 등장) */}
        <div style={{ minHeight: '30px', margin: '10px 0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {combo >= 2 && <span style={styles.comboBadge}>🔥 {combo} COMBO (+{combo * 5}점 보너스!)</span>}
        </div>

        {/* 출제된 단어 뜻 & 힌트 */}
        <div style={styles.questionBox}>
          <h2 style={styles.korText}>{currentWord?.kor}</h2>
          {showHint && (
            <p style={styles.hintText}>
              💡 힌트: <strong style={{ letterSpacing: '4px', color: '#2563eb' }}>
                {currentWord?.eng[0]} {currentWord?.eng.slice(1).replace(/[a-zA-Z]/g, '_ ')}
              </strong>
            </p>
          )}
        </div>

        {/* 단어 입력 폼 */}
        <form onSubmit={handleSubmit} style={{ width: '100%' }}>
          <input
            ref={inputRef}
            type="text"
            value={userAnswer}
            onChange={(e) => {
              setUserAnswer(e.target.value);
              if (feedback && !feedback.isCorrect) setFeedback(null); // 다시 치기 시작하면 오답 메시지 지우기
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

        {/* 피드백 메시지 & 힌트 버튼 */}
        <div style={styles.footerRow}>
          <div style={{ minHeight: '24px', flex: 1, textAlign: 'left' }}>
            {feedback && (
              <span style={{
                fontWeight: 'bold',
                fontSize: '14px',
                color: feedback.isCorrect ? '#166534' : '#dc2626'
              }}>
                {feedback.msg}
              </span>
            )}
          </div>

          {!showHint && !feedback?.isCorrect && (
            <button
              type="button"
              onClick={() => { setShowHint(true); setAttempts((p) => p + 1); }}
              style={styles.hintBtn}
            >
              💡 첫 글자 힌트 보기 (-10점)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ================= 🎨 스타일 시트 (다크모드 방지 & 반응형 보강) =================
const styles: { [key: string]: React.CSSProperties } = {
  container: { 
    minHeight: '100vh', 
    backgroundColor: '#f1f5f9', 
    color: '#0f172a', 
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: '20px', 
    boxSizing: 'border-box',
    fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, system-ui, Roboto, sans-serif' 
  },
  card: { 
    backgroundColor: '#ffffff', 
    color: '#0f172a', 
    padding: '30px', 
    borderRadius: '20px', 
    boxShadow: '0 10px 25px rgba(0,0,0,0.05)', 
    width: '100%', 
    maxWidth: '550px', 
    textAlign: 'center', 
    display: 'flex', 
    flexDirection: 'column', 
    alignItems: 'center',
    position: 'relative',
    boxSizing: 'border-box'
  },
  backBtn: { 
    position: 'absolute', 
    top: '20px', 
    left: '20px', 
    padding: '10px 15px', 
    borderRadius: '10px', 
    background: '#e2e8f0', 
    color: '#0f172a', 
    border: 'none', 
    cursor: 'pointer', 
    fontWeight: 'bold',
    fontSize: '14px'
  },
  title: { fontSize: '26px', fontWeight: '800', color: '#1e293b', margin: '10px 0 10px 0', wordBreak: 'keep-all' },
  subtitle: { fontSize: '15px', color: '#64748b', marginBottom: '25px', wordBreak: 'keep-all' },
  bookGrid: { display: 'grid', gridTemplateColumns: '1fr', gap: '10px', width: '100%', maxHeight: '60vh', overflowY: 'auto', paddingRight: '4px' },
  bookBtn: { padding: '16px', backgroundColor: '#f8fafc', border: '2px solid #e2e8f0', borderRadius: '14px', fontSize: '16px', fontWeight: 'bold', color: '#334155', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', textAlign: 'left' },
  
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
  
  footerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginTop: '10px', minHeight: '30px' },
  hintBtn: { background: 'transparent', border: 'none', color: '#64748b', fontSize: '13px', cursor: 'pointer', textDecoration: 'underline', fontWeight: '600', padding: '4px 0', whiteSpace: 'nowrap' },
  
  scoreBox: { backgroundColor: '#f0fdf4', border: '2px solid #bbf7d0', padding: '25px', borderRadius: '20px', width: '100%', margin: '20px 0', boxSizing: 'border-box' },
  finishBtn: { width: '100%', padding: '16px', backgroundColor: '#10b981', color: '#ffffff', border: 'none', borderRadius: '14px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 12px rgba(16,185,129,0.2)', boxSizing: 'border-box' }
};