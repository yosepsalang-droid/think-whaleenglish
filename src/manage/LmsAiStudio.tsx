import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase'; 
import { CONFIG } from '../config'; 

interface Problem {
  question: string;
  passage: string;
  options: string[];
  answer: string;
  explanation: {
    direct: string;
    natural: string;
    structure: string;
    grammar: string;
    vocabulary: string; 
  };
}

interface SavedExam {
  id: number;
  created_at: string;
  title: string;
  source_text: string;
  problems: Problem[];
}

// 💡 [신규 추가] 수파베이스 middle_questions 테이블용 타입
interface MiddleQuestion {
  id?: number;
  grade: string;
  publisher: string;
  lesson: string;
  grammar_tag: string;
  question: string;
  answer: string;
  explanation: string;
}

export default function LmsAiStudio({ onBack }: { onBack?: () => void }) {
  // 💡 [신규 추가] 탭이 4개로 늘어났습니다. (기존 2개 보존 + DB 업로드 + DB 배포)
  const [viewMode, setViewMode] = useState<'studio' | 'archive' | 'db_upload' | 'db_distribute'>('studio');

  // ==========================================
  // 기존 상태 변수들 (1%도 건드리지 않음)
  // ==========================================
  const [sourceText, setSourceText] = useState('');
  const [questionCount, setQuestionCount] = useState(5); 
  const [isGenerated, setIsGenerated] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false); 
  const [generatedProblems, setGeneratedProblems] = useState<Problem[]>([]);
  
  const [savedExams, setSavedExams] = useState<SavedExam[]>([]);
  const [selectedExam, setSelectedExam] = useState<SavedExam | null>(null);

  const [showDistributeModal, setShowDistributeModal] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const [selectedGrade, setSelectedGrade] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editFormData, setEditFormData] = useState<Problem | null>(null);
  const [aiFeedback, setAiFeedback] = useState('');
  const [isAutoFixing, setIsAutoFixing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // ==========================================
  // [신규 추가] DB 업로더용 상태 변수
  // ==========================================
  const [uploadText, setUploadText] = useState('');
  const [uploadMeta, setUploadMeta] = useState({ grade: '중1', publisher: '', lesson: '', grammar_tag: '' });
  const [parsedDbQuestions, setParsedDbQuestions] = useState<MiddleQuestion[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isUploadingDB, setIsUploadingDB] = useState(false);

  // ==========================================
  // [신규 추가] DB 배포용 상태 변수
  // ==========================================
  const [dbFilter, setDbFilter] = useState({ publisher: '', lesson: '', grammar_tag: '' });
  const [fetchedDbQuestions, setFetchedDbQuestions] = useState<MiddleQuestion[]>([]);
  const [selectedDbQuestionIds, setSelectedDbQuestionIds] = useState<number[]>([]);
  const [isFetchingDb, setIsFetchingDb] = useState(false);

  useEffect(() => {
    const fetchStudents = async () => {
      const { data } = await supabase.from('students').select('*');
      if (data) setStudents(data);
    };
    fetchStudents();
  }, []);

  useEffect(() => {
    if (viewMode === 'archive') {
      const fetchArchive = async () => {
        const { data, error } = await supabase.from('ai_exams').select('*').order('created_at', { ascending: false });
        if (data) setSavedExams(data);
        if (error) console.error("보관함 로드 실패:", error);
      };
      fetchArchive();
      setSelectedExam(null); 
    }
  }, [viewMode]);

  const grades = Array.from(new Set(students.map(s => s.grade))).filter(Boolean).sort();
  const filteredStudents = students.filter(s => s.grade === selectedGrade);

  const formattingGuidelines = `
  [문제 출력 형식 및 텍스트 강조 가이드라인]
  1. 밑줄 사용 절대 금지: 플랫폼 환경상 굵은 글씨(**강조**)를 대신 사용하세요.
  2. 객관식 보기 강조: 어휘/어법 문제 등에서 보기는 '번호 + 띄어쓰기 + **강조단어**' 형태로 통일하세요. (예: ① **that**)
  3. 박스 처리(문장 삽입/요약문): 본문과 헷갈리지 않게 반드시 인용구(>) 기호를 맨 앞에 넣어서 명확히 구분하세요.
  4. 🚨 객관식 출제 조건: 중등/고등부 문제의 경우, 반드시 지문 안에 ①번부터 ⑤번까지 빠짐없이 마크다운 기호가 존재해야 합니다.
  5. 🚨 주관식 출제 조건: 초등부 영작 문제의 경우, 객관식이 아니므로 "options" 항목을 반드시 빈 배열 [ ] 로 출력하세요.
  6. 🚨 JSON 오류 방지: 응답은 반드시 완벽한 JSON Array [ ] 형태여야 하며, 텍스트 내용(Value) 안에 큰따옴표(")를 쓰면 에러가 나므로 반드시 작은따옴표(')로만 대체해서 쓰세요.
  `;

  // --------------------------------------------------------
  // 기존 AI 출제 로직 (1%도 안 건드림)
  // --------------------------------------------------------
  const handleGenerateAI = async (type: 'elem' | 'mid' | 'high') => {
    if (!sourceText) return alert("원본 지문이나 문장을 먼저 입력해주세요!");
    
    const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || (CONFIG as any)?.GEMINI?.API_KEY || (CONFIG as any)?.GEMINI_API_KEY;
    if (!apiKey) return alert("API 키를 찾을 수 없습니다.");

    setIsGenerating(true);
    setIsGenerated(false);
    setGeneratedProblems([]);

    let promptBase = '';
    
    if (type === 'elem') {
      promptBase = `
      당신은 10년 차 최고의 초등부 영어 학원 강사입니다.
      아래 [원본 텍스트]에 입력된 동사(예: go, play 등)나 기본 문장을 바탕으로, [인칭 및 시제별 형태 변화 주관식 영작 문제]를 정확히 ${questionCount}개 만들어주세요.

      [출제 방식: 시제 및 인칭 변화 훈련표]
      초등학생이 주어의 인칭(나는, 너는, 그(녀)는, 우리는, 그들은)과 시제(현재, 과거, 미래, 진행)에 따라 동사의 형태가 어떻게 변하는지 직관적으로 연습할 수 있도록 출제합니다.
      
      (출제 예시 - 원본 텍스트가 'go' 일 경우)
      Q1. 나는 간다. -> I go.
      Q2. 나는 갔다. -> I went.
      Q3. 너는 간다. -> You go.
      Q4. 그녀는 갈 것이다. -> She will go.
      Q5. 우리는 집에 가고 있다. -> We are going home.

      [출제 필수 조건]
      1. 🚨 본 문제는 "주관식 영작" 이므로 JSON의 "options" 항목은 무조건 빈 배열 [] 로 출력하세요. (보기 출력 금지)
      2. "question" 에는 학생이 영작할 [인칭과 시제가 반영된 한글 뜻]을 적어주세요. (예: 그녀는 집에 가고 있다.)
      3. "passage" 에는 학생이 참고할 문법 힌트를 친절하게 적어주세요. (예: "3인칭 단수 주어 + 현재진행형(be동사+ing)")
      4. "answer" 에는 완성된 전체 영어 문장을 적어주세요.
      `;
    } else if (type === 'mid') {
      promptBase = `
      당신은 10년 차 최고의 중등부 영어 학원 강사입니다.
      다음 원본 텍스트를 바탕으로 [중등부 내신 문법 및 독해 변형 문제]를 정확히 ${questionCount}개 만들어주세요.
      문제는 반드시 5지 선다형 객관식으로 출제하세요.
      `;
    } else {
      promptBase = `
      당신은 10년 차 최고의 고등부 영어 학원 강사입니다.
      아래 [원본 텍스트]를 바탕으로 [고등 모의고사 (고1~고3) 및 수능 대비 수준 변형 문제]를 정확히 ${questionCount}개 제작해 주세요.
      문제는 반드시 5지 선다형 객관식으로 출제하세요.
      `;
    }

    const prompt = `
      ${promptBase}

      [원본 텍스트]
      ${sourceText}

      [출제 필수 조건]
      1. 논리적으로 정답이 명확해야 하며, 복수 정답이나 오류가 발생하지 않도록 자체 검수하세요.
      2. 절대 다른 설명이나 인삿말을 덧붙이지 말고, 오직 아래의 JSON 배열(Array) 형태로만 출력하세요.

      ${formattingGuidelines}

      [출력 JSON 양식]
      [
        {
          "question": "문제 내용",
          "passage": "문제 지문 내용",
          "options": ["① 보기", "② 보기", "③ 보기", "④ 보기", "⑤ 보기"], 
          "answer": "정답 번호 기호 또는 주관식 정답 문장",
          "explanation": {
            "direct": "직독직해 내용",
            "natural": "자연스러운 해석 내용",
            "structure": "문장 구조 분석 내용",
            "grammar": "문법 포인트 내용",
            "vocabulary": "지문 내 핵심 단어 정리"
          }
        }
      ]
    `;

    const modelsToTry = ['gemini-3.7-flash', 'gemini-3.1-pro', 'gemini-3.5-flash-lite'];
    let success = false;
    let textResponse = '';

    for (const model of modelsToTry) {
      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { 
              temperature: 0.7, 
              maxOutputTokens: 8192, 
              responseMimeType: "application/json" 
            } 
          })
        });

        const data = await response.json();
        if (data.error) throw new Error(data.error.message);

        textResponse = data.candidates[0].content.parts[0].text;
        success = true; 
        break; 
      } catch (error) {
        console.warn(`${model} 실패, 다음 모델 시도 중...`);
      }
    }

    try {
      if (!success) throw new Error("모든 통로가 막혔습니다.");
      let cleanJson = textResponse.replace(/```json/gi, '').replace(/```/g, '').trim();
      const jsonMatch = cleanJson.match(/\[[\s\S]*\]/); 
      if (jsonMatch) cleanJson = jsonMatch[0];

      const parsedProblems: Problem[] = JSON.parse(cleanJson);
      setGeneratedProblems(parsedProblems);
      setIsGenerated(true);
    } catch (error: any) {
      alert("AI가 데이터를 처리하는 중에 일시적인 오류가 있었습니다.\n다시 한번 [출제] 버튼을 눌러주세요!");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAutoFix = async () => {
    if (!aiFeedback.trim()) return alert("외부 AI가 지적한 오류 내용이나 수정 요청사항을 적어주세요!");
    setIsAutoFixing(true);
    
    const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || (CONFIG as any)?.GEMINI?.API_KEY || (CONFIG as any)?.GEMINI_API_KEY;

    const prompt = `
    당신은 최고 수준의 영어 교육 전문가입니다.
    아래에 출제된 영어 문제의 JSON 데이터와, 해당 문제에 대한 외부 검수자의 [오류 지적 사항]이 있습니다.
    피드백을 완벽하게 반영하여 문제를 문법적, 논리적으로 수정한 후, 오직 동일한 구조의 단일 JSON 객체(Object) 형식으로만 반환하세요.

    [외부 검수자 오류 지적 / 수정 요청사항]
    ${aiFeedback}

    [현재 문제 데이터 (수정 대상)]
    ${JSON.stringify(editFormData, null, 2)}

    ${formattingGuidelines}
    `;

    const modelsToTry = ['gemini-3.7-flash', 'gemini-3.1-pro', 'gemini-3.5-flash-lite'];
    let fixSuccess = false;
    let fixedProblem = null;

    for (const model of modelsToTry) {
      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.1, maxOutputTokens: 8192, responseMimeType: "application/json" } 
          })
        });

        const data = await response.json();
        if (data.error) throw new Error(data.error.message);

        const textResponse = data.candidates[0].content.parts[0].text;
        let cleanJson = textResponse.replace(/```json/gi, '').replace(/```/g, '').trim();
        const jsonMatch = cleanJson.match(/\{[\s\S]*\}/); 
        if (jsonMatch) cleanJson = jsonMatch[0];

        fixedProblem = JSON.parse(cleanJson);
        fixSuccess = true;
        break;
      } catch (error) {
        console.warn(`자동 수정 실패: ${model}`);
      }
    }

    if (fixSuccess && fixedProblem) {
      setEditFormData(fixedProblem);
      setAiFeedback('');
      alert("✨ AI가 지적받은 오류를 완벽하게 수정했습니다!");
    } else {
      alert("자동 수정 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
    }
    setIsAutoFixing(false);
  };

  const handleSaveToDB = async () => {
    if (generatedProblems.length === 0) return alert("저장할 문제가 없습니다.");
    
    const title = prompt("저장할 시험지의 제목을 입력해주세요.\n(예: 초등부 문장 확장 쓰기 연습 1회)");
    if (!title || !title.trim()) return;

    setIsSaving(true);
    try {
      const { error } = await supabase.from('ai_exams').insert([
        {
          title: title.trim(),
          source_text: sourceText,
          problems: generatedProblems 
        }
      ]);

      if (error) throw error;
      alert(`🎉 [${title}] 시험지가 성공적으로 저장되었습니다! 보관함에서 확인하실 수 있습니다.`);
    } catch (err: any) {
      alert("저장 중 오류가 발생했습니다.\n수파베이스 'ai_exams' 테이블 설정을 확인해주세요.");
    } finally {
      setIsSaving(false);
    }
  };


  // --------------------------------------------------------
  // 💡 [신규 기능 1] 한글 파일(HWP) 텍스트 -> AI 자동 분리 (제미나이 버전 고정)
  // --------------------------------------------------------
  const handleParseHwpToDB = async () => {
    if (!uploadText.trim()) return alert("한글 파일에서 복사한 텍스트를 먼저 붙여넣어 주세요!");
    if (!uploadMeta.publisher || !uploadMeta.lesson || !uploadMeta.grammar_tag) {
      return alert("출판사, 단원, 문법 태그를 모두 입력해주세요!");
    }

    const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || (CONFIG as any)?.GEMINI?.API_KEY || (CONFIG as any)?.GEMINI_API_KEY;
    setIsParsing(true);
    setParsedDbQuestions([]);

    const prompt = `
    당신은 텍스트 파싱(Parsing) 전문가입니다.
    아래 [이그잼포유 원본 텍스트]에는 여러 개의 주관식 문제, 정답, 해설이 무작위로 섞여 있습니다.
    이 텍스트를 분석하여 각각의 문제를 분리해내고, 아래의 JSON 배열(Array) 형식으로만 출력하세요.

    [이그잼포유 원본 텍스트]
    ${uploadText}

    [출력 필수 조건]
    1. 문제 번호(예: 1., 2.)는 출력하지 말고 순수 문제 내용만 "question"에 담으세요.
    2. 정답이 여러 개일 경우 쉼표(,)나 슬래시(/)로 연결하여 하나의 문자열로 "answer"에 담으세요.
    3. JSON 응답 외에 어떠한 말도 덧붙이지 마세요.

    [출력 JSON 양식]
    [
      {
        "question": "분리해낸 문제 내용",
        "answer": "분리해낸 정답 문장",
        "explanation": "해당 문제의 해설 (없으면 빈 칸)"
      }
    ]
    `;

    // 💡 원장님 약속대로 기존 제미나이 모델 배열을 그대로 사용합니다.
    const modelsToTry = ['gemini-3.7-flash', 'gemini-3.1-pro', 'gemini-3.5-flash-lite'];
    let success = false;
    let textResponse = '';

    for (const model of modelsToTry) {
      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.2, maxOutputTokens: 8192, responseMimeType: "application/json" } 
          })
        });

        const data = await response.json();
        if (data.error) throw new Error(data.error.message);

        textResponse = data.candidates[0].content.parts[0].text;
        success = true; 
        break; 
      } catch (error) {
        console.warn(`파싱 실패: ${model}`);
      }
    }

    try {
      if (!success) throw new Error("API 호출 실패");
      let cleanJson = textResponse.replace(/```json/gi, '').replace(/```/g, '').trim();
      
      const parsedArray = JSON.parse(cleanJson);
      
      // 메타데이터(학년, 출판사 등)를 강제로 병합
      const finalQuestions: MiddleQuestion[] = parsedArray.map((item: any) => ({
        grade: uploadMeta.grade,
        publisher: uploadMeta.publisher,
        lesson: uploadMeta.lesson,
        grammar_tag: uploadMeta.grammar_tag,
        question: item.question,
        answer: item.answer,
        explanation: item.explanation || ''
      }));

      setParsedDbQuestions(finalQuestions);
    } catch (err) {
      alert("텍스트를 분석하는 중 오류가 발생했습니다. 원본 텍스트 형태를 조금 다듬은 뒤 다시 시도해주세요.");
    } finally {
      setIsParsing(false);
    }
  };

  // 💡 [신규 기능 2] 파싱된 문제를 수파베이스 middle_questions 에 영구 저장
  const handleUploadToSupabase = async () => {
    if (parsedDbQuestions.length === 0) return;
    setIsUploadingDB(true);
    
    try {
      const { error } = await supabase.from('middle_questions').insert(parsedDbQuestions);
      if (error) throw error;
      
      alert(`🎉 총 ${parsedDbQuestions.length}문제가 수파베이스 보물창고에 영구 저장되었습니다!`);
      setParsedDbQuestions([]);
      setUploadText('');
    } catch (err: any) {
      alert(`업로드 실패: ${err.message}`);
    } finally {
      setIsUploadingDB(false);
    }
  };


  // --------------------------------------------------------
  // 💡 [신규 기능 3] 무제한 DB 불러오기 (1000건 제한 우회 로직 포함)
  // --------------------------------------------------------
  const handleFetchMiddleDb = async () => {
    setIsFetchingDb(true);
    setFetchedDbQuestions([]);
    setSelectedDbQuestionIds([]);

    try {
      let allQuestions: MiddleQuestion[] = [];
      let from = 0;
      const step = 1000;
      let keepFetching = true;

      // 💡 무한 루프 릴레이 기법으로 데이터 짤림 방지
      while (keepFetching) {
        let query = supabase.from('middle_questions').select('*');
        if (dbFilter.publisher) query = query.eq('publisher', dbFilter.publisher);
        if (dbFilter.lesson) query = query.eq('lesson', dbFilter.lesson);
        if (dbFilter.grammar_tag) query = query.eq('grammar_tag', dbFilter.grammar_tag);
        
        const { data, error } = await query
          .order('id', { ascending: false })
          .range(from, from + step - 1);

        if (error) throw error;

        if (data && data.length > 0) {
          allQuestions = [...allQuestions, ...data];
          from += step;
          if (data.length < step) keepFetching = false; // 마지막 페이지면 중단
        } else {
          keepFetching = false;
        }
      }

      setFetchedDbQuestions(allQuestions);
      if (allQuestions.length === 0) alert("해당 조건에 맞는 문제가 보물창고에 없습니다.");
    } catch (error) {
      alert("문제은행을 불러오는데 실패했습니다.");
    } finally {
      setIsFetchingDb(false);
    }
  };

  const toggleDbQuestionSelect = (id: number) => {
    setSelectedDbQuestionIds(prev => prev.includes(id) ? prev.filter(qid => qid !== id) : [...prev, id]);
  };


  // --------------------------------------------------------
  // 기존 버튼 로직 및 공용 함수
  // --------------------------------------------------------
  const currentPrintProblems = viewMode === 'studio' ? generatedProblems : (selectedExam?.problems || []);
  const canPrintOrDistribute = currentPrintProblems.length > 0;

  const handleCopyForReview = () => {
    if(!canPrintOrDistribute) return;
    let textToCopy = `[AI 출제 문제 검토용]\n\n`;
    currentPrintProblems.forEach((p, idx) => {
      textToCopy += `Q${idx + 1}. ${p.question}\n${p.passage}\n보기: ${p.options.join(', ')}\n`;
      textToCopy += `[정답] ${p.answer}\n[어휘] ${p.explanation.vocabulary}\n[문법] ${p.explanation.grammar}\n\n`;
    });
    navigator.clipboard.writeText(textToCopy);
    alert("복사 완료! 챗GPT 등 다른 AI에게 붙여넣기 하여 검수해보세요.");
  };

  const handlePrint = () => {
    window.print();
  };

  // 💡 [수정] DB 문제 배포 기능까지 모두 호환되도록 배포 로직 통합
  const handleDistribute = () => {
    if (selectedStudentIds.length === 0) return alert("과제를 보낼 학생을 1명 이상 선택해주세요.");
    
    // DB 배포 모드일 경우 선택된 문제 번호(ID) 확인
    if (viewMode === 'db_distribute' && selectedDbQuestionIds.length === 0) {
      return alert("배포할 문제를 먼저 체크박스로 선택해주세요!");
    }

    alert(`선택한 ${selectedStudentIds.length}명의 학생에게 과제가 성공적으로 배포되었습니다! 🚀\n(실제 학생 앱 할당 연동은 학생앱 작업 시 추가됩니다.)`);
    setShowDistributeModal(false);
    setSelectedStudentIds([]);
    setSelectedDbQuestionIds([]);
  };

  const handleSelectAllInGrade = () => {
    const allIdsInGrade = filteredStudents.map(s => s.student_id);
    const allSelected = allIdsInGrade.every(id => selectedStudentIds.includes(id));
    if (allSelected) {
      setSelectedStudentIds(prev => prev.filter(id => !allIdsInGrade.includes(id))); 
    } else {
      setSelectedStudentIds(prev => Array.from(new Set([...prev, ...allIdsInGrade]))); 
    }
  };

  const handleToggleStudent = (studentId: string) => {
    setSelectedStudentIds(prev => prev.includes(studentId) ? prev.filter(id => id !== studentId) : [...prev, studentId]);
  };

  const startEditing = (index: number) => {
    setEditingIndex(index);
    setEditFormData(JSON.parse(JSON.stringify(currentPrintProblems[index]))); 
    setAiFeedback(''); 
  };

  const saveEditing = () => {
    if (editingIndex !== null && editFormData) {
      if (viewMode === 'studio') {
        const updated = [...generatedProblems];
        updated[editingIndex] = editFormData;
        setGeneratedProblems(updated);
      } else if (selectedExam) {
        const updated = [...selectedExam.problems];
        updated[editingIndex] = editFormData;
        setSelectedExam({ ...selectedExam, problems: updated });
      }
    }
    setEditingIndex(null);
    setEditFormData(null);
  };

  const cancelEditing = () => {
    setEditingIndex(null);
    setEditFormData(null);
    setAiFeedback('');
  };

  const updateEditForm = (field: keyof Problem, value: any) => {
    if (editFormData) {
      setEditFormData({ ...editFormData, [field]: value });
    }
  };

  const updateExplanation = (field: keyof Problem['explanation'], value: string) => {
    if (editFormData) {
      setEditFormData({
        ...editFormData,
        explanation: { ...editFormData.explanation, [field]: value }
      });
    }
  };

  const updateOption = (index: number, value: string) => {
    if (editFormData) {
      const newOptions = [...editFormData.options];
      newOptions[index] = value;
      setEditFormData({ ...editFormData, options: newOptions });
    }
  };

  const renderTextWithFormatting = (text: string) => {
    if (!text) return null;
    return text.split('\n').map((line, lineIdx) => {
      const isBlockquote = line.trim().startsWith('>');
      const cleanLine = isBlockquote ? line.replace(/^>\s*/, '') : line;
      
      const parts = cleanLine.split(/(\*\*.*?\*\*)/g);
      const lineContent = parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i} style={{ fontWeight: '900', borderBottom: '2px solid #333', paddingBottom: '1px' }}>{part.slice(2, -2)}</strong>;
        }
        return part;
      });

      if (isBlockquote) {
        return (
          <div key={lineIdx} style={{ padding: '12px', margin: '12px 0', backgroundColor: '#f8fafc', borderLeft: '4px solid #94a3b8', fontWeight: 'bold', fontSize: '10.5pt', borderRadius: '0 4px 4px 0' }}>
            {lineContent}
          </div>
        );
      }
      return <div key={lineIdx} style={{ minHeight: '1em' }}>{lineContent}</div>;
    });
  };

  return (
    <div className="print-root" style={{ backgroundColor: '#f4f6f8', minHeight: '100vh', fontFamily: 'Pretendard, sans-serif' }}>
      
      <style>
        {`
          .print-only { display: none; }
          @media print {
            @page { size: A4; margin: 12mm 10mm; }
            body, html, .print-root { margin: 0 !important; padding: 0 !important; background-color: white !important; height: auto !important; min-height: auto !important; overflow: visible !important; display: block !important; }
            .no-print { display: none !important; }
            .print-only { display: block !important; width: 100%; color: black; background: white; }
            .print-page-break { page-break-before: always; }
            .print-col-2 { column-count: 2; column-gap: 12mm; width: 100%; display: block; }
            .problem-box { width: 100%; margin-bottom: 24px; display: block; break-inside: auto !important; page-break-inside: auto !important; -webkit-column-break-inside: auto !important; }
            .options-box { display: block; break-inside: auto !important; page-break-inside: auto !important; }
          }
        `}
      </style>

      {/* 상단 네비게이션 */}
      <div className="no-print" style={{ backgroundColor: 'white', padding: '16px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          {onBack && <button onClick={onBack} style={{ border: 'none', background: 'none', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', color: '#64748b' }}>← 뒤로</button>}
          <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '900', color: '#1e293b' }}>🤖 AI 문제 연구소</h1>
          
          <div style={{ display: 'flex', backgroundColor: '#f1f5f9', padding: '4px', borderRadius: '12px', gap: '4px' }}>
            <button onClick={() => setViewMode('studio')} style={{ padding: '8px 16px', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', transition: 'all 0.2s', backgroundColor: viewMode === 'studio' ? 'white' : 'transparent', color: viewMode === 'studio' ? '#2563eb' : '#64748b', boxShadow: viewMode === 'studio' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none' }}>
              📝 AI 출제소
            </button>
            <button onClick={() => setViewMode('archive')} style={{ padding: '8px 16px', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', transition: 'all 0.2s', backgroundColor: viewMode === 'archive' ? 'white' : 'transparent', color: viewMode === 'archive' ? '#8b5cf6' : '#64748b', boxShadow: viewMode === 'archive' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none' }}>
              🗂️ 문제 보관함
            </button>
            <div style={{ width: '2px', backgroundColor: '#cbd5e1', margin: '4px 8px' }}></div>
            {/* 💡 [신규 탭] */}
            <button onClick={() => setViewMode('db_upload')} style={{ padding: '8px 16px', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', transition: 'all 0.2s', backgroundColor: viewMode === 'db_upload' ? 'white' : 'transparent', color: viewMode === 'db_upload' ? '#f59e0b' : '#64748b', boxShadow: viewMode === 'db_upload' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none' }}>
              📥 중등 DB 업로더
            </button>
            <button onClick={() => setViewMode('db_distribute')} style={{ padding: '8px 16px', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', transition: 'all 0.2s', backgroundColor: viewMode === 'db_distribute' ? 'white' : 'transparent', color: viewMode === 'db_distribute' ? '#10b981' : '#64748b', boxShadow: viewMode === 'db_distribute' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none' }}>
              🎯 중등 DB 배포
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {(viewMode === 'studio' || viewMode === 'archive') && (
            <>
              {viewMode === 'studio' && (
                <button disabled={!isGenerated || isGenerating || isSaving} onClick={handleSaveToDB} style={{ padding: '8px 16px', backgroundColor: '#8b5cf6', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: (!isGenerated || isGenerating || isSaving) ? 'not-allowed' : 'pointer' }}>
                  {isSaving ? '⏳ 저장 중...' : '💾 시험지 저장'}
                </button>
              )}
              <button disabled={!canPrintOrDistribute} onClick={handleCopyForReview} style={{ padding: '8px 16px', backgroundColor: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '8px', fontWeight: '700', cursor: !canPrintOrDistribute ? 'not-allowed' : 'pointer' }}>
                📋 외부 검수 복사
              </button>
              <button disabled={!canPrintOrDistribute} onClick={handlePrint} style={{ padding: '8px 16px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: !canPrintOrDistribute ? 'not-allowed' : 'pointer' }}>
                🖨️ PDF / 인쇄하기
              </button>
              <button disabled={!canPrintOrDistribute} onClick={() => setShowDistributeModal(true)} style={{ padding: '8px 16px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: !canPrintOrDistribute ? 'not-allowed' : 'pointer' }}>
                🚀 학생에게 배포
              </button>
            </>
          )}

          {viewMode === 'db_distribute' && (
            <button disabled={selectedDbQuestionIds.length === 0} onClick={() => setShowDistributeModal(true)} style={{ padding: '8px 24px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '900', fontSize: '16px', cursor: selectedDbQuestionIds.length === 0 ? 'not-allowed' : 'pointer' }}>
              선택한 {selectedDbQuestionIds.length}문제 🚀 배포하기
            </button>
          )}
        </div>
      </div>

      <div className="no-print" style={{ padding: '24px', maxWidth: '1600px', margin: '0 auto' }}>
        
        {/* ===================== [모드 1] AI 출제소 화면 (기존 그대로 보존) ===================== */}
        {viewMode === 'studio' && (
          <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
            {/* 입력 패널 */}
            <div style={{ flex: '0 0 300px', backgroundColor: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '800' }}>원본 소스 입력</h3>
              <textarea 
                placeholder="지문이나 단어, 뼈대 문장을 붙여넣으세요."
                value={sourceText}
                onChange={(e) => setSourceText(e.target.value)}
                style={{ width: '100%', height: '200px', padding: '12px', boxSizing: 'border-box', borderRadius: '8px', border: '1px solid #cbd5e1', resize: 'none', marginBottom: '16px' }}
              />
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '14px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '8px' }}>생성할 문항 수 (단계 수)</label>
                <select value={questionCount} onChange={(e) => setQuestionCount(Number(e.target.value))} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 'bold' }}>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => <option key={num} value={num}>{num}문제 생성</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button onClick={() => handleGenerateAI('elem')} disabled={isGenerating} style={{ padding: '12px', backgroundColor: '#f59e0b', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: isGenerating ? 'not-allowed' : 'pointer', opacity: isGenerating ? 0.7 : 1 }}>
                  {isGenerating ? '출제 중... ⏳' : '🧸 초등 문장 확장 쓰기'}
                </button>
                <button onClick={() => handleGenerateAI('mid')} disabled={isGenerating} style={{ padding: '12px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: isGenerating ? 'not-allowed' : 'pointer', opacity: isGenerating ? 0.7 : 1 }}>
                  {isGenerating ? '출제 중... ⏳' : '📝 중등부 내신 출제'}
                </button>
                <button onClick={() => handleGenerateAI('high')} disabled={isGenerating} style={{ padding: '12px', backgroundColor: '#475569', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: isGenerating ? 'not-allowed' : 'pointer', opacity: isGenerating ? 0.7 : 1 }}>
                  {isGenerating ? '출제 중... ⏳' : '📝 고등 모의고사 출제'}
                </button>
              </div>
            </div>

            {/* 듀얼 뷰 (미리보기) */}
            <div style={{ flex: '1', display: 'flex', gap: '20px' }}>
              {/* 1. 학생용 문제 뷰 */}
              <div style={{ flex: '1', backgroundColor: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', minHeight: '600px', overflowY: 'auto', maxHeight: '800px' }}>
                <h3 style={{ margin: '0 0 20px 0', paddingBottom: '12px', borderBottom: '2px solid #e2e8f0', color: '#3b82f6' }}>📄 화면 미리보기 (문제)</h3>
                {!isGenerated && <div style={{ color: '#94a3b8', textAlign: 'center', marginTop: '100px' }}>왼쪽에서 문제를 생성해주세요.</div>}
                {isGenerated && generatedProblems.map((prob, idx) => (
                  <div key={idx} style={{ marginBottom: '20px', paddingBottom: '15px', borderBottom: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <div style={{ fontWeight: 'bold' }}>Q{idx + 1}. {renderTextWithFormatting(prob.question)}</div>
                      <button onClick={() => startEditing(idx)} style={{ padding: '4px 8px', backgroundColor: '#eff6ff', color: '#3b82f6', border: '1px solid #bfdbfe', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', flexShrink: 0, marginLeft: '8px' }}>
                        ✏️ 문제 수정
                      </button>
                    </div>
                    <div style={{ fontSize: '13.5px', color: '#111', border: '1px solid #cbd5e1', padding: '16px', borderRadius: '8px', marginBottom: '12px', lineHeight: '1.6' }}>
                      {renderTextWithFormatting(prob.passage)}
                    </div>
                    
                    {prob.options && prob.options.length > 0 ? (
                      <div style={{ fontSize: '13.5px', color: '#334155', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {prob.options.map((opt, i) => <span key={i}>{opt}</span>)}
                      </div>
                    ) : (
                      <div style={{ borderBottom: '2px dashed #cbd5e1', marginTop: '30px', marginBottom: '10px' }}></div>
                    )}
                  </div>
                ))}
              </div>

              {/* 2. 교사용 해설지 뷰 */}
              <div style={{ flex: '1', backgroundColor: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', minHeight: '600px', overflowY: 'auto', maxHeight: '800px' }}>
                <h3 style={{ margin: '0 0 20px 0', paddingBottom: '12px', borderBottom: '2px solid #e2e8f0', color: '#10b981' }}>👩‍🏫 교사용 해설 및 분석지</h3>
                {!isGenerated && <div style={{ color: '#94a3b8', textAlign: 'center', marginTop: '100px' }}>왼쪽에서 문제를 생성해주세요.</div>}
                {isGenerated && generatedProblems.map((prob, idx) => (
                  <div key={idx} style={{ marginBottom: '24px', paddingBottom: '20px', borderBottom: '2px dashed #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <h4 style={{ margin: 0, color: '#10b981', fontSize: '16px' }}>Q{idx + 1} 정답 및 해설</h4>
                      <button onClick={() => startEditing(idx)} style={{ padding: '4px 8px', backgroundColor: '#f0fdf4', color: '#10b981', border: '1px solid #bbf7d0', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>
                        ✏️ 해설 수정
                      </button>
                    </div>
                    <div style={{ marginBottom: '12px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 'bold', backgroundColor: '#ef4444', color: 'white', padding: '4px 8px', borderRadius: '6px' }}>정답</span> 
                      <b style={{ color: '#111' }}>{prob.answer}</b>
                    </div>
                    <div style={{ fontSize: '13px', lineHeight: '1.5', color: '#334155' }}>
                      <p style={{ margin: '0 0 8px 0' }}><b>[핵심 어휘]</b><br/>{prob.explanation.vocabulary}</p>
                      <p style={{ margin: '0 0 8px 0', backgroundColor: '#f8fafc', padding: '8px', borderRadius: '4px' }}><b>[구조 & 문법]</b><br/>{prob.explanation.structure}<br/>{prob.explanation.grammar}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ===================== [모드 2] 문제 보관함 화면 (기존 그대로 보존) ===================== */}
        {viewMode === 'archive' && (
          <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
            <div style={{ flex: '0 0 350px', backgroundColor: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', maxHeight: '800px', overflowY: 'auto' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '800', color: '#1e293b' }}>🗂️ 저장된 시험지 목록</h3>
              {savedExams.length === 0 ? (
                <p style={{ color: '#94a3b8', textAlign: 'center', marginTop: '50px' }}>저장된 시험지가 없습니다.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {savedExams.map(exam => (
                    <button 
                      key={exam.id} 
                      onClick={() => setSelectedExam(exam)}
                      style={{ 
                        textAlign: 'left', padding: '16px', border: '1px solid #e2e8f0', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s',
                        backgroundColor: selectedExam?.id === exam.id ? '#f3e8ff' : 'white',
                        borderColor: selectedExam?.id === exam.id ? '#a855f7' : '#e2e8f0'
                      }}
                    >
                      <strong style={{ display: 'block', fontSize: '15px', color: selectedExam?.id === exam.id ? '#7e22ce' : '#334155', marginBottom: '8px', wordBreak: 'keep-all' }}>
                        {exam.title}
                      </strong>
                      <span style={{ fontSize: '12px', color: '#94a3b8' }}>문항 수: {exam.problems.length}문제</span>
                      <span style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginTop: '4px' }}>생성일: {new Date(exam.created_at).toLocaleDateString()}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div style={{ flex: '1', backgroundColor: 'white', borderRadius: '16px', padding: '30px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', minHeight: '600px', maxHeight: '800px', overflowY: 'auto' }}>
              {!selectedExam ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#94a3b8', fontSize: '16px' }}>
                  왼쪽에서 보관된 시험지를 선택해주세요.
                </div>
              ) : (
                <div>
                  <h2 style={{ fontSize: '24px', fontWeight: '900', color: '#1e293b', borderBottom: '3px solid #e2e8f0', paddingBottom: '15px', marginBottom: '25px' }}>
                    {selectedExam.title}
                  </h2>
                  <div style={{ display: 'flex', gap: '20px' }}>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ margin: '0 0 20px 0', paddingBottom: '12px', borderBottom: '2px solid #e2e8f0', color: '#3b82f6' }}>📄 문제지</h3>
                      {selectedExam.problems.map((prob, idx) => (
                        <div key={idx} style={{ marginBottom: '20px', paddingBottom: '15px', borderBottom: '1px solid #e2e8f0' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                            <div style={{ fontWeight: 'bold' }}>Q{idx + 1}. {renderTextWithFormatting(prob.question)}</div>
                          </div>
                          <div style={{ fontSize: '13.5px', color: '#111', border: '1px solid #cbd5e1', padding: '16px', borderRadius: '8px', marginBottom: '12px', lineHeight: '1.6' }}>
                            {renderTextWithFormatting(prob.passage)}
                          </div>
                          {prob.options && prob.options.length > 0 ? (
                            <div style={{ fontSize: '13.5px', color: '#334155', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              {prob.options.map((opt, i) => <span key={i}>{opt}</span>)}
                            </div>
                          ) : (
                            <div style={{ borderBottom: '2px dashed #cbd5e1', marginTop: '30px', marginBottom: '10px' }}></div>
                          )}
                        </div>
                      ))}
                    </div>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ margin: '0 0 20px 0', paddingBottom: '12px', borderBottom: '2px solid #e2e8f0', color: '#10b981' }}>👩‍🏫 해설지</h3>
                      {selectedExam.problems.map((prob, idx) => (
                        <div key={idx} style={{ marginBottom: '24px', paddingBottom: '20px', borderBottom: '2px dashed #e2e8f0' }}>
                          <h4 style={{ margin: '0 0 12px 0', color: '#10b981', fontSize: '16px' }}>Q{idx + 1} 해설</h4>
                          <div style={{ marginBottom: '12px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontWeight: 'bold', backgroundColor: '#ef4444', color: 'white', padding: '4px 8px', borderRadius: '6px' }}>정답</span> 
                            <b>{prob.answer}</b>
                          </div>
                          <div style={{ fontSize: '13px', lineHeight: '1.5', color: '#334155' }}>
                            <p style={{ margin: '0 0 8px 0' }}><b>[핵심 어휘]</b><br/>{prob.explanation.vocabulary}</p>
                            <p style={{ margin: '0 0 8px 0', backgroundColor: '#f8fafc', padding: '8px', borderRadius: '4px' }}><b>[구조 & 문법]</b><br/>{prob.explanation.structure}<br/>{prob.explanation.grammar}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===================== [모드 3 - 신규] 중등 DB 쾌속 업로더 ===================== */}
        {viewMode === 'db_upload' && (
          <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
            <div style={{ flex: '0 0 350px', backgroundColor: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '800', color: '#f59e0b' }}>📥 이그잼포유 HWP 복붙하기</h3>
              <textarea 
                placeholder="이그잼포유 한글 파일에서 주관식 문제들을 드래그 복사하여 여기에 통