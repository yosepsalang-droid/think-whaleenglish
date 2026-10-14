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

export default function LmsAiStudio({ onBack }: { onBack?: () => void }) {
  // 💡 [혁신 패치 1] 화면 모드 전환 (출제소 vs 보관함)
  const [viewMode, setViewMode] = useState<'studio' | 'archive'>('studio');

  // 출제소 상태
  const [sourceText, setSourceText] = useState('');
  const [questionCount, setQuestionCount] = useState(5); 
  const [isGenerated, setIsGenerated] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false); 
  const [generatedProblems, setGeneratedProblems] = useState<Problem[]>([]);
  
  // 보관함 상태
  const [savedExams, setSavedExams] = useState<SavedExam[]>([]);
  const [selectedExam, setSelectedExam] = useState<SavedExam | null>(null);

  // 배포 모달 상태
  const [showDistributeModal, setShowDistributeModal] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const [selectedGrade, setSelectedGrade] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  // 수정 상태
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editFormData, setEditFormData] = useState<Problem | null>(null);
  const [aiFeedback, setAiFeedback] = useState('');
  const [isAutoFixing, setIsAutoFixing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchStudents = async () => {
      const { data } = await supabase.from('students').select('*');
      if (data) setStudents(data);
    };
    fetchStudents();
  }, []);

  // 💡 [혁신 패치 2] 보관함(Archive) 탭을 누르면 수파베이스에서 저장된 시험지를 싹 불러옵니다!
  useEffect(() => {
    if (viewMode === 'archive') {
      const fetchArchive = async () => {
        const { data, error } = await supabase.from('ai_exams').select('*').order('created_at', { ascending: false });
        if (data) setSavedExams(data);
        if (error) console.error("보관함 로드 실패:", error);
      };
      fetchArchive();
      setSelectedExam(null); // 탭 전환 시 선택 초기화
    }
  }, [viewMode]);

  const grades = Array.from(new Set(students.map(s => s.grade))).filter(Boolean).sort();
  const filteredStudents = students.filter(s => s.grade === selectedGrade);

  const formattingGuidelines = `
  [문제 출력 형식 및 텍스트 강조 가이드라인]
  1. 밑줄 사용 절대 금지: 플랫폼 환경상 밑줄(underline, <u>태그 등)은 정상적으로 출력되지 않으므로 절대 사용하지 마세요.
  2. 굵은 글씨(Bold) 활용: 어휘, 어법 문제 등에서 특정 단어나 문장을 강조해야 할 경우, 반드시 마크다운 굵기 기호(**)를 사용하세요. 
  3. 번호와 함께 강조 표기법: 어휘/어법/지칭 추론 문제의 지문 내 강조 표시는 '번호 + 띄어쓰기 + **강조단어**' 형태로 통일하세요. (예: ① **that**)
  4. 보기 구성: 밑줄/강조 문제의 보기를 만들 때는 숫자만 적지 말고, 반드시 해당 단어를 함께 적어주세요.
  5. 박스 처리(문장 삽입/요약문): 문장 삽입 문제나 요약문은 본문과 헷갈리지 않게 반드시 인용구(>) 기호를 맨 앞에 넣어서 명확히 구분하세요.
  6. 🚨 원문 100% 유지 및 한글 삽입 금지: 지문을 임의로 요약하거나 생략하지 마세요.
  7. 🚨 선지 개수 엄수: 지문 내에 번호를 매기는 문제의 경우, 반드시 지문 안에 ①번부터 ⑤번까지 빠짐없이 마크다운 기호가 존재해야 합니다.
  8. 🚨 JSON 오류 방지: 응답은 반드시 완벽한 JSON Array [ ] 형태여야 하며, 텍스트 내용(Value) 안에 큰따옴표(")를 쓰면 에러가 나므로 반드시 작은따옴표(')로만 대체해서 쓰세요.
  `;

  const handleGenerateAI = async (type: 'elem' | 'mid' | 'high') => {
    if (!sourceText) return alert("원본 지문이나 문제를 먼저 입력해주세요!");
    
    const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || (CONFIG as any)?.GEMINI?.API_KEY || (CONFIG as any)?.GEMINI_API_KEY;
    if (!apiKey) return alert("API 키를 찾을 수 없습니다.");

    setIsGenerating(true);
    setIsGenerated(false);
    setGeneratedProblems([]);

    // 💡 [혁신 패치 3] 초등부 전용 아주 쉽고 직관적인 프롬프트 추가
    let promptBase = '';
    if (type === 'elem') {
      promptBase = `
      당신은 10년 차 최고의 초등부 영어 학원 강사입니다.
      다음 원본 텍스트를 바탕으로 [초등학생 수준에 맞는 아주 쉽고 재미있는 파닉스/기초단어/기초문법 문제]를 정확히 ${questionCount}개 만들어주세요.
      문제가 너무 길거나 복잡하면 안 됩니다. 아주 직관적이어야 합니다.
      `;
    } else if (type === 'mid') {
      promptBase = `
      당신은 10년 차 최고의 중등부 영어 학원 강사입니다.
      다음 원본 텍스트를 바탕으로 [중등부 내신 문법 및 독해 변형 문제]를 정확히 ${questionCount}개 만들어주세요.
      `;
    } else {
      promptBase = `
      당신은 10년 차 최고의 고등부 영어 학원 강사입니다.
      아래 [원본 텍스트]를 바탕으로 [고등 모의고사 (고1~고3) 및 수능 대비 수준 변형 문제]를 정확히 ${questionCount}개 제작해 주세요.
      `;
    }

    const prompt = `
      ${promptBase}

      [원본 텍스트]
      ${sourceText}

      [출제 조건]
      1. 문제는 반드시 5지 선다형 객관식으로 출제하세요.
      2. 🚨 논리적으로 정답이 명확해야 하며, 복수 정답이나 오류가 발생하지 않도록 자체 검수하세요.
      3. 절대 다른 설명이나 인삿말을 덧붙이지 말고, 오직 아래의 JSON 배열(Array) 형태로만 출력하세요.

      ${formattingGuidelines}

      [출력 JSON 양식]
      [
        {
          "question": "문제 내용",
          "passage": "문제 지문 내용",
          "options": ["① 보기", "② 보기", "③ 보기", "④ 보기", "⑤ 보기"],
          "answer": "정답 번호 기호",
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

    const modelsToTry = ['gemini-1.5-flash', 'gemini-1.5-pro'];
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
              temperature: 0.2, 
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

    const modelsToTry = ['gemini-1.5-flash', 'gemini-1.5-pro'];
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
    
    const title = prompt("저장할 시험지의 제목을 입력해주세요.\n(예: 24년 9월 고1 모의고사 30번 변형)");
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

  // 인쇄 및 배포 로직 통합 (출제소 문제 or 보관함 선택 문제 모두 호환되도록 구성)
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

  const handleDistribute = () => {
    if (selectedStudentIds.length === 0) return alert("과제를 보낼 학생을 1명 이상 선택해주세요.");
    alert(`선택한 ${selectedStudentIds.length}명의 학생에게 과제가 배포되었습니다! 🚀`);
    setShowDistributeModal(false);
    setSelectedStudentIds([]);
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
        // 보관함에서 수정 시 화면만 반영 (원할 경우 Supabase DB 업데이트 추가 가능)
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
          
          {/* 💡 화면 모드 전환 탭 */}
          <div style={{ display: 'flex', backgroundColor: '#f1f5f9', padding: '4px', borderRadius: '12px' }}>
            <button onClick={() => setViewMode('studio')} style={{ padding: '8px 16px', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', transition: 'all 0.2s', backgroundColor: viewMode === 'studio' ? 'white' : 'transparent', color: viewMode === 'studio' ? '#2563eb' : '#64748b', boxShadow: viewMode === 'studio' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none' }}>
              📝 AI 출제소
            </button>
            <button onClick={() => setViewMode('archive')} style={{ padding: '8px 16px', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', transition: 'all 0.2s', backgroundColor: viewMode === 'archive' ? 'white' : 'transparent', color: viewMode === 'archive' ? '#8b5cf6' : '#64748b', boxShadow: viewMode === 'archive' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none' }}>
              🗂️ 문제 보관함
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
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
        </div>
      </div>

      <div className="no-print" style={{ padding: '24px', maxWidth: '1600px', margin: '0 auto' }}>
        
        {/* ===================== [모드 1] AI 출제소 화면 ===================== */}
        {viewMode === 'studio' && (
          <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
            {/* 입력 패널 */}
            <div style={{ flex: '0 0 300px', backgroundColor: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '800' }}>원본 소스 입력</h3>
              <textarea 
                placeholder="모의고사 지문이나 변형할 문법 문제 텍스트를 붙여넣으세요."
                value={sourceText}
                onChange={(e) => setSourceText(e.target.value)}
                style={{ width: '100%', height: '200px', padding: '12px', boxSizing: 'border-box', borderRadius: '8px', border: '1px solid #cbd5e1', resize: 'none', marginBottom: '16px' }}
              />
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '14px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '8px' }}>생성할 문항 수</label>
                <select value={questionCount} onChange={(e) => setQuestionCount(Number(e.target.value))} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 'bold' }}>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => <option key={num} value={num}>{num}문제 생성</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {/* 💡 [혁신 패치 3] 초등부 출제 버튼 추가 */}
                <button onClick={() => handleGenerateAI('elem')} disabled={isGenerating} style={{ padding: '12px', backgroundColor: '#f59e0b', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: isGenerating ? 'not-allowed' : 'pointer', opacity: isGenerating ? 0.7 : 1 }}>
                  {isGenerating ? '출제 중... ⏳' : '🧸 초등부 파닉스/기초 출제'}
                </button>
                <button onClick={() => handleGenerateAI('mid')} disabled={isGenerating} style={{ padding: '12px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: isGenerating ? 'not-allowed' : 'pointer', opacity: isGenerating ? 0.7 : 1 }}>
                  {isGenerating ? '출제 중... ⏳' : '📝 중등부 내신 출제'}
                </button>
                <button onClick={() => handleGenerateAI('high')} disabled={isGenerating} style={{ padding: '12px', backgroundColor: '#475569', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: isGenerating ? 'not-allowed' : 'pointer', opacity: isGenerating ? 0.7 : 1 }}>
                  {isGenerating ? '출제 중... ⏳' : '📝 고등부 모의고사 출제'}
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
                    <div style={{ fontSize: '13.5px', color: '#334155', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {prob.options.map((opt, i) => <span key={i}>{opt}</span>)}
                    </div>
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
                      <h4 style={{ margin: 0, color: '#10b981', fontSize: '16px' }}>Q{idx + 1} 문항 분석</h4>
                      <button onClick={() => startEditing(idx)} style={{ padding: '4px 8px', backgroundColor: '#f0fdf4', color: '#10b981', border: '1px solid #bbf7d0', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>
                        ✏️ 해설 수정
                      </button>
                    </div>
                    <div style={{ marginBottom: '12px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 'bold', backgroundColor: '#ef4444', color: 'white', padding: '4px 8px', borderRadius: '6px' }}>정답</span> 
                      <b>{prob.answer}</b>
                    </div>
                    <div style={{ fontSize: '13px', lineHeight: '1.5', color: '#334155' }}>
                      <p style={{ margin: '0 0 8px 0' }}><b>[핵심 어휘]</b><br/>{prob.explanation.vocabulary}</p>
                      <p style={{ margin: '0 0 8px 0' }}><b>[직독직해]</b><br/>{prob.explanation.direct}</p>
                      <p style={{ margin: '0 0 8px 0' }}><b>[자연스러운 해석]</b><br/>{prob.explanation.natural}</p>
                      <p style={{ margin: '0 0 8px 0', backgroundColor: '#f8fafc', padding: '8px', borderRadius: '4px' }}><b>[구조 & 문법]</b><br/>{prob.explanation.structure}<br/>{prob.explanation.grammar}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ===================== [모드 2] 문제 보관함 화면 ===================== */}
        {viewMode === 'archive' && (
          <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
            {/* 좌측: 시험지 목록 */}
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

            {/* 우측: 선택된 시험지 뷰 */}
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
                    {/* 학생용 문제 뷰 (보관함) */}
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
                          <div style={{ fontSize: '13.5px', color: '#334155', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {prob.options.map((opt, i) => <span key={i}>{opt}</span>)}
                          </div>
                        </div>
                      ))}
                    </div>
                    {/* 교사용 해설지 뷰 (보관함) */}
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
                            <p style={{ margin: '0 0 8px 0' }}><b>[직독직해]</b><br/>{prob.explanation.direct}</p>
                            <p style={{ margin: '0 0 8px 0' }}><b>[자연스러운 해석]</b><br/>{prob.explanation.natural}</p>
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
      </div>

      {/* 💡 문항 오류 자동/수동 수정 모달창 */}
      {editingIndex !== null && editFormData && (
        <div className="no-print" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 }}>
          <div style={{ backgroundColor: 'white', width: '800px', maxHeight: '90vh', overflowY: 'auto', borderRadius: '16px', padding: '32px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #e2e8f0', paddingBottom: '16px', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#1e293b' }}>🛠️ {editingIndex + 1}번 문항 직접 수정</h2>
              <button onClick={cancelEditing} style={{ border: 'none', background: 'none', fontSize: '24px', cursor: 'pointer', color: '#94a3b8' }}>&times;</button>
            </div>

            <div style={{ backgroundColor: '#f0fdf4', padding: '20px', borderRadius: '12px', border: '2px dashed #4ade80', marginBottom: '24px' }}>
              <label style={{ fontWeight: '900', fontSize: '15px', marginBottom: '8px', display: 'block', color: '#166534' }}>
                🤖 영어를 직접 고치기 어렵다면? 외부 검수자의 지적을 붙여넣으세요!
              </label>
              <textarea
                placeholder="예: 3번 보기 문법이 틀렸어. 수동태로 바꿔야 해. 또는 정답을 4번으로 바꾸고 그에 맞게 지문을 수정해줘."
                value={aiFeedback}
                onChange={e => setAiFeedback(e.target.value)}
                rows={3}
                style={{ width: '100%', padding: '12px', border: '1px solid #86efac', borderRadius: '8px', boxSizing: 'border-box', marginBottom: '12px', fontSize: '14px' }}
              />
              <button
                onClick={handleAutoFix}
                disabled={isAutoFixing}
                style={{ width: '100%', padding: '14px', backgroundColor: '#16a34a', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '900', fontSize: '15px', cursor: isAutoFixing ? 'not-allowed' : 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 6px rgba(22,163,74,0.2)' }}
              >
                {isAutoFixing ? '🛠️ AI가 지적 사항을 분석하여 코드를 고치는 중입니다... ⏳' : '✨ 이 피드백대로 AI에게 원터치 자동 수정 맡기기'}
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', opacity: isAutoFixing ? 0.5 : 1 }}>
              <div>
                <label style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '6px', display: 'block' }}>질문 (Question)</label>
                <input value={editFormData.question} onChange={e => updateEditForm('question', e.target.value)} style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '6px', display: 'block' }}>지문 (Passage)</label>
                <textarea value={editFormData.passage} onChange={e => updateEditForm('passage', e.target.value)} rows={6} style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box', resize: 'vertical' }} />
              </div>
              <div>
                <label style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '6px', display: 'block' }}>보기 (Options)</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {editFormData.options.map((opt, i) => (
                    <input key={i} value={opt} onChange={e => updateOption(i, e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }} />
                  ))}
                </div>
              </div>
              <div>
                <label style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '6px', display: 'block' }}>정답 기호 (예: ③)</label>
                <input value={editFormData.answer} onChange={e => updateEditForm('answer', e.target.value)} style={{ width: '100px', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }} />
              </div>
              <hr style={{ borderTop: '1px dashed #cbd5e1', margin: '10px 0' }} />
              <div>
                <label style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '6px', display: 'block', color: '#10b981' }}>핵심 어휘</label>
                <textarea value={editFormData.explanation.vocabulary} onChange={e => updateExplanation('vocabulary', e.target.value)} rows={2} style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '6px', display: 'block', color: '#10b981' }}>직독직해</label>
                <textarea value={editFormData.explanation.direct} onChange={e => updateExplanation('direct', e.target.value)} rows={3} style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '6px', display: 'block', color: '#10b981' }}>자연스러운 해석</label>
                <textarea value={editFormData.explanation.natural} onChange={e => updateExplanation('natural', e.target.value)} rows={3} style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '6px', display: 'block', color: '#10b981' }}>구조 분석</label>
                <textarea value={editFormData.explanation.structure} onChange={e => updateExplanation('structure', e.target.value)} rows={2} style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '6px', display: 'block', color: '#10b981' }}>핵심 문법</label>
                <textarea value={editFormData.explanation.grammar} onChange={e => updateExplanation('grammar', e.target.value)} rows={2} style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'flex-end' }}>
              <button onClick={cancelEditing} disabled={isAutoFixing} style={{ padding: '12px 24px', backgroundColor: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: isAutoFixing ? 'not-allowed' : 'pointer' }}>취소</button>
              <button onClick={saveEditing} disabled={isAutoFixing} style={{ padding: '12px 32px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: isAutoFixing ? 'not-allowed' : 'pointer' }}>수정된 사항 최종 반영하기</button>
            </div>
          </div>
        </div>
      )}

      {/* 🖨 인쇄될 영역 (출제소 문제 / 보관함 문제 모두 호환) */}
      <div className="print-only">
        {canPrintOrDistribute && (
          <div>
            <div style={{ textAlign: 'center', fontSize: '11pt', fontWeight: 'bold', marginBottom: '4px' }}>생각학원</div>
            <h2 style={{ textAlign: 'center', borderBottom: '2px solid black', paddingBottom: '8px', marginBottom: '16px', fontSize: '15pt' }}>
              {viewMode === 'archive' && selectedExam ? selectedExam.title : '고래영어 특별 과제'}
            </h2>
            
            <div className="print-col-2">
              {currentPrintProblems.map((prob, idx) => {
                const isShortOptions = prob.options.every(opt => opt.length < 16) && prob.options.join('').length < 55;
                return (
                  <div key={idx} className="problem-box">
                    <p style={{ fontWeight: 'bold', fontSize: '10.5pt', marginBottom: '8px', textAlign: 'left' }}>
                      {idx + 1}. {renderTextWithFormatting(prob.question)}
                    </p>
                    <div style={{ border: '1px solid #000', padding: '12px', marginBottom: '10px', fontSize: '10pt', lineHeight: '1.5', wordBreak: 'keep-all', overflowWrap: 'break-word', width: '100%', boxSizing: 'border-box', textAlign: 'left' }}>
                      {renderTextWithFormatting(prob.passage)}
                    </div>
                    <div className="options-box" style={{ display: 'flex', flexDirection: isShortOptions ? 'row' : 'column', flexWrap: isShortOptions ? 'wrap' : 'nowrap', justifyContent: isShortOptions ? 'space-between' : 'flex-start', gap: isShortOptions ? '8px' : '5px', fontSize: '9.5pt', paddingLeft: '2px', textAlign: 'left' }}>
                      {prob.options.map(opt => (
                        <div key={opt} style={{ width: isShortOptions ? '48%' : '100%', textAlign: 'left', display: 'block', paddingLeft: isShortOptions ? '0' : '0px' }}>
                          {renderTextWithFormatting(opt)}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="print-page-break"></div>
            
            <div style={{ textAlign: 'center', fontSize: '11pt', fontWeight: 'bold', marginBottom: '4px' }}>생각학원</div>
            <h2 style={{ textAlign: 'center', borderBottom: '2px solid black', paddingBottom: '8px', marginBottom: '16px', fontSize: '15pt' }}>
              정답 및 해설 (교사용)
            </h2>
            
            <div className="print-col-2" style={{ textAlign: 'left' }}>
              {currentPrintProblems.map((prob, idx) => (
                <div key={idx} className="problem-box" style={{ marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px dashed #ccc', textAlign: 'left' }}>
                  <h3 style={{ margin: '0 0 6px 0', fontSize: '11pt', color: '#1e3a8a', textAlign: 'left' }}>{idx + 1}번 해설</h3>
                  <div style={{ marginBottom: '6px', fontSize: '10pt', textAlign: 'left' }}>
                    <span style={{ fontWeight: 'bold', backgroundColor: '#e2e8f0', padding: '2px 6px', borderRadius: '4px', marginRight: '6px' }}>정답</span> 
                    <b>{prob.answer}</b>
                  </div>
                  <div style={{ fontSize: '9pt', lineHeight: '1.4', textAlign: 'left' }}>
                    <p style={{ margin: '0 0 4px 0', textAlign: 'left' }}><b>[핵심 어휘]</b><br/>{prob.explanation.vocabulary}</p>
                    <p style={{ margin: '0 0 4px 0', textAlign: 'left' }}><b>[직독직해]</b><br/>{prob.explanation.direct}</p>
                    <p style={{ margin: '0 0 4px 0', textAlign: 'left' }}><b>[자연스러운 해석]</b><br/>{prob.explanation.natural}</p>
                    <p style={{ margin: '0 0 4px 0', backgroundColor: '#f8fafc', padding: '4px', textAlign: 'left' }}><b>[구조 & 문법]</b><br/>{prob.explanation.structure}<br/>{prob.explanation.grammar}</p>
                  </div>
                </div>
              ))}
            </div>
            
          </div>
        )}
      </div>

      {/* 🚀 학생 배포 모달창 */}
      {showDistributeModal && (
        <div className="no-print" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', width: '500px', borderRadius: '24px', padding: '32px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '900' }}>🚀 과제 배포하기</h2>
              <button onClick={() => setShowDistributeModal(false)} style={{ border: 'none', background: 'none', fontSize: '20px', cursor: 'pointer' }}>❌</button>
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '14px', fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>1. 학년 필터 선택</label>
              <select value={selectedGrade} onChange={e => setSelectedGrade(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 'bold' }}>
                <option value="">학년을 선택하세요</option>
                {grades.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            {selectedGrade && (
              <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <label style={{ fontSize: '14px', fontWeight: 'bold', display: 'block' }}>2. 학생 선택 ({selectedStudentIds.length}명 선택됨)</label>
                  <button onClick={handleSelectAllInGrade} style={{ fontSize: '12px', padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', cursor: 'pointer' }}>전체 선택/해제</button>
                </div>
                <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px' }}>
                  {filteredStudents.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#94a3b8', padding: '20px 0' }}>해당 학년의 학생이 없습니다.</div>
                  ) : (
                    filteredStudents.map(student => (
                      <label key={student.student_id} style={{ display: 'flex', alignItems: 'center', padding: '8px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}>
                        <input type="checkbox" checked={selectedStudentIds.includes(student.student_id)} onChange={() => handleToggleStudent(student.student_id)} style={{ marginRight: '12px', transform: 'scale(1.2)' }} />
                        <span style={{ fontWeight: 'bold', width: '80px' }}>{student.name}</span>
                        <span style={{ color: '#64748b', fontSize: '13px' }}>({student.student_id})</span>
                      </label>
                    ))
                  )}
                </div>
              </div>
            )}
            <button onClick={handleDistribute} disabled={selectedStudentIds.length === 0} style={{ width: '100%', padding: '16px', backgroundColor: selectedStudentIds.length === 0 ? '#cbd5e1' : '#10b981', color: 'white', border: 'none', borderRadius: '12px', fontSize: '18px', fontWeight: '900', cursor: selectedStudentIds.length === 0 ? 'not-allowed' : 'pointer' }}>
              선택한 학생들에게 전송
            </button>
          </div>
        </div>
      )}

    </div>
  );
}