import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';

interface TeamBattleProps {
    onBack: () => void;
    tableName?: 'words_mid' | 'words_high' | 'words'; // 💡 'words' 추가!
  }

interface Student {
  student_id: string;
  name: string;
}

interface Team {
  id: number;
  name: string;
  color: string;
  score: number;
  members: Student[];
}

interface Question {
  eng: string;
  kor: string;
}

export default function TeamBattle({ onBack, tableName = 'words_mid' }: TeamBattleProps) {
  const [gameState, setGameState] = useState<'setup' | 'playing' | 'result'>('setup');
  
  // 1. 세팅 관련 상태
  const [allWords, setAllWords] = useState<any[]>([]);
  const [books, setBooks] = useState<string[]>([]);
  const [selectedBook, setSelectedBook] = useState<string>('');
  
  const [students, setStudents] = useState<Student[]>([]);
  const [presentStudents, setPresentStudents] = useState<Student[]>([]);
  const [teamCount, setTeamCount] = useState<number>(2);
  const [teams, setTeams] = useState<Team[]>([]);
  
  // 2. 게임 진행 관련 상태
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);

  // 🎨 팀 컬러 프리셋
  const TEAM_COLORS = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];
  const TEAM_NAMES = ['레드 드래곤', '블루 샤크', '그린 타이거', '옐로우 라이온', '퍼플 울프'];

  // 💡 데이터 불러오기 (단어장 & 학생 목록)
  useEffect(() => {
    const fetchData = async () => {
      // 1. 단어장 교재 목록 불러오기
      const { data: wordData } = await supabase.from(tableName).select('book, eng, kor');
      if (wordData) {
        setAllWords(wordData);
        const uniqueBooks = Array.from(new Set(wordData.map(w => w.book))).sort() as string[];
        setBooks(uniqueBooks);
      }
      
      // 2. 학생 목록 불러오기 (임시 또는 실제 DB)
      const { data: studentData } = await supabase.from('students').select('student_id, name');
      if (studentData) {
        setStudents(studentData);
      } else {
        // DB 연결 전 테스트용 가짜 데이터
        setStudents([
          { student_id: '1', name: '김민준' }, { student_id: '2', name: '이서연' },
          { student_id: '3', name: '박도윤' }, { student_id: '4', name: '최지우' },
          { student_id: '5', name: '정하준' }, { student_id: '6', name: '강서아' },
          { student_id: '7', name: '조은우' }, { student_id: '8', name: '윤지아' }
        ]);
      }
    };
    fetchData();
  }, [tableName]);

  // 💡 출석한 학생 토글
  const toggleStudent = (student: Student) => {
    if (presentStudents.find(s => s.student_id === student.student_id)) {
      setPresentStudents(prev => prev.filter(s => s.student_id !== student.student_id));
    } else {
      setPresentStudents(prev => [...prev, student]);
    }
  };

  // 💡 랜덤 팀 셔플 로직
  const generateTeams = () => {
    if (presentStudents.length < teamCount) {
      return alert(`학생 수가 팀 수(${teamCount}개)보다 적습니다!`);
    }

    // 학생 목록 랜덤하게 섞기
    const shuffled = [...presentStudents].sort(() => Math.random() - 0.5);
    
    const newTeams: Team[] = Array.from({ length: teamCount }).map((_, i) => ({
      id: i + 1,
      name: TEAM_NAMES[i],
      color: TEAM_COLORS[i],
      score: 0,
      members: []
    }));

    // 지그재그로 팀 배정 (인원수 공평하게 분배)
    shuffled.forEach((student, index) => {
      newTeams[index % teamCount].members.push(student);
    });

    setTeams(newTeams);
  };

  // 💡 게임 시작 로직
  const handleStartGame = () => {
    if (teams.length === 0) return alert("팀을 먼저 생성해주세요!");
    
    let targetWords = [];
    if (selectedBook === 'random') {
      targetWords = [...allWords].sort(() => Math.random() - 0.5).slice(0, 30);
    } else if (selectedBook) {
      targetWords = allWords.filter(w => w.book === selectedBook).sort(() => Math.random() - 0.5).slice(0, 30);
    } else {
      return alert("교재를 선택해주세요!");
    }

    if (targetWords.length === 0) return alert("해당 교재에 단어가 없습니다.");

    setQuestions(targetWords);
    setCurrentIndex(0);
    setShowAnswer(false);
    setGameState('playing');
  };

  // 💡 점수 부여 및 다음 문제 이동
  const awardPoints = (teamIndex: number) => {
    const newTeams = [...teams];
    newTeams[teamIndex].score += 10;
    setTeams(newTeams);

    // 정답을 맞춘 팀을 위해 시각적 효과 부여
    const audio = new Audio('https://www.myinstants.com/media/sounds/correct.mp3'); // 정답 효과음 (테스트용)
    audio.play().catch(() => {});

    setTimeout(() => {
      if (currentIndex + 1 < questions.length) {
        setCurrentIndex(prev => prev + 1);
        setShowAnswer(false);
      } else {
        setGameState('result');
      }
    }, 1500);
  };

  const handleSkip = () => {
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex(prev => prev + 1);
      setShowAnswer(false);
    } else {
      setGameState('result');
    }
  };

  // 💡 TV 출력용 거대 폰트 설정
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: '#0f172a', color: 'white', display: 'flex', flexDirection: 'column', fontFamily: 'Pretendard, sans-serif', zIndex: 3000, overflow: 'hidden' }}>
      
      {/* 뒤로 가기 (숨김 처리 가능) */}
      <button onClick={onBack} style={{ position: 'absolute', top: '20px', left: '20px', background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', zIndex: 10 }}>나가기</button>

      {/* ==================== 1. 게임 세팅 화면 ==================== */}
      {gameState === 'setup' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '60px', alignItems: 'center', justifyContent: 'center' }}>
          <h1 style={{ fontSize: '64px', fontWeight: '900', color: '#fde047', marginBottom: '40px', textShadow: '0 4px 10px rgba(0,0,0,0.5)' }}>⚔️ 교실 대난투 : 팀 배틀 ⚔️</h1>
          
          <div style={{ display: 'flex', gap: '40px', width: '100%', maxWidth: '1400px' }}>
            
            {/* 왼쪽: 출석 인원 및 교재 선택 */}
            <div style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', padding: '40px', borderRadius: '32px' }}>
              <h2 style={{ fontSize: '32px', marginBottom: '20px' }}>1. 오늘 출석한 아이들 ({presentStudents.length}명)</h2>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '40px', maxHeight: '200px', overflowY: 'auto' }}>
                {students.map(s => {
                  const isPresent = presentStudents.some(ps => ps.student_id === s.student_id);
                  return (
                    <button 
                      key={s.student_id} onClick={() => toggleStudent(s)}
                      style={{ padding: '12px 24px', fontSize: '20px', borderRadius: '16px', border: 'none', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s',
                        backgroundColor: isPresent ? '#3b82f6' : '#334155', color: isPresent ? 'white' : '#94a3b8'
                      }}
                    >
                      {s.name}
                    </button>
                  )
                })}
              </div>

              <h2 style={{ fontSize: '32px', marginBottom: '20px' }}>2. 팀 개수 선택</h2>
              <div style={{ display: 'flex', gap: '16px', marginBottom: '40px' }}>
                {[2, 3, 4].map(num => (
                  <button key={num} onClick={() => setTeamCount(num)} style={{ flex: 1, padding: '20px', fontSize: '24px', fontWeight: 'bold', borderRadius: '16px', border: 'none', cursor: 'pointer', backgroundColor: teamCount === num ? '#10b981' : '#334155', color: 'white' }}>{num}팀전</button>
                ))}
              </div>

              <button onClick={generateTeams} style={{ width: '100%', padding: '24px', fontSize: '32px', fontWeight: '900', backgroundColor: '#f59e0b', color: 'white', border: 'none', borderRadius: '20px', cursor: 'pointer', boxShadow: '0 10px 0 #b45309' }}>
                🎲 랜덤 팀 생성하기!
              </button>
            </div>

            {/* 오른쪽: 팀 확인 및 게임 시작 */}
            <div style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', padding: '40px', borderRadius: '32px', display: 'flex', flexDirection: 'column' }}>
              <h2 style={{ fontSize: '32px', marginBottom: '20px' }}>3. 팀 편성 결과</h2>
              <div style={{ display: 'flex', gap: '20px', flex: 1, marginBottom: '40px' }}>
                {teams.length === 0 ? (
                  <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '24px', color: '#94a3b8' }}>왼쪽에서 팀을 생성해주세요!</div>
                ) : (
                  teams.map(team => (
                    <div key={team.id} style={{ flex: 1, backgroundColor: 'white', color: 'black', borderRadius: '24px', padding: '20px', borderTop: `16px solid ${team.color}`, boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
                      <h3 style={{ fontSize: '28px', margin: '0 0 20px 0', textAlign: 'center', color: team.color }}>{team.name}</h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
                        {team.members.map(m => <div key={m.student_id} style={{ fontSize: '24px', fontWeight: 'bold' }}>{m.name}</div>)}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div style={{ display: 'flex', gap: '20px' }}>
                <select value={selectedBook} onChange={e => setSelectedBook(e.target.value)} style={{ flex: 1, padding: '20px', fontSize: '24px', borderRadius: '16px', fontWeight: 'bold', outline: 'none' }}>
                  <option value="">교재를 선택하세요</option>
                  <option value="random">🌟 모든 단어 전체 랜덤</option>
                  {books.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
                <button onClick={handleStartGame} style={{ padding: '20px 40px', fontSize: '32px', fontWeight: '900', backgroundColor: '#ec4899', color: 'white', border: 'none', borderRadius: '20px', cursor: 'pointer', boxShadow: '0 10px 0 #be185d' }}>
                  배틀 시작! 🚀
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ==================== 2. 게임 플레이 화면 (메인 모니터용) ==================== */}
      {gameState === 'playing' && questions.length > 0 && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          
          {/* 상단: 팀별 점수 전광판 */}
          <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', padding: '30px', backgroundColor: 'rgba(0,0,0,0.5)', borderBottom: '4px solid #334155' }}>
            {teams.map((team, idx) => (
              <div key={team.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ fontSize: '32px', fontWeight: '900', color: team.color, marginBottom: '10px' }}>{team.name}</div>
                <div style={{ fontSize: '80px', fontWeight: '900', textShadow: '0 4px 20px rgba(0,0,0,0.5)', fontFamily: 'monospace' }}>{team.score}</div>
                
                {/* 💡 선생님이 누르는 정답 스위치 */}
                <button 
                  onClick={() => awardPoints(idx)}
                  style={{ marginTop: '20px', padding: '16px 32px', fontSize: '24px', fontWeight: 'bold', backgroundColor: team.color, color: 'white', border: 'none', borderRadius: '16px', cursor: 'pointer', boxShadow: '0 8px 0 rgba(0,0,0,0.3)' }}
                  onMouseDown={e => e.currentTarget.style.transform = 'translateY(8px)'}
                  onMouseUp={e => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  {team.name} 정답!
                </button>
              </div>
            ))}
          </div>

          {/* 중앙: 문제 표시 영역 */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '40px' }}>
            <div style={{ fontSize: '36px', color: '#94a3b8', fontWeight: 'bold', marginBottom: '40px' }}>Round {currentIndex + 1} / {questions.length}</div>
            
            {/* 문제 (한글 뜻) */}
            <div style={{ fontSize: '100px', fontWeight: '900', textAlign: 'center', wordBreak: 'keep-all', color: 'white', textShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
              {questions[currentIndex].kor}
            </div>

            {/* 정답 (영어 스펠링) - 버튼 누르기 전까진 ????? 로 가려짐 */}
            <div style={{ marginTop: '60px', minHeight: '150px' }}>
              {showAnswer ? (
                <div style={{ fontSize: '120px', fontWeight: '900', color: '#4ade80', letterSpacing: '4px', animation: 'popUp 0.5s ease-out' }}>
                  {questions[currentIndex].eng}
                </div>
              ) : (
                <button 
                  onClick={() => setShowAnswer(true)} 
                  style={{ fontSize: '40px', padding: '30px 60px', backgroundColor: 'transparent', color: '#fde047', border: '6px dashed #fde047', borderRadius: '32px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  클릭해서 정답 스펠링 확인 👀
                </button>
              )}
            </div>
          </div>

          {/* 하단: 패스 버튼 */}
          <div style={{ padding: '30px', display: 'flex', justifyContent: 'center' }}>
            <button onClick={handleSkip} style={{ padding: '20px 60px', fontSize: '28px', backgroundColor: '#334155', color: 'white', border: 'none', borderRadius: '16px', fontWeight: 'bold', cursor: 'pointer' }}>
              아무도 못 맞혔어요 (Pass) ⏭️
            </button>
          </div>
        </div>
      )}

      {/* ==================== 3. 결과 발표 화면 ==================== */}
      {gameState === 'result' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '60px' }}>
          <div style={{ fontSize: '120px', marginBottom: '20px', animation: 'bounce 1s infinite' }}>🏆</div>
          <h1 style={{ fontSize: '80px', fontWeight: '900', color: '#fde047', marginBottom: '60px', textShadow: '0 4px 20px rgba(0,0,0,0.5)' }}>최종 결과 발표!</h1>
          
          <div style={{ display: 'flex', gap: '40px', alignItems: 'flex-end', height: '400px' }}>
            {/* 점수순 정렬 후 단상(시상대) 형태로 표시 */}
            {[...teams].sort((a, b) => b.score - a.score).map((team, idx) => (
              <div key={team.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ fontSize: '48px', fontWeight: '900', marginBottom: '20px' }}>{team.score}점</div>
                <div style={{ width: '250px', height: `${300 - (idx * 60)}px`, backgroundColor: team.color, borderRadius: '24px 24px 0 0', display: 'flex', justifyContent: 'center', paddingTop: '30px', boxShadow: '0 -10px 30px rgba(0,0,0,0.5)' }}>
                  <span style={{ fontSize: '40px', fontWeight: '900', color: 'white' }}>{idx + 1}등</span>
                </div>
                <div style={{ fontSize: '32px', fontWeight: 'bold', marginTop: '20px' }}>{team.name}</div>
              </div>
            ))}
          </div>

          <button onClick={() => setGameState('setup')} style={{ marginTop: '80px', padding: '24px 60px', fontSize: '32px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '20px', fontWeight: '900', cursor: 'pointer' }}>
            새로운 게임 시작 🔄
          </button>
        </div>
      )}
      
      <style>{`
        @keyframes popUp { 0% { transform: scale(0.5); opacity: 0; } 50% { transform: scale(1.1); } 100% { transform: scale(1); opacity: 1; } }
        @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-30px); } }
      `}</style>
    </div>
  );
}