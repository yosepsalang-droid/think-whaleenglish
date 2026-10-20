import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface StudentBattleProps {
  studentId: string;
  studentName: string;
  onBack: () => void;
}

export default function StudentBattle({ studentId, studentName, onBack }: StudentBattleProps) {
  const [roomStatus, setRoomStatus] = useState<'waiting' | 'playing' | 'result' | 'loading'>('loading');
  const [myTeam, setMyTeam] = useState<any>(null);
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [answer, setAnswer] = useState('');
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  useEffect(() => {
    let channel: any;

    const joinRoom = async () => {
      // 1. 방 상태 확인
      const { data, error } = await supabase.from('game_rooms').select('*').eq('id', 'main_room').single();
      
      if (error || !data || data.status === 'closed') {
        alert("🚨 현재 열려있는 교실 대난투 방이 없습니다.");
        onBack();
        return;
      }

      // 2. 대기실 입장 (내 이름 등록)
      if (data.status === 'waiting') {
        const currentPlayers = data.players || [];
        if (!currentPlayers.find((p: any) => p.student_id === studentId)) {
          const updatedPlayers = [...currentPlayers, { student_id: studentId, name: studentName }];
          await supabase.from('game_rooms').update({ players: updatedPlayers }).eq('id', 'main_room');
        }
        setRoomStatus('waiting');
      } else {
        setRoomStatus(data.status);
      }

      // 3. 실시간 게임 상황 수신 안테나 켜기
      channel = supabase.channel('student_pad')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'game_rooms', filter: 'id=eq.main_room' }, (payload) => {
          const newData = payload.new;
          
          if (newData.status === 'closed') {
            alert("원장님이 게임을 종료했습니다.");
            onBack();
          } else {
            setRoomStatus(newData.status);
            
            // 내 소속 팀 찾기 (원장님이 배틀 시작을 누른 후)
            if (newData.players) {
              const myInfo = newData.players.find((p: any) => p.student_id === studentId);
              if (myInfo && myInfo.teamId && newData.game_data?.teams) {
                const team = newData.game_data.teams.find((t: any) => t.id === myInfo.teamId);
                setMyTeam(team);
              }
            }

            // 새로운 문제가 출제되었을 때
            if (newData.game_data?.currentQuestion) {
              setCurrentQuestion(newData.game_data.currentQuestion);
              setAnswer(''); // 입력칸 초기화
              setIsCorrect(null); // 정답 상태 초기화
            }
          }
        }).subscribe();
    };

    joinRoom();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [studentId, studentName, onBack]);

  // 💡 정답 제출 로직 (스피드 타자 모드)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentQuestion || !myTeam || isCorrect) return;

    const correctWord = currentQuestion.eng.trim().toLowerCase();
    const myWord = answer.trim().toLowerCase();

    if (myWord === correctWord) {
      setIsCorrect(true);
      
      // 원장님 TV로 점수 +1점 쏘기!
      const { data } = await supabase.from('game_rooms').select('game_data').eq('id', 'main_room').single();
      if (data && data.game_data?.teams) {
        const teams = data.game_data.teams;
        const myTeamIdx = teams.findIndex((t: any) => t.id === myTeam.id);
        if (myTeamIdx > -1) {
          teams[myTeamIdx].score += 1;
          await supabase.from('game_rooms').update({
            game_data: { ...data.game_data, teams }
          }).eq('id', 'main_room');
        }
      }
    } else {
      setIsCorrect(false);
      setTimeout(() => setIsCorrect(null), 1500); // 1.5초 후 다시 입력 가능하게
    }
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: myTeam ? myTeam.color : '#1e293b', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'Pretendard, sans-serif' }}>
      
      {roomStatus === 'loading' && <h2>통신 연결 중... 📡</h2>}

      {/* 1. 대기실 상태 */}
      {roomStatus === 'waiting' && (
        <div style={{ textAlign: 'center', animation: 'pulse 2s infinite' }}>
          <div style={{ fontSize: '80px', marginBottom: '20px' }}>⏳</div>
          <h1 style={{ fontSize: '28px', fontWeight: '900' }}>대기실 입장 완료!</h1>
          <p style={{ fontSize: '18px', opacity: 0.8 }}>원장님이 게임을 시작할 때까지 TV 화면을 봐주세요.</p>
        </div>
      )}

      {/* 2. 게임 플레이 상태 (리모컨 모드) */}
      {roomStatus === 'playing' && myTeam && (
        <div style={{ width: '100%', maxWidth: '500px', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ backgroundColor: 'rgba(255,255,255,0.2)', padding: '10px 20px', borderRadius: '30px', fontWeight: 'bold', marginBottom: '40px', fontSize: '20px' }}>
            나는 [{myTeam.name}] 팀입니다!
          </div>

          <h2 style={{ fontSize: '24px', marginBottom: '10px' }}>TV에 뜬 단어의 스펠링을 입력하세요!</h2>
          
          <form onSubmit={handleSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <input 
              type="text" 
              value={answer} 
              onChange={(e) => setAnswer(e.target.value)}
              disabled={isCorrect === true}
              autoFocus
              placeholder="스펠링 입력..."
              style={{ width: '100%', padding: '20px', fontSize: '30px', borderRadius: '16px', border: 'none', textAlign: 'center', fontWeight: '900', outline: 'none', color: '#111', textTransform: 'lowercase' }}
            />
            
            <button 
              type="submit" 
              disabled={isCorrect === true}
              style={{ width: '100%', padding: '20px', fontSize: '24px', fontWeight: '900', borderRadius: '16px', border: 'none', backgroundColor: isCorrect ? '#4ade80' : 'white', color: isCorrect ? 'white' : '#111', cursor: isCorrect ? 'default' : 'pointer', transition: 'all 0.2s' }}
            >
              {isCorrect === true ? '✅ 정답입니다! (다음 문제 대기)' : (isCorrect === false ? '❌ 틀렸습니다! 다시!' : '🚀 정답 발사!')}
            </button>
          </form>
        </div>
      )}

      {/* 3. 결과 발표 상태 */}
      {roomStatus === 'result' && (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '80px', marginBottom: '20px' }}>🏆</div>
          <h1 style={{ fontSize: '32px', fontWeight: '900' }}>게임 종료!</h1>
          <p style={{ fontSize: '20px' }}>TV 화면에서 최종 우승팀을 확인하세요!</p>
          <button onClick={onBack} style={{ marginTop: '40px', padding: '15px 30px', borderRadius: '12px', border: 'none', fontSize: '18px', fontWeight: 'bold' }}>메인 화면으로</button>
        </div>
      )}

      <style>{`
        @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }
      `}</style>
    </div>
  );
}