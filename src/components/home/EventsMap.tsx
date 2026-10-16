import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Event } from '../../types/event';
import { coordsForEvent } from '../../utils/coords';
import { GATEFOLD_STYLE, FALLBACK_STYLE, BASEMAP_SOURCE } from '../../lib/mapStyle';

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);

export default function EventsMap({ events, onCity }: { events: Event[]; onCity?: (città: string) => void }) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markers = useRef<maplibregl.Marker[]>([]);
  const onCityRef = useRef(onCity);
  onCityRef.current = onCity;
  const eventsRef = useRef(events);
  eventsRef.current = events;

  // Rebuild markers + re-fit bounds for the current (filtered) events.
  const draw = () => {
    const map = mapRef.current;
    if (!map) return;
    markers.current.forEach((m) => m.remove());
    markers.current = [];

    const groups = new Map<string, { lat: number; lng: number; count: number }>();
    for (const e of eventsRef.current) {
      const c = coordsForEvent(e);
      if (!c) continue;
      const g = groups.get(e.città);
      if (g) g.count++;
      else groups.set(e.città, { lat: c.lat, lng: c.lng, count: 1 });
    }

    const bounds = new maplibregl.LngLatBounds();
    for (const [città, g] of groups) {
      const el = document.createElement('button');
      el.className = g.count >= 10 ? 'pd-pin big' : 'pd-pin';
      el.type = 'button';
      el.setAttribute('aria-label', `${città}: ${g.count} ${g.count === 1 ? 'show' : 'shows'}`);
      if (g.count > 1) el.textContent = String(g.count);
      el.addEventListener('click', () => onCityRef.current?.(città));
      const popup = new maplibregl.Popup({ offset: 16, closeButton: false }).setHTML(
        `<strong>${esc(città)}</strong><br>${g.count} ${g.count === 1 ? 'show' : 'shows'}`
      );
      const marker = new maplibregl.Marker({ element: el }).setLngLat([g.lng, g.lat]).setPopup(popup).addTo(map);
      markers.current.push(marker);
      bounds.extend([g.lng, g.lat]);
    }

    if (!bounds.isEmpty()) map.fitBounds(bounds, { padding: 64, maxZoom: 9, duration: 600 });
  };

  // Create the map once, with the Gatefold basemap (raster fallback if its tiles fail).
  useEffect(() => {
    if (!container.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: container.current,
      style: GATEFOLD_STYLE,
      center: [8, 30],
      zoom: 1.3,
      attributionControl: { compact: true },
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    map.addControl(
      new maplibregl.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, showUserLocation: true }),
      'top-right'
    );
    map.once('load', draw);

    let failedTiles = 0;
    let fellBack = false;
    map.on('error', (e: maplibregl.ErrorEvent & { sourceId?: string }) => {
      if (e.sourceId === BASEMAP_SOURCE) {
        // The vector tiles are unreachable: switch to plain OSM once, quietly.
        if (!fellBack && ++failedTiles >= 3) { fellBack = true; map.setStyle(FALLBACK_STYLE); }
        return;
      }
      console.error(e.error);
    });

    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // Filters changed: redraw once the map is ready.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (map.loaded()) draw(); else map.once('load', draw);
  }, [events]);

  return <div className="pd-map pd-map-hero" ref={container} />;
}
