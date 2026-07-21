import React, { useState, useEffect } from 'react';

interface Question {
  level?: string; 
  type?: string;  
  kor: string;
  eng: string;
  explanation: string;
  step1_q?: string;
  step1_a?: string;
  step2_q?: string;
  step2_a?: string;
}

interface MidGrammarProps {
  questions: Question[];
  onBack: () => void;
}

const MidGrammar: React.FC<MidGrammarProps> = ({ questions, onBack }) => {
  // 🎯 핵심 상태: 현재 레벨과 화면에 띄울 문제들(Queue)
  const [currentLevel, setCurrentLevel] = useState<'초급' | '중급' | '고급'>('초급');
  const [queue, setQueue] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // 중복 출제 방지 및 현재 문제 오답 여부 기록
  const [usedSet, setUsedSet] = useState<Set<string>>(new Set());
  const [hasFailedCurrent, setHasFailedCurrent] = useState(false);

  // 학습 UI 상태
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [blankInputs, setBlankInputs] = useState<string[]>([]);
  const [fullInput, setFullInput] = useState("");
  const [feedback, setFeedback] = useState("");
  const [feedbackStatus, setFeedbackStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const getQKey = (q: Question) => `${q.kor}-${q.eng}`;

  // 💡 1. 레벨이 바뀔 때 최초 10문제(현재분사 5 + 과거분사 5) 세팅
  useEffect(() => {
    if (questions.length === 0 || currentLevel === '고급') return;

    // 현재 레벨에 맞는 문제만 필터링 (시트에 빈칸이면 '초급'으로 간주)
    const levelQuestions = questions.filter(q => (q.level || '초급') === currentLevel);

    // 현재분사 5개, 과거분사 5개 추출
    let presentParticiple = levelQuestions.filter(q => q.type === '현재분사').slice(0, 5);
    let pastParticiple = levelQuestions.filter(q => q.type === '과거분사').slice(0, 5);

    // 만약 시트에 'type'이 적혀있지 않다면, 임시로 앞부분 10개를 가져옵니다.
    if (presentParticiple.length === 0 && pastParticiple.length === 0) {
      presentParticiple = levelQuestions.slice(0, 5);
      pastParticiple = levelQuestions.slice(5, 10);
    }

    const initialQueue = [...presentParticiple, ...pastParticiple];
    
    setQueue(initialQueue);
    setCurrentIndex(0);

    const newUsed = new Set<string>();
    initialQueue.forEach(q => newUsed.add(getQKey(q)));
    setUsedSet(newUsed);

  }, [currentLevel, questions]);

  // 💡 2. 문제가 바뀔 때마다 입력창 및 상태 초기화
  useEffect(() => {
    setFeedback("");
    setFeedbackStatus('idle');
    setBlankInputs([]);
    setFullInput("");
    setHasFailedCurrent(false); 
    
    const q = queue[currentIndex];
    if (q) {
      if (!q.step1_q) setCurrentStep(3);
      else setCurrentStep(1);
    }
  }, [currentIndex, queue]);

  // 💡 3. '고급' 도달 시 준비중 멘트 출력
  if (currentLevel === '고급') {
    return (
      <div style={{ backgroundColor: '#f9f9f9', minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', fontFamily: 'Pretendard, sans-serif' }}>
        <div style={{ textAlign: 'center', background: 'white', padding: '40px', borderRadius: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '60px', marginBottom: '16px' }}>🚧</div>
          <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#333', marginBottom: '8px' }}>고급 문장은 아직 준비 중입니다!</h2>
          <p style={{ color: '#8e8e93', marginBottom: '24px' }}>초급과 중급을 완벽하게 마스터하셨습니다. 훌륭해요! 👏</p>
          <button onClick={onBack} style={{ backgroundColor: '#007aff', color: 'white', border: 'none', padding: '14px 28px', borderRadius: '16px', fontWeight: '700', fontSize: '16px', cursor: 'pointer' }}>
            홈으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  if (queue.length === 0) return null;

  const question = queue[currentIndex];

  // 💡 4. 오답 시 2문제 추가 로직
  const handleIncorrect = () => {
    setFeedbackStatus('error');
    if (!hasFailedCurrent) {
      setHasFailedCurrent(true); 
      
      // 현재 풀고 있는 문제와 같은 레벨, 같은 타입의 문제 중 안 푼 문제 2개 찾기
      const similarQs = questions.filter(q => 
        (q.level || '초급') === currentLevel && 
        q.type === question.type && 
        !usedSet.has(getQKey(q))
      ).slice(0, 2);

      if (similarQs.length > 0) {
        setQueue(prev => [...prev, ...similarQs]); // 큐에 2개 추가!
        const newUsed = new Set(usedSet);
        similarQs.forEach(q => newUsed.add(getQKey(q)));
        setUsedSet(newUsed);
        setFeedback(`앗, 오답! 🚨 ${question.type || '유사'} 문제 ${similarQs.length}개가 추가되었습니다.`);
      } else {
        setFeedback("앗, 다시 한번 생각해보세요! 🤔");
      }
    } else {
      setFeedback("앗, 다시 한번 생각해보세요! 🤔");
    }
  };

  const handleSubmit = () => {
    if (currentStep === 1) {
      const isCorrect = blankInputs[0]?.trim().toLowerCase() === question.step1_a?.trim().toLowerCase();
      if (isCorrect) {
        setFeedback("정답입니다! 👏 다음 단계로 갑니다.");
        setFeedbackStatus('success');
        setTimeout(() => {
          setBlankInputs([]);
          setCurrentStep(2);
        }, 1000);
      } else {
        handleIncorrect();
      }

    } else if (currentStep === 2) {
      const answers = question.step2_a?.split(',').map(a => a.trim().toLowerCase()) || [];
      const isAllCorrect = blankInputs.every((input, i) => input?.trim().toLowerCase() === answers[i]);
      
      if (isAllCorrect && blankInputs.length === answers.length) {
        setFeedback("완벽해요! 🌟 이제 문장 전체를 영작해볼까요?");
        setFeedbackStatus('success');
        setTimeout(() => {
          setCurrentStep(3);
        }, 1200);
      } else {
        handleIncorrect();
      }

    } else if (currentStep === 3) {
      const cleanEng = question.eng.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
      const cleanInput = fullInput.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
      
      if (cleanEng === cleanInput) {
        setFeedback("최종 정답! 완벽하게 체화하셨습니다. 🚀");
        setFeedbackStatus('success');
        setTimeout(() => {
          // 💡 5. 큐에 있는 모든 문제를 다 맞혔을 때 레벨업!
          if (currentIndex + 1 >= queue.length) {
            if (currentLevel === '초급') {
              setCurrentLevel('중급');
            } else if (currentLevel === '중급') {
              setCurrentLevel('고급');
            }
          } else {
            setCurrentIndex(prev => prev + 1);
          }
        }, 1500);
      } else {
        handleIncorrect();
      }
    }
  };

  const stepInfo = {
    1: { title: "핵심 형태 찾기", icon: "🎯" },
    2: { title: "문장 구조 완성", icon: "🧩" },
    3: { title: "전체 문장 영작", icon: "🚀" }
  };

  const renderQuestionWithBlanks = (qString?: string) => {
    if (!qString) return null;
    const parts = qString.split('_____');
    
    return (
      <div style={{ fontSize: '20px', fontWeight: '600', color: '#333', lineHeight: '2', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
        {parts.map((part, index) => (
          <React.Fragment key={index}>
            <span style={{ letterSpacing: '0.5px' }}>{part}</span>
            {index < parts.length - 1 && (
              <input
                type="text"
                value={blankInputs[index] || ""}
                onChange={(e) => {
                  const newInputs = [...blankInputs];
                  newInputs[index] = e.target.value;
                  setBlankInputs(newInputs);
                  setFeedbackStatus('idle'); 
                }}
                style={{
                  width: '100px',
                  border: 'none',
                  borderBottom: `3px solid ${feedbackStatus === 'error' ? '#ff3b30' : '#007aff'}`,
                  backgroundColor: feedbackStatus === 'error' ? '#ffeceb' : '#f0f8ff',
                  color: '#007aff',
                  fontWeight: '800',
                  fontSize: '20px',
                  textAlign: 'center',
                  outline: 'none',
                  padding: '4px 8px',
                  borderRadius: '6px 6px 0 0',
                  transition: 'all 0.2s ease-in-out'
                }}
                autoFocus={index === 0}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              />
            )}
          </React.Fragment>
        ))}
      </div>
    );
  };

  return (
    <div style={{ backgroundColor: '#f9f9f9', minHeight: '100vh', padding: '20px', fontFamily: 'Pretendard, sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ width: '100%', maxWidth: '420px', display: 'flex', flexDirection: 'column', flex: 1 }}>
        
        {/* 상단 네비게이션 & 레벨/진행도 뱃지 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#8e8e93', fontSize: '16px', fontWeight: '700', cursor: 'pointer', padding: '8px 0' }}>
            ← 뒤로
          </button>
          
          <div style={{ backgroundColor: '#f0f8ff', color: '#007aff', padding: '6px 14px', borderRadius: '20px', fontSize: '14px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ backgroundColor: '#007aff', color: 'white', padding: '2px 8px', borderRadius: '10px', fontSize: '12px' }}>
              {currentLevel}
            </span>
            <span>Q {currentIndex + 1} / {queue.length}</span>
          </div>
        </div>

        {/* 메인 학습 카드 */}
        <div style={{ background: 'white', borderRadius: '24px', padding: '32px 24px', boxShadow: '0 8px 24px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
          
          <div style={{ backgroundColor: currentStep === 3 ? '#f0ebff' : '#f0f8ff', color: currentStep === 3 ? '#5e5ce6' : '#007aff', padding: '8px 16px', borderRadius: '12px', fontSize: '14px', fontWeight: '800', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>{stepInfo[currentStep as 1|2|3].icon}</span>
            <span>Step {currentStep}. {stepInfo[currentStep as 1|2|3].title}</span>
          </div>

          <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#1c1c1e', textAlign: 'center', wordBreak: 'keep-all', lineHeight: '1.4', marginBottom: '32px' }}>
            "{question.kor}"
          </h2>

          <div style={{ width: '100%', minHeight: '80px', display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '24px' }}>
            {currentStep === 1 && renderQuestionWithBlanks(question.step1_q)}
            {currentStep === 2 && renderQuestionWithBlanks(question.step2_q)}
            {currentStep === 3 && (
              <input
                type="text"
                value={fullInput}
                onChange={(e) => {
                  setFullInput(e.target.value);
                  setFeedbackStatus('idle');
                }}
                placeholder="전체 영어 문장을 완성하세요."
                style={{
                  width: '100%',
                  padding: '18px 20px',
                  fontSize: '18px',
                  fontWeight: '600',
                  color: '#333',
                  backgroundColor: '#f9f9f9',
                  border: `2px solid ${feedbackStatus === 'error' ? '#ff3b30' : '#e5e5ea'}`,
                  borderRadius: '16px',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s',
                  textAlign: 'center'
                }}
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              />
            )}
          </div>

          <div style={{ height: '24px', marginBottom: '24px', width: '100%', textAlign: 'center' }}>
            {feedback && (
              <span style={{ 
                color: feedbackStatus === 'success' ? '#34c759' : '#ff3b30', 
                fontWeight: '700', 
                fontSize: '15px',
                animation: 'fadeIn 0.3s ease-in-out'
              }}>
                {feedback}
              </span>
            )}
          </div>

          <button 
            onClick={handleSubmit}
            style={{ 
              width: '100%', 
              backgroundColor: feedbackStatus === 'success' ? '#34c759' : '#007aff', 
              color: 'white', 
              border: 'none', 
              padding: '18px', 
              borderRadius: '16px', 
              fontSize: '18px', 
              fontWeight: '800', 
              cursor: 'pointer',
              boxShadow: feedbackStatus === 'success' ? '0 4px 12px rgba(52,199,89,0.3)' : '0 4px 12px rgba(0,122,255,0.3)',
              transition: 'all 0.2s',
              marginTop: 'auto'
            }}
          >
            {feedbackStatus === 'success' ? '통과!' : '정답 확인하기'}
          </button>
        </div>

      </div>
    </div>
  );
};

export default MidGrammar;