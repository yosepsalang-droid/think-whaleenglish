import React, { useState, useEffect, useMemo } from 'react';
import { CONFIG } from '../config';

interface Student {
  id: string;
  name: string;
  currentBook: string;
  progress: string;
  grade: string;
}

export default function ReportManage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  
  // 리포트에 들어갈 추가 코멘트 상태
  const [teacherComment, setTeacherComment] = useState('이번 주도 결석 없이 성실하게 학습을 완료했습니다. 앞으로도 많은 칭찬과 격려 부탁드립니다!');

  // 💡 1. 학생 명단 불러오기
  const fetchStudents = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${CONFIG.SHEETS.STUDENT_LIST}&_nocache=${Date.now()}`);
      const text = await response.text();
      const rows = text.split('\n').slice(1).filter(row => row.trim() !== '');
      
      const parsedStudents = rows.map(row => {
        const cols = row.split(',').map(col => col.replace(/"/g, '').trim());
        return {
          id: cols[0],
          name: cols[1],
          currentBook: cols[2],
          progress: cols[3],
          grade: cols[4]
        };
      });
      
      setStudents(parsedStudents);
      if (parsedStudents.length > 0) {
        setSelectedStudent(parsedStudents[0]);
      }
    } catch (error) {
      console.error("데이터 로드 실패", error);
      alert("학생 데이터를 불러오는데 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  // 💡 2. 오늘 날짜를 기준으로 'X월 X주차' 계산기
  const weekInfo = useMemo(() => {
    const today = new Date();
    const month = today.getMonth() + 1;
    const date = today.getDate();
    const weekNumber = Math.ceil(date / 7);
    return `${month}월 ${weekNumber}주차`;
  }, []);

  // 💡 3. 카카오톡 전송용 리포트 텍스트 자동 생성
  const reportText = useMemo(() => {
    if (!selectedStudent) return '';

    return `안녕하세요 학부모님! 🐋 고래영어입니다.
${selectedStudent.name} 학생의 ${weekInfo} 주간 학습 리포트를 보내드립니다.

━━━━━━━━━━━━━━━━
👤 학생: ${selectedStudent.name} (${selectedStudent.grade})
📖 현재 교재: ${selectedStudent.currentBook}권
🎯 현재 진도: ${selectedStudent.progress}

[이번 주 달성 미션 🏆]
✅ 영단어 완벽 암기 통과
✅ 어순 감각 문장 배열 통과
✅ 핵심 문법 퀴즈 통과
━━━━━━━━━━━━━━━━

💬 원장님 코멘트:
${teacherComment}

가정에서도 우리 ${selectedStudent.name}(이)가 성취감을 느낄 수 있도록 아낌없는 폭풍 칭찬 부탁드립니다! 감사합니다. 🙇‍♂️🙇‍♀️`;
  }, [selectedStudent, weekInfo, teacherComment]);

  // 💡 4. 클립보드 복사 기능
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(reportText);
      alert('카카오톡 전송용 리포트가 복사되었습니다! 카톡 창에 붙여넣기(Ctrl+V) 하세요.');
    } catch (err) {
      alert('복사에 실패했습니다. 직접 드래그해서 복사해주세요.');
    }
  };

  return (
    <div style={{ padding: '30px', backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: 'Pretendard, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '28px', fontWeight: '800', color: '#0f172a' }}>💌 주말 리포트 자동 생성기</h2>
          <p style={{ margin: '8px 0 0 0', color: '#64748b', fontSize: '15px' }}>학생을 선택하면 학부모님께 보낼 카카오톡 메시지가 1초 만에 완성됩니다.</p>
        </div>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>학생 데이터를 불러오는 중입니다...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
          
          {/* 왼쪽: 학생 리스트 */}
          <div style={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <div style={{ backgroundColor: '#f1f5f9', padding: '16px', fontWeight: 'bold', color: '#334155', borderBottom: '1px solid #e2e8f0' }}>
              학생 명단 ({students.length}명)
            </div>
            <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
              {students.map(student => (
                <div 
                  key={student.id} 
                  onClick={() => setSelectedStudent(student)}
                  style={{ 
                    padding: '16px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer',
                    backgroundColor: selectedStudent?.id === student.id ? '#eff6ff' : 'white',
                    borderLeft: selectedStudent?.id === student.id ? '4px solid #3b82f6' : '4px solid transparent',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ fontWeight: 'bold', color: '#0f172a', fontSize: '16px' }}>{student.name}</div>
                  <div style={{ color: '#64748b', fontSize: '13px', marginTop: '4px' }}>{student.grade} | {student.currentBook}권</div>
                </div>
              ))}
            </div>
          </div>

          {/* 오른쪽: 리포트 템플릿 및 미리보기 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* 코멘트 입력부 */}
            <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#334155' }}>✍️ 이번 주 맞춤 코멘트 (선택)</h3>
              <textarea 
                value={teacherComment}
                onChange={(e) => setTeacherComment(e.target.value)}
                style={{ 
                  width: '100%', height: '80px', padding: '12px', borderRadius: '8px', 
                  border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', resize: 'none',
                  fontSize: '14px', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box'
                }}
              />
            </div>

            {/* 카카오톡 미리보기 화면 */}
            <div style={{ backgroundColor: '#bac8ff', padding: '32px', borderRadius: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ backgroundColor: '#abc1d1', padding: '8px 24px', borderRadius: '20px', color: 'white', fontSize: '12px', fontWeight: 'bold', marginBottom: '20px' }}>
                카카오톡 미리보기
              </div>
              
              <div style={{ 
                backgroundColor: '#fee500', width: '100%', maxWidth: '400px', 
                borderRadius: '16px', padding: '20px', position: 'relative',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
              }}>
                {/* 카카오톡 말풍선 꼬리 */}
                <div style={{ position: 'absolute', top: '16px', left: '-8px', borderTop: '8px solid transparent', borderBottom: '8px solid transparent', borderRight: '12px solid #fee500' }}></div>
                
                <pre style={{ 
                  margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'keep-all', 
                  fontFamily: 'Pretendard, sans-serif', fontSize: '15px', lineHeight: '1.6', color: '#111' 
                }}>
                  {reportText}
                </pre>
              </div>

              <button 
                onClick={handleCopy}
                style={{ 
                  marginTop: '24px', padding: '16px 32px', backgroundColor: '#111', color: 'white', 
                  border: 'none', borderRadius: '12px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', gap: '8px'
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                카톡 텍스트 복사하기
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}