import React, { useState, useRef, useEffect } from 'react';
import { PHONICS_DB } from './PhonicsData';

interface PhonicsTraceProps {
  day: number;
  onBack: () => void; 
  onComplete: () => void;
}

export default function PhonicsTrace({ day, onBack, onComplete }: PhonicsTraceProps) {
  const dayWords = PHONICS_DB.filter((item: any) => item.day === day);
  const targets = Array.from(new Set(dayWords.map(w => w.letter)));

  const [step, setStep] = useState(0);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  
  const [strokeLength, setStrokeLength] = useState(0);
  const [bounds, setBounds] = useState({ minX: 9999, maxX: 0, minY: 9999, maxY: 0 });
  const lastPosRef = useRef<{x: number, y: number} | null>(null);
  
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const currentLetter = targets[step];

  const speakTeacher = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US'; 
      utterance.rate = 0.85; 
      window.speechSynthesis.speak(utterance);
    }
  };

  useEffect(() => {
    if (step < targets.length) {
      setTimeout(() => speakTeacher(targets[step]), 500);
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
      return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top };
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
      lastPosRef.current = coords; 
      
      setBounds(prev => ({
        minX: Math.min(prev.minX, coords.x),
        maxX: Math.max(prev.maxX, coords.x),
        minY: Math.min(prev.minY, coords.y),
        maxY: Math.max(prev.maxY, coords.y)
      }));
      
      setIsDrawing(true);
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const coords = getCoordinates(e);
    if (!coords || !canvasRef.current) return;

    if (lastPosRef.current) {
      const dx = coords.x - lastPosRef.current.x;
      const dy = coords.y - lastPosRef.current.y;
      setStrokeLength(prev => prev + Math.sqrt(dx * dx + dy * dy));
    }
    lastPosRef.current = coords;

    setBounds(prev => ({
      minX: Math.min(prev.minX, coords.x),
      maxX: Math.max(prev.maxX, coords.x),
      minY: Math.min(prev.minY, coords.y),
      maxY: Math.max(prev.maxY, coords.y)
    }));

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

  const stopDrawing = () => {
    setIsDrawing(false);
    lastPosRef.current = null;
  };

  const clearCanvas = () => {
    // 💡 화면의 선만 지우는 게 아니라, 메모리에 누적된 거리/면적 기록도 무조건 0으로 폭파!
    setStrokeLength(0); 
    setBounds({ minX: 9999, maxX: 0, minY: 9999, maxY: 0 }); 

    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.beginPath(); // 💡 캔버스 내부의 보이지 않는 선 찌꺼기까지 완벽 차단
      }
    }
  };

  const handleNext = () => {
    const width = bounds.maxX === 0 ? 0 : bounds.maxX - bounds.minX;
    const height = bounds.maxY === 0 ? 0 : bounds.maxY - bounds.minY;

    if (strokeLength < 800 || width < 100 || height < 100) {
      alert("알파벳을 너무 작게 쓰거나 대충 쓴 것 같아요! ✏️\n빈칸을 가득 채워서 다시 예쁘게 써주세요!");
      return;
    }

    setIsFinished(true); 
    
    // 💡 [핵심 버그 수정] 통과 판정이 나는 즉시, 상태값을 0으로 싹 비워버립니다. 
    // 이렇게 해야 2번째, 3번째 글자로 이전 기록이 넘어가지 않습니다!
    setStrokeLength(0);
    setBounds({ minX: 9999, maxX: 0, minY: 9999, maxY: 0 });

    setTimeout(() => {
      setIsFinished(false);
      clearCanvas(); // 혹시나 해서 한 번 더 지우기
      
      if (step + 1 < targets.length) {
        setStep(prev => prev + 1);
      } else {
        onComplete(); 
      }
    }, 1500);
  };

  if (!currentLetter) return null;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: '#eff6ff', display: 'flex', flexDirection: 'column', zIndex: 2000, fontFamily: 'Pretendard, sans-serif' }}>
      
      <div style={{ position: 'absolute', top: '24px', left: '24px', zIndex: 10 }}>
        <button onClick={onBack} style={{ width: '50px', height: '50px', borderRadius: '50%', backgroundColor: 'white', border: 'none', fontSize: '24px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>←</button>
      </div>

      <div style={{ padding: '30px', textAlign: 'center', marginTop: '20px' }}>
        <div style={{ fontSize: '24px', color: '#3b82f6', fontWeight: '900' }}>Step 2. 마법 스케치북 ✏️</div>
        <div style={{ fontSize: '20px', color: '#475569', marginTop: '10px', fontWeight: 'bold' }}>흐린 글씨를 넓고 꼼꼼하게 채워 써보세요!</div>
      </div>

      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
        {isFinished && <div style={{ position: 'absolute', fontSize: '100px', animation: 'bounce 0.5s infinite', zIndex: 50 }}>🌟</div>}

        <div style={{ position: 'relative', width: '600px', height: '400px', backgroundColor: 'white', borderRadius: '32px', boxShadow: '0 20px 40px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '280px', fontWeight: '900', color: '#f1f5f9', userSelect: 'none', fontFamily: '"Comic Sans MS", "Chalkboard SE", sans-serif' }}>
            {currentLetter}
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