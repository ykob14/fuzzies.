/**
 * "Publish as template" (template managers only): saves the open design to the shared catalog with its metadata —
 * name, category › topic, style, colours, occasion, tags — and a preview picture. A design that came from a
 * published template can update that template (new revision) or become a new one. Loaded only when used.
 */
import type { Editor } from './editor';
import type { Design } from './types';
import { prepare, pageCanvas } from './render';
import { CATEGORIES_TREE, formatFor, metaById, styleWords, subById } from '../content/library/catalog';
import { manager, type ManagedTemplate } from '../content/library/admin';
import { h, btn, modal, toast } from '../ui/dom';

/** A preview picture (JPEG data URL, longest side 520 px) of the first page. */
async function previewPicture(d: Design): Promise<string | null> {
  try {
    await prepare(d, [d.pages[0]]);
    const c = pageCanvas(d, d.pages[0], 520 / Math.max(d.width, d.height));
    return c.toDataURL('image/jpeg', 0.84);
  } catch { return null; }
}

export async function publishDialog(ed: Editor): Promise<void> {
  ed.finishTextEdit();
  ed.save.flush();
  const d = ed.design;
  // what we know already: the published template this design came from, or the library template it started as
  let existing: ManagedTemplate | null = null;
  if (d.template?.startsWith('pub-')) existing = await manager.get(d.template).then((r) => r.meta).catch(() => null);
  const origin = existing ?? (d.template ? metaById(d.template) : undefined);

  const { styles, colors } = styleWords();
  const name = h('input', { class: 'input', value: existing?.name ?? d.name, maxlength: '80', 'aria-label': 'Template name' });
  const cat = h('select', { class: 'input', 'aria-label': 'Category' }, ...CATEGORIES_TREE.map((c) => h('option', { value: c.id, selected: origin?.category === c.id }, `${c.emoji} ${c.label}`)));
  const sub = h('select', { class: 'input', 'aria-label': 'Topic' });
  const fillSubs = (want?: string) => {
    const c = CATEGORIES_TREE.find((x) => x.id === cat.value) ?? CATEGORIES_TREE[0];
    sub.replaceChildren(...c.subcategories.map((s) => h('option', { value: s.id, selected: s.id === want }, `${s.emoji} ${s.label}`)));
  };
  fillSubs(origin?.sub);
  cat.addEventListener('change', () => fillSubs());
  const style = h('select', { class: 'input', 'aria-label': 'Style' }, ...styles.map((s) => h('option', { value: s, selected: origin?.style === s }, s)));
  const picked = new Set<string>(origin?.colors ?? []);
  const colorChips = h('div', { class: 'chips' }, ...colors.map((c) => {
    const b = h('button', { type: 'button', class: `chip ${picked.has(c) ? 'on' : ''}`, 'aria-pressed': String(picked.has(c)) }, c);
    b.addEventListener('click', () => {
      if (picked.has(c)) picked.delete(c); else if (picked.size < 3) picked.add(c); else { toast('Pick up to 3 colours', 'info'); return; }
      b.classList.toggle('on', picked.has(c)); b.setAttribute('aria-pressed', String(picked.has(c)));
    });
    return b;
  }));
  const occasion = h('input', { class: 'input', value: origin?.occasion ?? '', placeholder: 'e.g. tryouts, opening-night, sale', maxlength: '40', 'aria-label': 'Occasion' });
  const tags = h('input', { class: 'input', value: (existing?.tags ?? []).join(', '), placeholder: 'Extra search words, separated by commas', 'aria-label': 'Search words' });
  const asNew = h('input', { type: 'checkbox' });
  const field = (label: string, el: HTMLElement, hint?: string) => h('label', { class: 'field' }, h('span', null, label), el, hint ? h('small', { class: 'muted' }, hint) : null);
  const pic = h('div', { class: 'pub-pic' }, h('span', { class: 'ph-spin' }));
  let thumb: string | null = null;
  void previewPicture(d).then((t) => { thumb = t; pic.replaceChildren(t ? h('img', { src: t, alt: 'Preview' }) : h('small', { class: 'muted' }, 'No preview')); });

  const run = async (status: 'draft' | 'published', b: HTMLButtonElement) => {
    const n = name.value.trim();
    if (!n) { name.focus(); toast('Give the template a name', 'bad'); return; }
    b.disabled = true;
    try {
      const { format, formatLabel } = formatFor(d.width, d.height, d.pages.length);
      const id = existing && !asNew.checked ? existing.id : undefined;
      const s = subById(sub.value);
      const meta = {
        id, name: n, category: cat.value, sub: sub.value, format, formatLabel, width: d.width, height: d.height, pages: d.pages.length,
        style: style.value, colors: [...picked], occasion: occasion.value.trim().toLowerCase().replace(/\s+/g, '-'),
        tags: [...new Set([...tags.value.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean), ...(s?.sub.keywords.slice(0, 6) ?? [])])].slice(0, 30),
      };
      // the stored template is a clean copy: no owner, folder, thumbnail or the editor's ids
      const { folder: _f, thumb: _t, ...rest } = JSON.parse(JSON.stringify(d)) as Design;
      const doc: Design = { ...rest, owner: 'system', name: n };
      const r = await manager.save(meta, doc, thumb, status);
      d.template = r.id; // next time this design offers "update"
      ed.commit();
      mo.close();
      toast(status === 'published' ? `“${n}” is live in Templates${r.revision > 1 ? ` (version ${r.revision})` : ''}` : `“${n}” saved as a draft`, 'good');
    } catch (e) {
      toast((e as Error).message || 'Could not save the template.', 'bad');
      b.disabled = false;
    }
  };
  const draftBtn = btn('Save draft', { kind: 'ghost', onClick: () => void run('draft', draftBtn as HTMLButtonElement) }) as HTMLButtonElement;
  const pubBtn = btn(existing ? 'Publish update' : 'Publish', { kind: 'primary', icon: 'upload', onClick: () => void run('published', pubBtn as HTMLButtonElement) }) as HTMLButtonElement;
  asNew.addEventListener('change', () => { pubBtn.querySelector('span:last-child')!.textContent = asNew.checked ? 'Publish' : 'Publish update'; });

  const body = h('div', { class: 'pub-form' },
    pic,
    h('div', { class: 'pub-fields' },
      existing ? h('p', { class: 'pub-note' }, `This design is the template “${existing.name}” (${existing.status === 'published' ? 'live' : 'draft'}, version ${existing.version}). Publishing updates it for everyone.`) : null,
      existing ? h('label', { class: 'check' }, asNew, 'Save as a new template instead') : null,
      field('Name', name),
      h('div', { class: 'pub-two' }, field('Category', cat), field('Topic', sub)),
      h('div', { class: 'pub-two' }, field('Style', style), field('Occasion', occasion)),
      field('Colours (up to 3)', colorChips),
      field('Search words', tags, 'The topic’s own keywords are added automatically.'),
      h('p', { class: 'muted pub-small' }, `${formatFor(d.width, d.height, d.pages.length).formatLabel} · ${d.width} × ${d.height} px · ${d.pages.length} page${d.pages.length > 1 ? 's' : ''}. Everyone who uses it gets their own editable copy.`)));
  const mo = modal(existing ? 'Update template' : 'Publish as template', body, { wide: true, actions: [draftBtn, pubBtn] });
}
