import React, { useState, useEffect } from 'react';

// 개별 학생 정보 규격
interface Student {
  id: string;
  name: string;
  currentBook: string;
  progress: string; 
  grade: string;    
}

// 과거 학습 이력 로그 규격
interface HistoryLog {
  date: string;
  book: string;
  progress: string;
  score: string;
  status: '통과' | '재시험' | '진행중';
}

export default function ElemManage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedGrade, setSelectedGrade] = useState<string>('전체');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [editBook, setEditBook] = useState('');
  const [editUnit, setEditUnit] = useState('');
  const [editDay, setEditDay] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // 1. 데이터 가져오기 (구글 시트 READ)
  const fetchElementaryStudents = async () => {
    try {
      setIsLoading(true);
      
      // ⚠️ [중요] 1단계에서 다시 발급받은 '쉼표로 구분된 값(.csv)' 주소를 여기에 넣으세요!
      const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTA4Z1o77LMkO66syR0SmqmWPu6q5NapogmBA2iOxpd379nYZ4Gu7y9h7KmGTVb9H9WXNfM5EnFlBxe/pub?gid=1059185510&single=true&output=csv';
      
      const response = await fetch(SHEET_CSV_URL);
      const text = await response.text();

      // HTML 웹페이지 코드를 잘못 불러온 경우 차단
      if (text.trim().startsWith('<')) {
        alert("🚨 구글 시트 주소가 잘못되었습니다! '웹에 게시'에서 형식을 'CSV'로 변경 후 링크를 다시 복사해주세요.");
        setIsLoading(false);
        return;
      }

      const rows = text.split('\n').map(row => row.trim()).filter(row => row !== '');
      
      const allStudents: Student[] = rows.slice(1).map(row => {
        // 따옴표 처리 및 쉼표 분리 방어 로직 (간단 버전)
        const cols = row.split(',').map(col => col.replace(/"/g, '').trim());
        return {
          id: cols[0],
          name: cols[1] || '이름없음',
          currentBook: cols[2] || '240_1',
          progress: cols[3] || 'Unit1 Day1',
          grade: cols[4] || '초1'
        };
      });

      // 학년에 '초'가 들어간 학생만 필터링 (잘못된 데이터 필터링 기능 추가)
      const elemStudents = allStudents.filter(student => student.grade.includes('초') && !student.name.includes('body'));
      setStudents(elemStudents);
      
      if (elemStudents.length > 0 && !selectedStudent) {
        handleSelectStudent(elemStudents[0]);
      }
    } catch (error) {
      console.error("초등부 명단을 가져오는데 실패했습니다.", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchElementaryStudents();
  }, []);

  const parseProgress = (progressStr: string) => {
    const parts = (progressStr || '').split(' ');
    const unit = parts[0] && parts[0].startsWith('Unit') ? parts[0] : 'Unit1';
    const day = parts[1] && parts[1].startsWith('Day') ? parts[1] : 'Day1';
    return { unit, day };
  };

  const handleSelectStudent = (student: Student) => {
    setSelectedStudent(student);
    const { unit, day } = parseProgress(student.progress);
    setEditBook(student.currentBook);
    setEditUnit(unit);
    setEditDay(day);
  };

  // 2. 가상의 과거 히스토리 타임라인 생성기
  const getStudentHistory = (student: Student): HistoryLog[] => {
    const { unit, day } = parseProgress(student.progress);
    const dayNum = parseInt(day.replace('Day', ''), 10) || 1;
    const logs: HistoryLog[] = [];
    const today = new Date();

    logs.push({
      date: today.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }) + ' (오늘)',
      book: student.currentBook,
      progress: `${unit} ${day}`,
      score: '대기 중',
      status: '진행중'
    });

    for (let i = dayNum - 1; i >= 1; i--) {
      const pastDate = new Date();
      pastDate.setDate(today.getDate() - (dayNum - i));
      const dateString = pastDate.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
      logs.push({
        date: dateString,
        book: student.currentBook,
        progress: `${unit} Day${i}`,
        score: i % 2 === 0 ? '90 / 100' : '100 / 100',
        status: '통과'
      });
    }
    return logs;
  };

  // 3. 구글 시트로 실시간 데이터 전송 및 저장
  const handleSaveProgress = async () => {
    if (!selectedStudent) return;
    
    const fullProgress = `${editUnit} ${editDay}`;
    setIsSaving(true);

    try {
      // ⚠️ [중요] 여기에 원장님의 'Apps Script 웹 앱 주소'를 다시 꼭 넣어주세요!
      const APPS_SCRIPT_URL = '아까 변경하고 넣었어음';

      const response = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        // 💡 핵심 해결책: 구글 보안 에러(CORS) 방지를 위해 text/plain 으로 우회하여 전송합니다.
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          studentId: selectedStudent.id,
          book: editBook,
          progress: fullProgress
        })
      });

      const result = await response.json();

      if (result.status === 'success') {
        const updatedStudent = { ...selectedStudent, currentBook: editBook, progress: fullProgress };
        setStudents(prev => prev.map(s => s.id === selectedStudent.id ? updatedStudent : s));
        setSelectedStudent(updatedStudent);
        alert(`[동기화 완료] ${selectedStudent.name} 학생의 진도가 성공적으로 저장되었습니다!`);
      } else {
        alert("저장 실패: " + result.message);
      }
    } catch (error) {
      console.error("진도 반영 실패:", error);
      alert("시트 저장 중 오류가 발생했습니다. 구글 앱스 스크립트 웹앱 주소를 확인해주세요.");
    } finally {
      setIsSaving(false);
    }
  };

  const gradeTabs = ['전체', '초1', '초2', '초3', '초4', '초5', '초6'];
  const filteredStudents = students.filter(student => selectedGrade === '전체' ? true : student.grade === selectedGrade);

  return (
    <div style={{ padding: '24px', fontFamily: 'Pretendard, -apple-system, sans-serif', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '26px', fontWeight: '800', color: '#1e293b', margin: 0 }}>👑 초등부 실시간 관제탑</h2>
        <p style={{ fontSize: '14px', color: '#64748b', marginTop: '4px' }}>학생들의 실시간 오늘 진도 점검 및 과거 학습 이력을 통합 관리합니다.</p>
      </div>
      
      {/* 학년 신속 필터 탭 */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        {gradeTabs.map(grade => (
          <button
            key={grade}
            onClick={() => setSelectedGrade(grade)}
            style={{
              padding: '10px 18px',
              borderRadius: '10px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold',
              transition: 'all 0.2s',
              backgroundColor: selectedGrade === grade ? '#007aff' : 'white',
              color: selectedGrade === grade ? 'white' : '#475569',
              boxShadow: selectedGrade === grade ? '0 4px 12px rgba(0,122,255,0.25)' : '0 2px 4px rgba(0,0,0,0.02)',
            }}
          >
            {grade}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontWeight: 'bold' }}>학생 정보를 로드하고 있습니다...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '24px', alignItems: 'start' }}>
          
          {/* [좌측 창] 학생 전체 목록 현황판 */}
          <div style={{ backgroundColor: 'white', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead style={{ backgroundColor: '#f1f5f9' }}>
                <tr>
                  <th style={thStyle}>학생 이름</th>
                  <th style={thStyle}>학년</th>
                  <th style={thStyle}>배정 교재</th>
                  <th style={thStyle}>현재 진행 진도</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.length > 0 ? (
                  filteredStudents.map(student => {
                    const isSelected = selectedStudent?.id === student.id;
                    return (
                      <tr 
                        key={student.id} 
                        onClick={() => handleSelectStudent(student)}
                        style={{ 
                          borderBottom: '1px solid #f1f5f9', 
                          cursor: 'pointer',
                          backgroundColor: isSelected ? '#f0f7ff' : 'transparent',
                          transition: 'background-color 0.2s'
                        }}
                      >
                        <td style={{ ...tdStyle, fontWeight: '700', color: isSelected ? '#007aff' : '#1e293b' }}>
                          {student.name} {isSelected && ' 🎯'}
                        </td>
                        <td style={tdStyle}><span style={badgeStyle}>{student.grade}</span></td>
                        <td style={{ ...tdStyle, color: '#334155', fontWeight: '500' }}>{student.currentBook} 권</td>
                        <td style={tdStyle}>
                          <span style={{ color: '#0f172a', fontWeight: '600', backgroundColor: '#f0fdf4', padding: '4px 8px', borderRadius: '6px', border: '1px solid #dcfce7' }}>
                            {student.progress}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={4} style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>해당 학년에 등록된 학생 명단이 없습니다.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* [우측 창] 개별 학생 원격 진도 세팅기 + 히스토리 서랍 */}
          {selectedStudent ? (
            <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0', position: 'sticky', top: '24px' }}>
              
              <div style={{ borderBottom: '2px solid #f1f5f9', paddingBottom: '16px', marginBottom: '20px' }}>
                <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#007aff', backgroundColor: '#e0f2fe', padding: '3px 8px', borderRadius: '4px' }}>
                  {selectedStudent.grade} 관리중
                </span>
                <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', margin: '6px 0 2px 0' }}>{selectedStudent.name}</h3>
                <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>현재 세팅: {selectedStudent.currentBook}권 / {selectedStudent.progress}</p>
              </div>

              {/* 실시간 진도 수동 지정 */}
              <div style={{ marginBottom: '24px' }}>
                <h4 style={sectionTitleStyle}>✍️ 실시간 진도 수동 지정</h4>
                <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
                  <select value={editBook} onChange={(e) => setEditBook(e.target.value)} style={detailSelectStyle}>
                    <option value="240_1">240_1 권</option>
                    <option value="240_2">240_2 권</option>
                    <option value="240_3">240_3 권</option>
                    <option value="240_4">240_4 권</option>
                    <option value="520_1">520_1 권</option>
                    <option value="520_2">520_2 권</option>
                    <option value="520_3">520_3 권</option>
                    <option value="520_4">520_4 권</option>
                    <option value="860_1">860_1 권</option>
                    <option value="860_2">860_2 권</option>
                    <option value="860_3">860_3 권</option>
                    <option value="860_4">860_4 권</option>
                    <option value="1240_1">1240_1 권</option>
                    <option value="1240_2">1240_2 권</option>
                    <option value="1240_3">1240_3 권</option>
                    <option value="1240_4">1240_4 권</option>
                    <option value="1680_1">1680_1 권</option>
                    <option value="1680_2">1680_2 권</option>
                    <option value="1680_3">1680_3 권</option>
                    <option value="1680_4">1680_4 권</option>
                  </select>
                  <select value={editUnit} onChange={(e) => setEditUnit(e.target.value)} style={detailSelectStyle}>
                    {['Unit1', 'Unit2', 'Unit3', 'Unit4'].map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                  <select value={editDay} onChange={(e) => setEditDay(e.target.value)} style={detailSelectStyle}>
                    {['Day1', 'Day2', 'Day3', 'Day4'].map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>

                <button 
                  onClick={handleSaveProgress}
                  disabled={isSaving}
                  style={{
                    width: '100%',
                    padding: '12px',
                    backgroundColor: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '10px',
                    fontWeight: 'bold',
                    fontSize: '14px',
                    cursor: isSaving ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 12px rgba(16,185,129,0.2)',
                    transition: 'all 0.2s'
                  }}
                >
                  {isSaving ? '구글 시트 동기화 중...' : '✔ 진도 변경 및 시트 반영'}
                </button>
              </div>

              {/* 학습 히스토리 타임라인 */}
              <div>
                <h4 style={sectionTitleStyle}>⏳ 학습 히스토리 타임라인 (과거 기록)</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '200px', overflowY: 'auto', paddingRight: '4px' }}>
                  {getStudentHistory(selectedStudent).map((log, idx) => (
                    <div 
                      key={idx} 
                      style={{ 
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                        padding: '10px 12px', 
                        backgroundColor: log.status === '진행중' ? '#fffbeb' : '#f8fafc', 
                        borderRadius: '8px',
                        border: log.status === '진행중' ? '1px dashed #f59e0b' : '1px solid #e2e8f0'
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>{log.date}</div>
                        <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#334155', marginTop: '2px' }}>
                          {log.book}권 {log.progress}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ 
                          fontSize: '11px', fontWeight: 'bold', padding: '3px 6px', borderRadius: '4px',
                          color: log.status === '진행중' ? '#b45309' : '#15803d',
                          backgroundColor: log.status === '진행중' ? '#fef3c7' : '#dcfce7'
                        }}>
                          {log.status === '진행중' ? '진행중' : '완료'}
                        </span>
                        <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569', marginTop: '3px' }}>{log.score}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          ) : (
            <div style={{ border: '2px dashed #cbd5e1', padding: '40px', textAlign: 'center', borderRadius: '16px', color: '#94a3b8', fontSize: '14px', fontWeight: '500' }}>
              왼쪽 학생 명단에서 상세 기록과 <br />진도를 설정할 학생을 선택해 주세요.
            </div>
          )}

        </div>
      )}
    </div>
  );
}

// 공통 스타일 오브젝트
const thStyle = { padding: '14px 16px', borderBottom: '2px solid #e2e8f0', color: '#475569', fontSize: '14px', fontWeight: '700' as const };
const tdStyle = { padding: '16px', fontSize: '14px', color: '#334155' };
const badgeStyle = { backgroundColor: '#f1f5f9', color: '#475569', padding: '4px 8px', borderRadius: '6px', fontWeight: 'bold' as const, fontSize: '12px' };
const sectionTitleStyle = { fontSize: '14px', fontWeight: '700' as const, color: '#475569', margin: '0 0 10px 0' };
const detailSelectStyle = { flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: 'white', fontSize: '14px', fontWeight: '600' as const, outline: 'none', textAlign: 'center' as const };