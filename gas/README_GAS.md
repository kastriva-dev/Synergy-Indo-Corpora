# Google Apps Script, Sheets, Drive — Sinergi Global

## Public CMS (existing)
- `gas/Code.gs` is the public **read-only** content API for published CMS values. Keep it separate and do not add candidate data or admin writes to it.
- Its existing `SYNERGY_SPREADSHEET_ID` points to the website content spreadsheet.
- The media upload/admin gateway is a separate Apps Script project using `gas/AdminCode.gs` and `SYNERGY_ADMIN_SECRET`.

## Temporary recruitment storage
1. Open the **private admin Apps Script project** that backs `GAS_ADMIN_WEB_APP_URL`. Back up its current code first.
2. Replace the source with `gas/AdminCode.gs` from this branch. Keep its existing `SYNERGY_ADMIN_SECRET` and `SYNERGY_SPREADSHEET_ID` Script Properties.
3. Run `setupSynergyRecruitmentStorage` once from that private script editor and authorize Google Sheets/Drive. It creates a separate `SINERGI_GLOBAL_RECRUITMENT_PRIVATE_DB` spreadsheet and `SINERGI_GLOBAL_CANDIDATE_CVS_PRIVATE` folder in the account that owns/runs the script.
4. Verify the spreadsheet and folder are private. Do not enable `Anyone with the link`. Do not move the candidate tabs into the public CMS spreadsheet.
5. Deploy the private script as a new version while keeping the existing `/exec` URL unchanged.
6. In the website's Preview environment, verify `GAS_ADMIN_WEB_APP_URL` and `GAS_ADMIN_SECRET` are correct. Do not paste secrets into Git or client-side environment variables.

## Temporary-account warning
This setup uses the Google account that owns the private Apps Script deployment. Confirm it is the intended personal account if using personal Drive temporarily. Use synthetic test data only until Sinergi Global approves the final privacy notice, retention policy and storage ownership. The recruitment form is deliberately disabled in code until approval.

## File and data design
- CV PDFs: private Drive folder, 3 MiB maximum.
- Candidate records, upload intents, job postings and audit metadata: separate private Google spreadsheet.
- Public CMS data stays on the existing CMS spreadsheet and public read-only script.
- Admin endpoints proxy through the Next.js server and keep the Apps Script secret server-side.
- Deletion currently moves a CV to Drive Trash and anonymizes its record; permanent deletion still needs policy-driven validation before production.

## Later VPS migration
The storage adapter is in `lib/recruitment/store.ts`. Moving to VPS will still require a controlled export/import of candidate rows and files, mapping file identifiers, validating counts/checksums, securing access, testing backup/restore, and rotating credentials. A code/provider swap by itself does not migrate stored data.
