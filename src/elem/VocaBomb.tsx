import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

interface Player { student_id: string; name: string; teamId?: number; }
interface Team { id: number; name: string; color: string; score: number; }
interface Question { eng: string; kor: string; }

interface VocaBombProps {
  teams: Team[];
  players: Player[];
  questions: Question[];
  matchType: 'team' | 'solo';
  onGameEnd: () => void;
}

const playSFX = (type: 'tick' | 'urgent' | 'correct' | 'wrong' | 'explosion' | 'victory') => {
  const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContext) return;
  const ctx = new AudioContext();
  const gain = ctx.createGain(); gain.connect(ctx.destination);

  if (type === 'tick') {
    const osc = ctx.createOscillator(); osc.connect(gain);
    osc.type = 'sine'; osc.frequency.setValueAtTime(400, ctx.currentTime);
    gain.gain.setValueAtTime(0.1, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
    osc.start(); osc.stop(ctx.currentTime + 0.1);
  } else if (type === 'urgent') {
    const osc = ctx.createOscillator(); osc.connect(gain);
    osc.type = 'square'; osc.frequency.setValueAtTime(800, ctx.currentTime);
    gain.gain.setValueAtTime(0.15, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
    osc.start(); osc.stop(ctx.currentTime + 0.1);
  } else if (type === 'correct') {
    const osc = ctx.createOscillator(); osc.connect(gain);
    osc.type = 'sine'; osc.frequency.setValueAtTime(600, ctx.currentTime); osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.2, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    osc.start(); osc.stop(ctx.currentTime + 0.3);
  } else if (type === 'wrong') {
    const osc = ctx.createOscillator(); osc.connect(gain);
    osc.type = 'sawtooth'; osc.frequency.setValueAtTime(150, ctx.currentTime); osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.2, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
    osc.start(); osc.stop(ctx.currentTime + 0.2);
  } else if (type === 'explosion') {
    const osc = ctx.createOscillator(); osc.connect(gain);
    osc.type = 'square'; osc.frequency.setValueAtTime(100, ctx.currentTime); osc.frequency.exponentialRampToValueAtTime(20, ctx.currentTime + 1);
    gain.gain.setValueAtTime(0.5, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1);
    osc.start(); osc.stop(ctx.currentTime + 1);
  } else if (type === 'victory') {
    const playNote = (f: number, s: number, d: number) => { const o = ctx.createOscillator(); const g = ctx.createGain(); o.type = 'triangle'; o.frequency.value = f; o.connect(g); g.connect(ctx.destination); g.gain.setValueAtTime(0.2, s); g.gain.exponentialRampToValueAtTime(0.01, s + d); o.start(s); o.stop(s + d); };
    const now = ctx.currentTime; playNote(440, now, 0.2); playNote(554.37, now + 0.2, 0.2); playNote(659.25, now + 0.4, 0.4); playNote(880, now + 0.8, 0.8);
  }
};

export default function VocaBomb({ teams, players, questions, matchType, onGameEnd }: VocaBombProps) {
  const [phase, setPhase] = useState<'ready' | 'playing' | 'explosion' | 'game_over'>('ready');
  const [alivePlayers, setAlivePlayers] = useState<string[]>(players.map(p => p.student_id));
  const [currentTurn, setCurrentTurn] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(10);
  const [currentWord, setCurrentWord] = useState<Question | null>(null);
  const [explodedPlayer, setExplodedPlayer] = useState<{ name: string, word: string } | null>(null);
  const [winnerName, setWinnerName] = useState<string>('');

  const turnQueueRef = useRef<string[]>([]);
  const turnIndexRef = useRef(0);
  const cycleCountRef = useRef(1);
  const questionIndexRef = useRef(0);
  const phaseRef = useRef(phase);
  const currentTurnRef = useRef(currentTurn);
  const alivePlayersRef = useRef(alivePlayers);

  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { alivePlayersRef.current = alivePlayers; }, [alivePlayers]);
  useEffect(() => { currentTurnRef.current = currentTurn; }, [currentTurn]);

  const getCycleTime = () => Math.max(3, 10 - (cycleCountRef.current - 1) * 2);

  useEffect(() => {
    const initGame = async () => {
      const initialAlive = players.map(p => p.student_id);
      setAlivePlayers(initialAlive);
      const shuffledQueue = [...initialAlive].sort(() => Math.random() - 0.5);
      turnQueueRef.current = shuffledQueue;
      setTimeout(() => startNextTurn(shuffledQueue, true), 3000); 
    };
    initGame();

    const channel = supabase.channel('bomb_host_listener')
      .on('broadcast', { event: 'submit_answer' }, ({ payload }) => {
        if (phaseRef.current !== 'playing' || payload.studentId !== currentTurnRef.current) return;
        if (payload.isCorrect) {
          playSFX('correct'); turnIndexRef.current += 1;
          if (turnIndexRef.current >= turnQueueRef.current.length) { turnIndexRef.current = 0; cycleCountRef.current += 1; }
          startNextTurn(alivePlayersRef.current);
        } else {
          playSFX('wrong'); 
        }
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    if (phase === 'playing') {
      if (timeLeft > 0) {
        if (timeLeft <= 3) playSFX('urgent'); else playSFX('tick');
        const timer = setTimeout(() => setTimeLeft(prev => prev - 1), 1000);
        return () => clearTimeout(timer);
      } else { handleExplosion(); }
    }
  }, [phase, timeLeft]);

  const startNextTurn = async (currentAlive: string[], isFirst = false) => {
    const nextTurnId = turnQueueRef.current[turnIndexRef.current]; setCurrentTurn(nextTurnId);
    const qIdx = questionIndexRef.current % questions.length; const nextQ = questions[qIdx];
    setCurrentWord(nextQ); questionIndexRef.current += 1;
    const newTime = getCycleTime(); setTimeLeft(newTime); setPhase('playing');

    await supabase.from('game_rooms').update({ 
      game_data: { gameMode: 'bomb', bombPhase: 'playing', teams, alivePlayers: currentAlive, currentTurn: nextTurnId, currentQuestion: nextQ, bombTimeLimit: newTime, bombMatchType: matchType } 
    }).eq('id', 'main_room');
  };

  const handleExplosion = async () => {
    setPhase('explosion'); playSFX('explosion');
    const deadId = currentTurnRef.current; const deadPlayer = players.find(p => p.student_id === deadId);
    setExplodedPlayer({ name: deadPlayer?.name || '알 수 없음', word: currentWord?.eng || '' });
    const newAlive = alivePlayersRef.current.filter(id => id !== deadId); const newQueue = turnQueueRef.current.filter(id => id !== deadId);
    setAlivePlayers(newAlive); turnQueueRef.current = newQueue;
    if (turnIndexRef.current >= newQueue.length) { turnIndexRef.current = 0; cycleCountRef.current += 1; }
    await supabase.from('game_rooms').update({ game_data: { gameMode: 'bomb', bombPhase: 'explosion', alivePlayers: newAlive, explodedName: deadPlayer?.name } }).eq('id', 'main_room');
    setTimeout(() => { processNextTurn(newAlive); }, 4000);
  };

  const processNextTurn = async (currentAlive: string[]) => {
    let isGameOver = false; let wName = '무승부';
    if (matchType === 'solo') {
      if (currentAlive.length <= 1) { isGameOver = true; if (currentAlive.length === 1) wName = players.find(p => p.student_id === currentAlive[0])?.name || ''; }
    } else {
      const aliveCountsByTeam: Record<number, number> = {}; teams.forEach(t => aliveCountsByTeam[t.id] = 0);
      currentAlive.forEach(id => { const p = players.find(p => p.student_id === id); if (p && p.teamId) aliveCountsByTeam[p.teamId]++; });
      const activeTeams = teams.filter(t => aliveCountsByTeam[t.id] > 0);
      if (activeTeams.length <= 1) { isGameOver = true; if (activeTeams.length === 1) wName = activeTeams[0].name + ' 팀'; }
    }
    if (isGameOver) {
      setPhase('game_over'); setWinnerName(wName); playSFX('victory');
      await supabase.from('game_rooms').update({ game_data: { gameMode: 'bomb', bombPhase: 'game_over', alivePlayers: currentAlive, winner: wName } }).eq('id', 'main_room');
    } else { startNextTurn(currentAlive); }
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: phase === 'explosion' ? '#7f1d1d' : '#0f172a', color: 'white', transition: 'background-color 0.3s', padding: '40px', boxSizing: 'border-box' }}>
      
      {matchType === 'solo' ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', justifyContent: 'center', marginBottom: '20px', backgroundColor: 'rgba(0,0,0,0.5)', padding: '20px', borderRadius: '24px' }}>
          {players.map(p => { const isAlive = alivePlayers.includes(p.student_id); return (<div key={p.student_id} style={{ padding: '10px 20px', borderRadius: '12px', backgroundColor: isAlive ? '#3b82f6' : '#1e293b', color: isAlive ? 'white' : '#64748b', textDecoration: isAlive ? 'none' : 'line-through', fontWeight: 'bold', fontSize: '24px' }}>{p.name} {isAlive ? '🏃' : '💀'}</div>); })}
        </div>
      ) : (
        <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: '20px', backgroundColor: 'rgba(0,0,0,0.5)', padding: '20px', borderRadius: '24px' }}>
          {teams.map(team => {
            const aliveCount = players.filter(p => p.teamId === team.id && alivePlayers.includes(p.student_id)).length;
            return ( <div key={team.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: aliveCount === 0 ? 0.3 : 1 }}><div style={{ fontSize: '24px', fontWeight: '900', color: team.color }}>{team.name}</div><div style={{ fontSize: '40px', fontWeight: '900' }}>생존: {aliveCount}명</div></div> );
          })}
        </div>
      )}

      {/* 💡 [겹침 완벽 해결] margin: 0 과 lineHeight: 1 고정 적용 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '30px' }}>
        {phase === 'ready' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', animation: 'pulse 1s infinite' }}>
            <div style={{ fontSize: '150px', margin: 0, lineHeight: 1 }}>💣</div>
            <h1 style={{ fontSize: '60px', color: '#fde047', fontWeight: '900', margin: 0, lineHeight: 1 }}>폭탄 돌리기 시작!</h1>
            <p style={{ fontSize: '30px', color: '#94a3b8', margin: 0, lineHeight: 1 }}>긴장하세요! 곧 첫 번째 타자에게 폭탄이 떨어집니다.</p>
          </div>
        )}

        {phase === 'playing' && currentWord && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', width: '100%' }}>
            <div style={{ fontSize: '150px', fontWeight: '900', color: timeLeft <= 3 ? '#ef4444' : '#fde047', margin: 0, lineHeight: 1, animation: timeLeft <= 3 ? 'shake 0.2s infinite' : 'none' }}>
              {timeLeft}초
            </div>
            
            <div style={{ fontSize: '40px', color: '#94a3b8', margin: 0, lineHeight: 1 }}>이 단어의 스펠링은?</div>
            <div style={{ fontSize: '120px', fontWeight: '900', color: 'white', margin: 0, lineHeight: 1, textShadow: '0 0 30px rgba(255,255,255,0.3)' }}>
              {currentWord.kor}
            </div>

            <div style={{ fontSize: '50px', fontWeight: '900', color: '#111', backgroundColor: '#4ade80', padding: '20px 50px', borderRadius: '30px', margin: 0, lineHeight: 1, animation: 'zoomIn 0.3s' }}>
              🚨 턴: [{players.find(p => p.student_id === currentTurn)?.name}] 해제 중!
            </div>
          </div>
        )}

        {phase === 'explosion' && explodedPlayer && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', animation: 'zoomIn 0.3s ease-out' }}>
            <div style={{ fontSize: '180px', margin: 0, lineHeight: 1, animation: 'shake 0.5s' }}>💥</div>
            <h1 style={{ fontSize: '70px', color: 'white', fontWeight: '900', margin: 0, lineHeight: 1 }}>쾅! 시간 초과!</h1>
            <div style={{ fontSize: '40px', fontWeight: 'bold', color: '#fde047', margin: 0, lineHeight: 1 }}>
              [{explodedPlayer.name}] 님 폭사! 탈락입니다 💀
            </div>
            <div style={{ fontSize: '30px', color: '#cbd5e1', margin: 0, lineHeight: 1 }}>
              정답 스펠링: {explodedPlayer.word}
            </div>
          </div>
        )}

        {phase === 'game_over' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', animation: 'popUp 0.5s ease-out' }}>
            <div style={{ fontSize: '150px', margin: 0, lineHeight: 1, animation: 'bounce 1s infinite' }}>🏆</div>
            <h1 style={{ fontSize: '80px', color: '#fde047', fontWeight: '900', margin: 0, lineHeight: 1, textShadow: '0 0 30px rgba(253,224,71,0.6)' }}>
              {winnerName} 최종 우승! 🎉
            </h1>
            <button onClick={onGameEnd} style={{ marginTop: '30px', padding: '20px 60px', fontSize: '30px', backgroundColor: '#3b82f6', color: 'white', borderRadius: '20px', border: 'none', fontWeight: '900', cursor: 'pointer' }}>
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
        @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }
      `}</style>
    </div>
  );
}