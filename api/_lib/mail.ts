/**
 * Sending email (password reset links) through Resend's HTTP API — no extra packages.
 * Setup (see BACKEND.md): RESEND_API_KEY in Vercel; optional MAIL_FROM like "Fuzzies <hello@yourdomain.com>"
 * once your domain is verified in Resend (until then Resend's test sender only delivers to your own address).
 */
import { HttpError } from './auth.js';

/** The key as pasted into Vercel, forgiving stray spaces/quotes around it. */
const apiKey = (): string => (process.env.RESEND_API_KEY ?? '').trim().replace(/^["']|["']$/g, '').trim();

export const mailReady = (): boolean => !!apiKey();

/** Throws a friendly 503 when email isn't set up yet (so the app can say so). */
export function requireMail(): void {
  if (!mailReady()) throw new HttpError(503, 'Password reset by email isn’t switched on yet. (The app owner needs to add an email key in Vercel — see BACKEND.md.)');
}

export async function sendMail(to: string, m: { subject: string; html: string; text: string }): Promise<void> {
  requireMail();
  let res: Response;
  try {
    res = await fetch(process.env.RESEND_API_URL || 'https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: `Bearer ${apiKey()}`, 'content-type': 'application/json' },
      body: JSON.stringify({ from: process.env.MAIL_FROM || 'Fuzzies <onboarding@resend.dev>', to: [to], subject: m.subject, html: m.html, text: m.text }),
      signal: AbortSignal.timeout(10_000), // never let a slow email service hold up the request
    });
  } catch {
    throw new HttpError(502, 'We couldn’t send the email right now — please try again in a minute. (ref: mail network)');
  }
  if (!res.ok) {
    const body = (await res.text()).slice(0, 500);
    console.error('email not sent', res.status, body);
    let name = '';
    try { name = String(JSON.parse(body).name ?? ''); } catch { /* not JSON */ }
    // a safe hint about the key (never the key itself): does it look like a Resend key, and how long is it?
    const k = apiKey();
    const keyHint = `key ${k.startsWith('re_') ? 're_' : 'not re_'}…${k.length}`;
    if (name === 'validation_error' && res.status === 403 || /domain|verify|testing emails/i.test(body) && res.status === 403)
      throw new HttpError(502, 'We couldn’t send the email yet: the sender address isn’t verified in Resend (until it is, emails only go to the Resend account’s own address).');
    if (res.status === 401 || name === 'invalid_api_key' || name === 'missing_api_key' || name === 'restricted_api_key')
      throw new HttpError(502, `Email isn’t working yet: Resend didn’t accept the email key saved in Vercel. (ref: mail ${res.status} ${name || '-'} · ${keyHint})`);
    throw new HttpError(502, `We couldn’t send the email right now — please try again in a minute. (ref: mail ${res.status} ${name || '-'})`);
  }
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** The "reset your password" email, in the Fuzzies look (raspberry button on a calm card). */
export function resetEmail(username: string, link: string): { subject: string; html: string; text: string } {
  const u = esc(username), l = esc(link);
  return {
    subject: 'Reset your Fuzzies password',
    text: `Hi ${username},\n\nSomeone (hopefully you) asked to reset the password for your Fuzzies account.\nChoose a new password here (the link works for 1 hour, once):\n\n${link}\n\nDidn't ask for this? Just ignore this email — your password stays the same.\n\n— Fuzzies · Dream it fuzzy. Make it sharp.`,
    html: `<!doctype html><html><body style="margin:0;background:#f6f5f2;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#18171c">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f5f2;padding:32px 16px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:20px;padding:32px 28px">
<tr><td style="font-size:26px;font-weight:700;letter-spacing:-0.01em;padding-bottom:4px">fuzzies</td></tr>
<tr><td style="font-size:13px;color:#6c6670;padding-bottom:24px">Dream it fuzzy. Make it sharp.</td></tr>
<tr><td style="font-size:20px;font-weight:700;padding-bottom:12px">Reset your password</td></tr>
<tr><td style="font-size:15px;line-height:1.55;padding-bottom:24px">Hi ${u}! Someone (hopefully you) asked to reset the password for your Fuzzies account. Tap the button to choose a new one. The link works once, for 1 hour.</td></tr>
<tr><td style="padding-bottom:24px"><a href="${l}" style="display:inline-block;background:#d6336c;color:#ffffff;text-decoration:none;font-weight:700;font-size:16px;padding:14px 26px;border-radius:14px">Choose a new password</a></td></tr>
<tr><td style="font-size:13px;line-height:1.5;color:#6c6670;padding-bottom:8px">Button not working? Copy this link into your browser:<br><span style="word-break:break-all;color:#d6336c">${l}</span></td></tr>
<tr><td style="font-size:13px;line-height:1.5;color:#6c6670;padding-top:16px;border-top:1px solid #e7e3dc">Didn’t ask for this? Just ignore this email — your password stays the same.</td></tr>
</table></td></tr></table></body></html>`,
  };
}

/** "A wallet was linked to your account" — sent whenever a new wallet can log in to an account. */
export function walletLinkedEmail(username: string, address: string, wallet: string, profile: string): { subject: string; html: string; text: string } {
  const short = `${address.slice(0, 6)}…${address.slice(-4)}`;
  const u = esc(username), w = esc(wallet || 'A wallet'), a = esc(short), l = esc(profile);
  return {
    subject: 'A wallet was linked to your Fuzzies account',
    text: `Hi ${username},\n\n${wallet || 'A wallet'} (${short}) was just linked to your Fuzzies account, so it can now be used to log in.\n\nWasn't you? Open ${profile}, remove the wallet under "Crypto wallets" and change your password.\n\nFuzzies never asks for your recovery phrase and never asks you to send crypto.\n\n— Fuzzies · Dream it fuzzy. Make it sharp.`,
    html: `<!doctype html><html><body style="margin:0;background:#f6f5f2;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#18171c">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f5f2;padding:32px 16px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:20px;padding:32px 28px">
<tr><td style="font-size:26px;font-weight:700;letter-spacing:-0.01em;padding-bottom:4px">fuzzies</td></tr>
<tr><td style="font-size:13px;color:#6c6670;padding-bottom:24px">Dream it fuzzy. Make it sharp.</td></tr>
<tr><td style="font-size:20px;font-weight:700;padding-bottom:12px">A wallet was linked to your account</td></tr>
<tr><td style="font-size:15px;line-height:1.55;padding-bottom:24px">Hi ${u}! <b>${w}</b> (<span style="font-family:Menlo,monospace">${a}</span>) was just linked to your Fuzzies account, so it can now be used to log in.</td></tr>
<tr><td style="font-size:15px;line-height:1.55;padding-bottom:24px">Wasn’t you? Remove it under <b>Crypto wallets</b> in your Profile and change your password.</td></tr>
<tr><td style="padding-bottom:24px"><a href="${l}" style="display:inline-block;background:#d6336c;color:#ffffff;text-decoration:none;font-weight:700;font-size:16px;padding:14px 26px;border-radius:14px">Open my Profile</a></td></tr>
<tr><td style="font-size:13px;line-height:1.5;color:#6c6670;padding-top:16px;border-top:1px solid #e7e3dc">Fuzzies never asks for your recovery phrase and never asks you to send crypto or approve a transaction.</td></tr>
</table></td></tr></table></body></html>`,
  };
}
