/** Fuzzies topic icons, part WORK — original flat vector artwork drawn in code. */
import type { AssetDef } from '../index';
import { asset, dk, lt, mix } from '../draw';
const A = asset('icons', ['icon']);

const SH = (rx = 72, cy = 212) => `<ellipse cx="120" cy="${cy}" rx="${rx}" ry="9" fill="#000" opacity=".10"/>`;
const R = 'stroke-linecap="round" stroke-linejoin="round"';
/** A heart about 180 wide, centred on (0, 0). */
const HEART = 'M0 82 C-80 34 -92 -6 -90 -30 C-88 -62 -62 -78 -40 -78 C-20 -78 -6 -66 0 -50 C6 -66 20 -78 40 -78 C62 -78 88 -62 90 -30 C92 -6 80 34 0 82 Z';
/** A scalloped badge outline (n bumps). */
const scallop = (cx: number, cy: number, r1: number, r2: number, n: number) => {
  let d = '';
  for (let i = 0; i < n * 2; i++) {
    const ang = (Math.PI * i) / n - Math.PI / 2, r = i % 2 ? r2 : r1;
    d += `${i ? 'L' : 'M'}${(cx + r * Math.cos(ang)).toFixed(1)} ${(cy + r * Math.sin(ang)).toFixed(1)} `;
  }
  return d + 'Z';
};
const star = (cx: number, cy: number, r: number) => scallop(cx, cy, r, r * 0.45, 5);

