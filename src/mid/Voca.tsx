import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase'; 

interface VocaProps { 
  onBack: () => void; 
  currentBook?: string;
  studentId: string;
  studentName: string;
  tableName?: 'words_mid' | 'words_high'; 
}
interface WordItem { book: string; eng: string; kor: string; day: string; }
interface Question { id: number; eng: string; kor: string; answer: string; }

export default function Voca({ onBack, currentBook, studentId, studentName, tableName = 'words_mid' }: VocaProps) {
  const [allWords, setAllWords] = useState<WordItem[]>([]);
  const [testWords, setTestWords] = useState<WordItem[]>([]); 
  
  // 💡 [패치] 객관식 상태(playing_mc)를 완전히 삭제하고 타이핑 전용으로 바꿨습니다!
  const [gameState, setGameState] = useState<'intro' | 'playing_typing' | 'result'>('intro');
  
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedBook, setSelectedBook] = useState(currentBook || '');

  const [typingInput, setTypingInput] = useState('');
  const [showTypingFeedback, setShowTypingFeedback] = useState<'O' | 'X' | null>(null);

  const [startNo, setStartNo] = useState<number | ''>('');
  const [endNo, setEndNo] = useState<number | ''>('');
  const [studyMode, setStudyMode] = useState<'random' | 'range'>('random');

  const [wrongQuestions, setWrongQuestions] = useState<Question[]>([]);
  const [attemptCount, setAttemptCount] = useState(1);
  const [isRetestMode, setIsRetestMode] = useState(false);
  
  const [totalQCount, setTotalQCount] = useState(0); 
  const typingInputRef = useRef<HTMLInputElement>(null);

  const taskTypeName = tableName === 'words_high' ? '고등단어' : '중등단어';

  const { realTodayStr } = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return { realTodayStr: `${year}-${month}-${day}` };
  }, []);

  const [selectedDate, setSelectedDate] = useState(realTodayStr);
  const [pendingDates, setPendingDates] = useState<string[]>([]);
  const [isDateFinished, setIsDateFinished] = useState(false);

  const refreshPendingDates = useCallback(() => {
    const pending: string[] = [];
    const now = new Date();
    const storageKey = `voca_log_${tableName}_${studentId}`;
    const savedData = JSON.parse(localStorage.getItem(storageKey) || '{"records":{}}');
    const records = savedData.records || {};

    for (let i = 0; i < 30; i++) { 
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      if (d < new Date(now.getFullYear(), 8, 1)) continue; 

      const dayOfWeek = d.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) continue; 

      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      
      if (!records[dateStr] || records[dateStr].status !== '완료') {
        pending.push(dateStr);
      }
    }
    
    pending.reverse(); 
    setPendingDates(pending);
    return pending;
  }, [tableName, studentId]);

  useEffect(() => {
    const pDates = refreshPendingDates();
    if (pDates.length > 0) {
      setSelectedDate(pDates[0]);
    } else {
      setSelectedDate(realTodayStr);
    }
  }, [refreshPendingDates, realTodayStr]);

  useEffect(() => {
    const fetchWords = async () => {
      try {
        let allData: any[] = [];
        let from = 0;
        const step = 1000;
        
        while (true) {
          const { data, error } = await supabase.from(tableName).select('book, eng, kor, day').range(from, from + step - 1);
          if (error) throw error;
          if (!data || data.length === 0) break;
          allData = [...allData, ...data];
          if (data.length < step) break; 
          from += step;
        }

        const validWords = allData.filter(w => w.book && w.eng && w.kor && (tableName === 'words_mid' || w.day));
        setAllWords(validWords);
      } catch (e) { 
        alert(`데이터 로드 실패. 관리자에게 문의하세요.`); 
        console.error(e);
      }
    };
    fetchWords();
  }, [tableName]);

  const books = useMemo(() => Array.from(new Set(allWords.map(w => w.book))).sort(), [allWords]);

  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text.replace(/[^a-zA-Z\s-]/g, ''));
      utterance.lang = 'en-US'; 
      utterance.rate = 0.85; 
      const voices = window.speechSynthesis.getVoices().filter(v => v.lang.startsWith('en'));
      utterance.voice = voices.find(v => v.name.includes('Google US English') || v.name.includes('Samantha')) || voices[0] || null;
      window.speechSynthesis.speak(utterance);
    }
  };

  const startGame = () => {
    if (!selectedBook) return alert("교재를 선택해주세요.");
    if (!selectedDate) return alert("학습 날짜를 선택해주세요.");
    
    if (studyMode === 'range') {
      if (startNo === '' || endNo === '') return alert("학습할 시작/끝 번호(Day)를 입력해주세요.");
      if (startNo > endNo) return alert("끝 번호가 시작 번호보다 작습니다.");
    }

    let availableWords = allWords.filter(w => w.book === selectedBook);

    if (studyMode === 'range') {
      availableWords = availableWords.filter(w => {
        const match = w.day?.match(/\d+/);
        if (!match) return false;
        const wordNo = parseInt(match[0], 10);
        return wordNo >= (startNo as number) && wordNo <= (endNo as number);
      });
      if (availableWords.length === 0) return alert(`해당 범위에 단어가 없습니다.`);
    } else {
      const historyKey = `voca_history_${studentId}`;
      const history = JSON.parse(localStorage.getItem(historyKey) || '{}');
      const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;
      const now = Date.now();

      const wordsNotRecent = availableWords.filter(w => {
        const lastTested = history[w.eng];
        if (!lastTested) return true;
        return (now - lastTested) > TWO_DAYS_MS; 
      });

      if (wordsNotRecent.length >= 20) {
        availableWords = wordsNotRecent;
      }
    }

    setTestWords(availableWords); 
    
    // 💡 [패치] 스펠링 타이핑은 시간이 오래 걸리므로 전체 랜덤 시 최대 30개로 락업!
    let maxLimit = availableWords.length;
    if (studyMode === 'random') {
      maxLimit = 30;
    }

    const shuffledWords = [...availableWords].sort(() => Math.random() - 0.5).slice(0, maxLimit);
    
    // 💡 [패치] 모든 문제를 무조건 '뜻(kor)'을 보여주고 '스펠링(eng)'을 적게 만듭니다.
    const generatedQuestions = shuffledWords.map((w, i) => ({
      id: i,
      eng: w.eng,
      kor: w.kor,
      answer: w.eng
    }));

    setQuestions(generatedQuestions.sort(() => Math.random() - 0.5));
    setTotalQCount(generatedQuestions.length); 
    setWrongQuestions([]);
    setAttemptCount(1);
    setIsRetestMode(false);
    
    setGameState('playing_typing');
    setCurrentIndex(0);
    setScore(0);
  };

  const handleStartRetest = () => {
    const shuffledWrong = [...wrongQuestions].sort(() => Math.random() - 0.5);
    setQuestions(shuffledWrong);
    setWrongQuestions([]); 
    setAttemptCount(prev => prev + 1); 
    setIsRetestMode(true);
    setGameState('playing_typing');
    setCurrentIndex(0);
    setScore(0);
    setTypingInput('');
    setShowTypingFeedback(null);
  };

  useEffect(() => {
    if (gameState === 'playing_typing' && !showTypingFeedback) {
      setTimeout(() => {
        if (typingInputRef.current) typingInputRef.current.focus();
      }, 50); 
    }
  }, [currentIndex, gameState, showTypingFeedback]);

  // 💡 [패치] 문제가 나타나면 무조건 영어(스펠링) 발음을 읽어줍니다.
  useEffect(() => {
    if (gameState === 'playing_typing' && questions.length > 0 && !showTypingFeedback) {
      speakText(questions[currentIndex].eng);
    }
  }, [currentIndex, gameState, questions, showTypingFeedback]);

  // 💡 [패치] 스펠링이 100% 일치하는지 특수문자를 제거하고 칼같이 검사합니다.
  const isCorrectSpelling = (input: string, correctStr: string) => {
    const inputClean = input.replace(/[^a-z0-9]/gi, '').toLowerCase(); 
    const correctClean = correctStr.replace(/[^a-z0-9]/gi, '').toLowerCase();
    return inputClean === correctClean; 
  };

  const handleTypingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (showTypingFeedback || !typingInput.trim()) return;

    const currentQ = questions[currentIndex];
    const isCorrect = isCorrectSpelling(typingInput, currentQ.answer);

    setShowTypingFeedback(isCorrect ? 'O' : 'X');
    if (isCorrect) setScore(s => s + 1);
    else setWrongQuestions(prev => [...prev, currentQ]);

    setTimeout(() => {
      setShowTypingFeedback(null);
      setTypingInput('');
      if (currentIndex + 1 < questions.length) {
        setCurrentIndex(i => i + 1);
      } else {
        const currentWrongList = isCorrect ? wrongQuestions : [...wrongQuestions, currentQ];
        if (currentWrongList.length === 0) { setIsDateFinished(true); setGameState('result'); } 
        else { setGameState('result'); }
      }
    }, 1200);
  };

  const updateCooldownHistory = () => {
    const historyKey = `voca_history_${studentId}`;
    
    const history = JSON.parse(localStorage.getItem(historyKey) || '{}');
    const now = Date.now();
    testWords.forEach(w => { history[w.eng] = now; }); 
    localStorage.setItem(historyKey, JSON.stringify(history));
  };

  const handleFinalPass = () => {
    setIsDateFinished(true); 
    updateCooldownHistory(); 
    
    const storageKey = `voca_log_${tableName}_${studentId}`;
    const savedData = JSON.parse(localStorage.getItem(storageKey) || '{"records":{}}');
    const rangeText = studyMode === 'range' ? `${startNo}~${endNo}번` : '전체 랜덤';
    
    savedData.records[selectedDate] = { date: selectedDate, book: selectedBook, range: rangeText, status: '완료', score: totalQCount, attempt: attemptCount };
    localStorage.setItem(storageKey, JSON.stringify(savedData));
    
    supabase.from('learning_logs').insert([{ student_id: studentId, student_name: studentName, task_type: taskTypeName, book_info: `${selectedBook} [타이핑]`, score: totalQCount, status: '완료', attempt: attemptCount, log_date: selectedDate }]).then();
    
    const newPending = refreshPendingDates();
    if (newPending.length > 0) {
      setSelectedDate(newPending[0]);
    } else {
      setSelectedDate(realTodayStr);
    }
    
    setGameState('intro');
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
          <h2 style={{ margin: '0 0 4px', fontSize: '28px', fontWeight: '800', color: '#111' }}>
            {tableName === 'words_high' ? '고등 단어 마스터' : '단어 마스터 테스트'}
          </h2>
          <div style={{ fontSize: '14px', color: '#8e8e93', fontWeight: '600', marginBottom: '16px' }}>
            학생 이름: <span style={{ color: '#111', fontWeight: '800' }}>{studentName} ({studentId})</span>
          </div>

          <div style={{ textAlign: 'left', marginBottom: '16px' }}>
            <label style={{ fontSize: '13px', fontWeight: '700', color: '#8e8e93', marginLeft: '4px', marginBottom: '8px', display: 'block' }}>📅 학습할 날짜 선택</label>
            <select 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{ width: '100%', padding: '16px', borderRadius: '14px', border: `1px solid ${pendingDates.length > 0 ? '#ff9500' : '#4caf50'}`, fontSize: '15px', fontWeight: '700', color: pendingDates.length > 0 ? '#cc7a00' : '#2e7d32', backgroundColor: pendingDates.length > 0 ? '#fffdf0' : '#e8f5e9', outline: 'none', boxSizing: 'border-box' }}
            >
              {pendingDates.length > 0 ? (
                pendingDates.map(date => (
                  <option key={date} value={date}>
                    {date === realTodayStr ? `${date} (오늘 할당량)` : `${date} (밀린 학습)`}
                  </option>
                ))
              ) : (
                <option value={realTodayStr}>{realTodayStr} (모든 밀린 학습 완료! 🎉)</option>
              )}
            </select>
          </div>

          <div style={{ textAlign: 'left', marginBottom: '16px' }}>
            <label style={{ fontSize: '13px', fontWeight: '700', color: '#8e8e93', marginLeft: '4px', marginBottom: '8px', display: 'block' }}>📚 교재 선택</label>
            <select value={selectedBook} onChange={(e) => setSelectedBook(e.target.value)} style={{ width: '100%', padding: '16px', borderRadius: '14px', border: '1px solid #d1d1d6', fontSize: '16px', fontWeight: '600', color: '#333', backgroundColor: '#f9f9f9', outline: 'none', boxSizing: 'border-box' }}>
              <option value="">교재를 선택해주세요</option>
              {books.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>

          <div style={{ textAlign: 'left', marginBottom: '16px' }}>
            <label style={{ fontSize: '13px', fontWeight: '700', color: '#8e8e93', marginLeft: '4px', marginBottom: '8px', display: 'block' }}>🎯 학습 방식 선택</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setStudyMode('random')} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: studyMode === 'random' ? '2px solid #007aff' : '1px solid #d1d1d6', backgroundColor: studyMode === 'random' ? '#eef6ff' : '#f9f9f9', color: studyMode === 'random' ? '#007aff' : '#8e8e93', fontWeight: '800', cursor: 'pointer', transition: 'all 0.2s' }}>
                🎲 전체 랜덤 학습
              </button>
              <button onClick={() => setStudyMode('range')} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: studyMode === 'range' ? '2px solid #ff9500' : '1px solid #d1d1d6', backgroundColor: studyMode === 'range' ? '#fff5e6' : '#f9f9f9', color: studyMode === 'range' ? '#ff9500' : '#8e8e93', fontWeight: '800', cursor: 'pointer', transition: 'all 0.2s' }}>
                📏 범위 지정 학습
              </button>
            </div>
          </div>

          {studyMode === 'range' && (
            <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', animation: 'fadeIn 0.3s' }}>
              <div style={{ flex: 1, textAlign: 'left' }}>
                <label style={{ fontSize: '13px', fontWeight: '700', color: '#8e8e93', marginLeft: '4px', marginBottom: '8px', display: 'block' }}>시작 번호 (Day)</label>
                <input type="number" placeholder="예: 1" value={startNo} onChange={e => setStartNo(e.target.value === '' ? '' : Number(e.target.value))} style={{ width: '100%', padding: '16px', borderRadius: '14px', border: '1px solid #d1d1d6', fontSize: '16px', fontWeight: '600', color: '#333', backgroundColor: '#f9f9f9', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div style={{ flex: 1, textAlign: 'left' }}>
                <label style={{ fontSize: '13px', fontWeight: '700', color: '#8e8e93', marginLeft: '4px', marginBottom: '8px', display: 'block' }}>끝 번호 (Day)</label>
                <input type="number" placeholder="예: 5" value={endNo} onChange={e => setEndNo(e.target.value === '' ? '' : Number(e.target.value))} style={{ width: '100%', padding: '16px', borderRadius: '14px', border: '1px solid #d1d1d6', fontSize: '16px', fontWeight: '600', color: '#333', backgroundColor: '#f9f9f9', outline: 'none', boxSizing: 'border-box' }} />
              </div>
            </div>
          )}

          {/* 💡 [패치] 모든 꼼수(객관식) 버튼을 없애고 100% 타이핑 버튼 하나만 남겼습니다! */}
          <button onClick={startGame} style={{ width: '100%', padding: '18px', background: 'linear-gradient(135deg, #007aff, #0056b3)', color: 'white', border: 'none', borderRadius: '16px', fontSize: '18px', fontWeight: '800', cursor: 'pointer', boxShadow: '0 6px 16px rgba(0,122,255,0.2)' }}>
            🔥 스펠링 타이핑 집중 테스트 시작
          </button>
        </div>
      )}

      {gameState === 'playing_typing' && questions.length > 0 && (
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
          
          <div style={{ textAlign: 'center', height: '160px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', marginBottom: '32px', position: 'relative' }}>
            <span style={{ display: 'inline-block', padding: '6px 14px', backgroundColor: '#eef6ff', color: '#007aff', borderRadius: '8px', fontSize: '14px', fontWeight: '800', marginBottom: '16px' }}>
              ⌨️ 뜻과 소리를 듣고 영어 스펠링을 적어주세요
            </span>
            <h2 style={{ fontSize: '36px', fontWeight: '900', margin: '0 0 16px 0', color: '#111', wordBreak: 'keep-all', lineHeight: '1.3' }}>
              {questions[currentIndex].kor}
            </h2>
            {/* 💡 [패치] 아이들이 원할 때 언제든 다시 발음을 들을 수 있는 버튼 추가! */}
            <button 
              onClick={() => speakText(questions[currentIndex].eng)}
              style={{ backgroundColor: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '20px', padding: '8px 20px', fontSize: '16px', fontWeight: 'bold', color: '#4b5563', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              🔊 발음 다시 듣기
            </button>
          </div>
          
          <form onSubmit={handleTypingSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
            <input 
              ref={typingInputRef}
              type="text" 
              value={typingInput} 
              onChange={e => setTypingInput(e.target.value)} 
              placeholder="영어 스펠링을 입력하세요"
              disabled={!!showTypingFeedback}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              style={{ width: '100%', padding: '20px', borderRadius: '16px', border: `2px solid ${showTypingFeedback === 'O' ? '#4caf50' : showTypingFeedback === 'X' ? '#ef5350' : '#d1d5db'}`, fontSize: '24px', fontWeight: '800', textAlign: 'center', boxSizing: 'border-box', outline: 'none', backgroundColor: showTypingFeedback === 'O' ? '#e8f5e9' : showTypingFeedback === 'X' ? '#ffebee' : '#f9f9f9', color: showTypingFeedback === 'X' ? '#c62828' : '#111' }}
            />
            <button type="submit" disabled={!!showTypingFeedback} style={{ width: '100%', padding: '18px', background: showTypingFeedback ? '#ccc' : '#111', color: 'white', border: 'none', borderRadius: '16px', fontSize: '18px', fontWeight: '800', cursor: showTypingFeedback ? 'default' : 'pointer' }}>
              정답 제출
            </button>
            
            {showTypingFeedback === 'X' && (
              <div style={{ marginTop: '12px', padding: '16px', backgroundColor: '#ffebee', borderRadius: '12px', textAlign: 'center' }}>
                <span style={{ color: '#c62828', fontWeight: '800', fontSize: '18px' }}>❌ 정답 스펠링: {questions[currentIndex].answer}</span>
              </div>
            )}
          </form>
        </div>
      )}

      {gameState === 'result' && (
        <div style={{ textAlign: 'center', background: 'white', padding: '48px 24px', borderRadius: '24px', boxShadow: '0 12px 32px rgba(0,0,0,0.06)' }}>
          {wrongQuestions.length === 0 ? (
            <>
              <div style={{ fontSize: '56px', marginBottom: '16px' }}>🏆</div>
              <h2 style={{ fontSize: '28px', fontWeight: '800', margin: '0 0 12px', color: '#111' }}>완벽하게 통과했습니다!</h2>
              <div style={{ backgroundColor: '#e8f5e9', borderRadius: '20px', padding: '24px', marginBottom: '32px' }}>
                <span style={{ fontSize: '15px', fontWeight: '800', color: '#2e7d32', display: 'block', marginBottom: '6px' }}>PASS MISSION 🐋</span>
                <span style={{ fontSize: '24px', fontWeight: '800', color: '#1b5e20' }}>스펠링 100% 마스터!</span>
              </div>
              <button onClick={handleFinalPass} style={{ width: '100%', padding: '18px', background: '#111', color: 'white', border: 'none', borderRadius: '16px', fontSize: '18px', fontWeight: '700', cursor: 'pointer' }}>
                처음 화면으로 이동 (기록 저장)
              </button>
            </>
          ) : (
            <>
              <div style={{ fontSize: '56px', marginBottom: '16px' }}>🔥</div>
              <h2 style={{ fontSize: '26px', fontWeight: '800', margin: '0 0 12px', color: '#111' }}>오답 재도전이 필요해요!</h2>
              <p style={{ color: '#666', fontSize: '15px', marginBottom: '24px' }}>틀린 스펠링을 완벽하게 마스터해봐요.</p>
              
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
                ❌ 오답 재도전 하기 ({attemptCount + 1}회차)
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}