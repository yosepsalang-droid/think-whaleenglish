import React, { useState, useEffect, useMemo } from 'react';

interface VocaProps { 
  onBack: () => void; 
  currentBook?: string;
}
interface WordItem { book: string; eng: string; kor: string; }
interface Question { id: number; type: 'eng2kor' | 'kor2eng'; eng: string; kor: string; options: string[]; answer: string; }

const GOOGLE_SHEET_VOCA_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTA4Z1o77LMkO66syR0SmqmWPu6q5NapogmBA2iOxpd379nYZ4Gu7y9h7KmGTVb9H9WXNfM5EnFlBxe/pub?gid=8529494&single=true&output=csv";

export default function Voca({ onBack, currentBook }: VocaProps) {
  const [allWords, setAllWords] = useState<WordItem[]>([]);
  const [gameState, setGameState] = useState<'intro' | 'playing' | 'result'>('intro');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedBook, setSelectedBook] = useState(currentBook || '');
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  // 💡 오답 재시험 및 도전 회차 추적을 위한 상태 추가
  const [wrongQuestions, setWrongQuestions] = useState<Question[]>([]);
  const [attemptCount, setAttemptCount] = useState(1);
  const [isRetestMode, setIsRetestMode] = useState(false);

  useEffect(() => {
    if (currentBook) setSelectedBook(currentBook);
  }, [currentBook]);

  useEffect(() => {
    const fetchWords = async () => {
      try {
        const response = await fetch(`${GOOGLE_SHEET_VOCA_CSV_URL}&_nocache=${Date.now()}`);
        const text = await response.text();
        const rows = text.split(/\r?\n/).slice(1);
        
        const parsed = rows.map(row => {
          const cells = row.split(','); 
          // 💡 1. 글자 앞뒤에 남아있는 불필요한 쌍따옴표(")를 완벽히 제거하는 정제 함수
          const cleanText = (str: string) => str ? str.replace(/"/g, '').trim() : '';
          return { 
            book: cleanText(cells[0]), 
            eng: cleanText(cells[3]), 
            kor: cleanText(cells[4]) 
          };
        });
        
        const validWords = parsed.filter(w => w.book && w.eng && w.kor);
        if (validWords.length === 0) alert("데이터가 없습니다. 구글 시트 공유 설정을 확인하세요.");
        setAllWords(validWords);
      } catch (e) { alert("데이터 로드 실패"); }
    };
    fetchWords();
  }, []);

  const books = useMemo(() => Array.from(new Set(allWords.map(w => w.book))), [allWords]);

  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US'; 
      utterance.rate = 0.9; 
      window.speechSynthesis.speak(utterance);
    }
  };

  // 💡 첫 테스트 시작 함수
  const startGame = () => {
    if (!selectedBook) return alert("교재를 선택해주세요.");
    const filtered = allWords.filter(w => w.book === selectedBook);
    if (filtered.length === 0) return alert("선택하신 교재의 단어 데이터가 시트에 없습니다.");
    
    const shuffledWords = [...filtered].sort(() => Math.random() - 0.5).slice(0, 100);
    const halfLength = Math.ceil(shuffledWords.length / 2);
    
    let generatedQuestions = shuffledWords.map((w, i) => {
      const isEng2Kor = i < halfLength; 
      const correct = isEng2Kor ? w.kor : w.eng;
      const options = [correct];
      
      while (options.length < 4) {
        const rand = allWords[Math.floor(Math.random() * allWords.length)];
        const item = isEng2Kor ? rand.kor : rand.eng;
        if (!options.includes(item) && item !== undefined) options.push(item);
      }
      
      return { 
        id: i, 
        type: isEng2Kor ? 'eng2kor' : 'kor2eng', 
        eng: w.eng, 
        kor: w.kor, 
        options: options.sort(() => Math.random() - 0.5), 
        answer: correct 
      } as Question;
    });

    generatedQuestions = generatedQuestions.sort(() => Math.random() - 0.5);

    setQuestions(generatedQuestions);
    setWrongQuestions([]);
    setAttemptCount(1);
    setIsRetestMode(false);
    setGameState('playing');
    setCurrentIndex(0);
    setScore(0);
    setSelectedOption(null);
  };

  // 💡 틀린 것만 골라서 재시험 보는 함수
  const handleStartRetest = () => {
    // 오답 리스트를 무작위로 다시 섞어서 출제
    const shuffledWrong = [...wrongQuestions].sort(() => Math.random() - 0.5);
    
    setQuestions(shuffledWrong);
    setWrongQuestions([]); // 다음 라운드를 위해 오답 보관함 초기화
    setAttemptCount(prev => prev + 1); // 회차 추가
    setIsRetestMode(true);
    setGameState('playing');
    setCurrentIndex(0);
    setScore(0);
    setSelectedOption(null);
  };

  useEffect(() => {
    if (gameState === 'playing' && questions.length > 0 && !selectedOption) {
      const currentQ = questions[currentIndex];
      if (currentQ.type === 'eng2kor') {
        speakText(currentQ.eng);
      }
    }
  }, [currentIndex, gameState, questions, selectedOption]);

  const handleOptionClick = (opt: string) => {
    if (selectedOption) return;

    const currentQ = questions[currentIndex];
    setSelectedOption(opt); 
    
    if (currentQ.type === 'kor2eng') {
      speakText(opt);
    }

    const isCorrect = opt === currentQ.answer;
    if (isCorrect) {
      setScore(s => s + 1);
    } else {
      // 💡 틀린 문제를 오답 보관함에 담아둡니다 (중복 방지)
      setWrongQuestions(prev => {
        if (prev.some(q => q.id === currentQ.id)) return prev;
        return [...prev, currentQ];
      });
    }

    setTimeout(() => {
      setSelectedOption(null); 
      if (currentIndex + 1 < questions.length) {
        setCurrentIndex(i => i + 1);
      } else {
        setGameState('result');
      }
    }, 1500);
  };

  // 💡 보기 글자 수에 따라 폰트 크기를 자동으로 축소해 주는 함수
  const getDynamicFontSize = (text: string) => {
    if (text.length > 14) return '12px';
    if (text.length > 8) return '14px';
    if (text.length > 5) return '16px';
    return '18px';
  };

  return (
    <div style={{ padding: '20px', maxWidth: '480px', margin: '0 auto', fontFamily: 'Pretendard, sans-serif' }}>
      
      {/* 뒤로가기 버튼 */}
      <button onClick={onBack} style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: 'white', border: '1px solid #eaeaea', borderRadius: '12px', fontWeight: '700', cursor: 'pointer', color: '#555', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
        학습 홈으로
      </button>

      {gameState === 'intro' && (
        <div style={{ textAlign: 'center', background: 'white', padding: '40px 24px', borderRadius: '24px', boxShadow: '0 12px 32px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📝</div>
          <h2 style={{ margin: '0 0 12px', fontSize: '28px', fontWeight: '800', color: '#111' }}>단어 마스터 테스트</h2>
          <p style={{ color: '#666', fontSize: '15px', marginBottom: '32px', lineHeight: '1.5' }}>
            원어민 음성을 듣고 정확한 뜻과 단어를 맞춰보세요!<br/>현재 교재: <strong style={{ color: '#007aff' }}>{currentBook || '없음'}</strong>
          </p>
          
          <div style={{ textAlign: 'left', marginBottom: '24px' }}>
            <label style={{ fontSize: '13px', fontWeight: '700', color: '#8e8e93', marginLeft: '4px', marginBottom: '8px', display: 'block' }}>교재 선택</label>
            <select value={selectedBook} onChange={(e) => setSelectedBook(e.target.value)} style={{ width: '100%', padding: '16px', borderRadius: '14px', border: '1px solid #d1d1d6', fontSize: '16px', fontWeight: '600', color: '#333', backgroundColor: '#f9f9f9', outline: 'none' }}>
              <option value="">교재를 선택해주세요</option>
              {books.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          
          <button onClick={startGame} style={{ width: '100%', padding: '18px', background: 'linear-gradient(135deg, #007aff, #0056b3)', color: 'white', border: 'none', borderRadius: '16px', fontSize: '18px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 6px 16px rgba(0,122,255,0.2)' }}>
            테스트 시작하기
          </button>
        </div>
      )}

      {gameState === 'playing' && questions.length > 0 && (
        <div style={{ background: 'white', padding: '32px 24px', borderRadius: '24px', boxShadow: '0 12px 32px rgba(0,0,0,0.06)' }}>
          
          {/* 진행률 바 */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '14px', fontWeight: '700', color: '#007aff' }}>
              {isRetestMode ? `🔥 오답 재시험 (${attemptCount}회차)` : `Question ${currentIndex + 1}`}
            </span>
            <span style={{ fontSize: '14px', fontWeight: '600', color: '#8e8e93' }}>{currentIndex + 1} / {questions.length}</span>
          </div>
          <div style={{ width: '100%', height: '8px', backgroundColor: '#f0f0f5', borderRadius: '4px', marginBottom: '32px', overflow: 'hidden' }}>
            <div style={{ width: `${((currentIndex + 1) / questions.length) * 100}%`, height: '100%', backgroundColor: '#007aff', borderRadius: '4px', transition: 'width 0.3s ease' }}></div>
          </div>
          
          {/* 💡 2. 문제 영역: 최소 높이(minHeight)를 주어 단어 길이에 상관없이 화면 크기를 고정함 */}
          <div style={{ textAlign: 'center', minHeight: '130px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', marginBottom: '24px' }}>
            <span style={{ display: 'inline-block', padding: '6px 12px', backgroundColor: '#eef6ff', color: '#007aff', borderRadius: '8px', fontSize: '13px', fontWeight: '700', marginBottom: '12px' }}>
              {questions[currentIndex].type === 'eng2kor' ? '🇺🇸 영어를 우리말로' : '🇰🇷 우리말을 영어로'}
            </span>
            <h2 style={{ fontSize: '34px', fontWeight: '800', margin: '0', color: '#111', wordBreak: 'keep-all', lineHeight: '1.3' }}>
              {questions[currentIndex].type === 'eng2kor' ? questions[currentIndex].eng : questions[currentIndex].kor}
            </h2>
          </div>
          
          {/* 💡 3. 객관식 보기 영역: 두 칸 두 줄(2x2 Grid) 구조로 완전히 대칭 고정 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {questions[currentIndex].options.map((opt, i) => {
              const isSelected = selectedOption === opt;
              const isCorrectAnswer = opt === questions[currentIndex].answer;
              
              let bgColor = 'white';
              let borderColor = '#e5e5ea';
              let textColor = '#333';
              let shadow = '0 2px 8px rgba(0,0,0,0.03)';

              if (selectedOption) {
                if (isCorrectAnswer) {
                  bgColor = '#e8f5e9'; borderColor = '#4caf50'; textColor = '#2e7d32';
                } else if (isSelected && !isCorrectAnswer) {
                  bgColor = '#ffebee'; borderColor = '#ef5350'; textColor = '#c62828';
                }
              }

              return (
                <button 
                  key={i} 
                  onClick={() => handleOptionClick(opt)} 
                  disabled={!!selectedOption} 
                  style={{ 
                    width: '100%', 
                    height: '84px', // 💡 모든 보기의 칸 크기를 완전히 동일하게 고정
                    boxSizing: 'border-box',
                    position: 'relative',
                    padding: '10px 12px', 
                    fontSize: getDynamicFontSize(opt), // 💡 글자 수에 맞추어 폰트 크기 자동 조절
                    fontWeight: '700', 
                    textAlign: 'center',
                    borderRadius: '16px', 
                    border: `2px solid ${borderColor}`, 
                    backgroundColor: bgColor, 
                    color: textColor,
                    cursor: selectedOption ? 'default' : 'pointer',
                    boxShadow: shadow,
                    transition: 'all 0.15s ease',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    wordBreak: 'keep-all',
                    lineHeight: '1.3'
                  }}
                >
                  {opt}
                  {/* 정오답 기호가 글자를 밀어내지 않도록 절대 좌표 배치 */}
                  {selectedOption && isCorrectAnswer && <span style={{ position: 'absolute', right: '10px', top: '10px', fontSize: '14px' }}>⭕</span>}
                  {selectedOption && isSelected && !isCorrectAnswer && <span style={{ position: 'absolute', right: '10px', top: '10px', fontSize: '14px' }}>❌</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {gameState === 'result' && (
        <div style={{ textAlign: 'center', background: 'white', padding: '48px 24px', borderRadius: '24px', boxShadow: '0 12px 32px rgba(0,0,0,0.06)' }}>
          
          {/* 💡 4. 통과 여부에 따른 동적 스코어 및 결과 메시지창 구성 */}
          {wrongQuestions.length === 0 ? (
            <>
              <div style={{ fontSize: '56px', marginBottom: '16px' }}>🏆</div>
              <h2 style={{ fontSize: '28px', fontWeight: '800', margin: '0 0 12px', color: '#111' }}>최종 테스트 통과!</h2>
              
              <div style={{ backgroundColor: '#e8f5e9', borderRadius: '20px', padding: '24px', marginBottom: '32px' }}>
                {/* 원장님이 말씀하신 "몇회 중 통과" 알림 문구 */}
                <span style={{ fontSize: '15px', fontWeight: '700', color: '#2e7d32', display: 'block', marginBottom: '4px' }}>PASS MISSION 🐋</span>
                <span style={{ fontSize: '24px', fontWeight: '800', color: '#1b5e20' }}>
                  {attemptCount}회차 시험 만에 통과!
                </span>
              </div>

              <button onClick={() => setGameState('intro')} style={{ width: '100%', padding: '18px', background: '#111', color: 'white', border: 'none', borderRadius: '16px', fontSize: '18px', fontWeight: '700', cursor: 'pointer' }}>
                처음 화면으로 이동
              </button>
            </>
          ) : (
            <>
              <div style={{ fontSize: '56px', marginBottom: '16px' }}>🔥</div>
              <h2 style={{ fontSize: '26px', fontWeight: '800', margin: '0 0 12px', color: '#111' }}>재도전이 필요해요!</h2>
              <p style={{ color: '#666', fontSize: '15px', marginBottom: '24px' }}>틀린 단어를 모아서 완벽히 마스터해봐요.</p>
              
              <div style={{ backgroundColor: '#fff5f5', borderRadius: '20px', padding: '24px', marginBottom: '32px', border: '1px solid #ffebeb' }}>
                <div style={{ marginBottom: '12px' }}>
                  <span style={{ fontSize: '14px', fontWeight: '700', color: '#8e8e93', display: 'block' }}>이번 회차 맞춘 문제</span>
                  <span style={{ fontSize: '32px', fontWeight: '800', color: '#ff3b30' }}>{score}</span>
                  <span style={{ fontSize: '18px', fontWeight: '700', color: '#111' }}> / {questions.length}</span>
                </div>
                <div style={{ borderTop: '1px solid #ffe5e5', paddingTop: '12px', fontSize: '14px', fontWeight: '700', color: '#e53935' }}>
                  남은 오답 개수: {wrongQuestions.length}개 (현재 {attemptCount}회차 진행완료)
                </div>
              </div>

              {/* 💡 틀린 문항만 가지고 다음 회차로 이어지는 버튼 */}
              <button onClick={handleStartRetest} style={{ width: '100%', padding: '18px', background: 'linear-gradient(135deg, #ff3b30, #c62828)', color: 'white', border: 'none', borderRadius: '16px', fontSize: '18px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 6px 16px rgba(255,59,48,0.2)' }}>
                ❌ 틀린 단어 재시험 보기 ({attemptCount + 1}회차 도전)
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}