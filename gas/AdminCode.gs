/**
 * SINERGI GLOBAL | PRIVATE ADMIN WRITE GATEWAY
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
  var folder = DriveApp.createFolder('SINERGI_GLOBAL_WEBSITE_MEDIA');
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

function doPost(e) {
  // Never reveal full errors, project IDs, credentials, or private records in the API response.
  var lock = LockService.getScriptLock();
  try {
    if (!e || !e.postData || !e.postData.contents || e.postData.contents.length > 3100000) return adminJson_({ ok: false, error: "Invalid body" });
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
