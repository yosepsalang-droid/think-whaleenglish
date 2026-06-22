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

  // 🔊 기기 기본 음성 합성(TTS) 기능
  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      // 진행 중인 음성이 있으면 취소
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US'; // 영어 발음
      utterance.rate = 0.9; // 발음 속도 살짝 늦춤
      window.speechSynthesis.speak(utterance);
    }
  };

  const startGame = () => {
    if (!selectedBook) return alert("교재를 선택해주세요.");
    const filtered = allWords.filter(w => w.book === selectedBook);
    if (filtered.length === 0) return alert("선택하신 교재의 단어 데이터가 시트에 없습니다.");
    
    // 💡 1. 섞어서 최대 100단어 추출
    const shuffledWords = [...filtered].sort(() => Math.random() - 0.5).slice(0, 100);
    
    // 💡 2. 절반(50문제)은 영어->한글, 절반(50문제)은 한글->영어
    const halfLength = Math.ceil(shuffledWords.length / 2);
    
    let generatedQuestions = shuffledWords.map((w, i) => {
      const isEng2Kor = i < halfLength; 
      const correct = isEng2Kor ? w.kor : w.eng;
      const options = [correct];
      
      // 오답 보기 3개 추가 (총 4지 선다형)
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

    // 만들어진 문제들을 다시 한번 무작위로 섞음 (영-한, 한-영 번갈아가며 나오게)
    generatedQuestions = generatedQuestions.sort(() => Math.random() - 0.5);

    setQuestions(generatedQuestions);
    setGameState('playing');
    setCurrentIndex(0);
    setScore(0);
  };

  // 💡 3. 영어가 문제로 나올 때 자동 발음 재생
  useEffect(() => {
    if (gameState === 'playing' && questions.length > 0) {
      const currentQ = questions[currentIndex];
      if (currentQ.type === 'eng2kor') {
        speakText(currentQ.eng);
      }
    }
  }, [currentIndex, gameState, questions]);

  const handleOptionClick = (opt: string) => {
    const currentQ = questions[currentIndex];
    
    // 💡 4. 보기가 영어일 때(한글->영어 문제) 클릭 시 발음 재생
    if (currentQ.type === 'kor2eng') {
      speakText(opt);
    }

    const isCorrect = opt === currentQ.answer;
    if (isCorrect) setScore(s => s + 1);

    // 발음을 들을 수 있도록 0.6초 딜레이 후 다음 문제로 넘어감
    setTimeout(() => {
      if (currentIndex + 1 < questions.length) {
        setCurrentIndex(i => i + 1);
      } else {
        setGameState('result');
      }
    }, 600);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '450px', margin: '0 auto', fontFamily: 'Pretendard' }}>
      <button onClick={onBack} style={{ marginBottom: '20px', padding: '10px 16px', background: 'white', border: '1px solid #ddd', borderRadius: '12px', fontWeight: '700', cursor: 'pointer' }}>
        ◀ 메인화면으로
      </button>

      {gameState === 'intro' && (
        <div style={{ textAlign: 'center', background: 'white', padding: '32px', borderRadius: '24px', boxShadow: '0 8px 24px rgba(0,0,0,0.05)' }}>
          <h2 style={{ margin: '0 0 8px', fontSize: '24px', fontWeight: '800' }}>📘 단어 훈련</h2>
          <p style={{ color: '#666', fontSize: '14px', marginBottom: '24px' }}>배정 교재: <strong style={{ color: '#007aff' }}>{currentBook || '없음'}</strong></p>
          
          <select value={selectedBook} onChange={(e) => setSelectedBook(e.target.value)} style={{ width: '100%', padding: '16px', borderRadius: '12px', border: '1px solid #ccc', fontSize: '16px', marginBottom: '20px', boxSizing: 'border-box' }}>
            <option value="">교재 변경/선택</option>
            {books.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
          
          <button onClick={startGame} style={{ width: '100%', padding: '16px', background: '#007aff', color: 'white', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: '700', cursor: 'pointer' }}>
            테스트 시작하기
          </button>
        </div>
      )}

      {gameState === 'playing' && questions.length > 0 && (
        <div style={{ textAlign: 'center', background: 'white', padding: '32px', borderRadius: '24px', boxShadow: '0 8px 24px rgba(0,0,0,0.05)' }}>
          <p style={{ color: '#8e8e93', fontSize: '14px', fontWeight: '700', margin: '0 0 16px' }}>{currentIndex + 1} / {questions.length}</p>
          
          {/* 문제 표시 영역 */}
          <h2 style={{ fontSize: '32px', fontWeight: '800', margin: '0 0 32px', color: '#111' }}>
            {questions[currentIndex].type === 'eng2kor' ? questions[currentIndex].eng : questions[currentIndex].kor}
          </h2>
          
          {/* 객관식 보기 4개 영역 */}
          {questions[currentIndex].options.map((opt, i) => (
            <button 
              key={i} 
              onClick={() => handleOptionClick(opt)} 
              style={{ display: 'block', width: '100%', margin: '12px 0', padding: '16px', fontSize: '16px', fontWeight: '600', borderRadius: '14px', border: '1px solid #e5e5e5', background: '#f5f5f7', cursor: 'pointer' }}
            >
              {opt}
            </button>
          ))}
        </div>
      )}

      {gameState === 'result' && (
        <div style={{ textAlign: 'center', background: 'white', padding: '32px', borderRadius: '24px', boxShadow: '0 8px 24px rgba(0,0,0,0.05)' }}>
          <h2 style={{ fontSize: '26px', fontWeight: '800', margin: '0 0 8px' }}>💯 테스트 종료</h2>
          <p style={{ fontSize: '20px', fontWeight: '700', margin: '24px 0', color: '#333' }}>
            내 점수: <span style={{ color: '#007aff', fontSize: '28px' }}>{score}</span> / {questions.length}
          </p>
          <button onClick={() => setGameState('intro')} style={{ width: '100%', padding: '16px', background: '#111', color: 'white', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: '700', cursor: 'pointer' }}>
            다시 도전하기
          </button>
        </div>
      )}
    </div>
  );
}