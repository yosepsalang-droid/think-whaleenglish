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
  const [currentLevel, setCurrentLevel] = useState<string>('초급');
  const [step, setStep] = useState<'LOBBY' | 'TEST' | 'RESULT' | 'CLEAR'>('LOBBY');
  
  // 문제 풀이 관련
  const [questions, setQuestions] = useState<GrammarQ[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [wrongQuestions, setWrongQuestions] = useState<GrammarQ[]>([]);
  
  // 💡 [신규 추가] 정답 확인 상태 ('IDLE': 푸는 중, 'CORRECT': 정답, 'WRONG': 오답)
  const [feedback, setFeedback] = useState<'IDLE' | 'CORRECT' | 'WRONG'>('IDLE');
  
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
        
        const uniqueCats = Array.from(new Set(parsed.map(q => q.category))).filter(Boolean);
        setCategories(uniqueCats);
      });
  }, []);

  // 입력창 오토 포커스
  useEffect(() => {
    if (step === 'TEST' && feedback === 'IDLE' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [step, currentIdx, feedback]);

  // 2. 난이도별 테스트 시작
  const startLevelTest = (category: string, level: string) => {
    setSelectedCategory(category);
    setCurrentLevel(level);
    
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
    setFeedback('IDLE'); // 피드백 초기화
    setStep('TEST');
  };

  // 💡 3. 정답 제출 처리 (바로 넘어가지 않고 피드백 상태만 변경)
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const currentQ = questions[currentIdx];
    if (!currentQ || !userAnswer.trim()) return;

    const isCorrect = 
      userAnswer.trim().toLowerCase().replace(/[^a-z0-9]/g, '') === 
      currentQ.eng.trim().toLowerCase().replace(/[^a-z0-9]/g, '');

    if (isCorrect) {
      setFeedback('CORRECT');
    } else {
      setWrongQuestions(prev => [...prev, currentQ]);
      setFeedback('WRONG');
    }
  };

  // 💡 [신규 추가] 피드백 확인 후 다음 문제로 넘어가는 함수
  const handleNextQuestion = () => {
    if (currentIdx + 1 < questions.length) {
      setCurrentIdx(prev => prev + 1);
      setUserAnswer('');
      setFeedback('IDLE'); // 다시 입력할 수 있도록 초기화
    } else {
      setStep('RESULT');
    }
  };

  // 4. 결과창에서 다음 행동 결정
  const handleResultAction = () => {
    if (wrongQuestions.length === 0) {
      if (currentLevel === '초급') {
        alert("🎉 초급 완벽 마스터! 중급으로 레벨업 합니다.");
        startLevelTest(selectedCategory!, '중급');
      } else if (currentLevel === '중급') {
        alert("🎉 중급 완벽 마스터! 마지막 고급으로 레벨업 합니다.");
        startLevelTest(selectedCategory!, '고급');
      } else {
        setStep('CLEAR');
      }
    } else {
      const clinicQuestions: GrammarQ[] = [];
      wrongQuestions.forEach(wrongQ => {
        const similarPool = allData.filter(q => 
          q.category === selectedCategory && 
          q.level === currentLevel && 
          q.type === wrongQ.type
        );
        const picked = [...similarPool].sort(() => Math.random() - 0.5).slice(0, 2);
        clinicQuestions.push(...picked);
      });

      alert(`🚨 오답 클리닉 발동!\n틀린 유형에 대한 유사 문제 ${clinicQuestions.length}개가 출제됩니다.`);
      
      setQuestions(clinicQuestions);
      setCurrentIdx(0);
      setWrongQuestions([]); 
      setUserAnswer('');
      setFeedback('IDLE'); // 피드백 초기화
      setStep('TEST');
    }
  };

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

            {/* 💡 피드백 상태가 IDLE일 때: 정답 입력창 보여주기 */}
            {feedback === 'IDLE' && (
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
            )}

            {/* 💡 피드백 상태가 CORRECT일 때: 정답 안내 및 다음 버튼 */}
            {feedback === 'CORRECT' && (
              <div style={{ textAlign: 'center', padding: '20px', background: 'rgba(52, 211, 153, 0.1)', border: '2px solid #34d399', borderRadius: '12px' }}>
                <h3 style={{ color: '#34d399', fontSize: '24px', margin: '0 0 10px 0' }}>🎉 정답입니다!</h3>
                <p style={{ color: '#f8fafc', fontSize: '18px', marginBottom: '20px' }}>{questions[currentIdx].eng}</p>
                <button onClick={handleNextQuestion} style={{
                  width: '100%', background: '#34d399', color: '#0f172a', border: 'none', padding: '16px', borderRadius: '12px',
                  fontWeight: 900, fontSize: '18px', cursor: 'pointer'
                }}>
                  다음 문제 ➔
                </button>
              </div>
            )}

            {/* 💡 피드백 상태가 WRONG일 때: 오답 해설 및 다음 버튼 */}
            {feedback === 'WRONG' && (
              <div style={{ padding: '20px', background: 'rgba(239, 68, 68, 0.1)', border: '2px solid #ef4444', borderRadius: '12px' }}>
                <h3 style={{ color: '#ef4444', fontSize: '24px', margin: '0 0 10px 0', textAlign: 'center' }}>🚨 아쉽네요, 오답입니다</h3>
                
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '4px' }}>내가 쓴 답:</div>
                  <div style={{ color: '#f8fafc', fontSize: '16px', textDecoration: 'line-through' }}>{userAnswer}</div>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '13px', color: '#34d399', marginBottom: '4px', fontWeight: 'bold' }}>올바른 정답:</div>
                  <div style={{ color: '#34d399', fontSize: '18px', fontWeight: 'bold' }}>{questions[currentIdx].eng}</div>
                </div>

                <div style={{ background: '#0f172a', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
                  <div style={{ fontSize: '13px', color: '#38bdf8', marginBottom: '6px', fontWeight: 'bold' }}>💡 해설 (유형: {questions[currentIdx].type})</div>
                  <div style={{ color: '#cbd5e1', fontSize: '15px', lineHeight: '1.5' }}>{questions[currentIdx].explanation}</div>
                </div>

                <button onClick={handleNextQuestion} style={{
                  width: '100%', background: '#ef4444', color: '#f8fafc', border: 'none', padding: '16px', borderRadius: '12px',
                  fontWeight: 900, fontSize: '18px', cursor: 'pointer'
                }}>
                  확인했습니다 (다음 문제) ➔
                </button>
              </div>
            )}
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
                {wrongQuestions.length === 0 ? '놀라운 실력입니다! 다음 레벨로 넘어갈 준비가 되었습니다.' : 'AI가 준비한 클리닉 문제에 도전하세요!'}
              </p>
            </div>

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