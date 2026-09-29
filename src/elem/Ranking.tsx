import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface RankData {
  studentName: string;
  score: number;
}

interface RankingProps {
  onBack: () => void; 
  studentName?: string; 
}

// 💡 리액트 그래픽으로 직접 그리는 병사 계급장 (작대기 세로 쌓기)
const renderEnlisted = (count: number) => (
  <span style={{ display: 'inline-flex', flexDirection: 'column', gap: '3px', alignItems: 'center', verticalAlign: 'middle', margin: '0 4px', transform: 'translateY(-1px)' }}>
    {Array.from({ length: count }).map((_, i) => (
      <span key={i} style={{ width: '16px', height: '4px', backgroundColor: '#334155', borderRadius: '1px' }}></span>
    ))}
  </span>
);

// 💡 리액트 그래픽으로 직접 그리는 부사관 계급장 (V자 세로 쌓기)
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

// 💡 [핵심] 내 순위를 화면 아래쪽에 추가로 그려주는 로직을 넣었습니다.
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
            const isMe = item.studentName === studentName; // 💡 내가 Top 10에 있는지 확인
            
            return (
              <div key={index} style={{ 
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                padding: '10px 14px', 
                // 💡 내가 Top 10에 있으면 눈에 띄게 파란색으로 칠해줍니다!
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

          {/* 💡 [핵심] 내가 Top 10 안에 없을 경우, 리스트 맨 아래에 점선(⋮)과 함께 내 순위를 보여줍니다! */}
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

export default function Ranking({ onBack, studentName = "테스트학생" }: RankingProps) {
  const [fullThisMonthRankings, setFullThisMonthRankings] = useState<RankData[]>([]);
  const [lastMonthRankings, setLastMonthRankings] = useState<RankData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRankings = async () => {
      try {
        setIsLoading(true);

        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth(); 

        const startOfThisMonth = new Date(year, month, 1);
        const startOfLastMonth = new Date(year, month - 1, 1);

        let allLogs: any[] = [];
        let from = 0;
        const step = 1000;
        let isFetchingLogs = true;

        while (isFetchingLogs) {
          const { data, error } = await supabase
            .from('learning_logs')
            .select('student_id, student_name, score, created_at') 
            .gte('created_at', startOfLastMonth.toISOString()) 
            .eq('status', '완료')
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

        allLogs.forEach(log => {
          if (!log.student_name || typeof log.score !== 'number') return;
          
          const studentGrade = gradeMap.get(log.student_id) || '';
          if (!studentGrade.includes('초')) return; 

          const logDate = new Date(log.created_at);

          if (logDate >= startOfThisMonth) {
            const current = thisMonthMap.get(log.student_name) || 0;
            thisMonthMap.set(log.student_name, current + log.score); 
          } else {
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

      } catch (error) {
        console.error("랭킹 데이터 로딩 실패:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRankings();
  }, []);

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

      <div style={{ backgroundColor: '#fffdf0', border: '1px solid #ffda79', borderRadius: '12px', padding: '16px', marginBottom: '24px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
        <div style={{ fontWeight: '900', color: '#cc8e00', fontSize: '15px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          📢 [공지] 랭킹 이벤트 10월 연기 안내
        </div>
        <div style={{ fontSize: '13.5px', color: '#555', lineHeight: '1.6', wordBreak: 'keep-all' }}>
          고래영어 친구들! 현재 랭킹 점수판을 더 완벽하고 공정하게 업데이트하고 있어요. 🛠️<br/>
          이에 따라 아쉽게도 9월 1~3등 시상 이벤트는 <strong>10월로 연기</strong>됩니다.<br/>
          점수 오류로 불편을 드려 미안해요! 지금 열심히 공부한 실력은 그대로 남으니까, 10월 랭킹전을 위해 계속 파이팅해 봐요! 🐳✨
        </div>
      </div>

      <HonorRollCard 
        data={lastMonthRankings} 
        isLoading={isLoading} 
      />

      {/* 💡 [핵심] 여기에 나의 랭킹 정보를 같이 넘겨줍니다! */}
      <MarathonRankingCard 
        data={fullThisMonthRankings.slice(0, 10)} 
        isLoading={isLoading} 
        myRankData={myRankData}
        myRankIndex={myRankIndex}
        myRankInfo={myRankInfo}
        studentName={studentName}
      />

      {/* 💡 하단 고정 내 순위바는 화면 스크롤을 내려도 항상 내 위치를 볼 수 있게 유지해 두었습니다! */}
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