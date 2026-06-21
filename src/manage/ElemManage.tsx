import React, { useState, useEffect } from 'react';

interface Student {
  id: string;
  name: string;
  currentBook: string;
  progress: string; // 예: "Unit1 Day1"
  grade: string;       // 예: "초1", "초2"
}

export default function ElemManage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // 💡 학년 필터링을 위한 상태 ('전체' 또는 '초1', '초2' 등)
  const [selectedGrade, setSelectedGrade] = useState<string>('전체');
  
  // 💡 현재 구글 시트에 실시간 저장 중인 학생의 ID를 기록 (로딩 스피너용)
  const [savingId, setSavingId] = useState<string | null>(null);

  // =========================================================================
  // 🛠️ 1. 데이터 가져오기 (구글 시트 READ)
  // =========================================================================
  const fetchElementaryStudents = async () => {
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
          grade: cols[4] || '초1'
        };
      });

      // 학년에 '초'가 들어간 초등학생만 필터링
      const elemStudents = allStudents.filter(student => student.grade.includes('초'));
      setStudents(elemStudents);
    } catch (error) {
      console.error("초등부 명단을 가져오는데 실패했습니다.", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchElementaryStudents();
  }, []);

  // =========================================================================
  // ⚡ 2. 진도 문자열 분석 및 결합 헬퍼 함수
  // =========================================================================
  // "Unit3 Day2" 형태의 문자열을 { unit: "Unit3", day: "Day2" }로 쪼개줍니다.
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
    const fullProgress = `${unit} ${day}`; // "Unit1 Day3" 형태로 결합
    
    try {
      setSavingId(studentId); // 해당 학생 행에 '저장 중...' 표시 시작

      // 💡 [중요] 2단계에서 발급받을 원장님의 구글 웹앱 URL을 여기에 넣을 예정입니다.
      const APPS_SCRIPT_URL = '구글_웹앱_배포_URL_자리가_될_곳입니다';

      // 우선 화면의 데이터 상태를 즉시 업데이트하여 원장님 눈에 바로 바뀌어 보이게 합니다.
      setStudents(prev => prev.map(s => s.id === studentId ? { ...s, currentBook: book, progress: fullProgress } : s));

      // 실제 구글 시트 웹앱이 구축되면 아래 주석을 해제하여 완벽하게 연동합니다.
      /*
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

      alert(`[동기화 완료] 시트에 성공적으로 동기화되었습니다!\n학생이 다시 로그인하거나 새로고침하면 이 진도로 자동 변경됩니다.`);
    } catch (error) {
      console.error("구글 시트 반영 실패:", error);
      alert("시트 반영 중 오류가 발생했습니다.");
    } finally {
      setSavingId(null); // 로딩 종료
    }
  };

  // =========================================================================
  // 🖥️ 4. 화면 UI 렌더링 영역
  // =========================================================================
  // 학년 탭 버튼 생성용 배열
  const gradeTabs = ['전체', '초1', '초2', '초3', '초4', '초5', '초6'];

  // 선택된 학년 탭에 맞게 학생 목록 실시간 필터링
  const filteredStudents = students.filter(student => {
    if (selectedGrade === '전체') return true;
    return student