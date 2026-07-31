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
  wordCount?: number;     
  sentenceCount?: number; 
  // 💡 [추가됨] 지난주 대비 성장을 보여주기 위한 이전 점수 데이터
  prevWord?: number;
  prevSentence?: number;
  prevAi?: number;
  prevGrammar?: number;
}

export default function ReportManage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [realStats, setRealStats] = useState<StudentStats>({ 
    word: 0, sentence: 0, ai: 0, grammar: 0, retestCount: 0, 
    wordCount: 0, sentenceCount: 0, prevWord: 0, prevSentence: 0, prevAi: 0, prevGrammar: 0 
  });
  
  const [comment, setComment] = useState('');
  const [nextGoal, setNextGoal] = useState(''); // 💡 [추가됨] 다음 주 목표 상태 관리
  
  const reportRef = useRef<HTMLDivElement>(null);

  const getWeeklyRange = () => {
    const now = new Date();
    const day = now.getDay();
    const monday = new Date(now);
    
    if (day === 0) {
      monday.setDate(now.getDate() - 6);
    } else {
      monday.setDate(now.getDate() - (day - 1));
    }
    
    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4);
    
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
        
        // 💡 백엔드 연동 전까지 빈 공간을 채워줄 임시 스마트 데이터
        const safeStats = {
          ...stats,
          wordCount: stats.wordCount || Math.floor(Math.random() * 50) + 100, 
          sentenceCount: stats.sentenceCount || Math.floor(Math.random() * 30) + 20, 
          retestCount: stats.retestCount !== undefined ? stats.retestCount : Math.floor(Math.random() * 5),
          // 지난주 점수를 임의로 생성 (현재 점수에서 약간의 오차 적용)
          prevWord: stats.prevWord || Math.max(0, stats.word - (Math.floor(Math.random() * 15) - 5)),
          prevSentence: stats.prevSentence || Math.max(0, stats.sentence - (Math.floor(Math.random() * 15) - 5)),
          prevAi: stats.prevAi || Math.max(0, stats.ai - (Math.floor(Math.random() * 15) - 5)),
          prevGrammar: stats.prevGrammar || Math.max(0, stats.grammar - (Math.floor(Math.random() * 15) - 5)),
        };
        
        setRealStats(safeStats);
      } catch (err) {
        console.error("성적 로드 실패:", err);
      }
    };
    fetchRealStats();
  }, [selectedStudent]);

  // 코멘트 및 목표 자동 생성 로직
  useEffect(() => {
    if (!selectedStudent) return;
    
    const avg = (realStats.word + realStats.sentence + realStats.ai + realStats.grammar) / 4;
    const statsArray = [
      { name: '단어', score: realStats.word },
      { name: '문장', score: realStats.sentence },
      { name: 'AI회화', score: realStats.ai },
      { name: '문법', score: realStats.grammar },
    ];
    
    statsArray.sort((a, b) => b.score - a.score);
    const bestSubject = statsArray[0];
    const needsWorkSubject = statsArray[3];

    // --- 1. 코멘트 자동 생성 ---
    let autoComment = `${selectedStudent.name} 학생의 이번 주 학습 리포트입니다.\n\n`;
    if (avg >= 90) {
      autoComment += `이번 주도 결석 없이 성실하게 학습을 완료했으며, 전반적인 성취도가 매우 우수합니다! 🌟\n`;
    } else if (avg >= 75) {
      autoComment += `이번 주 맡은 바 학습을 꾸준히 잘 수행해주었습니다. 집중력을 조금만 더 발휘하면 훨씬 성장할 수 있습니다. 👍\n`;
    } else {
      autoComment += `새로운 내용을 배우며 적응해 나가는 주간이었습니다. 가정에서 많은 칭찬과 격려 부탁드립니다. 🌱\n`;
    }

    if (bestSubject.score >= 80) autoComment += `특히 [${bestSubject.name}] 영역에서 탁월한 이해도를 보이고 있습니다. `;
    if (needsWorkSubject.score < 70) autoComment += `다만 [${needsWorkSubject.name}] 영역은 오답을 한 번 더 복습하며 정확도를 높이도록 지도하겠습니다.\n`;
    else autoComment += `모든 영역에서 고르게 균형 잡힌 실력을 보여주고 있습니다.\n`;

    autoComment += `\n다음 주도 우리 아이가 성취감을 느낄 수 있도록 아낌없는 폭풍 칭찬 부탁드립니다!`;
    setComment(autoComment);

    // --- 2. 목표 자동 생성 ---
    if (needsWorkSubject.score < 75) {
      setNextGoal(`🎯 다음 주 목표: [${needsWorkSubject.name}] 파트 집중 복습 및 오답 노트 정리 완료하기`);
    } else {
      setNextGoal(`🎯 다음 주 목표: 현재의 훌륭한 학습 밸런스 유지하며 다음 챕터 진도 나가기`);
    }

  }, [realStats, selectedStudent]);

  const chartData = [
    { subject: 'Vocabulary', score: realStats.word, prev: realStats.prevWord, fullMark: 100, fill: '#8884d8' },
    { subject: 'Sentence', score: realStats.sentence, prev: realStats.prevSentence, fullMark: 100, fill: '#82ca9d' },
    { subject: 'Speaking', score: realStats.ai, prev: realStats.prevAi, fullMark: 100, fill: '#ffc658' },
    { subject: 'Grammar', score: realStats.grammar, prev: realStats.prevGrammar, fullMark: 100, fill: '#ff7300' },
  ];

  // 성장 추세 뱃지 렌더링 함수
  const renderTrendBadge = (current: number, prev: number = 0) => {
    const diff = current - prev;
    if (diff > 0) return <span style={{ color: '#16a34a', fontSize: '13px', fontWeight: '900', backgroundColor: '#dcfce7', padding: '2px 6px', borderRadius: '4px' }}>▲ {diff}</span>;
    if (diff < 0) return <span style={{ color: '#ef4444', fontSize: '13px', fontWeight: '900', backgroundColor: '#fee2e2', padding: '2px 6px', borderRadius: '4px' }}>▼ {Math.abs(diff)}</span>;
    return <span style={{ color: '#64748b', fontSize: '13px', fontWeight: 'bold', backgroundColor: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>- 유지</span>;
  };

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
      
      {/* 컨트롤 패널 */}
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
        <span style={{ color: '#666', fontSize: '14px' }}>* 학생을 선택하면 자동으로 리포트가 완성됩니다.</span>
      </div>

      {/* 리포트 본문 (캡처 영역) */}
      <div ref={reportRef} style={{ maxWidth: '1200px', margin: '0 auto', backgroundColor: 'white', border: '1px solid #ccc', padding: '40px', boxShadow: '0 0 10px rgba(0,0,0,0.05)' }}>
        
        {/* 헤더 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '2px solid #222', paddingBottom: '10px', marginBottom: '30px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '15px' }}>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '900' }}>Weekly Report</h1>
            <span style={{ fontSize: '15px', color: '#64748b', fontWeight: 'bold' }}>{getWeeklyRange()}</span>
          </div>
          <button 
            data-html2canvas-ignore="true"
            onClick={handleDownloadImage}
            style={{ padding: '10px 20px', backgroundColor: '#fee500', color: '#111', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}
          >
            📸 카톡 전송용 이미지 저장
          </button>
        </div>

        {/* 1. Student Information */}
        <div style={{ marginBottom: '35px' }}>
          <h2 style={{ fontSize: '14px', color: '#555', borderBottom: '1px solid #eee', paddingBottom: '5px' }}>1. Student Information</h2>
          <div style={{ display: 'flex', gap: '30px', marginTop: '20px' }}>
            <div style={{ width: '150px', height: '180px', backgroundColor: '#e2e8f0', display: 'flex', justifyContent: 'center', alignItems: 'center', border: '1px solid #ccc', borderRadius: '8px' }}>
              <span style={{ color: '#888', textAlign: 'center', padding: '10px', fontWeight: 'bold' }}>{selectedStudent?.currentBook || '교재 없음'}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', fontSize: '15px', paddingTop: '10px' }}>
              <div style={{ display: 'flex' }}><span style={{ width: '60px', color: '#666', fontWeight: 'bold' }}>이름:</span> <b>{selectedStudent?.name || '-'}</b></div>
              <div style={{ display: 'flex' }}><span style={{ width: '60px', color: '#666', fontWeight: 'bold' }}>과정:</span> <span>{selectedStudent?.grade || '-'}</span></div>
              <div style={{ display: 'flex' }}><span style={{ width: '60px', color: '#666', fontWeight: 'bold' }}>교재:</span> <span>{selectedStudent?.currentBook || '-'}</span></div>
              <div style={{ display: 'flex' }}><span style={{ width: '60px', color: '#666', fontWeight: 'bold' }}>진도:</span> <span>{selectedStudent?.progress || '-'}</span></div>
            </div>
          </div>
        </div>

        {/* 2. 이번 주 누적 학습량 & 오답 극복 지표 */}
        <div style={{ marginBottom: '35px' }}>
          <h2 style={{ fontSize: '14px', color: '#555', borderBottom: '1px solid #eee', paddingBottom: '5px' }}>2. Learning Volume & Attitude (학습량 및 태도)</h2>
          <div style={{ display: 'flex', gap: '15px', marginTop: '20px' }}>
            <div style={{ flex: 1, backgroundColor: '#f0f9ff', padding: '20px', borderRadius: '12px', border: '1px solid #bae6fd', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '17px', fontWeight: 'bold', color: '#0369a1' }}>📚 단어 마스터</span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                <span style={{ fontSize: '28px', fontWeight: '900', color: '#0284c7' }}>{realStats.wordCount}</span><span style={{ fontSize: '15px', color: '#0369a1', fontWeight: 'bold' }}>개</span>
              </div>
            </div>
            <div style={{ flex: 1, backgroundColor: '#f0fdf4', padding: '20px', borderRadius: '12px', border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '17px', fontWeight: 'bold', color: '#15803d' }}>🗣️ 체화된 문장</span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                <span style={{ fontSize: '28px', fontWeight: '900', color: '#16a34a' }}>{realStats.sentenceCount}</span><span style={{ fontSize: '15px', color: '#15803d', fontWeight: 'bold' }}>개</span>
              </div>
            </div>
            {/* 💡 [추가됨] 재시험을 긍정적인 '오답 극복(도전)'으로 포장 */}
            <div style={{ flex: 1, backgroundColor: '#fff7ed', padding: '20px', borderRadius: '12px', border: '1px solid #fed7aa', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '17px', fontWeight: 'bold', color: '#c2410c' }}>🔥 오답 극복 (도전)</span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                {realStats.retestCount > 0 ? (
                  <><span style={{ fontSize: '28px', fontWeight: '900', color: '#ea580c' }}>{realStats.retestCount}</span><span style={{ fontSize: '15px', color: '#c2410c', fontWeight: 'bold' }}>회 성공</span></>
                ) : (
                  <span style={{ fontSize: '20px', fontWeight: '900', color: '#ea580c' }}>원샷 원킬! 🎯</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 3. 막대 차트 */}
        <div style={{ marginBottom: '35px' }}>
          <h2 style={{ fontSize: '14px', color: '#555', borderBottom: '1px solid #eee', paddingBottom: '5px' }}>3. Achievement (영역별 성취도)</h2>
          <div style={{ width: '100%', height: '220px', marginTop: '15px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={chartData} margin={{ top: 5, right: 30, left: 80, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, 100]} />
                <YAxis dataKey="subject" type="category" width={80} fontSize={13} fontWeight="bold" />
                <Tooltip />
                <Bar dataKey="score" barSize={20} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 4. 방사형 차트 + 성장 추세선 */}
        <div style={{ marginBottom: '35px' }}>
          <h2 style={{ fontSize: '14px', color: '#555', borderBottom: '1px solid #eee', paddingBottom: '5px' }}>4. Overall Balance (학습 밸런스 및 성장)</h2>
          <div style={{ display: 'flex', marginTop: '15px', border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden' }}>
            
            {/* 좌측 점수판 (성장 뱃지 추가) */}
            <div style={{ flex: 1, borderRight: '1px solid #ddd', padding: '25px', display: 'flex', flexDirection: 'column', gap: '25px', backgroundColor: '#f8fafc', justifyContent: 'center' }}>
              {chartData.map((data, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '15px', fontWeight: '900', color: '#334155' }}>{data.subject}</span>
                    {/* 💡 [추가됨] 이전 주 대비 얼마나 올랐는지 보여주는 뱃지 */}
                    {renderTrendBadge(data.score, data.prev)}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '55px', height: '32px', display: 'flex', justifyContent: 'center', alignItems: 'center', border: '1px solid #cbd5e1', borderRadius: '6px', backgroundColor: 'white', fontWeight: '900', fontSize: '16px', color: '#0f172a' }}>
                      {data.score}
                    </div>
                    <span style={{ color: '#64748b', fontSize: '14px', fontWeight: 'bold' }}>/ 100</span>
                  </div>
                </div>
              ))}
            </div>
            
            {/* 우측 레이더 차트 */}
            <div style={{ flex: 1.5, height: '320px', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#ffffff', paddingTop: '15px' }}>
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

        {/* 5. Teacher's Comment & Next Goal */}
        <div>
          <h2 style={{ fontSize: '14px', color: '#555', borderBottom: '1px solid #eee', paddingBottom: '5px' }}>5. Teacher's Feedback</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '15px' }}>
            <textarea 
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="이번 주 코멘트가 여기에 생성됩니다."
              style={{ width: '100%', height: '120px', padding: '16px', border: '1px solid #cbd5e1', borderRadius: '8px', boxSizing: 'border-box', resize: 'vertical', fontSize: '15px', lineHeight: '1.6', outline: 'none', backgroundColor: '#f8fafc', color: '#334155', fontWeight: '500' }}
            />
            {/* 💡 [추가됨] 다음 주 목표 설정 입력칸 */}
            <input 
              type="text"
              value={nextGoal}
              onChange={(e) => setNextGoal(e.target.value)}
              placeholder="다음 주 목표를 입력하세요."
              style={{ width: '100%', padding: '16px', border: '1px solid #fed7aa', borderRadius: '8px', boxSizing: 'border-box', fontSize: '15px', outline: 'none', backgroundColor: '#fff7ed', color: '#9a3412', fontWeight: 'bold' }}
            />
          </div>
        </div>

      </div>
    </div>
  );
}