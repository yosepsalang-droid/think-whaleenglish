import React, { useState, useEffect } from 'react';
import Home from './elem/Home';
import Word from './elem/Word';
import Sentence from './elem/Sentence';
import WhaleChat from './elem/WhaleChat';
import Grammar from './elem/Grammar';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentMenu, setCurrentMenu] = useState('home');
  const [id, setId] = useState('');
  
  // 👇 시트에서 불러온 전체 학생 데이터를 저장할 공간
  const [students, setStudents] = useState<any[]>([]);
  // 👇 현재 로그인한 특정 학생의 데이터를 저장할 공간
  const [loggedInStudent, setLoggedInStudent] = useState<any>(null);

  // 👇 앱이 처음 실행될 때 구글 시트 데이터를 한 번만 싹 불러오는 마법의 코드
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        // 원장님의 구글 시트 주소를 프로그램이 읽기 쉬운 'CSV' 형식으로 변환한 주소입니다.
        const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTA4Z1o77LMkO66syR0SmqmWPu6q5NapogmBA2iOxpd379nYZ4Gu7y9h7KmGTVb9H9WXNfM5EnFlBxe/pub?gid=1059185510&single=true&output=csv';
        
        const response = await fetch(SHEET_CSV_URL);
        const text = await response.text();
        
        // 엑셀 데이터를 한 줄씩 쪼개고, 콤마(,) 기준으로 칸을 나눕니다.
        const rows = text.split('\n').map(row => row.trim()).filter(row => row !== '');
        
        // 첫 번째 줄(제목)을 빼고, 두 번째 줄(실제 학생)부터 데이터를 정리합니다.
        const studentData = rows.slice(1).map(row => {
          const cols = row.split(','); 
          return {
            id: cols[0],           // A열: 아이디
            name: cols[1],         // B열: 이름
            currentBook: cols[2],  // C열: 현재 교재
            progress: cols[3],     // D열: 현재 진도
            grade: cols[4]         // E열: 학년
          };
        });
        
        setStudents(studentData);
      } catch (error) {
        console.error("구글 시트 데이터를 불러오는데 실패했습니다.", error);
      }
    };

    fetchStudents();
  }, []);

  // 👇 로그인 버튼을 눌렀을 때 실행되는 기능
  const handleLogin = () => {
    // 입력한 아이디와 똑같은 아이디를 가진 학생을 시트 데이터에서 찾습니다.
    const foundStudent = students.find(student => student.id === id);
    
    if (foundStudent) {
      // 찾았으면 그 학생 정보로 로그인 성공!
      setLoggedInStudent(foundStudent);
      setIsLoggedIn(true);
    } else {
      // 못 찾았으면 경고창 띄우기
      alert('등록되지 않은 아이디입니다. 다시 확인해주세요!');
    }
  };

  if (isLoggedIn && loggedInStudent) {
    return (
      <div>
        {currentMenu === 'home' && (
          <Home 
            student={loggedInStudent} 
            onNavigate={setCurrentMenu} 
            onLogout={() => {
              setIsLoggedIn(false);
              setId(''); // 로그아웃 시 아이디 입력창도 비워줍니다.
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
          // 엔터키를 쳐도 로그인이 되도록 추가했습니다.
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