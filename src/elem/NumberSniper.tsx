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
  matchType: 'team' | 'solo'; // 💡 개인전 속성 추가!
  onGameEnd: () => void;
}

const playSFX = (type: 'tick' | 'urgent' | 'shoot' | 'hit' | 'miss' | 'victory') => {
  const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContext) return;
  const ctx = new AudioContext();
  const gain = ctx.createGain();
  gain.connect(ctx.destination);

  if (type === 'tick') {
    const osc = ctx.createOscillator();
    osc.connect(gain);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, ctx.currentTime);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
    osc.start(); osc.stop(ctx.currentTime + 0.1);
  } else if (type === 'urgent') {
    const osc = ctx.createOscillator();
    osc.connect(gain);
    osc.type = 'square';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
    osc.start(); osc.stop(ctx.currentTime + 0.1);
  } else if (type === 'shoot') {
    const osc = ctx.createOscillator();
    osc.connect(gain);
    osc.type = 'square';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
    osc.start(); osc.stop(ctx.currentTime + 0.2);
  } else if (type === 'hit') {
    const osc = ctx.createOscillator();
    osc.connect(gain);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.4);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
    osc.start(); osc.stop(ctx.currentTime + 0.4);
  } else if (type === 'miss') {
    const osc = ctx.createOscillator();
    osc.connect(gain);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    osc.start(); osc.stop(ctx.currentTime + 0.3);
  } else if (type === 'victory') {
    const playNote = (freq: number, startTime: number, duration: number) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'triangle'; o.frequency.value = freq;
      o.connect(g); g.connect(ctx.destination);
      g.gain.setValueAtTime(0.2, startTime);
      g.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
      o.start(startTime); o.stop(startTime + duration);
    };
    const now = ctx.currentTime;
    playNote(440, now, 0.2); playNote(554.37, now + 0.2, 0.2);
    playNote(659.25, now + 0.4, 0.4); playNote(880, now + 0.8, 0.8);
  }
};

