import React, { useState } from 'react';

interface ElementaryHomeProps {
  student: {
    id: string;
    name: string;
    currentBook: string;
  };
  onNavigate: (menu: string) => void;
  onLogout: () => void;
  onBackToSelect?: () => void;
}

export default function ElementaryHome({ student, onNavigate, onLogout, onBackToSelect }: ElementaryHomeProps) {
  const [currentView, setCurrentView] = useState<'main' | 'progress' | 'homework' | 'game'>('main');

  if (currentView === 'main') {
    return (
      <div style={{ padding: '24px', maxWidth: '500px', margin: '0 auto', fontFamily: 'Pretendard, sans-serif' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '22px', fontWeight: '800', color: '#111' }}>👋 환영합니다, {student?.name} 학생!</h2>
            <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#666' }}>오늘도 스스로 멋지게 학습해봐요!</p>
          </div>
          
          <div style={{ display: 'flex', gap: '8px' }}>
            {onBackToSelect && (
              <button onClick={onBackToSelect} style={{ padding: '8px 14px', background: '#f1f1f5', color: '#333', border: 'none', borderRadius: '10px', fontWeight: '700', cursor: 'pointer' }}>
                🏠 홈으로
              </button>
            )}
            <button onClick={onLogout} style={{ padding: '8px 14px', background: '#ff3b30', color: 'white', border: 'none', borderRadius: '10px', fontWeight: '700', cursor: 'pointer' }}>
              로그아웃
            </button>
          </div>
        </div>

        {/* ⭐️ 이전 버전의 '학습 교재' 영역 완벽 복구 */}
        <div style={{ background: '#007aff', borderRadius: '20px', padding: '24px', color: 'white', marginBottom: '32px', textAlign: 'center', boxShadow: '0 8px 20px rgba(0,122,255,0.25)' }}>
          <div style={{ fontSize: '13px', fontWeight: '800', opacity: 0.9, marginBottom: '12px', letterSpacing: '1px' }}>TODAY'S MISSION 📖</div>
          <div style={{ fontSize: '22px', fontWeight: '800', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px' }}>
            학습 교재:
            <div style={{ background: 'white', color: '#007aff', padding: '8px 20px', borderRadius: '12px', fontSize: '20px', fontWeight: '900' }}>
              {student?.currentBook || '교재 없음'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <button onClick={() => setCurrentView('progress')} style={{ padding: '24px', background: 'linear-gradient(135deg, #007aff, #0056b3)', color: 'white', border: 'none', borderRadius: '20px', textAlign: 'left', cursor: 'pointer', boxShadow: '0 8px 20px rgba(0,122,255,0.25)' }}>
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>📚</div>
            <div style={{ fontSize: '20px', fontWeight: '800', marginBottom: '4px' }}>1. 진도 학습 (수업 복습)</div>
            <div style={{ fontSize: '14px', opacity: 0.85 }}>단어 Test, 문장 배열 게임, 동사 3단 변화 Test</div>
          </button>

          <button onClick={() => setCurrentView('homework')} style={{ padding: '24px', background: 'linear-gradient(135deg, #34c759, #248a3d)', color: 'white', border: 'none', borderRadius: '20px', textAlign: 'left', cursor: 'pointer', boxShadow: '0 8px 20px rgba(52,199,89,0.25)' }}>
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>🏡</div>
            <div style={{ fontSize: '20px', fontWeight: '800', marginBottom: '4px' }}>2. 오늘의 숙제 (Daily Homework)</div>
            <div style={{ fontSize: '14px', opacity: 0.85 }}>AI 고래 대화, 영어 일기 쓰기, 매일 단어</div>
          </button>

          <button onClick={() => setCurrentView('game')} style={{ padding: '24px', background: 'linear-gradient(135deg, #ff9500, #c67100)', color: 'white', border: 'none', borderRadius: '20px', textAlign: 'left', cursor: 'pointer', boxShadow: '0 8px 20px rgba(255,149,0,0.25)' }}>
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>🎮</div>
            <div style={{ fontSize: '20px', fontWeight: '800', marginBottom: '4px' }}>3. 영어 게임 & 챌린지</div>
            <div style={{ fontSize: '14px', opacity: 0.85 }}>스피드 문법, Word Master, 랭킹전</div>
          </button>
        </div>
      </div>
    );
  }

  // ⭐️ 1. 진도 학습 하위 메뉴
  if (currentView === 'progress') {
    return (
      <div style={{ padding: '24px', maxWidth: '500px', margin: '0 auto', fontFamily: 'Pretendard, sans-serif' }}>
        <button onClick={() => setCurrentView('main')} style={{ marginBottom: '20px', padding: '8px 14px', background: '#f1f1f5', border: 'none', borderRadius: '10px', fontWeight: '700', cursor: 'pointer' }}>← 홈으로 돌아가기</button>
        <h2 style={{ fontSize: '22px', fontWeight: '800', marginBottom: '20px', color: '#007aff' }}>📚 진도 학습 코스</h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button onClick={() => onNavigate('word')} style={subButtonStyle}>📝 단어 마스터 테스트</button>
          <button onClick={() => onNavigate('sentence')} style={subButtonStyle}>🧩 문장 배열 게임</button>
          <button onClick={() => onNavigate('verbTest')} style={subButtonStyle}>⚡ 동사 3단 변화 테스트</button> 
        </div>
      </div>
    );
  }

  // ⭐️ 2. 오늘의 숙제 하위 메뉴 (WhaleChat 연결)
  if (currentView === 'homework') {
    return (
      <div style={{ padding: '24px', maxWidth: '500px', margin: '0 auto', fontFamily: 'Pretendard, sans-serif' }}>
        <button onClick={() => setCurrentView('main')} style={{ marginBottom: '20px', padding: '8px 14px', background: '#f1f1f5', border: 'none', borderRadius: '10px', fontWeight: '700', cursor: 'pointer' }}>← 홈으로 돌아가기</button>
        <h2 style={{ fontSize: '22px', fontWeight: '800', marginBottom: '20px', color: '#34c759' }}>🏡 오늘의 숙제 코스</h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button onClick={() => onNavigate('chat')} style={subButtonStyle}>🤖 AI 고래 대화</button>
          {/* 추후 영어 일기 쓰기 등이 추가될 수 있는 자리입니다 */}
        </div>
      </div>
    );
  }

  // ⭐️ 3. 영어 게임 하위 메뉴 (Grammar, WordMaster, Ranking 연결)
  if (currentView === 'game') {
    return (
      <div style={{ padding: '24px', maxWidth: '500px', margin: '0 auto', fontFamily: 'Pretendard, sans-serif' }}>
        <button onClick={() => setCurrentView('main')} style={{ marginBottom: '20px', padding: '8px 14px', background: '#f1f1f5', border: 'none', borderRadius: '10px', fontWeight: '700', cursor: 'pointer' }}>← 홈으로 돌아가기</button>
        <h2 style={{ fontSize: '22px', fontWeight: '800', marginBottom: '20px', color: '#ff9500' }}>🎮 영어 게임 & 챌린지</h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button onClick={() => onNavigate('grammar')} style={subButtonStyle}>⚡ 스피드 문법</button>
          <button onClick={() => onNavigate('wordMaster')} style={subButtonStyle}>⌨️ Word Master</button>
          <button onClick={() => onNavigate('ranking')} style={subButtonStyle}>🏆 랭킹전 확인하기</button>
        </div>
      </div>
    );
  }

  return null;
}

const subButtonStyle = { width: '100%', padding: '18px 20px', background: 'white', border: '2px solid #eaeaea', borderRadius: '16px', fontSize: '18px', fontWeight: '800' as const, textAlign: 'left' as const, cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' };