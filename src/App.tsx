import React, { useState, useEffect } from 'react';

// 🧸 초등부 컴포넌트 모음
import Home from './elem/Home';
import Word from './elem/Word';
import Sentence from './elem/Sentence';
import WhaleChat from './elem/WhaleChat';
import Grammar from './elem/Grammar';

// 👑 원장님 관제탑
import Lms from './manage/Lms'; 

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentMenu, setCurrentMenu] = useState('home');
  const [id, setId] = useState('');
  
  const [students, setStudents] = useState<any[]>([]);
  const [loggedInStudent, setLoggedInStudent] = useState<any>(null);

  // 💡 [추가] 관리자 여부 확인 스위치
  const [isAdmin, setIsAdmin] = useState(false);
  
  // 💡 [핵심 추가] 이 학생이 초등부인지 중등부인지 기억하는 스위치
  const [studentMode, setStudentMode] = useState<'elementary' | 'middle' | null>(null);

  // 📊 구글 시트 데이터 불러오기 (기존 완벽한 코드 그대로 유지)
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

  // 🚪 로그인 분기 처리 시스템
  const handleLogin = () => {
    const cleanId = id.trim(); // 공백 제거

    // 1. 원장님 마스터 계정 접속
    if (cleanId === 'uthinkt00') {
      setIsAdmin(true);
      setIsLoggedIn(true);
      return; 
    }

    // 2. 일반 학생 계정 접속
    const foundStudent = students.find(student => student.id === cleanId);
    
    if (foundStudent) {
      setLoggedInStudent(foundStudent);
      setIsLoggedIn(true);

      // 💡 [핵심 분기 로직] 아이디 접두사 또는 학년 텍스트로 초/중등 완벽 분류
      const isElementary = cleanId.startsWith('uthinks') || (foundStudent.grade && foundStudent.grade.includes('초'));
      const isMiddle = cleanId.startsWith('uthinkm') || (foundStudent.grade && foundStudent.grade.includes('중'));

      if (isElementary) {
        setStudentMode('elementary');
      } else if (isMiddle) {
        setStudentMode('middle');
      } else {
        // 혹시 분류가 안 되는 예외 상황엔 기본으로 초등부 배정
        setStudentMode('elementary');
      }

    } else {
      alert('등록되지 않은 아이디입니다. 다시 확인해주세요!');
    }
  };

  // =========================================================================
  // 🖥️ 화면 렌더링 영역
  // =========================================================================

  if (isLoggedIn) {
    // 👑 1. 원장님 관제탑 화면
    if (isAdmin) {
      return (
        <Lms 
          onBack={() => {
            setIsLoggedIn(false);
            setIsAdmin(false);
            setId(''); 
          }} 
        />
      );
    }

    // 🧸 2. 초등부 학생 화면 (기존 구축하신 기능 100% 작동)
    if (loggedInStudent && studentMode === 'elementary') {
      return (
        <div>
          {currentMenu === 'home' && (
            <Home 
              student={loggedInStudent} 
              onNavigate={setCurrentMenu} 
              onLogout={() => {
                setIsLoggedIn(false);
                setId('');
                setStudentMode(null);
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

    // 📘 3. 중등부 학생 화면 (신규 추가된 분기)
    if (loggedInStudent && studentMode === 'middle') {
      return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#eff6ff', fontFamily: 'Pretendard, sans-serif' }}>
          <div style={{ background: 'white', padding: '40px', borderRadius: '24px', textAlign: 'center', width: '400px', boxShadow: '0 10px 30px rgba(0,122,255,0.1)' }}>
            <div style={{ fontSize: '50px', marginBottom: '10px' }}>📘</div>
            <h2 style={{ margin: '0', color: '#007aff', fontWeight: '800' }}>고래영어 중등부</h2>
            <p style={{ color: '#64748b', fontSize: '15px', marginTop: '8px' }}>
              환영합니다, <strong>{loggedInStudent.name}</strong> 학생!
            </p>
            
            <div style={{ margin: '30px 0', padding: '20px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <p style={{ color: '#475569', fontSize: '14px', margin: 0 }}>
                현재 접속 아이디: <span style={{ fontWeight: 'bold', color: '#1e293b' }}>{loggedInStudent.id}</span>
                <br />배정 학년: <span style={{ fontWeight: 'bold', color: '#1e293b' }}>{loggedInStudent.grade}</span>
              </p>
            </div>

            <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '30px' }}>
              (이곳에 중등부 전용 Voca 등 학습 메뉴가 연결될 예정입니다.)
            </p>

            <button 
              onClick={() => {
                setIsLoggedIn(false);
                setId('');
                setStudentMode(null);
              }} 
              style={{ width: '100%', padding: '14px', backgroundColor: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '12px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s' }}
            >
              로그아웃
            </button>
          </div>
        </div>
      );
    }
  }

  // 🚪 4. 로그인 전 메인 화면
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