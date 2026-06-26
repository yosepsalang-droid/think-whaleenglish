<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>WordTapa 4.0 초등부 실시간 LMS 연동 가이드</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Pretendard:wght@400;600;800&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Pretendard', sans-serif; }
  </style>
</head>
<body class="bg-slate-900 text-slate-100 min-h-screen p-8">

  <div class="max-w-5xl mx-auto">
    <!-- Header -->
    <div class="border-b border-slate-800 pb-6 mb-8 text-center md:text-left">
      <span class="bg-emerald-500/10 text-emerald-400 text-xs font-extrabold px-3 py-1.5 rounded-full border border-emerald-500/20">SYSTEM SCHEMA & CODE</span>
      <h1 class="text-4xl font-extrabold text-white mt-3">초등부 실시간 학습 트래커 세팅</h1>
      <p class="text-slate-400 mt-2">구글 시트 새 탭 헤더 구성 양식 및 자동 연동용 소스 코드 패키지</p>
    </div>

    <!-- Section 1: Google Sheet Structure -->
    <div class="bg-slate-800/50 border border-slate-700/60 rounded-2xl p-6 mb-8">
      <h2 class="text-xl font-bold text-emerald-400 mb-4 flex items-center gap-2">
        <span>📊</span> 1단계: "초등부관리" 탭의 1열(헤더) 세팅 방법
      </h2>
      <p class="text-slate-300 text-sm mb-6 leading-relaxed">
        새로 만드신 <strong class="text-white">"초등부관리"</strong> 탭의 <strong class="text-emerald-400">1행(A1~F1)</strong>에 아래 노란색 칸의 글자들을 똑같이 타이핑해 주세요. 데이터는 학생들이 학습을 완료할 때마다 아래 예시처럼 자동으로 한 줄씩 추가(Append)됩니다.
      </p>

      <!-- Excel Visual Table -->
      <div class="overflow-x-auto rounded-xl border border-slate-700">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="bg-amber-500/10 border-b border-slate-700 text-amber-300 text-sm font-bold">
              <th class="p-3 border-r border-slate-700 w-12 text-center text-slate-500">열</th>
              <th class="p-3 border-r border-slate-700">A열 (A1)</th>
              <th class="p-3 border-r border-slate-700">B열 (B1)</th>
              <th class="p-3 border-r border-slate-700">C열 (C1)</th>
              <th class="p-3 border-r border-slate-700">D열 (D1)</th>
              <th class="p-3 border-r border-slate-700">E열 (E1)</th>
              <th class="p-3">F열 (F1)</th>
            </tr>
            <tr class="bg-slate-800 border-b border-slate-700 text-slate-200 text-xs">
              <th class="p-3 border-r border-slate-700 text-center text-slate-500">항목</th>
              <th class="p-3 border-r border-slate-700">Timestamp (기록일시)</th>
              <th class="p-3 border-r border-slate-700">StudentID (아이디)</th>
              <th class="p-3 border-r border-slate-700">StudentName (이름)</th>
              <th class="p-3 border-r border-slate-700">TaskType (학습종류)</th>
              <th class="p-3 border-r border-slate-700">Status (상태)</th>
              <th class="p-3">Score (점수)</th>
            </tr>
          </thead>
          <tbody class="text-sm text-slate-300 font-mono">
            <!-- Row 1 (Header Guide) -->
            <tr class="border-b border-slate-800 bg-slate-900/40">
              <td class="p-3 border-r border-slate-700 text-center text-slate-500 font-sans">1</td>
              <td class="p-3 border-r border-slate-700 font-bold text-white">Timestamp</td>
              <td class="p-3 border-r border-slate-700 font-bold text-white">StudentID</td>
              <td class="p-3 border-r border-slate-700 font-bold text-white">StudentName</td>
              <td class="p-3 border-r border-slate-700 font-bold text-white">TaskType</td>
              <td class="p-3 border-r border-slate-700 font-bold text-white">Status</td>
              <td class="p-3 font-bold text-white">Score</td>
            </tr>
            <!-- Sample Data 1 -->
            <tr class="border-b border-slate-800 hover:bg-slate-800/30">
              <td class="p-3 border-r border-slate-700 text-center text-slate-500 font-sans">2</td>
              <td class="p-3 border-r border-slate-700 text-emerald-400">2026-06-26 14:05:22</td>
              <td class="p-3 border-r border-slate-700">uthinks500</td>
              <td class="p-3 border-r border-slate-700 font-sans font-bold">김철수</td>
              <td class="p-3 border-r border-slate-700 text-cyan-400">단어게임</td>
              <td class="p-3 border-r border-slate-700"><span class="bg-emerald-500/10 text-emerald-400 text-xs px-2 py-0.5 rounded">완료</span></td>
              <td class="p-3">100 / 100</td>
            </tr>
            <!-- Sample Data 2 -->
            <tr class="border-b border-slate-800 hover:bg-slate-800/30">
              <td class="p-3 border-r border-slate-700 text-center text-slate-500 font-sans">3</td>
              <td class="p-3 border-r border-slate-700 text-emerald-400">2026-06-26 14:12:45</td>
              <td class="p-3 border-r border-slate-700">uthinks213</td>
              <td class="p-3 border-r border-slate-700 font-sans font-bold">김지우</td>
              <td class="p-3 border-r border-slate-700 text-indigo-400">문장배열</td>
              <td class="p-3 border-r border-slate-700"><span class="bg-emerald-500/10 text-emerald-400 text-xs px-2 py-0.5 rounded">완료</span></td>
              <td class="p-3">20 / 20</td>
            </tr>
            <!-- Sample Data 3 (Future Extension) -->
            <tr class="border-b border-slate-800 hover:bg-slate-800/30 text-slate-500">
              <td class="p-3 border-r border-slate-700 text-center text-slate-500 font-sans">4</td>
              <td class="p-3 border-r border-slate-700">2026-06-26 14:30:00</td>
              <td class="p-3 border-r border-slate-700">uthinks500</td>
              <td class="p-3 border-r border-slate-700 font-sans font-bold">김철수</td>
              <td class="p-3 border-r border-slate-700 text-purple-400/50">음성녹음</td>
              <td class="p-3 border-r border-slate-700"><span class="bg-slate-800 text-slate-500 text-xs px-2 py-0.5 rounded">완료</span></td>
              <td class="p-3">92%</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="mt-4 text-xs text-slate-400 flex flex-col gap-1">
        <div>💡 <strong>TaskType 컬럼 규칙:</strong> 리액트 앱에서 보낼 때 <span class="text-cyan-400">"단어게임"</span>, <span class="text-indigo-400">"문장배열"</span>, <span class="text-purple-400">"음성녹음"</span>, <span class="text-pink-400">"AI대화"</span> 등으로 전송하면 확장 관리가 편리합니다.</div>
      </div>
    </div>

    <!-- Section 2: Apps Script Unified Code -->
    <div class="bg-slate-800/50 border border-slate-700/60 rounded-2xl p-6 mb-8">
      <h2 class="text-xl font-bold text-sky-400 mb-2 flex items-center gap-2">
        <span>⚙️</span> 2단계: 통합 구글 앱스 스크립트 (Apps Script) 소스 코드
      </h2>
      <p class="text-slate-300 text-sm mb-4">
        기존 진도 수동 저장 기능은 물론이고, 학생들이 게임 완료 시 <strong class="text-sky-400">"초등부관리" 탭에 실시간 기록을 쌓아주는 기능</strong>을 통합한 코드입니다. 기존 앱스 스크립트 코드를 모두 지우고 이 코드로 교체하세요.
      </p>

      <div class="relative bg-slate-950 rounded-xl p-4 border border-slate-800 max-h-96 overflow-y-auto">
        <pre class="text-xs font-mono text-slate-300 leading-relaxed"><code>// 구글 스프레드시트 통합 백엔드 스크립트
