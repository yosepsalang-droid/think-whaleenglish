import React, { useState, useEffect, useCallback } from 'react';
import { fetchIntegratedRankings, type IntegratedRankingResult } from './utils/grammarLogRanking';
import { supabase } from './lib/supabase'; 

// 🧸 초등부 컴포넌트
import ElementaryHome from './elem/ElementaryHome';
import Word from './elem/Word';
import Sentence from './elem/Sentence';
import WhaleChat from './elem/WhaleChat';
import Grammar from './elem/Grammar';
import WordMaster from './elem/WordMaster';
import Ranking from './elem/Ranking'; // ⭐️ 랭킹전 추가!

// 📘 중등부 학습 컴포넌트
import MidHome from './mid/MidHome';
import Voca from './mid/Voca';
import MidSen from './mid/MidSen';
import VerbTest from './mid/VerbTest'; // 초등부에서도 공용으로 사용됩니다.

// 👑 원장님 관제탑
import Lms from './manage/Lms'; 

// 🚀 수파베이스 로그인 화면 불러오기
import Login from './pages/Login';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentMenu, setCurrentMenu] = useState('home');
  const [id, setId] = useState('');
  
  const [students, setStudents] = useState<any[]>([]);
  const [loggedInStudent, setLoggedInStudent] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [studentMode, setStudentMode] = useState<'elementary' | 'middle' | null>(null);
  const [integratedRank, setIntegratedRank] = useState<IntegratedRankingResult & { loading: boolean }>({
    totalScore: 0,
    myRank: null,
    thisMonth: [],
    lastMonth: [],
    loading: false,
  });

  const [showTestLogin, setShowTestLogin] = useState(false);
  const [showSchoolSelect, setShowSchoolSelect] = useState(false);

  const refreshIntegratedRank = useCallback(async (studentName: string, optimisticAddedScore = 0) => {
    setIntegratedRank((prev) => ({
      ...prev,
      loading: true,
      totalScore: optimisticAddedScore > 0 ? prev.totalScore + optimisticAddedScore : prev.totalScore,
    }));

    if (optimisticAddedScore > 0) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }

    const result = await fetchIntegratedRankings(studentName);
    setIntegratedRank((prev) => ({
      ...result,
      loading: false,
      totalScore: Math.max(prev.totalScore, result.totalScore),
      myRank: result.myRank ?? prev.myRank,
    }));
  }, []);

  const handleGameComplete = useCallback((addedScore = 0) => {
    if (loggedInStudent?.name) {
      refreshIntegratedRank(loggedInStudent.name, addedScore);
    }
  }, [loggedInStudent, refreshIntegratedRank]);

  useEffect(() => {
    if (loggedInStudent && studentMode === 'elementary') {
      refreshIntegratedRank(loggedInStudent.name);
    }
  }, [loggedInStudent, studentMode, refreshIntegratedRank]);

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const { data, error } = await supabase.from('students').select('*');
        if (error) {
          console.error("수파베이스 에러:", error);
          return;
        }
        if (data) {
          const studentData = data.map(row => ({
            id: row.student_id,
            name: row.name,
            currentBook: row.currentBook,
            progress: row.progress,
            grade: row.grade
          }));
          setStudents(studentData);
        }
      } catch (error) { 
        console.error("데이터 로드 에러:", error); 
      }
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
      setShowSchoolSelect(true); 
    } else {
      alert('등록되지 않은 아이디입니다.');
    }
  };

  const handleModeSelect = (mode: 'elementary' | 'middle') => {
    if (!loggedInStudent) {
      setLoggedInStudent({
        id: 'test_supabase',
        name: '테스트학생',
        currentBook: '테스트교재',
        grade: mode === 'middle' ? '중1' : '초1'
      });
    }
    
    setStudentMode(mode);
    setCurrentMenu(mode === 'middle' ? 'midHome' : 'home');
    setIsLoggedIn(true);
    setShowSchoolSelect(false);
  };

  const handleBackToSelect = () => {
    setStudentMode(null);
    setShowSchoolSelect(true);
  };

  if (isLoggedIn) {
    if (isAdmin) {
      return <Lms onBack={() => { setIsLoggedIn(false); setIsAdmin(false); setId(''); }} />;
    }

    if (loggedInStudent && studentMode === 'middle') {
      if (currentMenu === 'voca') return <Voca studentId={loggedInStudent.id} studentName={loggedInStudent.name} currentBook={loggedInStudent.currentBook} onBack={() => setCurrentMenu('midHome')} />;
      if (currentMenu === 'midSen') return <MidSen onBack={() => setCurrentMenu('midHome')} />;
      if (currentMenu === 'verbTest') return <VerbTest onBack={() => setCurrentMenu('midHome')} studentId={loggedInStudent.id} studentName={loggedInStudent.name} />;
      
      return <MidHome student={loggedInStudent} onNavigate={setCurrentMenu} onLogout={() => { setIsLoggedIn(false); setId(''); setStudentMode(null); }} onBackToSelect={handleBackToSelect} />;
    }

    if (loggedInStudent && studentMode === 'elementary') {
      return (
        <div>
          {/* ⭐️ ElementaryHome에 student 객체와 onNavigate 권한을 완벽하게 넘겨줍니다 */}
          {currentMenu === 'home' && (
            <ElementaryHome 
              student={loggedInStudent} 
              onNavigate={setCurrentMenu}
              onLogout={() => { setIsLoggedIn(false); setId(''); setStudentMode(null); }} 
              onBackToSelect={handleBackToSelect}
            />
          )}
          
          {/* ⭐️ 하위 메뉴 컴포넌트 연결 완료 */}
          {currentMenu === 'word' && <Word onBack={() => setCurrentMenu('home')} studentId={loggedInStudent.id} studentName={loggedInStudent.name} currentBook={loggedInStudent.currentBook} />}
          {currentMenu === 'sentence' && <Sentence onBack={() => setCurrentMenu('home')} studentId={loggedInStudent.id} studentName={loggedInStudent.name} currentBook={loggedInStudent.currentBook} />}
          {currentMenu === 'verbTest' && <VerbTest onBack={() => setCurrentMenu('home')} studentId={loggedInStudent.id} studentName={loggedInStudent.name} />}
          
          {currentMenu === 'chat' && <WhaleChat onBack={() => setCurrentMenu('home')} currentBook={loggedInStudent.currentBook} />}
          
          {currentMenu === 'grammar' && <Grammar student={loggedInStudent} onBack={() => setCurrentMenu('home')} totalScore={integratedRank.totalScore} myRank={integratedRank.myRank} rankings={{ thisMonth: integratedRank.thisMonth, lastMonth: integratedRank.lastMonth }} loadingRank={integratedRank.loading} onGameComplete={handleGameComplete} />}
          {currentMenu === 'wordMaster' && <WordMaster studentName={loggedInStudent.name} grade={loggedInStudent.grade} onBack={() => setCurrentMenu('home')} totalScore={integratedRank.totalScore} myRank={integratedRank.myRank} loadingRank={integratedRank.loading} onGameComplete={handleGameComplete} />}
          {currentMenu === 'ranking' && <Ranking onBack={() => setCurrentMenu('home')} />}
        </div>
      );
    }
  }

  if (showSchoolSelect) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f9f9f9', fontFamily: 'Pretendard' }}>
        <div style={{ background: 'white', padding: '40px', borderRadius: '24px', textAlign: 'center', width: '420px', boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: '32px', fontWeight: '900', color: '#007aff', marginBottom: '8px', letterSpacing: '-1px' }}>생각교육</div>
          <h2 style={{ margin: '0 0 32px 0', fontSize: '22px', fontWeight: '800', color: '#111' }}>어떤 과정으로 입장할까요?</h2>
          
          <div style={{ display: 'flex', gap: '20px', justifyContent: 'space-between' }}>
            <button onClick={() => handleModeSelect('elementary')} style={{ flex: 1, aspectRatio: '1 / 1', backgroundColor: '#ff9500', color: 'white', border: 'none', borderRadius: '24px', cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '16px', boxShadow: '0 6px 16px rgba(255, 149, 0, 0.3)', transition: 'all 0.2s ease-in-out' }} onMouseOver={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(255, 149, 0, 0.4)'; }} onMouseOut={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(255, 149, 0, 0.3)'; }}>
              <span style={{ fontSize: '56px', lineHeight: '1' }}>🐋</span>
              <span style={{ fontSize: '22px', fontWeight: '800', wordBreak: 'keep-all', lineHeight: '1.3' }}>초등부<br/>입장</span>
            </button>
            
            <button onClick={() => handleModeSelect('middle')} style={{ flex: 1, aspectRatio: '1 / 1', backgroundColor: '#007aff', color: 'white', border: 'none', borderRadius: '24px', cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '16px', boxShadow: '0 6px 16px rgba(0, 122, 255, 0.3)', transition: 'all 0.2s ease-in-out' }} onMouseOver={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 122, 255, 0.4)'; }} onMouseOut={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 122, 255, 0.3)'; }}>
              <span style={{ fontSize: '56px', lineHeight: '1' }}>📘</span>
              <span style={{ fontSize: '22px', fontWeight: '800', wordBreak: 'keep-all', lineHeight: '1.3' }}>중등부<br/>입장</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (showTestLogin) {
    return (
      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', backgroundColor: '#f9f9f9', height: '100vh' }}>
        <button onClick={() => setShowTestLogin(false)} style={{ padding: '10px 20px', marginBottom: '20px', marginTop: '40px', cursor: 'pointer', borderRadius: '8px', border: '1px solid #ccc', backgroundColor: 'white', fontWeight: 'bold' }}>🔙 기존 로그인 화면으로 돌아가기</button>
        <Login onLoginSuccess={() => { setShowTestLogin(false); setShowSchoolSelect(true); }} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f9f9f9', fontFamily: 'Pretendard' }}>
      <div style={{ background: 'white', padding: '40px', borderRadius: '24px', textAlign: 'center', width: '360px', boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}>
        <div style={{ fontSize: '60px', marginBottom: '8px' }}>🐋</div>
        <h1 style={{ margin: '0', fontSize: '28px', fontWeight: '800' }}>고래영어</h1>
        <input placeholder="학생 ID를 입력하세요" value={id} onChange={(e) => setId(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleLogin()} style={{ width: '100%', padding: '16px', margin: '32px 0 16px', borderRadius: '12px', border: '2px solid #111', boxSizing: 'border-box' }} />
        <button onClick={handleLogin} style={{ width: '100%', padding: '16px', backgroundColor: '#007aff', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '700', cursor: 'pointer' }}>학습 시작하기</button>
        <button onClick={() => setShowTestLogin(true)} style={{ width: '100%', padding: '16px', marginTop: '16px', backgroundColor: '#333', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '700', cursor: 'pointer' }}>🛠️ (테스트) 새로운 수파베이스 로그인 열기</button>
      </div>
    </div>
  );
}