import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface WrongAnswerRow {
  id: number;
  student_id: string;
  question_id: number;
  student_input: string;
  is_resolved: boolean;
  created_at: string;
  // 조인된 정보
  student_name?: string;
  student_grade?: string;
  question?: string;
  answer?: string;
  grammar_tag?: string;
  publisher?: string;
  lesson?: string;
}

export default function WrongAnswerReport({ onBack }: { onBack?: () => void }) {
  const [records, setRecords] = useState<WrongAnswerRow[]>([]);
  const [loading, setLoading] = useState(true);

  // 필터 상태
  const [selectedStudent, setSelectedStudent] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'UNRESOLVED' | 'ALL' | 'RESOLVED'>('UNRESOLVED');

  const fetchWrongAnswers = async () => {
    setLoading(true);
    try {
      // 외래키 설정 여부와 무관하게 안전하게 3개 테이블을 각각 불러와 매칭합니다.
      const [wrongRes, studentRes, questionRes] = await Promise.all([
        supabase.from('wrong_answers').select('*').order('created_at', { ascending: false }).limit(500),
        supabase.from('students').select('*'),
        supabase.from('middle_questions').select('*')
      ]);

      if (wrongRes.error) throw wrongRes.error;

      const studentMap = new Map();
      (studentRes.data || []).forEach((s: any) => {
        studentMap.set(s.student_id || s.id, s);
      });

      const questionMap = new Map();
      (questionRes.data || []).forEach((q: any) => {
        questionMap.set(q.id, q);
      });

      const merged: WrongAnswerRow[] = (wrongRes.data || []).map((w: any) => {
        const st = studentMap.get(w.student_id);
        const q = questionMap.get(w.question_id);
        return {
          ...w,
          student_name: st?.name || w.student_id,
          student_grade: st?.grade || '-',
          question: q?.question || '(삭제된 문제)',
          answer: q?.answer || '-',
          grammar_tag: q?.grammar_tag || '미분류',
          publisher: q?.publisher || '',
          lesson: q?.lesson || ''
        };
      });

      setRecords(merged);
    } catch (err: any) {
      console.error('오답 데이터 로드 실패:', err);
      alert('오답 데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWrongAnswers();
  }, []);

  // 지도 완료(해결) 상태 토글
  const toggleResolve = async (id: number, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('wrong_answers')
        .update({ is_resolved: !currentStatus })
        .eq('id', id);

      if (error) throw error;

      setRecords(prev =>
        prev.map(r => (r.id === id ? { ...r, is_resolved: !currentStatus } : r))
      );
    } catch (err) {
      alert('상태 변경에 실패했습니다.');
    }
  };

  // 학생 목록 추출 (중복 제거)
  const studentList = Array.from(
    new Map(records.map(r => [r.student_id, { id: r.student_id, name: r.student_name, grade: r.student_grade }])).values()
  );

  // 필터 적용
  const filteredRecords = records.filter(r => {
    if (selectedStudent !== 'ALL' && r.student_id !== selectedStudent) return false;
    if (statusFilter === 'UNRESOLVED' && r.is_resolved) return false;
    if (statusFilter === 'RESOLVED' && !r.is_resolved) return false;
    return true;
  });

  // 취약 문법 태그 TOP 3 계산
  const tagCounts: Record<string, number> = {};
  filteredRecords.forEach(r => {
    const tag = r.grammar_tag || '미분류';
    tagCounts[tag] = (tagCounts[tag] || 0) + 1;
  });
  const topWeakTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  const unresolvedCount = records.filter(r => !r.is_resolved).length;

  return (
    <div style={{ backgroundColor: '#f4f6f8', minHeight: '100vh', padding: '24px', fontFamily: 'Pretendard, sans-serif' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* 상단 헤더 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {onBack && (
              <button onClick={onBack} style={{ border: 'none', background: 'white', padding: '10px 16px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', color: '#475569', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                ← 뒤로
              </button>
            )}
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '900', color: '#1e293b' }}>📊 오답 분석 관제탑</h1>
          </div>
          <button onClick={fetchWrongAnswers} style={{ padding: '10px 18px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}>
            🔄 새로고침
          </button>
        </div>

        {/* 요약 카드 3종 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
          <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '16px', boxShadow: '0 4px 6px rgba(0,0,0,0.04)' }}>
            <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 'bold', marginBottom: '8px' }}>누적 오답 건수</div>
            <div style={{ fontSize: '28px', fontWeight: '900', color: '#1e293b' }}>{records.length}건</div>
          </div>
          <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '16px', boxShadow: '0 4px 6px rgba(0,0,0,0.04)' }}>
            <div style={{ fontSize: '13px', color: '#ef4444', fontWeight: 'bold', marginBottom: '8px' }}>🚨 미해결 오답 (지도 필요)</div>
            <div style={{ fontSize: '28px', fontWeight: '900', color: '#ef4444' }}>{unresolvedCount}건</div>
          </div>
          <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '16px', boxShadow: '0 4px 6px rgba(0,0,0,0.04)' }}>
            <div style={{ fontSize: '13px', color: '#8b5cf6', fontWeight: 'bold', marginBottom: '8px' }}>🔥 취약 문법 TOP 3</div>
            {topWeakTags.length === 0 ? (
              <div style={{ fontSize: '14px', color: '#94a3b8', marginTop: '8px' }}>데이터 없음</div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {topWeakTags.map(([tag, count], idx) => (
                  <span key={tag} style={{ fontSize: '12px', fontWeight: 'bold', padding: '4px 10px', borderRadius: '20px', backgroundColor: idx === 0 ? '#fee2e2' : '#f3e8ff', color: idx === 0 ? '#dc2626' : '#7e22ce' }}>
                    {idx + 1}. {tag} ({count})
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 필터 바 */}
        <div style={{ backgroundColor: 'white', padding: '16px 20px', borderRadius: '16px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#475569' }}>학생 선택:</span>
            <select
              value={selectedStudent}
              onChange={e => setSelectedStudent(e.target.value)}
              style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 'bold', fontSize: '14px' }}
            >
              <option value="ALL">전체 학생 ({records.length}건)</option>
              {studentList.map(st => (
                <option key={st.id} value={st.id}>
                  {st.name} ({st.grade})
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            {(['UNRESOLVED', 'ALL', 'RESOLVED'] as const).map(status => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                style={{
                  padding: '8px 14px',
                  borderRadius: '8px',
                  border: 'none',
                  fontWeight: 'bold',
                  fontSize: '13px',
                  cursor: 'pointer',
                  backgroundColor: statusFilter === status ? '#1e293b' : '#f1f5f9',
                  color: statusFilter === status ? 'white' : '#64748b'
                }}
              >
                {status === 'UNRESOLVED' ? '미해결만 보기' : status === 'RESOLVED' ? '지도 완료만' : '전체 보기'}
              </button>
            ))}
          </div>
        </div>

        {/* 오답 리스트 */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px', color: '#64748b', fontWeight: 'bold' }}>⏳ 오답 데이터를 분석하는 중...</div>
        ) : filteredRecords.length === 0 ? (
          <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '80px', textAlign: 'center', color: '#94a3b8', fontWeight: 'bold' }}>
            표시할 오답 기록이 없습니다! 🎉
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filteredRecords.map(item => (
              <div
                key={item.id}
                style={{
                  backgroundColor: 'white',
                  padding: '20px',
                  borderRadius: '16px',
                  borderLeft: `6px solid ${item.is_resolved ? '#10b981' : '#ef4444'}`,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                  opacity: item.is_resolved ? 0.7 : 1
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: '900', fontSize: '16px', color: '#0f172a' }}>{item.student_name}</span>
                    <span style={{ fontSize: '12px', color: '#64748b', backgroundColor: '#f1f5f9', padding: '3px 8px', borderRadius: '6px', fontWeight: 'bold' }}>
                      {item.student_grade}
                    </span>
                    <span style={{ fontSize: '12px', color: '#2563eb', backgroundColor: '#eff6ff', padding: '3px 8px', borderRadius: '6px', fontWeight: 'bold' }}>
                      {item.publisher} {item.lesson} | {item.grammar_tag}
                    </span>
                    <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                      {new Date(item.created_at).toLocaleString()}
                    </span>
                  </div>

                  <button
                    onClick={() => toggleResolve(item.id, item.is_resolved)}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '8px',
                      border: 'none',
                      fontWeight: 'bold',
                      fontSize: '13px',
                      cursor: 'pointer',
                      backgroundColor: item.is_resolved ? '#e2e8f0' : '#10b981',
                      color: item.is_resolved ? '#475569' : 'white'
                    }}
                  >
                    {item.is_resolved ? '↩️ 미해결로 되돌리기' : '✅ 지도 완료 처리'}
                  </button>
                </div>

                <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#1e293b', marginBottom: '12px' }}>
                  Q. {item.question}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div style={{ backgroundColor: '#fef2f2', padding: '12px', borderRadius: '10px', border: '1px solid #fecaca' }}>
                    <div style={{ fontSize: '12px', color: '#dc2626', fontWeight: 'bold', marginBottom: '4px' }}>❌ 학생이 입력한 오답</div>
                    <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#991b1b', fontFamily: 'Consolas, monospace' }}>
                      {item.student_input}
                    </div>
                  </div>
                  <div style={{ backgroundColor: '#f0fdf4', padding: '12px', borderRadius: '10px', border: '1px solid #bbf7d0' }}>
                    <div style={{ fontSize: '12px', color: '#16a34a', fontWeight: 'bold', marginBottom: '4px' }}>⭕ 올바른 정답</div>
                    <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#166534', fontFamily: 'Consolas, monospace' }}>
                      {item.answer}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}