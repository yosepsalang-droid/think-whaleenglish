import React, { useState } from 'react';
import { CONFIG } from '../config';

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
  // 💡 [추가] 부모(App.tsx)에게 변경된 정보를 전달하는 함수
  onUpdateStudent: (updatedStudent: Student) => void; 
}

export default function Home({ student, onNavigate, onLogout, onUpdateStudent }: HomeProps) {
  const [isUpdating, setIsUpdating] = useState(false);

  // 💡 고래영어 초등부 전체 교재 리스트
  const bookList = ['240_1', '240_2', '240_3', '520_1', '520_2', '520_3', '860_1', '860_2', '860_3', '1240_1', '1240_2', '1240_3', '1680_1', '1680_2', '1680_3'];

  // 💡 드롭다운에서 교재를 선택하면 시트에 즉시 저장하고, 화면 정보도 바꿉니다.
  const handleBookChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newBook = e.target.value;
    if (!newBook || newBook === student.currentBook) return;

    setIsUpdating(true);
    try {
      const payload = {
        type: "updateProgress",
        studentId: student.id,
        currentBook: newBook,
        progress: student.progress, // 상세 진도는 기존 내용 유지
        sheetName: 'STUDENT_LIST'
      };

      await fetch(CONFIG.WEB_APP_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      });

      // App.tsx의 내 정보(상태)를 즉시 업데이트
      onUpdateStudent({ ...student, currentBook: newBook });
    } catch (err) {
      alert('교재 변경 중 오류가 발생했습니다.');
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
  ];

  return (
    <div style={{ fontFamily: 'sans-serif', padding: '15px', maxWidth: '500px', margin: '0 auto' }}>
      
      {/* 상단 프로필 헤더 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '12px', border: '1px solid #eee' }}>
        <div>
          <span style={{ fontSize: '14px', color: '#007aff', fontWeight: 'bold' }}>{student.grade} 🐋</span>
          <h3 style={{ margin: '5px 0 0 0', color: '#333' }}>{student.name} 학생 ({student.id})</h3>
        </div>
        <button onClick={onLogout} style={{ padding: '6px 12px', backgroundColor: '#e63946', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>로그아웃</button>
      </div>

      {/* 현재 진도 카드 */}
      <div style={{ background: 'linear-gradient(135deg, #007aff, #0056b3)', color: 'white', padding: '20px', borderRadius: '15px', marginBottom: '25px' }}>
        <p style={{ margin: '0 0 5px 0', opacity: '0.9', fontSize: '13px' }}>TODAY'S MISSION 📖</p>
        
        {/* 💡 [핵심] 텍스트 대신 드롭다운 선택창으로 변신했습니다! */}
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
          {isUpdating && <span style={{fontSize: '12px', opacity: 0.8}}>저장 중...</span>}
        </h2>

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
              border: '1px solid #e0e0e0', borderRadius: '12px', padding: '15px', 
              cursor: 'pointer', backgroundColor: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
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