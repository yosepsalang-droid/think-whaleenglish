import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabase';

interface VerbItem {
  id: number;
  day: number;
  kor: string;
  base: string;
  past: string;
  pp: string;
}

interface VerbProps {
  onBack: () => void;
  studentId?: string;
  studentName?: string;
}

export default function VerbTest({ onBack, studentId = "ST_TEST", studentName = "테스트학생" }: VerbProps) {
  const [allVerbs, setAllVerbs] = useState<VerbItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [step, setStep] = useState<'SELECT' | 'PRACTICE' | 'TEST' | 'RESULT'>('SELECT');
  const [startDay, setStartDay] = useState<number | ''>('');
  const [endDay, setEndDay] = useState<number | ''>('');
  
  const [targetWords, setTargetWords] = useState<VerbItem[]>([]);
  const [currentWordList, setCurrentWordList] = useState<VerbItem[]>([]);
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [attempts, setAttempts] = useState(0);

  const [inputs, setInputs] = useState({ base: '', past: '', pp: '' });
  const [feedback, setFeedback] = useState<{ isCorrect: boolean; msg: string } | null>(null);

  const baseRef = useRef<HTMLInputElement>(null);
  const pastRef = useRef<HTMLInputElement>(null);
  const ppRef = useRef<HTMLInputElement>(null);

  const currentWord = currentWordList[currentIndex];

  // ⭐️ 수파베이스에서 3단 동사 데이터 실시간 로드
  useEffect(() => {
    const fetchVerbsFromSupabase = async () => {
      try {
        const { data, error } = await supabase.from('verbs').select('*').order('day', { ascending: true });
        if (error) {
          console.error("수파베이스 동사 로드 에러:", error);
        } else if (data) {
          setAllVerbs(data);
        }
      } catch (err) {
        console.error("동사 데이터 통신 실패:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchVerbsFromSupabase();
  }, []);

  const days = useMemo(() => Array.from(new Set(allVerbs.map(v => v.day))).sort((a, b) => a - b), [allVerbs]);

  const { realTodayStr } = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return { realTodayStr: `${year}-${month}-${day}` };
  }, []);

  const [selectedDate, setSelectedDate] = useState(realTodayStr);
  const [isDateFinished, setIsDateFinished] = useState(false);

  useEffect(() => {
    if (!studentId || !selectedDate) return;
    const storageKey = `verb_log_${studentId}`;
    const savedData = localStorage.getItem(storageKey);
    if (savedData) {
      const parsed = JSON.parse(savedData);
      setIsDateFinished(parsed[selectedDate] === '완료');
    } else {
      setIsDateFinished(false);
    }
  }, [studentId, selectedDate]);

  const saveProgressToLocal = () => {
    const storageKey = `verb_log_${studentId}`;
    const savedData = localStorage.getItem(storageKey);
    const parsed = savedData ? JSON.parse(savedData) : {};
    parsed[selectedDate] = '완료';
    localStorage.setItem(storageKey, JSON.stringify(parsed));
    setIsDateFinished(true);
  };

  const shuffleArray = (array: VerbItem[]) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const handleGoToPractice = () => {
    if (startDay === '' || endDay === '') return alert("시작 Day와 끝 Day를 모두 선택해주세요.");
    if (Number(startDay) > Number(endDay)) return alert("끝 Day가 시작 Day보다 커야 합니다.");
    if (!selectedDate) return alert("학습 날짜를 선택해주세요.");
    
    const filtered = allVerbs.filter(v => v.day >= Number(startDay) && v.day <= Number(endDay));
    if (filtered.length === 0) {
      alert("선택한 범위에 등록된 동사가 없습니다. 수파베이스 테이블을 확인해주세요!");
      return;
    }
    setTargetWords(filtered);
    setStep('PRACTICE');
  };

  const handleStartTest = () => {
    setCurrentWordList(shuffleArray(targetWords));
    setCurrentIndex(0);
    setScore(0);
    resetInputs();
    setStep('TEST');
  };

  const resetInputs = () => {
    setInputs({ base: '', past: '', pp: '' });
    setFeedback(null);
    setAttempts(0);
    setTimeout(() => { if (baseRef.current) baseRef.current.focus(); }, 50);
  };

  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 0.85;
      window.speechSynthesis.speak(utterance);
    }
  };

  const speakCurrentVerbs = () => {
    if (currentWord) speakText(`${currentWord.base}. ${currentWord.past}. ${currentWord.pp}.`);
  };

  useEffect(() => {
    if (step === 'TEST' && currentWord) speakCurrentVerbs();
  }, [currentIndex, currentWord, step]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setInputs(prev => ({ ...prev, [name]: value.toLowerCase().trim() })); 
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, nextRef: React.RefObject<HTMLInputElement | null> | null) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (nextRef && nextRef.current) nextRef.current.focus();
      else handleSubmit(e as unknown as React.FormEvent);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWord) return;
    const newAttempts = attempts + 1;
    setAttempts(newAttempts);

    const isBaseCorrect = inputs.base === currentWord.base.toLowerCase();
    const isPastCorrect = inputs.past === currentWord.past.toLowerCase();
    const isPpCorrect = inputs.pp === currentWord.pp.toLowerCase();

    if (isBaseCorrect && isPastCorrect && isPpCorrect) {
      setFeedback({ isCorrect: true, msg: "정답입니다! 👏" });
      setScore(prev => prev + 1);
      setTimeout(() => moveToNext(), 1500);
    } else {
      if (newAttempts >= 3) {
        setInputs({ base: currentWord.base, past: currentWord.past, pp: currentWord.pp });
        setFeedback({ isCorrect: false, msg: `3회 오답으로 정답을 확인합니다. 다음 문제로 넘어갑니다.` });
        setTimeout(() => moveToNext(), 2500);
      } else {
        let wrongParts = [];
        if (!isBaseCorrect) wrongParts.push("원형");
        if (!isPastCorrect) wrongParts.push("과거형");
        if (!isPpCorrect) wrongParts.push("과거분사");
        setFeedback({ isCorrect: false, msg: `${wrongParts.join(", ")} 스펠링이 틀렸어요. (${newAttempts}/3)` });
      }
    }
  };

  const moveToNext = () => {
    if (currentIndex + 1 < currentWordList.length) {
      setCurrentIndex(prev => prev + 1);
      resetInputs();
    } else {
      saveProgressToLocal();
      setStep('RESULT');
    }
  };

  useEffect(() => {
    if (step === 'RESULT' && studentId) {
      const sendVerbLogToSupabase = async () => {
        const bookTitle = `불규칙동사 (Day ${startDay}~${endDay})`;
        try {
          await supabase.from('learning_logs').insert([{
            student_id: studentId,
            student_name: studentName,
            task_type: '불규칙동사',
            book_info: bookTitle,
            score: score,
            status: '완료',
            attempt: 1,
            log_date: selectedDate
          }]);
        } catch (err) {
          console.error("수파베이스 전송 실패:", err);
        }
      };
      sendVerbLogToSupabase();
    }
  }, [step]);

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', marginTop: '100px', fontFamily: 'Pretendard, sans-serif' }}>
        <h2>⚡ 수파베이스에서 동사 데이터를 불러오는 중...</h2>
      </div>
    );
  }

  return (
    <div translate="no" className="notranslate" style={{ fontFamily: 'Pretendard, sans-serif', padding: '20px', maxWidth: '500px', margin: '0 auto', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <button onClick={onBack} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #ccc', backgroundColor: 'white', cursor: 'pointer' }}>← 학습 홈으로</button>
        <span style={{ fontWeight: 'bold', color: '#007aff' }}>동사 3단 변화 학습</span>
      </div>

      {step === 'SELECT' && (
        <div style={{ padding: '30px 20px', backgroundColor: 'white', borderRadius: '24px', boxShadow: '0 12px 32px rgba(0,0,0,0.05)', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚡</div>
          <h2 style={{ margin: '0 0 4px', fontSize: '28px', fontWeight: '800', color: '#111' }}>동사 마스터 테스트</h2>
          <div style={{ fontSize: '14px', color: '#8e8e93', fontWeight: '600', marginBottom: '24px' }}>
            학생 이름: <span style={{ color: '#111', fontWeight: '800' }}>{studentName} ({studentId})</span>
          </div>

          <div style={{ textAlign: 'left', marginBottom: '16px' }}>
            <label style={{ fontSize: '13px', fontWeight: '700', color: '#8e8e93', marginLeft: '4px', marginBottom: '8px', display: 'block' }}>학습 날짜 선택</label>
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{ width: '100%', padding: '16px', borderRadius: '14px', border: '1px solid #d1d1d6', fontSize: '16px', fontWeight: '600', color: '#333', backgroundColor: '#f9f9f9', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ textAlign: 'left', marginBottom: '24px' }}>
            <label style={{ fontSize: '13px', fontWeight: '700', color: '#8e8e93', marginLeft: '4px', marginBottom: '8px', display: 'block' }}>학습할 범위 선택</label>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <select value={startDay} onChange={(e) => setStartDay(e.target.value === '' ? '' : Number(e.target.value))} style={selectStyle}>
                <option value="">시작 Day</option>
                {days.map(d => <option key={`start-${d}`} value={d}>Day {d}</option>)}
              </select>
              <span style={{ fontWeight: 'bold' }}>~</span>
              <select value={endDay} onChange={(e) => setEndDay(e.target.value === '' ? '' : Number(e.target.value))} style={selectStyle}>
                <option value="">끝 Day</option>
                {days.map(d => <option key={`end-${d}`} value={d}>Day {d}</option>)}
              </select>
            </div>
          </div>

          <div style={{ background: isDateFinished ? '#f6fbf6' : '#fff8f8', border: `1px solid ${isDateFinished ? '#c8e6c9' : '#ffcdd2'}`, borderRadius: '16px', padding: '16px', marginBottom: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ textAlign: 'left' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#8e8e93', display: 'block', marginBottom: '2px' }}>학습일 상태</span>
              <span style={{ fontSize: '15px', fontWeight: 800, color: '#111' }}>{selectedDate}</span>
            </div>
            <div style={{ background: isDateFinished ? '#4caf50' : '#ef5350', color: 'white', fontSize: '13px', fontWeight: 800, padding: '6px 14px', borderRadius: '20px' }}>
              {isDateFinished ? '해당일 완료 ⭕' : '해당일 미완료 ❌'}
            </div>
          </div>

          <button onClick={handleGoToPractice} style={{ width: '100%', padding: '18px', background: 'linear-gradient(135deg, #007aff, #0056b3)', color: 'white', border: 'none', borderRadius: '16px', fontSize: '18px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 6px 16px rgba(0,122,255,0.2)' }}>
            학습 시작하기
          </button>
        </div>
      )}

      {step === 'PRACTICE' && (
        <div style={{ padding: '20px', backgroundColor: 'white', borderRadius: '16px', border: '1px solid #eee' }}>
          <h2 style={{ textAlign: 'center', marginBottom: '10px' }}>미리 읽어보기 연습</h2>
          <p style={{ textAlign: 'center', color: '#666', marginBottom: '20px', fontSize: '14px' }}>발음을 듣고 눈으로 익혀보세요!</p>
          <div style={{ maxHeight: '400px', overflowY: 'auto', marginBottom: '20px' }}>
            {targetWords.map((word, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', borderBottom: '1px solid #eee' }}>
                <div>
                  <div style={{ fontSize: '14px', color: '#888' }}>Day {word.day} - {word.kor}</div>
                  <div style={{ fontWeight: 'bold', fontSize: '16px' }}>{word.base} - {word.past} - {word.pp}</div>
                </div>
                <button onClick={() => speakText(`${word.base}. ${word.past}. ${word.pp}.`)} style={{ padding: '8px', backgroundColor: '#eef2ff', color: '#4f46e5', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>🔊 듣기</button>
              </div>
            ))}
          </div>
          <button onClick={handleStartTest} style={primaryButtonStyle}>테스트 시작하기</button>
        </div>
      )}

      {step === 'TEST' && (
        <div style={{ padding: '30px 20px', backgroundColor: 'white', border: '1px solid #eee', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <span>단어 {currentIndex + 1} / {currentWordList.length}</span>
            <h2 style={{ fontSize: '32px', color: '#111', fontWeight: '800' }}>{currentWord?.kor}</h2>
            <button type="button" onClick={speakCurrentVerbs} style={{ padding: '8px 16px', backgroundColor: '#eef2ff', color: '#4f46e5', border: 'none', borderRadius: '20px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', marginTop: '8px' }}>🔊 발음 듣기</button>
          </div>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input ref={baseRef} name="base" placeholder="원형" value={inputs.base} onChange={handleInputChange} onKeyDown={(e) => handleKeyDown(e, pastRef)} style={inputStyle} />
              <input ref={pastRef} name="past" placeholder="과거형" value={inputs.past} onChange={handleInputChange} onKeyDown={(e) => handleKeyDown(e, ppRef)} style={inputStyle} />
              <input ref={ppRef} name="pp" placeholder="과거분사" value={inputs.pp} onChange={handleInputChange} onKeyDown={(e) => handleKeyDown(e, null)} style={inputStyle} />
            </div>
            <button type="submit" disabled={!inputs.base || !inputs.past || !inputs.pp} style={{ width: '100%', padding: '16px', fontSize: '18px', fontWeight: 'bold', color: 'white', backgroundColor: '#007aff', border: 'none', borderRadius: '12px', cursor: 'pointer' }}>정답 확인</button>
          </form>
          {feedback && (
            <div style={{ marginTop: '15px', padding: '15px', borderRadius: '8px', fontWeight: 'bold', textAlign: 'center', backgroundColor: feedback.isCorrect ? '#d4edda' : '#f8d7da', color: feedback.isCorrect ? '#155724' : '#721c24' }}>
              {feedback.msg}
            </div>
          )}
        </div>
      )}

      {step === 'RESULT' && (
        <div style={{ textAlign: 'center', padding: '40px 20px', backgroundColor: '#f8f9fa', borderRadius: '16px' }}>
          <div style={{ fontSize: '56px', marginBottom: '16px' }}>🎉</div>
          <h2 style={{ fontSize: '28px', fontWeight: '800', margin: '0 0 10px 0', color: '#111' }}>테스트 완료!</h2>
          
          <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '24px', textAlign: 'left' }}>
            <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#64748b' }}>📅 학습 날짜: <strong>{selectedDate}</strong></p>
            <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#64748b' }}>📖 학습 범위: <strong>Day {startDay} ~ Day {endDay}</strong></p>
            <p style={{ margin: '0', fontSize: '14px', color: '#64748b' }}>📈 테스트 결과: <strong>총 {currentWordList.length}개 중 {score}개 정답</strong></p>
          </div>

          <button onClick={() => { setStep('SELECT'); setStartDay(''); setEndDay(''); setScore(0); }} style={{ width: '100%', padding: '16px', backgroundColor: '#111', color: 'white', borderRadius: '12px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer', border: 'none', marginTop: '20px' }}>
            처음 화면으로 이동 (완료 도장 확인)
          </button>
        </div>
      )}
    </div>
  );
}

const selectStyle = { flex: 1, padding: '16px', fontSize: '16px', borderRadius: '14px', border: '1px solid #d1d1d6', outline: 'none', backgroundColor: '#f9f9f9', fontWeight: '600' };
const inputStyle = { flex: 1, minWidth: 0, padding: '12px 8px', fontSize: '16px', fontWeight: 'bold', borderRadius: '8px', border: '2px solid #ccc', textAlign: 'center' as const, outline: 'none' };
const primaryButtonStyle = { width: '100%', padding: '16px', backgroundColor: '#333', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 'bold', fontSize: '18px', cursor: 'pointer' };