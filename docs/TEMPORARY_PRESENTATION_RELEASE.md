# Sinergi Global — Temporary Presentation Release

This release path is for showing the website at the existing Vercel alias while the client-owned Firebase project is not ready. It is **not** approval for full operational production.

## Scope

- Public homepage and design are available for presentation.
- Public site content may be read from `GAS_WEB_APP_URL` (site, programs and gallery only).
- The public GAS endpoint is read-only. It must never accept candidate applications or CV files.
- If the GAS response still contains legacy Synergy Indo Corpora / LPK wording, the website falls back to clearly labelled Sinergi Global preview content instead of showing the old brand.
- Candidate form controls and CV upload remain disabled.
- Keep `robots` set to `noindex, nofollow`.
- Firebase recruitment backend, privacy approval, official content approval, security QA, monitoring and backup/restore remain release blockers.

## Before showing the client

1. Open the exact deployment URL and check the site on desktop and mobile.
2. Confirm the ribbon identifies whether the page is using Google Sheets CMS or preview fallback content.
3. Check the company profile, sectors, gallery and contact details against content approved by the client.
4. Do not enter or upload real candidate personal data.

## Full production gate

Do not enable candidate collection or search indexing until the company approves official content and privacy wording, the client-owned Firebase project is configured, and end-to-end security and operational tests pass.
