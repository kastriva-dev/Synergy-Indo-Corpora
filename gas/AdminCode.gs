/**
 * SYNERGY INDO CORPORA | PRIVATE ADMIN WRITE GATEWAY
 * By Kastriva — separate Apps Script project from the public read-only GAS.
 *
 * Script Properties (do not commit their actual values):
 * SYNERGY_SPREADSHEET_ID = spreadsheet ID belonging to company
 * SYNERGY_ADMIN_SECRET  = random 64+ character secret, matching Vercel GAS_ADMIN_SECRET
 *
 * Deploy as Web app: execute as ME, access ANYONE. Requests must come from
 * Next.js server after Google sign-in, not from a browser with the secret.
 * Never add GET endpoints returning registration or admin data.
 */

var ADMIN_SITE_KEYS = ["hero_eyebrow", "hero_title_1", "hero_title_2", "hero_title_accent", "hero_description", "about_description", "contact_whatsapp", "contact_email", "contact_address"];
var ADMIN_PROGRAM_KEYS = ["id", "title", "category", "description", "duration", "image_url", "published", "order"];
var ADMIN_GALLERY_KEYS = ["id", "title", "category", "image_url", "published", "order"];

function adminJson_(body) {
  return ContentService.createTextOutput(JSON.stringify(body)).setMimeType(ContentService.MimeType.JSON);
}

function safeText_(value, max) {
  if (typeof value !== "string" || value.length > max) throw new Error("Nilai teks tidak valid.");
  // Prevent interpreting user supplied spreadsheet values as formulas.
  return /^[\s]*[=+\-@]/.test(value) ? "'" + value : value;
}

function allowedImage_(value) {
  if (value === "") return true;
  if (typeof value !== "string" || value.length > 700) return false;
  // Avoid relying on URL Web APIs which may not exist in Apps Script's V8 runtime.
  if (/^https:\/\/images\.unsplash\.com\/photo-[A-Za-z0-9_-]+(?:\?[A-Za-z0-9_=&.%+-]+)?$/.test(value)) return true;
  return /^https:\/\/drive\.google\.com\/thumbnail\?id=[A-Za-z0-9_-]{15,120}&sz=w[0-9]{2,4}$/.test(value);
}

function isValidId_(value) { return typeof value === "string" && /^[a-zA-Z0-9-]{3,80}$/.test(value); }

function compareSecret_(actual, expected) {
  if (typeof actual !== "string" || typeof expected !== "string" || expected.length < 32) return false;
  // Loop over expected length; compares all chars even after a mismatch.
  var diff = actual.length ^ expected.length;
  for (var i = 0; i < expected.length; i++) diff |= (actual.charCodeAt(i) || 0) ^ expected.charCodeAt(i);
  return diff === 0;
}

function postSource_(name) {
  var ids = PropertiesService.getScriptProperties();
  var spreadsheetId = ids.getProperty("SYNERGY_SPREADSHEET_ID");
  if (!spreadsheetId) throw new Error("Spreadsheet ID belum ditentukan.");
  var sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName(name);
  if (!sheet) throw new Error("Tab tidak ditemukan: " + name);
  return sheet;
}

function writeSite_(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new Error("Data profil tidak valid.");
  var keys = Object.keys(payload);
  if (!keys.length || keys.some(function(k) { return ADMIN_SITE_KEYS.indexOf(k) < 0; })) throw new Error("Kolom profil tidak dikenali.");
  var sheet = postSource_("site");
  var rows = sheet.getDataRange().getValues();
  if (String(rows[0][0]) !== "key" || String(rows[0][1]) !== "value" || String(rows[0][2]) !== "published") throw new Error("Header tab site tidak cocok.");
  keys.forEach(function(key) {
    var value = safeText_(payload[key], 600);
    var index = -1;
    for (var i = 1; i < rows.length; i++) if (rows[i][0] === key) { index = i+1; break; }
    if (index > 0) {
      sheet.getRange(index, 2).setValue(value);
      sheet.getRange(index, 3).setValue(value.trim().length > 0);
    } else sheet.appendRow([key, value, value.trim().length > 0]);
  });
  return { ok: true };
}

function upsertItem_(name, allowedKeys, data) {
  if (!data || typeof data !== "object" || Array.isArray(data) || !isValidId_(data.id)) throw new Error("ID item tidak valid.");
  if (typeof data.title !== "string" || !data.title.trim() || data.title.length > 160) throw new Error("Judul tidak sah.");
  if (typeof data.category !== "string" || data.category.length > 100 || !allowedImage_(data.image_url) || typeof data.published !== "boolean") throw new Error("Kategori, URL gambar, atau publikasi tidak valid.");
  if (data.published && !data.image_url) throw new Error("Foto wajib diunggah sebelum publikasi.");
  if (typeof data.order !== "number" || data.order < 0 || data.order > 9999 || Math.floor(data.order) !== data.order) throw new Error("Urutan tidak valid.");
  if (name === "programs" && (typeof data.description !== "string" || data.description.length > 600 || typeof data.duration !== "string" || data.duration.length > 100)) throw new Error("Deskripsi atau durasi tidak valid.");
  var sheet = postSource_(name);
  var rows = sheet.getDataRange().getValues();
  var headers = rows[0].map(function(h){ return String(h).trim(); });
  if (allowedKeys.some(function(k){ return headers.indexOf(k) === -1; })) throw new Error("Struktur kolom sheet tidak valid.");
  var record = {};
  allowedKeys.forEach(function(key) {
    record[key] = key === "published" ? data[key] : key === "order" ? data[key] : safeText_(data[key], key === "image_url" ? 700 : (key === "description" ? 600 : 160));
  });
  var targetRow = -1;
  var idCol = headers.indexOf("id");
  for (var i = 1; i < rows.length; i++) if (String(rows[i][idCol]) === data.id) { targetRow = i + 1; break; }
  if (targetRow < 0) {
    if (rows.length > 500) throw new Error("Kapasitas tab untuk paket ini penuh.");
    targetRow = sheet.getLastRow() + 1;
  }
  // Update allowed cells only; preserve any other columns the company adds later.
  allowedKeys.forEach(function(key) { sheet.getRange(targetRow, headers.indexOf(key) + 1).setValue(record[key]); });
  return { ok: true, id: data.id };
}

