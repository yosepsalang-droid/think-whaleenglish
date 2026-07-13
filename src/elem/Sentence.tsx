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

// 💡 문자열 유사도 계산 함수
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

  const [isRecording, setIsRecording] = useState(false);
  const [totalAttempts, setTotalAttempts] = useState(0);

  // 💡 [추가] 단계별 상태 및 정확도
  const [isTextPassed, setIsTextPassed] = useState(false);
  const [isVoicePassed, setIsVoicePassed] = useState(false);
  const [lastSimilarity, setLastSimilarity] = useState<number | null>(null);

  const currentSentence = currentSentenceList[currentIndex];

  const normalize = (val: string) => (val || '').toLowerCase().replace(/\s+/g, '').trim();
  const extractDayNum = (dayStr: string): number => { const match = (dayStr || '').match(/\d+/); return match ? parseInt(match[0], 10) : -1; };

  const parseCSVRow = (row: string): string[] => {
    const result: string[] = []; let current = ''; let inQuotes = false;
    for (let i = 0; i < row.length; i++) {
      const char = row[i];
      if (char === '"') inQuotes = !inQuotes;
      else if (char === ',' && !inQuotes) { result.push(current.trim()); current = ''; }
      else current += char;
    }
    result.push(current.trim()); return result;
  };

  useEffect(() => {
    const fetchGoogleSheet = async () => {
      try {
        const response = await fetch(CONFIG.SHEETS.ELEM_SENTENCE);
        const csvText = await response.text();
        const rows = csvText.split(/\r?\n/);
        const parsedSentences: GoogleSentence[] = [];
        rows.forEach((row, index) => {
          if (index === 0 || !row.trim()) return;
          const cells = parseCSVRow(row);
          if (cells.length >= 6 && cells[0] && cells[4] && cells[5]) {
            parsedSentences.push({ book: cells[0], lesson: cells[1], day: cells[2], eng: cells[4], kor: cells[5] });
          }
        });
        setAllSentences(parsedSentences);
        setIsLoading(false);
      } catch (error) { setIsLoading(false); }
    };
    fetchGoogleSheet();
  }, []);

  const books = useMemo(() => Array.from(new Set(allSentences.map(s => s.book?.trim()))).filter(Boolean).sort((a,b)=>a.localeCompare(b)), [allSentences]);
  const units = useMemo(() => Array.from(new Set(allSentences.filter(s => normalize(s.book) === normalize(book)).map(s => s.lesson?.trim()))).filter(Boolean), [allSentences, book]);
  const days = useMemo(() => Array.from(new Set(allSentences.filter(s => normalize(s.book) === normalize(book) && normalize(s.lesson) === normalize(unit)).map(s => s.day?.trim()))).filter(Boolean), [allSentences, book, unit]);

  const filterSentences = (targetBook: string, targetLesson: string, targetDay: string) => {
    const targetDayNumber = extractDayNum(targetDay);
    const filtered = allSentences.filter(s => {
      if (normalize(s.book) !== normalize(targetBook) || normalize(s.lesson) !== normalize(targetLesson)) return false;
      const currentDayNumber = extractDayNum(s.day);
      if (targetDayNumber !== -1 && currentDayNumber !== -1) return currentDayNumber <= targetDayNumber;
      return normalize(s.day) === normalize(targetDay);
    });

    if (filtered.length > 0) {
      setCurrentSentenceList(filtered.map((s, idx) => ({
        id: idx + 1, kor: s.kor, eng: s.eng, chunks: [...s.eng.split(' ').filter(w => w.trim() !== '')].sort(() => Math.random() - 0.5)
      })));
    } else {
      setCurrentSentenceList([{ id: 1, kor: '해당 범위에 문장이 없습니다.', eng: 'none', chunks: [] }]);
    }
    setAppliedProgress(targetDayNumber > 1 ? `${targetBook} ${targetLesson} (~${targetDay} 누적)` : `${targetBook} ${targetLesson} ${targetDay}`);
    
    setCurrentIndex(0);
    setScore(0);
    setIsFinished(false);
    setTotalAttempts(0);
  };

  // 💡 [추가] 다음 문제로 넘어갈 때마다 상태 초기화
  useEffect(() => {
    if (currentSentence && currentSentence.eng !== 'none') {
      setAvailableWords([...currentSentence.chunks]);
      setSelectedWords([]);
      setFeedback(null);
      setIsTextPassed(false);
      setIsVoicePassed(false);
      setLastSimilarity(null);
    }
  }, [currentSentenceList, currentIndex]);

  const speakWord = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US'; utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  // 💡 1단계: 블록 제출 검사
  const handleSubmit = () => {
    if (!currentSentence || currentSentence.eng === 'none') return;
    setTotalAttempts(prev => prev + 1);

    const userAnswer = selectedWords.join(' ');
    const isCorrect = userAnswer === currentSentence.eng;

    if (isCorrect) {
      setIsTextPassed(true);
      setFeedback({ isCorrect: true, msg: "문장 배열 정답! 🎉 이제 마이크를 켜고 정확하게 읽어주세요." });
      speakWord(currentSentence.eng);
    } else {
      setFeedback({ isCorrect: false, msg: `오답입니다. 배열을 다시 확인하세요.` });
      // 오답 시 블록 원래대로 되돌리기
      setAvailableWords([...currentSentence.chunks]);
      setSelectedWords([]);
    }
  };

  const startRecording = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return alert("크롬 브라우저를 사용해주세요.");
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US'; recognition.interimResults = false; recognition.maxAlternatives = 1;

    recognition.onstart = () => { setIsRecording(true); setFeedback({ isCorrect: false, msg: "듣고 있습니다. 문장을 말해주세요..." }); };
    recognition.onresult = (event: any) => checkVoiceAnswer(event.results[0][0].transcript);
    recognition.onerror = () => { setIsRecording(false); setFeedback({ isCorrect: false, msg: "오류가 발생했습니다. 다시 눌러주세요." }); };
    recognition.onend = () => setIsRecording(false);
    recognition.start();
  };

  // 💡 2단계: 음성 인식 검사 및 이동
  const checkVoiceAnswer = (transcript: string) => {
    if (!currentSentence || currentSentence.eng === 'none') return;
    setTotalAttempts(prev => prev + 1);

    const similarity = calculateSimilarity(transcript, currentSentence.eng);
    setLastSimilarity(similarity);

    if (similarity >= 90) {
      setIsVoicePassed(true);
      speakWord(currentSentence.eng);
      const nextScore = score + 1;
      setScore(nextScore);

      setFeedback({ isCorrect: true, msg: `훌륭해요! 👏 (인식: ${transcript})` });

      setTimeout(() => {
        if (currentIndex + 1 < currentSentenceList.length) {
          setCurrentIndex(prev => prev + 1);
        } else {
          setIsFinished(true);
          sendLogToGoogleSheet(nextScore, totalAttempts + 1);
        }
      }, 2000);
    } else {
      setFeedback({ isCorrect: false, msg: `인식: "${transcript}" - 다시 말해보세요.` });
    }
  };

  const sendLogToGoogleSheet = async (finalScore: number, finalAttempts: number) => {
    if (finalScore !== currentSentenceList.length || currentSentenceList.length === 0) return;
    try {
      await fetch(CONFIG.WEB_APP_URL, {
        method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ type: "saveLog", sheetName: "ELEM_MANAGE", studentId, studentName, taskType: `문장배열 (${book}_${unit}_${day})`, status: "완료", score: String(finalScore), attempts: String(finalAttempts) }),
      });
    } catch (err) {}
  };

  const handleWordSelect = (word: string, index: number) => {
    speakWord(word); const newAvailable = [...availableWords]; newAvailable.splice(index, 1);
    setAvailableWords(newAvailable); setSelectedWords([...selectedWords, word]);
  };

  const handleWordDeselect = (word: string, index: number) => {
    const newSelected = [...selectedWords]; newSelected.splice(index, 1);
    setSelectedWords(newSelected); setAvailableWords([...availableWords, word]);
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
          <option value="">교재</option>{books.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
        <select value={unit} onChange={(e) => { setUnit(e.target.value); setDay(''); }} disabled={!book} style={selectStyle}>
          <option value="">Unit</option>{units.map(u => <option key={u} value={u}>{u}</option>)}
        </select>
        <select value={day} onChange={(e) => setDay(e.target.value)} disabled={!unit} style={selectStyle}>
          <option value="">Day</option>{days.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <button onClick={() => { if(!book || !unit || !day) alert("선택해주세요."); else filterSentences(book, unit, day); }} style={{ width: '24%', backgroundColor: '#333', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>확인</button>
      </div>

      {isFinished ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', backgroundColor: '#f8f9fa', borderRadius: '16px' }}>
          <h2>테스트 완료! 🎉</h2>
          <p style={{ fontSize: '20px' }}>총 {currentSentenceList.length}문제 중 <strong>{score}</strong>문제 정답</p>
          <p style={{ color: '#666', fontSize: '14px', marginBottom: '30px' }}>총 시도 횟수: {totalAttempts}회</p>
          <button onClick={onBack} style={{ width: '100%', padding: '16px', backgroundColor: '#28a745', color: 'white', borderRadius: '12px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer', border: 'none' }}>홈으로 가기</button>
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

          <div style={{ minHeight: '80px', padding: '15px', backgroundColor: isTextPassed ? '#d4edda' : '#f0f4f8', border: isTextPassed ? '2px solid #28a745' : '2px dashed #007aff', borderRadius: '12px', marginBottom: '20px', display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', justifyContent: 'center' }}>
            {selectedWords.length === 0 ? <span style={{ color: '#007aff', opacity: 0.6, fontWeight: 'bold', fontSize: '14px' }}>단어를 조합하세요</span> : null}
            {selectedWords.map((word, idx) => (
              <button key={idx} onClick={() => handleWordDeselect(word, idx)} disabled={isTextPassed} style={{ padding: '10px 14px', fontSize: '16px', fontWeight: 'bold', backgroundColor: isTextPassed ? '#28a745' : '#007aff', color: 'white', border: 'none', borderRadius: '10px', cursor: isTextPassed ? 'default' : 'pointer' }}>{word}</button>
            ))}
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center', marginBottom: '30px', minHeight: '60px' }}>
            {availableWords.map((word, idx) => (
              <button key={idx} onClick={() => handleWordSelect(word, idx)} disabled={isTextPassed} style={{ padding: '10px 14px', fontSize: '16px', fontWeight: 'bold', backgroundColor: 'white', color: '#333', border: '2px solid #ccc', borderRadius: '10px', cursor: isTextPassed ? 'default' : 'pointer', opacity: isTextPassed ? 0 : 1 }}>{word}</button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              onClick={startRecording} 
              disabled={!isTextPassed || isVoicePassed || isRecording || currentSentence?.eng === 'none'} 
              style={{ flex: 1, padding: '16px', fontSize: '16px', fontWeight: 'bold', color: (!isTextPassed || isVoicePassed) ? '#999' : isRecording ? 'white' : '#111', backgroundColor: (!isTextPassed || isVoicePassed) ? '#f0f0f0' : isRecording ? '#ff3b30' : '#ffd700', border: 'none', borderRadius: '12px', cursor: (!isTextPassed || isVoicePassed) ? 'not-allowed' : 'pointer' }}
            >
              {isRecording ? '🎙️ 듣는 중...' : '🎙️ 마이크로 말하기'}
            </button>
            <button 
              onClick={handleSubmit} 
              disabled={isTextPassed || currentSentence?.eng === 'none' || selectedWords.length === 0} 
              style={{ flex: 1, padding: '16px', backgroundColor: (isTextPassed || selectedWords.length === 0) ? '#ccc' : '#007aff', color: 'white', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: 'bold', cursor: isTextPassed ? 'not-allowed' : 'pointer' }}
            >
              블록 확인
            </button>
          </div>

          {/* 💡 정확도 게이지 UI */}
          {lastSimilarity !== null && (
            <div style={{ marginTop: '20px', textAlign: 'center' }}>
              <div style={{ fontSize: '13px', color: '#666', marginBottom: '6px', fontWeight: 'bold' }}>내 발음 정확도</div>
              <div style={{ width: '100%', backgroundColor: '#eee', borderRadius: '12px', height: '24px', overflow: 'hidden', position: 'relative' }}>
                <div style={{
                  width: `${lastSimilarity}%`,
                  backgroundColor: lastSimilarity >= 90 ? '#28a745' : lastSimilarity >= 70 ? '#ffc107' : '#dc3545',
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