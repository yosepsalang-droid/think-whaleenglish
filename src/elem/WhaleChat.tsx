import React, { useState, useRef, useEffect } from 'react';

// API 키 없이 테스트할 수 있는 시뮬레이션 모드
const IS_TEST_MODE = true; 

interface WhaleChatProps {
  onBack: () => void;
}

export default function WhaleChat({ onBack }: WhaleChatProps) {
  const [messages, setMessages] = useState<{ sender: 'user' | 'whale', text: string }[]>([
    { sender: 'whale', text: "Hello! I'm your AI English friend, Whale. Let's talk! (안녕! 난 너의 AI 영어 친구 고래야.)" }
  ]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const speakWhale = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const englishPart = text.split('(')[0].trim();
      const utterance = new SpeechSynthesisUtterance(englishPart);
      utterance.lang = 'en-US';
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || messages.length >= 20) return; // 총 20개 메시지(10문장) 제한

    const userText = input;
    setMessages(prev => [...prev, { sender: 'user', text: userText }]);
    setInput('');

    // 시뮬레이션 대답
    setTimeout(() => {
      const mockReplies = [
        "Hello! I'm Whale. What's your name? (안녕! 난 고래야. 너 이름이 뭐야?)",
        "Nice to meet you! How old are you? (만나서 반가워! 몇 살이니?)",
        "Wow, that's a great age! Do you like learning English? (우와, 멋진 나이네! 영어 배우는 거 좋아하니?)",
        "That's interesting! Tell me more. (흥미롭네! 더 이야기해줘.)",
        "I love English too! Let's practice. (나도 영어가 좋아! 같이 연습하자.)",
        "Can you say that again in a different way? (다른 방식으로 다시 말해줄래?)"
      ];
      const reply = mockReplies[Math.floor(Math.random() * mockReplies.length)];
      setMessages(prev => [...prev, { sender: 'whale', text: reply }]);
      speakWhale(reply);
    }, 800);
  };

  return (
    <div style={{ fontFamily: 'Pretendard, sans-serif', padding: '20px', maxWidth: '500px', margin: '0 auto', height: '90vh', display: 'flex', flexDirection: 'column' }}>
      <button onClick={onBack} style={{ marginBottom: '16px' }}>← 홈으로</button>
      <div style={{ flex: 1, backgroundColor: '#f0f4f8', borderRadius: '16px', padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {messages.map((msg, idx) => (
          <div key={idx} style={{ display: 'flex', justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{ padding: '12px 16px', borderRadius: '16px', backgroundColor: msg.sender === 'user' ? '#007aff' : 'white', color: msg.sender === 'user' ? 'white' : '#333' }}>
              {msg.text}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSend} style={{ marginTop: '16px', display: 'flex' }}>
        <input value={input} onChange={(e) => setInput(e.target.value)} style={{ flex: 1, padding: '12px' }} />
        <button type="submit">전송</button>
      </form>
    </div>
  );
}