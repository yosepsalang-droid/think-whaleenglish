import React, { useState, useEffect, useMemo, useRef } from 'react';
import { CONFIG } from './config';
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

export default function Grammar({ onBack, student, studentId = student?.id || "ST_TEST", studentName = student?.name || "테스트학생" }: GrammarProps) {
  const [allGrammars, setAllGrammars] = useState<GoogleGrammar[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [thisMonthRanking, setThisMonthRanking] = useState<RankingItem[]>([]);
  const [lastMonthHonorRoll, setLastMonthHonorRoll] = useState<RankingItem[]>([]);
  const [isRankingLoading, setIsRankingLoading] = useState(true);

  const [book, setBook] = useState('');
  const [unit, setUnit] = useState('');
  const [day, setDay] = useState('');
  const [appliedProgress, setAppliedProgress] = useState('교재를 선택하세요');
  const [currentQuestionList, setCurrentQuestionList] = useState<{ id: number; kor: string; eng: string }[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [feedback, setFeedback] = useState<{ isCorrect: boolean; msg: string } | null>(null);
  const [userAnswer, setUserAnswer] = useState('');

  const dateInfo = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    return { currentMonth, lastMonth };
  }, []);

  const normalize = (val: string) => (val || '').toLowerCase().replace(/\s+/g, '').trim();

  // 1. 초기 데이터 및 랭킹 로드
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(CONFIG.SHEETS.ELEM_GRAMMAR || CONFIG.SHEETS.ELEM_WORD);
        const csvText = await response.text();
        const rows = csvText.split(/\r?\n/);
        const parsedGrammars: GoogleGrammar[] = rows.slice(1).filter(row => row.trim()).map(row => {
          const cells = row.split(',');
          return { book: cells[0], lesson: cells[1], day: cells[2], eng: cells[3], kor: cells[4] };
        });
        setAllGrammars(parsedGrammars);
        setIsLoading(false);
      } catch (e) { console.error(e); setIsLoading(false); }

      try {
        setIsRankingLoading(true);
        const response = await fetch(CONFIG.WEB_APP_URL, {
          method: "POST",
          headers: {
            "Content-Type": "text/plain;charset=utf-8", // 💡 해결: CORS 에러 방지용 헤더 추가 1
          },
          body: JSON.stringify({ type: "getRanking", taskType: "문법게임" }),
        });
        const resData = await response.json();
        setThisMonthRanking(resData.thisMonth || []);
        setLastMonthHonorRoll(resData.lastMonth || []);
      } catch (e) { console.error(e); } finally { setIsRankingLoading(false); }
    };
    fetchData();
  }, []);

  // 2. 게임 종료 시 점수 자동 저장 로직
  useEffect(() => {
    if (isFinished && score > 0) {
      fetch(CONFIG.WEB_APP_URL, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain;charset=utf-8", // 💡 해결: CORS 에러 방지용 헤더 추가 2
        },
        body: JSON.stringify({
          type: "saveLog",
          studentName: studentName,
          grade: student?.grade || "",
          score: score,
          stage: appliedProgress,
          taskType: "문법게임"
        }),
      }).catch(e => console.error("점수 저장 실패:", e));
    }
  }, [isFinished]);

  const books = useMemo(() => Array.from(new Set(allGrammars.map(g => g.book?.trim()))).filter(Boolean).sort(), [allGrammars]);
  const units = useMemo(() => Array.from(new Set(allGrammars.filter(g => normalize(g.book) === normalize(book)).map(g => g.lesson?.trim()))).filter(Boolean), [allGrammars, book]);
  const days = useMemo(() => Array.from(new Set(allGrammars.filter(g => normalize(g.book) === normalize(book) && normalize(g.lesson) === normalize(unit)).map(g => g.day?.trim()))).filter(Boolean), [allGrammars, book, unit]);

  const handleApplyProgress = () => {
    if (!book || !unit || !day) return alert("선택해주세요.");
    const filtered = allGrammars.filter(g => normalize(g.book) === normalize(book) && normalize(g.lesson) === normalize(unit) && normalize(g.day) === normalize(day));
    setCurrentQuestionList(filtered.map((g, idx) => ({ id: idx + 1, kor: g.kor, eng: g.eng })));
    setAppliedProgress(`${book} ${unit} ${day}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userAnswer.trim()) return;
    const isCorrect = userAnswer.trim().toLowerCase() === currentQuestionList[currentIndex].eng.toLowerCase();
    if (isCorrect) setScore(prev => prev + 1);
    setFeedback({ isCorrect, msg: isCorrect ? '정답입니다!' : '오답입니다.' });
    
    setTimeout(() => {
        if (currentIndex + 1 < currentQuestionList.length) {
            setCurrentIndex(prev => prev + 1);
            setFeedback(null); setUserAnswer('');
        } else {
            setIsFinished(true); 
        }
    }, 1500);
  };

  if (isLoading) return <div>로딩중...</div>;

  return (
    <div style={{ padding: '20px', maxWidth: '500px', margin: '0 auto' }}>
      <button onClick={onBack}>← 홈으로</button>
      
      {currentQuestionList.length === 0 && (
        <div style={{ marginTop: '20px' }}>
          <Ranking title={`${dateInfo.lastMonth}월 문법 명예의 전당`} data={lastMonthHonorRoll} isLoading={isRankingLoading} isHonorRoll={true} />
          <Ranking title={`${dateInfo.currentMonth}월 실시간 TOP 5 랭킹`} data={thisMonthRanking} isLoading={isRankingLoading} />
          
          <div style={{ display: 'flex', gap: '5px', marginTop: '20px' }}>
            <select value={book} onChange={(e) => setBook(e.target.value)}><option value="">교재</option>{books.map(b => <option key={b} value={b}>{b}</option>)}</select>
            <select value={unit} onChange={(e) => setUnit(e.target.value)}><option value="">Lesson</option>{units.map(u => <option key={u} value={u}>{u}</option>)}</select>
            <select value={day} onChange={(e) => setDay(e.target.value)}><option value="">Day</option>{days.map(d => <option key={d} value={d}>{d}</option>)}</select>
            <button onClick={handleApplyProgress}>확인</button>
          </div>
        </div>
      )}

      {currentQuestionList.length > 0 && !isFinished && (
        <div>
            <h2>{currentQuestionList[currentIndex].kor}</h2>
            <input value={userAnswer} onChange={(e) => setUserAnswer(e.target.value)} />
            <button onClick={handleSubmit}>제출</button>
            {feedback && <div style={{ color: feedback.isCorrect ? 'green' : 'red', marginTop: '10px' }}>{feedback.msg}</div>}
        </div>
      )}

      {isFinished && (
        <div style={{ textAlign: 'center', marginTop: '40px' }}>
          <h2>테스트 종료! 🎉</h2>
          <p style={{ fontSize: '20px' }}>최종 점수: <strong>{score}</strong>점</p>
          <p style={{ color: '#0077b6', fontSize: '14px' }}>점수가 서버에 안전하게 저장되었습니다.</p>
          <button onClick={onBack} style={{ marginTop: '20px', padding: '10px 20px' }}>확인</button>
        </div>
      )}
    </div>
  );
}