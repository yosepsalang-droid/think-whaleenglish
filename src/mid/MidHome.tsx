import React, { useState, useEffect } from 'react';
import MidGrammar from './MidGrammar'; 

interface Student {
  id: string;
  name: string;
  grade: string;
  currentBook: string;
  progress: string;
}

interface MidHomeProps {
  student: Student;
  onNavigate: (menu: string) => void;
  onLogout: () => void;
}

// 💡 CSV 텍스트 변환 함수 (타입 에러 수정 완료)
const parseCSV = (csvText: string) => {
  const lines = csvText.split(/\r?\n/);
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim());
  const result: any[] = []; // 💡 result에도 명시적으로 타입을 지정했습니다.

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    const row: string[] = []; // 💡 핵심 수정: 문자열만 들어가는 배열이라고 명찰(string[])을 달아주었습니다!
    let inQuotes = false;
    let currentValue = "";
    
    for (let char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        row.push(currentValue);
        currentValue = "";
      } else {
        currentValue += char;
      }
    }
    row.push(currentValue);

    const obj: any = {};
    headers.forEach((header, index) => {
      let val = row[index] ? row[index].trim() : "";
      if (val.startsWith('"') && val.endsWith('"')) {
        val = val.substring(1, val.length - 1);
      }
      obj[header] = val;
    });
    result.push(obj);
  }
  return result;
};

