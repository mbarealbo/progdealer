import { Event } from '../../types/event';
import { shouldUsePlaceholder } from '../../utils/imageUtils';
import { splitTitle, shortDate, longDate, isTonight, isThisWeek } from '../../utils/eventText';
import SleeveArt from './SleeveArt';
import { sleeveSeed, catNo, sleeveIsLight } from './sleeveMotifs';

export type CardView = 'grid' | 'list' | 'compact';

const Arrow = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

/** The sleeve: the event image when there is one, generated artwork otherwise. */
export function Sleeve({ event, showCatNo = true }: { event: Event; showCatNo?: boolean }) {
  const genre = event.sottogenere || 'Progressive Rock';
  const seed = sleeveSeed(event.id);
  const hasImage = !shouldUsePlaceholder(event.immagine);
  return (
    <>
      {hasImage ? <img src={event.immagine} alt="" loading="lazy" /> : <SleeveArt genre={genre} seed={seed} />}
      {showCatNo && (
        <span className={`catno ${!hasImage && sleeveIsLight(genre, seed) ? 'dark' : ''}`}>{catNo(event.id)}</span>
      )}
    </>
  );
}

export default function EventCard({
  event, onSelect, view = 'grid', index,
}: { event: Event; onSelect: (e: Event) => void; view?: CardView; index?: number }) {
  const genre = event.sottogenere || 'Progressive Rock';
  const { main, sub } = splitTitle(event.nome_evento);
  const tonight = isTonight(event.data_ora);
  const soon = !tonight && isThisWeek(event.data_ora);
  const place = [event.venue, event.città].filter(Boolean).join(', ');

  // ---- Compact: one dense line per show ----
  if (view === 'compact') {
    return (
      <button className="evc" onClick={() => onSelect(event)} aria-label={event.nome_evento}>
        <span className="evc-day">{shortDate(event.data_ora)}</span>
        <span className="evc-title">{event.nome_evento}</span>
        <span className="evc-loc">{event.città}</span>
        <span className="evc-genre">{genre}</span>
        {tonight && <span className="evc-soon">Tonight</span>}
        <span className="evc-go"><Arrow /></span>
      </button>
    );
  }

  // ---- Tracklist: numbered rows with a small sleeve ----
  if (view === 'list') {
    return (
      <button className="evl" onClick={() => onSelect(event)} aria-label={event.nome_evento}>
        <span className="evl-no">{index !== undefined ? `B${index + 1}` : ''}</span>
        <span className="evl-vis"><Sleeve event={event} showCatNo={false} /></span>
        <span className="evl-date">
          {shortDate(event.data_ora)}
          {tonight && <><br /><span className="tonight">Tonight</span></>}
        </span>
        <span className="evl-main">
          <h3>{main}</h3>
          {sub && <span className="ev-sub">{sub}</span>}
        </span>
        <span className="evl-loc">{place}</span>
        <span className="evl-genre">{genre}</span>
        <span className="go"><Arrow /></span>
      </button>
    );
  }

  // ---- Sleeves (default) ----
  return (
    <button className="ev" onClick={() => onSelect(event)} aria-label={event.nome_evento}>
      <div className="ev-vis">
        <Sleeve event={event} />
        {tonight && <span className="soon">Tonight</span>}
        {soon && <span className="soon">This week</span>}
      </div>
      <div className="ev-body">
        <div className="ev-date">{longDate(event.data_ora)}</div>
        <h3>{main}</h3>
        {sub && <div className="ev-sub">{sub}</div>}
        <div className="ev-venue">{place}</div>
        <span className="tag">{genre}</span>
      </div>
    </button>
  );
}
