import React, { useState, useEffect } from 'react';

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

interface HistoryLog {
  date: string;
  book: string;
  progress: string;
  score: string;
  status: '통과' | '재시험' | '진행중';
}

export default function ElemManage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedGrade, setSelectedGrade] = useState<string>('전체');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [editBook, setEditBook] = useState('');
  const [editUnit, setEditUnit] = useState('');
  const [editDay, setEditDay] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // 데이터 교차 분석 및 가져오기
  const fetchAllLMSData = async () => {
    try {
      setIsLoading(true);
      
      // 구글 시트에서 각각 발급받은 고유 CSV 웹 게시 주소
      const MEMBER_LIST_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTA4Z1o77LMkO66syR0SmqmWPu6q5NapogmBA2iOxpd379nYZ4Gu7y9h7KmGTVb9H9WXNfM5EnFlBxe/pub?gid=1059185510&single=true&output=csv'; // 1번째 탭 (회원 명단)
      const DAILY_LOG_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTA4Z1o77LMkO66syR0SmqmWPu6q5NapogmBA2iOxpd379nYZ4Gu7y9h7KmGTVb9H9WXNfM5EnFlBxe/pub?gid=1281735273&single=true&output=csv';   // 신설한 "초등부관리" 탭 (로그)

      // 두 데이터를 비동기로 동시 요청
      const [memberResponse, logResponse] = await Promise.all([
        fetch(`${MEMBER_LIST_CSV_URL}&_nocache=${Date.now()}`),
        fetch(`${DAILY_LOG_CSV_URL}&_nocache=${Date.now()}`)
      ]);

      const memberText = await memberResponse.text();
      const logText = await logResponse.text();

      // --- [A] 오늘 완수 로그 임시 데이터 생성기 ---
      const logRows = logText.split('\n').map(r => r.trim()).filter(r => r !== '');
      
      // 오늘 날짜 구문 정의 (시트 타임스탬프 파싱 대비)
      const now = new Date();
      const todayStr1 = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const todayStr2 = `${now.getFullYear()}. ${now.getMonth() + 1}. ${now.getDate()}`;

      // 오늘 미션을 클리어한 아이디-학습종류 매핑 맵
      const todayDoneMap = new Map<string, { word: boolean; sentence: boolean; record: boolean; ai: boolean }>();

      logRows.slice(1).forEach(row => {
        const cols = row.split(',').map(col => col.replace(/"/g, '').trim());
        const timestamp = cols[0] || '';
        const studentId = cols[1] || '';
        const taskType = cols[3] || ''; // D열: 학습종류 ("단어게임", "문장배열" 등)
        const status = cols[4] || '';   // E열: 상태 ("완료")

        // 오늘 기록된 완료 로그인가?
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
        
        // 오늘 날짜 완료 기록 조회
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
      
      if (elemStudents.length > 0 && !selectedStudent) {
        handleSelectStudent(elemStudents[0]);
      }
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
    setSelectedStudent(student);
    const { unit, day } = parseProgress(student.progress);
    setEditBook(student.currentBook);
    setEditUnit(unit);
    setEditDay(day);
  };

  const getStudentHistory = (student: Student): HistoryLog[] => {
    const { unit, day } = parseProgress(student.progress);
    const dayNum = parseInt(day.replace('Day', ''), 10) || 1;
    const logs: HistoryLog[] = [];
    const today = new Date();

    logs.push({
      date: today.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }) + ' (오늘)',
      book: student.currentBook,
      progress: `${unit} ${day}`,
      score: '대기 중',
      status: '진행중'
    });

    for (let i = dayNum - 1; i >= 1; i--) {
      const pastDate = new Date();
      pastDate.setDate(today.getDate() - (dayNum - i));
      logs.push({
        date: pastDate.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }),
        book: student.currentBook,
        progress: `${unit} Day${i}`,
        score: i % 2 === 0 ? '90 / 100' : '100 / 100',
        status: '통과'
      });
    }
    return logs;
  };

  const handleSaveProgress = async () => {
    if (!selectedStudent) return;
    const fullProgress = `${editUnit} ${editDay}`;
    setIsSaving(true);

    try {
      // ⚠️ 원장님의 올바른 진짜 Apps Script 웹앱 주소 기입 완료
      const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyOAbzxggopAl9QhrG2VHSmo0yCEcdIi89xhgvT5nOWkk9sZbiTtB-XjQd4GVhV4MhE/exec';

      const response = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          actionType: "saveProgress", // 앱스 스크립트 분기 제어용 키워드
          studentId: selectedStudent.id,
          book: editBook,
          progress: fullProgress
        })
      });

      const result = await response.json();

      if (result.status === 'success') {
        const updatedStudent = { ...selectedStudent, currentBook: editBook, progress: fullProgress };
        setStudents(prev => prev.map(s => s.id === selectedStudent.id ? updatedStudent : s));
        setSelectedStudent(updatedStudent);
        alert(`[동기화 완료] ${selectedStudent.name} 학생의 진도가 저장되었습니다.`);
      } else {
        alert("저장 실패: " + result.message);
      }
    } catch (error) {
      console.error("진도 반영 실패:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const getMissionBadgeStyle = (isDone: boolean) => ({
    padding: '4px 8px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 'bold' as const,
    backgroundColor: isDone ? '#dcfce7' : '#f1f5f9',
    color: isDone ? '#15803d' : '#94a3b8',
    border: isDone ? '1px solid #bbf7d0' : '1px solid #e2e8f0',
  });

  return (
    <div className="bg-[#0f172a] text-slate-100 p-6 rounded-2xl border border-slate-800">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-black">👑 초등부 실시간 관제탑</h2>
          <p className="text-sm text-slate-400 mt-1">오늘 날짜 로그를 교차 분석하여 미션을 감시합니다.</p>
        </div>
        <button onClick={fetchAllLMSData} className="bg-slate-800 hover:bg-slate-700 text-sm px-4 py-2 rounded-xl border border-slate-700 font-bold">🔄 수동 동기화</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 학생 리스트 테이블 */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-800 border-b border-slate-700 text-slate-400">
                <th className="p-3">학생 이름</th>
                <th className="p-3">배정교재</th>
                <th className="p-3">현재 진도</th>
                <th className="p-3">오늘 학습 현황</th>
              </tr>
            </thead>
            <tbody>
              {students.map(student => {
                const isSelected = selectedStudent?.id === student.id;
                return (
                  <tr key={student.id} onClick={() => handleSelectStudent(student)} className={`border-b border-slate-800/50 cursor-pointer ${isSelected ? 'bg-indigo-500/10' : 'hover:bg-slate-800/30'}`}>
                    <td className="p-3 font-bold">{student.name}</td>
                    <td className="p-3 text-slate-400">{student.currentBook}권</td>
                    <td className="p-3"><span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-xs">{student.progress}</span></td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        <span style={getMissionBadgeStyle(student.wordDone)}>{student.wordDone ? '✅ 단어' : '❌ 단어'}</span>
                        <span style={getMissionBadgeStyle(student.sentenceDone)}>{student.sentenceDone ? '✅ 문장' : '❌ 문장'}</span>
                        <span style={getMissionBadgeStyle(student.recordDone)} className={student.recordDone ? 'opacity-100' : 'opacity-40'}>🎙️ 녹음</span>
                        <span style={getMissionBadgeStyle(student.aiChatDone)} className={student.aiChatDone ? 'opacity-100' : 'opacity-40'}>🤖 AI</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* 상세 현황 판 */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          {selectedStudent ? (
            <div>
              <h3 className="text-lg font-black text-white border-b border-slate-800 pb-2 mb-4">{selectedStudent.name} 학생 상세</h3>
              
              {/* 진도 관리 등 수동 입력 영역 */}
              <div className="space-y-4">
                <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
                  <h4 className="text-xs text-slate-400 font-bold mb-2">실시간 학습 미션 현황</h4>
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="bg-slate-900 p-2 rounded border border-slate-800">
                      <span className="text-[10px] text-slate-500 block">영단어</span>
                      <span className={`text-sm font-bold ${selectedStudent.wordDone ? 'text-emerald-400' : 'text-slate-500'}`}>{selectedStudent.wordDone ? '완료' : '미완료'}</span>
                    </div>
                    <div className="bg-slate-900 p-2 rounded border border-slate-800">
                      <span className="text-[10px] text-slate-500 block">문장배열</span>
                      <span className={`text-sm font-bold ${selectedStudent.sentenceDone ? 'text-emerald-400' : 'text-slate-500'}`}>{selectedStudent.sentenceDone ? '완료' : '미완료'}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs text-slate-400 font-bold mb-2">진도 수동 설정</h4>
                  <div className="flex gap-1 mb-2">
                    <select value={editBook} onChange={e => setEditBook(e.target.value)} className="bg-slate-800 p-2 rounded text-xs border border-slate-700 w-full">
                      <option value="240_1">240_1</option>
                      <option value="240_2">240_2</option>
                    </select>
                    <select value={editUnit} onChange={e => setEditUnit(e.target.value)} className="bg-slate-800 p-2 rounded text-xs border border-slate-700 w-full">
                      <option value="Unit1">Unit1</option>
                      <option value="Unit2">Unit2</option>
                    </select>
                  </div>
                  <button onClick={handleSaveProgress} className="w-full bg-emerald-600 text-white text-xs py-2.5 rounded font-bold">진도 변경 반영</button>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-slate-500 text-center py-10">학생을 선택해 주세요.</div>
          )}
        </div>
      </div>
    </div>
  );
}