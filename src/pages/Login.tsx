import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

// 🚀 [추가됨] App.tsx로 성공 신호를 보내주기 위한 장치
interface LoginProps {
  onLoginSuccess?: () => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSignUp = async () => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setMessage(`가입 실패: ${error.message}`);
      setIsSuccess(false);
    } else {
      setMessage('🎉 가입 성공! 이제 로그인해주세요.');
      setIsSuccess(true);
    }
  };

  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setMessage(`로그인 실패: ${error.message}`);
      setIsSuccess(false);
    } else {
      setMessage('✅ 로그인 성공! 환영합니다.');
      setIsSuccess(true);
      
      // 🚀 [추가됨] 로그인 성공 후 1초 뒤에 App.tsx로 신호 보내기!
      if (onLoginSuccess) {
        setTimeout(() => {
          onLoginSuccess();
        }, 1000); 
      }
    }
  };

  return (
    <div style={{ padding: '40px', background: 'white', borderRadius: '24px', textAlign: 'center', width: '360px', margin: '0 auto', boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}>
      <h2 style={{ fontSize: '24px', marginBottom: '24px' }}>고래 영어 로그인</h2>
      <input type="email" placeholder="이메일" value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: '100%', padding: '12px', marginBottom: '12px', borderRadius: '8px', border: '1px solid #ccc', boxSizing: 'border-box' }} />
      <input type="password" placeholder="비밀번호 (6자리 이상)" value={password} onChange={(e) => setPassword(e.target.value)} style={{ width: '100%', padding: '12px', marginBottom: '24px', borderRadius: '8px', border: '1px solid #ccc', boxSizing: 'border-box' }} />
      <button onClick={handleLogin} style={{ width: '100%', padding: '14px', backgroundColor: '#007aff', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', marginBottom: '12px' }}>로그인</button>
      <button onClick={handleSignUp} style={{ width: '100%', padding: '14px', backgroundColor: '#e5e5ea', color: 'black', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>새로 회원가입하기 (테스트용)</button>
      {message && <p style={{ marginTop: '20px', fontWeight: 'bold', color: isSuccess ? '#34c759' : '#ff3b30' }}>{message}</p>}
    </div>
  );
}