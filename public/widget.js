/*! ProgDealer widget: the next prog shows of an artist, festival, city, country or genre. https://progdealer.com/widget */
(function () {
  'use strict';
  if (window.ProgDealerWidget) { window.ProgDealerWidget.scan(); return; }

  var SITE = 'https://progdealer.com';
  var BASE = SITE;
  try { if (document.currentScript && document.currentScript.src) BASE = new URL(document.currentScript.src).origin; } catch (e) { /* keep SITE */ }
  var KINDS = ['artist', 'festival', 'city', 'country', 'genre'];

  var CSS = [
    ':host{display:block;max-width:460px}',
    '.w{box-sizing:border-box;font:14px/1.4 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;background:#f6f2ea;color:#24261f;border:1px solid #24261f;border-radius:12px;overflow:hidden;text-align:left}',
    '.h{display:flex;align-items:baseline;justify-content:space-between;gap:12px;padding:12px 14px;border-bottom:1px solid #24261f}',
    '.t{font:17px/1.25 Georgia,"Times New Roman",serif;color:inherit;text-decoration:none}',
    '.t:hover{text-decoration:underline}',
    '.k{font:600 10px/1 ui-monospace,Menlo,Consolas,monospace;letter-spacing:.08em;text-transform:uppercase;color:#5b5a50;white-space:nowrap}',
    'ol{list-style:none;margin:0;padding:0}',
    'li+li{border-top:1px solid #ddd5c6}',
    'li a{display:grid;grid-template-columns:52px 1fr;column-gap:12px;align-items:center;padding:10px 14px;color:inherit;text-decoration:none}',
    'li a:hover,li a:focus-visible{background:#ece7dc;outline:none}',
    'time{grid-row:span 2;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:4px 0;border:1px solid #cfc6b5;border-radius:8px;background:#fff;font-family:ui-monospace,Menlo,Consolas,monospace;line-height:1.15;color:#1f5c5a}',
    'time b{font-size:17px}',
    'time span{font-size:10px;text-transform:uppercase;letter-spacing:.06em}',
    'time i{font-style:normal;font-size:9px;color:#5b5a50}',
    '.n,.s{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.n{font-weight:600}',
    '.s{font-size:12.5px;color:#5b5a50}',
    '.e{margin:0;padding:14px;color:#5b5a50}',
    '.f{display:flex;flex-wrap:wrap;justify-content:space-between;gap:6px 12px;padding:10px 14px;border-top:1px solid #24261f;font-size:12px;color:#5b5a50}',
    '.f a,::slotted(a){color:#1f5c5a;font-weight:600}',
    '.m{text-decoration:none}',
    '.dark{background:#24261f;color:#ece7dc;border-color:#4a4a41}',
    '.dark .h,.dark .f{border-color:#4a4a41}',
    '.dark li+li{border-color:#3a3b33}',
    '.dark li a:hover,.dark li a:focus-visible{background:#2e3029}',
    '.dark time{background:#2e3029;border-color:#4a4a41;color:#8fc7c2}',
    '.dark .k,.dark .s,.dark .e,.dark .f,.dark time i{color:#b9b4a6}',
    '.dark .f a,:host([data-theme=dark]) ::slotted(a){color:#8fc7c2}'
  ].join('');

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  // Only ever link to ProgDealer, whatever the response says.
  function safeUrl(u) {
    return typeof u === 'string' && u.indexOf(SITE + '/') === 0 ? u : SITE + '/';
  }

  function tracked(u) {
    var host = (location && location.hostname) || 'unknown';
    return u + (u.indexOf('?') < 0 ? '?' : '&') + 'utm_source=' + encodeURIComponent(host) + '&utm_medium=widget&utm_campaign=progdealer-widget';
  }

  function link(text, url, cls) {
    var a = el('a', cls, text);
    a.href = tracked(safeUrl(url));
    a.target = '_blank';
    a.rel = 'noopener';
    return a;
  }

  var lang = document.documentElement.lang || undefined;
  function dateParts(iso) {
    var d = new Date(iso + 'T12:00:00Z');
    var fmt = function (opts, locale) { return new Intl.DateTimeFormat(locale, Object.assign({ timeZone: 'UTC' }, opts)).format(d); };
    try {
      return { day: fmt({ day: 'numeric' }, lang), mon: fmt({ month: 'short' }, lang), year: String(d.getUTCFullYear()) };
    } catch (e) {
      try { return { day: fmt({ day: 'numeric' }), mon: fmt({ month: 'short' }), year: String(d.getUTCFullYear()) }; }
      catch (e2) { return { day: String(d.getUTCDate()), mon: '', year: String(d.getUTCFullYear()) }; }
    }
  }

  function draw(box, d, limit, keepCredit) {
    box.textContent = '';
    var head = el('div', 'h');
    head.appendChild(link(d ? d.title : 'Prog concerts', d ? d.url : SITE + '/', 't'));
    head.appendChild(el('span', 'k', 'Upcoming'));
    box.appendChild(head);

    var list = d && d.events ? d.events.slice(0, limit) : [];
    if (!list.length) {
      box.appendChild(el('p', 'e', d ? 'No upcoming dates listed right now.' : 'Dates are not available right now.'));
    } else {
      var ol = el('ol');
      list.forEach(function (ev) {
        var a = link('', ev.url);
        var p = dateParts(ev.date);
        var t = el('time');
        t.setAttribute('datetime', ev.date);
        t.appendChild(el('b', null, p.day));
        t.appendChild(el('span', null, p.mon));
        t.appendChild(el('i', null, p.year));
        a.appendChild(t);
        a.appendChild(el('span', 'n', ev.title));
        if (ev.sub && ev.sub !== ev.title) a.appendChild(el('span', 's', ev.sub));
        var li = el('li');
        li.appendChild(a);
        ol.appendChild(li);
      });
      box.appendChild(ol);
    }

    var foot = el('div', 'f');
    if (d && d.total > list.length) foot.appendChild(link('+' + (d.total - list.length) + ' more dates', d.url, 'm'));
    var credit = el('span');
    if (keepCredit) {
      credit.appendChild(el('slot')); // the page's own link to ProgDealer, kept in its HTML
    } else {
      credit.appendChild(document.createTextNode('Listings by '));
      credit.appendChild(link('ProgDealer', SITE + '/'));
    }
    foot.appendChild(credit);
    box.appendChild(foot);
  }

  function render(host) {
    if (host.getAttribute('data-pd-ready') || !host.attachShadow) return;
    var kind = null;
    var slug = null;
    for (var i = 0; i < KINDS.length; i++) {
      var v = host.getAttribute('data-' + KINDS[i]);
      if (v && v.trim()) { kind = KINDS[i]; slug = v.trim().toLowerCase(); break; }
    }
    if (!kind) return;
    host.setAttribute('data-pd-ready', '1');

    var limit = parseInt(host.getAttribute('data-limit'), 10);
    if (!(limit >= 1)) limit = 5;
    if (limit > 10) limit = 10;
    var keepCredit = !!host.querySelector('a[href*="progdealer.com"]');

    var root = host.shadowRoot || host.attachShadow({ mode: 'open' });
    root.textContent = '';
    var style = el('style');
    style.textContent = CSS;
    root.appendChild(style);
    var box = el('div', host.getAttribute('data-theme') === 'dark' ? 'w dark' : 'w');
    box.appendChild(el('p', 'e', 'Loading prog dates…'));
    root.appendChild(box);

    fetch(BASE + '/api/widget/' + kind + '/' + encodeURIComponent(slug))
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) { draw(box, d, limit, keepCredit); })
      .catch(function () { draw(box, null, limit, keepCredit); });
  }

  function scan() {
    var list = document.querySelectorAll('.progdealer-widget');
    for (var i = 0; i < list.length; i++) render(list[i]);
  }

  window.ProgDealerWidget = { scan: scan, render: render, version: 1 };
  scan();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scan);
})();
