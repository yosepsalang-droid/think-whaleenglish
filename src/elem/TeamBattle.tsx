import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
// 💡 방금 만든 넘버 스나이퍼 컴포넌트 불러오기
import NumberSniper from './NumberSniper'; 

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
  const [roomStatus, setRoomStatus] = useState<'closed' | 'waiting' | 'playing' | 'round_end' | 'result'>('closed');
  
  const [allWords, setAllWords] = useState<Question[]>([]);
  const [books, setBooks] = useState<string[]>([]);
  
  const [selectedBook, setSelectedBook] = useState<string>('');
  const [teamCount, setTeamCount] = useState<number>(2);
  // 💡 게임 모드에 'sniper' 추가
  const [gameMode, setGameMode] = useState<'typing' | 'scramble' | 'ox' | 'sniper'>('typing');
  const [winScore, setWinScore] = useState<number>(3); 
  const [sniperRange, setSniperRange] = useState<number>(40); // 넘버 스나이퍼용 숫자 범위

  const [joinedPlayers, setJoinedPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const [timeLeft, setTimeLeft] = useState<number>(15);
  const roundScoresRef = useRef<Record<number, number>>({}); 
  const [roundScores, setRoundScores] = useState<Record<number, number>>({});
  const [roundResultText, setRoundResultText] = useState<string>('');
  
  const [currentOxData, setCurrentOxData] = useState({ displayKor: '', oxAnswer: 'O' });
  const submitCountRef = useRef(0);
  const playerCountRef = useRef(0);

  const TEAM_COLORS = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];
  const TEAM_NAMES = ['레드 드래곤', '블루 샤크', '그린 타이거', '옐로우 라이온', '퍼플 울프'];

  useEffect(() => {
    playerCountRef.current = joinedPlayers.length;
  }, [joinedPlayers]);

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
        if (newData.players) setJoinedPlayers(newData.players);
      })
      .on('broadcast', { event: 'submit_answer' }, ({ payload }) => {
        if (gameMode === 'sniper') return; // 넘버스나이퍼는 전용 컴포넌트에서 채점 처리함

        submitCountRef.current += 1; 
        
        if (payload.isCorrect) {
          roundScoresRef.current[payload.teamId] = (roundScoresRef.current[payload.teamId] || 0) + 1;
          setRoundScores({ ...roundScoresRef.current }); 
        }

        if (submitCountRef.current >= playerCountRef.current && playerCountRef.current > 0) {
          setTimeLeft(0);
        }
      })
      .subscribe();

    return () => {
      supabase.from('game_rooms').update({ status: 'closed', players: [], game_data: {} }).eq('id', 'main_room');
      supabase.removeChannel(channel);
    };
  }, [gameMode]);

  useEffect(() => {
    if (gameMode === 'sniper') return; // 스나이퍼 모드는 자체 타이머 없음
    if (roomStatus === 'playing' && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    } else if (roomStatus === 'playing' && timeLeft === 0) {
      handleRoundEnd(); 
    }
  }, [roomStatus, timeLeft, gameMode]);

  const handleOpenRoom = async () => {
    if (gameMode !== 'sniper' && !selectedBook) return alert("게임을 진행할 교재를 먼저 선택해주세요!");

    if (gameMode !== 'sniper') {
      let targetWords = selectedBook === 'random' 
        ? [...allWords].sort(() => Math.random() - 0.5).slice(0, 30)
        : allWords.filter(w => (w as any).book === selectedBook).sort(() => Math.random() - 0.5).slice(0, 30);
      
      if (targetWords.length === 0) return alert("해당 교재에 단어가 없습니다.");
      setQuestions(targetWords);
    }
    
    setCurrentIndex(0);

    await supabase.from('game_rooms').update({ 
      status: 'waiting', 
      players: [],
      settings: { teamCount, book: selectedBook, gameMode, winScore, sniperRange }
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

    if (gameMode === 'sniper') {
      // 넘버 스나이퍼 전용 세팅
      setRoomStatus('playing');
      await supabase.from('game_rooms').update({ 
        status: 'playing',
        players: assignedPlayers,
        game_data: { teams: initialTeams, gameMode }
      }).eq('id', 'main_room');
    } else {
      startNewRound(0, initialTeams, assignedPlayers);
    }
  };

  const startNewRound = async (index: number, currentTeams = teams, currentPlayers = joinedPlayers) => {
    roundScoresRef.current = {}; 
    submitCountRef.current = 0; 
    setRoundScores({});
    setTimeLeft(15); 
    setCurrentIndex(index);
    setRoomStatus('playing');

    let oxAnswer = 'O';
    let displayKor = questions[index]?.kor || '';

    if (gameMode === 'ox') {
      if (Math.random() > 0.5) {
        oxAnswer = 'O'; 
      } else {
        oxAnswer = 'X'; 
        const randomWrong = allWords[Math.floor(Math.random() * allWords.length)].kor;
        displayKor = randomWrong;
      }
    }
    setCurrentOxData({ displayKor, oxAnswer });

    await supabase.from('game_rooms').update({ 
      status: 'playing',
      players: currentPlayers,
      game_data: { 
        teams: currentTeams, 
        currentQuestion: questions[index], 
        questionIndex: index,
        gameMode,
        oxAnswer 
      }
    }).eq('id', 'main_room');
  };

  const handleRoundEnd = async () => {
    const scores = roundScoresRef.current;
    let maxScore = -1;
    let winners: number[] = [];

    teams.forEach(t => {
      const s = scores[t.id] || 0;
      if (s > maxScore) { maxScore = s; winners = [t.id]; }
      else if (s === maxScore) { winners.push(t.id); }
    });

    let resultText = "무승부";
    let updatedTeams = [...teams];

    if (winners.length === 1 && maxScore > 0) {
       const winnerTeam = teams.find(t => t.id === winners[0]);
       resultText = `${winnerTeam?.name} 승리! (+1점 획득)`;
       updatedTeams = updatedTeams.map(t => t.id === winners[0] ? { ...t, score: t.score + 1 } : t);
    } else if (maxScore === 0) {
       resultText = "아무도 정답을 맞히지 못했습니다!";
    } else {
       resultText = "앗, 동점입니다! (승점 획득 실패)";
    }

    setTeams(updatedTeams);
    setRoundResultText(resultText);
    setRoomStatus('round_end');

    await supabase.from('game_rooms').update({ 
      status: 'round_end',
      game_data: { 
        teams: updatedTeams, 
        currentQuestion: questions[currentIndex], 
        gameMode,
        roundResultText: resultText
      }
    }).eq('id', 'main_room');
  };

  const handleNextRoundAction = async () => {
    const isGameOver = teams.some(t => t.score >= winScore);
    
    if (isGameOver) {
      setRoomStatus('result');
      await supabase.from('game_rooms').update({ status: 'result' }).eq('id', 'main_room');
    } else if (currentIndex + 1 < questions.length) {
      startNewRound(currentIndex + 1);
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
      <button onClick={handleForceClose} style={{ position: 'absolute', top: '20px', left: '20px', background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', zIndex: 10 }}>나가기 (방 폭파)</button>

      {roomStatus === 'closed' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflowY: 'auto', padding: '40px 0' }}>
          <h1 style={{ fontSize: '50px', fontWeight: '900', color: '#fde047', marginBottom: '40px' }}>⚔️ 교실 대난투 : 팀 배틀 생성 ⚔️</h1>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '25px', backgroundColor: 'rgba(255,255,255,0.1)', padding: '40px', borderRadius: '32px', width: '800px' }}>
            
            <div>
              <h2 style={{ fontSize: '20px', marginBottom: '10px', color: '#94a3b8' }}>1. 게임 모드 선택</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <button onClick={() => setGameMode('typing')} style={{ padding: '20px', fontSize: '20px', fontWeight: 'bold', borderRadius: '16px', border: gameMode === 'typing' ? '4px solid #4ade80' : 'none', cursor: 'pointer', backgroundColor: gameMode === 'typing' ? '#166534' : '#334155', color: 'white' }}>⌨️ 스피드 타자 왕</button>
                <button onClick={() => setGameMode('scramble')} style={{ padding: '20px', fontSize: '20px', fontWeight: 'bold', borderRadius: '16px', border: gameMode === 'scramble' ? '4px solid #60a5fa' : 'none', cursor: 'pointer', backgroundColor: gameMode === 'scramble' ? '#1e3a8a' : '#334155', color: 'white' }}>🌪️ 알파벳 스크램블</button>
                <button onClick={() => setGameMode('ox')} style={{ padding: '20px', fontSize: '20px', fontWeight: 'bold', borderRadius: '16px', border: gameMode === 'ox' ? '4px solid #f87171' : 'none', cursor: 'pointer', backgroundColor: gameMode === 'ox' ? '#7f1d1d' : '#334155', color: 'white' }}>⭕❌ OX 텔레파시</button>
                <button onClick={() => setGameMode('sniper')} style={{ padding: '20px', fontSize: '20px', fontWeight: 'bold', borderRadius: '16px', border: gameMode === 'sniper' ? '4px solid #c084fc' : 'none', cursor: 'pointer', backgroundColor: gameMode === 'sniper' ? '#6b21a8' : '#334155', color: 'white' }}>🎯 넘버 스나이퍼</button>
              </div>
            </div>

            {gameMode !== 'sniper' ? (
              <>
                <div>
                  <h2 style={{ fontSize: '20px', marginBottom: '10px', color: '#94a3b8' }}>2. 승리 조건 (세트 스코어)</h2>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    {[3, 5, 10].map(score => (
                      <button key={score} onClick={() => setWinScore(score)} style={{ flex: 1, padding: '15px', fontSize: '20px', fontWeight: 'bold', borderRadius: '12px', border: 'none', cursor: 'pointer', backgroundColor: winScore === score ? '#a855f7' : '#334155', color: 'white' }}>{score}세트 승리</button>
                    ))}
                  </div>
                </div>
                <div>
                  <h2 style={{ fontSize: '20px', marginBottom: '10px', color: '#94a3b8' }}>3. 출제 교재 선택</h2>
                  <select value={selectedBook} onChange={e => setSelectedBook(e.target.value)} style={{ width: '100%', padding: '15px', fontSize: '20px', borderRadius: '12px', fontWeight: 'bold', outline: 'none', cursor: 'pointer', backgroundColor: '#fff', color: '#111' }}>
                    <option value="">교재를 선택하세요</option>
                    <option value="random">🌟 모든 단어 전체 랜덤</option>
                    {books.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
              </>
            ) : (
              <div>
                <h2 style={{ fontSize: '20px', marginBottom: '10px', color: '#c084fc' }}>2. 숫자 범위 설정 (넘버 스나이퍼)</h2>
                <div style={{ display: 'flex', gap: '12px' }}>
                  {[20, 30, 40, 50].map(range => (
                    <button key={range} onClick={() => setSniperRange(range)} style={{ flex: 1, padding: '15px', fontSize: '20px', fontWeight: 'bold', borderRadius: '12px', border: 'none', cursor: 'pointer', backgroundColor: sniperRange === range ? '#a855f7' : '#334155', color: 'white' }}>1 ~ {range}까지</button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h2 style={{ fontSize: '20px', marginBottom: '10px', color: '#94a3b8' }}>{gameMode === 'sniper' ? '3' : '4'}. 팀 개수 선택</h2>
              <div style={{ display: 'flex', gap: '12px' }}>
                {[2, 3, 4].map(num => (
                  <button key={num} onClick={() => setTeamCount(num)} style={{ flex: 1, padding: '15px', fontSize: '20px', fontWeight: 'bold', borderRadius: '12px', border: 'none', cursor: 'pointer', backgroundColor: teamCount === num ? '#10b981' : '#334155', color: 'white' }}>{num}팀전</button>
                ))}
              </div>
            </div>

            <button onClick={handleOpenRoom} style={{ marginTop: '10px', width: '100%', padding: '24px', fontSize: '28px', fontWeight: '900', backgroundColor: '#f59e0b', color: 'white', border: 'none', borderRadius: '20px', cursor: 'pointer', boxShadow: '0 8px 0 #b45309' }}>📡 게임 방 열고 아이들 소집하기!</button>
          </div>
        </div>
      )}

      {roomStatus === 'waiting' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '80px' }}>
          <div style={{ fontSize: '80px', animation: 'bounce 1s infinite' }}>🚨</div>
          <h1 style={{ fontSize: '40px', fontWeight: '900', color: '#4ade80', marginBottom: '10px' }}>학생들의 태블릿에 입장 버튼이 나타났습니다!</h1>
          <p style={{ fontSize: '20px', color: '#94a3b8', marginBottom: '30px' }}>
            선택된 게임: {gameMode === 'sniper' ? `🎯 넘버 스나이퍼 (1~${sniperRange})` : gameMode === 'ox' ? '⭕❌ OX 텔레파시' : '영어 배틀'}
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', justifyContent: 'center', width: '900px', minHeight: '250px', backgroundColor: 'rgba(255,255,255,0.05)', padding: '30px', borderRadius: '24px' }}>
            {joinedPlayers.length === 0 ? (
              <div style={{ fontSize: '24px', color: '#64748b', display: 'flex', alignItems: 'center' }}>학생들의 접속을 기다리는 중... ⏳</div>
            ) : (
              joinedPlayers.map(p => (
                <div key={p.student_id} style={{ padding: '12px 24px', fontSize: '24px', fontWeight: 'bold', backgroundColor: '#3b82f6', borderRadius: '16px', animation: 'popUp 0.3s ease-out' }}>{p.name}</div>
              ))
            )}
          </div>

          <div style={{ marginTop: '40px', display: 'flex', gap: '20px', alignItems: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>현재 인원: <span style={{ color: '#fde047', fontSize: '32px' }}>{joinedPlayers.length}</span>명</div>
            <button onClick={handleStartGame} style={{ marginLeft: '30px', padding: '20px 50px', fontSize: '28px', fontWeight: '900', backgroundColor: '#ec4899', color: 'white', border: 'none', borderRadius: '20px', cursor: 'pointer', boxShadow: '0 8px 0 #be185d' }}>배틀 시작! 🚀</button>
          </div>
        </div>
      )}

      {/* 💡 넘버 스나이퍼 모드일 때만 외부 컴포넌트 렌더링 */}
      {roomStatus === 'playing' && gameMode === 'sniper' && (
        <NumberSniper 
          teams={teams} 
          players={joinedPlayers} 
          maxNumber={sniperRange}
          onGameEnd={handleForceClose}
        />
      )}

      {/* 기존 영어 게임용 플레이 화면 */}
      {roomStatus === 'playing' && gameMode !== 'sniper' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', padding: '20px', backgroundColor: 'rgba(0,0,0,0.5)', borderBottom: '4px solid #334155' }}>
            {teams.map((team) => (
              <div key={team.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                <div style={{ fontSize: '24px', fontWeight: '900', color: team.color }}>{team.name}</div>
                <div style={{ fontSize: '40px', fontWeight: '900', color: '#fde047', display: 'flex', gap: '5px' }}>
                  {Array.from({ length: winScore }).map((_, i) => (
                    <span key={i} style={{ opacity: i < team.score ? 1 : 0.2 }}>🏆</span>
                  ))}
                </div>
                <div style={{ marginTop: '10px', fontSize: '20px', fontWeight: 'bold', backgroundColor: '#334155', padding: '8px 16px', borderRadius: '12px' }}>
                  현재 정답: <span style={{ color: '#4ade80', fontSize: '28px' }}>{roundScores[team.id] || 0}</span>명
                </div>
              </div>
            ))}
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '40px' }}>
            <div style={{ fontSize: '120px', fontWeight: '900', color: timeLeft <= 5 ? '#ef4444' : '#fde047', textShadow: '0 10px 30px rgba(0,0,0,0.5)', animation: timeLeft <= 5 ? 'pulse 0.5s infinite' : 'none', marginBottom: '20px' }}>
              ⏳ {timeLeft}초
            </div>
            
            <div style={{ textAlign: 'center' }}>
              {gameMode === 'typing' && (
                <>
                  <div style={{ fontSize: '32px', color: '#94a3b8', marginBottom: '20px' }}>아래 뜻을 보고 영어 단어를 입력하세요!</div>
                  <div style={{ fontSize: '100px', fontWeight: '900', color: 'white' }}>{questions[currentIndex]?.kor}</div>
                </>
              )}
              {gameMode === 'scramble' && (
                <>
                  <div style={{ fontSize: '32px', color: '#94a3b8', marginBottom: '20px' }}>알파벳을 조합하여 올바른 단어를 만드세요!</div>
                  <div style={{ fontSize: '100px', fontWeight: '900', color: 'white', letterSpacing: '10px' }}>
                    {questions[currentIndex]?.eng.split('').sort(() => Math.random() - 0.5).join(' ')}
                  </div>
                  <div style={{ fontSize: '40px', color: '#4ade80', marginTop: '20px' }}>({questions[currentIndex]?.kor})</div>
                </>
              )}
              {gameMode === 'ox' && (
                <>
                  <div style={{ fontSize: '32px', color: '#94a3b8', marginBottom: '20px' }}>단어와