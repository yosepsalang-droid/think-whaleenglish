import React, { useState, useRef, useEffect } from 'react';

interface PhonicsTraceProps {
  onBack: () => void; // 💡 로비로 안전하게 돌아가는 기능 추가
  onComplete: () => void;
}

// 💡 기계음(물결표) 방지: 쉼표(,)로 교체 완료!
const TARGETS = [
  { letter: 'Aa', sound: '에이, 애' },
  { letter: 'Bb', sound: '비, 브' },
  { letter: 'Cc', sound: '씨, 크' },
  { letter: 'Dd', sound: '디, 드' }
];

export default function PhonicsTrace({ onBack, onComplete }: PhonicsTraceProps) {
  const [step, setStep] = useState(0);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const currentTarget = TARGETS[step];

  const speakTeacher = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ko-KR'; 
      utterance.rate = 0.85; 
      utterance.pitch = 1.1; 
      window.speechSynthesis.speak(utterance);
    }
  };

  useEffect(() => {
    if (step < TARGETS.length) {
      setTimeout(() => speakTeacher(TARGETS[step].sound), 500);
      clearCanvas();
    }
  }, [step]);

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    
    if ('touches' in e && e.touches.length > 0) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    } else if ('clientX' in e) {
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }
    return null;
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const coords = getCoordinates(e);
    if (!coords || !canvasRef.current) return;
    
    const ctx = canvasRef.current.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(coords.x, coords.y);
      setIsDrawing(true);
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const coords = getCoordinates(e);
    if (!coords || !canvasRef.current) return;

    const ctx = canvasRef.current.getContext('2d');
    if (ctx) {
      ctx.lineTo(coords.x, coords.y);
      ctx.strokeStyle = '#3b82f6'; 
      ctx.lineWidth = 20; 
      ctx.lineCap = 'round'; 
      ctx.lineJoin = 'round';
      ctx.stroke();
    }
  };

  const stopDrawing = () => setIsDrawing(false);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const handleNext = () => {
    setIsFinished(true); 
    speakTeacher("참 잘했어요!");
    
    setTimeout(() => {
      setIsFinished(false);
      if (step + 1 < TARGETS.length) {
        setStep(prev => prev + 1);
      } else {
        onComplete(); 
      }
    }, 1500);
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: '#eff6ff', display: 'flex', flexDirection: 'column', zIndex: 2000, fontFamily: 'Pretendard, sans-serif' }}>
      
      {/* 💡 안전한 뒤로 가기 버튼 */}
      <div style={{ position: 'absolute', top: '24px', left: '24px', zIndex: 10 }}>
        <button onClick={onBack} style={{ width: '50px', height: '50px', borderRadius: '50%', backgroundColor: 'white', border: 'none', fontSize: '24px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
          ←
        </button>
      </div>

      <div style={{ padding: '30px', textAlign: 'center', marginTop: '20px' }}>
        <div style={{ fontSize: '24px', color: '#3b82f6', fontWeight: '900' }}>Step 2. 마법 스케치북 ✏️</div>
        <div style={{ fontSize: '20px', color: '#475569', marginTop: '10px', fontWeight: 'bold' }}>흐린 글씨를 따라 예쁘게 써보세요!</div>
      </div>

      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
        {isFinished && <div style={{ position: 'absolute', fontSize: '100px', animation: 'bounce 0.5s infinite', zIndex: 50 }}>🌟</div>}

        <div style={{ position: 'relative', width: '600px', height: '400px', backgroundColor: 'white', borderRadius: '32px', boxShadow: '0 20px 40px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '280px', fontWeight: '900', color: '#f1f5f9', userSelect: 'none', fontFamily: '"Comic Sans MS", "Chalkboard SE", sans-serif' }}>
            {currentTarget.letter}
          </div>
          <canvas
            ref={canvasRef} width={600} height={400}
            style={{ position: 'absolute', top: 0, left: 0, cursor: 'crosshair', touchAction: 'none' }}
            onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing}
            onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing}
          />
        </div>
      </div>

      <div style={{ height: '120px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '30px', paddingBottom: '30px' }}>
        <button onClick={clearCanvas} style={{ padding: '16px 40px', fontSize: '24px', fontWeight: 'bold', backgroundColor: '#e2e8f0', color: '#475569', border: 'none', borderRadius: '24px', cursor: 'pointer', boxShadow: '0 8px 0 #cbd5e1' }} onMouseDown={(e) => { e.currentTarget.style.transform = 'translateY(8px)'; e.currentTarget.style.boxShadow = 'none'; }} onMouseUp={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 0 #cbd5e1'; }}>
          지우개 🧼
        </button>
        <button onClick={handleNext} disabled={isFinished} style={{ padding: '16px 60px', fontSize: '24px', fontWeight: '900', backgroundColor: '#22c55e', color: 'white', border: 'none', borderRadius: '24px', cursor: 'pointer', boxShadow: '0 8px 0 #16a34a' }} onMouseDown={(e) => { e.currentTarget.style.transform = 'translateY(8px)'; e.currentTarget.style.boxShadow = 'none'; }} onMouseUp={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 0 #16a34a'; }}>
          다 썼어요! 🚀
        </button>
      </div>
    </div>
  );
}