function readAdminItems_(name, keys) {
  var values = postSource_(name).getDataRange().getValues();
  if (values.length <= 1) return [];
  var headers = values[0].map(function(x){ return String(x).trim(); });
  return values.slice(1, 101).filter(function(row){ return String(row[headers.indexOf('id')] || '').length > 0; }).map(function(row) {
    var item = {};
    keys.forEach(function(key){ var col = headers.indexOf(key); if (col >= 0) item[key] = row[col]; });
    return item;
  });
}

function readAdminContent_() {
  var rows = postSource_("site").getDataRange().getValues();
  var site = {};
  rows.slice(1).forEach(function(row) {
    var key = String(row[0]);
    if (ADMIN_SITE_KEYS.indexOf(key) !== -1) site[key] = String(row[1] || "");
  });
  return { ok: true, data: { site: site,
    programs: readAdminItems_("programs", ADMIN_PROGRAM_KEYS),
    gallery: readAdminItems_("gallery", ADMIN_GALLERY_KEYS),
  }};
}

/** Folder dikelola akun pemilik deployment GAS Admin, tidak pernah di-share untuk edit publik. */
function ensureSynergyMediaFolder_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('SYNERGY_MEDIA_FOLDER_ID');
  if (id) return DriveApp.getFolderById(id);
  var folder = DriveApp.createFolder('SYNERGY_INDO_CORPORA_WEBSITE_MEDIA');
  props.setProperty('SYNERGY_MEDIA_FOLDER_ID', folder.getId());
  return folder;
}

/** Jalankan manual satu kali di editor supaya izin Google Drive disetujui. */
function setupSynergyMediaFolder() {
  var folder = ensureSynergyMediaFolder_();
  console.log('Folder media Synergy siap: ' + folder.getUrl());
}

function uploadSynergyImage_(body) {
  var data = body.data;
  if (!data || typeof data !== 'object') throw new Error('Data upload tidak valid.');
  var type = data.mime_type;
  var allowed = ['image/jpeg', 'image/png', 'image/webp'];
  if (allowed.indexOf(type) < 0) throw new Error('Format gambar tidak diizinkan.');
  if (typeof data.base64 !== 'string' || data.base64.length > 3000000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(data.base64)) throw new Error('Ukuran/encoding gambar tidak sah.');
  var bytes = Utilities.base64Decode(data.base64);
  if (!bytes.length || bytes.length > 2200000) throw new Error('Gambar terlalu besar.');
  var sig = bytes.map(function(n){return n & 255;});
  var jpg = sig[0]===255 && sig[1]===216 && sig[2]===255;
  var png = sig[0]===137 && sig[1]===80 && sig[2]===78 && sig[3]===71 && sig[4]===13 && sig[5]===10;
  var webp = String.fromCharCode.apply(null,sig.slice(0,4))==='RIFF' && String.fromCharCode.apply(null,sig.slice(8,12))==='WEBP';
  if (!((type==='image/jpeg'&&jpg)||(type==='image/png'&&png)||(type==='image/webp'&&webp))) throw new Error('Tanda tangan file tidak cocok.');
  var name = 'synergy-' + Utilities.getUuid() + (jpg?'.jpg':png?'.png':'.webp');
  var blob = Utilities.newBlob(bytes, type, name);
  var file = ensureSynergyMediaFolder_().createFile(blob);
  // Hanya file media ini yang boleh dilihat pengunjung website, bukan folder / Sheets.
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  var id = file.getId();
  return {ok:true, file_id:id, image_url:'https://drive.google.com/thumbnail?id='+encodeURIComponent(id)+'&sz=w1600'};
}

/** Audit minimal perubahan CMS; jangan menyimpan token, secret, payload atau data pendaftar. */
function auditAdminChange_(action, recordId) {
  try {
    var ssId = PropertiesService.getScriptProperties().getProperty("SYNERGY_SPREADSHEET_ID");
    var ss = SpreadsheetApp.openById(ssId);
    var sheet = ss.getSheetByName("admin_audit") || ss.insertSheet("admin_audit");
    if (sheet.getLastRow() === 0) sheet.appendRow(["timestamp", "action", "record_id"]);
    if (sheet.getLastRow() >= 5000) { console.warn("Audit log penuh; arsipkan tab admin_audit secara manual."); return; }
    sheet.appendRow([new Date(), action, String(recordId || "").slice(0,80)]);
  } catch(err) { console.warn("Synergy audit logging unavailable"); }
}


