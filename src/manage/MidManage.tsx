import React, { useState, useEffect } from 'react';
import { CONFIG } from '../config'; // 👈 [추가됨] 통합 설정 파일 불러오기

// 💡 1. Voca 컴포넌트를 불러옵니다.
import Voca from '../mid/Voca'; 

interface Student { id: string; name: string; currentBook: string; progress: string; grade: string; }

export default function MidManage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  // 💡 2. 화면 스위치와 교재 정보
  const [currentView, setCurrentView] = useState<'main' | 'voca'>('main');
  const [selectedBook, setSelectedBook] = useState<string>('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  const fetchMiddleStudents = async () => {
    try {
      setIsLoading(true);
      // 👈 [수정됨] 하드코딩된 긴 주소를 지우고 CONFIG에서 불러옵니다.
      const response = await fetch(CONFIG.SHEETS.STUDENT_LIST);
      const text = await response.text();
      const rows = text.split('\n').slice(1).filter(row => row.trim() !== '');
      const midStudents = rows.map(row => {
        const [id, name, currentBook, progress, grade] = row.split(',');
        return { id, name, currentBook, progress, grade };
      }).filter(s => s.grade && s.grade.includes('중'));
      setStudents(midStudents);
    } catch (e) { 
      console.error("데이터 로드 실패", e); 
    } finally { 
      setIsLoading(false); 
    }
  };

  useEffect(() => { fetchMiddleStudents(); }, []);

  const handleApplyToSheet = async (studentId: string, book: string, progress: string) => {
    setSavingId(studentId);
    
    // 👈 [수정됨] 앱스 스크립트 주소도 CONFIG에서 불러옵니다.
    await fetch(CONFIG.WEB_APP_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ studentId, book, progress })
    });
    
    alert(`[동기화 완료] 시트에 적용되었습니다.`);
    setSavingId(null);
  };

  const handleStartVoca = (student: Student) => {
    setSelectedStudent(student);
    setSelectedBook(student.currentBook);
    setCurrentView('voca');
  };

  // 💡 3. Voca 컴포넌트 호출 부분을 올바르게 닫았습니다.
  if (currentView === 'voca') {
    return (
      <Voca 
        onBack={() => setCurrentView('main')} 
        currentBook={selectedBook}
        studentId={selectedStudent?.id ?? ''}
        studentName={selectedStudent?.name ?? ''}
      />
    );
  }

  // 💡 4. 메인 대시보드 화면
  return (
    <div style={{ padding: '24px' }}>
      <h3>📘 중등부 학생 관리</h3>
      {isLoading ? <p>로딩 중...</p> : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc' }}>
              <th style={{ padding: '12px', border: '1px solid #e2e8f0' }}>이름</th>
              <th style={{ padding: '12px', border: '1px solid #e2e8f0' }}>교재/진도</th>
              <th style={{ padding: '12px', border: '1px solid #e2e8f0' }}>액션</th>
            </tr>
          </thead>
          <tbody>
            {students.map(s => (
              <tr key={s.id}>
                <td style={{ padding: '12px', border: '1px solid #e2e8f0' }}>{s.name}</td>
                <td style={{ padding: '12px', border: '1px solid #e2e8f0' }}>{s.currentBook} / {s.progress}</td>
                <td style={{ padding: '12px', border: '1px solid #e2e8f0' }}>
                  <button 
                    onClick={() => handleStartVoca(s)}
                    style={{ marginRight: '8px', padding: '6px 12px', background: '#007aff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                  >
                    📝 단어 테스트
                  </button>
                  <button 
                    onClick={() => handleApplyToSheet(s.id, s.currentBook, s.progress)}
                    style={{ padding: '6px 12px', background: 'white', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    {savingId === s.id ? '적용중...' : '적용'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}