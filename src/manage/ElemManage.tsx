import React, { useState, useEffect } from 'react';
import { CONFIG } from '../config';

// 개별 학생 정보 규격
interface Student {
  id: string;
  name: string;
  currentBook: string;
  progress: string; 
  grade: string;    
  wordDone: boolean;       // 오늘 단어게임 완료 여부
  sentenceDone: boolean;   // 오늘 문장배열 완료 여부
  recordDone: boolean;     // [추후 확장] 음성녹음 완료 여부
  aiChatDone: boolean;     // [추후 확장] AI대화 완료 여부
}

// 📚 원장님 요청 구조 반영 (시리즈 5개, 각 1~6권, Unit 1~4, Day 1~4)
const SERIES_LIST = ['240', '520', '860', '1240', '1680'];
const BOOK_NUM_LIST = ['1', '2', '3', '4', '5', '6'];
const UNIT_LIST = ['Unit1', 'Unit2', 'Unit3', 'Unit4'];
const DAY_LIST = ['Day1', 'Day2', 'Day3', 'Day4'];

export default function ElemManage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  
  // 수정용 상태 관리 (시리즈, 권, 유닛, 데이 분리)
  const [editSeries, setEditSeries] = useState('240');
  const [editBookNum, setEditBookNum] = useState('1');
  const [editUnit, setEditUnit] = useState('Unit1');
  const [editDay, setEditDay] = useState('Day1');
  const [isSaving, setIsSaving] = useState(false);

  // 데이터 교차 분석 및 가져오기
  const fetchAllLMSData = async () => {
    try {
      setIsLoading(true);
      
      const [memberResponse, logResponse] = await Promise.all([
        fetch(`${CONFIG.SHEETS.STUDENT_LIST}&_nocache=${Date.now()}`),
        fetch(`${CONFIG.SHEETS.ELEM_MANAGE}&_nocache=${Date.now()}`)
      ]);

      const memberText = await memberResponse.text();
      const logText = await logResponse.text();

      // --- [A] 오늘 완수 로그 데이터 생성 ---
      const logRows = logText.split('\n').map(r => r.trim()).filter(r => r !== '');
      const now = new Date();
      const todayStr1 = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const todayStr2 = `${now.getFullYear()}. ${now.getMonth() + 1}. ${now.getDate()}`;

      const todayDoneMap = new Map<string, { word: boolean; sentence: boolean; record: boolean; ai: boolean }>();

      logRows.slice(1).forEach(row => {
        const cols = row.split(',').map(col => col.replace(/"/g, '').trim());
        const timestamp = cols[0] || '';
        const studentId = cols[1] || '';
        const taskType = cols[3] || ''; 
        const status = cols[4] || '';  

        if ((timestamp.includes(todayStr1) || timestamp.includes(todayStr2)) && status === '완료') {
          if (!todayDoneMap.has(studentId)) {
            todayDoneMap.set(studentId, { word: false, sentence: false, record: false, ai: false });
          }
          const record = todayDoneMap.get(studentId)!;
          if (taskType === '단어게임') record.word = true;
          if (taskType === '문장배열') record.sentence = true;
          if (taskType === '음성녹음') record.record = true;
          if (taskType === 'AI대화') record.ai = true;
        }
      });

      // --- [B] 명단 대조 및 학생 객체 배열 가동 ---
      const memberRows = memberText.split('\n').map(row => row.trim()).filter(row => row !== '');
      
      const allStudents: Student[] = memberRows.slice(1).map(row => {
        const cols = row.split(',').map(col => col.replace(/"/g, '').trim());
        const id = cols[0];
        const doneStatus = todayDoneMap.get(id) || { word: false, sentence: false, record: false, ai: false };

        return {
          id: id,
          name: cols[1] || '이름없음',
          currentBook: cols[2] || '240_1',
          progress: cols[3] || 'Unit1 Day1',
          grade: cols[4] || '초1',
          wordDone: doneStatus.word,
          sentenceDone: doneStatus.sentence,
          recordDone: doneStatus.record,
          aiChatDone: doneStatus.ai
        };
      });

      const elemStudents = allStudents.filter(student => student.grade.includes('초') && !student.name.includes('body'));
      setStudents(elemStudents);
      
    } catch (error) {
      console.error("데이터 로드 에러", error);
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
    
    // 교재 정보 파싱 (예: "240_1" -> 시리즈 "240", 권 "1")
    const [series = '240', bookNum = '1'] = (student.currentBook || '240_1').split('_');
    const { unit, day } = parseProgress(student.progress);
    
    setEditSeries(series);
    setEditBookNum(bookNum);
    setEditUnit(unit);
    setEditDay(day);
  };

  const handleSaveProgress = async (e: React.MouseEvent) => {
    e.stopPropagation(); // 행 클릭 이벤트 방지
    if (!selectedStudent) return;
    
    const fullBook = `${editSeries}_${editBookNum}`;
    const fullProgress = `${editUnit} ${editDay}`;
    setIsSaving(true);

    try {
      const response = await fetch(CONFIG.WEB_APP_URL, {
        method: 'POST',
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          actionType: "saveProgress",
          studentId: selectedStudent.id,
          book: fullBook,
          progress: fullProgress
        })
      });

      const result = await response.json();

      if (result.status === 'success') {
        const updatedStudent = { ...selectedStudent, currentBook: fullBook, progress: fullProgress };
        setStudents(prev => prev.map(s => s.id === selectedStudent.id ? updatedStudent : s));
        setSelectedStudent(updatedStudent);
        alert(`✅ ${selectedStudent.name} 학생의 진도가 [${fullBook}권 / ${fullProgress}]로 저장되었습니다.`);
      } else {
        alert("저장 실패: " + result.message);
      }
    } catch (error) {
      console.error("진도 반영 실패:", error);
      alert("네트워크 오류로 진도를 저장하지 못했습니다.");
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

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-inner">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="bg-slate-950 border-b border-slate-800 text-slate-400">
              <th className="p-4 w-1/5">학생 이름</th>
              <th className="p-4 w-1/3">오늘 학습 현황 (자동 기록)</th>
              <th className="p-4 w-auto">학습 진도 설정 (클릭 시 변경)</th>
            </tr>
          </thead>
          <tbody>
            {students.length === 0 && !isLoading && (
              <tr>
                <td colSpan={3} className="p-10 text-center text-slate-500">등록된 초등부 학생이 없습니다.</td>
              </tr>
            )}
            
            {students.map(student => {
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
                    <div className="text-xs text-slate-500 mt-1">{student.grade}</div>
                  </td>
                  
                  {/* 오늘 미션 칸 */}
                  <td className="p-4">
                    <div className="flex flex-wrap gap-2">
                      <span style={getMissionBadgeStyle(student.wordDone)}>{student.wordDone ? '✅ 단어' : '❌ 단어'}</span>
                      <span style={getMissionBadgeStyle(student.sentenceDone)}>{student.sentenceDone ? '✅ 문장' : '❌ 문장'}</span>
                      <span style={getMissionBadgeStyle(student.aiChatDone)}>{student.aiChatDone ? '🤖 회화' : '☠️ 회화'}</span>
                    </div>
                  </td>

                  {/* 진도 설정 칸 (클릭하면 수정 모드) */}
                  <td className="p-4">
                    {isSelected ? (
                      <div className="flex flex-wrap gap-2 items-center" onClick={(e) => e.stopPropagation()}>
                        {/* 시리즈 선택 (240, 520, 860, 1240, 1680) */}
                        <select value={editSeries} onChange={e => setEditSeries(e.target.value)} className="bg-slate-800 p-2 rounded text-sm border border-indigo-500/50 text-white outline-none">
                          {SERIES_LIST.map(s => <option key={s} value={s}>{s} 시리즈</option>)}
                        </select>
                        
                        {/* 권 선택 (1~6권) */}
                        <select value={editBookNum} onChange={e => setEditBookNum(e.target.value)} className="bg-slate-800 p-2 rounded text-sm border border-indigo-500/50 text-white outline-none">
                          {BOOK_NUM_LIST.map(n => <option key={n} value={n}>{n}권</option>)}
                        </select>

                        {/* 유닛 선택 (Unit 1~4) */}
                        <select value={editUnit} onChange={e => setEditUnit(e.target.value)} className="bg-slate-800 p-2 rounded text-sm border border-indigo-500/50 text-white outline-none">
                          {UNIT_LIST.map(u => <option key={u} value={u}>{u}</option>)}
                        </select>

                        {/* 데이 선택 (Day 1~4) */}
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