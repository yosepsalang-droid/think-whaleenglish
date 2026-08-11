import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { CONFIG } from '../config'; 

interface GameWordDropProps {
  student: any;
  onBack: () => void;
}

interface WordData {
  eng: string;
  kor: string;
}

interface FallingWord {
  id: number;
  text: string;     
  acceptableAnswers: string[]; 
  isCorrect: boolean; 
  x: number;        
  y: number;        
  speed: number;    
  color: string;
}

// 💡 교재 자동 넘어가기를 위한 전체 시리즈 순서 정의
const BOOK_SEQUENCE = [
  '240_1', '240_2', '240_3', '240_4', '240_5', '240_6',
  '520_1', '520_2', '520_3', '520_4', '520_5', '520_6',
  '860_1', '860_2', '860_3', '860_4', '860_5', '860_6',
  '1240_1', '1240_2', '1240_3', '1240_4', '1240_5', '1240_6',
  '1680_1', '1680_2', '1680_3', '1680_4', '1680_5', '1680_6'
];

const getFakeUTCString = (date: Date) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mi = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}+00:00`;
};

const parseAcceptableAnswers = (text: string, mode: 'FIND_KOR' | 'FIND_ENG') => {
  if (mode === 'FIND_ENG') {
    return [text.toLowerCase().replace(/[^a-z0-9]/g, '')];
  } else {
    let noBracket = text.replace(/\(.*?\)|\[.*?\]/g, '');
    let splitAnswers = noBracket.split(/[,/]/); 
    let cleaned = splitAnswers.map(ans => ans.replace(/[^가-힣a-zA-Z0-9]/g, '')).filter(ans => ans.length > 0);
    
    if (cleaned.length === 0) {
        cleaned = [text.replace(/[^가-힣a-zA-Z0-9]/g, '')];
    }
    return cleaned;
  }
};

export default function GameWordDrop({ student, onBack }: GameWordDropProps) {
  // 💡 BOOK_CLEAR(교재 마스터) 상태 추가
  const [appPhase, setAppPhase] = useState<'SETUP' | 'PLAYING' | 'GAME_OVER' | 'BOOK_CLEAR'>('SETUP');
  const [isLoading, setIsLoading] = useState(false);

  const [books, setBooks] = useState<string[]>([]);
  const [selectedBook, setSelectedBook] = useState('');
  const [mode, setMode] = useState<'FIND_KOR' | 'FIND_ENG'>('FIND_KOR');
  const [playCount, setPlayCount] = useState<number>(0);
  
  const [renderTick, setRenderTick] = useState(0); 
  const [inputValue, setInputValue] = useState("");
  const [finalScore, setFinalScore] = useState(0);

  const [hitFlash, setHitFlash] = useState<'none' | 'success' | 'fail'>('none');

  const inputRef = useRef<HTMLInputElement>(null); 
  const clearLockRef = useRef(false); 

  const gameRef = useRef({
    wordsPool: [] as WordData[],
    unusedTargets: [] as WordData[], // 💡 중복 출제 방지를 위한 남은 단어 목록
    fallingWords: [] as FallingWord[],
    currentTarget: null as WordData | null, 
    lives: 3,
    score: 0,
    combo: 0,
    wordIdCounter: 0,
    speedMultiplier: 1,
    needNewWave: true, 
    isGameOver: false
  });

  const requestRef = useRef<number>(0);
  
  useEffect(() => {
    const fetchBooks = async () => {
      const { data } = await supabase.from('words').select('book');
      if (data) {
        const uniqueBooks = Array.from(new Set(data.map(d => d.book))).filter(Boolean);
        uniqueBooks.sort();
        setBooks(uniqueBooks as string[]);
      }
    };
    fetchBooks();
  }, []);

  useEffect(() => {
    if (!selectedBook || !student?.id) return;

    const fetchPlayCount = async () => {
      const now = new Date();
      const kstOffset = 9 * 60 * 60 * 1000;
      const kstNow = new Date(now.getTime() + kstOffset);
      
      const startOfDay = new Date(kstNow);
      startOfDay.setUTCHours(0, 0, 0, 0);
      const endOfDay = new Date(kstNow);
      endOfDay.setUTCHours(23, 59, 59, 999);

      const { data } = await supabase
        .from('learning_logs')
        .select('id')
        .eq('student_id', student.id)
        .like('task_type', '%타자게임%')
        .eq('book_info', selectedBook)
        .gte('created_at', getFakeUTCString(startOfDay))
        .lte('created_at', getFakeUTCString(endOfDay));

      setPlayCount(data?.length || 0);
    };
    fetchPlayCount();
  }, [selectedBook, appPhase]);

  const handleStart = async () => {
    if (!selectedBook) return alert("교재를 선택해 주세요!");
    if (playCount >= 3) return alert("이 교재는 오늘 3번 모두 도전했어요! 내일 다시 도전하거나 다른 교재를 선택해 주세요 🚀");

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('words')
        .select('eng, kor')
        .eq('book', selectedBook);

      if (error) throw error;
      if (!data || data.length === 0) throw new Error("단어 데이터가 없습니다.");

      // 💡 랜덤으로 섞어서 남은 단어 목록(unusedTargets)에 채워넣기
      const shuffledWords = [...data].sort(() => Math.random() - 0.5);

      gameRef.current = {
        wordsPool: data,
        unusedTargets: shuffledWords,
        fallingWords: [],
        currentTarget: null,
        lives: 3,
        score: 0,
        combo: 0,
        wordIdCounter: 0,
        speedMultiplier: 1,
        needNewWave: true,
        isGameOver: false
      };

      setInputValue("");
      setAppPhase('PLAYING');
      clearLockRef.current = false; 

      requestRef.current = requestAnimationFrame(gameLoop);

    } catch (error) {
      alert("데이터를 불러오지 못했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const spawnWave = () => {
    const state = gameRef.current;
    
    // 💡 남은 단어가 하나도 없으면 에러가 날 수 있으니 방어
    if (state.unusedTargets.length === 0) return;

    // 1. 진짜 정답 뽑기 (중복 없이 pop)
    const targetWord = state.unusedTargets.pop()!;
    state.currentTarget = targetWord;

    // 2. 가짜 미끼 2개 뽑기 (전체 풀에서 정답과 겹치지 않게)
    const distractors: WordData[] = [];
    while (distractors.length < 2) {
      const d = state.wordsPool[Math.floor(Math.random() * state.wordsPool.length)];
      if (d.eng !== targetWord.eng && !distractors.find(x => x.eng === d.eng)) {
        distractors.push(d);
      }
    }

    const waveItems = [targetWord, ...distractors];
    waveItems.sort(() => Math.random() - 0.5);

    const colors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
    // 💡 화면 밖 이탈 방지를 위한 고정된 3개 라인 (좌, 중, 우)
    const basePositions = [18, 50, 82]; 

    state.fallingWords = waveItems.map((item, index) => {
      const isCorrect = item.eng === targetWord.eng;
      const textToShow = mode === 'FIND_KOR' ? item.kor : item.eng;
      const answerToType = mode === 'FIND_KOR' ? item.kor : item.eng; 

      return {
        id: state.wordIdCounter++,
        text: textToShow,
        acceptableAnswers: parseAcceptableAnswers(answerToType, mode),
        isCorrect: isCorrect,
        // 각 라인에서 아주 미세하게만 흔들리도록 설정 (이탈 절대 불가)
        x: basePositions[index] + (Math.random() * 4 - 2), 
        y: -10 - (Math.random() * 5), 
        speed: Math.random() * 0.025 + 0.04, 
        color: colors[index % colors.length]
      };
    });

    state.speedMultiplier += 0.005;
  };

  const triggerHitFlash = (type: 'success' | 'fail') => {
    setHitFlash(type);
    setTimeout(() => setHitFlash('none'), 300);
  };

  const forceClearInput = () => {
    clearLockRef.current = true; 
    setInputValue(""); 
    if (inputRef.current) inputRef.current.value = ""; 
    
    setTimeout(() => {
      if (inputRef.current) inputRef.current.value = "";
      setInputValue("");
      clearLockRef.current = false;
    }, 150); 
  };

  const gameLoop = () => {
    const state = gameRef.current;
    if (state.isGameOver) return;

    if (state.needNewWave) {
      // 💡 [핵심] 출제할 남은 단어가 없으면 교재 클리어!
      if (state.unusedTargets.length === 0) {
        endGame(true); // true = STAGE CLEAR
        return;
      }
      spawnWave();
      state.needNewWave = false;
    }

    let lifeLost = false;
    for (let i = state.fallingWords.length - 1; i >= 0; i--) {
      const fw = state.fallingWords[i];
      fw.y += fw.speed * state.speedMultiplier;

      if (fw.y > 82) {
        if (fw.isCorrect) {
          lifeLost = true;
          state.fallingWords = []; 
          state.needNewWave = true; 
          state.combo = 0; 
          break; 
        } else {
          state.fallingWords.splice(i, 1);
        }
      }
    }

    if (lifeLost) {
      state.lives -= 1;
      triggerHitFlash('fail');
      forceClearInput(); 

      if (state.lives <= 0) {
        endGame(false); // false = GAME OVER
        return;
      }
    }

    setRenderTick(prev => prev + 1);
    requestRef.current = requestAnimationFrame(gameLoop);
  };

  const handleType = (e: React.ChangeEvent<HTMLInputElement>) => {
    const state = gameRef.current;
    if (state.isGameOver) return;

    if (clearLockRef.current) {
      e.target.value = "";
      return;
    }

    const val = e.target.value;
    setInputValue(val);

    const cleanInput = mode === 'FIND_ENG' 
        ? val.toLowerCase().replace(/[^a-z0-9]/g, '') 
        : val.replace(/[^가-힣a-zA-Z0-9]/g, '');

    const matchIndex = state.fallingWords.findIndex(w => 
      w.acceptableAnswers.some(ans => {
        if (ans === cleanInput) return true;
        if (mode === 'FIND_KOR' && cleanInput.length >= 2 && ans.endsWith(cleanInput)) return true;
        return false;
      })
    );
    
    if (matchIndex > -1) {
      const hitWord = state.fallingWords[matchIndex];

      if (hitWord.isCorrect) {
        state.fallingWords = []; 
        forceClearInput(); 
        triggerHitFlash('success'); 
        
        const baseScore = mode === 'FIND_ENG' ? 20 : 10;
        const comboBonus = state.combo * 2; 
        
        state.score += (baseScore + comboBonus);
        state.combo += 1;
        state.needNewWave = true; 
      } else {
        state.fallingWords.splice(matchIndex, 1); 
        forceClearInput();
        triggerHitFlash('fail'); 
        state.combo = 0; 
      }
    }
  };

  // 💡 종료 함수에 isClear (전체 마스터 여부) 파라미터 추가
  const endGame = async (isClear = false) => {
    const state = gameRef.current;
    state.isGameOver = true;
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
    
    setFinalScore(state.score);
    // 전부 다 맞췄으면 BOOK_CLEAR 화면으로, 아니면 GAME_OVER 화면으로!
    setAppPhase(isClear ? 'BOOK_CLEAR' : 'GAME_OVER');

    const modeText = mode === 'FIND_KOR' ? '뜻찾기' : '스펠링찾기';

    try {
      await supabase.from('learning_logs').insert([{
        student_id: student.id,
        task_type: `타자게임(${modeText})`,
        book_info: selectedBook,
        status: '완료'
      }]);

      await fetch(CONFIG.WEB_APP_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          type: "saveLog",
          studentId: student.id,
          studentName: student.name,
          taskType: `타자게임(${modeText})`,
          status: "완료",
          score: state.score.toString(),
          bookInfo: selectedBook
        }),
      });
    } catch (err) {
      console.error("결과 저장 실패", err);
    }
  };

  useEffect(() => {
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  // 💡 다음 교재 계산 로직
  const currentIndex = BOOK_SEQUENCE.indexOf(selectedBook);
  const nextBook = currentIndex !== -1 && currentIndex + 1 < BOOK_SEQUENCE.length 
      ? BOOK_SEQUENCE[currentIndex + 1] 
      : null;

  const handleNextBook = () => {
    if (nextBook) {
      setSelectedBook(nextBook);
      setAppPhase('SETUP'); // 셋업 화면으로 보내면 useEffect가 자동으로 남은 횟수 3번인지 체크해 줍니다!
    }
  };

  if (appPhase === 'SETUP') {
    return (
      <div style={{ backgroundColor: '#f0f4f8', minHeight: '100vh', padding: '20px', fontFamily: 'Pretendard, sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ width: '100%', maxWidth: '450px', background: 'white', borderRadius: '24px', padding: '32px 24px', boxShadow: '0 8px 24px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#8e8e93', fontSize: '16px', fontWeight: '700', cursor: 'pointer' }}>← 뒤로</button>
            <h2 style={{ fontSize: '22px', fontWeight: '900', margin: 0, color: '#1e293b' }}>☄️ Word Drop V3</h2>
            <div style={{ width: '40px' }}></div>
          </div>

          <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', padding: '12px 16px', borderRadius: '12px', marginBottom: '24px' }}>
            <p style={{ margin: 0, fontSize: '13px', color: '#15803d', fontWeight: 'bold', lineHeight: '1.5' }}>
              💡 <b>게임 룰:</b> 제시된 단어를 보고, 떨어지는 3개의 우주석 중 <b>진짜 정답</b>만 골라서 타자를 쳐주세요! (가짜를 치면 콤보가 끊겨요)
            </p>
          </div>
          
          <div style={{ marginBottom: '24px' }}>
            <label style={{ fontSize: '15px', fontWeight: '800', color: '#475569', display: 'block', marginBottom: '8px' }}>1. 도전할 교재 선택</label>
            <select value={selectedBook} onChange={e => setSelectedBook(e.target.value)} style={{ width: '100%', padding: '16px', fontSize: '16px', borderRadius: '12px', border: '2px solid #cbd5e1', outline: 'none', fontWeight: 'bold', color: '#334155' }}>
              <option value="">교재를 선택해주세요</option>
              {books.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>

          <div style={{ marginBottom: '32px' }}>
            <label style={{ fontSize: '15px', fontWeight: '800', color: '#475569', display: 'block', marginBottom: '8px' }}>2. 챌린지 모드 선택</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button onClick={() => setMode('FIND_KOR')} style={{ padding: '16px', borderRadius: '12px', fontWeight: '800', fontSize: '15px', border: `2px solid ${mode === 'FIND_KOR' ? '#3b82f6' : '#e2e8f0'}`, backgroundColor: mode === 'FIND_KOR' ? '#eff6ff' : 'white', color: mode === 'FIND_KOR' ? '#2563eb' : '#64748b', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', transition: 'all 0.2s' }}>
                <span>🟢 영어 제시어 ➡️ <b>한글 뜻 찾기</b></span>
                <span style={{ fontSize: '13px', color: mode === 'FIND_KOR' ? '#3b82f6' : '#9ca3af' }}>기본 10점</span>
              </button>
              <button onClick={() => setMode('FIND_ENG')} style={{ padding: '16px', borderRadius: '12px', fontWeight: '800', fontSize: '15px', border: `2px solid ${mode === 'FIND_ENG' ? '#ef4444' : '#e2e8f0'}`, backgroundColor: mode === 'FIND_ENG' ? '#fef2f2' : 'white', color: mode === 'FIND_ENG' ? '#dc2626' : '#64748b', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', transition: 'all 0.2s' }}>
                <span>🔥 한글 제시어 ➡️ <b>영어 스펠링 찾기</b></span>
                <span style={{ fontSize: '13px', fontWeight: '900', color: '#ef4444' }}>어려움 (점수 2배)</span>
              </button>
            </div>
          </div>

          {selectedBook && (
            <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '12px', marginBottom: '24px', textAlign: 'center' }}>
              <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#475569' }}>오늘 <b>[{selectedBook}]</b> 우주 방어전 기회: </span>
              <span style={{ fontSize: '18px', fontWeight: '900', color: playCount >= 3 ? '#ef4444' : '#10b981' }}>{3 - playCount} / 3</span>
            </div>
          )}

          <button onClick={handleStart} disabled={isLoading || (!!selectedBook && playCount >= 3)} style={{ width: '100%', backgroundColor: (!!selectedBook && playCount >= 3) ? '#cbd5e1' : '#3b82f6', color: 'white', border: 'none', padding: '18px', borderRadius: '16px', fontSize: '18px', fontWeight: '900', cursor: (!!selectedBook && playCount >= 3) ? 'not-allowed' : 'pointer', boxShadow: (!!selectedBook && playCount >= 3) ? 'none' : '0 6px 16px rgba(59,130,246,0.3)', transition: 'all 0.2s' }}>
            {isLoading ? '로딩 중...' : (playCount >= 3 ? '오늘 기회 소진 😭' : '방어전 시작 🚀')}
          </button>
        </div>
      </div>
    );
  }

  // 💡 새롭게 추가된 [교재 마스터] 화면
  if (appPhase === 'BOOK_CLEAR') {
    return (
      <div style={{ backgroundColor: '#0f172a', minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', fontFamily: 'Pretendard, sans-serif', textAlign: 'center', padding: '20px' }}>
        <div style={{ background: 'linear-gradient(to bottom, #1e293b, #0f172a)', padding: '40px 30px', borderRadius: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.5)', maxWidth: '400px', width: '100%', border: '1px solid #3b82f6' }}>
          <div style={{ fontSize: '60px', marginBottom: '16px' }}>🏆</div>
          <h2 style={{ fontSize: '28px', fontWeight: '900', marginBottom: '8px', color: '#f8fafc' }}>STAGE CLEAR!</h2>
          <p style={{ color: '#94a3b8', marginBottom: '32px', fontSize: '16px', fontWeight: 'bold' }}>[{selectedBook}] 교재의 모든 단어를 마스터했습니다!</p>
          
          <div style={{ backgroundColor: 'rgba(59, 130, 246, 0.2)', padding: '24px', borderRadius: '16px', border: '2px solid #3b82f6', marginBottom: '32px' }}>
            <div style={{ fontSize: '14px', color: '#93c5fd', fontWeight: 'bold', marginBottom: '4px' }}>최종 획득 점수</div>
            <div style={{ fontSize: '42px', fontWeight: '900', color: '#60a5fa' }}>{finalScore} <span style={{ fontSize: '20px' }}>점</span></div>
            <div style={{ fontSize: '12px', color: '#93c5fd', marginTop: '8px', fontWeight: 'bold' }}>완벽한 우주 방어 성공! 랭킹에 등록되었습니다 🚀</div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {nextBook ? (
              <button onClick={handleNextBook} style={{ backgroundColor: '#10b981', color: 'white', border: 'none', padding: '16px', borderRadius: '16px', fontWeight: '800', fontSize: '16px', width: '100%', cursor: 'pointer', boxShadow: '0 4px 12px rgba(16,185,129,0.3)' }}>
                다음 교재 ({nextBook}) 도전하기
              </button>
            ) : (
              <div style={{ color: '#fbbf24', fontWeight: 'bold', marginBottom: '10px' }}>마지막 교재까지 모두 수료했습니다! 🎉</div>
            )}
            <button onClick={onBack} style={{ backgroundColor: '#334155', color: 'white', border: 'none', padding: '16px', borderRadius: '16px', fontWeight: '800', fontSize: '16px', width: '100%', cursor: 'pointer' }}>
              메뉴로 나가기
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (appPhase === 'GAME_OVER') {
    return (
      <div style={{ backgroundColor: '#0f172a', minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', fontFamily: 'Pretendard, sans-serif', textAlign: 'center', padding: '20px' }}>
        <div style={{ background: 'linear-gradient(to bottom, #1e293b, #0f172a)', padding: '40px 30px', borderRadius: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.5)', maxWidth: '400px', width: '100%', border: '1px solid #334155' }}>
          <div style={{ fontSize: '60px', marginBottom: '16px' }}>💥</div>
          <h2 style={{ fontSize: '28px', fontWeight: '900', marginBottom: '8px', color: '#f8fafc' }}>방어 실패!</h2>
          <p style={{ color: '#94a3b8', marginBottom: '32px', fontSize: '16px', fontWeight: 'bold' }}>정답 우주석이 기지에 충돌했습니다!</p>
          
          <div style={{ backgroundColor: 'rgba(21, 128, 61, 0.2)', padding: '24px', borderRadius: '16px', border: '2px solid #22c55e', marginBottom: '32px' }}>
            <div style={{ fontSize: '14px', color: '#4ade80', fontWeight: 'bold', marginBottom: '4px' }}>최종 획득 점수</div>
            <div style={{ fontSize: '42px', fontWeight: '900', color: '#22c55e' }}>{finalScore} <span style={{ fontSize: '20px' }}>점</span></div>
            <div style={{ fontSize: '12px', color: '#4ade80', marginTop: '8px', fontWeight: 'bold' }}>이 점수는 랭킹에 합산되었습니다 👑</div>
          </div>

          <button onClick={() => setAppPhase('SETUP')} style={{ backgroundColor: '#3b82f6', color: 'white', border: 'none', padding: '16px', borderRadius: '16px', fontWeight: '800', fontSize: '16px', width: '100%', cursor: 'pointer', boxShadow: '0 4px 12px rgba(59,130,246,0.3)' }}>
            메뉴로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  const st = gameRef.current;
  
  const getBackgroundColor = () => {
    if (hitFlash === 'success') return 'rgba(34, 197, 94, 0.2)';
    if (hitFlash === 'fail') return 'rgba(239, 68, 68, 0.2)';
    return '#1e293b'; 
  };

  return (
    <div style={{ backgroundColor: '#020617', minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', fontFamily: 'Pretendard, sans-serif' }}>
      
      <div style={{ width: '100%', maxWidth: '480px', height: '100vh', maxHeight: '800px', backgroundColor: getBackgroundColor(), backgroundImage: 'radial-gradient(circle at 50% 10%, #1e293b 0%, #0f172a 80%)', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 0 30px rgba(0,0,0,0.8)', transition: 'background-color 0.1s' }}>
        
        <div style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', zIndex: 10 }}>
          <div>
            <div style={{ fontSize: '14px', color: '#94a3b8', fontWeight: 'bold', marginBottom: '4px' }}>SCORE</div>
            <div style={{ fontSize: '28px', fontWeight: '900', color: '#fbbf24', textShadow: '0 2px 10px rgba(251, 191, 36, 0.5)' }}>{st.score}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '14px', color: '#94a3b8', fontWeight: 'bold', marginBottom: '4px' }}>SHIELD (LIFE)</div>
            <div style={{ fontSize: '24px' }}>
              {Array.from({ length: 3 }).map((_, i) => (
                <span key={i} style={{ opacity: i < st.lives ? 1 : 0.2, margin: '0 2px', filter: i < st.lives ? 'drop-shadow(0 0 5px red)' : 'none' }}>❤️</span>
              ))}
            </div>
            {st.combo >= 2 && (
              <div style={{ fontSize: '18px', fontWeight: '900', color: '#38bdf8', marginTop: '8px', animation: 'pulse 0.5s infinite', textShadow: '0 0 10px rgba(56, 189, 248, 0.8)' }}>
                {st.combo} COMBO 🔥
              </div>
            )}
          </div>
        </div>

        <div style={{ textAlign: 'center', zIndex: 10, padding: '0 20px', marginBottom: '10px' }}>
          <div style={{ display: 'inline-block', backgroundColor: 'rgba(15, 23, 42, 0.8)', padding: '16px 32px', borderRadius: '24px', border: '2px solid #38bdf8', boxShadow: '0 0 20px rgba(56, 189, 248, 0.4)', backdropFilter: 'blur(5px)' }}>
            <span style={{ fontSize: '13px', color: '#7dd3fc', fontWeight: '900', display: 'block', marginBottom: '6px', letterSpacing: '1px' }}>[ 목표 타겟 (TARGET) ]</span>
            <div style={{ fontSize: '32px', fontWeight: '900', color: '#f8fafc' }}>
              {mode === 'FIND_KOR' ? st.currentTarget?.eng : st.currentTarget?.kor}
            </div>
          </div>
        </div>

        <div style={{ flex: 1, position: 'relative' }}>
          {st.fallingWords.map(word => (
            <div 
              key={word.id}
              style={{
                position: 'absolute',
                left: `${word.x}%`,
                top: `${word.y}%`, 
                transform: 'translateX(-50%)',
                backgroundColor: word.color,
                color: 'white',
                padding: '10px 14px',
                borderRadius: '24px', 
                fontWeight: '900',
                fontSize: '15px', // 💡 모바일 삐져나감 방지 폰트 조정
                maxWidth: '28%', // 💡 화면 밖으로 이탈 방지!
                whiteSpace: 'pre-wrap', // 💡 단어가 길면 예쁘게 줄바꿈됨
                wordBreak: 'keep-all',
                textAlign: 'center',
                lineHeight: '1.2',
                border: '2px solid rgba(255,255,255,0.4)',
                boxShadow: `0 0 15px ${word.color}, 0 -15px 25px ${word.color}80`
              }}
            >
              ☄️<br/>{word.text}
            </div>
          ))}
          
          <div style={{ 
            position: 'absolute', 
            top: '85%', 
            width: '100%', 
            height: '100%', 
            background: 'linear-gradient(to bottom, rgba(239, 68, 68, 0.2), rgba(239, 68, 68, 0.6))', 
            borderTop: '2px solid #ef4444',
            boxShadow: '0 -5px 20px rgba(239, 68, 68, 0.5)',
            display: 'flex',
            justifyContent: 'center',
            paddingTop: '8px'
          }}>
            <span style={{ color: '#fca5a5', fontWeight: '900', fontSize: '14px', letterSpacing: '3px' }}>BASE SHIELD</span>
          </div>
        </div>

        <div style={{ padding: '20px', backgroundColor: '#020617', zIndex: 10, borderTop: '1px solid #1e293b' }}>
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleType}
            autoFocus
            placeholder={mode === 'FIND_KOR' ? "정답인 뜻을 공격(입력)!" : "스펠링을 공격(입력)!"}
            style={{
              width: '100%',
              padding: '20px',
              fontSize: '22px',
              fontWeight: '900',
              textAlign: 'center',
              borderRadius: '16px',
              border: hitFlash === 'fail' ? '3px solid #ef4444' : '3px solid #3b82f6',
              backgroundColor: '#0f172a',
              color: '#f8fafc',
              outline: 'none',
              boxSizing: 'border-box',
              boxShadow: hitFlash === 'success' ? '0 0 30px rgba(34, 197, 94, 0.8)' : (hitFlash === 'fail' ? '0 0 30px rgba(239, 68, 68, 0.8)' : '0 0 20px rgba(59,130,246,0.3)'),
              transition: 'all 0.1s'
            }}
          />
        </div>
      </div>
    </div>
  );
}