/* Recruitment backend: dedicated private Google Sheet + private Google Drive folder. */
var RECRUITMENT_CV_MAX_BYTES_ = 3 * 1024 * 1024;
var RECRUITMENT_HEADERS_ = {
  job_postings: ["id","slug","title","country","category","summary","description","requirements","image_url","application_deadline","is_published","created_by","updated_by","created_at","updated_at"],
  candidate_upload_intents: ["id","original_file_name","declared_size","expires_at","drive_file_id","consumed_at","created_at"],
  candidate_applications: ["id","upload_intent_id","full_name","phone","email","target_country","job_id","job_title_snapshot","cv_storage_path","cv_original_name","status","privacy_notice_version","consent_at","retention_due_at","reviewed_by","reviewed_at","deleted_at","created_at","updated_at"],
  candidate_audit_logs: ["timestamp","actor_type","actor_email","action","application_id","details_json"]
};

function recruitmentSpreadsheet_() {
  var id = PropertiesService.getScriptProperties().getProperty("SYNERGY_RECRUITMENT_SPREADSHEET_ID");
  if (!id) throw new Error("Recruitment spreadsheet has not been configured.");
  return SpreadsheetApp.openById(id);
}

function ensureRecruitmentSheet_(name) {
  var headers = RECRUITMENT_HEADERS_[name];
  if (!headers) throw new Error("Unknown recruitment table.");
  var ss = recruitmentSpreadsheet_();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#16202e").setFontColor("#ffffff");
    return sheet;
  }
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
    return sheet;
  }
  var existing = sheet.getRange(1, 1, 1, Math.max(1, sheet.getLastColumn())).getValues()[0].map(function(x) { return String(x).trim(); });
  if (!headers.every(function(h) { return existing.indexOf(h) >= 0; })) throw new Error("Recruitment sheet headers do not match.");
  return sheet;
}

function ensureCandidateCvFolder_() {
  var id = PropertiesService.getScriptProperties().getProperty("SYNERGY_CANDIDATE_CV_FOLDER_ID");
  if (!id) throw new Error("Private candidate CV folder has not been configured.");
  var folder = DriveApp.getFolderById(id);
  if (folder.getSharingAccess() !== DriveApp.Access.PRIVATE) throw new Error("Candidate CV folder must not be shared by link or domain.");
  return folder;
}

function setupSynergyRecruitmentStorage() {
  var props = PropertiesService.getScriptProperties();
  var spreadsheetId = props.getProperty("SYNERGY_RECRUITMENT_SPREADSHEET_ID");
  if (!spreadsheetId) {
    var ssNew = SpreadsheetApp.create("SINERGI_GLOBAL_RECRUITMENT_PRIVATE_DB");
    spreadsheetId = ssNew.getId();
    props.setProperty("SYNERGY_RECRUITMENT_SPREADSHEET_ID", spreadsheetId);
  }
  var db = SpreadsheetApp.openById(spreadsheetId);
  Object.keys(RECRUITMENT_HEADERS_).forEach(function(name) { ensureRecruitmentSheet_(name); });
  var folderId = props.getProperty("SYNERGY_CANDIDATE_CV_FOLDER_ID");
  if (!folderId) {
    var newFolder = DriveApp.createFolder("SINERGI_GLOBAL_CANDIDATE_CVS_PRIVATE");
    folderId = newFolder.getId();
    props.setProperty("SYNERGY_CANDIDATE_CV_FOLDER_ID", folderId);
  }
  var cvFolder = ensureCandidateCvFolder_();
  var databaseAccess = DriveApp.getFileById(db.getId()).getSharingAccess();
  if (databaseAccess !== DriveApp.Access.PRIVATE) throw new Error("Recruitment spreadsheet must be private.");
  Logger.log("Recruitment database created/configured: " + db.getUrl());
  Logger.log("Private candidate CV folder created/configured: " + cvFolder.getUrl());
  Logger.log("Keep both items private. Do not share the spreadsheet or CV folder publicly.");
  return { ok: true, spreadsheetConfigured: true, privateFolderConfigured: true };
}

function recruitmentHealth_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty("SYNERGY_RECRUITMENT_SPREADSHEET_ID");
  if (!id || !props.getProperty("SYNERGY_CANDIDATE_CV_FOLDER_ID")) return { ok: true, ready: false };
  try {
    var ss = recruitmentSpreadsheet_();
    var folder = ensureCandidateCvFolder_();
    if (DriveApp.getFileById(ss.getId()).getSharingAccess() !== DriveApp.Access.PRIVATE) return { ok: true, ready: false };
    Object.keys(RECRUITMENT_HEADERS_).forEach(function(name) { ensureRecruitmentSheet_(name); });
    return { ok: true, ready: !!folder };
  } catch (err) {
    console.warn("Recruitment storage is not ready.");
    return { ok: true, ready: false };
  }
}

function recruitmentCell_(key, value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean" || typeof value === "number") return value;
  if (typeof value !== "string") throw new Error("Recruitment field type is invalid.");
  var limits = {
    id: 80, slug: 120, title: 160, country: 100, category: 80, summary: 400,
    description: 4000, requirements: 4000, image_url: 700, application_deadline: 10,
    created_by: 254, updated_by: 254, full_name: 120, phone: 40, email: 254,
    target_country: 100, job_title_snapshot: 160, cv_storage_path: 160, cv_original_name: 120,
    upload_intent_id: 80, original_file_name: 120, expires_at: 40, consumed_at: 40,
    drive_file_id: 160, status: 30, privacy_notice_version: 80, consent_at: 40,
    retention_due_at: 10, reviewed_by: 254, reviewed_at: 40, deleted_at: 40,
    created_at: 40, updated_at: 40, timestamp: 40, actor_type: 30, actor_email: 254,
    action: 80, application_id: 80, details_json: 2500
  };
  var max = limits[key] || 4000;
  return safeText_(value, max);
}

