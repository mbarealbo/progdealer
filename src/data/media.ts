// Prog magazines and sites listed on the country pages (/country/<slug>),
// under "Prog news and reviews". Only outlets that cover the scene of that
// country, mostly the ones that list ProgDealer in turn.

export interface MediaDef {
  name: string;
  url: string;
  /** Slugs of the country pages it appears on. */
  countries: string[];
  /** One line: what readers find there. */
  blurb: string;
}

export const MEDIA: MediaDef[] = [
  {
    name: 'BetreutesProggen',
    url: 'https://www.betreutesproggen.de/',
    countries: ['germany', 'austria', 'switzerland'],
    blurb: 'Prog tour dates alongside concert and album reviews, in German',
  },
];
