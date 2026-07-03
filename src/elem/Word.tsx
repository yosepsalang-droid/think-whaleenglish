import React, { useState, useEffect, useMemo, useRef } from 'react';
import { CONFIG } from '../config';

interface GoogleWord {
  book: string;
  lesson: string;
  day: string;
  eng: string;
  kor: string;
}

interface WordProps {
  onBack: () => void;
  studentId?: string;
  studentName?: string;
}

export default function Word({ onBack, studentId = "ST_TEST", studentName = "테스트학생" }: WordProps) {
  const [allWords, setAllWords] = useState<GoogleWord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 선택 상태 관리
  const [book, setBook] = useState('');
  const [unit, setUnit] = useState('');
  const [day, setDay] = useState('');
  const [appliedProgress, setAppliedProgress] = useState('교재 범위를 선택하세요');

  // 시험 상태 관리
  const [currentWordList, setCurrentWordList] = useState<{ id: number; kor: string; eng: string }[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [feedback, setFeedback] = useState<{ isCorrect: boolean; msg: string } | null>(null);
  
  const [userAnswer, setUserAnswer] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const currentWord = currentWordList[currentIndex];

  const normalize = (val: string) => (val || '').toLowerCase().replace(/\s+/g, '').trim();

  const parseCSVRow = (row: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < row.length; i++) {
      const char = row[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  // 1️⃣ 시트 데이터 로드 (image_dabaa4.png 구조와 매핑)
  useEffect(() => {
    const fetchGoogleSheet = async () => {
      try {
        const response = await fetch(CONFIG.SHEETS.ELEM_WORD);
        const csvText = await response.text();

        const rows = csvText.split(/\r?\n/);
        const parsedWords: GoogleWord[] = [];

        rows.forEach((row, index) => {
          if (index === 0 || !row.trim()) return; // 헤더(1행) 제외
          const cells = parseCSVRow(row);
          
          if (cells.length >= 5 && cells[0] && cells[3] && cells[4]) {
            parsedWords.push({
              book: cells[0],    // A열
              lesson: cells[1],  // B열
              day: cells[2],     // C열
              eng: cells[3],     // D열
              kor: cells[4]      // E열
            });
          }
        });

        setAllWords(parsedWords);
        setIsLoading(false);
      } catch (error) {
        console.error("데이터 로딩 실패:", error);
        alert("구글 시트 데이터를 가져오지 못했습니다.");
        setIsLoading(false);
      }
    };
    fetchGoogleSheet();
  }, []);

  // 2️⃣ 종속형 드롭다운 로직
  const books = useMemo(() => {
    return Array.from(new Set(allWords.map(w => w.book?.trim()))).filter(Boolean).sort();
  }, [allWords]);

  const units = useMemo(() => {
    const filtered = allWords.filter(w => normalize(w.book) === normalize(book));
    return Array.from(new Set(filtered.map(w => w.lesson?.trim()))).filter(Boolean).sort();
  }, [allWords, book]);

  const days = useMemo(() => {
    const filtered = allWords.filter(w => 
      normalize(w.book) === normalize(book) &&
      normalize(w.lesson) === normalize(unit)
    );
    return Array.from(new Set(filtered.map(w => w.day?.trim()))).filter(Boolean).sort();
  }, [allWords, book, unit]);

  // 3️⃣ 선택 범위 필터링 및 게임 시작
  const filterWords = (targetBook: string, targetLesson: string, targetDay: string) => {
    const filtered = allWords.filter(w => {
      return normalize(w.book) === normalize(targetBook) &&
             normalize(w.lesson) === normalize(targetLesson) &&
             normalize(w.day) === normalize(targetDay);
    });

    if (filtered.length > 0) {
      const examFormat = filtered.map((w, idx) => ({ id: idx + 1, kor: w.kor, eng: w.eng }));
      setCurrentWordList(examFormat);
      setAppliedProgress(`[${targetBook}] ${targetLesson} - ${targetDay}`);
    } else {
      setCurrentWordList([{ id: 1, kor: '해당 범위에 단어가 없습니다.', eng: 'none' }]);
      setAppliedProgress('범위 내 단어 없음');
    }

    setCurrentIndex(0);
    setScore(0);
    setIsFinished(false);
    setFeedback(null);
    setUserAnswer('');
  };

  useEffect(() => {
    setUserAnswer('');
    setFeedback(null);
    const timer = setTimeout(() => {
      if (inputRef.current) inputRef.current.focus();
    }, 50);
    return () => clearTimeout(timer);
  }, [currentWordList, currentIndex]);

  const speakWord = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      window.speechSynthesis.speak(utterance);
    }
  };

  // 💡 백엔드(앱스 스크립트)로 로그 전송 (image_dabac9.png 구조와 매핑)
  const sendLogToGoogleSheet = async (finalScore: number) => {
    try {
      await fetch(CONFIG.WEB_APP_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          type: "saveLog",
          studentId: studentId,        // B열에 들어갈 값
          studentName: studentName,    // C열에 들어갈 값
          taskType: "단어게임",        // D열에 들어갈 값
          status: "완료",             // E열에 들어갈 값
          score: String(finalScore)    // F열에 들어갈 값
        }),
      });
    } catch (err) {
      console.error("기록 전송 실패:", err);
    }
  };

  const handleApplyProgress = () => {
    if (!book || !unit || !day) {
      alert("교재, 단원(Lesson), 일자(Day)를 모두 선택해주세요.");
      return;
    }
    filterWords(book, unit, day);
  };

  const handleRetest = () => {
    setCurrentIndex(0);
    setScore(0);
    setIsFinished(false);
    setFeedback(null);
    setUserAnswer('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWord || currentWord.eng === 'none' || !userAnswer.trim()) return;

    const isCorrect = userAnswer.trim().toLowerCase() === currentWord.eng.toLowerCase();
    speakWord(currentWord.eng);

    let nextScore = score;
    if (isCorrect) {
      nextScore = score + 1;
      setScore(nextScore);
      setFeedback({ isCorrect: true, msg: '정답입니다! 👍' });
    } else {
      setFeedback({ isCorrect: false, msg: `오답입니다. 정답은 [ ${currentWord.eng} ]` });
    }

    setTimeout(() => {
      if (currentIndex + 1 < currentWordList.length) {
        setCurrentIndex(prev => prev + 1);
      } else {
        setIsFinished(true);
        sendLogToGoogleSheet(nextScore); // 마지막 문제 종료 후 기록 전송
      }
    }, 1500);
  };

  const preventCheating = (e: React.SyntheticEvent) => e.preventDefault();

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', marginTop: '100px', fontFamily: 'Pretendard, sans-serif' }}>
        <h2>단어장을 불러오는 중입니다...</h2>
      </div>
    );
  }

  return (
    <div translate="no" className="notranslate" onContextMenu={preventCheating} style={styles.container}>
      <div style={styles.header}>
        <button onClick={onBack} style={styles.backBtn}>← 홈으로</button>
        <span style={styles.progressText}>{appliedProgress}</span>
      </div>

      <div style={styles.dropdownContainer}>
        <select value={book} onChange={(e) => { setBook(e.target.value); setUnit(''); setDay(''); }} style={selectStyle}>
          <option value="">교재 선택</option>
          {books.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
        
        <select value={unit} onChange={(e) => { setUnit(e.target.value); setDay(''); }} disabled={!book} style={selectStyle}>
          <option value="">Lesson</option>
          {units.map(u => <option key={u} value={u}>{u}</option>)}
        </select>

        <select value={day} onChange={(e) => setDay(e.target.value)} disabled={!unit} style={selectStyle}>
          <option value="">Day</option>
          {days.map(d => <option key={d} value={d}>{d}</option>)}
        </select>

        <button onClick={handleApplyProgress} style={styles.applyBtn}>시작</button>
      </div>

      {isFinished ? (
        <div style={styles.resultBox}>
          <h2 style={{ margin: '0 0 10px 0' }}>단어 시험 완료! 🎉</h2>
          <p style={{ fontSize: '20px', color: '#333', marginBottom: '30px' }}>
            총 {currentWordList.length}문제 중 <strong>{score}</strong>문제 정답
          </p>
          {score === currentWordList.length ? (
            <button onClick={onBack} style={styles.successBtn}>최고예요! (홈으로 가기)</button>
          ) : (
            <button onClick={handleRetest} style={styles.failBtn}>다시 도전하기</button>
          )}
        </div>
      ) : (
        <div style={styles.gameBox}>
          <p style={{ textAlign: 'center', color: '#666', marginBottom: '10px' }}>
            단어 {currentIndex + 1} / {currentWordList.length}
          </p>
          
          <h2 onDragStart={preventCheating} style={{...styles.wordTitle, fontSize: currentWord?.eng === 'none' ? '20px' : '36px'}}>
            {currentWord?.kor || '단어 없음'}
          </h2>

          <form onSubmit={handleSubmit}>
            <input 
              ref={inputRef} type="text" value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              disabled={feedback !== null || !currentWord || currentWord.eng === 'none'}
              placeholder="영어 단어를 입력하세요" 
              autoComplete="off" autoCapitalize="none" spellCheck="false"
              style={{ ...styles.inputField, backgroundColor: feedback ? '#f4f4f4' : 'white' }}
            />
            
            <button 
              type="submit"
              disabled={feedback !== null || !currentWord || currentWord.eng === 'none' || !userAnswer.trim()} 
              style={{ ...styles.submitBtn, backgroundColor: (feedback || !currentWord || currentWord.eng === 'none' || !userAnswer.trim()) ? '#ccc' : '#2563eb' }}
            >
              정답 제출
            </button>
          </form>

          {feedback && (
            <div style={{ ...styles.feedbackBox, backgroundColor: feedback.isCorrect ? '#dcfce7' : '#fee2e2', color: feedback.isCorrect ? '#166534' : '#991b1b' }}>
              {feedback.msg}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const selectStyle = {
  width: '28%', padding: '10px 4px', borderRadius: '8px', border: '1px solid #ccc', outline: 'none', fontSize: '14px', boxSizing: 'border-box' as const, backgroundColor: 'white', textAlign: 'center' as const
};

const styles = {
  container: { fontFamily: 'Pretendard, sans-serif', padding: '20px', maxWidth: '500px', margin: '0 auto', userSelect: 'none' as const, WebkitUserSelect: 'none' as const },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' },
  backBtn: { padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: 'white', cursor: 'pointer', fontWeight: 'bold' },
  progressText: { fontWeight: 'bold', color: '#2563eb' },
  dropdownContainer: { marginBottom: '24px', padding: '16px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', gap: '6px', alignItems: 'center' },
  applyBtn: { width: '16%', padding: '10px 0', backgroundColor: '#334155', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' },
  resultBox: { textAlign: 'center' as const, padding: '40px 20px', backgroundColor: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0' },
  successBtn: { width: '100%', padding: '16px', backgroundColor: '#16a34a', color: 'white', border: 'none', borderRadius: '12px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer' },
  failBtn: { width: '100%', padding: '16px', backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '12px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer' },
  gameBox: { padding: '30px 20px', backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)' },
  wordTitle: { textAlign: 'center' as const, margin: '20px 0 40px 0', color: '#0f172a', fontWeight: '800' },
  inputField: { width: '100%', padding: '16px', fontSize: '20px', fontWeight: 'bold', borderRadius: '12px', border: '2px solid #2563eb', textAlign: 'center' as const, boxSizing: 'border-box' as const, outline: 'none', marginBottom: '20px' },
  submitBtn: { width: '100%', padding: '16px', fontSize: '18px', fontWeight: 'bold', color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer' },
  feedbackBox: { marginTop: '20px', padding: '15px', borderRadius: '8px', fontWeight: 'bold', textAlign: 'center' as const }
};