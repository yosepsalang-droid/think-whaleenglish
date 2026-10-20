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
              <select value={newStudent.grade} onChange={(e) => setNewStudent({...newStudent, grade: e.target.value})} style={styles.input}>
                <option value="초1">초1</option>
                <option value="초2">초2</option>
                <option value="초3">초3</option>
                <option value="초4">초4</option>
                <option value="초5">초5</option>
                <option value="초6">초6</option>
                <option value="중1">중1</option>
                <option value="중2">중2</option>
                <option value="중3">중3</option>
                <option value="고1">고1</option>
                <option value="고2">고2</option>
                <option value="고3">고3</option>
              </select>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={styles.label}>시작 교재명</label>
              <input type="text" value={newStudent.currentBook} onChange={(e) => setNewStudent({...newStudent, currentBook: e.target.value})} placeholder="예: 240_1 또는 워드타파" style={styles.input} />
            </div>

            <div style={{ marginBottom: '25px' }}>
              <label style={styles.label}>시작 진도</label>
              <input type="text" value={newStudent.progress} onChange={(e) => setNewStudent({...newStudent, progress: e.target.value})} placeholder="예: Unit1 Day1 또는 1" style={styles.input} />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setShowAddStudent(false)} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', backgroundColor: 'white', color: '#475569', fontWeight: 'bold', cursor: 'pointer' }}>취소</button>
              <button onClick={handleAddStudent} disabled={isSubmitting} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: 'none', backgroundColor: '#2563eb', color: 'white', fontWeight: 'bold', cursor: isSubmitting ? 'not-allowed' : 'pointer' }}>
                {isSubmitting ? '등록 중...' : '등록 완료'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ background: 'white', padding: '40px', borderRadius: '24px', width: '800px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', position: 'relative' }}>
        
        {/* 뒤로가기 버튼 */}
        <button onClick={onBack} style={{ position: 'absolute', top: '24px', left: '24px', background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#333' }}>
          ◀ 메인으로
        </button>

        <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#1e293b', margin: '20px 0 30px 0', textAlign: 'center' }}>
          👑 ACADEMY CONTROL TOWER (통합 관제탑)
        </h2>

        {/* 💡 [추가] 교실 대난투 팀 배틀 실행 버튼 */}
        <button 
          onClick={() => setShowTeamBattle(true)}
          style={{ 
            width: '100%', padding: '20px', backgroundColor: '#f59e0b', color: 'white', 
            border: 'none', borderRadius: '16px', cursor: 'pointer', fontWeight: '900', 
            fontSize: '24px', marginBottom: '20px', boxShadow: '0 6px 12px rgba(245,158,11,0.3)' 
          }}
          onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.98)'}
          onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          📺 교실 대난투 팀 배틀 (TV 모드 실행)
        </button>

        {/* 상단 컨트롤 버튼 그룹 (AI 연구소 + 신규학생등록) */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          <button
            onClick={() => setShowAiStudio(true)}
            style={{ flex: 1, padding: '14px 16px', border: 'none', borderRadius: '12px', backgroundColor: '#1e293b', color: 'white', fontSize: '15px', fontWeight: 800, cursor: 'pointer' }}
          >
            🤖 AI 문제 연구소
          </button>
          
          <button
            onClick={() => setShowAddStudent(true)}
            style={{ flex: 1, padding: '14px 16px', border: 'none', borderRadius: '12px', backgroundColor: '#2563eb', color: 'white', fontSize: '15px', fontWeight: 800, cursor: 'pointer' }}
          >
            ➕ 신규 학생 등록
          </button>
        </div>

        {/* 탭 네비게이션 바 */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '30px', backgroundColor: '#f1f5f9', padding: '6px', borderRadius: '14px' }}>
          <button 
            onClick={() => setActiveTab('elementary')}
            style={{ flex: 1, padding: '12px', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', backgroundColor: activeTab === 'elementary' ? 'white' : 'transparent', color: activeTab === 'elementary' ? '#33b864' : '#64748b', boxShadow: activeTab === 'elementary' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none', transition: 'all 0.2s' }}
          >
            🧸 초등부 관리
          </button>
          
          <button 
            onClick={() => setActiveTab('middle')}
            style={{ flex: 1, padding: '12px', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', backgroundColor: activeTab === 'middle' ? 'white' : 'transparent', color: activeTab === 'middle' ? '#4f46e5' : '#64748b', boxShadow: activeTab === 'middle' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none', transition: 'all 0.2s' }}
          >
            ✍️ 중등부 관리
          </button>
          
          <button 
            onClick={() => setActiveTab('report')}
            style={{ flex: 1, padding: '12px', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', backgroundColor: activeTab === 'report' ? 'white' : 'transparent', color: activeTab === 'report' ? '#ea580c' : '#64748b', boxShadow: activeTab === 'report' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none', transition: 'all 0.2s' }}
          >
            💌 주말 리포트
          </button>
        </div>

        {/* 분리된 개별 서브 파일들을 조건부로 조립합니다. */}
        <div style={{ minHeight: '300px', padding: '10px' }}>
          {activeTab === 'elementary' && <ElemManage />}
          {activeTab === 'middle' && <MidManage />}
          {activeTab === 'report' && <ReportManage />}
        </div>

      </div>
    </div>
  );
}

// 팝업창 입력칸 스타일
const styles = {
  label: { display: 'block', fontSize: '13px', color: '#64748b', fontWeight: 'bold', marginBottom: '6px' },
  input: { width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '14px', boxSizing: 'border-box' as const }
};