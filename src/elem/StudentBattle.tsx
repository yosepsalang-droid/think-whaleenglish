import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface StudentBattleProps {
  studentId: string;
  studentName: string;
  onBack: () => void;
}

export default function StudentBattle({ studentId, studentName, onBack }: StudentBattleProps) {
  const [roomData, setRoomData] = useState<any>(null);
  const [myTeam, setMyTeam] = useState<any>(null);
  
  const [inputText, setInputText] = useState('');
  const [hasSubmitted, setHasSubmitted] = useState(false); 

  useEffect(() => {
    const fetchRoomStatus = async () => {
      const { data } = await supabase.from('game_rooms').select('*').eq('id', 'main_room').single();
      if (data) {
        setRoomData(data);
        const me = data.players?.find((p: any) => p.student_id === studentId);
        if (me && data.game_data?.teams) {
          const team = data.game_data.teams.find((t: any) => t.id === me.teamId);
          setMyTeam(team);
        }
      }
    };

    fetchRoomStatus();

    const channel = supabase.channel('student_battle_listener')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'game_rooms', filter: 'id=eq.main_room' }, (payload) => {
        const newData = payload.new;
        setRoomData(newData);

        const me = newData.players?.find((p: any) => p.student_id === studentId);
        if (me && newData.game_data?.teams) {
          const team = newData.game_data.teams.find((t: any) => t.id === me.teamId);
          setMyTeam(team);
        }

        if (newData.status === 'playing' || newData.status === 'waiting') {
          setHasSubmitted(false);
          setInputText('');
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [studentId]);

  const handleJoinRoom = async () => {
    if (!roomData || roomData.status !== 'waiting') return alert("현재 입장할 수 있는 방이 없습니다.");
    
    const isAlreadyJoined = roomData.players?.some((p: any) => p.student_id === studentId);
    if (isAlreadyJoined) return;

    const newPlayer = { student_id: studentId, name: studentName };
    const updatedPlayers = [...(roomData.players || []), newPlayer];

    await supabase.from('game_rooms').update({ players: updatedPlayers }).eq('id', 'main_room');
  };

  const handleSubmit = async (answer: string) => {
    if (hasSubmitted || !myTeam || !roomData?.game_data?.currentQuestion) return;

    setHasSubmitted(true); // 버튼 즉시 잠금
    
    const currentQ = roomData.game_data.currentQuestion;
    const gameMode = roomData.game_data.gameMode;
    let isCorrect = false;

    // 💡 [핵심] 이제 OX 모드도 진짜 정답 판별을 합니다!
    if (gameMode === 'typing' || gameMode === 'scramble') {
      isCorrect = answer.toLowerCase().trim() === currentQ.eng.toLowerCase().trim();
    } 
    else if (gameMode === 'ox') {
      isCorrect = answer === roomData.game_data.oxAnswer; 
    }

    // 💡 정답이든 오답이든 관제탑으로 무조건 제출 신호를 쏩니다! (조기 종료를 위해)
    await supabase.channel('main_room_host').send({
      type: 'broadcast',
      event: 'submit_answer',
      payload: { isCorrect, teamId: myTeam.id }
    });
  };

  if (!roomData || roomData.status === 'closed') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: '#f8fafc', fontFamily: 'sans-serif' }}>
        <div style={{ fontSize: '60px', marginBottom: '20px' }}>💤</div>
        <h2 style={{ color: '#64748b' }}>현재 진행 중인 게임이 없습니다.</h2>
        <button onClick={onBack} style={{ marginTop: '30px', padding: '15px 30px', backgroundColor: '#e2e8f0', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: 'bold' }}>돌아가기</button>
      </div>
    );
  }

  if (roomData.status === 'waiting') {
    const isJoined = roomData.players?.some((p: any) => p.student_id === studentId);
    
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: '#0f172a', color: 'white', fontFamily: 'sans-serif' }}>
        <h1 style={{ fontSize: '32px', fontWeight: '900', color: '#fde047', marginBottom: '10px' }}>교실 대난투 대기실</h1>
        <p style={{ fontSize: '16px', color: '#94a3b8', marginBottom: '40px' }}>선생님이 게임을 시작할 때까지 기다려주세요!</p>

        {!isJoined ? (
          <button onClick={handleJoinRoom} style={{ padding: '20px 60px', fontSize: '24px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '16px', fontWeight: '900', cursor: 'pointer', boxShadow: '0 8px 0 #b91c1c', animation: 'pulse 1.5s infinite' }}>
            입장하기! 🚀
          </button>
        ) : (
          <div style={{ padding: '20px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: '50px', marginBottom: '10px' }}>✅</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#4ade80' }}>입장 완료! 곧 팀이 배정됩니다.</div>
          </div>
        )}
        <style>{`@keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.05); } 100% { transform: scale(1); } }`}</style>
      </div>
    );
  }

  if (roomData.status === 'playing') {
    const gameMode = roomData.game_data?.gameMode || 'typing';

    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: myTeam?.color || '#0f172a', color: 'white', fontFamily: 'sans-serif', transition: 'background-color 0.5s' }}>
        <div style={{ padding: '20px', backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{studentName}</div>
          <div style={{ fontSize: '24px', fontWeight: '900' }}>{myTeam?.name}</div>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          
          {hasSubmitted ? (
            <div style={{ textAlign: 'center', animation: 'popUp 0.3s ease-out' }}>
              <div style={{ fontSize: '80px', marginBottom: '20px' }}>⏳</div>
              <h2 style={{ fontSize: '28px', fontWeight: '900' }}>정답 제출 완료!</h2>
              <p style={{ fontSize: '18px', color: 'rgba(255,255,255,0.8)' }}>TV 화면의 결과를 확인하세요!</p>
            </div>
          ) : (
            <div style={{ width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ fontSize: '24px', fontWeight: '900', textAlign: 'center', marginBottom: '10px' }}>
                {gameMode === 'ox' ? '정답을 선택하세요!' : '영어 스펠링을 입력하세요!'}
              </div>

              {(gameMode === 'typing' || gameMode === 'scramble') && (
                <>
                  <input 
                    type="text" 
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="여기에 입력하세요"
                    style={{ width: '100%', padding: '20px', fontSize: '24px', borderRadius: '16px', border: 'none', textAlign: 'center', fontWeight: 'bold', outline: 'none', boxSizing: 'border-box', color: '#111' }}
                    autoComplete="off"
                    autoCapitalize="none"
                    autoCorrect="off"
                  />
                  <button onClick={() => handleSubmit(inputText)} style={{ width: '100%', padding: '20px', fontSize: '24px', backgroundColor: '#111', color: 'white', border: 'none', borderRadius: '16px', fontWeight: '900', cursor: 'pointer', boxShadow: '0 8px 0 rgba(0,0,0,0.5)' }}>제출하기 🚀</button>
                </>
              )}

              {gameMode === 'ox' && (
                <div style={{ display: 'flex', gap: '15px' }}>
                  <button onClick={() => handleSubmit('O')} style={{ flex: 1, height: '150px', fontSize: '80px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '24px', fontWeight: '900', cursor: 'pointer', boxShadow: '0 10px 0 #1d4ed8' }}>O</button>
                  <button onClick={() => handleSubmit('X')} style={{ flex: 1, height: '150px', fontSize: '80px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '24px', fontWeight: '900', cursor: 'pointer', boxShadow: '0 10px 0 #b91c1c' }}>X</button>
                </div>
              )}
            </div>
          )}

        </div>
        <style>{`@keyframes popUp { 0% { transform: scale(0.5); opacity: 0; } 50% { transform: scale(1.1); } 100% { transform: scale(1); opacity: 1; } }`}</style>
      </div>
    );
  }

  if (roomData.status === 'round_end' || roomData.status === 'result') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: myTeam?.color || '#0f172a', color: 'white', fontFamily: 'sans-serif' }}>
        <div style={{ fontSize: '80px', marginBottom: '20px', animation: 'bounce 1s infinite' }}>👀</div>
        <h2 style={{ fontSize: '32px', fontWeight: '900', textAlign: 'center' }}>
          {roomData.status === 'round_end' ? '라운드 종료!' : '게임 종료!'}
        </h2>
        <p style={{ fontSize: '20px', color: 'rgba(255,255,255,0.8)', marginTop: '10px' }}>TV 화면을 주목해주세요!</p>
        <style>{`@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-20px); } }`}</style>
      </div>
    );
  }

  return null;
}