function recruitmentRows_(name) {
  var sheet = ensureRecruitmentSheet_(name);
  var values = sheet.getDataRange().getValues();
  if (values.length <= 1) return [];
  var headers = values[0].map(function(x) { return String(x).trim(); });
  return values.slice(1).map(function(row, index) {
    var item = { __rowNumber: index + 2 };
    headers.forEach(function(header, column) {
      var value = row[column];
      item[header] = value instanceof Date ? value.toISOString() : value;
    });
    return item;
  }).filter(function(row) { return String(row.id || "").length > 0; });
}

function recruitmentFind_(name, id) {
  var rows = recruitmentRows_(name);
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i].id) === String(id)) return { sheet: ensureRecruitmentSheet_(name), row: rows[i], rowNumber: rows[i].__rowNumber };
  }
  return null;
}

function recruitmentWriteFields_(name, rowNumber, fields) {
  var sheet = ensureRecruitmentSheet_(name);
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(function(x) { return String(x).trim(); });
  Object.keys(fields).forEach(function(key) {
    var column = headers.indexOf(key);
    if (column < 0) throw new Error("Recruitment field is not in the table.");
    sheet.getRange(rowNumber, column + 1).setValue(recruitmentCell_(key, fields[key]));
  });
}

function recruitmentAppend_(name, record) {
  var sheet = ensureRecruitmentSheet_(name);
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(function(x) { return String(x).trim(); });
  sheet.appendRow(headers.map(function(key) { return recruitmentCell_(key, record[key]); }));
}

function recruitmentNow_() { return new Date().toISOString(); }

function recruitmentAudit_(actorType, actorEmail, action, applicationId, details) {
  recruitmentAppend_("candidate_audit_logs", {
    timestamp: recruitmentNow_(), actor_type: actorType,
    actor_email: String(actorEmail || "").slice(0, 254), action: String(action || "").slice(0, 80),
    application_id: String(applicationId || "").slice(0, 80), details_json: JSON.stringify(details || {}).slice(0, 2000)
  });
}

function recruitmentIsPublished_(value) {
  return value === true || String(value).toLowerCase() === "true" || String(value).toLowerCase() === "yes";
}

function recruitmentPublicJob_(job) {
  return {
    id: String(job.id || ""), slug: String(job.slug || ""), title: String(job.title || ""),
    country: String(job.country || ""), category: String(job.category || ""), summary: String(job.summary || ""),
    description: String(job.description || ""), requirements: String(job.requirements || ""),
    image_url: job.image_url ? String(job.image_url) : null,
    application_deadline: job.application_deadline ? String(job.application_deadline).slice(0, 10) : null,
    is_published: recruitmentIsPublished_(job.is_published),
    created_at: job.created_at ? String(job.created_at) : undefined,
    updated_at: job.updated_at ? String(job.updated_at) : undefined
  };
}

function listPublicRecruitmentJobs_() {
  var today = recruitmentNow_().slice(0, 10);
  var rows = recruitmentRows_("job_postings").filter(function(job) {
    var deadline = String(job.application_deadline || "").slice(0, 10);
    return recruitmentIsPublished_(job.is_published) && (!deadline || deadline >= today);
  });
  rows.sort(function(a,b) { return String(b.created_at || "").localeCompare(String(a.created_at || "")); });
  return { ok: true, jobs: rows.slice(0, 100).map(recruitmentPublicJob_) };
}

function listAdminRecruitmentJobs_() {
  var rows = recruitmentRows_("job_postings");
  rows.sort(function(a,b) { return String(b.created_at || "").localeCompare(String(a.created_at || "")); });
  return { ok: true, jobs: rows.slice(0, 100).map(function(job) {
    var output = recruitmentPublicJob_(job);
    output.created_by = String(job.created_by || "");
    output.updated_by = String(job.updated_by || "");
    return output;
  }) };
}

function recruitmentFindPublicJob_(id) {
  var today = recruitmentNow_().slice(0, 10);
  var jobs = recruitmentRows_("job_postings");
  for (var i = 0; i < jobs.length; i++) {
    var deadline = String(jobs[i].application_deadline || "").slice(0, 10);
    if (String(jobs[i].id) === String(id) && recruitmentIsPublished_(jobs[i].is_published) && (!deadline || deadline >= today)) {
      return recruitmentPublicJob_(jobs[i]);
    }
  }
  return null;
}

function recruitmentJobById_(id) {
  var found = recruitmentFind_("job_postings", id);
  if (!found) return null;
  return recruitmentPublicJob_(found.row);
}

function recruitmentValidateJob_(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Invalid job data.");
  var fields = ["title","country","category","summary","description","requirements"];
  var job = {};
  fields.forEach(function(key) {
    if (typeof input[key] !== "string") throw new Error("Invalid job field.");
    job[key] = input[key].trim();
  });
  if (!job.title || job.title.length > 160 || !job.country || job.country.length > 100 ||
      !job.category || job.category.length > 80 || !job.summary || job.summary.length > 400 ||
      job.description.length > 4000 || job.requirements.length > 4000 || typeof input.is_published !== "boolean") {
    throw new Error("Job fields failed validation.");
  }
  var deadline = input.application_deadline === null || input.application_deadline === "" ? "" : input.application_deadline;
  if (deadline && (typeof deadline !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(deadline))) throw new Error("Invalid application deadline.");
  if (input.is_published && (job.description.length < 20 || job.requirements.length < 10)) throw new Error("Published jobs need full description and requirements.");
  if (input.is_published && deadline && deadline < recruitmentNow_().slice(0, 10)) throw new Error("Application deadline has passed.");
  job.application_deadline = deadline;
  job.image_url = "";
  job.is_published = input.is_published;
  return job;
}