export const ICONS_WORK: AssetDef[] = [
  A('ic-promotion', 'Price tag', 'illustration', 240, 240, ['#e8546f', '#2a2f4a'], ['promotion', 'price', 'tag', 'deal', 'offer', 'discount', 'sale', 'shop'], ([m, a]) => `
    ${SH(70)}
    <path d="M96 88 C80 56 52 44 30 54" fill="none" stroke="${a}" stroke-width="10" ${R}/>
    <g transform="translate(124 114) scale(0.9) rotate(45) translate(-120 -118)">
      <path d="M26 118 L76 64 H196 Q214 64 214 82 V154 Q214 172 196 172 H76 Z" fill="${m}" ${R}/>
      <path d="M100 64 H196 Q214 64 214 82 V96 H100 Z" fill="${lt(m, 0.25)}"/>
      <circle cx="74" cy="118" r="14" fill="#ffffff"/>
      <circle cx="74" cy="118" r="14" fill="none" stroke="${a}" stroke-width="10"/>
      <path d="${star(150, 124, 30)}" fill="#ffffff" ${R} stroke="#ffffff" stroke-width="6"/>
    </g>`),

  A('ic-grand-opening', 'Ribbon cutting', 'illustration', 240, 240, ['#e8546f', '#2a2f4a'], ['grand opening', 'opening', 'ribbon', 'scissors', 'launch', 'new store', 'ceremony'], ([m, a]) => `
    ${SH(80, 214)}
    <path d="M16 86 Q68 74 120 86 T224 86 V116 Q172 104 120 116 T16 116 Z" fill="${m}"/>
    <path d="M16 86 Q68 74 120 86 T224 86 V96 Q172 84 120 96 T16 96 Z" fill="${lt(m, 0.3)}"/>
    <g transform="translate(-34 0)"><path d="M112 100 L92 152 L104 148 L110 160 L120 108 Z" fill="${dk(m, 0.18)}"/>
    <path d="M128 100 L148 152 L136 148 L130 160 L120 108 Z" fill="${dk(m, 0.18)}"/>
    <path d="M120 100 Q84 58 72 76 Q62 96 120 104 Z" fill="${m}" stroke="${dk(m, 0.18)}" stroke-width="8" ${R}/>
    <path d="M120 100 Q156 58 168 76 Q178 96 120 104 Z" fill="${m}" stroke="${dk(m, 0.18)}" stroke-width="8" ${R}/>
    <rect x="108" y="88" width="24" height="24" rx="8" fill="${dk(m, 0.18)}"/></g>
    <g transform="translate(172 168) rotate(-16)">
      <path d="M-4 0 L-20 -86 Q-16 -96 -8 -88 L8 -2 Z" fill="${lt(a, 0.8)}" stroke="${a}" stroke-width="8" ${R} transform="rotate(-18)"/>
      <path d="M4 0 L20 -86 Q16 -96 8 -88 L-8 -2 Z" fill="${lt(a, 0.8)}" stroke="${a}" stroke-width="8" ${R} transform="rotate(18)"/>
      <circle cx="-20" cy="26" r="15" fill="none" stroke="${a}" stroke-width="12"/>
      <circle cx="20" cy="26" r="15" fill="none" stroke="${a}" stroke-width="12"/>
      <path d="M-12 14 L-2 2 M12 14 L2 2" stroke="${a}" stroke-width="12" ${R}/>
      <circle cx="0" cy="0" r="6" fill="${a}"/>
    </g>`),

  A('ic-advertisement', 'Megaphone', 'illustration', 240, 240, ['#f08a24', '#26324d'], ['advertisement', 'ad', 'megaphone', 'marketing', 'promote', 'loud', 'campaign'], ([m, a]) => `
    ${SH(70, 210)}
    <path d="M78 140 L98 196 Q101 204 110 202 L124 198 Q132 196 129 188 L112 140 Z" fill="${a}"/>
    <rect x="24" y="96" width="36" height="52" rx="12" fill="${a}"/>
    <path d="M54 98 L156 52 V192 L54 146 Z" fill="${m}" ${R}/>
    <path d="M54 98 L156 52 V82 L54 116 Z" fill="${lt(m, 0.3)}"/>
    <ellipse cx="158" cy="122" rx="18" ry="70" fill="${dk(m, 0.2)}"/>
    <ellipse cx="160" cy="122" rx="9" ry="52" fill="${a}"/>
    <path d="M192 96 Q204 122 192 148" fill="none" stroke="${a}" stroke-width="11" ${R}/>
    <path d="M208 78 Q228 122 208 166" fill="none" stroke="${a}" stroke-width="11" ${R}/>`),

  A('ic-announcement', 'Ringing bell', 'illustration', 240, 240, ['#f2b134', '#2a2f4a'], ['announcement', 'bell', 'news', 'notice', 'alert', 'notification', 'update'], ([m, a]) => `
    ${SH(66, 214)}
    <circle cx="120" cy="46" r="13" fill="${a}"/>
    <path d="M56 164 Q68 150 70 116 Q72 58 120 54 Q168 58 170 116 Q172 150 184 164 Z" fill="${m}"/>
    <path d="M84 150 Q90 132 90 112 Q90 80 112 70" fill="none" stroke="#ffffff" stroke-width="10" ${R} opacity=".75"/>
    <rect x="44" y="158" width="152" height="24" rx="12" fill="${dk(m, 0.2)}"/>
    <circle cx="120" cy="196" r="16" fill="${a}"/>
    <path d="M40 70 Q30 90 36 112 M24 58 Q8 90 20 124" fill="none" stroke="${a}" stroke-width="10" ${R}/>
    <path d="M200 70 Q210 90 204 112 M216 58 Q232 90 220 124" fill="none" stroke="${a}" stroke-width="10" ${R}/>`),

  A('ic-sale', 'Percent badge', 'illustration', 240, 240, ['#e8546f', '#2a2f4a'], ['sale', 'percent', 'discount', 'deal', 'offer', 'off', 'clearance', 'badge'], ([m, a]) => `
    ${SH(70, 214)}
    <path d="${scallop(120, 116, 100, 86, 16)}" fill="${m}" stroke="${m}" stroke-width="10" ${R}/>
    <circle cx="120" cy="116" r="70" fill="${a}"/>
    <circle cx="120" cy="116" r="70" fill="none" stroke="${lt(m, 0.45)}" stroke-width="6" stroke-dasharray="2 12" ${R}/>
    <circle cx="94" cy="90" r="15" fill="none" stroke="#ffffff" stroke-width="11"/>
    <circle cx="146" cy="142" r="15" fill="none" stroke="#ffffff" stroke-width="11"/>
    <path d="M150 84 L90 148" stroke="#ffffff" stroke-width="13" ${R}/>`),

  A('ic-presentation', 'Chart on an easel', 'illustration', 240, 240, ['#3b82c4', '#26324d'], ['presentation', 'chart', 'easel', 'board', 'meeting', 'pitch', 'report', 'business', 'slides'], ([m, a]) => `
    ${SH(60, 214)}
    <path d="M120 150 L76 210 M120 150 L164 210 M120 150 V204" stroke="${a}" stroke-width="12" ${R}/>
    <rect x="112" y="20" width="16" height="22" rx="6" fill="${a}"/>
    <rect x="28" y="36" width="184" height="124" rx="14" fill="${a}"/>
    <rect x="38" y="46" width="164" height="104" rx="8" fill="#ffffff"/>
    <rect x="58" y="108" width="26" height="32" rx="5" fill="${lt(m, 0.45)}"/>
    <rect x="96" y="88" width="26" height="52" rx="5" fill="${lt(m, 0.2)}"/>
    <rect x="134" y="66" width="26" height="74" rx="5" fill="${m}"/>
    <path d="M60 94 L98 72 L118 82 L170 56" fill="none" stroke="${a}" stroke-width="8" ${R}/>
    <path d="M156 52 L176 52 L174 72" fill="none" stroke="${a}" stroke-width="8" ${R}/>`),

  A('ic-hiring', 'Briefcase', 'illustration', 240, 240, ['#3b82c4', '#26324d'], ['hiring', 'job', 'briefcase', 'career', 'work', 'business', 'office', 'recruit'], ([m, a]) => `
    ${SH(84, 212)}
    <path d="M88 76 V58 Q88 46 100 46 H140 Q152 46 152 58 V76" fill="none" stroke="${a}" stroke-width="13" ${R}/>
    <rect x="24" y="74" width="192" height="130" rx="22" fill="${m}"/>
    <path d="M24 96 Q24 74 46 74 H194 Q216 74 216 96 V130 Q120 150 24 130 Z" fill="${lt(m, 0.22)}"/>
    <path d="M24 130 Q120 150 216 130" fill="none" stroke="${dk(m, 0.22)}" stroke-width="8" ${R}/>
    <rect x="102" y="120" width="36" height="34" rx="8" fill="${a}"/>
    <rect x="113" y="130" width="14" height="10" rx="3" fill="${lt(m, 0.6)}"/>
    <path d="M40 104 Q40 90 54 90" fill="none" stroke="#ffffff" stroke-width="8" ${R} opacity=".7"/>`),

  A('ic-restaurant', 'Plate and cutlery', 'illustration', 240, 240, ['#2fa58c', '#26324d'], ['restaurant', 'food', 'dining', 'menu', 'plate', 'fork', 'knife', 'dinner', 'cafe'], ([m, a]) => `
    ${SH(70, 212)}
    <circle cx="120" cy="122" r="68" fill="${m}"/>
    <circle cx="120" cy="122" r="46" fill="${lt(m, 0.55)}"/>
    <circle cx="120" cy="122" r="46" fill="none" stroke="${lt(m, 0.25)}" stroke-width="6"/>
    <path d="M86 100 Q92 84 108 80" fill="none" stroke="#ffffff" stroke-width="8" ${R} opacity=".8"/>
    <path d="M22 34 V74 Q22 88 36 88 Q50 88 50 74 V34" fill="none" stroke="${a}" stroke-width="9" ${R}/>
    <path d="M36 34 V80" stroke="${a}" stroke-width="9" ${R}/>
    <rect x="29" y="84" width="14" height="122" rx="7" fill="${a}"/>
    <path d="M198 34 Q224 52 222 124 H200 Z" fill="${a}" ${R} stroke="${a}" stroke-width="6"/>
    <rect x="198" y="118" width="16" height="88" rx="8" fill="${a}"/>`),

  A('ic-school-event', 'School building', 'illustration', 240, 240, ['#e8546f', '#2a2f4a'], ['school', 'school event', 'education', 'building', 'campus', 'open house', 'class'], ([m, a]) => `
    ${SH(96, 208)}
    <path d="M120 54 V18" stroke="${a}" stroke-width="8" ${R}/>
    <path d="M124 18 L154 28 L124 38 Z" fill="${m}" stroke="${m}" stroke-width="6" ${R}/>
    <rect x="28" y="112" width="184" height="92" rx="6" fill="${m}"/>
    <rect x="20" y="102" width="200" height="16" rx="8" fill="${a}"/>
    <rect x="80" y="86" width="80" height="118" fill="${lt(m, 0.25)}"/>
    <path d="M70 92 L120 50 L170 92 Z" fill="${a}" ${R} stroke="${a}" stroke-width="10"/>
    <circle cx="120" cy="80" r="14" fill="#ffffff"/>
    <path d="M120 72 V80 L126 84" fill="none" stroke="${a}" stroke-width="5" ${R}/>
    <path d="M104 204 V168 Q104 152 120 152 Q136 152 136 168 V204 Z" fill="${a}"/>
    <rect x="94" y="114" width="20" height="22" rx="4" fill="#ffffff"/>
    <rect x="126" y="114" width="20" height="22" rx="4" fill="#ffffff"/>
    <rect x="40" y="132" width="26" height="26" rx="5" fill="#ffffff"/>
    <rect x="174" y="132" width="26" height="26" rx="5" fill="#ffffff"/>
    <rect x="40" y="168" width="26" height="22" rx="5" fill="${lt(m, 0.7)}"/>
    <rect x="174" y="168" width="26" height="22" rx="5" fill="${lt(m, 0.7)}"/>`),

  A('ic-club', 'Puzzle pieces', 'illustration', 240, 240, ['#2fa58c', '#f2b134'], ['club', 'puzzle', 'team', 'together', 'group', 'community', 'members', 'join'], ([m, a]) => `
    ${SH(80, 214)}
    <g transform="translate(-6 0)">
      <g transform="translate(9 0)">
        <path d="M120 66 H204 V174 H169.7 A16 16 0 1 1 154.3 174 H120 V129 L122.4 129 A18 18 0 1 0 122.4 111 L120 111 Z" fill="${a}" ${R}/>
        <path d="M150 82 H186" stroke="#ffffff" stroke-width="8" ${R} opacity=".55"/>
      </g>
      <path d="M36 66 H70.3 A16 16 0 1 1 85.7 66 H120 V111 L122.4 111 A18 18 0 1 1 122.4 129 L120 129 V174 H36 Z" fill="${m}" ${R}/>
      <path d="M52 84 V110" stroke="#ffffff" stroke-width="8" ${R} opacity=".55"/>
    </g>`),

  A('ic-student-activity', 'Paint palette', 'illustration', 240, 240, ['#f2b134', '#3b82c4'], ['student activity', 'activities', 'art', 'paint', 'palette', 'brush', 'creative', 'craft', 'club'], ([m, a]) => `
    ${SH(80, 212)}
    <path fill-rule="evenodd" d="M116 36 C176 34 214 72 212 118 C210 152 184 160 166 146 C150 134 132 142 138 162 C146 188 122 206 92 202 C46 196 22 158 26 116 C30 70 66 38 116 36 Z M90 160 m-14 0 a14 14 0 1 0 28 0 a14 14 0 1 0 -28 0 Z" fill="${m}"/>
    <circle cx="70" cy="98" r="15" fill="${a}"/>
    <circle cx="108" cy="70" r="15" fill="${lt(a, 0.45)}"/>
    <circle cx="152" cy="74" r="15" fill="#ffffff"/>
    <circle cx="66" cy="140" r="12" fill="${dk(m, 0.25)}"/>
    <g transform="rotate(42 160 130)">
      <rect x="150" y="80" width="20" height="108" rx="10" fill="${a}"/>
      <rect x="148" y="68" width="24" height="20" rx="4" fill="${lt(a, 0.55)}"/>
      <path d="M150 70 Q148 44 160 30 Q172 44 170 70 Z" fill="${dk(m, 0.25)}"/>
    </g>`),

  A('ic-awards', 'Trophy', 'illustration', 240, 240, ['#f2b134', '#2a2f4a'], ['awards', 'trophy', 'winner', 'prize', 'champion', 'cup', 'award ceremony', 'first place'], ([m, a]) => `
    ${SH(64, 212)}
    <path d="M72 66 H50 Q38 66 40 82 Q44 116 82 124" fill="none" stroke="${dk(m, 0.2)}" stroke-width="13" ${R}/>
    <path d="M168 66 H190 Q202 66 200 82 Q196 116 158 124" fill="none" stroke="${dk(m, 0.2)}" stroke-width="13" ${R}/>
    <path d="M66 40 H174 V86 Q174 146 120 152 Q66 146 66 86 Z" fill="${m}"/>
    <path d="M84 52 V86 Q84 110 96 124" fill="none" stroke="#ffffff" stroke-width="9" ${R} opacity=".6"/>
    <path d="${star(122, 90, 24)}" fill="#ffffff" stroke="#ffffff" stroke-width="5" ${R}/>
    <path d="M108 150 H132 L136 176 H104 Z" fill="${dk(m, 0.2)}"/>
    <rect x="74" y="172" width="92" height="32" rx="8" fill="${a}"/>
    <rect x="96" y="182" width="48" height="12" rx="4" fill="${m}"/>`),

  A('ic-certificate', 'Diploma with seal', 'illustration', 240, 240, ['#3b82c4', '#e8546f'], ['certificate', 'diploma', 'graduation', 'award', 'achievement', 'degree', 'recognition', 'scroll'], ([m, a]) => `
    ${SH(84, 210)}
    <g transform="rotate(-24 120 112)">
      <rect x="28" y="90" width="176" height="48" fill="${lt(m, 0.72)}"/>
      <rect x="28" y="90" width="176" height="14" fill="${lt(m, 0.86)}"/>
      <ellipse cx="204" cy="114" rx="13" ry="24" fill="${m}"/>
      <ellipse cx="204" cy="114" rx="5" ry="10" fill="${dk(m, 0.2)}"/>
      <ellipse cx="28" cy="114" rx="13" ry="24" fill="${m}"/>
      <rect x="96" y="86" width="24" height="56" rx="4" fill="${a}"/>
    </g>
    <path d="M136 168 L120 210 L134 204 L142 216 L152 176 Z" fill="${dk(a, 0.2)}"/>
    <path d="M176 168 L192 210 L178 204 L170 216 L160 176 Z" fill="${dk(a, 0.2)}"/>
    <path d="${scallop(156, 156, 34, 28, 12)}" fill="${a}" stroke="${a}" stroke-width="6" ${R}/>
    <circle cx="156" cy="156" r="20" fill="${lt(a, 0.35)}"/>
    <path d="${star(156, 157, 13)}" fill="#ffffff"/>`),

  A('ic-back-to-school', 'Pencil and ruler', 'illustration', 240, 240, ['#f2b134', '#3b82c4'], ['back to school', 'school', 'pencil', 'ruler', 'supplies', 'stationery', 'first day', 'class'], ([m, a]) => `
    ${SH(80, 214)}
    <g transform="rotate(-45 120 118)">
      <rect x="24" y="96" width="192" height="44" rx="8" fill="${a}"/>
      <path d="M44 96 V116 M64 96 V108 M84 96 V116 M104 96 V108 M124 96 V116 M144 96 V108 M164 96 V116 M184 96 V108" stroke="#ffffff" stroke-width="6" ${R}/>
    </g>
    <g transform="rotate(45 120 118)">
      <rect x="54" y="100" width="128" height="36" fill="${m}"/>
      <rect x="54" y="100" width="128" height="12" fill="${lt(m, 0.35)}"/>
      <rect x="36" y="100" width="22" height="36" rx="3" fill="${lt(a, 0.55)}"/>
      <path d="M24 100 H40 V136 H24 Q16 136 16 128 V108 Q16 100 24 100 Z" fill="${mix(m, a, 0.5)}"/>
      <path d="M182 100 L222 118 L182 136 Z" fill="${lt(m, 0.7)}" stroke="${lt(m, 0.7)}" stroke-width="4" ${R}/>
      <path d="M208 112 L222 118 L208 124 Z" fill="${a}" stroke="${a}" stroke-width="4" ${R}/>
    </g>`),

  A('ic-science-fair', 'Bubbling flask', 'illustration', 240, 240, ['#2fa58c', '#26324d'], ['science fair', 'science', 'flask', 'beaker', 'chemistry', 'lab', 'experiment', 'stem'], ([m, a]) => `
    ${SH(74, 214)}
    <circle cx="136" cy="30" r="9" fill="${lt(m, 0.35)}"/>
    <circle cx="110" cy="20" r="6" fill="${lt(m, 0.35)}"/>
    <circle cx="124" cy="46" r="5" fill="${lt(m, 0.35)}"/>
    <path d="M104 66 V104 L50 186 Q42 204 64 204 H176 Q198 204 190 186 L136 104 V66 Z" fill="${lt(m, 0.8)}"/>
    <path d="M73 151 Q96 140 120 151 T167 151 L190 186 Q198 204 176 204 H64 Q42 204 50 186 Z" fill="${m}"/>
    <circle cx="96" cy="176" r="9" fill="#ffffff" opacity=".8"/>
    <circle cx="132" cy="182" r="6" fill="#ffffff" opacity=".8"/>
    <circle cx="118" cy="164" r="5" fill="#ffffff" opacity=".8"/>
    <path d="M104 66 V104 L50 186 Q42 204 64 204 H176 Q198 204 190 186 L136 104 V66" fill="none" stroke="${a}" stroke-width="11" ${R}/>
    <rect x="92" y="56" width="56" height="16" rx="8" fill="${a}"/>
    <path d="M118 84 V104" stroke="#ffffff" stroke-width="7" ${R} opacity=".8"/>`),

  A('ic-class-workshop', 'Notebook and pen', 'illustration', 240, 240, ['#e8546f', '#26324d'], ['class', 'workshop', 'notebook', 'pen', 'notes', 'study', 'lesson', 'course', 'training'], ([m, a]) => `
    ${SH(80, 214)}
    <rect x="40" y="30" width="128" height="178" rx="14" fill="${m}"/>
    <rect x="58" y="30" width="110" height="178" rx="10" fill="${lt(m, 0.88)}"/>
    <path d="M78 74 H148 M78 102 H148 M78 130 H148 M78 158 H130" stroke="${lt(m, 0.45)}" stroke-width="7" ${R}/>
    <path d="M30 56 H58 M30 92 H58 M30 128 H58 M30 164 H58" stroke="${a}" stroke-width="11" ${R}/>
    <g transform="rotate(30 176 124)">
      <rect x="164" y="34" width="26" height="136" rx="10" fill="${a}"/>
      <rect x="164" y="132" width="26" height="14" fill="${lt(a, 0.5)}"/>
      <path d="M164 160 H190 L180 194 Q177 200 174 194 Z" fill="${lt(m, 0.5)}" stroke="${lt(m, 0.5)}" stroke-width="4" ${R}/>
      <path d="M173 190 L177 200 L181 190 Z" fill="${a}"/>
      <path d="M184 44 V100" stroke="${lt(a, 0.5)}" stroke-width="6" ${R}/>
    </g>`),

  A('ic-quote', 'Quote bubble', 'illustration', 240, 240, ['#3b82c4', '#26324d'], ['quote', 'quotation', 'saying', 'motivation', 'inspiration', 'testimonial', 'words', 'speech'], ([m, a]) => `
    ${SH(70, 214)}
    <path d="M56 46 H190 Q218 46 218 74 V150 Q218 178 190 178 H96 L60 206 L66 178 H56 Q28 178 28 150 V74 Q28 46 56 46 Z" fill="${a}" transform="translate(-6 6)"/>
    <path d="M56 36 H190 Q218 36 218 64 V140 Q218 168 190 168 H96 L60 196 L66 168 H56 Q28 168 28 140 V64 Q28 36 56 36 Z" fill="${m}"/>
    <path d="M70 92 Q70 64 100 58 L104 70 Q90 76 88 90 Q110 88 110 108 Q110 128 90 128 Q70 128 70 104 Z" fill="#ffffff"/>
    <path d="M128 92 Q128 64 158 58 L162 70 Q148 76 146 90 Q168 88 168 108 Q168 128 148 128 Q128 128 128 104 Z" fill="#ffffff"/>`),

  A('ic-giveaway', 'Gift box', 'illustration', 240, 240, ['#e8546f', '#f2b134'], ['giveaway', 'gift', 'present', 'prize', 'contest', 'win', 'free', 'surprise'], ([m, a]) => `
    ${SH(84, 212)}
    <rect x="44" y="104" width="152" height="102" rx="10" fill="${m}"/>
    <rect x="44" y="104" width="152" height="18" fill="${dk(m, 0.18)}"/>
    <rect x="32" y="76" width="176" height="38" rx="10" fill="${lt(m, 0.15)}"/>
    <rect x="106" y="76" width="28" height="130" fill="${a}"/>
    <path d="M120 76 Q86 30 66 46 Q50 62 80 74 Q100 80 120 76 Z" fill="${a}" stroke="${a}" stroke-width="6" ${R}/>
    <path d="M120 76 Q154 30 174 46 Q190 62 160 74 Q140 80 120 76 Z" fill="${a}" stroke="${a}" stroke-width="6" ${R}/>
    <path d="M116 72 Q92 46 78 56" fill="none" stroke="${dk(a, 0.2)}" stroke-width="6" ${R}/>
    <path d="M124 72 Q148 46 162 56" fill="none" stroke="${dk(a, 0.2)}" stroke-width="6" ${R}/>
    <rect x="106" y="62" width="28" height="22" rx="8" fill="${dk(a, 0.15)}"/>
    <path d="M56 136 V180" stroke="#ffffff" stroke-width="8" ${R} opacity=".55"/>`),

  A('ic-youtube', 'Video player', 'illustration', 240, 240, ['#3b82c4', '#26324d'], ['youtube', 'video', 'vlog', 'channel', 'play', 'stream', 'watch', 'thumbnail', 'creator'], ([m, a]) => `
    ${SH(88, 214)}
    <rect x="22" y="40" width="196" height="150" rx="30" fill="${m}"/>
    <circle cx="120" cy="104" r="40" fill="${a}"/>
    <path d="M108 84 L140 104 L108 124 Z" fill="#ffffff" stroke="#ffffff" stroke-width="8" ${R}/>
    <rect x="44" y="164" width="152" height="10" rx="5" fill="${lt(m, 0.45)}"/>
    <rect x="44" y="164" width="76" height="10" rx="5" fill="#ffffff"/>
    <circle cx="120" cy="169" r="10" fill="#ffffff"/>`),

  A('ic-travel', 'Paper plane', 'illustration', 240, 240, ['#3b82c4', '#26324d'], ['travel', 'trip', 'journey', 'flight', 'vacation', 'holiday', 'paper plane', 'adventure'], ([m, a]) => `
    <path d="M92 156 C70 178 54 198 30 196 C14 194 14 176 30 170" fill="none" stroke="${a}" stroke-width="10" stroke-dasharray="14 16" ${R}/>
    <path d="M214 30 L28 106 L94 128 Z" fill="${m}" stroke="${m}" stroke-width="8" ${R}/>
    <path d="M214 30 L94 128 L104 176 Z" fill="${dk(m, 0.3)}" stroke="${dk(m, 0.3)}" stroke-width="8" ${R}/>
    <path d="M214 30 L104 146 L150 178 Z" fill="${lt(m, 0.35)}" stroke="${lt(m, 0.35)}" stroke-width="8" ${R}/>`),

  A('ic-retirement', 'Beach umbrella', 'illustration', 240, 240, ['#e8546f', '#f2b134'], ['retirement', 'retire', 'beach', 'umbrella', 'vacation', 'relax', 'sun', 'summer', 'farewell'], ([m, a]) => `
    <circle cx="186" cy="54" r="26" fill="${a}"/>
    <path d="M186 14 V20 M186 88 V94 M146 54 H152 M220 54 H226 M158 26 L162 30 M210 78 L214 82 M214 26 L210 30" stroke="${a}" stroke-width="8" ${R}/>
    <path d="M16 216 Q110 166 224 216 Z" fill="${lt(a, 0.55)}"/>
    <g transform="rotate(-14 110 120)">
      <path d="M110 40 V200" stroke="${dk(a, 0.45)}" stroke-width="10" ${R}/>
      <path d="M24 118 Q24 46 110 40 Q196 46 196 118 Q174.5 102 153 118 Q131.5 102 110 118 Q88.5 102 67 118 Q45.5 102 24 118 Z" fill="${m}"/>
      <path d="M110 40 Q80 52 67 118 Q88.5 102 110 118 Z" fill="${lt(m, 0.7)}"/>
      <path d="M110 40 Q196 46 196 118 Q174.5 102 153 118 Q144 56 110 40 Z" fill="${lt(m, 0.7)}"/>
      <circle cx="110" cy="38" r="8" fill="${dk(a, 0.45)}"/>
    </g>`),

  A('ic-valentines', 'Heart with arrow', 'illustration', 240, 240, ['#e8546f', '#2a2f4a'], ['valentines', "valentine's day", 'love', 'heart', 'cupid', 'arrow', 'romance', 'february'], ([m, a]) => `
    ${SH(66, 214)}
    <path d="M38 186 L204 50" stroke="${a}" stroke-width="10" ${R}/>
    <path d="${HEART}" transform="translate(120 118) scale(0.92)" fill="${m}"/>
    <path d="M66 70 Q50 84 54 104" fill="none" stroke="#ffffff" stroke-width="10" ${R} opacity=".7"/>
    <path d="M170 78 L204 50" stroke="${a}" stroke-width="10" ${R}/>
    <path d="M214 40 L184 48 L206 70 Z" fill="${a}" stroke="${a}" stroke-width="8" ${R}/>
    <path d="M38 186 L17 185 M38 186 L35 207 M50 176 L29 175 M50 176 L47 197" stroke="${a}" stroke-width="9" ${R}/>`),

  A('ic-anniversary', 'Two hearts', 'illustration', 240, 240, ['#e8546f', '#f2b134'], ['anniversary', 'love', 'hearts', 'couple', 'together', 'wedding anniversary', 'romance', 'celebration'], ([m, a]) => `
    ${SH(84, 212)}
    <path d="${HEART}" transform="translate(152 120) rotate(14) scale(0.7)" fill="${a}"/>
    <path d="${HEART}" transform="translate(88 114) rotate(-14) scale(0.7)" fill="${m}"/>
    <path d="M44 72 Q32 82 34 98" fill="none" stroke="#ffffff" stroke-width="9" ${R} opacity=".7"/>
    <path d="M178 78 Q192 88 192 106" fill="none" stroke="#ffffff" stroke-width="9" ${R} opacity=".6"/>
    <path d="${star(206, 34, 14)}" fill="${a}" stroke="${a}" stroke-width="4" ${R}/>
    <path d="${star(30, 196, 10)}" fill="${m}" stroke="${m}" stroke-width="4" ${R}/>`),
];
