import React, { useState, useEffect } from 'react';

// 데이터베이스에서 가져오는 문항 타입 정의
interface Question {
  kor: string;
  eng: string;
  explanation: string;
  step1_q?: string;
  step1_a?: string;
  step2_q?: string;
  step2_a?: string;
}

// 💡 수정 완료: onBack 속성이 추가되었습니다.
interface MidGrammarProps {
  questions: Question[];
  onBack: () => void; 
}

const MidGrammar: React.FC<MidGrammarProps> = ({ questions, onBack }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // 현재 몇 단계인지 관리 (1: 1차 빈칸, 2: 2차 빈칸, 3: 통영작)
  const [currentStep, setCurrentStep] = useState<number>(1);
  
  // 1, 2단계 빈칸 입력값들 (빈칸이 2개일 수 있으므로 배열로 관리)
  const [blankInputs, setBlankInputs] = useState<string[]>([]);
  // 3단계 통영작 입력값
  const [fullInput, setFullInput] = useState("");
  
  const [feedback, setFeedback] = useState("");

  const question = questions[currentIndex];

  // 👉 핵심 1: 문제 변경 시 초기화 및 '자동 감지' 로직
  useEffect(() => {
    setFeedback("");
    setBlankInputs([]);
    setFullInput("");
    
    // 만약 시트에 step1_q 데이터가 없다면? -> 기존 문제이므로 바로 3단계(통영작)로 진입!
    if (!question?.step1_q) {
      setCurrentStep(3);
    } else {
      setCurrentStep(1); // 신규 문제면 1단계부터 시작
    }
  }, [currentIndex, question]);

  if (!question) return <div className="text-center p-10 font-bold">모든 학습을 완료했습니다! 🎉</div>;

  // 👉 핵심 2: 채점 및 다음 단계 이동 로직
  const handleSubmit = () => {
    if (currentStep === 1) {
      // [1단계 채점]
      const isCorrect = blankInputs[0]?.trim().toLowerCase() === question.step1_a?.trim().toLowerCase();
      if (isCorrect) {
        setFeedback("정답입니다! 👏 다음 단계로 넘어갑니다.");
        setBlankInputs([]); // 다음 단계를 위해 입력창 비우기
        setCurrentStep(2);
      } else {
        setFeedback("틀렸습니다. 다시 한번 생각해보세요.");
      }

    } else if (currentStep === 2) {
      // [2단계 채점] - 시트의 정답이 쉼표(,)로 구분되어 있으므로 쪼개서 각각 비교
      const answers = question.step2_a?.split(',').map(a => a.trim().toLowerCase()) || [];
      
      // 입력한 값들과 정답 배열이 모두 일치하는지 확인
      const isAllCorrect = blankInputs.every((input, i) => input?.trim().toLowerCase() === answers[i]);
      
      // 빈칸을 모두 채웠고 정답이 맞는지 확인
      if (isAllCorrect && blankInputs.length === answers.length) {
        setFeedback("완벽합니다! 🌟 이제 문장 전체를 직접 영작해보세요.");
        setCurrentStep(3);
      } else {
        setFeedback("빈칸 중 틀린 곳이 있습니다. 다시 확인해보세요.");
      }

    } else if (currentStep === 3) {
      // [3단계 채점] 통영작 (대소문자, 구두점, 공백 무시하고 알파벳만 비교)
      const cleanEng = question.eng.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
      const cleanInput = fullInput.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
      
      if (cleanEng === cleanInput) {
        setFeedback("최종 정답! 완벽하게 체화하셨습니다. 🚀");
        setTimeout(() => {
          // 1초 뒤 다음 문제로 이동
          setCurrentIndex(prev => prev + 1);
        }, 1000);
      } else {
        setFeedback("거의 다 왔어요! 다시 시도해보세요.");
      }
    }
  };

  // 👉 핵심 3: '_____'를 감지하여 동적으로 Input 태그를 만들어주는 마법의 함수
  const renderQuestionWithBlanks = (qString?: string) => {
    if (!qString) return null;
    const parts = qString.split('_____');
    
    return (
      <div className="text-xl font-medium mb-4 flex flex-wrap items-center justify-center gap-1">
        {parts.map((part, index) => (
          <React.Fragment key={index}>
            <span>{part}</span>
            {/* 마지막 조각 전까지만 input 창을 생성 */}
            {index < parts.length - 1 && (
              <input
                type="text"
                value={blankInputs[index] || ""}
                onChange={(e) => {
                  const newInputs = [...blankInputs];
                  newInputs[index] = e.target.value;
                  setBlankInputs(newInputs);
                }}
                className="border-b-2 border-blue-500 w-24 text-center focus:outline-none bg-transparent"
                autoFocus={index === 0} // 첫 번째 빈칸에 자동 포커스
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              />
            )}
          </React.Fragment>
        ))}
      </div>
    );
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-xl shadow-md flex flex-col items-center">
      
      {/* 💡 뒤로 가기 버튼 추가 완료 */}
      <div className="w-full flex justify-start mb-4">
        <button 
          onClick={onBack}
          className="text-gray-500 hover:text-gray-700 font-bold"
        >
          ← 뒤로 가기
        </button>
      </div>

      {/* 진행 상황 표시 */}
      <div className="w-full flex justify-between text-gray-400 mb-6 font-bold">
        <span>Question {currentIndex + 1} / {questions.length}</span>
        <span className="text-blue-500">Step {currentStep} / 3</span>
      </div>

      {/* 한글 뜻 (모든 단계에서 공통 표시) */}
      <h2 className="text-2xl font-bold text-gray-800 mb-8 text-center">
        "{question.kor}"
      </h2>

      {/* 단계별 문제 영역 */}
      <div className="w-full flex flex-col items-center justify-center min-h-[100px] mb-6">
        {currentStep === 1 && renderQuestionWithBlanks(question.step1_q)}
        {currentStep === 2 && renderQuestionWithBlanks(question.step2_q)}
        {currentStep === 3 && (
          <div className="w-full">
            <input
              type="text"
              value={fullInput}
              onChange={(e) => setFullInput(e.target.value)}
              className="w-full border-2 border-gray-300 rounded-lg p-3 text-lg focus:border-blue-500 outline-none"
              placeholder="위 한글 뜻을 보고 전체 영어 문장을 완성하세요."
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            />
          </div>
        )}
      </div>

      {/* 채점 피드백 메세지 */}
      <div className="h-6 mb-4 font-bold text-orange-500">
        {feedback}
      </div>

      {/* 확인 버튼 */}
      <button 
        onClick={handleSubmit}
        className="px-8 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition"
      >
        확인
      </button>
    </div>
  );
};

export default MidGrammar;