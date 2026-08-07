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
  acceptableAnswers: string[]; // 💡 정답을 1개가 아닌 여러 개(배열)로 유연하게 저장
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

// 💡 [핵심 기능] 융통성 있는 정답 생성기
const parseAcceptableAnswers = (text: string, mode: 'ENG_TO_KOR' | 'KOR_TO_ENG') => {
  if (mode === 'KOR_TO_ENG') {
    // 영어 칠 때는 띄어쓰기와 대소문자만 무시
    return [text.toLowerCase().replace(/[^a-z0-9]/g, '')];
  } else {
    // 한글 칠 때는 아주 관대하게 판정!
    // 1. 괄호 내용 완전 무시 (예: "(맛있는) 사과" -> "사과")
    let noBracket = text.replace(/\(.*?\)|\[.*?\]/g, '');
    
    // 2. 쉼표나 슬래시로 뜻이 여러 개면 다 쪼갬 (예: "사과, 능금" -> ["사과", "능금"])
    let splitAnswers = noBracket.split(/[,/]/); 
    
    // 3. 띄어쓰기, 특수문자(~ . ? 등) 싹 다 지우고 글자만 추출
    let cleaned = splitAnswers.map(ans => ans.replace(/[^가-힣a-zA-Z0-9]/g, '')).filter(ans => ans.length > 0);
    
    // 만약 괄호 지웠더니 다 지워졌다면(예: "(과일)") 괄호 무시하고 글자만 추출
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
  const [mode, setMode] = useState<'ENG_TO_KOR' | 'KOR_TO_ENG'>('ENG_TO_KOR');
  const [playCount, setPlayCount] = useState<number>(0);
  
  const [renderTick, setRenderTick] = useState(0); 
  const [inputValue, setInputValue] = useState("");
  const [finalScore, setFinalScore] = useState(0);

  const gameRef = useRef({
    wordsPool: [] as WordData[],
    fallingWords: [] as FallingWord[],
    lives: 3,
    score: 0,
    combo: 0,
    wordIdCounter: 0,
    speedMultiplier: 1,
    spawnRate: 3500, 
    lastSpawnTime: 0,
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
        lives: 3,
        score: 0,
        combo: 0,
        wordIdCounter: 0,
        speedMultiplier: 1,
        spawnRate: 3500, 
        lastSpawnTime: Date.now(),
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

  const gameLoop = () => {
    const state = gameRef.current;
    if (state.isGameOver) return;

    const now = Date.now();

    if (now - state.lastSpawnTime > state.spawnRate) {
      spawnWord();
      state.lastSpawnTime = now;
    }

    let lifeLost = false;
    for (let i = state.fallingWords.length - 1; i >= 0; i--) {
      const fw = state.fallingWords[i];
      fw.y += fw.speed * state.speedMultiplier;

      // 💡 바닥 판정 (y값이 82% 이상이면 DANGER ZONE 닿음)
      if (fw.y > 82) {
        state.fallingWords.splice(i, 1);
        state.combo = 0; 
        lifeLost = true;
      }
    }

    if (lifeLost) {
      state.lives -= 1;
      setInputValue(""); // 💡 땅에 떨어지면 치고 있던 오답도 싹 지워짐!
      
      if (state.lives <= 0) {
        endGame();
        return;
      }
    }

    setRenderTick(prev => prev + 1);
    requestRef.current = requestAnimationFrame(gameLoop);
  };

  const spawnWord = () => {
    const state = gameRef.current;
    const randomWord = state.wordsPool[Math.floor(Math.random() * state.wordsPool.length)];
    
    const textToShow = mode === 'ENG_TO_KOR' ? randomWord.eng : randomWord.kor;
    const rawAnswer = mode === 'ENG_TO_KOR' ? randomWord.kor : randomWord.eng;
    
    // 💡 융통성 있는 정답 배열 생성
    const acceptableAnswers = parseAcceptableAnswers(rawAnswer, mode);

    const colors = ['#f87171', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#a855f7'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    state.fallingWords.push({
      id: state.wordIdCounter++,
      text: textToShow,
      acceptableAnswers: acceptableAnswers,
      x: Math.random() * 80 + 10, 
      y: -5, 
      speed: Math.random() * 0.05 + 0.08, // 초등부 맞춤 느린 속도
      color: randomColor
    });

    if (state.spawnRate > 1500) {
      state.spawnRate -= 30; 
      state.speedMultiplier += 0.01;
    }
  };

  const handleType = (e: React.ChangeEvent<HTMLInputElement>) => {
    const state = gameRef.current;
    if (state.isGameOver) return;

    const val = e.target.value;
    setInputValue(val);

    // 💡 유저가 친 글자도 띄어쓰기와 특수문자를 다 지워버립니다.
    const cleanInput = mode === 'KOR_TO_ENG' 
        ? val.toLowerCase().replace(/[^a-z0-9]/g, '') 
        : val.replace(/[^가-힣a-zA-Z0-9]/g, '');

    // 💡 정답 판정 엔진
    const matchIndex = state.fallingWords.findIndex(w => 
      w.acceptableAnswers.some(ans => {
        // 1. 완전히 똑같이 친 경우 무조건 통과
        if (ans === cleanInput) return true;
        
        // 2. [초강력 기능] "핵심 단어"만 쳐도 통과! 
        // 예: 정답이 "매우화가난" 인데 아이가 "화가난"(2글자 이상) 치면 통과!
        // 예: 정답이 "을먹다" 인데 아이가 "먹다" 치면 통과!
        if (mode === 'ENG_TO_KOR' && cleanInput.length >= 2 && ans.endsWith(cleanInput)) {
          return true;
        }
        
        return false;
      })
    );
    
    if (matchIndex > -1) {
      state.fallingWords.splice(matchIndex, 1);
      setInputValue(""); // 💡 맞추면 다음 단어를 위해 즉시 싹 비워짐!
      
      const baseScore = mode === 'KOR_TO_ENG' ? 20 : 10;
      const comboBonus = state.combo * 2; 
      
      state.score += (baseScore + comboBonus);
      state.combo += 1;
    }
  };

  const endGame = async () => {
    const state = gameRef.current;
    state.isGameOver = true;
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
    
    setFinalScore(state.score);
    setAppPhase('GAME_OVER');

    const modeText = mode === 'ENG_TO_KOR' ? '영-한' : '한-영';

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
            <h2 style={{ fontSize: '22px', fontWeight: '900', margin: 0, color: '#1e293b' }}>🎮 Word Drop</h2>
            <div style={{ width: '40px' }}></div>
          </div>

          <div style={{ backgroundColor: '#fff7ed', border: '1px solid #fdba74', padding: '12px 16px', borderRadius: '12px', marginBottom: '24px' }}>
            <p style={{ margin: 0, fontSize: '13px', color: '#c2410c', fontWeight: 'bold', lineHeight: '1.5' }}>
              💡 <b>꿀팁:</b> 한글 뜻을 칠 때 띄어쓰기나 괄호 안의 말은 무시해도 돼요! "~을 먹다"면 그냥 "먹다"만 써도 정답 인정!
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
            <label style={{ fontSize: '15px', fontWeight: '800', color: '#475569', display: 'block', marginBottom: '8px' }}>2. 게임 모드 선택</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button onClick={() => setMode('ENG_TO_KOR')} style={{ padding: '16px', borderRadius: '12px', fontWeight: '800', fontSize: '15px', border: `2px solid ${mode === 'ENG_TO_KOR' ? '#3b82f6' : '#e2e8f0'}`, backgroundColor: mode === 'ENG_TO_KOR' ? '#eff6ff' : 'white', color: mode === 'ENG_TO_KOR' ? '#2563eb' : '#64748b', cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}>
                <span>🇺🇸 영어 보고 🇰🇷 한글 뜻 치기</span>
                <span style={{ fontSize: '13px', color: mode === 'ENG_TO_KOR' ? '#3b82f6' : '#9ca3af' }}>기본 10점</span>
              </button>
              <button onClick={() => setMode('KOR_TO_ENG')} style={{ padding: '16px', borderRadius: '12px', fontWeight: '800', fontSize: '15px', border: `2px solid ${mode === 'KOR_TO_ENG' ? '#ef4444' : '#e2e8f0'}`, backgroundColor: mode === 'KOR_TO_ENG' ? '#fef2f2' : 'white', color: mode === 'KOR_TO_ENG' ? '#dc2626' : '#64748b', cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}>
                <span>🇰🇷 한글 보고 🇺🇸 영어 스펠링 치기</span>
                <span style={{ fontSize: '13px', fontWeight: '900', color: '#ef4444' }}>🔥 점수 2배!</span>
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
          <p style={{ color: '#64748b', marginBottom: '32px', fontSize: '16px', fontWeight: 'bold' }}>단어 폭격을 막아내지 못했습니다!</p>
          
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
                padding: '8px 16px',
                borderRadius: '8px',
                fontWeight: '900',
                fontSize: '18px',
                boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
                whiteSpace: 'nowrap'
              }}
            >
              {word.text}
            </div>
          ))}
          
          {/* 💡 [명확한 바닥선 시각화] */}
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
            placeholder={mode === 'ENG_TO_KOR' ? "띄어쓰기 무시! 단어만 치세요" : "영어 스펠링을 치세요"}
            style={{
              width: '100%',
              padding: '20px',
              fontSize: '20px',
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