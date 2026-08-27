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

export default function LmsAiStudio({ onBack }: { onBack?: () => void }) {
  const [sourceText, setSourceText] = useState('');
  const [questionCount, setQuestionCount] = useState(1); 
  const [isGenerated, setIsGenerated] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false); 
  const [generatedProblems, setGeneratedProblems] = useState<Problem[]>([]);
  
  const [showDistributeModal, setShowDistributeModal] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const [selectedGrade, setSelectedGrade] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  useEffect(() => {
    const fetchStudents = async () => {
      const { data } = await supabase.from('students').select('*');
      if (data) setStudents(data);
    };
    fetchStudents();
  }, []);

  const grades = Array.from(new Set(students.map(s => s.grade))).filter(Boolean).sort();
  const filteredStudents = students.filter(s => s.grade === selectedGrade);

  const handleGenerateAI = async (type: 'mid' | 'high') => {
    if (!sourceText) return alert("원본 지문이나 문제를 먼저 입력해주세요!");
    
    const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || CONFIG?.GEMINI_API_KEY;
    if (!apiKey) return alert("API 키를 찾을 수 없습니다.");

    setIsGenerating(true);
    setIsGenerated(false);
    setGeneratedProblems([]);

    const prompt = type === 'high' ? `
      당신은 10년 차 최고의 고등부 영어 학원 강사입니다.
      아래 [원본 텍스트]를 바탕으로 변형 및 유사 문제를 정확히 ${questionCount}개 제작해 주세요.

      [원본 텍스트]
      ${sourceText}

      [문제 제작 요청 사항]
      1. 대상 학생 수준: 고등 모의고사 (고1~고3) 및 수능 대비 수준
      2. 문제 제작 유형: 원문 기반 다른 유형 변형(예: 주제/목적 문제 → 어법/어휘/빈칸 문제로 변형) 또는 동일 난이도와 구조의 새로운 유사 지문 생성
      3. 문제는 반드시 5지 선다형 객관식으로 출제하세요.
      4. 절대 다른 설명이나 인삿말을 덧붙이지 말고, 오직 아래의 JSON 배열(Array) 형태로만 출력하세요.

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
            "structure": "주요 문장 구조 분석 내용",
            "grammar": "핵심 문법 포인트",
            "vocabulary": "지문 내 핵심 어휘 정리"
          }
        }
      ]
    ` : `
      당신은 10년 차 최고의 중등부 영어 학원 강사입니다.
      다음 원본 텍스트를 바탕으로 [중등부 내신 문법 변형 문제]를 정확히 ${questionCount}개 만들어주세요.

      [원본 텍스트]
      ${sourceText}

      [출제 조건]
      1. 문제는 5지 선다형 객관식으로 출제하세요.
      2. 절대 다른 설명이나 인삿말을 덧붙이지 말고, 오직 아래의 JSON 배열(Array) 형태로만 출력하세요.

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
            generationConfig: { temperature: 0.7 }
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
      const cleanJson = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsedProblems: Problem[] = JSON.parse(cleanJson);
      setGeneratedProblems(parsedProblems);
      setIsGenerated(true);
    } catch (error) {
      alert("AI 서버가 일시적으로 혼잡합니다. 잠시 후 다시 시도해주세요!");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyForReview = () => {
    let textToCopy = `[AI 출제 문제 검토용]\n\n`;
    generatedProblems.forEach((p, idx) => {
      textToCopy += `Q${idx + 1}. ${p.question}\n${p.passage}\n보기: ${p.options.join(', ')}\n`;
      textToCopy += `[정답] ${p.answer}\n[어휘] ${p.explanation.vocabulary}\n[문법] ${p.explanation.grammar}\n\n`;
    });
    navigator.clipboard.writeText(textToCopy);
    alert("복사 완료! 챗GPT 등 다른 AI에게 붙여넣기 하여 검수해보세요.");
  };

  const handlePrint = () => {
    window.print();
  };

  const handleToggleStudent = (studentId: string) => {
    setSelectedStudentIds(prev => prev.includes(studentId) ? prev.filter(id => id !== studentId) : [...prev, studentId]);
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

  const handleDistribute = () => {
    if (selectedStudentIds.length === 0) return alert("과제를 보낼 학생을 1명 이상 선택해주세요.");
    alert(`선택한 ${selectedStudentIds.length}명의 학생에게 과제가 배포되었습니다! 🚀`);
    setShowDistributeModal(false);
    setSelectedStudentIds([]);
  };

  const chunkArray = <T,>(arr: T[], size: number): T[][] => {
    return Array.from({ length: Math.ceil(arr.length / size) }, (v, i) =>
      arr.slice(i * size, i * size + size)
    );
  };

  const problemChunks = chunkArray(generatedProblems, 4);

  return (
    <div style={{ backgroundColor: '#f4f6f8', minHeight: '100vh', fontFamily: 'Pretendard, sans-serif' }}>
      
      <style>
        {`
          .print-only { display: none; }
          
          @media print {
            @page {
              size: A4;
              margin: 12mm 12mm;
            }
            body * { visibility: hidden; }
            .print-only { 
              display: block; 
              visibility: visible; 
              position: absolute; 
              left: 0; top: 0; 
              width: 100%; 
              padding: 0; margin: 0;
              box-sizing: border-box;
              color: black; 
            }
            .print-only * { visibility: visible; }
            .no-print { display: none !important; }
            
            .print-page-break { page-break-before: always; }
            .avoid-break { page-break-inside: avoid; }
            
            .print-grid-2 {
              display: grid;
              grid-template-columns: 1fr 1fr;
              column-gap: 12mm;
              row-gap: 12mm;
              width: 100%;
              box-sizing: border-box;
            }

            .print-col-2 {
              column-count: 2;
              column-gap: 15mm;
              column-rule: 1px dashed #ccc;
              width: 100%;
            }
          }
        `}
      </style>

      {/* 상단 네비게이션 */}
      <div className="no-print" style={{ backgroundColor: 'white', padding: '16px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {onBack && <button onClick={onBack} style={{ border: 'none', background: 'none', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', color: '#64748b' }}>← 뒤로</button>}
          <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#1e293b' }}>🤖 AI 문제 연구소 & 배포 통제실</h1>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button disabled={!isGenerated || isGenerating} onClick={handleCopyForReview} style={{ padding: '8px 16px', backgroundColor: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '8px', fontWeight: '700', cursor: (!isGenerated || isGenerating) ? 'not-allowed' : 'pointer' }}>
            📋 외부 검수 복사
          </button>
          <button disabled={!isGenerated || isGenerating} onClick={handlePrint} style={{ padding: '8px 16px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: (!isGenerated || isGenerating) ? 'not-allowed' : 'pointer' }}>
            🖨️ PDF / 인쇄하기
          </button>
          <button disabled={!isGenerated || isGenerating} onClick={() => setShowDistributeModal(true)} style={{ padding: '8px 16px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: (!isGenerated || isGenerating) ? 'not-allowed' : 'pointer' }}>
            🚀 학생에게 배포
          </button>
        </div>
      </div>

      <div className="no-print" style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
        
        {/* 입력 패널 */}
        <div style={{ flex: '0 0 300px', backgroundColor: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '800' }}>1. 원본 소스 입력</h3>
          <textarea 
            placeholder="모의고사 지문이나 변형할 문법 문제 텍스트를 붙여넣으세요."
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
            style={{ width: '100%', height: '200px', padding: '12px', boxSizing: 'border-box', borderRadius: '8px', border: '1px solid #cbd5e1', resize: 'none', marginBottom: '16px' }}
          />
          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '14px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '8px' }}>생성할 문항 수</label>
            <select value={questionCount} onChange={(e) => setQuestionCount(Number(e.target.value))} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 'bold' }}>
              {[1, 2, 3, 4, 5, 6, 7, 8].map(num => <option key={num} value={num}>{num}문제 생성</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button onClick={() => handleGenerateAI('high')} disabled={isGenerating} style={{ padding: '12px', backgroundColor: '#475569', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: isGenerating ? 'not-allowed' : 'pointer', opacity: isGenerating ? 0.7 : 1 }}>
              {isGenerating ? 'AI가 출제 중... ⏳' : '📝 고등부 모의고사 출제'}
            </button>
          </div>
        </div>

        {/* 듀얼 뷰 (미리보기 - 문제들이 보이도록 수정 완료!) */}
        <div style={{ flex: '1', display: 'flex', gap: '20px' }}>
          <div style={{ flex: '1', backgroundColor: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', minHeight: '600px', overflowY: 'auto', maxHeight: '800px' }}>
            <h3 style={{ margin: '0 0 20px 0', paddingBottom: '12px', borderBottom: '2px solid #e2e8f0', color: '#3b82f6' }}>📄 인쇄 미리보기 (문제)</h3>
            {!isGenerated && <div style={{ color: '#94a3b8', textAlign: 'center', marginTop: '100px' }}>왼쪽에서 문제를 생성해주세요.</div>}
            {isGenerated && generatedProblems.map((prob, idx) => (
              <div key={idx} style={{ marginBottom: '20px', paddingBottom: '15px', borderBottom: '1px solid #e2e8f0' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>Q{idx + 1}. {prob.question}</div>
                <div style={{ fontSize: '13px', color: '#475569', backgroundColor: '#f8fafc', padding: '10px', borderRadius: '6px', marginBottom: '8px' }}>{prob.passage}</div>
                <div style={{ fontSize: '13px', color: '#334155' }}>
                  {prob.options.map((opt, i) => <span key={i} style={{ marginRight: '12px' }}>{opt}</span>)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 🖨️ 인쇄될 영역 (생각학원 타이틀, 좌측 정렬, 보기 정렬 적용) */}
      <div className="print-only">
        {isGenerated && (
          <div>
            {problemChunks.map((chunk, pageIdx) => (
              <div key={pageIdx} className={pageIdx > 0 ? "print-page-break" : ""}>
                {/* 💡 상단 타이틀 '생각학원'으로 변경 */}
                <div style={{ textAlign: 'center', fontSize: '11pt', fontWeight: 'bold', marginBottom: '4px' }}>생각학원</div>
                <h2 style={{ textAlign: 'center', borderBottom: '2px solid black', paddingBottom: '8px', marginBottom: '16px', fontSize: '15pt' }}>
                  고래영어 특별 과제 {problemChunks.length > 1 ? `(${pageIdx + 1}p)` : ''}
                </h2>
                
                <div className="print-grid-2">
                  {chunk.map((prob, idx) => {
                    const absoluteIdx = pageIdx * 4 + idx;
                    // 💡 짧은 보기 판정 및 긴 보기 좌측 정렬 처리
                    const isShortOptions = prob.options.every(opt => opt.length < 16) && prob.options.join('').length < 55;

                    return (
                      <div key={idx} className="avoid-break" style={{ width: '100%' }}>
                        <p style={{ fontWeight: 'bold', fontSize: '10.5pt', marginBottom: '8px' }}>
                          {absoluteIdx + 1}. {prob.question}
                        </p>
                        
                        <div style={{ border: '1px solid #000', padding: '12px', marginBottom: '10px', fontSize: '10pt', lineHeight: '1.5', wordBreak: 'keep-all', overflowWrap: 'break-word', width: '100%', boxSizing: 'border-box' }}>
                          {prob.passage}
                        </div>
                        
                        {/* 보기 정렬: 짧으면 2열/가로, 길면 왼쪽 정렬 세로 배치 */}
                        <div style={{
                          display: 'flex',
                          flexDirection: isShortOptions ? 'row' : 'column',
                          flexWrap: isShortOptions ? 'wrap' : 'nowrap',
                          justifyContent: isShortOptions ? 'space-between' : 'flex-start',
                          gap: isShortOptions ? '8px' : '4px',
                          fontSize: '9.5pt',
                          paddingLeft: '2px',
                          textAlign: 'left' // 긴 보기 좌측 정렬 고정
                        }}>
                          {prob.options.map(opt => (
                            <div key={opt} style={{ width: isShortOptions ? '48%' : '100%', textAlign: 'left' }}>{opt}</div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}

            {/* 해설지 (다른 페이지로 분리 및 좌측 정렬) */}
            <div className="print-page-break"></div>
            
            <div style={{ textAlign: 'center', fontSize: '11pt', fontWeight: 'bold', marginBottom: '4px' }}>생각학원</div>
            <h2 style={{ textAlign: 'center', borderBottom: '2px solid black', paddingBottom: '8px', marginBottom: '16px', fontSize: '15pt' }}>
              정답 및 해설 (교사용)
            </h2>
            
            <div className="print-col-2" style={{ textAlign: 'left' }}>
              {generatedProblems.map((prob, idx) => (
                <div key={idx} className="avoid-break" style={{ marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px dashed #ccc', textAlign: 'left' }}>
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