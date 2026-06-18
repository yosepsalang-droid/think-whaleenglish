import React, { useState, useEffect, useMemo, useRef } from 'react';

interface GoogleWord {
  book: string;
  lesson: string;
  day: string;
  eng: string;
  kor: string;
}

interface WordProps {
  onBack: () => void;
}

export default function Word({ onBack }: WordProps) {
  const [allWords, setAllWords] = useState<GoogleWord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 💡 [변경] Sentence와 동일하게 초기 선택값은 빈 문자열로 세팅
  const [book, setBook] = useState('');
  const [unit, setUnit] = useState('');
  const [day, setDay] = useState('');
  const [appliedProgress, setAppliedProgress] = useState('교재를 선택하세요');

  const [currentWordList, setCurrentWordList] = useState<{ id: number; kor: string; eng: string }[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [feedback, setFeedback] = useState<{ isCorrect: boolean; msg: string } | null>(null);
  
  const [userAnswer, setUserAnswer] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const currentWord = currentWordList[currentIndex];

  // 대소문자, 띄어쓰기 오차를 제거하는 표준화 함수
  const normalize = (val: string) => (val || '').toLowerCase().replace(/\s+/g, '').trim();

  // 뜻 안의 쉼표 때문에 데이터가 밀리는 현상을 완전히 방지하는 CSV 파서
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

  // 1️⃣ 구글 시트 데이터 로드 (gid=0 단어 탭)
  useEffect(() => {
    const fetchGoogleSheet = async () => {
      try {
        const sheetId = "1vTA4Z1o77LMkO66syR0SmqmWPu6q5NapogmBA2iOxpd379nYZ4Gu7y9h7KmGTVb9H9WXNfM5EnFlBxe";
        const csvUrl = `https://docs.google.com/spreadsheets/d/e/2PACX-${sheetId}/pub?gid=0&single=true&output=csv`;
        
        const response = await fetch(csvUrl);
        const csvText = await response.text();

        const rows = csvText.split(/\r?\n/);
        const parsedWords: GoogleWord[] = [];

        rows.forEach((row, index) => {
          if (index === 0 || !row.trim()) return;

          const cells = parseCSVRow(row);
          
          if (cells.length >= 5 && cells[0] && cells[3] && cells[4]) {
            parsedWords.push({
              book: cells[0],    // A열: book_id
              lesson: cells[1],  // B열: unit/lesson
              day: cells[2],     // C열: day
              eng: cells[3],     // D열: english 단어
              kor: cells[4]      // E열: korean 뜻
            });
          }
        });

        setAllWords(parsedWords);
        setIsLoading(false);

      } catch (error) {
        console.error("구글 시트 로딩 실패:", error);
        alert("구글 시트 데이터를 실시간으로 가져오지 못했습니다.");
        setIsLoading(false);
      }
    };

    fetchGoogleSheet();
  }, []);

  // 2️⃣ [Sentence와 동일] 구글 시트 기반 실시간 드롭다운 데이터 바인딩 로직
  const books = useMemo(() => {
    return Array.from(new Set(allWords.map(w => w.book?.trim()))).filter(Boolean).sort();
  }, [allWords]);

  const units = useMemo(() => {
    const filtered = allWords.filter(w => normalize(w.book) === normalize(book));
    return Array.from(new Set(filtered.map(w => w.lesson?.trim()))).filter(Boolean);
  }, [allWords, book]);

  const days = useMemo(() => {
    const filtered = allWords.filter(w => 
      normalize(w.book) === normalize(book) &&
      normalize(w.lesson) === normalize(unit)
    );
    return Array.from(new Set(filtered.map(w => w.day?.trim()))).filter(Boolean);
  }, [allWords, book, unit]);


  // 3️⃣ 선택 범위 필터링 함수
  const filterWords = (targetBook: string, targetLesson: string, targetDay: string) => {
    const filtered = allWords.filter(w => {
      return normalize(w.book) === normalize(targetBook) &&
             normalize(w.lesson) === normalize(targetLesson) &&
             normalize(w.day) === normalize(targetDay);
    });

    if (filtered.length > 0) {
      const examFormat = filtered.map((w, idx) => ({
        id: idx + 1,
        kor: w.kor,
        eng: w.eng
      }));
      setCurrentWordList(examFormat);
      setAppliedProgress(`${targetBook} ${targetLesson} ${targetDay}`);
    } else {
      setCurrentWordList([{ id: 1, kor: '해당 범위에 등록된 단어가 없습니다.', eng: 'none' }]);
      setAppliedProgress(`${targetBook} ${targetLesson} ${targetDay}`);
    }

    setCurrentIndex(0);
    setScore(0);
    setIsFinished(false);
    setFeedback(null);
    setUserAnswer('');
  };

  // 문제 전환 시 입력창 초기화 및 포커스 복구
  useEffect(() => {
    setUserAnswer('');
    setFeedback(null);
    
    const timer = setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 50);

    return () => clearTimeout(timer);
  }, [currentWordList, currentIndex]);

  const speakWord = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleApplyProgress = () => {
    if (!book || !unit || !day) {
      alert("교재, Lesson, Day를 모두 선택해주세요.");
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

    if (isCorrect) {
      setScore(prev => prev + 1);
      setFeedback({ isCorrect: true, msg: '정답입니다! 👍' });
    } else {
      setFeedback({ isCorrect: false, msg: `오답입니다. 정답은 [ ${currentWord.eng} ]` });
    }

    setTimeout(() => {
      if (currentIndex + 1 < currentWordList.length) {
        setCurrentIndex(prev => prev + 1);
      } else {
        setIsFinished(true);
      }
    }, 1500);
  };

  // 치트 차단용 공통 핸들러
  const preventCheating = (e: React.SyntheticEvent) => {
    e.preventDefault();
  };

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', marginTop: '100px', fontFamily: 'Pretendard, sans-serif' }}>
        <h2>🐋 구글 시트에서 실시간 단어장을 불러오는 중...</h2>
      </div>
    );
  }

  return (
    <div 
      translate="no" 
      className="notranslate"
      onContextMenu={preventCheating}
      style={{ 
        fontFamily: 'Pretendard, sans-serif', padding: '20px', maxWidth: '500px', 
        margin: '0 auto', boxSizing: 'border-box', userSelect: 'none', WebkitUserSelect: 'none'
      }}
    >
      
      {/* 상단 헤더 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <button onClick={onBack} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #ccc', backgroundColor: 'white', cursor: 'pointer' }}>← 홈으로</button>
        <span style={{ fontWeight: 'bold', color: '#007aff' }}>{appliedProgress}</span>
      </div>

      {/* 💡 [변경] Sentence와 동일한 디자인의 실시간 감지 드롭다운 영역 */}
      <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: '#f8f9fa', borderRadius: '12px', border: '1px solid #e9ecef', display: 'flex', gap: '6px', alignItems: 'center', boxSizing: 'border-box' }}>
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

        <button onClick={handleApplyProgress} style={{ width: '24%', padding: '10px 0', backgroundColor: '#333', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px', boxSizing: 'border-box' }}>확인</button>
      </div>

      {isFinished ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', backgroundColor: '#f8f9fa', borderRadius: '16px' }}>
          <h2 style={{ margin: '0 0 10px 0' }}>단어 테스트 완료! 🎉</h2>
          <p style={{ fontSize: '20px', color: '#333', marginBottom: '30px' }}>총 {currentWordList.length}문제 중 <strong>{score}</strong>문제 정답</p>
          {score === currentWordList.length ? (
            <button onClick={onBack} style={{ width: '100%', padding: '16px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '12px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer' }}>완료 (홈으로 가기)</button>
          ) : (
            <button onClick={handleRetest} style={{ width: '100%', padding: '16px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '12px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer' }}>재시험 보기</button>
          )}
        </div>
      ) : (
        <div style={{ padding: '30px 20px', backgroundColor: 'white', border: '1px solid #eee', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', boxSizing: 'border-box' }}>
          <p style={{ textAlign: 'center', color: '#666', marginBottom: '10px' }}>단어 {currentIndex + 1} / {currentWordList.length}</p>
          
          <h2 
            translate="no"
            className="notranslate"
            onDragStart={preventCheating}
            style={{ 
              textAlign: 'center', fontSize: currentWord?.eng === 'none' ? '20px' : '32px', 
              margin: '20px 0 40px 0', color: '#111', fontWeight: '800',
              userSelect: 'none', WebkitUserSelect: 'none'
            }}
          >
            {currentWord?.kor || '단어 없음'}
          </h2>

          <form onSubmit={handleSubmit}>
            <input 
              ref={inputRef}
              type="text" 
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              disabled={feedback !== null || !currentWord || currentWord.eng === 'none'}
              placeholder="영어 단어를 입력하세요" 
              autoComplete="off"
              autoCapitalize="none"
              spellCheck="false"
              style={{ 
                width: '100%', padding: '16px', fontSize: '20px', fontWeight: 'bold',
                borderRadius: '12px', border: '2px solid #007aff', textAlign: 'center',
                boxSizing: 'border-box', outline: 'none', marginBottom: '20px',
                backgroundColor: feedback ? '#f4f4f4' : 'white'
              }}
            />
            
            <button 
              type="submit"
              disabled={feedback !== null || !currentWord || currentWord.eng === 'none' || !userAnswer.trim()} 
              style={{ 
                width: '100%', padding: '16px', fontSize: '18px', fontWeight: 'bold', color: 'white',
                backgroundColor: (feedback || !currentWord || currentWord.eng === 'none' || !userAnswer.trim()) ? '#ccc' : '#111', 
                border: 'none', borderRadius: '12px', cursor: 'pointer' 
              }}
            >
              정답 제출
            </button>
          </form>

          {feedback ? (
            <div style={{ marginTop: '20px', padding: '15px', borderRadius: '8px', fontWeight: 'bold', textAlign: 'center', backgroundColor: feedback.isCorrect ? '#d4edda' : '#f8d7da', color: feedback.isCorrect ? '#155724' : '#721c24' }}>
              {feedback.msg}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

// 드롭다운 공통 스타일 컴포넌트
const selectStyle = {
  width: '25%',
  minWidth: '0',
  padding: '10px 4px',
  borderRadius: '8px',
  border: '1px solid #ccc',
  outline: 'none',
  fontSize: '14px',
  boxSizing: 'border-box' as const,
  backgroundColor: 'white',
  textAlign: 'center' as const
};