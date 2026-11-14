import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase'; // 경로에 맞게 수정해주세요

// 💡 스텝 1에서 만든 DB 테이블 구조와 동일한 인터페이스
interface MiddleQuestion {
  id: number;
  grade: string;
  publisher: string;
  lesson: string;
  grammar_tag: string;
  question: string;
  answer: string;
  explanation: string;
}

interface StudentGrammarTestProps {
  studentId: string;           // 로그인한 학생 아이디 (예: uthinks002)
  assignedQuestions: MiddleQuestion[]; // 선생님이 배포해준 문제 배열
  onComplete: () => void;      // 테스트(및 오답지옥)를 완전히 끝냈을 때 실행
}

export default function StudentGrammarTest({ studentId, assignedQuestions, onComplete }: StudentGrammarTestProps) {
  // --- 상태 관리 ---
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentInput, setCurrentInput] = useState('');
  
  // 피드백 (⭕, ❌) 표시용 상태
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  
  // 오답 지옥(틀린 문제들만 모아두는 큐) 상태
  const [wrongQueue, setWrongQueue] = useState<MiddleQuestion[]>([]);
  const [isHellMode, setIsHellMode] = useState(false); // 일반 모드 vs 오답 지옥 모드
  const [isFinished, setIsFinished] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  // 현재 풀어야 할 문제 배열 (일반 모드일 땐 원본 배열, 지옥 모드일 땐 오답 큐)
  const activeQuestions = isHellMode ? wrongQueue : assignedQuestions;
  const currentQuestion = activeQuestions[currentIndex];

  useEffect(() => {
    // 화면이 렌더링되거나 문제가 넘어갈 때마다 입력창에 자동 포커스
    if (inputRef.current && feedback === null) {
      inputRef.current.focus();
    }
  }, [currentIndex, feedback, isHellMode]);

  // 💡 [핵심] 채점을 위한 문자열 정규화 함수 (대소문자 무시, 다중 공백 제거, 마침표 등 특수기호 무시)
  const normalizeText = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[.,!?]/g, '') // 구두점 제거
      .replace(/\s+/g, ' ')   // 다중 공백을 단일 공백으로
      .trim();
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentInput.trim() || feedback !== null) return;

    const normalizedInput = normalizeText(currentInput);
    const normalizedAnswer = normalizeText(currentQuestion.answer);

    const isCorrect = normalizedInput === normalizedAnswer;

    if (isCorrect) {
      setFeedback('correct');
    } else {
      setFeedback('wrong');
      
      // 💡 일반 모드에서 처음 틀렸을 때만 수파베이스 오답노트 DB로 전송 & 지옥 큐에 추가
      if (!isHellMode) {
        setWrongQueue(prev => [...prev, currentQuestion]);
        
        try {
          await supabase.from('wrong_answers').insert([
            {
              student_id: studentId,
              question_id: currentQuestion.id,
              student_input: currentInput, // 아이가 실제로 어떻게 쳤는지 날것 그대로 저장 (선생님 분석용)
              is_resolved: false
            }
          ]);
        } catch (err) {
          console.error("오답 DB 기록 실패:", err);
        }
      } else {
        // 이미 지옥 모드인데 또 틀리면? 지옥 큐 맨 뒤에 한 번 더 추가 (복제)
        setWrongQueue(prev => [...prev, currentQuestion]);
      }
    }
  };

  const handleNextQuestion = () => {
    setFeedback(null);
    setCurrentInput('');
    
    // 다음 문제로 이동
    if (currentIndex + 1 < activeQuestions.length) {
      setCurrentIndex(prev => prev + 1);
    } else {
      // 배열의 끝에 도달했을 때
      if (!isHellMode) {
        // 1. 일반 모드가 끝났는데 오답이 있다면 오답 지옥 시작
        if (wrongQueue.length > 0) {
          setIsHellMode(true);
          setCurrentIndex(0); // 지옥 큐의 처음부터 시작
        } else {
          // 오답이 없으면 즉시 테스트 종료
          setIsFinished(true);
        }
      } else {
        // 2. 오답 지옥 모드 배열 끝에 도달했는데 방금 또 틀려서 큐가 더 길어졌을 경우 계속 진행
        // (handleNextQuestion 호출 시점에는 이미 currentIndex가 배열 끝이었으므로 여기서 종료 판별)
        setIsFinished(true); // 이 부분은 일단 완료 화면 띄우고 지연 후 처리
      }
    }
  };

  if (!assignedQuestions || assignedQuestions.length === 0) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>할당된 과제가 없습니다.</div>;
  }

  // 💡 모든 테스트 완료 화면
  if (isFinished && wrongQueue.length === 0) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0fdf4', fontFamily: 'Pretendard, sans-serif' }}>
        <div style={{ fontSize: '100px', marginBottom: '20px' }}>🎉</div>
        <h1 style={{ fontSize: '32px', color: '#166534', fontWeight: '900', marginBottom: '12px' }}>테스트 완벽 통과!</h1>
        <p style={{ fontSize: '18px', color: '#15803d', marginBottom: '40px' }}>오답 지옥 없이(또는 탈출하여) 과제를 완수했습니다.</p>
        <button onClick={onComplete} style={{ padding: '16px 48px', fontSize: '20px', fontWeight: 'bold', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '30px', cursor: 'pointer', boxShadow: '0 10px 20px rgba(16, 185, 129, 0.3)' }}>
          홈으로 돌아가기
        </button>
      </div>
    );
  }

  // 💡 텍스트 강조(마크다운 굵게) 렌더링 함수
  const renderText = (text: string) => {
    if (!text) return null;
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} style={{ color: '#2563eb' }}>{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: isHellMode ? '#fef2f2' : '#f8fafc', display: 'flex', flexDirection: 'column', fontFamily: 'Pretendard, sans-serif' }}>
      
      {/* 상단 프로그레스 바 영역 */}
      <div style={{ padding: '24px', backgroundColor: 'white', borderBottom: '1px solid #e2e8f0', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '800px', margin: '0 auto' }}>
          <div>
            <div style={{ fontSize: '14px', color: '#64748b', fontWeight: 'bold', marginBottom: '4px' }}>
              {isHellMode ? '🔥 오답 지옥 탈출 중...' : '📝 영작 타이핑 테스트'}
            </div>
            <div style={{ fontSize: '20px', fontWeight: '900', color: isHellMode ? '#ef4444' : '#0f172a' }}>
              {currentQuestion.grade} | {currentQuestion.lesson}
            </div>
          </div>
          <div style={{ fontSize: '24px', fontWeight: '900', color: '#3b82f6', backgroundColor: '#eff6ff', padding: '8px 20px', borderRadius: '20px' }}>
            {currentIndex + 1} / {activeQuestions.length}
          </div>
        </div>
      </div>

      {/* 중앙 문제 풀이 영역 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 20px' }}>
        <div style={{ width: '100%', maxWidth: '800px', backgroundColor: 'white', borderRadius: '24px', padding: '40px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', position: 'relative' }}>
          
          {/* 문법 태그 힌트 */}
          <div style={{ display: 'inline-block', padding: '6px 12px', backgroundColor: '#f1f5f9', color: '#475569', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', marginBottom: '20px' }}>
            💡 Hint: {currentQuestion.grammar_tag}
          </div>

          {/* 한글 질문 (문제) */}
          <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#1e293b', marginBottom: '16px', lineHeight: '1.4' }}>
            Q. {renderText(currentQuestion.question)}
          </h2>

          {/* 영어 지문 또는 힌트 문장 (있을 경우만 렌더링) */}
          {currentQuestion.explanation && (
            <div style={{ fontSize: '18px', color: '#334155', backgroundColor: '#f8fafc', padding: '20px', borderRadius: '12px', borderLeft: '4px solid #94a3b8', marginBottom: '32px' }}>
              {renderText(currentQuestion.explanation)}
            </div>
          )}

          {/* 학생 입력창 폼 */}
          <form onSubmit={handleSubmit} style={{ width: '100%', position: 'relative' }}>
            <input
              ref={inputRef}
              type="text"
              value={currentInput}
              onChange={(e) => setCurrentInput(e.target.value)}
              disabled={feedback !== null}
              placeholder="여기에 영어 문장을 타이핑하세요..."
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

          {/* 채점 결과 피드백 오버레이 */}
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
                      <span style={{ fontSize: '13px', color: '#ef4444', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>올바른 정답 문장</span>
                      <strong style={{ fontSize: '18px', color: '#1e293b', fontFamily: 'Consolas, monospace' }}>{currentQuestion.answer}</strong>
                    </div>
                  </div>
                </div>
              )}
              
              <button 
                onClick={handleNextQuestion} 
                autoFocus 
                style={{ width: '100%', marginTop: '24px', padding: '16px', fontSize: '18px', fontWeight: '900', color: 'white', backgroundColor: feedback === 'correct' ? '#22c55e' : '#ef4444', border: 'none', borderRadius: '12px', cursor: 'pointer' }}
              >
                {feedback === 'correct' ? '다음 문제로 넘어가기 →' : '정답 확인했습니다 (지옥 큐에 추가됨)'}
              </button>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}