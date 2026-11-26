import { EventSummary } from '../../types/event';
import { eventPath } from '../../lib/catalog';
import { shouldUsePlaceholder } from '../../utils/imageUtils';
import { splitTitle, shortDate, longDate, isTonight, isThisWeek } from '../../utils/eventText';
import { sleeveSeed, sleeveArt, catNo } from './sleeveMotifs';

export type CardView = 'grid' | 'list' | 'compact';

const Arrow = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

/** The sleeve: the event image when there is one, generated artwork otherwise. */
export function Sleeve({ event, showCatNo = true }: { event: EventSummary; showCatNo?: boolean }) {
  const art = shouldUsePlaceholder(event.immagine) ? sleeveArt(event.sottogenere, sleeveSeed(event.id)) : null;
  return (
    <>
      <img src={art ? art.src : event.immagine} alt="" loading="lazy" decoding="async" />
      {showCatNo && <span className={art?.light ? 'catno dark' : 'catno'} aria-hidden="true">{catNo(event.id)}</span>}
    </>
  );
}

/** One show in the list. A real link: opens in a new tab, crawlable, no JS needed. */
export default function EventCard({
  event, view = 'grid', index,
}: { event: EventSummary; view?: CardView; index?: number }) {
  const href = eventPath(event);
  const genre = event.sottogenere || 'Progressive Rock';
  const { main, sub } = splitTitle(event.nome_evento);
  const tonight = isTonight(event.data_ora);
  const soon = !tonight && isThisWeek(event.data_ora);
  const place = [event.venue, event.città].filter(Boolean).join(', ');

  // ---- Compact: one dense line per show ----
  if (view === 'compact') {
    return (
      <a className="evc" href={href}>
        <span className="evc-day">{shortDate(event.data_ora)}</span>
        <span className="evc-title">{event.nome_evento}</span>
        <span className="evc-loc">{event.città}</span>
        <span className="evc-genre">{genre}</span>
        {tonight && <span className="evc-soon">Tonight</span>}
        <span className="evc-go"><Arrow /></span>
      </a>
    );
  }

  // ---- Tracklist: numbered rows with a small sleeve ----
  if (view === 'list') {
    return (
      <a className="evl" href={href}>
        <span className="evl-no" aria-hidden="true">{index !== undefined ? `B${index + 1}` : ''}</span>
        <span className="evl-vis"><Sleeve event={event} showCatNo={false} /></span>
        <span className="evl-date">
          {shortDate(event.data_ora)}
          {tonight && <><br /><span className="tonight">Tonight</span></>}
        </span>
        <div className="evl-main">
          <h3>{main}</h3>
          {sub && <span className="ev-sub">{sub}</span>}
        </div>
        <span className="evl-loc">{place}</span>
        <span className="evl-genre">{genre}</span>
        <span className="go"><Arrow /></span>
      </a>
    );
  }

  // ---- Sleeves (default) ----
  return (
    <a className="ev" href={href}>
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
    </a>
  );
}
