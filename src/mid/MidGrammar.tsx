import React, { useState, useEffect, useRef } from 'react';
import { CONFIG } from '../config';

interface GrammarQ {
  category: string;
  level: string;
  type: string;
  kor: string;
  eng: string;
  explanation: string;
}

interface MidGrammarProps {
  onBack: () => void;
}

export default function MidGrammar({ onBack }: MidGrammarProps) {
  const [allData, setAllData] = useState<GrammarQ[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  
  // 게임 진행 상태
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [currentLevel, setCurrentLevel] = useState<string>('초급'); // 초급 -> 중급 -> 고급
  const [step, setStep] = useState<'LOBBY' | 'TEST' | 'RESULT' | 'CLEAR'>('LOBBY');
  
  // 문제 풀이 관련
  const [questions, setQuestions] = useState<GrammarQ[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [wrongQuestions, setWrongQuestions] = useState<GrammarQ[]>([]); // 틀린 문제들 모음
  
  const inputRef = useRef<HTMLInputElement>(null);

  // 1. 구글 시트에서 문법 데이터 불러오기
  useEffect(() => {
    fetch(`${CONFIG.SHEETS.MID_GRAMMAR}&_nocache=${Date.now()}`)
      .then(res => res.text())
      .then(text => {
        const rows = text.split(/\r?\n/).slice(1);
        const parsed: GrammarQ[] = rows.map(row => {
          const cells = row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
          return {
            category: cells[0]?.trim() || '',
            level: cells[1]?.trim() || '',
            type: cells[2]?.trim() || '',
            kor: cells[3]?.replace(/^"|"$/g, '').trim() || '',
            eng: cells[4]?.replace(/^"|"$/g, '').trim() || '',
            explanation: cells[5]?.replace(/^"|"$/g, '').trim() || '',
          };
        }).filter(q => q.eng && q.kor);
        
        setAllData(parsed);
        
        // 중복 없는 카테고리(대분류) 목록 추출
        const uniqueCats = Array.from(new Set(parsed.map(q => q.category))).filter(Boolean);
        setCategories(uniqueCats);
      });
  }, []);

  // 입력창 오토 포커스
  useEffect(() => {
    if (step === 'TEST' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [step, currentIdx]);

  // 2. 난이도별 테스트 시작 (초급 10문제 뽑기)
  const startLevelTest = (category: string, level: string) => {
    setSelectedCategory(category);
    setCurrentLevel(level);
    
    // 해당 카테고리와 레벨에 맞는 문제 중 랜덤 10개 추출
    const pool = allData.filter(q => q.category === category && q.level === level);
    if (pool.length === 0) {
      alert(`시트에 [${category} - ${level}] 문제가 아직 없습니다!`);
      return;
    }
    
    const selected = [...pool].sort(() => Math.random() - 0.5).slice(0, 10);
    
    setQuestions(selected);
    setCurrentIdx(0);
    setWrongQuestions([]);
    setUserAnswer('');
    setStep('TEST');
  };

  // 3. 정답 제출 처리
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const currentQ = questions[currentIdx];
    if (!currentQ || !userAnswer.trim()) return;

    // 대소문자, 마침표, 다중 공백 무시하고 채점
    const isCorrect = 
      userAnswer.trim().toLowerCase().replace(/[^a-z0-9]/g, '') === 
      currentQ.eng.trim().toLowerCase().replace(/[^a-z0-9]/g, '');

    if (!isCorrect) {
      // 틀린 문제는 오답 노트 배열에 저장
      setWrongQuestions(prev => [...prev, currentQ]);
    }

    // 다음 문제로 이동 또는 결과창으로 이동
    if (currentIdx + 1 < questions.length) {
      setCurrentIdx(prev => prev + 1);
      setUserAnswer('');
    } else {
      setStep('RESULT');
    }
  };

  // 4. 결과창에서 다음 행동 결정 (레벨업 or 오답 클리닉)
  const handleResultAction = () => {
    if (wrongQuestions.length === 0) {
      // 100점 달성! 다음 레벨로 이동
      if (currentLevel === '초급') {
        alert("🎉 초급 완벽 마스터! 중급으로 레벨업 합니다.");
        startLevelTest(selectedCategory!, '중급');
      } else if (currentLevel === '중급') {
        alert("🎉 중급 완벽 마스터! 마지막 고급으로 레벨업 합니다.");
        startLevelTest(selectedCategory!, '고급');
      } else {
        // 고급까지 100점이면 해당 카테고리 완전 정복
        setStep('CLEAR');
      }
    } else {
      // 오답이 있을 경우: 틀린 문제의 '유형(type)'을 파악하여 2배수 유사 문제 추출
      const clinicQuestions: GrammarQ[] = [];
      
      wrongQuestions.forEach(wrongQ => {
        // 같은 카테고리, 같은 레벨, 같은 유형(type)의 문제들 풀(Pool)
        const similarPool = allData.filter(q => 
          q.category === selectedCategory && 
          q.level === currentLevel && 
          q.type === wrongQ.type
        );
        
        // 2배수(2문제) 랜덤 추출
        const picked = [...similarPool].sort(() => Math.random() - 0.5).slice(0, 2);
        clinicQuestions.push(...picked);
      });

      alert(`🚨 오답 클리닉 발동!\n틀린 유형에 대한 유사 문제 ${clinicQuestions.length}개가 출제됩니다. 완벽하게 맞출 때까지 도전하세요!`);
      
      setQuestions(clinicQuestions);
      setCurrentIdx(0);
      setWrongQuestions([]); // 다시 틀리는 걸 담기 위해 초기화
      setUserAnswer('');
      setStep('TEST');
    }
  };

  // --- 화면 렌더링 ---
  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: '#f8fafc', padding: '20px', fontFamily: `'Pretendard', sans-serif`, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ maxWidth: '600px', width: '100%' }}>
        <button onClick={onBack} style={{ background: 'transparent', border: '1px solid #334155', color: '#94a3b8', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', marginBottom: '20px' }}>
          ◀ 홈으로
        </button>

        {/* 1. 카테고리 선택 화면 (LOBBY) */}
        {step === 'LOBBY' && (
          <div>
            <h2 style={{ color: '#38bdf8', textAlign: 'center', marginBottom: '10px', fontWeight: 900, fontSize: '28px' }}>🧠 AI 맞춤 문법</h2>
            <p style={{ color: '#94a3b8', textAlign: 'center', marginBottom: '30px' }}>학습할 문법 파트를 선택하세요. 모르는 구멍을 AI가 찾아내어 완벽하게 메워줍니다.</p>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              {categories.map(cat => (
                <button key={cat} onClick={() => startLevelTest(cat, '초급')} style={{
                  background: '#1e293b', border: '2px solid #334155', borderRadius: '16px', padding: '24px 20px',
                  color: '#f8fafc', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                }}>
                  {cat} <br/><span style={{ fontSize: '13px', color: '#38bdf8', fontWeight: 'normal', marginTop: '8px', display: 'block' }}>초급부터 시작 ➔</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 2. 주관식 테스트 화면 (TEST) */}
        {step === 'TEST' && (
          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '20px', padding: '30px', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '14px', fontWeight: 600, marginBottom: '20px' }}>
              <span>{selectedCategory} [{currentLevel}]</span>
              <span style={{ color: '#38bdf8' }}>Q. {currentIdx + 1} / {questions.length}</span>
            </div>

            <div style={{ background: '#0f172a', padding: '20px', borderRadius: '12px', marginBottom: '24px', border: '1px solid #334155' }}>
              <h2 style={{ fontSize: '22px', lineHeight: '1.5', color: '#f1f5f9', wordBreak: 'keep-all', margin: 0 }}>
                {questions[currentIdx]?.kor}
              </h2>
            </div>

            <form onSubmit={handleSubmit}>
              <input
                ref={inputRef}
                type="text"
                value={userAnswer}
                onChange={e => setUserAnswer(e.target.value)}
                placeholder="영어 문장을 정확히 입력하세요"
                autoComplete="off"
                spellCheck="false"
                style={{
                  width: '100%', boxSizing: 'border-box', padding: '18px', fontSize: '18px', borderRadius: '12px',
                  border: '2px solid #475569', background: '#0f172a', color: '#38bdf8', outline: 'none', marginBottom: '16px', fontWeight: 'bold'
                }}
              />
              <button type="submit" disabled={!userAnswer.trim()} style={{
                width: '100%', background: '#38bdf8', color: '#0f172a', border: 'none', padding: '18px', borderRadius: '12px',
                fontWeight: 900, fontSize: '18px', cursor: 'pointer', boxShadow: '0 4px 14px rgba(56,189,248,0.3)'
              }}>
                정답 제출 ↵
              </button>
            </form>
          </div>
        )}

        {/* 3. 채점 결과 및 오답 해설 화면 (RESULT) */}
        {step === 'RESULT' && (
          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '20px', padding: '30px', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
            <div style={{ textAlign: 'center', marginBottom: '30px' }}>
              <div style={{ fontSize: '48px', marginBottom: '10px' }}>{wrongQuestions.length === 0 ? '🏆' : '🚨'}</div>
              <h2 style={{ color: wrongQuestions.length === 0 ? '#34d399' : '#ef4444', margin: '0 0 10px 0', fontSize: '28px' }}>
                {wrongQuestions.length === 0 ? '100점 완벽 마스터!' : `아쉽게도 ${wrongQuestions.length}문제를 틀렸습니다`}
              </h2>
              <p style={{ color: '#94a3b8' }}>
                {wrongQuestions.length === 0 ? '놀라운 실력입니다! 다음 레벨로 넘어갈 준비가 되었습니다.' : '틀린 문제의 해설을 꼼꼼히 읽고, AI가 준비한 클리닉 문제에 도전하세요!'}
              </p>
            </div>

            {/* 오답 해설 리스트 */}
            {wrongQuestions.length > 0 && (
              <div style={{ marginBottom: '30px', maxHeight: '40vh', overflowY: 'auto' }}>
                {wrongQuestions.map((wq, idx) => (
                  <div key={idx} style={{ background: '#0f172a', borderLeft: '4px solid #ef4444', padding: '16px', borderRadius: '8px', marginBottom: '12px' }}>
                    <div style={{ color: '#ef4444', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>오답 유형: {wq.type}</div>
                    <div style={{ color: '#f8fafc', fontSize: '16px', fontWeight: 'bold', marginBottom: '4px' }}>{wq.kor}</div>
                    <div style={{ color: '#38bdf8', fontSize: '15px', marginBottom: '12px' }}>정답: {wq.eng}</div>
                    <div style={{ background: '#1e293b', padding: '12px', borderRadius: '8px', color: '#cbd5e1', fontSize: '14px', lineHeight: '1.5' }}>
                      💡 <b>해설:</b> {wq.explanation}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button onClick={handleResultAction} style={{
              width: '100%', background: wrongQuestions.length === 0 ? '#34d399' : '#ef4444', color: '#0f172a', border: 'none', padding: '18px',
              borderRadius: '12px', fontWeight: 900, fontSize: '18px', cursor: 'pointer'
            }}>
              {wrongQuestions.length === 0 ? '다음 레벨로 이동 ➔' : '오답 클리닉 (유사문제 풀기) 시작 ➔'}
            </button>
          </div>
        )}

        {/* 4. 전체 클리어 화면 (CLEAR) */}
        {step === 'CLEAR' && (
          <div style={{ textAlign: 'center', background: '#1e293b', border: '1px solid #334155', borderRadius: '20px', padding: '40px 20px' }}>
            <div style={{ fontSize: '60px', marginBottom: '20px' }}>👑</div>
            <h1 style={{ color: '#38bdf8', marginBottom: '15px' }}>{selectedCategory} 완전 정복!</h1>
            <p style={{ color: '#94a3b8', fontSize: '16px', lineHeight: '1.6', marginBottom: '30px' }}>
              초급부터 고급까지, 그리고 오답 클리닉까지<br/>모든 과정을 완벽하게 이겨냈습니다!<br/>정말 대단합니다!
            </p>
            <button onClick={() => setStep('LOBBY')} style={{ background: '#38bdf8', color: '#0f172a', border: 'none', padding: '16px 30px', borderRadius: '12px', fontWeight: 900, fontSize: '16px', cursor: 'pointer' }}>
              다른 문법 도전하기
            </button>
          </div>
        )}
      </div>
    </div>
  );
}