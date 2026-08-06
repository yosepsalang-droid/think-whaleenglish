import React, { useState, useEffect } from 'react';

interface Question {
  kor: string;
  eng: string;
  explanation: string;
  step1_q: string;
  step1_a: string;
  step2_q: string;
  step2_a: string;
}

interface MidGrammarProps {
  student?: any;
  onBack: () => void;
}

export default function MidGrammar({ student, onBack }: MidGrammarProps) {
  const [appPhase, setAppPhase] = useState<'SETUP' | 'LOADING' | 'QUIZ' | 'RESULT'>('SETUP');
  
  const [topic, setTopic] = useState("");
  const [qCount, setQCount] = useState<number>(5);
  const [level, setLevel] = useState<'초급' | '중급' | '고급' | '심화'>('초급');

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [blankInputs, setBlankInputs] = useState<string[]>([]);
  const [fullInput, setFullInput] = useState("");
  
  const [feedback, setFeedback] = useState("");
  const [feedbackStatus, setFeedbackStatus] = useState<'idle' | 'success' | 'error' | 'analyzing'>('idle');
  const [isErrorState, setIsErrorState] = useState(false);
  const [wrongCounts, setWrongCounts] = useState<number[]>([]);
  
  // 💡 실시간 맞춤형 오답 해설을 저장할 State 추가
  const [dynamicExplanation, setDynamicExplanation] = useState<string>("");

  const handleGenerate = async () => {
    if (!topic.trim()) {
      alert("풀고 싶은 문법 개념을 입력해 주세요! (예: 현재분사, 5형식)");
      return;
    }

    setAppPhase('LOADING');

    try {
      const rawApiKey = import.meta.env.VITE_GEMINI_API_KEY;
      const API_KEY = rawApiKey ? rawApiKey.trim() : "";
      
      if (!API_KEY) {
        alert("API 키를 찾을 수 없습니다.");
        setAppPhase('SETUP');
        return;
      }

      // 💡 빠르고 똑똑한 1.5-flash 모델 적용
      const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + API_KEY;

      const systemPrompt = `너는 중학교 영어 선생님이야.
      사용자가 요청하는 주제, 난이도, 문제 개수에 맞춰서 영어 문법 문제를 만들어줘.
      
      🚨 [매우 중요한 출제 규칙 - 반드시 지킬 것!] 🚨
      1. 다양성과 흥미: 중학생들이 공감할 수 있는 '학교생활, 게임, 아이돌 팬덤, 유튜브, 친구 관계' 등의 재미있는 상황을 배경으로 문장을 만들어줘!
      2. 누락 금지: 빈칸 문제(step1_q, step2_q)를 만들 때 원래 문장(eng)에 있던 단어를 절대 마음대로 삭제하거나 누락시키지 말 것.
      3. 정답 일치: 빈칸(_____)의 개수와 쉼표로 구분된 정답(step2_a)의 개수는 무조건 정확히 일치해야 해.
      
      반드시 아래의 JSON 배열 형식으로만 대답해. 마크다운 기호 없이 오직 순수한 JSON 배열만 출력할 것.
      
      [
        {
          "kor": "나는 새로 나온 게임을 하면서 피자를 먹었다.",
          "eng": "I ate pizza playing the new game.",
          "explanation": "동시동작 분사구문 기본 해설 (오답 시에는 실시간 맞춤 해설이 제공됨)",
          "step1_q": "I ate pizza _____ the new game.",
          "step1_a": "playing",
          "step2_q": "I ate _____ _____ the new game.",
          "step2_a": "pizza, playing"
        }
      ]
      
      지금 만들어야 할 문제 조건: 
      - 주제: ${topic}
      - 난이도: ${level} 
      - 개수: ${qCount}개
      
      시작!`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: systemPrompt }] }],
          generationConfig: { temperature: 0.8 }
        })
      });

      if (!response.ok) {
        throw new Error(`Google API 오류 (${response.status})`);
      }

      const data = await response.json();
      
      if (!data.candidates || data.candidates.length === 0) {
        throw new Error("제미나이가 응답을 생성하지 못했습니다.");
      }
      
      let generatedText = data.candidates[0].content.parts[0].text;
      generatedText = generatedText.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsedQuestions = JSON.parse(generatedText);
      
      setQuestions(parsedQuestions);
      setWrongCounts(Array(qCount).fill(0));
      setCurrentIndex(0);
      setCurrentStep(1);
      setAppPhase('QUIZ');

    } catch (error: any) {
      console.error("AI 문제 생성 실패:", error);
      alert(`문제 생성 실패!\n이유: ${error.message}`);
      setAppPhase('SETUP');
    }
  };

  const finishStudy = () => {
    const totalWrongs = wrongCounts.reduce((a, b) => a + b, 0);
    const score = Math.max(0, 100 - (totalWrongs * 5));

    const studyRecord = {
      studentId: student?.id || 'unknown',
      studentName: student?.name || '익명 학생',
      topicAnalyzed: topic,
      level: level,
      totalQuestions: qCount,
      totalWrongs: totalWrongs,
      score: score,
      detailLogs: wrongCounts,
      date: new Date().toISOString()
    };

    console.log("📊 [관리자 DB로 전송될 데이터 요약]:", studyRecord);
    setAppPhase('RESULT');
  };

  useEffect(() => {
    setFeedback("");
    setFeedbackStatus('idle');
    setIsErrorState(false);
    setDynamicExplanation("");
    setBlankInputs([]);
    setFullInput("");
  }, [currentIndex, currentStep]);

  // 💡 [핵심 기능] 실시간 맞춤형 오답 분석 API 호출 함수
  const fetchDynamicFeedback = async (wrongInput: string, correctAnswer: string) => {
    setFeedbackStatus('analyzing');
    setFeedback("어디가 틀렸는지 AI 선생님이 꼼꼼하게 분석 중입니다... 🧐");
    setDynamicExplanation("");
    
    try {
      const API_KEY = import.meta.env.VITE_GEMINI_API_KEY?.trim();
      const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + API_KEY;

      const prompt = `너는 친절한 중학교 영어 선생님이야. 학생이 문법 문제를 틀렸어.
      - 원래 목표 문장: "${questions[currentIndex].eng}"
      - 정답: "${correctAnswer}"
      - 학생이 제출한 오답: "${wrongInput}"

      이 학생이 왜 이런 오답을 적었는지 문법적 원인을 분석하고, 어떻게 고쳐야 하는지 중학생 눈높이에 맞춰서 2~3줄로 따뜻하고 친절하게 설명해 줘. 정답만 툭 던지지 말고 이해할 수 있게 도와줘.`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.7 } })
      });

      const data = await response.json();
      const aiExplanation = data.candidates[0].content.parts[0].text;
      
      setDynamicExplanation(aiExplanation);
      setFeedbackStatus('error');
      setFeedback("앗, 오답입니다! AI 선생님의 1:1 맞춤 피드백을 확인해 보세요. 👇");

    } catch (error) {
      // API 호출 실패 시 기존 고정 해설 표시
      setDynamicExplanation(questions[currentIndex].explanation);
      setFeedbackStatus('error');
      setFeedback("앗, 오답입니다! 해설을 참고해서 다시 도전해 보세요.");
    }
  };

  const handleIncorrect = (wrongInput: string, correctAnswer: string) => {
    setIsErrorState(true);
    
    const newWrongCounts = [...wrongCounts];
    newWrongCounts[currentIndex] += 1;
    setWrongCounts(newWrongCounts);

    // 실시간 피드백 요청
    fetchDynamicFeedback(wrongInput, correctAnswer);
  };

  const handleSubmit = () => {
    const question = questions[currentIndex];

    if (isErrorState) {
      setIsErrorState(false);
      setFeedbackStatus('idle');
      setFeedback("");
      setDynamicExplanation("");
      return;
    }

    if (currentStep === 1) {
      const userAnswer = blankInputs[0]?.trim();
      const isCorrect = userAnswer?.toLowerCase() === question.step1_a?.trim().toLowerCase();
      if (isCorrect) {
        setFeedback("좋아요! 핵심 형태를 정확히 짚어냈어요. 👍");
        setFeedbackStatus('success');
        setTimeout(() => setCurrentStep(2), 1200);
      } else {
        handleIncorrect(userAnswer || "(빈칸 제출)", question.step1_a);
      }

    } else if (currentStep === 2) {
      const answers = question.step2_a?.split(',').map(a => a.trim().toLowerCase()) || [];
      const userAnswerStr = blankInputs.join(', ');
      const isAllCorrect = blankInputs.every((input, i) => input?.trim().toLowerCase() === answers[i]);
      
      if (isAllCorrect && blankInputs.length === answers.length) {
        setFeedback("완벽해요! 문장 구조가 머릿속에 잡혔군요. ✨");
        setFeedbackStatus('success');
        setTimeout(() => setCurrentStep(3), 1200);
      } else {
        handleIncorrect(userAnswerStr || "(일부 빈칸 제출)", question.step2_a);
      }

    } else if (currentStep === 3) {
      const cleanEng = question.eng.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
      const cleanInput = fullInput.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
      
      if (cleanEng === cleanInput) {
        setFeedback("정답입니다! 완벽하게 영작해냈어요! 🚀");
        setFeedbackStatus('success');
        setTimeout(() => {
          if (currentIndex + 1 >= questions.length) {
            finishStudy(); 
          } else {
            setCurrentIndex(prev => prev + 1);
            setCurrentStep(1);
          }
        }, 1500);
      } else {
        handleIncorrect(fullInput || "(빈 문장 제출)", question.eng);
      }
    }
  };

  const renderQuestionWithBlanks = (qString?: string) => {
    if (!qString) return null;
    const parts = qString.split('_____');
    return (
      <div style={{ fontSize: '20px', fontWeight: '600', color: '#333', lineHeight: '2', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
        {parts.map((part, index) => (
          <React.Fragment key={index}>
            <span>{part}</span>
            {index < parts.length - 1 && (
              <input
                type="text"
                value={blankInputs[index] || ""}
                disabled={isErrorState || feedbackStatus === 'success' || feedbackStatus === 'analyzing'}
                onChange={(e) => {
                  const newInputs = [...blankInputs];
                  newInputs[index] = e.target.value;
                  setBlankInputs(newInputs);
                }}
                style={{ width: '100px', border: 'none', borderBottom: `3px solid ${isErrorState ? '#ff3b30' : '#007aff'}`, backgroundColor: isErrorState ? '#ffeceb' : '#f0f8ff', color: '#007aff', fontWeight: '800', fontSize: '20px', textAlign: 'center', outline: 'none', padding: '4px 8px', borderRadius: '6px 6px 0 0', opacity: isErrorState ? 0.7 : 1 }}
                autoFocus={index === 0 && !isErrorState && feedbackStatus !== 'analyzing'}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              />
            )}
          </React.Fragment>
        ))}
      </div>
    );
  };

  if (appPhase === 'SETUP') {
    return (
      <div style={{ backgroundColor: '#f9f9f9', minHeight: '100vh', padding: '20px', fontFamily: 'Pretendard, sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ width: '100%', maxWidth: '420px', background: 'white', borderRadius: '24px', padding: '32px 24px', boxShadow: '0 8px 24px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#8e8e93', fontSize: '16px', fontWeight: '700', cursor: 'pointer' }}>← 뒤로</button>
            <h2 style={{ fontSize: '20px', fontWeight: '800', margin: 0, color: '#1c1c1e' }}>🧠 AI 맞춤 문법</h2>
            <div style={{ width: '40px' }}></div>
          </div>
          
          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '14px', fontWeight: '700', color: '#8e8e93', display: 'block', marginBottom: '8px' }}>1. 풀고 싶은 문법 (제미나이 생성)</label>
            <input type="text" value={topic} onChange={e => setTopic(e.target.value)} placeholder="예) 현재분사, 관계대명사 주격" style={{ width: '100%', padding: '16px', fontSize: '16px', borderRadius: '12px', border: '2px solid #e5e5ea', boxSizing: 'border-box', outline: 'none' }} />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '14px', fontWeight: '700', color: '#8e8e93', display: 'block', marginBottom: '8px' }}>2. 문제 갯수</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {[3, 5, 10].map(num => (
                <button key={num} onClick={() => setQCount(num)} style={{ flex: 1, padding: '12px', borderRadius: '12px', fontWeight: '700', border: `2px solid ${qCount === num ? '#007aff' : '#e5e5ea'}`, backgroundColor: qCount === num ? '#f0f8ff' : 'white', color: qCount === num ? '#007aff' : '#333', cursor: 'pointer' }}>{num}문제</button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: '32px' }}>
            <label style={{ fontSize: '14px', fontWeight: '700', color: '#8e8e93', display: 'block', marginBottom: '8px' }}>3. 난이도</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {['초급', '중급', '고급', '심화'].map(lvl => (
                <button key={lvl} onClick={() => setLevel(lvl as any)} style={{ padding: '12px', borderRadius: '12px', fontWeight: '700', border: `2px solid ${level === lvl ? '#007aff' : '#e5e5ea'}`, backgroundColor: level === lvl ? '#f0f8ff' : 'white', color: level === lvl ? '#007aff' : '#333', cursor: 'pointer' }}>{lvl}</button>
              ))}
            </div>
          </div>

          <button onClick={handleGenerate} style={{ width: '100%', backgroundColor: '#007aff', color: 'white', border: 'none', padding: '18px', borderRadius: '16px', fontSize: '18px', fontWeight: '800', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,122,255,0.3)' }}>
            🚀 AI 맞춤 문제 생성하기
          </button>
        </div>
      </div>
    );
  }
  
  if (appPhase === 'LOADING') {
    return (
      <div style={{ backgroundColor: '#f9f9f9', minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', fontFamily: 'Pretendard, sans-serif', textAlign: 'center' }}>
        <div>
          <div style={{ fontSize: '60px', marginBottom: '16px', animation: 'spin 2s linear infinite' }}>🤖</div>
          <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#333' }}>제미나이가 맞춤 문제를<br/>실시간으로 만들고 있습니다...</h3>
          <p style={{ color: '#007aff', fontWeight: '700', marginTop: '12px' }}>목표: {topic} ({level})</p>
        </div>
      </div>
    );
  }

  if (appPhase === 'RESULT') {
    const totalWrongs = wrongCounts.reduce((a, b) => a + b, 0);
    return (
      <div style={{ backgroundColor: '#f9f9f9', minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', fontFamily: 'Pretendard, sans-serif', textAlign: 'center' }}>
        <div style={{ background: 'white', padding: '40px', borderRadius: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', maxWidth: '360px' }}>
          <div style={{ fontSize: '60px', marginBottom: '16px' }}>{totalWrongs === 0 ? '🏆' : '📊'}</div>
          <h2 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '8px', color: '#333' }}>학습 기록 완료!</h2>
          <p style={{ color: '#8e8e93', marginBottom: '24px', lineHeight: '1.5' }}>
            수고했어요!<br/>총 <b>{totalWrongs}번</b>의 오답을 수정하며<br/><b>[{topic}]</b> 완벽하게 마스터했습니다.
          </p>
          <button onClick={onBack} style={{ backgroundColor: '#007aff', color: 'white', border: 'none', padding: '14px 28px', borderRadius: '16px', fontWeight: '700', fontSize: '16px', width: '100%', cursor: 'pointer' }}>홈으로 돌아가기</button>
        </div>
      </div>
    );
  }

  const question = questions[currentIndex];
  if (!question) return null;

  const stepInfo = {
    1: { title: "핵심 형태 찾기", icon: "🎯" },
    2: { title: "문장 구조 완성", icon: "🧩" },
    3: { title: "전체 문장 영작", icon: "🚀" }
  };

  return (
    <div style={{ backgroundColor: '#f9f9f9', minHeight: '100vh', padding: '20px', fontFamily: 'Pretendard, sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ width: '100%', maxWidth: '420px', display: 'flex', flexDirection: 'column', flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#8e8e93', fontSize: '16px', fontWeight: '700', cursor: 'pointer', padding: '8px 0' }}>← 중단하기</button>
          <div style={{ backgroundColor: '#f0f8ff', color: '#007aff', padding: '6px 14px', borderRadius: '20px', fontSize: '14px', fontWeight: '800' }}>Q {currentIndex + 1} / {questions.length}</div>
        </div>

        <div style={{ background: 'white', borderRadius: '24px', padding: '32px 24px', boxShadow: '0 8px 24px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
          <div style={{ backgroundColor: currentStep === 3 ? '#f0ebff' : '#f0f8ff', color: currentStep === 3 ? '#5e5ce6' : '#007aff', padding: '8px 16px', borderRadius: '12px', fontSize: '14px', fontWeight: '800', marginBottom: '20px', display: 'flex', gap: '6px' }}>
            <span>{stepInfo[currentStep as 1|2|3].icon}</span>
            <span>Step {currentStep}. {stepInfo[currentStep as 1|2|3].title}</span>
          </div>
          
          <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#1c1c1e', textAlign: 'center', wordBreak: 'keep-all', lineHeight: '1.4', marginBottom: '32px' }}>"{question.kor}"</h2>

          <div style={{ width: '100%', minHeight: '80px', display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '16px' }}>
            {currentStep === 1 && renderQuestionWithBlanks(question.step1_q)}
            {currentStep === 2 && renderQuestionWithBlanks(question.step2_q)}
            {currentStep === 3 && (
              <input
                type="text" value={fullInput} disabled={isErrorState || feedbackStatus === 'success' || feedbackStatus === 'analyzing'}
                onChange={(e) => setFullInput(e.target.value)}
                placeholder="전체 영어 문장을 완성하세요."
                style={{ width: '100%', padding: '18px 20px', fontSize: '18px', fontWeight: '600', color: '#333', backgroundColor: isErrorState ? '#ffeceb' : '#f9f9f9', border: `2px solid ${isErrorState ? '#ff3b30' : '#e5e5ea'}`, borderRadius: '16px', outline: 'none', textAlign: 'center', opacity: isErrorState ? 0.8 : 1 }}
                autoFocus={!isErrorState && feedbackStatus !== 'analyzing'} onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              />
            )}
          </div>

          <div style={{ height: '24px', marginBottom: isErrorState || feedbackStatus === 'analyzing' ? '12px' : '24px', width: '100%', textAlign: 'center' }}>
            {feedback && (
              <span style={{ color: feedbackStatus === 'success' ? '#34c759' : (feedbackStatus === 'analyzing' ? '#ff9500' : '#ff3b30'), fontWeight: '700', fontSize: '15px' }}>{feedback}</span>
            )}
          </div>

          {isErrorState && dynamicExplanation && (
            <div style={{ backgroundColor: '#fff0f0', padding: '16px', borderRadius: '16px', width: '100%', boxSizing: 'border-box', marginBottom: '24px', border: '1px solid #ffcdd2', animation: 'fadeIn 0.3s ease-in-out' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <span style={{ fontSize: '18px' }}>💡</span>
                <span style={{ color: '#d32f2f', fontWeight: '800', fontSize: '15px' }}>AI 1:1 맞춤 피드백</span>
              </div>
              <p style={{ margin: 0, fontSize: '15px', color: '#444', lineHeight: '1.6', wordBreak: 'keep-all' }}>{dynamicExplanation}</p>
            </div>
          )}

          <button 
            onClick={handleSubmit} 
            disabled={feedbackStatus === 'analyzing'}
            style={{ width: '100%', backgroundColor: feedbackStatus === 'success' ? '#34c759' : (isErrorState ? '#ff3b30' : (feedbackStatus === 'analyzing' ? '#e5e5ea' : '#007aff')), color: feedbackStatus === 'analyzing' ? '#8e8e93' : 'white', border: 'none', padding: '18px', borderRadius: '16px', fontSize: '18px', fontWeight: '800', cursor: feedbackStatus === 'analyzing' ? 'not-allowed' : 'pointer', boxShadow: feedbackStatus === 'success' ? '0 4px 12px rgba(52,199,89,0.3)' : (isErrorState ? '0 4px 12px rgba(255,59,48,0.3)' : (feedbackStatus === 'analyzing' ? 'none' : '0 4px 12px rgba(0,122,255,0.3)')), marginTop: 'auto', transition: 'all 0.2s ease' }}
          >
            {feedbackStatus === 'success' ? '통과!' : (isErrorState ? '↻ 다시 풀기' : (feedbackStatus === 'analyzing' ? 'AI 분석 중...' : '정답 확인하기'))}
          </button>
        </div>
      </div>
    </div>
  );
}