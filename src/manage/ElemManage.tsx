import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase'; // 수파베이스 연결

interface Student {
  id: string;
  name: string;
  currentBook: string;
  progress: string; 
  grade: string;    
  wordDone: boolean;       
  sentenceDone: boolean;   
  verbDone: boolean;       
  recordDone: boolean;     
  aiChatDone: boolean;     
}

const SERIES_LIST = ['240', '520', '860', '1240', '1680'];
const BOOK_NUM_LIST = ['1', '2', '3', '4', '5', '6'];
const UNIT_LIST = ['Unit1', 'Unit2', 'Unit3', 'Unit4'];
const DAY_LIST = ['Day1', 'Day2', 'Day3', 'Day4'];

export default function ElemManage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  
  const [selectedGrade, setSelectedGrade] = useState<string>('전체');

  // 진도 수정용 상태
  const [editSeries, setEditSeries] = useState('240');
  const [editBookNum, setEditBookNum] = useState('1');
  const [editUnit, setEditUnit] = useState('Unit1');
  const [editDay, setEditDay] = useState('Day1');
  const [isSaving, setIsSaving] = useState(false);

  // ⭐️ 학생 관리(수정/퇴소) 모달용 상태
  const [manageStudent, setManageStudent] = useState<Student | null>(null);
  const [manageName, setManageName] = useState('');
  const [manageGrade, setManageGrade] = useState('');
  const [isManaging, setIsManaging] = useState(false);

  const fetchAllLMSData = async () => {
    try {
      setIsLoading(true);
      const { data: studentsData, error: studentError } = await supabase
        .from('students')
        .select('*')
        .like('grade', '%초%')
        .order('name', { ascending: true }); // 이름순 정렬 추가

      if (studentError) throw studentError;

      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();

      const { data: logsData, error: logError } = await supabase
        .from('learning_logs')
        .select('student_id, task_type, status')
        .gte('created_at', startOfDay) 
        .eq('status', '완료');

      if (logError) throw logError;

      const todayDoneMap = new Map<string, { word: boolean; sentence: boolean; verb: boolean; record: boolean; ai: boolean }>();

      (logsData || []).forEach(log => {
        if (!todayDoneMap.has(log.student_id)) {
          todayDoneMap.set(log.student_id, { word: false, sentence: false, verb: false, record: false, ai: false });
        }
        const record = todayDoneMap.get(log.student_id)!;

        if (log.task_type.includes('단어')) record.word = true;
        if (log.task_type.includes('문장')) record.sentence = true;
        if (log.task_type.includes('동사') || log.task_type.includes('3단')) record.verb = true; 
        if (log.task_type.includes('녹음')) record.record = true;
        if (log.task_type.includes('회화') || log.task_type.includes('AI') || log.task_type.includes('고래')) record.ai = true;
      });

      const elemStudents: Student[] = (studentsData || []).map(row => {
        const doneStatus = todayDoneMap.get(row.student_id) || { word: false, sentence: false, verb: false, record: false, ai: false };

        return {
          id: row.student_id,
          name: row.name || '이름없음',
          currentBook: row.currentBook || '240_1',
          progress: row.progress || 'Unit1 Day1',
          grade: row.grade || '초1',
          wordDone: doneStatus.word,
          sentenceDone: doneStatus.sentence,
          verbDone: doneStatus.verb, 
          recordDone: doneStatus.record,
          aiChatDone: doneStatus.ai
        };
      });

      setStudents(elemStudents.filter(s => !s.name.includes('body')));
      
    } catch (error) {
      console.error("수파베이스 데이터 로드 에러", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllLMSData();
  }, []);

  const parseProgress = (progressStr: string) => {
    const parts = (progressStr || '').split(' ');
    const unit = parts[0] && parts[0].startsWith('Unit') ? parts[0] : 'Unit1';
    const day = parts[1] && parts[1].startsWith('Day') ? parts[1] : 'Day1';
    return { unit, day };
  };

  const handleSelectStudent = (student: Student) => {
    if (selectedStudent?.id === student.id) {
      setSelectedStudent(null);
      return;
    }
    setSelectedStudent(student);
    
    const [series = '240', bookNum = '1'] = (student.currentBook || '240_1').split('_');
    const { unit, day } = parseProgress(student.progress);
    
    setEditSeries(series);
    setEditBookNum(bookNum);
    setEditUnit(unit);
    setEditDay(day);
  };

  const handleSaveProgress = async (e: React.MouseEvent) => {
    e.stopPropagation(); 
    if (!selectedStudent) return;
    
    const fullBook = `${editSeries}_${editBookNum}`;
    const fullProgress = `${editUnit} ${editDay}`;
    setIsSaving(true);

    try {
      const { error } = await supabase
        .from('students')
        .update({
          currentBook: fullBook,
          progress: fullProgress
        })
        .eq('student_id', selectedStudent.id);

      if (error) throw error;

      const updatedStudent = { ...selectedStudent, currentBook: fullBook, progress: fullProgress };
      setStudents(prev => prev.map(s => s.id === selectedStudent.id ? updatedStudent : s));
      setSelectedStudent(updatedStudent);
      alert(`✅ ${selectedStudent.name} 학생의 진도가 [${fullBook}권 / ${fullProgress}]로 저장되었습니다.`);
      
    } catch (error) {
      alert("진도 저장에 실패했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  // ⭐️ 학생 관리 모달 열기
  const openManageModal = (e: React.MouseEvent, student: Student) => {
    e.stopPropagation(); // 행 클릭(진도창 열림) 방지
    setManageStudent(student);
    setManageName(student.name);
    setManageGrade(student.grade);
  };

  // ⭐️ 학생 정보 수정 저장
  const handleUpdateStudentInfo = async () => {
    if (!manageStudent || !manageName || !manageGrade) return;
    setIsManaging(true);
    try {
      const { error } = await supabase
        .from('students')
        .update({ name: manageName, grade: manageGrade })
        .eq('student_id', manageStudent.id);

      if (error) throw error;

      setStudents(prev => prev.map(s => s.id === manageStudent.id ? { ...s, name: manageName, grade: manageGrade } : s));
      alert('학생 정보가 수정되었습니다.');
      setManageStudent(null);
    } catch (error) {
      alert('수정 실패');
    } finally {
      setIsManaging(false);
    }
  };

  // ⭐️ 학생 퇴소(삭제) 처리
  const handleDeleteStudent = async () => {
    if (!manageStudent) return;
    const confirmDelete = window.confirm(`정말 [${manageStudent.name}] 학생을 퇴소(데이터 삭제) 처리하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`);
    if (!confirmDelete) return;

    setIsManaging(true);
    try {
      const { error } = await supabase
        .from('students')
        .delete()
        .eq('student_id', manageStudent.id);

      if (error) throw error;

      setStudents(prev => prev.filter(s => s.id !== manageStudent.id));
      alert('퇴소 처리가 완료되었습니다.');
      setManageStudent(null);
      if (selectedStudent?.id === manageStudent.id) setSelectedStudent(null);
    } catch (error) {
      alert('퇴소 처리 실패');
    } finally {
      setIsManaging(false);
    }
  };

  const getMissionBadgeStyle = (isDone: boolean) => ({
    padding: '4px 8px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 'bold' as const,
    backgroundColor: isDone ? '#dcfce7' : '#1e293b',
    color: isDone ? '#15803d' : '#64748b',
    border: isDone ? '1px solid #bbf7d0' : '1px solid #334155',
  });

  const filteredStudents = selectedGrade === '전체' 
    ? students 
    : students.filter(s => s.grade === selectedGrade);

  const uniqueGrades = ['전체', '초1', '초2', '초3', '초4', '초5', '초6'];

  return (
    <div className="bg-[#0f172a] text-slate-100 p-6 rounded-2xl border border-slate-800 shadow-2xl relative">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h2 className="text-2xl font-black text-indigo-400 mb-1">👑 초등부 실시간 관제탑</h2>
          <p className="text-sm text-slate-400">아이들의 오늘 학습 현황을 확인하고 진도를 즉시 변경하세요.</p>
        </div>
        <button onClick={fetchAllLMSData} className="bg-slate-800 hover:bg-slate-700 text-sm px-4 py-2 rounded-xl border border-slate-600 font-bold transition-all">
          {isLoading ? '⏳ 로딩 중...' : '🔄 데이터 새로고침'}
        </button>
      </div>

      {/* ⭐️ 말랑말랑해진 학년 필터 버튼 탭 & 총원 표시 */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {uniqueGrades.map(grade => (
            <button
              key={grade}
              onClick={() => setSelectedGrade(grade)}
              className={`px-5 py-2 rounded-full text-sm font-bold transition-all duration-300 transform hover:-translate-y-1 ${
                selectedGrade === grade 
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/30 border border-transparent' 
                  : 'bg-slate-800/80 text-slate-400 hover:bg-slate-700 hover:text-slate-200 border border-slate-700'
              }`}
            >
              {grade}
            </button>
          ))}
        </div>
        <div className="text-sm font-bold bg-slate-800 px-4 py-2 rounded-xl border border-slate-700 text-indigo-300">
          총 <span className="text-white text-base">{filteredStudents.length}</span> 명
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-inner">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="bg-slate-950 border-b border-slate-800 text-slate-400">
              <th className="p-4 w-12 text-center">#</th>
              <th className="p-4 w-1/4">학생 이름</th>
              <th className="p-4 w-2/5">오늘 학습 현황</th>
              <th className="p-4 w-auto">학습 진도 설정</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.length === 0 && !isLoading && (
              <tr>
                <td colSpan={4} className="p-10 text-center text-slate-500">
                  해당 학년({selectedGrade})에 등록된 학생이 없습니다.
                </td>
              </tr>
            )}
            
            {filteredStudents.map((student, index) => {
              const isSelected = selectedStudent?.id === student.id;
              
              return (
                <tr 
                  key={student.id} 
                  onClick={() => handleSelectStudent(student)} 
                  className={`border-b border-slate-800/50 cursor-pointer transition-colors ${isSelected ? 'bg-indigo-900/30' : 'hover:bg-slate-800/40'}`}
                >
                  {/* ⭐️ 순번 칸 */}
                  <td className="p-4 text-center text-slate-500 font-bold">
                    {index + 1}
                  </td>

                  {/* 이름 & 관리버튼 칸 */}
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="font-bold text-lg text-white">{student.name}</div>
                        <div className="text-xs text-indigo-300 font-medium mt-1">{student.grade}</div>
                      </div>
                      <button 
                        onClick={(e) => openManageModal(e, student)}
                        className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-400 px-2 py-1 rounded border border-slate-700 transition-colors"
                      >
                        ⚙️ 관리
                      </button>
                    </div>
                  </td>
                  
                  {/* 오늘 미션 칸 */}
                  <td className="p-4">
                    <div className="flex flex-wrap gap-2">
                      <span style={getMissionBadgeStyle(student.wordDone)}>{student.wordDone ? '✅ 단어' : '❌ 단어'}</span>
                      <span style={getMissionBadgeStyle(student.sentenceDone)}>{student.sentenceDone ? '✅ 문장' : '❌ 문장'}</span>
                      <span style={getMissionBadgeStyle(student.verbDone)}>{student.verbDone ? '✅ 3단동사' : '❌ 3단동사'}</span>
                      <span style={getMissionBadgeStyle(student.aiChatDone)}>{student.aiChatDone ? '🤖 회화' : '☠️ 회화'}</span>
                    </div>
                  </td>

                  {/* 진도 설정 칸 */}
                  <td className="p-4">
                    {isSelected ? (
                      <div className="flex flex-wrap gap-2 items-center" onClick={(e) => e.stopPropagation()}>
                        <select value={editSeries} onChange={e => setEditSeries(e.target.value)} className="bg-slate-800 p-2 rounded text-sm border border-indigo-500/50 text-white outline-none">
                          {SERIES_LIST.map(s => <option key={s} value={s}>{s} 시리즈</option>)}
                        </select>
                        <select value={editBookNum} onChange={e => setEditBookNum(e.target.value)} className="bg-slate-800 p-2 rounded text-sm border border-indigo-500/50 text-white outline-none">
                          {BOOK_NUM_LIST.map(n => <option key={n} value={n}>{n}권</option>)}
                        </select>
                        <select value={editUnit} onChange={e => setEditUnit(e.target.value)} className="bg-slate-800 p-2 rounded text-sm border border-indigo-500/50 text-white outline-none">
                          {UNIT_LIST.map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                        <select value={editDay} onChange={e => setEditDay(e.target.value)} className="bg-slate-800 p-2 rounded text-sm border border-indigo-500/50 text-white outline-none">
                          {DAY_LIST.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                        <button 
                          onClick={handleSaveProgress} 
                          disabled={isSaving}
                          className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm px-4 py-2 rounded-lg font-bold shadow-lg disabled:opacity-50"
                        >
                          {isSaving ? '저장중..' : '저장'}
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-3 py-1 rounded-full text-sm font-bold">
                          {student.currentBook}권
                        </span>
                        <span className="text-slate-300 text-sm">
                          {student.progress}
                        </span>
                        <span className="text-slate-500 text-xs ml-2 hover:text-indigo-400">(클릭하여 수정)</span>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ⭐️ 학생 관리 팝업 모달 */}
      {manageStudent && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50">
          <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl shadow-2xl w-96 relative">
            <h3 className="text-xl font-bold text-white mb-4">⚙️ 학생 정보 관리</h3>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm text-slate-400 mb-1">학생 이름</label>
                <input 
                  type="text" 
                  value={manageName}
                  onChange={(e) => setManageName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg p-2 text-white outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">학년 (예: 초1, 초5)</label>
                <input 
                  type="text" 
                  value={manageGrade}
                  onChange={(e) => setManageGrade(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg p-2 text-white outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-slate-800">
              {/* 퇴소 버튼은 빨간색으로 위험 강조 */}
              <button 
                onClick={handleDeleteStudent}
                disabled={isManaging}
                className="text-red-400 hover:text-white hover:bg-red-600 px-3 py-2 rounded-lg text-sm font-bold transition-colors"
              >
                🗑️ 퇴소 처리
              </button>
              
              <div className="flex gap-2">
                <button 
                  onClick={() => setManageStudent(null)}
                  className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm font-bold"
                >
                  취소
                </button>
                <button 
                  onClick={handleUpdateStudentInfo}
                  disabled={isManaging}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-lg"
                >
                  {isManaging ? '저장중...' : '정보 수정'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}