import React, { useState, useEffect } from 'react';

// 제미나이가 생성해 줄 문제의 완벽한 규격
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
  // 🎯 화면 상태 관리
  const [appPhase, setAppPhase] = useState<'SETUP' | 'LOADING' | 'QUIZ' | 'RESULT'>('SETUP');
  
  // 🎯 설정 상태
  const [topic, setTopic] = useState("");
  const [qCount, setQCount] = useState<number>(5);
  const [level, setLevel] = useState<'초급' | '중급' | '고급' | '심화'>('초급');

  // 🎯 학습 상태
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [blankInputs, setBlankInputs] = useState<string[]>([]);
  const [fullInput, setFullInput] = useState("");
  
  // 🎯 피드백 및 데이터화 상태
  const [feedback, setFeedback] = useState("");
  const [feedbackStatus, setFeedbackStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [isErrorState, setIsErrorState] = useState(false);
  const [wrongCounts, setWrongCounts] = useState<number[]>([]);

  // --------------------------------------------------------
  // 💡 1. 제미나이(Gemini) API 문제 생성 요청 (gemini-pro 적용 완료 ✅)
  // --------------------------------------------------------
  const handleGenerate = async () => {
    if (!topic.trim()) {
      alert("풀고 싶은 문법 개념을 입력해 주세요! (예: 현재분사, 5형식)");
      return;
    }

    setAppPhase('LOADING');

    try {
      // 1. 공백 제거(.trim())를 추가하여 API 키 오류 원천 차단
      const rawApiKey = import.meta.env.VITE_GEMINI_API_KEY;
      const API_KEY = rawApiKey ? rawApiKey.trim() : "";
      
      if (!API_KEY) {
        alert("API 키를 찾을 수 없습니다. Vercel 환경 변수를 확인해 주세요.");
        setAppPhase('SETUP');
        return;
      }

      // 2. 모델명을 가장 안정적인 gemini-pro로 변경
      const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=" + API_KEY;

      const systemPrompt = `너는 중학교 영어 선생님이야.
      사용자가 요청하는 주제, 난이도, 문제 개수에 맞춰서 영어 문법 문제를 만들어줘.
      
      🚨 [매우 중요한 출제 규칙 - 반드시 지킬 것!] 🚨
      1. 다양성: 매번 똑같은 문제가 나오지 않도록 항상 완전히 새로운 문장과 단어를 사용할 것.
      2. 누락 금지: 빈칸 문제(step1_q, step2_q)를 만들 때 원래 문장(eng)에 있던 단어를 절대 마음대로 삭제하거나 누락시키지 말 것! 빈칸(_____)으로 가려진 단어 외의 나머지 단어들은 문장 속에 반드시 그대로 남아있어야 해.
      3. 정답 일치: 빈칸(_____)의 개수와 쉼표로 구분된 정답(step2_a)의 개수는 무조건 정확히 일치해야 해.
      
      반드시 아래의 JSON 배열 형식으로만 대답해. 마크다운 기호(\`\`\`json 등) 없이 오직 순수한 JSON 배열만 출력할 것.
      
      [
        {
          "kor": "나는 TV를 보면서 피자를 먹었다.",
          "eng": "I ate pizza watching TV.",
          "explanation": "동시동작을 나타내는 분사구문입니다. watch에 ing를 붙여 현재분사로 만듭니다.",
          "step1_q": "I ate pizza _____ TV.",
          "step1_a": "watching",
          "step2_q": "I ate _____ _____ TV.",
          "step2_a": "pizza, watching"
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
          generationConfig: { 
            temperature: 0.9 // 🔥 이 숫자가 높을수록 매번 다르고 창의적인 문제가 나옵니다! (기본값 보통 0.2~0.4)
          }
        })
      });

      // 🚨 3. 404 등 에러 발생 시 여기서 멈추고 진짜 이유를 잡아냅니다.
      if (!response.ok) {
        const errorData = await response.json();
        console.error("구글 API 에러 원본:", errorData);
        throw new Error(`Google API 오류 (${response.status}): ${errorData.error?.message || '주소나 키가 잘못되었습니다.'}`);
      }

      const data = await response.json();
      
      // 데이터가 텅 비어서 오는 경우 방어
      if (!data.candidates || data.candidates.length === 0) {
        throw new Error("제미나이가 응답을 생성하지 못했습니다.");
      }
      
      // 4. 제미나이 응답 처리
      const generatedText = data.candidates[0].content.parts[0].text;
      const parsedQuestions = JSON.parse(generatedText);
      
      setQuestions(parsedQuestions);
      setWrongCounts(Array(qCount).fill(0));
      setCurrentIndex(0);
      setCurrentStep(1);
      setAppPhase('QUIZ');

    } catch (error: any) {
      console.error("AI 문제 생성 실패 상세 로그:", error);
      // 알림창에 진짜 에러 원인을 띄워줍니다.
      alert(`문제 생성 실패!\n이유: ${error.message}`);
      setAppPhase('SETUP');
    }
  };

  // --------------------------------------------------------
  // 💡 2. 데이터베이스 전송 (학습 종료 시)
  // --------------------------------------------------------
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

  // --------------------------------------------------------
  // 💡 3. 학습 및 채점 로직
  // --------------------------------------------------------
  useEffect(() => {
    setFeedback("");
    setFeedbackStatus('idle');
    setIsErrorState(false);
    setBlankInputs([]);
    setFullInput("");
  }, [currentIndex, currentStep]);

  const handleIncorrect = () => {
    setFeedbackStatus('error');
    setIsErrorState(true);
    
    // 오답 횟수 증가
    const newWrongCounts = [...wrongCounts];
    newWrongCounts[currentIndex] += 1;
    setWrongCounts(newWrongCounts);

    setFeedback("앗, 오답입니다! 다시 한번 생각해 보세요. 🤔");
  };

  const handleSubmit = () => {
    const question = questions[currentIndex];

    // 잠긴 상태에서 누르면 잠금 해제 (다시 풀기)
    if (isErrorState) {
      setIsErrorState(false);
      setFeedbackStatus('idle');
      setFeedback("");
      return;
    }

    if (currentStep === 1) {
      const isCorrect = blankInputs[0]?.trim().toLowerCase() === question.step1_a?.trim().toLowerCase();
      if (isCorrect) {
        setFeedback("좋아요! 다음 단계로 넘어갑니다.");
        setFeedbackStatus('success');
        setTimeout(() => setCurrentStep(2), 1000);
      } else handleIncorrect();

    } else if (currentStep === 2) {
      const answers = question.step2_a?.split(',').map(a => a.trim().toLowerCase()) || [];
      const isAllCorrect = blankInputs.every((input, i) => input?.trim().toLowerCase() === answers[i]);
      if (isAllCorrect && blankInputs.length === answers.length) {
        setFeedback("완벽해요! 이제 문장 전체를 써보세요.");
        setFeedbackStatus('success');
        setTimeout(() => setCurrentStep(3), 1200);
      } else handleIncorrect();

    } else if (currentStep === 3) {
      const cleanEng = question.eng.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
      const cleanInput = fullInput.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
      if (cleanEng === cleanInput) {
        setFeedback("정답입니다! 🚀");
        setFeedbackStatus('success');
        setTimeout(() => {
          if (currentIndex + 1 >= questions.length) {
            finishStudy(); // 마지막 문제면 완료 처리
          } else {
            setCurrentIndex(prev => prev + 1);
            setCurrentStep(1);
          }
        }, 1500);
      } else handleIncorrect();
    }
  };

  // --------------------------------------------------------
  // 📺 화면 렌더링
  // --------------------------------------------------------

  // 1. 빈칸 렌더링 함수
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
                disabled={isErrorState || feedbackStatus === 'success'}
                onChange={(e) => {
                  const newInputs = [...blankInputs];
                  newInputs[index] = e.target.value;
                  setBlankInputs(newInputs);
                }}
                style={{ width: '100px', border: 'none', borderBottom: `3px solid ${isErrorState ? '#ff3b30' : '#007aff'}`, backgroundColor: isErrorState ? '#ffeceb' : '#f0f8ff', color: '#007aff', fontWeight: '800', fontSize: '20px', textAlign: 'center', outline: 'none', padding: '4px 8px', borderRadius: '6px 6px 0 0', opacity: isErrorState ? 0.7 : 1 }}
                autoFocus={index === 0 && !isErrorState}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              />
            )}
          </React.Fragment>
        ))}
      </div>
    );
  };

  // 화면 분기 처리
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

  // QUIZ 화면 렌더링
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
                type="text" value={fullInput} disabled={isErrorState || feedbackStatus === 'success'}
                onChange={(e) => setFullInput(e.target.value)}
                placeholder="전체 영어 문장을 완성하세요."
                style={{ width: '100%', padding: '18px 20px', fontSize: '18px', fontWeight: '600', color: '#333', backgroundColor: isErrorState ? '#ffeceb' : '#f9f9f9', border: `2px solid ${isErrorState ? '#ff3b30' : '#e5e5ea'}`, borderRadius: '16px', outline: 'none', textAlign: 'center', opacity: isErrorState ? 0.8 : 1 }}
                autoFocus={!isErrorState} onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              />
            )}
          </div>

          <div style={{ height: '24px', marginBottom: isErrorState ? '12px' : '24px', width: '100%', textAlign: 'center' }}>
            {feedback && (
              <span style={{ color: feedbackStatus === 'success' ? '#34c759' : '#ff3b30', fontWeight: '700', fontSize: '15px' }}>{feedback}</span>
            )}
          </div>

          {isErrorState && (
            <div style={{ backgroundColor: '#fff0f0', padding: '16px', borderRadius: '16px', width: '100%', boxSizing: 'border-box', marginBottom: '24px', border: '1px solid #ffcdd2', animation: 'fadeIn 0.3s ease-in-out' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <span style={{ fontSize: '18px' }}>💡</span>
                <span style={{ color: '#d32f2f', fontWeight: '800', fontSize: '15px' }}>AI 오답 노트</span>
              </div>
              <p style={{ margin: 0, fontSize: '15px', color: '#444', lineHeight: '1.5', wordBreak: 'keep-all' }}>{question.explanation}</p>
            </div>
          )}

          <button onClick={handleSubmit} style={{ width: '100%', backgroundColor: feedbackStatus === 'success' ? '#34c759' : (isErrorState ? '#ff3b30' : '#007aff'), color: 'white', border: 'none', padding: '18px', borderRadius: '16px', fontSize: '18px', fontWeight: '800', cursor: 'pointer', boxShadow: feedbackStatus === 'success' ? '0 4px 12px rgba(52,199,89,0.3)' : (isErrorState ? '0 4px 12px rgba(255,59,48,0.3)' : '0 4px 12px rgba(0,122,255,0.3)'), marginTop: 'auto' }}>
            {feedbackStatus === 'success' ? '통과!' : (isErrorState ? '↻ 다시 풀기' : '정답 확인하기')}
          </button>
        </div>
      </div>
    </div>
  );
}