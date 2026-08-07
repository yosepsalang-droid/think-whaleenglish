import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

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
  text: string;     // 화면에 보여질 글자
  answer: string;   // 유저가 쳐야 할 정답
  x: number;        // X 좌표 (0~90%)
  y: number;        // Y 좌표
  speed: number;    // 떨어지는 속도
  color: string;
}

// KST 날짜 구하기 (밀림 현상 완벽 방어)
const getFakeUTCString = (date: Date) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mi = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}+00:00`;
};

export default function GameWordDrop({ student, onBack }: GameWordDropProps) {
  const [appPhase, setAppPhase] = useState<'SETUP' | 'PLAYING' | 'GAME_OVER'>('SETUP');
  const [isLoading, setIsLoading] = useState(false);

  // 🎯 설정 상태
  const [books, setBooks] = useState<string[]>([]);
  const [selectedBook, setSelectedBook] = useState('');
  const [mode, setMode] = useState<'ENG_TO_KOR' | 'KOR_TO_ENG'>('ENG_TO_KOR');
  const [playCount, setPlayCount] = useState<number>(0);
  
  // 🎯 인게임 상태 (화면 렌더링용)
  const [renderTick, setRenderTick] = useState(0); 
  const [inputValue, setInputValue] = useState("");
  const [finalScore, setFinalScore] = useState(0);

  // ⚡ 게임 물리엔진 및 상태 (useRef로 관리해야 끊김없이 부드러움)
  const gameRef = useRef({
    wordsPool: [] as WordData[],
    fallingWords: [] as FallingWord[],
    lives: 3,
    score: 0,
    combo: 0,
    wordIdCounter: 0,
    speedMultiplier: 1,
    spawnRate: 2000,
    lastSpawnTime: 0,
    isGameOver: false
  });

  const requestRef = useRef<number>(0);

  // --------------------------------------------------
  // 1. 교재 목록 및 오늘 플레이 횟수 가져오기
  // --------------------------------------------------
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
  }, [selectedBook, appPhase]); // 게임 끝나고 셋업으로 올 때 다시 체크

  // --------------------------------------------------
  // 2. 게임 시작
  // --------------------------------------------------
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

      // 게임 초기화
      gameRef.current = {
        wordsPool: data,
        fallingWords: [],
        lives: 3,
        score: 0,
        combo: 0,
        wordIdCounter: 0,
        speedMultiplier: 1,
        spawnRate: 2500, // 처음엔 2.5초마다 하나씩
        lastSpawnTime: Date.now(),
        isGameOver: false
      };

      setInputValue("");
      setAppPhase('PLAYING');

      // 게임 루프 시작
      requestRef.current = requestAnimationFrame(gameLoop);

    } catch (error) {
      alert("데이터를 불러오지 못했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  // --------------------------------------------------
  // 3. 인게임 물리 엔진 (단어 떨어지기)
  // --------------------------------------------------
  const gameLoop = () => {
    const state = gameRef.current;
    if (state.isGameOver) return;

    const now = Date.now();

    // 단어 소환 (Spawn)
    if (now - state.lastSpawnTime > state.spawnRate) {
      spawnWord();
      state.lastSpawnTime = now;
    }

    // 단어 이동 (Move) 및 바닥 충돌 판정
    let lifeLost = false;
    for (let i = state.fallingWords.length - 1; i >= 0; i--) {
      const fw = state.fallingWords[i];
      fw.y += fw.speed * state.speedMultiplier;

      // 바닥(Y=400 기준)에 닿으면? -> 생명 깎고 단어 제거
      if (fw.y > 400) {
        state.fallingWords.splice(i, 1);
        state.combo = 0; // 콤보 끊김 😭
        lifeLost = true;
      }
    }

    if (lifeLost) {
      state.lives -= 1;
      if (state.lives <= 0) {
        endGame();
        return;
      }
    }

    // 화면 갱신 트리거
    setRenderTick(prev => prev + 1);

    // 다음 프레임 예약
    requestRef.current = requestAnimationFrame(gameLoop);
  };

  const spawnWord = () => {
    const state = gameRef.current;
    const randomWord = state.wordsPool[Math.floor(Math.random() * state.wordsPool.length)];
    
    // 원장님 기획: 영어보고 한글치기 vs 한글보고 영어치기
    const textToShow = mode === 'ENG_TO_KOR' ? randomWord.eng : randomWord.kor;
    // 💡 정답 판정을 위해 괄호 내용 제거 및 소문자 변환 (예: "사과(과일)" -> "사과")
    let answerToType = mode === 'ENG_TO_KOR' ? randomWord.kor : randomWord.eng;
    answerToType = answerToType.replace(/\(.*?\)/g, '').trim().toLowerCase();

    const colors = ['#f87171', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#a855f7'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    state.fallingWords.push({
      id: state.wordIdCounter++,
      text: textToShow,
      answer: answerToType,
      x: Math.random() * 80 + 10, // 10% ~ 90% 사이 랜덤 위치
      y: -30, // 화면 위에서 시작
      speed: Math.random() * 0.5 + 0.8, // 랜덤 떨어지는 속도
      color: randomColor
    });

    // 💡 레벨업 시스템: 시간이 지날수록 더 빨리 단어가 나옴 (난이도 증가)
    if (state.spawnRate > 800) {
      state.spawnRate -= 20; 
      state.speedMultiplier += 0.01;
    }
  };

  // --------------------------------------------------
  // 4. 단어 타이핑 (즉시 판정)
  // --------------------------------------------------
  const handleType = (e: React.ChangeEvent<HTMLInputElement>) => {
    const state = gameRef.current;
    if (state.isGameOver) return;

    const val = e.target.value;
    setInputValue(val);

    // 💡 엔터 누를 필요 없이 입력 값이 정답과 일치하면 즉시 파괴!
    const matchIndex = state.fallingWords.findIndex(w => w.answer === val.trim().toLowerCase());
    
    if (matchIndex > -1) {
      // 명중! 💥
      state.fallingWords.splice(matchIndex, 1);
      setInputValue("");
      
      // 💡 원장님 특별 기획: 영어 쓰기 모드가 점수가 2배 높음!
      const baseScore = mode === 'KOR_TO_ENG' ? 20 : 10;
      
      // 콤보 보너스: 콤보당 추가 점수
      const comboBonus = state.combo * 2; 
      
      state.score += (baseScore + comboBonus);
      state.combo += 1;
    }
  };

  // --------------------------------------------------
  // 5. 게임 오버 및 DB 저장
  // --------------------------------------------------
  const endGame = async () => {
    const state = gameRef.current;
    state.isGameOver = true;
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
    
    setFinalScore(state.score);
    setAppPhase('GAME_OVER');

    // 수파베이스 통합 랭킹 연동 기록 (learning_logs 에 score 저장)
    try {
      const modeText = mode === 'ENG_TO_KOR' ? '영-한' : '한-영';
      await supabase.from('learning_logs').insert([{
        student_id: student.id,
        student_name: student.name,
        grade: student.grade,
        task_type: `타자게임(${modeText})`,
        book_info: selectedBook,
        status: '완료',
        score: state.score // 💡 랭킹 반영 핵심
      }]);
    } catch (err) {
      console.error("결과 저장 실패", err);
    }
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);


  // ==========================================
  // 화면 렌더링 영역
  // ==========================================

  // 1. 초기 셋업 화면
  if (appPhase === 'SETUP') {
    return (
      <div style={{ backgroundColor: '#f0f4f8', minHeight: '100vh', padding: '20px', fontFamily: 'Pretendard, sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ width: '100%', maxWidth: '450px', background: 'white', borderRadius: '24px', padding: '32px 24px', boxShadow: '0 8px 24px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
            <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#8e8e93', fontSize: '16px', fontWeight: '700', cursor: 'pointer' }}>← 뒤로</button>
            <h2 style={{ fontSize: '22px', fontWeight: '900', margin: 0, color: '#1e293b' }}>🎮 Word Drop</h2>
            <div style={{ width: '40px' }}></div>
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

  // 2. 게임 오버 화면
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

  // 3. 인게임 (PLAYING) 화면
  const st = gameRef.current;
  return (
    <div style={{ backgroundColor: '#0f172a', minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', fontFamily: 'Pretendard, sans-serif' }}>
      
      {/* 스마트폰 비율의 게임 화면 설정 */}
      <div style={{ width: '100%', maxWidth: '480px', height: '100vh', maxHeight: '800px', backgroundColor: '#1e293b', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 0 30px rgba(0,0,0,0.5)' }}>
        
        {/* 상단 UI (점수, 생명, 콤보) */}
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

        {/* 게임 플레이 영역 (단어 떨어지는 곳) */}
        <div style={{ flex: 1, position: 'relative' }}>
          {st.fallingWords.map(word => (
            <div 
              key={word.id}
              style={{
                position: 'absolute',
                left: `${word.x}%`,
                top: `${word.y}px`,
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
          
          {/* 바닥 경계선 */}
          <div style={{ position: 'absolute', bottom: 0, width: '100%', height: '4px', backgroundColor: '#ef4444', opacity: 0.5, boxShadow: '0 0 10px #ef4444' }} />
        </div>

        {/* 하단 입력창 */}
        <div style={{ padding: '20px', backgroundColor: '#0f172a', zIndex: 10 }}>
          <input
            type="text"
            value={inputValue}
            onChange={handleType}
            autoFocus
            placeholder="단어를 빠르게 타이핑하세요!"
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