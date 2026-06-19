import React, { useState, useEffect } from 'react';
import Home from './elem/Home';
import Word from './elem/Word';
import Sentence from './elem/Sentence';
import WhaleChat from './elem/WhaleChat';
import Grammar from './elem/Grammar';
// 💡 [추가] 우리가 새로 만든 관제탑(Lms)을 불러옵니다.
import Lms from './manage/Lms'; 

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentMenu, setCurrentMenu] = useState('home');
  const [id, setId] = useState('');
  
  const [students, setStudents] = useState<any[]>([]);
  const [loggedInStudent, setLoggedInStudent] = useState<any>(null);

  // 💡 [추가] 현재 로그인한 사람이 원장님인지 학생인지 구별하는 안전 스위치
  const [isAdmin, setIsAdmin] = useState(false);

  // 구글 시트 불러오는 마법의 코드는 기존 그대로 완전 유지 (중략)
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTA4Z1o77LMkO66syR0SmqmWPu6q5NapogmBA2iOxpd379nYZ4Gu7y9h7KmGTVb9H9WXNfM5EnFlBxe/pub?gid=1059185510&single=true&output=csv';
        const response = await fetch(SHEET_CSV_URL);
        const text = await response.text();
        const rows = text.split('\n').map(row => row.trim()).filter(row => row !== '');
        const studentData = rows.slice(1).map(row => {
          const cols = row.split(','); 
          return { id: cols[0], name: cols[1], currentBook: cols[2], progress: cols[3], grade: cols[4] };
        });
        setStudents(studentData);
      } catch (error) {
        console.error("구글 시트 데이터를 불러오는데 실패했습니다.", error);
      }
    };
    fetchStudents();
  }, []);

  // 👑 로그인 버튼 함수 수정: 기존 로직 위에 원장님 체크만 슬쩍 가로챕니다.
  const handleLogin = () => {
    // 1. 입력한 아이디가 원장님 아이디라면?
    if (id.trim() === 'uthinkt00') {
      setIsAdmin(true);      // 원장님 스위치 ON
      setIsLoggedIn(true);   // 로그인 성공!
      return;                // 밑에 학생 찾는 코드로 내려가지 않고 여기서 종료! (안전)
    }

    // 2. 원장님이 아니라면? (기존 학생 찾기 로직 100% 그대로 실행)
    const foundStudent = students.find(student => student.id === id);
    if (foundStudent) {
      setLoggedInStudent(foundStudent);
      setIsLoggedIn(true);
    } else {
      alert('등록되지 않은 아이디입니다. 다시 확인해주세요!');
    }
  };

  // 🖥️ 화면 렌더링 분기점 안전하게 감싸기
  if (isLoggedIn) {
    // 💡 [추가] 원장님 스위치가 켜져있다면 학생 화면이 아닌 '통합 관제탑'을 보여줍니다.
    if (isAdmin) {
      return (
        <Lms 
          onBack={() => {
            setIsLoggedIn(false);
            setIsAdmin(false);
            setId(''); // 로그아웃 시 깔끔하게 초기화
          }} 
        />
      );
    }

    // 🧸 기존 학생용 화면 (기존 코드 100% 그대로 유지)
    if (loggedInStudent) {
      return (
        <div>
          {currentMenu === 'home' && (
            <Home 
              student={loggedInStudent} 
              onNavigate={setCurrentMenu} 
              onLogout={() => {
                setIsLoggedIn(false);
                setId('');
              }} 
            />
          )}
          {currentMenu === 'word' && <Word onBack={() => setCurrentMenu('home')} />}
          {currentMenu === 'sentence' && <Sentence onBack={() => setCurrentMenu('home')} />}
          {currentMenu === 'chat' && <WhaleChat onBack={() => setCurrentMenu('home')} />}
          {currentMenu === 'grammar' && (
            <Grammar student={loggedInStudent} onBack={() => setCurrentMenu('home')} />
          )}
        </div>
      );
    }
  }

  // 로그인 전 메인 화면 (기존 코드 100% 그대로 유지)
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f9f9f9', fontFamily: 'Pretendard, sans-serif' }}>
      <div style={{ background: 'white', padding: '40px', borderRadius: '24px', textAlign: 'center', width: '360px', boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}>
        <div style={{ fontSize: '60px', marginBottom: '8px' }}>🐋</div>
        <h1 style={{ margin: '0', fontSize: '28px', fontWeight: '800', color: '#111' }}>고래영어</h1>
        <p style={{ margin: '4px 0 32px 0', color: '#666', fontSize: '15px' }}>WHALE ENGLISH | 스마트 학습 시스템</p>
        
        <input 
          placeholder="학생 ID를 입력하세요" 
          value={id} 
          onChange={(e) => setId(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
          style={{ width: '100%', padding: '16px', marginBottom: '16px', borderRadius: '12px', border: '2px solid #111', boxSizing: 'border-box', fontSize: '16px', outline: 'none' }}
        />
        
        <button 
          onClick={handleLogin} 
          style={{ width: '100%', padding: '16px', backgroundColor: '#007aff', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '700', fontSize: '16px', cursor: 'pointer' }}
        >
          학습 시작하기
        </button>
      </div>
    </div>
  );
}