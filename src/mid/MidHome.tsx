import React, { useState, useEffect } from 'react';
// 💡 방금 만든 문법 테스트 파일을 불러옵니다.
import MidGrammar from './MidGrammar'; 

// 부모(App.tsx)로부터 전달받을 학생 정보 규격
interface Student {
  id: string;
  name: string;
  grade: string;
  currentBook: string;
  progress: string;
}

interface MidHomeProps {
  student: Student;
  onNavigate: (menu: string) => void;
  onLogout: () => void;
}

export default function MidHome({ student, onNavigate, onLogout }: MidHomeProps) {
  // 'HOME'이면 대시보드를, 'GRAMMAR'이면 문법 테스트 화면을 보여줍니다.
  const [currentView, setCurrentView] = useState<'HOME' | 'GRAMMAR'>('HOME');

  // 💡 구글 시트에서 불러온 문법 문제 데이터를 담을 상태(State)를 추가합니다.
  const [grammarQuestions, setGrammarQuestions] = useState<any[]>([]);

  // 💡 (임시) 컴포넌트가 마운트될 때 혹은 GRAMMAR 메뉴로 들어갈 때 
  // 실제 구글 시트 데이터를 불러와서 setGrammarQuestions에 넣어주시면 됩니다.
  // useEffect(() => {
  //   fetch('구글_시트_API_주소')
  //     .then(res => res.json())
  //     .then(data => setGrammarQuestions(data));
  // }, []);

  // 'GRAMMAR' 상태일 경우, 기존 화면을 덮고 문법 테스트 화면을 렌더링합니다.
  if (currentView === 'GRAMMAR') {
    // 💡 에러 해결: questions 속성으로 grammarQuestions 데이터를 넘겨줍니다.
    return <MidGrammar questions={grammarQuestions} onBack={() => setCurrentView('HOME')} />;
  }

  // 'HOME' 상태일 경우 보여지는 기존 대시보드 화면
  return (
    <div style={{ backgroundColor: '#f9f9f9', minHeight: '100vh', padding: '20px', fontFamily: 'Pretendard, sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>
        
        {/* 상단 프로필 및 로그아웃 */}
        <div style={{ background: 'white', padding: '20px', borderRadius: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', marginBottom: '16px' }}>
          <div>
            <span style={{ color: '#007aff', fontWeight: '700', fontSize: '14px' }}>{student.grade} 🐋</span>
            <h2 style={{ margin: '4px 0 0', fontSize: '22px', fontWeight: '800' }}>{student.name} 학생</h2>
          </div>
          <button onClick={onLogout} style={{ backgroundColor: '#ff3b30', color: 'white', border: 'none', padding: '8px 14px', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', fontSize: '14px' }}>
            로그아웃
          </button>
        </div>

        {/* 미션 현황 카드 */}
        <div style={{ background: 'linear-gradient(135deg, #007aff, #0056b3)', padding: '24px', borderRadius: '20px', color: 'white', textAlign: 'center', boxShadow: '0 6px 20px rgba(0,122,255,0.15)', marginBottom: '24px' }}>
          <p style={{ margin: '0 0 8px', fontSize: '12px', fontWeight: '700', opacity: 0.9, letterSpacing: '1px' }}>TODAY'S MISSION 📖</p>
          <h3 style={{ margin: '0 0 16px', fontSize: '24px', fontWeight: '800' }}>교재: {student.currentBook || '워드타파'}</h3>
          <div style={{ display: 'inline-block', backgroundColor: 'rgba(255,255,255,0.15)', padding: '6px 16px', borderRadius: '20px', fontSize: '14px', fontWeight: '700' }}>
            🎯 추천 진도: {student.progress || '1'}
          </div>
        </div>

        <h4 style={{ textAlign: 'center', fontSize: '18px', fontWeight: '700', color: '#333', marginBottom: '16px' }}>오늘의 학습 메뉴</h4>

        {/* 메뉴 버튼 영역 (2x2 그리드) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {/* 1. 단어 Test */}
          <div onClick={() => onNavigate('voca')} style={{ background: 'white', padding: '16px', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.02)', cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '120px', border: '1px solid #e0f2fe' }}>
            <div>
              <span style={{ fontSize: '16px', fontWeight: '700' }}>📝 단어 Test</span>
              <p style={{ margin: '6px 0 0', fontSize: '11px', color: '#8e8e93', lineHeight: '1.4' }}>오늘의 필수 어휘 마스터하기</p>
            </div>
            <span style={{ fontSize: '12px', color: '#007aff', fontWeight: '700', textAlign: 'right' }}>입장하기 →</span>
          </div>

          {/* 2. 문장 배열 */}
          <div onClick={() => onNavigate('midSen')} style={{ background: 'white', padding: '16px', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.02)', cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '120px', border: '1px solid #e0f2fe' }}>
            <div>
              <span style={{ fontSize: '16px', fontWeight: '700' }}>🧩 문장 배열</span>
              <p style={{ margin: '6px 0 0', fontSize: '11px', color: '#8e8e93', lineHeight: '1.4' }}>어순 감각을 키우는 덩어리 학습</p>
            </div>
            <span style={{ fontSize: '12px', color: '#007aff', fontWeight: '700', textAlign: 'right' }}>입장하기 →</span>
          </div>

          {/* 3. 불규칙 동사 */}
          <div onClick={() => onNavigate('verbTest')} style={{ background: 'white', padding: '16px', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.02)', cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '120px', border: '1px solid #e0f2fe' }}>
            <div>
              <span style={{ fontSize: '16px', fontWeight: '700' }}>🔥 동사 3단 변화</span>
              <p style={{ margin: '6px 0 0', fontSize: '11px', color: '#8e8e93', lineHeight: '1.4' }}>불규칙 동사 완벽 마스터하기</p>
            </div>
            <span style={{ fontSize: '12px', color: '#007aff', fontWeight: '700', textAlign: 'right' }}>입장하기 →</span>
          </div>

          {/* 4. [신규 추가] AI 맞춤 문법 */}
          <div onClick={() => setCurrentView('GRAMMAR')} style={{ background: 'white', padding: '16px', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,122,255,0.1)', cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '120px', border: '2px solid #007aff' }}>
            <div>
              <span style={{ fontSize: '16px', fontWeight: '800', color: '#007aff' }}>🧠 AI 맞춤 문법</span>
              <p style={{ margin: '6px 0 0', fontSize: '11px', color: '#8e8e93', lineHeight: '1.4' }}>틀린 유형까지 완벽하게 마스터</p>
            </div>
            <span style={{ fontSize: '12px', color: '#007aff', fontWeight: '700', textAlign: 'right' }}>입장하기 →</span>
          </div>
        </div>

      </div>
    </div>
  );
}