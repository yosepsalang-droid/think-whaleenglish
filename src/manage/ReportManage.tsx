import React from 'react';

export default function ReportManage() {
  return (
    <div style={{ textAlign: 'left' }}>
      <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#ea580c', marginBottom: '16px' }}>
        💌 주말 학부모 카톡 결과지 발송 대기실
      </h3>
      <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '20px' }}>
        이번 주 누적된 정답률과 오답 노트를 기반으로 카톡 전송용 모바일 링크를 자동 생성합니다.
      </p>
      
      <div style={{ backgroundColor: '#f8fafc', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
        <p style={{ color: '#94a3b8', fontSize: '14px', textAlign: 'center' }}>
          (여기에 일주일 데이터 요약 및 [카톡 링크 복사] 버튼이 배정됩니다.)
        </p>
      </div>
    </div>
  );
}