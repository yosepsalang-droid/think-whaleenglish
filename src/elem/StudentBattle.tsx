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

        // 라운드가 바뀌거나 턴이 넘어갈 때 제출 잠금 해제
        if (newData.status === 'playing' || newData.status === 'waiting') {
          setHasSubmitted(false);
          setInputText('');
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [studentId]);

  const handleJoinRoom = async () => {
    if (!roomData || roomData.status !== 'waiting') return;
    
    const isAlreadyJoined = roomData.players?.some((p: any) => p.student_id === studentId);
    if (isAlreadyJoined) return;

    const newPlayer = { student_id: studentId, name: studentName };
    const updatedPlayers = [...(roomData.players || []), newPlayer];

    await supabase.from('game_rooms').update({ players: updatedPlayers }).eq('id', 'main_room');
  };

  // 💡 기존 영어 게임 제출 로직
  const handleEnglishSubmit = async (answer: string) => {
    if (hasSubmitted || !myTeam || !roomData?.game_data?.currentQuestion) return;
    setHasSubmitted(true);
    
    const currentQ = roomData.game_data.currentQuestion;
    const gameMode = roomData.game_data.gameMode;
    let isCorrect = false;

    if (gameMode === 'typing' || gameMode === 'scramble') {
      isCorrect = answer.toLowerCase().trim() === currentQ.eng.toLowerCase().trim();
    } else if (gameMode === 'ox') {
      isCorrect = answer === roomData.game_data.oxAnswer; 
    }

    await supabase.channel('main_room_host').send({
      type: 'broadcast',
      event: 'submit_answer',
      payload: { isCorrect, teamId: myTeam.id }
    });
  };

  // 🎯 스나이퍼 액션 로직 (은폐 및 저격 통합)
  const handleSniperAction = async (num: number, actionType: 'hide_number' | 'snipe_number') => {
    if (hasSubmitted) return;
    setHasSubmitted(true); // 한 번 누르면 바로 잠금!
    
    await supabase.channel('sniper_host_listener').send({
      type: 'broadcast',
      event: actionType,
      payload: { studentId, studentName, number: num }
    });
  };

  // 🎯 넘버 스나이퍼용 숫자 버튼 그리드 (바둑판)
  const renderNumberGrid = (maxNum: number, onClick: (num: number) => void, disabledNumbers: number[] = [], forceDisableAll: boolean = false) => {
    const numbers = Array.from({ length: maxNum }, (_, i) => i + 1);
    
    // 최대 50번까지 깔끔하게 보이도록 5칸씩 배치
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px', width: '100%', maxWidth: '500px', maxHeight: '55vh', overflowY: 'auto', padding: '10px' }}>
        {numbers.map(num => {
          const isAlreadyShot = disabledNumbers.includes(num); // 이미 쏜 번호인지 체크
          const isDisabled = forceDisableAll || isAlreadyShot; // 내 턴이 아니거나 이미 쏜 번호면 비활성화

          return (
            <button
              key={num}
              disabled={isDisabled}
              onClick={() => onClick(num)}
              style={{
                padding: '12px 0', fontSize: '20px', fontWeight: '900',
                backgroundColor: isAlreadyShot ? '#1e293b' : (forceDisableAll ? '#94a3b8' : 'white'),
                color: isAlreadyShot ? '#0f172a' : '#111',
                border: 'none', borderRadius: '10px',
                cursor: isDisabled ? 'not-allowed' : 'pointer',
                boxShadow: isDisabled ? 'none' : '0 4px 0 rgba(0,0,0,0.2)',
                opacity: isAlreadyShot ? 0.3 : (forceDisableAll ? 0.7 : 1),
                transition: 'all 0.2s'
              }}
            >
              {num}
            </button>
          );
        })}
      </div>
    );
  };

  // ---------------- 화면 렌더링 시작 ----------------

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
          <button onClick={handleJoinRoom} style={{ padding: '20px 60px', fontSize: '24px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '16px', fontWeight: '900', cursor: 'pointer', boxShadow: '0 8px 0 #b91c1c', animation: 'pulse 1.5s infinite' }}>입장하기! 🚀</button>
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
    const gameMode = roomData.game_data?.gameMode;
    
    // 💡 [안전장치] 통신 지연 시 빈 화면 대기
    if (!gameMode) return <div style={{ backgroundColor: '#0f172a', height: '100vh' }} />;

    // 🎯 [넘버 스나이퍼 모드]
    if (gameMode === 'sniper') {
      const phase = roomData.game_data.sniperPhase || 'hiding';
      const alivePlayers = roomData.game_data.alivePlayers || [];
      const isAlive = alivePlayers.length === 0 ? true : alivePlayers.includes(studentId);
      const maxNum = roomData.game_data.maxNumber || 40;
      const isMyTurn = roomData.game_data.currentTurn === studentId;
      const shotNumbers = roomData.game_data.shotNumbers || []; // TV에서 공유받은 이미 쏜 번호들

      // 💀 탈락자 관전 모드
      if (!isAlive) {
        return (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#1e293b', color: '#94a3b8', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
            <div style={{ fontSize: '100px', marginBottom: '20px', filter: 'grayscale(1)' }}>💀</div>
            <h2 style={{ fontSize: '32px', fontWeight: '900', color: '#cbd5e1' }}>탈락하셨습니다!</h2>
            <p style={{ fontSize: '18px', marginTop: '10px' }}>관전 모드입니다. 결과를 지켜보세요.</p>
          </div>
        );
      }

      // 생존자 모드
      return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: myTeam?.color || '#0f172a', color: 'white', fontFamily: 'sans-serif', transition: 'background-color 0.5s' }}>
          <div style={{ padding: '20px', backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{studentName} (생존 🏃)</div>
            <div style={{ fontSize: '24px', fontWeight: '900' }}>{myTeam?.name}</div>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 10px' }}>
            
            {/* 1. 은폐 모드 (모두가 누를 수 있음) */}
            {phase === 'hiding' && (
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                {hasSubmitted ? (
                  <div style={{ marginTop: '50px', animation: 'popUp 0.3s' }}>
                    <div style={{ fontSize: '80px', marginBottom: '20px' }}>🔒</div>
                    <h2 style={{ fontSize: '28px', fontWeight: '900' }}>숨기기 완료! 대기 중...</h2>
                  </div>
                ) : (
                  <>
                    <div style={{ fontSize: '22px', fontWeight: '900', marginBottom: '15px' }}>나만의 비밀 숫자를 터치해서 숨기세요!</div>
                    {/* 은폐 모드에서는 비활성화되는 번호 없음 */}
                    {renderNumberGrid(maxNum, (num) => handleSniperAction(num, 'hide_number'))}
                  </>
                )}
              </div>
            )}

            {/* 2. 저격 모드 (내 턴일 때만 누를 수 있음) */}
            {phase === 'sniping' && (
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                {isMyTurn ? (
                  <>
                    <div style={{ fontSize: '24px', fontWeight: '900', marginBottom: '15px', color: '#fde047', animation: 'pulse 1s infinite' }}>🎯 내 차례입니다! 저격하세요!</div>
                    {/* 내 턴: 이미 쏜 번호(shotNumbers)는 까맣게 비활성화됨 */}
                    {renderNumberGrid(maxNum, (num) => handleSniperAction(num, 'snipe_number'), shotNumbers, false)}
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: '20px', fontWeight: '900', marginBottom: '15px', color: '#cbd5e1' }}>다른 친구가 저격 중입니다...</div>
                    {/* 다른 사람 턴: 구경만 하도록 모든 버튼을 살짝 흐리게 비활성화(forceDisableAll) */}
                    {renderNumberGrid(maxNum, () => {}, shotNumbers, true)}
                  </>
                )}
              </div>
            )}

            {/* 3. 쏘고 나서 결과 대기 */}
            {(phase === 'shooting' || phase === 'game_over') && (
              <div style={{ textAlign: 'center', marginTop: '50px', animation: 'popUp 0.3s ease-out' }}>
                <div style={{ fontSize: '80px', marginBottom: '20px' }}>💥</div>
                <h2 style={{ fontSize: '28px', fontWeight: '900' }}>저격 결과 확인 중!</h2>
              </div>
            )}
          </div>
          <style>{`@keyframes popUp { 0% { transform: scale(0.5); opacity: 0; } 50% { transform: scale(1.1); } 100% { transform: scale(1); opacity: 1; } }`}</style>
        </div>
      );
    }

    // 💡 [기존 영어 게임 모드 (타자/스크램블/OX)]
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
                  <input type="text" value={inputText} onChange={(e) => setInputText(e.target.value)} placeholder="여기에 입력하세요" style={{ width: '100%', padding: '20px', fontSize: '24px', borderRadius: '16px', border: 'none', textAlign: 'center', fontWeight: 'bold', outline: 'none', boxSizing: 'border-box', color: '#111' }} autoComplete="off" autoCapitalize="none" autoCorrect="off" />
                  <button onClick={() => handleEnglishSubmit(inputText)} style={{ width: '100%', padding: '20px', fontSize: '24px', backgroundColor: '#111', color: 'white', border: 'none', borderRadius: '16px', fontWeight: '900', cursor: 'pointer', boxShadow: '0 8px 0 rgba(0,0,0,0.5)' }}>제출하기 🚀</button>
                </>
              )}

              {gameMode === 'ox' && (
                <div style={{ display: 'flex', gap: '15px' }}>
                  <button onClick={() => handleEnglishSubmit('O')} style={{ flex: 1, height: '150px', fontSize: '80px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '24px', fontWeight: '900', cursor: 'pointer', boxShadow: '0 10px 0 #1d4ed8' }}>O</button>
                  <button onClick={() => handleEnglishSubmit('X')} style={{ flex: 1, height: '150px', fontSize: '80px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '24px', fontWeight: '900', cursor: 'pointer', boxShadow: '0 10px 0 #b91c1c' }}>X</button>
                </div>
              )}
            </div>
          )}
        </div>
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
      </div>
    );
  }

  return null;
}