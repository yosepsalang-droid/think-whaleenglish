import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface Student {
  id: string;
  name: string;
  currentBook: string;
  progress: string; 
  grade: string;    
  wordDone: string;       
  verbDone: string;       
  missedDays: string; 
  missedCount: number; 
}

export default function MidManage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  
  const [selectedGrade, setSelectedGrade] = useState<string>('전체');

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const [editBook, setEditBook] = useState('');
  const [editProgress, setEditProgress] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [manageStudent, setManageStudent] = useState<Student | null>(null);
  const [manageName, setManageName] = useState('');
  const [manageGrade, setManageGrade] = useState('');
  const [isManaging, setIsManaging] = useState(false);

  const changeDate = (days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
  };

  const getFormattedDate = (date: Date) => {
    const kstOffset = 9 * 60 * 60 * 1000;
    return new Date(date.getTime() + kstOffset).toISOString().split('T')[0];
  };

  const getFakeUTCString = (date: Date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const mi = String(date.getMinutes()).padStart(2, '0');
    const ss = String(date.getSeconds()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}+00:00`;
  };

  const isToday = getFormattedDate(selectedDate) === getFormattedDate(new Date());

  const fetchMiddleLMSData = async () => {
    try {
      setIsLoading(true);

      // 💡 [수정됨] 중등부와 고등부 학생 모두 불러오기
      const { data: rawStudentsData, error: studentError } = await supabase
        .from('students')
        .select('*')
        .order('name', { ascending: true }); 

      if (studentError) throw studentError;

      // 💡 중학교('중') 또는 고등학교('고') 문자가 포함된 학생만 필터링
      const studentsData = (rawStudentsData || []).filter(s => 
        s.grade && (s.grade.includes('중') || s.grade.includes('고'))
      );

      const startOfSelectedDay = new Date(selectedDate);
      startOfSelectedDay.setHours(0, 0, 0, 0);
      
      const endOfSelectedDay = new Date(selectedDate);
      endOfSelectedDay.setHours(23, 59, 59, 999);

      const pastWeekdays: Date[] = [];
      let tempDate = new Date(selectedDate);
      tempDate.setDate(tempDate.getDate() - 1); 

      while (pastWeekdays.length < 5) {
        const dayOfWeek = tempDate.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) { 
          pastWeekdays.push(new Date(tempDate));
        }
        tempDate.setDate(tempDate.getDate() - 1);
      }
      
      const oldestDate = new Date(pastWeekdays[pastWeekdays.length - 1]);
      oldestDate.setHours(0, 0, 0, 0);

      const gteString = getFakeUTCString(oldestDate);
      const lteString = getFakeUTCString(endOfSelectedDay);

      const { data: logsData, error: logError } = await supabase
        .from('learning_logs')
        .select('student_id, task_type, status, book_info, created_at')
        .gte('created_at', gteString) 
        .lte('created_at', lteString) 
        .eq('status', '완료');

      if (logError) throw logError;

      const selectedDayDoneMap = new Map<string, { word: string; verb: string }>();
      const completedDaysMap = new Map<string, Set<string>>();

      (logsData || []).forEach(log => {
        const localTimeString = log.created_at.substring(0, 19); 
        const [yyyy, mm, dd] = localTimeString.split('T')[0].split('-').map(Number);
        const [hh, mi, ss] = localTimeString.split('T')[1].split(':').map(Number);
        
        const logTime = new Date(yyyy, mm - 1, dd, hh, mi, ss); 
        const logTimestamp = logTime.getTime();
        
        const isLogOnSelectedDay = logTimestamp >= startOfSelectedDay.getTime() && logTimestamp <= endOfSelectedDay.getTime();

        if (isLogOnSelectedDay) {
          if (!selectedDayDoneMap.has(log.student_id)) selectedDayDoneMap.set(log.student_id, { word: '', verb: '' });
          const record = selectedDayDoneMap.get(log.student_id)!;

          if (log.task_type.includes('단어') || log.task_type.includes('워드타파')) {
            const hours = String(logTime.getHours()).padStart(2, '0');
            const minutes = String(logTime.getMinutes()).padStart(2, '0');
            const timeStr = `${logTime.getMonth() + 1}/${logTime.getDate()} ${hours}:${minutes}`;
            record.word = `✅ 단어(${timeStr})`;
          }
          if (log.task_type.includes('동사')) {
            record.verb = `✅ 동사(${log.book_info || '기록없음'})`; 
          }
        }

        if (!completedDaysMap.has(log.student_id)) {
          completedDaysMap.set(log.student_id, new Set());
        }
        
        const dateStr = getFormattedDate(logTime);
        completedDaysMap.get(log.student_id)!.add(dateStr);
      });

      const midStudents: Student[] = studentsData.map(row => {
        const doneStatus = selectedDayDoneMap.get(row.student_id) || { word: '', verb: '' };
        
        const studentCompleted = completedDaysMap.get(row.student_id) || new Set();
        const missedDates: string[] = [];
        
        pastWeekdays.forEach(pwd => {
          const pwdStr = getFormattedDate(pwd);
          if (!studentCompleted.has(pwdStr)) {
            missedDates.push(`${pwd.getMonth() + 1}/${pwd.getDate()}`);
          }
        });
        missedDates.reverse(); 

        return {
          id: row.student_id,
          name: row.name || '이름없음',
          currentBook: row.currentBook || '',
          progress: row.progress || '',
          grade: row.grade || '미지정',
          wordDone: doneStatus.word,
          verbDone: doneStatus.verb,
          missedDays: missedDates.length > 0 ? missedDates.join(', ') : '',
          missedCount: missedDates.length 
        };
      });

      setStudents(midStudents.filter(s => !s.name.includes('body')));
      
    } catch (error) {
      console.error("수파베이스 데이터 로드 에러", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMiddleLMSData();
  }, [selectedDate]);

  const handleSelectStudent = (student: Student) => {
    if (selectedStudent?.id === student.id) {
      setSelectedStudent(null);
      return;
    }
    setSelectedStudent(student);
    setEditBook(student.currentBook);
    setEditProgress(student.progress);
  };

  const handleSaveProgress = async (e: React.MouseEvent) => {
    e.stopPropagation(); 
    if (!selectedStudent) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('students')
        .update({
          currentBook: editBook,
          progress: editProgress
        })
        .eq('student_id', selectedStudent.id);

      if (error) throw error;

      const updatedStudent = { ...selectedStudent, currentBook: editBook, progress: editProgress };
      setStudents(prev => prev.map(s => s.id === selectedStudent.id ? updatedStudent : s));
      setSelectedStudent(updatedStudent);
      alert(`✅ ${selectedStudent.name} 학생의 진도가 저장되었습니다.`);
      
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
        padding: '2px 6px',
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

  // 💡 [수정됨] 고1, 고2, 고3 필터 탭 추가
  const uniqueGrades = ['전체', '중1', '중2', '중3', '고1', '고2', '고3'];

  return (
    <div style={{ backgroundColor: 'white', color: '#1f2937', padding: '24px', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', width: '95vw', marginLeft: 'calc(-47.5vw + 50%)', boxSizing: 'border-box', fontFamily: 'Pretendard, sans-serif' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* 💡 [수정됨] 타이틀 변경 */}
          <h2 style={{ fontSize: '20px', fontWeight: '900', color: '#1f2937', margin: 0 }}>🦅 중·고등부 관제탑</h2>
          
          <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#f3f4f6', borderRadius: '8px', padding: '4px', border: '1px solid #e5e7eb' }}>
            <button onClick={() => changeDate(-1)} style={{ border: 'none', backgroundColor: 'transparent', cursor: 'pointer', padding: '4px 8px', fontSize: '14px', color: '#4b5563', fontWeight: 'bold' }}>◀</button>
            <span style={{ fontSize: '14px', fontWeight: '900', color: isToday ? '#2563eb' : '#374151', padding: '0 8px', minWidth: '110px', textAlign: 'center' }}>
              {getFormattedDate(selectedDate)} {isToday && '(오늘)'}
            </span>
            <button onClick={() => changeDate(1)} disabled={isToday} style={{ border: 'none', backgroundColor: 'transparent', cursor: isToday ? 'not-allowed' : 'pointer', padding: '4px 8px', fontSize: '14px', color: isToday ? '#d1d5db' : '#4b5563', fontWeight: 'bold' }}>▶</button>
          </div>

          <button 
            onClick={fetchMiddleLMSData} 
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
        <table style={{ borderCollapse: 'collapse', width: '100%', tableLayout: 'auto', fontSize: '14px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f3f4f6', color: '#374151', borderBottom: '2px solid #9ca3af' }}>
              <th style={{ border: '1px solid #cbd5e1', padding: '10px 4px', textAlign: 'center', whiteSpace: 'nowrap', width: '4%' }}>번호</th>
              <th style={{ border: '1px solid #cbd5e1', padding: '10px 4px', textAlign: 'center', whiteSpace: 'nowrap', width: '5%' }}>학년</th>
              <th style={{ border: '1px solid #cbd5e1', padding: '10px 4px', textAlign: 'center', whiteSpace: 'nowrap', width: '8%' }}>이름</th>
              <th style={{ border: '1px solid #cbd5e1', padding: '10px 4px', textAlign: 'center', whiteSpace: 'nowrap', width: '32%' }}>{getFormattedDate(selectedDate)} 학습 현황</th>
              <th style={{ border: '1px solid #cbd5e1', padding: '10px 4px', textAlign: 'center', whiteSpace: 'nowrap', width: '16%' }}>최근 5일 결석(미수행)</th>
              <th style={{ border: '1px solid #cbd5e1', padding: '10px 4px', textAlign: 'center', whiteSpace: 'nowrap', width: '27%' }}>학습 진도 설정</th>
              <th style={{ border: '1px solid #cbd5e1', padding: '10px 4px', textAlign: 'center', whiteSpace: 'nowrap', width: '8%' }}>액션</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.length === 0 && !isLoading && (
              <tr>
                <td colSpan={7} style={{ border: '1px solid #e2e8f0', padding: '30px', textAlign: 'center', color: '#9ca3af' }}>
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
                  <td style={{ border: '1px solid #e2e8f0', padding: '8px 4px', textAlign: 'center', color: '#6b7280', fontWeight: 'bold' }}>{index + 1}</td>
                  
                  <td style={{ border: '1px solid #e2e8f0', padding: '8px 4px', textAlign: 'center', color: '#4b5563', fontWeight: '500' }}>{student.grade}</td>

                  <td style={{ border: '1px solid #e2e8f0', padding: '8px 4px', textAlign: 'center', fontWeight: '800', color: '#111827', fontSize: '15px', whiteSpace: 'nowrap' }}>{student.name}</td>
                  
                  <td style={{ border: '1px solid #e2e8f0', padding: '6px 4px' }}>
                    <div style={{ display: 'flex', flexWrap: 'nowrap', justifyContent: 'center', alignItems: 'center', gap: '6px', width: '100%' }}>
                      <StatusBadge status={student.wordDone} fallback="❌ 워드타파(단어)" />
                      <StatusBadge status={student.verbDone} fallback="❌ 불규칙 동사" />
                    </div>
                  </td>

                  <td style={{ border: '1px solid #e2e8f0', padding: '8px 4px', textAlign: 'center', fontWeight: 'bold', fontSize: '13px' }}>
                    {student.missedDays ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                        <span style={{ color: '#ef4444' }}>{student.missedDays}</span>
                        {student.missedCount >= 3 && (
                          <span style={{ fontSize: '11px', backgroundColor: '#fee2e2', color: '#b91c1c', padding: '2px 6px', borderRadius: '4px' }}>🚨 집중 관리 필요</span>
                        )}
                      </div>
                    ) : (
                      <span style={{ color: '#10b981' }}>-</span>
                    )}
                  </td>

                  <td style={{ border: '1px solid #e2e8f0', padding: '6px 4px' }}>
                    {isSelected ? (
                      <div style={{ display: 'flex', flexWrap: 'nowrap', justifyContent: 'center', alignItems: 'center', gap: '6px' }} onClick={(e) => e.stopPropagation()}>
                        <input 
                          type="text" 
                          value={editBook} 
                          onChange={e => setEditBook(e.target.value)} 
                          placeholder="교재명"
                          style={{ padding: '6px', borderRadius: '4px', border: '1px solid #d1d5db', fontSize: '13px', outline: 'none', width: '35%' }} 
                        />
                        <input 
                          type="text" 
                          value={editProgress} 
                          onChange={e => setEditProgress(e.target.value)} 
                          placeholder="진도"
                          style={{ padding: '6px', borderRadius: '4px', border: '1px solid #d1d5db', fontSize: '13px', outline: 'none', width: '35%' }} 
                        />
                        <button 
                          onClick={handleSaveProgress} 
                          disabled={isSaving}
                          style={{ backgroundColor: '#2563eb', color: 'white', fontSize: '13px', padding: '6px 12px', borderRadius: '4px', fontWeight: 'bold', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}
                        >
                          {isSaving ? '저장중' : '저장'}
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ color: '#1f2937', fontWeight: 'bold', fontSize: '14px', whiteSpace: 'nowrap' }}>
                          {student.currentBook}
                        </span>
                        <span style={{ color: '#4b5563', fontSize: '14px', whiteSpace: 'nowrap' }}>
                          {student.progress}
                        </span>
                      </div>
                    )}
                  </td>

                  <td style={{ border: '1px solid #e2e8f0', padding: '8px 4px', textAlign: 'center' }}>
                    <button 
                      onClick={(e) => openManageModal(e, student)}
                      style={{ backgroundColor: 'white', color: '#4b5563', border: '1px solid #d1d5db', padding: '4px 10px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap' }}
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
                <label style={{ display: 'block', fontSize: '13px', color: '#4b5563', marginBottom: '4px', fontWeight: 'bold' }}>학년 (예: 중1, 고2)</label>
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