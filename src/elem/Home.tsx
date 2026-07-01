import React from 'react';

// 💡 [수정] 단어 테스트 및 진도 관리 로그 적재를 위해 id(학번) 필드를 추가했습니다.
interface Student {
  id: string;        // 학번 (예: ST_001)
  name: string;      // 이름
  grade: string;     // 학년/구분 (예: 초등부, 중등부)
  currentBook: string; // 현재 학습 중인 교재
  progress: string;  // 현재 추천 진도 (예: Lesson 1 Day 2)
}

interface HomeProps {
  student: Student;
  onNavigate: (menu: string) => void;
  onLogout: () => void;
}

export default function Home({ student, onNavigate, onLogout }: HomeProps) {
  const menus = [
    { id: 'word', title: '📝 단어 Test', desc: '오늘의 필수 어휘 마스터하기', color: '#4ea8de' },
    { id: 'sentence', title: '🧩 문장 배열 게임', desc: '어순 감각을 키우는 덩어리 학습', color: '#56cfe1' },
    { id: 'chat', title: '🤖 AI 고래 대화', desc: '오늘 배운 문장으로 AI와 톡하기', color: '#72efdd' },
    { id: 'grammar', title: '⚡ 스피드 문법', desc: '도전! 실시간 문법 랭킹전', color: '#64dfdf' },
  ];

  return (
    <div style={{ fontFamily: 'sans-serif', padding: '15px', maxWidth: '500px', margin: '0 auto' }}>
      
      {/* 상단 프로필 헤더 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '12px', border: '1px solid #eee' }}>
        <div>
          <span style={{ fontSize: '14px', color: '#007aff', fontWeight: 'bold' }}>{student.grade} 🐋</span>
          {/* 학번이 함께 노출되거나 시스템 내부에서 식별할 수 있도록 구조화됨 */}
          <h3 style={{ margin: '5px 0 0 0', color: '#333' }}>{student.name} 학생 ({student.id})</h3>
        </div>
        <button onClick={onLogout} style={{ padding: '6px 12px', backgroundColor: '#e63946', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>로그아웃</button>
      </div>

      {/* 현재 진도 카드 */}
      <div style={{ background: 'linear-gradient(135deg, #007aff, #0056b3)', color: 'white', padding: '20px', borderRadius: '15px', marginBottom: '25px' }}>
        <p style={{ margin: '0 0 5px 0', opacity: '0.9', fontSize: '13px' }}>TODAY'S MISSION 📖</p>
        <h2 style={{ margin: '0 0 10px 0', fontSize: '22px' }}>교재: {student.currentBook}</h2>
        <div style={{ backgroundColor: 'rgba(255,255,255,0.2)', padding: '8px 12px', borderRadius: '8px', fontSize: '14px' }}>
          🎯 추천 진도: <strong>{student.progress}</strong>
        </div>
      </div>

      {/* 메인 메뉴 영역 */}
      <h4 style={{ color: '#666', marginBottom: '15px' }}>오늘의 학습 메뉴</h4>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
        {menus.map((menu) => (
          <div 
            key={menu.id} 
            onClick={() => onNavigate(menu.id)} 
            style={{ 
              border: '1px solid #e0e0e0', 
              borderRadius: '12px', 
              padding: '15px', 
              cursor: 'pointer', 
              backgroundColor: 'white', 
              boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
              transition: 'transform 0.1s ease'
            }}
          >
            <h3 style={{ margin: '0 0 8px 0', fontSize: '16px' }}>{menu.title}</h3>
            <p style={{ margin: '0', fontSize: '12px', color: '#777' }}>{menu.desc}</p>
            <div style={{ textAlign: 'right', marginTop: '10px', fontSize: '12px', color: '#007aff', fontWeight: 'bold' }}>입장하기 →</div>
          </div>
        ))}
      </div>
    </div>
  );
}