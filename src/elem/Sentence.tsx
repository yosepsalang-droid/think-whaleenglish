import React, { useState, useEffect, useMemo } from 'react';
// 💡 [변경] 중앙 설정 관리 파일을 불러옵니다.
import { CONFIG } from '../config';

// 구글 시트에서 가져올 문장 데이터의 규격 정의
interface GoogleSentence {
  book: string;
  lesson: string;
  day: string;
  eng: string;
  kor: string;
}

// 💡 [변경] 다른 파일들과 호환되도록 학생 정보 Props를 추가했습니다.
interface SentenceProps {
  onBack: () => void;
  studentId?: string;
  studentName?: string;
}

export default function Sentence({ onBack, studentId = "ST_TEST", studentName = "테스트학생" }: SentenceProps) {
  // 전체 문장 데이터 및 로딩 상태 관리
  const [allSentences, setAllSentences] = useState<GoogleSentence[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 드롭다운 선택용 상태 관리
  const [book, setBook] = useState('');
  const [unit, setUnit] = useState('');
  const [day, setDay] = useState('');
  const [appliedProgress, setAppliedProgress] = useState('교재를 선택하세요');

  // 시험 출제용 최종 문장 목록
  const [currentSentenceList, setCurrentSentenceList] = useState<{ id: number; kor: string; eng: string; chunks: string[] }[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [feedback, setFeedback] = useState<{ isCorrect: boolean; msg: string } | null>(null);

  // 게임 조작용 상태
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [availableWords, setAvailableWords] = useState<string[]>([]);

  const currentSentence = currentSentenceList[currentIndex];

  // 대소문자, 띄어쓰기 오차를 없애고 드롭다운과 필터 범위를 100% 일치시키는 절대 규칙
  const normalize = (val: string) => (val || '').toLowerCase().replace(/\s+/g, '').trim();

  // 'Day 3' 같은 문자열에서 숫자 '3'만 정수로 추출해 내는 헬퍼 함수
  const extractDayNum = (dayStr: string): number => {
    const match = (dayStr || '').match(/\d+/);
    return match ? parseInt(match[0], 10) : -1;
  };

  // 빈 셀로 인해 열이 밀리는 현상을 방지하는 CSV 파서
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

  // 1️⃣ 구글 시트 데이터 로드
  useEffect(() => {
    const fetchGoogleSheet = async () => {
      try {
        // 💡 [변경] 하드코딩된 긴 구글 주소 대신 CONFIG 파일에 등록된 주소를 우선 호출합니다.
        // 주소가 없을 경우를 대비해 기존 주소도 백업용(Fallback)으로 연동해 두었습니다.
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
              book: cells[0],    // A열: book_id
              lesson: cells[1],  // B열: unit
              day: cells[2],     // C열: day
              eng: cells[4],     // E열: english
              kor: cells[5]      // F열: korean
            });
          }
        });

        setAllSentences(parsedSentences);
        setIsLoading(false);

      } catch (error) {
        console.error("구글 시트 로딩 실패:", error);
        alert("구글 시트 문장 데이터를 실시간으로 가져오지 못했습니다.");
        setIsLoading(false);
      }
    };

    fetchGoogleSheet();
  }, []);

  // 2️⃣ 실시간 드롭다운 바인딩
  const books = useMemo(() => {
    return Array.from(new Set(allSentences.map(s => s.book?.trim()))).filter(Boolean).sort();
  }, [allSentences]);

  const units = useMemo(() => {
    const filtered = allSentences.filter(s => normalize(s.book) === normalize(book));
    return Array.from(new Set(filtered.map(s => s.lesson?.trim()))).filter(Boolean);
  }, [allSentences, book]);

  const days = useMemo(() => {
    const filtered = allSentences.filter(s => 
      normalize(s.book) === normalize(book) &&
      normalize(s.lesson) === normalize(unit)
    );
    return Array.from(new Set(filtered.map(s => s.day?.trim()))).filter(Boolean);
  }, [allSentences, book, unit]);


  // 3️⃣ 범위 누적 수집 필터링 함수
  const filterSentences = (targetBook: string, targetLesson: string, targetDay: string) => {
    const targetDayNumber = extractDayNum(targetDay);

    const filtered = allSentences.filter(s => {
      const isBookMatch = normalize(s.book) === normalize(targetBook);
      const isLessonMatch = normalize(s.lesson) === normalize(targetLesson);

      if (!isBookMatch || !isLessonMatch) return false;

      const currentDayNumber = extractDayNum(s.day);

      if (targetDayNumber !== -1 && currentDayNumber !== -1) {
        return currentDayNumber <= targetDayNumber;
      }

      return normalize(s.day) === normalize(targetDay);
    });

    if (filtered.length > 0) {
      const examFormat = filtered.map((s, idx) => {
        const wordsArray = s.eng.split(' ').filter(w => w.trim() !== '');
        const shuffledChunks = [...wordsArray].sort(() => Math.random() - 0.5);

        return {
          id: idx + 1,
          kor: s.kor,
          eng: s.eng,
          chunks: shuffledChunks
        };
      });

      setCurrentSentenceList(examFormat);

      const label = targetDayNumber > 1 
        ? `${targetBook} ${targetLesson} (Day1 ~ ${targetDay} 누적)`
        : `${targetBook} ${targetLesson} ${targetDay}`;
      setAppliedProgress(label);

    } else {
      setCurrentSentenceList([{ id: 1, kor: '해당 범위에 등록된 문장이 없습니다.', eng: 'none', chunks: [] }]);
      setAppliedProgress(`${targetBook} ${targetLesson} ${targetDay}`);
    }

    setCurrentIndex(0);
    setScore(0);
    setIsFinished(false);
    setFeedback(null);
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

  // 💡 [신규 추가] 구글 앱스 스크립트로 문장배열 게임 완료 로그 전송
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
          taskType: "문장배열", // 💡 구글 시트에 "문장배열" 통계로 묶여 들어갑니다.
          status: "완료",
          score: String(finalScore)
        }),
      });
      console.log("구글 시트에 문장배열 로그 적재 성공");
    } catch (err) {
      console.error("구글 시트 로그 전송 실패:", err);
    }
  };

  const handleApplyProgress = () => {
    if (!book || !unit || !day) {
      alert("교재, Unit, Day를 모두 선택해주세요.");
      return;
    }
    filterSentences(book, unit, day);
  };

  const handleRetest = () => {
    setCurrentIndex(0);
    setScore(0);
    setIsFinished(false);
    setFeedback(null);
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

  const handleSubmit = () => {
    if (!currentSentence || currentSentence.eng === 'none') return;

    const userAnswer = selectedWords.join(' ');
    const isCorrect = userAnswer === currentSentence.eng;

    let nextScore = score;
    if (isCorrect) {
      nextScore = score + 1;
      setScore(nextScore);
      setFeedback({ isCorrect: true, msg: '정답입니다! 👏' });
      speakWord(currentSentence.eng);
    } else {
      setFeedback({ isCorrect: false, msg: `오답입니다. 정답은 [ ${currentSentence.eng} ]` });
    }

    setTimeout(() => {
      if (currentIndex + 1 < currentSentenceList.length) {
        setCurrentIndex(currentIndex + 1);
      } else {
        setIsFinished(true);
        // 💡 모든 문제를 다 풀었을 때 구글 백엔드로 점수 전송 실행
        sendLogToGoogleSheet(nextScore);
      }
    }, 2000); 
  };

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', marginTop: '100px', fontFamily: 'Pretendard, sans-serif' }}>
        <h2>🐋 구글 시트에서 실시간 문장을 불러오는 중...</h2>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'Pretendard, sans-serif', padding: '20px', maxWidth: '500px', margin: '0 auto', boxSizing: 'border-box' }}>
      
      {/* 상단 헤더 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <button onClick={onBack} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #ccc', backgroundColor: 'white', cursor: 'pointer' }}>← 홈으로</button>
        <span style={{ fontWeight: 'bold', color: '#007aff' }}>{appliedProgress}</span>
      </div>

      {/* 상단 드롭다운 선택 영역 */}
      <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: '#f8f9fa', borderRadius: '12px', border: '1px solid #e9ecef', display: 'flex', gap: '6px', alignItems: 'center', boxSizing: 'border-box' }}>
        <select value={book} onChange={(e) => { setBook(e.target.value); setUnit(''); setDay(''); }} style={selectStyle}>
          <option value="">교재 선택</option>
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

        <button onClick={handleApplyProgress} style={{ width: '24%', padding: '10px 0', backgroundColor: '#333', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px', boxSizing: 'border-box' }}>확인</button>
      </div>

      {isFinished ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', backgroundColor: '#f8f9fa', borderRadius: '16px' }}>
          <h2 style={{ margin: '0 0 10px 0' }}>테스트 완료! 🎉</h2>
          <p style={{ fontSize: '20px', color: '#333', marginBottom: '30px' }}>총 {currentSentenceList.length}문제 중 <strong>{score}</strong>문제 정답</p>
          {score === currentSentenceList.length ? (
            <button onClick={onBack} style={{ width: '100%', padding: '16px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '12px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer' }}>완료 (홈으로 가기)</button>
          ) : (
            <button onClick={handleRetest} style={{ width: '100%', padding: '16px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '12px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer' }}>재시험 보기</button>
          )}
        </div>
      ) : (
        <div style={{ padding: '30px 20px', backgroundColor: 'white', border: '1px solid #eee', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', boxSizing: 'border-box' }}>
          <p style={{ textAlign: 'center', color: '#666', marginBottom: '10px' }}>문장 {currentIndex + 1} / {currentSentenceList.length}</p>
          
          <h2 style={{ textAlign: 'center', fontSize: currentSentence?.eng === 'none' ? '18px' : '24px', margin: '10px 0 30px 0', color: '#111', wordBreak: 'keep-all' }}>
            {currentSentence?.kor || '문장 없음'}
          </h2>

          {/* 내가 조합한 문장 영역 */}
          <div style={{ 
            minHeight: '80px', padding: '15px', backgroundColor: '#f0f4f8', 
            border: '2px dashed #007aff', borderRadius: '12px', marginBottom: '20px', 
            display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', justifyContent: 'center',
            boxSizing: 'border-box'
          }}>
            {selectedWords.length === 0 ? <span style={{ color: '#007aff', opacity: 0.6, fontWeight: 'bold', fontSize: '14px' }}>클릭한 단어가 이곳에 들어옵니다</span> : null}
            {selectedWords.map((word, idx) => (
              <button key={idx} onClick={() => handleWordDeselect(word, idx)} disabled={feedback !== null} 
                style={{ padding: '10px 14px', fontSize: '16px', fontWeight: 'bold', backgroundColor: '#007aff', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                {word}
              </button>
            ))}
          </div>

          {/* 흩어진 단어 버튼 영역 (클릭할 보기) */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center', marginBottom: '30px', minHeight: '60px' }}>
            {availableWords.map((word, idx) => (
              <button key={idx} onClick={() => handleWordSelect(word, idx)} disabled={feedback !== null} 
                style={{ padding: '10px 14px', fontSize: '16px', fontWeight: 'bold', backgroundColor: 'white', color: '#333', border: '2px solid #ccc', borderRadius: '10px', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                {word}
              </button>
            ))}
          </div>

          <button onClick={handleSubmit} disabled={feedback !== null || currentSentence?.eng === 'none' || selectedWords.length === 0} 
            style={{ width: '100%', padding: '16px', backgroundColor: (feedback || currentSentence?.eng === 'none' || selectedWords.length === 0) ? '#ccc' : '#111', color: 'white', border: 'none', borderRadius: '12px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer' }}>
            정답 확인
          </button>

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