import React, { useState, useEffect } from 'react';

interface Student {
  id: string;
  name: string;
  currentBook: string;
  progress: string; // 예: "Unit1 Day1"
  grade: string;       // 예: "중1", "중2"
}

export default function MidManage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // 💡 중등부 학년 필터 상태 ('전체' 또는 '중1', '중2', '중3')
  const [selectedGrade, setSelectedGrade] = useState<string>('전체');
  
  // 💡 저장 중 로딩 상태 제어
  const [savingId, setSavingId] = useState<string | null>(null);

  // =========================================================================
  // 🛠️ 1. 데이터 가져오기 (구글 시트 READ)
  // =========================================================================
  const fetchMiddleStudents = async () => {
    try {
      setIsLoading(true);
      const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTA4Z1o77LMkO66syR0SmqmWPu6q5NapogmBA2iOxpd379nYZ4Gu7y9h7KmGTVb9H9WXNfM5EnFlBxe/pub?gid=1059185510&single=true&output=csv';
      
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
          grade: cols[4] || '중1'
        };
      });

      // 💡 [필터링] 학년에 '중'이 들어간 중등부 학생들만 쏙 골라냅니다.
      const midStudents = allStudents.filter(student => student.grade.includes('중'));
      setStudents(midStudents);
    } catch (error) {
      console.error("중등부 명단을 가져오는데 실패했습니다.", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMiddleStudents();
  }, []);

  // =========================================================================
  // ⚡ 2. 진도 문자열 분석 헬퍼 함수
  // =========================================================================
  const parseProgress = (progressStr: string) => {
    const parts = progressStr.split(' ');
    const unit = parts[0] && parts[0].startsWith('Unit') ? parts[0] : 'Unit1';
    const day = parts[1] && parts[1].startsWith('Day') ? parts[1] : 'Day1';
    return { unit, day };
  };

  // =========================================================================
  // 👑 3. 구글 시트로 실시간 데이터 전송 (구글 시트 WRITE)
  // =========================================================================
  const handleApplyToSheet = async (studentId: string, book: string, unit: string, day: string) => {
    const fullProgress = `${unit} ${day}`;
    
    try {
      setSavingId(studentId);

      // 💡 초등부에서 쓰신 구글 웹앱 URL과 동일한 주소를 여기에 넣어주시면 됩니다!
      const APPS_SCRIPT_URL = '구글_웹앱_배포_URL_자리가_될_곳입니다';

      // 화면 먼저 선반영
      setStudents(prev => prev.map(s => s.id === studentId ? { ...s, currentBook: book, progress: fullProgress } : s));

      /* 실제 구글 시트 연동 시 주석 해제하여 활성화
      await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          studentId: studentId,
          book: book,
          progress: fullProgress
        })
      });
      */

      alert(`[동기화 완료] 중등부 시트에 성공적으로 적용되었습니다!`);
    } catch (error) {
      console.error("시트 반영 실패:", error);
      alert("시트 반영 중 오류가 발생했습니다.");
    } finally {
      setSavingId(null);
    }
  };

  // =========================================================================
  // 🖥️ 4. 화면 UI 렌더링 영역 (중등부는 깔끔한 신뢰의 블루 톤)
  // =========================================================================
  const gradeTabs = ['전체', '중1', '중2', '중3'];

  const filteredStudents = students.filter(student => {
    if (selectedGrade === '전체') return true;
    return student.grade === selectedGrade;
  });

  return (
    <div style={{ textAlign: 'left' }}>
      
      {/* 타이틀 헤더 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#007aff', margin: 0 }}>
            📘 중등부 실시간 미션 및 진도 제어
          </h3>
          <p style={{ fontSize: '14px', color: '#64748b', margin: '4px 0 0 0' }}>
            중등부 학생들의 현재 교재 및 세부 스케줄을 원격으로 관리합니다.
          </p>
        </div>
        <button onClick={fetchMiddleStudents} style={{ padding: '8px 14px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: '#334155' }}>
          🔄 명단 동기화
        </button>
      </div>

      {/* 📊 중등부 학년별 보기 필터 탭 바 */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '20px', borderBottom: '2px solid #f1f5f9', paddingBottom: '10px' }}>
        {gradeTabs.map(grade => (
          <button
            key={grade}
            onClick={() => setSelectedGrade(grade)}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: '700',
              cursor: 'pointer',
              backgroundColor: selectedGrade === grade ? '#007aff' : '#f1f5f9',
              color: selectedGrade === grade ? 'white' : '#475569',
              transition: 'all 0.2s'
            }}
          >
            {grade}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>데이터 로드 중...</div>
      ) : (
        <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '14px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', fontSize: '14px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                <th style={{ padding: '14px 16px', color: '#475569' }}>이름 (학년)</th>
                <th style={{ padding: '14px 16px', color: '#475569' }}>현재 교재</th>
                <th style={{ padding: '14px 16px', color: '#475569' }}>세부 유닛(Unit)</th>
                <th style={{ padding: '14px 16px', color: '#475569' }}>세부 일차(Day)</th>
                <th style={{ padding: '14px 16px', color: '#475569', textAlign: 'center' }}>원격 제어 명령</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((student) => {
                const { unit, day } = parseProgress(student.progress);

                return (
                  <tr key={student.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '14px 16px', fontWeight: '700', color: '#1e293b' }}>
                      {student.name} <span style={{ fontWeight: 'normal', color: '#94a3b8', fontSize: '12px' }}>({student.grade})</span>
                    </td>
                    
                    <td>
                      <select 
                        id={`book-${student.id}`}
                        defaultValue={student.currentBook}
                        style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: '600' }}
                      >
                        <option value="240_1">240_1</option>
                        <option value="240_2">240_2</option>
                        <option value="Pumpkin_Boat">Pumpkin Boat</option>
                        <option value="Liam_Adventure">Liam Garner</option>
                      </select>
                    </td>
                    
                    <td>
                      <select 
                        id={`unit-${student.id}`}
                        defaultValue={unit}
                        style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                      >
                        {Array.from({ length: 12 }, (_, i) => `Unit${i + 1}`).map(u => (
                          <option key={u} value={u}>{u}</option>
                        ))}
                      </select>
                    </td>
                    
                    <td>
                      <select 
                        id={`day-${student.id}`}
                        defaultValue={day}
                        style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                      >
                        {Array.from({ length: 5 }, (_, i) => `Day${i + 1}`).map(d => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </td>
                    
                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      <button
                        disabled={savingId === student.id}
                        onClick={() => {
                          const b = (document.getElementById(`book-${student.id}`) as HTMLSelectElement).value;
                          const u = (document.getElementById(`unit-${student.id}`) as HTMLSelectElement).value;
                          const d = (document.getElementById(`day-${student.id}`) as HTMLSelectElement).value;
                          handleApplyToSheet(student.id, b, u, d);
                        }}
                        style={{
                          padding: '6px 14px',
                          backgroundColor: savingId === student.id ? '#94a3b8' : '#007aff',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          fontWeight: '700',
                          cursor: 'pointer',
                          fontSize: '13px'
                        }}
                      >
                        {savingId === student.id ? '⏳ 동기화중' : '🚀 시트에 적용'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredStudents.length === 0 && (
            <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>해당 학년의 학생이 존재하지 않습니다.</div>
          )}
        </div>
      )}

    </div>
  );
}