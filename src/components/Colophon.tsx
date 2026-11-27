import { CREATOR, SITE_NAME, yearsActive } from '../lib/seo';

/** "© 2024-2026 ProgDealer. Created with love by Alberto Abate. This site will always be free." */
export default function Colophon() {
  return (
    <p className="colophon">
      &copy; {yearsActive()} {SITE_NAME}. Created with love by{' '}
      <a href={CREATOR.url} rel="author">{CREATOR.name}</a>. This site will always be free.
    </p>
  );
}
