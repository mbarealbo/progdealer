import { useEffect, useMemo, useRef, useState } from 'react';
import { MapPin, LocateFixed } from 'lucide-react';
import { Event } from '../../types/event';
import { coordsForEvent, haversineKm } from '../../utils/coords';

type Located = { event: Event; dist: number; brng: number; lat: number; lng: number };

const dayFmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit' });

// Initial bearing from point a to b, radians clockwise from north.
function bearing(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const y = Math.sin(dLng) * Math.cos(la2);
  const x = Math.cos(la1) * Math.sin(la2) - Math.sin(la1) * Math.cos(la2) * Math.cos(dLng);
  return Math.atan2(y, x);
}

function fmtKm(km: number): string {
  if (km < 10) return km.toFixed(1);
  return Math.round(km).toLocaleString('en-US');
}

export default function NearYou({ events, onSelect }: { events: Event[]; onSelect: (e: Event) => void }) {
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [status, setStatus] = useState<'idle' | 'locating' | 'denied' | 'ready'>('idle');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const located = useMemo<Located[]>(() => {
    if (!userLoc) return [];
    const out: Located[] = [];
    for (const e of events) {
      const c = coordsForEvent(e);
      if (!c) continue;
      out.push({ event: e, dist: haversineKm(userLoc, c), brng: bearing(userLoc, c), lat: c.lat, lng: c.lng });
    }
    return out.sort((a, b) => a.dist - b.dist);
  }, [userLoc, events]);

  const requestLocation = () => {
    if (!navigator.geolocation) { setStatus('denied'); return; }
    setStatus('locating');
    navigator.geolocation.getCurrentPosition(
      (pos) => { setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setStatus('ready'); },
      () => setStatus('denied'),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  };

  const radarSet = located.slice(0, 10);
  const maxDist = radarSet.length ? Math.max(...radarSet.map((r) => r.dist), 1) : 1;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || status !== 'ready') return;
    const draw = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = parent.clientWidth - 36;
      const h = Math.max(canvas.clientHeight, 240);
      canvas.width = w * dpr; canvas.height = h * dpr;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const cx = w / 2, cy = h / 2;
      const maxR = Math.min(w, h) / 2 - 24;

      // rings at 1/3, 2/3, 3/3 of the farthest shown pin
      ctx.strokeStyle = '#E7E5E2'; ctx.lineWidth = 1;
      ctx.fillStyle = '#B7B9BE'; ctx.font = '10px ui-monospace, Menlo, monospace';
      [1 / 3, 2 / 3, 1].forEach((f) => {
        const r = f * maxR;
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
        ctx.fillText(`${fmtKm(maxDist * f)}km`, cx + 3, cy - r + 12);
      });
      ctx.strokeStyle = '#F0EEEB';
      ctx.beginPath(); ctx.moveTo(cx - maxR, cy); ctx.lineTo(cx + maxR, cy); ctx.moveTo(cx, cy - maxR); ctx.lineTo(cx, cy + maxR); ctx.stroke();

      // pins by bearing + distance
      radarSet.forEach((p, idx) => {
        const r = (p.dist / maxDist) * maxR;
        const x = cx + Math.sin(p.brng) * r;
        const y = cy - Math.cos(p.brng) * r;
        ctx.beginPath(); ctx.arc(x, y, 5.5, 0, Math.PI * 2);
        ctx.fillStyle = '#E1341E'; ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.6; ctx.stroke();
        if (idx < 3) {
          ctx.fillStyle = '#5C5F66'; ctx.font = '600 10px -apple-system, Segoe UI, sans-serif';
          ctx.fillText(p.event.città.split(',')[0], x + 9, y + 3);
        }
      });
      // you
      ctx.beginPath(); ctx.arc(cx, cy, 6.5, 0, Math.PI * 2);
      ctx.fillStyle = '#191A1D'; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
    };
    draw();
    window.addEventListener('resize', draw);
    return () => window.removeEventListener('resize', draw);
  }, [status, radarSet, maxDist]);

  return (
    <section className="block" id="near">
      <div className="wrap">
        <div className="head">
          <div>
            <div className="eyebrow">Personalised · your location stays on your device</div>
            <h2>Happening near you</h2>
          </div>
          {status === 'ready' && (
            <button className="btn btn-ghost" onClick={requestLocation}><LocateFixed size={15} /> Update location</button>
          )}
        </div>

        {status !== 'ready' ? (
          <div className="near-prompt">
            <span className="pin"><MapPin size={22} /></span>
            <p>
              {status === 'denied'
                ? "Couldn't read your location. Check the browser's location permission and try again."
                : 'See the shows closest to you, sorted by distance. We only use your location in the browser — nothing is stored.'}
            </p>
            <button className="btn btn-accent" onClick={requestLocation} disabled={status === 'locating'}>
              {status === 'locating' ? <><span className="spin" /> Locating…</> : <><LocateFixed size={16} /> Use my location</>}
            </button>
          </div>
        ) : (
          <div className="near">
            <div className="radar-card">
              <div className="radar-top">
                <span className="label">Nearest {radarSet.length} · within {fmtKm(maxDist)} km</span>
                <span className="label">{located.length} located</span>
              </div>
              <canvas className="radar-canvas" ref={canvasRef} aria-label="Map of shows around your location" />
              <div className="radar-legend">
                <span><i style={{ background: '#191A1D' }} />You</span>
                <span><i style={{ background: '#E1341E' }} />Upcoming show</span>
              </div>
            </div>

            <div className="nearlist">
              {located.slice(0, 6).map(({ event, dist }) => {
                const d = new Date(event.data_ora);
                return (
                  <button key={event.id} className="nearrow" onClick={() => onSelect(event)}>
                    <div className="when">
                      <div className="d">{String(d.getDate()).padStart(2, '0')}</div>
                      <div className="m">{dayFmt.format(d).split(' ')[0]}</div>
                    </div>
                    <div className="body">
                      <div className="title">{event.nome_evento}</div>
                      <div className="sub">{event.venue} · {event.città}</div>
                    </div>
                    <div className="dist">
                      <div className="km">{fmtKm(dist)}</div>
                      <div className="u">km</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
