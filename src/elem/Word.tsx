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

  const [isTextPassed, setIsTextPassed] = useState(false);
  const [isVoicePassed, setIsVoicePassed] = useState(false);
  const [lastSimilarity, setLastSimilarity] = useState<number | null>(null);
  const [failCount, setFailCount] = useState(0); // 💡 실패 횟수 카운트 추가

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

  useEffect(() => {
    setUserAnswer('');
    setFeedback(null);
    setIsTextPassed(false);
    setIsVoicePassed(false);
    setLastSimilarity(null);
    setFailCount(0); // 💡 문제 바뀔 때 실패 횟수 초기화
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWord || currentWord.eng === 'none' || !userAnswer.trim()) return;
    
    setTotalAttempts(prev => prev + 1);
    const isCorrect = userAnswer.trim().toLowerCase() === currentWord.eng.toLowerCase();
    
    if (isCorrect) {
      setIsTextPassed(true);
      setFeedback({ isCorrect: true, msg: "스펠링 정답! 🎉 이제 녹음 버튼을 눌러 정확하게 읽어주세요." });
      speakWord(currentWord.eng);
    } else {
      setFeedback({ isCorrect: false, msg: `오답입니다. 다시 시도하세요.` });
      setUserAnswer('');
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
      setFeedback({ isCorrect: false, msg: "음성 인식 오류. 다시 눌러주세요." });
    };

    recognition.onend = () => setIsRecording(false);
    recognition.start();
  };

  const checkVoiceAnswer = (transcript: string) => {
    if (!currentWord || currentWord.eng === 'none') return;
    setTotalAttempts(prev => prev + 1);

    const similarity = calculateSimilarity(transcript, currentWord.eng);
    setLastSimilarity(similarity);

    // 💡 80%로 기준 완화
    if (similarity >= 80) {
      setIsVoicePassed(true);
      speakWord(currentWord.eng);
      const nextScore = score + 1;
      setScore(nextScore);
      setFailCount(0); // 통과 시 초기화
      
      setFeedback({ isCorrect: true, msg: `훌륭해요! 발음 통과! 👏 (인식: ${transcript})` });

      setTimeout(() => {
        if (currentIndex + 1 < currentWordList.length) {
          setCurrentIndex(prev => prev + 1);
        } else {
          setIsFinished(true);
          sendLogToGoogleSheet(nextScore, totalAttempts + 1);
        }
      }, 1500);
    } else {
      setFailCount(prev => prev + 1); // 💡 실패 카운트 증가
      setFeedback({ isCorrect: false, msg: `"${transcript}"(은)는 좀 어려워요. 다시 시도하세요!` });
    }
  };

  const sendLogToGoogleSheet = async (finalScore: number, finalAttempts: number) => {
    if (currentWordList.length === 0) return;
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

  const handleSkip = () => {
    setFeedback({ isCorrect: true, msg: "이번 문제는 넘어갑니다! ⏩" });
    setTimeout(() => {
      if (currentIndex + 1 < currentWordList.length) {
        setCurrentIndex(prev => prev + 1);
      } else {
        setIsFinished(true);
        sendLogToGoogleSheet(score, totalAttempts);
      }
    }, 1000);
  };

  if (isLoading) return <div style={{ textAlign: 'center', marginTop: '100px' }}><h2>🐋 단어장 불러오는 중...</h2></div>;

  return (
    <div translate="no" className="notranslate" style={{ fontFamily: 'Pretendard, sans-serif', padding: '20px', maxWidth: '500px', margin: '0 auto', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <button onClick={onBack} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #ccc', backgroundColor: 'white', cursor: 'pointer' }}>← 홈으로</button>
        <span style={{ fontWeight: 'bold', color: '#007aff' }}>{appliedProgress}</span>
      </div>

      {isFinished ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', backgroundColor: '#f8f9fa', borderRadius: '16px' }}>
          <h2>단어 테스트 완료! 🎉</h2>
          <p>총 {currentWordList.length}문제 중 <strong>{score}</strong>문제 정답</p>
          <button onClick={onBack} style={{ width: '100%', padding: '16px', backgroundColor: '#28a745', color: 'white', borderRadius: '12px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer', border: 'none' }}>홈으로</button>
        </div>
      ) : (
        <div style={{ padding: '30px 20px', backgroundColor: 'white', border: '1px solid #eee', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#666', marginBottom: '10px' }}>
            <span>단어 {currentIndex + 1} / {currentWordList.length}</span>
          </div>
          
          <h2 style={{ textAlign: 'center', fontSize: '32px', margin: '20px 0 40px 0', color: '#111', fontWeight: '800' }}>
            {currentWord?.kor || '단어 없음'}
          </h2>
          
          <form onSubmit={handleSubmit}>
            <input
              ref={inputRef}
              type="text"
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              disabled={isTextPassed || isRecording || currentWord?.eng === 'none'}
              placeholder="영어 스펠링 입력"
              style={{ width: '100%', padding: '16px', fontSize: '20px', fontWeight: 'bold', borderRadius: '12px', border: isTextPassed ? '2px solid #28a745' : '2px solid #007aff', textAlign: 'center', marginBottom: '10px', backgroundColor: isTextPassed ? '#e9ecef' : 'white', boxSizing: 'border-box' }}
            />
            
            <button
              type="button"
              onClick={startRecording}
              disabled={!isTextPassed || isVoicePassed || isRecording || currentWord?.eng === 'none'}
              style={{ width: '100%', padding: '16px', fontSize: '16px', fontWeight: 'bold', color: (!isTextPassed || isVoicePassed) ? '#999' : '#111', backgroundColor: (!isTextPassed || isVoicePassed) ? '#f0f0f0' : '#ffd700', border: 'none', borderRadius: '12px', cursor: (!isTextPassed || isVoicePassed) ? 'not-allowed' : 'pointer', marginBottom: '10px' }}
            >
              {isRecording ? '🎙️ 듣는 중...' : '🎙️ 음성 인식 (읽기)'}
            </button>

            {/* 💡 3번 실패 시 건너뛰기 버튼 */}
            {failCount >= 3 && !isVoicePassed && (
              <button type="button" onClick={handleSkip} style={{ width: '100%', padding: '12px', backgroundColor: '#6c757d', color: 'white', borderRadius: '12px', border: 'none', marginBottom: '10px', cursor: 'pointer' }}>
                너무 어려워요! 건너뛰기 ⏩
              </button>
            )}
          </form>

          {lastSimilarity !== null && (
            <div style={{ marginTop: '20px', textAlign: 'center' }}>
              <div style={{ width: '100%', backgroundColor: '#eee', borderRadius: '12px', height: '20px', overflow: 'hidden' }}>
                <div style={{ width: `${lastSimilarity}%`, backgroundColor: lastSimilarity >= 80 ? '#28a745' : '#dc3545', height: '100%', transition: 'width 0.5s' }}></div>
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