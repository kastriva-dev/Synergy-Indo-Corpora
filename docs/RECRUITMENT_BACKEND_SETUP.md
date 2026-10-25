# Recruitment backend setup — Google Drive + Sheets (temporary staging)

This branch uses the existing private Google Apps Script admin gateway. It does not require a Supabase or Firebase project.

## Important staging rule
The spreadsheet and CV folder are created in the Google Drive account that owns/runs the **private admin Apps Script deployment**. Confirm that this is the intended temporary personal account before running setup. Keep both items private. Use synthetic test data only; do not collect real candidate CVs until the company approves the final privacy notice and all release gates pass.

## 1. Update the private Apps Script project
1. Open the separate admin Apps Script project that currently serves `GAS_ADMIN_WEB_APP_URL`. Do **not** paste this code into the public read-only `gas/Code.gs` deployment.
2. Make a backup of its current source.
3. Replace the private admin code with `gas/AdminCode.gs` from this branch, save, and keep the existing Script Properties `SYNERGY_ADMIN_SECRET` and `SYNERGY_SPREADSHEET_ID`.
4. Select and run `setupSynergyRecruitmentStorage` once. Authorize Google Sheets and Google Drive access. It creates a separate recruitment spreadsheet and a folder named `SINERGI_GLOBAL_CANDIDATE_CVS_PRIVATE` in the executing account. It stores the IDs in Script Properties.
5. Check the Execution log and the Drive sharing settings. Neither the recruitment spreadsheet nor the CV folder may be shared by link, publicly, or with an unrestricted domain.
6. Deploy the private script as a **new version** while preserving the existing `/exec` URL. Never add candidate records to the public content script.

## 2. Environment (Preview only while in development)
Keep these server-only variables configured in the website project:
- `GAS_ADMIN_WEB_APP_URL`
- `GAS_ADMIN_SECRET`
- The existing admin authentication and Upstash rate-limit variables.
- `CANDIDATE_PRIVACY_NOTICE_APPROVED=false`
- `CANDIDATE_PRIVACY_NOTICE_VERSION=` (blank until approved)
- `CANDIDATE_RETENTION_DAYS=` (blank until approved)
- `CRON_SECRET=` (server-only)

Never use a `NEXT_PUBLIC_` prefix for secrets. No Supabase keys are needed by this branch.

## 3. CV handling
- The website accepts PDF files up to **3 MiB**; this is below Vercel's 4.5 MB function request-body limit and leaves room for request overhead.
- A CV is sent from the browser to the Next.js server, validated, then saved by the private GAS gateway into the restricted Drive folder. The browser never receives the GAS shared secret or a public Drive link.
- Application metadata is written to a **separate private Google spreadsheet**, not the public CMS spreadsheet.
- The folder and files must remain private; no `Anyone with the link` access is used.
- The current delete/retention routine moves a CV to Google Drive Trash and anonymizes its row. This is not the same as irreversible permanent erasure; production approval requires an explicitly tested permanent-deletion and recovery policy.

## 4. Current safety gate
The form remains disabled because `PRIVACY_NOTICE_APPROVED_IN_CODE` is intentionally `false`. Do not change it just to test an upload. The company must approve the notice, the retention period, ownership/access, and cross-border/vendor disclosures first. CI checks source and build only; it does not prove the Drive folder, Sheets permissions, or upload workflow work in the live Apps Script deployment.

## 5. Moving to the client VPS later
This implementation keeps storage access behind `lib/recruitment/store.ts`, so application routes do not directly depend on Google Sheets APIs. However, switching to VPS is **not just changing an environment variable**: candidate rows and file bytes must be exported/imported, references mapped, access controls applied, totals and checksums verified, backups/restore tested, and secrets rotated. Do not move real candidate data to the VPS until the client agreement and infrastructure access are confirmed.
