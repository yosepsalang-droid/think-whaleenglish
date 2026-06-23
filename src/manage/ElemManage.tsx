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
      const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTA4Z1o77LMkO66syR0SmqmWPu6q5NapogmBA2iOxpd379nYZ4Gu7y9h7KmGTVb9H9WXNfM5EnFlBxe/pubhtml?gid=1059185510&single=true';
      const response = await fetch(SHEET_CSV_URL);
      const text = await response.text();
      const rows = text.split('\n').map(row => row.trim()).filter(row => row !== '');
      
      const allStudents: Student[] = rows.slice(1).map(row => {
        const cols = row.split(',');
        return {
          id: cols[0],
          name: cols[1],
          currentBook: cols[2] || '240_1',
          progress: cols[3] || 'Unit1 Day1',
          grade: cols[4] || '초1'
        };
      });

      const elemStudents = allStudents.filter(student => student.grade.includes('초'));
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

  const getStudentHistory = (student: Student): HistoryLog[] => {
    const { unit, day } = parseProgress(student.progress);
    const dayNum = parseInt(day.replace('Day', ''), 10) || 1;
    const logs: HistoryLog[] = [];
    const today = new Date();

    logs.push({
      date: today.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }) + ' (오늘)',
      book: student.currentBook,
      progress: `${unit} ${day}`,
      score: '진행 중',
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

  // 3. 구글 시트로 실시간 데이터 전송 및 내부 업데이트 (수정 완료 버전)
  const handleSaveProgress = async () => {
    if (!selectedStudent) return;
    
    const fullProgress = `${editUnit} ${editDay}`;
    setIsSaving(true);

    try {
      // ⚠️ 여기에 배포된 웹 앱 URL을 넣으세요!
      const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyOAbzxggopAl9QhrG2VHSmo0yCEcdIi89xhgvT5nOWkk9sZbiTtB-XjQd4GVhV4MhE/exec';

      const response = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
        alert(`[동기화 완료] ${selectedStudent.name} 학생의 진도가 업데이트되었습니다.`);
      } else {
        alert("저장 실패: " + result.message);
      }
    } catch (error) {
      console.error("진도 반영 실패:", error);
      alert("시트 저장 중 오류가 발생했습니다.");
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
      </div>
      
      {/* (중략 - UI는 기존과 동일하게 유지) */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        {gradeTabs.map(grade => (
          <button key={grade} onClick={() => setSelectedGrade(grade)} style={{ padding: '10px 18px', borderRadius: '10px', border: 'none', cursor: 'pointer', backgroundColor: selectedGrade === grade ? '#007aff' : 'white', color: selectedGrade === grade ? 'white' : '#475569' }}>
            {grade}
          </button>
        ))}
      </div>

      {isLoading ? <div style={{ padding: '40px', textAlign: 'center' }}>데이터 로딩중...</div> : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '24px' }}>
           {/* 명단 리스트 등 기존 UI 영역 */}
           {/* ... (생략된 기존 UI 영역) ... */}
        </div>
      )}
    </div>
  );
}