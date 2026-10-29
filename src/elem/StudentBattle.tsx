import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

interface StudentBattleProps { studentId: string; studentName: string; onBack: () => void; }

export default function StudentBattle({ studentId, studentName, onBack }: StudentBattleProps) {
  const [roomData, setRoomData] = useState<any>(null); const [myTeam, setMyTeam] = useState<any>(null);
  const [inputText, setInputText] = useState(''); const [hasSubmitted, setHasSubmitted] = useState(false); 
  const inputRef = useRef<HTMLInputElement>(null);

  const currentStatus = roomData?.status; const questionIndex = roomData?.game_data?.questionIndex; const sniperPhase = roomData?.game_data?.sniperPhase; const currentTurn = roomData?.game_data?.currentTurn;

  useEffect(() => { setHasSubmitted(false); setInputText(''); }, [currentStatus, questionIndex, sniperPhase, currentTurn]);
  useEffect(() => { if (roomData?.game_data?.gameMode === 'bomb' && currentTurn === studentId) { setTimeout(() => inputRef.current?.focus(), 100); } }, [currentTurn, studentId, roomData]);

  useEffect(() => {
    const fetchRoomStatus = async () => { const { data } = await supabase.from('game_rooms').select('*').eq('id', 'main_room').single(); if (data) { setRoomData(data); const me = data.players?.find((p: any) => p.student_id === studentId); if (me && data.game_data?.teams) { const team = data.game_data.teams.find((t: any) => t.id === me.teamId); setMyTeam(team); } } };
    fetchRoomStatus();
    const channel = supabase.channel('student_battle_listener')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'game_rooms', filter: 'id=eq.main_room' }, (payload) => {
        const newData = payload.new; setRoomData(newData); const me = newData.players?.find((p: any) => p.student_id === studentId); if (me && newData.game_data?.teams) { const team = newData.game_data.teams.find((t: any) => t.id === me.teamId); setMyTeam(team); }
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [studentId]);

  const handleJoinRoom = async () => {
    if (!roomData || roomData.status !== 'waiting') return; const isAlreadyJoined = roomData.players?.some((p: any) => p.student_id === studentId); if (isAlreadyJoined) return;
    const newPlayer = { student_id: studentId, name: studentName }; const updatedPlayers = [...(roomData.players || []), newPlayer];
    await supabase.from('game_rooms').update({ players: updatedPlayers }).eq('id', 'main_room');
  };

  const handleEnglishSubmit = async (answer: string) => {
    if (hasSubmitted || !roomData?.game_data?.currentQuestion) return;
    const currentQ = roomData.game_data.currentQuestion; const gameMode = roomData.game_data.gameMode;
    let isCorrect = answer.toLowerCase().trim() === currentQ.eng.toLowerCase().trim();
    if (gameMode === 'ox') { isCorrect = answer === roomData.game_data.oxAnswer; }

    if (gameMode === 'bomb') {
      if (isCorrect) { setHasSubmitted(true); await supabase.channel('bomb_host_listener').send({ type: 'broadcast', event: 'submit_answer', payload: { isCorrect: true, studentId, studentName } }); } 
      else { setInputText(''); inputRef.current?.focus(); await supabase.channel('bomb_host_listener').send({ type: 'broadcast', event: 'submit_answer', payload: { isCorrect: false, studentId, studentName } }); }
      return;
    }
    setHasSubmitted(true); await supabase.channel('main_room_host').send({ type: 'broadcast', event: 'submit_answer', payload: { isCorrect, teamId: myTeam?.id, studentName } });
  };

  const handleSniperAction = async (num: number, actionType: 'hide_number' | 'snipe_number') => {
    if (hasSubmitted) return; setHasSubmitted(true); await supabase.channel('main_room_host').send({ type: 'broadcast', event: actionType, payload: { studentId, studentName, number: num } });
  };

  const renderNumberGrid = (maxNum: number, onClick: (num: number) => void, disabledNumbers: number[] = [], forceDisableAll: boolean = false) => {
    const numbers = Array.from({ length: maxNum }, (_, i) => i + 1);
    return (
      /* 💡 [핵심] 스크롤 영역에 overscrollBehavior: 'contain'을 주어 내부 스크롤만 되고 바깥으로 새로고침이 번지지 않게 차단합니다. */
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px', width: '100%', maxWidth: '500px', maxHeight: '55vh', overflowY: 'auto', padding: '10px', overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' }}>
        {numbers.map(num => { 
          const isAlreadyShot = disabledNumbers.includes(num); const isDisabled = forceDisableAll || isAlreadyShot; 
          return (<button key={num} disabled={isDisabled} onClick={() => onClick(num)} style={{ padding: '12px 0', fontSize: '20px', fontWeight: '900', backgroundColor: isAlreadyShot ? '#1e293b' : (forceDisableAll ? '#94a3b8' : 'white'), color: isAlreadyShot ? '#0f172a' : '#111', border: 'none', borderRadius: '10px', cursor: isDisabled ? 'not-allowed' : 'pointer', boxShadow: isDisabled ? 'none' : '0 4px 0 rgba(0,0,0,0.2)', opacity: isAlreadyShot ? 0.3 : (forceDisableAll ? 0.7 : 1), transition: 'all 0.2s', touchAction: 'manipulation' }}>{num}</button>); 
        })}
      </div>
    );
  };

  // 💡 공통 CSS: 모든 최상위 div에 `overscrollBehavior: 'none'`, `overflow: 'hidden'`, `touchAction: 'manipulation'` 부여

  if (!roomData || roomData.status === 'closed') {
    return (<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: '#f8fafc', fontFamily: 'sans-serif', overscrollBehavior: 'none', overflow: 'hidden', touchAction: 'manipulation' }}><div style={{ fontSize: '60px', marginBottom: '20px' }}>💤</div><h2 style={{ color: '#64748b' }}>현재 진행 중인 게임이 없습니다.</h2><button onClick={onBack} style={{ marginTop: '30px', padding: '15px 30px', backgroundColor: '#e2e8f0', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: 'bold' }}>돌아가기</button></div>);
  }

  if (roomData.status === 'waiting') {
    const isJoined = roomData.players?.some((p: any) => p.student_id === studentId); const gameMode = roomData.settings?.gameMode || 'typing'; const isSolo = (gameMode === 'sniper' || gameMode === 'bomb') && roomData.settings?.matchType === 'solo';
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: '#0f172a', color: 'white', fontFamily: 'sans-serif', overscrollBehavior: 'none', overflow: 'hidden', touchAction: 'manipulation' }}>
        <h1 style={{ fontSize: '32px', fontWeight: '900', color: '#fde047', marginBottom: '10px' }}>교실 대난투 대기실</h1><p style={{ fontSize: '16px', color: '#94a3b8', marginBottom: '40px' }}>선생님이 게임을 열었습니다!</p>
        {!isJoined ? (<button onClick={handleJoinRoom} style={{ padding: '20px 60px', fontSize: '24px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '16px', fontWeight: '900', cursor: 'pointer', boxShadow: '0 8px 0 #b91c1c', animation: 'pulse 1.5s infinite' }}>입장하기! 🚀</button>) : (<div style={{ padding: '20px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '16px', textAlign: 'center' }}><div style={{ fontSize: '50px', marginBottom: '10px' }}>✅</div><div style={{ fontSize: '20px', fontWeight: 'bold', color: '#4ade80' }}>입장 완료! 선생님이 시작할 때까지 대기하세요.</div></div>)}
        <style>{`@keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.05); } 100% { transform: scale(1); } } body { overscroll-behavior-y: none; }`}</style>
      </div>
    );
  }

  if (roomData.status === 'team_check') {
    const matchType = roomData.game_data?.matchType || 'team'; const isSolo = matchType === 'solo';
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: isSolo ? '#0f172a' : (myTeam?.color || '#0f172a'), color: 'white', transition: 'background-color 0.5s', overscrollBehavior: 'none', overflow: 'hidden', touchAction: 'manipulation' }}>
        <div style={{ fontSize: '80px', marginBottom: '20px', animation: 'bounce 1s infinite' }}>{isSolo ? '👤' : '🤝'}</div><h1 style={{ fontSize: '40px', fontWeight: '900', marginBottom: '10px', textAlign: 'center', margin: 0, lineHeight: 1 }}>{isSolo ? '개인전 준비 완료!' : `당신은 [${myTeam?.name}] 입니다!`}</h1><p style={{ fontSize: '20px', color: 'rgba(255,255,255,0.8)', marginTop: '20px' }}>TV 화면에서 팀원(경쟁자)을 확인하고 대기하세요.</p>
        <style>{`@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-20px); } } body { overscroll-behavior-y: none; }`}</style>
      </div>
    );
  }

  if (roomData.status === 'playing') {
    const gameMode = roomData.game_data?.gameMode; const matchType = roomData.game_data?.matchType || roomData.game_data?.bombMatchType || 'team';
    if (!gameMode) return <div style={{ backgroundColor: '#0f172a', height: '100vh' }} />;

    const isSolo = (gameMode === 'sniper' || gameMode === 'bomb') && matchType === 'solo'; const bgColor = isSolo ? '#0f172a' : (myTeam?.color || '#0f172a');

    if (gameMode === 'bomb') {
      const alivePlayers = roomData.game_data.alivePlayers || []; const isAlive = alivePlayers.includes(studentId); const isMyTurn = roomData.game_data.currentTurn === studentId; const bombPhase = roomData.game_data.bombPhase;
      if (!isAlive) return (<div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#7f1d1d', color: '#fca5a5', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif', overscrollBehavior: 'none', overflow: 'hidden', touchAction: 'manipulation' }}><div style={{ fontSize: '100px', marginBottom: '20px', filter: 'grayscale(1)' }}>💀</div><h2 style={{ fontSize: '32px', fontWeight: '900', color: 'white' }}>폭사했습니다!</h2><p style={{ fontSize: '18px', marginTop: '10px' }}>관전 모드입니다.</p></div>);
      return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: isMyTurn ? '#991b1b' : bgColor, color: 'white', fontFamily: 'sans-serif', transition: 'background-color 0.3s', overscrollBehavior: 'none', overflow: 'hidden', touchAction: 'manipulation' }}>
          <div style={{ padding: '20px', backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><div style={{ fontSize: '18px', fontWeight: 'bold' }}>{studentName} (생존 🏃)</div><div style={{ fontSize: '24px', fontWeight: '900', color: isSolo ? '#fde047' : 'white' }}>{isSolo ? '🏆 개인전' : myTeam?.name}</div></div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px 10px' }}>
            {bombPhase === 'ready' && (<div style={{ textAlign: 'center', animation: 'pulse 1s infinite' }}><div style={{ fontSize: '100px', marginBottom: '20px' }}>💣</div><h2 style={{ fontSize: '28px', fontWeight: '900' }}>폭탄 투하 준비 완료!</h2></div>)}
            {bombPhase === 'playing' && isMyTurn && (
              <div style={{ width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '20px', animation: 'zoomIn 0.3s' }}>
                <div style={{ fontSize: '32px', fontWeight: '900', textAlign: 'center', color: '#fde047', animation: 'shake 0.5s infinite' }}>🚨 폭탄 해제! 🚨</div>
                <div style={{ textAlign: 'center', backgroundColor: 'rgba(255,255,255,0.1)', padding: '20px', borderRadius: '16px' }}><div style={{ fontSize: '20px', color: '#94a3b8', marginBottom: '10px' }}>이 단어의 스펠링은?</div><div style={{ fontSize: '40px', fontWeight: '900', color: 'white' }}>{roomData?.game_data?.currentQuestion?.kor}</div></div>
                <input ref={inputRef} type="text" value={inputText} onChange={(e) => setInputText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleEnglishSubmit(inputText)} placeholder="스펠링을 입력하세요" style={{ width: '100%', padding: '20px', fontSize: '30px', borderRadius: '16px', border: '4px solid #ef4444', textAlign: 'center', fontWeight: '900', outline: 'none', boxSizing: 'border-box', color: '#111' }} autoComplete="off" autoCapitalize="none" autoCorrect="off" />
                <button onClick={() => handleEnglishSubmit(inputText)} style={{ width: '100%', padding: '20px', fontSize: '28px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '16px', fontWeight: '900', cursor: 'pointer', boxShadow: '0 8px 0 #b91c1c' }}>해제 발사! 💦</button>
              </div>
            )}
            {bombPhase === 'playing' && !isMyTurn && (<div style={{ textAlign: 'center', opacity: 0.6 }}><div style={{ fontSize: '80px', marginBottom: '20px' }}>👀</div><h2 style={{ fontSize: '24px', fontWeight: '900' }}>다른 친구가 해제 중...</h2></div>)}
            {bombPhase === 'explosion' && (<div style={{ textAlign: 'center', animation: 'shake 0.5s' }}><div style={{ fontSize: '120px', marginBottom: '20px' }}>💥</div><h2 style={{ fontSize: '32px', fontWeight: '900', color: '#fde047' }}>쾅! 누군가 죽었습니다!</h2></div>)}
            {bombPhase === 'game_over' && (<div style={{ textAlign: 'center', animation: 'popUp 0.5s' }}><div style={{ fontSize: '100px', marginBottom: '20px' }}>🏆</div><h2 style={{ fontSize: '32px', fontWeight: '900' }}>게임 종료!</h2></div>)}
          </div>
          <style>{`@keyframes popUp { 0% { transform: scale(0.5); opacity: 0; } 50% { transform: scale(1.1); } 100% { transform: scale(1); opacity: 1; } } @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } } @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } } @keyframes zoomIn { from { transform: scale(0.8); opacity: 0; } to { transform: scale(1); opacity: 1; } } body { overscroll-behavior-y: none; }`}</style>
        </div>
      );
    }

    if (gameMode === 'sniper') {
      const phase = roomData.game_data.sniperPhase || 'hiding';
      const alivePlayers = roomData.game_data.alivePlayers; const isAlive = alivePlayers ? alivePlayers.includes(studentId) : true;
      const maxNum = roomData.game_data.maxNumber || 40; const isMyTurn = roomData.game_data.currentTurn === studentId;
      const shotNumbers = roomData.game_data.shotNumbers || []; 
      if (!isAlive) return (<div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#1e293b', color: '#94a3b8', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif', overscrollBehavior: 'none', overflow: 'hidden', touchAction: 'manipulation' }}><div style={{ fontSize: '100px', marginBottom: '20px', filter: 'grayscale(1)' }}>💀</div><h2 style={{ fontSize: '32px', fontWeight: '900', color: '#cbd5e1' }}>탈락하셨습니다!</h2><p style={{ fontSize: '18px', marginTop: '10px' }}>관전 모드입니다. 결과를 지켜보세요.</p></div>);
      return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: bgColor, color: 'white', fontFamily: 'sans-serif', transition: 'background-color 0.5s', overscrollBehavior: 'none', overflow: 'hidden', touchAction: 'manipulation' }}>
          <div style={{ padding: '20px', backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><div style={{ fontSize: '18px', fontWeight: 'bold' }}>{studentName} (생존 🏃)</div><div style={{ fontSize: '24px', fontWeight: '900', color: isSolo ? '#fde047' : 'white' }}>{isSolo ? '🏆 개인전' : myTeam?.name}</div></div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 10px' }}>
            {phase === 'hiding' && (<div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>{hasSubmitted ? (<div style={{ marginTop: '50px', animation: 'popUp 0.3s' }}><div style={{ fontSize: '80px', marginBottom: '20px' }}>🔒</div><h2 style={{ fontSize: '28px', fontWeight: '900' }}>숨기기 완료! 대기 중...</h2></div>) : (<><div style={{ fontSize: '22px', fontWeight: '900', marginBottom: '15px' }}>나만의 비밀 숫자를 터치해서 숨기세요!</div>{renderNumberGrid(maxNum, (num) => handleSniperAction(num, 'hide_number'))}</>)}</div>)}
            {phase === 'ready_to_snipe' && (<div style={{ textAlign: 'center', marginTop: '50px', animation: 'popUp 0.3s' }}><div style={{ fontSize: '80px', marginBottom: '20px' }}>⚔️</div><h2 style={{ fontSize: '28px', fontWeight: '900' }}>은폐 완료!</h2><p style={{ fontSize: '18px', color: 'rgba(255,255,255,0.8)' }}>선생님이 배틀을 시작할 때까지 대기하세요.</p></div>)}
            {phase === 'sniping' && (<div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>{isMyTurn ? (<><div style={{ fontSize: '24px', fontWeight: '900', marginBottom: '15px', color: '#fde047', animation: 'pulse 1s infinite' }}>🎯 내 차례입니다! 저격하세요!</div>{renderNumberGrid(maxNum, (num) => handleSniperAction(num, 'snipe_number'), shotNumbers, false)}</>) : (<><div style={{ fontSize: '20px', fontWeight: '900', marginBottom: '15px', color: '#cbd5e1' }}>다른 친구가 저격 중입니다...</div>{renderNumberGrid(maxNum, () => {}, shotNumbers, true)}</>)}</div>)}
            {(phase === 'shooting' || phase === 'game_over') && (<div style={{ textAlign: 'center', marginTop: '50px', animation: 'popUp 0.3s ease-out' }}><div style={{ fontSize: '80px', marginBottom: '20px' }}>💥</div><h2 style={{ fontSize: '28px', fontWeight: '900' }}>저격 결과 확인 중!</h2></div>)}
          </div>
          <style>{`@keyframes popUp { 0% { transform: scale(0.5); opacity: 0; } 50% { transform: scale(1.1); } 100% { transform: scale(1); opacity: 1; } } @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } } body { overscroll-behavior-y: none; }`}</style>
        </div>
      );
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: bgColor, color: 'white', fontFamily: 'sans-serif', transition: 'background-color 0.5s', overscrollBehavior: 'none', overflow: 'hidden', touchAction: 'manipulation' }}>
        <div style={{ padding: '20px', backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><div style={{ fontSize: '18px', fontWeight: 'bold' }}>{studentName}</div><div style={{ fontSize: '24px', fontWeight: '900' }}>{myTeam?.name}</div></div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          {hasSubmitted ? (<div style={{ textAlign: 'center', animation: 'popUp 0.3s ease-out' }}><div style={{ fontSize: '80px', marginBottom: '20px' }}>⏳</div><h2 style={{ fontSize: '28px', fontWeight: '900' }}>정답 제출 완료!</h2><p style={{ fontSize: '18px', color: 'rgba(255,255,255,0.8)' }}>TV 화면의 결과를 확인하세요!</p></div>) : (<div style={{ width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '20px' }}><div style={{ fontSize: '24px', fontWeight: '900', textAlign: 'center', marginBottom: '10px' }}>{gameMode === 'ox' ? '정답을 선택하세요!' : '영어 스펠링을 입력하세요!'}</div>{(gameMode === 'typing' || gameMode === 'scramble') && (<><input type="text" value={inputText} onChange={(e) => setInputText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleEnglishSubmit(inputText)} placeholder="여기에 입력하세요" style={{ width: '100%', padding: '20px', fontSize: '24px', borderRadius: '16px', border: 'none', textAlign: 'center', fontWeight: 'bold', outline: 'none', boxSizing: 'border-box', color: '#111' }} autoComplete="off" autoCapitalize="none" autoCorrect="off" /><button onClick={() => handleEnglishSubmit(inputText)} style={{ width: '100%', padding: '20px', fontSize: '24px', backgroundColor: '#111', color: 'white', border: 'none', borderRadius: '16px', fontWeight: '900', cursor: 'pointer', boxShadow: '0 8px 0 rgba(0,0,0,0.5)' }}>제출하기 🚀</button></>)}{gameMode === 'ox' && (<div style={{ display: 'flex', gap: '15px' }}><button onClick={() => handleEnglishSubmit('O')} style={{ flex: 1, height: '150px', fontSize: '80px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '24px', fontWeight: '900', cursor: 'pointer', boxShadow: '0 10px 0 #1d4ed8' }}>O</button><button onClick={() => handleEnglishSubmit('X')} style={{ flex: 1, height: '150px', fontSize: '80px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '24px', fontWeight: '900', cursor: 'pointer', boxShadow: '0 10px 0 #b91c1c' }}>X</button></div>)}</div>)}
        </div>
        <style>{`body { overscroll-behavior-y: none; }`}</style>
      </div>
    );
  }

  if (roomData.status === 'round_end' || roomData.status === 'result') {
    return (<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: myTeam?.color || '#0f172a', color: 'white', fontFamily: 'sans-serif', overscrollBehavior: 'none', overflow: 'hidden', touchAction: 'manipulation' }}><div style={{ fontSize: '80px', marginBottom: '20px', animation: 'bounce 1s infinite' }}>👀</div><h2 style={{ fontSize: '32px', fontWeight: '900', textAlign: 'center' }}>{roomData.status === 'round_end' ? '라운드 종료!' : '게임 종료!'}</h2><p style={{ fontSize: '20px', color: 'rgba(255,255,255,0.8)', marginTop: '10px' }}>TV 화면을 주목해주세요!</p><style>{`body { overscroll-behavior-y: none; }`}</style></div>);
  }
  return null;
}