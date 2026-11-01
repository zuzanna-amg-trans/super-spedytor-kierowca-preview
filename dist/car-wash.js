/*
 * Super Spedytor — mycie zewnętrzne auta (ryczałt 15 EUR po akceptacji biura).
 *
 * To jest uczciwy, lokalny moduł dokumentacji zdjęciowej + kontrakt API.
 * NIE ma w nim zapisu do TMS, żadnego fetch ani udawanej wysyłki. Kwota jest
 * własnością serwera; klient nigdy nie ustawia statusu APPROVED/SETTLED sam.
 * Część domenowa jest czysta (bez DOM) i testowalna w Node; UI jest na dole.
 */
(function (root, factory) {
  var api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.SuperSpedytorCarWash = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  /* ------------------------------------------------------------------ */
  /* Stałe                                                               */
  /* ------------------------------------------------------------------ */

  var AMOUNT_MINOR = 1500;
  var CURRENCY = 'EUR';
  var CATEGORY = 'EXTERIOR_TOUCHLESS_WASH';
  var SCHEMA = 'super-spedytor.car-wash-claim.v1';
  var LIMITS = Object.freeze({
    MAX_PHOTOS: 30,
    MAX_TOTAL_BYTES: 100 * 1024 * 1024,
    MAX_FILE_BYTES: 25 * 1024 * 1024,
    MIN_LONG_SIDE: 640
  });
  var ALLOWED_MIME = Object.freeze(['image/jpeg', 'image/png', 'image/webp']);
  var SERVER_STATUSES = Object.freeze(['SUBMITTED', 'NEEDS_CORRECTION', 'REJECTED', 'APPROVED', 'SETTLED']);
  var DEMO_CONTEXT = Object.freeze({
    driver_id: 'demo-driver',
    driver_full_name: 'Jan Testowy',
    vehicle_id: 'demo-vehicle',
    vehicle_registration: 'DEMO 001',
    round_id: 'demo-round'
  });
  var CONTEXT_FIELDS = ['driver_id', 'driver_full_name', 'vehicle_id', 'vehicle_registration', 'round_id'];
  var DONE_TEXT = 'Dokumentacja gotowa na urządzeniu. Nie wysłano do SS — integracja zapisu wydatków oczekuje na wdrożenie.';

  var STAGES = Object.freeze([
    Object.freeze({ id: 'before', label: 'Przed myciem', short: 'Przed' }),
    Object.freeze({ id: 'wash', label: 'W myjni', short: 'Myjnia' }),
    Object.freeze({ id: 'after', label: 'Po myciu', short: 'Po' }),
    Object.freeze({ id: 'details', label: 'Detale po myciu', short: 'Detale' })
  ]);

  var COMMON = ' Ostro, w dobrym świetle, bez filtrów. To samo auto na każdym zdjęciu.';
  function slot(id, stage, kind, side, label, text) {
    return Object.freeze({ id: id, stage: stage, kind: kind, side: side, label: label, instruction: text + COMMON });
  }
  var PHOTO_SLOTS = Object.freeze([
    slot('before_front', 'before', 'BEFORE_OVERVIEW', 'front', 'Przód — przed myciem',
      'Cały przód auta w kadrze, tablica rejestracyjna czytelna. Zabrudzenie ma być wyraźnie widoczne.'),
    slot('before_right', 'before', 'BEFORE_OVERVIEW', 'right', 'Prawy bok — przed myciem',
      'Cała prawa strona pojazdu od przodu do tyłu w jednym kadrze. Zabrudzenie ma być widoczne.'),
    slot('before_rear', 'before', 'BEFORE_OVERVIEW', 'rear', 'Tył — przed myciem',
      'Cały tył auta w kadrze, tablica rejestracyjna czytelna. Zabrudzenie ma być widoczne.'),
    slot('before_left', 'before', 'BEFORE_OVERVIEW', 'left', 'Lewy bok — przed myciem',
      'Cała lewa strona pojazdu od przodu do tyłu w jednym kadrze. Zabrudzenie ma być widoczne.'),
    slot('wash_bay', 'wash', 'WASH_BAY', 'bay', 'Auto na stanowisku myjni',
      'Auto stoi w stanowisku myjni bezdotykowej. W kadrze ma być pojazd oraz lanca lub wyposażenie stanowiska — sama tablica z nazwą myjni nie wystarcza.'),
    slot('after_front', 'after', 'AFTER_OVERVIEW', 'front', 'Przód — po myciu',
      'Cały przód z tablicą, z takiego samego kąta i odległości jak przed myciem. Bez odbić zasłaniających powierzchnię.'),
    slot('after_right', 'after', 'AFTER_OVERVIEW', 'right', 'Prawy bok — po myciu',
      'Cała prawa strona, kąt i odległość porównywalne ze zdjęciem przed myciem. Bez odbić zasłaniających powierzchnię.'),
    slot('after_rear', 'after', 'AFTER_OVERVIEW', 'rear', 'Tył — po myciu',
      'Cały tył z tablicą, kąt i odległość porównywalne ze zdjęciem przed myciem. Bez odbić zasłaniających powierzchnię.'),
    slot('after_left', 'after', 'AFTER_OVERVIEW', 'left', 'Lewy bok — po myciu',
      'Cała lewa strona, kąt i odległość porównywalne ze zdjęciem przed myciem. Bez odbić zasłaniających powierzchnię.'),
    slot('after_wheel_front_left', 'details', 'AFTER_WHEEL_DETAIL', 'front_left', 'Koło lewe przednie — po myciu',
      'W kadrze koło, nadkole oraz powierzchnia tuż ZA kołem (progi, część drzwi/błotnika).'),
    slot('after_wheel_front_right', 'details', 'AFTER_WHEEL_DETAIL', 'front_right', 'Koło prawe przednie — po myciu',
      'W kadrze koło, nadkole oraz powierzchnia tuż ZA kołem (progi, część drzwi/błotnika).'),
    slot('after_wheel_rear_right', 'details', 'AFTER_WHEEL_DETAIL', 'rear_right', 'Koło prawe tylne — po myciu',
      'W kadrze koło, nadkole oraz powierzchnia tuż ZA kołem (progi, część burty/błotnika).'),
    slot('after_wheel_rear_left', 'details', 'AFTER_WHEEL_DETAIL', 'rear_left', 'Koło lewe tylne — po myciu',
      'W kadrze koło, nadkole oraz powierzchnia tuż ZA kołem (progi, część burty/błotnika).'),
    slot('after_windshield', 'details', 'AFTER_WINDSHIELD', 'windshield', 'Przednia szyba — po myciu',
      'Cała przednia szyba ostro, bez odbić i refleksów, które ukrywałyby szczegóły.'),
    slot('after_hood', 'details', 'AFTER_HOOD', 'hood', 'Maska — po myciu',
      'Cała maska, pod kątem bez odblasków, tak by było widać stan lakieru.')
  ]);
  var SLOT_BY_ID = {};
  PHOTO_SLOTS.forEach(function (s) { SLOT_BY_ID[s.id] = s; });

  var KIND_BY_STAGE = { before: 'BEFORE', wash: 'WASH_BAY', after: 'AFTER', details: 'DETAIL' };

  /* ------------------------------------------------------------------ */
  /* Narzędzia                                                           */
  /* ------------------------------------------------------------------ */

  function str(v) { return typeof v === 'string' ? v.trim() : ''; }
  function nowIso(options) {
    return options && typeof options.now === 'function' ? options.now() : new Date().toISOString();
  }
  function uuid(options) {
    if (options && typeof options.uuid === 'function') return options.uuid();
    var c = typeof globalThis !== 'undefined' ? globalThis.crypto : null;
    if (c && typeof c.randomUUID === 'function') return c.randomUUID();
    var b = new Uint8Array(16);
    if (c && typeof c.getRandomValues === 'function') c.getRandomValues(b);
    else for (var i = 0; i < 16; i++) b[i] = Math.floor(Math.random() * 256);
    b[6] = (b[6] & 0x0f) | 0x40;
    b[8] = (b[8] & 0x3f) | 0x80;
    var h = '';
    for (var j = 0; j < 16; j++) h += (b[j] < 16 ? '0' : '') + b[j].toString(16);
    return h.slice(0, 8) + '-' + h.slice(8, 12) + '-' + h.slice(12, 16) + '-' + h.slice(16, 20) + '-' + h.slice(20);
  }
  function copy(o) { return Object.assign({}, o); }
  function formatMinor(m) { return (m / 100).toFixed(2).replace('.', ',') + ' EUR'; }
  function formatBytes(n) {
    if (n >= 1048576) return (n / 1048576).toFixed(1).replace('.', ',') + ' MB';
    return Math.max(1, Math.round(n / 1024)) + ' KB';
  }

  /* SHA-256 (czysty JS, na wypadek braku crypto.subtle w niezabezpieczonym kontekście WebView) */
  var K256 = new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ]);
  function ror(x, n) { return (x >>> n) | (x << (32 - n)); }
  function sha256Hex(bytes) {
    var l = bytes.length;
    var padLen = ((l + 9 + 63) >> 6) << 6;
    var buf = new Uint8Array(padLen);
    buf.set(bytes);
    buf[l] = 0x80;
    var dv = new DataView(buf.buffer);
    dv.setUint32(padLen - 8, Math.floor(l / 536870912));
    dv.setUint32(padLen - 4, (l * 8) >>> 0);
    var H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
    var w = new Uint32Array(64);
    for (var off = 0; off < padLen; off += 64) {
      var i;
      for (i = 0; i < 16; i++) w[i] = dv.getUint32(off + i * 4);
      for (i = 16; i < 64; i++) {
        var s0 = ror(w[i - 15], 7) ^ ror(w[i - 15], 18) ^ (w[i - 15] >>> 3);
        var s1 = ror(w[i - 2], 17) ^ ror(w[i - 2], 19) ^ (w[i - 2] >>> 10);
        w[i] = w[i - 16] + s0 + w[i - 7] + s1;
      }
      var a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
      for (i = 0; i < 64; i++) {
        var S1 = ror(e, 6) ^ ror(e, 11) ^ ror(e, 25);
        var ch = (e & f) ^ (~e & g);
        var t1 = (h + S1 + ch + K256[i] + w[i]) | 0;
        var S0 = ror(a, 2) ^ ror(a, 13) ^ ror(a, 22);
        var maj = (a & b) ^ (a & c) ^ (b & c);
        var t2 = (S0 + maj) | 0;
        h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
      }
      H[0] = (H[0] + a) | 0; H[1] = (H[1] + b) | 0; H[2] = (H[2] + c) | 0; H[3] = (H[3] + d) | 0;
      H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0;
    }
    var out = '';
    for (var k = 0; k < 8; k++) out += ('00000000' + (H[k] >>> 0).toString(16)).slice(-8);
    return out;
  }
  function sha256HexAsync(bytes) {
    var c = typeof globalThis !== 'undefined' ? globalThis.crypto : null;
    if (c && c.subtle && typeof c.subtle.digest === 'function') {
      return c.subtle.digest('SHA-256', bytes).then(function (d) {
        var u = new Uint8Array(d), s = '';
        for (var i = 0; i < u.length; i++) s += (u[i] < 16 ? '0' : '') + u[i].toString(16);
        return s;
      }, function () { return sha256Hex(bytes); });
    }
    return Promise.resolve(sha256Hex(bytes));
  }

  /* Rozpoznanie typu po nagłówku pliku — nie ufamy file.type; PDF i reszta odpadają. */
  function sniffMime(bytes) {
    if (!bytes || bytes.length < 12) return null;
    if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
    var png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    var isPng = png.every(function (v, i) { return bytes[i] === v; });
    if (isPng) return 'image/png';
    var riff = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
    var webp = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);
    if (riff === 'RIFF' && webp === 'WEBP') return 'image/webp';
    return null;
  }

  /* ------------------------------------------------------------------ */
  /* Kontekst, zakres i szkic                                            */
  /* ------------------------------------------------------------------ */

  function normalizeContext(context) {
    var c = context && typeof context === 'object' ? context : {};
    var out = {};
    CONTEXT_FIELDS.forEach(function (f) { out[f] = str(c[f]); });
    return out;
  }

  function looksDemo(c) {
    return /^demo[-_ ]/i.test(c.driver_id) || /^demo[-_ ]/i.test(c.vehicle_id) ||
      /^demo[-_ ]/i.test(c.round_id) || /^demo\b/i.test(c.vehicle_registration);
  }

  function contextProblems(context, demo) {
    var c = normalizeContext(context);
    var problems = [];
    CONTEXT_FIELDS.forEach(function (f) {
      if (!c[f]) {
        if (f === 'round_id') problems.push({ code: 'NO_ROUND', field: f, message: 'Brak przypisanej rundy.' });
        else problems.push({ code: 'MISSING_IDENTITY', field: f, message: 'Brak danych: ' + f + '.' });
      }
    });
    if (!demo && looksDemo(c)) {
      problems.push({ code: 'DEMO_CONTEXT_IN_LIVE', field: null, message: 'Dane demonstracyjne nie są dozwolone w trybie połączonym.' });
    }
    return problems;
  }

  function scopeKey(context, demo) {
    var c = normalizeContext(context);
    var ns = demo ? 'demo' : 'live';
    if (c.driver_id && c.vehicle_id && c.round_id) {
      return [ns, c.driver_id, c.vehicle_id, c.round_id].map(encodeURIComponent).join('|');
    }
    return ns + '|contextless|' + encodeURIComponent(c.driver_id || '-');
  }

  function idempotencyKey(draft) { return 'cw-claim-' + draft.draft_id; }

  function createDraft(context, options) {
    options = options || {};
    var demo = options.demo === true;
    var ctx = normalizeContext(context);
    var ts = nowIso(options);
    return {
      schema: 1,
      draft_id: uuid(options),
      demo: demo,
      context: ctx,
      category: CATEGORY,
      allowance: { currency: CURRENCY, amount_minor: AMOUNT_MINOR, server_owned: true },
      status: 'DRAFT',
      photos: [],
      confirmations: { own_funds: false, same_wash: false },
      created_at: ts,
      updated_at: ts,
      closed_at: null,
      server: null
    };
  }

  /* ------------------------------------------------------------------ */
  /* Etapy i ujęcia                                                      */
  /* ------------------------------------------------------------------ */

  function photoForSlot(draft, slotId) {
    for (var i = 0; i < draft.photos.length; i++) if (draft.photos[i].slot === slotId) return draft.photos[i];
    return null;
  }

  function stageState(draft) {
    var result = [];
    STAGES.forEach(function (st) {
      var slots = PHOTO_SLOTS.filter(function (s) { return s.stage === st.id; });
      var have = slots.filter(function (s) { return !!photoForSlot(draft, s.id); }).length;
      result.push({ id: st.id, label: st.label, short: st.short, slots: slots, count: have, total: slots.length, done: have === slots.length, unlocked: false });
    });
    var byId = {};
    result.forEach(function (r) { byId[r.id] = r; });
    byId.before.unlocked = true;
    byId.wash.unlocked = byId.before.done;
    byId.after.unlocked = byId.wash.unlocked && byId.wash.done;
    byId.details.unlocked = byId.after.unlocked;
    return result;
  }

  function missingSlots(draft) {
    return PHOTO_SLOTS.filter(function (s) { return !photoForSlot(draft, s.id); }).map(function (s) { return s.id; });
  }

  function canCaptureSlot(draft, slotId) {
    if (slotId === 'extra') return true;
    var s = SLOT_BY_ID[slotId];
    if (!s) return false;
    var st = stageState(draft);
    for (var i = 0; i < st.length; i++) if (st[i].id === s.stage) return st[i].unlocked;
    return false;
  }

  function totalBytes(photos) {
    return photos.reduce(function (n, p) { return n + (p.size || 0); }, 0);
  }

  function touched(draft, photos, options) {
    var next = copy(draft);
    next.photos = photos;
    next.updated_at = nowIso(options);
    // Zmiana dowodów unieważnia gotowość i oświadczenia — trzeba je złożyć ponownie.
    next.status = 'DRAFT';
    next.confirmations = { own_funds: false, same_wash: false };
    return next;
  }

  function photoProblem(photo) {
    if (ALLOWED_MIME.indexOf(photo.mime) === -1) return { code: 'BAD_MIME', message: 'Dozwolone są tylko zdjęcia JPEG, PNG lub WebP (nie PDF).' };
    if (!(photo.size > 0)) return { code: 'EMPTY_FILE', message: 'Plik jest pusty.' };
    if (photo.size > LIMITS.MAX_FILE_BYTES) return { code: 'FILE_TOO_LARGE', message: 'Zdjęcie jest większe niż ' + formatBytes(LIMITS.MAX_FILE_BYTES) + '.' };
    if (!/^[0-9a-f]{64}$/.test(photo.sha256 || '')) return { code: 'BAD_HASH', message: 'Brak poprawnej sumy SHA-256 zdjęcia.' };
    var longSide = Math.max(photo.width || 0, photo.height || 0);
    if (longSide < LIMITS.MIN_LONG_SIDE) {
      return { code: 'TOO_SMALL_IMAGE', message: 'Zdjęcie jest zbyt małe (dłuższy bok min. ' + LIMITS.MIN_LONG_SIDE + ' px).' };
    }
    return null;
  }

  function fail(error, slotId) { error.slot = slotId || null; return { ok: false, error: error }; }

  /**
   * Dodaje lub zastępuje (ponowne ujęcie) zdjęcie. Czysta funkcja — zwraca nowy szkic.
   * photo: {mime,size,width,height,sha256,blob,[source_hint]}
   */
  function addPhoto(draft, slotId, photo, options) {
    if (slotId !== 'extra' && !SLOT_BY_ID[slotId]) return fail({ code: 'UNKNOWN_SLOT', message: 'Nieznane ujęcie.' }, slotId);
    if (!canCaptureSlot(draft, slotId)) return fail({ code: 'STAGE_LOCKED', message: 'Najpierw ukończ poprzedni etap.' }, slotId);
    var problem = photoProblem(photo || {});
    if (problem) return fail(problem, slotId);
    var replaced = slotId === 'extra' ? null : photoForSlot(draft, slotId);
    var others = draft.photos.filter(function (p) { return p !== replaced; });
    if (others.length + 1 > LIMITS.MAX_PHOTOS) return fail({ code: 'TOO_MANY_PHOTOS', message: 'Limit techniczny: ' + LIMITS.MAX_PHOTOS + ' zdjęć.' }, slotId);
    if (totalBytes(others) + photo.size > LIMITS.MAX_TOTAL_BYTES) return fail({ code: 'TOTAL_SIZE', message: 'Limit łącznego rozmiaru: 100 MB.' }, slotId);
    for (var i = 0; i < others.length; i++) {
      if (others[i].sha256 === photo.sha256) {
        var where = others[i].slot === 'extra' ? 'dodatkowe' : SLOT_BY_ID[others[i].slot].label;
        return fail({ code: 'DUPLICATE_SHA', message: 'Ten sam plik został już użyty (' + where + '). Zrób nowe zdjęcie.', other_slot: others[i].slot }, slotId);
      }
    }
    var rec = {
      id: uuid(options),
      slot: slotId,
      mime: photo.mime,
      size: photo.size,
      width: photo.width,
      height: photo.height,
      sha256: photo.sha256,
      // Wskazówka, nie dowód: ani aparat, ani EXIF, ani czas importu nie potwierdzają chwili wykonania.
      source_hint: photo.source_hint === 'camera_capture_requested' ? 'camera_capture_requested' : 'gallery_import',
      added_at: nowIso(options),
      blob: photo.blob || null
    };
    return { ok: true, draft: touched(draft, others.concat([rec]), options), photo: rec };
  }

  function removePhoto(draft, photoId, options) {
    var rest = draft.photos.filter(function (p) { return p.id !== photoId; });
    if (rest.length === draft.photos.length) return draft;
    return touched(draft, rest, options);
  }

  function setConfirmation(draft, key, value, options) {
    if (key !== 'own_funds' && key !== 'same_wash') return draft;
    var next = copy(draft);
    next.confirmations = copy(draft.confirmations);
    next.confirmations[key] = value === true;
    next.status = 'DRAFT';
    next.updated_at = nowIso(options);
    return next;
  }

  function markReadyLocal(draft, options) {
    var v = validateDraft(draft, { requireBlobs: true });
    if (!v.ok) return { ok: false, errors: v.errors };
    var next = copy(draft);
    next.status = 'READY_LOCAL';
    next.updated_at = nowIso(options);
    return { ok: true, draft: next };
  }

  /* ------------------------------------------------------------------ */
  /* Walidacja                                                           */
  /* ------------------------------------------------------------------ */

  /**
   * options: {expectedContext, requireBlobs}
   * Zwraca {ok, errors:[{code,message,slot?}], missing:[slotId]}.
   */
  function validateDraft(draft, options) {
    options = options || {};
    var errors = [];
    function add(code, message, slotId) { errors.push({ code: code, message: message, slot: slotId || null }); }
    if (!draft || typeof draft !== 'object' || !Array.isArray(draft.photos)) {
      return { ok: false, errors: [{ code: 'MALFORMED_DRAFT', message: 'Uszkodzony szkic.', slot: null }], missing: PHOTO_SLOTS.map(function (s) { return s.id; }) };
    }
    var ctx = normalizeContext(draft.context);
    contextProblems(ctx, draft.demo === true).forEach(function (p) { add(p.code, p.message); });
    if (options.expectedContext) {
      var exp = normalizeContext(options.expectedContext);
      var same = CONTEXT_FIELDS.every(function (f) { return exp[f] && exp[f] === ctx[f]; });
      if (!same) add('IDENTITY_MISMATCH', 'Szkic należy do innego kierowcy, pojazdu lub rundy.');
    }
    var al = draft.allowance || {};
    if (al.amount_minor !== AMOUNT_MINOR || al.currency !== CURRENCY) {
      add('AMOUNT_TAMPERED', 'Kwota ryczałtu jest stała (15,00 EUR) i ustalana przez serwer.');
    }
    if (draft.category !== CATEGORY) add('BAD_CATEGORY', 'Nieprawidłowa kategoria wydatku.');

    var seenSlots = {};
    draft.photos.forEach(function (p) {
      if (p.slot !== 'extra' && !SLOT_BY_ID[p.slot]) add('UNKNOWN_SLOT', 'Nieznane ujęcie.', p.slot);
      else if (p.slot !== 'extra') {
        if (seenSlots[p.slot]) add('DUPLICATE_SLOT', 'Dwa zdjęcia w jednym ujęciu.', p.slot);
        seenSlots[p.slot] = true;
      }
      var pr = photoProblem(p);
      if (pr) add(pr.code, pr.message, p.slot);
      if (options.requireBlobs && !p.blob) add('PHOTO_BLOB_MISSING', 'Brak pliku zdjęcia w pamięci urządzenia.', p.slot);
    });
    if (draft.photos.length > LIMITS.MAX_PHOTOS) add('TOO_MANY_PHOTOS', 'Za dużo zdjęć (maks. ' + LIMITS.MAX_PHOTOS + ').');
    if (totalBytes(draft.photos) > LIMITS.MAX_TOTAL_BYTES) add('TOTAL_SIZE', 'Przekroczono łączny rozmiar 100 MB.');

    var firstBySha = {};
    draft.photos.forEach(function (p) {
      if (!p.sha256) return;
      if (firstBySha[p.sha256]) add('DUPLICATE_SHA', 'Ten sam plik użyty w więcej niż jednym ujęciu.', p.slot);
      else firstBySha[p.sha256] = p;
    });

    var missing = missingSlots(draft);
    missing.forEach(function (id) { add('MISSING_SLOT', 'Brakuje zdjęcia: ' + SLOT_BY_ID[id].label + '.', id); });

    var conf = draft.confirmations || {};
    if (conf.own_funds !== true) add('OWN_FUNDS_NOT_CONFIRMED', 'Potwierdź, że mycie opłacono z własnych środków.');
    if (conf.same_wash !== true) add('SAME_WASH_NOT_CONFIRMED', 'Potwierdź, że zdjęcia przedstawiają faktyczne, to samo mycie.');
    return { ok: errors.length === 0, errors: errors, missing: missing };
  }

  /* ------------------------------------------------------------------ */
  /* Zgłoszenie i odczyt zwrotny                                         */
  /* ------------------------------------------------------------------ */

  function evidenceKey(p) { return p.slot === 'extra' ? 'extra:' + p.sha256 : p.slot; }

  /**
   * Buduje ładunek do przyszłego API. Bez blobów, bez URL-i, bez kwoty od klienta
   * (jest tylko propozycja stałej stawki; backend ją ignoruje i sam ustala stan).
   */
  function buildSubmission(draft) {
    if (draft && draft.demo === true) {
      return { ok: false, errors: [{ code: 'DEMO_DRAFT_NOT_SUBMITTABLE', message: 'Szkic demonstracyjny nie może być wysłany.', slot: null }] };
    }
    var v = validateDraft(draft);
    if (!v.ok) return { ok: false, errors: v.errors };
    var c = normalizeContext(draft.context);
    var evidence = draft.photos.map(function (p) {
      var stage = p.slot === 'extra' ? null : SLOT_BY_ID[p.slot].stage;
      return {
        key: evidenceKey(p),
        slot: p.slot,
        kind: stage ? KIND_BY_STAGE[stage] : 'EXTRA',
        slot_kind: stage ? SLOT_BY_ID[p.slot].kind : 'EXTRA',
        sha256: p.sha256,
        mime: p.mime,
        size: p.size,
        width: p.width,
        height: p.height,
        source_hint: p.source_hint
      };
    }).sort(function (a, b) { return a.key < b.key ? -1 : a.key > b.key ? 1 : 0; });
    return {
      ok: true,
      payload: {
        schema: SCHEMA,
        idempotency_key: idempotencyKey(draft),
        draft_id: draft.draft_id,
        category: CATEGORY,
        driver_id: c.driver_id,
        vehicle_id: c.vehicle_id,
        round_id: c.round_id,
        own_funds_confirmed: true,
        same_wash_confirmed: true,
        allowance_proposal: { currency: CURRENCY, amount_minor: AMOUNT_MINOR, server_owned: true },
        evidence: evidence,
        client_created_at: draft.created_at
      }
    };
  }

  function unconfirmed(reason) {
    return { confirmed: false, state: 'UNCONFIRMED', reason: reason, claim_id: null, version: null, approved_minor: 0, paid_minor: 0 };
  }

  /**
   * Zgłoszenie jest potwierdzone TYLKO przy pełnej zgodności odpowiedzi właściciela.
   * HTTP 202, samo „uploaded”, odpowiedź uszkodzona lub niezgodna => UNCONFIRMED.
   */
  function classifyReadback(draft, response) {
    if (!draft || draft.demo === true) return unconfirmed('DEMO_DRAFT');
    if (!response || typeof response !== 'object' || Array.isArray(response)) return unconfirmed('MALFORMED');
    if (typeof response.status === 'number') return unconfirmed('HTTP_ACK_ONLY');
    if (typeof response.status !== 'string') return unconfirmed('MALFORMED');
    if (typeof response.claim_id !== 'string' || !response.claim_id.trim()) return unconfirmed('NO_CLAIM_ID');
    if (SERVER_STATUSES.indexOf(response.status) === -1) return unconfirmed('STATUS_NOT_CONFIRMING');
    if (!Number.isInteger(response.version) || response.version < 1) return unconfirmed('BAD_VERSION');
    var c = normalizeContext(draft.context);
    if (response.driver_id !== c.driver_id || !c.driver_id) return unconfirmed('DRIVER_MISMATCH');
    if (response.vehicle_id !== c.vehicle_id || !c.vehicle_id) return unconfirmed('VEHICLE_MISMATCH');
    if (response.round_id !== c.round_id || !c.round_id) return unconfirmed('ROUND_MISMATCH');
    if (response.category !== CATEGORY) return unconfirmed('CATEGORY_MISMATCH');
    if (response.currency !== CURRENCY || response.amount_minor !== AMOUNT_MINOR) return unconfirmed('AMOUNT_MISMATCH');
    if (response.idempotency_key !== idempotencyKey(draft)) return unconfirmed('IDEMPOTENCY_MISMATCH');
    if (!Array.isArray(response.evidence_hashes)) return unconfirmed('EVIDENCE_REQUIRED');
    {
      var mine = draft.photos.map(function (p) { return p.sha256; }).sort();
      var theirs = Array.isArray(response.evidence_hashes) ? response.evidence_hashes.slice().sort() : null;
      if (!theirs || mine.length !== theirs.length || mine.some(function (h, i) { return h !== theirs[i]; })) {
        return unconfirmed('EVIDENCE_MISMATCH');
      }
    }
    return {
      confirmed: true,
      state: response.status,
      reason: null,
      claim_id: response.claim_id,
      version: response.version,
      approved_minor: response.status === 'APPROVED' || response.status === 'SETTLED' ? AMOUNT_MINOR : 0,
      paid_minor: response.status === 'SETTLED' ? AMOUNT_MINOR : 0
    };
  }

  /* ------------------------------------------------------------------ */
  /* Trwały magazyn                                                      */
  /* ------------------------------------------------------------------ */

  function storageError(code, message, cause) {
    var e = new Error(message);
    e.code = code;
    e.cause = cause || null;
    return e;
  }

  function describeStorageError(err) {
    var name = err && err.name;
    if (name === 'QuotaExceededError' || (err && err.code === 22)) {
      return 'Brak miejsca na urządzeniu. Zdjęcie NIE zostało zapisane — zwolnij miejsce i spróbuj ponownie.';
    }
    if (name === 'SecurityError' || name === 'NotAllowedError' || name === 'InvalidStateError') {
      return 'Brak uprawnień do trwałego zapisu w aplikacji. Zdjęcie NIE zostało zapisane.';
    }
    return 'Nie udało się zapisać na urządzeniu. Zdjęcie NIE zostało zapisane.';
  }

  function assertOwnership(draft, context, demo) {
    var ctx = normalizeContext(context);
    var d = draft && draft.context ? normalizeContext(draft.context) : null;
    var ok = d && (draft.demo === true) === (demo === true) &&
      CONTEXT_FIELDS.every(function (f) { return d[f] === ctx[f]; });
    if (!ok) throw storageError('FOREIGN_DRAFT', 'Szkic należy do innego konta, pojazdu, rundy lub trybu.');
  }

  /**
   * adapter: {put(record), get(id), listByScope(scope), delete(id)} — wszystko zwraca Promise.
   * save() rozwiązuje się dopiero po zakończeniu transakcji; błąd => odrzucenie, bez „zapisano”.
   */
  function createStore(adapter) {
    if (!adapter) throw storageError('NO_STORAGE', 'Brak trwałego magazynu.');
    return {
      save: function (draft) {
        var rec = { draft_id: draft.draft_id, scope: scopeKey(draft.context, draft.demo === true), updated_at: draft.updated_at, draft: draft };
        return Promise.resolve(adapter.put(rec)).catch(function (e) {
          throw storageError('SAVE_FAILED', describeStorageError(e), e);
        });
      },
      get: function (id, context, demo) {
        return Promise.resolve(adapter.get(id)).then(function (rec) {
          if (!rec) return null;
          assertOwnership(rec.draft, context, demo);
          return rec.draft;
        });
      },
      /** Najnowszy nieodłożony szkic z dokładnie tego zakresu (konto/pojazd/runda/tryb). */
      load: function (context, demo) {
        return Promise.resolve(adapter.listByScope(scopeKey(context, demo === true))).then(function (recs) {
          var open = [];
          (recs || []).forEach(function (rec) {
            assertOwnership(rec.draft, context, demo);
            if (!rec.draft.closed_at) open.push(rec.draft);
          });
          open.sort(function (a, b) { return a.updated_at < b.updated_at ? 1 : a.updated_at > b.updated_at ? -1 : 0; });
          return open[0] || null;
        });
      },
      remove: function (id) { return Promise.resolve(adapter.delete(id)); }
    };
  }

  function createIndexedDbAdapter(factory, name) {
    var dbName = name || 'ss-car-wash';
    var dbPromise = null;
    function db() {
      if (dbPromise) return dbPromise;
      dbPromise = new Promise(function (resolve, reject) {
        var req = factory.open(dbName, 1);
        req.onupgradeneeded = function () {
          var s = req.result.createObjectStore('drafts', { keyPath: 'draft_id' });
          s.createIndex('scope', 'scope', { unique: false });
        };
        req.onsuccess = function () { resolve(req.result); };
        req.onerror = function () { reject(req.error); };
        req.onblocked = function () { reject(new Error('IndexedDB zablokowane')); };
      });
      dbPromise.catch(function () { dbPromise = null; });
      return dbPromise;
    }
    function run(mode, fn) {
      return db().then(function (d) {
        return new Promise(function (resolve, reject) {
          var tx, result;
          try {
            tx = d.transaction('drafts', mode);
            var r = fn(tx.objectStore('drafts'));
            r.onsuccess = function () { result = r.result; };
            r.onerror = function () { reject(r.error); };
          } catch (e) { reject(e); return; }
          tx.oncomplete = function () { resolve(result); };
          tx.onabort = function () { reject(tx.error || new Error('Transakcja przerwana')); };
          tx.onerror = function () { reject(tx.error); };
        });
      });
    }
    return {
      put: function (rec) { return run('readwrite', function (s) { return s.put(rec); }); },
      get: function (id) { return run('readonly', function (s) { return s.get(id); }); },
      delete: function (id) { return run('readwrite', function (s) { return s.delete(id); }); },
      listByScope: function (scope) { return run('readonly', function (s) { return s.index('scope').getAll(scope); }); }
    };
  }

  /* ------------------------------------------------------------------ */
  /* UI                                                                  */
  /* ------------------------------------------------------------------ */

  var active = null;

  function h(tag, attrs, kids) {
    var el = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      var v = attrs[k];
      if (v === false || v == null) return;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : v);
    });
    (function add(list) {
      [].concat(list).forEach(function (k) {
        if (k == null || k === false) return;
        if (Array.isArray(k)) add(k);
        else el.appendChild(typeof k === 'string' ? document.createTextNode(k) : k);
      });
    })(kids || []);
    return el;
  }

  function readBytes(blob) {
    if (typeof blob.arrayBuffer === 'function') return blob.arrayBuffer().then(function (b) { return new Uint8Array(b); });
    return new Promise(function (resolve, reject) {
      var fr = new FileReader();
      fr.onload = function () { resolve(new Uint8Array(fr.result)); };
      fr.onerror = function () { reject(fr.error); };
      fr.readAsArrayBuffer(blob);
    });
  }

  function decodeSize(blob) {
    if (typeof createImageBitmap === 'function') {
      return createImageBitmap(blob).then(function (bmp) {
        var r = { width: bmp.width, height: bmp.height };
        if (bmp.close) bmp.close();
        return r;
      });
    }
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(blob);
      var img = new Image();
      img.onload = function () { URL.revokeObjectURL(url); resolve({ width: img.naturalWidth, height: img.naturalHeight }); };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('decode')); };
      img.src = url;
    });
  }

  function close() {
    if (active) active.destroy();
    active = null;
  }

  function open(options) {
    close();
    options = options || {};
    var host = options.host || (typeof document !== 'undefined' && document.querySelector('.device'));
    if (!host) throw new Error('SuperSpedytorCarWash.open: brak elementu host (.device).');
    var demo = options.demo === true;
    var context;
    if (demo) {
      var given = normalizeContext(options.context);
      context = CONTEXT_FIELDS.every(function (f) { return given[f]; }) ? given : copy(DEMO_CONTEXT);
    } else {
      context = normalizeContext(options.context);
    }
    var problems = contextProblems(context, demo);
    var blocking = problems.filter(function (p) { return p.code === 'DEMO_CONTEXT_IN_LIVE' || (options.allowContextless !== true); });

    var store = null;
    try {
      var adapter = options.storage || (typeof indexedDB !== 'undefined' && indexedDB ? createIndexedDbAdapter(indexedDB) : null);
      store = adapter ? createStore(adapter) : null;
    } catch (e) { store = null; }

    var prevPosition = null;
    if (getComputedStyle(host).position === 'static') { prevPosition = host.style.position; host.style.position = 'relative'; }

    var state = { draft: null, view: 'loading', stageIdx: 0, busy: false, error: '', notice: '', preview: null, focusSlot: null, result: null };
    var urls = [];
    var strays = [];
    var overlay = h('div', { class: 'cw-overlay', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Mycie auta — dokumentacja zdjęciowa' });
    host.appendChild(overlay);

    function url(blob) {
      if (!blob || typeof URL === 'undefined' || !URL.createObjectURL) return '';
      var u = URL.createObjectURL(blob);
      urls.push(u);
      return u;
    }
    function revokeAll() {
      urls.forEach(function (u) { URL.revokeObjectURL(u); });
      urls = [];
      strays.forEach(function (i) { if (i.parentNode) i.parentNode.removeChild(i); });
      strays = [];
    }

    function persist(next) {
      if (!store) return Promise.reject(storageError('NO_STORAGE', 'Brak trwałego magazynu — zdjęcia nie mogą być zapisane na urządzeniu.'));
      return store.save(next);
    }
    function commit(next) {
      // Stan UI zmienia się dopiero po udanym zapisie transakcji.
      return persist(next).then(function () { state.draft = next; state.error = ''; }, function (e) {
        state.error = e && e.code ? e.message : describeStorageError(e);
        throw e;
      });
    }

    function handleFile(file, slotId, hint) {
      state.busy = true; state.error = ''; state.notice = ''; render();
      var photo;
      var finish = function () { state.busy = false; render(); };
      if (!file.size) { state.error = 'Plik jest pusty.'; return finish(); }
      if (file.size > LIMITS.MAX_FILE_BYTES) { state.error = 'Zdjęcie jest większe niż ' + formatBytes(LIMITS.MAX_FILE_BYTES) + '.'; return finish(); }
      return readBytes(file).then(function (bytes) {
        var mime = sniffMime(bytes);
        if (!mime) throw { ui: 'Nieobsługiwany plik. Dozwolone: JPEG, PNG, WebP (PDF nie jest zdjęciem).' };
        var blob = file.slice(0, file.size, mime);
        return decodeSize(blob).then(function (dim) { return { bytes: bytes, mime: mime, blob: blob, dim: dim }; }, function () {
          throw { ui: 'Nie udało się odczytać obrazu. Zrób zdjęcie ponownie.' };
        });
      }).then(function (r) {
        return sha256HexAsync(r.bytes).then(function (sha) {
          photo = { mime: r.mime, size: r.blob.size, width: r.dim.width, height: r.dim.height, sha256: sha, blob: r.blob, source_hint: hint };
        });
      }).then(function () {
        var res = addPhoto(state.draft, slotId, photo, options);
        if (!res.ok) { state.focusSlot = slotId; throw { ui: res.error.message }; }
        return commit(res.draft).then(function () {
          state.notice = 'Zapisano na urządzeniu.';
          state.focusSlot = slotId === 'extra' ? null : slotId;
        });
      }).catch(function (e) { if (e && e.ui) state.error = e.ui; else if (!state.error) state.error = describeStorageError(e); })
        .then(finish);
    }

    function pick(slotId, camera) {
      if (state.busy) return;
      var input = h('input', { type: 'file', accept: ALLOWED_MIME.join(','), class: 'cw-hidden-input', tabindex: '-1', 'aria-hidden': 'true' });
      if (camera) input.setAttribute('capture', 'environment');
      input.addEventListener('change', function () {
        var f = input.files && input.files[0];
        if (f) handleFile(f, slotId, camera ? 'camera_capture_requested' : 'gallery_import');
      });
      overlay.appendChild(input);
      strays.push(input);
      input.click();
    }

    function removeById(id) {
      if (state.busy) return;
      var next = removePhoto(state.draft, id, options);
      state.busy = true;
      commit(next).catch(function () {}).then(function () { state.busy = false; render(); });
    }

    function startNewWash() {
      var closed = copy(state.draft);
      closed.closed_at = nowIso(options);
      state.busy = true;
      commit(closed).then(function () {
        state.draft = createDraft(context, { demo: demo, now: options.now, uuid: options.uuid });
        state.view = 'intro'; state.stageIdx = 0; state.result = null;
      }).catch(function () {}).then(function () { state.busy = false; render(); });
    }

    function finishLocal() {
      var res = markReadyLocal(state.draft, options);
      if (!res.ok) {
        state.error = 'Uzupełnij: ' + res.errors.map(function (e) { return e.message; }).join(' ');
        var m = res.errors.filter(function (e) { return e.code === 'MISSING_SLOT'; })[0];
        if (m) { state.focusSlot = m.slot; state.view = 'capture'; state.stageIdx = STAGES.map(function (s) { return s.id; }).indexOf(SLOT_BY_ID[m.slot].stage); }
        return render();
      }
      state.busy = true; render();
      commit(res.draft).then(function () { state.view = 'done'; }).catch(function () {}).then(function () { state.busy = false; render(); });
    }

    function submitViaTransport() {
      var t = options.transport;
      if (!t || typeof t.submit !== 'function' || state.busy) return;
      var built = buildSubmission(state.draft);
      if (!built.ok) { state.error = built.errors.map(function (e) { return e.message; }).join(' '); return render(); }
      state.busy = true; state.error = ''; render();
      Promise.resolve(t.submit(built.payload, { draft: state.draft, idempotencyKey: built.payload.idempotency_key })).then(function (resp) {
        var cls = classifyReadback(state.draft, resp);
        state.result = cls;
        if (!cls.confirmed) return;
        var next = copy(state.draft);
        next.server = { claim_id: cls.claim_id, status: cls.state, version: cls.version, confirmed_at: nowIso(options) };
        return commit(next).catch(function () {});
      }).catch(function () { state.result = unconfirmed('TRANSPORT_ERROR'); })
        .then(function () { state.busy = false; render(); });
    }

    function goBack() {
      state.error = ''; state.notice = '';
      if (state.view === 'review') { state.view = 'capture'; state.stageIdx = STAGES.length - 1; }
      else if (state.view === 'capture') { if (state.stageIdx > 0) state.stageIdx--; else state.view = 'intro'; }
      else return close();
      render();
    }

    /* ---- widoki ---- */

    function thumb(p, label) {
      var src = url(p.blob);
      return h('button', { type: 'button', class: 'cw-thumb', 'aria-label': 'Podgląd: ' + label, onclick: function () { state.preview = p.id; render(); } },
        src ? h('img', { src: src, alt: label, loading: 'lazy' }) : h('span', { text: 'Brak pliku' }));
    }

    function photoMeta(p) {
      return p.width + '×' + p.height + ' px · ' + formatBytes(p.size) + ' · SHA ' + p.sha256.slice(0, 8);
    }

    function slotCard(s, unlocked) {
      var p = photoForSlot(state.draft, s.id);
      var num = PHOTO_SLOTS.indexOf(s) + 1;
      var dis = state.busy || !unlocked;
      var card = h('section', { class: 'cw-card' + (p ? ' cw-card-done' : ''), 'data-slot': s.id, tabindex: '-1' }, [
        h('div', { class: 'cw-card-head' }, [
          h('h3', { class: 'cw-card-title', text: num + '/' + PHOTO_SLOTS.length + ' · ' + s.label }),
          h('span', { class: 'cw-chip ' + (p ? 'cw-chip-ok' : 'cw-chip-todo'), text: p ? 'Dodane' : 'Brak' })
        ]),
        h('p', { class: 'cw-instruction', text: s.instruction }),
        p ? h('div', { class: 'cw-photo-row' }, [thumb(p, s.label), h('p', { class: 'cw-meta', text: photoMeta(p) })]) : null,
        h('div', { class: 'cw-actions' }, [
          h('button', { type: 'button', class: 'cw-btn ' + (p ? 'cw-btn-secondary' : 'cw-btn-primary'), disabled: dis, onclick: function () { pick(s.id, true); } }, p ? 'Zrób ponownie' : 'Aparat'),
          h('button', { type: 'button', class: 'cw-btn cw-btn-secondary', disabled: dis, onclick: function () { pick(s.id, false); } }, p ? 'Zamień z galerii' : 'Z galerii'),
          p ? h('button', { type: 'button', class: 'cw-btn cw-btn-danger', disabled: state.busy, onclick: function () { removeById(p.id); } }, 'Usuń') : null
        ])
      ]);
      return card;
    }

    function renderIntro() {
      return {
        body: [
          h('div', { class: 'cw-panel' }, [
            h('h2', { class: 'cw-h2', text: 'Mycie auta · 15 EUR po akceptacji' }),
            h('ul', { class: 'cw-list' }, [
              h('li', { text: 'Mycie zewnętrzne w myjni bezdotykowej, opłacone z Twoich własnych środków.' }),
              h('li', { text: 'Ryczałt 15 EUR przysługuje dopiero po ręcznej akceptacji przez biuro. Komplet zdjęć sam w sobie nie jest akceptacją.' }),
              h('li', { text: 'Wymagane jest ' + PHOTO_SLOTS.length + ' zdjęć w 4 etapach: przed myciem, w myjni, po myciu, detale (koła, szyba, maska).' }),
              h('li', { text: 'Zdjęcia muszą być ostre, bez filtrów i obróbki, wykonane tym samym autem. Możesz dodać do ' + LIMITS.MAX_PHOTOS + ' zdjęć łącznie.' }),
              h('li', { text: 'Postęp zapisuje się na urządzeniu i możesz do niego wrócić.' })
            ]),
            h('p', { class: 'cw-meta', text: 'Pojazd: ' + (state.draft.context.vehicle_registration || '—') + ' · Kierowca: ' + (state.draft.context.driver_full_name || '—') })
          ])
        ],
        footer: h('button', { type: 'button', class: 'cw-btn cw-btn-primary cw-btn-block', onclick: function () { state.view = 'capture'; state.stageIdx = firstOpenStage(); render(); } }, 'Zaczynamy')
      };
    }

    function firstOpenStage() {
      var ss = stageState(state.draft);
      for (var i = 0; i < ss.length; i++) if (ss[i].unlocked && !ss[i].done) return i;
      return ss.length - 1;
    }

    function renderCapture() {
      var ss = stageState(state.draft);
      var st = ss[state.stageIdx];
      var tabs = h('nav', { class: 'cw-tabs', 'aria-label': 'Etapy' }, ss.map(function (x, i) {
        return h('button', {
          type: 'button', class: 'cw-tab' + (x.done ? ' cw-tab-done' : ''),
          'aria-current': i === state.stageIdx ? 'step' : false, 'aria-disabled': x.unlocked ? false : 'true',
          onclick: function () { if (!x.unlocked) { state.error = 'Najpierw ukończ poprzedni etap.'; } else { state.error = ''; state.stageIdx = i; } render(); }
        }, [h('span', { class: 'cw-tab-name', text: x.short }), h('span', { class: 'cw-tab-count', text: x.count + '/' + x.total })]);
      }));
      var body = [tabs];
      if (!st.unlocked) body.push(h('p', { class: 'cw-banner cw-banner-info', text: 'Ten etap odblokuje się po ukończeniu poprzedniego.' }));
      st.slots.forEach(function (s) { body.push(slotCard(s, st.unlocked)); });
      var last = state.stageIdx === ss.length - 1;
      var missing = st.slots.filter(function (s) { return !photoForSlot(state.draft, s.id); });
      var footer = st.done
        ? h('button', { type: 'button', class: 'cw-btn cw-btn-primary cw-btn-block', onclick: function () {
            state.error = ''; state.notice = '';
            if (last) state.view = 'review'; else state.stageIdx++;
            render();
          } }, last ? 'Przegląd i potwierdzenie' : 'Dalej: ' + ss[state.stageIdx + 1].label)
        : h('button', { type: 'button', class: 'cw-btn cw-btn-primary cw-btn-block', disabled: !st.unlocked, onclick: function () { state.focusSlot = missing[0].id; render(); } },
            'Brakujące ujęcia: ' + missing.length + ' — pokaż');
      return { body: body, footer: footer };
    }

    function renderReview() {
      var d = state.draft;
      var v = validateDraft(d, { requireBlobs: true });
      var body = [];
      body.push(h('div', { class: 'cw-panel' }, [
        h('h2', { class: 'cw-h2', text: 'Przegląd kompletu' }),
        h('p', { class: 'cw-meta', text: d.photos.length + '/' + LIMITS.MAX_PHOTOS + ' zdjęć · ' + formatBytes(totalBytes(d.photos)) + ' z 100 MB' }),
        h('div', { class: 'cw-pairs' }, PHOTO_SLOTS.filter(function (s) { return s.stage === 'before'; }).map(function (b) {
          var a = photoForSlot(d, 'after_' + b.side);
          var bp = photoForSlot(d, b.id);
          return h('div', { class: 'cw-pair' }, [
            h('p', { class: 'cw-pair-label', text: b.label.split(' — ')[0] + ': przed / po' }),
            h('div', { class: 'cw-pair-imgs' }, [bp ? thumb(bp, b.label) : h('span', { class: 'cw-thumb cw-thumb-empty', text: 'brak' }), a ? thumb(a, 'Po: ' + b.label) : h('span', { class: 'cw-thumb cw-thumb-empty', text: 'brak' })])
          ]);
        }))
      ]));
      var extras = d.photos.filter(function (p) { return p.slot === 'extra'; });
      body.push(h('div', { class: 'cw-panel' }, [
        h('h3', { class: 'cw-h3', text: 'Dodatkowe zdjęcia (' + extras.length + ')' }),
        h('p', { class: 'cw-instruction', text: 'Np. zbliżenie mocnego zabrudzenia lub dodatkowe koło. Limit techniczny, nie ograniczenie liczby myć.' }),
        extras.length ? h('div', { class: 'cw-extra-grid' }, extras.map(function (p) {
          return h('div', { class: 'cw-extra' }, [thumb(p, 'Dodatkowe zdjęcie'), h('button', { type: 'button', class: 'cw-btn cw-btn-danger cw-btn-small', disabled: state.busy, onclick: function () { removeById(p.id); } }, 'Usuń')]);
        })) : null,
        h('div', { class: 'cw-actions' }, [
          h('button', { type: 'button', class: 'cw-btn cw-btn-secondary', disabled: state.busy, onclick: function () { pick('extra', true); } }, 'Dodaj aparatem'),
          h('button', { type: 'button', class: 'cw-btn cw-btn-secondary', disabled: state.busy, onclick: function () { pick('extra', false); } }, 'Dodaj z galerii')
        ])
      ]));
      function check(key, text) {
        var id = 'cw-chk-' + key;
        return h('label', { class: 'cw-check', for: id }, [
          h('input', { type: 'checkbox', id: id, checked: d.confirmations[key] === true, disabled: state.busy, onchange: function (ev) {
            var next = setConfirmation(state.draft, key, ev.target.checked, options);
            state.busy = true; render();
            commit(next).catch(function () {}).then(function () { state.busy = false; render(); });
          } }),
          h('span', { text: text })
        ]);
      }
      body.push(h('div', { class: 'cw-panel' }, [
        h('h3', { class: 'cw-h3', text: 'Oświadczenia' }),
        check('own_funds', 'Oświadczam, że mycie opłaciłem z własnych środków.'),
        check('same_wash', 'Oświadczam, że zdjęcia przedstawiają faktyczne, to samo mycie tego samego auta.')
      ]));
      if (!v.ok) {
        body.push(h('div', { class: 'cw-banner cw-banner-info' }, [
          h('p', { text: 'Do uzupełnienia:' }),
          h('ul', { class: 'cw-list' }, v.errors.slice(0, 8).map(function (e) { return h('li', { text: e.message }); }))
        ]));
      }
      return {
        body: body,
        footer: h('button', { type: 'button', class: 'cw-btn cw-btn-primary cw-btn-block', disabled: state.busy, onclick: finishLocal }, 'Zakończ przygotowanie na urządzeniu')
      };
    }

    function renderDone() {
      var r = state.result;
      var canSend = options.transport && typeof options.transport.submit === 'function' && !demo && blocking.length === 0;
      var body = [h('div', { class: 'cw-panel cw-panel-done' }, [
        h('h2', { class: 'cw-h2', text: 'Dokumentacja gotowa' }),
        h('p', { class: 'cw-done-text', role: 'status', text: DONE_TEXT }),
        h('p', { class: 'cw-meta', text: 'Wypłacono: ' + formatMinor(r && r.confirmed ? r.paid_minor : 0) + '. Ryczałt 15 EUR przysługuje dopiero po akceptacji biura.' })
      ])];
      if (state.draft.server && !(r && r.confirmed)) {
        body.push(h('p', { class: 'cw-banner cw-banner-info', text: 'Ostatni potwierdzony przez serwer status: ' + state.draft.server.status + ' (zgłoszenie ' + state.draft.server.claim_id + ').' }));
      }
      if (r) {
        body.push(h('p', { class: 'cw-banner ' + (r.confirmed ? 'cw-banner-info' : 'cw-banner-error'), role: 'status',
          text: r.confirmed ? 'Serwer potwierdził zgłoszenie ' + r.claim_id + ', status: ' + r.state + '.' : 'Brak potwierdzenia z serwera (' + r.reason + '). Dokumentacja pozostaje tylko na urządzeniu.' }));
      }
      var foot = [];
      if (canSend) foot.push(h('button', { type: 'button', class: 'cw-btn cw-btn-primary cw-btn-block', disabled: state.busy, onclick: submitViaTransport }, 'Wyślij do weryfikacji'));
      foot.push(h('button', { type: 'button', class: 'cw-btn cw-btn-secondary cw-btn-block', disabled: state.busy, onclick: function () { state.view = 'review'; render(); } }, 'Wróć do edycji'));
      foot.push(h('button', { type: 'button', class: 'cw-btn cw-btn-secondary cw-btn-block', disabled: state.busy, onclick: startNewWash }, 'Nowe mycie'));
      return { body: body, footer: foot };
    }

    function renderBlocked() {
      return {
        body: [h('div', { class: 'cw-panel' }, [
          h('h2', { class: 'cw-h2', text: 'Nie można rozpocząć' }),
          h('ul', { class: 'cw-list' }, (blocking.length ? blocking : [{ message: state.error || 'Nieznany błąd.' }]).map(function (p) { return h('li', { text: p.message }); })),
          h('p', { class: 'cw-meta', text: 'Mycie wymaga przypisanego kierowcy, pojazdu i rundy z systemu. Nic nie zostało zapisane.' })
        ])],
        footer: h('button', { type: 'button', class: 'cw-btn cw-btn-secondary cw-btn-block', onclick: close }, 'Zamknij')
      };
    }

    function render() {
      revokeAll();
      var v;
      if (state.view === 'loading') v = { body: [h('p', { class: 'cw-meta', text: 'Wczytywanie…' })], footer: null };
      else if (state.view === 'blocked') v = renderBlocked();
      else if (state.view === 'intro') v = renderIntro();
      else if (state.view === 'capture') v = renderCapture();
      else if (state.view === 'review') v = renderReview();
      else v = renderDone();

      var progress = state.draft ? state.draft.photos.filter(function (p) { return p.slot !== 'extra'; }).length : 0;
      var header = h('header', { class: 'cw-header' }, [
        h('button', { type: 'button', class: 'cw-back', 'aria-label': 'Wróć', onclick: goBack }, '←'),
        h('div', { class: 'cw-header-text' }, [
          h('h1', { class: 'cw-title', text: 'Mycie auta' }),
          h('p', { class: 'cw-sub', text: (demo ? 'TRYB TESTOWY (dane demo) · ' : '') + (state.draft ? progress + '/' + PHOTO_SLOTS.length + ' wymaganych zdjęć' : '') })
        ])
      ]);
      var banners = [];
      if (!store && state.view !== 'blocked') banners.push(h('p', { class: 'cw-banner cw-banner-error', role: 'alert', text: 'Brak trwałego magazynu na urządzeniu — zdjęć nie można zapisać.' }));
      if (state.error) banners.push(h('p', { class: 'cw-banner cw-banner-error', role: 'alert', text: state.error }));
      else if (state.notice) banners.push(h('p', { class: 'cw-banner cw-banner-ok', role: 'status', text: state.notice }));
      var scroller = h('div', { class: 'cw-body' }, banners.concat(v.body));
      var footer = v.footer ? h('footer', { class: 'cw-footer' }, v.footer) : null;
      var layers = [header, scroller, footer];

      if (state.preview && state.draft) {
        var pp = state.draft.photos.filter(function (p) { return p.id === state.preview; })[0];
        if (pp) {
          var label = pp.slot === 'extra' ? 'Dodatkowe zdjęcie' : SLOT_BY_ID[pp.slot].label;
          layers.push(h('div', { class: 'cw-preview', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Podgląd zdjęcia' }, [
            h('button', { type: 'button', class: 'cw-btn cw-btn-primary cw-preview-close', onclick: function () { state.preview = null; render(); } }, 'Zamknij podgląd'),
            h('img', { src: url(pp.blob), alt: label }),
            h('p', { class: 'cw-preview-caption', text: label + ' · ' + photoMeta(pp) })
          ]));
        }
      }
      while (overlay.firstChild) overlay.removeChild(overlay.firstChild);
      layers.forEach(function (l) { if (l) overlay.appendChild(l); });
      if (state.focusSlot) {
        var target = overlay.querySelector('[data-slot="' + state.focusSlot + '"]');
        state.focusSlot = null;
        if (target) {
          if (target.scrollIntoView) target.scrollIntoView({ block: 'center' });
          target.focus({ preventScroll: true });
        }
      }
    }

    function init() {
      if (blocking.length) { state.view = 'blocked'; render(); return Promise.resolve(); }
      if (!store) {
        state.draft = createDraft(context, { demo: demo, now: options.now, uuid: options.uuid });
        state.view = 'intro'; render(); return Promise.resolve();
      }
      return store.load(context, demo).then(function (draft) {
        state.draft = draft || createDraft(context, { demo: demo, now: options.now, uuid: options.uuid });
        var fresh = state.draft.photos.length === 0;
        state.view = fresh ? 'intro' : (state.draft.status === 'READY_LOCAL' ? 'done' : 'capture');
        if (state.view === 'capture') state.stageIdx = firstOpenStage();
        render();
      }).catch(function (e) {
        state.error = e && e.code === 'FOREIGN_DRAFT' ? 'Odmowa: znaleziony szkic należy do innego konta lub pojazdu.' : describeStorageError(e);
        blocking = [{ message: state.error }];
        state.view = 'blocked'; render();
      });
    }

    var handle = {
      close: close,
      getDraft: function () { return state.draft; },
      ready: null
    };
    active = {
      destroy: function () {
        revokeAll();
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        if (prevPosition !== null) host.style.position = prevPosition;
        state.view = 'closed';
        render = function () {};
      }
    };
    render();
    handle.ready = init();
    return handle;
  }

  return {
    PHOTO_SLOTS: PHOTO_SLOTS,
    STAGES: STAGES,
    AMOUNT_MINOR: AMOUNT_MINOR,
    CURRENCY: CURRENCY,
    CATEGORY: CATEGORY,
    LIMITS: LIMITS,
    ALLOWED_MIME: ALLOWED_MIME,
    DEMO_CONTEXT: DEMO_CONTEXT,
    DONE_TEXT: DONE_TEXT,
    createDraft: createDraft,
    validateDraft: validateDraft,
    buildSubmission: buildSubmission,
    classifyReadback: classifyReadback,
    open: open,
    close: close,
    // pomocnicze (domena i testy)
    addPhoto: addPhoto,
    removePhoto: removePhoto,
    setConfirmation: setConfirmation,
    markReadyLocal: markReadyLocal,
    stageState: stageState,
    missingSlots: missingSlots,
    canCaptureSlot: canCaptureSlot,
    contextProblems: contextProblems,
    scopeKey: scopeKey,
    idempotencyKey: idempotencyKey,
    createStore: createStore,
    createIndexedDbAdapter: createIndexedDbAdapter,
    describeStorageError: describeStorageError,
    sha256Hex: sha256Hex,
    sniffMime: sniffMime
  };
});
