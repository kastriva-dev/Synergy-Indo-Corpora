# Recruitment backend setup — Firebase

The active website runtime uses Cloud Firestore for recruitment jobs, application metadata, upload intents and audit logs, and Cloud Storage for public media and private CV PDFs. GAS, Google Sheets and Google Drive are retained only as historical source/reference and are not called by the current runtime.

Before testing, follow docs/FIREBASE_SETUP.md to create a client-owned staging Firebase project, enable Google Authentication, set up a least-privilege service account, configure deployment secrets and deploy the locked-down rules.

Security controls:
- The candidate form remains disabled in source until written company/legal approval.
- Use synthetic candidate data only.
- CVs remain under candidate-cvs/ without a public download token; admin CV downloads go through an authenticated Next.js server endpoint.
- Public image assets are stored separately under public-media/.
- PDFs are limited to 3 MiB, checked for the PDF signature and tied to a short-lived, one-time upload intent.
- FIREBASE_PRIVATE_KEY and service-account credentials are server-only. Never use a NEXT_PUBLIC_ prefix, log them, or put them in Git.
- Cloud Storage for Firebase requires Blaze with a linked billing account. Cloud usage charges are paid by the client and are not included in the Rp16,000,000 service fee.
- Deletion permanently removes the CV object and anonymizes application fields; this must still be verified with staging tests and the approved retention policy.
