import React, { useEffect, useRef } from 'react';

// The glowing wave from the Media Mode player's visualizer
// (MediaMode/MusicPlayer.jsx runViz), as a standalone canvas for music cards.
// Same synthetic beat model — it follows `playing`, not the audio samples, so
// it works on cross-origin audio without Web Audio/CORS. Settles to a calm
// line when paused. Honors prefers-reduced-motion (draws one still frame).
export default function WaveViz({ playing, active = true, className, hueBase = 195 }) {
  const canvasRef = useRef(null);
  const playingRef = useRef(playing);
  useEffect(() => { playingRef.current = playing; }, [playing]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !active) return undefined; // off-screen cards don't animate
    const ctx2d = canvas.getContext('2d');
    const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    let sBass = 0, sMid = 0, sTreble = 0, sEnergy = 0;
    let hue = hueBase, time = 0, beatPhase = 0, nextBeat = 0, beatPulse = 0, flashPulse = 0;

    const draw = () => {
      if (!still) raf = requestAnimationFrame(draw);
      const W = canvas.offsetWidth || 300;
      const H = canvas.offsetHeight || 80;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (canvas.width !== W * dpr) canvas.width = W * dpr;
      if (canvas.height !== H * dpr) canvas.height = H * dpr;
      ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
      const cy = H / 2;
      const on = playingRef.current;

      time += on ? 0.022 : 0.004;
      beatPhase += on ? 0.022 : 0;
      let bassE = 0, midE = 0, trebleE = 0, overallE = 0;
      if (on) {
        if (time > nextBeat) {
          beatPulse = 0.7 + Math.random() * 0.3;
          flashPulse = beatPulse > 0.85 ? 0.6 : 0;
          nextBeat = time + 0.38 + Math.random() * 0.22;
        }
        beatPulse *= 0.88;
        flashPulse *= 0.75;
        bassE = beatPulse * 0.8 + Math.abs(Math.sin(beatPhase * 1.97)) * 0.2;
        midE = Math.abs(Math.sin(time * 2.3 + 0.8)) * 0.55 + Math.random() * 0.05;
        trebleE = Math.abs(Math.sin(time * 4.1 + 1.5)) * 0.35 + Math.random() * 0.04;
        overallE = bassE * 0.5 + midE * 0.3 + trebleE * 0.2;
      }
      sBass += (bassE - sBass) * 0.1;
      sMid += (midE - sMid) * 0.1;
      sTreble += (trebleE - sTreble) * 0.1;
      sEnergy += (overallE - sEnergy) * 0.1;
      hue += (hueBase - sBass * 155 + sTreble * 30 - hue) * 0.06;

      const sat = 88 + sEnergy * 12;
      const lit = 52 + sEnergy * 18;
      const glowBase = 8 + sBass * 38 + sEnergy * 18;
      const flashBoost = flashPulse * 25;
      ctx2d.clearRect(0, 0, W, H);

      const paintWave = (phaseOff, ampScale, opacity, blur) => {
        ctx2d.beginPath();
        ctx2d.lineWidth = 2;
        ctx2d.strokeStyle = `hsla(${hue}, ${sat}%, ${Math.min(lit + blur * 3, 95)}%, ${opacity})`;
        ctx2d.shadowColor = `hsl(${hue}, ${sat}%, ${lit + 20}%)`;
        ctx2d.shadowBlur = blur + flashBoost;
        const STEPS = Math.min(W, 400);
        const amp = on ? (0.28 + sBass * 0.48 + sMid * 0.18 + sTreble * 0.06) * ampScale : 0.06 * ampScale;
        for (let x = 0; x <= STEPS; x++) {
          const t = x / STEPS;
          const y = cy + amp * cy * (
            Math.sin(t * Math.PI * 4.2 + time * 2.8 + phaseOff) * 0.48 +
            Math.sin(t * Math.PI * 9.7 + time * 1.4 + phaseOff * 1.6) * 0.28 +
            Math.sin(t * Math.PI * 2.1 - time * 0.85 + phaseOff * 0.7) * 0.16 +
            Math.sin(t * Math.PI * 16.3 + time * 3.5 + phaseOff * 2.1) * 0.08
          );
          if (x === 0) ctx2d.moveTo(x * (W / STEPS), y); else ctx2d.lineTo(x * (W / STEPS), y);
        }
        ctx2d.stroke();
      };
      paintWave(0, 1.0, 0.07, glowBase * 4.0);
      paintWave(0, 1.0, 0.15, glowBase * 2.2);
      paintWave(0, 1.0, 0.88, glowBase * 1.0);
      paintWave(Math.PI * 0.38, 0.52, 0.38, glowBase * 0.7);
      paintWave(Math.PI * 0.72, 0.28, 0.22, glowBase * 0.4);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [hueBase, active]);

  return <canvas ref={canvasRef} aria-hidden="true" className={className} />;
}