function createRecruitmentJob_(data) {
  var input = data && data.job;
  var job = recruitmentValidateJob_(input);
  if (!/^[0-9a-f-]{36}$/i.test(String(input.id || "")) || !/^[a-z0-9-]{3,120}$/.test(String(input.slug || ""))) throw new Error("Invalid job identifier.");
  if (recruitmentFind_("job_postings", input.id)) throw new Error("Job already exists.");
  var now = recruitmentNow_();
  var record = {
    id: String(input.id), slug: String(input.slug), title: job.title, country: job.country, category: job.category,
    summary: job.summary, description: job.description, requirements: job.requirements, image_url: "",
    application_deadline: job.application_deadline, is_published: job.is_published,
    created_by: String(input.created_by || "").slice(0, 254), updated_by: String(input.updated_by || "").slice(0, 254),
    created_at: String(input.created_at || now), updated_at: String(input.updated_at || now)
  };
  recruitmentAppend_("job_postings", record);
  recruitmentAudit_("admin", record.created_by, "job_created", record.id, { published: record.is_published });
  return { ok: true, job: recruitmentJobById_(record.id) };
}

function updateRecruitmentJob_(data) {
  var id = String(data && data.id || "");
  var found = recruitmentFind_("job_postings", id);
  if (!found) return { ok: true, job: null };
  var incoming = data.job || {};
  var job = recruitmentValidateJob_(incoming);
  var fields = {
    title: job.title, country: job.country, category: job.category, summary: job.summary,
    description: job.description, requirements: job.requirements, image_url: "",
    application_deadline: job.application_deadline, is_published: job.is_published,
    updated_by: String(incoming.updated_by || "").slice(0, 254),
    updated_at: String(incoming.updated_at || recruitmentNow_())
  };
  recruitmentWriteFields_("job_postings", found.rowNumber, fields);
  recruitmentAudit_("admin", fields.updated_by, "job_updated", id, { published: fields.is_published });
  return { ok: true, job: recruitmentJobById_(id) };
}

function recruitmentUploadIntent_(row) {
  return {
    id: String(row.id || ""), storage_path: String(row.drive_file_id || ""),
    original_file_name: String(row.original_file_name || ""), declared_size: Number(row.declared_size || 0),
    expires_at: String(row.expires_at || ""), consumed_at: row.consumed_at ? String(row.consumed_at) : null,
    created_at: String(row.created_at || "")
  };
}

function createCandidateUploadIntent_(data) {
  if (!data || !/^[0-9a-f-]{36}$/i.test(String(data.id || ""))) throw new Error("Invalid upload intent.");
  var size = Number(data.declared_size);
  if (!Number.isInteger(size) || size < 1 || size > RECRUITMENT_CV_MAX_BYTES_) throw new Error("CV size is invalid.");
  var name = String(data.original_file_name || "").normalize("NFKC").replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 120);
  if (!name.toLowerCase().endsWith(".pdf")) throw new Error("CV must be a PDF.");
  var expires = Date.parse(String(data.expires_at || ""));
  if (!Number.isFinite(expires) || expires <= Date.now() || expires > Date.now() + 31 * 60 * 1000) throw new Error("Upload expiry is invalid.");
  if (recruitmentFind_("candidate_upload_intents", data.id)) throw new Error("Upload intent already exists.");
  recruitmentAppend_("candidate_upload_intents", {
    id: String(data.id), original_file_name: name, declared_size: size,
    expires_at: new Date(expires).toISOString(), drive_file_id: "", consumed_at: "",
    created_at: String(data.created_at || recruitmentNow_())
  });
  return { ok: true, intent: recruitmentUploadIntent_(recruitmentFind_("candidate_upload_intents", data.id).row) };
}

function recruitmentCandidateFile_(fileId) {
  if (!/^[A-Za-z0-9_-]{15,120}$/.test(String(fileId || ""))) throw new Error("Invalid candidate file identifier.");
  var folder = ensureCandidateCvFolder_();
  var file = DriveApp.getFileById(fileId);
  if (file.isTrashed()) throw new Error("Candidate CV has been removed.");
  var parents = file.getParents();
  var belongs = false;
  while (parents.hasNext()) if (parents.next().getId() === folder.getId()) belongs = true;
  if (!belongs) throw new Error("Candidate CV is outside the private folder.");
  return file;
}

function recruitmentPdfBytes_(bytes, expectedSize) {
  if (!bytes || bytes.length < 8 || bytes.length > RECRUITMENT_CV_MAX_BYTES_) throw new Error("CV size is invalid.");
  if (String.fromCharCode.apply(null, bytes.slice(0, 5)) !== "%PDF-") throw new Error("Uploaded file is not a PDF.");
  if (expectedSize !== undefined && Number(expectedSize) !== bytes.length) throw new Error("CV size does not match the upload intent.");
  return bytes;
}

