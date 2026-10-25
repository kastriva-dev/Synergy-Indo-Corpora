# Sinergi Global — Production Launch Gate

Status: DRAFT / RELEASE BLOCKED. Passing CI is not evidence that privacy, storage permissions, or recruitment workflows have passed.

## Current temporary architecture
- Next.js server endpoints call the private Google Apps Script admin gateway.
- Recruitment metadata is in a dedicated Google spreadsheet created by `setupSynergyRecruitmentStorage`; it is separate from the public CMS spreadsheet.
- Candidate CV PDFs are in a restricted Google Drive folder owned by the account that owns the private admin script.
- This temporary setup may use a personal Drive account for development, but must use synthetic test data only. Do not accept real candidate CVs before the company approves ownership, access, privacy, and retention arrangements.
- CV size limit is 3 MiB to remain below the 4.5 MB Vercel function request-body limit.
- Supabase/Firebase resources are not required by this branch.

## Required server-only environment
- `GAS_ADMIN_WEB_APP_URL`
- `GAS_ADMIN_SECRET`
- Existing `GOOGLE_CLIENT_ID`, `ADMIN_ALLOWED_EMAILS`, `ADMIN_SESSION_SECRET`
- Upstash Redis URL/token pair for distributed rate limits and one-time admin login nonces
- `CANDIDATE_PRIVACY_NOTICE_VERSION` only after company/legal approval
- `CANDIDATE_PRIVACY_NOTICE_APPROVED=true` only after company/legal approval
- `CANDIDATE_RETENTION_DAYS` (1–3650, approved duration)
- `CRON_SECRET` (server only)
Never place secrets in Git, screenshots, client-side environment variables, or chat.

## Storage setup
1. Review the private admin script and back it up.
2. Replace the private Apps Script source with `gas/AdminCode.gs`; do not touch the public read-only `gas/Code.gs` deployment.
3. Run `setupSynergyRecruitmentStorage` once while signed in to the intended temporary Drive owner account. Verify the recruitment spreadsheet and CV folder are not shared publicly or by link.
4. Deploy a new version of the private GAS web app, preserving its existing `/exec` URL.
5. Confirm a health check returns ready only when the dedicated spreadsheet and private folder are present.
6. Record who owns the personal account and who can access the files; plan account handover or VPS migration before production.

## Legal and operational blockers
- Final Indonesian privacy notice approved by the company/legal reviewer; identify the legal data controller and official contact.
- Document purposes, legal basis/consent, storage providers and location, access recipients, possible cross-border processing, candidate rights, retention, deletion and incident contact.
- Confirm role and retention policies, and whether use of an individual developer's Google account is accepted by the client.
- Verify every published vacancy and company content is official.
- Confirm data backup, restore, account recovery and operational ownership.

## Mandatory Preview tests
- Real Google Sheet/folder permissions are checked; an unauthenticated user cannot list candidate rows or fetch a CV.
- Candidate upload validates PDF signature and size, and does not set any file to `Anyone with the link`.
- A valid synthetic application writes exactly one candidate row and attaches the correct CV.
- Duplicate/replayed upload intent cannot create multiple applications.
- Reject >3 MiB files, false PDF MIME, non-PDF magic bytes, expired intent, draft/expired jobs, invalid consent, invalid origin and malformed fields.
- Admin without a session gets 401; admin job/status operations are same-origin and rate-limited.
- CV download requires admin session, returns no-store headers and writes a minimal audit record.
- Anonymization removes CV access and clears personal fields. The current Drive delete action uses Trash; implement and verify permanent deletion before production if the retention/privacy policy requires irreversible erasure.
- Expired orphaned uploads are cleaned; retention cleanup does not expose personal data in responses/logs.
- Upstash rate limit failures fail closed with 503; request limits return 429.
- Test login, logout/session expiration, CSRF, XSS, CSP, clickjacking, cache/security headers, mobile/accessibility and backup/restore.
- Run `npm ci`, `npm audit --audit-level=high`, `npm run typecheck`, `npm run build`, and browser regression tests.

## VPS migration gate
Before moving from Drive/Sheets to the client's VPS, confirm provider/OS/access and backup facilities. Export row data and CV files over a protected channel, map Drive IDs to VPS file identifiers, preserve consent/retention/audit metadata, verify record counts and checksums, test role-based downloads, and keep a rollback copy. Then replace the storage adapter and test again. Do not assume a provider switch automatically migrates stored files.

## Explicitly not complete
- The privacy notice remains a draft and `PRIVACY_NOTICE_APPROVED_IN_CODE` is hardcoded `false`; the public form stays disabled.
- No real candidate data should be collected in this stage.
- Apps Script deployment, actual Drive/Sheets permissions, rate limits, upload workflow, deletion and backup/restore have not yet been integration-tested.
- PR #1/#2 security QA and site-wide CSP/security checks remain outstanding.
- This document does not authorize production deployment, DNS changes, merging, or exposing the admin backend.
