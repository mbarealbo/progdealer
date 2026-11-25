// Basemap for the events map: VersaTiles vector tiles (OpenStreetMap data,
// Shortbread schema) drawn with our own small style in the Gatefold palette:
// paper land, muted teal water, sand roads, one font, no icons.
// Why VersaTiles: its tiles carry names in a dozen languages, not sixty, so a
// tile weighs 55-120 KB at every zoom (OpenFreeMap's weighed up to 720 KB).
// The style lives here, so there is no style file to download and upstream
// style changes can't break the look. If the tiles can't be reached, EventsMap
// switches to FALLBACK_STYLE: plain OpenStreetMap raster tiles, desaturated.

import type { StyleSpecification, LayerSpecification, ExpressionSpecification } from 'maplibre-gl';

export const BASEMAP_SOURCE = 'basemap';

const C = {
  paper: '#ECE7DC',
  park: '#DCD7C2',
  water: '#C3D0C9',
  waterLabel: '#4E6A63',
  building: '#DDD5C6',
  road: '#F6F2EA',
  casing: '#D3CABA',
  rail: '#C9C0AF',
  boundary: '#5B5A50',
  label: '#4A4A41',
  country: '#24261F',
  halo: '#ECE7DC',
};

const FONT = ['noto_sans_regular'];
const NAME: ExpressionSpecification = ['coalesce', ['get', 'name_en'], ['get', 'name']];
const kind = (...kinds: string[]): ExpressionSpecification => ['in', ['get', 'kind'], ['literal', kinds]];
const zoomed = (...stops: number[]): ExpressionSpecification =>
  ['interpolate', ['exponential', 1.4], ['zoom'], ...stops] as ExpressionSpecification;

const src = { source: BASEMAP_SOURCE };
const text = (size: ExpressionSpecification | number, color = C.label) => ({
  layout: { 'text-field': NAME, 'text-font': FONT, 'text-size': size, 'text-max-width': 8 },
  paint: { 'text-color': color, 'text-halo-color': C.halo, 'text-halo-width': 1.4 },
});

const ROADS_MAJOR = ['motorway', 'trunk', 'primary'];
const ROADS_MID = ['secondary', 'tertiary'];
const ROADS_MINOR = ['unclassified', 'residential', 'living_street', 'pedestrian'];
const RAIL = ['rail', 'light_rail', 'subway', 'tram', 'narrow_gauge'];

