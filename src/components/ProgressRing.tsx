import type React from "react";
import { useEffect, useRef, useState } from "react";

type ProgressRingProps = {
  progress: number;
  size?: number;
  strokeWidth?: number;
  colorFrom?: string;
  colorTo?: string;
  trackColor?: string;
  glow?: boolean;
  animated?: boolean;
  particles?: boolean;
  breathing?: boolean;
  children?: React.ReactNode;
  className?: string;
};

export function ProgressRing({
  progress,
  size = 220,
  strokeWidth = 10,
  colorFrom = "var(--accent)",
  colorTo = "var(--accent)",
  trackColor = "var(--sf-3)",
  glow = false,
  animated = true,
  particles = false,
  breathing = false,
  children,
  className = "",
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(1, progress));
  const target = circumference * (1 - clamped);
  const [offset, setOffset] = useState(animated ? circumference : target);
  const idRef = useRef(`pr-${Math.random().toString(36).slice(2, 8)}`);
  const gradId = idRef.current;

  useEffect(() => {
    if (!animated) {
      setOffset(target);
      return;
    }
    const frame = requestAnimationFrame(() => setOffset(target));
    return () => cancelAnimationFrame(frame);
  }, [animated, target]);

  return (
    <div className={`progress-ring-wrapper ${className} ${breathing ? 'breathe-glow' : ''}`} style={{ width: size, height: size, position: 'relative', borderRadius: '50%' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="progress-ring-svg" style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={colorFrom} />
            <stop offset="100%" stopColor={colorTo} />
          </linearGradient>
          {glow && (
            <filter id={`${gradId}-glow`}>
              <feGaussianBlur stdDeviation="8" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          )}
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: animated ? "stroke-dashoffset 0.8s cubic-bezier(.16,1,.3,1)" : "none" }}
          filter={glow ? `url(#${gradId}-glow)` : undefined}
        />
      </svg>
      {particles && clamped > 0 && (
        <div 
          className="timer-particle" 
          style={{ 
            top: '50%', 
            left: '50%', 
            marginTop: '-2px', 
            marginLeft: '-2px',
            '--orbit-r': `${radius}px`,
            '--orbit-dur': '4s',
            background: colorFrom
          } as React.CSSProperties} 
        />
      )}
      {children && <div className="progress-ring-content" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{children}</div>}
    </div>
  );
}
