import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase'; 

interface Student {
  id: string;
  name: string;
  grade: string;
  currentBook: string;
  progress: string;
}

interface HomeProps {
  student: Student;
  onNavigate: (menu: string) => void;
  onLogout: () => void;
  onUpdateStudent: (updatedStudent: Student) => void; 
  onBackToSelect?: () => void;
}

export default function Home({ student, onNavigate, onLogout, onUpdateStudent, onBackToSelect }: HomeProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  
  // 💡 [핵심 패치 1] 수파베이스의 대기실 상태를 실시간으로 저장할 공간
  const [battleRoom, setBattleRoom] = useState<any>(null);

  // 💡 [핵심 패치 2] 홈 화면이 켜지면 백그라운드에서 원장님의 호출(main_room)을 귀 기울여 듣습니다!
  useEffect(() => {
    // 처음에 들어왔을 때 이미 방이 열려있는지 확인
    const fetchInitialStatus = async () => {
      const { data } = await supabase.from('game_rooms').select('*').eq('id', 'main_room').single();
      if (data && (data.status === 'waiting' || data.status === 'playing')) {
        setBattleRoom(data);
      }
    };
    fetchInitialStatus();

    // 실시간으로 방 상태 변화 감지 (원장님이 버튼을 누르는 즉시 반응!)
    const channel = supabase.channel('student_home_listener')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'game_rooms', filter: 'id=eq.main_room' }, (payload) => {
        const newData = payload.new;
        if (newData.status === 'waiting' || newData.status === 'playing') {
          setBattleRoom(newData);
        } else {
          setBattleRoom(null); // 원장님이 방을 닫으면 배너도 스르륵 사라짐
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const bookList = [
    '240_1', '240_2', '240_3', '240_4', '240_5', '240_6',
    '520_1', '520_2', '520_3', '520_4', '520_5', '520_6',
    '860_1', '860_2', '860_3', '860_4', '860_5', '860_6',
    '1240_1', '1240_2', '1240_3', '1240_4', '1240_5', '1240_6',
    '1680_1', '1680_2', '1680_3', '1680_4', '1680_5', '1680_6'
  ];

  const handleBookChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newBook = e.target.value;
    if (!newBook || newBook === student.currentBook) return;

    setIsUpdating(true);
    try {
      const { error } = await supabase.from('students').update({ currentBook: newBook }).eq('student_id', student.id);
      if (error) {
        console.error("수파베이스 저장 에러:", error);
        alert("🚨 저장 중 오류가 발생했습니다: " + error.message);
        return;
      }
      onUpdateStudent({ ...student, currentBook: newBook });
      alert("✅ 수파베이스에 교재가 정상적으로 변경되었습니다!");
    } catch (err) {
      alert('통신 오류: 인터넷 연결을 확인해주세요.');
    } finally {
      setIsUpdating(false);
    }
  };

  const menus = [
    { id: 'word', title: '📝 단어 Test', desc: '오늘의 필수 어휘 마스터하기', color: '#4ea8de' },
    { id: 'sentence', title: '🧩 문장 배열 게임', desc: '어순 감각을 키우는 덩어리 학습', color: '#56cfe1' },
    { id: 'chat', title: '🤖 AI 고래 대화', desc: '오늘 배운 문장으로 AI와 톡하기', color: '#72efdd' },
    { id: 'grammar', title: '⚡ 스피드 문법', desc: '도전! 실시간 문법 랭킹전', color: '#64dfdf' },
    { id: 'wordMaster', title: '⌨️ Word Master', desc: '스피드 타자로 단어 완벽 마스터!', color: '#48cae4' },
    { id: 'gameWordDrop', title: '☄️ Word Drop', desc: '단어비가 내린다! 타자 방어 게임', color: '#00b4d8' },
  ];

  return (
    <div style={{ fontFamily: 'sans-serif', padding: '15px', maxWidth: '500px', margin: '0 auto', paddingBottom: '40px', position: 'relative' }}>
      
      {/* 💡 [핵심 패치 3] 원장님이 방을 열면(waiting) 위에서 떨어지는 서프라이즈 배너! */}
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

      {/* 💡 아래는 기존의 홈 화면 코드들입니다. */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '12px', border: '1px solid #eee' }}>
        <div>
          <span style={{ fontSize: '14px', color: '#007aff', fontWeight: 'bold' }}>{student.grade} 🐋</span>
          <h3 style={{ margin: '5px 0 0 0', color: '#333' }}>{student.name} 학생 ({student.id})</h3>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {onBackToSelect && (
            <button onClick={onBackToSelect} style={{ padding: '6px 12px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>
              🔙 과정 선택
            </button>
          )}
          <button onClick={onLogout} style={{ padding: '6px 12px', backgroundColor: '#e63946', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>
            로그아웃
          </button>
        </div>
      </div>

      <div style={{ background: 'linear-gradient(135deg, #007aff, #0056b3)', color: 'white', padding: '20px', borderRadius: '15px', marginBottom: '25px' }}>
        <p style={{ margin: '0 0 5px 0', opacity: '0.9', fontSize: '13px' }}>TODAY'S MISSION 📖</p>
        
        <h2 style={{ margin: '0 0 10px 0', fontSize: '22px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          학습 교재: 
          <select 
            value={student.currentBook} 
            onChange={handleBookChange}
            disabled={isUpdating}
            style={{ 
              padding: '6px 12px', borderRadius: '8px', border: 'none', fontWeight: 'bold', 
              color: '#007aff', fontSize: '18px', cursor: isUpdating ? 'not-allowed' : 'pointer', 
              outline: 'none', backgroundColor: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}
          >
            {bookList.map(book => (
              <option key={book} value={book}>{book}권</option>
            ))}
          </select>
        </h2>

        <div style={{ backgroundColor: 'rgba(255,255,255,0.2)', padding: '8px 12px', borderRadius: '8px', fontSize: '14px' }}>
          🎯 추천 진도: <strong>{student.progress}</strong>
        </div>
      </div>

      <h4 style={{ color: '#666', marginBottom: '15px' }}>오늘의 학습 메뉴</h4>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
        {menus.map((menu) => (
          <div 
            key={menu.id} 
            onClick={() => onNavigate(menu.id)} 
            style={{ 
              border: '1px solid #e0e0e0', borderRadius: '12px', padding: '15px', 
              cursor: 'pointer', backgroundColor: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
            }}
          >
            <h3 style={{ margin: '0 0 8px 0', fontSize: '16px' }}>{menu.title}</h3>
            <p style={{ margin: '0', fontSize: '12px', color: '#777' }}>{menu.desc}</p>
            <div style={{ textAlign: 'right', marginTop: '10px', fontSize: '12px', color: '#007aff', fontWeight: 'bold' }}>입장하기 →</div>
          </div>
        ))}
      </div>

      <button onClick={() => onNavigate('cardGame')} style={{ width: '100%', padding: '18px', background: 'linear-gradient(135deg, #ff2d55, #ff3b30)', color: 'white', border: 'none', borderRadius: '16px', fontSize: '18px', fontWeight: '800', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
        🃏 서바이벌 카드 짝맞추기 게임
      </button>

      <button onClick={() => onNavigate('ranking')} style={{ width: '100%', padding: '18px', background: 'linear-gradient(135deg, #111, #333)', color: 'white', border: 'none', borderRadius: '16px', fontSize: '18px', fontWeight: '800', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '15px' }}>
        🏆 명예의 전당 (통합 마라톤 랭킹)
      </button>

      <style>{`
        @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
        @keyframes slideDown { from { transform: translateY(-50px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>
    </div>
  );
}