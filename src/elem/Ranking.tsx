import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface RankData {
  studentName: string;
  score: number;
}

interface RankingProps {
  onBack: () => void; 
}

// 💡 카드 디자인 컴포넌트 (누적 점수 콤마 적용)
function RankingCard({ title, data, isLoading, isHonorRoll = false }: { title: string; data: RankData[]; isLoading: boolean; isHonorRoll?: boolean }) {
  return (
    <div style={{ backgroundColor: isHonorRoll ? '#fffdf0' : '#f3faff', border: `2px solid ${isHonorRoll ? '#ffda79' : '#a2d2ff'}`, borderRadius: '16px', padding: '16px', marginBottom: '16px' }}>
      <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: isHonorRoll ? '#cc8e00' : '#0077b6', display: 'flex', alignItems: 'center', gap: '6px' }}>
        {isHonorRoll ? '👑' : '⚡'} {title}
      </h3>
      
      {isLoading ? (
        <p style={{ fontSize: '13px', color: '#999', margin: 0 }}>데이터를 불러오는 중입니다...</p>
      ) : data.length === 0 ? (
        <p style={{ fontSize: '13px', color: '#666', margin: 0, textAlign: 'center' }}>아직 랭킹 기록이 없습니다.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {data.map((item, index) => (
            <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 12px', backgroundColor: 'white', borderRadius: '6px' }}>
              <span style={{ fontSize: '13px', fontWeight: '500' }}>
                {isHonorRoll && index < 3 ? ['🥇', '🥈', '🥉'][index] : `${index + 1}위.`} {item.studentName}
              </span>
              {/* 💡 점수에 천 단위 콤마(toLocaleString) 추가 */}
              <span style={{ fontSize: '13px', color: '#0077b6', fontWeight: 'bold' }}>{item.score.toLocaleString()}점</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// 💡 메인 랭킹 화면 (데이터 로직 포함)
export default function Ranking({ onBack }: RankingProps) {
  const [thisMonthRankings, setThisMonthRankings] = useState<RankData[]>([]);
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

        // 💡 grade(학년/과정) 컬럼을 추가로 불러옵니다.
        const { data, error } = await supabase
          .from('learning_logs')
          .select('student_name, score, created_at, grade') 
          .gte('created_at', startOfLastMonth.toISOString()) 
          .eq('status', '완료'); 

        if (error) throw error;

        const thisMonthMap = new Map<string, number>();
        const lastMonthMap = new Map<string, number>();

        (data || []).forEach(log => {
          if (!log.student_name || typeof log.score !== 'number') return;
          
          // 💡 중등부 제외 로직: grade 컬럼에 '초'가 포함되어 있지 않으면 패스합니다.
          if (!log.grade || !log.grade.includes('초')) return;

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
          .sort((a, b) => b.score - a.score)
          .slice(0, 50); 

        const sortedLastMonth = Array.from(lastMonthMap.entries())
          .map(([name, score]) => ({ studentName: name, score }))
          .sort((a, b) => b.score - a.score)
          .slice(0, 3); 

        setThisMonthRankings(sortedThisMonth);
        setLastMonthRankings(sortedLastMonth);

      } catch (error) {
        console.error("랭킹 데이터 로딩 실패:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRankings();
  }, []);

  return (
    <div style={{ fontFamily: 'Pretendard, sans-serif', padding: '20px', maxWidth: '500px', margin: '0 auto', boxSizing: 'border-box' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <button 
          onClick={onBack} 
          style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #ccc', backgroundColor: 'white', cursor: 'pointer', fontWeight: 'bold' }}
        >
          ← 뒤로가기
        </button>
        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold' }}>통합 랭킹전</h2>
        <div style={{ width: '80px' }}></div>
      </div>

      <RankingCard 
        title="지난달 명예의 전당" 
        data={lastMonthRankings} 
        isLoading={isLoading} 
        isHonorRoll={true} 
      />

      <RankingCard 
        title="이번달 실시간 랭킹" 
        data={thisMonthRankings} 
        isLoading={isLoading} 
      />
      
    </div>
  );
}