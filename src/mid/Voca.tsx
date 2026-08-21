import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase'; 

interface VocaProps { 
  onBack: () => void; 
  currentBook?: string;
  studentId: string;
  studentName: string;
  // 💡 [핵심 추가] 어떤 테이블(중등/고등)을 쓸지 결정하는 옵션 추가!
  tableName?: 'words_mid' | 'words_high'; 
}
interface WordItem { book: string; eng: string; kor: string; }
interface Question { id: number; type: 'eng2kor' | 'kor2eng'; eng: string; kor: string; options: string[]; answer: string; }

interface DailyRecord {
  date: string;
  book: string;
  status: '완료' | '미완료';
  score: number;
  attempt: number;
}

// tableName이 안 넘어오면 기본값으로 'words_mid'(중등부)를 쓰도록 설정
export default function Voca({ onBack, currentBook, studentId, studentName, tableName = 'words_mid' }: VocaProps) {
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
  
  const [totalQCount, setTotalQCount] = useState(0); 

  // 💡 관제탑에 기록될 이름 자동 변경 (중등부면 '중등단어', 고등부면 '고등단어')
  const taskTypeName = tableName === 'words_high' ? '고등단어' : '중등단어';

  const { realTodayStr, currentMonthStr } = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return {
      realTodayStr: `${year}-${month}-${day}`,
      currentMonthStr: `${year}-${month}`
    };
  }, []);

  const [selectedDate, setSelectedDate] = useState(realTodayStr);
  const [isDateFinished, setIsDateFinished] = useState(false);

  const selectedDateFormatted = useMemo(() => {
    const d = new Date(selectedDate);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const week = ['일', '월', '화', '수', '목', '금', '토'][d.getDay()];
    return `${year}. ${month}. ${day} (${week})`;
  }, [selectedDate]);

  const sendToSupabaseLog = async (logData: { studentId: string; studentName: string; date: string; book: string; status: string; score?: number; attempt?: number; note?: string }) => {
    try {
      const { error } = await supabase
        .from('learning_logs')
        .insert([{
          student_id: logData.studentId,
          student_name: logData.studentName,
          task_type: taskTypeName, // 💡 동적으로 바뀐 이름 적용
          book_info: logData.book,
          score: logData.score || 0,
          status: logData.status,
          attempt: logData.attempt || 1,
          log_date: logData.date
        }]);

      if (error) {
        console.error("수파베이스 저장 에러:", error);
      } else {
        console.log(`✅ [수파베이스 전송 완료] 학생: ${logData.studentName}, 점수: ${logData.score}`);
      }
    } catch (err) {
      console.error("수파베이스 전송 실패:", err);
    }
  };

  useEffect(() => {
    if (!studentId) return;

    const storageKey = `voca_log_${tableName}_${studentId}`; // 💡 캐시도 중/고등 분리
    const savedData = localStorage.getItem(storageKey);
    
    if (savedData) {
      const parsed = JSON.parse(savedData); 
      
      if (parsed.month !== currentMonthStr) {
        const lastMonthRecords = parsed.records || {};
        const [lastYear, lastMonth] = parsed.month.split('-').map(Number);
        const daysInLastMonth = new Date(lastYear, lastMonth, 0).getDate();

        for (let d = 1; d <= daysInLastMonth; d++) {
          const dayStr = `${lastYear}-${String(lastMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          const record: DailyRecord = lastMonthRecords[dayStr];
          
          if (!record || record.status === '미완료') {
            sendToSupabaseLog({
              studentId,
              studentName,
              date: dayStr,
              book: record?.book || '선택 안 함',
              status: '미완료',
              note: '월말 자동 정산 - 미완료 결손 건'
            });
          }
        }
        const newMonthData = { month: currentMonthStr, records: {} };
        localStorage.setItem(storageKey, JSON.stringify(newMonthData));
      }
    } else {
      const initialData = { month: currentMonthStr, records: {} };
      localStorage.setItem(storageKey, JSON.stringify(initialData));
    }
  }, [studentId, currentMonthStr, studentName, tableName]);

  useEffect(() => {
    if (!studentId || !selectedDate) return;
    
    const storageKey = `voca_log_${tableName}_${studentId}`;
    const savedData = localStorage.getItem(storageKey);
    
    if (savedData) {
      const parsed = JSON.parse(savedData);
      const targetRecord = parsed.records[selectedDate];
      if (targetRecord && targetRecord.status === '완료') {
        setIsDateFinished(true);
      } else {
        setIsDateFinished(false);
      }
    }
  }, [studentId, selectedDate, tableName]);

  // 💡 [핵심] 넘어온 tableName 옵션에 따라 중등/고등 테이블을 다르게 불러옵니다!
  useEffect(() => {
    const fetchWords = async () => {
      try {
        const { data, error } = await supabase
          .from(tableName) // 👈 여기서 변수 사용
          .select('book, eng, kor');

        if (error) throw error;
        
        const validWords = (data || []).filter(w => w.book && w.eng && w.kor);
        if (validWords.length === 0) {
          console.warn(`데이터가 없습니다. 수파베이스 ${tableName} 테이블에 단어를 추가해주세요.`);
        }
        setAllWords(validWords);
      } catch (e) { 
        alert(`수파베이스 ${tableName} 데이터 로드 실패. 관리자에게 문의하세요.`); 
        console.error(e);
      }
    };
    fetchWords();
  }, [tableName]);

  const books = useMemo(() => {
    const uniqueBooks = Array.from(new Set(allWords.map(w => w.book)));
    uniqueBooks.sort(); 
    return uniqueBooks;
  }, [allWords]);

  const speakText = (text: string) => {
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

  const startGame = () => {
    if (!selectedBook) return alert("교재를 선택해주세요.");
    if (!selectedDate) return alert("학습 날짜를 선택해주세요.");

    const filtered = allWords.filter(w => w.book === selectedBook);
    if (filtered.length === 0) return alert("선택하신 교재의 단어 데이터가 수파베이스에 없습니다.");
    
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
    setTotalQCount(generatedQuestions.length); 
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

  const saveProgressToLocal = (status: '완료' | '미완료', finalScore: number, finalAttempt: number) => {
    const storageKey = `voca_log_${tableName}_${studentId}`;
    const savedData = localStorage.getItem(storageKey);
    if (savedData) {
      const parsed = JSON.parse(savedData);
      if (!parsed.records) parsed.records = {}; 

      parsed.records[selectedDate] = {
        date: selectedDate,
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
        if (wrongQuestions.length === 0 && isCorrect) {
          setIsDateFinished(true); 
        }
        setGameState('result');
      }
    }, 1500);
  };

  const handleFinalPass = () => {
    setIsDateFinished(true); 
    saveProgressToLocal('완료', totalQCount, attemptCount);
    
    sendToSupabaseLog({
      studentId,
      studentName,
      date: selectedDate,
      book: selectedBook,
      status: '완료',
      score: totalQCount, 
      attempt: attemptCount,
      note: '테스트 완료'
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
          {/* 💡 테이블에 따라 제목도 바뀜! */}
          <h2 style={{ margin: '0 0 4px', fontSize: '28px', fontWeight: '800', color: '#111' }}>
            {tableName === 'words_high' ? '고등 단어 마스터' : '단어 마스터 테스트'}
          </h2>
          <div style={{ fontSize: '14px', color: '#8e8e93', fontWeight: '600', marginBottom: '16px' }}>
            학생 이름: <span style={{ color: '#111', fontWeight: '800' }}>{studentName} ({studentId})</span>
          </div>

          <div style={{ textAlign: 'left', marginBottom: '12px' }}>
            <label style={{ fontSize: '13px', fontWeight: '700', color: '#8e8e93', marginLeft: '4px', marginBottom: '8px', display: 'block' }}>학습 날짜 선택</label>
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{ width: '100%', padding: '16px', borderRadius: '14px', border: '1px solid #d1d1d6', fontSize: '16px', fontWeight: '600', color: '#333', backgroundColor: '#f9f9f9', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          
          <div style={{ textAlign: 'left', marginBottom: '16px' }}>
            <label style={{ fontSize: '13px', fontWeight: '700', color: '#8e8e93', marginLeft: '4px', marginBottom: '8px', display: 'block' }}>교재 선택</label>
            <select value={selectedBook} onChange={(e) => setSelectedBook(e.target.value)} style={{ width: '100%', padding: '16px', borderRadius: '14px', border: '1px solid #d1d1d6', fontSize: '16px', fontWeight: '600', color: '#333', backgroundColor: '#f9f9f9', outline: 'none', boxSizing: 'border-box' }}>
              <option value="">교재를 선택해주세요</option>
              {books.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>

          <div style={{ 
            background: isDateFinished ? '#f6fbf6' : '#fff8f8', 
            border: `1px solid ${isDateFinished ? '#c8e6c9' : '#ffcdd2'}`,
            borderRadius: '16px', padding: '16px', marginBottom: '28px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            transition: 'all 0.3s ease'
          }}>
            <div style={{ textAlign: 'left' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#8e8e93', display: 'block', marginBottom: '2px' }}>학습일 상태</span>
              <span style={{ fontSize: '15px', fontWeight: 800, color: '#111' }}>{selectedDateFormatted}</span>
            </div>
            <div style={{
              background: isDateFinished ? '#4caf50' : '#ef5350',
              color: 'white', fontSize: '13px', fontWeight: 800,
              padding: '6px 14px', borderRadius: '20px',
              boxShadow: isDateFinished ? '0 2px 8px rgba(76,175,80,0.3)' : '0 2px 8px rgba(239,83,80,0.3)'
            }}>
              {isDateFinished ? '해당일 완료 ⭕' : '해당일 미완료 ❌'}
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