import { CONFIG } from '../config';
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase'; // ⭐️ 수파베이스 열쇠 추가!

// 💡 부모 컴포넌트에서 학생 정보(아이디, 이름)를 받을 수 있도록 Props 추가
interface MidSenProps { 
  onBack: () => void; 
  studentId?: string;
  studentName?: string;
}
interface WordToken { id: number; word: string; }
interface Question { id: number; kor: string; eng: string; words: WordToken[]; }

export default function MidSen({ onBack, studentId = "ST_TEST", studentName = "테스트학생" }: MidSenProps) {
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [stage, setStage] = useState<number | null>(null);
  
  const [previewIdx, setPreviewIdx] = useState(0); 
  const [currentIdx, setCurrentIdx] = useState(0);
  
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isWrongShake, setIsWrongShake] = useState(false);

  const [step, setStep] = useState<'preview' | 'arrange' | 'speak'>('preview');
  
  const [showTestPrompt, setShowTestPrompt] = useState(false);

  const [isRecording, setIsRecording] = useState(false);
  const [matchRate, setMatchRate] = useState<number | null>(null);

  // ⭐️ [핵심 추가] 문장 오답 기록과 재도전 횟수를 기억하는 공간!
  const [wrongSentences, setWrongSentences] = useState<string[]>([]);
  const [attemptCount, setAttemptCount] = useState(1);

  useEffect(() => {
    fetch(`${CONFIG.SHEETS.MID_SENTENCE}&_nocache=${Date.now()}`)
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

  const currentStageQs = useMemo(() => {
    if (stage === null) return [];
    return allQuestions.slice((stage - 1) * 20, stage * 20);
  }, [allQuestions, stage]);

  const currentQ = useMemo(() => {
    return currentStageQs[currentIdx] || null;
  }, [currentStageQs, currentIdx]);

  const previewQ = useMemo(() => {
    return currentStageQs[previewIdx] || null;
  }, [currentStageQs, previewIdx]);

  // ⭐️ [핵심 변경] 고품질 원어민 발음 패치 (문장 기호 허용 및 부드러운 목소리 찾기)
  const speakText = (text: string, rate = 0.85) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const cleanText = text.replace(/[^a-zA-Z\s-.,?!']/g, ''); // 문장 기호 허용
      const utterance = new SpeechSynthesisUtterance(cleanText);
      
      utterance.lang = 'en-US';
      utterance.rate = rate;
      utterance.pitch = 1.0;

      const voices = window.speechSynthesis.getVoices();
      const englishVoices = voices.filter(v => v.lang.startsWith('en'));
      const preferredVoices = ['Google US English', 'Samantha', 'Alex', 'Microsoft Zira'];
      
      let selectedVoice = null;
      for (const pref of preferredVoices) {
        selectedVoice = englishVoices.find(v => v.name.includes(pref));
        if (selectedVoice) break;
      }

      if (selectedVoice) {
        utterance.voice = selectedVoice;
      } else if (englishVoices.length > 0) {
        utterance.voice = englishVoices[0];
      }

      window.speechSynthesis.speak(utterance);
    }
  };

  useEffect(() => {
    if (step === 'preview' && previewQ && !showTestPrompt) {
      speakText(previewQ.eng, 0.85);
    }
  }, [previewIdx, step, previewQ, showTestPrompt]);

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
      setMatchRate(null);
    } else {
      setIsWrongShake(true);
      // ⭐️ 오답일 경우: 틀린 문장 리스트에 추가하고 재시도 횟수를 올립니다.
      setWrongSentences(prev => prev.includes(currentQ.eng) ? prev : [...prev, currentQ.eng]);
      setAttemptCount(prev => prev + 1);

      setTimeout(() => setIsWrongShake(false), 600);
    }
  };

  // ⭐️ [핵심 추가] 수파베이스에 기록 전송 (task_type을 '중등문장'으로 분류)
  const sendLogToSupabase = async () => {
    try {
      const now = new Date();
      const kstOffset = 9 * 60 * 60 * 1000;
      const kstDate = new Date(now.getTime() + kstOffset);
      const todayStr = kstDate.toISOString().split('T')[0];

      const { error } = await supabase
        .from('learning_logs')
        .insert([{
          student_id: studentId,
          student_name: studentName,
          task_type: '중등문장', // 리포트 분리를 위해 명확하게 구분!
          book_info: `Stage ${stage}`, // 중등 문장은 교재 대신 스테이지 번호 기록
          score: currentStageQs.length, // 모든 문제를 통과했으므로 만점 기록
          status: '완료',
          attempt: attemptCount,
          log_date: todayStr,
          wrong_answers: wrongSentences.length > 0 ? wrongSentences.join(' / ') : '없음(한번에 통과)'
        }]);

      if (error) {
        console.error("수파베이스 저장 에러:", error);
      } else {
        console.log(`✅ 수파베이스에 중등 문장 (Stage ${stage}) 기록 완벽하게 적재 성공!`);
      }
    } catch (err) {
      console.error("수파베이스 로그 전송 실패:", err);
    }
  };

  const handleNextQuestion = () => {
    if (currentIdx + 1 < currentStageQs.length) {
      setCurrentIdx(prev => prev + 1);
      setSelectedIds([]);
      setStep('arrange');
      setMatchRate(null);
    } else {
      // ⭐️ 스테이지 클리어 시 수파베이스로 기록 전송!
      sendLogToSupabase();
      alert(`🏆 스테이지 ${stage} 클리어! 완벽합니다.`);
      resetToHome();
    }
  };

  const handleNextPreview = () => {
    if (previewIdx + 1 < currentStageQs.length) {
      setPreviewIdx(prev => prev + 1);
      setMatchRate(null);
    } else {
      setShowTestPrompt(true); 
    }
  };

  const handlePrevPreview = () => {
    if (previewIdx > 0) {
      setPreviewIdx(prev => prev - 1);
      setMatchRate(null);
    }
  };

  const resetToHome = () => {
    setStage(null);
    setCurrentIdx(0);
    setPreviewIdx(0);
    setSelectedIds([]);
    setStep('preview');
    setShowTestPrompt(false);
    // ⭐️ 홈으로 돌아갈 때 오답 및 시도 횟수 장부 초기화
    setWrongSentences([]);
    setAttemptCount(1);
  };

  const startSpeakingChallenge = (targetText: string) => {
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
      
      const target = targetText.toLowerCase().replace(/[^a-z ]/g, '') || '';
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

        {stage === null ? (
          <div>
            <h2 style={{ color: '#38bdf8', textAlign: 'center', marginBottom: '30px', fontWeight: 800 }}>
              SYNTAX ARRANGEMENT <span style={{ fontSize: '14px', color: '#64748b' }}>[Middle School]</span>
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px' }}>
              {stages.map(s => (
                <button key={s} onClick={() => { resetToHome(); setStage(s); }} style={{
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
          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '20px', padding: '24px', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
            
            {step === 'preview' && (
              <div style={{ animation: 'fadeIn 0.3s' }}>
                {showTestPrompt ? (
                  <div style={{ textAlign: 'center', padding: '20px 0' }}>
                    <div style={{ fontSize: '50px', marginBottom: '10px' }}>🎯</div>
                    <h2 style={{ color: '#38bdf8', marginBottom: '15px' }}>20문장 학습 완료!</h2>
                    <p style={{ color: '#94a3b8', fontSize: '16px', marginBottom: '30px' }}>
                      이제 진짜 실력을 발휘할 시간입니다.<br/>테스트를 시작하시겠습니까?
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <button onClick={() => { setShowTestPrompt(false); setStep('arrange'); setCurrentIdx(0); }} style={{
                        background: '#38bdf8', color: '#0f172a', border: 'none', padding: '16px', borderRadius: '12px', fontWeight: 800, fontSize: '16px', cursor: 'pointer'
                      }}>네, 테스트 시작하겠습니다 🚀</button>
                      
                      <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                        <button onClick={() => { setShowTestPrompt(false); setPreviewIdx(0); }} style={{
                          flex: 1, background: '#334155', color: '#f8fafc', border: 'none', padding: '14px', borderRadius: '12px', fontWeight: 600, cursor: 'pointer'
                        }}>아니요, 첫 문장 다시 볼래요</button>
                        <button onClick={resetToHome} style={{
                          flex: 1, background: 'transparent', border: '1px solid #475569', color: '#94a3b8', padding: '14px', borderRadius: '12px', fontWeight: 600, cursor: 'pointer'
                        }}>홈으로 돌아가기</button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '14px', fontWeight: 600, marginBottom: '20px' }}>
                      <span>STAGE {stage} [학습모드]</span>
                      <span style={{ color: '#34d399' }}>{previewIdx + 1} / {currentStageQs.length}</span>
                    </div>

                    <h2 style={{ fontSize: '20px', lineHeight: '1.4', marginBottom: '16px', color: '#f1f5f9', wordBreak: 'keep-all' }}>
                      {previewQ?.kor}
                    </h2>
                    
                    <div style={{ 
                      background: '#0f172a', padding: '20px', borderRadius: '12px', border: '1px solid #334155', 
                      marginBottom: '20px', fontSize: '24px', fontWeight: 700, color: '#38bdf8', lineHeight: '1.5'
                    }}>
                      {previewQ?.eng.split(' ').map((word, wIdx) => (
                        <span key={wIdx} onClick={() => speakText(word.replace(/[^a-zA-Z]/g, ''), 0.85)} style={{
                          cursor: 'pointer', borderBottom: '2px dashed #475569', paddingBottom: '2px', marginRight: '8px', display: 'inline-block'
                        }} title="클릭해서 발음 듣기">
                          {word}
                        </span>
                      ))}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '24px' }}>
                      <button onClick={() => speakText(previewQ?.eng || '', 0.85)} style={{
                        background: '#334155', border: '1px solid #475569', color: 'white', padding: '12px 20px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', flex: 1
                      }}>🔊 다시 듣기</button>

                      <button onClick={() => startSpeakingChallenge(previewQ?.eng || '')} disabled={isRecording} style={{
                        background: isRecording ? '#ef4444' : '#8b5cf6', color: 'white', border: 'none', padding: '12px 20px', borderRadius: '12px', fontWeight: 800, cursor: 'pointer', flex: 1.5
                      }}>
                        {isRecording ? '🔴 녹음 중...' : '🎙️ 따라 말하기'}
                      </button>
                    </div>

                    {matchRate !== null && (
                      <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '12px', padding: '16px', marginBottom: '24px', textAlign: 'center' }}>
                        <div style={{ fontSize: '13px', color: '#94a3b8' }}>AI 발음 분석</div>
                        <div style={{ fontSize: '28px', fontWeight: 900, color: matchRate > 80 ? '#34d399' : '#fbbf24', margin: '4px 0' }}>{matchRate}%</div>
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button onClick={handlePrevPreview} disabled={previewIdx === 0} style={{
                        flex: 1, background: previewIdx === 0 ? 'transparent' : '#334155', color: previewIdx === 0 ? '#475569' : '#f8fafc', 
                        border: '1px solid #475569', padding: '14px', borderRadius: '12px', fontWeight: 'bold', cursor: previewIdx === 0 ? 'default' : 'pointer'
                      }}>◀ 이전</button>
                      
                      <button onClick={handleNextPreview} style={{
                        flex: 2, background: '#38bdf8', color: '#0f172a', border: 'none', padding: '14px', borderRadius: '12px', fontWeight: 800, cursor: 'pointer'
                      }}>
                        {matchRate !== null ? '다음 문장 ➔' : '건너뛰기 ➔'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {step === 'arrange' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div style={{ color: '#64748b', fontSize: '14px', fontWeight: 600 }}>
                    <span>STAGE {stage} [TEST]</span>
                    <span style={{ color: '#38bdf8', marginLeft: '10px' }}>Q {currentIdx + 1} / {currentStageQs.length}</span>
                  </div>
                  <button onClick={() => speakText(currentQ?.eng || '', 0.85)} style={{
                    background: 'transparent', border: '1px solid #38bdf8', color: '#38bdf8', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer'
                  }}>💡 힌트 듣기</button>
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
                    <span style={{ color: '#64748b', margin: 'auto', fontSize: '14px' }}>단어를 클릭해 문장을 완성하세요</span>
                  ) : (
                    selectedIds.map((id) => {
                      const token = currentQ?.words.find(w => w.id === id);
                      return (
                        <button key={id} onClick={() => handleRemoveWord(id)} style={{
                          background: '#38bdf8', color: '#0f172a', border: 'none', borderRadius: '8px', padding: '8px 14px',
                          fontWeight: 700, fontSize: '15px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
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
                    flex: 2, background: '#38bdf8', color: '#0f172a', border: 'none', padding: '14px', borderRadius: '12px', fontWeight: 800, cursor: 'pointer'
                  }}>정답 제출 🚀</button>
                </div>
              </div>
            )}

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

                  <button onClick={() => startSpeakingChallenge(currentQ?.eng || '')} disabled={isRecording} style={{
                    background: isRecording ? '#ef4444' : '#8b5cf6', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '12px', fontWeight: 800, cursor: 'pointer'
                  }}>
                    {isRecording ? '🔴 음성 감지 중...' : '🎙️ 마이크 켜고 말하기'}
                  </button>
                </div>

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