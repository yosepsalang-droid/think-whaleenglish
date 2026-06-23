import React, { useState, useEffect, useMemo } from 'react';

interface MidSenProps { onBack: () => void; }
interface Question { id: number; kor: string; eng: string; words: string[]; }

const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTA4Z1o77LMkO66syR0SmqmWPu6q5NapogmBA2iOxpd379nYZ4Gu7y9h7KmGTVb9H9WXNfM5EnFlBxe/pub?gid=2069604392&single=true&output=csv";

export default function MidSen({ onBack }: MidSenProps) {
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [stage, setStage] = useState<number | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [userAns, setUserAns] = useState<string[]>([]);
  const [status, setStatus] = useState<'idle' | 'correct' | 'wrong'>('idle');

  useEffect(() => {
    fetch(`${CSV_URL}&_nocache=${Date.now()}`)
      .then(res => res.text())
      .then(text => {
        const rows = text.split(/\r?\n/).slice(1);
        const data = rows.map((row, i) => {
          const cells = row.split(',');
          // A:id, B:cat, C:point, D:kor(3), E:eng(4)
          return { 
            id: i, 
            kor: cells[3], 
            eng: cells[4], 
            words: cells[4] ? cells[4].trim().split(' ').sort(() => Math.random() - 0.5) : [] 
          };
        }).filter(q => q.eng);
        setAllQuestions(data);
      });
  }, []);

  const stages = useMemo(() => {
    const num = Math.ceil(allQuestions.length / 20);
    return Array.from({ length: num }, (_, i) => i + 1);
  }, [allQuestions]);

  const currentStageQs = useMemo(() => {
    if (stage === null) return [];
    return allQuestions.slice((stage - 1) * 20, stage * 20);
  }, [allQuestions, stage]);

  const handleWordClick = (word: string) => {
    if (status !== 'idle') return;
    setUserAns([...userAns, word]);
  };

  const checkAnswer = () => {
    if (userAns.join(' ') === currentStageQs[currentIdx].eng.trim()) {
      setStatus('correct');
      setTimeout(() => {
        if (currentIdx + 1 < currentStageQs.length) { 
            setCurrentIdx(prev => prev + 1); 
            setUserAns([]); 
            setStatus('idle'); 
        } else { 
            setStage(null); 
            setCurrentIdx(0); 
            setStatus('idle'); 
        }
      }, 1000);
    } else { 
        setStatus('wrong'); 
        setTimeout(() => setStatus('idle'), 1000); 
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '500px', margin: 'auto', textAlign: 'center', fontFamily: 'Pretendard' }}>
      <button onClick={onBack} style={{ marginBottom: '20px', cursor: 'pointer' }}>⬅️ 홈으로</button>
      
      {stage === null ? (
        <div>
          <h3>단계별 문장 배열 테스트</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {stages.map(s => (
                <button key={s} onClick={() => { setStage(s); setCurrentIdx(0); setUserAns([]); }} 
                    style={{ padding: '15px', borderRadius: '10px', border: '1px solid #ddd', cursor: 'pointer' }}>
                    Stage {s} ({ (s-1)*20 + 1 } ~ { Math.min(s*20, allQuestions.length) })
                </button>
            ))}
          </div>
        </div>
      ) : (
        <div>
          <h4>Stage {stage} - {currentIdx + 1}/20</h4>
          <h2 style={{ fontSize: '22px', margin: '20px 0', minHeight: '60px' }}>{currentStageQs[currentIdx]?.kor}</h2>
          
          <div style={{ minHeight: '50px', background: '#f9f9f9', padding: '15px', marginBottom: '20px', borderRadius: '10px', border: '2px dashed #ccc' }}>
            {userAns.join(' ') || "단어를 클릭하여 문장을 만드세요"}
          </div>
          
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '10px' }}>
            {currentStageQs[currentIdx]?.words.map((w, i) => (
              <button key={i} onClick={() => handleWordClick(w)} style={{ padding: '10px 15px', cursor: 'pointer' }}>{w}</button>
            ))}
          </div>
          
          <div style={{ marginTop: '30px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <button onClick={() => setUserAns([])} style={{ padding: '10px 20px' }}>초기화</button>
            <button onClick={checkAnswer} style={{ padding: '10px 20px', background: '#007aff', color: 'white', border: 'none' }}>정답 확인</button>
          </div>
          
          {status === 'correct' && <div style={{ color: 'green', marginTop: '10px', fontWeight: 'bold' }}>⭕ 정답! 다음 문제로...</div>}
          {status === 'wrong' && <div style={{ color: 'red', marginTop: '10px', fontWeight: 'bold' }}>❌ 다시 생각해봐!</div>}
        </div>
      )}
    </div>
  );
}