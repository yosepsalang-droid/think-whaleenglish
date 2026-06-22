import React, { useState, useEffect } from 'react';

// 🧸 초등부 컴포넌트
import Home from './elem/Home';
import Word from './elem/Word';
import Sentence from './elem/Sentence';
import WhaleChat from './elem/WhaleChat';
import Grammar from './elem/Grammar';

// 📘 중등부 학습 컴포넌트
import Voca from './mid/Voca';

// 👑 원장님 관제탑
import Lms from './manage/Lms'; 

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentMenu, setCurrentMenu] = useState('home');
  const [id, setId] = useState('');
  
  const [students, setStudents] = useState<any[]>([]);
  const [loggedInStudent, setLoggedInStudent] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [studentMode, setStudentMode] = useState<'elementary' | 'middle' | null>(null);

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTA4Z1o77LMkO66syR0SmqmWPu6q5NapogmBA2iOxpd379nYZ4Gu7y9h7KmGTVb9H9WXNfM5EnFlBxe/pub?gid=1059185510&single=true&output=csv';
        const response = await fetch(SHEET_CSV_URL);
        const text = await response.text();
        const rows = text.split('\n').filter(row => row.trim() !== '');
        const studentData = rows.slice(1).map(row => {
          const cols = row.split(','); 
          return { 
            id: cols[0]?.trim(), 
            name: cols[1]?.trim(), 
            currentBook: cols[2]?.trim(), 
            progress: cols[3]?.trim(), 
            grade: cols[4]?.trim() 
          };
        });
        setStudents(studentData);
      } catch (error) { console.error("데이터 로드 실패", error); }
    };
    fetchStudents();
  }, []);

  const handleLogin = () => {
    const cleanId = id.trim();
    if (cleanId === 'uthinkt00') {
      setIsAdmin(true);
      setIsLoggedIn(true);
      return; 
    }

    const foundStudent = students.find(s => s.id === cleanId);
    if (foundStudent) {
      setLoggedInStudent(foundStudent);
      setIsLoggedIn(true);
      
      const isMiddle = cleanId.toLowerCase().includes('m') || foundStudent.grade?.includes('중');
      setStudentMode(isMiddle ? 'middle' : 'elementary');
      setCurrentMenu(isMiddle ? 'midHome' : 'home'); 
    } else {
      alert('등록되지 않은 아이디입니다.');
    }
  };

  if (isLoggedIn) {
    if (isAdmin) {
      return <Lms onBack={() => { setIsLoggedIn(false); setIsAdmin(false); setId(''); }} />;
    }

    // 📘 중등부 전용 화면 대시보드 및 Voca 라우팅 분기 조립
    if (loggedInStudent && studentMode === 'middle') {
      if (currentMenu === 'voca') {
        return (
          <Voca 
            currentBook={loggedInStudent.currentBook}
            onBack={() => setCurrentMenu('midHome')} 
          />
        );
      }

      // 🔥 image_241448.png의 디자인을 완벽히 이식한 대시보드 화면입니다!
      return (
        <div style={{ backgroundColor: '#f9f9f9', minHeight: '100vh', padding: '20px', fontFamily: 'Pretendard', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ width: '100%', maxWidth: '420px' }}>
            
            {/* 상단 학생 정보 카드 */}
            <div style={{ background: 'white', padding: '20px', borderRadius: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', marginBottom: '16px' }}>
              <div>
                <span style={{ color: '#007aff', fontWeight: '700', fontSize: '14px' }}>{loggedInStudent.grade} 🐋</span>
                <h2 style={{ margin: '4px 0 0', fontSize: '22px', fontWeight: '800' }}>{loggedInStudent.name} 학생</h2>
              </div>
              <button 
                onClick={() => { setIsLoggedIn(false); setId(''); setStudentMode(null); }} 
                style={{ backgroundColor: '#ff3b30', color: 'white', border: 'none', padding: '8px 14px', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', fontSize: '14px' }}
              >
                로그아웃
              </button>
            </div>

            {/* 오늘의 미션 배너 */}
            <div style={{ background: 'linear-gradient(135deg, #007aff, #0056b3)', padding: '24px', borderRadius: '20px', color: 'white', textAlign: 'center', boxShadow: '0 6px 20px rgba(0,122,255,0.15)', marginBottom: '24px' }}>
              <p style={{ margin: '0 0 8px', fontSize: '12px', fontWeight: '700', opacity: 0.9, letterSpacing: '1px' }}>TODAY'S MISSION 📖</p>
              <h3 style={{ margin: '0 0 16px', fontSize: '24px', fontWeight: '800' }}>교재: {loggedInStudent.currentBook || '워드타파'}</h3>
              <div style={{ display: 'inline-block', backgroundColor: 'rgba(255,255,255,0.15)', padding: '6px 16px', borderRadius: '20px', fontSize: '14px', fontWeight: '700' }}>
                🎯 추천 진도: {loggedInStudent.progress || '1'}
              </div>
            </div>

            {/* 오늘의 학습 메뉴 타이틀 */}
            <h4 style={{ textAlign: 'center', fontSize: '18px', fontWeight: '700', color: '#333', marginBottom: '16px' }}>오늘의 학습 메뉴</h4>

            {/* 2x2 그리드 메뉴 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              
              {/* 1. 단어 Test (입장 활성화!) */}
              <div 
                onClick={() => setCurrentMenu('voca')}
                style={{ background: 'white', padding: '16px', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.02)', cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '120px', border: '1px solid #e0f2fe' }}
              >
                <div>
                  <span style={{ fontSize: '16px', fontWeight: '700' }}>📝 단어 Test</span>
                  <p style={{ margin: '6px 0 0', fontSize: '11px', color: '#8e8e93', lineHeight: '1.4' }}>오늘의 필수 어휘 마스터하기</p>
                </div>
                <span style={{ fontSize: '12px', color: '#007aff', fontWeight: '700', textAlign: 'right' }}>입장하기 →</span>
              </div>

              {/* 2. 문장 배열 게임 (준비중) */}
              <div 
                onClick={() => alert('중등부 문장 배열 게임은 오픈 준비 중입니다!')}
                style={{ background: 'white', padding: '16px', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.02)', cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '120px', opacity: 0.6 }}
              >
                <div>
                  <span style={{ fontSize: '16px', fontWeight: '700', color: '#555' }}>🧩 문장 배열</span>
                  <p style={{ margin: '6px 0 0', fontSize: '11px', color: '#8e8e93', lineHeight: '1.4' }}>어순 감각을 키우는 덩어리 학습</p>
                </div>
                <span style={{ fontSize: '12px', color: '#8e8e93', fontWeight: '700', textAlign: 'right' }}>준비 중...</span>
              </div>

              {/* 3. AI 고래 대화 (준비중) */}
              <div 
                onClick={() => alert('중등부 AI 고래 대화는 오픈 준비 중입니다!')}
                style={{ background: 'white', padding: '16px', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.02)', cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '120px', opacity: 0.6 }}
              >
                <div>
                  <span style={{ fontSize: '16px', fontWeight: '700', color: '#555' }}>🤖 AI 고래 대화</span>
                  <p style={{ margin: '6px 0 0', fontSize: '11px', color: '#8e8e93', lineHeight: '1.4' }}>오늘 배운 문장으로 AI와 톡하기</p>
                </div>
                <span style={{ fontSize: '12px', color: '#8e8e93', fontWeight: '700', textAlign: 'right' }}>준비 중...</span>
              </div>

              {/* 4. 스피드 문법 (준비중) */}
              <div 
                onClick={() => alert('중등부 스피드 문법은 오픈 준비 중입니다!')}
                style={{ background: 'white', padding: '16px', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.02)', cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '120px', opacity: 0.6 }}
              >
                <div>
                  <span style={{ fontSize: '16px', fontWeight: '700', color: '#555' }}>⚡ 스피드 문법</span>
                  <p style={{ margin: '6px 0 0', fontSize: '11px', color: '#8e8e93', lineHeight: '1.4' }}>도전! 실시간 문법 랭킹전</p>
                </div>
                <span style={{ fontSize: '12px', color: '#8e8e93', fontWeight: '700', textAlign: 'right' }}>준비 중...</span>
              </div>

            </div>

          </div>
        </div>
      );
    }

    // 🧸 초등부 화면
    if (loggedInStudent && studentMode === 'elementary') {
      return (
        <div>
          {currentMenu === 'home' && <Home student={loggedInStudent} onNavigate={setCurrentMenu} onLogout={() => { setIsLoggedIn(false); setId(''); setStudentMode(null); }} />}
          {currentMenu === 'word' && <Word onBack={() => setCurrentMenu('home')} />}
          {currentMenu === 'sentence' && <Sentence onBack={() => setCurrentMenu('home')} />}
          {currentMenu === 'chat' && <WhaleChat onBack={() => setCurrentMenu('home')} />}
          {currentMenu === 'grammar' && <Grammar student={loggedInStudent} onBack={() => setCurrentMenu('home')} />}
        </div>
      );
    }
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f9f9f9', fontFamily: 'Pretendard' }}>
      <div style={{ background: 'white', padding: '40px', borderRadius: '24px', textAlign: 'center', width: '360px', boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}>
        <div style={{ fontSize: '60px', marginBottom: '8px' }}>🐋</div>
        <h1 style={{ margin: '0', fontSize: '28px', fontWeight: '800' }}>고래영어</h1>
        <input 
          placeholder="학생 ID를 입력하세요" 
          value={id} 
          onChange={(e) => setId(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
          style={{ width: '100%', padding: '16px', margin: '32px 0 16px', borderRadius: '12px', border: '2px solid #111', boxSizing: 'border-box' }}
        />
        <button onClick={handleLogin} style={{ width: '100%', padding: '16px', backgroundColor: '#007aff', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '700', cursor: 'pointer' }}>학습 시작하기</button>
      </div>
    </div>
  );
}