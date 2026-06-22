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
          return { id: cols[0], name: cols[1], currentBook: cols[2], progress: cols[3], grade: cols[4] };
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
      const isElementary = cleanId.startsWith('uthinks') || foundStudent.grade?.includes('초');
      setStudentMode(isElementary ? 'elementary' : 'middle');
    } else {
      alert('등록되지 않은 아이디입니다.');
    }
  };

  if (isLoggedIn) {
    if (isAdmin) {
      return <Lms onBack={() => { setIsLoggedIn(false); setIsAdmin(false); setId(''); }} />;
    }

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

    // 📘 중등부 학생 화면 (연결 완료)
    if (loggedInStudent && studentMode === 'middle') {
      return (
        <Voca 
          onBack={() => {
            setIsLoggedIn(false);
            setId('');
            setStudentMode(null);
          }} 
        />
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