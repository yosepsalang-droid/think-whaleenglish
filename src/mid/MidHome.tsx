import React, { useState } from 'react';
import MidGrammar from './MidGrammar'; 

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
  onBackToSelect?: () => void; // ⭐️ 이 부분이 꼭 있어야 합니다!
}

export default function MidHome({ student, onNavigate, onLogout, onBackToSelect }: MidHomeProps) {
  const [currentView, setCurrentView] = useState<'HOME' | 'GRAMMAR'>('HOME');

  if (currentView === 'GRAMMAR') {
    return <MidGrammar student={student} onBack={() => setCurrentView('HOME')} />;
  }

  // 📺 메인 홈 화면 렌더링
  return (
    <div style={{ backgroundColor: '#f9f9f9', minHeight: '100vh', padding: '20px', fontFamily: 'Pretendard, sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>
        
        {/* 상단 프로필 및 로그아웃 */}
        <div style={{ background: 'white', padding: '20px', borderRadius: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', marginBottom: '16px' }}>
          <div>
            <span style={{ color: '#007aff', fontWeight: '700', fontSize: '14px' }}>{student.grade} 🐋</span>
            <h2 style={{ margin: '4px 0 0', fontSize: '22px', fontWeight: '800' }}>{student.name} 학생</h2>
          </div>
          
          {/* ⭐️ 이 부분에 뒤로가기 버튼과 로그아웃 버튼이 나란히 들어갑니다 ⭐️ */}
          <div style={{ display: 'flex', gap: '8px' }}>
            {onBackToSelect && (
              <button onClick={onBackToSelect} style={{ backgroundColor: '#8e8e93', color: 'white', border: 'none', padding: '8px 14px', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', fontSize: '13px' }}>
                🔙 과정 선택
              </button>
            )}
            <button onClick={onLogout} style={{ backgroundColor: '#ff3b30', color: 'white', border: 'none', padding: '8px 14px', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', fontSize: '13px' }}>
              로그아웃
            </button>
          </div>
          {/* ========================================================= */}
          
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

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div onClick={() => onNavigate('voca')} style={{ background: 'white', padding: '16px', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.02)', cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '120px', border: '1px solid #e0f2fe' }}>
            <div>
              <span style={{ fontSize: '16px', fontWeight: '700' }}>📝 단어 Test</span>
              <p style={{ margin: '6px 0 0', fontSize: '11px', color: '#8e8e93', lineHeight: '1.4' }}>오늘의 필수 어휘 마스터하기</p>
            </div>
            <span style={{ fontSize: '12px', color: '#007aff', fontWeight: '700', textAlign: 'right' }}>입장하기 →</span>
          </div>

          <div onClick={() => onNavigate('midSen')} style={{ background: 'white', padding: '16px', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.02)', cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '120px', border: '1px solid #e0f2fe' }}>
            <div>
              <span style={{ fontSize: '16px', fontWeight: '700' }}>🧩 문장 배열</span>
              <p style={{ margin: '6px 0 0', fontSize: '11px', color: '#8e8e93', lineHeight: '1.4' }}>어순 감각을 키우는 덩어리 학습</p>
            </div>
            <span style={{ fontSize: '12px', color: '#007aff', fontWeight: '700', textAlign: 'right' }}>입장하기 →</span>
          </div>

          <div onClick={() => onNavigate('verbTest')} style={{ background: 'white', padding: '16px', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.02)', cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '120px', border: '1px solid #e0f2fe' }}>
            <div>
              <span style={{ fontSize: '16px', fontWeight: '700' }}>🔥 동사 3단 변화</span>
              <p style={{ margin: '6px 0 0', fontSize: '11px', color: '#8e8e93', lineHeight: '1.4' }}>불규칙 동사 완벽 마스터하기</p>
            </div>
            <span style={{ fontSize: '12px', color: '#007aff', fontWeight: '700', textAlign: 'right' }}>입장하기 →</span>
          </div>

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