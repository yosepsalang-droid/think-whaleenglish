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
  const [comment, setComment] = useState('이번 주도 성실하게 학습을 완료했습니다. 가정에서도 많은 칭찬 부탁드립니다.');
  
  // 💡 성적표 영역을 캡처하기 위한 참조(ref)
  const reportRef = useRef<HTMLDivElement>(null);

  // 1. 학생 명단 불러오기
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

  // 2. 학생 선택 시 실제 데이터(성적) 불러오기
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

  // 💡 실제 점수를 바탕으로 차트용 데이터 만들기
  const chartData = [
    { subject: 'Vocabulary (단어)', score: realStats.word, fullMark: 100, fill: '#8884d8' },
    { subject: 'Sentence (문장)', score: realStats.sentence, fullMark: 100, fill: '#82ca9d' },
    { subject: 'Speaking (AI회화)', score: realStats.ai, fullMark: 100, fill: '#ffc658' },
    { subject: 'Grammar (문법)', score: realStats.grammar, fullMark: 100, fill: '#ff7300' },
  ];

  // 3. 성적표를 이미지로 다운로드하는 기능
  const handleDownloadImage = async () => {
    if (!reportRef.current || !selectedStudent) return;
    
    try {
      // 고화질(scale: 2)로 캡처
      const canvas = await html2canvas(reportRef.current, { scale: 2, backgroundColor: '#ffffff' });
      const imageUrl = canvas.toDataURL("image/png");
      
      const link = document.createElement("a");
      link.href = imageUrl;
      // 파일 이름을 '김철수_성적표.png'로 자동 지정
      link.download = `${selectedStudent.name}_주간성적표.png`; 
      link.click();
      
      alert(`✅ ${selectedStudent.name} 학생의 성적표가 이미지로 저장되었습니다!\n카카오톡에 그대로 끌어다 놓으시면 됩니다.`);
    } catch (error) {
      console.error("이미지 저장 실패", error);
      alert("이미지 저장 중 오류가 발생했습니다.");
    }
  };

  return (
    <div style={{ padding: '40px', backgroundColor: '#f4f6f8', minHeight: '100vh', fontFamily: 'Pretendard, sans-serif' }}>
      
      {/* 💡 관리자 컨트롤 패널 (이 부분은 캡처 안 됨) */}
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

      {/* 전체 성적표 컨테이너 (💡 이 안쪽 div 영역만 깔끔하게 캡처됩니다!) */}
      <div ref={reportRef} style={{ maxWidth: '1200px', margin: '0 auto', backgroundColor: 'white', border: '1px solid #ccc', padding: '40px', boxShadow: '0 0 10px rgba(0,0,0,0.05)' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #222', paddingBottom: '10px', marginBottom: '20px' }}>
          <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold' }}>Weekly Report</h1>
          {/* 💡 카톡 전송을 위한 이미지 다운로드 버튼 */}
          <button 
            onClick={handleDownloadImage}
            style={{ padding: '8px 16px', backgroundColor: '#fee500', color: '#111', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            📸 이미지로 저장 (카톡 전송용)
          </button>
        </div>

        {/* 1. Student Information */}
        <div style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '14px', color: '#555', borderBottom: '1px solid #eee', paddingBottom: '5px' }}>Student Information</h2>
          <div style={{ display: 'flex', gap: '30px', marginTop: '20px' }}>
            <div style={{ width: '150px', height: '200px', backgroundColor: '#e2e8f0', display: 'flex', justifyContent: 'center', alignItems: 'center', border: '1px solid #ccc', borderRadius: '8px' }}>
              <span style={{ color: '#888', textAlign: 'center', padding: '10px' }}>{selectedStudent?.currentBook || '교재 정보 없음'}</span>
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
            
            {/* 좌측: 상세 항목 점수 텍스트 */}
            <div style={{ flex: 1, borderRight: '1px solid #ddd', padding: '30px', display: 'flex', flexDirection: 'column', gap: '30px', backgroundColor: '#f8fafc' }}>
              {chartData.map((data, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#334155' }}>{data.subject}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input type="text" value={data.score} readOnly style={{ width: '60px', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', textAlign: 'center', fontWeight: 'bold' }} />
                    <span style={{ color: '#64748b', fontSize: '13px' }}>/ 100</span>
                  </div>
                </div>
              ))}
            </div>
            
            {/* 우측: 방사형 차트 */}
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
              style={{ width: '100%', height: '100px', padding: '15px', border: '1px solid #cbd5e1', borderRadius: '8px', boxSizing: 'border-box', resize: 'vertical', fontSize: '14px', lineHeight: '1.6' }}
            />
          </div>
        </div>

      </div>
    </div>
  );
}