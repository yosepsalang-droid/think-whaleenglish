import React, { useState, useEffect, useMemo, useRef } from 'react';
import { CONFIG } from '../config';
import Ranking from './Ranking';

interface GoogleGrammar {
  book: string;
  lesson: string;
  day: string;
  eng: string;
  kor: string;
}

interface GrammarProps {
  onBack: () => void;
  studentId?: string;
  studentName?: string;
  student?: any;
}

interface RankingItem {
  studentName: string;
  score: number;
}

// 🎯 원장님이 기획하신 10단계 스테이지 세팅
const STAGE_MAPPING: Record<string, string[]> = {
  "1단계 (240 1~3권)": ["240_1", "240_2", "240_3"],
  "2단계 (240 4~6권)": ["240_4", "240_5", "240_6"],
  "3단계 (520 1~3권)": ["520_1", "520_2", "520_3"],
  "4단계 (520 4~6권)": ["520_4", "520_5", "520_6"],
  "5단계 (800 1~3권)": ["800_1", "800_2", "800_3"],
  "6단계 (800 4~6권)": ["800_4", "800_5", "800_6"],
  "7단계 (1000 1~3권)": ["1000_1", "1000_2", "1000_3"],
  "8단계 (1000 4~6권)": ["1000_4", "1000_5", "1000_6"],
  "9단계 (1200 1~3권)": ["1200_1", "1200_2", "1200_3"],
  "10단계 (1200 4~6권)": ["1200_4", "1200_5", "1200_6"],
};