function uploadCandidateCv_(data) {
  if (!data || !/^[0-9a-f-]{36}$/i.test(String(data.id || "")) || data.mime_type !== "application/pdf") throw new Error("Invalid CV upload.");
  if (typeof data.base64 !== "string" || data.base64.length > 4200000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(data.base64)) throw new Error("CV encoding is invalid.");
  var found = recruitmentFind_("candidate_upload_intents", data.id);
  if (!found) throw new Error("Upload intent not found.");
  if (found.row.consumed_at || found.row.drive_file_id) throw new Error("Upload intent has already been used.");
  if (Date.parse(String(found.row.expires_at || "")) <= Date.now()) throw new Error("Upload intent expired.");
  var bytes = Utilities.base64Decode(data.base64);
  recruitmentPdfBytes_(bytes, Number(found.row.declared_size));
  var file = ensureCandidateCvFolder_().createFile(Utilities.newBlob(bytes, "application/pdf", "CV-" + String(data.id) + ".pdf"));
  try {
    recruitmentWriteFields_("candidate_upload_intents", found.rowNumber, { drive_file_id: file.getId() });
  } catch (err) {
    try { file.setTrashed(true); } catch (ignored) {}
    throw err;
  }
  recruitmentAudit_("candidate", "", "candidate_cv_uploaded", data.id, { bytes: bytes.length });
  return { ok: true, file_id: file.getId() };
}

function getCandidateUploadIntent_(id) {
  var found = recruitmentFind_("candidate_upload_intents", id);
  if (!found) return { ok: true, intent: null };
  if (found.row.consumed_at || Date.parse(String(found.row.expires_at || "")) <= Date.now()) return { ok: true, intent: null };
  return { ok: true, intent: recruitmentUploadIntent_(found.row) };
}

function getCandidateApplication_(id) {
  var found = recruitmentFind_("candidate_applications", id);
  if (!found) return { ok: true, application: null };
  var row = found.row;
  var app = {};
  RECRUITMENT_HEADERS_.candidate_applications.forEach(function(key) {
    if (key !== "upload_intent_id") app[key] = row[key] instanceof Date ? row[key].toISOString() : row[key];
  });
  app.phone = app.phone ? String(app.phone) : null;
  app.email = app.email ? String(app.email) : null;
  app.target_country = app.target_country ? String(app.target_country) : null;
  app.job_id = app.job_id ? String(app.job_id) : null;
  app.job_title_snapshot = app.job_title_snapshot ? String(app.job_title_snapshot) : null;
  app.cv_storage_path = app.cv_storage_path ? String(app.cv_storage_path) : null;
  app.cv_original_name = app.cv_original_name ? String(app.cv_original_name) : null;
  app.retention_due_at = app.retention_due_at ? String(app.retention_due_at) : null;
  app.reviewed_by = app.reviewed_by ? String(app.reviewed_by) : null;
  app.reviewed_at = app.reviewed_at ? String(app.reviewed_at) : null;
  app.deleted_at = app.deleted_at ? String(app.deleted_at) : null;
  return { ok: true, application: app };
}

function submitCandidateApplication_(data) {
  if (!data || !/^[0-9a-f-]{36}$/i.test(String(data.application_id || "")) ||
      !/^[0-9a-f-]{36}$/i.test(String(data.upload_id || "")) ||
      typeof data.full_name !== "string" || data.full_name.trim().length < 2 || data.full_name.length > 120 ||
      typeof data.phone !== "string" || !/^\d{8,16}$/.test(data.phone) ||
      (data.email !== null && data.email !== "" && (typeof data.email !== "string" || data.email.length > 254)) ||
      typeof data.target_country !== "string" || data.target_country.length > 100 ||
      !/^[0-9a-f-]{36}$/i.test(String(data.job_id || "")) ||
      typeof data.privacy_notice_version !== "string" || !data.privacy_notice_version || data.privacy_notice_version.length > 80) {
    throw new Error("Candidate application data is invalid.");
  }
  var duplicateRows = recruitmentRows_("candidate_applications");
  for (var d = 0; d < duplicateRows.length; d++) {
    if (String(duplicateRows[d].upload_intent_id) === String(data.upload_id) && String(duplicateRows[d].status) !== "deleted") {
      return { ok: true, application: { id: String(duplicateRows[d].id), status: String(duplicateRows[d].status), created_at: String(duplicateRows[d].created_at) } };
    }
  }
  var intent = recruitmentFind_("candidate_upload_intents", data.upload_id);
  if (!intent || intent.row.consumed_at || !intent.row.drive_file_id || Date.parse(String(intent.row.expires_at || "")) <= Date.now()) throw new Error("Upload intent is missing, expired, or consumed.");
  var job = recruitmentFindPublicJob_(String(data.job_id));
  if (!job || job.country !== data.target_country) throw new Error("The selected job is not available.");
  var file = recruitmentCandidateFile_(String(intent.row.drive_file_id));
  var pdfBytes = recruitmentPdfBytes_(file.getBlob().getBytes(), Number(intent.row.declared_size));
  if (!pdfBytes.length) throw new Error("CV is empty.");
  var retentionDays = Number(data.retention_days);
  if (!Number.isInteger(retentionDays) || retentionDays < 1 || retentionDays > 3650) throw new Error("Retention period is invalid.");
  var now = recruitmentNow_();
  var due = new Date(Date.now() + retentionDays * 86400000).toISOString().slice(0, 10);
  var record = {
    id: String(data.application_id), upload_intent_id: String(data.upload_id),
    full_name: data.full_name.normalize("NFKC").replace(/[\u0000-\u001f\u007f]/g, " ").trim(),
    phone: data.phone, email: data.email ? String(data.email).trim().toLowerCase() : "",
    target_country: String(data.target_country), job_id: String(data.job_id), job_title_snapshot: job.title,
    cv_storage_path: String(intent.row.drive_file_id), cv_original_name: String(intent.row.original_file_name),
    status: "received", privacy_notice_version: String(data.privacy_notice_version),
    consent_at: now, retention_due_at: due, reviewed_by: "", reviewed_at: "", deleted_at: "",
    created_at: now, updated_at: now
  };
  recruitmentAppend_("candidate_applications", record);
  recruitmentWriteFields_("candidate_upload_intents", intent.rowNumber, { consumed_at: now });
  recruitmentAudit_("candidate", "", "candidate_application_submitted", record.id, { status: "received" });
  return { ok: true, application: { id: record.id, status: record.status, created_at: record.created_at } };
}

