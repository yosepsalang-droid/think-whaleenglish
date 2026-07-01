import React, { useState, useEffect, useMemo, useRef } from 'react';
// 💡 [연동] 중앙 설정 관리 파일을 불러옵니다.
import { CONFIG } from './config';

// 💡 문법 구조에 맞게 인터페이스명을 GoogleGrammar로 명확히 분리했습니다.
interface GoogleGrammar {
  book: string;
  lesson: string;
  day: string;
  eng: string; // 영작 정답 문장 혹은 문법 정답
  kor: string; // 출제될 한글 뜻 또는 문제 문항
}

interface GrammarProps {
  onBack: () => void;
  studentId?: string;
  studentName?: string;
}

export default function Grammar({ onBack, studentId = "ST_TEST", studentName = "테스트학생" }: GrammarProps) {
  const [allGrammars, setAllGrammars] = useState<GoogleGrammar[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [book, setBook] = useState('');
  const [unit, setUnit] = useState('');
  const [day, setDay] = useState('');
  const [appliedProgress, setAppliedProgress] = useState('교재를 선택하세요');

  const [currentQuestionList, setCurrentQuestionList] = useState<{ id: number; kor: string; eng: string }[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [feedback, setFeedback] = useState<{ isCorrect: boolean; msg: string } | null>(null);
  
  const [userAnswer, setUserAnswer] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const currentQuestion = currentQuestionList[currentIndex];

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

  // 1️⃣ 구글 시트 데이터 로드 (문법 전용 시트 주소 호출)
  useEffect(() => {
    const fetchGoogleSheet = async () => {
      try {
        // 💡 [중요] config.ts에 ELEM_GRAMMAR 주소가 정의되어 있어야 합니다!
        // 만약 아직 없다면 config.ts의 SHEETS 안에 ELEM_GRAMMAR: "구글시트CSV주소" 를 추가해 주세요.
        const response = await fetch(CONFIG.SHEETS.ELEM_GRAMMAR || CONFIG.SHEETS.ELEM_WORD);
        const csvText = await response.text();

        const rows = csvText.split(/\r?\n/);
        const parsedGrammars: GoogleGrammar[] = [];

        rows.forEach((row, index) => {
          if (index === 0 || !row.trim()) return;

          const cells = parseCSVRow(row);
          
          if (cells.length >= 5 && cells[0] && cells[3] && cells[4]) {
            parsedGrammars.push({
              book: cells[0],    
              lesson: cells[1],  
              day: cells[2],     
              eng: cells[3],     // 문법/영작 정답
              kor: cells[4]      // 문제 내용 (한글 뜻 등)
            });
          }
        });

        setAllGrammars(parsedGrammars);
        setIsLoading(false);

      } catch (error) {
        console.error("구글 시트 로딩 실패:", error);
        alert("구글 시트 데이터를 실시간으로 가져오지 못했습니다.");
        setIsLoading(false);
      }
    };

    fetchGoogleSheet();
  }, []);

  // 2️⃣ 드롭다운 바인딩
  const books = useMemo(() => {
    return Array.from(new Set(allGrammars.map(g => g.book?.trim()))).filter(Boolean).sort();
  }, [allGrammars]);

  const units = useMemo(() => {
    const filtered = allGrammars.filter(g => normalize(g.book) === normalize(book));
    return Array.from(new Set(filtered.map(g => g.lesson?.trim()))).filter(Boolean);
  }, [allGrammars, book]);

  const days = useMemo(() => {
    const filtered = allGrammars.filter(g => 
      normalize(g.book) === normalize(book) &&
      normalize(g.lesson) === normalize(unit)
    );
    return Array.from(new Set(filtered.map(g => g.day?.trim()))).filter(Boolean);
  }, [allGrammars, book, unit]);


  // 3️⃣ 필터링 함수
  const filterQuestions = (targetBook: string, targetLesson: string, targetDay: string) => {
    const filtered = allGrammars.filter(g => {
      return normalize(g.book) === normalize(targetBook) &&
             normalize(g.lesson) === normalize(targetLesson) &&
             normalize(g.day) === normalize(targetDay);
    });

    if (filtered.length > 0) {
      const examFormat = filtered.map((g, idx) => ({
        id: idx + 1,
        kor: g.kor,
        eng: g.eng
      }));
      setCurrentQuestionList(examFormat);
      setAppliedProgress(`${targetBook} ${targetLesson} ${targetDay}`);
    } else {
      setCurrentQuestionList([{ id: 1, kor: '해당 범위에 등록된 문법 문항이 없습니다.', eng: 'none' }]);
      setAppliedProgress(`${targetBook} ${targetLesson} ${targetDay}`);
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
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 50);

    return () => clearTimeout(timer);
  }, [currentQuestionList, currentIndex]);

  // 문법 문장 읽기 기능 (TTS)
  const speakSentence = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 0.85; // 문장이므로 단어보다 살짝 정돈된 속도
      window.speechSynthesis.speak(utterance);
    }
  };

  // 💡 구글 앱스 스크립트로 문법 미션 완료 로그 적재
  const sendLogToGoogleSheet = async (finalScore: number) => {
    try {
      await fetch(CONFIG.WEB_APP_URL, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain;charset=utf-8",
        },
        body: JSON.stringify({
          type: "saveLog",
          studentId: studentId,
          studentName: studentName,
          taskType: "문법게임", // 💡 고정 분리: 구글 시트에 "문법게임"으로 분류되어 들어갑니다.
          status: "완료",
          score: String(finalScore)
        }),
      });
      console.log("구글 시트에 문법 로그 적재 성공");
    } catch (err) {
      console.error("구글 시트 로그 전송 실패:", err);
    }
  };

  const handleApplyProgress = () => {
    if (!book || !unit || !day) {
      alert("교재, Lesson, Day를 모두 선택해주세요.");
      return;
    }
    filterQuestions(book, unit, day);
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
    if (!currentQuestion || currentQuestion.eng === 'none' || !userAnswer.trim()) return;

    // 대소문자 및 양끝 공백을 무시한 정확한 문장 매칭
    const isCorrect = userAnswer.trim().toLowerCase() === currentQuestion.eng.toLowerCase();
    speakSentence(currentQuestion.eng);

    let nextScore = score;
    if (isCorrect) {
      nextScore = score + 1;
      setScore(nextScore);
      setFeedback({ isCorrect: true, msg: '정답입니다! ⚡' });
    } else {
      setFeedback({ isCorrect: false, msg: `오답입니다. 정답은 [ ${currentQuestion.eng} ]` });
    }

    setTimeout(() => {
      if (currentIndex + 1 < currentQuestionList.length) {
        setCurrentIndex(prev => prev + 1);
      } else {
        setIsFinished(true);
        sendLogToGoogleSheet(nextScore);
      }
    }, 2000); // 문법 문장은 확인하는 시간을 고려해 2초로 상향 조정
  };

  const preventCheating = (e: React.SyntheticEvent) => {
    e.preventDefault();
  };

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', marginTop: '100px', fontFamily: 'Pretendard, sans-serif' }}>
        <h2>🐋 구글 시트에서 실시간 문법 퀴즈를 불러오는 중...</h2>
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
        <span style={{ fontWeight: 'bold', color: '#64dfdf' }}>{appliedProgress}</span>
      </div>

      {/* 실시간 감지 드롭다운 영역 */}
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
          <h2 style={{ margin: '0 0 10px 0' }}>문법 테스트 완료! 🎉</h2>
          <p style={{ fontSize: '20px', color: '#333', marginBottom: '30px' }}>총 {currentQuestionList.length}문항 중 <strong>{score}</strong>개 정답</p>
          {score === currentQuestionList.length ? (
            <button onClick={onBack} style={{ width: '100%', padding: '16px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '12px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer' }}>완료 (홈으로 가기)</button>
          ) : (
            <button onClick={handleRetest} style={{ width: '100%', padding: '16px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '12px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer' }}>재시험 보기</button>
          )}
        </div>
      ) : (
        <div style={{ padding: '30px 20px', backgroundColor: 'white', border: '1px solid #eee', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', boxSizing: 'border-box' }}>
          <p style={{ textAlign: 'center', color: '#666', marginBottom: '10px' }}>문항 {currentIndex + 1} / {currentQuestionList.length}</p>
          
          <h2 
            translate="no"
            className="notranslate"
            onDragStart={preventCheating}
            style={{ 
              textAlign: 'center', fontSize: '24px', 
              margin: '20px 0 40px 0', color: '#111', fontWeight: '800',
              userSelect: 'none', WebkitUserSelect: 'none', wordBreak: 'keep-all'
            }}
          >
            {currentQuestion?.kor || '문항 없음'}
          </h2>

          <form onSubmit={handleSubmit}>
            <input 
              ref={inputRef}
              type="text" 
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              disabled={feedback !== null || !currentQuestion || currentQuestion.eng === 'none'}
              placeholder="정답 문장을 입력하세요" 
              autoComplete="off"
              autoCapitalize="none"
              spellCheck="false"
              style={{ 
                width: '100%', padding: '16px', fontSize: '18px', fontWeight: 'bold',
                borderRadius: '12px', border: '2px solid #64dfdf', textAlign: 'center',
                boxSizing: 'border-box', outline: 'none', marginBottom: '20px',
                backgroundColor: feedback ? '#f4f4f4' : 'white'
              }}
            />
            
            <button 
              type="submit"
              disabled={feedback !== null || !currentQuestion || currentQuestion.eng === 'none' || !userAnswer.trim()} 
              style={{ 
                width: '100%', padding: '16px', fontSize: '18px', fontWeight: 'bold', color: 'white',
                backgroundColor: (feedback || !currentQuestion || currentQuestion.eng === 'none' || !userAnswer.trim()) ? '#ccc' : '#111', 
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