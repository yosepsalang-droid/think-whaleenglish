import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase'; // 수파베이스 연결

// 개별 학생 정보 규격 (verbDone 추가)
interface Student {
  id: string;
  name: string;
  currentBook: string;
  progress: string; 
  grade: string;    
  wordDone: boolean;       // 단어게임 완료 
  sentenceDone: boolean;   // 문장배열 완료 
  verbDone: boolean;       // ⭐️ 3단 동사 완료 여부 추가
  recordDone: boolean;     // 음성녹음 완료 
  aiChatDone: boolean;     // AI대화 완료 
}

// 📚 교재 구조 리스트
const SERIES_LIST = ['240', '520', '860', '1240', '1680'];
const BOOK_NUM_LIST = ['1', '2', '3', '4', '5', '6'];
const UNIT_LIST = ['Unit1', 'Unit2', 'Unit3', 'Unit4'];
const DAY_LIST = ['Day1', 'Day2', 'Day3', 'Day4'];

export default function ElemManage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  
  // ⭐️ 학년 필터용 상태 관리
  const [selectedGrade, setSelectedGrade] = useState<string>('전체');

  // 수정용 상태 관리
  const [editSeries, setEditSeries] = useState('240');
  const [editBookNum, setEditBookNum] = useState('1');
  const [editUnit, setEditUnit] = useState('Unit1');
  const [editDay, setEditDay] = useState('Day1');
  const [isSaving, setIsSaving] = useState(false);

  // 데이터 불러오기
  const fetchAllLMSData = async () => {
    try {
      setIsLoading(true);
      
      const { data: studentsData, error: studentError } = await supabase
        .from('students')
        .select('*')
        .like('grade', '%초%');

      if (studentError) throw studentError;

      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();

      const { data: logsData, error: logError } = await supabase
        .from('learning_logs')
        .select('student_id, task_type, status')
        .gte('created_at', startOfDay) 
        .eq('status', '완료');

      if (logError) throw logError;

      // ⭐️ 3단 동사(verb) 체크 로직 추가
      const todayDoneMap = new Map<string, { word: boolean; sentence: boolean; verb: boolean; record: boolean; ai: boolean }>();

      (logsData || []).forEach(log => {
        if (!todayDoneMap.has(log.student_id)) {
          todayDoneMap.set(log.student_id, { word: false, sentence: false, verb: false, record: false, ai: false });
        }
        const record = todayDoneMap.get(log.student_id)!;

        if (log.task_type.includes('단어')) record.word = true;
        if (log.task_type.includes('문장')) record.sentence = true;
        if (log.task_type.includes('동사') || log.task_type.includes('3단')) record.verb = true; // ⭐️ 동사 체크
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
          verbDone: doneStatus.verb, // ⭐️ 동사 상태 반영
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
      console.error("진도 반영 실패:", error);
      alert("데이터베이스 저장에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setIsSaving(false);
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

  // ⭐️ 선택된 학년만 걸러내기 (필터 기능)
  const filteredStudents = selectedGrade === '전체' 
    ? students 
    : students.filter(s => s.grade === selectedGrade);

  // ⭐️ 유동적인 학년 버튼 리스트 만들기 (초1, 초2 등)
  const uniqueGrades = ['전체', '초1', '초2', '초3', '초4', '초5', '초6'];

  return (
    <div className="bg-[#0f172a] text-slate-100 p-6 rounded-2xl border border-slate-800 shadow-2xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-black text-indigo-400">👑 초등부 실시간 관제탑</h2>
          <p className="text-sm text-slate-400 mt-1">아이들의 오늘 학습 현황을 확인하고 진도를 즉시 변경하세요.</p>
        </div>
        <button onClick={fetchAllLMSData} className="bg-slate-800 hover:bg-slate-700 text-sm px-4 py-2 rounded-xl border border-slate-600 font-bold transition-all">
          {isLoading ? '⏳ 불러오는 중...' : '🔄 실시간 새로고침'}
        </button>
      </div>

      {/* ⭐️ 학년 필터 버튼 탭 */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        {uniqueGrades.map(grade => (
          <button
            key={grade}
            onClick={() => setSelectedGrade(grade)}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors whitespace-nowrap ${
              selectedGrade === grade 
                ? 'bg-indigo-600 text-white shadow-lg' 
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            {grade}
          </button>
        ))}
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-inner">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="bg-slate-950 border-b border-slate-800 text-slate-400">
              <th className="p-4 w-1/5">학생 이름</th>
              <th className="p-4 w-2/5">오늘 학습 현황 (자동 기록)</th>
              <th className="p-4 w-auto">학습 진도 설정 (클릭 시 변경)</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.length === 0 && !isLoading && (
              <tr>
                <td colSpan={3} className="p-10 text-center text-slate-500">
                  해당 학년({selectedGrade})에 등록된 학생이 없습니다.
                </td>
              </tr>
            )}
            
            {filteredStudents.map(student => {
              const isSelected = selectedStudent?.id === student.id;
              
              return (
                <tr 
                  key={student.id} 
                  onClick={() => handleSelectStudent(student)} 
                  className={`border-b border-slate-800/50 cursor-pointer transition-colors ${isSelected ? 'bg-indigo-900/30' : 'hover:bg-slate-800/40'}`}
                >
                  {/* 이름 칸 */}
                  <td className="p-4">
                    <div className="font-bold text-lg text-white">{student.name}</div>
                    <div className="text-xs text-indigo-300 font-medium mt-1">{student.grade}</div>
                  </td>
                  
                  {/* ⭐️ 오늘 미션 칸 (3단 동사 뱃지 추가) */}
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
    </div>
  );
}