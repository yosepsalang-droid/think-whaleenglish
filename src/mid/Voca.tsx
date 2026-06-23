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
  
  // 💡 정답/오답 색상 표시를 위한 상태 추가
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

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
          return { book: cells[0]?.trim(), eng: cells[3]?.trim(), kor: cells[4]?.trim() };
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
    // 이미 클릭한 경우 중복 클릭 방지
    if (selectedOption) return;

    const currentQ = questions[currentIndex];
    setSelectedOption(opt); // 선택한 보기 저장 (색상 변화 트리거)
    
    if (currentQ.type === 'kor2eng') {
      speakText(opt);
    }

    const isCorrect = opt === currentQ.answer;
    if (isCorrect) setScore(s => s + 1);

    // 💡 소리가 안 잘리도록 1.5초(1500ms) 대기 후 다음 문제로 넘어감
    setTimeout(() => {
      setSelectedOption(null); // 색상 초기화
      if (currentIndex + 1 < questions.length) {
        setCurrentIndex(i => i + 1);
      } else {
        setGameState('result');
      }
    }, 1500);
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
          
          <button onClick={startGame} style={{ width: '100%', padding: '18px', background: 'linear-gradient(135deg, #007aff, #0056b3)', color: 'white', border: 'none', borderRadius: '16px', fontSize: '18px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 6px 16px rgba(0,122,255,0.2)', transition: 'transform 0.1s' }}>
            테스트 시작하기
          </button>
        </div>
      )}

      {gameState === 'playing' && questions.length > 0 && (
        <div style={{ background: 'white', padding: '32px 24px', borderRadius: '24px', boxShadow: '0 12px 32px rgba(0,0,0,0.06)' }}>
          
          {/* 진행률 바 (Progress Bar) */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '14px', fontWeight: '700', color: '#007aff' }}>Question {currentIndex + 1}</span>
            <span style={{ fontSize: '14px', fontWeight: '600', color: '#8e8e93' }}>{currentIndex + 1} / {questions.length}</span>
          </div>
          <div style={{ width: '100%', height: '8px', backgroundColor: '#f0f0f5', borderRadius: '4px', marginBottom: '40px', overflow: 'hidden' }}>
            <div style={{ width: `${((currentIndex + 1) / questions.length) * 100}%`, height: '100%', backgroundColor: '#007aff', borderRadius: '4px', transition: 'width 0.3s ease' }}></div>
          </div>
          
          {/* 문제 영역 */}
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <span style={{ display: 'inline-block', padding: '6px 12px', backgroundColor: '#eef6ff', color: '#007aff', borderRadius: '8px', fontSize: '13px', fontWeight: '700', marginBottom: '16px' }}>
              {questions[currentIndex].type === 'eng2kor' ? '🇺🇸 영어를 우리말로' : '🇰🇷 우리말을 영어로'}
            </span>
            <h2 style={{ fontSize: '36px', fontWeight: '800', margin: '0', color: '#111', wordBreak: 'keep-all' }}>
              {questions[currentIndex].type === 'eng2kor' ? questions[currentIndex].eng : questions[currentIndex].kor}
            </h2>
          </div>
          
          {/* 객관식 보기 영역 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {questions[currentIndex].options.map((opt, i) => {
              
              // 💡 컬러 및 스타일 동적 변경 로직
              const isSelected = selectedOption === opt;
              const isCorrectAnswer = opt === questions[currentIndex].answer;
              
              let bgColor = 'white';
              let borderColor = '#e5e5ea';
              let textColor = '#333';
              let shadow = '0 2px 8px rgba(0,0,0,0.03)';

              // 사용자가 보기를 클릭한 이후에만 색상 변화
              if (selectedOption) {
                if (isCorrectAnswer) {
                  // 정답인 버튼은 초록색
                  bgColor = '#e8f5e9';
                  borderColor = '#4caf50';
                  textColor = '#2e7d32';
                } else if (isSelected && !isCorrectAnswer) {
                  // 내가 누른 오답 버튼은 빨간색
                  bgColor = '#ffebee';
                  borderColor = '#ef5350';
                  textColor = '#c62828';
                }
              }

              return (
                <button 
                  key={i} 
                  onClick={() => handleOptionClick(opt)} 
                  disabled={!!selectedOption} // 클릭 후 다른 버튼 비활성화
                  style={{ 
                    width: '100%', 
                    padding: '18px 20px', 
                    fontSize: '18px', 
                    fontWeight: '700', 
                    textAlign: 'left',
                    borderRadius: '16px', 
                    border: `2px solid ${borderColor}`, 
                    backgroundColor: bgColor, 
                    color: textColor,
                    cursor: selectedOption ? 'default' : 'pointer',
                    boxShadow: shadow,
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  {opt}
                  {selectedOption && isCorrectAnswer && <span style={{ fontSize: '20px' }}>⭕</span>}
                  {selectedOption && isSelected && !isCorrectAnswer && <span style={{ fontSize: '20px' }}>❌</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {gameState === 'result' && (
        <div style={{ textAlign: 'center', background: 'white', padding: '48px 24px', borderRadius: '24px', boxShadow: '0 12px 32px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: '56px', marginBottom: '16px' }}>🏆</div>
          <h2 style={{ fontSize: '28px', fontWeight: '800', margin: '0 0 12px', color: '#111' }}>테스트 완료!</h2>
          <p style={{ color: '#666', fontSize: '16px', marginBottom: '32px' }}>수고했어요! 결과를 확인해볼까요?</p>
          
          <div style={{ backgroundColor: '#f8f9fa', borderRadius: '20px', padding: '32px', marginBottom: '32px' }}>
            <span style={{ fontSize: '14px', fontWeight: '700', color: '#8e8e93' }}>최종 점수</span>
            <div style={{ marginTop: '8px' }}>
              <span style={{ fontSize: '48px', fontWeight: '800', color: '#007aff' }}>{score}</span>
              <span style={{ fontSize: '24px', fontWeight: '700', color: '#111' }}> / {questions.length}</span>
            </div>
          </div>

          <button onClick={() => setGameState('intro')} style={{ width: '100%', padding: '18px', background: '#111', color: 'white', border: 'none', borderRadius: '16px', fontSize: '18px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 6px 16px rgba(0,0,0,0.1)' }}>
            다시 도전하기
          </button>
        </div>
      )}
    </div>
  );
}