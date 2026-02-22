import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';

interface Props {
  onComplete: () => void;
}

export default function FocusSuccessAnimation({ onComplete }: Props) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onComplete();
    }, 1500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center pointer-events-none">
      <div className="relative">
        {/* Particle burst */}
        {[...Array(8)].map((_, i) => (
          <span
            key={i}
            className="absolute w-2 h-2 rounded-full bg-[#22c55e]"
            style={{
              animation: `focus-particle 0.8s ease-out forwards`,
              animationDelay: `${i * 0.05}s`,
              transform: `rotate(${i * 45}deg) translateY(-20px)`,
              opacity: 0,
            }}
          />
        ))}
        {/* Checkmark */}
        <div
          className="w-24 h-24 rounded-full bg-[#22c55e] flex items-center justify-center"
          style={{ animation: 'focus-check-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' }}
        >
          <Check className="h-12 w-12 text-white" strokeWidth={3} />
        </div>
      </div>

      <style>{`
        @keyframes focus-check-in {
          0% { transform: scale(0); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes focus-particle {
          0% { transform: rotate(inherit) translateY(-20px); opacity: 1; }
          100% { transform: rotate(inherit) translateY(-60px); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