export default function Grammar({ onBack, student, studentId = student?.id || "ST_TEST", studentName = student?.name || "테스트학생" }: GrammarProps) {
  const [allGrammars, setAllGrammars] = useState<GoogleGrammar[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // 랭킹 상태
  const [thisMonthRanking, setThisMonthRanking] = useState<RankingItem[]>([]);
  const [lastMonthHonorRoll, setLastMonthHonorRoll] = useState<RankingItem[]>([]);
  const [isRankingLoading, setIsRankingLoading] = useState(true);

  // 게임 진행 상태
  const [selectedStage, setSelectedStage] = useState('');
  const [currentQuestionList, setCurrentQuestionList] = useState<{ id: number; kor: string; eng: string }[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [feedback, setFeedback] = useState<{ isCorrect: boolean; msg: string } | null>(null);
  const [userAnswer, setUserAnswer] = useState('');
  
  // ⏳ 10초 타이머 상태
  const [timeLeft, setTimeLeft] = useState(10);

  const dateInfo = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    return { currentMonth, lastMonth };
  }, []);

  const normalize = (val: string) => (val || '').toLowerCase().replace(/\s+/g, '').trim();

  // 1. 초기 데이터 로드 (문제는 ELEM_GRAMMAR에서, 랭킹은 WEB_APP_URL에서)
  useEffect(() => {
    const fetchData = async () => {
      // ✅ 수정됨: 문법 문제는 정확히 ELEM_GRAMMAR(시트3)에서 가져옵니다.
      try {
        const response = await fetch(CONFIG.SHEETS.ELEM_GRAMMAR);
        const csvText = await response.text();
        const rows = csvText.split(/\r?\n/);
        const parsedGrammars: GoogleGrammar[] = rows.slice(1).filter(row => row.trim()).map(row => {
          const cells = row.split(',');
          return { book: cells[0], lesson: cells[1], day: cells[2], eng: cells[3], kor: cells[4] };
        });
        setAllGrammars(parsedGrammars);
        setIsLoading(false);
      } catch (e) { console.error(e); setIsLoading(false); }

      // 랭킹 데이터 가져오기
      try {
        setIsRankingLoading(true);
        const response = await fetch(CONFIG.WEB_APP_URL, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({ type: "getRanking", taskType: "문법게임" }),
        });
        const resData = await response.json();
        setThisMonthRanking(resData.thisMonth || []);
        setLastMonthHonorRoll(resData.lastMonth || []);
      } catch (e) { console.error(e); } finally { setIsRankingLoading(false); }
    };
    fetchData();
  }, []);

  // 2. 타이머 로직 (10초 카운트다운)
  useEffect(() => {
    if (currentQuestionList.length > 0 && !isFinished && !feedback) {
      if (timeLeft > 0) {
        const timerId = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
        return () => clearTimeout(timerId);
      } else {
        // 시간 초과 시 오답 처리
        handleTimeout();
      }
    }
  }, [timeLeft, currentQuestionList, isFinished, feedback]);

  const handleTimeout = () => {
    setFeedback({ isCorrect: false, msg: '시간 초과! ⏰' });
    setTimeout(moveToNextQuestion, 1500);
  };

  const moveToNextQuestion = () => {
    if (currentIndex + 1 < currentQuestionList.length) {
      setCurrentIndex(prev => prev + 1);
      setFeedback(null); 
      setUserAnswer('');
      setTimeLeft(10); // 타이머 초기화
    } else {
      setIsFinished(true); 
    }
  };

  // 3. 게임 종료 시 점수 자동 저장 로직
  useEffect(() => {
    if (isFinished && score > 0) {
      fetch(CONFIG.WEB_APP_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          type: "saveLog",
          studentName: studentName,
          grade: student?.grade || "",
          score: score,
          stage: selectedStage, // 현재 스테이지 기록
          taskType: "문법게임"
        }),
      }).catch(e => console.error("점수 저장 실패:", e));
    }
  }, [isFinished]);

  // 스테이지 적용
  const handleApplyProgress = () => {
    if (!selectedStage) return alert("단계를 선택해주세요.");
    
    // 선택한 단계에 해당하는 교재 이름들 가져오기
    const targetBooks = STAGE_MAPPING[selectedStage].map(normalize);
    
    // 전체 문법 문제 중, 해당 교재들에 속하는 문제만 필터링
    const filtered = allGrammars.filter(g => targetBooks.includes(normalize(g.book)));
    
    if (filtered.length === 0) {
      return alert("해당 단계의 문제가 아직 시트에 없습니다.");
    }
    
    // 문제 섞기 (랜덤 출제) 및 세팅
    const shuffled = filtered.sort(() => 0.5 - Math.random()).slice(0, 20); // 예: 20문제 출제
    setCurrentQuestionList(shuffled.map((g, idx) => ({ id: idx + 1, kor: g.kor, eng: g.eng })));
    setTimeLeft(10);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userAnswer.trim()) return;
    
    const isCorrect = userAnswer.trim().toLowerCase() === currentQuestionList[currentIndex].eng.toLowerCase();
    
    if (isCorrect) {
      // ✅ 기본점수 100점 + 남은 시간 1초당 10점의 스피드 보너스!
      const earnedScore = 100 + (timeLeft * 10);
      setScore(prev => prev + earnedScore);
      setFeedback({ isCorrect, msg: `정답입니다! (+${earnedScore}점) ⚡` });
    } else {
      setFeedback({ isCorrect, msg: `오답입니다. (정답: ${currentQuestionList[currentIndex].eng})` });
    }
    
    setTimeout(moveToNextQuestion, 1500);
  };

  // 내 순위 찾기
  const myRankIndex = thisMonthRanking.findIndex(r => r.studentName === studentName);
  const myRankText = myRankIndex !== -1 
    ? `${myRankIndex + 1}위 (누적 ${thisMonthRanking[myRankIndex].score}점)` 
    : '아직 이번 달 기록이 없습니다.';

  if (isLoading) return <div style={{ textAlign: 'center', marginTop: '50px' }}>데이터를 불러오는 중입니다... 🐋</div>;

  return (
    <div style={{ padding: '20px', maxWidth: '500px', margin: '0 auto', fontFamily: 'Pretendard' }}>
      <button onClick={onBack} style={{ marginBottom: '20px', padding: '8px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>← 홈으로</button>
      
      {currentQuestionList.length === 0 && (
        <div>
          {/* 🏆 내 순위 표시 */}
          <div style={{ background: '#e0f2fe', padding: '15px', borderRadius: '12px', marginBottom: '20px', textAlign: 'center' }}>
            <h3 style={{ margin: '0 0 5px', color: '#0369a1' }}>👤 {studentName} 학생의 현재 순위</h3>
            <p style={{ margin: 0, fontWeight: 'bold', fontSize: '18px' }}>{myRankText}</p>
          </div>

          <Ranking title={`${dateInfo.lastMonth}월 문법 명예의 전당`} data={lastMonthHonorRoll} isLoading={isRankingLoading} isHonorRoll={true} />
          <Ranking title={`${dateInfo.currentMonth}월 실시간 TOP 5 랭킹`} data={thisMonthRanking} isLoading={isRankingLoading} />
          
          <div style={{ display: 'flex', gap: '10px', marginTop: '20px', background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
            <select 
              value={selectedStage} 
              onChange={(e) => setSelectedStage(e.target.value)}
              style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
            >
              <option value="">도전할 단계를 선택하세요</option>
              {Object.keys(STAGE_MAPPING).map(stage => (
                <option key={stage} value={stage}>{stage}</option>
              ))}
            </select>
            <button onClick={handleApplyProgress} style={{ padding: '10px 20px', backgroundColor: '#007aff', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>도전!</button>
          </div>
        </div>
      )}

      {currentQuestionList.length > 0 && !isFinished && (
        <div style={{ background: 'white', padding: '30px', borderRadius: '20px', boxShadow: '0 8px 24px rgba(0,0,0,0.08)', textAlign: 'center' }}>
            
            {/* 타이머 및 점수 바 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', fontWeight: 'bold' }}>
              <span style={{ color: timeLeft <= 3 ? 'red' : '#007aff', fontSize: '18px' }}>
                ⏳ {timeLeft}초
              </span>
              <span style={{ fontSize: '18px' }}>점수: {score}점</span>
            </div>

            <p style={{ color: '#888', fontSize: '14px', margin: '0 0 10px' }}>문제 {currentIndex + 1} / {currentQuestionList.length}</p>
            <h2 style={{ fontSize: '24px', wordBreak: 'keep-all', margin: '0 0 20px' }}>{currentQuestionList[currentIndex].kor}</h2>
            
            <form onSubmit={handleSubmit}>
              <input 
                autoFocus
                placeholder="영어로 입력하세요"
                value={userAnswer} 
                onChange={(e) => setUserAnswer(e.target.value)} 
                disabled={feedback !== null}
                style={{ width: '100%', padding: '15px', borderRadius: '10px', border: '2px solid #eee', fontSize: '16px', boxSizing: 'border-box', marginBottom: '10px', textAlign: 'center' }}
              />
              <button 
                type="submit" 
                disabled={feedback !== null}
                style={{ width: '100%', padding: '15px', backgroundColor: '#111', color: 'white', border: 'none', borderRadius: '10px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                제출
              </button>
            </form>

            {feedback && (
              <div style={{ 
                color: feedback.isCorrect ? '#059669' : '#dc2626', 
                backgroundColor: feedback.isCorrect ? '#d1fae5' : '#fee2e2',
                padding: '15px', 
                borderRadius: '10px', 
                marginTop: '15px',
                fontWeight: 'bold' 
              }}>
                {feedback.msg}
              </div>
            )}
        </div>
      )}

      {isFinished && (
        <div style={{ textAlign: 'center', marginTop: '40px', background: 'white', padding: '40px 20px', borderRadius: '20px', boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: '50px', marginBottom: '10px' }}>🎉</div>
          <h2 style={{ margin: '0 0 10px' }}>테스트 종료!</h2>
          <p style={{ fontSize: '24px', margin: '0 0 20px' }}>최종 점수: <strong style={{ color: '#007aff', fontSize: '32px' }}>{score}</strong>점</p>
          <p style={{ color: '#64748b', fontSize: '14px', background: '#f1f5f9', padding: '10px', borderRadius: '8px' }}>
            점수가 서버에 안전하게 기록되었습니다.<br/>(랭킹 반영까지 약간의 시간이 걸릴 수 있습니다)
          </p>
          <button onClick={onBack} style={{ marginTop: '20px', padding: '15px 30px', backgroundColor: '#111', color: 'white', border: 'none', borderRadius: '10px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' }}>목록으로 돌아가기</button>
        </div>
      )}
    </div>
  );
}