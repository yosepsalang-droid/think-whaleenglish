import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface RankData {
  studentName: string;
  score: number;
}

interface RankingProps {
  onBack: () => void;
  studentName?: string;
  // 💡 [추가] 로그인한 학생의 아이디도 전달받아야 본인 확인이 정확합니다.
  studentId?: string;
}

const renderEnlisted = (count: number) => (
  <span style={{ display: 'inline-flex', flexDirection: 'column', gap: '3px', alignItems: 'center', verticalAlign: 'middle', margin: '0 4px', transform: 'translateY(-1px)' }}>
    {Array.from({ length: count }).map((_, i) => (
      <span key={i} style={{ width: '16px', height: '4px', backgroundColor: '#334155', borderRadius: '1px' }}></span>
    ))}
  </span>
);

const renderNCO = (count: number) => (
  <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', verticalAlign: 'middle', lineHeight: '0.4', margin: '0 4px', color: '#b45309', fontWeight: '900', fontSize: '15px' }}>
    {Array.from({ length: count }).map((_, i) => (
      <span key={i} style={{ transform: 'scale(1.2, 0.8)' }}>V</span>
    ))}
  </span>
);

const getMilitaryRank = (meters: number, rankIndex: number) => {
  if (meters >= 42195) {
    if (rankIndex === 0) return { title: '4성 장군', icon: '⭐⭐⭐⭐' };
    if (rankIndex === 1) return { title: '3성 장군', icon: '⭐⭐⭐' };
    return { title: '2성 장군', icon: '⭐⭐' };
  }
  if (meters >= 35000) return { title: '2성 장군', icon: '⭐⭐' };
  if (meters >= 25000) return { title: '1성 장군', icon: '⭐' };
  if (meters >= 21097) return { title: '대령', icon: '💮💮💮' };
  if (meters >= 15000) return { title: '중령', icon: '💮💮' };
  if (meters >= 10000) return { title: '소령', icon: '💮' };
  if (meters >= 8500) return { title: '대위', icon: '💎💎💎' };
  if (meters >= 7000) return { title: '중위', icon: '💎💎' };
  if (meters >= 5000) return { title: '소위', icon: '💎' };
  if (meters >= 4000) return { title: '상사', icon: renderNCO(3) };
  if (meters >= 2500) return { title: '중사', icon: renderNCO(2) };
  if (meters >= 1000) return { title: '하사', icon: renderNCO(1) };
  if (meters >= 900) return { title: '병장', icon: renderEnlisted(4) };
  if (meters >= 600) return { title: '상병', icon: renderEnlisted(3) };
  if (meters >= 300) return { title: '일병', icon: renderEnlisted(2) };
  if (meters >= 100) return { title: '이등병', icon: renderEnlisted(1) };
  return { title: '훈련병', icon: '🌱' };
};

