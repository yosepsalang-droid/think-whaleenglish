import React, { useState } from 'react';
import { supabase } from '../lib/supabase'; // 💡 수파베이스 연동 추가!
import ElemManage from './ElemManage';
import MidManage from './MidManage';
import ReportManage from './ReportManage';
import LmsAiStudio from './LmsAiStudio';
import TeamBattle from '../elem/TeamBattle'; // 💡 [추가] 팀 배틀 컴포넌트 불러오기!

interface LmsProps {
  onBack: () => void;
}

export default function Lms({ onBack }: LmsProps) {
  const [activeTab, setActiveTab] = useState<'elementary' | 'middle' | 'report'>('elementary');
  const [showAiStudio, setShowAiStudio] = useState(false);
  
  // 💡 [추가] 팀 배틀 화면 전환을 위한 상태
  const [showTeamBattle, setShowTeamBattle] = useState(false);

  // 💡 [핵심 패치] 신규 학생 등록 팝업 상태 관리
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newStudent, setNewStudent] = useState({
    student_id: '',
    name: '',
    grade: '초1',
    currentBook: '240_1',
    progress: 'Unit1 Day1'
  });

  // 💡 [추가] 팀 배틀 화면이 켜지면 팀 배틀 화면 띄우기
  if (showTeamBattle) {
    return <TeamBattle onBack={() => setShowTeamBattle(false)} tableName="words" />;
  }

  if (showAiStudio) {
    return <LmsAiStudio onBack={() => setShowAiStudio(false)} />;
  }

  // 💡 [핵심 패치] 수파베이스에 학생 데이터를 직접 밀어넣는 함수
  const handleAddStudent = async () => {
    if (!newStudent.student_id.trim() || !newStudent.name.trim()) {
      alert('⚠️ 아이디와 이름은 필수 입력 사항입니다!');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('students').insert([{
        student_id: newStudent.student_id.trim(),
        name: newStudent.name.trim(),
        grade: newStudent.grade,
        currentBook: newStudent.currentBook.trim(),
        progress: newStudent.progress.trim(),
      }]);

      if (error) {
        if (error.code === '23505') {
          alert('⚠️ 이미 존재하는 아이디입니다. 다른 아이디를 사용해주세요.');
        } else {
          alert(`학생 등록 실패: ${error.message}`);
        }
      } else {
        alert(`🎉 ${newStudent.name} 학생이 성공적으로 등록되었습니다!`);
        setShowAddStudent(false); // 팝업 닫기
        // 폼 초기화
        setNewStudent({ student_id: '', name: '', grade: '초1', currentBook: '240_1', progress: 'Unit1 Day1' });
      }
    } catch (err) {
      console.error('등록 중 에러:', err);
      alert('서버와 통신 중 문제가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#f0f4f8', padding: '20px', fontFamily: 'Pretendard, sans-serif' }}>
      
      {/* 💡 [팝업 UI] 신규 학생 등록 창 */}
      {showAddStudent && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 999 }}>
          <div style={{ background: 'white', padding: '30px', borderRadius: '20px', width: '400px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '20px', fontWeight: '800', color: '#1e293b' }}>➕ 신규 학생 등록</h3>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={styles.label}>로그인 아이디 (영문/숫자)</label>
              <input type="text" value={newStudent.student_id} onChange={(e) => setNewStudent({...newStudent, student_id: e.target.value})} placeholder="예: uthinks999" style={styles.input} />
            </div>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={styles.label}>학생 이름</label>
              <input type="text" value={newStudent.name} onChange={(e) => setNewStudent({...newStudent, name: e.target.value})} placeholder="예: 홍길동" style={styles.input} />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={styles.label}>학년</label>
              <select value={newStudent.grade} onChange={(e) => setNewStudent({...newStudent, grade: e.target.value})}