export default function NumberSniper({ teams, players, maxNumber, matchType, onGameEnd }: NumberSniperProps) {
  const [phase, setPhase] = useState<'init' | 'hiding' | 'sniping' | 'shooting' | 'game_over'>('init');
  const [alivePlayers, setAlivePlayers] = useState<string[]>(players.map(p => p.student_id));
  const [timeLeft, setTimeLeft] = useState(15); 
  const [currentTurn, setCurrentTurn] = useState<string | null>(null);
  
  const [lastShot, setLastShot] = useState<{ shooter: string, number: number, hits: string[], hitNames: string[], isTimeout?: boolean } | null>(null);
  const [winnerTeam, setWinnerTeam] = useState<Team | null>(null);
  const [readyCount, setReadyCount] = useState(0);

  const phaseRef = useRef(phase);
  const alivePlayersRef = useRef(alivePlayers);
  const currentTurnRef = useRef(currentTurn);
  
  const secretNumbersRef = useRef<Record<string, number>>({});
  const turnQueueRef = useRef<string[]>([]);
  const turnIndexRef = useRef(0); 
  const shotNumbersRef = useRef<number[]>([]);

  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { alivePlayersRef.current = alivePlayers; }, [alivePlayers]);
  useEffect(() => { currentTurnRef.current = currentTurn; }, [currentTurn]);

  useEffect(() => {
    if (phase === 'shooting' && lastShot && !lastShot.isTimeout) {
      playSFX('shoot'); 
      const timer = setTimeout(() => {
        if (lastShot.hits.length > 0) playSFX('hit'); 
        else playSFX('miss'); 
      }, 300); 
      return () => clearTimeout(timer);
    } else if (phase === 'shooting' && lastShot && lastShot.isTimeout) {
      playSFX('hit'); 
    } else if (phase === 'game_over') {
      playSFX('victory'); 
    }
  }, [phase, lastShot]);

  useEffect(() => {
    const initGame = async () => {
      const initialAlive = players.map(p => p.student_id);
      setAlivePlayers(initialAlive);
      secretNumbersRef.current = {};
      setReadyCount(0);
      
      // 💡 [핵심] DB 업데이트 시 sniperMatchType 보존
      await supabase.from('game_rooms').update({ 
        game_data: { gameMode: 'sniper', sniperPhase: 'hiding', maxNumber, teams, alivePlayers: initialAlive, shotNumbers: [], sniperMatchType: matchType } 
      }).eq('id', 'main_room');
      
      setPhase('hiding');
      setTimeLeft(15);
    };
    initGame();

    const channel = supabase.channel('main_room_host')
      .on('broadcast', { event: 'hide_number' }, ({ payload }) => {
        secretNumbersRef.current[payload.studentId] = payload.number;
        const currentReady = Object.keys(secretNumbersRef.current).length;
        setReadyCount(currentReady);

        if (phaseRef.current === 'hiding' && currentReady >= alivePlayersRef.current.length) {
          startSnipingGame(alivePlayersRef.current);
        }
      })
      .on('broadcast', { event: 'snipe_number' }, ({ payload }) => {
        handleSnipeShot(payload.studentId, payload.studentName, payload.number);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [maxNumber, players, teams, matchType]);

  useEffect(() => {
    if (phase === 'hiding' || phase === 'sniping') {
      if (timeLeft > 0) {
        if (timeLeft <= 3) playSFX('urgent'); 
        else playSFX('tick'); 
        
        const timer = setTimeout(() => setTimeLeft(prev => prev - 1), 1000);
        return () => clearTimeout(timer);
      } else {
        if (phase === 'hiding') {
          alivePlayers.forEach(id => {
            if (!secretNumbersRef.current[id]) {
              secretNumbersRef.current[id] = Math.floor(Math.random() * maxNumber) + 1;
            }
          });
          startSnipingGame(alivePlayers);
        } else if (phase === 'sniping') {
          handleTurnTimeout();
        }
      }
    }
  }, [phase, timeLeft, alivePlayers, maxNumber]);

  const startSnipingGame = async (currentAlive: string[]) => {
    if (currentAlive.length === 0) return;
    const shuffledQueue = [...currentAlive].sort(() => Math.random() - 0.5);
    turnQueueRef.current = shuffledQueue;
    turnIndexRef.current = 0;
    const firstTurn = shuffledQueue[0];
    setCurrentTurn(firstTurn);
    setPhase('sniping');
    setTimeLeft(10); 

    await supabase.from('game_rooms').update({ 
      game_data: { gameMode: 'sniper', sniperPhase: 'sniping', maxNumber, teams, alivePlayers: currentAlive, currentTurn: firstTurn, shotNumbers: shotNumbersRef.current, sniperMatchType: matchType } 
    }).eq('id', 'main_room');
  };

  const handleSnipeShot = async (shooterId: string, shooterName: string, targetNumber: number) => {
    if (phaseRef.current !== 'sniping' || shooterId !== currentTurnRef.current) return;
    setPhase('shooting');
    shotNumbersRef.current.push(targetNumber);

    const hits: string[] = [];
    const hitNames: string[] = [];

    alivePlayersRef.current.forEach(id => {
      if (secretNumbersRef.current[id] === targetNumber) {
        hits.push(id);
        const p = players.find(player => player.student_id === id);
        if (p) hitNames.push(p.name);
      }
    });

    setLastShot({ shooter: shooterName, number: targetNumber, hits, hitNames });
    const newAlivePlayers = alivePlayersRef.current.filter(id => !hits.includes(id));
    setAlivePlayers(newAlivePlayers);

    await supabase.from('game_rooms').update({ 
      game_data: { gameMode: 'sniper', sniperPhase: 'shooting', maxNumber, teams, alivePlayers: newAlivePlayers, lastShot: { shooter: shooterName, number: targetNumber, hitCount: hits.length, hitNames }, shotNumbers: shotNumbersRef.current, sniperMatchType: matchType } 
    }).eq('id', 'main_room');

    setTimeout(() => { processNextTurn(newAlivePlayers); }, 4500);
  };

  const handleTurnTimeout = async () => {
    if (phaseRef.current !== 'sniping' || !currentTurnRef.current) return;
    setPhase('shooting'); 
    
    const timedOutPlayerId = currentTurnRef.current;
    const timedOutPlayer = players.find(p => p.student_id === timedOutPlayerId);
    const shooterName = timedOutPlayer?.name || '알 수 없음';
    
    const hits = [timedOutPlayerId];
    const hitNames = [shooterName];
    
    setLastShot({ shooter: shooterName, number: 0, hits, hitNames, isTimeout: true });
    const newAlivePlayers = alivePlayersRef.current.filter(id => id !== timedOutPlayerId);
    setAlivePlayers(newAlivePlayers);
    
    await supabase.from('game_rooms').update({ 
      game_data: { gameMode: 'sniper', sniperPhase: 'shooting', maxNumber, teams, alivePlayers: newAlivePlayers, lastShot: { shooter: shooterName, number: 0, hitCount: hits.length, hitNames, isTimeout: true }, shotNumbers: shotNumbersRef.current, sniperMatchType: matchType } 
    }).eq('id', 'main_room');
    
    setTimeout(() => { processNextTurn(newAlivePlayers); }, 4500);
  };

  const processNextTurn = async (currentAlive: string[]) => {
    let isGameOver = false;
    let winnerNameStr = '무승부';
    let winnerObj: Team | null = null;

    // 💡 [핵심 분기] 개인전 vs 팀전 승리 조건
    if (matchType === 'solo') {
      if (currentAlive.length <= 1) {
        isGameOver = true;
        if (currentAlive.length === 1) {
          const wp = players.find(p => p.student_id === currentAlive[0]);
          winnerNameStr = wp ? wp.name : '알 수 없음';
          winnerObj = { id: 0, name: winnerNameStr, color: '#fde047', score: 0 };
        }
      }
    } else {
      const aliveCountsByTeam: Record<number, number> = {};
      teams.forEach(t => aliveCountsByTeam[t.id] = 0);
      currentAlive.forEach(id => {
        const p = players.find(p => p.student_id === id);
        if (p && p.teamId) aliveCountsByTeam[p.teamId]++;
      });
      const activeTeams = teams.filter(t => aliveCountsByTeam[t.id] > 0);

      if (activeTeams.length <= 1) {
        isGameOver = true;
        if (activeTeams.length === 1) {
          winnerObj = activeTeams[0];
          winnerNameStr = winnerObj.name;
        }
      }
    }

    if (isGameOver) {
      setPhase('game_over');
      setWinnerTeam(winnerObj);
      await supabase.from('game_rooms').update({ 
        game_data: { gameMode: 'sniper', sniperPhase: 'game_over', maxNumber, teams, alivePlayers: currentAlive, shotNumbers: shotNumbersRef.current, winner: winnerNameStr, sniperMatchType: matchType } 
      }).eq('id', 'main_room');
      return;
    }

    let nextIndex = turnIndexRef.current;
    let nextTurnId: string | null = null;
    
    for (let i = 1; i <= turnQueueRef.current.length; i++) {
      const checkIdx = (nextIndex + i) % turnQueueRef.current.length;
      const candidateId = turnQueueRef.current[checkIdx];
      if (currentAlive.includes(candidateId)) {
        nextIndex = checkIdx;
        nextTurnId = candidateId;
        break;
      }
    }

    turnIndexRef.current = nextIndex;
    setCurrentTurn(nextTurnId);
    setPhase('sniping');
    setTimeLeft(10); 

    await supabase.from('game_rooms').update({ 
      game_data: { gameMode: 'sniper', sniperPhase: 'sniping', maxNumber, teams, alivePlayers: currentAlive, currentTurn: nextTurnId, shotNumbers: shotNumbersRef.current, sniperMatchType: matchType } 
    }).eq('id', 'main_room');
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '40px', boxSizing: 'border-box', backgroundColor: '#0f172a', color: 'white' }}>
      
      {/* 💡 [UI 분기] 개인전일 때는 팀 박스 대신 전체 인원의 생존 현황을 태그로 보여줍니다. */}
      {matchType === 'solo' ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', justifyContent: 'center', marginBottom: '40px', backgroundColor: 'rgba(0,0,0,0.5)', padding: '20px', borderRadius: '24px' }}>
          {players.map(p => {
            const isAlive = alivePlayers.includes(p.student_id);
            return (
              <div key={p.student_id} style={{
                padding: '10px 20px', borderRadius: '12px',
                backgroundColor: isAlive ? '#3b82f6' : '#1e293b',
                color: isAlive ? 'white' : '#64748b',
                textDecoration: isAlive ? 'none' : 'line-through',
                fontWeight: 'bold', fontSize: '24px',
                border: isAlive ? '2px solid #60a5fa' : 'none'
              }}>
                {p.name} {isAlive ? '🏃' : '💀'}
              </div>
            );
          })}
        </div>
      ) : (
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
      )}

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
        
        {phase === 'hiding' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '100px', fontWeight: '900', color: timeLeft <= 5 ? '#ef4444' : '#fde047', marginBottom: '20px' }}>
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
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '30px' }}>
            <div style={{ fontSize: '120px', fontWeight: '900', color: timeLeft <= 3 ? '#ef4444' : '#fde047', margin: 0, lineHeight: 1, animation: timeLeft <= 3 ? 'shake 0.3s infinite' : 'none' }}>
              ⏳ {timeLeft}초
            </div>
            <h1 style={{ fontSize: '48px', color: '#ef4444', fontWeight: '900', margin: 0, lineHeight: 1 }}>저격 모드 활성화!</h1>
            <p style={{ fontSize: '36px', color: '#fde047', margin: 0, lineHeight: 1, fontWeight: '900', backgroundColor: 'rgba(0,0,0,0.3)', padding: '20px 40px', borderRadius: '24px' }}>
              👉 이번 턴의 저격수: <span style={{ color: '#4ade80', fontSize: '44px' }}>[{players.find(p => p.student_id === currentTurn)?.name}]</span>
            </p>
          </div>
        )}

        {phase === 'shooting' && lastShot && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '30px', animation: 'zoomIn 0.5s ease-out' }}>
            {lastShot.isTimeout ? (
              <>
                <div style={{ fontSize: '100px', margin: 0, lineHeight: 1, animation: 'shake 0.5s' }}>⏰</div>
                <h2 style={{ fontSize: '60px', color: '#ef4444', fontWeight: '900', margin: 0, lineHeight: 1 }}>시간 초과!</h2>
                <div style={{ fontSize: '36px', fontWeight: '900', color: 'white', marginTop: '20px', backgroundColor: 'rgba(239, 68, 68, 0.2)', padding: '30px', borderRadius: '24px', border: '2px solid #ef4444' }}>
                  <span style={{ color: '#fde047' }}>[{lastShot.shooter}]</span> 님이 총을 쏘지 못해 <span style={{ color: '#ef4444' }}>자폭(탈락)</span> 했습니다! 💀
                </div>
              </>
            ) : (
              <>
                <h2 style={{ fontSize: '40px', color: '#fde047', margin: 0, lineHeight: 1 }}>[{lastShot.shooter}]의 저격 발사!</h2>
                <div style={{ fontSize: '140px', fontWeight: '900', color: 'white', textShadow: '0 0 40px #ef4444', margin: 0, lineHeight: 1 }}>
                  {lastShot.number}번
                </div>
                {lastShot.hits.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
                    <div style={{ fontSize: '48px', color: '#ef4444', fontWeight: '900', margin: 0, lineHeight: 1, animation: 'shake 0.5s' }}>
                      💥 명중! {lastShot.hits.length}명 즉사!
                    </div>
                    <div style={{ fontSize: '36px', color: '#fde047', fontWeight: 'bold', backgroundColor: 'rgba(255,255,255,0.1)', padding: '15px 30px', borderRadius: '20px', margin: 0, lineHeight: 1 }}>
                      🕵️‍♂️ 정체 발각: <span style={{ color: '#4ade80' }}>{lastShot.hitNames.join(', ')}</span> 님의 번호였습니다!
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: '48px', color: '#4ade80', fontWeight: '900', margin: 0, lineHeight: 1 }}>
                    💨 빗나갔습니다! (아무도 없음)
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {phase === 'game_over' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '30px', animation: 'popUp 0.5s ease-out' }}>
            <div style={{ fontSize: '120px', animation: 'bounce 1s infinite', margin: 0, lineHeight: 1 }}>🏆</div>
            <h1 style={{ fontSize: '70px', color: '#fde047', fontWeight: '900', textShadow: '0 0 30px rgba(253,224,71,0.6)', margin: 0, lineHeight: 1, textAlign: 'center' }}>
              {winnerTeam ? `🎉 ${winnerTeam.name} ${matchType === 'solo' ? '최종 우승!' : '팀 최종 우승!'} 🎉` : '모두 전멸... 무승부!'}
            </h1>
            <p style={{ fontSize: '28px', color: '#94a3b8', margin: 0, lineHeight: 1 }}>치열했던 생존 서바이벌 배틀이 종료되었습니다.</p>
            <button onClick={onGameEnd} style={{ marginTop: '30px', padding: '20px 60px', fontSize: '28px', backgroundColor: '#3b82f6', color: 'white', borderRadius: '20px', border: 'none', fontWeight: '900', cursor: 'pointer', boxShadow: '0 8px 0 #1d4ed8' }}>
              메인으로 돌아가기 🏠
            </button>
          </div>
        )}

      </div>
      
      <style>{`
        @keyframes popUp { 0% { transform: scale(0.5); opacity: 0; } 50% { transform: scale(1.1); } 100% { transform: scale(1); opacity: 1; } }
        @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-20px); } }
        @keyframes zoomIn { from { transform: scale(0.5); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-10px); } 75% { transform: translateX(10px); } }
      `}</style>
    </div>
  );
}