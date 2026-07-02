import React from 'react';

interface RankingItem {
  studentName: string;
  score: number;
}

interface RankingProps {
  title: string;
  data: RankingItem[];
  isLoading: boolean;
  isHonorRoll?: boolean; // 명예의 전당 여부
}

export default function Ranking({ title, data, isLoading, isHonorRoll = false }: RankingProps) {
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
                {isHonorRoll ? ['🥇', '🥈', '🥉'][index] : `${index + 1}위.`} {item.studentName}
              </span>
              <span style={{ fontSize: '13px', color: '#0077b6', fontWeight: 'bold' }}>{item.score}점</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}