function doPost(e) {
  try {
    var requestData = JSON.parse(e.postData.contents);
    var actionType = requestData.actionType; // 'saveProgress' 또는 'saveLog'로 구분

    var ss = SpreadsheetApp.getActiveSpreadsheet();

    // 💡 [기능 A] 실시간 진도 수동 설정 처리 (기존 회원리스트 업데이트)
    if (actionType === "saveProgress" || !actionType) {
      // 첫번째 탭(회원리스트) 이름 기입 (예: "회원리스트")
      var memberSheet = ss.getSheets()[0]; 
      var studentId = requestData.studentId.toString().trim();
      var book = requestData.book;
      var progress = requestData.progress;
      
      var data = memberSheet.getDataRange().getValues();
      var found = false;

      for (var i = 1; i < data.length; i++) {
        if (data[i][0].toString().trim() === studentId) {
          memberSheet.getRange(i + 1, 3).setValue(book);     // C열: 교재
          memberSheet.getRange(i + 1, 4).setValue(progress); // D열: 진도
          found = true;
          break;
        }
      }

      if (found) {
        return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "진도 수정 완료" }))
          .setMimeType(ContentService.MimeType.JSON);
      } else {
        return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "학생을 찾을 수 없습니다." }))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }

    // 💡 [기능 B] 실시간 게임 완료 기록 누적 (초등부관리 탭에 APPEND)
    else if (actionType === "saveLog") {
      var logSheet = ss.getSheetByName("초등부관리");
      if (!logSheet) {
        // 시트가 없으면 자동 생성 처리하여 에러 방지
        logSheet = ss.insertSheet("초등부관리");
        logSheet.appendRow(["Timestamp", "StudentID", "StudentName", "TaskType", "Status", "Score"]);
      }

      var timestamp = new Date(); // 기록 시각 자동 생성
      var studentId = requestData.studentId;
      var studentName = requestData.studentName;
      var taskType = requestData.taskType; // "단어게임" 또는 "문장배열"
      var status = requestData.status || "완료";
      var score = requestData.score || "100";

      // 새 줄 추가 실행
      logSheet.appendRow([timestamp, studentId, studentName, taskType, status, score]);

      return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "학습 기록 저장 성공" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}</code></pre>
      </div>
    </div>

    <!-- Section 3: React ElemManage Code -->
    <div class="bg-slate-800/50 border border-slate-700/60 rounded-2xl p-6 mb-8">
      <h2 class="text-xl font-bold text-indigo-400 mb-2 flex items-center gap-2">
        <span>💻</span> 3단계: 초등부 관제탑 리액트 소스 코드 (`ElemManage.tsx`)
      </h2>
      <p class="text-slate-300 text-sm mb-4">
        기존 회원 리스트와 신설된 <strong class="text-white">"초등부관리" 로그</strong> 데이터를 동시에 fetch하여, 오늘 날짜로 기록된 완료 로그를 기반으로 테이블에 체크 배지를 동적으로 뿌려주는 관제탑 완성본입니다.
      </p>

      <div class="relative bg-slate-950 rounded-xl p-4 border border-slate-800 max-h-96 overflow-y-auto">
        <pre class="text-xs font-mono text-slate-300 leading-relaxed"><code>import React, { useState, useEffect } from 'react';

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
  const [students, setStudents] = useState&lt;Student[]&gt;([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedGrade, setSelectedGrade] = useState&lt;string&gt;('전체');
  const [selectedStudent, setSelectedStudent] = useState&lt;Student | null&gt;(null);
  const [editBook, setEditBook] = useState('');
  const [editUnit, setEditUnit] = useState('');
  const [editDay, setEditDay] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // 데이터 교차 분석 및 가져오기
  const fetchAllLMSData = async () => {
    try {
      setIsLoading(true);
      
      // ⚠️ [중요] 구글 시트에서 각각 발급받은 고유 CSV 웹 게시 주소를 복사해 넣으세요!
      const MEMBER_LIST_CSV_URL = '***'; // 1번째 탭 (회원 명단)
      const DAILY_LOG_CSV_URL = '***';   // 신설한 "초등부관리" 탭 (로그)

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
      const todayDoneMap = new Map&lt;string, { word: boolean; sentence: boolean; record: boolean; ai: boolean }&gt;();

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
      // ⚠️ [중요] 배포된 Apps Script 주소 기입
      const APPS_SCRIPT_URL = '***';

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
          <p class="text-sm text-slate-400 mt-1">오늘 날짜 로그를 교차 분석하여 미션을 감시합니다.</p>
        </div>
        <button onClick={fetchAllLMSData} className="bg-slate-800 hover:bg-slate-700 text-sm px-4 py-2 rounded-xl border border-slate-700 font-bold">🔄 수동 동기화</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 학생 리스트 테이블 */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr class="bg-slate-800 border-b border-slate-700 text-slate-400">
                <th class="p-3">학생 이름</th>
                <th class="p-3">배정교재</th>
                <th class="p-3">현재 진도</th>
                <th class="p-3">오늘 학습 현황</th>
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
              
              <!-- 진도 관리 등 수동 입력 영역 -->
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
}</code></pre>
      </div>
    </div>
  </div>

</body>
</html>