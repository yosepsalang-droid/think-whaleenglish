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

export default function MidHome({ student, onNavigate, onLogout }: MidHomeProps) {
  const [currentView, setCurrentView] = useState<'HOME' | 'GRAMMAR'>('HOME');

  // 💡 300개의 정제된 문법 데이터를 담을 상태
  const [grammarQuestions, setGrammarQuestions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // 💡 아이들이 'AI 맞춤 문법'에 들어갈 때 또는 화면이 켜질 때 구글 시트에서 300문장 데이터를 불러옵니다.
  // (만약 다른 컴포넌트에서 이미 데이터를 불러와서 props로 넘겨주는 구조라면 그에 맞게 수정하실 수 있습니다.)
  useEffect(() => {
    const fetchGrammarData = async () => {
      setIsLoading(true);
      try {
        // 🚨 아래의 연동 주소(API URL 또는 구글 시트 연동 주소)를 원장님의 실제 엔드포인트로 맞춰주세요!
        // 예시: const response = await fetch('https://script.google.com/macros/s/your-api-url/exec');
        const response = await fetch('/api/mid-grammar'); // 혹은 원장님 프로젝트의 시트 연동 경로
        
        if (!response.ok) {
          throw new Error('데이터를 불러오는데 실패했습니다.');
        }
        
        const data = await response.json();
        setGrammarQuestions(data);
      } catch (err) {
        console.error('문법 데이터 로딩 에러:', err);
        setLoadError('문법 데이터를 불러오는 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchGrammarData();
  }, []);

  // 'GRAMMAR' 상태일 경우 문법 테스트 컴포넌트 실행
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

    return <MidGrammar questions={grammarQuestions} onBack={() => setCurrentView('HOME')} />;
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