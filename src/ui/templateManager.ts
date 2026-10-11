/**
 * Template manager (template managers only, see content/library/admin.ts): every template saved to the shared catalog
 * with its status, plus publish / unpublish / edit / delete, and — only when the site has an AI key — "Draft with AI":
 * Claude writes the wording, the library's layout engine lays it out, and the manager opens one in the editor to
 * finish and publish. New templates are made in the editor: Download → Publish as template.
 */
import { manager, type ManagedTemplate } from '../content/library/admin';
import { CATEGORIES_TREE, draftDesigns, subById } from '../content/library/catalog';
import { instantiate } from '../editor/doc';
import { prepare, pageCanvas } from '../editor/render';
import type { Design } from '../editor/types';
import { accounts } from '../core/account';
import { h, btn, modal, toast, confirmDialog } from './dom';
import { saveAndOpen } from './create';
import { waitFonts } from './libthumbs';

async function picture(d: Design, max = 220): Promise<string> {
  await prepare(d, [d.pages[0]]);
  return pageCanvas(d, d.pages[0], max / Math.max(d.width, d.height)).toDataURL('image/jpeg', 0.8);
}

export function openTemplateManager(ai: boolean): void {
  const list = h('div', { class: 'tm-list' }, h('div', { class: 'lib-loading' }, h('span', { class: 'ph-spin' }), 'Loading templates…'));

  async function refresh(): Promise<void> {
    let items: ManagedTemplate[];
    try { items = await manager.list(); } catch (e) { list.replaceChildren(h('p', { class: 'muted' }, (e as Error).message)); return; }
    if (!items.length) { list.replaceChildren(h('p', { class: 'muted' }, 'No templates saved yet. Open any design, then Download → Publish as template.')); return; }
    list.replaceChildren(...items.map(row));
  }

  function row(m: ManagedTemplate): HTMLElement {
    const topic = subById(m.sub);
    const live = m.status === 'published';
    const toggle = btn(live ? 'Unpublish' : 'Publish', { kind: live ? 'ghost' : 'primary', size: 'sm', onClick: async () => {
      toggle.disabled = true;
      try { await manager.publish(m.id, !live); toast(live ? `“${m.name}” is hidden from Templates` : `“${m.name}” is live`, 'good'); await refresh(); } catch (e) { toast((e as Error).message, 'bad'); toggle.disabled = false; }
    } });
    const edit = btn('Edit', { kind: 'ghost', size: 'sm', icon: 'edit', onClick: async () => {
      try {
        const { doc } = await manager.get(m.id);
        // the manager's own editable copy; it remembers the template so "Update template" replaces it
        const d = instantiate(doc, accounts.current?.id ?? '', m.name, m.id);
        mo.close();
        await saveAndOpen(d);
      } catch (e) { toast((e as Error).message, 'bad'); }
    } });
    const del = btn(null, { kind: 'ghost', size: 'sm', icon: 'trash', title: `Delete “${m.name}”`, onClick: async () => {
      if (!(await confirmDialog('Delete this template?', `“${m.name}” is removed from the catalog for everyone. Designs people already made from it are kept.`))) return;
      try { await manager.remove(m.id); toast('Template deleted', 'good'); await refresh(); } catch (e) { toast((e as Error).message, 'bad'); }
    } });
    return h('div', { class: 'tm-row' },
      h('div', { class: 'tm-pic' }, live && m.thumb ? h('img', { src: m.thumb, alt: '', loading: 'lazy' }) : h('span', null, topic?.sub.emoji ?? '🖼️')),
      h('div', { class: 'tm-info' }, h('b', null, m.name), h('small', { class: 'muted' }, [topic ? `${topic.cat.label} › ${topic.sub.label}` : '', m.formatLabel, `v${m.version}`, new Date(m.addedAt).toLocaleDateString()].filter(Boolean).join(' · '))),
      h('span', { class: `tm-status ${live ? 'live' : ''}` }, live ? 'Live' : 'Draft'),
      h('div', { class: 'tm-actions' }, edit, toggle, del));
  }

  // ---------- AI drafting (only when switched on for the site) ----------
  function aiCard(): HTMLElement {
    const cat = h('select', { class: 'input', 'aria-label': 'Category' }, ...CATEGORIES_TREE.map((c) => h('option', { value: c.id }, `${c.emoji} ${c.label}`)));
    const sub = h('select', { class: 'input', 'aria-label': 'Topic' });
    const fillSubs = () => sub.replaceChildren(...(CATEGORIES_TREE.find((c) => c.id === cat.value) ?? CATEGORIES_TREE[0]).subcategories.map((s) => h('option', { value: s.id }, `${s.emoji} ${s.label}`)));
    fillSubs();
    cat.addEventListener('change', fillSubs);
    const brief = h('textarea', { class: 'input', rows: 2, maxlength: '400', placeholder: 'What is it for? e.g. “Under-12 pickleball open day, friendly, parents welcome”', 'aria-label': 'Describe the template' });
    const out = h('div', { class: 'tm-drafts' });
    const go = btn('Write 3 ideas', { kind: 'primary', icon: 'sparkles', onClick: async () => {
      const s = subById(sub.value);
      if (!s) return;
      go.disabled = true;
      out.replaceChildren(h('div', { class: 'lib-loading' }, h('span', { class: 'ph-spin' }), 'Claude is writing…'));
      try {
        const [drafts] = await Promise.all([manager.draft(brief.value, `${s.cat.label} › ${s.sub.label}`, 3), waitFonts()]);
        out.replaceChildren(h('p', { class: 'muted tm-ai-note' }, 'Written by Claude (AI). Pick a layout to open it in the editor — check every word, then Download → Publish as template.'));
        for (const [i, ev] of drafts.entries()) {
          const options = draftDesigns(s.sub.id, ev, 3, i * 7);
          const strip = h('div', { class: 'tm-draft-strip' });
          out.append(h('div', { class: 'tm-draft' }, h('div', null, h('b', null, ev.title), h('small', { class: 'muted' }, ` · ${ev.kicker} · ${ev.cta}`)), strip));
          for (const o of options) {
            const b = h('button', { type: 'button', class: 'tm-draft-pic', title: `Open “${ev.title}” (${o.label}) in the editor` }, h('span', { class: 'ph-spin' }), h('small', null, o.label));
            b.addEventListener('click', async () => {
              const d = instantiate(o.design, accounts.current?.id ?? '', ev.title);
              mo.close();
              await saveAndOpen(d);
            });
            strip.append(b);
            void picture(o.design).then((src) => b.firstChild!.replaceWith(h('img', { src, alt: '' }))).catch(() => b.firstChild!.remove());
          }
        }
      } catch (e) {
        out.replaceChildren(h('p', { class: 'muted' }, (e as Error).message || 'AI drafting failed — try again.'));
      } finally { go.disabled = false; }
    } });
    return h('section', { class: 'tm-ai' }, h('h3', null, 'Draft with AI'),
      h('div', { class: 'pub-two' }, cat, sub), brief, h('div', { class: 'btn-row' }, go), out);
  }

  const body = h('div', { class: 'tm' },
    h('p', { class: 'muted' }, 'Templates you publish appear in Templates for everyone, next to the built-in library. To add one, design it in the editor, then Download → Publish as template.'),
    ai ? aiCard() : null,
    h('h3', null, 'Saved templates'), list);
  const mo = modal('Manage templates', body, { wide: true });
  void refresh();
}
