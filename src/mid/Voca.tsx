import React, { useState, useEffect, useMemo } from 'react';

interface VocaProps { 
  onBack: () => void; 
  currentBook?: string;
  studentId: string;   // 💡 로그인 보드에서 넘겨받을 학생 ID
  studentName: string; // 💡 로그인 보드에서 넘겨받을 학생 이름
}
interface WordItem { book: string; eng: string; kor: string; }
interface Question { id: number; type: 'eng2kor' | 'kor2eng'; eng: string; kor: string; options: string[]; answer: string; }

// 💡 학습 기록 인터페이스
interface DailyRecord {
  date: string;    // YYYY-MM-DD
  book: string;
  status: '완료' | '미완료';
  score: number;
  attempt: number;
}

const GOOGLE_SHEET_VOCA_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTA4Z1o77LMkO66syR0SmqmWPu6q5NapogmBA2iOxpd379nYZ4Gu7y9h7KmGTVb9H9WXNfM5EnFlBxe/pub?gid=8529494&single=true&output=csv";

export default function Voca({ onBack, currentBook, studentId, studentName }: VocaProps) {
  const [allWords, setAllWords] = useState<WordItem[]>([]);
  const [gameState, setGameState] = useState<'intro' | 'playing' | 'result'>('intro');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedBook, setSelectedBook] = useState(currentBook || '');
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  const [wrongQuestions, setWrongQuestions] = useState<Question[]>([]);
  const [attemptCount, setAttemptCount] = useState(1);
  const [isRetestMode, setIsRetestMode] = useState(false);

  // 💡 [핵심] 오늘 날짜 및 이번 달 기준 정보 생성
  const { todayStr, currentMonthStr, todayFormatted } = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const week = ['일', '월', '화', '수', '목', '금', '토'][now.getDay()];
    
    return {
      todayStr: `${year}-${month}-${day}`, // YYYY-MM-DD (저장용)
      currentMonthStr: `${year}-${month}`, // YYYY-MM (월 단위 체크용)
      todayFormatted: `${year}. ${month}. ${day} (${week})` // UI 출력용
    };
  }, []);

  // 💡 오늘 이 과목을 완료했는지 상태 관리
  const [isTodayFinished, setIsTodayFinished] = useState(false);

  // -------------------------------------------------------------
  // 🛠️ [교사 LMS 연동 대기 함수] 
  // 원장님, 나중에 LMS나 Make.com(텔레그램봇) 연동하실 때 이 함수 내부만 API fetch 코드로 바꾸시면 끝납니다!
  // -------------------------------------------------------------
  const sendToTeacherLMS = async (logData: { studentId: string; studentName: string; date: string; book: string; status: string; score?: number; attempt?: number; note?: string }) => {
    console.log(`[LMS 전송 완료] 학생: ${logData.studentName}, 날짜: ${logData.date}, 상태: ${logData.status}, 사유: ${logData.note || '일반 기록'}`);
    
    /* [나중에 LMS 완성되면 사용하실 코드 예시]
    try {
      await fetch("https://원장님LMS서버주소/api/voca-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(logData)
      });
    } catch(e) { console.error("LMS 전송 실패", e); }
    */
  };

  // 💡 [월 단위 초기화 및 로컬스토리지 제어 로직]
  useEffect(() => {
    if (!studentId) return;

    const storageKey = `voca_log_${studentId}`;
    const savedData = localStorage.getItem(storageKey);
    
    if (savedData) {
      const parsed = JSON.parse(savedData); // { month: "2026-06", records: { "2026-06-24": {...} } }
      
      // 🚨 [매월 1일 월 단위 초기화 검사] 저장된 월과 현재 월이 다르면 실행
      if (parsed.month !== currentMonthStr) {
        const lastMonthRecords = parsed.records || {};
        
        // 지난달에 완료하지 못한 날(기록이 없거나 상태가 '미완료'인 날)을 추출하여 교사 LMS에 전송 유도
        // 지난달의 총 일수를 계산하여 루프를 돕니다.
        const [lastYear, lastMonth] = parsed.month.split('-').map(Number);
        const daysInLastMonth = new Date(lastYear, lastMonth, 0).getDate();

        for (let d = 1; d <= daysInLastMonth; d++) {
          const dayStr = `${lastYear}-${String(lastMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          const record: DailyRecord = lastMonthRecords[dayStr];
          
          if (!record || record.status === '미완료') {
            // 미완료된 데이터를 교사 LMS에 자동 전송
            sendToTeacherLMS({
              studentId,
              studentName,
              date: dayStr,
              book: record?.book || '선택 안 함',
              status: '미완료',
              note: '월말 자동 정산 - 미완료 결손 건'
            });
          }
        }

        // 지난달 정산이 끝났으므로 이번 달 새로운 규격으로 스토리지를 초기화합니다.
        const newMonthData = { month: currentMonthStr, records: {} };
        localStorage.setItem(storageKey, JSON.stringify(newMonthData));
        setIsTodayFinished(false);
      } else {
        // 같은 달이라면, 오늘 날짜의 기록이 '완료'인지 확인해서 UI에 띄워줍니다.
        const todayRecord = parsed.records[todayStr];
        if (todayRecord && todayRecord.status === '완료') {
          setIsTodayFinished(true);
        }
      }
    } else {
      // 최초 사용자라면 이번 달 데이터 세팅
      const initialData = { month: currentMonthStr, records: {} };
      localStorage.setItem(storageKey, JSON.stringify(initialData));
    }
  }, [studentId, currentMonthStr, todayStr, studentName]);

  // 💡 단어 데이터 가져오기
  useEffect(() => {
    const fetchWords = async () => {
      try {
        const response = await fetch(`${GOOGLE_SHEET_VOCA_CSV_URL}&_nocache=${Date.now()}`);
        const text = await response.text();
        const rows = text.split(/\r?\n/).slice(1);
        
        const parsed = rows.map(row => {
          const cells = row.split(','); 
          const cleanText = (str: string) => str ? str.replace(/"/g, '').trim() : '';
          return { 
            book: cleanText(cells[0]), 
            eng: cleanText(cells[3]), 
            kor: cleanText(cells[4]) 
          };
        });
        
        const validWords = parsed.filter(w => w.book && w.eng && w.kor);
        if (validWords.length === 0) alert("데이터가 없습니다. 구글 시트 공유 설정을 확인하세요.");
        setAllWords(validWords);
      } catch (e) { alert("데이터 로드 실패"); }
    };
    fetchWords();
  }, []);

  const books = useMemo(() => Array.from(new Set(allWords.map(w => w.book))), [allWords]);

  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US'; 
      utterance.rate = 0.9; 
      window.speechSynthesis.speak(utterance);
    }
  };

  const startGame = () => {
    if (!selectedBook) return alert("교재를 선택해주세요.");
    const filtered = allWords.filter(w => w.book === selectedBook);
    if (filtered.length === 0) return alert("선택하신 교재의 단어 데이터가 시트에 없습니다.");
    
    // 시작할 때 미리 로컬스토리지에 '미완료' 상태로 기본 기록을 생성/유지하여 학습을 유도합니다.
    saveProgressToLocal('미완료', 0, 1);

    const shuffledWords = [...filtered].sort(() => Math.random() - 0.5).slice(0, 100);
    const halfLength = Math.ceil(shuffledWords.length / 2);
    
    let generatedQuestions = shuffledWords.map((w, i) => {
      const isEng2Kor = i < halfLength; 
      const correct = isEng2Kor ? w.kor : w.eng;
      const options = [correct];
      
      while (options.length < 4) {
        const rand = allWords[Math.floor(Math.random() * allWords.length)];
        const item = isEng2Kor ? rand.kor : rand.eng;
        if (!options.includes(item) && item !== undefined) options.push(item);
      }
      
      return { 
        id: i, 
        type: isEng2Kor ? 'eng2kor' : 'kor2eng', 
        eng: w.eng, 
        kor: w.kor, 
        options: options.sort(() => Math.random() - 0.5), 
        answer: correct 
      } as Question;
    });

    generatedQuestions = generatedQuestions.sort(() => Math.random() - 0.5);

    setQuestions(generatedQuestions);
    setWrongQuestions([]);
    setAttemptCount(1);
    setIsRetestMode(false);
    setGameState('playing');
    setCurrentIndex(0);
    setScore(0);
    setSelectedOption(null);
  };

  const handleStartRetest = () => {
    const shuffledWrong = [...wrongQuestions].sort(() => Math.random() - 0.5);
    setQuestions(shuffledWrong);
    setWrongQuestions([]); 
    setAttemptCount(prev => prev + 1); 
    setIsRetestMode(true);
    setGameState('playing');
    setCurrentIndex(0);
    setScore(0);
    setSelectedOption(null);
  };

  useEffect(() => {
    if (gameState === 'playing' && questions.length > 0 && !selectedOption) {
      const currentQ = questions[currentIndex];
      if (currentQ.type === 'eng2kor') speakText(currentQ.eng);
    }
  }, [currentIndex, gameState, questions, selectedOption]);

  // 💡 로컬스토리지 상태 업데이트 공통 함수
  const saveProgressToLocal = (status: '완료' | '미완료', finalScore: number, finalAttempt: number) => {
    const storageKey = `voca_log_${studentId}`;
    const savedData = localStorage.getItem(storageKey);
    if (savedData) {
      const parsed = JSON.parse(savedData);
      parsed.records[todayStr] = {
        date: todayStr,
        book: selectedBook,
        status: status,
        score: finalScore,
        attempt: finalAttempt
      } as DailyRecord;
      localStorage.setItem(storageKey, JSON.stringify(parsed));
    }
  };

  const handleOptionClick = (opt: string) => {
    if (selectedOption) return;

    const currentQ = questions[currentIndex];
    setSelectedOption(opt); 
    
    if (currentQ.type === 'kor2eng') speakText(opt);

    const isCorrect = opt === currentQ.answer;
    if (isCorrect) {
      setScore(s => s + 1);
    } else {
      setWrongQuestions(prev => {
        if (prev.some(q => q.id === currentQ.id)) return prev;
        return [...prev, currentQ];
      });
    }

    setTimeout(() => {
      setSelectedOption(null); 
      if (currentIndex + 1 < questions.length) {
        setCurrentIndex(i => i + 1);
      } else {
        // 💡 오답 재시험 없이 한 방에 100점 맞고 다 끝낸 경우
        if (wrongQuestions.length === 0 && isCorrect) {
          setIsTodayFinished(true);
          saveProgressToLocal('완료', score + (isCorrect ? 1 : 0), attemptCount);
          // 실시간으로 교사 LMS 알림 전송
          sendToTeacherLMS({ studentId, studentName, date: todayStr, book: selectedBook, status: '완료', score: score + 1, attempt: attemptCount });
        }
        setGameState('result');
      }
    }, 1500);
  };

  // 💡 오답 재시험을 거쳐 최종 Pass 도장을 받았을 때 처리 함수
  const handleFinalPass = () => {
    setIsTodayFinished(true);
    saveProgressToLocal('완료', questions.length, attemptCount);
    
    // 최종 통과 데이터를 교사 LMS로 축하 메시지와 함께 전송
    sendToTeacherLMS({
      studentId,
      studentName,
      date: todayStr,
      book: selectedBook,
      status: '완료',
      score: questions.length,
      attempt: attemptCount,
      note: '재시험 통과 완료'
    });

    setGameState('intro');
  };

  const getDynamicFontSize = (text: string) => {
    const len = text.length;
    if (len > 25) return '13px';
    if (len > 18) return '15px';
    if (len > 10) return '18px';
    return '22px'; 
  };

  const getQuestionFontSize = (text: string) => {
    const len = text.length;
    if (len > 25) return '24px';
    if (len > 15) return '30px';
    return '38px';
  };

  return (
    <div style={{ padding: '20px', width: '100%', maxWidth: '520px', boxSizing: 'border-box', margin: '0 auto', fontFamily: 'Pretendard, sans-serif' }}>
      
      <button onClick={onBack} style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: 'white', border: '1px solid #eaeaea', borderRadius: '12px', fontWeight: '700', cursor: 'pointer', color: '#555', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
        학습 홈으로
      </button>

      {gameState === 'intro' && (
        <div style={{ textAlign: 'center', background: 'white', padding: '40px 24px', borderRadius: '24px', boxShadow: '0 12px 32px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📝</div>
          <h2 style={{ margin: '0 0 4px', fontSize: '28px', fontWeight: '800', color: '#111' }}>단어 마스터 테스트</h2>
          <div style={{ fontSize: '14px', color: '#8e8e93', fontWeight: '600', marginBottom: '16px' }}>
            학생 이름: <span style={{ color: '#111', fontWeight: '800' }}>{studentName} ({studentId})</span>
          </div>
          
          <div style={{ textAlign: 'left', marginBottom: '16px' }}>
            <label style={{ fontSize: '13px', fontWeight: '700', color: '#8e8e93', marginLeft: '4px', marginBottom: '8px', display: 'block' }}>교재 선택</label>
            <select value={selectedBook} onChange={(e) => setSelectedBook(e.target.value)} style={{ width: '100%', padding: '16px', borderRadius: '14px', border: '1px solid #d1d1d6', fontSize: '16px', fontWeight: '600', color: '#333', backgroundColor: '#f9f9f9', outline: 'none' }}>
              <option value="">교재를 선택해주세요</option>
              {books.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>

          {/* 💡 [요청하신 부분] 교재 선택 아래에 현재 날짜 및 완료/미완료 유도 보드 디자인 */}
          <div style={{ 
            background: isTodayFinished ? '#f6fbf6' : '#fff8f8', 
            border: `1px solid ${isTodayFinished ? '#c8e6c9' : '#ffcdd2'}`,
            borderRadius: '16px', padding: '16px', marginBottom: '28px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            transition: 'all 0.3s ease'
          }}>
            <div style={{ textAlign: 'left' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#8e8e93', display: 'block', marginBottom: '2px' }}>TODAY's STATUS</span>
              <span style={{ fontSize: '15px', fontWeight: 800, color: '#111' }}>{todayFormatted}</span>
            </div>
            <div style={{
              background: isTodayFinished ? '#4caf50' : '#ef5350',
              color: 'white', fontSize: '13px', fontWeight: 800,
              padding: '6px 14px', borderRadius: '20px',
              boxShadow: isTodayFinished ? '0 2px 8px rgba(76,175,80,0.3)' : '0 2px 8px rgba(239,83,80,0.3)'
            }}>
              {isTodayFinished ? '오늘 학습 완료 ⭕' : '오늘 미완료 ❌'}
            </div>
          </div>
          
          <button onClick={startGame} style={{ width: '100%', padding: '18px', background: 'linear-gradient(135deg, #007aff, #0056b3)', color: 'white', border: 'none', borderRadius: '16px', fontSize: '18px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 6px 16px rgba(0,122,255,0.2)' }}>
            테스트 시작하기
          </button>
        </div>
      )}

      {gameState === 'playing' && questions.length > 0 && (
        <div style={{ background: 'white', padding: '32px 24px', borderRadius: '24px', width: '100%', boxSizing: 'border-box', boxShadow: '0 12px 32px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '15px', fontWeight: '800', color: '#007aff' }}>
              {isRetestMode ? `🔥 오답 재시험 (${attemptCount}회차)` : `Question ${currentIndex + 1}`}
            </span>
            <span style={{ fontSize: '15px', fontWeight: '700', color: '#8e8e93' }}>{currentIndex + 1} / {questions.length}</span>
          </div>
          <div style={{ width: '100%', height: '8px', backgroundColor: '#f0f0f5', borderRadius: '4px', marginBottom: '32px', overflow: 'hidden' }}>
            <div style={{ width: `${((currentIndex + 1) / questions.length) * 100}%`, height: '100%', backgroundColor: '#007aff', borderRadius: '4px', transition: 'width 0.3s ease' }}></div>
          </div>
          
          <div style={{ textAlign: 'center', height: '160px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', marginBottom: '32px' }}>
            <span style={{ display: 'inline-block', padding: '6px 14px', backgroundColor: '#eef6ff', color: '#007aff', borderRadius: '8px', fontSize: '14px', fontWeight: '800', marginBottom: '16px' }}>
              {questions[currentIndex].type === 'eng2kor' ? '🇺🇸 영어를 우리말로' : '🇰🇷 우리말을 영어로'}
            </span>
            <h2 style={{ fontSize: getQuestionFontSize(questions[currentIndex].type === 'eng2kor' ? questions[currentIndex].eng : questions[currentIndex].kor), fontWeight: '800', margin: '0', color: '#111', wordBreak: 'keep-all', lineHeight: '1.3' }}>
              {questions[currentIndex].type === 'eng2kor' ? questions[currentIndex].eng : questions[currentIndex].kor}
            </h2>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', width: '100%' }}>
            {questions[currentIndex].options.map((opt, i) => {
              const isSelected = selectedOption === opt;
              const isCorrectAnswer = opt === questions[currentIndex].answer;
              let bgColor = 'white'; let borderColor = '#e5e5ea'; let textColor = '#333'; let shadow = '0 2px 8px rgba(0,0,0,0.03)';

              if (selectedOption) {
                if (isCorrectAnswer) { bgColor = '#e8f5e9'; borderColor = '#4caf50'; textColor = '#2e7d32'; } 
                else if (isSelected && !isCorrectAnswer) { bgColor = '#ffebee'; borderColor = '#ef5350'; textColor = '#c62828'; }
              }

              return (
                <button key={i} onClick={() => handleOptionClick(opt)} disabled={!!selectedOption} style={{ width: '100%', height: '100px', boxSizing: 'border-box', position: 'relative', padding: '12px', fontSize: getDynamicFontSize(opt), fontWeight: '800', textAlign: 'center', borderRadius: '16px', border: `2px solid ${borderColor}`, backgroundColor: bgColor, color: textColor, cursor: selectedOption ? 'default' : 'pointer', boxShadow: shadow, transition: 'all 0.15s ease', display: 'flex', justifyContent: 'center', alignItems: 'center', wordBreak: 'keep-all', lineHeight: '1.3', overflow: 'hidden' }}>
                  {opt}
                  {selectedOption && isCorrectAnswer && <span style={{ position: 'absolute', right: '12px', top: '12px', fontSize: '16px' }}>⭕</span>}
                  {selectedOption && isSelected && !isCorrectAnswer && <span style={{ position: 'absolute', right: '12px', top: '12px', fontSize: '16px' }}>❌</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {gameState === 'result' && (
        <div style={{ textAlign: 'center', background: 'white', padding: '48px 24px', borderRadius: '24px', boxShadow: '0 12px 32px rgba(0,0,0,0.06)' }}>
          {wrongQuestions.length === 0 ? (
            <>
              <div style={{ fontSize: '56px', marginBottom: '16px' }}>🏆</div>
              <h2 style={{ fontSize: '28px', fontWeight: '800', margin: '0 0 12px', color: '#111' }}>최종 테스트 통과!</h2>
              
              <div style={{ backgroundColor: '#e8f5e9', borderRadius: '20px', padding: '24px', marginBottom: '32px' }}>
                <span style={{ fontSize: '15px', fontWeight: '800', color: '#2e7d32', display: 'block', marginBottom: '6px' }}>PASS MISSION 🐋</span>
                <span style={{ fontSize: '24px', fontWeight: '800', color: '#1b5e20' }}>{attemptCount}회차 시험 만에 통과!</span>
              </div>

              {/* 💡 처음 화면으로 갈 때 완료 도장을 쾅 찍어줍니다. */}
              <button onClick={handleFinalPass} style={{ width: '100%', padding: '18px', background: '#111', color: 'white', border: 'none', borderRadius: '16px', fontSize: '18px', fontWeight: '700', cursor: 'pointer' }}>
                처음 화면으로 이동 (완료 도장 찍기)
              </button>
            </>
          ) : (
            <>
              <div style={{ fontSize: '56px', marginBottom: '16px' }}>🔥</div>
              <h2 style={{ fontSize: '26px', fontWeight: '800', margin: '0 0 12px', color: '#111' }}>재도전이 필요해요!</h2>
              <p style={{ color: '#666', fontSize: '15px', marginBottom: '24px' }}>틀린 단어를 모아서 완벽히 마스터해봐요.</p>
              
              <div style={{ backgroundColor: '#fff5f5', borderRadius: '20px', padding: '24px', marginBottom: '32px', border: '1px solid #ffebeb' }}>
                <div style={{ marginBottom: '12px' }}>
                  <span style={{ fontSize: '14px', fontWeight: '800', color: '#8e8e93', display: 'block', marginBottom: '4px' }}>이번 회차 맞춘 문제</span>
                  <span style={{ fontSize: '36px', fontWeight: '800', color: '#ff3b30' }}>{score}</span>
                  <span style={{ fontSize: '20px', fontWeight: '800', color: '#111' }}> / {questions.length}</span>
                </div>
                <div style={{ borderTop: '1px solid #ffe5e5', paddingTop: '16px', fontSize: '15px', fontWeight: '800', color: '#e53935' }}>
                  남은 오답 개수: {wrongQuestions.length}개 (현재 {attemptCount}회차 완료)
                </div>
              </div>

              <button onClick={handleStartRetest} style={{ width: '100%', padding: '18px', background: 'linear-gradient(135deg, #ff3b30, #c62828)', color: 'white', border: 'none', borderRadius: '16px', fontSize: '18px', fontWeight: '800', cursor: 'pointer', boxShadow: '0 6px 16px rgba(255,59,48,0.2)' }}>
                ❌ 틀린 단어 재시험 보기 ({attemptCount + 1}회차 도전)
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}