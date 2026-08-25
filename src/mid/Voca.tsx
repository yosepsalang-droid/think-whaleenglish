import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase'; 

interface VocaProps { 
  onBack: () => void; 
  currentBook?: string;
  studentId: string;
  studentName: string;
  tableName?: 'words_mid' | 'words_high'; 
}
interface WordItem { book: string; eng: string; kor: string; day: string; }
interface Question { id: number; type: 'eng2kor' | 'kor2eng'; eng: string; kor: string; options: string[]; answer: string; }

interface DailyRecord {
  date: string;
  book: string;
  range: string; 
  status: '완료' | '미완료';
  score: number;
  attempt: number;
}

export default function Voca({ onBack, currentBook, studentId, studentName, tableName = 'words_mid' }: VocaProps) {
  const [allWords, setAllWords] = useState<WordItem[]>([]);
  const [testWords, setTestWords] = useState<WordItem[]>([]); 
  
  const [gameState, setGameState] = useState<'intro' | 'playing_mc' | 'playing_typing' | 'result'>('intro');
  const [currentPhase, setCurrentPhase] = useState<0 | 1 | 2>(0); 
  
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedBook, setSelectedBook] = useState(currentBook || '');
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  const [typingInput, setTypingInput] = useState('');
  const [showTypingFeedback, setShowTypingFeedback] = useState<'O' | 'X' | null>(null);

  const [startNo, setStartNo] = useState<number | ''>('');
  const [endNo, setEndNo] = useState<number | ''>('');
  
  const [currentTestMode, setCurrentTestMode] = useState('');

  const [wrongQuestions, setWrongQuestions] = useState<Question[]>([]);
  const [attemptCount, setAttemptCount] = useState(1);
  const [isRetestMode, setIsRetestMode] = useState(false);
  
  const [totalQCount, setTotalQCount] = useState(0); 

  const taskTypeName = tableName === 'words_high' ? '고등단어' : '중등단어';

  const { realTodayStr, currentMonthStr } = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return { realTodayStr: `${year}-${month}-${day}`, currentMonthStr: `${year}-${month}` };
  }, []);

  const [selectedDate, setSelectedDate] = useState(realTodayStr);
  const [isDateFinished, setIsDateFinished] = useState(false);

  const selectedDateFormatted = useMemo(() => {
    const d = new Date(selectedDate);
    return `${d.getFullYear()}. ${String(d.getMonth() + 1).padStart(2, '0')}. ${String(d.getDate()).padStart(2, '0')}`;
  }, [selectedDate]);

  // 💡 DB 로드 (limit(10000) 추가! 이제 워드타파 3권도 안 짤립니다!)
  useEffect(() => {
    const fetchWords = async () => {
      try {
        const { data, error } = await supabase.from(tableName).select('book, eng, kor, day').limit(10000);
        if (error) throw error;
        const validWords = (data || []).filter(w => w.book && w.eng && w.kor && (tableName === 'words_mid' || w.day));
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

  const startGame = (mode: 'eng2kor' | 'kor2eng' | 'half' | 'high_phase1', maxLimit?: number) => {
    if (!selectedBook) return alert("교재를 선택해주세요.");
    if (!selectedDate) return alert("학습 날짜를 선택해주세요.");
    
    let availableWords = allWords.filter(w => w.book === selectedBook);

    if (tableName === 'words_high') {
      if (startNo === '' || endNo === '') return alert("학습할 번호를 입력해주세요.");
      if (startNo > endNo) return alert("끝 번호가 시작 번호보다 작습니다.");
      
      availableWords = availableWords.filter(w => {
        const match = w.day?.match(/\d+/);
        if (!match) return false;
        const wordNo = parseInt(match[0], 10);
        return wordNo >= startNo && wordNo <= endNo;
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
    const shuffledWords = [...availableWords].sort(() => Math.random() - 0.5).slice(0, maxLimit || availableWords.length);
    
    if (tableName === 'words_high') setCurrentTestMode('고등 2단계 집중 훈련');
    else if (mode === 'eng2kor') setCurrentTestMode('뜻 시험 (150)');
    else if (mode === 'kor2eng') setCurrentTestMode('스펠링 시험 (30)');
    else setCurrentTestMode('반반 시험 (100)');

    const halfLength = Math.ceil(shuffledWords.length / 2);
    
    let generatedQuestions = shuffledWords.map((w, i) => {
      let isEng2Kor = true;
      if (mode === 'eng2kor' || mode === 'high_phase1') isEng2Kor = true;
      else if (mode === 'kor2eng') isEng2Kor = false;
      else if (mode === 'half') isEng2Kor = i < halfLength; 

      const correct = isEng2Kor ? w.kor : w.eng;
      const options = [correct];
      
      while (options.length < 4) {
        const rand = allWords[Math.floor(Math.random() * allWords.length)];
        const item = isEng2Kor ? rand.kor : rand.eng;
        if (!options.includes(item) && item !== undefined) options.push(item);
      }
      
      return { id: i, type: isEng2Kor ? 'eng2kor' : 'kor2eng', eng: w.eng, kor: w.kor, options: options.sort(() => Math.random() - 0.5), answer: correct } as Question;
    });

    setQuestions(generatedQuestions.sort(() => Math.random() - 0.5));
    setTotalQCount(generatedQuestions.length); 
    setWrongQuestions([]);
    setAttemptCount(1);
    setIsRetestMode(false);
    setCurrentPhase(tableName === 'words_high' ? 1 : 0);
    setGameState('playing_mc');
    setCurrentIndex(0);
    setScore(0);
    setSelectedOption(null);
  };

  // 💡 Vercel 에러 해결! (as Question 을 붙여서 타입스크립트가 안심하게 만들었습니다)
  const preparePhase2 = () => {
    const typingQs = testWords.map((w, i) => ({
      id: i, 
      type: 'eng2kor', 
      eng: w.eng, 
      kor: w.kor, 
      options: [] as string[], 
      answer: w.kor
    } as Question)).sort(() => Math.random() - 0.5);

    setQuestions(typingQs);
    setWrongQuestions([]);
    setAttemptCount(1);
    setCurrentIndex(0);
    setCurrentPhase(2);
    setIsRetestMode(false);
    setGameState('playing_typing');
  };

  const handleStartRetest = () => {
    const shuffledWrong = [...wrongQuestions].sort(() => Math.random() - 0.5);
    setQuestions(shuffledWrong);
    setWrongQuestions([]); 
    setAttemptCount(prev => prev + 1); 
    setIsRetestMode(true);
    setGameState(currentPhase === 2 ? 'playing_typing' : 'playing_mc');
    setCurrentIndex(0);
    setScore(0);
    setSelectedOption(null);
    setTypingInput('');
    setShowTypingFeedback(null);
  };

  useEffect(() => {
    if (gameState.includes('playing') && questions.length > 0 && !selectedOption && !showTypingFeedback) {
      if (questions[currentIndex].type === 'eng2kor') speakText(questions[currentIndex].eng);
    }
  }, [currentIndex, gameState, questions, selectedOption, showTypingFeedback]);

  const handleOptionClick = (opt: string) => {
    if (selectedOption) return;
    const currentQ = questions[currentIndex];
    setSelectedOption(opt); 
    if (currentQ.type === 'kor2eng') speakText(opt);

    const isCorrect = opt === currentQ.answer;
    if (isCorrect) setScore(s => s + 1);
    else setWrongQuestions(prev => [...prev, currentQ]);

    setTimeout(() => {
      setSelectedOption(null); 
      if (currentIndex + 1 < questions.length) {
        setCurrentIndex(i => i + 1);
      } else {
        const currentWrongList = isCorrect ? wrongQuestions : [...wrongQuestions, currentQ];
        if (currentWrongList.length === 0) {
          if (currentPhase === 1) preparePhase2(); 
          else { setIsDateFinished(true); setGameState('result'); }
        } else {
          setGameState('result');
        }
      }
    }, 1200);
  };

  const isCorrectMeaning = (input: string, correctStr: string) => {
    const inputClean = input.replace(/\s+/g, '').toLowerCase(); 
    const answers = correctStr.split(/[;,]/).map(s => s.replace(/\s+/g, '').toLowerCase());
    return answers.includes(inputClean); 
  };

  const handleTypingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (showTypingFeedback || !typingInput.trim()) return;

    const currentQ = questions[currentIndex];
    const isCorrect = isCorrectMeaning(typingInput, currentQ.answer);

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
    const rangeText = tableName === 'words_high' ? `${startNo}~${endNo}번` : '전체';
    
    savedData.records[selectedDate] = { date: selectedDate, book: selectedBook, range: rangeText, status: '완료', score: totalQCount, attempt: attemptCount };
    localStorage.setItem(storageKey, JSON.stringify(savedData));
    
    supabase.from('learning_logs').insert([{ student_id: studentId, student_name: studentName, task_type: taskTypeName, book_info: `${selectedBook} [${currentTestMode}]`, score: totalQCount, status: '완료', attempt: attemptCount, log_date: selectedDate }]).then();
    
    setGameState('intro');
  };

  const getDynamicFontSize = (text: string) => { const len = text.length; if (len > 25) return '13px'; if (len > 15) return '15px'; return '20px'; };

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
            <label style={{ fontSize: '13px', fontWeight: '700', color: '#8e8e93', marginLeft: '4px', marginBottom: '8px', display: 'block' }}>교재 선택</label>
            <select value={selectedBook} onChange={(e) => setSelectedBook(e.target.value)} style={{ width: '100%', padding: '16px', borderRadius: '14px', border: '1px solid #d1d1d6', fontSize: '16px', fontWeight: '600', color: '#333', backgroundColor: '#f9f9f9', outline: 'none', boxSizing: 'border-box' }}>
              <option value="">교재를 선택해주세요</option>
              {books.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>

          {tableName === 'words_high' && (
            <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
              <div style={{ flex: 1, textAlign: 'left' }}>
                <label style={{ fontSize: '13px', fontWeight: '700', color: '#8e8e93', marginLeft: '4px', marginBottom: '8px', display: 'block' }}>시작 번호</label>
                <input type="number" placeholder="예: 1" value={startNo} onChange={e => setStartNo(e.target.value === '' ? '' : Number(e.target.value))} style={{ width: '100%', padding: '16px', borderRadius: '14px', border: '1px solid #d1d1d6', fontSize: '16px', fontWeight: '600', color: '#333', backgroundColor: '#f9f9f9', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div style={{ flex: 1, textAlign: 'left' }}>
                <label style={{ fontSize: '13px', fontWeight: '700', color: '#8e8e93', marginLeft: '4px', marginBottom: '8px', display: 'block' }}>끝 번호</label>
                <input type="number" placeholder="예: 50" value={endNo} onChange={e => setEndNo(e.target.value === '' ? '' : Number(e.target.value))} style={{ width: '100%', padding: '16px', borderRadius: '14px', border: '1px solid #d1d1d6', fontSize: '16px', fontWeight: '600', color: '#333', backgroundColor: '#f9f9f9', outline: 'none', boxSizing: 'border-box' }} />
              </div>
            </div>
          )}

          {tableName === 'words_high' ? (
            <button onClick={() => startGame('high_phase1')} style={{ width: '100%', padding: '18px', background: 'linear-gradient(135deg, #111, #333)', color: 'white', border: 'none', borderRadius: '16px', fontSize: '18px', fontWeight: '800', cursor: 'pointer', boxShadow: '0 6px 16px rgba(0,0,0,0.2)' }}>
              🔥 고등부 2단계 집중 테스트 시작
            </button>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button onClick={() => startGame('eng2kor', 150)} style={{ width: '100%', padding: '16px', background: 'linear-gradient(135deg, #007aff, #0056b3)', color: 'white', border: 'none', borderRadius: '16px', fontSize: '17px', fontWeight: '800', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,122,255,0.2)' }}>
                🇰🇷 뜻만 시험보기 (150문제)
              </button>
              <button onClick={() => startGame('kor2eng', 30)} style={{ width: '100%', padding: '16px', background: 'linear-gradient(135deg, #ff9500, #e68a00)', color: 'white', border: 'none', borderRadius: '16px', fontSize: '17px', fontWeight: '800', cursor: 'pointer', boxShadow: '0 4px 12px rgba(255,149,0,0.2)' }}>
                🇺🇸 스펠링 시험보기 (30문제)
              </button>
              <button onClick={() => startGame('half', 100)} style={{ width: '100%', padding: '16px', background: 'linear-gradient(135deg, #5856d6, #4a48b8)', color: 'white', border: 'none', borderRadius: '16px', fontSize: '17px', fontWeight: '800', cursor: 'pointer', boxShadow: '0 4px 12px rgba(88,86,214,0.2)' }}>
                ⚖️ 반반 시험보기 (100문제)
              </button>
            </div>
          )}
        </div>
      )}

      {(gameState === 'playing_mc' || gameState === 'playing_typing') && questions.length > 0 && (
        <div style={{ background: 'white', padding: '32px 24px', borderRadius: '24px', width: '100%', boxSizing: 'border-box', boxShadow: '0 12px 32px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '15px', fontWeight: '800', color: currentPhase === 2 ? '#ff9500' : '#007aff' }}>
              {isRetestMode ? `🔥 오답 재시험 (${attemptCount}회차)` : (currentPhase === 2 ? '📝 2차전: 뜻 주관식 타이핑' : `Question ${currentIndex + 1}`)}
            </span>
            <span style={{ fontSize: '15px', fontWeight: '700', color: '#8e8e93' }}>{currentIndex + 1} / {questions.length}</span>
          </div>
          <div style={{ width: '100%', height: '8px', backgroundColor: '#f0f0f5', borderRadius: '4px', marginBottom: '32px', overflow: 'hidden' }}>
            <div style={{ width: `${((currentIndex + 1) / questions.length) * 100}%`, height: '100%', backgroundColor: currentPhase === 2 ? '#ff9500' : '#007aff', borderRadius: '4px', transition: 'width 0.3s ease' }}></div>
          </div>
          
          <div style={{ textAlign: 'center', height: '160px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', marginBottom: '32px' }}>
            <span style={{ display: 'inline-block', padding: '6px 14px', backgroundColor: currentPhase === 2 ? '#fff5e6' : '#eef6ff', color: currentPhase === 2 ? '#ff9500' : '#007aff', borderRadius: '8px', fontSize: '14px', fontWeight: '800', marginBottom: '16px' }}>
              {currentPhase === 2 ? '⌨️ 정확한 한글 뜻을 적어주세요' : (questions[currentIndex].type === 'eng2kor' ? '🇺🇸 영어를 우리말로' : '🇰🇷 우리말을 영어로')}
            </span>
            <h2 style={{ fontSize: '32px', fontWeight: '800', margin: '0', color: '#111', wordBreak: 'keep-all', lineHeight: '1.3' }}>
              {questions[currentIndex].type === 'eng2kor' ? questions[currentIndex].eng : questions[currentIndex].kor}
            </h2>
          </div>
          
          {gameState === 'playing_mc' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', width: '100%' }}>
              {questions[currentIndex].options.map((opt, i) => {
                const isSelected = selectedOption === opt;
                const isCorrectAnswer = opt === questions[currentIndex].answer;
                let bgColor = 'white'; let borderColor = '#e5e5ea'; let textColor = '#333';
                if (selectedOption) {
                  if (isCorrectAnswer) { bgColor = '#e8f5e9'; borderColor = '#4caf50'; textColor = '#2e7d32'; } 
                  else if (isSelected && !isCorrectAnswer) { bgColor = '#ffebee'; borderColor = '#ef5350'; textColor = '#c62828'; }
                }
                return (
                  <button key={i} onClick={() => handleOptionClick(opt)} disabled={!!selectedOption} style={{ width: '100%', height: '100px', boxSizing: 'border-box', position: 'relative', padding: '12px', fontSize: getDynamicFontSize(opt), fontWeight: '800', textAlign: 'center', borderRadius: '16px', border: `2px solid ${borderColor}`, backgroundColor: bgColor, color: textColor, cursor: selectedOption ? 'default' : 'pointer', transition: 'all 0.15s ease', display: 'flex', justifyContent: 'center', alignItems: 'center', wordBreak: 'keep-all', lineHeight: '1.3' }}>
                    {opt}
                    {selectedOption && isCorrectAnswer && <span style={{ position: 'absolute', right: '12px', top: '12px', fontSize: '16px' }}>⭕</span>}
                  </button>
                );
              })}
            </div>
          )}

          {gameState === 'playing_typing' && (
            <form onSubmit={handleTypingSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
              <input 
                type="text" 
                value={typingInput} 
                onChange={e => setTypingInput(e.target.value)} 
                placeholder="뜻을 입력하세요 (예: 사과)"
                autoFocus
                disabled={!!showTypingFeedback}
                style={{ width: '100%', padding: '20px', borderRadius: '16px', border: `2px solid ${showTypingFeedback === 'O' ? '#4caf50' : showTypingFeedback === 'X' ? '#ef5350' : '#ff9500'}`, fontSize: '20px', fontWeight: '700', textAlign: 'center', boxSizing: 'border-box', outline: 'none', backgroundColor: showTypingFeedback === 'O' ? '#e8f5e9' : showTypingFeedback === 'X' ? '#ffebee' : '#f9f9f9', color: showTypingFeedback === 'X' ? '#c62828' : '#111' }}
              />
              <button type="submit" disabled={!!showTypingFeedback} style={{ width: '100%', padding: '18px', background: showTypingFeedback ? '#ccc' : '#111', color: 'white', border: 'none', borderRadius: '16px', fontSize: '18px', fontWeight: '800', cursor: showTypingFeedback ? 'default' : 'pointer' }}>
                정답 제출
              </button>
              
              {showTypingFeedback === 'X' && (
                <div style={{ marginTop: '12px', padding: '16px', backgroundColor: '#ffebee', borderRadius: '12px', textAlign: 'center' }}>
                  <span style={{ color: '#c62828', fontWeight: '800', fontSize: '16px' }}>❌ 정답: {questions[currentIndex].answer}</span>
                </div>
              )}
            </form>
          )}
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
                <span style={{ fontSize: '24px', fontWeight: '800', color: '#1b5e20' }}>{currentTestMode} 마스터!</span>
              </div>
              <button onClick={handleFinalPass} style={{ width: '100%', padding: '18px', background: '#111', color: 'white', border: 'none', borderRadius: '16px', fontSize: '18px', fontWeight: '700', cursor: 'pointer' }}>
                처음 화면으로 이동 (기록 저장)
              </button>
            </>
          ) : (
            <>
              <div style={{ fontSize: '56px', marginBottom: '16px' }}>🔥</div>
              <h2 style={{ fontSize: '26px', fontWeight: '800', margin: '0 0 12px', color: '#111' }}>재도전이 필요해요!</h2>
              <p style={{ color: '#666', fontSize: '15px', marginBottom: '24px' }}>틀린 단어를 완벽히 마스터해봐요.</p>
              
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