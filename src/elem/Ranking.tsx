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

const getMilitaryRank = (meters: number, rankIndex: number) => {
  if (meters >= 42195) {
    if (rankIndex === 0) return { title: '4성 장군', icon: '⭐⭐⭐⭐' };
    if (rankIndex === 1) return { title: '3성 장군', icon: '⭐⭐⭐' };
    return { title: '2성 장군', icon: '⭐⭐' };
  }
  if (meters >= 35000) return { title: '2성 장군', icon: '⭐⭐' };
  if (meters >= 25000) return { title: '1성 장군', icon: '⭐' };
  if (meters >= 21097) return { title: '대령', icon: '🦅' };
  if (meters >= 15000) return { title: '중령', icon: '🦅' };
  if (meters >= 10000) return { title: '소령', icon: '🦅' };
  if (meters >= 8500) return { title: '대위', icon: '💎' };
  if (meters >= 7000) return { title: '중위', icon: '💎' };
  if (meters >= 5000) return { title: '소위', icon: '💎' };
  if (meters >= 4000) return { title: '상사', icon: '🏅' };
  if (meters >= 2500) return { title: '중사', icon: '🏅' };
  if (meters >= 1000) return { title: '하사', icon: '🏅' };
  if (meters >= 900) return { title: '병장', icon: '🪖' };
  if (meters >= 600) return { title: '상병', icon: '🪖' };
  if (meters >= 300) return { title: '일병', icon: '🪖' };
  if (meters >= 100) return { title: '이등병', icon: '🪖' };
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

function MarathonRankingCard({ data, isLoading }: { data: RankData[]; isLoading: boolean }) {
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
            const shiftRight = index * 14; 
            
            return (
              <div key={index} style={{ 
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                padding: '10px 14px', backgroundColor: 'white', borderRadius: '12px', 
                boxShadow: '0 4px 6px rgba(0,0,0,0.05)', marginLeft: `${shiftRight}px`,
                border: index === 0 ? '2px solid #fbbf24' : '1px solid #e2e8f0'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '16px', fontWeight: '900', color: index < 3 ? '#ea580c' : '#64748b', minWidth: '24px' }}>
                    {index + 1}위
                  </span>
                  <span style={{ fontSize: '18px' }}>{rankInfo.icon}</span>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '15px', fontWeight: '800', color: '#111' }}>{item.studentName}</span>
                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>{rankInfo.title}</span>
                  </div>
                </div>
                <div style={{ backgroundColor: '#111', color: '#4ade80', padding: '6px 12px', borderRadius: '8px', fontSize: '15px', fontWeight: '900', fontFamily: 'monospace' }}>
                  {item.score.toLocaleString()}m
                </div>
              </div>
            );
          })}
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

        // 💡 [핵심] 수파베이스의 1,000개 데이터 제한을 뚫는 싹쓸이(while) 로직 추가!
        let allLogs: any[] = [];
        let from = 0;
        const step = 1000;
        let isFetchingLogs = true;

        // 데이터가 안 나올 때까지 1000개씩 계속 퍼옵니다.
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
            if (data.length < step) isFetchingLogs = false; // 더 이상 가져올 게 없으면 종료
          } else {
            isFetchingLogs = false;
          }
        }

        // 학생 명부도 넉넉하게 싹쓸이해서 가져옵니다.
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
          
          // 초등부인지 확인
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
        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold' }}>통합 마라톤 랭킹전</h2>
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

      <MarathonRankingCard 
        data={fullThisMonthRankings.slice(0, 10)} 
        isLoading={isLoading} 
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