function HonorRollCard({ data, isLoading }: { data: RankData[]; isLoading: boolean }) {
  return (
    <div style={{ backgroundColor: '#fffdf0', border: '2px solid #ffda79', borderRadius: '16px', padding: '16px', marginBottom: '24px' }}>
      <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#cc8e00', display: 'flex', alignItems: 'center', gap: '6px' }}>
        👑 지난달 명예의 전당
      </h3>
      {isLoading ? (
        <p style={{ fontSize: '13px', color: '#999', margin: 0 }}>데이터를 불러오는 중입니다...</p>
      ) : data.length === 0 ? (
        <p style={{ fontSize: '13px', color: '#666', margin: 0, textAlign: 'center' }}>지난달 랭킹 기록이 없습니다.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {data.map((item, index) => {
            const rankInfo = getMilitaryRank(item.score, index);
            return (
              <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }}>
                <span style={{ fontSize: '14px', fontWeight: '800', color: '#111' }}>
                  {['🥇', '🥈', '🥉'][index]} {item.studentName}
                  <span style={{ fontSize: '12px', color: '#666', marginLeft: '6px', fontWeight: '600' }}>({rankInfo.icon} {rankInfo.title})</span>
                </span>
                <span style={{ fontSize: '14px', color: '#cc8e00', fontWeight: '900' }}>{item.score.toLocaleString()}m</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MarathonRankingCard({
  data, isLoading, myRankData, myRankIndex, myRankInfo, studentName
}: {
  data: RankData[]; isLoading: boolean; myRankData: RankData | null; myRankIndex: number; myRankInfo: any; studentName: string;
}) {
  return (
    <div style={{ backgroundColor: '#f0fdf4', border: '2px solid #86efac', borderRadius: '16px', padding: '20px 16px', marginBottom: '20px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: '20px', width: '2px', height: '100%', backgroundColor: '#bbf7d0', zIndex: 0 }}></div>
      <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: '#15803d', display: 'flex', alignItems: 'center', gap: '6px', position: 'relative', zIndex: 1 }}>
        🏃‍♂️ 이달의 마라톤 Top 10
      </h3>
      
      {isLoading ? (
        <p style={{ fontSize: '13px', color: '#999', margin: 0 }}>달리기 기록을 집계 중입니다...</p>
      ) : data.length === 0 ? (
        <p style={{ fontSize: '13px', color: '#666', margin: 0, textAlign: 'center' }}>아직 마라톤을 시작한 선수가 없습니다!</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', position: 'relative', zIndex: 1 }}>
          {data.map((item, index) => {
            const rankInfo = getMilitaryRank(item.score, index);
            const shiftAmount = index * 14;
            const isMe = item.studentName === studentName;
            
            return (
              <div key={index} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 14px',
                backgroundColor: isMe ? '#eff6ff' : 'white',
                borderRadius: '12px',
                boxShadow: isMe ? '0 4px 12px rgba(59,130,246,0.3)' : '0 4px 6px rgba(0,0,0,0.05)',
                marginRight: `${shiftAmount}px`,
                border: isMe ? '2px solid #3b82f6' : (index === 0 ? '2px solid #fbbf24' : '1px solid #e2e8f0'),
                position: isMe ? 'relative' : 'static',
                zIndex: isMe ? 10 : 1
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '16px', fontWeight: '900', color: isMe ? '#2563eb' : (index < 3 ? '#ea580c' : '#64748b'), minWidth: '24px' }}>
                    {index + 1}위
                  </span>
                  <span style={{ fontSize: '18px' }}>{rankInfo.icon}</span>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '15px', fontWeight: '800', color: isMe ? '#1e3a8a' : '#111' }}>
                      {item.studentName} {isMe && '(나)'}
                    </span>
                    <span style={{ fontSize: '11px', color: isMe ? '#3b82f6' : '#64748b', fontWeight: '600' }}>{rankInfo.title}</span>
                  </div>
                </div>
                <div style={{ backgroundColor: isMe ? '#2563eb' : '#111', color: isMe ? 'white' : '#4ade80', padding: '6px 12px', borderRadius: '8px', fontSize: '15px', fontWeight: '900', fontFamily: 'monospace' }}>
                  {item.score.toLocaleString()}m
                </div>
              </div>
            );
          })}

          {myRankData && myRankIndex >= 10 && myRankInfo && (
            <>
              <div style={{ textAlign: 'center', color: '#94a3b8', margin: '6px 0', fontSize: '20px', fontWeight: '900', lineHeight: '0.8' }}>
                ⋮
              </div>
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 14px', backgroundColor: '#eff6ff', borderRadius: '12px',
                boxShadow: '0 4px 12px rgba(59,130,246,0.3)',
                border: '2px solid #3b82f6',
                position: 'relative',
                zIndex: 10
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '16px', fontWeight: '900', color: '#2563eb', minWidth: '24px' }}>
                    {myRankIndex + 1}위
                  </span>
                  <span style={{ fontSize: '18px' }}>{myRankInfo.icon}</span>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '15px', fontWeight: '800', color: '#1e3a8a' }}>{myRankData.studentName} (나)</span>
                    <span style={{ fontSize: '11px', color: '#3b82f6', fontWeight: '600' }}>{myRankInfo.title}</span>
                  </div>
                </div>
                <div style={{ backgroundColor: '#2563eb', color: 'white', padding: '6px 12px', borderRadius: '8px', fontSize: '15px', fontWeight: '900', fontFamily: 'monospace' }}>
                  {myRankData.score.toLocaleString()}m
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function Ranking({ onBack, studentName = "테스트학생", studentId }: RankingProps) {
  const [fullThisMonthRankings, setFullThisMonthRankings] = useState<RankData[]>([]);
  const [lastMonthRankings, setLastMonthRankings] = useState<RankData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // 💡 [추가] 오늘 출석 여부를 관리하는 state
  const [hasAttendedToday, setHasAttendedToday] = useState(true); // 기본값은 버튼을 가려둠 (로딩 완료 후 판별)
  const [isAttending, setIsAttending] = useState(false);

  // 💡 [공통] 현재 날짜(한국 시간 기준)를 구하는 함수
  const getTodayDateString = () => {
    const now = new Date();
    const kstOffset = 9 * 60 * 60 * 1000;
    const kstDate = new Date(now.getTime() + kstOffset);
    return kstDate.toISOString().split('T')[0];
  };

  const fetchRankings = async () => {
    try {
      setIsLoading(true);

      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth();

      // 이번 달과 지난달의 "문자열 형태" 날짜 prefix (예: '2026-11', '2026-10')
      const thisMonthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;
      let lastMonthYear = year;
      let lastMonthValue = month;
      if (month === 0) { lastMonthYear = year - 1; lastMonthValue = 12; }
      const lastMonthPrefix = `${lastMonthYear}-${String(lastMonthValue).padStart(2, '0')}`;

      // UTC 기준으로 넉넉히 가져옵니다 (최소 지난달 1일 이전)
      const startOfLastMonthUTC = new Date(lastMonthYear, lastMonthValue - 1, 1).toISOString();

      let allLogs: any[] = [];
      let from = 0;
      const step = 1000;
      let isFetchingLogs = true;

      while (isFetchingLogs) {
        const { data, error } = await supabase
          .from('learning_logs')
          .select('student_id, student_name, score, created_at, log_date, task_type')
          .gte('created_at', startOfLastMonthUTC)
          .eq('status', '완료')
          .order('created_at', { ascending: false })
          .range(from, from + step - 1);

        if (error) throw error;

        if (data && data.length > 0) {
          allLogs = [...allLogs, ...data];
          from += step;
          if (data.length < step) isFetchingLogs = false;
        } else {
          isFetchingLogs = false;
        }
      }

      let allStudents: any[] = [];
      let studentFrom = 0;
      let isFetchingStudents = true;
      
      while (isFetchingStudents) {
        const { data, error } = await supabase
          .from('students')
          .select('student_id, grade')
          .order('student_id', { ascending: true })
          .range(studentFrom, studentFrom + step - 1);

        if (error) throw error;

        if (data && data.length > 0) {
          allStudents = [...allStudents, ...data];
          studentFrom += step;
          if (data.length < step) isFetchingStudents = false;
        } else {
          isFetchingStudents = false;
        }
      }

      const gradeMap = new Map<string, string>();
      allStudents.forEach(s => {
        if (s.student_id) gradeMap.set(s.student_id, s.grade || '');
      });

      const thisMonthMap = new Map<string, number>();
      const lastMonthMap = new Map<string, number>();

      const todayStr = getTodayDateString();
      let attendedToday = false;

      allLogs.forEach(log => {
        if (!log.student_name || typeof log.score !== 'number') return;
        
        const studentGrade = gradeMap.get(log.student_id) || '';
        // 초등학생만 랭킹 집계 (기존 로직 유지)
        if (!studentGrade.includes('초')) return;

        // 💡 [핵심 패치] 시차 꼬임 해결! log.created_at 대신 무조건 log_date를 사용합니다.
        let dateStr = log.log_date;
        if (!dateStr) {
          const kstOffset = 9 * 60 * 60 * 1000;
          const utcDate = new Date(log.created_at);
          dateStr = new Date(utcDate.getTime() + kstOffset).toISOString().split('T')[0];
        }

        // 💡 출석체크 버튼 상태 확인 (내 아이디이고, 오늘 날짜이며, task_type이 출석체크인 로그가 있다면 버튼 숨김)
        if (studentId && log.student_id === studentId && dateStr === todayStr && log.task_type === '출석체크') {
          attendedToday = true;
        }

        // 이번 달 로그인지 지난달 로그인지 문자열(YYYY-MM)로 완벽하게 판단!
        if (dateStr.startsWith(thisMonthPrefix)) {
          const current = thisMonthMap.get(log.student_name) || 0;
          thisMonthMap.set(log.student_name, current + log.score);
        } else if (dateStr.startsWith(lastMonthPrefix)) {
          const current = lastMonthMap.get(log.student_name) || 0;
          lastMonthMap.set(log.student_name, current + log.score);
        }
      });

      const sortedThisMonth = Array.from(thisMonthMap.entries())
        .map(([name, score]) => ({ studentName: name, score }))
        .sort((a, b) => b.score - a.score);

      const sortedLastMonth = Array.from(lastMonthMap.entries())
        .map(([name, score]) => ({ studentName: name, score }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);

      setFullThisMonthRankings(sortedThisMonth);
      setLastMonthRankings(sortedLastMonth);
      
      // 내 로그인 정보가 있다면 오늘 출석했는지 상태 업데이트
      if (studentId) {
        setHasAttendedToday(attendedToday);
      }

    } catch (error) {
      console.error("랭킹 데이터 로딩 실패:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRankings();
  }, [studentId]); // 학생 ID가 들어올 때 실행

  // 💡 [신규 추가] 출석체크 버튼 누를 때 실행되는 함수
  const handleDailyAttendance = async () => {
    if (!studentId || isAttending) return;
    setIsAttending(true);

    try {
      const todayStr = getTodayDateString();
      
      // 수파베이스 learning_logs에 출석 점수(+100점) 기록!
      const { error } = await supabase.from('learning_logs').insert([{ 
        student_id: studentId, 
        student_name: studentName, 
        task_type: '출석체크', 
        book_info: '오늘의 출석!', 
        score: 100, 
        status: '완료', 
        attempt: 1, 
        log_date: todayStr 
      }]);

      if (error) throw error;

      alert('🎉 출석 완료! 랭킹 점수 100m가 추가되었습니다!');
      setHasAttendedToday(true); // 버튼 숨기기
      
      // 랭킹 화면 즉시 새로고침
      fetchRankings(); 

    } catch (error) {
      console.error('출석 체크 오류:', error);
      alert('출석 체크 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsAttending(false);
    }
  };

  const myRankIndex = fullThisMonthRankings.findIndex(r => r.studentName === studentName);
  const myRankData = myRankIndex !== -1 ? fullThisMonthRankings[myRankIndex] : null;
  const myRankInfo = myRankData ? getMilitaryRank(myRankData.score, myRankIndex) : null;

  return (
    <div style={{ fontFamily: 'Pretendard, sans-serif', padding: '20px', maxWidth: '500px', margin: '0 auto', boxSizing: 'border-box', paddingBottom: '100px' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <button onClick={onBack} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #ccc', backgroundColor: 'white', cursor: 'pointer', fontWeight: 'bold' }}>
          ← 뒤로가기
        </button>
        <h2 style={{ margin: '0 0 12px 0', fontSize: '20px', fontWeight: 'bold' }}>통합 마라톤 랭킹전</h2>
        <div style={{ width: '80px' }}></div>
      </div>

      {/* 💡 [신규 추가] 오늘 출석하지 않은 초등학생에게만 보이는 출석체크 버튼 영역 */}
      {!isLoading && studentId && !hasAttendedToday && (
        <div style={{ marginBottom: '24px', animation: 'bounce 2s infinite' }}>
          <style>{`
            @keyframes bounce {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(-5px); }
            }
          `}</style>
          <button 
            onClick={handleDailyAttendance}
            disabled={isAttending}
            style={{ 
              width: '100%', padding: '16px', borderRadius: '16px', border: 'none', 
              background: 'linear-gradient(135deg, #f59e0b, #d97706)', 
              color: 'white', fontSize: '18px', fontWeight: '900', cursor: isAttending ? 'not-allowed' : 'pointer', 
              boxShadow: '0 8px 20px rgba(217, 119, 6, 0.4)', transition: 'transform 0.1s'
            }}
            onMouseDown={(e) => !isAttending && (e.currentTarget.style.transform = 'scale(0.98)')}
            onMouseUp={(e) => !isAttending && (e.currentTarget.style.transform = 'scale(1)')}
          >
            {isAttending ? '출석 도장 쾅 찍는 중... ⏳' : '📅 오늘의 출석 체크! (+100m 획득) 👆'}
          </button>
        </div>
      )}

      {/* 깔끔하게 정리된 공지사항 영역 */}
      <div style={{ backgroundColor: '#fffdf0', border: '1px solid #ffda79', borderRadius: '12px', padding: '16px', marginBottom: '24px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
        <div style={{ fontWeight: '900', color: '#cc8e00', fontSize: '16px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
          📢 [공지] 이번 달 마라톤 랭킹전 상품 안내 🎁
        </div>
        
        <div style={{ fontSize: '14px', color: '#333', lineHeight: '1.7', wordBreak: 'keep-all', textAlign: 'center' }}>
          <div style={{ marginBottom: '16px' }}>
            고래영어 친구들! 이번 달 1~3등을 달성한 친구들을 위한 특별한 선물을 공개합니다!
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
            <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div>🥇 <strong>1등:</strong> 편의점/메가커피 상품권 택 1 <span style={{ color: '#777', fontSize: '13px' }}>(약 1만 원 상당)</span> 💳☕</div>
              <div>🥈 <strong>2등:</strong> 카카오 이모티콘/상품권 택 1 <span style={{ color: '#777', fontSize: '13px' }}>(약 5천 원 상당)</span> 🎀🎫</div>
              <div>🥉 <strong>3등:</strong> 원하는 카카오 이모티콘 선물! ✨📱</div>
            </div>
          </div>

          <div style={{ fontWeight: '800', color: '#007aff' }}>
            이번 달도 랭킹 1위를 향해 열심히 달려보자고요! 화이팅! 🐋🔥
          </div>
        </div>
      </div>

      <HonorRollCard
        data={lastMonthRankings}
        isLoading={isLoading}
      />

      <MarathonRankingCard
        data={fullThisMonthRankings.slice(0, 10)}
        isLoading={isLoading}
        myRankData={myRankData}
        myRankIndex={myRankIndex}
        myRankInfo={myRankInfo}
        studentName={studentName}
      />

      {!isLoading && (
        <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '500px', backgroundColor: '#111', padding: '16px 20px', boxSizing: 'border-box', borderTopLeftRadius: '20px', borderTopRightRadius: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 -4px 20px rgba(0,0,0,0.15)', zIndex: 100 }}>
          {myRankData && myRankInfo ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ backgroundColor: '#3b82f6', color: 'white', padding: '4px 10px', borderRadius: '8px', fontSize: '14px', fontWeight: '900' }}>
                  나의 순위: {myRankIndex + 1}위
                </span>
                <span style={{ color: 'white', fontSize: '15px', fontWeight: '800' }}>
                  {myRankInfo.icon} {myRankInfo.title}
                </span>
              </div>
              <div style={{ color: '#4ade80', fontSize: '18px', fontWeight: '900', fontFamily: 'monospace' }}>
                {myRankData.score.toLocaleString()}m
              </div>
            </>
          ) : (
            <div style={{ color: 'white', fontSize: '14px', textAlign: 'center', width: '100%' }}>
              아직 이번 달 마라톤을 시작하지 않았습니다! 첫 달리기를 시작해 보세요! 🏃‍♂️
            </div>
          )}
        </div>
      )}
      
    </div>
  );
}