function listCandidateApplications_(data) {
  data = data || {};
  var limit = Math.min(100, Math.max(1, Number(data.limit || 50)));
  var offset = Math.min(10000, Math.max(0, Number(data.offset || 0)));
  if (!Number.isInteger(limit) || !Number.isInteger(offset)) throw new Error("Invalid paging parameters.");
  var allowed = ["received","reviewing","shortlisted","rejected","hired","deleted"];
  var status = allowed.indexOf(String(data.status || "")) >= 0 ? String(data.status) : "";
  var rows = recruitmentRows_("candidate_applications").filter(function(row) { return !status || String(row.status) === status; });
  rows.sort(function(a,b) { return String(b.created_at || "").localeCompare(String(a.created_at || "")); });
  var applications = rows.slice(offset, offset + limit).map(function(row) {
    return {
      id: String(row.id), full_name: String(row.full_name || ""), phone: row.phone ? String(row.phone) : null,
      email: row.email ? String(row.email) : null, target_country: row.target_country ? String(row.target_country) : null,
      job_id: row.job_id ? String(row.job_id) : null, job_title_snapshot: row.job_title_snapshot ? String(row.job_title_snapshot) : null,
      status: String(row.status || "received"), cv_original_name: row.cv_original_name ? String(row.cv_original_name) : null,
      created_at: String(row.created_at || ""), updated_at: String(row.updated_at || ""),
      retention_due_at: row.retention_due_at ? String(row.retention_due_at) : null,
      reviewed_by: row.reviewed_by ? String(row.reviewed_by) : null, reviewed_at: row.reviewed_at ? String(row.reviewed_at) : null,
      deleted_at: row.deleted_at ? String(row.deleted_at) : null
    };
  });
  return { ok: true, applications: applications };
}

function updateCandidateApplicationStatus_(data) {
  var id = String(data && data.id || "");
  var status = String(data && data.status || "");
  var actor = String(data && data.actor_email || "").slice(0, 254);
  if (["received","reviewing","shortlisted","rejected","hired"].indexOf(status) < 0) throw new Error("Invalid candidate status.");
  var found = recruitmentFind_("candidate_applications", id);
  if (!found || String(found.row.status) === "deleted") return { ok: true, application: null };
  var now = recruitmentNow_();
  recruitmentWriteFields_("candidate_applications", found.rowNumber, { status: status, updated_at: now, reviewed_by: actor, reviewed_at: now });
  recruitmentAudit_("admin", actor, "candidate_status_changed", id, { status: status });
  return getCandidateApplication_(id);
}

function trashCandidateFile_(fileId) {
  if (!fileId) return;
  try {
    var file = recruitmentCandidateFile_(String(fileId));
    file.setTrashed(true);
  } catch (err) {
    var maybe = null;
    try { maybe = DriveApp.getFileById(String(fileId)); } catch (ignored) {}
    if (maybe && !maybe.isTrashed()) throw err;
  }
}

function anonymizeCandidateApplication_(data) {
  var id = String(data && data.id || "");
  var actor = String(data && data.actor_email || "system:retention-job").slice(0, 254);
  var reason = String(data && data.reason || "admin_request").slice(0, 80);
  var found = recruitmentFind_("candidate_applications", id);
  if (!found) return { ok: true, alreadyDeleted: true };
  if (String(found.row.status) === "deleted") return { ok: true, alreadyDeleted: true };
  trashCandidateFile_(String(found.row.cv_storage_path || ""));
  var now = recruitmentNow_();
  recruitmentWriteFields_("candidate_applications", found.rowNumber, {
    full_name: "[Dihapus]", phone: "", email: "", target_country: "", job_id: "",
    job_title_snapshot: "", cv_storage_path: "", cv_original_name: "", status: "deleted",
    reviewed_by: actor, reviewed_at: now, deleted_at: now, updated_at: now
  });
  recruitmentAudit_(actor.indexOf("system:") === 0 ? "system" : "admin", actor, "candidate_anonymized", id, { reason: reason });
  return { ok: true };
}

function recruitmentFileBytes_(fileId) {
  var file = recruitmentCandidateFile_(String(fileId));
  var bytes = recruitmentPdfBytes_(file.getBlob().getBytes());
  return { file: file, bytes: bytes };
}

function downloadCandidateCv_(data) {
  var result = recruitmentFileBytes_(String(data && data.file_id || ""));
  return { ok: true, base64: Utilities.base64Encode(result.bytes), byte_length: result.bytes.length };
}

function deleteCandidateCv_(data) {
  trashCandidateFile_(String(data && data.file_id || ""));
  return { ok: true };
}

function auditCandidateApplication_(data) {
  data = data || {};
  var actorType = String(data.actor_type || "admin");
  if (["admin","system"].indexOf(actorType) < 0) throw new Error("Invalid audit actor.");
  recruitmentAudit_(actorType, String(data.actor_email || ""), String(data.action || "").slice(0,80),
    String(data.application_id || ""), data.details || {});
  return { ok: true };
}

