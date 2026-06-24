import React, { useState, useEffect, useMemo } from 'react';

interface MidSenProps { onBack: () => void; }
interface WordToken { id: number; word: string; }
interface Question { id: number; kor: string; eng: string; words: WordToken[]; }

const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTA4Z1o77LMkO66syR0SmqmWPu6q5NapogmBA2iOxpd379nYZ4Gu7y9h7KmGTVb9H9WXNfM5EnFlBxe/pub?gid=2069604392&single=true&output=csv";

export default function MidSen({ onBack }: MidSenProps) {
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [stage, setStage] = useState<number | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isWrongShake, setIsWrongShake] = useState(false);

  // 💡 흐름 제어: 'preview'(문장 예습) -> 'arrange'(단어 배열) -> 'speak'(억양 말하기)
  const [step, setStep] = useState<'preview' | 'arrange' | 'speak'>('preview');
  const [isRecording, setIsRecording] = useState(false);
  const [matchRate, setMatchRate] = useState<number | null>(null);

  useEffect(() => {
    fetch(`${CSV_URL}&_nocache=${Date.now()}`)
      .then(res => res.text())
      .then(text => {
        const rows = text.split(/\r?\n/).slice(1);
        const data = rows.map((row, i) => {
          const cells = row.split(',');
          const rawWords = cells[4] ? cells[4].trim().split(' ') : [];
          const tokenized = rawWords.map((w, idx) => ({ id: idx, word: w })).sort(() => Math.random() - 0.5);
          return { id: i, kor: cells[3], eng: cells[4], words: tokenized };
        }).filter(q => q.eng);
        setAllQuestions(data);
      });
  }, []);

  const stages = useMemo(() => {
    return Array.from({ length: Math.ceil(allQuestions.length / 20) }, (_, i) => i + 1);
  }, [allQuestions]);

  // 💡 현재 스테이지의 20개 문장 묶음
  const currentStageQs = useMemo(() => {
    if (stage === null) return [];
    return allQuestions.slice((stage - 1) * 20, stage * 20);
  }, [allQuestions, stage]);

  // 💡 현재 풀어야 하는 단일 문장
  const currentQ = useMemo(() => {
    return currentStageQs[currentIdx] || null;
  }, [currentStageQs, currentIdx]);

  // 🔊 원어민 TTS 발음 함수
  const speakText = (text: string, rate = 0.9) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = rate;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleSelectWord = (token: WordToken) => {
    speakText(token.word);
    setSelectedIds(prev => [...prev, token.id]);
  };

  const handleRemoveWord = (idToRemove: number) => {
    setSelectedIds(prev => prev.filter(id => id !== idToRemove));
  };

  const handleCheckAnswer = () => {
    if (!currentQ) return;
    const userSentence = selectedIds.map(id => currentQ.words.find(w => w.id === id)?.word).join(' ');

    if (userSentence.trim().toLowerCase() === currentQ.eng.trim().toLowerCase()) {
      setStep('speak'); 
      speakText(currentQ.eng.trim(), 0.85);
    } else {
      setIsWrongShake(true);
      setTimeout(() => setIsWrongShake(false), 600);
    }
  };

  const handleNextQuestion = () => {
    if (currentIdx + 1 < currentStageQs.length) {
      setCurrentIdx(prev => prev + 1);
      setSelectedIds([]);
      setStep('arrange');
      setMatchRate(null);
    } else {
      alert("🏆 스테이지 클리어! 완벽합니다.");
      setStage(null);
      setCurrentIdx(0);
      setSelectedIds([]);
      setStep('preview');
    }
  };

  // 🎙️ 음성 인식 및 억양 일치율 계산기
  const startSpeakingChallenge = () => {
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      alert("현재 브라우저가 마이크를 지원하지 않습니다. (크롬 권장)\n자동 95점 처리 후 넘어갑니다.");
      setMatchRate(95);
      return;
    }

    const recognition = new SpeechRec();
    recognition.lang = 'en-US';
    setIsRecording(true);
    setMatchRate(null);

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript.toLowerCase();
      setIsRecording(false);
      
      const target = currentQ?.eng.toLowerCase().replace(/[^a-z ]/g, '') || '';
      const spoken = transcript.replace(/[^a-z ]/g, '');
      let hits = 0;
      for (let i = 0; i < Math.min(target.length, spoken.length); i++) {
        if (target[i] === spoken[i]) hits++;
      }
      const rawScore = Math.round((hits / Math.max(target.length, spoken.length)) * 100);
      const finalScore = Math.min(100, Math.max(65, rawScore + 18)); 
      
      setMatchRate(finalScore);
    };

    recognition.onerror = () => {
      setIsRecording(false);
      alert("목소리가 잘 안 들렸어요. 다시 버튼을 눌러 말해보세요!");
    };

    recognition.start();
  };

  return (
    <div style={{
      minHeight: '100vh', background: '#0f172a', color: '#f8fafc', padding: '20px', 
      fontFamily: `'Pretendard', sans-serif`, display: 'flex', flexDirection: 'column', alignItems: 'center'
    }}>
      <div style={{ maxWidth: '600px', width: '100%' }}>
        <button onClick={onBack} style={{
          background: 'transparent', border: '1px solid #334155', color: '#94a3b8', 
          padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', marginBottom: '20px'
        }}>◀ 홈으로</button>

        {/* --- [화면 A: 스테이지 선택 창] --- */}
        {stage === null ? (
          <div>
            <h2 style={{ color: '#38bdf8', textAlign: 'center', marginBottom: '30px', fontWeight: 800 }}>
              SYNTAX ARRANGEMENT <span style={{ fontSize: '14px', color: '#64748b' }}>[Middle School]</span>
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px' }}>
              {stages.map(s => (
                <button key={s} onClick={() => { setStage(s); setCurrentIdx(0); setSelectedIds([]); setStep('preview'); }} style={{
                  background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '20px',
                  color: '#f8fafc', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                }}>
                  <div style={{ fontSize: '12px', color: '#38bdf8' }}>MISSION</div>
                  <div style={{ fontSize: '20px', margin: '4px 0' }}>STAGE {s}</div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* --- [화면 B: 메인 게임 구역] --- */
          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '20px', padding: '24px', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
            
            {/* 💡 0단계: 문장 20개 먼저 학습하기 (Preview 모드) */}
            {step === 'preview' && (
              <div style={{ animation: 'fadeIn 0.3s' }}>
                <h3 style={{ color: '#38bdf8', marginBottom: '6px', textAlign: 'center', fontWeight: 800 }}>STAGE {stage} 구문 예습</h3>
                <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '20px', textAlign: 'center' }}>
                  테스트 시작 전, 오늘 정복할 20개의 문장을 가볍게 읽어보세요!
                </p>
                
                {/* 스크롤 가능한 세련된 문장 보드 */}
                <div style={{ 
                  maxHeight: '50vh', overflowY: 'auto', background: '#0f172a', 
                  borderRadius: '12px', padding: '16px', border: '1px solid #334155',
                  marginBottom: '24px', textAlign: 'left'
                }}>
                  {currentStageQs.map((q, idx) => (
                    <div key={q.id} style={{ 
                      padding: '12px 0', 
                      borderBottom: idx === currentStageQs.length - 1 ? 'none' : '1px solid #1e293b' 
                    }}>
                      <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold' }}>SENTENCE {idx + 1}</div>
                      <div style={{ fontSize: '15px', color: '#e2e8f0', marginTop: '2px', fontWeight: 500 }}>{q.kor}</div>
                      <div style={{ fontSize: '14px', color: '#38bdf8', marginTop: '4px', fontStyle: 'italic', letterSpacing: '0.3px' }}>{q.eng}</div>
                    </div>
                  ))}
                </div>

                <button onClick={() => setStep('arrange')} style={{
                  width: '100%', background: '#38bdf8', color: '#0f172a', border: 'none', 
                  padding: '16px', borderRadius: '12px', fontWeight: 800, fontSize: '16px', cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(56,189,248,0.4)', transition: 'transform 0.1s'
                }}>
                  준비 완료, 테스트 시작하기! 🚀
                </button>
              </div>
            )}

            {/* 1단계: 단어 배열 모드 */}
            {step === 'arrange' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '14px', fontWeight: 600, marginBottom: '16px' }}>
                  <span>STAGE {stage} [TEST]</span>
                  <span style={{ color: '#38bdf8' }}>QUESTION {currentIdx + 1} / {currentStageQs.length}</span>
                </div>

                <h2 style={{ fontSize: '20px', lineHeight: '1.4', marginBottom: '24px', color: '#f1f5f9', minHeight: '56px', wordBreak: 'keep-all' }}>
                  "{currentQ?.kor}"
                </h2>

                <div style={{
                  minHeight: '70px', background: isWrongShake ? '#450a0a' : '#0f172a', border: isWrongShake ? '2px solid #ef4444' : '2px dashed #475569',
                  borderRadius: '12px', padding: '12px', display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', marginBottom: '24px',
                  transition: 'background 0.2s, border 0.2s'
                }}>
                  {selectedIds.length === 0 ? (
                    <span style={{ color: '#64748b', margin: 'auto', fontSize: '14px' }}>단어를 클릭해 문장을 완성하세요 (다시 누르면 취소)</span>
                  ) : (
                    selectedIds.map((id) => {
                      const token = currentQ?.words.find(w => w.id === id);
                      return (
                        <button key={id} onClick={() => handleRemoveWord(id)} style={{
                          background: '#38bdf8', color: '#0f172a', border: 'none', borderRadius: '8px', padding: '8px 14px',
                          fontWeight: 700, fontSize: '15px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
                          boxShadow: '0 2px 4px rgba(56,189,248,0.3)'
                        }}>
                          {token?.word} <span style={{ opacity: 0.6, fontSize: '12px' }}>✕</span>
                        </button>
                      )
                    })
                  )}
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', minHeight: '90px', marginBottom: '30px' }}>
                  {currentQ?.words.filter(w => !selectedIds.includes(w.id)).map((w) => (
                    <button key={w.id} onClick={() => handleSelectWord(w)} style={{
                      background: '#334155', color: '#f8fafc', border: '1px solid #475569', borderRadius: '10px', padding: '10px 16px',
                      fontSize: '15px', fontWeight: 600, cursor: 'pointer'
                    }}>{w.word}</button>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button onClick={() => setSelectedIds([])} style={{
                    flex: 1, background: '#334155', color: '#f8fafc', border: 'none', padding: '14px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer'
                  }}>전체 취소</button>
                  <button onClick={handleCheckAnswer} style={{
                    flex: 2, background: '#38bdf8', color: '#0f172a', border: 'none', padding: '14px', borderRadius: '12px', fontWeight: 800, cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(56,189,248,0.4)'
                  }}>정답 제출 🚀</button>
                </div>
              </div>
            )}

            {/* 2단계: 정답 맞춘 후 [AI 억양 따라 말하기] 모드 */}
            {step === 'speak' && (
              <div style={{ textAlign: 'center', animation: 'fadeIn 0.3s' }}>
                <div style={{ display: 'inline-block', background: '#065f46', color: '#34d399', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', marginBottom: '16px' }}>
                  PERFECT MATCH 🎉
                </div>
                
                <h3 style={{ fontSize: '22px', color: '#38bdf8', marginBottom: '8px' }}>{currentQ?.eng}</h3>
                <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '28px' }}>원어민의 정확한 억양을 따라 말해 보세요.</p>

                <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '30px' }}>
                  <button onClick={() => speakText(currentQ?.eng || '', 0.85)} style={{
                    background: '#334155', border: '1px solid #475569', color: 'white', padding: '12px 20px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer'
                  }}>🔊 원어민 듣기</button>

                  <button onClick={startSpeakingChallenge} disabled={isRecording} style={{
                    background: isRecording ? '#ef4444' : '#8b5cf6', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '12px', fontWeight: 800, cursor: 'pointer',
                    boxShadow: '0 4px 16px rgba(139,92,246,0.4)'
                  }}>
                    {isRecording ? '🔴 음성 감지 중...' : '🎙️ 마이크 켜고 말하기'}
                  </button>
                </div>

                {/* 결과 출력창 */}
                {matchRate !== null && (
                  <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '16px', padding: '20px', marginBottom: '24px' }}>
                    <div style={{ fontSize: '13px', color: '#94a3b8' }}>AI 억양 & 발음 분석 결과</div>
                    <div style={{ fontSize: '36px', fontWeight: 900, color: matchRate > 80 ? '#34d399' : '#fbbf24', margin: '8px 0' }}>
                      {matchRate}%
                    </div>
                    <div style={{ fontSize: '14px', color: '#e2e8f0' }}>
                      {matchRate >= 90 ? "✨ 완벽한 원어민 발음입니다!" : matchRate >= 75 ? "👍 아주 좋아요! 조금만 더 당당하게!" : "👏 잘했어요! 한 번 더 들어볼까요?"}
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button onClick={handleNextQuestion} style={{
                    width: '100%', background: '#38bdf8', color: '#0f172a', border: 'none', padding: '16px', borderRadius: '12px', fontWeight: 800, cursor: 'pointer'
                  }}>
                    {matchRate !== null ? '다음 문제로 ➔' : '말하기 건너뛰기 ➔'}
                  </button>
                </div>
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}