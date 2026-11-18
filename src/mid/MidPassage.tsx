import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase'; 

interface MiddleSentence {
  id: number;
  grade: string;
  publisher: string;
  lesson: string;
  sentence_num: number;
  eng: string;
  kor: string;
}

interface MidPassageProps {
  student?: any;
  onBack: () => void;
}

export default function MidPassage({ student, onBack }: MidPassageProps) {
  const [phase, setPhase] = useState<'SELECT_LESSON' | 'SELECT_RANGE' | 'TESTING' | 'RESULT'>('SELECT_LESSON');
  
  const [availableLessons, setAvailableLessons] = useState<{publisher: string, lesson: string, grade: string}[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<{publisher: string, lesson: string, grade: string} | null>(null);
  
  const [maxSentences, setMaxSentences] = useState(0);
  const [startNum, setStartNum] = useState(1);
  const [endNum, setEndNum] = useState(10);
  
  const [testQueue, setTestQueue] = useState<MiddleSentence[]>([]);
  const [wrongQueue, setWrongQueue] = useState<MiddleSentence[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentInput, setCurrentInput] = useState('');
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [isHellMode, setIsHellMode] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);

  const activeQuestions = isHellMode ? wrongQueue : testQueue;
  const currentQuestion = activeQuestions[currentIndex];

  useEffect(() => {
    fetchAvailableLessons();
  }, []);

  useEffect(() => {
    if (inputRef.current && feedback === null && phase === 'TESTING') {
      inputRef.current.focus();
    }
  }, [currentIndex, feedback, isHellMode, phase]);

  const fetchAvailableLessons = async () => {
    try {
      const { data, error } = await supabase.from('middle_sentences').select('grade, publisher, lesson');
      if (error) throw error;
      
      if (data) {
        const unique: any[] = [];
        const map = new Map();
        for (const item of data) {
          const key = `${item.grade}-${item.publisher}-${item.lesson}`;
          if (!map.has(key)) {
            map.set(key, true);
            unique.push(item);
          }
        }
        setAvailableLessons(unique);
      }
    } catch (error) {
      console.error("단원 목록 불러오기 실패:", error);
    }
  };

  const handleLessonSelect = async (lessonObj: {publisher: string, lesson: string, grade: string}) => {
    setSelectedLesson(lessonObj);
    try {
      const { data, error } = await supabase
        .from('middle_sentences')
        .select('sentence_num')
        .eq('publisher', lessonObj.publisher)
        .eq('lesson', lessonObj.lesson)
        .order('sentence_num', { ascending: false })
        .limit(1);
        
      if (error) throw error;
      if (data && data.length > 0) {
        const max = data[0].sentence_num;
        setMaxSentences(max);
        setStartNum(1);
        setEndNum(max > 10 ? 10 : max);
        setPhase('SELECT_RANGE');
      }
    } catch (error) {
      console.error("문장 갯수 파악 실패:", error);
    }
  };

  const handleStartTest = async () => {
    if (startNum > endNum) return alert("시작 번호가 끝 번호보다 클 수 없습니다.");
    if (startNum < 1 || endNum > maxSentences) return alert("올바른 범위를 입력해주세요.");

    try {
      const { data, error } = await supabase
        .from('middle_sentences')
        .select('*')
        .eq('publisher', selectedLesson!.publisher)
        .eq('lesson', selectedLesson!.lesson)
        .gte('sentence_num', startNum)
        .lte('sentence_num', endNum)
        .order('sentence_num', { ascending: true });

      if (error) throw error;
      if (data && data.length > 0) {
        setTestQueue(data);
        setPhase('TESTING');
      } else {
        alert("해당 범위에 문장이 없습니다.");
      }
    } catch (error) {
      console.error("문제 불러오기 실패:", error);
    }
  };

  const normalizeText = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[.,!?\"\'\u2018\u2019\u201C\u201D]/g, '') 
      .replace(/\s+/g, ' ')   
      .trim();
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentInput.trim() || feedback !== null) return;

    const normalizedInput = normalizeText(currentInput);
    const normalizedAnswer = normalizeText(currentQuestion.eng);

    if (normalizedInput === normalizedAnswer) {
      setFeedback('correct');
    } else {
      setFeedback('wrong');
      setWrongQueue(prev => [...prev, currentQuestion]);
    }
  };

  const handleNextQuestion = () => {
    setFeedback(null);
    setCurrentInput('');
    
    if (currentIndex + 1 < activeQuestions.length) {
      setCurrentIndex(prev => prev + 1);
    } else {
      if (!isHellMode) {
        if (wrongQueue.length > 0) {
          setIsHellMode(true);
          setCurrentIndex(0);
        } else {
          setPhase('RESULT');
        }
      } else {
        setPhase('RESULT'); 
      }
    }
  };

  if (phase === 'SELECT_LESSON') {
    return (
      <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', padding: '24px', fontFamily: 'Pretendard, sans-serif' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '16px', fontWeight: '800', cursor: 'pointer', marginBottom: '20px' }}>← 홈으로 돌아가기</button>
          <h2 style={{ fontSize: '24px', fontWeight: '900', color: '#0f172a', marginBottom: '24px' }}>📖 교과서 본문 암기</h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {availableLessons.length === 0 && <p style={{ color: '#64748b', gridColumn: 'span 2' }}>등록된 교과서 본문이 없습니다.</p>}
            {availableLessons.map((lesson, idx) => (
              <button 
                key={idx} 
                onClick={() => handleLessonSelect(lesson)}
                style={{ backgroundColor: 'white', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px rgba(0,0,0,0.02)', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s' }}
              >
                <div style={{ fontSize: '12px', color: '#3b82f6', fontWeight: 'bold', marginBottom: '8px' }}>{lesson.grade} | {lesson.publisher}</div>
                <div style={{ fontSize: '20px', fontWeight: '900', color: '#1e293b' }}>{lesson.lesson} 본문</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'SELECT_RANGE') {
    return (
      <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', padding: '24px', display: 'flex', justifyContent: 'center', alignItems: 'center', fontFamily: 'Pretendard, sans-serif' }}>
        <div style={{ width: '100%', maxWidth: '420px', background: 'white', borderRadius: '24px', padding: '32px 24px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
          <button onClick={() => setPhase('SELECT_LESSON')} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '16px', fontWeight: '800', cursor: 'pointer', marginBottom: '24px', padding: 0 }}>← 다른 단원 선택</button>
          
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{ fontSize: '14px', color: '#3b82f6', fontWeight: 'bold', marginBottom: '8px' }}>{selectedLesson?.publisher} | {selectedLesson?.lesson}</div>
            <h2 style={{ fontSize: '28px', fontWeight: '900', color: '#0f172a', margin: 0 }}>학습 범위 설정 🎯</h2>
            <p style={{ color: '#64748b', marginTop: '12px', fontWeight: 'bold' }}>이 단원은 총 <span style={{ color: '#ec4899', fontSize: '18px' }}>{maxSentences}</span> 문장입니다.</p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginBottom: '40px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#64748b', marginBottom: '8px', textAlign: 'center' }}>시작 번호</label>
              <input type="number" value={startNum} onChange={e => setStartNum(Number(e.target.value))} min={1} max={maxSentences} style={{ width: '100%', padding: '16px', fontSize: '24px', fontWeight: '900', textAlign: 'center', borderRadius: '12px', border: '2px solid #cbd5e1', boxSizing: 'border-box' }} />
            </div>
            <div style={{ fontSize: '24px', fontWeight: '900', color: '#94a3b8', marginTop: '24px' }}>~</div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#64748b', marginBottom: '8px', textAlign: 'center' }}>끝 번호</label>
              <input type="number" value={endNum} onChange={e => setEndNum(Number(e.target.value))} min={1} max={maxSentences} style={{ width: '100%', padding: '16px', fontSize: '24px', fontWeight: '900', textAlign: 'center', borderRadius: '12px', border: '2px solid #cbd5e1', boxSizing: 'border-box' }} />
            </div>
          </div>

          <button onClick={handleStartTest} style={{ width: '100%', padding: '20px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '16px', fontSize: '18px', fontWeight: '900', cursor: 'pointer', boxShadow: '0 10px 20px rgba(59, 130, 246, 0.3)' }}>
            테스트 시작하기
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'RESULT') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0fdf4', fontFamily: 'Pretendard, sans-serif' }}>
        <div style={{ fontSize: '100px', marginBottom: '20px' }}>🎉</div>
        <h1 style={{ fontSize: '32px', color: '#166534', fontWeight: '900', marginBottom: '12px' }}>테스트 완벽 통과!</h1>
        <p style={{ fontSize: '18px', color: '#15803d', marginBottom: '40px' }}>지정한 범위의 본문 암기를 완수했습니다.</p>
        <button onClick={onBack} style={{ padding: '16px 48px', fontSize: '20px', fontWeight: 'bold', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '30px', cursor: 'pointer', boxShadow: '0 10px 20px rgba(16, 185, 129, 0.3)' }}>
          홈으로 돌아가기
        </button>
      </div>
    );
  }

  // --- 문제 풀이 (TESTING) ---
  if (!currentQuestion) return null;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: isHellMode ? '#fef2f2' : '#f8fafc', display: 'flex', flexDirection: 'column', fontFamily: 'Pretendard, sans-serif' }}>
      
      {/* 💡 상단 헤더: 뒤로가기 버튼 완벽하게 추가 */}
      <div style={{ padding: '16px 24px', backgroundColor: 'white', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
        <button 
          onClick={onBack} 
          style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f1f5f9', border: 'none', color: '#475569', fontSize: '14px', fontWeight: '800', cursor: 'pointer', padding: '10px 16px', borderRadius: '12px', transition: 'all 0.2s' }}
        >
          <span>←</span> 중단하고 나가기
        </button>

        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold', marginBottom: '2px' }}>
            {isHellMode ? '🔥 오답 지옥 탈출 중...' : '📖 교과서 본문 암기'}
          </div>
          <div style={{ fontSize: '15px', fontWeight: '900', color: isHellMode ? '#ef4444' : '#0f172a' }}>
            {currentQuestion.publisher} | {currentQuestion.lesson}
          </div>
        </div>

        <div style={{ fontSize: '20px', fontWeight: '900', color: '#ec4899', backgroundColor: '#fdf2f8', padding: '6px 16px', borderRadius: '20px' }}>
          {currentIndex + 1} / {activeQuestions.length}
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 20px' }}>
        <div style={{ width: '100%', maxWidth: '800px', backgroundColor: 'white', borderRadius: '24px', padding: '40px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', position: 'relative' }}>
          
          <div style={{ display: 'inline-block', padding: '6px 12px', backgroundColor: '#fdf2f8', color: '#ec4899', borderRadius: '8px', fontSize: '14px', fontWeight: '900', marginBottom: '20px' }}>
            문장 번호: {currentQuestion.sentence_num}
          </div>

          <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#1e293b', marginBottom: '32px', lineHeight: '1.5', wordBreak: 'keep-all' }}>
            {currentQuestion.kor}
          </h2>

          <form onSubmit={handleSubmit} style={{ width: '100%', position: 'relative' }}>
            <input
              ref={inputRef}
              type="text"
              value={currentInput}
              onChange={(e) => setCurrentInput(e.target.value)}
              disabled={feedback !== null}
              placeholder="위 뜻에 맞는 영어 문장을 타이핑하세요."
              autoComplete="off"
              spellCheck="false"
              style={{
                width: '100%', padding: '20px 24px', fontSize: '20px', fontWeight: 'bold', fontFamily: 'Consolas, monospace',
                color: feedback === 'correct' ? '#16a34a' : feedback === 'wrong' ? '#dc2626' : '#0f172a',
                backgroundColor: feedback === 'correct' ? '#f0fdf4' : feedback === 'wrong' ? '#fef2f2' : '#f1f5f9',
                border: `2px solid ${feedback === 'correct' ? '#22c55e' : feedback === 'wrong' ? '#ef4444' : '#cbd5e1'}`,
                borderRadius: '16px', outline: 'none', boxSizing: 'border-box',
                transition: 'all 0.2s'
              }}
            />
            {feedback === null && (
              <div style={{ textAlign: 'right', marginTop: '12px' }}>
                <button type="submit" style={{ padding: '12px 32px', fontSize: '16px', fontWeight: 'bold', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer', boxShadow: '0 4px 10px rgba(59, 130, 246, 0.3)' }}>
                  엔터키로 입력 ⏎
                </button>
              </div>
            )}
          </form>

          {feedback !== null && (
            <div style={{ marginTop: '24px', padding: '24px', borderRadius: '16px', backgroundColor: feedback === 'correct' ? '#f0fdf4' : '#fef2f2', border: `2px dashed ${feedback === 'correct' ? '#4ade80' : '#f87171'}`, animation: 'fadeIn 0.3s ease-in-out' }}>
              {feedback === 'correct' ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '40px' }}>⭕</span>
                  <div>
                    <div style={{ fontSize: '20px', fontWeight: '900', color: '#166534' }}>정답입니다! 완벽해요.</div>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                  <span style={{ fontSize: '40px' }}>❌</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '20px', fontWeight: '900', color: '#991b1b', marginBottom: '8px' }}>오답입니다! 다시 한 번 확인해보세요.</div>
                    <div style={{ backgroundColor: 'white', padding: '12px', borderRadius: '8px', border: '1px solid #fca5a5' }}>
                      <span style={{ fontSize: '13px', color: '#ef4444', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>올바른 본문 문장</span>
                      <strong style={{ fontSize: '18px', color: '#1e293b', fontFamily: 'Consolas, monospace' }}>{currentQuestion.eng}</strong>
                    </div>
                  </div>
                </div>
              )}
              
              <button 
                onClick={handleNextQuestion} 
                autoFocus 
                style={{ width: '100%', marginTop: '24px', padding: '16px', fontSize: '18px', fontWeight: '900', color: 'white', backgroundColor: feedback === 'correct' ? '#22c55e' : '#ef4444', border: 'none', borderRadius: '12px', cursor: 'pointer' }}
              >
                {feedback === 'correct' ? '다음 문장으로 넘어가기 →' : '정답 확인했습니다 (지옥 큐에 추가됨)'}
              </button>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}