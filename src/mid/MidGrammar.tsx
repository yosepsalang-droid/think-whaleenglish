import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase'; // 경로에 맞게 수정
import StudentGrammarTest from './StudentGrammarTest';

interface MidGrammarProps {
  student?: any;
  onBack: () => void;
}

// 💡 스텝 1에서 만든 DB 테이블 구조
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

export default function MidGrammar({ student, onBack }: MidGrammarProps) {
  const [appPhase, setAppPhase] = useState<'LOADING' | 'READY' | 'TESTING'>('LOADING');
  const [assignedQuestions, setAssignedQuestions] = useState<MiddleQuestion[]>([]);

  // 💡 [핵심] 실제 환경에서는 선생님이 배포한 과제 테이블(assignments 등)에서 
  // 현재 로그인한 학생(student.id)에게 할당된 문제 번호들을 가져와야 하지만,
  // 지금은 연결 테스트를 위해 수파베이스 middle_questions 테이블에서 최근 20문제를 강제로 불러옵니다.
  // (추후 과제 할당 테이블이 만들어지면 이 부분을 수정하면 됩니다.)
  useEffect(() => {
    const fetchAssignments = async () => {
      setAppPhase('LOADING');
      try {
        // 테스트용: DB에 있는 중등 문제은행에서 최근 20개 가져오기
        const { data, error } = await supabase
          .from('middle_questions')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(20);

        if (error) throw error;
        
        if (data && data.length > 0) {
          setAssignedQuestions(data);
          setAppPhase('READY');
        } else {
          // 문제가 하나도 없으면 바로 알림 띄우고 종료
          alert("아직 선생님이 내준 과제가 없습니다! (또는 DB가 비어있습니다.)");
          onBack();
        }
      } catch (error) {
        console.error("과제 불러오기 실패:", error);
        alert("과제를 불러오는 중 오류가 발생했습니다.");
        onBack();
      }
    };

    fetchAssignments();
  }, []);

  const handleStartTest = () => {
    setAppPhase('TESTING');
  };

  // --- 화면 렌더링 ---
  
  if (appPhase === 'LOADING') {
    return (
      <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', fontFamily: 'Pretendard, sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px', animation: 'spin 2s linear infinite' }}>⏳</div>
          <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#334155' }}>선생님이 내준 과제를<br/>불러오는 중입니다...</h2>
        </div>
      </div>
    );
  }

  // 선생님이 내준 과제가 도착한 '대기실' 화면
  if (appPhase === 'READY') {
    return (
      <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', fontFamily: 'Pretendard, sans-serif' }}>
        <div style={{ width: '100%', maxWidth: '420px', background: 'white', borderRadius: '24px', padding: '32px 24px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
            <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '16px', fontWeight: '800', cursor: 'pointer', padding: 0 }}>← 홈으로</button>
          </div>
          
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <div style={{ fontSize: '60px', marginBottom: '16px' }}>📬</div>
            <h2 style={{ fontSize: '24px', fontWeight: '900', color: '#0f172a', margin: '0 0 12px 0' }}>새로운 과제가 도착했어요!</h2>
            <p style={{ fontSize: '15px', color: '#475569', margin: 0, lineHeight: '1.5' }}>
              선생님이 보내주신 맞춤형 영작 테스트입니다.<br/>
              <b>총 {assignedQuestions.length}문제</b>가 준비되어 있습니다.
            </p>
          </div>

          <div style={{ backgroundColor: '#f1f5f9', padding: '20px', borderRadius: '16px', marginBottom: '32px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '800', color: '#64748b', margin: '0 0 12px 0' }}>🚨 100% 주관식 테스트 규칙</h3>
            <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '14px', color: '#334155', lineHeight: '1.6', fontWeight: '600' }}>
              <li>객관식 힌트 없이 키보드로 직접 문장을 입력합니다.</li>
              <li>대소문자와 띄어쓰기는 틀려도 자동으로 보정됩니다.</li>
              <li><b style={{ color: '#ef4444' }}>틀린 문장은 마지막에 완벽하게 칠 때까지 무한 반복됩니다! (오답 지옥)</b></li>
            </ul>
          </div>

          <button 
            onClick={handleStartTest} 
            style={{ width: '100%', padding: '20px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '16px', fontSize: '18px', fontWeight: '900', cursor: 'pointer', boxShadow: '0 10px 20px rgba(59, 130, 246, 0.3)' }}
          >
            🔥 테스트 시작하기
          </button>
        </div>
      </div>
    );
  }

  // 대기실에서 '테스트 시작'을 누르면 드디어 우리가 만든 타이핑 앱 호출!
  if (appPhase === 'TESTING') {
    return (
      <StudentGrammarTest 
        studentId={student?.id || 'unknown_student'} 
        assignedQuestions={assignedQuestions}
        onComplete={onBack} // 다 끝나면 홈으로 돌려보냄
      />
    );
  }

  return null;
}