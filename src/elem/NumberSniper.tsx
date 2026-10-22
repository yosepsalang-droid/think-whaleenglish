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
  const [timeLeft, setTimeLeft] = useState(10);
  const [currentTurn, setCurrentTurn] = useState<string | null>(null);
  const [lastShot, setLastShot] = useState<{ shooter: string, number: number, hits: string[] } | null>(null);
  const [winnerTeam, setWinnerTeam] = useState<Team | null>(null);
  
  // 💡 [준비 완료 인원 화면 표시용 상태]
  const [readyCount, setReadyCount] = useState(0);

  const phaseRef = useRef(phase);
  const alivePlayersRef = useRef(alivePlayers);
  const currentTurnRef = useRef(currentTurn);
  
  const secretNumbersRef = useRef<Record<string, number>>({});
  const turnQueueRef = useRef<string[]>([]);
  const shotNumbersRef = useRef<number[]>([]);

  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { alivePlayersRef.current = alivePlayers; }, [alivePlayers]);
  useEffect(() => { currentTurnRef.current = currentTurn; }, [currentTurn]);

  // 1. 게임 초기 세팅 및 안테나 장착
  useEffect(() => {
    const initGame = async () => {
      const initialAlive = players.map(p => p.student_id);
      setAlivePlayers(initialAlive);
      secretNumbersRef.current = {};
      setReadyCount(0);
      
      await supabase.from('game_rooms').update({ 
        game_data: { 
          gameMode: 'sniper',
          sniperPhase: 'hiding', 
          maxNumber,
          teams,
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
        // 💡 [핵심 해결] 학생이 번호를 숨기면 즉시 기록하고 카운트를 화면에 반영합니다!
        secretNumbersRef.current[payload.studentId] = payload.number;
        const currentReady = Object.keys(secretNumbersRef.current).length;
        setReadyCount(currentReady);

        // 만약 모든 생존자가 숫자를 다 숨겼다면 타이머를 기다리지 않고 즉시 저격 모드로 돌입!
        if (phaseRef.current === 'hiding' && currentReady >= alivePlayersRef.current.length) {
          startSnipingRound(alivePlayersRef.current);
        }
      })
      .on('broadcast', { event: 'snipe_number' }, ({ payload }) => {
        handleSnipeShot(payload.studentId, payload.studentName, payload.number);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [maxNumber, players, teams]);

  // 2. 10초 카운트다운 타이머
  useEffect(() => {
    if (phase === 'hiding') {
      if (timeLeft > 0) {
        const timer = setTimeout(() => setTimeLeft(prev => prev - 1), 1000);
        return () => clearTimeout(timer);
      } else {
        // 시간 초과 시 안 고른 아이들은 랜덤 할당 후 시작
        alivePlayers.forEach(id => {
          if (!secretNumbersRef.current[id]) {
            secretNumbersRef.current[id] = Math.floor(Math.random() * maxNumber) + 1;
          }
        });
        startSnipingRound(alivePlayers);
      }
    }
  }, [phase, timeLeft, alivePlayers, maxNumber]);

  // 3. 저격 턴 시작
  const startSnipingRound = async (currentAlive: string[]) => {
    if (currentAlive.length === 0) return;
    
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
        teams,
        alivePlayers: currentAlive,
        currentTurn: firstTurn,
        shotNumbers: shotNumbersRef.current
      } 
    }).eq('id', 'main_room');
  };

  // 4. 저격 발사 판정
  const handleSnipeShot = async (shooterId: string, shooterName: string, targetNumber: number) => {
    if (phaseRef.current !== 'sniping' || shooterId !== currentTurnRef.current) return;
    
    setPhase('shooting');
    shotNumbersRef.current.push(targetNumber);

    const hits: string[] = [];
    alivePlayersRef.current.forEach(id => {
      if (secretNumbersRef.current[id] === targetNumber) hits.push(id);
    });

    setLastShot({ shooter: shooterName, number: targetNumber, hits });

    const newAlivePlayers = alivePlayersRef.current.filter(id => !hits.includes(id));
    setAlivePlayers(newAlivePlayers);

    await supabase.from('game_rooms').update({ 
      game_data: { 
        gameMode: 'sniper',
        sniperPhase: 'shooting', 
        maxNumber, 
        teams,
        alivePlayers: newAlivePlayers,
        lastShot: { shooter: shooterName, number: targetNumber, hitCount: hits.length, hitIds: hits },
        shotNumbers: shotNumbersRef.current
      } 
    }).eq('id', 'main_room');

    setTimeout(() => {
      processNextTurn(newAlivePlayers, hits);
    }, 4000);
  };

  // 5. 다음 턴 또는 승리 판정
  const processNextTurn = async (currentAlive: string[], hitIds: string[]) => {
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
        game_data: { 
          gameMode: 'sniper', 
          sniperPhase: 'game_over', 
          maxNumber, 
          teams, 
          alivePlayers: currentAlive, 
          shotNumbers: shotNumbersRef.current,
          winner: activeTeams.length === 1 ? activeTeams[0].name : '무승부' 
        } 
      }).eq('id', 'main_room');
      return;
    }

    let nextQueue = turnQueueRef.current;
    nextQueue.shift(); 
    nextQueue = nextQueue.filter(id => !hitIds.includes(id)); 

    if (nextQueue.length === 0) {
      startSnipingRound(currentAlive);
    } else {
      turnQueueRef.current = nextQueue;
      const nextTurn = nextQueue[0];
      setCurrentTurn(nextTurn);
      setPhase('sniping');

      await supabase.from('game_rooms').update({ 
        game_data: { 
          gameMode: 'sniper',
          sniperPhase: 'sniping', 
          maxNumber, 
          teams,
          alivePlayers: currentAlive,
          currentTurn: nextTurn,
          shotNumbers: shotNumbersRef.current
        } 
      }).eq('id', 'main_room');
    }
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '40px', boxSizing: 'border-box' }}>
      
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
              {winnerTeam ? `${winnerTeam.name} 팀 최종 우승!` : '모두 전멸... 무승부!'}
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