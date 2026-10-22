import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

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

interface NumberSniperProps {
  teams: Team[];
  players: Player[];
  maxNumber: number;
  onGameEnd: () => void;
}

export default function NumberSniper({ teams, players, maxNumber, onGameEnd }: NumberSniperProps) {
  const [phase, setPhase] = useState<'init' | 'hiding' | 'sniping' | 'shooting' | 'game_over'>('init');
  const [alivePlayers, setAlivePlayers] = useState<string[]>(players.map(p => p.student_id));
  const secretNumbersRef = useRef<Record<string, number>>({});
  
  const [timeLeft, setTimeLeft] = useState(10);
  const [currentTurn, setCurrentTurn] = useState<string | null>(null);
  const turnQueueRef = useRef<string[]>([]);
  const shotNumbersRef = useRef<number[]>([]);
  
  const [lastShot, setLastShot] = useState<{ shooter: string, number: number, hits: string[] } | null>(null);
  const [winnerTeam, setWinnerTeam] = useState<Team | null>(null);

  // 1. 게임 초기 세팅 및 타이머 시작
  useEffect(() => {
    const initGame = async () => {
      const initialAlive = players.map(p => p.student_id);
      setAlivePlayers(initialAlive);
      
      await supabase.from('game_rooms').update({ 
        game_data: { 
          gameMode: 'sniper',
          sniperPhase: 'hiding', 
          maxNumber,
          alivePlayers: initialAlive,
          shotNumbers: []
        } 
      }).eq('id', 'main_room');
      setPhase('hiding');
      setTimeLeft(10);
    };
    initGame();

    const channel = supabase.channel('sniper_host_listener')
      .on('broadcast', { event: 'hide_number' }, ({ payload }) => {
        secretNumbersRef.current[payload.studentId] = payload.number;
      })
      .on('broadcast', { event: 'snipe_number' }, ({ payload }) => {
        handleSnipeShot(payload.studentId, payload.studentName, payload.number);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // 2. 10초 카운트다운 타이머 로직
  useEffect(() => {
    if (phase === 'hiding') {
      if (timeLeft > 0) {
        const timer = setTimeout(() => setTimeLeft(prev => prev - 1), 1000);
        return () => clearTimeout(timer);
      } else {
        // 시간 초과 시: 안 고른 아이들은 랜덤 할당 후 게임 시작!
        alivePlayers.forEach(id => {
          if (!secretNumbersRef.current[id]) {
            secretNumbersRef.current[id] = Math.floor(Math.random() * maxNumber) + 1;
          }
        });
        startSnipingRound(alivePlayers);
      }
    }
  }, [phase, timeLeft, alivePlayers, maxNumber]);

  // 3. 저격 라운드 시작 (턴 큐 생성)
  const startSnipingRound = async (currentAlive: string[]) => {
    if (currentAlive.length === 0) return;
    
    // 생존자들로 새로운 랜덤 턴 순서 생성
    const newQueue = [...currentAlive].sort(() => Math.random() - 0.5);
    turnQueueRef.current = newQueue;
    const firstTurn = newQueue[0];
    setCurrentTurn(firstTurn);
    setPhase('sniping');

    await supabase.from('game_rooms').update({ 
      game_data: { 
        gameMode: 'sniper',
        sniperPhase: 'sniping', 
        maxNumber, 
        alivePlayers: currentAlive,
        currentTurn: firstTurn,
        shotNumbers: shotNumbersRef.current
      } 
    }).eq('id', 'main_room');
  };

  // 4. 누군가 저격을 발사했을 때
  const handleSnipeShot = async (shooterId: string, shooterName: string, targetNumber: number) => {
    if (phase !== 'sniping' || shooterId !== currentTurn) return;
    
    setPhase('shooting');
    shotNumbersRef.current.push(targetNumber); // 쏜 번호 기록 (비활성화용)

    const hits: string[] = [];
    alivePlayers.forEach(id => {
      if (secretNumbersRef.current[id] === targetNumber) {
        hits.push(id);
      }
    });

    setLastShot({ shooter: shooterName, number: targetNumber, hits });

    const newAlivePlayers = alivePlayers.filter(id => !hits.includes(id));
    setAlivePlayers(newAlivePlayers);

    await supabase.from('game_rooms').update({ 
      game_data: { 
        gameMode: 'sniper',
        sniperPhase: 'shooting', 
        lastShot: { shooter: shooterName, number: targetNumber, hitCount: hits.length, hitIds: hits },
        alivePlayers: newAlivePlayers,
        shotNumbers: shotNumbersRef.current
      } 
    }).eq('id', 'main_room');

    // 4초간 결과 연출 후 턴 넘기기
    setTimeout(() => {
      processNextTurn(newAlivePlayers, hits);
    }, 4000);
  };

  // 5. 다음 턴 계산 또는 승리 판정
  const processNextTurn = async (currentAlive: string[], hitIds: string[]) => {
    // 1) 승리 판정
    const aliveCountsByTeam: Record<number, number> = {};
    teams.forEach(t => aliveCountsByTeam[t.id] = 0);
    
    currentAlive.forEach(id => {
      const p = players.find(p => p.student_id === id);
      if (p && p.teamId) aliveCountsByTeam[p.teamId]++;
    });

    const activeTeams = teams.filter(t => aliveCountsByTeam[t.id] > 0);

    if (activeTeams.length <= 1) {
      setPhase('game_over');
      setWinnerTeam(activeTeams.length === 1 ? activeTeams[0] : null);
      await supabase.from('game_rooms').update({ 
        game_data: { gameMode: 'sniper', sniperPhase: 'game_over', winner: activeTeams.length === 1 ? activeTeams[0].name : '무승부' } 
      }).eq('id', 'main_room');
      return;
    }

    // 2) 턴 넘기기 로직
    let nextQueue = turnQueueRef.current;
    nextQueue.shift(); // 방금 쏜 사람 제외
    nextQueue = nextQueue.filter(id => !hitIds.includes(id)); // 죽은 사람 차례 삭제

    if (nextQueue.length === 0) {
      // 한 바퀴 다 돌았으면 다시 섞어서 새 라운드
      startSnipingRound(currentAlive);
    } else {
      // 다음 사람 턴 시작
      turnQueueRef.current = nextQueue;
      const nextTurn = nextQueue[0];
      setCurrentTurn(nextTurn);
      setPhase('sniping');

      await supabase.from('game_rooms').update({ 
        game_data: { 
          gameMode: 'sniper',
          sniperPhase: 'sniping', 
          maxNumber, 
          alivePlayers: currentAlive,
          currentTurn: nextTurn,
          shotNumbers: shotNumbersRef.current
        } 
      }).eq('id', 'main_room');
    }
  };

  const readyCount = Object.keys(secretNumbersRef.current).length;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '40px', boxSizing: 'border-box' }}>
      
      {/* 상단 생존자 현황판 */}
      <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: '40px', backgroundColor: 'rgba(0,0,0,0.5)', padding: '20px', borderRadius: '24px' }}>
        {teams.map(team => {
          const teamPlayers = players.filter(p => p.teamId === team.id);
          const aliveCount = teamPlayers.filter(p => alivePlayers.includes(p.student_id)).length;
          return (
            <div key={team.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: aliveCount === 0 ? 0.3 : 1 }}>
              <div style={{ fontSize: '24px', fontWeight: '900', color: team.color }}>{team.name}</div>
              <div style={{ fontSize: '40px', fontWeight: '900' }}>생존: {aliveCount}명</div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                {teamPlayers.map(p => {
                  const isAlive = alivePlayers.includes(p.student_id);
                  return (
                    <span key={p.student_id} style={{ padding: '6px 12px', borderRadius: '8px', backgroundColor: isAlive ? team.color : '#334155', color: isAlive ? 'white' : '#94a3b8', textDecoration: isAlive ? 'none' : 'line-through', fontWeight: 'bold' }}>
                      {p.name}
                    </span>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
        
        {phase === 'hiding' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '100px', fontWeight: '900', color: timeLeft <= 3 ? '#ef4444' : '#fde047', marginBottom: '20px' }}>
              ⏳ {timeLeft}초
            </div>
            <h1 style={{ fontSize: '48px', color: '#4ade80', fontWeight: '900' }}>은폐 모드 진행 중...</h1>
            <p style={{ fontSize: '24px', color: '#94a3b8' }}>태블릿에서 1 ~ {maxNumber} 사이의 비밀 숫자를 선택하세요!</p>
            <div style={{ marginTop: '30px', fontSize: '32px', fontWeight: 'bold' }}>
              준비 완료: <span style={{ color: '#4ade80' }}>{readyCount}</span> / {alivePlayers.length}명
            </div>
          </div>
        )}

        {phase === 'sniping' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '80px', marginBottom: '20px' }}>🎯</div>
            <h1 style={{ fontSize: '48px', color: '#ef4444', fontWeight: '900' }}>저격 모드 활성화!</h1>
            <p style={{ fontSize: '32px', color: '#fde047', marginTop: '20px', fontWeight: '900' }}>
              👉 현재 턴: [{players.find(p => p.student_id === currentTurn)?.name}]
            </p>
          </div>
        )}

        {phase === 'shooting' && lastShot && (
          <div style={{ textAlign: 'center', animation: 'zoomIn 0.5s ease-out' }}>
            <h2 style={{ fontSize: '40px', color: '#fde047' }}>[{lastShot.shooter}]의 저격 발사!</h2>
            <div style={{ fontSize: '150px', fontWeight: '900', color: 'white', textShadow: '0 0 40px #ef4444', margin: '20px 0' }}>
              {lastShot.number}
            </div>
            {lastShot.hits.length > 0 ? (
              <div style={{ fontSize: '50px', color: '#ef4444', fontWeight: '900', animation: 'shake 0.5s' }}>
                💥 명중! {lastShot.hits.length}명 즉사!
              </div>
            ) : (
              <div style={{ fontSize: '50px', color: '#4ade80', fontWeight: '900' }}>
                💨 빗나갔습니다! (생존)
              </div>
            )}
          </div>
        )}

        {phase === 'game_over' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '100px', marginBottom: '20px' }}>🏆</div>
            <h1 style={{ fontSize: '60px', color: '#fde047', fontWeight: '900' }}>게임 종료!</h1>
            <h2 style={{ fontSize: '40px', marginTop: '20px' }}>
              {winnerTeam ? `${winnerTeam.name} 최종 우승!` : '모두 전멸... 무승부!'}
            </h2>
            <button onClick={onGameEnd} style={{ marginTop: '50px', padding: '20px 50px', fontSize: '24px', backgroundColor: '#3b82f6', color: 'white', borderRadius: '16px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>
              메인으로 돌아가기
            </button>
          </div>
        )}

      </div>
      
      <style>{`
        @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }
        @keyframes zoomIn { from { transform: scale(0.5); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-20px); } 75% { transform: translateX(20px); } }
      `}</style>
    </div>
  );
}