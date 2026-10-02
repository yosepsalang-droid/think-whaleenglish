import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

interface ThreeStepTypingProps {
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

export default function ThreeStepTyping({ onBack, studentId, studentName, currentBook, tableName = 'words', onGameComplete }: ThreeStepTypingProps) {
  const [allWordsDb, setAllWordsDb] = useState<Word[]>([]);
  const [gameState, setGameState] = useState<'intro' | 'playing' | 'result'>('intro');
  
  const [words, setWords] = useState<Word[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1); // 1: 전부, 2: 반만, 3: 숨김
  
  const [inputValue, setInputValue] = useState('');
  const [score, setScore] = useState(0);
  const [isShaking, setIsShaking] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);

  // DB에서 단어 불러오기 (중복 스펠링 제거)
  useEffect(() => {
    const fetchWords = async () => {
      try {
        let query = supabase.from(tableName).select('id, eng, kor');
        if (currentBook) {
          query = query.eq('book', currentBook); 
        }
        const { data, error } = await query.limit(200);
        
        if (error) throw error;
        
        if (data) {
          const uniqueWordsMap = new Map<string, Word>();
          data.forEach(word => {
            if (word.eng && word.kor) {
              uniqueWordsMap.set(word.eng.trim().toLowerCase(), word);
            }
          });
          setAllWordsDb(Array.from(uniqueWordsMap.values()));
        }
      } catch (e) {
        console.error("단어 로딩 실패:", e);
      }
    };
    fetchWords();
  }, [tableName, currentBook]);

  // TTS 발음 읽어주기
  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  const saveLogToDB = async (finalScore: number) => {
    if (finalScore === 0) return; 

    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    try {
      await supabase.from('learning_logs').insert([{
        student_id: studentId,
        student_name: studentName,
        task_type: '3단 진화 타이핑',
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
    if (allWordsDb.length < 5) {
      return alert(`[${currentBook}] 교재의 단어가 부족합니다. (최소 5개 이상 필요)`);
    }
    
    // 이번 게임에 출제할 단어 10개 랜덤 섞어서 뽑기 (원하시는 문제 수로 조절 가능)
    const shuffled = [...allWordsDb].sort(() => Math.random() - 0.5).slice(0, 10);
    setWords(shuffled);
    setCurrentIndex(0);
    setCurrentStep(1);
    setScore(0);
    setInputValue('');
    setGameState('playing');
  };

  // 💡 [핵심] 단계별 스펠링 가리기 로직 (1단계: 전부, 2단계: 짝수번 째 _, 3단계: 올 _)
  const getMaskedWord = (word: string, step: number) => {
    if (step === 1) return word;

    let masked = '';
    let letterCount = 0; // 공백은 건너뛰고 알파벳 순서만 세기 위함

    for (let i = 0; i < word.length; i++) {
      if (word[i] === ' ') {
        masked += ' '; // 띄어쓰기는 그대로 유지
      } else {
        if (step === 2) {
          // letterCount가 홀수일 때(즉 짝수 번째 글자) 가림
          masked += (letterCount % 2 !== 0) ? '_' : word[i];
        } else if (step === 3) {
          masked += '_';
        }
        letterCount++;
      }
    }
    return masked;
  };

  // 엔터 키나 확인 버튼을 눌렀을 때 정답 체크
  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputValue.trim()) return;

    const currentWord = words[currentIndex].eng.toLowerCase();
    
    // 정답!
    if (inputValue.trim().toLowerCase() === currentWord) {
      if (currentStep < 3) {
        // 1, 2단계를 통과하면 다음 단계로
        setCurrentStep((prev) => (prev + 1) as 1 | 2 | 3);
        setInputValue('');
        setTimeout(() => inputRef.current?.focus(), 100);
      } else {
        // 3단계를 통과하면 단어 완벽 마스터! (+1점)
        speakText(words[currentIndex].eng);
        setScore((prev) => prev + 1);
        
        if (currentIndex + 1 < words.length) {
          setCurrentIndex((prev) => prev + 1);
          setCurrentStep(1);
          setInputValue('');
          setTimeout(() => inputRef.current?.focus(), 100);
        } else {
          // 모든 단어 완료
          saveLogToDB(score + 1);
          setGameState('result');
        }
      }
    } else {
      // 오답! 화면 부르르 떨림 애니메이션 발동
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 400); // 0.4초 뒤 떨림 해제
    }
  };

  // 게임 진행 중일 때 화면 렌더링을 위해 현재 단어 가져오기
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
            border-color: #ef4444 !important; /* 틀리면 테두리 빨간색 */
            background-color: #fef2f2 !important;
          }
          
