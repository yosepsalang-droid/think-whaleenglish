import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

interface TypingGameProps {
  onBack: () => void;
  studentId: string;
  studentName: string;
  currentBook?: string;
  tableName?: string;
  onGameComplete?: () => void; 
}

interface Word {
  id: number;
  eng: string;
  kor: string;
}

export default function TypingGame({ onBack, studentId, studentName, currentBook, tableName = 'words', onGameComplete }: TypingGameProps) {
  const [allWordsDb, setAllWordsDb] = useState<Word[]>([]);
  const [gameState, setGameState] = useState<'intro' | 'playing' | 'gameOver' | 'result'>('intro');
  
  const [words, setWords] = useState<Word[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  
  const [inputValue, setInputValue] = useState('');
  const [score, setScore] = useState(0);
  const [hearts, setHearts] = useState(5);
  
  // 💡 [줄다리기 텐션 상태] 50이 중앙. 0이 되면 상어 승리, 100에 가까울수록 고래 승리
  const [tension, setTension] = useState(50); 
  const [isShaking, setIsShaking] = useState(false);
  const [actionMessage, setActionMessage] = useState(''); // "영차!", "앗!" 등 타격감 메시지
  
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchWords = async () => {
      try {
        let query = supabase.from(tableName).select('id, eng, kor');
        if (currentBook) query = query.eq('book', currentBook); 
        const { data, error } = await query.limit(200);
        
        if (error) throw error;
        
        if (data) {
          const uniqueWordsMap = new Map<string, Word>();
          data.forEach(word => {
            if (word.eng && word.kor) uniqueWordsMap.set(word.eng.trim().toLowerCase(), word);
          });
          setAllWordsDb(Array.from(uniqueWordsMap.values()));
        }
      } catch (e) {
        console.error("단어 로딩 실패:", e);
      }
    };
    fetchWords();
  }, [tableName, currentBook]);

  // 💡 [핵심] 줄다리기 실시간 타이머 (상어가 계속 당깁니다)
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (gameState === 'playing') {
      timer = setInterval(() => {
        setTension((prev) => {
          const next = prev - 1; // 상어가 0.4초마다 1%씩 당김 (약 20초 안에 아무것도 안하면 짐)
          if (next <= 0) {
            handleLostTugOfWar();
            return 50; // 리셋
          }
          return next;
        });
      }, 400); 
    }
    return () => clearInterval(timer);
  }, [gameState, currentIndex, currentStep]);

  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  const saveLogToDB = async (finalScore: number, isClear = false) => {
    if (finalScore === 0) return; 
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    try {
      await supabase.from('learning_logs').insert([{
        student_id: studentId,
        student_name: studentName,
        task_type: '줄다리기 타자',
        book_info: currentBook || '단어장',
        score: finalScore,
        status: '완료', 
        attempt: 1,
        log_date: dateStr
      }]);
      if (onGameComplete) onGameComplete();
    } catch (err) {
      console.error("DB 점수 저장 오류:", err);
    }
  };

  const startGame = () => {
    if (allWordsDb.length < 5) return alert(`[${currentBook}] 단어가 부족합니다. (최소 5개 이상 필요)`);
    const shuffled = [...allWordsDb].sort(() => Math.random() - 0.5).slice(0, 10);
    setWords(shuffled);
    setCurrentIndex(0);
    setCurrentStep(1);
    setScore(0);
    setHearts(5);
    setTension(50);
    setInputValue('');
    setGameState('playing');
  };

  // 상어에게 끌려갔을 때 (시간 초과)
  const handleLostTugOfWar = () => {
    showActionText("💥 끌려갔다!");
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
    
    setHearts((prev) => {
      const newHearts = prev - 1;
      if (newHearts <= 0) {
        setGameState('gameOver');
        saveLogToDB(score);
      }
      return newHearts;
    });
    // 현재 단어 처음 단계로 초기화
    setCurrentStep(1);
    setInputValue('');
  };

  const showActionText = (msg: string) => {
    setActionMessage(msg);
    setTimeout(() => setActionMessage(''), 800);
  };

  const getMaskedWord = (word: string, step: number) => {
    if (step === 1) return word;
    let masked = '';
    let letterCount = 0;
    for (let i = 0; i < word.length; i++) {
      if (word[i] === ' ') {
        masked += ' '; 
      } else {
        if (step === 2) masked += (letterCount % 2 !== 0) ? '_' : word[i];
        else if (step === 3) masked += '_';
        letterCount++;
      }
    }
    return masked;
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputValue.trim()) return;

    const currentWord = words[currentIndex].eng.toLowerCase();
    
    if (inputValue.trim().toLowerCase() === currentWord) {
      // 💡 정답! 고래가 밧줄을 당깁니다 (+25%)
      showActionText("💪 영차!");
      setTension((prev) => Math.min(100, prev + 25));
      
      if (currentStep < 3) {
        setCurrentStep((prev) => (prev + 1) as 1 | 2 | 3);
        setInputValue('');
        setTimeout(() => inputRef.current?.focus(), 10);
      } else {
        // 단어 마스터 완료!
        speakText(words[currentIndex].eng);
        setScore((prev) => prev + 1);
        setTension(50); // 다음 단어를 위해 중앙 리셋
        
        if (currentIndex + 1 < words.length) {
          setCurrentIndex((prev) => prev + 1);
          setCurrentStep(1);
          setInputValue('');
          setTimeout(() => inputRef.current?.focus(), 10);
        } else {
          saveLogToDB(score + 1, true);
          setGameState('result');
        }
      }
    } else {
      // 💡 오답! 상어에게 밧줄을 뺏깁니다 (-5%)
      showActionText("앗! 상어가 당긴다!");
      setIsShaking(true);
      setTension((prev) => Math.max(1, prev - 5));
      setTimeout(() => setIsShaking(false), 400);
    }
  };

  const currentWordData = words[currentIndex];

  return (
    <div style={{ padding: '20px', width: '100%', maxWidth: '600px', boxSizing: 'border-box', margin: '0 auto', fontFamily: 'Pretendard, sans-serif' }}>
      
      <style>
        {`
          @keyframes shake {
            0% { transform: translateX(0); }
            25% { transform: translateX(-8px); }
            50% { transform: translateX(8px); }
            75% { transform: translateX(-8px); }
            100% { transform: translateX(0); }
          }
          .shake-animation {
            animation: shake 0.4s ease-in-out;
          }
          .input-error {
            border-color: #ef4444 !important; 
            background-color: #fef2f2 !important;
          }
          .masked-text {
            letter-spacing: 6px;
            font-family: monospace;
          }
          @keyframes popOut {
            0% { transform: scale(0.5); opacity: 0; }
            50% { transform: scale(1.2); opacity: 1; }
            100% { transform: scale(1); opacity: 0; }
          }
          .action-msg {
            position: absolute;
            top: -40px;
            left: 50%;
            transform: translateX(-50%);
            color: #ef4444;
            font-weight: 900;
            font-size: 24px;
            text-shadow: 0 2px 4px rgba(0,0,0,0.2);
            animation: popOut 0.8s forwards;
            pointer-events: none;
            white-space: nowrap;
          }
        `}
      </style>

      <button onClick={onBack} style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: 'white', border: '1px solid #eaeaea', borderRadius: '12px', fontWeight: '700', cursor: 'pointer', color: '#555', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
        학습 홈으로
      </button>

      {/* 1. 시작 화면 */}
      {gameState === 'intro' && (
        <div style={{ textAlign: 'center', background: 'white', padding: '48px 24px', borderRadius: '24px', boxShadow: '0 12px 32px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '56px', marginBottom: '16px' }}>🐋💢🦈</div>
          <h2 style={{ margin: '0 0 8px', fontSize: '28px', fontWeight: '800', color: '#111' }}>상어와의 줄다리기!</h2>
          <p style={{ fontSize: '15px', color: '#64748b', marginBottom: '12px', lineHeight: '1.6' }}>
            {studentName} 학생, 상어에게 끌려가기 전에 타자를 쳐주세요!<br/>
            <b>1단계(보고 치기) ➡️ 2단계(반 가리기) ➡️️ 3단계(안 보고 치기)</b>
          </p>
          {currentBook && (
            <div style={{ display: 'inline-block', background: '#e0f2fe', color: '#0284c7', padding: '4px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: '800', marginBottom: '20px' }}>
              현재 교재: {currentBook}
            </div>
          )}
          <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', padding: '16px', borderRadius: '12px', marginBottom: '32px', fontSize: '13px', color: '#991b1b', fontWeight: '700', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span>⏳ 가만히 있거나 오타를 내면 상어가 밧줄을 당깁니다!</span>
            <span>🏆 단어를 완벽히 치면 고래가 영차! 하고 당겨옵니다.</span>
          </div>
          <button onClick={startGame} style={{ width: '100%', padding: '18px', background: 'linear-gradient(135deg, #007aff, #0056b3)', color: 'white', border: 'none', borderRadius: '16px', fontSize: '18px', fontWeight: '800', cursor: 'pointer', boxShadow: '0 6px 16px rgba(0,122,255,0.2)' }}>
            🚀 줄다리기 시작!
          </button>
        </div>
      )}

      {/* 2. 게임 플레이 화면 */}
      {gameState === 'playing' && currentWordData && (
        <div style={{ animation: 'fadeIn 0.5s ease' }}>
          
          <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: '16px 20px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: '800', color: '#6366f1', marginBottom: '4px' }}>단어 진도</div>
              <div style={{ fontSize: '20px', fontWeight: '900', color: '#111' }}>
                {currentIndex + 1} <span style={{fontSize:'14px', color:'#94a3b8'}}>/ {words.length}</span>
              </div>
            </div>
            
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '13px', fontWeight: '800', color: '#ff3b30', marginBottom: '4px' }}>생명 & 점수</div>
              <div style={{ fontSize: '16px', fontWeight: '900', color: '#111' }}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <span key={i}>{i < hearts ? '❤️' : '🖤'}</span>
                ))}
                <span style={{ marginLeft: '8px', color: '#f59e0b' }}>{score}점</span>
              </div>
            </div>
          </div>

          {/* 💡 줄다리기 시각화 영역 */}
          <div style={{ backgroundColor: '#f8fafc', padding: '24px 16px', borderRadius: '24px', marginBottom: '24px', position: 'relative', border: '2px solid #e2e8f0', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: '50%', width: '2px', height: '100%', background: '#cbd5e1', zIndex: 0 }}></div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 1 }}>
              <div style={{ fontSize: '36px', filter: tension < 30 ? 'grayscale(1)' : 'none', transition: 'all 0.3s' }}>🐋</div>
              
              <div style={{ flex: 1, height: '12px', background: '#e2e8f0', borderRadius: '6px', margin: '0 16px', position: 'relative' }}>
                <div style={{ 
                  position: 'absolute', top: '-14px', left: `${tension}%`, 
                  transform: 'translateX(-50%)', fontSize: '28px', transition: 'left 0.2s linear' 
                }}>
                  🔴
                </div>
              </div>
              
              <div style={{ fontSize: '36px', transform: tension < 30 ? 'scale(1.2)' : 'scale(1)', transition: 'all 0.3s' }}>🦈</div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', fontSize: '12px', fontWeight: '800', color: '#94a3b8' }}>
              <span style={{ color: tension > 50 ? '#007aff' : '#94a3b8' }}>고래 (나)</span>
              <span style={{ color: tension < 50 ? '#ef4444' : '#94a3b8' }}>상어 (위험!)</span>
            </div>
          </div>

          <div className={isShaking ? 'shake-animation' : ''} style={{ backgroundColor: 'white', borderRadius: '24px', padding: '32px 20px', boxShadow: '0 12px 32px rgba(0,0,0,0.06)', textAlign: 'center', position: 'relative' }}>
            
            {actionMessage && <div className="action-msg">{actionMessage}</div>}

            <div style={{ display: 'inline-flex', gap: '8px', marginBottom: '24px' }}>
              {[1, 2, 3].map((step) => (
                <div key={step} style={{ 
                  width: '12px', height: '12px', borderRadius: '50%', 
                  backgroundColor: currentStep >= step ? '#6366f1' : '#e2e8f0',
                  boxShadow: currentStep === step ? '0 0 0 4px rgba(99,102,241,0.2)' : 'none',
                  transition: 'all 0.3s ease'
                }} />
              ))}
            </div>

            <div style={{ fontSize: '14px', fontWeight: '800', color: '#8b5cf6', marginBottom: '8px' }}>
              {currentStep === 1 ? '👀 1단계: 보고 치기' : currentStep === 2 ? '🤔 2단계: 빈칸 채우기' : '🔥 3단계: 안 보고 치기!'}
            </div>

            <h3 style={{ margin: '0 0 16px 0', fontSize: '28px', fontWeight: '800', color: '#1e293b', wordBreak: 'keep-all' }}>
              {currentWordData.kor}
            </h3>

            <div style={{ fontSize: '36px', fontWeight: '900', color: '#007aff', marginBottom: '32px', minHeight: '40px' }} className="masked-text">
              {getMaskedWord(currentWordData.eng, currentStep)}
            </div>

            <form onSubmit={handleSubmit}>
              <input
                ref={inputRef}
                type="text"
                autoFocus
                placeholder="스펠링을 입력하세요"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                autoCapitalize="none"
                autoComplete="off"
                spellCheck="false"
                className={isShaking ? 'input-error' : ''}
                style={{ 
                  width: '100%', padding: '20px', boxSizing: 'border-box',
                  fontSize: '24px', fontWeight: '800', textAlign: 'center',
                  border: '2px solid #cbd5e1', borderRadius: '16px',
                  outline: 'none', color: '#1e293b',
                  transition: 'all 0.2s',
                  backgroundColor: '#f8fafc'
                }}
                onFocus={(e) => e.target.style.borderColor = '#6366f1'}
                onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
              />
              <button 
                type="submit" 
                style={{ 
                  marginTop: '16px', width: '100%', padding: '18px', 
                  backgroundColor: '#6366f1', color: 'white', 
                  border: 'none', borderRadius: '16px', 
                  fontSize: '18px', fontWeight: '800', cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(99,102,241,0.3)'
                }}
              >
                당기기 ⏎
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 3. 게임 오버 화면 (하트 모두 소진) */}
      {gameState === 'gameOver' && (
        <div style={{ textAlign: 'center', background: 'white', padding: '48px 24px', borderRadius: '24px', boxShadow: '0 12px 32px rgba(0,0,0,0.06)', animation: 'fadeIn 0.5s ease' }}>
          <div style={{ fontSize: '56px', marginBottom: '16px' }}>🦈💦</div>
          <h2 style={{ fontSize: '28px', fontWeight: '800', margin: '0 0 12px', color: '#ef4444' }}>상어에게 졌습니다!</h2>
          <p style={{ fontSize: '15px', color: '#64748b', marginBottom: '24px' }}>하트를 모두 소진했습니다.</p>
          
          <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '20px', padding: '24px', marginBottom: '32px' }}>
            <span style={{ fontSize: '14px', fontWeight: '800', color: '#991b1b', display: 'block', marginBottom: '8px' }}>최종 기록</span>
            <div style={{ fontSize: '32px', fontWeight: '900', color: '#ef4444' }}>{score}점</div>
          </div>
          
          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={onBack} style={{ flex: 1, padding: '16px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '16px', fontSize: '16px', fontWeight: '800', cursor: 'pointer' }}>종료</button>
            <button onClick={startGame} style={{ flex: 2, padding: '16px', background: '#111', color: 'white', border: 'none', borderRadius: '16px', fontSize: '16px', fontWeight: '800', cursor: 'pointer' }}>🔄 다시 도전</button>
          </div>
        </div>
      )}

      {/* 4. 클리어 화면 */}
      {gameState === 'result' && (
        <div style={{ textAlign: 'center', background: 'white', padding: '48px 24px', borderRadius: '24px', boxShadow: '0 12px 32px rgba(0,0,0,0.06)', animation: 'fadeIn 0.5s ease' }}>
          <div style={{ fontSize: '56px', marginBottom: '16px' }}>🏆</div>
          <h2 style={{ fontSize: '28px', fontWeight: '800', margin: '0 0 12px', color: '#111' }}>고래의 승리!</h2>
          <p style={{ fontSize: '15px', color: '#64748b', marginBottom: '24px' }}>모든 단어의 3단계를 완벽하게 방어했습니다.</p>
          
          <div style={{ backgroundColor: '#f0fdf4', borderRadius: '20px', padding: '24px', marginBottom: '32px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '15px', fontWeight: '800', color: '#64748b', display: 'block', marginBottom: '8px' }}>최종 랭킹 점수</span>
            <span style={{ fontSize: '42px', fontWeight: '900', color: '#007aff', display: 'block' }}>{score}점</span>
            <div style={{ marginTop: '12px', fontSize: '13px', color: '#10b981', fontWeight: 'bold' }}>✅ 점수가 랭킹에 무사히 반영되었습니다!</div>
          </div>
          
          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={onBack} style={{ flex: 1, padding: '16px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '16px', fontSize: '16px', fontWeight: '800', cursor: 'pointer' }}>홈으로</button>
            <button onClick={startGame} style={{ flex: 2, padding: '16px', background: '#111', color: 'white', border: 'none', borderRadius: '16px', fontSize: '16px', fontWeight: '800', cursor: 'pointer' }}>🔄 다음 훈련</button>
          </div>
        </div>
      )}
    </div>
  );
}