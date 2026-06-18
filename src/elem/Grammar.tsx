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

// 🌐 1. 문장 데이터 전송용 TSV 주소
const GOOGLE_SHEET_TSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTA4Z1o77LMkO66syR0SmqmWPu6q5NapogmBA2iOxpd379nYZ4Gu7y9h7KmGTVb9H9WXNfM5EnFlBxe/pub?gid=752237439&single=true&output=tsv";

// 🚀 2. 점수 누적용 원장님의 구글 웹 앱 URL 
const GOOGLE_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbyOAbzxggopAl9QhrG2VHSmo0yCEcdIi89xhgvT5nOWkk9sZbiTtB-XjQd4GVhV4MhE/exec";

// 🏆 3. [여기에 복사한 CSV 주소를 꼭 붙여넣으세요!]
const GOOGLE_SHEET_RANKING_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTA4Z1o77LMkO66syR0SmqmWPu6q5NapogmBA2iOxpd379nYZ4Gu7y9h7KmGTVb9H9WXNfM5EnFlBxe/pub?gid=1601616668&single=true&output=csv"; 

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

  // 🛠️ 랭킹 데이터 불러오기 로직 (에러 화면 표시 기능 추가)
  const fetchGlobalRankings = async () => {
    if (!GOOGLE_SHEET_RANKING_CSV_URL || GOOGLE_SHEET_RANKING_CSV_URL.includes("여기를_지우고")) {
      setMonthlyRankings([{ name: "⚠️ CSV 주소가 미입력됨", score: 0, grade: "원장님확인", date: "" }]);
      return;
    }
    
    try {
      const response = await fetch(`${GOOGLE_SHEET_RANKING_CSV_URL}&_nocache=${Date.now()}`);
      if (!response.ok) throw new Error("랭킹 데이터 로드 실패");
      const text = await response.text();
      
      // 구글 시트 주소가 잘못되어 HTML 페이지(로그인 화면 등)를 불러왔을 때의 방어 로직
      if (text.trim().startsWith('<')) {
        setMonthlyRankings([{ name: "⚠️ CSV가 아닌 일반 주소 입력됨", score: 0, grade: "웹게시확인", date: "" }]);
        return;
      }
      
      const rows = text.split(/\r?\n/);
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;
      
      const bestScoresMap: { [studentName: string]: RankingItem } = {};
      let validDataCount = 0;
      
      rows.forEach((row, index) => {
        if (index === 0 || !row.trim()) return;
        
        const cells = row.split(',');
        if (cells.length >= 4) {
          const timestamp = cells[0]?.replace(/"/g, '').trim();
          const name = cells[1]?.replace(/"/g, '').trim();
          const grade = cells[2]?.replace(/"/g, '').trim();
          const scoreNum = parseInt(cells[3]?.replace(/"/g, '').trim(), 10) || 0;
          
          if (!name || name === "student_name") return;

          let isCurrentMonth = false;
          const dateMatch = timestamp.match(/(\d{4})\.\s*(\d{1,2})/);
          
          if (dateMatch) {
            const y = parseInt(dateMatch[1], 10);
            const m = parseInt(dateMatch[2], 10);
            if (y === currentYear && m === currentMonth) isCurrentMonth = true;
          } else {
             // 날짜 포맷이 달라도 우선 데이터는 노출하도록 허용 (디버깅 용이)
             isCurrentMonth = true; 
          }
          
          if (isCurrentMonth) {
            validDataCount++;
            if (!bestScoresMap[name] || bestScoresMap[name].score < scoreNum) {
              bestScoresMap[name] = { name, score: scoreNum, grade, date: timestamp };
            }
          }
        }
      });
      
      const sortedList = Object.values(bestScoresMap)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);
        
      if (sortedList.length > 0) {
        setMonthlyRankings(sortedList);
        localStorage.setItem('global_rankings_cache', JSON.stringify(sortedList));
      } else if (validDataCount > 0) {
          // 데이터는 있지만 이번 달 데이터가 없는 경우
          // 조건 없이 일단 탑 5 보여주기
          const allTimeList = Object.values(bestScoresMap).sort((a, b) => b.score - a.score).slice(0, 5);
          setMonthlyRankings(allTimeList);
      }
    } catch (error) {
      console.error("동기화 실패:", error);
      // 로컬 캐시라도 띄워주기
      const localCache = localStorage.getItem('global_rankings_cache');
      if (localCache) {
          setMonthlyRankings(JSON.parse(localCache));
      } else {
          setMonthlyRankings([{ name: "⚠️ 네트워크 로드 실패", score: 0, grade: "인터넷확인", date: "" }]);
      }
    }
  };

  useEffect(() => {
    const localCache = localStorage.getItem('global_rankings_cache');
    if (localCache) {
      try { setMonthlyRankings(JSON.parse(localCache)); } catch (e) {}
    }
    
    fetchGlobalRankings();
    const interval = setInterval(fetchGlobalRankings, 15000); // 15초마다 갱신
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchSheetData = async () => {
      try {
        const response = await fetch(GOOGLE_SHEET_TSV_URL);
        if (!response.ok) throw new Error("네트워크 불량");
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
        setDbData([{ bookId: "240_1", english: "I am a smart student.", korean: "나는 똑똑한 학생이다." }]);
        setIsLoading(false);
      }
    };
    fetchSheetData();
  }, []);

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
      filtered = dbData.filter(d => d.bookId.startsWith("1240"));
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
        saveAndLoadRankings(); 
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
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload),
      });
      setTimeout(fetchGlobalRankings, 3000); 
    } catch (error) {
      console.error("구글 시트 전송 실패:", error);
    }
  };

  const saveAndLoadRankings = () => {
    const newRecord: RankingItem = {
      name: student.name,
      score: score,
      grade: student.grade,
      date: new Date().toLocaleString('ko-KR')
    };

    setMonthlyRankings(prev => {
      const filtered = prev.filter(p => p.name !== student.name);
      const merged = [...filtered, newRecord];
      const sorted = merged.sort((a, b) => b.score - a.score).slice(0, 5);
      localStorage.setItem('global_rankings_cache', JSON.stringify(sorted));
      return sorted;
    });

    sendScoreToGoogleSheet(score, currentLevel);
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f0f4f8' }}>
        <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#007aff' }}>🔄 데이터 동기화 중...</div>
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
            
            <div style={{ width: '100%', background: '#f8fafc', borderRadius: '16px', padding: '16px', marginBottom: '24px', textAlign: 'left', border: '1px solid #e2e8f0' }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#64748b', fontWeight: 'bold', textAlign: 'center' }}>🏆 {new Date().getMonth() + 1}월 통합 TOP 5 랭킹</h4>
              
              {monthlyRankings.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {monthlyRankings.map((player, idx) => {
                    const isMe = player.name === student.name;
                    return (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', backgroundColor: isMe ? '#e0f2fe' : 'transparent', borderRadius: '8px' }}>
                        <span style={{ fontWeight: isMe ? '700' : '500', fontSize: '14px', color: player.name.includes("⚠️") ? '#ef4444' : (isMe ? '#0369a1' : '#334155') }}>
                          {player.name.includes("⚠️") ? player.name : `${idx + 1}등. ${player.name} (${player.grade})`}
                        </span>
                        <span style={{ fontWeight: '700', fontSize: '14px', color: isMe ? '#0369a1' : '#475569' }}>
                          {player.score > 0 ? `${player.score}점` : player.grade}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '10px', color: '#94a3b8', fontSize: '14px', fontWeight: '500' }}>
                  동기화 중입니다... 잠시만 기다려주세요 🚀
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

        {/* 4. 결과 화면 */}
        {gameState === 'result' && (
          <div style={{ marginTop: '30px' }}>
            <div style={{ fontSize: '50px', marginBottom: '8px' }}>💀</div>
            <h2 style={{ margin: '0', fontSize: '24px', fontWeight: '800', color: '#ff3b30' }}>GAME OVER</h2>
            <p style={{ margin: '8px 0 24px 0', fontSize: '15px', color: '#4a5568' }}>
              최종 도달: <strong>{currentLevel}단계</strong><br/>
              이번 달 획득 점수: <strong style={{ color: '#007aff', fontSize: '20px' }}>{score}</strong> 점
            </p>

            <div style={{ background: '#f8fafc', borderRadius: '16px', padding: '16px', marginBottom: '24px', textAlign: 'left' }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#64748b', fontWeight: 'bold', textAlign: 'center' }}>🗓️ {new Date().getMonth() + 1}월 실시간 TOP 5 랭킹</h4>
              
              {monthlyRankings.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {monthlyRankings.map((player, idx) => {
                    const isMe = player.name === student.name;
                    return (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', backgroundColor: isMe ? '#e0f2fe' : 'transparent', borderRadius: '8px', border: isMe ? '1px solid #7dd3fc' : 'none' }}>
                        <span style={{ fontWeight: isMe ? '700' : '500', fontSize: '14px', color: player.name.includes("⚠️") ? '#ef4444' : (isMe ? '#0369a1' : '#334155') }}>
                          {player.name.includes("⚠️") ? player.name : `${idx + 1}등. ${player.name} (${player.grade})`}
                        </span>
                        <span style={{ fontWeight: '700', fontSize: '14px', color: isMe ? '#0369a1' : '#475569' }}>
                           {player.score > 0 ? `${player.score}점` : player.grade}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '10px', color: '#94a3b8', fontSize: '14px', fontWeight: '500' }}>
                  동기화 중입니다... 🚀
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