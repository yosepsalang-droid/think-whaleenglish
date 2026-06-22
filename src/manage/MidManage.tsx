import React, { useState, useEffect } from 'react';
// 💡 1. 방금 만든 Voca.tsx 파일을 불러오는 코드입니다.
import Voca from './Voca'; 

interface Student { id: string; name: string; currentBook: string; progress: string; grade: string; }

export default function MidManage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedGrade, setSelectedGrade] = useState<string>('전체');
  const [savingId, setSavingId] = useState<string | null>(null);

  // 💡 2. 화면을 '메인(학생목록)'으로 보여줄지 '단어장(voca)'으로 보여줄지 결정하는 스위치
  const [currentView, setCurrentView] = useState<'main' | 'voca'>('main');
  // 💡 3. 선택한 학생의 교재 이름을 저장해 단어장으로 넘겨주기 위한 변수
  const [selectedBook, setSelectedBook] = useState<string>('');

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
    const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyOAbzxggopAl9QhrG2VHSmo0yCEcdIi89xhgvT5nOWkk9sZbiTtB-XjQd4GVhV4MhE/exec';
    
    await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ studentId, book, progress })
    });
    
    alert(`[동기화 완료] 시트에 적용되었습니다.`);
    setSavingId(null);
  };

  // 💡 4. 단어 테스트 버튼을 눌렀을 때 실행되는 함수
  const handleStartVoca = (book: string) => {
    setSelectedBook(book); // 해당 학생의 교재를 세팅
    setCurrentView('voca'); // 화면을 Voca로 전환
  };

  // 💡 5. 스위치가 'voca'일 때는 목록 대신 단어장 화면을 보여줍니다.
  if (currentView === 'voca') {
    return (
      <Voca