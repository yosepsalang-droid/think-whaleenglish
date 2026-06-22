import React, { useState, useEffect } from 'react';

interface Student { id: string; name: string; currentBook: string; progress: string; grade: string; }

export default function MidManage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedGrade, setSelectedGrade] = useState<string>('전체');
  const [savingId, setSavingId] = useState<string | null>(null);

  const fetchMiddleStudents = async () => {
    try {
      setIsLoading(true);
      const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTA4Z1o77LMkO66syR0SmqmWPu6q5NapogmBA2iOxpd379nYZ4Gu7y9h7KmGTVb9H9WXNfM5EnFlBxe/pub?gid=1059185510&single=true&output=csv';
      const response = await fetch(SHEET_CSV_URL);
      const text = await response.text();
      const rows = text.split('\n').slice(1).filter(row => row.trim() !== '');
      const midStudents = rows.map(row => {
        const [id, name, currentBook, progress, grade] = row.split(',');
        return { id, name, currentBook, progress, grade };
      }).filter(s => s.grade && s.grade.includes('중'));
      setStudents(midStudents);
    } catch (e) { console.error("데이터 로드 실패", e); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { fetchMiddleStudents(); }, []);

  const handleApplyToSheet = async (studentId: string, book: string, progress: string) => {
    setSavingId(studentId);
    // 💡 아래 주소만 원장님의 웹앱 주소로 바꾸면 됩니다!
    const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyOAbzxggopAl9QhrG2VHSmo0yCEcdIi89xhgvT5nOWkk9sZbiTtB-XjQd4GVhV4MhE/exec';
    
    await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ studentId, book, progress })
    });
    
    alert(`[동기화 완료] 시트에 적용되었습니다.`);
    setSavingId(null);
  };

  return (
    <div style={{ padding: '24px' }}>
      <h3>📘 중등부 학생 관리</h3>
      {isLoading ? <p>로딩 중...</p> : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr style={{ backgroundColor: '#f8fafc' }}><th style={{ padding: '12px', border: '1px solid #e2e8f0' }}>이름</th><th style={{ padding: '12px', border: '1px solid #e2e8f0' }}>교재/진도</th><th style={{ padding: '12px', border: '1px solid #e2e8f0' }}>액션</th></tr></thead>
          <tbody>
            {students.map(s => (
              <tr key={s.id}>
                <td style={{ padding: '12px', border: '1px solid #e2e8f0' }}>{s.name}</td>
                <td style={{ padding: '12px', border: '1px solid #e2e8f0' }}>{s.currentBook} / {s.progress}</td>
                <td style={{ padding: '12px', border: '1px solid #e2e8f0' }}>
                  <button onClick={() => handleApplyToSheet(s.id, s.currentBook, s.progress)}>{savingId === s.id ? '적용중...' : '적용'}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}