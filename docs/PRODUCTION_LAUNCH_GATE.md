# Sinergi Global — Production Launch Gate

Status: DRAFT / RELEASE BLOCKED. A green CI run does not establish that Firebase permissions, candidate privacy or complete end-to-end workflows have passed.

## Current target architecture

- Next.js server routes mediate CMS, vacancy, media and CV access.
- Admin identity uses nonce-validated Google Identity Services plus Firebase Authentication. A Firebase ID token is checked before the existing signed, HTTP-only admin session is issued.
- Cloud Firestore stores CMS content, recruitment jobs, upload intents, candidate applications and audit events.
- Cloud Storage separates public site images from private candidate CV PDFs.
- Firestore and Storage client rules deny direct browser reads/writes. Server access uses service-account IAM plus server-side sessions, origin validation, input validation and rate limits.
- Previous GAS source remains only for historical reference and is not called by the current runtime.

## Required server environment

- FIREBASE_PROJECT_ID
- FIREBASE_CLIENT_EMAIL
- FIREBASE_PRIVATE_KEY (server-only)
- FIREBASE_STORAGE_BUCKET
- FIREBASE_WEB_API_KEY
- GOOGLE_CLIENT_ID
- ADMIN_ALLOWED_EMAILS
- ADMIN_SESSION_SECRET
- Upstash Redis REST URL/token pair
- CANDIDATE_PRIVACY_NOTICE_VERSION only after written company/legal approval
- CANDIDATE_PRIVACY_NOTICE_APPROVED=true only after written company/legal approval
- CANDIDATE_RETENTION_DAYS (approved duration from 1–3650 days)
- CRON_SECRET (server-only)

Never commit service-account keys or expose them in client-side variables, browser bundles, chat, screenshots or logs. Firebase project, bucket and billing should be owned by the client.

## Firebase setup gate

1. Provision a client-owned staging Firebase project and default Storage bucket.
2. Enable the Google provider in Firebase Authentication and allow the exact Preview domain.
3. Create a dedicated service account and grant minimum Firestore/Storage IAM roles.
4. Deploy the deny-by-default Firestore and Storage rules.
5. Configure Preview-only credentials; never reuse Production secrets in Preview.
6. Verify service-account authentication, Firestore reads/writes, public media upload, private CV upload/download/deletion.
7. Review and import public profile/program/gallery data from the old source. Migration is not automatic.

## Legal and operational blockers

- Final Indonesian candidate privacy notice approved by company/legal reviewer; identify the legal data controller and official contact.
- Document purposes/legal basis, Firebase services and data location, access roles, possible cross-border processing, candidate rights, retention/deletion and incident contact.
- Confirm Firebase project, bucket, billing, service-account and backup ownership/access.
- Verify every public vacancy and company statement. Replace placeholder copy and images before indexing.
- Confirm monitoring, backup/restore, account recovery and operational handover.

## Mandatory Preview tests

- Unauthenticated browser clients cannot read/write Firestore or access private Storage objects directly.
- Approved admin signs in with the expected Google account through Firebase Authentication. Unauthorized email, invalid token, missing nonce and replayed nonce are rejected.
- CMS reads/writes and image uploads work; only approved public-media URLs render.
- Only published, non-expired vacancies appear publicly and can be applied to.
- Candidate form remains unavailable while the source privacy gate is false.
- With synthetic data, test PDF signature and size, expiring upload intent, one-time intent consumption, invalid origin, malformed input, non-PDF and files over 3 MiB.
- A valid synthetic application creates exactly one record and atomically consumes its intent.
- CV download requires admin session, returns private/no-store headers and writes a minimal audit event.
- Deletion removes the private file and anonymizes personal fields; retention cleanup is repeatable.
- Upstash failure is fail-closed; request limits return 429. Test login/logout/session expiry, CSRF, XSS, CSP, clickjacking, security headers, mobile/accessibility and backup/restore.
- Run npm ci, npm audit --audit-level=high, npm run typecheck, npm run build and browser regression tests.

## VPS facility supplied by the client

The client has stated a VPS with 500 GB storage and one year of service is available. Provider, OS, CPU/RAM, administrator access and backup facilities have not been verified. It is not the primary database/file store in this Firebase-first architecture. It may be evaluated later for a separately agreed supporting role, monitoring/backup or hosting.

## Release remains blocked

- This code change did not create a Firebase project, Storage bucket, billing account or deployment secrets.
- Candidate privacy notice remains a draft and the source gate PRIVACY_NOTICE_APPROVED_IN_CODE remains false. Do not collect real candidate CVs.
- Firebase permissions, Authentication, media upload, recruitment workflows, deletion, retention and backup/restore need Preview integration tests.
- Earlier site-wide security QA remains outstanding.
- No merge to main, Production deployment or DNS changes are authorized by this document.
