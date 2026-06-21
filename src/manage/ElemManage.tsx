import React, { useState, useEffect } from 'react';

// 학생 데이터의 모양을 명확히 정의합니다 (App.tsx 규격과 100% 일치)
interface Student {
  id: string;
  name: string;
  currentBook: string;
  progress: string;
  grade: string;
}

export default function ElemManage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // =========================================================================
  // 🛠️ 1. 데이터 처리 관련 함수 (구글 시트 연동 전담)
  // =========================================================================
  
  const fetchElementaryStudents = async () => {
    try {
      setIsLoading(true);
      
      // 💡 App.tsx에서 검증된 원장님의 학생 DB 구글 시트 주소를 그대로 활용합니다.
      const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTA4Z1o77LMkO66syR0SmqmWPu6q5NapogmBA2iOxpd379nYZ4Gu7y9h7KmGTVb9H9WXNfM5EnFlBxe/pub?gid=1059185510&single=true&output=csv';
      
      const response = await fetch(SHEET_CSV_URL);
      const text = await response.text();
      
      // 행 단위 분리 및 공백 제거
      const rows = text.split('\n').map(row => row.trim()).filter(row => row !== '');
      
      // CSV 데이터를 학생 객체 배열로 깔끔하게 조립
      const allStudents: Student[] = rows.slice(1).map(row => {
        const cols = row.split(',');
        return {
          id: cols[0],          // A열: 아이디
          name: cols[1],        // B열: 이름
          currentBook: cols[2], // C열: 현재 교재
          progress: cols[3],    // D열: 현재 진도
          grade: cols[4]        // E열: 학년
        };
      });

      // 💡 [필터링] 학년에 '초'라는 글자가 들어간 초등부 아이들만 쏙 골라냅니다.
      const elemStudents = allStudents.filter(student => student.grade.includes('초'));
      
      setStudents(elemStudents);
    } catch (error) {
      console.error("초등부 학생 데이터를 동기화하는 중 오류 발생:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // 컴포넌트(서랍)가 열리면 자동으로 구글 시트에서 정보를 새로 긁어옵니다.
  useEffect(() => {
    fetchElementaryStudents();
  }, []);


  // =========================================================================
  // ⚡ 2. 학생 제어 관련 함수 (원격 진도 변경 처리 전담)
  // =========================================================================
  
  const changeStudentBook = (studentId: string, newBook: string) => {
    console.log(`[진도 제어 시스템] 학생 ID: ${studentId} -> 선택된 새 교재: ${newBook}`);
    
    // 💡 1단계: 원장님 화면에서 즉시 교재명이 바뀌어 보이도록 상태를 먼저 바꿉니다.
    setStudents(prevStudents => 
      prevStudents.map(student => 
        student.id === studentId ? { ...student, currentBook: newBook } : student
      )
    );
    
    // 💡 2단계 (다음 단계 예정): 구글 웹앱 URL(POST)로 이 변경사항을 전송하여 실제 시트를 바꿀 자리입니다.
    alert(`진도를 ${newBook}(으)로 임시 변경했습니다.\n(실제 구글 시트 원격 저장 기능은 다음 단계인 API 배포 때 완성됩니다!)`);
  };


  // =========================================================================
  // 🖥️ 3. 화면 렌더링 영역 (오직 표를 예쁘게 그리는 일만 전담)
  // =========================================================================
  
  return (
    <div style={{ textAlign: 'left' }}>
      
      {/* 상단 타이틀 및 새로고침 영역 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#33b864', margin: 0 }}>
            🧸 초등부 실시간 미션 및 진도 제어
          </h3>
          <p style={{ fontSize: '14px', color: '#64748b', margin: '4px 0 0 0' }}>
            구글 시트의 최신 학생 명단을 기반으로 원격 진도를 실시간 제어합니다.
          </p>
        </div>
        
        <button 
          onClick={fetchElementaryStudents}
          style={{ padding: '8px 14px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: '#334155', transition: 'all 0.2s' }}
        >
          🔄 명단 동기화
        </button>
      </div>

      {/* 로딩 중일 때 표시할 화면 */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '6px', color: '#94a3b8', fontSize: '15px' }}>
          구글 시트에서 초등부 데이터를 안전하게 가져오는 중입니다...
        </div>
      ) : (
        /* 실제 초등부 학생 관리 테이블 */
        <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '14px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', fontSize: '14px', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '14px 16px', color: '#475569', fontWeight: '700' }}>이름</th>
                <th style={{ padding: '14px 16px', color: '#475569', fontWeight: '700' }}>학년</th>
                <th style={{ padding: '14px 16px', color: '#475569', fontWeight: '700' }}>현재 활성화 교재</th>
                <th style={{ padding: '14px 16px', color: '#475569', fontWeight: '700' }}>학습 진도</th>
                <th style={{ padding: '14px 16px', color: '#475569', fontWeight: '700', textAlign: 'center' }}>교재 원격 변경</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr key={student.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.2s' }}>
                  {/* 이름 */}
                  <td style={{ padding: '14px 16px', fontWeight: '700', color: '#1e293b' }}>{student.name}</td>
                  
                  {/* 학년 */}
                  <td style={{ padding: '14px 16px', color: '#64748b' }}>{student.grade}</td>
                  
                  {/* 현재 교재 뱃지 */}
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ backgroundColor: '#e8f5e9', color: '#2e7d32', padding: '4px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: '700' }}>
                      {student.currentBook}
                    </span>
                  </td>
                  
                  {/* 현재 진도 */}
                  <td style={{ padding: '14px 16px', color: '#334155', fontWeight: '500' }}>{student.progress}</td>
                  
                  {/* 교재 원격 변경 드롭다운 셀렉터 */}
                  <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                    <select 
                      value={student.currentBook}
                      onChange={(e) => changeStudentBook(student.id, e.target.value)}
                      style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: '600', color: '#334155', outline: 'none', cursor: 'pointer', backgroundColor: '#fff' }}
                    >
                      <option value="240_1">240_1</option>
                      <option value="240_2">240_2</option>
                      <option value="Pumpkin_Boat">Pumpkin Boat</option>
                      <option value="Liam_Adventure">Liam Garner</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
}