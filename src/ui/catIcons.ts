/**
 * Line icons for the template categories (gallery tree, collection chips, row headings) — the same 24 px, 1.9-stroke,
 * round-cap style as the app's own icons in dom.ts, so they read as one set and follow the text colour (emoji looked
 * different on every phone and computer). Topics with a drawn topic icon (the 'icons' art collection, ic-<topic>)
 * can show that instead — see topicIcon().
 */
const CAT: Record<string, string> = {
  sports: '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4"/><path d="M12 13v4M8.5 20h7l-1-3h-5z"/>',
  entertainment: '<rect x="9" y="3" width="6" height="10" rx="3"/><path d="M6 11a6 6 0 0 0 12 0M12 17v4M9 21h6"/>',
  celebrations: '<path d="M4 20l4.5-11 6.5 6.5z"/><path d="M14 4.5c.5 1.5-.5 2.5 0 3.5M18.5 9.5c1-.5 2 .5 3 0M16 7l2-2"/><circle cx="20" cy="4" r=".6" fill="currentColor"/><circle cx="12.5" cy="3" r=".6" fill="currentColor"/>',
  islamic: '<path d="M14.5 4a8 8 0 1 0 5.5 13.5A7 7 0 1 1 14.5 4z"/><path d="M17.5 6.5l.7 1.5 1.6.2-1.2 1.1.3 1.6-1.4-.8-1.4.8.3-1.6-1.2-1.1 1.6-.2z"/>',
  jewish: '<path d="M12 3l7.8 13.5H4.2z"/><path d="M12 21L4.2 7.5h15.6z"/>',
  christian: '<path d="M12 3v18M7 8.5h10"/>',
  cultural: '<path d="M12 2.5v2.5M9 5h6M7.5 8.5C7.5 6.5 9.5 5 12 5s4.5 1.5 4.5 3.5v6c0 2-2 3.5-4.5 3.5s-4.5-1.5-4.5-3.5z"/><path d="M7.5 11.5h9M10 18v2.5h4V18"/>',
  baby: '<path d="M10 3h4M10.5 3v3.5M13.5 3v3.5M8.5 6.5h7l.5 3V19a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2V9.5z"/><path d="M8.5 12h7M8.5 15.5h7"/>',
  milestones: '<circle cx="12" cy="15" r="6"/><path d="M9.5 9.5L8 6l2-3h4l2 3-1.5 3.5"/><path d="M8 6h8"/>',
  community: '<circle cx="8" cy="8" r="3"/><circle cx="16.5" cy="9" r="2.5"/><path d="M2.5 20a5.5 5.5 0 0 1 11 0M13 20a4.5 4.5 0 0 1 8.5-2"/>',
  business: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M3 12.5h18M11 12.5v1.5h2v-1.5"/>',
  education: '<path d="M2.5 9L12 4.5 21.5 9 12 13.5z"/><path d="M6.5 11v4.5c0 1.5 2.5 3 5.5 3s5.5-1.5 5.5-3V11M21.5 9v5"/>',
  creators: '<rect x="6" y="2.5" width="12" height="19" rx="2.5"/><path d="M10.5 9v5l4-2.5z"/><path d="M10.5 18.5h3"/>',
};

/** A category's line icon (null when there's none). */
export function catIcon(id: string, size = 18): SVGSVGElement | null {
  const body = CAT[id];
  if (!body) return null;
  const wrap = document.createElement('div');
  wrap.innerHTML = `<svg class="cat-ic" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
  return wrap.firstElementChild as SVGSVGElement;
}

/** A topic's drawn icon from the 'icons' art collection (ic-<topic>), loaded on demand; null when the topic has none. */
export function topicIcon(topic: string, size = 28): HTMLElement | null {
  const id = `ic-${topic}`;
  const box = document.createElement('span');
  box.className = 'topic-ic';
  box.style.width = box.style.height = `${size}px`;
  box.setAttribute('aria-hidden', 'true');
  void Promise.all([import('../content/assets'), import('../content/art')]).then(async ([a, art]) => {
    await a.ensureArt([id]);
    const url = art.artById(id) ? art.artDataUrl(id, ['#d6336c', '#ffd6e4']) : '';
    if (!url) { box.remove(); return; }
    const img = document.createElement('img');
    img.src = url; img.alt = ''; img.width = img.height = size;
    box.append(img);
  }).catch(() => box.remove());
  return box;
}
