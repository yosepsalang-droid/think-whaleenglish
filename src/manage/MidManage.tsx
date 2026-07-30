import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import Voca from '../mid/Voca'; // 💡 기존 단어 테스트 컴포넌트 유지

interface Student {
  id: string;
  name: string;
  currentBook: string;
  progress: string; 
  grade: string;    
  wordDone: string;       
  verbDone: string;       
}

export default function MidManage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  
  const [selectedGrade, setSelectedGrade] = useState<string>('전체');

  // 중등부는 교재 포맷이 다양할 수 있으므로 직접 입력할 수 있는 텍스트 필드로 구현
  const [editBook, setEditBook] = useState('');
  const [editProgress, setEditProgress] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // 화면 스위치 (메인 관제탑 vs 단어 테스트)
  const [currentView, setCurrentView] = useState<'main' | 'voca'>('main');

  const fetchMiddleLMSData = async () => {
    try {
      setIsLoading(true);
      // 1. 중등부 학생 명단 불러오기
      const { data: studentsData, error: studentError } = await supabase
        .from('students')
        .select('*')
        .like('grade', '%중%')
        .order('name', { ascending: true }); 

      if (studentError) throw studentError;

      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();

      // 2. 오늘 완료한 학습 로그 불러오기
      const { data: logsData, error: logError } = await supabase
        .from('learning_logs')
        .select('student_id, task_type, status, book_info, created_at')
        .gte('created_at', startOfDay) 
        .eq('status', '완료');

      if (logError) throw logError;

      const todayDoneMap = new Map<string, { word: string; verb: string }>();

      (logsData || []).forEach(log => {
        if (!todayDoneMap.has(log.student_id)) {
          todayDoneMap.set(log.student_id, { word: '', verb: '' });
        }
        const record = todayDoneMap.get(log.student_id)!;

        // 💡 중등부 워드타파(단어): 랜덤이므로 '날짜와 시간' 기록
        if (log.task_type.includes('단어') || log.task_type.includes('워드타파')) {
          const d = new Date(log.created_at);
          const timeStr = `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
          record.word = `✅ 단어(${timeStr})`;
        }
        // 💡 중등부 동사: 설정한 범위(Day 처음~끝) 기록 (book_info에서 가져옴)
        if (log.task_type.includes('동사')) {
          record.verb = `✅ 동사(${log.book_info || '기록없음'})`; 
        }
      });

      const midStudents: Student[] = (studentsData || []).map(row => {
        const doneStatus = todayDoneMap.get(row.student_id) || { word: '', verb: '' };
        return {
          id: row.student_id,
          name: row.name || '이름없음',
          currentBook: row.currentBook || '',
          progress: row.progress || '',
          grade: row.grade || '중1',
          wordDone: doneStatus.word,
          verbDone: doneStatus.verb
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
  }, []);

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
      alert(`✅ ${selectedStudent.name} 학생의 진도가 [${editBook} / ${editProgress}]로 저장되었습니다.`);
      
    } catch (error) {
      alert("진도 저장에 실패했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartVoca = (e: React.MouseEvent, student: Student) => {
    e.stopPropagation();
    setSelectedStudent(student);
    setCurrentView('voca');
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

  const uniqueGrades = ['전체', '중1', '중2', '중3'];

  // 💡 단어장 화면 렌더링
  if (currentView === 'voca') {
    return (
      <Voca 
        onBack={() => {
          setCurrentView('main');
          fetchMiddleLMSData(); // 단어 시험 끝나고 돌아오면 데이터 새로고침
        }} 
        currentBook={selectedStudent?.currentBook || ''}
        studentId={selectedStudent?.id ?? ''}
        studentName={selectedStudent?.name ?? ''}
      />
    );
  }

  // 💡 메인 관제탑 화면 렌더링
  return (
    <div style={{ backgroundColor: 'white', color: '#1f2937', padding: '16px', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', width: '100%', boxSizing: 'border-box', margin: '0 auto', fontFamily: 'Pretendard, sans-serif' }}>
      
      {/* 헤더 & 학년 탭 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '900', color: '#1f2937', margin: 0 }}>🦅 중등부 관제탑</h2>
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

      {/* ⭐️ 반응형 테이블 (초등부와 동일한 엑셀 스타일) */}
      <div style={{ overflowX: 'auto', width: '100%' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', tableLayout: 'auto', fontSize: '13px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f3f4f6', color: '#374151', borderBottom: '2px solid #9ca3af' }}>
              <th style={{ border: '1px solid #cbd5e1', padding: '6px 2px', textAlign: 'center', whiteSpace: 'nowrap', width: '4%' }}>번호</th>
              <th style={{ border: '1px solid #cbd5e1', padding: '6px 2px', textAlign: 'center', whiteSpace: 'nowrap', width: '6%' }}>학년</th>
              <th style={{ border: '1px solid #cbd5e1', padding: '6px 2px', textAlign: 'center', whiteSpace: 'nowrap', width: '10%' }}>이름</th>
              <th style={{ border: '1px solid #cbd5e1', padding: '6px 2px', textAlign: 'center', whiteSpace: 'nowrap', width: '30%' }}>오늘 학습 현황</th>
              <th style={{ border: '1px solid #cbd5e1', padding: '6px 2px', textAlign: 'center', whiteSpace: 'nowrap' }}>학습 진도 설정</th>
              <th style={{ border: '1px solid #cbd5e1', padding: '6px 2px', textAlign: 'center', whiteSpace: 'nowrap', width: '10%' }}>액션</th>
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
                      <StatusBadge status={student.wordDone} fallback="❌ 워드타파(단어)" />
                      <StatusBadge status={student.verbDone} fallback="❌ 불규칙 동사" />
                    </div>
                  </td>

                  <td style={{ border: '1px solid #e2e8f0', padding: '4px 2px' }}>
                    {isSelected ? (
                      <div style={{ display: 'flex', flexWrap: 'nowrap', justifyContent: 'center', alignItems: 'center', gap: '4px' }} onClick={(e) => e.stopPropagation()}>
                        <input 
                          type="text" 
                          value={editBook} 
                          onChange={e => setEditBook(e.target.value)} 
                          placeholder="교재명"
                          style={{ padding: '4px', borderRadius: '4px', border: '1px solid #d1d5db', fontSize: '12px', outline: 'none', width: '80px' }} 
                        />
                        <input 
                          type="text" 
                          value={editProgress} 
                          onChange={e => setEditProgress(e.target.value)} 
                          placeholder="진도(Unit/Day)"
                          style={{ padding: '4px', borderRadius: '4px', border: '1px solid #d1d5db', fontSize: '12px', outline: 'none', width: '100px' }} 
                        />
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
                          {student.currentBook}
                        </span>
                        <span style={{ color: '#4b5563', fontSize: '13px', whiteSpace: 'nowrap' }}>
                          {student.progress}
                        </span>
                      </div>
                    )}
                  </td>

                  <td style={{ border: '1px solid #e2e8f0', padding: '6px 2px', textAlign: 'center' }}>
                    <button 
                      onClick={(e) => handleStartVoca(e, student)}
                      style={{ backgroundColor: '#10b981', color: 'white', border: 'none', padding: '4px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
                    >
                      📝 단어 테스트
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}