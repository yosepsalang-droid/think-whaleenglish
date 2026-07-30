import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface Student {
  id: string;
  name: string;
  currentBook: string;
  grade: string;    
  wordDone: string;       
  sentenceDone: string;   
  verbDone: string;       
  recordDone: string;     
  aiChatDone: string;     
}

const SERIES_LIST = ['240', '520', '860', '1240', '1680'];
const BOOK_NUM_LIST = ['1', '2', '3', '4', '5', '6'];

// 💡 텍스트 추출 로직 초강화: U, Unit, unit, 유닛 등 어떤 형태든 뒤에 오는 숫자만 귀신같이 뽑아냄
const parseUnitDay = (bookInfo: string) => {
  if (!bookInfo) return '';
  const uMatch = bookInfo.match(/(?:u|unit|유닛)[^\d]*(\d+)/i);
  const dMatch = bookInfo.match(/(?:d|day|데이)[^\d]*(\d+)/i);
  
  if (uMatch && dMatch) {
    return `(U${uMatch[1]}D${dMatch[1]})`;
  }
  return ''; // 못 찾으면 빈칸 반환
};

export default function ElemManage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  
  const [selectedGrade, setSelectedGrade] = useState<string>('전체');

  const [editSeries, setEditSeries] = useState('240');
  const [editBookNum, setEditBookNum] = useState('1');
  const [isSaving, setIsSaving] = useState(false);

  const [manageStudent, setManageStudent] = useState<Student | null>(null);
  const [manageName, setManageName] = useState('');
  const [manageGrade, setManageGrade] = useState('');
  const [isManaging, setIsManaging] = useState(false);

  const fetchAllLMSData = async () => {
    try {
      setIsLoading(true);
      const { data: studentsData, error: studentError } = await supabase
        .from('students')
        .select('*')
        .like('grade', '%초%')
        .order('name', { ascending: true }); 

      if (studentError) throw studentError;

      // 💡 한국 시간(KST) 기준으로 정확한 '오늘 자정(00:00)' 구하기 (시차 문제 해결!)
      const now = new Date();
      const kstOffset = 9 * 60 * 60 * 1000;
      const kstNow = new Date(now.getTime() + kstOffset);
      const kstDateStr = kstNow.toISOString().split('T')[0]; // 예: 2026-07-30
      
      // KST 자정을 다시 UTC 형식으로 변환하여 수파베이스에 던짐
      const startOfTodayUTC = new Date(`${kstDateStr}T00:00:00+09:00`).toISOString();

      const { data: logsData, error: logError } = await supabase
        .from('learning_logs')
        .select('student_id, task_type, status, book_info')
        .gte('created_at', startOfTodayUTC) // 👈 정확히 한국시간 오늘 0시 이후 것만!
        .eq('status', '완료');

      if (logError) throw logError;

      const todayDoneMap = new Map<string, { word: string; sentence: string; verb: string; record: string; ai: string }>();

      (logsData || []).forEach(log => {
        if (!todayDoneMap.has(log.student_id)) {
          todayDoneMap.set(log.student_id, { word: '', sentence: '', verb: '', record: '', ai: '' });
        }
        const record = todayDoneMap.get(log.student_id)!;
        const detail = parseUnitDay(log.book_info); 

        if (log.task_type.includes('단어')) record.word = `✅ 단어${detail}`;
        if (log.task_type.includes('문장')) record.sentence = `✅ 문장${detail}`;
        if (log.task_type.includes('동사') || log.task_type.includes('3단')) record.verb = `✅ 3단동사${detail}`; 
        if (log.task_type.includes('녹음')) record.record = `✅ 녹음${detail}`;
        if (log.task_type.includes('회화') || log.task_type.includes('AI') || log.task_type.includes('고래')) record.ai = `🤖 회화${detail}`;
      });

      const elemStudents: Student[] = (studentsData || []).map(row => {
        const doneStatus = todayDoneMap.get(row.student_id) || { word: '', sentence: '', verb: '', record: '', ai: '' };

        return {
          id: row.student_id,
          name: row.name || '이름없음',
          currentBook: row.currentBook || '240_1',
          grade: row.grade || '초1',
          wordDone: doneStatus.word,
          sentenceDone: doneStatus.sentence,
          verbDone: doneStatus.verb, 
          recordDone: doneStatus.record,
          aiChatDone: doneStatus.ai
        };
      });

      setStudents(elemStudents.filter(s => !s.name.includes('body')));
      
    } catch (error) {
      console.error("수파베이스 데이터 로드 에러", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllLMSData();
  }, []);

  const handleSelectStudent = (student: Student) => {
    if (selectedStudent?.id === student.id) {
      setSelectedStudent(null);
      return;
    }
    setSelectedStudent(student);
    
    const [series = '240', bookNum = '1'] = (student.currentBook || '240_1').split('_');
    setEditSeries(series);
    setEditBookNum(bookNum);
  };

  const handleSaveProgress = async (e: React.MouseEvent) => {
    e.stopPropagation(); 
    if (!selectedStudent) return;
    
    const fullBook = `${editSeries}_${editBookNum}`;
    setIsSaving(true);

    try {
      const { error } = await supabase
        .from('students')
        .update({
          currentBook: fullBook
        })
        .eq('student_id', selectedStudent.id);

      if (error) throw error;

      const updatedStudent = { ...selectedStudent, currentBook: fullBook };
      setStudents(prev => prev.map(s => s.id === selectedStudent.id ? updatedStudent : s));
      setSelectedStudent(updatedStudent);
      alert(`✅ ${selectedStudent.name} 학생의 교재가 [${fullBook}권]으로 변경되었습니다.`);
      
    } catch (error) {
      alert("교재 변경에 실패했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  const openManageModal = (e: React.MouseEvent, student: Student) => {
    e.stopPropagation(); 
    setManageStudent(student);
    setManageName(student.name);
    setManageGrade(student.grade);
  };

  const handleUpdateStudentInfo = async () => {
    if (!manageStudent || !manageName || !manageGrade) return;
    setIsManaging(true);
    try {
      const { error } = await supabase
        .from('students')
        .update({ name: manageName, grade: manageGrade })
        .eq('student_id', manageStudent.id);

      if (error) throw error;

      setStudents(prev => prev.map(s => s.id === manageStudent.id ? { ...s, name: manageName, grade: manageGrade } : s));
      alert('학생 정보가 수정되었습니다.');
      setManageStudent(null);
    } catch (error) {
      alert('수정 실패');
    } finally {
      setIsManaging(false);
    }
  };

  const handleDeleteStudent = async () => {
    if (!manageStudent) return;
    const confirmDelete = window.confirm(`정말 [${manageStudent.name}] 학생을 퇴소(데이터 삭제) 처리하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`);
    if (!confirmDelete) return;

    setIsManaging(true);
    try {
      const { error } = await supabase
        .from('students')
        .delete()
        .eq('student_id', manageStudent.id);

      if (error) throw error;

      setStudents(prev => prev.filter(s => s.id !== manageStudent.id));
      alert('퇴소 처리가 완료되었습니다.');
      setManageStudent(null);
      if (selectedStudent?.id === manageStudent.id) setSelectedStudent(null);
    } catch (error) {
      alert('퇴소 처리 실패');
    } finally {
      setIsManaging(false);
    }
  };

  const StatusBadge = ({ status, fallback }: { status: string, fallback: string }) => {
    const isDone = status !== '';
    return (
      <span style={{
        padding: '2px 4px',
        borderRadius: '4px',
        fontSize: '11px',
        fontWeight: 'bold',
        border: '1px solid',
        whiteSpace: 'nowrap',
        backgroundColor: isDone ? '#f0fdf4' : '#f9fafb',
        color: isDone ? '#15803d' : '#9ca3af',
        borderColor: isDone ? '#bbf7d0' : '#e5e7eb',
        letterSpacing: '-0.5px'
      }}>
        {isDone ? status : fallback}
      </span>
    );
  };

  const filteredStudents = selectedGrade === '전체' 
    ? students 
    : students.filter(s => s.grade === selectedGrade);

  const uniqueGrades = ['전체', '초1', '초2', '초3', '초4', '초5', '초6'];

  return (
    <div style={{ backgroundColor: 'white', color: '#1f2937', padding: '16px', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', width: '100%', boxSizing: 'border-box', margin: '0 auto', fontFamily: 'Pretendard, sans-serif' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '900', color: '#1f2937', margin: 0 }}>👑 초등부 관제탑</h2>
          <button 
            onClick={fetchAllLMSData} 
            style={{ 
              padding: '6px 12px', backgroundColor: '#eff6ff', color: '#2563eb', 
              border: '1px solid #bfdbfe', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' 
            }}
          >
            {isLoading ? '⏳ 로딩중..' : '🔄 새로고침'}
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {uniqueGrades.map(grade => {
              const isSelected = selectedGrade === grade;
              return (
                <button
                  key={grade}
                  onClick={() => setSelectedGrade(grade)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '20px',
                    fontSize: '13px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    border: isSelected ? '1px solid #2563eb' : '1px solid #d1d5db',
                    backgroundColor: isSelected ? '#2563eb' : '#ffffff',
                    color: isSelected ? '#ffffff' : '#4b5563',
                    transition: 'all 0.1s ease'
                  }}
                >
                  {grade}
                </button>
              )
            })}
          </div>
          <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#4b5563', borderLeft: '2px solid #e5e7eb', paddingLeft: '12px' }}>
            총 <span style={{ color: '#2563eb', fontSize: '15px' }}>{filteredStudents.length}</span>명
          </div>
        </div>
      </div>

      <div style={{ overflowX: 'auto', width: '100%' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', tableLayout: 'auto', fontSize: '13px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f3f4f6', color: '#374151', borderBottom: '2px solid #9ca3af' }}>
              <th style={{ border: '1px solid #cbd5e1', padding: '6px 2px', textAlign: 'center', whiteSpace: 'nowrap', width: '4%' }}>번호</th>
              <th style={{ border: '1px solid #cbd5e1', padding: '6px 2px', textAlign: 'center', whiteSpace: 'nowrap', width: '5%' }}>학년</th>
              <th style={{ border: '1px solid #cbd5e1', padding: '6px 2px', textAlign: 'center', whiteSpace: 'nowrap', width: '8%' }}>이름</th>
              <th style={{ border: '1px solid #cbd5e1', padding: '6px 2px', textAlign: 'center', whiteSpace: 'nowrap', width: '45%' }}>오늘 학습 현황</th>
              <th style={{ border: '1px solid #cbd5e1', padding: '6px 2px', textAlign: 'center', whiteSpace: 'nowrap', width: '15%' }}>교재 설정</th>
              <th style={{ border: '1px solid #cbd5e1', padding: '6px 2px', textAlign: 'center', whiteSpace: 'nowrap', width: '7%' }}>관리</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.length === 0 && !isLoading && (
              <tr>
                <td colSpan={6} style={{ border: '1px solid #e2e8f0', padding: '30px', textAlign: 'center', color: '#9ca3af' }}>
                  해당 학년({selectedGrade})에 등록된 학생이 없습니다.
                </td>
              </tr>
            )}
            
            {filteredStudents.map((student, index) => {
              const isSelected = selectedStudent?.id === student.id;
              
              return (
                <tr 
                  key={student.id} 
                  onClick={() => handleSelectStudent(student)} 
                  style={{ backgroundColor: isSelected ? '#eff6ff' : 'transparent', cursor: 'pointer', transition: 'background-color 0.1s' }}
                >
                  <td style={{ border: '1px solid #e2e8f0', padding: '6px 2px', textAlign: 'center', color: '#6b7280', fontWeight: 'bold' }}>{index + 1}</td>
                  
                  <td style={{ border: '1px solid #e2e8f0', padding: '6px 2px', textAlign: 'center', color: '#4b5563', fontWeight: '500' }}>{student.grade}</td>

                  <td style={{ border: '1px solid #e2e8f0', padding: '6px 2px', textAlign: 'center', fontWeight: '800', color: '#111827', fontSize: '14px', whiteSpace: 'nowrap' }}>{student.name}</td>
                  
                  <td style={{ border: '1px solid #e2e8f0', padding: '4px 2px' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: '4px', width: '100%' }}>
                      <StatusBadge status={student.wordDone} fallback="❌ 단어" />
                      <StatusBadge status={student.sentenceDone} fallback="❌ 문장" />
                      <StatusBadge status={student.verbDone} fallback="❌ 3단동사" />
                      <StatusBadge status={student.aiChatDone} fallback="🤖 회화" />
                    </div>
                  </td>

                  <td style={{ border: '1px solid #e2e8f0', padding: '4px 2px' }}>
                    {isSelected ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: '4px' }} onClick={(e) => e.stopPropagation()}>
                        <select value={editSeries} onChange={e => setEditSeries(e.target.value)} style={{ padding: '2px', borderRadius: '4px', border: '1px solid #d1d5db', fontSize: '12px', outline: 'none' }}>
                          {SERIES_LIST.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <select value={editBookNum} onChange={e => setEditBookNum(e.target.value)} style={{ padding: '2px', borderRadius: '4px', border: '1px solid #d1d5db', fontSize: '12px', outline: 'none' }}>
                          {BOOK_NUM_LIST.map(n => <option key={n} value={n}>{n}권</option>)}
                        </select>
                        <button 
                          onClick={handleSaveProgress} 
                          disabled={isSaving}
                          style={{ backgroundColor: '#2563eb', color: 'white', fontSize: '12px', padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}
                        >
                          {isSaving ? '저장중' : '저장'}
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span style={{ color: '#1f2937', fontWeight: 'bold', fontSize: '13px', whiteSpace: 'nowrap' }}>
                          {student.currentBook}권
                        </span>
                      </div>
                    )}
                  </td>

                  <td style={{ border: '1px solid #e2e8f0', padding: '6px 2px', textAlign: 'center' }}>
                    <button 
                      onClick={(e) => openManageModal(e, student)}
                      style={{ backgroundColor: 'white', color: '#4b5563', border: '1px solid #d1d5db', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap' }}
                    >
                      ⚙️ 관리
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 모달창 생략 없이 원본 유지 */}
      {manageStudent && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 50 }}>
          <div style={{ backgroundColor: 'white', border: '1px solid #e5e7eb', padding: '24px', borderRadius: '16px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', width: '24rem', position: 'relative', margin: '0 16px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#1f2937', margin: '0 0 16px 0' }}>⚙️ 학생 정보 관리</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: '#4b5563', marginBottom: '4px', fontWeight: 'bold' }}>학생 이름</label>
                <input 
                  type="text" 
                  value={manageName}
                  onChange={(e) => setManageName(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', backgroundColor: '#f9fafb', border: '1px solid #d1d5db', borderRadius: '8px', padding: '8px', color: '#1f2937', outline: 'none' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: '#4b5563', marginBottom: '4px', fontWeight: 'bold' }}>학년 (예: 초1, 초5)</label>
                <input 
                  type="text" 
                  value={manageGrade}
                  onChange={(e) => setManageGrade(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', backgroundColor: '#f9fafb', border: '1px solid #d1d5db', borderRadius: '8px', padding: '8px', color: '#1f2937', outline: 'none' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '16px', borderTop: '1px solid #e5e7eb' }}>
              <button 
                onClick={handleDeleteStudent}
                disabled={isManaging}
                style={{ color: '#ef4444', backgroundColor: 'transparent', border: 'none', padding: '8px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                🗑️ 퇴소 처리
              </button>
              
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  onClick={() => setManageStudent(null)}
                  style={{ backgroundColor: '#f3f4f6', color: '#374151', border: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  취소
                </button>
                <button 
                  onClick={handleUpdateStudentInfo}
                  disabled={isManaging}
                  style={{ backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  {isManaging ? '저장중...' : '정보 수정'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}