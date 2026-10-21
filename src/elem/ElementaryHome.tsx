import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase'; // 💡 수파베이스 통신 추가

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
  
  // 💡 [추가] 실시간 배너 상태 관리
  const [battleRoom, setBattleRoom] = useState<any>(null);

  // 💡 [추가] 수파베이스 실시간 대기실 감지 안테나
  useEffect(() => {
    const fetchInitialStatus = async () => {
      const { data } = await supabase.from('game_rooms').select('*').eq('id', 'main_room').single();
      if (data && (data.status === 'waiting' || data.status === 'playing')) {
        setBattleRoom(data);
      }
    };
    fetchInitialStatus();

    const channel = supabase.channel('student_home_listener')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'game_rooms', filter: 'id=eq.main_room' }, (payload) => {
        const newData = payload.new;
        if (newData.status === 'waiting' || newData.status === 'playing') {
          setBattleRoom(newData);
        } else {
          setBattleRoom(null); 
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  if (currentView === 'main') {
    return (
      <div style={{ padding: '24px', maxWidth: '500px', margin: '0 auto', fontFamily: 'Pretendard, sans-serif', position: 'relative' }}>
        
        {/* 🚨 [추가] 원장님이 방을 열면 나타나는 서프라이즈 배너 */}
        {battleRoom && battleRoom.status === 'waiting' && (
          <div style={{
            position: 'absolute', top: '10px', left: '10px', right: '10px', zIndex: 100,
            background: 'linear-gradient(135deg, #ef4444, #f97316)', padding: '25px 20px', borderRadius: '20px',
            color: 'white', textAlign: 'center', boxShadow: '0 15px 35px rgba(239,68,68,0.4)',
            animation: 'slideDown 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
          }}>
            <div style={{ fontSize: '40px', animation: 'bounce 1s infinite', marginBottom: '10px' }}>🚨</div>
            <h2 style={{ margin: '0 0 10px 0', fontSize: '24px', fontWeight: '900' }}>긴급 소집 명령!</h2>
            <p style={{ margin: '0 0 20px 0', fontSize: '16px', fontWeight: 'bold', color: '#ffedd5' }}>
              원장님이 교실 대난투를 열었습니다!<br/>동료들이 기다리고 있습니다.
            </p>
            <button 
              onClick={() => onNavigate('studentBattle')} 
              style={{ 
                width: '100%', padding: '16px', background: 'white', color: '#ef4444', 
                border: 'none', borderRadius: '12px', fontWeight: '900', fontSize: '20px', 
                cursor: 'pointer', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' 
              }}
            >
              🚀 대기실로 즉시 입장하기
            </button>
          </div>
        )}

        {/* 👇 여기서부터는 원장님의 원래 코드 그대로입니다! 👇 */}
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
            <div style={{ fontSize: '14px', opacity: 0.85 }}>스피드 문법, Word Master, Word Drop, 랭킹전</div>
          </button>
        </div>

        {/* 배너 애니메이션 스타일 */}
        <style>{`
          @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
          @keyframes slideDown { from { transform: translateY(-50px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        `}</style>
      </div>
    );
  }

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

  if (currentView === 'homework') {
    return (
      <div style={{ padding: '24px', maxWidth: '500px', margin: '0 auto', fontFamily: 'Pretendard, sans-serif' }}>
        <button onClick={() => setCurrentView('main')} style={{ marginBottom: '20px', padding: '8px 14px', background: '#f1f1f5', border: 'none', borderRadius: '10px', fontWeight: '700', cursor: 'pointer' }}>← 홈으로 돌아가기</button>
        <h2 style={{ fontSize: '22px', fontWeight: '800', marginBottom: '20px', color: '#34c759' }}>🏡 오늘의 숙제 코스</h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button onClick={() => onNavigate('chat')} style={subButtonStyle}>🤖 AI 고래 대화</button>
        </div>
      </div>
    );
  }

  if (currentView === 'game') {
    return (
      <div style={{ padding: '24px', maxWidth: '500px', margin: '0 auto', fontFamily: 'Pretendard, sans-serif' }}>
        <button onClick={() => setCurrentView('main')} style={{ marginBottom: '20px', padding: '8px 14px', background: '#f1f1f5', border: 'none', borderRadius: '10px', fontWeight: '700', cursor: 'pointer' }}>← 홈으로 돌아가기</button>
        <h2 style={{ fontSize: '22px', fontWeight: '800', marginBottom: '20px', color: '#ff9500' }}>🎮 영어 게임 & 챌린지</h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button onClick={() => onNavigate('grammar')} style={subButtonStyle}>⚡ 스피드 문법</button>
          <button onClick={() => onNavigate('wordMaster')} style={subButtonStyle}>⌨️ Word Master</button>
          <button onClick={() => onNavigate('gameWordDrop')} style={subButtonStyle}>☄️ Word Drop</button>
          
          <button onClick={() => onNavigate('cardGame')} style={{ ...subButtonStyle, border: '2px solid #ff2d55', color: '#ff2d55' }}>
            🃏 서바이벌 카드 짝맞추기
          </button>
          
          <button onClick={() => onNavigate('typingGame')} style={{ ...subButtonStyle, border: '2px solid #8b5cf6', color: '#8b5cf6' }}>
            ⌨️ 3단 진화 스펠링 마스터
          </button>
          
          <button onClick={() => onNavigate('ranking')} style={subButtonStyle}>🏆 랭킹전 확인하기</button>
        </div>
      </div>
    );
  }

  return null;
}

const subButtonStyle = { 
  width: '100%', 
  padding: '18px 20px', 
  background: 'white', 
  border: '2px solid #eaeaea', 
  borderRadius: '16px', 
  fontSize: '18px', 
  fontWeight: '800' as const, 
  textAlign: 'left' as const, 
  cursor: 'pointer', 
  boxShadow: '0 4px 12px rgba(0,0,0,0.02)' 
};