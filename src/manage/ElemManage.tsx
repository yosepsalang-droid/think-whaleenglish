import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface Student {
  id: string;
  name: string;
  currentBook: string;
  progress: string; 
  grade: string;    
  wordDone: string;       
  sentenceDone: string;   
  verbDone: string;       
  recordDone: string;     
  aiChatDone: string;     
}

const SERIES_LIST = ['240', '520', '860', '1240', '1680'];
const BOOK_NUM_LIST = ['1', '2', '3', '4', '5', '6'];
const UNIT_LIST = ['Unit1', 'Unit2', 'Unit3', 'Unit4'];
const DAY_LIST = ['Day1', 'Day2', 'Day3', 'Day4'];

const parseUnitDay = (bookInfo: string) => {
  if (!bookInfo) return '';
  const unitMatch = bookInfo.match(/unit\s*(\d+)/i);
  const dayMatch = bookInfo.match(/day\s*(\d+)/i);
  if (unitMatch && dayMatch) {
    return `(U${unitMatch[1]}D${dayMatch[1]})`;
  }
  return '';
};

export default function ElemManage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  
  const [selectedGrade, setSelectedGrade] = useState<string>('전체');

  const [editSeries, setEditSeries] = useState('240');
  const [editBookNum, setEditBookNum] = useState('1');
  const [editUnit, setEditUnit] = useState('Unit1');
  const [editDay, setEditDay] = useState('Day1');
  const [isSaving, setIsSaving] = useState(false);

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
        .order('name', { ascending: true }); 

      if (studentError) throw studentError;

      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();

      const { data: logsData, error: logError } = await supabase
        .from('learning_logs')
        .select('student_id, task_type, status, book_info')
        .gte('created_at', startOfDay) 
        .eq('status', '완료');

      if (logError) throw logError;

      const todayDoneMap = new Map<string, { word: string; sentence: string; verb: string; record: string; ai: string }>();

      (logsData || []).forEach(log => {
        if (!todayDoneMap.has(log.student_id)) {
          todayDoneMap.set(log.student_id, { word: '', sentence: '', verb: '', record: '', ai: '' });
        }
        const record = todayDoneMap.get(log.student_id)!;
        const detail = parseUnitDay(log.book_info); 

        if (log.task_type.includes('단어')) record.word = `✅ 단어${detail}`;
        if (log.task_type.includes('문장')) record.sentence = `✅ 문장${detail}`;
        if (log.task_type.includes('동사') || log.task_type.includes('3단')) record.verb = `✅ 3단동사${detail}`; 
        if (log.task_type.includes('녹음')) record.record = `✅ 녹음${detail}`;
        if (log.task_type.includes('회화') || log.task_type.includes('AI') || log.task_type.includes('고래')) record.ai = `🤖 회화${detail}`;
      });

      const elemStudents: Student[] = (studentsData || []).map(row => {
        const doneStatus = todayDoneMap.get(row.student_id) || { word: '', sentence: '', verb: '', record: '', ai: '' };

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

  const openManageModal = (e: React.MouseEvent, student: Student) => {
    e.stopPropagation(); 
    setManageStudent(student);
    setManageName(student.name);
    setManageGrade(student.grade);
  };

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

  const StatusBadge = ({ status, fallback }: { status: string, fallback: string }) => {
    const isDone = status !== '';
    return (
      <span className={`px-2 py-1 rounded text-[11px] sm:text-xs font-semibold border whitespace-nowrap ${
        isDone 
          ? 'bg-green-50 text-green-700 border-green-200' 
          : 'bg-gray-50 text-gray-400 border-gray-200'
      }`}>
        {isDone ? status : fallback}
      </span>
    );
  };

  const filteredStudents = selectedGrade === '전체' 
    ? students 
    : students.filter(s => s.grade === selectedGrade);

  const uniqueGrades = ['전체', '초1', '초2', '초3', '초4', '초5', '초6'];

  return (
    <div className="bg-white text-gray-800 p-4 sm:p-6 rounded-2xl border border-gray-200 shadow-xl max-w-7xl mx-auto mt-4">
      
      {/* 헤더 */}
      <div className="flex flex-col items-center justify-center mb-6">
        <h2 className="text-2xl sm:text-3xl font-black text-gray-800 mb-2">👑 초등부 실시간 관제탑</h2>
        <button onClick={fetchAllLMSData} className="mt-2 bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs sm:text-sm px-4 py-2 rounded-lg border border-blue-200 font-bold transition-all shadow-sm">
          {isLoading ? '⏳ 데이터 가져오는 중...' : '🔄 실시간 데이터 새로고침'}
        </button>
      </div>

      {/* ⭐️ 세련된 학년 탭 버튼 (아이폰 스타일) */}
      <div className="flex flex-col items-center gap-3 mb-6">
        <div className="inline-flex bg-gray-100 p-1.5 rounded-xl shadow-inner overflow-x-auto max-w-full scrollbar-hide">
          {uniqueGrades.map(grade => (
            <button
              key={grade}
              onClick={() => setSelectedGrade(grade)}
              className={`px-4 sm:px-6 py-2 rounded-lg text-sm font-bold transition-all duration-200 whitespace-nowrap ${
                selectedGrade === grade 
                  ? 'bg-white text-blue-600 shadow-sm border border-gray-200' 
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50 border border-transparent'
              }`}
            >
              {grade}
            </button>
          ))}
        </div>
        <div className="text-sm font-bold text-gray-600">
          총 <span className="text-blue-600 text-lg mx-1">{filteredStudents.length}</span> 명
        </div>
      </div>

      {/* ⭐️ 엑셀 스타일 테이블 영역 (가로 스크롤 허용) */}
      <div className="overflow-x-auto w-full border rounded-lg border-gray-300">
        <table className="w-full text-center text-sm border-collapse min-w-[700px]">
          <thead>
            <tr className="bg-gray-100 text-gray-700">
              {/* ⭐️ 모든 칸에 명확한 테두리 (border) 추가 & 줄바꿈 금지(whitespace-nowrap) */}
              <th className="p-3 font-bold border border-gray-300 whitespace-nowrap w-12">번호</th>
              <th className="p-3 font-bold border border-gray-300 whitespace-nowrap w-16">학년</th>
              <th className="p-3 font-bold border border-gray-300 whitespace-nowrap w-24">이름</th>
              <th className="p-3 font-bold border border-gray-300 whitespace-nowrap min-w-[320px]">오늘 학습 현황</th>
              <th className="p-3 font-bold border border-gray-300 whitespace-nowrap min-w-[250px]">학습 진도 설정</th>
              <th className="p-3 font-bold border border-gray-300 whitespace-nowrap w-20">관리</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.length === 0 && !isLoading && (
              <tr>
                <td colSpan={6} className="p-10 text-center text-gray-400 border border-gray-300">
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
                  className={`cursor-pointer transition-colors ${isSelected ? 'bg-blue-50/50' : 'hover:bg-gray-50'}`}
                >
                  <td className="p-2 border border-gray-300 text-gray-400 font-bold whitespace-nowrap">{index + 1}</td>
                  
                  <td className="p-2 border border-gray-300 text-gray-600 font-medium whitespace-nowrap">{student.grade}</td>

                  <td className="p-2 border border-gray-300 font-extrabold text-gray-900 text-base whitespace-nowrap">{student.name}</td>
                  
                  <td className="p-2 border border-gray-300">
                    <div className="flex flex-wrap justify-center gap-1.5">
                      <StatusBadge status={student.wordDone} fallback="❌ 단어" />
                      <StatusBadge status={student.sentenceDone} fallback="❌ 문장" />
                      <StatusBadge status={student.verbDone} fallback="❌ 3단동사" />
                      <StatusBadge status={student.aiChatDone} fallback="☠️ 회화" />
                    </div>
                  </td>

                  <td className="p-2 border border-gray-300">
                    {isSelected ? (
                      <div className="flex justify-center gap-1 items-center" onClick={(e) => e.stopPropagation()}>
                        <select value={editSeries} onChange={e => setEditSeries(e.target.value)} className="bg-white p-1 rounded border border-gray-300 text-xs outline-none focus:border-blue-500">
                          {SERIES_LIST.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <select value={editBookNum} onChange={e => setEditBookNum(e.target.value)} className="bg-white p-1 rounded border border-gray-300 text-xs outline-none focus:border-blue-500">
                          {BOOK_NUM_LIST.map(n => <option key={n} value={n}>{n}권</option>)}
                        </select>
                        <select value={editUnit} onChange={e => setEditUnit(e.target.value)} className="bg-white p-1 rounded border border-gray-300 text-xs outline-none focus:border-blue-500">
                          {UNIT_LIST.map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                        <select value={editDay} onChange={e => setEditDay(e.target.value)} className="bg-white p-1 rounded border border-gray-300 text-xs outline-none focus:border-blue-500">
                          {DAY_LIST.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                        <button 
                          onClick={handleSaveProgress} 
                          disabled={isSaving}
                          className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded font-bold shadow disabled:opacity-50 ml-1"
                        >
                          {isSaving ? '저장중..' : '저장'}
                        </button>
                      </div>
                    ) : (
                      <div className="flex justify-center items-center gap-1">
                        <span className="text-gray-800 font-bold text-sm whitespace-nowrap">
                          {student.currentBook}권
                        </span>
                        <span className="text-gray-600 text-sm whitespace-nowrap">
                          {student.progress}
                        </span>
                        <span className="text-gray-400 text-xs ml-1 whitespace-nowrap hidden sm:inline">(클릭하여 수정)</span>
                      </div>
                    )}
                  </td>

                  <td className="p-2 border border-gray-300">
                    <button 
                      onClick={(e) => openManageModal(e, student)}
                      className="bg-white hover:bg-gray-100 text-gray-600 border border-gray-300 px-3 py-1 rounded text-xs font-bold transition-colors shadow-sm whitespace-nowrap"
                    >
                      ⚙️ 관리
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 학생 관리 모달 (이전과 동일) */}
      {manageStudent && (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">
          <div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-2xl w-96 relative mx-4">
            <h3 className="text-xl font-bold text-gray-800 mb-4">⚙️ 학생 정보 관리</h3>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm text-gray-600 mb-1 font-bold">학생 이름</label>
                <input 
                  type="text" 
                  value={manageName}
                  onChange={(e) => setManageName(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2 text-gray-800 outline-none focus:border-blue-500 focus:bg-white transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1 font-bold">학년 (예: 초1, 초5)</label>
                <input 
                  type="text" 
                  value={manageGrade}
                  onChange={(e) => setManageGrade(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2 text-gray-800 outline-none focus:border-blue-500 focus:bg-white transition-colors"
                />
              </div>
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-gray-200">
              <button 
                onClick={handleDeleteStudent}
                disabled={isManaging}
                className="text-red-500 hover:text-white hover:bg-red-500 px-3 py-2 rounded-lg text-sm font-bold transition-colors"
              >
                🗑️ 퇴소 처리
              </button>
              
              <div className="flex gap-2">
                <button 
                  onClick={() => setManageStudent(null)}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-bold transition-colors"
                >
                  취소
                </button>
                <button 
                  onClick={handleUpdateStudentInfo}
                  disabled={isManaging}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-md transition-colors"
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