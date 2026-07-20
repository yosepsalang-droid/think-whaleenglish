import React, { useState } from 'react';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid
} from 'recharts';

// 임의의 월간 평가 데이터 (레이더 차트용)
const monthlyData = [
  { subject: 'Vocabulary', A: 100, fullMark: 100 },
  { subject: 'Reading', A: 80, fullMark: 100 },
  { subject: 'Listening', A: 80, fullMark: 100 },
  { subject: 'Structure', A: 90, fullMark: 100 },
];

// 임의의 주간 평가 데이터 (막대 차트용)
const weeklyData = [
  { name: 'Vocabulary', score: 47, fill: '#8884d8' },
  { name: 'Sentence Structure', score: 100, fill: '#82ca9d' },
  { name: 'Speaking', score: 73, fill: '#ffc658' },
  { name: 'E-Library', score: 0, fill: '#d0d0d0' },
];

export default function ReportManage() {
  const [comment, setComment] = useState('참 잘했어요.');

  return (
    <div style={{ padding: '40px', backgroundColor: '#f4f6f8', minHeight: '100vh', fontFamily: 'Pretendard, sans-serif' }}>
      
      {/* 전체 성적표 컨테이너 */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', backgroundColor: 'white', border: '1px solid #ccc', padding: '40px', boxShadow: '0 0 10px rgba(0,0,0,0.05)' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #222', paddingBottom: '10px', marginBottom: '20px' }}>
          <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold' }}>성적표 작성</h1>
          <button style={{ padding: '6px 12px', border: '1px solid #ccc', backgroundColor: '#fff', cursor: 'pointer' }}>프린트</button>
        </div>

        {/* 1. Student Information */}
        <div style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '14px', color: '#555', borderBottom: '1px solid #eee', paddingBottom: '5px' }}>Student Information</h2>
          <div style={{ display: 'flex', gap: '30px', marginTop: '20px' }}>
            {/* 교재 이미지 영역 */}
            <div style={{ width: '150px', height: '200px', backgroundColor: '#e2e8f0', display: 'flex', justifyContent: 'center', alignItems: 'center', border: '1px solid #ccc' }}>
              <span style={{ color: '#888' }}>Space Whale 860 2</span>
            </div>
            {/* 학생 정보 텍스트 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '14px', paddingTop: '10px' }}>
              <div style={{ display: 'flex' }}><span style={{ width: '50px', color: '#666' }}>이름:</span> <b>김철수</b></div>
              <div style={{ display: 'flex' }}><span style={{ width: '50px', color: '#666' }}>반:</span> <span>초등 6학년</span></div>
              <div style={{ display: 'flex' }}><span style={{ width: '50px', color: '#666' }}>교재:</span> <span>860 vol.2</span></div>
              <div style={{ display: 'flex' }}><span style={{ width: '50px', color: '#666' }}>기간:</span> <span>2026-06-01 ~ 2026-07-20</span></div>
            </div>
          </div>
        </div>

        {/* 2. Attendance (출석 및 데일리 테스트) */}
        <div style={{ marginBottom: '40px' }}>
           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', paddingBottom: '5px' }}>
             <h2 style={{ fontSize: '14px', color: '#555', margin: 0 }}>Attendance</h2>
             <button style={{ padding: '4px 8px', backgroundColor: '#3b82f6', color: 'white', border: 'none', fontSize: '12px', cursor: 'pointer' }}>출석체크</button>
           </div>
           <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px', fontSize: '12px', textAlign: 'center' }}>
             <thead>
               <tr style={{ backgroundColor: '#f8fafc' }}>
                 <th style={{ border: '1px solid #ddd', padding: '8px' }}>Date</th>
                 <th style={{ border: '1px solid #ddd', padding: '8px' }}>07/01</th>
                 <th style={{ border: '1px solid #ddd', padding: '8px' }}>07/03</th>
                 <th style={{ border: '1px solid #ddd', padding: '8px' }}>07/05</th>
                 <th style={{ border: '1px solid #ddd', padding: '8px' }}>07/08</th>
               </tr>
             </thead>
             <tbody>
               <tr>
                 <td style={{ border: '1px solid #ddd', padding: '8px', fontWeight: 'bold' }}>출석</td>
                 <td style={{ border: '1px solid #ddd', padding: '8px' }}>O</td>
                 <td style={{ border: '1px solid #ddd', padding: '8px' }}>O</td>
                 <td style={{ border: '1px solid #ddd', padding: '8px' }}>X</td>
                 <td style={{ border: '1px solid #ddd', padding: '8px' }}>O</td>
               </tr>
               <tr>
                 <td style={{ border: '1px solid #ddd', padding: '8px', fontWeight: 'bold' }}>Daily Test</td>
                 <td style={{ border: '1px solid #ddd', padding: '8px' }}>70</td>
                 <td style={{ border: '1px solid #ddd', padding: '8px' }}>100</td>
                 <td style={{ border: '1px solid #ddd', padding: '8px' }}>0</td>
                 <td style={{ border: '1px solid #ddd', padding: '8px' }}>90</td>
               </tr>
             </tbody>
           </table>
        </div>

        {/* 3. Evaluation (Weekly) - 가로 막대 그래프 */}
        <div style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '14px', color: '#555', borderBottom: '1px solid #eee', paddingBottom: '5px' }}>Evaluation(Weekly)</h2>
          <div style={{ width: '100%', height: '200px', marginTop: '10px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={weeklyData} margin={{ top: 5, right: 30, left: 100, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, 100]} />
                <YAxis dataKey="name" type="category" width={120} fontSize={12} />
                <Tooltip />
                <Bar dataKey="score" barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 4. Evaluation (Monthly) - 방사형 차트 */}
        <div style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '14px', color: '#555', borderBottom: '1px solid #eee', paddingBottom: '5px' }}>Evaluation(Monthly)</h2>
          
          <div style={{ display: 'flex', marginTop: '20px', border: '1px solid #ddd' }}>
            {/* 좌측: 상세 항목 점수 입력/표시란 */}
            <div style={{ flex: 1, borderRight: '1px solid #ddd', padding: '20px', display: 'flex', flexDirection: 'column', gap: '30px' }}>
              {monthlyData.map((data, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{ width: '120px', fontSize: '13px', fontWeight: 'bold' }}>{data.subject}</span>
                  <input type="text" value={data.A} readOnly style={{ flex: 1, padding: '8px', border: '1px solid #ccc' }} />
                </div>
              ))}
            </div>
            
            {/* 우측: 방사형(거미줄) 차트 */}
            <div style={{ flex: 1, height: '400px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={monthlyData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="subject" fontSize={12} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} />
                  <Radar name="Student" dataKey="A" stroke="#8884d8" fill="#8884d8" fillOpacity={0.4} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* 5. Teacher's Comment */}
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ fontSize: '14px', color: '#555', borderBottom: '1px solid #eee', paddingBottom: '5px' }}>Teacher's Comment</h2>
          <div style={{ marginTop: '10px' }}>
            <textarea 
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              style={{ width: '100%', height: '80px', padding: '10px', border: '1px solid #ccc', boxSizing: 'border-box', resize: 'vertical' }}
            />
          </div>
        </div>

        {/* 하단 저장 버튼 */}
        <div style={{ textAlign: 'center', marginTop: '40px' }}>
          <button style={{ padding: '10px 40px', backgroundColor: '#333', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>
            저장
          </button>
        </div>

      </div>
    </div>
  );
}