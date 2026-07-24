import React, { useState, useEffect, useMemo, useRef } from 'react';
import { CONFIG } from '../config';
import { supabase } from '../lib/supabase'; 

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
  currentBook?: string;
}

export default function Word({ onBack, studentId = "ST_TEST", studentName = "테스트학생", currentBook = "" }: WordProps) {
  const [allWords, setAllWords] = useState<GoogleWord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [book, setBook] = useState(currentBook);
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

  // ⭐️ [핵심 추가] 틀린 단어들과 재시험 횟수를 기억하는 공간!
  const [wrongWords, setWrongWords] = useState<string[]>([]);
  const [attemptCount, setAttemptCount] = useState(1);

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

  useEffect(() => {
    const fetchGoogleSheet = async () => {
      try {
        const response = await fetch(CONFIG.SHEETS.ELEM_WORD);
        const csvText = await response.text();
        const rows = csvText.split(/\r?\n/);
        const parsedWords: GoogleWord[] = [];
        rows.forEach((row, index) => {
          if (index === 0 || !row.trim()) return;
          const cells = parseCSVRow(row);
          if (cells.length >= 5 && cells[0] && cells[3] && cells[4]) {
            parsedWords.push({
              book: cells[0],
              lesson: cells[1],
              day: cells[2],
              eng: cells[3],
              kor: cells[4]
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

  useEffect(() => {
    if (currentBook) {
      setBook(currentBook);
    }
  }, [currentBook]);

  const books = useMemo(() => {
    const uniqueBooks = Array.from(new Set(allWords.map(w => w.book?.trim()))).filter(Boolean);
    const order = ['240', '520', '860', '1240', '1680'];
    
    return uniqueBooks.sort((a, b) => {
      const numA = a.match(/\d+/)?.[0] || '';
      const numB = b.match(/\d+/)?.[0] || '';
      
      const indexA = order.indexOf(numA);
      const indexB = order.indexOf(numB);
      
      const posA = indexA === -1 ? 9999 : indexA;
      const posB = indexB === -1 ? 9999 : indexB;
      
      if (posA !== posB) {
        return posA - posB;
      }
      return a.localeCompare(b);
    });
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
    // 새 시험을 시작할 때 모든 기록 초기화
    setCurrentIndex(0);
    setScore(0);
    setIsFinished(false);
    setFeedback(null);
    setUserAnswer('');
    setWrongWords([]); 
    setAttemptCount(1);
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
  }, [currentWordList, currentIndex]);

  const speakWord = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const cleanText = text.replace(/[^a-zA-Z\s-]/g, '');
      const utterance = new SpeechSynthesisUtterance(cleanText);
      
      utterance.lang = 'en-US';
      utterance.rate = 0.85; 
      utterance.pitch = 1.0; 

      const voices = window.speechSynthesis.getVoices();
      const englishVoices = voices.filter(v => v.lang.startsWith('en'));
      const preferredVoices = ['Google US English', 'Samantha', 'Alex', 'Microsoft Zira'];
      
      let selectedVoice = null;
      for (const pref of preferredVoices) {
        selectedVoice = englishVoices.find(v => v.name.includes(pref));
        if (selectedVoice) break;
      }

      if (selectedVoice) {
        utterance.voice = selectedVoice;
      } else if (englishVoices.length > 0) {
        utterance.voice = englishVoices[0]; 
      }

      window.speechSynthesis.speak(utterance);
    }
  };

  // ⭐️ [핵심 변경] 수파베이스로 전송할 때 오답 목록(wrong_answers)도 함께 보냅니다!
  const sendLogToSupabase = async (finalScore: number, finalAttempt: number, finalWrongs: string[]) => {
    if (finalScore !== currentWordList.length || currentWordList.length === 0) {
      return; // 100점이 아닐 때는 기록을 보내지 않습니다. (100점 맞을 때 한 번에 전송)
    }

    try {
      const now = new Date();
      const kstOffset = 9 * 60 * 60 * 1000;
      const kstDate = new Date(now.getTime() + kstOffset);
      const todayStr = kstDate.toISOString().split('T')[0];

      const { error } = await supabase
        .from('learning_logs')
        .insert([{
          student_id: studentId,
          student_name: studentName,
          task_type: '초등단어',
          book_info: `${book}_${unit}_${day}`,
          score: finalScore,
          status: '완료',
          attempt: finalAttempt,
          log_date: todayStr,
          wrong_answers: finalWrongs.length > 0 ? finalWrongs.join(', ') : '없음(한번에 통과)'
        }]);

      if (error) {
        console.error("수파베이스 저장 에러:", error);
      } else {
        console.log("✅ 수파베이스에 오답 기록까지 완벽하게 적재 성공!");
      }
    } catch (err) {
      console.error("수파베이스 로그 전송 실패:", err);
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
    setAttemptCount(prev => prev + 1); 
    // 💡 주의: 재시험을 보더라도 wrongWords(오답 기록)는 지우지 않고 계속 누적합니다!
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
      // ⭐️ 틀렸을 경우: 이미 기록된 오답이 아니면 오답 장부에 추가!
      setWrongWords(prev => prev.includes(currentWord.eng) ? prev : [...prev, currentWord.eng]);
      setFeedback({ isCorrect: false, msg: `오답입니다. 정답은 [ ${currentWord.eng} ]` });
    }
    
    setTimeout(() => {
      if (currentIndex + 1 < currentWordList.length) {
        setCurrentIndex(prev => prev + 1);
      } else {
        setIsFinished(true);
        // 마지막 문제를 풀었을 때 만점이면 수파베이스로 전송!
        sendLogToSupabase(nextScore, attemptCount, wrongWords); 
      }
    }, 1500);
  };

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <button onClick={onBack} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #ccc', backgroundColor: 'white', cursor: 'pointer' }}>← 홈으로</button>
        <span style={{ fontWeight: 'bold', color: '#007aff' }}>{appliedProgress}</span>
      </div>

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
          <p style={{ fontSize: '20px', color: '#333', marginBottom: '15px' }}>총 {currentWordList.length}문제 중 <strong>{score}</strong>문제 정답</p>
          
          {score === currentWordList.length && wrongWords.length > 0 && (
            <div style={{ backgroundColor: '#fff5f5', padding: '12px', borderRadius: '8px', marginBottom: '20px' }}>
              <p style={{ margin: 0, fontSize: '14px', fontWeight: 'bold', color: '#e53935' }}>
                🔥 헷갈렸던 단어들: {wrongWords.join(', ')}
              </p>
            </div>
          )}

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