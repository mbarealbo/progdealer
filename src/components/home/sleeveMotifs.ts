// Generated "record sleeve" artwork for shows without an image: a small set of
// 70s-style geometric covers (sunset, rings, eclipse, ripples...) picked by
// subgenre and varied by a per-event seed, in the Gatefold palette.
//
// Motifs are plain SVG strings, shown as one <img> with a data URI: a card
// costs one DOM node for its cover instead of a dozen inline SVG nodes.

const T = '#1F5C5A'; // petrol teal
const M = '#D49A12'; // mustard
const K = '#24261F'; // ink
const P = '#ECE7DC'; // paper
const S = '#DCD3C1'; // sand
const R = '#A8462E'; // rust

export function sleeveSeed(id: string): number {
  let n = 7;
  for (let i = 0; i < id.length; i++) n = (n * 17 + id.charCodeAt(i)) % 997;
  return n;
}

/** Catalog number printed on the sleeve, from the event id: PD-531B */
export function catNo(id: string): string {
  return 'PD-' + id.replace(/[^a-z0-9]/gi, '').slice(0, 4).toUpperCase();
}

type Motif = (seed: number) => { bg: string; light: boolean; body: string };

const sunset = (bg: string, sun: string): Motif => (seed) => {
  const cx = 62 + (seed % 14);
  const cuts = [[70, 4], [78, 3.4], [85, 2.8], [91, 2.2]];
  return {
    bg,
    light: bg === S || bg === M,
    body:
      `<circle cx="${cx}" cy="70" r="37" fill="${sun}"/>` +
      cuts.map(([y, h]) => `<rect x="0" y="${y}" width="100" height="${h}" fill="${bg}"/>`).join(''),
  };
};

const rings = (bg: string): Motif => (seed) => {
  const cy = 58 + (seed % 12);
  return {
    bg,
    light: true,
    body:
      [50, 40, 30].map((r) => `<circle cx="20" cy="${cy}" r="${r}" fill="none" stroke="${K}" stroke-width="2.4"/>`).join('') +
      `<circle cx="20" cy="${cy}" r="20" fill="${K}"/>` +
      `<circle cx="${80 - (seed % 9)}" cy="22" r="7" fill="${bg === M ? P : [T, R, M][seed % 3]}"/>`,
  };
};

const eclipse = (bg: string, moon: string): Motif => (seed) => {
  const dx = seed % 10;
  return {
    bg,
    light: false,
    body:
      `<circle cx="${60 + dx}" cy="18" r="43" fill="${moon}"/>` +
      `<circle cx="${76 + dx}" cy="10" r="43" fill="${bg}"/>` +
      `<circle cx="24" cy="76" r="11" fill="${T === bg ? M : T}"/>` +
      `<circle cx="47" cy="72" r="4.5" fill="${P}"/>` +
      `<circle cx="61" cy="86" r="2.5" fill="${P}"/>`,
  };
};

const ripples: Motif = (seed) => {
  const cx = 42 + (seed % 18);
  return {
    bg: S,
    light: true,
    body:
      [60, 45, 30].map((r) => `<circle cx="${cx}" cy="116" r="${r}" fill="none" stroke="${T}" stroke-width="9"/>`).join('') +
      `<circle cx="${cx}" cy="116" r="15" fill="${M}"/>`,
  };
};

const hills: Motif = (seed) => ({
  bg: T,
  light: false,
  body:
    `<circle cx="${70 + (seed % 12)}" cy="30" r="12" fill="${M}"/>` +
    `<ellipse cx="28" cy="96" rx="62" ry="30" fill="${S}"/>` +
    `<ellipse cx="88" cy="108" rx="56" ry="36" fill="${K}"/>`,
});

const bars: Motif = (seed) => {
  const hs = [62, 38, 0, 82, 50, 0, 70, 30, 56].map((h, i) => (h ? Math.max(18, (h + seed * (i + 3)) % 86) : 0));
  const fills = [T, T, '', M, M, '', P, P, P];
  let x = 12;
  let body = '';
  hs.forEach((h, i) => {
    if (!h) { x += 4; return; }
    body += `<rect x="${x}" y="${90 - h}" width="7" height="${h}" fill="${fills[i]}"/>`;
    x += 9.5;
  });
  return { bg: K, light: false, body };
};

