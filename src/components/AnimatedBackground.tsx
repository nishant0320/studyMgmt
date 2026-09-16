import React from 'react';

export function AnimatedBackground() {
  return (
    <div className="animated-bg" aria-hidden="true">
      <div className="bg-noise" />
      <div className="animated-bg-orb orb-1" />
      <div className="animated-bg-orb orb-2" />
      <div className="animated-bg-orb orb-3" />
      <div className="animated-bg-orb orb-4" />
    </div>
  );
}
