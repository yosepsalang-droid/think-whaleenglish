import React, { useState, useEffect, useCallback } from 'react';
import { fetchIntegratedRankings, type IntegratedRankingResult } from './utils/grammarLogRanking';

// 🧸 초등부 컴포넌트
import Home from './elem/Home';
import Word from './elem/Word';
import Sentence from './elem/Sentence';
import WhaleChat from './elem/WhaleChat';
import Grammar from './elem/Grammar';
import WordMaster from './elem/WordMaster';

// 📘 중등부 학습 컴포넌트
import MidHome from './mid/MidHome';
import Voca from './mid/Voca';
import MidSen from './mid/MidSen';
import VerbTest from './mid/VerbTest';

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
  const [integratedRank, setIntegratedRank] = useState<IntegratedRankingResult & { loading: boolean }>({
    totalScore: 0,
    myRank: null,
    thisMonth: [],
    lastMonth: [],
    loading: false,
  });

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

    // 📘 중등부 학습 화면 라우팅
    if (loggedInStudent && studentMode === 'middle') {
      if (currentMenu === 'voca') {
        return (
          <Voca 
            studentId={loggedInStudent.id} 
            studentName={loggedInStudent.name} 
            currentBook={loggedInStudent.currentBook} 
            onBack={() => setCurrentMenu('midHome')} 
          />
        );
      }
      if (currentMenu === 'midSen') {
        return <MidSen onBack={() => setCurrentMenu('midHome')} />;
      }
      if (currentMenu === 'verbTest') {
        return <VerbTest onBack={() => setCurrentMenu('midHome')} studentId={loggedInStudent.id} studentName={loggedInStudent.name} />;
      }

      return (
        <MidHome 
          student={loggedInStudent}
          onNavigate={setCurrentMenu}
          onLogout={() => { setIsLoggedIn(false); setId(''); setStudentMode(null); }}
        />
      );
    }

    // 🧸 초등부 학습 화면 라우팅
    if (loggedInStudent && studentMode === 'elementary') {
      return (
        <div>
          {/* 💡 [핵심] 진도가 변경되면 App.tsx의 내 정보(loggedInStudent)도 업데이트 시켜줍니다. */}
          {currentMenu === 'home' && (
            <Home 
              student={loggedInStudent} 
              onNavigate={setCurrentMenu} 
              onLogout={() => { setIsLoggedIn(false); setId(''); setStudentMode(null); }} 
              onUpdateStudent={(updatedStudent) => setLoggedInStudent(updatedStudent)}
            />
          )}
          
          {/* 💡 [핵심] 단어, 문장, AI 대화 컴포넌트에 현재 선택된 교재(currentBook)를 전달해줍니다! */}
          {currentMenu === 'word' && (
            <Word
              onBack={() => setCurrentMenu('home')}
              studentId={loggedInStudent.id}
              studentName={loggedInStudent.name}
              currentBook={loggedInStudent.currentBook}
            />
          )}
          {currentMenu === 'sentence' && (
            <Sentence
              onBack={() => setCurrentMenu('home')}
              studentId={loggedInStudent.id}
              studentName={loggedInStudent.name}
              currentBook={loggedInStudent.currentBook}
            />
          )}
          {currentMenu === 'chat' && (
            <WhaleChat 
              onBack={() => setCurrentMenu('home')} 
              currentBook={loggedInStudent.currentBook}
            />
          )}
          
          {currentMenu === 'grammar' && (
            <Grammar
              student={loggedInStudent}
              onBack={() => setCurrentMenu('home')}
              totalScore={integratedRank.totalScore}
              myRank={integratedRank.myRank}
              rankings={{ thisMonth: integratedRank.thisMonth, lastMonth: integratedRank.lastMonth }}
              loadingRank={integratedRank.loading}
              onGameComplete={handleGameComplete}
            />
          )}
          {currentMenu === 'wordMaster' && (
            <WordMaster
              studentName={loggedInStudent.name}
              grade={loggedInStudent.grade}
              onBack={() => setCurrentMenu('home')}
              totalScore={integratedRank.totalScore}
              myRank={integratedRank.myRank}
              loadingRank={integratedRank.loading}
              onGameComplete={handleGameComplete}
            />
          )}
        </div>
      );
    }
  }

  // 로그인 전 초기 화면
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f9f9f9', fontFamily: 'Pretendard' }}>
      <div style={{ background: 'white', padding: '40px', borderRadius: '24px', textAlign: 'center', width: '360px', boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}>
        <div style={{ fontSize: '60px', marginBottom: '8px' }}>🐋</div>
        <h1 style={{ margin: '0', fontSize: '28px', fontWeight: '800' }}>고래영어</h1>
        <input placeholder="학생 ID를 입력하세요" value={id} onChange={(e) => setId(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleLogin()} style={{ width: '100%', padding: '16px', margin: '32px 0 16px', borderRadius: '12px', border: '2px solid #111', boxSizing: 'border-box' }} />
        <button onClick={handleLogin} style={{ width: '100%', padding: '16px', backgroundColor: '#007aff', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '700', cursor: 'pointer' }}>학습 시작하기</button>
      </div>
    </div>
  );
}