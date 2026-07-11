import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Event } from '../../types/event';
import { coordsForEvent } from '../../utils/coords';

const OSM_STYLE: any = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: [
        'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png',
      ],
      tileSize: 256,
      maxzoom: 19,
      attribution: '© OpenStreetMap contributors',
    },
  },
  layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
};

export default function EventsMap({ events, onCity }: { events: Event[]; onCity?: (città: string) => void }) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markers = useRef<maplibregl.Marker[]>([]);
  const onCityRef = useRef(onCity);
  onCityRef.current = onCity;

  // Create the map once.
  useEffect(() => {
    if (!container.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: container.current,
      style: OSM_STYLE,
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
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // Rebuild markers + re-fit bounds whenever the (filtered) events change.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markers.current.forEach((m) => m.remove());
    markers.current = [];

    const groups = new Map<string, { lat: number; lng: number; count: number }>();
    for (const e of events) {
      const c = coordsForEvent(e);
      if (!c) continue;
      const g = groups.get(e.città);
      if (g) g.count++;
      else groups.set(e.città, { lat: c.lat, lng: c.lng, count: 1 });
    }

    const bounds = new maplibregl.LngLatBounds();
    for (const [città, g] of groups) {
      const el = document.createElement('button');
      el.className = 'pd-pin';
      el.type = 'button';
      el.setAttribute('aria-label', `${città}: ${g.count} shows`);
      if (g.count > 1) el.textContent = String(g.count);
      el.addEventListener('click', () => onCityRef.current?.(città));
      const popup = new maplibregl.Popup({ offset: 14, closeButton: false }).setHTML(
        `<strong>${città}</strong><br>${g.count} ${g.count === 1 ? 'show' : 'shows'}`
      );
      const marker = new maplibregl.Marker({ element: el }).setLngLat([g.lng, g.lat]).setPopup(popup).addTo(map);
      markers.current.push(marker);
      bounds.extend([g.lng, g.lat]);
    }

    const fit = () => {
      if (bounds.isEmpty()) return;
      map.fitBounds(bounds, { padding: 64, maxZoom: 9, duration: 600 });
    };
    if (map.loaded()) fit(); else map.once('load', fit);
  }, [events]);

  return <div className="pd-map pd-map-hero" ref={container} />;
}
