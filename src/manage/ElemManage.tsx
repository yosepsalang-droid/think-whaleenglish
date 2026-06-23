import React, { useState, useEffect } from 'react';

interface Student {
  id: string;
  name: string;
  currentBook: string;
  progress: string;
  grade: string;
}

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

  const fetchElementaryStudents = async () => {
    try {
      setIsLoading(true);
      // ⚠️ 복사하신 CSV 주소를 여기에 넣으세요
      const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTA4Z1o77LMkO66syR0SmqmWPu6q5NapogmBA2iOxpd379nYZ4Gu7y9h7KmGTVb9H9WXNfM5EnFlBxe/pubhtml?gid=1059185510&single=true';
      const response = await fetch(SHEET_CSV_URL);
      const text = await response.text();
      const rows = text.split('\n').map(row => row.trim()).filter(row => row !== '');
      
      const allStudents: Student[] = rows.slice(1).map(row => {
        const cols = row.split(',');
        return { id: cols[0], name: cols[1], currentBook: cols[2] || '240_1', progress: cols[3] || 'Unit1 Day1', grade: cols[4] || '초1' };
      });

      const elemStudents = allStudents.filter(student => student.grade.includes('초'));
      setStudents(elemStudents);
      if (elemStudents.length > 0 && !selectedStudent) handleSelectStudent(elemStudents[0]);
    } catch (error) {
      console.error("데이터 로드 실패", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchElementaryStudents(); }, []);

  const handleSelectStudent = (student: Student) => {
    setSelectedStudent(student);
    const parts = (student.progress || '').split(' ');
    setEditBook(student.currentBook);
    setEditUnit(parts[0] || 'Unit1');
    setEditDay(parts[1] || 'Day1');
  };

  const handleSaveProgress = async () => {
    if (!selectedStudent) return;
    setIsSaving(true);
    try {
      // ⚠️ 복사하신 웹앱 URL을 여기에 넣으세요
      const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyOAbzxggopAl9QhrG2VHSmo0yCEcdIi89xhgvT5nOWkk9sZbiTtB-XjQd4GVhV4MhE/exec';
      const response = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: selectedStudent.id, book: editBook, progress: `${editUnit} ${editDay}` })
      });
      const result = await response.json();
      if (result.status === 'success') {
        alert("업데이트 완료!");
        fetchElementaryStudents();
      } else {
        alert("오류: " + result.message);
      }
    } catch (error) { alert("서버 통신 실패"); }
    finally { setIsSaving(false); }
  };

  const filteredStudents = students.filter(s => selectedGrade === '전체' ? true : s.grade === selectedGrade);

  return (
    <div style={{ padding: '24px' }}>
      <h2>👑 초등부 실시간 관제탑</h2>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        {['전체', '초1', '초2', '초3', '초4', '초5', '초6'].map(g => (
          <button key={g} onClick={() => setSelectedGrade(g)} style={{ backgroundColor: selectedGrade === g ? '#007aff' : 'white', padding: '10px' }}>{g}</button>
        ))}
      </div>
      {isLoading ? <div>데이터 로딩중...</div> : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '20px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f1f5f9' }}>
                <th>이름</th><th>학년</th><th>교재</th><th>진도</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map(s => (
                <tr key={s.id} onClick={() => handleSelectStudent(s)} style={{ cursor: 'pointer', borderBottom: '1px solid #ddd' }}>
                  <td>{s.name}</td><td>{s.grade}</td><td>{s.currentBook}</td><td>{s.progress}</td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {selectedStudent && (
            <div style={{ padding: '20px', border: '1px solid #ccc' }}>
              <h3>{selectedStudent.name} 정보 수정</h3>
              <select value={editBook} onChange={(e) => setEditBook(e.target.value)}><option value="240_1">240_1</option></select>
              <button onClick={handleSaveProgress} disabled={isSaving}>{isSaving ? '저장중...' : '진도 저장'}</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}