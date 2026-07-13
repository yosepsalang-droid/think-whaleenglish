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

// 💡 [추가] 문자열 유사도(일치율) 계산 함수 (Levenshtein Distance 기반)
const calculateSimilarity = (str1: string, str2: string) => {
  const s1 = str1.toLowerCase().replace(/[^a-z0-9]/g, '');
  const s2 = str2.toLowerCase().replace(/[^a-z0-9]/g, '');

  if (s1 === s2) return 100;
  if (s1.length === 0 || s2.length === 0) return 0;

  const matrix = [];
  for (let i = 0; i <= s1.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= s2.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= s1.length; i++) {
    for (let j = 1; j <= s2.length; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
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

  // 💡 [추가] 녹음 상태 및 시도 횟수 관련 State
  const [isRecording, setIsRecording] = useState(false);
  const [totalAttempts, setTotalAttempts] = useState(0); 

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
      const posA = indexA === -1 ? 9999 : indexA;
      const posB = indexB === -1 ? 9999 : indexB;
      if (posA !== posB) return posA - posB;
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
      const examFormat = filtered.map((w, idx) => ({ id: idx + 1, kor: w.kor, eng: w.eng }));
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
    setTotalAttempts(0); // 💡 새 게임 시작 시 시도 횟수 초기화
  };

  useEffect(() => {
    setUserAnswer('');
    setFeedback(null);
  }, [currentWordList, currentIndex]);

  const speakWord = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      text = text.replace(/[^a-zA-Z]/g, '');
      utterance.lang = 'en-US';
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  // 💡 [추가] 음성 인식 시작 함수
  const startRecording = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("이 브라우저에서는 음성 인식을 지원하지 않습니다. 크롬(Chrome)을 사용해주세요.");
      return;
    }

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

    recognition.onerror = (event: any) => {
      setIsRecording(false);
      setFeedback({ isCorrect: false, msg: "음성 인식 중 오류가 발생했습니다. 다시 눌러주세요." });
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognition.start();
  };

  // 💡 [추가] 음성 인식 결과 검사 로직 (90% 이상 통과)
  const checkVoiceAnswer = (transcript: string) => {
    if (!currentWord || currentWord.eng === 'none') return;
    
    setTotalAttempts(prev => prev + 1); // 시도 횟수 증가

    const similarity = calculateSimilarity(transcript, currentWord.eng);

    if (similarity >= 90) {
      handleCorrectAnswer(transcript, similarity);
    } else {
      setFeedback({ isCorrect: false, msg: `인식: "${transcript}" (일치율: ${similarity.toFixed(0)}%) - 다시 시도하세요.` });
    }
  };

  const handleCorrectAnswer = (userSpokenOrTyped: string, similarity: number = 100) => {
    speakWord(currentWord.eng);
    const nextScore = score + 1;
    setScore(nextScore);
    
    const msg = similarity < 100 
      ? `정답입니다! 👍 (인식: ${userSpokenOrTyped}, 일치율: ${similarity.toFixed(0)}%)` 
      : '정답입니다! 👍';

    setFeedback({ isCorrect: true, msg });

    setTimeout(() => {
      if (currentIndex + 1 < currentWordList.length) {
        setCurrentIndex(prev => prev + 1);
      } else {
        setIsFinished(true);
        sendLogToGoogleSheet(nextScore, totalAttempts + 1); // 💡 최종 시도 횟수 전달
      }
    }, 1500);
  };

  // 💡 [수정] 텍스트 입력 검사 로직
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWord || currentWord.eng === 'none' || !userAnswer.trim()) return;
    
    setTotalAttempts(prev => prev + 1); // 시도 횟수 증가
    const isCorrect = userAnswer.trim().toLowerCase() === currentWord.eng.toLowerCase();
    
    if (isCorrect) {
      handleCorrectAnswer(userAnswer);
    } else {
      setFeedback({ isCorrect: false, msg: `오답입니다. 정답은 [ ${currentWord.eng} ]` });
    }
  };

  // 💡 [수정] 시도 횟수(attempts) 추가 전송
  const sendLogToGoogleSheet = async (finalScore: number, finalAttempts: number) => {
    if (finalScore !== currentWordList.length || currentWordList.length === 0) return;

    try {
      const detailedTaskType = `단어게임 (${book}_${unit}_${day})`;

      await fetch(CONFIG.WEB_APP_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          type: "saveLog",
          sheetName: "ELEM_MANAGE",
          studentId: studentId,
          studentName: studentName,
          taskType: detailedTaskType,
          status: "완료",
          score: String(finalScore),
          attempts: String(finalAttempts) // 🎯 총 시도 횟수 전송
        }),
      });
      console.log(`로그 적재 성공 (총 시도: ${finalAttempts}회)`);
    } catch (err) {
      console.error("로그 전송 실패:", err);
    }
  };

  const handleApplyProgress = () => {
    if (!book || !unit || !day) return alert("교재, Lesson, Day를 모두 선택해주세요.");
    filterWords(book, unit, day);
  };

  const handleRetest = () => {
    setCurrentIndex(0);
    setScore(0);
    setIsFinished(false);
    setFeedback(null);
    setUserAnswer('');
    setTotalAttempts(0);
  };

  const preventCheating = (e: React.SyntheticEvent) => e.preventDefault();

  if (isLoading) return <div style={{ textAlign: 'center', marginTop: '100px' }}><h2>🐋 단어장 불러오는 중...</h2></div>;

  return (
    <div translate="no" className="notranslate" onContextMenu={preventCheating} style={{ fontFamily: 'Pretendard, sans-serif', padding: '20px', maxWidth: '500px', margin: '0 auto', boxSizing: 'border-box', userSelect: 'none' }}>
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
          {score === currentWordList.length ? (
            <button onClick={onBack} style={{ width: '100%', padding: '16px', backgroundColor: '#28a745', color: 'white', borderRadius: '12px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer', border: 'none' }}>홈으로 가기</button>
          ) : (
            <button onClick={handleRetest} style={{ width: '100%', padding: '16px', backgroundColor: '#dc3545', color: 'white', borderRadius: '12px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer', border: 'none' }}>재시험 보기</button>
          )}
        </div>
      ) : (
        <div style={{ padding: '30px 20px', backgroundColor: 'white', border: '1px solid #eee', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#666', marginBottom: '10px' }}>
            <span>단어 {currentIndex + 1} / {currentWordList.length}</span>
            <span style={{ fontSize: '12px', backgroundColor: '#f1f3f5', padding: '4px 8px', borderRadius: '12px' }}>누적 시도: {totalAttempts}</span>
          </div>
          <h2 onDragStart={preventCheating} style={{ textAlign: 'center', fontSize: currentWord?.eng === 'none' ? '20px' : '32px', margin: '20px 0 40px 0', color: '#111', fontWeight: '800' }}>
            {currentWord?.kor || '단어 없음'}
          </h2>
          
          <form onSubmit={handleSubmit}>
            <input
              ref={inputRef}
              type="text"
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              disabled={feedback?.isCorrect || !currentWord || currentWord.eng === 'none' || isRecording}
              placeholder="영어 단어 입력 (또는 녹음버튼)"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck="false"
              style={{ width: '100%', padding: '16px', fontSize: '20px', fontWeight: 'bold', borderRadius: '12px', border: '2px solid #007aff', textAlign: 'center', outline: 'none', marginBottom: '10px', backgroundColor: feedback ? '#f4f4f4' : 'white', boxSizing: 'border-box' }}
            />
            
            {/* 💡 [추가] 녹음 버튼 & 제출 버튼 */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={startRecording}
                disabled={feedback?.isCorrect || isRecording || currentWord?.eng === 'none'}
                style={{ flex: 1, padding: '16px', fontSize: '16px', fontWeight: 'bold', color: isRecording ? 'white' : '#333', backgroundColor: isRecording ? '#ff3b30' : '#f0f0f0', border: 'none', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                {isRecording ? '🎙️ 듣는 중...' : '🎙️ 음성 인식'}
              </button>
              <button
                type="submit"
                disabled={feedback?.isCorrect || !currentWord || currentWord.eng === 'none' || !userAnswer.trim()}
                style={{ flex: 1, padding: '16px', fontSize: '16px', fontWeight: 'bold', color: 'white', backgroundColor: (feedback?.isCorrect || !userAnswer.trim()) ? '#ccc' : '#111', border: 'none', borderRadius: '12px', cursor: 'pointer' }}
              >
                텍스트 제출
              </button>
            </div>
          </form>
          
          {feedback && (
            <div style={{ marginTop: '20px', padding: '15px', borderRadius: '8px', fontWeight: 'bold', textAlign: 'center', backgroundColor: feedback.isCorrect ? '#d4edda' : '#f8d7da', color: feedback.isCorrect ? '#155724' : '#721c24' }}>
              {feedback.msg}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const selectStyle = { width: '25%', minWidth: '0', padding: '10px 4px', borderRadius: '8px', border: '1px solid #ccc', outline: 'none', fontSize: '14px', boxSizing: 'border-box' as const, backgroundColor: 'white', textAlign: 'center' as const };