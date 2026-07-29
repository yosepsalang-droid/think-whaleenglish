import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface Student {
  id: string;
  name: string;
  currentBook: string;
  progress: string; 
  grade: string;    
  wordDone: string;       
  sentenceDone: string;   
  verbDone: string;       
  recordDone: string;     
  aiChatDone: string;     
}

const SERIES_LIST = ['240', '520', '860', '1240', '1680'];
const BOOK_NUM_LIST = ['1', '2', '3', '4', '5', '6'];
const UNIT_LIST = ['Unit1', 'Unit2', 'Unit3', 'Unit4'];
const DAY_LIST = ['Day1', 'Day2', 'Day3', 'Day4'];

const parseUnitDay = (bookInfo: string) => {
  if (!bookInfo) return '';
  const unitMatch = bookInfo.match(/unit\s*(\d+)/i);
  const dayMatch = bookInfo.match(/day\s*(\d+)/i);
  if (unitMatch && dayMatch) {
    return `(U${unitMatch[1]}D${dayMatch[1]})`;
  }
  return '';
};

export default function ElemManage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  
  const [selectedGrade, setSelectedGrade] = useState<string>('전체');

  const [editSeries, setEditSeries] = useState('240');
  const [editBookNum, setEditBookNum] = useState('1');
  const [editUnit, setEditUnit] = useState('Unit1');
  const [editDay, setEditDay] = useState('Day1');
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

      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();

      const { data: logsData, error: logError } = await supabase
        .from('learning_logs')
        .select('student_id, task_type, status, book_info')
        .gte('created_at', startOfDay) 
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
          progress: row.progress || 'Unit1 Day1',
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

  const parseProgress = (progressStr: string) => {
    const parts = (progressStr || '').split(' ');
    const unit = parts[0] && parts[0].startsWith('Unit') ? parts[0] : 'Unit1';
    const day = parts[1] && parts[1].startsWith('Day') ? parts[1] : 'Day1';
    return { unit, day };
  };

  const handleSelectStudent = (student: Student) => {
    if (selectedStudent?.id === student.id) {
      setSelectedStudent(null);
      return;
    }
    setSelectedStudent(student);
    
    const [series = '240', bookNum = '1'] = (student.currentBook || '240_1').split('_');
    const { unit, day } = parseProgress(student.progress);
    
    setEditSeries(series);
    setEditBookNum(bookNum);
    setEditUnit(unit);
    setEditDay(day);
  };

  const handleSaveProgress = async (e: React.MouseEvent) => {
    e.stopPropagation(); 
    if (!selectedStudent) return;
    
    const fullBook = `${editSeries}_${editBookNum}`;
    const fullProgress = `${editUnit} ${editDay}`;
    setIsSaving(true);

    try {
      const { error } = await supabase
        .from('students')
        .update({
          currentBook: fullBook,
          progress: fullProgress
        })
        .eq('student_id', selectedStudent.id);

      if (error) throw error;

      const updatedStudent = { ...selectedStudent, currentBook: fullBook, progress: fullProgress };
      setStudents(prev => prev.map(s => s.id === selectedStudent.id ? updatedStudent : s));
      setSelectedStudent(updatedStudent);
      alert(`✅ ${selectedStudent.name} 학생의 진도가 [${fullBook}권 / ${fullProgress}]로 저장되었습니다.`);
      
    } catch (error) {
      alert("진도 저장에 실패했습니다.");
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
        padding: '2px 8px',
        borderRadius: '4px',
        fontSize: '11px',
        fontWeight: 'bold',
        border: '1px solid',
        whiteSpace: 'nowrap',
        backgroundColor: isDone ? '#f0fdf4' : '#f9fafb',
        color: isDone ? '#15803d' : '#9ca3af',
        borderColor: isDone ? '#bbf7d0' : '#e5e7eb'
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
    <div style={{ backgroundColor: 'white', color: '#1f2937', padding: '24px', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', maxWidth: '80rem', margin: '16px auto' }}>
      
      {/* 헤더 */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: '900', color: '#1f2937', margin: '0 0 8px 0' }}>👑 초등부 실시간 관제탑</h2>
        
        {/* ⭐️ 강제 스타일 주입된 새로고침 버튼 */}
        <button 
          onClick={fetchAllLMSData} 
          style={{ 
            marginTop: '8px', padding: '8px 16px', backgroundColor: '#eff6ff', color: '#2563eb', 
            border: '1px solid #bfdbfe', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' 
          }}
        >
          {isLoading ? '⏳ 데이터 가져오는 중...' : '🔄 실시간 데이터 새로고침'}
        </button>
      </div>

      {/* ⭐️ 강제 스타일 주입된 예쁜 둥근(알약) 학년 탭 버튼 */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px' }}>
          {uniqueGrades.map(grade => {
            const isSelected = selectedGrade === grade;
            return (
              <button
                key={grade}
                onClick={() => setSelectedGrade(grade)}
                style={{
                  padding: '8px 24px',
                  borderRadius: '9999px', // 완벽한 알약 모양
                  fontSize: '14px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  border: isSelected ? '1px solid #2563eb' : '1px solid #d1d5db',
                  backgroundColor: isSelected ? '#2563eb' : '#ffffff',
                  color: isSelected ? '#ffffff' : '#6b7280',
                  boxShadow: isSelected ? '0 4px 6px -1px rgba(37, 99, 235, 0.2)' : 'none',
                  transition: 'all 0.2s ease-in-out'
                }}
              >
                {grade}
              </button>
            )
          })}
        </div>
        <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#4b5563' }}>
          총 <span style={{ color: '#2563eb', fontSize: '18px', margin: '0 4px' }}>{filteredStudents.length}</span> 명
        </div>
      </div>

      {/* ⭐️ 강제 테두리 + 모든 항목 완벽하게 '가운데(Center)' 정렬된 테이블 */}
      <div style={{ overflowX: 'auto', width: '100%' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: '900px', fontSize: '14px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f3f4f6', color: '#374151' }}>
              <th style={{ border: '1px solid #9ca3af', padding: '10px', textAlign: 'center', whiteSpace: 'nowrap', width: '48px' }}>번호</th>
              <th style={{ border: '1px solid #9ca3af', padding: '10px', textAlign: 'center', whiteSpace: 'nowrap', width: '64px' }}>학년</th>
              <th style={{ border: '1px solid #9ca3af', padding: '10px', textAlign: 'center', whiteSpace: 'nowrap', width: '96px' }}>이름</th>
              {/* 제목들을 전부 center로 변경 */}
              <th style={{ border: '1px solid #9ca3af', padding: '10px', textAlign: 'center', whiteSpace: 'nowrap' }}>오늘 학습 현황</th>
              <th style={{ border: '1px solid #9ca3af', padding: '10px', textAlign: 'center', whiteSpace: 'nowrap' }}>학습 진도 설정</th>
              <th style={{ border: '1px solid #9ca3af', padding: '10px', textAlign: 'center', whiteSpace: 'nowrap', width: '80px' }}>관리</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.length === 0 && !isLoading && (
              <tr>
                <td colSpan={6} style={{ border: '1px solid #cbd5e1', padding: '40px', textAlign: 'center', color: '#9ca3af' }}>
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
                  style={{ backgroundColor: isSelected ? '#eff6ff' : 'transparent', cursor: 'pointer', transition: 'background-color 0.2s' }}
                >
                  <td style={{ border: '1px solid #cbd5e1', padding: '8px', textAlign: 'center', color: '#6b7280', fontWeight: 'bold', whiteSpace: 'nowrap' }}>{index + 1}</td>
                  
                  <td style={{ border: '1px solid #cbd5e1', padding: '8px', textAlign: 'center', color: '#4b5563', fontWeight: '500', whiteSpace: 'nowrap' }}>{student.grade}</td>

                  {/* 이름도 중앙 정렬 */}
                  <td style={{ border: '1px solid #cbd5e1', padding: '8px', textAlign: 'center', fontWeight: '800', color: '#111827', fontSize: '16px', whiteSpace: 'nowrap' }}>{student.name}</td>
                  
                  {/* 학습 현황 뱃지들을 정중앙(justifyContent: center)으로 정렬 */}
                  <td style={{ border: '1px solid #cbd5e1', padding: '8px' }}>
                    <div style={{ display: 'flex', flexWrap: 'nowrap', justifyContent: 'center', alignItems: 'center', gap: '6px', width: '100%' }}>
                      <StatusBadge status={student.wordDone} fallback="❌ 단어" />
                      <StatusBadge status={student.sentenceDone} fallback="❌ 문장" />
                      <StatusBadge status={student.verbDone} fallback="❌ 3단동사" />
                      <StatusBadge status={student.aiChatDone} fallback="🤖 회화" />
                    </div>
                  </td>

                  {/* 진도 설정도 정중앙(justifyContent: center)으로 정렬 */}
                  <td style={{ border: '1px solid #cbd5e1', padding: '8px' }}>
                    {isSelected ? (
                      <div style={{ display: 'flex', flexWrap: 'nowrap', justifyContent: 'center', alignItems: 'center', gap: '4px' }} onClick={(e) => e.stopPropagation()}>
                        <select value={editSeries} onChange={e => setEditSeries(e.target.value)} style={{ padding: '4px', borderRadius: '4px', border: '1px solid #d1d5db', fontSize: '12px', outline: 'none' }}>
                          {SERIES_LIST.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <select value={editBookNum} onChange={e => setEditBookNum(e.target.value)} style={{ padding: '4px', borderRadius: '4px', border: '1px solid #d1d5db', fontSize: '12px', outline: 'none' }}>
                          {BOOK_NUM_LIST.map(n => <option key={n} value={n}>{n}권</option>)}
                        </select>
                        <select value={editUnit} onChange={e => setEditUnit(e.target.value)} style={{ padding: '4px', borderRadius: '4px', border: '1px solid #d1d5db', fontSize: '12px', outline: 'none' }}>
                          {UNIT_LIST.map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                        <select value={editDay} onChange={e => setEditDay(e.target.value)} style={{ padding: '4px', borderRadius: '4px', border: '1px solid #d1d5db', fontSize: '12px', outline: 'none' }}>
                          {DAY_LIST.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                        <button 
                          onClick={handleSaveProgress} 
                          disabled={isSaving}
                          style={{ backgroundColor: '#2563eb', color: 'white', fontSize: '12px', padding: '6px 12px', borderRadius: '4px', fontWeight: 'bold', border: 'none', cursor: 'pointer', marginLeft: '4px', whiteSpace: 'nowrap' }}
                        >
                          {isSaving ? '저장중..' : '저장'}
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '4px' }}>
                        <span style={{ color: '#1f2937', fontWeight: 'bold', fontSize: '14px', whiteSpace: 'nowrap' }}>
                          {student.currentBook}권
                        </span>
                        <span style={{ color: '#4b5563', fontSize: '14px', whiteSpace: 'nowrap' }}>
                          {student.progress}
                        </span>
                      </div>
                    )}
                  </td>

                  <td style={{ border: '1px solid #cbd5e1', padding: '8px', textAlign: 'center' }}>
                    <button 
                      onClick={(e) => openManageModal(e, student)}
                      style={{ backgroundColor: 'white', color: '#4b5563', border: '1px solid #d1d5db', padding: '4px 12px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap' }}
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

      {/* 학생 관리 모달 (이전과 동일) */}
      {manageStudent && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 50 }}>
          <div style={{ backgroundColor: 'white', border: '1px solid #e5e7eb', padding: '24px', borderRadius: '16px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', width: '24rem', position: 'relative', margin: '0 16px' }}>
            <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#1f2937', margin: '0 0 16px 0' }}>⚙️ 학생 정보 관리</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', color: '#4b5563', marginBottom: '4px', fontWeight: 'bold' }}>학생 이름</label>
                <input 
                  type="text" 
                  value={manageName}
                  onChange={(e) => setManageName(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', backgroundColor: '#f9fafb', border: '1px solid #d1d5db', borderRadius: '8px', padding: '8px', color: '#1f2937', outline: 'none' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', color: '#4b5563', marginBottom: '4px', fontWeight: 'bold' }}>학년 (예: 초1, 초5)</label>
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
                style={{ color: '#ef4444', backgroundColor: 'transparent', border: 'none', padding: '8px 12px', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                🗑️ 퇴소 처리
              </button>
              
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  onClick={() => setManageStudent(null)}
                  style={{ backgroundColor: '#f3f4f6', color: '#374151', border: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  취소
                </button>
                <button 
                  onClick={handleUpdateStudentInfo}
                  disabled={isManaging}
                  style={{ backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}
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