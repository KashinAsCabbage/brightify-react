import React, { useEffect, useRef, useMemo } from 'react';
import { gsap } from 'gsap';
import './particles.css';

export default function BackgroundParticles({ theme, animationsEnabled = true, color = '#f59e0b', count = 25, shape = 'leaf' }) {
  const containerRef = useRef(null);

  // Generate CSS particles once if we don't have a theme (Login Mode)
  const cssParticles = useMemo(() => {
    if (theme) return [];
    return Array.from({ length: count }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      animationDuration: `${Math.random() * 7 + 5}s`,
      animationDelay: `-${Math.random() * 10}s`,
      size: `${Math.random() * 15 + 10}px`,
      opacity: Math.random() * 0.6 + 0.2,
    }));
  }, [theme, count]);

  useEffect(() => {
    if (theme === undefined || !animationsEnabled || !containerRef.current) return;

    const particleMap = {
      'default-light': null,
      'classic-dark': null,
      'midnight-grove': { emoji: '🍃', amount: 15, durationMin: 8, durationMax: 12, drift: 50, rotate: 360, yOffset: window.innerHeight + 100 },
      'cherry-blossom': { emoji: '🌸', amount: 20, durationMin: 6, durationMax: 10, drift: 100, rotate: 180, yOffset: window.innerHeight + 100 },
      'snowy-taiga': { emoji: '❄️', amount: 30, durationMin: 4, durationMax: 8, drift: 20, rotate: 0, yOffset: window.innerHeight + 100 },
      'desert-oasis': { emoji: '✨', amount: 15, durationMin: 5, durationMax: 9, drift: 30, rotate: 0, yOffset: -window.innerHeight - 100, upward: true }
    };

    const config = particleMap[theme];
    if (!config) return;

    const container = containerRef.current;
    container.innerHTML = '';

    const particles = [];

    for (let i = 0; i < config.amount; i++) {
        const p = document.createElement('div');
        p.innerText = config.emoji;
        p.style.position = 'absolute';
        p.style.fontSize = `${Math.random() * 10 + 15}px`;
        p.style.opacity = `${Math.random() * 0.5 + 0.3}`;
        p.style.userSelect = 'none';

        if (config.upward) {
            p.style.bottom = '-50px';
        } else {
            p.style.top = '-50px';
        }
        
        p.style.left = `${Math.random() * 100}vw`;

        container.appendChild(p);
        particles.push(p);

        const duration = Math.random() * (config.durationMax - config.durationMin) + config.durationMin;
        
        gsap.to(p, {
            y: config.upward ? -window.innerHeight - 100 : window.innerHeight + 100,
            x: `+=${Math.random() * config.drift * 2 - config.drift}`,
            rotation: config.rotate ? Math.random() * config.rotate : 0,
            duration: duration,
            ease: "none",
            repeat: -1,
            delay: Math.random() * duration
        });
        
        // Add a slight sway for cherry blossoms specifically
        if (theme === 'cherry-blossom') {
            gsap.to(p, {
                x: `+=${Math.random() * 50 + 20}`,
                duration: Math.random() * 2 + 2,
                yoyo: true,
                repeat: -1,
                ease: "power1.inOut",
                delay: Math.random() * 2
            });
        }
    }

    return () => {
        particles.forEach(p => gsap.killTweensOf(p));
        if (container) container.innerHTML = '';
    };

  }, [theme, animationsEnabled]);

  if (!animationsEnabled) return null;

  if (theme === undefined) {
    return (
      <div className="particles-container">
        {cssParticles.map((p) => (
          <div
            key={p.id}
            className={`particle ${shape}`}
            style={{
              left: p.left,
              width: p.size,
              height: p.size,
              backgroundColor: color,
              animationDuration: p.animationDuration,
              animationDelay: p.animationDelay,
              opacity: p.opacity,
              boxShadow: `0 0 10px ${color}80`
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: -1,
        pointerEvents: 'none',
        overflow: 'hidden'
      }}
    />
  );
}