function roadLayers(id: string, kinds: string[], minzoom: number, width: number[]): LayerSpecification[] {
  const filter: ExpressionSpecification = ['all', kind(...kinds), ['!=', ['get', 'rail'], true]];
  const casing = width.map((v, i) => (i % 2 ? v + 1.6 : v));
  return [
    { id: `${id}-casing`, type: 'line', ...src, 'source-layer': 'streets', minzoom, filter,
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': C.casing, 'line-width': zoomed(...casing) } },
    { id, type: 'line', ...src, 'source-layer': 'streets', minzoom, filter,
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': C.road, 'line-width': zoomed(...width) } },
  ];
}

const LAYERS: LayerSpecification[] = [
  { id: 'paper', type: 'background', paint: { 'background-color': C.paper } },
  { id: 'ocean', type: 'fill', ...src, 'source-layer': 'ocean', paint: { 'fill-color': C.water } },
  { id: 'green', type: 'fill', ...src, 'source-layer': 'land', minzoom: 5,
    filter: kind('forest', 'wood', 'grassland', 'meadow', 'heath', 'scrub', 'park', 'garden', 'village_green', 'recreation_ground', 'golf_course', 'cemetery', 'allotments'),
    paint: { 'fill-color': C.park, 'fill-opacity': 0.5 } },
  { id: 'urban', type: 'fill', ...src, 'source-layer': 'land', minzoom: 9,
    filter: kind('residential', 'commercial', 'industrial', 'retail'),
    paint: { 'fill-color': C.building, 'fill-opacity': 0.45 } },
  { id: 'glacier', type: 'fill', ...src, 'source-layer': 'water_polygons', filter: kind('glacier'),
    paint: { 'fill-color': C.road, 'fill-opacity': 0.7 } },
  { id: 'water', type: 'fill', ...src, 'source-layer': 'water_polygons', filter: ['!', kind('glacier')],
    paint: { 'fill-color': C.water } },
  { id: 'river', type: 'line', ...src, 'source-layer': 'water_lines', minzoom: 8, filter: kind('river', 'canal'),
    paint: { 'line-color': C.water, 'line-width': zoomed(8, 0.6, 14, 3) } },
  { id: 'building', type: 'fill', ...src, 'source-layer': 'buildings', minzoom: 14, paint: { 'fill-color': C.building } },
  ...roadLayers('road-minor', ROADS_MINOR, 12, [12, 0.5, 16, 7]),
  ...roadLayers('road-mid', ROADS_MID, 9, [9, 0.5, 16, 9]),
  ...roadLayers('road-major', ROADS_MAJOR, 6, [6, 0.4, 16, 12]),
  { id: 'rail', type: 'line', ...src, 'source-layer': 'streets', minzoom: 10, filter: kind(...RAIL),
    paint: { 'line-color': C.rail, 'line-width': zoomed(10, 0.6, 16, 1.6) } },
  { id: 'boundary-state', type: 'line', ...src, 'source-layer': 'boundaries', minzoom: 5,
    filter: ['all', ['==', ['get', 'admin_level'], 4], ['!=', ['get', 'maritime'], true]],
    paint: { 'line-color': C.boundary, 'line-opacity': 0.25, 'line-dasharray': [3, 2], 'line-width': 0.7 } },
  { id: 'boundary-country', type: 'line', ...src, 'source-layer': 'boundaries',
    filter: ['all', ['==', ['get', 'admin_level'], 2], ['!=', ['get', 'maritime'], true]],
    paint: { 'line-color': C.boundary, 'line-opacity': 0.45, 'line-width': zoomed(1, 0.6, 8, 1.4) } },

  { id: 'label-water', type: 'symbol', ...src, 'source-layer': 'water_polygons_labels', minzoom: 5,
    ...text(11, C.waterLabel) },
  { id: 'label-street', type: 'symbol', ...src, 'source-layer': 'street_labels', minzoom: 14,
    layout: { ...text(11).layout, 'symbol-placement': 'line' }, paint: text(11).paint },
  { id: 'label-state', type: 'symbol', ...src, 'source-layer': 'boundary_labels', minzoom: 5, maxzoom: 9,
    filter: ['==', ['get', 'admin_level'], 4],
    layout: { ...text(10).layout, 'text-transform': 'uppercase', 'text-letter-spacing': 0.1 },
    paint: { ...text(10).paint, 'text-opacity': 0.7 } },
  { id: 'label-place-minor', type: 'symbol', ...src, 'source-layer': 'place_labels', minzoom: 9,
    filter: ['any', ['all', kind('town'), ['>=', ['zoom'], 9]], ['all', kind('village', 'suburb'), ['>=', ['zoom'], 11]]],
    layout: { ...text(zoomed(9, 10, 14, 13)).layout, 'symbol-sort-key': ['-', 0, ['coalesce', ['get', 'population'], 0]] },
    paint: text(11).paint },
  { id: 'label-place', type: 'symbol', ...src, 'source-layer': 'place_labels', minzoom: 4,
    filter: ['any', kind('capital'), ['all', kind('state_capital'), ['>=', ['zoom'], 5]], ['all', kind('city'), ['>=', ['zoom'], 6]]],
    layout: {
      ...text(zoomed(4, 11, 8, 14, 12, 18)).layout,
      'text-anchor': 'bottom',
      'text-offset': [0, -0.6],
      'symbol-sort-key': ['-', 0, ['coalesce', ['get', 'population'], 0]],
    },
    paint: text(11).paint },
  { id: 'label-country', type: 'symbol', ...src, 'source-layer': 'boundary_labels', minzoom: 2, maxzoom: 7,
    filter: ['==', ['get', 'admin_level'], 2],
    layout: {
      ...text(zoomed(2, 10, 6, 14)).layout,
      'text-letter-spacing': 0.04,
      'symbol-sort-key': ['-', 0, ['coalesce', ['get', 'way_area'], 0]],
    },
    paint: text(12, C.country).paint },
];

export const GATEFOLD_STYLE: StyleSpecification = {
  version: 8,
  glyphs: 'https://tiles.versatiles.org/assets/glyphs/{fontstack}/{range}.pbf',
  sources: {
    [BASEMAP_SOURCE]: {
      type: 'vector',
      tiles: ['https://tiles.versatiles.org/tiles/osm/{z}/{x}/{y}'],
      minzoom: 0,
      maxzoom: 14,
      attribution:
        '<a href="https://versatiles.org" target="_blank" rel="noopener">VersaTiles</a> · © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors</a> · <a href="https://esa-worldcover.org/en/data-access" target="_blank" rel="noopener">ESA WorldCover 2021</a>',
    },
  },
  layers: LAYERS,
};

export const FALLBACK_STYLE: StyleSpecification = {
  version: 8,
  // The pin counts are a symbol layer: they need glyphs on this style too.
  glyphs: 'https://tiles.versatiles.org/assets/glyphs/{fontstack}/{range}.pbf',
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
  layers: [
    { id: 'paper', type: 'background', paint: { 'background-color': C.paper } },
    { id: 'osm', type: 'raster', source: 'osm', paint: { 'raster-saturation': -0.85, 'raster-opacity': 0.55, 'raster-contrast': -0.1 } },
  ],
};
