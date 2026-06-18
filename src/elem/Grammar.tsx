import React, { useState, useEffect } from 'react';

interface GrammarProps {
  student: { name: string; grade: string };
  onBack: () => void;
}

interface SheetItem {
  bookId: string;    // 1열: book_id
  english: string;   // 5열: english
  korean: string;    // 6열: korean
}

interface Question {
  question: string;
  koreanTranslation: string; 
  options: string[];
  answer: string;
}

interface RankingItem {
  name: string;
  score: number;
  grade: string;
  date: string;
}

// 🌐 데이터 왜곡과 CORS 차단이 없는 구글 공식 TSV 파일 주소
const GOOGLE_SHEET_TSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTA4Z1o77LMkO66syR0SmqmWPu6q5NapogmBA2iOxpd379nYZ4Gu7y9h7KmGTVb9H9WXNfM5EnFlBxe/pub?gid=752237439&single=true&output=tsv";

// 🚀 원장님의 구글 웹 앱 URL 
const GOOGLE_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbyOAbzxggopAl9QhrG2VHSmo0yCEcdIi89xhgvT5nOWkk9sZbiTtB-XjQd4GVhV4MhE/exec";

export default function Grammar({ student, onBack }: GrammarProps) {
  const [dbData, setDbData] = useState<SheetItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [gameState, setGameState] = useState<'intro' | 'playing' | 'levelUp' | 'result'>('intro');
  const [currentLevel, setCurrentLevel] = useState(1);
  const [correctCount, setCorrectCount] = useState(0); 
  
  const [sentenceDeck, setSentenceDeck] = useState<SheetItem[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  
  const [round, setRound] = useState(1);
  const [timeLeft, setTimeLeft] = useState(10);
  const [hearts, setHearts] = useState(3);
  const [score, setScore] = useState(0);
  const [monthlyRankings, setMonthlyRankings] = useState<RankingItem[]>([]);

  // 🚀 앱 시작 시 저장된 랭킹 정보 불러오기 (안전 처리 추가)
  useEffect(() => {
    const key = getMonthlyStorageKey();
    const existingRaw = localStorage.getItem(key);
    if (existingRaw) {
      try {
        setMonthlyRankings(JSON.parse(existingRaw));
      } catch (error) {
        console.error("랭킹 데이터 로드 오류:", error);
        localStorage.removeItem(key); // 데이터 꼬임 방지를 위해 초기화
      }
    }
  }, []);

  // 1. ⚡ 초고속 실시간 TSV 데이터 파싱 엔진
  useEffect(() => {
    const fetchSheetData = async () => {
      try {
        const response = await fetch(GOOGLE_SHEET_TSV_URL);
        if (!response.ok) throw new Error("네트워크 응답 불량");
        const tsvText = await response.text();
        
        const rows = tsvText.split(/\r?\n/);
        const parsedItems: SheetItem[] = [];

        rows.forEach((row) => {
          const cells = row.split('\t');
          if (cells.length >= 6) {
            const bookId = cells[0]?.trim() || '';
            const english = cells[4]?.trim() || '';
            const korean = cells[5]?.trim() || '';
            
            if (bookId && bookId !== 'book_id' && english && korean) {
              parsedItems.push({ bookId, english, korean });
            }
          }
        });

        setDbData(parsedItems);
        setIsLoading(false);
      } catch (error) {
        console.error("구글 시트 연동 실패 -> 백업 디펜스 데이터 로드:", error);
        setDbData([
          { bookId: "240_1", english: "I am a smart student.", korean: "나는 똑똑한 학생이다." },
          { bookId: "240_4", english: "Look at the giant blue whale.", korean: "저 거대한 푸른 고래를 보아라." }
        ]);
        setIsLoading(false);
      }
    };

    fetchSheetData();
  }, []);

  const getMonthlyStorageKey = (): string => {
    const now = new Date();
    return `ranking_${now.getFullYear()}_${now.getMonth() + 1}`;
  };

  const getSentencesForStage = (stage: number): SheetItem[] => {
    let targetPrefix = "";
    let isUpperVol = false; 

    switch (stage) {
      case 1: targetPrefix = "240"; isUpperVol = false; break;
      case 2: targetPrefix = "240"; isUpperVol = true; break;
      case 3: targetPrefix = "520"; isUpperVol = false; break;
      case 4: targetPrefix = "520"; isUpperVol = true; break;
      case 5: targetPrefix = "860"; isUpperVol = false; break;
      case 6: targetPrefix = "860"; isUpperVol = true; break;
      case 7: targetPrefix = "1240"; isUpperVol = false; break;
      case 8: targetPrefix = "1240"; isUpperVol = true; break;
      case 9: targetPrefix = "1680"; isUpperVol = false; break;
      case 10: targetPrefix = "1680"; isUpperVol = true; break;
      default: targetPrefix = "240";
    }

    let filtered = dbData.filter(d => {
      const parts = d.bookId.split(/[_ \-]/);
      const vol = parseInt(parts[1] || '1', 10);
      const matchesVol = isUpperVol ? vol >= 4 : vol <= 3;
      return d.bookId.startsWith(targetPrefix) && matchesVol;
    });

    if (filtered.length === 0 && (stage === 9 || stage === 10)) {
      filtered = dbData.filter(d => {
        const parts = d.bookId.split(/[_ \-]/);
        const vol = parseInt(parts[1] || '1', 10);
        const matchesVol = stage === 10 ? vol >= 4 : vol <= 3;
        return d.bookId.startsWith("1240") && matchesVol;
      });
    }

    return filtered.length > 0 ? filtered : dbData;
  };

  const createShuffledDeck = (level: number): SheetItem[] => {
    return [...getSentencesForStage(level)].sort(() => Math.random() - 0.5);
  };

  const makeQuizFromSentence = (sentenceItem: SheetItem): Question => {
    const words = sentenceItem.english.split(/\s+/);
    const cleanWords = words.map(w => w.replace(/[.,!?]/g, ""));
    const stopwords = ["the", "and", "for", "with", "this", "that", "from", "are", "is", "am", "you", "they", "to", "in", "on", "at", "a", "an"];
    
    const candidates = cleanWords.filter(w => w.length > 2 && !stopwords.includes(w.toLowerCase()));
    const targetWordClean = candidates.length > 0 ? candidates[Math.floor(Math.random() * candidates.length)] : cleanWords[0];
    
    const allOtherWords = dbData
      .map(d => d.english.split(/\s+/).map(w => w.replace(/[.,!?]/g, "")))
      .flat()
      .filter(w => w.toLowerCase() !== targetWordClean.toLowerCase() && w.length > 2 && !stopwords.includes(w.toLowerCase()));
    
    const distractors = Array.from(new Set(allOtherWords)).sort(() => Math.random() - 0.5).slice(0, 3);
    const finalOptions = [targetWordClean, ...distractors].sort(() => Math.random() - 0.5);
    
    const regex = new RegExp(`\\b${targetWordClean}\\b`, 'gi');
    const questionText = sentenceItem.english.replace(regex, "______");
    
    return {
      question: questionText,
      koreanTranslation: sentenceItem.korean, 
      options: finalOptions,
      answer: targetWordClean
    };
  };

  const startGame = () => {
    if (dbData.length === 0) return;
    const initialDeck = createShuffledDeck(1);
    const firstSentence = initialDeck.shift();
    
    setCurrentLevel(1);
    setCorrectCount(0);
    setScore(0);
    setRound(1);
    setHearts(3);
    setTimeLeft(10);
    
    if (firstSentence) {
      setSentenceDeck(initialDeck);
      setCurrentQuestion(makeQuizFromSentence(firstSentence));
    }
    setGameState('playing');
  };

  useEffect(() => {
    if (gameState !== 'playing') return;
    if (timeLeft === 0) {
      handleNextQuestion(false);
      return;
    }
    const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft, gameState]);

  const handleAnswer = (selected: string) => {
    if (!currentQuestion) return;
    const isCorrect = selected.toLowerCase() === currentQuestion.answer.toLowerCase();
    handleNextQuestion(isCorrect);
  };

  const handleNextQuestion = (isCorrect: boolean) => {
    let nextLevel = currentLevel;
    let nextCorrectCount = correctCount;
    let triggerLevelUp = false;

    if (isCorrect) {
      setScore((prev) => prev + 10);
      nextCorrectCount += 1;
      
      if (nextCorrectCount === 10 && currentLevel < 10) {
        nextLevel = currentLevel + 1;
        nextCorrectCount = 0;
        triggerLevelUp = true;
      }
      setCorrectCount(nextCorrectCount);
    } else {
      const newHearts = hearts - 1;
      setHearts(newHearts);
      if (newHearts === 0) {
        saveAndLoadRankings(); // 게임 오버 시 점수 저장 실행
        setGameState('result');
        return;
      }
    }

    if (triggerLevelUp) {
      setCurrentLevel(nextLevel);
      setGameState('levelUp');
    } else {
      let activeDeck = [...sentenceDeck];
      if (activeDeck.length === 0) activeDeck = createShuffledDeck(nextLevel);
      
      const nextSentence = activeDeck.shift();
      if (nextSentence) {
        setSentenceDeck(activeDeck);
        setCurrentQuestion(makeQuizFromSentence(nextSentence));
      }
      setRound((prev) => prev + 1);
      setTimeLeft(10);
    }
  };

  const confirmLevelUp = () => {
    const nextDeck = createShuffledDeck(currentLevel);
    const nextSentence = nextDeck.shift();
    if (nextSentence) {
      setSentenceDeck(nextDeck);
      setCurrentQuestion(makeQuizFromSentence(nextSentence));
    }
    setRound((prev) => prev + 1);
    setTimeLeft(10);
    setGameState('playing');
  };

  // 🚀 [핵심 추가] 구글 시트5로 점수를 실시간 전송하는 백엔드 함수
  const sendScoreToGoogleSheet = async (finalScore: number, finalStage: number) => {
    const payload = {
      timestamp: new Date().toLocaleString('ko-KR'),
      student_name: student.name,
      grade: student.grade,
      score: finalScore,
      stage: finalStage
    };

    try {
      await fetch(GOOGLE_WEB_APP_URL, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain;charset=utf-8",
        },
        body: JSON.stringify(payload),
      });
      console.log("구글 시트5로 실시간 데이터 누적 성공!");
    } catch (error) {
      console.error("구글 시트 전송 실패:", error);
    }
  };

  // 🚀 데이터 저장 통합 함수 (로컬 저장 + 구글 시트 전송)
  const saveAndLoadRankings = () => {
    const key = getMonthlyStorageKey();
    const existingRaw = localStorage.getItem(key);
    let list: RankingItem[] = [];
    
    if (existingRaw) {
      try {
        list = JSON.parse(existingRaw);
      } catch (error) {
        list = [];
      }
    }

    const newRecord: RankingItem = {
      name: student.name,
      score: score,
      grade: student.grade,
      date: new Date().toISOString()
    };
    list.push(newRecord);

    const sortedList = list.sort((a, b) => b.score - a.score).slice(0, 5);
    localStorage.setItem(key, JSON.stringify(sortedList));
    setMonthlyRankings(sortedList);

    // ⭐ 구글 시트 전송
    sendScoreToGoogleSheet(score, currentLevel);
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f0f4f8' }}>
        <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#007aff' }}>🔄 구글 시트 교재 문장 동기화 중...</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f0f4f8', fontFamily: 'Pretendard, sans-serif' }}>
      <div style={{ background: 'white', padding: '40px', borderRadius: '24px', textAlign: 'center', width: '380px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', position: 'relative' }}>
        
        <button 
          onClick={onBack} 
          style={{ position: 'absolute', top: '24px', left: '24px', background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', zIndex: 10, color: '#333' }}
        >
          ◀
        </button>
        
        {/* 1. 대기 화면 */}
        {gameState === 'intro' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ fontSize: '64px', lineHeight: '1', marginBottom: '16px', marginTop: '20px' }}>📖</div>
            
            <h2 style={{ margin: '0 0 20px 0', fontSize: '26px', fontWeight: '800', color: '#333', letterSpacing: '-0.5px' }}>
              생각 랭킹전
            </h2>
            
            {/* 항상 랭킹창이 보이도록 수정된 부분 */}
            <div style={{ width: '100%', background: '#f8fafc', borderRadius: '16px', padding: '16px', marginBottom: '24px', textAlign: 'left', border: '1px solid #e2e8f0' }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#64748b', fontWeight: 'bold', textAlign: 'center' }}>🏆 {new Date().getMonth() + 1}월 TOP 5 랭킹</h4>
              
              {monthlyRankings.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {monthlyRankings.map((player, idx) => {
                    const isMe = player.name === student.name;
                    return (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', backgroundColor: isMe ? '#e0f2fe' : 'transparent', borderRadius: '8px' }}>
                        <span style={{ fontWeight: isMe ? '700' : '500', fontSize: '14px', color: isMe ? '#0369a1' : '#334155' }}>
                          {idx + 1}등. {player.name}
                        </span>
                        <span style={{ fontWeight: '700', fontSize: '14px', color: isMe ? '#0369a1' : '#475569' }}>{player.score}점</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '10px', color: '#94a3b8', fontSize: '14px', fontWeight: '500' }}>
                  아직 이번 달 기록이 없습니다.<br/>첫 번째 랭커에 도전하세요! 🚀
                </div>
              )}
            </div>

            <button 
              onClick={startGame} 
              style={{ width: '100%', padding: '16px', backgroundColor: '#007aff', color: 'white', border: 'none', borderRadius: '14px', fontWeight: '700', fontSize: '16px', cursor: 'pointer', transition: 'background 0.2s' }}
            >
              서바이벌 퀴즈 시작!
            </button>
          </div>
        )}

        {/* 2. 게임 진행 화면 */}
        {gameState === 'playing' && currentQuestion && (
          <div style={{ textAlign: 'left', marginTop: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <span style={{ backgroundColor: '#ff9500', padding: '6px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: '700', color: 'white' }}>
                {currentLevel === 10 ? "🔥 MAX 10단계" : `${currentLevel}단계`} ({correctCount}/10)
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span>{Array.from({ length: 3 }).map((_, i) => (<span key={i} style={{ filter: i < hearts ? 'none' : 'grayscale(100%)', opacity: i < hearts ? 1 : 0.3 }}>❤️</span>))}</span>
                <span style={{ fontSize: '18px', fontWeight: '800', color: '#333' }}>⏱️ {timeLeft}초</span>
              </div>
            </div>
            
            <div style={{ width: '100%', height: '6px', backgroundColor: '#edf2f7', borderRadius: '3px', marginBottom: '30px', overflow: 'hidden' }}>
              <div style={{ width: `${(timeLeft / 10) * 100}%`, height: '100%', backgroundColor: '#007aff', transition: 'width 1s linear' }} />
            </div>

            <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#1a202c', margin: '0 0 12px 0', minHeight: '50px', lineHeight: '1.4' }}>
              {currentQuestion.question}
            </h3>

            <div style={{ backgroundColor: '#f1f5f9', padding: '12px 16px', borderRadius: '12px', color: '#475569', fontSize: '14px', fontWeight: '500', lineHeight: '1.4', marginBottom: '32px' }}>
              뜻: {currentQuestion.koreanTranslation}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {currentQuestion.options.map((option, idx) => (
                <button 
                  key={idx} 
                  onClick={() => handleAnswer(option)} 
                  style={{ width: '100%', padding: '15px', backgroundColor: '#f8fafc', border: '2px solid #e2e8f0', borderRadius: '14px', fontSize: '15px', fontWeight: '600', color: '#1a202c', cursor: 'pointer', textAlign: 'left', paddingLeft: '24px' }}
                >
                  <span style={{ marginRight: '12px', color: '#007aff' }}>{idx + 1}.</span> {option}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 3. 레벨업 알림 화면 */}
        {gameState === 'levelUp' && (
          <div style={{ marginTop: '30px' }}>
            <div style={{ fontSize: '70px', marginBottom: '16px' }}>🚀</div>
            <h2 style={{ margin: '0 0 12px 0', fontSize: '28px', fontWeight: '900', color: '#007aff' }}>STAGE UP!</h2>
            <p style={{ color: '#333', fontSize: '16px', lineHeight: '1.6', marginBottom: '32px' }}>
              완벽합니다! 다음 관문으로 도약합니다.<br/>
              지금부터 <strong>{currentLevel}단계</strong> 난이도 교재의<br/>
              새로운 카드덱이 배치됩니다.
            </p>
            <button onClick={confirmLevelUp} style={{ width: '100%', padding: '16px', backgroundColor: '#ff9500', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '700', fontSize: '16px', cursor: 'pointer' }}>
              도전 계속하기
            </button>
          </div>
        )}

        {/* 4. 결과 및 월간 명예의 전당 화면 */}
        {gameState === 'result' && (
          <div style={{ marginTop: '30px' }}>
            <div style={{ fontSize: '50px', marginBottom: '8px' }}>💀</div>
            <h2 style={{ margin: '0', fontSize: '24px', fontWeight: '800', color: '#ff3b30' }}>GAME OVER</h2>
            <p style={{ margin: '8px 0 24px 0', fontSize: '15px', color: '#4a5568' }}>
              최종 도달: <strong>{currentLevel}단계</strong><br/>
              이번 달 획득 점수: <strong style={{ color: '#007aff', fontSize: '20px' }}>{score}</strong> 점
            </p>

            <div style={{ background: '#f8fafc', borderRadius: '16px', padding: '16px', marginBottom: '24px', textAlign: 'left' }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#64748b', fontWeight: 'bold' }}>🗓️ {new Date().getMonth() + 1}월 실시간 TOP 5 랭킹</h4>
              
              {monthlyRankings.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {monthlyRankings.map((player, idx) => {
                    const isMe = player.name === student.name;
                    return (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', backgroundColor: isMe ? '#e0f2fe' : 'transparent', borderRadius: '8px', border: isMe ? '1px solid #7dd3fc' : 'none' }}>
                        <span style={{ fontWeight: isMe ? '700' : '500', fontSize: '14px', color: isMe ? '#0369a1' : '#334155' }}>
                          {idx + 1}등. {player.name} ({player.grade})
                        </span>
                        <span style={{ fontWeight: '700', fontSize: '14px', color: isMe ? '#0369a1' : '#475569' }}>{player.score}점</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '10px', color: '#94a3b8', fontSize: '14px', fontWeight: '500' }}>
                  이번 달 첫 번째 랭커가 되어보세요! 🚀
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={startGame} style={{ flex: 1, padding: '14px', backgroundColor: '#e2e8f0', color: '#475569', border: 'none', borderRadius: '10px', fontWeight: '700', cursor: 'pointer' }}>재도전</button>
              <button onClick={onBack} style={{ flex: 1, padding: '14px', backgroundColor: '#007aff', color: 'white', border: 'none', borderRadius: '10px', fontWeight: '700', cursor: 'pointer' }}>메인으로</button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}