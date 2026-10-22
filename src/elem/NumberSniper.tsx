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
  // phase: 'hiding'(숫자 숨기기) -> 'sniping'(저격 대기) -> 'shooting'(결과 연출) -> 'game_over'
  const [phase, setPhase] = useState<'hiding' | 'sniping' | 'shooting' | 'game_over'>('hiding');
  
  const [alivePlayers, setAlivePlayers] = useState<string[]>(players.map(p => p.student_id));
  const secretNumbersRef = useRef<Record<string, number>>({});
  const [readyCount, setReadyCount] = useState(0);

  const [lastShot, setLastShot] = useState<{ shooter: string, number: number, hits: string[] } | null>(null);
  const [winnerTeam, setWinnerTeam] = useState<Team | null>(null);

  useEffect(() => {
    // 게임 시작 시 상태 초기화 및 학생 패드에 은폐 모드 신호 발송
    const initGame = async () => {
      await supabase.from('game_rooms').update({ 
        game_data: { 
          sniperPhase: 'hiding', 
          maxNumber,
          alivePlayers: players.map(p => p.student_id)
        } 
      }).eq('id', 'main_room');
    };
    initGame();

    const channel = supabase.channel('sniper_host_listener')
      .on('broadcast', { event: 'hide_number' }, ({ payload }) => {
        secretNumbersRef.current[payload.studentId] = payload.number;
        setReadyCount(Object.keys(secretNumbersRef.current).length);
      })
      .on('broadcast', { event: 'snipe_number' }, ({ payload }) => {
        handleSnipeShot(payload.studentName, payload.number);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // 모든 생존자가 숫자를 숨겼을 때 자동으로 저격 모드로 전환
  useEffect(() => {
    if (phase === 'hiding' && readyCount > 0 && readyCount === alivePlayers.length) {
      startSnipingPhase();
    }
  }, [readyCount, alivePlayers.length, phase]);

  const startSnipingPhase = async () => {
    setPhase('sniping');
    await supabase.from('game_rooms').update({ 
      game_data: { sniperPhase: 'sniping', maxNumber, alivePlayers } 
    }).eq('id', 'main_room');
  };

  const handleSnipeShot = async (shooterName: string, targetNumber: number) => {
    if (phase !== 'sniping') return;
    
    setPhase('shooting');

    // 명중한 사람 색출 (팀킬 포함)
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
        sniperPhase: 'shooting', 
        lastShot: { shooter: shooterName, number: targetNumber, hitCount: hits.length },
        alivePlayers: newAlivePlayers
      } 
    }).eq('id', 'main_room');

    // 5초 연출 후 다음 상태로
    setTimeout(() => {
      checkWinCondition(newAlivePlayers);
    }, 5000);
  };

  const checkWinCondition = async (currentAlive: string[]) => {
    const aliveCountsByTeam: Record<number, number> = {};
    teams.forEach(t => aliveCountsByTeam[t.id] = 0);
    
    currentAlive.forEach(id => {
      const p = players.find(p => p.student_id === id);
      if (p && p.teamId) aliveCountsByTeam[p.teamId]++;
    });

    const activeTeams = teams.filter(t => aliveCountsByTeam[t.id] > 0);

    if (activeTeams.length <= 1) {
      setPhase('game_over');
      setWinnerTeam(activeTeams.length === 1 ? activeTeams[0] : null); // null이면 무승부 전멸
      await supabase.from('game_rooms').update({ 
        game_data: { sniperPhase: 'game_over', winner: activeTeams.length === 1 ? activeTeams[0].name : '무승부' } 
      }).eq('id', 'main_room');
    } else {
      // 살아남은 사람이 있으면 다시 저격 모드로
      startSnipingPhase();
    }
  };

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
            <div style={{ fontSize: '80px', marginBottom: '20px', animation: 'pulse 1.5s infinite' }}>🕵️‍♂️</div>
            <h1 style={{ fontSize: '48px', color: '#fde047', fontWeight: '900' }}>은폐 모드 진행 중...</h1>
            <p style={{ fontSize: '24px', color: '#94a3b8' }}>태블릿에서 1 ~ {maxNumber} 사이의 비밀 숫자를 숨기세요!</p>
            <div style={{ marginTop: '30px', fontSize: '32px', fontWeight: 'bold' }}>
              준비 완료: <span style={{ color: '#4ade80' }}>{readyCount}</span> / {alivePlayers.length}명
            </div>
          </div>
        )}

        {phase === 'sniping' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '80px', marginBottom: '20px' }}>🎯</div>
            <h1 style={{ fontSize: '48px', color: '#ef4444', fontWeight: '900' }}>저격 모드 활성화!</h1>
            <p style={{ fontSize: '28px', color: 'white', marginTop: '20px' }}>원장님이 지목한 학생은 태블릿에서 저격 숫자를 발사하세요!</p>
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
                💥 명중! {lastShot.hits.length}명 탈락!
              </div>
            ) : (
              <div style={{ fontSize: '50px', color: '#4ade80', fontWeight: '900' }}>
                💨 빗나갔습니다! (아무도 없음)
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