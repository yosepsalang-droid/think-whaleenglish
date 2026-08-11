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
  isCorrect: boolean; // 💡 진짜 정답인지 가짜 미끼인지 판별
  x: number;        
  y: number;        
  speed: number;    
  color: string;
}

const getFakeUTCString = (date: Date) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mi = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}+00:00`;
};

// 💡 한글 유연한 정답 판별기
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
  const [appPhase, setAppPhase] = useState<'SETUP' | 'PLAYING' | 'GAME_OVER'>('SETUP');
  const [isLoading, setIsLoading] = useState(false);

  const [books, setBooks] = useState<string[]>([]);
  const [selectedBook, setSelectedBook] = useState('');
  const [mode, setMode] = useState<'FIND_KOR' | 'FIND_ENG'>('FIND_KOR');
  const [playCount, setPlayCount] = useState<number>(0);
  
  const [renderTick, setRenderTick] = useState(0); 
  const [inputValue, setInputValue] = useState("");
  const [finalScore, setFinalScore] = useState(0);

  const gameRef = useRef({
    wordsPool: [] as WordData[],
    fallingWords: [] as FallingWord[],
    currentTarget: null as WordData | null, // 💡 화면에 고정될 제시어
    lives: 3,
    score: 0,
    combo: 0,
    wordIdCounter: 0,
    speedMultiplier: 1,
    needNewWave: true, // 💡 새로운 문제를 출제해야 하는지 여부
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

      gameRef.current = {
        wordsPool: data,
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

      requestRef.current = requestAnimationFrame(gameLoop);

    } catch (error) {
      alert("데이터를 불러오지 못했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  // 💡 [핵심 기능] Wave 생성기 (정답 1개 + 미끼 2개를 동시에 떨어뜨림)
  const spawnWave = () => {
    const state = gameRef.current;
    
    // 1. 진짜 정답 뽑기
    const targetWord = state.wordsPool[Math.floor(Math.random() * state.wordsPool.length)];
    state.currentTarget = targetWord;

    // 2. 가짜 미끼 2개 뽑기 (정답과 안 겹치게)
    const distractors: WordData[] = [];
    while (distractors.length < 2) {
      const d = state.wordsPool[Math.floor(Math.random() * state.wordsPool.length)];
      if (d.eng !== targetWord.eng && !distractors.find(x => x.eng === d.eng)) {
        distractors.push(d);
      }
    }

    // 3. 정답과 미끼를 섞기
    const waveItems = [targetWord, ...distractors];
    waveItems.sort(() => Math.random() - 0.5);

    const colors = ['#f87171', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#a855f7'];

    // 4. 화면 위에서 동시에 떨어뜨리기 준비
    state.fallingWords = waveItems.map((item, index) => {
      const isCorrect = item.eng === targetWord.eng;
      const textToShow = mode === 'FIND_KOR' ? item.kor : item.eng;
      const answerToType = mode === 'FIND_KOR' ? item.kor : item.eng; // 타자 쳐야 할 글자

      return {
        id: state.wordIdCounter++,
        text: textToShow,
        acceptableAnswers: parseAcceptableAnswers(answerToType, mode),
        isCorrect: isCorrect,
        x: 15 + (index * 35) + (Math.random() * 5 - 2.5), // 겹치지 않게 15%, 50%, 85% 근처로 분산
        y: -10 - (Math.random() * 10), // 거의 동시에 출발
        speed: Math.random() * 0.03 + 0.08, // 떨어지는 속도
        color: colors[index % colors.length]
      };
    });

    // 레벨업: 맞출수록 속도 미세 증가
    state.speedMultiplier += 0.015;
  };

  const gameLoop = () => {
    const state = gameRef.current;
    if (state.isGameOver) return;

    if (state.needNewWave) {
      spawnWave();
      state.needNewWave = false;
    }

    let lifeLost = false;
    for (let i = state.fallingWords.length - 1; i >= 0; i--) {
      const fw = state.fallingWords[i];
      fw.y += fw.speed * state.speedMultiplier;

      // 바닥 판정 (y값이 82% 이상이면 DANGER ZONE)
      if (fw.y > 82) {
        if (fw.isCorrect) {
          // 💡 정답이 바닥에 닿으면 생명 감소!
          lifeLost = true;
          state.fallingWords = []; // 떨어지던 거 다 지우고
          state.needNewWave = true; // 새 문제 준비
          state.combo = 0; // 콤보 초기화
          break; // 어차피 새 웨이브 시작이므로 반복문 탈출
        } else {
          // 💡 미끼가 바닥에 닿으면 그냥 조용히 사라짐 (페널티 없음)
          state.fallingWords.splice(i, 1);
        }
      }
    }

    if (lifeLost) {
      state.lives -= 1;
      setInputValue(""); 
      if (state.lives <= 0) {
        endGame();
        return;
      }
    }

    setRenderTick(prev => prev + 1);
    requestRef.current = requestAnimationFrame(gameLoop);
  };

  const handleType = (e: React.ChangeEvent<HTMLInputElement>) => {
    const state = gameRef.current;
    if (state.isGameOver) return;

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
        // 🎯 정답을 맞춘 경우!
        state.fallingWords = []; // 남은 미끼들 다 지우기
        setInputValue(""); 
        
        const baseScore = mode === 'FIND_ENG' ? 20 : 10;
        const comboBonus = state.combo * 2; 
        
        state.score += (baseScore + comboBonus);
        state.combo += 1;
        state.needNewWave = true; // 다음 문제 호출
      } else {
        // 👻 미끼(가짜 오답)를 맞춘 경우!
        state.fallingWords.splice(matchIndex, 1); // 미끼 파괴
        setInputValue(""); 
        state.combo = 0; // 콤보 초기화 페널티
      }
    }
  };

  const endGame = async () => {
    const state = gameRef.current;
    state.isGameOver = true;
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
    
    setFinalScore(state.score);
    setAppPhase('GAME_OVER');

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

  if (appPhase === 'SETUP') {
    return (
      <div style={{ backgroundColor: '#f0f4f8', minHeight: '100vh', padding: '20px', fontFamily: 'Pretendard, sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ width: '100%', maxWidth: '450px', background: 'white', borderRadius: '24px', padding: '32px 24px', boxShadow: '0 8px 24px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#8e8e93', fontSize: '16px', fontWeight: '700', cursor: 'pointer' }}>← 뒤로</button>
            <h2 style={{ fontSize: '22px', fontWeight: '900', margin: 0, color: '#1e293b' }}>🎮 Word Drop V2</h2>
            <div style={{ width: '40px' }}></div>
          </div>

          <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', padding: '12px 16px', borderRadius: '12px', marginBottom: '24px' }}>
            <p style={{ margin: 0, fontSize: '13px', color: '#15803d', fontWeight: 'bold', lineHeight: '1.5' }}>
              💡 <b>게임 룰:</b> 제시된 단어를 보고, 떨어지는 3개의 보기 중 <b>진짜 정답</b>만 골라서 타자를 쳐주세요! (가짜 단어를 치면 콤보가 끊겨요)
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
              <button onClick={() => setMode('FIND_KOR')} style={{ padding: '16px', borderRadius: '12px', fontWeight: '800', fontSize: '15px', border: `2px solid ${mode === 'FIND_KOR' ? '#3b82f6' : '#e2e8f0'}`, backgroundColor: mode === 'FIND_KOR' ? '#eff6ff' : 'white', color: mode === 'FIND_KOR' ? '#2563eb' : '#64748b', cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}>
                <span>🟢 영어 제시어 ➡️ <b>한글 뜻 치기</b></span>
                <span style={{ fontSize: '13px', color: mode === 'FIND_KOR' ? '#3b82f6' : '#9ca3af' }}>기본 10점</span>
              </button>
              <button onClick={() => setMode('FIND_ENG')} style={{ padding: '16px', borderRadius: '12px', fontWeight: '800', fontSize: '15px', border: `2px solid ${mode === 'FIND_ENG' ? '#ef4444' : '#e2e8f0'}`, backgroundColor: mode === 'FIND_ENG' ? '#fef2f2' : 'white', color: mode === 'FIND_ENG' ? '#dc2626' : '#64748b', cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}>
                <span>🔥 한글 제시어 ➡️ <b>영어 스펠링 치기</b></span>
                <span style={{ fontSize: '13px', fontWeight: '900', color: '#ef4444' }}>어려움 (점수 2배)</span>
              </button>
            </div>
          </div>

          {selectedBook && (
            <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '12px', marginBottom: '24px', textAlign: 'center' }}>
              <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#475569' }}>오늘 <b>[{selectedBook}]</b> 도전 기회: </span>
              <span style={{ fontSize: '18px', fontWeight: '900', color: playCount >= 3 ? '#ef4444' : '#10b981' }}>{3 - playCount} / 3</span>
            </div>
          )}

          <button onClick={handleStart} disabled={isLoading || (!!selectedBook && playCount >= 3)} style={{ width: '100%', backgroundColor: (!!selectedBook && playCount >= 3) ? '#cbd5e1' : '#3b82f6', color: 'white', border: 'none', padding: '18px', borderRadius: '16px', fontSize: '18px', fontWeight: '900', cursor: (!!selectedBook && playCount >= 3) ? 'not-allowed' : 'pointer', boxShadow: (!!selectedBook && playCount >= 3) ? 'none' : '0 6px 16px rgba(59,130,246,0.3)' }}>
            {isLoading ? '로딩 중...' : (playCount >= 3 ? '오늘 기회 소진 😭' : '게임 시작 🚀')}
          </button>
        </div>
      </div>
    );
  }

  if (appPhase === 'GAME_OVER') {
    return (
      <div style={{ backgroundColor: '#1e293b', minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', fontFamily: 'Pretendard, sans-serif', textAlign: 'center', padding: '20px' }}>
        <div style={{ background: 'white', padding: '40px 30px', borderRadius: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)', maxWidth: '400px', width: '100%' }}>
          <div style={{ fontSize: '60px', marginBottom: '16px' }}>💥</div>
          <h2 style={{ fontSize: '28px', fontWeight: '900', marginBottom: '8px', color: '#0f172a' }}>GAME OVER</h2>
          <p style={{ color: '#64748b', marginBottom: '32px', fontSize: '16px', fontWeight: 'bold' }}>정답을 바닥에 떨어뜨렸습니다!</p>
          
          <div style={{ backgroundColor: '#f0fdf4', padding: '24px', borderRadius: '16px', border: '2px solid #bbf7d0', marginBottom: '32px' }}>
            <div style={{ fontSize: '14px', color: '#15803d', fontWeight: 'bold', marginBottom: '4px' }}>최종 획득 점수</div>
            <div style={{ fontSize: '42px', fontWeight: '900', color: '#16a34a' }}>{finalScore} <span style={{ fontSize: '20px' }}>점</span></div>
            <div style={{ fontSize: '12px', color: '#16a34a', marginTop: '8px', fontWeight: 'bold' }}>이 점수는 랭킹에 합산되었습니다 👑</div>
          </div>

          <button onClick={() => setAppPhase('SETUP')} style={{ backgroundColor: '#3b82f6', color: 'white', border: 'none', padding: '16px', borderRadius: '16px', fontWeight: '800', fontSize: '16px', width: '100%', cursor: 'pointer', boxShadow: '0 4px 12px rgba(59,130,246,0.3)' }}>
            다시 도전하기
          </button>
        </div>
      </div>
    );
  }

  const st = gameRef.current;
  return (
    <div style={{ backgroundColor: '#0f172a', minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', fontFamily: 'Pretendard, sans-serif' }}>
      
      <div style={{ width: '100%', maxWidth: '480px', height: '100vh', maxHeight: '800px', backgroundColor: '#1e293b', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 0 30px rgba(0,0,0,0.5)' }}>
        
        {/* 상단 UI (점수, 생명) */}
        <div style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', zIndex: 10 }}>
          <div>
            <div style={{ fontSize: '14px', color: '#94a3b8', fontWeight: 'bold', marginBottom: '4px' }}>SCORE</div>
            <div style={{ fontSize: '28px', fontWeight: '900', color: '#fbbf24' }}>{st.score}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '14px', color: '#94a3b8', fontWeight: 'bold', marginBottom: '4px' }}>LIFE</div>
            <div style={{ fontSize: '24px' }}>
              {Array.from({ length: 3 }).map((_, i) => (
                <span key={i} style={{ opacity: i < st.lives ? 1 : 0.2, margin: '0 2px' }}>❤️</span>
              ))}
            </div>
            {st.combo >= 2 && (
              <div style={{ fontSize: '18px', fontWeight: '900', color: '#38bdf8', marginTop: '8px', animation: 'pulse 0.5s infinite' }}>
                {st.combo} COMBO 🔥
              </div>
            )}
          </div>
        </div>

        {/* 💡 [핵심 UI] 찾아야 할 제시어 보드 */}
        <div style={{ textAlign: 'center', zIndex: 10, padding: '0 20px', marginBottom: '10px' }}>
          <div style={{ display: 'inline-block', backgroundColor: 'rgba(255,255,255,0.95)', padding: '16px 32px', borderRadius: '20px', boxShadow: '0 8px 20px rgba(0,0,0,0.3)', border: '4px solid #3b82f6' }}>
            <span style={{ fontSize: '14px', color: '#3b82f6', fontWeight: '900', display: 'block', marginBottom: '4px' }}>🎯 떨어지는 보기 중 정답을 찾으세요!</span>
            <div style={{ fontSize: '36px', fontWeight: '900', color: '#0f172a' }}>
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
                padding: '10px 18px',
                borderRadius: '12px',
                fontWeight: '900',
                fontSize: '18px',
                boxShadow: '0 6px 12px rgba(0,0,0,0.4)',
                whiteSpace: 'nowrap',
                border: '2px solid rgba(255,255,255,0.3)'
              }}
            >
              {word.text}
            </div>
          ))}
          
          <div style={{ 
            position: 'absolute', 
            top: '85%', 
            width: '100%', 
            height: '100%', 
            background: 'linear-gradient(to bottom, rgba(239, 68, 68, 0.4), rgba(239, 68, 68, 0.8))', 
            borderTop: '3px dashed #f87171',
            display: 'flex',
            justifyContent: 'center',
            paddingTop: '8px'
          }}>
            <span style={{ color: '#fca5a5', fontWeight: '900', fontSize: '14px', letterSpacing: '2px' }}>DANGER ZONE</span>
          </div>
        </div>

        <div style={{ padding: '20px', backgroundColor: '#0f172a', zIndex: 10 }}>
          <input
            type="text"
            value={inputValue}
            onChange={handleType}
            autoFocus
            placeholder={mode === 'FIND_KOR' ? "정답인 한글 뜻을 치세요" : "정답인 영어를 치세요"}
            style={{
              width: '100%',
              padding: '20px',
              fontSize: '22px',
              fontWeight: '900',
              textAlign: 'center',
              borderRadius: '16px',
              border: '3px solid #3b82f6',
              backgroundColor: '#1e293b',
              color: 'white',
              outline: 'none',
              boxSizing: 'border-box',
              boxShadow: '0 0 20px rgba(59,130,246,0.3)'
            }}
          />
        </div>
      </div>
    </div>
  );
}