          .masked-text {
            letter-spacing: 4px;
            font-family: monospace;
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
          <div style={{ fontSize: '56px', marginBottom: '16px' }}>⌨️</div>
          <h2 style={{ margin: '0 0 8px', fontSize: '28px', fontWeight: '800', color: '#111' }}>3단 진화 타이핑</h2>
          <p style={{ fontSize: '15px', color: '#64748b', marginBottom: '12px', lineHeight: '1.6' }}>
            {studentName} 학생, 한 단어를 3번 치며 완벽하게 외워봅시다!<br/>
            <b>1단계(보고 치기) ➡️ 2단계(반 가리기) ➡️ 3단계(안 보고 치기)</b>
          </p>
          {currentBook && (
            <div style={{ display: 'inline-block', background: '#e0f2fe', color: '#0284c7', padding: '4px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: '800', marginBottom: '20px' }}>
              현재 교재: {currentBook}
            </div>
          )}
          <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '12px', marginBottom: '32px', fontSize: '13px', color: '#334155', fontWeight: '700' }}>
            🏆 한 단어(3단계)를 마스터할 때마다 +1점이 오릅니다!
          </div>
          <button onClick={startGame} style={{ width: '100%', padding: '18px', background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', color: 'white', border: 'none', borderRadius: '16px', fontSize: '18px', fontWeight: '800', cursor: 'pointer', boxShadow: '0 6px 16px rgba(139,92,246,0.2)' }}>
            🚀 타이핑 시작하기
          </button>
        </div>
      )}

      {/* 2. 게임 플레이 화면 */}
      {gameState === 'playing' && currentWordData && (
        <div style={{ animation: 'fadeIn 0.5s ease' }}>
          
          {/* 상단 상태바 (진행도 & 점수) */}
          <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: '16px 20px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: '800', color: '#6366f1', marginBottom: '4px' }}>진행도</div>
              <div style={{ fontSize: '20px', fontWeight: '900', color: '#111' }}>
                {currentIndex + 1} <span style={{fontSize:'14px', color:'#94a3b8'}}>/ {words.length} 단어</span>
              </div>
            </div>
            
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '13px', fontWeight: '800', color: '#f59e0b', marginBottom: '4px' }}>획득 점수</div>
              <div style={{ fontSize: '20px', fontWeight: '900', color: '#111' }}>{score} 점</div>
            </div>
          </div>

          {/* 메인 타이핑 영역 */}
          <div style={{ backgroundColor: 'white', borderRadius: '24px', padding: '32px 20px', boxShadow: '0 12px 32px rgba(0,0,0,0.06)', textAlign: 'center' }}>
            
            {/* 현재 몇 단계인지 표시 */}
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

            {/* 한글 뜻 */}
            <h3 style={{ margin: '0 0 16px 0', fontSize: '26px', fontWeight: '800', color: '#1e293b', wordBreak: 'keep-all' }}>
              {currentWordData.kor}
            </h3>

            {/* 영어 스펠링 (단계별 마스킹) */}
            <div style={{ fontSize: '32px', fontWeight: '900', color: '#007aff', marginBottom: '32px', minHeight: '40px' }} className="masked-text">
              {getMaskedWord(currentWordData.eng, currentStep)}
            </div>

            {/* 입력 폼 */}
            <form onSubmit={handleSubmit} style={{ position: 'relative' }}>
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
                className={isShaking ? 'shake-animation' : ''}
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
                입력 완료 ⏎
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 3. 결과 화면 */}
      {gameState === 'result' && (
        <div style={{ textAlign: 'center', background: 'white', padding: '48px 24px', borderRadius: '24px', boxShadow: '0 12px 32px rgba(0,0,0,0.06)', animation: 'fadeIn 0.5s ease' }}>
          <div style={{ fontSize: '56px', marginBottom: '16px' }}>🏆</div>
          <h2 style={{ fontSize: '28px', fontWeight: '800', margin: '0 0 12px', color: '#111' }}>학습 완료!</h2>
          <p style={{ fontSize: '15px', color: '#64748b', marginBottom: '24px' }}>모든 단어의 3단계를 완벽하게 통과했습니다.</p>
          
          <div style={{ backgroundColor: '#f0fdf4', borderRadius: '20px', padding: '24px', marginBottom: '32px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '15px', fontWeight: '800', color: '#64748b', display: 'block', marginBottom: '8px' }}>최종 랭킹 점수</span>
            <span style={{ fontSize: '42px', fontWeight: '900', color: '#007aff', display: 'block' }}>{score}점</span>
            <div style={{ marginTop: '12px', fontSize: '13px', color: '#10b981', fontWeight: 'bold' }}>✅ 점수가 랭킹에 무사히 반영되었습니다!</div>
          </div>
          
          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={onBack} style={{ flex: 1, padding: '16px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '16px', fontSize: '16px', fontWeight: '800', cursor: 'pointer' }}>
              홈으로
            </button>
            <button onClick={startGame} style={{ flex: 2, padding: '16px', background: '#111', color: 'white', border: 'none', borderRadius: '16px', fontSize: '16px', fontWeight: '800', cursor: 'pointer' }}>
              🔄 다른 단어 학습하기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}