import React, { useEffect } from 'react';

export default function ElemManage() {
  
  // 초등부 전용 데이터 로드 함수
  const fetchElementaryData = async () => {
    console.log("구글 시트로부터 초등부 학생 목록 및 진도 가져오는 중...");
  };

  useEffect(() => {
    fetchElementaryData();
  }, []);

  return (
    <div style={{ textAlign: 'left' }}>
      <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#33b864', marginBottom: '16px' }}>
        🧸 초등부 실시간 미션 및 진도 제어
      </h3>
      <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '20px' }}>
        아이들의 오늘 교재 진도를 원격으로 설정하고, 고래단어/문장기차 성적을 모니터링합니다.
      </p>
      
      <div style={{ backgroundColor: '#f8fafc', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
        <p style={{ color: '#94a3b8', fontSize: '14px', textAlign: 'center' }}>
          (여기에 초등부 학생별 오늘 진도 설정 버튼과 테이블이 들어옵니다.)
        </p>
      </div>
    </div>
  );
}