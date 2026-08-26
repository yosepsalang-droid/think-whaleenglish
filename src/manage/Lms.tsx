import React, { useState } from 'react';
import ElemManage from './ElemManage';
import MidManage from './MidManage';
import ReportManage from './ReportManage';
import LmsAiStudio from './LmsAiStudio';

interface LmsProps {
  onBack: () => void;
}

export default function Lms({ onBack }: LmsProps) {
  const [activeTab, setActiveTab] = useState<'elementary' | 'middle' | 'report'>('elementary');
  const [showAiStudio, setShowAiStudio] = useState(false);

  if (showAiStudio) {
    return <LmsAiStudio onBack={() => setShowAiStudio(false)} />;
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#f0f4f8', padding: '20px', fontFamily: 'Pretendard, sans-serif' }}>
      <div style={{ background: 'white', padding: '40px', borderRadius: '24px', width: '800px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', position: 'relative' }}>
        
        {/* 뒤로가기 버튼 */}
        <button onClick={onBack} style={{ position: 'absolute', top: '24px', left: '24px', background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#333' }}>
          ◀ 메인으로
        </button>

        <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#1e293b', margin: '20px 0 30px 0', textAlign: 'center' }}>
          👑 ACADEMY CONTROL TOWER (통합 관제탑)
        </h2>

        <button
          onClick={() => setShowAiStudio(true)}
          style={{
            display: 'block',
            width: '100%',
            marginBottom: '20px',
            padding: '14px 16px',
            border: 'none',
            borderRadius: '12px',
            backgroundColor: '#1e293b',
            color: 'white',
            fontSize: '15px',
            fontWeight: 800,
            cursor: 'pointer',
          }}
        >
          🤖 AI 문제 연구소
        </button>

        {/* 탭 네비게이션 바 */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '30px', backgroundColor: '#f1f5f9', padding: '6px', borderRadius: '14px' }}>
          <button 
            onClick={() => setActiveTab('elementary')}
            style={{ flex: 1, padding: '12px', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', backgroundColor: activeTab === 'elementary' ? 'white' : 'transparent', color: activeTab === 'elementary' ? '#33b864' : '#64748b', boxShadow: activeTab === 'elementary' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none', transition: 'all 0.2s' }}
          >
            🧸 초등부 관리
          </button>
          
          <button 
            onClick={() => setActiveTab('middle')}
            style={{ flex: 1, padding: '12px', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', backgroundColor: activeTab === 'middle' ? 'white' : 'transparent', color: activeTab === 'middle' ? '#4f46e5' : '#64748b', boxShadow: activeTab === 'middle' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none', transition: 'all 0.2s' }}
          >
            ✍️ 중등부 관리
          </button>
          
          <button 
            onClick={() => setActiveTab('report')}
            style={{ flex: 1, padding: '12px', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', backgroundColor: activeTab === 'report' ? 'white' : 'transparent', color: activeTab === 'report' ? '#ea580c' : '#64748b', boxShadow: activeTab === 'report' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none', transition: 'all 0.2s' }}
          >
            💌 주말 리포트
          </button>
        </div>

        {/* 💡 분리된 개별 서브 파일들을 조건부로 조립합니다. */}
        <div style={{ minHeight: '300px', padding: '10px' }}>
          {activeTab === 'elementary' && <ElemManage />}
          {activeTab === 'middle' && <MidManage />}
          {activeTab === 'report' && <ReportManage />}
        </div>

      </div>
    </div>
  );
}