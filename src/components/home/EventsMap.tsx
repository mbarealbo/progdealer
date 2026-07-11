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

export default function EventsMap({ events }: { events: Event[] }) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!container.current || mapRef.current) return;

    // group events by city (that we have coordinates for)
    const groups = new Map<string, { lat: number; lng: number; count: number }>();
    for (const e of events) {
      const c = coordsForEvent(e);
      if (!c) continue;
      const key = e.città;
      const g = groups.get(key);
      if (g) g.count++;
      else groups.set(key, { lat: c.lat, lng: c.lng, count: 1 });
    }

    const map = new maplibregl.Map({
      container: container.current,
      style: OSM_STYLE,
      center: [10, 48],
      zoom: 3,
      attributionControl: { compact: true },
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    map.addControl(
      new maplibregl.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, showUserLocation: true }),
      'top-right'
    );

    const bounds = new maplibregl.LngLatBounds();
    for (const [city, g] of groups) {
      const el = document.createElement('button');
      el.className = 'pd-pin';
      el.type = 'button';
      el.setAttribute('aria-label', `${city}: ${g.count} shows`);
      if (g.count > 1) el.textContent = String(g.count);
      const popup = new maplibregl.Popup({ offset: 14, closeButton: false }).setHTML(
        `<strong>${city}</strong><br>${g.count} ${g.count === 1 ? 'show' : 'shows'}`
      );
      new maplibregl.Marker({ element: el }).setLngLat([g.lng, g.lat]).setPopup(popup).addTo(map);
      bounds.extend([g.lng, g.lat]);
    }

    if (!bounds.isEmpty()) {
      map.fitBounds(bounds, { padding: 56, maxZoom: 6, duration: 0 });
    }

    return () => { map.remove(); mapRef.current = null; };
  }, [events]);

  return <div className="pd-map" ref={container} />;
}