export default function MidHome({ student, onNavigate, onLogout }: MidHomeProps) {
  const [currentView, setCurrentView] = useState<'HOME' | 'GRAMMAR'>('HOME');

  const [grammarQuestions, setGrammarQuestions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGrammarData = async () => {
      setIsLoading(true);
      try {
        const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTA4Z1o77LMkO66syR0SmqmWPu6q5NapogmBA2iOxpd379nYZ4Gu7y9h7KmGTVb9H9WXNfM5EnFlBxe/pub?gid=36839762&single=true&output=csv';
        const response = await fetch(CSV_URL);
        
        if (!response.ok) {
          throw new Error('데이터를 불러오는데 실패했습니다.');
        }
        
        const csvText = await response.text();
        const parsedData = parseCSV(csvText);
        
        setGrammarQuestions(parsedData);
      } catch (err) {
        console.error('문법 데이터 로딩 에러:', err);
        setLoadError('문법 데이터를 불러오는 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchGrammarData();
  }, []);

  if (currentView === 'GRAMMAR') {
    if (isLoading) {
      return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'Pretendard, sans-serif' }}>
          <p style={{ fontSize: '18px', fontWeight: '700', color: '#007aff' }}>🧠 300문장 맞춤 학습 데이터를 불러오는 중입니다...</p>
        </div>
      );
    }

    if (loadError) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'Pretendard, sans-serif', padding: '20px' }}>
          <p style={{ fontSize: '16px', color: '#ff3b30', marginBottom: '16px', fontWeight: '700' }}>{loadError}</p>
          <button 
            onClick={() => setCurrentView('HOME')}
            style={{ backgroundColor: '#007aff', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '10px', fontWeight: '700', cursor: 'pointer' }}
          >
            홈으로 돌아가기
          </button>
        </div>
      );
    }

    return <MidGrammar onBack={() => setView('home')} />;
  }

  return (
    <div style={{ backgroundColor: '#f9f9f9', minHeight: '100vh', padding: '20px', fontFamily: 'Pretendard, sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>
        
        {/* 상단 프로필 및 로그아웃 */}
        <div style={{ background: 'white', padding: '20px', borderRadius: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', marginBottom: '16px' }}>
          <div>
            <span style={{ color: '#007aff', fontWeight: '700', fontSize: '14px' }}>{student.grade} 🐋</span>
            <h2 style={{ margin: '4px 0 0', fontSize: '22px', fontWeight: '800' }}>{student.name} 학생</h2>
          </div>
          <button onClick={onLogout} style={{ backgroundColor: '#ff3b30', color: 'white', border: 'none', padding: '8px 14px', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', fontSize: '14px' }}>
            로그아웃
          </button>
        </div>

        {/* 미션 현황 카드 */}
        <div style={{ background: 'linear-gradient(135deg, #007aff, #0056b3)', padding: '24px', borderRadius: '20px', color: 'white', textAlign: 'center', boxShadow: '0 6px 20px rgba(0,122,255,0.15)', marginBottom: '24px' }}>
          <p style={{ margin: '0 0 8px', fontSize: '12px', fontWeight: '700', opacity: 0.9, letterSpacing: '1px' }}>TODAY'S MISSION 📖</p>
          <h3 style={{ margin: '0 0 16px', fontSize: '24px', fontWeight: '800' }}>교재: {student.currentBook || '워드타파'}</h3>
          <div style={{ display: 'inline-block', backgroundColor: 'rgba(255,255,255,0.15)', padding: '6px 16px', borderRadius: '20px', fontSize: '14px', fontWeight: '700' }}>
            🎯 추천 진도: {student.progress || '1'}
          </div>
        </div>

        <h4 style={{ textAlign: 'center', fontSize: '18px', fontWeight: '700', color: '#333', marginBottom: '16px' }}>오늘의 학습 메뉴</h4>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div onClick={() => onNavigate('voca')} style={{ background: 'white', padding: '16px', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.02)', cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '120px', border: '1px solid #e0f2fe' }}>
            <div>
              <span style={{ fontSize: '16px', fontWeight: '700' }}>📝 단어 Test</span>
              <p style={{ margin: '6px 0 0', fontSize: '11px', color: '#8e8e93', lineHeight: '1.4' }}>오늘의 필수 어휘 마스터하기</p>
            </div>
            <span style={{ fontSize: '12px', color: '#007aff', fontWeight: '700', textAlign: 'right' }}>입장하기 →</span>
          </div>

          <div onClick={() => onNavigate('midSen')} style={{ background: 'white', padding: '16px', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.02)', cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '120px', border: '1px solid #e0f2fe' }}>
            <div>
              <span style={{ fontSize: '16px', fontWeight: '700' }}>🧩 문장 배열</span>
              <p style={{ margin: '6px 0 0', fontSize: '11px', color: '#8e8e93', lineHeight: '1.4' }}>어순 감각을 키우는 덩어리 학습</p>
            </div>
            <span style={{ fontSize: '12px', color: '#007aff', fontWeight: '700', textAlign: 'right' }}>입장하기 →</span>
          </div>

          <div onClick={() => onNavigate('verbTest')} style={{ background: 'white', padding: '16px', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.02)', cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '120px', border: '1px solid #e0f2fe' }}>
            <div>
              <span style={{ fontSize: '16px', fontWeight: '700' }}>🔥 동사 3단 변화</span>
              <p style={{ margin: '6px 0 0', fontSize: '11px', color: '#8e8e93', lineHeight: '1.4' }}>불규칙 동사 완벽 마스터하기</p>
            </div>
            <span style={{ fontSize: '12px', color: '#007aff', fontWeight: '700', textAlign: 'right' }}>입장하기 →</span>
          </div>

          <div onClick={() => setCurrentView('GRAMMAR')} style={{ background: 'white', padding: '16px', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,122,255,0.1)', cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '120px', border: '2px solid #007aff' }}>
            <div>
              <span style={{ fontSize: '16px', fontWeight: '800', color: '#007aff' }}>🧠 AI 맞춤 문법</span>
              <p style={{ margin: '6px 0 0', fontSize: '11px', color: '#8e8e93', lineHeight: '1.4' }}>틀린 유형까지 완벽하게 마스터</p>
            </div>
            <span style={{ fontSize: '12px', color: '#007aff', fontWeight: '700', textAlign: 'right' }}>입장하기 →</span>
          </div>
        </div>

      </div>
    </div>
  );
}