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

// 💡 문자열 유사도(일치율) 계산 함수
const calculateSimilarity = (str1: string, str2: string) => {
  const s1 = str1.toLowerCase().replace(/[^a-z0-9]/g, '');
  const s2 = str2.toLowerCase().replace(/[^a-z0-9]/g, '');

  if (s1 === s2) return 100;
  if (s1.length === 0 || s2.length === 0) return 0;

  const matrix = [];
  for (let i = 0; i <= s1.length; i++) { matrix[i] = [i]; }
  for (let j = 0; j <= s2.length; j++) { matrix[0][j] = j; }

  for (let i = 1; i <= s1.length; i++) {
    for (let j = 1; j <= s2.length; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
      }
    }
  }
  const distance = matrix[s1.length][s2.length];
  const maxLen = Math.max(s1.length, s2.length);
  return ((maxLen - distance) / maxLen) * 100;
};

export default function Word({ onBack, studentId = "ST_TEST", studentName = "테스트학생" }: WordProps) {
  const [allWords, setAllWords] = useState<GoogleWord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

  const [isRecording, setIsRecording] = useState(false);
  const [totalAttempts, setTotalAttempts] = useState(0); 

  // 💡 단계별 통과 상태 및 정확도 표시용 State
  const [isTextPassed, setIsTextPassed] = useState(false);
  const [isVoicePassed, setIsVoicePassed] = useState(false);
  const [lastSimilarity, setLastSimilarity] = useState<number | null>(null);
  
  // 💡 [추가] 단어별 시도 횟수 제한을 위한 State
  const [textAttempts, setTextAttempts] = useState(0);
  const [voiceAttempts, setVoiceAttempts] = useState(0);

  const currentWord = currentWordList[currentIndex];

  const normalize = (val: string) => (val || '').toLowerCase().replace(/\s+/g, '').trim();

  const parseCSVRow = (row: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < row.length; i++) {
      const char = row[i];
      if (char === '"') { inQuotes = !inQuotes; } 
      else if (char === ',' && !inQuotes) { result.push(current.trim()); current = ''; } 
      else { current += char; }
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
            parsedWords.push({ book: cells[0], lesson: cells[1], day: cells[2], eng: cells[3], kor: cells[4] });
          }
        });
        setAllWords(parsedWords);
        setIsLoading(false);
      } catch (error) {
        alert("구글 시트 데이터를 가져오지 못했습니다.");
        setIsLoading(false);
      }
    };
    fetchGoogleSheet();
  }, []);

  const books = useMemo(() => {
    const uniqueBooks = Array.from(new Set(allWords.map(w => w.book?.trim()))).filter(Boolean);
    const order = ['240', '520', '860', '1240', '1680'];
    return uniqueBooks.sort((a, b) => {
      const numA = a.match(/\d+/)?.[0] || '';
      const numB = b.match(/\d+/)?.[0] || '';
      const indexA = order.indexOf(numA);
      const indexB = order.indexOf(numB);
      return (indexA === -1 ? 9999 : indexA) - (indexB === -1 ? 9999 : indexB) || a.localeCompare(b);
    });
  }, [allWords]);

  const units = useMemo(() => {
    const filtered = allWords.filter(w => normalize(w.book) === normalize(book));
    return Array.from(new Set(filtered.map(w => w.lesson?.trim()))).filter(Boolean);
  }, [allWords, book]);

  const days = useMemo(() => {
    const filtered = allWords.filter(w => normalize(w.book) === normalize(book) && normalize(w.lesson) === normalize(unit));
    return Array.from(new Set(filtered.map(w => w.day?.trim()))).filter(Boolean);
  }, [allWords, book, unit]);

  const filterWords = (targetBook: string, targetLesson: string, targetDay: string) => {
    const filtered = allWords.filter(w => normalize(w.book) === normalize(targetBook) && normalize(w.lesson) === normalize(targetLesson) && normalize(w.day) === normalize(targetDay));
    if (filtered.length > 0) {
      setCurrentWordList(filtered.map((w, idx) => ({ id: idx + 1, kor: w.kor, eng: w.eng })));
    } else {
      setCurrentWordList([{ id: 1, kor: '해당 범위에 단어가 없습니다.', eng: 'none' }]);
    }
    setAppliedProgress(`${targetBook} ${targetLesson} ${targetDay}`);
    resetGameState();
  };

  const resetGameState = () => {
    setCurrentIndex(0);
    setScore(0);
    setIsFinished(false);
    setTotalAttempts(0);
  };

  // 💡 다음 문제로 넘어갈 때마다 상태 초기화
  useEffect(() => {
    setUserAnswer('');
    setFeedback(null);
    setIsTextPassed(false);
    setIsVoicePassed(false);
    setLastSimilarity(null);
    setTextAttempts(0); // 횟수 초기화
    setVoiceAttempts(0); // 횟수 초기화
    if (inputRef.current) inputRef.current.focus();
  }, [currentIndex, currentWordList]);

  const speakWord = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  // 💡 1단계: 텍스트 제출 처리 (3회 제한 추가)
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWord || currentWord.eng === 'none' || !userAnswer.trim()) return;
    
    setTotalAttempts(prev => prev + 1);
    const newTextAttempts = textAttempts + 1;
    setTextAttempts(newTextAttempts);

    const isCorrect = userAnswer.trim().toLowerCase() === currentWord.eng.toLowerCase();
    
    if (isCorrect || newTextAttempts >= 3) {
      setIsTextPassed(true);
      if (isCorrect) {
        setFeedback({ isCorrect: true, msg: "스펠링 정답! 🎉 이제 녹음 버튼을 눌러 정확하게 읽어주세요." });
      } else {
        setUserAnswer(currentWord.eng); // 3회 오답 시 정답 강제 입력
        setFeedback({ isCorrect: false, msg: "3회 오답으로 스펠링 자동 통과! 녹음 버튼을 눌러주세요." });
      }
      speakWord(currentWord.eng); // 통과하면 한번 읽어줌
    } else {
      setFeedback({ isCorrect: false, msg: `오답입니다. 다시 시도하세요. (${newTextAttempts}/3)` });
      setUserAnswer(''); // 오답 시 입력창 비우기
    }
  };

  const startRecording = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return alert("크롬(Chrome)을 사용해주세요.");

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsRecording(true);
      setFeedback({ isCorrect: false, msg: "듣고 있습니다. 말씀해주세요..." });
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      checkVoiceAnswer(transcript);
    };

    recognition.onerror = () => {
      setIsRecording(false);
      setFeedback({ isCorrect: false, msg: "음성 인식 오류가 발생했습니다. 다시 눌러주세요." });
    };

    recognition.onend = () => setIsRecording(false);
    recognition.start();
  };

  // 💡 2단계: 음성 인식 결과 검사 (80% 기준 및 3회 제한 추가)
  const checkVoiceAnswer = (transcript: string) => {
    if (!currentWord || currentWord.eng === 'none') return;
    setTotalAttempts(prev => prev + 1);

    const similarity = calculateSimilarity(transcript, currentWord.eng);
    setLastSimilarity(similarity);
    
    const newVoiceAttempts = voiceAttempts + 1;
    setVoiceAttempts(newVoiceAttempts);

    const isPass = similarity >= 80; // 💡 90에서 80으로 완화

    if (isPass || newVoiceAttempts >= 3) {
      setIsVoicePassed(true);
      speakWord(currentWord.eng);
      
      let nextScore = score;
      if (isPass) {
        nextScore = score + 1;
        setScore(nextScore);
        setFeedback({ isCorrect: true, msg: `훌륭해요! 발음 통과! 👏 (인식: ${transcript})` });
      } else {
        setFeedback({ isCorrect: false, msg: `3회 실패로 다음 문제로 넘어갑니다. (인식: ${transcript})` });
      }

      setTimeout(() => {
        if (currentIndex + 1 < currentWordList.length) {
          setCurrentIndex(prev => prev + 1);
        } else {
          setIsFinished(true);
          sendLogToGoogleSheet(nextScore, totalAttempts + 1);
        }
      }, 2000);
    } else {
      setFeedback({ isCorrect: false, msg: `인식: "${transcript}" - 다시 시도하세요. (${newVoiceAttempts}/3)` });
    }
  };

  const sendLogToGoogleSheet = async (finalScore: number, finalAttempts: number) => {
    if (finalScore !== currentWordList.length || currentWordList.length === 0) return;
    try {
      await fetch(CONFIG.WEB_APP_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          type: "saveLog",
          sheetName: "ELEM_MANAGE",
          studentId, studentName,
          taskType: `단어게임 (${book}_${unit}_${day})`,
          status: "완료",
          score: String(finalScore),
          attempts: String(finalAttempts)
        }),
      });
    } catch (err) { console.error(err); }
  };

  const handleApplyProgress = () => {
    if (!book || !unit || !day) return alert("교재, Lesson, Day를 모두 선택해주세요.");
    filterWords(book, unit, day);
  };

  if (isLoading) return <div style={{ textAlign: 'center', marginTop: '100px' }}><h2>🐋 단어장 불러오는 중...</h2></div>;

  return (
    <div translate="no" className="notranslate" onContextMenu={(e) => e.preventDefault()} style={{ fontFamily: 'Pretendard, sans-serif', padding: '20px', maxWidth: '500px', margin: '0 auto', boxSizing: 'border-box', userSelect: 'none' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <button onClick={onBack} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #ccc', backgroundColor: 'white', cursor: 'pointer' }}>← 홈으로</button>
        <span style={{ fontWeight: 'bold', color: '#007aff' }}>{appliedProgress}</span>
      </div>

      <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: '#f8f9fa', borderRadius: '12px', border: '1px solid #e9ecef', display: 'flex', gap: '6px' }}>
        <select value={book} onChange={(e) => { setBook(e.target.value); setUnit(''); setDay(''); }} style={selectStyle}>
          <option value="">교재</option>
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
        <button onClick={handleApplyProgress} style={{ width: '24%', backgroundColor: '#333', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>확인</button>
      </div>

      {isFinished ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', backgroundColor: '#f8f9fa', borderRadius: '16px' }}>
          <h2>단어 테스트 완료! 🎉</h2>
          <p>총 {currentWordList.length}문제 중 <strong>{score}</strong>문제 정답</p>
          <p style={{ color: '#666', fontSize: '14px', marginBottom: '20px' }}>총 시도 횟수: {totalAttempts}회</p>
          <button onClick={onBack} style={{ width: '100%', padding: '16px', backgroundColor: '#28a745', color: 'white', borderRadius: '12px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer', border: 'none' }}>홈으로 가기</button>
        </div>
      ) : (
        <div style={{ padding: '30px 20px', backgroundColor: 'white', border: '1px solid #eee', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#666', marginBottom: '10px' }}>
            <span>단어 {currentIndex + 1} / {currentWordList.length}</span>
            <span style={{ fontSize: '12px', backgroundColor: '#f1f3f5', padding: '4px 8px', borderRadius: '12px' }}>누적 시도: {totalAttempts}</span>
          </div>
          
          <h2 onDragStart={(e) => e.preventDefault()} style={{ textAlign: 'center', fontSize: currentWord?.eng === 'none' ? '20px' : '32px', margin: '20px 0 40px 0', color: '#111', fontWeight: '800' }}>
            {currentWord?.kor || '단어 없음'}
          </h2>
          
          <form onSubmit={handleSubmit}>
            <input
              ref={inputRef}
              type="text"
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              disabled={isTextPassed || isRecording || currentWord?.eng === 'none'}
              placeholder={isTextPassed ? "정답! 아래 녹음 버튼을 누르세요" : "영어 단어 스펠링 입력"}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck="false"
              style={{ width: '100%', padding: '16px', fontSize: '20px', fontWeight: 'bold', borderRadius: '12px', border: isTextPassed ? '2px solid #28a745' : '2px solid #007aff', textAlign: 'center', outline: 'none', marginBottom: '10px', backgroundColor: isTextPassed ? '#e9ecef' : 'white', boxSizing: 'border-box' }}
            />
            
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={startRecording}
                disabled={!isTextPassed || isVoicePassed || isRecording || currentWord?.eng === 'none'}
                style={{ flex: 1, padding: '16px', fontSize: '16px', fontWeight: 'bold', color: (!isTextPassed || isVoicePassed) ? '#999' : isRecording ? 'white' : '#111', backgroundColor: (!isTextPassed || isVoicePassed) ? '#f0f0f0' : isRecording ? '#ff3b30' : '#ffd700', border: 'none', borderRadius: '12px', cursor: (!isTextPassed || isVoicePassed) ? 'not-allowed' : 'pointer' }}
              >
                {isRecording ? '🎙️ 듣는 중...' : '🎙️ 음성 인식 (읽기)'}
              </button>
              <button
                type="submit"
                disabled={isTextPassed || !userAnswer.trim() || currentWord?.eng === 'none'}
                style={{ flex: 1, padding: '16px', fontSize: '16px', fontWeight: 'bold', color: 'white', backgroundColor: (isTextPassed || !userAnswer.trim()) ? '#ccc' : '#007aff', border: 'none', borderRadius: '12px', cursor: isTextPassed ? 'not-allowed' : 'pointer' }}
              >
                스펠링 확인
              </button>
            </div>
          </form>

          {/* 💡 정확도 게이지 UI - 80% 기준으로 초록색 표시되도록 변경 */}
          {lastSimilarity !== null && (
            <div style={{ marginTop: '20px', textAlign: 'center' }}>
              <div style={{ fontSize: '13px', color: '#666', marginBottom: '6px', fontWeight: 'bold' }}>내 발음 정확도</div>
              <div style={{ width: '100%', backgroundColor: '#eee', borderRadius: '12px', height: '24px', overflow: 'hidden', position: 'relative' }}>
                <div style={{
                  width: `${lastSimilarity}%`,
                  backgroundColor: lastSimilarity >= 80 ? '#28a745' : lastSimilarity >= 50 ? '#ffc107' : '#dc3545',
                  height: '100%',
                  transition: 'width 0.5s ease-in-out'
                }}></div>
                <span style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', fontSize: '14px', fontWeight: 'bold', color: lastSimilarity >= 50 ? 'white' : '#333', lineHeight: '24px' }}>
                  {lastSimilarity.toFixed(0)}%
                </span>
              </div>
            </div>
          )}
          
          {feedback && (
            <div style={{ marginTop: '15px', padding: '15px', borderRadius: '8px', fontWeight: 'bold', textAlign: 'center', backgroundColor: feedback.isCorrect ? '#d4edda' : '#f8d7da', color: feedback.isCorrect ? '#155724' : '#721c24' }}>
              {feedback.msg}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const selectStyle = { width: '25%', minWidth: '0', padding: '10px 4px', borderRadius: '8px', border: '1px solid #ccc', outline: 'none', fontSize: '14px', boxSizing: 'border-box' as const, backgroundColor: 'white', textAlign: 'center' as const };