import React, { useState, useEffect } from 'react';

interface Question {
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
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [blankInputs, setBlankInputs] = useState<string[]>([]);
  const [fullInput, setFullInput] = useState("");
  
  // 피드백 상태 (메시지와 성공/실패 여부)
  const [feedback, setFeedback] = useState("");
  const [feedbackStatus, setFeedbackStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const question = questions[currentIndex];

  useEffect(() => {
    setFeedback("");
    setFeedbackStatus('idle');
    setBlankInputs([]);
    setFullInput("");
    
    if (!question?.step1_q) {
      setCurrentStep(3);
    } else {
      setCurrentStep(1);
    }
  }, [currentIndex, question]);

  if (!question) {
    return (
      <div style={{ backgroundColor: '#f9f9f9', minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', fontFamily: 'Pretendard, sans-serif' }}>
        <div style={{ textAlign: 'center', background: 'white', padding: '40px', borderRadius: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '60px', marginBottom: '16px' }}>🎉</div>
          <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#333', marginBottom: '8px' }}>모든 학습 완료!</h2>
          <p style={{ color: '#8e8e93', marginBottom: '24px' }}>오늘의 문법 마스터가 되셨습니다.</p>
          <button onClick={onBack} style={{ backgroundColor: '#007aff', color: 'white', border: 'none', padding: '14px 28px', borderRadius: '16px', fontWeight: '700', fontSize: '16px', cursor: 'pointer' }}>
            홈으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  const handleSubmit = () => {
    if (currentStep === 1) {
      const isCorrect = blankInputs[0]?.trim().toLowerCase() === question.step1_a?.trim().toLowerCase();
      if (isCorrect) {
        setFeedback("정답입니다! 👏 다음 단계로 갑니다.");
        setFeedbackStatus('success');
        setTimeout(() => {
          setBlankInputs([]);
          setCurrentStep(2);
          setFeedback("");
          setFeedbackStatus('idle');
        }, 1000);
      } else {
        setFeedback("앗, 다시 한번 생각해보세요! 🤔");
        setFeedbackStatus('error');
      }

    } else if (currentStep === 2) {
      const answers = question.step2_a?.split(',').map(a => a.trim().toLowerCase()) || [];
      const isAllCorrect = blankInputs.every((input, i) => input?.trim().toLowerCase() === answers[i]);
      
      if (isAllCorrect && blankInputs.length === answers.length) {
        setFeedback("완벽해요! 🌟 이제 문장 전체를 영작해볼까요?");
        setFeedbackStatus('success');
        setTimeout(() => {
          setCurrentStep(3);
          setFeedback("");
          setFeedbackStatus('idle');
        }, 1200);
      } else {
        setFeedback("빈칸 중 틀린 곳이 있어요. 다시 확인해보세요! 🧐");
        setFeedbackStatus('error');
      }

    } else if (currentStep === 3) {
      const cleanEng = question.eng.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
      const cleanInput = fullInput.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
      
      if (cleanEng === cleanInput) {
        setFeedback("최종 정답! 완벽하게 체화하셨습니다. 🚀");
        setFeedbackStatus('success');
        setTimeout(() => {
          setCurrentIndex(prev => prev + 1);
        }, 1500);
      } else {
        setFeedback("거의 다 왔어요! 스펠링을 다시 확인해보세요. ✍️");
        setFeedbackStatus('error');
      }
    }
  };

  // 단계별 아이콘 및 타이틀 설정
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
                  setFeedbackStatus('idle'); // 타자를 치면 에러메시지 초기화
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
        
        {/* 상단 네비게이션 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#8e8e93', fontSize: '16px', fontWeight: '700', cursor: 'pointer', padding: '8px 0' }}>
            ← 뒤로
          </button>
          <div style={{ backgroundColor: '#e0f2fe', color: '#007aff', padding: '6px 14px', borderRadius: '20px', fontSize: '14px', fontWeight: '800' }}>
            Q {currentIndex + 1} / {questions.length}
          </div>
        </div>

        {/* 메인 학습 카드 */}
        <div style={{ background: 'white', borderRadius: '24px', padding: '32px 24px', boxShadow: '0 8px 24px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
          
          {/* 단계 표시 뱃지 */}
          <div style={{ backgroundColor: currentStep === 3 ? '#f0ebff' : '#f0f8ff', color: currentStep === 3 ? '#5e5ce6' : '#007aff', padding: '8px 16px', borderRadius: '12px', fontSize: '14px', fontWeight: '800', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>{stepInfo[currentStep as 1|2|3].icon}</span>
            <span>Step {currentStep}. {stepInfo[currentStep as 1|2|3].title}</span>
          </div>

          {/* 한글 문장 */}
          <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#1c1c1e', textAlign: 'center', wordBreak: 'keep-all', lineHeight: '1.4', marginBottom: '32px' }}>
            "{question.kor}"
          </h2>

          {/* 입력 영역 */}
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

          {/* 피드백 메시지 영역 */}
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

          {/* 정답 확인 버튼 */}
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
              marginTop: 'auto' // 버튼을 카드 하단으로 밀어냄
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