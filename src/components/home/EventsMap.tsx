import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import type { GeoJSONSource, MapLayerMouseEvent } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { EventSummary } from '../../types/event';
import { coordsForEvent } from '../../utils/coords';
import { GATEFOLD_STYLE, FALLBACK_STYLE, BASEMAP_SOURCE } from '../../lib/mapStyle';

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);

// Gatefold palette (see gatefold.css).
const TEAL = '#1F5C5A';
const INK = '#24261F';
const MUSTARD = '#D49A12';
const PAPER = '#F6F2EA';

const SOURCE = 'pd-cities';
const PINS = 'pd-pins';
const COUNTS = 'pd-pin-counts';

type CityProps = { city: string; count: number };

/** One point per city with its number of shows, plus the bounds to fit. */
function cityPoints(events: EventSummary[]) {
  const groups = new Map<string, { lat: number; lng: number; count: number }>();
  for (const e of events) {
    const c = coordsForEvent(e);
    if (!c) continue;
    const g = groups.get(e.città);
    if (g) g.count++;
    else groups.set(e.città, { lat: c.lat, lng: c.lng, count: 1 });
  }
  const bounds = new maplibregl.LngLatBounds();
  const features: GeoJSON.Feature<GeoJSON.Point, CityProps>[] = [];
  for (const [city, g] of groups) {
    features.push({ type: 'Feature', geometry: { type: 'Point', coordinates: [g.lng, g.lat] }, properties: { city, count: g.count } });
    bounds.extend([g.lng, g.lat]);
  }
  return { data: { type: 'FeatureCollection' as const, features }, bounds };
}

/** Pins drawn by the map itself (WebGL): no DOM node per city. */
function addCityLayers(map: maplibregl.Map, data: GeoJSON.FeatureCollection) {
  if (map.getSource(SOURCE)) return;
  map.addSource(SOURCE, { type: 'geojson', data, generateId: true });
  map.addLayer({
    id: PINS, type: 'circle', source: SOURCE,
    paint: {
      'circle-color': ['case', ['boolean', ['feature-state', 'hover'], false], MUSTARD, ['>=', ['get', 'count'], 10], INK, TEAL],
      'circle-radius': ['case', ['>=', ['get', 'count'], 10], 12, ['>', ['get', 'count'], 1], 9, 6],
      'circle-stroke-color': PAPER,
      'circle-stroke-width': 2,
    },
  });
  map.addLayer({
    id: COUNTS, type: 'symbol', source: SOURCE, filter: ['>', ['get', 'count'], 1],
    layout: {
      'text-field': ['to-string', ['get', 'count']],
      'text-font': ['noto_sans_bold'],
      'text-size': 10,
      'text-allow-overlap': true,
      'text-ignore-placement': true,
    },
    paint: { 'text-color': ['case', ['boolean', ['feature-state', 'hover'], false], INK, '#FFFFFF'] },
  });
}

export default function EventsMap({ events, onCity }: { events: EventSummary[]; onCity?: (città: string) => void }) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const onCityRef = useRef(onCity);
  onCityRef.current = onCity;
  const eventsRef = useRef(events);
  eventsRef.current = events;

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

    // A style swap (the fallback) drops custom layers: add them on every style load.
    map.on('style.load', () => addCityLayers(map, cityPoints(eventsRef.current).data));
    map.once('load', () => {
      const { bounds } = cityPoints(eventsRef.current);
      if (!bounds.isEmpty()) map.fitBounds(bounds, { padding: 64, maxZoom: 9, duration: 600 });
    });

    // Hover: highlight the pin and name the city. Click: filter the list by it.
    const popup = new maplibregl.Popup({ offset: 14, closeButton: false, closeOnClick: false });
    let hovered: number | string | undefined;
    const unhover = () => {
      if (hovered !== undefined) map.setFeatureState({ source: SOURCE, id: hovered }, { hover: false });
      hovered = undefined;
    };
    map.on('mousemove', PINS, (e: MapLayerMouseEvent) => {
      const f = e.features?.[0];
      if (!f) return;
      map.getCanvas().style.cursor = 'pointer';
      if (f.id !== hovered) {
        unhover();
        hovered = f.id;
        if (hovered !== undefined) map.setFeatureState({ source: SOURCE, id: hovered }, { hover: true });
        const { city, count } = f.properties as CityProps;
        popup
          .setLngLat((f.geometry as GeoJSON.Point).coordinates as [number, number])
          .setHTML(`<strong>${esc(city)}</strong><br>${count} ${count === 1 ? 'show' : 'shows'}`)
          .addTo(map);
      }
    });
    map.on('mouseleave', PINS, () => {
      map.getCanvas().style.cursor = '';
      unhover();
      popup.remove();
    });
    map.on('click', PINS, (e: MapLayerMouseEvent) => {
      const city = (e.features?.[0]?.properties as CityProps | undefined)?.city;
      if (city) onCityRef.current?.(city);
    });

    let failedTiles = 0;
    let fellBack = false;
    map.on('error', (e: maplibregl.ErrorEvent & { sourceId?: string }) => {
      if (e.sourceId === BASEMAP_SOURCE) {
        // The vector tiles are unreachable: switch to plain OSM once, quietly.
        // diff: false reloads the style from scratch, so 'style.load' re-adds the pins.
        if (!fellBack && ++failedTiles >= 3) { fellBack = true; map.setStyle(FALLBACK_STYLE, { diff: false }); }
        return;
      }
      console.error(e.error);
    });

    return () => { popup.remove(); map.remove(); mapRef.current = null; };
  }, []);

  // Filters changed: swap the data and re-fit. Before the style is ready,
  // 'style.load' picks up the latest events by itself.
  useEffect(() => {
    const map = mapRef.current;
    const source = map?.getSource(SOURCE) as GeoJSONSource | undefined;
    if (!map || !source) return;
    const { data, bounds } = cityPoints(events);
    source.setData(data);
    if (!bounds.isEmpty()) map.fitBounds(bounds, { padding: 64, maxZoom: 9, duration: 600 });
  }, [events]);

  return <div className="pd-map pd-map-hero" ref={container} />;
}
