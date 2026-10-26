# Sinergi Global — Firebase setup

This implementation uses Cloud Firestore for site CMS data, vacancies, application records, upload intents and audit metadata. Cloud Storage stores public site media and private candidate CV PDFs. The Next.js server accesses Firebase services using a dedicated service account. The browser does not receive the service-account credential.

## 1. Project ownership and billing

1. Create or select a Firebase project owned by Sinergi Global / PT Sinergi Corpora Group. Kastriva should be a delegated developer rather than the permanent owner of business data and payment details.
2. Create a separate staging project first. Agree who pays cloud invoices and who may access candidate data.
3. Enable Cloud Firestore and select the database location only after the company reviews residency, latency and legal requirements. Location is a durable decision.
4. Create the default Cloud Storage bucket. Cloud Storage for Firebase requires the Blaze pay-as-you-go plan and a linked Cloud Billing account. Costs are separate from the agreed website development fee. See Firebase's current Cloud Storage billing requirements at https://firebase.google.com/docs/storage/faqs-storage-changes-announced-sept-2024.
5. Enable Firebase Authentication and Google as a sign-in provider. Add the relevant staging/production domains to Authorized domains.
6. Register the current web app and obtain its Firebase Web API key. Restrict the key to necessary APIs and approved sites. It is not a substitute for protecting the server key.

## 2. Service account and secret storage

1. Create a dedicated service account in the client-owned Google Cloud project.
2. Grant only the required permissions. Suggested starting roles are Cloud Datastore User for Firestore operations and Storage Object Admin scoped to the application bucket. Confirm IAM scope with the client's cloud administrator.
3. Put these values only in the deployment's server-side environment: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY, and FIREBASE_STORAGE_BUCKET.
4. Configure FIREBASE_WEB_API_KEY, GOOGLE_CLIENT_ID, ADMIN_ALLOWED_EMAILS, ADMIN_SESSION_SECRET, and the Upstash rate-limit environment variables.
5. Never commit service-account JSON, private keys, .env.local, Firebase refresh tokens, or secrets to Git or screenshots. Use separate credentials for staging and production.

## 3. Collections and Storage paths

- site_content/public: company profile and public contact fields.
- programs: CMS program/content cards.
- gallery: gallery cards.
- recruitment_jobs: draft and published vacancies.
- candidate_upload_intents: short-lived, one-time upload state.
- candidate_applications: candidate data, consent version, status and retention timestamp.
- candidate_audit: minimal admin/system audit events.
- public-media/: images intended to appear on the public website. The server grants Firebase download tokens only to these assets.
- candidate-cvs/: private CV PDFs. No public download token is created; downloads are proxied through the protected Next.js admin endpoint.

The supplied Firestore and Storage rules deny direct client reads/writes. Server calls use the service account and are governed by IAM plus the application's session, origin, validation and rate-limit controls.

## 4. Migrating existing CMS content safely

A no-dependency migration utility is included at scripts/migrate-gas-cms-to-firebase.mjs. It reads only CMS site, programs and gallery records from the old private GAS admin gateway. It never requests candidate records or CVs.

1. Keep the legacy GAS admin deployment available for the one-time export. Use its server-side URL and secret locally only. Do not put the secret into the example environment, GitHub, Vercel client variables or chat.
2. In a local uncommitted .env.local, temporarily define GAS_ADMIN_WEB_APP_URL and GAS_ADMIN_SECRET together with staging Firebase values. For the meeting-preview branch only, the public website can temporarily read CMS data from `GAS_WEB_APP_URL` (site, programs, and gallery only). Candidate applications and CVs are never handled by GAS. Firebase remains the production target; remove `GAS_WEB_APP_URL` after the meeting/content migration so the runtime returns to Firebase CMS.
3. Preview the export first: node --env-file=.env.local scripts/migrate-gas-cms-to-firebase.mjs
4. Review the summary and make sure the selected Firebase project is the staging project owned by the client. The default run does not write data.
5. Only after reviewing the actual content preview and making a backup, select what truly belongs on the new brand. For example, to import only the profile fields use: node --env-file=.env.local scripts/migrate-gas-cms-to-firebase.mjs --apply --site. To import approved work-area cards and gallery as well, explicitly add --programs and/or --gallery. The command --apply without a collection flag is rejected.
6. Verify site text, image URLs, program/gallery counts, preserved IDs, and published/draft visibility in Firestore and Vercel Preview. Keep the legacy spreadsheet/export until the company signs off.
7. If an image or field is rejected by validation, review it with the company and edit the source deliberately rather than weakening the URL allowlist.

The migration upserts only explicitly selected CMS collections by existing IDs so repeated runs update the same records. Legacy LPK content may not belong to Sinergi Global; inspect the full preview and do not import an old profile, program or gallery item unless the company approves it. It does not migrate applicant records, CV files or admin account secrets. Existing approved Unsplash/Drive image URLs remain accepted; new CMS uploads use Firebase Storage.

## 5. Preview configuration and checks

1. Use .env.example to create local .env.local, using staging credentials only.
2. Deploy the Firestore and Storage rules from firebase/firestore.rules and firebase/storage.rules to the staging Firebase project.
3. Test the sign-in exchange: Google GIS token and nonce are checked first; the ID token returned by Firebase Authentication is then verified against the configured project before a local admin session is issued.
4. Test CMS read/save, upload of synthetic images, draft/published rendering, creation and editing of vacancies, synthetic PDF upload/download, status changes, deletion, cleanup and backups.
5. Run npm ci, npm audit --audit-level=high, npm run typecheck, npm run build, and the browser QA described in docs/PRODUCTION_LAUNCH_GATE.md. A successful build is not an integration test.

## 6. Billing and monitoring

Use the client's billing account. Configure budget notifications and review Firestore operations, stored bytes, storage download/egress, retention/deletion and any backup/export costs. Budget alerts notify the owner; they do not automatically guarantee that billing stops. Cloud service costs remain separate from the development fee.

## 7. Candidate privacy release gate

The public candidate form remains disabled in source by PRIVACY_NOTICE_APPROVED_IN_CODE = false. Keep CANDIDATE_PRIVACY_NOTICE_APPROVED=false and leave notice version and retention unset while the notice is in draft. Do not change the code gate or collect real CVs until the company signs off on the data controller/contact, purposes and legal basis, providers/location, access list, candidate rights, retention/deletion, backups and incident contact. Use synthetic data only in staging.
