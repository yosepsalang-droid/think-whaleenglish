import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface TeamBattleProps {
  onBack: () => void;
  tableName?: 'words_mid' | 'words_high' | 'words';
}

interface Player {
  student_id: string;
  name: string;
  teamId?: number;
}

interface Team {
  id: number;
  name: string;
  color: string;
  score: number;
}

interface Question {
  eng: string;
  kor: string;
}

export default function TeamBattle({ onBack, tableName = 'words' }: TeamBattleProps) {
  const [roomStatus, setRoomStatus] = useState<'closed' | 'waiting' | 'playing' | 'result'>('closed');
  
  const [allWords, setAllWords] = useState<Question[]>([]);
  const [books, setBooks] = useState<string[]>([]);
  const [selectedBook, setSelectedBook] = useState<string>('');
  const [teamCount, setTeamCount] = useState<number>(2);

  const [joinedPlayers, setJoinedPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const TEAM_COLORS = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];
  const TEAM_NAMES = ['레드 드래곤', '블루 샤크', '그린 타이거', '옐로우 라이온', '퍼플 울프'];

  useEffect(() => {
    const fetchWords = async () => {
      const { data } = await supabase.from(tableName).select('book, eng, kor');
      if (data) {
        setAllWords(data);
        const uniqueBooks = Array.from(new Set(data.map(w => w.book))).sort() as string[];
        setBooks(uniqueBooks);
      }
    };
    fetchWords();
  }, [tableName]);

  useEffect(() => {
    supabase.from('game_rooms').update({ status: 'closed', players: [], game_data: {} }).eq('id', 'main_room');

    const channel = supabase.channel('main_room_host')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'game_rooms', filter: 'id=eq.main_room' }, (payload) => {
        const newData = payload.new;
        if (newData.players) {
          setJoinedPlayers(newData.players);
        }
        if (newData.game_data && newData.game_data.teams) {
          setTeams(newData.game_data.teams);
        }
      })
      .subscribe();

    return () => {
      supabase.from('game_rooms').update({ status: 'closed', players: [], game_data: {} }).eq('id', 'main_room');
      supabase.removeChannel(channel);
    };
  }, []);

  const handleOpenRoom = async () => {
    if (!selectedBook) return alert("게임을 진행할 교재를 먼저 선택해주세요!");

    let targetWords = selectedBook === 'random' 
      ? [...allWords].sort(() => Math.random() - 0.5).slice(0, 30)
      : allWords.filter(w => (w as any).book === selectedBook).sort(() => Math.random() - 0.5).slice(0, 30);
    
    if (targetWords.length === 0) return alert("해당 교재에 단어가 없습니다.");
    
    setQuestions(targetWords);
    setCurrentIndex(0);

    await supabase.from('game_rooms').update({ 
      status: 'waiting', 
      players: [],
      settings: { teamCount, book: selectedBook }
    }).eq('id', 'main_room');

    setRoomStatus('waiting');
  };

  const handleStartGame = async () => {
    if (joinedPlayers.length < teamCount) return alert(`최소 ${teamCount}명 이상의 학생이 접속해야 합니다!`);

    const initialTeams: Team[] = Array.from({ length: teamCount }).map((_, i) => ({
      id: i + 1, name: TEAM_NAMES[i], color: TEAM_COLORS[i], score: 0
    }));

    const shuffledPlayers = [...joinedPlayers].sort(() => Math.random() - 0.5);
    const assignedPlayers = shuffledPlayers.map((p, index) => ({
      ...p,
      teamId: initialTeams[index % teamCount].id
    }));

    setTeams(initialTeams);
    setJoinedPlayers(assignedPlayers);

    await supabase.from('game_rooms').update({ 
      status: 'playing',
      players: assignedPlayers,
      game_data: { 
        teams: initialTeams, 
        currentQuestion: questions[0], // 💡 [에러 해결!] targetWords[0]을 questions[0]으로 변경했습니다.
        questionIndex: 0 
      }
    }).eq('id', 'main_room');

    setRoomStatus('playing');
  };

  const handleNextQuestion = async () => {
    const nextIdx = currentIndex + 1;
    if (nextIdx < questions.length) {
      setCurrentIndex(nextIdx);
      await supabase.from('game_rooms').update({ 
        game_data: { teams, currentQuestion: questions[nextIdx], questionIndex: nextIdx } 
      }).eq('id', 'main_room');
    } else {
      setRoomStatus('result');
      await supabase.from('game_rooms').update({ status: 'result' }).eq('id', 'main_room');
    }
  };

  const handleForceClose = async () => {
    await supabase.from('game_rooms').update({ status: 'closed', players: [], game_data: {} }).eq('id', 'main_room');
    onBack();
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: '#0f172a', color: 'white', display: 'flex', flexDirection: 'column', fontFamily: 'Pretendard, sans-serif', zIndex: 3000 }}>
      
      <button onClick={handleForceClose} style={{ position: 'absolute', top: '20px', left: '20px', background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', zIndex: 10 }}>
        나가기 (방 폭파)
      </button>

      {roomStatus === 'closed' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <h1 style={{ fontSize: '64px', fontWeight: '900', color: '#fde047', marginBottom: '60px' }}>⚔️ 교실 대난투 : 팀 배틀 생성 ⚔️</h1>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '30px', backgroundColor: 'rgba(255,255,255,0.1)', padding: '50px', borderRadius: '32px', width: '800px' }}>
            <div>
              <h2 style={{ fontSize: '24px', marginBottom: '15px' }}>1. 팀 개수 선택</h2>
              <div style={{ display: 'flex', gap: '16px' }}>
                {[2, 3, 4].map(num => (
                  <button key={num} onClick={() => setTeamCount(num)} style={{ flex: 1, padding: '20px', fontSize: '24px', fontWeight: 'bold', borderRadius: '16px', border: 'none', cursor: 'pointer', backgroundColor: teamCount === num ? '#10b981' : '#334155', color: 'white' }}>{num}팀전</button>
                ))}
              </div>
            </div>

            <div>
              <h2 style={{ fontSize: '24px', marginBottom: '15px' }}>2. 출제 교재 선택</h2>
              <select value={selectedBook} onChange={e => setSelectedBook(e.target.value)} style={{ width: '100%', padding: '20px', fontSize: '24px', borderRadius: '16px', fontWeight: 'bold', outline: 'none', cursor: 'pointer' }}>
                <option value="">교재를 선택하세요</option>
                <option value="random">🌟 모든 단어 전체 랜덤</option>
                {books.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>

            <button onClick={handleOpenRoom} style={{ marginTop: '20px', width: '100%', padding: '24px', fontSize: '32px', fontWeight: '900', backgroundColor: '#f59e0b', color: 'white', border: 'none', borderRadius: '20px', cursor: 'pointer', boxShadow: '0 10px 0 #b45309' }}>
              📡 게임 방 열고 아이들 소집하기!
            </button>
          </div>
        </div>
      )}

      {roomStatus === 'waiting' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '80px' }}>
          <div style={{ fontSize: '100px', animation: 'bounce 1s infinite' }}>🚨</div>
          <h1 style={{ fontSize: '50px', fontWeight: '900', color: '#4ade80', marginBottom: '10px' }}>학생들의 태블릿에 입장 버튼이 나타났습니다!</h1>
          <p style={{ fontSize: '24px', color: '#94a3b8', marginBottom: '50px' }}>태블릿에서 [입장하기]를 누르면 아래에 이름이 나타납니다.</p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', justifyContent: 'center', width: '1000px', minHeight: '300px', backgroundColor: 'rgba(255,255,255,0.05)', padding: '40px', borderRadius: '32px' }}>
            {joinedPlayers.length === 0 ? (
              <div style={{ fontSize: '30px', color: '#64748b', display: 'flex', alignItems: 'center' }}>학생들의 접속을 기다리는 중... ⏳</div>
            ) : (
              joinedPlayers.map(p => (
                <div key={p.student_id} style={{ padding: '15px 30px', fontSize: '28px', fontWeight: 'bold', backgroundColor: '#3b82f6', borderRadius: '20px', animation: 'popUp 0.3s ease-out' }}>
                  {p.name}
                </div>
              ))
            )}
          </div>

          <div style={{ marginTop: '50px', display: 'flex', gap: '20px', alignItems: 'center' }}>
            <div style={{ fontSize: '30px', fontWeight: 'bold' }}>현재 접속 인원: <span style={{ color: '#fde047', fontSize: '40px' }}>{joinedPlayers.length}</span>명</div>
            <button onClick={handleStartGame} style={{ marginLeft: '40px', padding: '20px 60px', fontSize: '36px', fontWeight: '900', backgroundColor: '#ec4899', color: 'white', border: 'none', borderRadius: '24px', cursor: 'pointer', boxShadow: '0 10px 0 #be185d' }}>
              팀 랜덤 배정 및 배틀 시작! 🚀
            </button>
          </div>
        </div>
      )}

      {roomStatus === 'playing' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', padding: '30px', backgroundColor: 'rgba(0,0,0,0.5)', borderBottom: '4px solid #334155' }}>
            {teams.map((team) => (
              <div key={team.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ fontSize: '32px', fontWeight: '900', color: team.color }}>{team.name}</div>
                <div style={{ fontSize: '80px', fontWeight: '900', textShadow: `0 4px 20px ${team.color}80`, fontFamily: 'monospace' }}>{team.score}</div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                  {joinedPlayers.filter(p => p.teamId === team.id).map(p => (
                    <span key={p.student_id} style={{ fontSize: '16px', backgroundColor: 'rgba(255,255,255,0.2)', padding: '4px 8px', borderRadius: '8px' }}>{p.name}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '40px' }}>
            <div style={{ fontSize: '36px', color: '#94a3b8', fontWeight: 'bold', marginBottom: '40px' }}>Round {currentIndex + 1} / {questions.length}</div>
            
            <div style={{ fontSize: '100px', fontWeight: '900', textAlign: 'center', wordBreak: 'keep-all', color: 'white', textShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
              {questions[currentIndex]?.kor}
            </div>

            <div style={{ fontSize: '30px', color: '#fde047', marginTop: '60px', fontWeight: 'bold', animation: 'pulse 1.5s infinite' }}>
              📱 각자의 태블릿에서 정답을 입력하세요!
            </div>
          </div>

          <div style={{ padding: '30px', display: 'flex', justifyContent: 'center' }}>
            <button onClick={handleNextQuestion} style={{ padding: '20px 60px', fontSize: '28px', backgroundColor: '#334155', color: 'white', border: 'none', borderRadius: '16px', fontWeight: 'bold', cursor: 'pointer' }}>
              다음 문제로 넘어가기 ⏭️
            </button>
          </div>
        </div>
      )}

      {roomStatus === 'result' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ fontSize: '120px', marginBottom: '20px', animation: 'bounce 1s infinite' }}>🏆</div>
          <h1 style={{ fontSize: '80px', fontWeight: '900', color: '#fde047', marginBottom: '60px' }}>최종 결과 발표!</h1>
          
          <div style={{ display: 'flex', gap: '40px', alignItems: 'flex-end', height: '400px' }}>
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

          <button onClick={handleForceClose} style={{ marginTop: '80px', padding: '24px 60px', fontSize: '32px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '20px', fontWeight: '900', cursor: 'pointer' }}>
            대기실 닫기 및 메인으로
          </button>
        </div>
      )}

      <style>{`
        @keyframes popUp { 0% { transform: scale(0.5); opacity: 0; } 50% { transform: scale(1.1); } 100% { transform: scale(1); opacity: 1; } }
        @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-30px); } }
        @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }
      `}</style>
    </div>
  );
}