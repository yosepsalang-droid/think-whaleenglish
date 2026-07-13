import React, { useState, useEffect, useMemo } from 'react';
import { CONFIG } from '../config';

interface GoogleSentence {
  book: string;
  lesson: string;
  day: string;
  eng: string;
  kor: string;
}

interface SentenceProps {
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

export default function Sentence({ onBack, studentId = "ST_TEST", studentName = "테스트학생" }: SentenceProps) {
  const [allSentences, setAllSentences] = useState<GoogleSentence[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [book, setBook] = useState('');
  const [unit, setUnit] = useState('');
  const [day, setDay] = useState('');
  const [appliedProgress, setAppliedProgress] = useState('교재를 선택하세요');

  const [currentSentenceList, setCurrentSentenceList] = useState<{ id: number; kor: string; eng: string; chunks: string[] }[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [feedback, setFeedback] = useState<{ isCorrect: boolean; msg: string } | null>(null);

  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [availableWords, setAvailableWords] = useState<string[]>([]);

  // 💡 [추가] 녹음 상태 및 시도 횟수 관련 State
  const [isRecording, setIsRecording] = useState(false);
  const [totalAttempts, setTotalAttempts] = useState(0);

  const currentSentence = currentSentenceList[currentIndex];

  const normalize = (val: string) => (val || '').toLowerCase().replace(/\s+/g, '').trim();

  const extractDayNum = (dayStr: string): number => {
    const match = (dayStr || '').match(/\d+/);
    return match ? parseInt(match[0], 10) : -1;
  };

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
        const backupUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTA4Z1o77LMkO66syR0SmqmWPu6q5NapogmBA2iOxpd379nYZ4Gu7y9h7KmGTVb9H9WXNfM5EnFlBxe/pub?gid=752237439&single=true&output=csv";
        const response = await fetch(CONFIG.SHEETS.ELEM_SENTENCE || backupUrl);
        const csvText = await response.text();
        const rows = csvText.split(/\r?\n/);
        const parsedSentences: GoogleSentence[] = [];

        rows.forEach((row, index) => {
          if (index === 0 || !row.trim()) return;
          const cells = parseCSVRow(row);
          if (cells.length >= 6 && cells[0] && cells[4] && cells[5]) {
            parsedSentences.push({
              book: cells[0], lesson: cells[1], day: cells[2], eng: cells[4], kor: cells[5]
            });
          }
        });

        setAllSentences(parsedSentences);
        setIsLoading(false);
      } catch (error) {
        alert("구글 시트 문장 데이터를 가져오지 못했습니다.");
        setIsLoading(false);
      }
    };
    fetchGoogleSheet();
  }, []);

  const books = useMemo(() => {
    const uniqueBooks = Array.from(new Set(allSentences.map(s => s.book?.trim()))).filter(Boolean);
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
  }, [allSentences]);

  const units = useMemo(() => {
    const filtered = allSentences.filter(s => normalize(s.book) === normalize(book));
    return Array.from(new Set(filtered.map(s => s.lesson?.trim()))).filter(Boolean);
  }, [allSentences, book]);

  const days = useMemo(() => {
    const filtered = allSentences.filter(s => normalize(s.book) === normalize(book) && normalize(s.lesson) === normalize(unit));
    return Array.from(new Set(filtered.map(s => s.day?.trim()))).filter(Boolean);
  }, [allSentences, book, unit]);

  const filterSentences = (targetBook: string, targetLesson: string, targetDay: string) => {
    const targetDayNumber = extractDayNum(targetDay);
    const filtered = allSentences.filter(s => {
      if (normalize(s.book) !== normalize(targetBook) || normalize(s.lesson) !== normalize(targetLesson)) return false;
      const currentDayNumber = extractDayNum(s.day);
      if (targetDayNumber !== -1 && currentDayNumber !== -1) {
        return currentDayNumber <= targetDayNumber;
      }
      return normalize(s.day) === normalize(targetDay);
    });

    if (filtered.length > 0) {
      const examFormat = filtered.map((s, idx) => {
        const wordsArray = s.eng.split(' ').filter(w => w.trim() !== '');
        return { id: idx + 1, kor: s.kor, eng: s.eng, chunks: [...wordsArray].sort(() => Math.random() - 0.5) };
      });
      setCurrentSentenceList(examFormat);
      setAppliedProgress(targetDayNumber > 1 ? `${targetBook} ${targetLesson} (~${targetDay} 누적)` : `${targetBook} ${targetLesson} ${targetDay}`);
    } else {
      setCurrentSentenceList([{ id: 1, kor: '해당 범위에 문장이 없습니다.', eng: 'none', chunks: [] }]);
      setAppliedProgress(`${targetBook} ${targetLesson} ${targetDay}`);
    }
    setCurrentIndex(0);
    setScore(0);
    setIsFinished(false);
    setFeedback(null);
    setTotalAttempts(0); // 💡 새 게임 시작 시 시도 횟수 초기화
  };

  useEffect(() => {
    if (currentSentence && currentSentence.eng !== 'none') {
      setAvailableWords([...currentSentence.chunks]);
      setSelectedWords([]);
      setFeedback(null);
    }
  }, [currentSentenceList, currentIndex]);

  const speakWord = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  // 💡 [추가] 음성 인식 시작 함수
  const startRecording = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return alert("크롬(Chrome) 브라우저를 사용해주세요.");

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsRecording(true);
      setFeedback({ isCorrect: false, msg: "듣고 있습니다. 문장을 말해주세요..." });
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      checkVoiceAnswer(transcript);
    };

    recognition.onerror = () => {
      setIsRecording(false);
      setFeedback({ isCorrect: false, msg: "오류가 발생했습니다. 다시 눌러주세요." });
    };

    recognition.onend = () => setIsRecording(false);
    recognition.start();
  };

  // 💡 [추가] 음성 인식 결과 검사 (90% 이상 통과)
  const checkVoiceAnswer = (transcript: string) => {
    if (!currentSentence || currentSentence.eng === 'none') return;
    
    setTotalAttempts(prev => prev + 1);

    const similarity = calculateSimilarity(transcript, currentSentence.eng);

    if (similarity >= 90) {
      handleCorrectAnswer(transcript, similarity);
    } else {
      setFeedback({ isCorrect: false, msg: `인식: "${transcript}" (일치율: ${similarity.toFixed(0)}%) - 다시 말해보세요.` });
    }
  };

  const handleCorrectAnswer = (userSpokenOrTyped: string, similarity: number = 100) => {
    speakWord(currentSentence.eng);
    const nextScore = score + 1;
    setScore(nextScore);
    
    const msg = similarity < 100 
      ? `훌륭합니다! 👏 (인식: ${userSpokenOrTyped}, 일치율: ${similarity.toFixed(0)}%)` 
      : '정답입니다! 👏';

    setFeedback({ isCorrect: true, msg });

    setTimeout(() => {
      if (currentIndex + 1 < currentSentenceList.length) {
        setCurrentIndex(prev => prev + 1);
      } else {
        setIsFinished(true);
        sendLogToGoogleSheet(nextScore, totalAttempts + 1); // 💡 최종 횟수 전달
      }
    }, 2000);
  };

  // 💡 [수정] 블록 제출 결과 검사
  const handleSubmit = () => {
    if (!currentSentence || currentSentence.eng === 'none') return;
    setTotalAttempts(prev => prev + 1);

    const userAnswer = selectedWords.join(' ');
    const isCorrect = userAnswer === currentSentence.eng;

    if (isCorrect) {
      handleCorrectAnswer(userAnswer);
    } else {
      setFeedback({ isCorrect: false, msg: `오답입니다. 정답은 [ ${currentSentence.eng} ]` });
    }
  };

  // 💡 [수정] 시도 횟수(attempts) 추가 전송
  const sendLogToGoogleSheet = async (finalScore: number, finalAttempts: number) => {
    if (finalScore !== currentSentenceList.length || currentSentenceList.length === 0) return;

    try {
      const detailedTaskType = `문장배열 (${book}_${unit}_${day})`;
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
      console.log(`구글 시트에 로그 적재 성공 (총 시도: ${finalAttempts}회)`);
    } catch (err) {
      console.error("로그 전송 실패:", err);
    }
  };

  const handleApplyProgress = () => {
    if (!book || !unit || !day) return alert("교재, Unit, Day를 모두 선택해주세요.");
    filterSentences(book, unit, day);
  };

  const handleRetest = () => {
    setCurrentIndex(0);
    setScore(0);
    setIsFinished(false);
    setFeedback(null);
    setTotalAttempts(0);
    if (currentSentence && currentSentence.eng !== 'none') {
      setAvailableWords([...currentSentence.chunks]);
      setSelectedWords([]);
    }
  };

  const handleWordSelect = (word: string, index: number) => {
    speakWord(word);
    const newAvailable = [...availableWords];
    newAvailable.splice(index, 1);
    setAvailableWords(newAvailable);
    setSelectedWords([...selectedWords, word]);
  };

  const handleWordDeselect = (word: string, index: number) => {
    const newSelected = [...selectedWords];
    newSelected.splice(index, 1);
    setSelectedWords(newSelected);
    setAvailableWords([...availableWords, word]);
  };

  if (isLoading) return <div style={{ textAlign: 'center', marginTop: '100px' }}><h2>🐋 문장 불러오는 중...</h2></div>;

  return (
    <div style={{ fontFamily: 'Pretendard, sans-serif', padding: '20px', maxWidth: '500px', margin: '0 auto', boxSizing: 'border-box' }}>
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
          <option value="">Unit</option>
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
          <h2>테스트 완료! 🎉</h2>
          <p style={{ fontSize: '20px', color: '#333', marginBottom: '10px' }}>총 {currentSentenceList.length}문제 중 <strong>{score}</strong>문제 정답</p>
          <p style={{ color: '#666', fontSize: '14px', marginBottom: '30px' }}>총 시도 횟수: {totalAttempts}회</p>
          {score === currentSentenceList.length ? (
            <button onClick={onBack} style={{ width: '100%', padding: '16px', backgroundColor: '#28a745', color: 'white', borderRadius: '12px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer', border: 'none' }}>홈으로 가기</button>
          ) : (
            <button onClick={handleRetest} style={{ width: '100%', padding: '16px', backgroundColor: '#dc3545', color: 'white', borderRadius: '12px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer', border: 'none' }}>재시험 보기</button>
          )}
        </div>
      ) : (
        <div style={{ padding: '30px 20px', backgroundColor: 'white', border: '1px solid #eee', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#666', marginBottom: '10px' }}>
            <span>문장 {currentIndex + 1} / {currentSentenceList.length}</span>
            <span style={{ fontSize: '12px', backgroundColor: '#f1f3f5', padding: '4px 8px', borderRadius: '12px' }}>누적 시도: {totalAttempts}</span>
          </div>
          
          <h2 style={{ textAlign: 'center', fontSize: currentSentence?.eng === 'none' ? '18px' : '24px', margin: '10px 0 30px 0', color: '#111', wordBreak: 'keep-all' }}>
            {currentSentence?.kor || '문장 없음'}
          </h2>

          <div style={{ minHeight: '80px', padding: '15px', backgroundColor: '#f0f4f8', border: '2px dashed #007aff', borderRadius: '12px', marginBottom: '20px', display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', justifyContent: 'center' }}>
            {selectedWords.length === 0 ? <span style={{ color: '#007aff', opacity: 0.6, fontWeight: 'bold', fontSize: '14px' }}>단어를 조합하거나 마이크로 말하세요</span> : null}
            {selectedWords.map((word, idx) => (
              <button key={idx} onClick={() => handleWordDeselect(word, idx)} disabled={feedback !== null} style={{ padding: '10px 14px', fontSize: '16px', fontWeight: 'bold', backgroundColor: '#007aff', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer' }}>{word}</button>
            ))}
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center', marginBottom: '30px', minHeight: '60px' }}>
            {availableWords.map((word, idx) => (
              <button key={idx} onClick={() => handleWordSelect(word, idx)} disabled={feedback !== null} style={{ padding: '10px 14px', fontSize: '16px', fontWeight: 'bold', backgroundColor: 'white', color: '#333', border: '2px solid #ccc', borderRadius: '10px', cursor: 'pointer' }}>{word}</button>
            ))}
          </div>

          {/* 💡 [추가] 녹음 및 제출 버튼 영역 */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              onClick={startRecording} 
              disabled={feedback !== null || currentSentence?.eng === 'none' || isRecording} 
              style={{ flex: 1, padding: '16px', fontSize: '16px', fontWeight: 'bold', color: isRecording ? 'white' : '#333', backgroundColor: isRecording ? '#ff3b30' : '#f0f0f0', border: 'none', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              {isRecording ? '🎙️ 듣는 중...' : '🎙️ 마이크로 말하기'}
            </button>
            <button 
              onClick={handleSubmit} 
              disabled={feedback !== null || currentSentence?.eng === 'none' || selectedWords.length === 0} 
              style={{ flex: 1, padding: '16px', backgroundColor: (feedback || currentSentence?.eng === 'none' || selectedWords.length === 0) ? '#ccc' : '#111', color: 'white', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              블록 확인
            </button>
          </div>

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