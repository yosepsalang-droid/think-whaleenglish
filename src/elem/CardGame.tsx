import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface CardGameProps {
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

interface Card {
  uid: string; 
  wordId: number; 
  text: string; 
  type: 'eng' | 'kor'; 
}

export default function CardGame({ onBack, studentId, studentName, currentBook, tableName = 'words', onGameComplete }: CardGameProps) {
  const [allWordsDb, setAllWordsDb] = useState<Word[]>([]);
  const [gameState, setGameState] = useState<'intro' | 'playing' | 'stageClear' | 'gameOver' | 'result'>('intro');
  
  const [cards, setCards] = useState<Card[]>([]);
  const [flippedIndices, setFlippedIndices] = useState<number[]>([]);
  const [matchedIds, setMatchedIds] = useState<number[]>([]);
  
  const [isLocked, setIsLocked] = useState(false);

  const [stage, setStage] = useState(1);
  const [hearts, setHearts] = useState(5);
  const [score, setScore] = useState(0);
  
  const [stageClearScore, setStageClearScore] = useState(0); 
  const [isPeeking, setIsPeeking] = useState(false);

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

  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  const saveLogToDB = async (finalScore: number, finalStage: number, statusText: string) => {
    if (finalScore === 0) return; 

    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    try {
      await supabase.from('learning_logs').insert([{
        student_id: studentId,
        student_name: studentName,
        task_type: '단어 카드게임',
        book_info: `Stage ${finalStage} (${statusText})`,
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

  const startNewGame = () => {
    if (allWordsDb.length < 5) {
      return alert(`[${currentBook}] 교재의 단어가 부족합니다. (최소 5개 이상 필요)`);
    }
    setStage(1);
    setHearts(5);
    setScore(0);
    generateStage(1, 0); 
  };

  const generateStage = (targetStage: number, currentScore: number) => {
    // 💡 [핵심 난이도 패치] 스테이지 숫자 = 불러올 단어 개수
    // 1단계: 단어 1개 (카드 2장)
    // 2단계: 단어 2개 (카드 4장)
    // 3단계: 단어 3개 (카드 6장) ...
    const wordCountForStage = targetStage;
    
    if (wordCountForStage > allWordsDb.length) {
       setGameState('result');
       saveLogToDB(currentScore, targetStage - 1, '올클리어'); 
       return;
    }

    const shuffledWords = [...allWordsDb].sort(() => Math.random() - 0.5).slice(0, wordCountForStage);
    const gameCards: Card[] = [];
    
    shuffledWords.forEach((word) => {
      gameCards.push({ uid: `${word.id}-eng`, wordId: word.id, text: word.eng, type: 'eng' });
      gameCards.push({ uid: `${word.id}-kor`, wordId: word.id, text: word.kor, type: 'kor' });
    });

    gameCards.sort(() => Math.random() - 0.5);

    setCards(gameCards);
    setMatchedIds([]);
    setGameState('playing');

    setIsLocked(true);
    setIsPeeking(true);
    setFlippedIndices(gameCards.map((_, i) => i)); 
    
    setTimeout(() => {
      setFlippedIndices([]); 
      setIsLocked(false);
      setIsPeeking(false);
    }, 3000);
  };

  const handleCardClick = (index: number) => {
    if (isLocked || flippedIndices.includes(index) || matchedIds.includes(cards[index].wordId)) return;

    const newFlipped = [...flippedIndices, index];
    setFlippedIndices(newFlipped);

    if (cards[index].type === 'eng') {
      speakText(cards[index].text);
    }

    if (newFlipped.length === 2) {
      setIsLocked(true);

      const firstCard = cards[newFlipped[0]];
      const secondCard = cards[newFlipped[1]];

      if (firstCard.wordId === secondCard.wordId) {
        const newMatched = [...matchedIds, firstCard.wordId];
        setMatchedIds(newMatched);
        setFlippedIndices([]);
        setIsLocked(false);

        if (newMatched.length === cards.length / 2) {
          setTimeout(() => {
            const earnedScore = stage; 
            setStageClearScore(earnedScore);
            setScore((prev) => prev + earnedScore);
            
            setHearts((prevHearts) => Math.min(prevHearts + 1, 5));

            setGameState('stageClear');
          }, 800);
        }
      } else {
        setTimeout(() => {
          setHearts((prev) => {
            const newHearts = prev - 1;
            if (newHearts <= 0) {
              setGameState('gameOver');
              saveLogToDB(score, stage, '게임오버'); 
            }
            return newHearts;
          });
          setFlippedIndices([]);
          setIsLocked(false);
        }, 1000);
      }
    }
  };

  const handleNextStage = () => {
    generateStage(stage + 1, score);
    setStage((prev) => prev + 1);
  };

  // 💡 [배열 패치] 카드 개수에 맞춰 화면이 찌그러지지 않고 예쁘게 나오도록 수정
  const getGridColumns = () => {
    const totalCards = cards.length;
    if (totalCards === 2) return 'repeat(2, 1fr)'; // 1단계: 2장
    if (totalCards === 4) return 'repeat(2, 1fr)'; // 2단계: 4장
    if (totalCards === 6) return 'repeat(3, 1fr)'; // 3단계: 6장
    if (totalCards === 8) return 'repeat(4, 1fr)'; // 4단계: 8장
    if (totalCards === 10) return 'repeat(5, 1fr)'; // 5단계: 10장
    return 'repeat(4, 1fr)'; // 그 이상은 4칸씩 줄바꿈
  };

  return (
    <div style={{ padding: '20px', width: '100%', maxWidth: '600px', boxSizing: 'border-box', margin: '0 auto', fontFamily: 'Pretendard, sans-serif' }}>
      
      <style>
        {`
          .card-container {
            perspective: 1000px;
            cursor: pointer;
            aspect-ratio: 3 / 4;
            max-width: 150px;
            margin: 0 auto;
            width: 100%;
          }
          .card-inner {
            position: relative;
            width: 100%;
            height: 100%;
            transition: transform 0.6s cubic-bezier(0.4, 0.2, 0.2, 1);
            transform-style: preserve-3d;
          }
          .card-flipped .card-inner {
            transform: rotateY(180deg);
          }
          .card-front, .card-back {
            position: absolute;
            width: 100%;
            height: 100%;
            backface-visibility: hidden;
            border-radius: 16px;
            display: flex;
            justify-content: center;
            align-items: center;
            text-align: center;
            padding: 12px;
            box-sizing: border-box;
            box-shadow: 0 4px 12px rgba(0,0,0,0.08);
          }
          .card-front {
            background: linear-gradient(135deg, #007aff, #5ac8fa);
            color: white;
            font-size: 36px;
            font-weight: 900;
          }
          .card-back {
            background: white;
            transform: rotateY(180deg);
            border: 2px solid #e2e8f0;
          }
          .card-matched {
            opacity: 0.3;
            transform: scale(0.95);
            transition: all 0.3s ease;
          }
          
          @keyframes pulseHint {
            0% { transform: translateX(-50%) scale(1); }
            50% { transform: translateX(-50%) scale(1.05); }
            100% { transform: translateX(-50%) scale(1); }
          }
        `}
      </style>

      <button onClick={onBack} style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: 'white', border: '1px solid #eaeaea', borderRadius: '12px', fontWeight: '700', cursor: 'pointer', color: '#555', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
        학습 홈으로
      </button>

      {gameState === 'intro' && (
        <div style={{ textAlign: 'center', background: 'white', padding: '48px 24px', borderRadius: '24px', boxShadow: '0 12px 32px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '56px', marginBottom: '16px' }}>❤️</div>
          <h2 style={{ margin: '0 0 8px', fontSize: '28px', fontWeight: '800', color: '#111' }}>서바이벌 단어 짝맞추기</h2>
          <p style={{ fontSize: '15px', color: '#64748b', marginBottom: '12px', lineHeight: '1.5' }}>
            {studentName} 학생, 목숨(하트)은 5개로 시작합니다!<br/>
            시작 전 <b>3초 동안 위치를 보여주니</b> 집중해서 외워주세요.
          </p>
          {currentBook && (
            <div style={{ display: 'inline-block', background: '#e0f2fe', color: '#0284c7', padding: '4px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: '800', marginBottom: '20px' }}>
              현재 교재: {currentBook}
            </div>
          )}
          <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '12px', marginBottom: '32px', fontSize: '13px', color: '#334155', fontWeight: '700', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span>🔥 <b>스테이지 숫자가 곧 획득 점수</b>입니다! (2단계=2점)</span>
            <span>💖 <b>스테이지를 깨면 하트가 1개 회복</b>됩니다!</span>
          </div>
          <button onClick={startNewGame} style={{ width: '100%', padding: '18px', background: 'linear-gradient(135deg, #ff3b30, #ff9500)', color: 'white', border: 'none', borderRadius: '16px', fontSize: '18px', fontWeight: '800', cursor: 'pointer', boxShadow: '0 6px 16px rgba(255,59,48,0.2)' }}>
            🎮 서바이벌 시작
          </button>
        </div>
      )}

      {gameState === 'playing' && (
        <div style={{ animation: 'fadeIn 0.5s ease', position: 'relative' }}>
          
          <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: '16px 20px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: '800', color: '#007aff', marginBottom: '4px' }}>STAGE {stage}</div>
              <div style={{ fontSize: '22px', fontWeight: '900', color: '#111', lineHeight: '1' }}>{score} <span style={{fontSize:'14px', color:'#64748b'}}>점</span></div>
            </div>
            
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '13px', fontWeight: '800', color: '#ff3b30', marginBottom: '4px' }}>생명</div>
              <div style={{ fontSize: '20px', letterSpacing: '2px' }}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <span key={i}>{i < hearts ? '❤️' : '🖤'}</span>
                ))}
              </div>
            </div>
          </div>

          {isPeeking && (
            <div style={{ position: 'absolute', top: '100px', left: '50%', transform: 'translateX(-50%)', backgroundColor: 'rgba(0,0,0,0.8)', color: 'white', padding: '12px 24px', borderRadius: '30px', fontWeight: '800', fontSize: '16px', zIndex: 100, animation: 'pulseHint 1s infinite' }}>
              👀 집중! 위치를 기억하세요!
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: getGridColumns(), gap: '12px', width: '100%' }}>
            {cards.map((card, index) => {
              const isFlipped = flippedIndices.includes(index) || matchedIds.includes(card.wordId);
              const isMatched = matchedIds.includes(card.wordId);

              return (
                <div 
                  key={index} 
                  className={`card-container ${isFlipped ? 'card-flipped' : ''} ${isMatched ? 'card-matched' : ''}`}
                  onClick={() => handleCardClick(index)}
                >
                  <div className="card-inner">
                    <div className="card-front">?</div>
                    <div className="card-back" style={{ border: isMatched ? '3px solid #4caf50' : '2px solid #e2e8f0', backgroundColor: isMatched ? '#f0fdf4' : 'white' }}>
                      <span style={{ 
                        fontSize: card.type === 'eng' ? (card.text.length > 8 ? '16px' : '20px') : '18px', 
                        fontWeight: '900', 
                        color: card.type === 'eng' ? '#007aff' : '#111',
                        wordBreak: 'keep-all',
                        lineHeight: '1.2'
                      }}>
                        {card.text}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {gameState === 'stageClear' && (
        <div style={{ textAlign: 'center', background: 'white', padding: '48px 24px', borderRadius: '24px', boxShadow: '0 12px 32px rgba(0,0,0,0.06)', animation: 'fadeIn 0.4s ease' }}>
          <div style={{ fontSize: '56px', marginBottom: '16px' }}>✨</div>
          <h2 style={{ fontSize: '26px', fontWeight: '800', margin: '0 0 12px', color: '#111' }}>{stage}단계 클리어!</h2>
          <div style={{ backgroundColor: '#f8fafc', borderRadius: '16px', padding: '20px', marginBottom: '32px' }}>
            <div style={{ fontSize: '16px', fontWeight: '800', color: '#64748b', marginBottom: '12px' }}>
              스테이지 클리어 점수: <b style={{color: '#ff3b30', fontSize: '20px'}}>+{stageClearScore}점</b>
            </div>
            <div style={{ fontSize: '15px', fontWeight: '700', color: '#10b981', marginBottom: '16px' }}>
              💖 보상: 하트 1개 회복!
            </div>
            <div style={{ fontSize: '15px', fontWeight: '800', color: '#111', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
              현재 총점: <span style={{ fontSize: '28px', color: '#007aff' }}>{score}</span> 점
            </div>
          </div>
          <button onClick={handleNextStage} style={{ width: '100%', padding: '18px', background: 'linear-gradient(135deg, #007aff, #0056b3)', color: 'white', border: 'none', borderRadius: '16px', fontSize: '18px', fontWeight: '800', cursor: 'pointer', boxShadow: '0 6px 16px rgba(0,122,255,0.2)' }}>
            다음 단계 도전하기 ➡
          </button>
        </div>
      )}

      {gameState === 'gameOver' && (
        <div style={{ textAlign: 'center', background: 'white', padding: '48px 24px', borderRadius: '24px', boxShadow: '0 12px 32px rgba(0,0,0,0.06)', animation: 'fadeIn 0.5s ease' }}>
          <div style={{ fontSize: '56px', marginBottom: '16px' }}>☠️</div>
          <h2 style={{ fontSize: '28px', fontWeight: '800', margin: '0 0 12px', color: '#ef4444' }}>GAME OVER</h2>
          <p style={{ fontSize: '15px', color: '#64748b', marginBottom: '24px' }}>하트를 모두 소진했습니다.</p>
          
          <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '20px', padding: '24px', marginBottom: '32px' }}>
            <span style={{ fontSize: '14px', fontWeight: '800', color: '#991b1b', display: 'block', marginBottom: '8px' }}>최종 기록</span>
            <div style={{ fontSize: '20px', fontWeight: '800', color: '#b91c1c', marginBottom: '4px' }}>도달 단계: STAGE {stage}</div>
            <div style={{ fontSize: '32px', fontWeight: '900', color: '#ef4444' }}>{score}점</div>
            {score > 0 && <div style={{ marginTop: '12px', fontSize: '13px', color: '#ef4444', fontWeight: 'bold' }}>✅ 점수가 랭킹에 무사히 반영되었습니다!</div>}
          </div>
          
          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={onBack} style={{ flex: 1, padding: '16px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '16px', fontSize: '16px', fontWeight: '800', cursor: 'pointer' }}>
              종료
            </button>
            <button onClick={startNewGame} style={{ flex: 2, padding: '16px', background: '#111', color: 'white', border: 'none', borderRadius: '16px', fontSize: '16px', fontWeight: '800', cursor: 'pointer' }}>
              🔄 다시 도전
            </button>
          </div>
        </div>
      )}
      
      {gameState === 'result' && (
        <div style={{ textAlign: 'center', background: 'white', padding: '48px 24px', borderRadius: '24px', boxShadow: '0 12px 32px rgba(0,0,0,0.06)', animation: 'fadeIn 0.5s ease' }}>
          <div style={{ fontSize: '56px', marginBottom: '16px' }}>🏆</div>
          <h2 style={{ fontSize: '28px', fontWeight: '800', margin: '0 0 12px', color: '#111' }}>모든 단어 마스터!</h2>
          <p style={{ fontSize: '15px', color: '#64748b', marginBottom: '24px' }}>준비된 모든 카드를 뒤집었습니다.</p>
          
          <div style={{ backgroundColor: '#f0fdf4', borderRadius: '20px', padding: '24px', marginBottom: '32px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '15px', fontWeight: '800', color: '#64748b', display: 'block', marginBottom: '8px' }}>최종 랭킹 점수</span>
            <span style={{ fontSize: '42px', fontWeight: '900', color: '#007aff', display: 'block' }}>{score}점</span>
            <div style={{ marginTop: '12px', fontSize: '13px', color: '#10b981', fontWeight: 'bold' }}>✅ 점수가 랭킹에 무사히 반영되었습니다!</div>
          </div>
          
          <button onClick={onBack} style={{ width: '100%', padding: '18px', background: '#111', color: 'white', border: 'none', borderRadius: '16px', fontSize: '18px', fontWeight: '800', cursor: 'pointer' }}>
            학습 홈으로 돌아가기
          </button>
        </div>
      )}
    </div>
  );
}