const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function layout(title, bodyHtml) {
  return `<!doctype html><html><body style="margin:0;padding:0;background:#f3f5f7;font-family:Arial,Helvetica,sans-serif;color:#10202b">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f5f7;padding:28px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:14px;overflow:hidden">
<tr><td style="background:#0b2f40;padding:20px 28px;font-size:22px;font-weight:700;color:#ffffff">League<span style="color:#facc15">Score</span></td></tr>
<tr><td style="padding:28px">
<h2 style="margin:0 0 14px;font-size:20px">${esc(title)}</h2>${bodyHtml}
</td></tr>
<tr><td style="padding:16px 28px;background:#f8fafc;font-size:12px;color:#6b7b88">This is an automated message from LeagueScore. Please do not reply.</td></tr>
</table></td></tr></table></body></html>`;
}

export function resetPasswordEmail({ name, link, minutes }) {
  const first = esc(String(name || "there").split(" ")[0]);
  const html = layout(
    "Reset your password",
    `<p style="margin:0 0 14px;line-height:1.55">Hi ${first},</p>
<p style="margin:0 0 20px;line-height:1.55">We received a request to reset the password for your LeagueScore account. Click the button below to choose a new password. This link is valid for ${minutes} minutes and can be used only once.</p>
<p style="margin:0 0 22px"><a href="${esc(link)}" style="display:inline-block;background:#facc15;color:#0b2f40;text-decoration:none;font-weight:700;padding:13px 26px;border-radius:10px">Reset Password</a></p>
<p style="margin:0 0 8px;font-size:13px;color:#6b7b88;line-height:1.5">If the button doesn't work, copy and paste this link into your browser:</p>
<p style="margin:0 0 20px;font-size:13px;word-break:break-all"><a href="${esc(link)}" style="color:#0b6e99">${esc(link)}</a></p>
<p style="margin:0;font-size:13px;color:#6b7b88;line-height:1.5">If you didn't request this, you can safely ignore this email — your password won't change.</p>`
  );
  const text = `Hi ${String(name || "there").split(" ")[0]},\n\nWe received a request to reset your LeagueScore password.\nOpen this link to choose a new password (valid for ${minutes} minutes, single use):\n\n${link}\n\nIf you didn't request this, ignore this email — your password won't change.`;
  return { subject: "Reset your LeagueScore password", html, text };
}

export function passwordChangedEmail({ name }) {
  const first = esc(String(name || "there").split(" ")[0]);
  const html = layout(
    "Your password was changed",
    `<p style="margin:0 0 14px;line-height:1.55">Hi ${first},</p>
<p style="margin:0;line-height:1.55">The password for your LeagueScore account was just changed. If this was you, no further action is needed. If it wasn't, please reset your password immediately and contact us.</p>`
  );
  const text = `Hi ${String(name || "there").split(" ")[0]},\n\nThe password for your LeagueScore account was just changed. If this wasn't you, reset your password immediately and contact us.`;
  return { subject: "Your LeagueScore password was changed", html, text };
}