function cleanupCandidateData_(data) {
  var retentionDays = Number(data && data.retention_days);
  if (!Number.isInteger(retentionDays) || retentionDays < 1 || retentionDays > 3650) throw new Error("Invalid retention period.");
  var now = Date.now();
  var today = recruitmentNow_().slice(0, 10);
  var expiredUploads = 0, expiredApplications = 0, consumedIntentsDeleted = 0;
  var intents = recruitmentRows_("candidate_upload_intents");
  for (var i = 0; i < intents.length; i++) {
    var expired = Date.parse(String(intents[i].expires_at || "")) < now;
    var consumedOld = !!intents[i].consumed_at && Date.parse(String(intents[i].created_at || "")) < now - 7 * 86400000;
    if (expired && !intents[i].consumed_at) {
      trashCandidateFile_(String(intents[i].drive_file_id || ""));
      var oldIntent = recruitmentFind_("candidate_upload_intents", intents[i].id);
      if (oldIntent) oldIntent.sheet.deleteRow(oldIntent.rowNumber);
      expiredUploads++;
    } else if (consumedOld) {
      var usedIntent = recruitmentFind_("candidate_upload_intents", intents[i].id);
      if (usedIntent) usedIntent.sheet.deleteRow(usedIntent.rowNumber);
      consumedIntentsDeleted++;
    }
  }
  var due = recruitmentRows_("candidate_applications").filter(function(app) {
    return String(app.status) !== "deleted" && String(app.retention_due_at || "") && String(app.retention_due_at).slice(0,10) <= today;
  }).slice(0, 20);
  for (var j = 0; j < due.length; j++) {
    anonymizeCandidateApplication_({ id: due[j].id, actor_email: "system:retention-job", reason: "retention_expired" });
    expiredApplications++;
  }
  return { ok: true, expiredUploads: expiredUploads, expiredApplications: expiredApplications, consumedIntentsDeleted: consumedIntentsDeleted };
}

function doPost(e) {
  // Never reveal full errors, project IDs, credentials, or private records in the API response.
  var lock = LockService.getScriptLock();
  try {
    if (!e || !e.postData || !e.postData.contents || e.postData.contents.length > 4300000) return adminJson_({ ok: false, error: "Invalid body" });
    var body = JSON.parse(e.postData.contents);
    var expected = PropertiesService.getScriptProperties().getProperty("SYNERGY_ADMIN_SECRET");
    if (!compareSecret_(body.secret, expected)) return adminJson_({ ok: false, error: "Unauthorized" });
    if (!lock.tryLock(10000)) return adminJson_({ ok: false, error: "Please retry" });
    var result;
    if (body.action === "read_content") result = readAdminContent_();
    else if (body.action === "update_site") result = writeSite_(body.data);
    else if (body.action === "upsert_program") result = upsertItem_("programs", ADMIN_PROGRAM_KEYS, body.data);
    else if (body.action === "upsert_gallery") result = upsertItem_("gallery", ADMIN_GALLERY_KEYS, body.data);
    else if (body.action === "upload_image") result = uploadSynergyImage_(body);
    else if (body.action === "recruitment_health") result = recruitmentHealth_();
    else if (body.action === "list_public_jobs") result = listPublicRecruitmentJobs_();
    else if (body.action === "get_public_job") result = { ok: true, job: recruitmentFindPublicJob_(body.data && body.data.id) };
    else if (body.action === "list_admin_jobs") result = listAdminRecruitmentJobs_();
    else if (body.action === "create_job") result = createRecruitmentJob_(body.data);
    else if (body.action === "update_job") result = updateRecruitmentJob_(body.data);
    else if (body.action === "create_candidate_upload_intent") result = createCandidateUploadIntent_(body.data);
    else if (body.action === "upload_candidate_cv") result = uploadCandidateCv_(body.data);
    else if (body.action === "get_candidate_upload_intent") result = getCandidateUploadIntent_(body.data && body.data.id);
    else if (body.action === "submit_candidate_application") result = submitCandidateApplication_(body.data);
    else if (body.action === "get_candidate_application") result = getCandidateApplication_(body.data && body.data.id);
    else if (body.action === "list_candidate_applications") result = listCandidateApplications_(body.data);
    else if (body.action === "update_candidate_application_status") result = updateCandidateApplicationStatus_(body.data);
    else if (body.action === "anonymize_candidate_application") result = anonymizeCandidateApplication_(body.data);
    else if (body.action === "download_candidate_cv") result = downloadCandidateCv_(body.data);
    else if (body.action === "delete_candidate_cv") result = deleteCandidateCv_(body.data);
    else if (body.action === "audit_candidate_application") result = auditCandidateApplication_(body.data);
    else if (body.action === "cleanup_candidate_data") result = cleanupCandidateData_(body.data);
    else result = { ok: false, error: "Unsupported action" };
    if (result && result.ok && ["update_site", "upsert_program", "upsert_gallery", "upload_image"].indexOf(body.action) !== -1) {
      auditAdminChange_(body.action, result.id || result.file_id || "site");
    }
    return adminJson_(result);
  } catch (err) {
    console.error("Synergy admin: operation failed", err && err.message ? err.message : "unknown");
    return adminJson_({ ok: false, error: "Request rejected or unavailable" });
  } finally { if (lock.hasLock()) lock.releaseLock(); }
}

// Intentionally no doGet() function. This project is only a write gateway.
