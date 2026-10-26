/**
 * SINERGI GLOBAL | Public Content API (read-only)
 * by Kastriva
 *
 * PUBLIC READ-ONLY. Hanya mempublikasikan kolom terpilih dari sheet "site", "programs", "gallery".
 * JANGAN tambahkan operasi admin/pendaftaran pada deployment publik ini.
 * Registrations disiapkan sebagai tab privat dan TIDAK pernah dikirim via endpoint.
 */

var SPREADSHEET_PROPERTY = 'SYNERGY_SPREADSHEET_ID';
var PUBLIC_CACHE_SECONDS = 300;

function getSpreadsheet_() {
  var id = PropertiesService.getScriptProperties().getProperty(SPREADSHEET_PROPERTY);
  if (!id) throw new Error('Spreadsheet ID belum dikonfigurasi. Jalankan setupSynergySpreadsheet().');
  return SpreadsheetApp.openById(id);
}

function json_(body) {
  return ContentService.createTextOutput(JSON.stringify(body))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  var resource = String((e && e.parameter && e.parameter.resource) || 'public');
  if (resource === 'health') return json_({ ok: true, service: 'Sinergi Global Public Content', version: '2.0' });
  if (resource !== 'public') return json_({ ok: false, error: 'Unknown resource' });

  try {
    var cache = CacheService.getScriptCache();
    var existing = cache.get('SINERGI_PUBLIC_V2');
    if (existing) return ContentService.createTextOutput(existing).setMimeType(ContentService.MimeType.JSON);

    var ss = getSpreadsheet_();
    var payload = {
      ok: true,
      data: {
        site: readSite_(ss),
        programs: readItems_(ss, 'programs', ['id', 'title', 'category', 'description', 'duration', 'image_url', 'published', 'order']),
        gallery: readItems_(ss, 'gallery', ['id', 'title', 'category', 'image_url', 'published', 'order'])
      }
    };
    var raw = JSON.stringify(payload);
    // CacheService per-entry dibatasi ukurannya; tidak wajib cache jika data membesar.
    if (raw.length < 80000) cache.put('SINERGI_PUBLIC_V2', raw, PUBLIC_CACHE_SECONDS);
    return ContentService.createTextOutput(raw).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    console.error(err);
    return json_({ ok: false, error: 'Public content temporarily unavailable' });
  }
}

function readSite_(ss) {
  var sheet = ss.getSheetByName('site');
  if (!sheet) return {};
  var rows = sheet.getDataRange().getValues();
  var allowed = [
    'hero_eyebrow', 'hero_title_1', 'hero_title_2', 'hero_title_accent',
    'hero_description', 'about_description', 'contact_whatsapp',
    'contact_email', 'contact_address'
  ];
  var site = {};
  for (var i = 1; i < rows.length; i++) {
    var key = String(rows[i][0] || '');
    if (allowed.indexOf(key) !== -1 && isPublished_(rows[i][2])) {
      site[key] = String(rows[i][1] || '').slice(0, 600);
    }
  }
  return site;
}

function isPublished_(value) {
  return value === true || String(value).toLowerCase() === 'true' || String(value).toLowerCase() === 'yes';
}

function readItems_(ss, sheetName, allowedColumns) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  var values = sheet.getDataRange().getValues();
  if (values.length <= 1) return [];
  var headers = values[0].map(function (x) { return String(x).trim(); });
  var selected = [];
  values.slice(1, 101).forEach(function (row) {
    var index = headers.indexOf('published');
    if (index < 0 || !isPublished_(row[index])) return;
    var item = {};
    allowedColumns.forEach(function (name) {
      var col = headers.indexOf(name);
      if (col >= 0) item[name] = row[col];
    });
    item.published = true;
    item.order = Number(item.order || 999);
    selected.push(item);
  });
  selected.sort(function (a, b) { return a.order - b.order; });
  return selected;
}

function createSheetIfMissing_(ss, name, headers, initialRows) {
  var sheet = ss.getSheetByName(name);
  if (sheet) return sheet; // Jangan menimpa data existing.
  sheet = ss.insertSheet(name);
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  if (initialRows.length) sheet.getRange(2, 1, initialRows.length, headers.length).setValues(initialRows);
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#16202e').setFontColor('#ffffff');
  sheet.autoResizeColumns(1, headers.length);
  return sheet;
}

/** Jalankan sekali secara manual dari Apps Script Editor untuk setup awal. */
function setupSynergySpreadsheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('Buka Apps Script dari Google Sheets: Extensions > Apps Script.');
  PropertiesService.getScriptProperties().setProperty(SPREADSHEET_PROPERTY, ss.getId());

  // Safe blank defaults: do not publish invented company copy or stock photos by default.
  // Existing sheets are preserved by createSheetIfMissing_ and are never overwritten.
  createSheetIfMissing_(ss, 'site', ['key', 'value', 'published'], [
    ['hero_eyebrow', '', false],
    ['hero_title_1', '', false],
    ['hero_title_2', '', false],
    ['hero_title_accent', '', false],
    ['hero_description', '', false],
    ['about_description', '', false],
    ['contact_whatsapp', '', false],
    ['contact_email', '', false],
    ['contact_address', '', false]
  ]);
  // Job listings are not yet part of the CMS schema; do not seed fake training programs.
  createSheetIfMissing_(ss, 'programs', ['id', 'title', 'category', 'description', 'duration', 'image_url', 'published', 'order'], []);
  // Official activity photos must be uploaded and approved before publication.
  createSheetIfMissing_(ss, 'gallery', ['id', 'title', 'category', 'image_url', 'published', 'order'], []);
  // Privat: tidak boleh dibaca oleh API publik. Pendaftaran online baru diaktifkan pada tahap berikutnya.
  createSheetIfMissing_(ss, 'registrations', ['id','timestamp','full_name','phone','program_id','message','consent'], []);
  Logger.log('Setup selesai. Spreadsheet ID: ' + ss.getId());
}
