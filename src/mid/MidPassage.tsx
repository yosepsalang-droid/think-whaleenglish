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

interface LessonItem {
  grade: string;
  publisher: string;
  lesson: string;
}

interface MidPassageProps {
  student?: any;
  onBack: () => void;
}

export default function MidPassage({ student, onBack }: MidPassageProps) {
  const [phase, setPhase] = useState<'SELECT_LESSON' | 'SELECT_RANGE' | 'TESTING' | 'RESULT'>('SELECT_LESSON');

  // 1. 단원 및 필터 상태
  const [availableLessons, setAvailableLessons] = useState<LessonItem[]>([]);
  const [selectedGrade, setSelectedGrade] = useState<string>('ALL');
  const [selectedPublisher, setSelectedPublisher] = useState<string>('ALL');
  const [selectedLesson, setSelectedLesson] = useState<LessonItem | null>(null);

  // 2. 범위 선택 상태
  const [maxSentences, setMaxSentences] = useState(0);
  const [startNum, setStartNum] = useState(1);
  const [endNum, setEndNum] = useState(10);

  // 3. 테스트 상태
  const [testQueue, setTestQueue] = useState<MiddleSentence[]>([]);
  const [wrongQueue, setWrongQueue] = useState<MiddleSentence[]>([]);
  const [totalWrongCount, setTotalWrongCount] = useState(0);
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
        const unique: LessonItem[] = [];
        const map = new Map();
        for (const item of data) {
          const key = `${item.grade}-${item.publisher}-${item.lesson}`;
          if (!map.has(key)) {
            map.set(key, true);
            unique.push(item);
          }
        }
        // 단원 번호순 정렬
        unique.sort((a, b) => a.lesson.localeCompare(b.lesson, 'ko', { numeric: true }));
        setAvailableLessons(unique);

        // 로그인한 학생의 학년이 DB에 있으면 자동 선택
        const grades = Array.from(new Set(unique.map(u => u.grade))).sort();
        if (student?.grade && grades.includes(student.grade)) {
          setSelectedGrade(student.grade);
        } else if (grades.length > 0) {
          setSelectedGrade(grades[0]);
        }
      }
    } catch (error) {
      console.error('단원 목록 불러오기 실패:', error);
    }
  };

  // 학년 변경 시 출판사 필터 초기화
  const handleGradeChange = (grade: string) => {
    setSelectedGrade(grade);
    setSelectedPublisher('ALL');
  };

  const handleLessonSelect = async (lessonObj: LessonItem) => {
    setSelectedLesson(lessonObj);
    try {
      const { data, error } = await supabase
        .from('middle_sentences')
        .select('sentence_num')
        .eq('grade', lessonObj.grade)
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
      console.error('문장 갯수 파악 실패:', error);
    }
  };

  const handleStartTest = async () => {
    if (startNum > endNum) return alert('시작 번호가 끝 번호보다 클 수 없습니다.');
    if (startNum < 1 || endNum > maxSentences) return alert('올바른 범위를 입력해주세요.');

    try {
      const { data, error } = await supabase
        .from('middle_sentences')
        .select('*')
        .eq('grade', selectedLesson!.grade)
        .eq('publisher', selectedLesson!.publisher)
        .eq('lesson', selectedLesson!.lesson)
        .gte('sentence_num', startNum)
        .lte('sentence_num', endNum)
        .order('sentence_num', { ascending: true });

      if (error) throw error;
      if (data && data.length > 0) {
        setTestQueue(data);
        setWrongQueue([]);
        setTotalWrongCount(0);
        setCurrentIndex(0);
        setIsHellMode(false);
        setFeedback(null);
        setCurrentInput('');
        setPhase('TESTING');
      } else {
        alert('해당 범위에 문장이 없습니다.');
      }
    } catch (error) {
      console.error('문제 불러오기 실패:', error);
    }
  };

  // 테스트 완료 시 수파베이스에 결과 자동 저장
  const savePassageResult = async (finalWrongCount: number) => {
    if (!selectedLesson) return;
    try {
      await supabase.from('passage_results').insert([
        {
          student_id: student?.student_id || student?.id || 'unknown',
          grade: selectedLesson.grade,
          publisher: selectedLesson.publisher,
          lesson: selectedLesson.lesson,
          start_num: startNum,
          end_num: endNum,
          total_count: testQueue.length,
          wrong_count: finalWrongCount
        }
      ]);
    } catch (err) {
      console.error('본문 테스트 결과 저장 실패:', err);
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
      setTotalWrongCount(prev => prev + 1);
      setWrongQueue(prev => [...prev, currentQuestion]);
    }
  };

  const handleNextQuestion = async () => {
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
          await savePassageResult(totalWrongCount);
          setPhase('RESULT');
        }
      } else {
        await savePassageResult(totalWrongCount);
        setPhase('RESULT');
      }
    }
  };

  // --- 필터 계산 ---
  const grades = Array.from(new Set(availableLessons.map(l => l.grade))).sort();
  const lessonsByGrade = selectedGrade === 'ALL'
    ? availableLessons
    : availableLessons.filter(l => l.grade === selectedGrade);
  const publishers = Array.from(new Set(lessonsByGrade.map(l => l.publisher))).sort();
  const filteredLessons = selectedPublisher === 'ALL'
    ? lessonsByGrade
    : lessonsByGrade.filter(l => l.publisher === selectedPublisher);

  // --- 화면 1: 단원 선택 (학년 + 출판사 필터 적용) ---
  if (phase === 'SELECT_LESSON') {
    return (
      <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', padding: '24px', fontFamily: 'Pretendard, sans-serif' }}>
        <div style={{ maxWidth: '640px', margin: '0 auto' }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '16px', fontWeight: '800', cursor: 'pointer', marginBottom: '20px', padding: 0 }}>
            ← 홈으로 돌아가기
          </button>
          <h2 style={{ fontSize: '26px', fontWeight: '900', color: '#0f172a', margin: '0 0 20px 0' }}>📖 교과서 본문 암기</h2>

          {/* 1단계: 학년 선택 탭 */}
          {grades.length > 0 && (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
              <button
                onClick={() => handleGradeChange('ALL')}
                style={{
                  padding: '8px 16px', borderRadius: '20px', border: 'none', fontWeight: '800', fontSize: '14px', cursor: 'pointer',
                  backgroundColor: selectedGrade === 'ALL' ? '#0f172a' : 'white',
                  color: selectedGrade === 'ALL' ? 'white' : '#64748b',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.04)'
                }}
              >
                전체 학년
              </button>
              {grades.map(g => (
                <button
                  key={g}
                  onClick={() => handleGradeChange(g)}
                  style={{
                    padding: '8px 16px', borderRadius: '20px', border: 'none', fontWeight: '800', fontSize: '14px', cursor: 'pointer',
                    backgroundColor: selectedGrade === g ? '#3b82f6' : 'white',
                    color: selectedGrade === g ? 'white' : '#64748b',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.04)'
                  }}
                >
                  {g}
                </button>
              ))}
            </div>
          )}

          {/* 2단계: 출판사 선택 탭 */}
          {publishers.length > 0 && (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid #e2e8f0' }}>
              <button
                onClick={() => setSelectedPublisher('ALL')}
                style={{
                  padding: '6px 14px', borderRadius: '10px', border: `1px solid ${selectedPublisher === 'ALL' ? '#ec4899' : '#cbd5e1'}`,
                  fontWeight: '700', fontSize: '13px', cursor: 'pointer',
                  backgroundColor: selectedPublisher === 'ALL' ? '#fdf2f8' : 'white',
                  color: selectedPublisher === 'ALL' ? '#ec4899' : '#475569'
                }}
              >
                전체 출판사
              </button>
              {publishers.map(pub => (
                <button
                  key={pub}
                  onClick={() => setSelectedPublisher(pub)}
                  style={{
                    padding: '6px 14px', borderRadius: '10px', border: `1px solid ${selectedPublisher === pub ? '#ec4899' : '#cbd5e1'}`,
                    fontWeight: '700', fontSize: '13px', cursor: 'pointer',
                    backgroundColor: selectedPublisher === pub ? '#fdf2f8' : 'white',
                    color: selectedPublisher === pub ? '#ec4899' : '#475569'
                  }}
                >
                  {pub}
                </button>
              ))}
            </div>
          )}

          {/* 3단계: 단원 카드 목록 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {filteredLessons.length === 0 && (
              <p style={{ color: '#64748b', gridColumn: 'span 2', textAlign: 'center', padding: '40px 0' }}>
                해당 조건에 등록된 교과서 본문이 없습니다.
              </p>
            )}
            {filteredLessons.map((lesson, idx) => (
              <button
                key={idx}
                onClick={() => handleLessonSelect(lesson)}
                style={{ backgroundColor: 'white', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px rgba(0,0,0,0.02)', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s' }}
              >
                <div style={{ fontSize: '12px', color: '#3b82f6', fontWeight: 'bold', marginBottom: '8px' }}>
                  {lesson.grade} | {lesson.publisher}
                </div>
                <div style={{ fontSize: '20px', fontWeight: '900', color: '#1e293b' }}>{lesson.lesson} 본문</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // --- 화면 2: 범위 설정 ---
  if (phase === 'SELECT_RANGE') {
    return (
      <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', padding: '24px', display: 'flex', justifyContent: 'center', alignItems: 'center', fontFamily: 'Pretendard, sans-serif' }}>
        <div style={{ width: '100%', maxWidth: '420px', background: 'white', borderRadius: '24px', padding: '32px 24px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
          <button onClick={() => setPhase('SELECT_LESSON')} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '16px', fontWeight: '800', cursor: 'pointer', marginBottom: '24px', padding: 0 }}>
            ← 다른 단원 선택
          </button>

          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{ fontSize: '14px', color: '#3b82f6', fontWeight: 'bold', marginBottom: '8px' }}>
              {selectedLesson?.grade} | {selectedLesson?.publisher} | {selectedLesson?.lesson}
            </div>
            <h2 style={{ fontSize: '28px', fontWeight: '900', color: '#0f172a', margin: 0 }}>학습 범위 설정 🎯</h2>
            <p style={{ color: '#64748b', marginTop: '12px', fontWeight: 'bold' }}>
              이 단원은 총 <span style={{ color: '#ec4899', fontSize: '18px' }}>{maxSentences}</span> 문장입니다.
            </p>
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

  // --- 화면 3: 완료 ---
  if (phase === 'RESULT') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0fdf4', fontFamily: 'Pretendard, sans-serif', padding: '20px', textAlign: 'center' }}>
        <div style={{ fontSize: '100px', marginBottom: '20px' }}>🎉</div>
        <h1 style={{ fontSize: '32px', color: '#166534', fontWeight: '900', marginBottom: '12px' }}>테스트 완벽 통과!</h1>
        <p style={{ fontSize: '18px', color: '#15803d', marginBottom: '8px' }}>
          <b>{selectedLesson?.publisher} {selectedLesson?.lesson}</b> ({startNum}~{endNum}번) 암기를 완수했습니다.
        </p>
        <p style={{ fontSize: '15px', color: '#64748b', marginBottom: '40px' }}>
          총 오답 횟수: <b>{totalWrongCount}회</b> (선생님께 결과가 자동 전송되었습니다)
        </p>
        <button onClick={onBack} style={{ padding: '16px 48px', fontSize: '20px', fontWeight: 'bold', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '30px', cursor: 'pointer', boxShadow: '0 10px 20px rgba(16, 185, 129, 0.3)' }}>
          홈으로 돌아가기
        </button>
      </div>
    );
  }

  // --- 화면 4: 문제 풀이 ---
  if (!currentQuestion) return null;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: isHellMode ? '#fef2f2' : '#f8fafc', display: 'flex', flexDirection: 'column', fontFamily: 'Pretendard, sans-serif' }}>
      <div style={{ padding: '16px 24px', backgroundColor: 'white', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
        <button
          onClick={onBack}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f1f5f9', border: 'none', color: '#475569', fontSize: '14px', fontWeight: '800', cursor: 'pointer', padding: '10px 16px', borderRadius: '12px' }}
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
        <div style={{ width: '100%', maxWidth: '800px', backgroundColor: 'white', borderRadius: '24px', padding: '40px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'inline-block', padding: '6px 12px', backgroundColor: '#fdf2f8', color: '#ec4899', borderRadius: '8px', fontSize: '14px', fontWeight: '900', marginBottom: '20px' }}>
            문장 번호: {currentQuestion.sentence_num}
          </div>

          <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#1e293b', marginBottom: '32px', lineHeight: '1.5', wordBreak: 'keep-all' }}>
            {currentQuestion.kor}
          </h2>

          <form onSubmit={handleSubmit} style={{ width: '100%' }}>
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
                borderRadius: '16px', outline: 'none', boxSizing: 'border-box'
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
            <div style={{ marginTop: '24px', padding: '24px', borderRadius: '16px', backgroundColor: feedback === 'correct' ? '#f0fdf4' : '#fef2f2', border: `2px dashed ${feedback === 'correct' ? '#4ade80' : '#f87171'}` }}>
              {feedback === 'correct' ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '40px' }}>⭕</span>
                  <div style={{ fontSize: '20px', fontWeight: '900', color: '#166534' }}>정답입니다! 완벽해요.</div>
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