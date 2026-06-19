import React, { useEffect } from 'react';

export default function MidManage() {

  // 중등부 전용 데이터 로드 함수
  const fetchMiddleData = async () => {
    console.log("구글 시트로부터 중등부 워드타파 성적 가져오는 중...");
  };

  useEffect(() => {
    fetchMiddleData();
  }, []);

  return (
    <div style={{ textAlign: 'left' }}>
      <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#4f46e5', marginBottom: '16px' }}>
        ✍️ 중등부 워드타파 타자 마스터 관리
      </h3>
      <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '20px' }}>
        중등부 아이들의 워드타파 주관식 타이핑 속도(타수)와 최종 오답 내역을 관제합니다.
      </p>
      
      <div style={{ backgroundColor: '#f8fafc', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
        <p style={{ color: '#94a3b8', fontSize: '14px', textAlign: 'center' }}>
          (여기에 중등부 학생별 타이핑 기록 및 챕터 설정 테이블이 들어옵니다.)
        </p>
      </div>
    </div>
  );
}