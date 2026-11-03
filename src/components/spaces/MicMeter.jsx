import React, { useEffect, useRef, useState } from 'react';

// Live input level for the mic picker. Uses the published mic track when it is on;
// before the mic was ever published, a short preview capture of the chosen device
// (stopped on unmount). The caller never asks for a preview while a muted mic track
// exists (a second capture can silence the first on iOS / some Android).
export default function MicMeter({ liveTrack, deviceId }) {
  const bar = useRef(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let stream = null; let ctx = null; let raf = 0; let dead = false;
    setFailed(false);
    (async () => {
      try {
        let t = liveTrack;
        if (!t) {
          const audio = deviceId && deviceId !== 'default' ? { deviceId: { exact: deviceId } } : true;
          stream = await navigator.mediaDevices.getUserMedia({ audio });
          if (dead) { stream.getTracks().forEach((x) => x.stop()); return; }
          [t] = stream.getAudioTracks();
        }
        const AC = window.AudioContext || window.webkitAudioContext;
        ctx = new AC();
        if (ctx.state === 'suspended') ctx.resume().catch(() => {});
        const an = ctx.createAnalyser();
        an.fftSize = 512;
        ctx.createMediaStreamSource(new MediaStream([t])).connect(an);
        const buf = new Uint8Array(an.fftSize);
        const loop = () => {
          an.getByteTimeDomainData(buf);
          let peak = 0;
          for (let i = 0; i < buf.length; i += 1) peak = Math.max(peak, Math.abs(buf[i] - 128));
          if (bar.current) bar.current.style.width = `${Math.min(100, Math.round((peak / 64) * 100))}%`;
          raf = requestAnimationFrame(loop);
        };
        loop();
      } catch {
        if (!dead) setFailed(true);
      }
    })();
    return () => {
      dead = true;
      cancelAnimationFrame(raf);
      ctx?.close().catch(() => {});
      stream?.getTracks().forEach((x) => x.stop());
    };
  }, [liveTrack, deviceId]);

  if (failed) return <p className="text-xs text-muted-foreground">Can't test this mic. Check the browser's mic permission.</p>;
  return (
    <div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div ref={bar} className="h-full w-0 rounded-full bg-emerald-400 transition-[width] duration-75" />
      </div>
      <p className="mt-1 text-xs text-muted-foreground">Talk. The bar should move.</p>
    </div>
  );
}