const orbit: Motif = (seed) => ({
  bg: R,
  light: false,
  body:
    `<circle cx="50" cy="52" r="22" fill="${M}"/>` +
    `<ellipse cx="50" cy="52" rx="42" ry="11" fill="none" stroke="${P}" stroke-width="2.2" transform="rotate(${-18 - (seed % 14)} 50 52)"/>` +
    `<circle cx="84" cy="26" r="5" fill="${P}"/>` +
    `<circle cx="16" cy="80" r="3" fill="${P}"/>`,
});

// Each sleeve is its own SVG document, so pattern ids cannot collide.
const dots: Motif = (seed) => ({
  bg: P,
  light: true,
  body:
    `<defs><pattern id="d" width="6" height="6" patternUnits="userSpaceOnUse"><circle cx="3" cy="3" r="1.4" fill="${T}"/></pattern></defs>` +
    `<rect x="0" y="0" width="100" height="100" fill="url(#d)" opacity="0.55"/>` +
    `<circle cx="${34 + (seed % 30)}" cy="58" r="28" fill="${M}"/>` +
    `<rect x="0" y="84" width="100" height="16" fill="${K}"/>`,
});

const motorik: Motif = (seed) => ({
  bg: M,
  light: true,
  body:
    `<defs><pattern id="s" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><rect x="0" y="0" width="6" height="14" fill="${K}"/></pattern></defs>` +
    `<rect x="0" y="0" width="100" height="100" fill="url(#s)"/>` +
    `<circle cx="${30 + (seed % 20)}" cy="66" r="17" fill="${P}"/>`,
});

const ALL: Motif[] = [sunset(T, M), rings(M), eclipse(K, M), ripples, hills, bars, orbit, dots, motorik, sunset(R, M), rings(S)];

export function motifFor(genre: string, seed: number): Motif {
  switch (genre) {
    case 'Italian Prog': return sunset([T, R, K][seed % 3], M);
    case 'Symphonic Prog': return rings([M, S, P][seed % 3]);
    case 'Canterbury Scene': return eclipse([K, T][seed % 2], M);
    case 'Neo-Prog': return hills;
    case 'Prog Metal':
    case 'Math Rock': return bars;
    case 'Post-Rock': return dots;
    case 'Space Rock':
    case 'Psychedelic Prog': return orbit;
    case 'Krautrock':
    case 'Progressive Electronic': return motorik;
    case 'Zeuhl':
    case 'Avant-Prog':
    case 'RIO (Rock in Opposition)': return eclipse(R, P);
    case 'Progressive Rock': return [ripples, sunset(R, M), hills, rings(S), eclipse(T, M), dots, motorik][Math.floor(seed / 3) % 7];
    default: return ALL[seed % ALL.length];
  }
}

/** Asymmetric covers are mirrored for half the seeds, so one motif reads as two. */
export function sleeveMirrored(seed: number): boolean {
  return Math.floor(seed / 2) % 2 === 1;
}

type SleeveArt = { src: string; light: boolean };
// genre x seed is bounded (about 20 x 997), and a page only ever meets a few hundred.
const cache = new Map<string, SleeveArt>();

/** The generated cover as a data URI, plus whether it needs dark text on top. */
export function sleeveArt(genre: string | null | undefined, seed: number): SleeveArt {
  const g = genre || 'Progressive Rock';
  const key = `${g}|${seed}`;
  let art = cache.get(key);
  if (!art) {
    const { bg, light, body } = motifFor(g, seed)(seed);
    const inner = sleeveMirrored(seed) ? `<g transform="translate(100 0) scale(-1 1)">${body}</g>` : body;
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">` +
      `<rect x="0" y="0" width="100" height="100" fill="${bg}"/>${inner}</svg>`;
    art = { src: `data:image/svg+xml,${encodeURIComponent(svg)}`, light };
    cache.set(key, art);
  }
  return art;
}
