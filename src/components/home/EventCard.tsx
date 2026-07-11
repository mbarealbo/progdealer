import { Event } from '../../types/event';
import { getEventCountry, countryFlag } from '../../utils/geo';
import CardArt from './CardArt';
import { shouldUsePlaceholder } from '../../utils/imageUtils';

export function hueFor(subgenre: string): number {
  let h = 0;
  const s = subgenre || 'progressive rock';
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
  return h;
}

export function seedFor(id: string): number {
  let n = 7;
  for (let i = 0; i < id.length; i++) n = (n * 17 + id.charCodeAt(i)) % 997;
  return n;
}

const dayFmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit' });

export function isSoon(dateIso: string): boolean {
  const d = new Date(dateIso).getTime();
  const now = Date.now();
  return d >= now && d - now <= 7 * 24 * 60 * 60 * 1000;
}

export type CardView = 'grid' | 'list' | 'compact';

const Arrow = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

export default function EventCard({
  event, onSelect, view = 'grid',
}: { event: Event; onSelect: (e: Event) => void; view?: CardView }) {
  const country = getEventCountry(event.città);
  const date = new Date(event.data_ora);
  const soon = isSoon(event.data_ora);
  const hasImage = !shouldUsePlaceholder(event.immagine);
  const genre = event.sottogenere || 'Progressive Rock';

  // ---- Compact: dense one-line rows (list/elenco) ----
  if (view === 'compact') {
    return (
      <button className="evc" onClick={() => onSelect(event)} aria-label={event.nome_evento}>
        <span className="evc-day">
          <b>{String(date.getDate()).padStart(2, '0')}</b>
          <i>{dayFmt.format(date).split(' ')[0]} ’{String(date.getFullYear()).slice(2)}</i>
        </span>
        <span className="evc-title">{event.nome_evento}</span>
        <span className="evc-loc">{countryFlag(country)} {event.città}</span>
        <span className="evc-genre">{genre}</span>
        {soon && <span className="evc-soon">This week</span>}
        <span className="evc-go"><Arrow /></span>
      </button>
    );
  }

  // ---- List: horizontal rows with artwork ----
  if (view === 'list') {
    return (
      <button className="evl" onClick={() => onSelect(event)} aria-label={event.nome_evento}>
        <div className="evl-vis">
          {hasImage ? <img src={event.immagine} alt="" loading="lazy" /> : <CardArt hue={hueFor(genre)} seed={seedFor(event.id)} />}
          {soon && <span className="soon">This week</span>}
        </div>
        <div className="evl-main">
          <div className="ev-date">{dayFmt.format(date)} · {date.getFullYear()}</div>
          <h3>{event.nome_evento}</h3>
          <div className="ev-venue"><span className="flag">{countryFlag(country)}</span> {event.venue}, {event.città}</div>
        </div>
        <span className="evl-genre">{genre}</span>
        <span className="go">Details <Arrow /></span>
      </button>
    );
  }

  // ---- Grid (default): full card ----
  return (
    <button className="ev" onClick={() => onSelect(event)} aria-label={event.nome_evento}>
      <div className="ev-vis">
        {hasImage ? (
          <img src={event.immagine} alt="" loading="lazy" />
        ) : (
          <CardArt hue={hueFor(genre)} seed={seedFor(event.id)} />
        )}
        {soon && <span className="soon">This week</span>}
        <span className="genre">{genre}</span>
      </div>
      <div className="ev-body">
        <div className="ev-date">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <rect x="3" y="5" width="18" height="16" rx="2" />
            <path d="M3 9h18M8 3v4M16 3v4" />
          </svg>
          {dayFmt.format(date)} · {date.getFullYear()}
        </div>
        <h3>{event.nome_evento}</h3>
        <div className="ev-venue">
          <span className="flag">{countryFlag(country)}</span>
          {event.venue}, {event.città}
        </div>
        <div className="ev-foot">
          <span className="go">Details <Arrow /></span>
        </div>
      </div>
    </button>
  );
}
