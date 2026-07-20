import React, { useState, useEffect, useRef } from 'react';
import { CONFIG } from '../config';
import html2canvas from 'html2canvas';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid
} from 'recharts';

interface Student {
  id: string;
  name: string;
  currentBook: string;
  progress: string;
  grade: string;
}

interface StudentStats {
  word: number;
  sentence: number;
  ai: number;
  grammar: number;
  retestCount: number;
}

export default function ReportManage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [realStats, setRealStats] = useState<StudentStats>({ word: 0, sentence: 0, ai: 0, grammar: 0, retestCount: 0 });
  const [comment, setComment] = useState('이번 주도 결석 없이 성실하게 학습을 완료했습니다. 가정에서도 우리 아이가 성취감을 느낄 수 있도록 아낌없는 폭풍 칭찬 부탁드립니다!');
  
  const reportRef = useRef<HTMLDivElement>(null);

  // 💡 [신규] 이번 주 월요일 ~ 금요일 날짜를 자동으로 계산하는 함수
  const getWeeklyRange = () => {
    const now = new Date();
    const day = now.getDay(); // 0(일) ~ 6(토)
    
    const monday = new Date(now);
    // 일요일(0)이면 6일을 빼고, 그 외에는 (현재 요일 - 1)만큼 빼면 월요일이 됩니다.
    if (day === 0) {
      monday.setDate(now.getDate() - 6);
    } else {
      monday.setDate(now.getDate() - (day - 1));
    }
    
    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4); // 월요일에서 4일을 더하면 금요일
    
    const format = (d: Date) => `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
    return `${format(monday)} ~ ${format(friday)}`;
  };

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const response = await fetch(CONFIG.WEB_APP_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ type: "getStudents" })
        });
        const parsedStudents = await response.json();
        if (!parsedStudents.error && parsedStudents.length > 0) {
          setStudents(parsedStudents);
          setSelectedStudent(parsedStudents[0]);
        }
      } catch (error) {
        console.error("학생 명단 로드 실패", error);
      }
    };
    fetchStudents();
  }, []);

  useEffect(() => {
    if (!selectedStudent) return;
    
    const fetchRealStats = async () => {
      try {
        const response = await fetch(CONFIG.WEB_APP_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ 
            type: "getStudentStats", 
            studentId: selectedStudent.id,
            studentName: selectedStudent.name
          })
        });
        const stats: StudentStats = await response.json();
        setRealStats(stats);
      } catch (err) {
        console.error("성적 로드 실패:", err);
      }
    };
    fetchRealStats();
  }, [selectedStudent]);

  const chartData = [
    { subject: 'Vocabulary (단어)', score: realStats.word, fullMark: 100, fill: '#8884d8' },
    { subject: 'Sentence (문장)', score: realStats.sentence, fullMark: 100, fill: '#82ca9d' },
    { subject: 'Speaking (AI회화)', score: realStats.ai, fullMark: 100, fill: '#ffc658' },
    { subject: 'Grammar (문법)', score: realStats.grammar, fullMark: 100, fill: '#ff7300' },
  ];

  const handleDownloadImage = async () => {
    if (!reportRef.current || !selectedStudent) return;
    
    try {
      const canvas = await html2canvas(reportRef.current, { scale: 2, backgroundColor: '#ffffff' });
      const imageUrl = canvas.toDataURL("image/png");
      
      const link = document.createElement("a");
      link.href = imageUrl;
      link.download = `${selectedStudent.name}_주간성적표.png`; 
      link.click();
      
      alert(`✅ ${selectedStudent.name} 학생의 성적표가 다운로드 되었습니다!`);
    } catch (error) {
      console.error("이미지 저장 실패", error);
      alert("이미지 저장 중 오류가 발생했습니다.");
    }
  };

  return (
    <div style={{ padding: '40px', backgroundColor: '#f4f6f8', minHeight: '100vh', fontFamily: 'Pretendard, sans-serif' }}>
      
      <div style={{ maxWidth: '1200px', margin: '0 auto 20px auto', display: 'flex', gap: '20px', alignItems: 'center' }}>
        <h3 style={{ margin: 0 }}>👩‍🎓 학생 선택:</h3>
        <select 
          value={selectedStudent?.id || ''} 
          onChange={(e) => setSelectedStudent(students.find(s => s.id === e.target.value) || null)}
          style={{ padding: '10px', fontSize: '16px', borderRadius: '8px', border: '1px solid #ccc' }}
        >
          {students.map(student => (
            <option key={student.id} value={student.id}>{student.name} ({student.grade})</option>
          ))}
        </select>
        <span style={{ color: '#666', fontSize: '14px' }}>* 학생을 선택하면 아래 성적표 차트가 실제 점수로 업데이트됩니다.</span>
      </div>

      <div ref={reportRef} style={{ maxWidth: '1200px', margin: '0 auto', backgroundColor: 'white', border: '1px solid #ccc', padding: '40px', boxShadow: '0 0 10px rgba(0,0,0,0.05)' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '2px solid #222', paddingBottom: '10px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '15px' }}>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '900' }}>Weekly Report</h1>
            {/* 💡 [신규] 월~금 날짜 출력 부분 */}
            <span style={{ fontSize: '15px', color: '#64748b', fontWeight: 'bold' }}>{getWeeklyRange()}</span>
          </div>
          
          {/* 💡 [신규] data-html2canvas-ignore="true" 를 넣어서 캡처 이미지에서는 버튼이 사라지게 함 */}
          <button 
            data-html2canvas-ignore="true"
            onClick={handleDownloadImage}
            style={{ padding: '10px 20px', backgroundColor: '#fee500', color: '#111', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}
          >
            📸 이미지로 저장 (카톡 전송용)
          </button>
        </div>

        {/* 1. Student Information */}
        <div style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '14px', color: '#555', borderBottom: '1px solid #eee', paddingBottom: '5px' }}>Student Information</h2>
          <div style={{ display: 'flex', gap: '30px', marginTop: '20px' }}>
            <div style={{ width: '150px', height: '200px', backgroundColor: '#e2e8f0', display: 'flex', justifyContent: 'center', alignItems: 'center', border: '1px solid #ccc', borderRadius: '8px' }}>
              <span style={{ color: '#888', textAlign: 'center', padding: '10px', fontWeight: 'bold' }}>{selectedStudent?.currentBook || '교재 정보 없음'}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', fontSize: '15px', paddingTop: '10px' }}>
              <div style={{ display: 'flex' }}><span style={{ width: '60px', color: '#666', fontWeight: 'bold' }}>이름:</span> <b>{selectedStudent?.name || '-'}</b></div>
              <div style={{ display: 'flex' }}><span style={{ width: '60px', color: '#666', fontWeight: 'bold' }}>과정:</span> <span>{selectedStudent?.grade || '-'}</span></div>
              <div style={{ display: 'flex' }}><span style={{ width: '60px', color: '#666', fontWeight: 'bold' }}>교재:</span> <span>{selectedStudent?.currentBook || '-'}</span></div>
              <div style={{ display: 'flex' }}><span style={{ width: '60px', color: '#666', fontWeight: 'bold' }}>진도:</span> <span>{selectedStudent?.progress || '-'}</span></div>
            </div>
          </div>
        </div>

        {/* 2. Evaluation (Weekly) - 가로 막대 그래프 */}
        <div style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '14px', color: '#555', borderBottom: '1px solid #eee', paddingBottom: '5px' }}>Evaluation (Weekly)</h2>
          <div style={{ width: '100%', height: '250px', marginTop: '20px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={chartData} margin={{ top: 5, right: 30, left: 120, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, 100]} />
                <YAxis dataKey="subject" type="category" width={140} fontSize={13} fontWeight="bold" />
                <Tooltip />
                <Bar dataKey="score" barSize={25} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 3. Evaluation (Radar) - 방사형 차트 */}
        <div style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '14px', color: '#555', borderBottom: '1px solid #eee', paddingBottom: '5px' }}>Overall Balance</h2>
          <div style={{ display: 'flex', marginTop: '20px', border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden' }}>
            
            <div style={{ flex: 1, borderRight: '1px solid #ddd', padding: '30px', display: 'flex', flexDirection: 'column', gap: '30px', backgroundColor: '#f8fafc' }}>
              {chartData.map((data, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#334155' }}>{data.subject}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input type="text" value={data.score} readOnly style={{ width: '60px', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', textAlign: 'center', fontWeight: 'bold', backgroundColor: 'white' }} />
                    <span style={{ color: '#64748b', fontSize: '13px' }}>/ 100</span>
                  </div>
                </div>
              ))}
            </div>
            
            <div style={{ flex: 1.5, height: '400px', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#ffffff' }}>
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="subject" fontSize={13} fontWeight="bold" />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} />
                  <Radar name={selectedStudent?.name || "Student"} dataKey="score" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.5} />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* 4. Teacher's Comment */}
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ fontSize: '14px', color: '#555', borderBottom: '1px solid #eee', paddingBottom: '5px' }}>Teacher's Comment</h2>
          <div style={{ marginTop: '10px' }}>
            <textarea 
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              style={{ width: '100%', height: '100px', padding: '15px', border: '1px solid #cbd5e1', borderRadius: '8px', boxSizing: 'border-box', resize: 'vertical', fontSize: '14px', lineHeight: '1.6', outline: 'none' }}
            />
          </div>
        </div>

      </div>
    </div>
  );
}