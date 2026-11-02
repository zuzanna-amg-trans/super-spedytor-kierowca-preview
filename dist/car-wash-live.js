/*
 * Super Spedytor — mycie zewnętrzne auta, PRAWDZIWA wysyłka do TMS (B935).
 *
 * Moduł nie ma własnego klienta HTTP ani tokenów: host (flow.js) wstrzykuje
 * request/upload/capture/release oparte o mostek natywny. Oryginały zdjęć
 * zostają w natywnym NativeFileStore; tutaj trzymamy tylko tokeny, sumy SHA-256
 * i postęp w osobnym IndexedDB (ss-car-wash-live), związanym z właścicielem
 * (origin backendu + id kierowcy). Status "wysłano" pochodzi wyłącznie z
 * odczytu GET szczegółu zgłoszenia z serwera.
 * Część domenowa jest czysta (bez DOM) i testowalna w Node; UI jest na dole.
 */
(function (root, factory) {
  var api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.SuperSpedytorCarWashLive = api;
})(typeof window !== 'undefined' ? window : globalThis, function (root) {
  'use strict';

  /* ------------------------------------------------------------------ */
  /* Stałe                                                               */
  /* ------------------------------------------------------------------ */

  var AMOUNT_MINOR = 1500;
  var CURRENCY = 'EUR';
  var CATEGORY = 'EXTERIOR_TOUCHLESS_WASH';
  var LIMITS = Object.freeze({
    MAX_PHOTOS: 30,
    MAX_TOTAL_BYTES: 100 * 1024 * 1024,
    MAX_FILE_BYTES: 25 * 1024 * 1024,
    MIN_LONG_SIDE: 640
  });
  var ALLOWED_MIME = Object.freeze(['image/jpeg', 'image/png', 'image/webp']);
  var EDITABLE = Object.freeze(['DRAFT', 'NEEDS_CORRECTION']);
  var SENT_STATUSES = Object.freeze(['SUBMITTED', 'APPROVED', 'NEEDS_CORRECTION', 'REJECTED']);
  var ALL_STATUSES = Object.freeze(['DRAFT', 'SUBMITTED', 'NEEDS_CORRECTION', 'APPROVED', 'REJECTED']);
  var PHOTO_PATH_SUFFIX = '/photos/';
  var DB_NAME = 'ss-car-wash-live';

  var STAGES = Object.freeze([
    Object.freeze({ id: 'before', label: 'Przed myciem' }),
    Object.freeze({ id: 'wash', label: 'W myjni' }),
    Object.freeze({ id: 'after', label: 'Po myciu' }),
    Object.freeze({ id: 'details', label: 'Detale po myciu' })
  ]);
  var SLOT_TABLE = [
    ['before_front', 'before', 'Przód — przed myciem'],
    ['before_right', 'before', 'Prawy bok — przed myciem'],
    ['before_rear', 'before', 'Tył — przed myciem'],
    ['before_left', 'before', 'Lewy bok — przed myciem'],
    ['wash_bay', 'wash', 'Auto na stanowisku myjni'],
    ['after_front', 'after', 'Przód — po myciu'],
    ['after_right', 'after', 'Prawy bok — po myciu'],
    ['after_rear', 'after', 'Tył — po myciu'],
    ['after_left', 'after', 'Lewy bok — po myciu'],
    ['after_wheel_front_left', 'details', 'Koło lewe przednie — po myciu'],
    ['after_wheel_front_right', 'details', 'Koło prawe przednie — po myciu'],
    ['after_wheel_rear_right', 'details', 'Koło prawe tylne — po myciu'],
    ['after_wheel_rear_left', 'details', 'Koło lewe tylne — po myciu'],
    ['after_windshield', 'details', 'Przednia szyba — po myciu'],
    ['after_hood', 'details', 'Maska — po myciu']
  ];
  var FALLBACK_INSTRUCTION = 'Zrób ostre zdjęcie w dobrym świetle, bez filtrów. To samo auto na każdym zdjęciu.';

  // Instrukcje z prototypu, jeśli jest załadowany (te same etykiety i teksty).
  var proto = null;
  try {
    proto = (root && root.SuperSpedytorCarWash) || (typeof require === 'function' ? require('./car-wash.js') : null);
  } catch (e) { proto = null; }
  var protoById = {};
  if (proto && Array.isArray(proto.PHOTO_SLOTS)) proto.PHOTO_SLOTS.forEach(function (s) { protoById[s.id] = s; });

  var SLOTS = Object.freeze(SLOT_TABLE.map(function (row) {
    var p = protoById[row[0]];
    return Object.freeze({
      id: row[0],
      stage: row[1],
      label: p && p.label ? p.label : row[2],
      instruction: p && p.instruction ? p.instruction : FALLBACK_INSTRUCTION
    });
  }));
  var SLOT_IDS = Object.freeze(SLOTS.map(function (s) { return s.id; }));
  var SLOT_BY_ID = {};
  SLOTS.forEach(function (s) { SLOT_BY_ID[s.id] = s; });

  /* ------------------------------------------------------------------ */
  /* Narzędzia czyste                                                    */
  /* ------------------------------------------------------------------ */

  var UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
  var SHA_RE = /^[0-9a-f]{64}$/;
  var TOKEN_RE = /^[0-9a-f]{32}$/;
  var ISO_TZ_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

  function isObj(v) { return v !== null && typeof v === 'object' && !Array.isArray(v); }
  function isUuid(v) { return typeof v === 'string' && UUID_RE.test(v); }
  function nonEmpty(v) { return typeof v === 'string' && v.trim() !== ''; }
  function clone(v) { return JSON.parse(JSON.stringify(v)); }
  function sameList(a, b) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    for (var i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
    return true;
  }

  function newUuid(options) {
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

  function claimKey(draftId) { return 'cw-claim-' + draftId; }
  function photoKey(photoId) { return 'cw-photo-' + photoId; }

  function fnv(text, seed) {
    var h = seed >>> 0;
    for (var i = 0; i < text.length; i++) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    var s = h.toString(16);
    return '00000000'.slice(s.length) + s;
  }
  /** Klucz operacji wysyłki: stały dla (zgłoszenie, cykl poprawek, dokładny manifest), ≤64 znaki. */
  function submitKey(claimId, cycle, hashes) {
    var text = claimId + '|' + (cycle || 0) + '|' + hashes.slice().sort().join(',');
    return 'cw-submit-' + claimId + '-' + fnv(text, 0x811c9dc5) + fnv(text, 0x9747b28c);
  }

  function activePhotos(detail) {
    return (detail && Array.isArray(detail.photos) ? detail.photos : []).filter(function (p) { return isObj(p) && p.active === true; });
  }

  /* ------------------------------------------------------------------ */
  /* Kontekst, zdjęcia z aparatu, walidacja odpowiedzi serwera           */
  /* ------------------------------------------------------------------ */

  function statusClass(status) {
    if (status === 200 || status === 201) return 'ok';
    if (status === 202) return 'accepted';
    if (status === 401) return 'auth';
    if (status === 403) return 'forbidden';
    if (status === 404) return 'unavailable';
    if (status === 409) return 'conflict';
    if (status === 408 || status === 429 || status === 0 || status >= 500) return 'transient';
    return 'invalid';
  }

  function normalizeResult(r) {
    if (!isObj(r)) return { status: 0, body: {}, message: 'Brak odpowiedzi warstwy natywnej.' };
    var status = Number.isInteger(r.status) ? r.status : 0;
    return { status: status, body: isObj(r.body) ? r.body : {}, message: typeof r.message === 'string' ? r.message : '' };
  }

  function failureText(res) {
    switch (statusClass(res.status)) {
      case 'auth': return 'Sesja wygasła — zaloguj się ponownie.';
      case 'forbidden': return 'Serwer odmówił dostępu (403). Zgłoszenie jest zablokowane dla tego konta.';
      case 'unavailable': return 'Funkcja mycia nie jest dostępna na serwerze (404). Nic nie wysłano.';
      case 'conflict': return 'Konflikt z danymi na serwerze (409). Odśwież zgłoszenie i sprawdź jego stan.';
      case 'transient': return res.message || 'Brak połączenia z serwerem. Dane zostają na telefonie — ponów wysyłkę.';
      case 'accepted': return 'Serwer odpowiedział „przyjęto” (202) — to nie jest potwierdzenie.';
      default: return (res.message || (isObj(res.body) && (res.body.detail || res.body.error)) || 'Serwer odrzucił żądanie (' + res.status + ').');
    }
  }

  /** GET car-wash/context/ → { state: ready|blocked|unavailable|forbidden|auth|error, ... } */
  function validateContext(res) {
    res = normalizeResult(res);
    var cls = statusClass(res.status);
    if (cls === 'unavailable') return { state: 'unavailable', reason: failureText(res) };
    if (cls === 'forbidden') return { state: 'forbidden', reason: failureText(res) };
    if (cls === 'auth') return { state: 'auth', reason: failureText(res) };
    if (cls !== 'ok') return { state: 'error', reason: failureText(res) };
    var b = res.body;
    if (b.enabled !== true) return { state: 'unavailable', reason: 'Mycie zewnętrzne jest wyłączone na serwerze.' };
    var serverNow = typeof b.server_now === 'string' && ISO_TZ_RE.test(b.server_now) ? b.server_now : '';
    var c = b.context;
    var identity = isObj(b.driver_identity) && nonEmpty(b.driver_identity.driver_id) && nonEmpty(b.driver_identity.driver_full_name) ? b.driver_identity : null;
    if (!isObj(c)) {
      return { state: 'blocked', identity: identity, reason: nonEmpty(b.reason) ? b.reason : 'Brak przypisania pojazdu i rundy.', serverNow: serverNow };
    }
    var ctx = {
      driver_id: c.driver_id, driver_full_name: c.driver_full_name,
      vehicle_id: c.vehicle_id, vehicle_registration: c.vehicle_registration, round_id: c.round_id
    };
    var ids = ['driver_id', 'vehicle_id', 'round_id'];
    for (var i = 0; i < ids.length; i++) {
      if (!nonEmpty(ctx[ids[i]])) return { state: 'error', reason: 'Serwer zwrócił niepełny kontekst mycia.' };
      if (/^demo/i.test(ctx[ids[i]])) return { state: 'error', reason: 'Serwer zwrócił dane demonstracyjne — odmowa.' };
    }
    if (!nonEmpty(ctx.driver_full_name) || !nonEmpty(ctx.vehicle_registration)) {
      return { state: 'error', reason: 'Serwer nie zwrócił pełnego imienia i nazwiska albo rejestracji.' };
    }
    if (!serverNow) return { state: 'error', reason: 'Serwer nie zwrócił poprawnego czasu (server_now).' };
    if (b.can_submit !== true) {
      return { state: 'blocked', context: ctx, serverNow: serverNow, reason: nonEmpty(b.reason) ? b.reason : 'Wysyłka mycia jest teraz zablokowana.' };
    }
    return { state: 'ready', context: ctx, serverNow: serverNow };
  }

  /** Wynik natywnego capturePhoto → { ok, photo } | { cancelled } | { ok:false, message }. */
  function validateCapture(result) {
    if (!isObj(result)) return { ok: false, message: 'Aparat nie zwrócił wyniku.' };
    if (result.status === 'cancelled' || result.cancelled === true) return { cancelled: true };
    if (result.status !== 'ok') return { ok: false, message: result.message || 'Nie udało się zrobić zdjęcia.' };
    if (!TOKEN_RE.test(result.token || '')) return { ok: false, message: 'Aparat zwrócił nieprawidłowy token pliku.' };
    if (ALLOWED_MIME.indexOf(result.mime) < 0) return { ok: false, token: result.token, message: 'Dozwolone są tylko JPEG, PNG i WebP.' };
    if (!Number.isInteger(result.size) || result.size <= 0) return { ok: false, token: result.token, message: 'Plik zdjęcia jest pusty.' };
    if (result.size > LIMITS.MAX_FILE_BYTES) return { ok: false, token: result.token, message: 'Zdjęcie jest większe niż 25 MiB.' };
    if (!SHA_RE.test(result.sha256 || '')) return { ok: false, token: result.token, message: 'Brak poprawnej sumy SHA-256 zdjęcia.' };
    var w = result.width, hgt = result.height;
    if (!Number.isInteger(w) || !Number.isInteger(hgt) || w <= 0 || hgt <= 0) {
      return { ok: false, token: result.token, message: 'Nie udało się ustalić wymiarów zdjęcia.' };
    }
    if (Math.max(w, hgt) < LIMITS.MIN_LONG_SIDE) {
      return { ok: false, token: result.token, message: 'Zdjęcie jest za małe (dłuższy bok min. ' + LIMITS.MIN_LONG_SIDE + ' px).' };
    }
    return {
      ok: true,
      photo: { token: result.token, mime: result.mime, size: result.size, sha256: result.sha256, width: w, height: hgt }
    };
  }

  /** Niezmienniki szczegółu zgłoszenia względem lokalnego rekordu. */
  function validateDetail(d, rec) {
    function bad(reason) { return { ok: false, reason: reason }; }
    if (!isObj(d)) return bad('MALFORMED');
    if (!isUuid(d.claim_id)) return bad('CLAIM_ID');
    if (rec.claim_id && d.claim_id !== rec.claim_id) return bad('CLAIM_ID_MISMATCH');
    if (d.draft_id !== rec.draft_id) return bad('DRAFT_MISMATCH');
    if (d.idempotency_key !== rec.creation.idempotency_key) return bad('KEY_MISMATCH');
    if (d.category !== CATEGORY) return bad('CATEGORY');
    if (String(d.driver_id) !== rec.context.driver_id) return bad('DRIVER_MISMATCH');
    if (String(d.vehicle_id) !== rec.context.vehicle_id) return bad('VEHICLE_MISMATCH');
    if (String(d.round_id) !== rec.context.round_id) return bad('ROUND_MISMATCH');
    if (d.currency !== CURRENCY || d.amount_minor !== AMOUNT_MINOR) return bad('AMOUNT_MISMATCH');
    if (ALL_STATUSES.indexOf(d.status) < 0) return bad('STATUS');
    if (!Number.isInteger(d.version) || d.version < 1) return bad('VERSION');
    if (!Array.isArray(d.photos) || !Array.isArray(d.evidence_hashes)) return bad('MALFORMED');
    if (!nonEmpty(d.driver_full_name)) return bad('NAME');
    return { ok: true };
  }

  /** Szczegół z listy GET claims/: własność względem bieżącego kontekstu kierowcy. */
  function validateOwnedDetail(d, ctx) {
    if (!isObj(d) || !isUuid(d.claim_id) || !isUuid(d.draft_id)) return false;
    if (d.category !== CATEGORY || d.currency !== CURRENCY || d.amount_minor !== AMOUNT_MINOR) return false;
    if (ALL_STATUSES.indexOf(d.status) < 0 || !Number.isInteger(d.version) || d.version < 1) return false;
    if (!Array.isArray(d.photos) || !Array.isArray(d.evidence_hashes)) return false;
    if (!ctx || String(d.driver_id) !== ctx.driver_id) return false;
    return nonEmpty(d.driver_full_name);
  }

  /** Aktywne zdjęcia serwera muszą być dokładnie lokalnym manifestem (15 slotów, te same sumy). */
  function manifestMatches(detail, photos) {
    var active = activePhotos(detail);
    var keys = Object.keys(photos || {});
    if (active.length !== keys.length || active.length < SLOT_IDS.length || active.length > 30) return false;
    if (!SLOT_IDS.every(function (id) { return photos[id]; })) return false;
    var seen = {};
    return active.every(function (server) {
      var key = keys.find(function (id) { return !seen[id] && photos[id].slot === server.slot && photos[id].sha256 === server.sha256; });
      if (!key) return false;
      seen[key] = true;
      return true;
    });
  }

  function localManifest(photos) {
    return Object.keys(photos || {}).map(function (id) { return photos[id] && photos[id].sha256; }).filter(Boolean).sort();
  }

  function slotLabel(key) { return SLOT_BY_ID[key] ? SLOT_BY_ID[key].label : 'Zdjęcie dodatkowe'; }
  function captureAllowed(rec, key) {
    if (key === 'extra') return localProblems(rec).length === 0;
    var slot = SLOT_BY_ID[key];
    if (!slot) return false;
    var index = STAGES.findIndex(function (stage) { return stage.id === slot.stage; });
    return SLOTS.filter(function (item) { return STAGES.findIndex(function (stage) { return stage.id === item.stage; }) < index; })
      .every(function (item) { return !!rec.photos[item.id]; });
  }

  /** Odpowiedź 200/201 uploadu: dokładne dopasowanie zdjęcia i szczegółu. */
  function validateUploadResponse(res, rec, photo) {
    function bad(reason) { return { ok: false, reason: reason }; }
    var b = res.body;
    if (!isObj(b) || !isObj(b.photo) || !isObj(b.claim)) return bad('MALFORMED');
    var p = b.photo;
    if (!nonEmpty(p.id) || p.slot !== photo.slot || p.sha256 !== photo.sha256) return bad('PHOTO_MISMATCH');
    if (p.active !== true || p.size !== photo.size || p.mime !== photo.mime) return bad('PHOTO_MISMATCH');
    var v = validateDetail(b.claim, rec);
    if (!v.ok) return bad(v.reason);
    if (EDITABLE.indexOf(b.claim.status) < 0) return bad('STATUS');
    var found = activePhotos(b.claim).filter(function (x) { return x.id === p.id && x.slot === p.slot && x.sha256 === p.sha256; });
    if (found.length !== 1) return bad('NOT_IN_CLAIM');
    if (photo.op && b.claim.version <= photo.op.expected_version) return bad('VERSION');
    return { ok: true, photo: p, claim: b.claim };
  }

  /** Czy odczyt GET potwierdza dokładnie tę wysyłkę (a nie tylko 200 z POST)? */
  function classifySent(detail, rec, op) {
    var v = validateDetail(detail, rec);
    if (!v.ok) return { sent: false, reason: v.reason };
    if (SENT_STATUSES.indexOf(detail.status) < 0) return { sent: false, reason: 'NOT_SUBMITTED' };
    if (!op || detail.version <= op.expected_version) return { sent: false, reason: 'VERSION' };
    if (!sameList(detail.evidence_hashes.slice().sort(), op.evidence_hashes.slice().sort())) return { sent: false, reason: 'EVIDENCE_MISMATCH' };
    return { sent: true, status: detail.status };
  }

  /** Opis statusu z serwera. Nigdy nie sugeruje wypłaty. */
  function statusView(detail) {
    var reason = detail && isObj(detail.review) && nonEmpty(detail.review.reason) ? detail.review.reason : '';
    var st = detail ? detail.status : 'DRAFT';
    if (st === 'SUBMITTED') return { label: 'Wysłane — czeka na biuro', tone: 'info', locked: true, paid: false, text: 'Biuro sprawdzi zdjęcia. Na tym etapie nic nie jest zatwierdzone.' };
    if (st === 'APPROVED') {
      var inRound = detail.settlement_state === 'IN_ROUND';
      return {
        label: inRound ? 'Zatwierdzone — ujęte w rozliczeniu rundy' : 'Zatwierdzone — czeka na ujęcie w rundzie',
        tone: 'ok', locked: true, paid: false,
        text: (inRound ? 'Ryczałt 15,00 EUR jest ujęty w rozliczeniu rundy.' : 'Ryczałt 15,00 EUR zostanie ujęty w rozliczeniu rundy.') +
          ' To nie jest potwierdzenie wypłaty.'
      };
    }
    if (st === 'NEEDS_CORRECTION') return { label: 'Biuro prosi o poprawę', tone: 'warn', locked: false, paid: false, text: reason || 'Biuro nie podało powodu.' };
    if (st === 'REJECTED') return { label: 'Odrzucone przez biuro', tone: 'error', locked: true, paid: false, text: reason || 'Biuro nie podało powodu.' };
    return { label: 'Szkic', tone: 'neutral', locked: false, paid: false, text: 'Uzupełnij 15 zdjęć i wyślij do biura.' };
  }

  /* ------------------------------------------------------------------ */
  /* Rekord lokalny                                                      */
  /* ------------------------------------------------------------------ */

  function createRecord(owner, ctxResult, options) {
    var draftId = newUuid(options);
    var ctx = ctxResult.context;
    var now = options && typeof options.now === 'function' ? options.now() : new Date().toISOString();
    return {
      id: draftId,
      schema: 1,
      owner: owner,
      draft_id: draftId,
      claim_id: null,
      created_remote: false,
      context: clone(ctx),
      creation: {
        draft_id: draftId,
        idempotency_key: claimKey(draftId),
        vehicle_id: ctx.vehicle_id,
        round_id: ctx.round_id,
        washed_at: ctxResult.serverNow
      },
      claim: null,
      version: null,
      photos: {},
      confirmations: { own_funds: false, same_wash: false },
      submit: { state: 'idle', cycle: 0, operation: null, message: '' },
      created_at: now,
      updated_at: now
    };
  }

  function localProblems(rec) {
    var missing = SLOT_IDS.filter(function (id) { return !rec.photos[id]; });
    return missing;
  }

  function isEditable(rec) {
    var status = rec.claim ? rec.claim.status : 'DRAFT';
    return EDITABLE.indexOf(status) >= 0 && ['pending', 'unknown'].indexOf(rec.submit.state) < 0;
  }

  /* ------------------------------------------------------------------ */
  /* Magazyn (IndexedDB, zakres właściciela)                             */
  /* ------------------------------------------------------------------ */

  function createMemoryStore() {
    var rows = {};
    var api = {
      failPuts: 0,
      rows: rows,
      list: function (owner) {
        return Promise.resolve(Object.keys(rows).map(function (k) { return clone(rows[k]); }).filter(function (r) { return r.owner === owner; }));
      },
      get: function (owner, id) {
        return Promise.resolve(rows[id] && rows[id].owner === owner ? clone(rows[id]) : null);
      },
      put: function (rec) {
        if (api.failPuts > 0) { api.failPuts--; return Promise.reject(new Error('QuotaExceededError')); }
        if (!rec || !nonEmpty(rec.owner) || !nonEmpty(rec.id)) return Promise.reject(new Error('BAD_RECORD'));
        rows[rec.id] = clone(rec);
        return Promise.resolve();
      }
    };
    return api;
  }

  function createIdbStore(factory) {
    var dbPromise = null;
    function req(r) {
      return new Promise(function (resolve, reject) {
        r.onsuccess = function () { resolve(r.result); };
        r.onerror = function () { reject(r.error || new Error('IDB')); };
      });
    }
    function db() {
      if (!dbPromise) {
        dbPromise = new Promise(function (resolve, reject) {
          var open = factory.open(DB_NAME, 1);
          open.onupgradeneeded = function () {
            var s = open.result.createObjectStore('claims', { keyPath: 'id' });
            s.createIndex('owner', 'owner', { unique: false });
          };
          open.onsuccess = function () { resolve(open.result); };
          open.onerror = function () { reject(open.error || new Error('IDB')); };
          open.onblocked = function () { reject(new Error('IDB blocked')); };
        });
      }
      return dbPromise;
    }
    return {
      list: function (owner) {
        return db().then(function (d) { return req(d.transaction('claims').objectStore('claims').index('owner').getAll(owner)); })
          .then(function (rows) { return rows.filter(function (r) { return r.owner === owner; }); });
      },
      get: function (owner, id) {
        return db().then(function (d) { return req(d.transaction('claims').objectStore('claims').get(id)); })
          .then(function (r) { return r && r.owner === owner ? r : null; });
      },
      put: function (rec) {
        if (!rec || !nonEmpty(rec.owner) || !nonEmpty(rec.id)) return Promise.reject(new Error('BAD_RECORD'));
        return db().then(function (d) {
          return new Promise(function (resolve, reject) {
            var tx = d.transaction('claims', 'readwrite');
            tx.objectStore('claims').put(rec);
            tx.oncomplete = function () { resolve(); };
            tx.onerror = function () { reject(tx.error || new Error('IDB')); };
            tx.onabort = function () { reject(tx.error || new Error('IDB aborted')); };
          });
        });
      }
    };
  }

  /* ------------------------------------------------------------------ */
  /* Sesja zgłoszenia: trwała kolejka uploadów + wysyłka                 */
  /* ------------------------------------------------------------------ */

  function StaleError() { this.name = 'StaleError'; this.stale = true; this.message = 'Sesja konta zmieniła się.'; }
  function SaveError(message) { this.name = 'SaveError'; this.save = true; this.message = message; }

  /**
   * deps: { store, request(method,path,body), upload(path,token,fields), release(token),
   *         isCurrent(), now(), uuid() }
   * Wszystkie wywołania są serializowane przez run(); po każdym await sprawdzamy isCurrent().
   */
  function createSession(deps, initial) {
    var rec = initial;
    var saveError = '';
    var running = false;
    var lastMessage = '';

    function now() { return deps.now ? deps.now() : new Date().toISOString(); }
    function live() { if (deps.isCurrent && !deps.isCurrent()) throw new StaleError(); }
    function release(token) {
      if (!token || !deps.release) return;
      var used = Object.keys(rec.photos).some(function (id) { return rec.photos[id] && rec.photos[id].token === token; });
      if (!used) { try { deps.release(token); } catch (e) { /* plik już zwolniony */ } }
    }

    function commit(mutate) {
      live();
      var next = clone(rec);
      mutate(next);
      next.updated_at = now();
      return Promise.resolve().then(function () { return deps.store.put(next); }).then(function () {
        live();
        rec = next;
        saveError = '';
        return rec;
      }, function (e) {
        if (e && e.stale) throw e;
        saveError = 'Nie udało się zapisać na telefonie (brak miejsca lub pamięci). Wysyłka jest zablokowana.';
        throw new SaveError(saveError);
      });
    }

    function call(kind, a, b, c) {
      live();
      var p;
      try { p = kind === 'upload' ? deps.upload(a, b, c) : deps.request(a, b, c); } catch (e) { p = Promise.resolve({ status: 0, message: 'Warstwa natywna jest niedostępna.' }); }
      return Promise.resolve(p).catch(function () { return { status: 0, message: 'Warstwa natywna nie odpowiedziała.' }; })
        .then(function (r) { live(); return normalizeResult(r); });
    }

    function claimPath(suffix) { return 'car-wash/claims/' + rec.claim_id + '/' + (suffix ? suffix.replace(/\/+$/, '') + '/' : ''); }

    function adopt(detail) {
      return commit(function (r) {
        if (!r.claim || detail.version >= r.claim.version) { r.claim = detail; r.version = detail.version; }
        r.claim_id = detail.claim_id;
        r.created_remote = true;
      });
    }

    /** POST claims/ — niezmienny payload z pierwszego zapisu; powtórka tego samego. */
    function ensureCreated() {
      if (rec.created_remote && rec.claim_id) return Promise.resolve({ ok: true });
      var body = {
        draft_id: rec.creation.draft_id, idempotency_key: rec.creation.idempotency_key,
        vehicle_id: rec.creation.vehicle_id, round_id: rec.creation.round_id, washed_at: rec.creation.washed_at
      };
      if (rec.creation.own_payment_method) body.own_payment_method = rec.creation.own_payment_method;
      return call('request', 'POST', 'car-wash/claims/', body).then(function (res) {
        var cls = statusClass(res.status);
        if (cls === 'ok') {
          var v = validateDetail(res.body, rec);
          if (!v.ok) {
            return { ok: false, fatal: true, message: 'Serwer zwrócił zgłoszenie niezgodne z Twoim kontem lub pojazdem (' + v.reason + '). Nic nie zostało uznane za wysłane.' };
          }
          return adopt(res.body).then(function () { return { ok: true }; });
        }
        if (cls === 'conflict') return recoverByDraft();
        return { ok: false, retry: cls === 'transient', auth: cls === 'auth', message: failureText(res) };
      });
    }

    function recoverByDraft() {
      return call('request', 'GET', 'car-wash/claims/', null).then(function (res) {
        var list = statusClass(res.status) === 'ok' && Array.isArray(res.body.results) ? res.body.results : [];
        var hit = list.filter(function (d) { return isObj(d) && d.draft_id === rec.draft_id; })[0];
        if (hit && validateDetail(hit, rec).ok) return adopt(hit).then(function () { return { ok: true }; });
        return { ok: false, message: 'Serwer zgłasza konflikt przy tworzeniu zgłoszenia (409). Zgłoszenie nie zostało utworzone — nic nie wysłano.' };
      });
    }

    /** GET szczegółu; wynik zapisany tylko gdy zgadza się z niezmiennikami. */
    function readback(verify) {
      if (!rec.claim_id) return Promise.resolve({ ok: false, message: 'Zgłoszenie nie zostało jeszcze utworzone na serwerze.' });
      return call('request', 'GET', claimPath(), null).then(function (res) {
        var cls = statusClass(res.status);
        if (cls !== 'ok') return { ok: false, cls: cls, auth: cls === 'auth', message: failureText(res) };
        var v = validateDetail(res.body, rec);
        if (!v.ok) return { ok: false, fatal: true, message: 'Odczyt z serwera jest niezgodny z tym zgłoszeniem (' + v.reason + ').' };
        // verify: opcjonalny filtr — niezgodnego odczytu (np. cudzy manifest) nie zapisujemy jako stanu lokalnego.
        if (verify && !verify(res.body)) return { ok: true, detail: res.body, unadopted: true };
        return adopt(res.body).then(function () { return { ok: true, detail: res.body }; });
      });
    }

    function ackPhoto(slot, serverPhotoId) {
      return commit(function (r) {
        var p = r.photos[slot];
        if (p) { p.state = 'acked'; p.server_photo_id = serverPhotoId; p.error = ''; }
      });
    }

    function findOnServer(detail, photo) {
      return activePhotos(detail).filter(function (x) {
        return x.slot === photo.slot && x.sha256 === photo.sha256 && x.size === photo.size && x.mime === photo.mime;
      })[0] || null;
    }

    function uploadOne(slot, allowVersionRefresh) {
      var photo = rec.photos[slot];
      var step = photo.op ? Promise.resolve() : commit(function (r) {
        var q = r.photos[slot];
        q.op = { slot: q.slot, sha256: q.sha256, expected_version: r.version, idempotency_key: q.key, source_hint: q.source_hint || 'camera' };
        q.state = 'sending';
      });
      return step.then(function () {
        var p = rec.photos[slot];
        var fields = {
          slot: p.op.slot, sha256: p.op.sha256, expected_version: String(p.op.expected_version),
          idempotency_key: p.op.idempotency_key, source_hint: p.op.source_hint
        };
        return call('upload', claimPath('photos'), p.token, fields);
      }).then(function (res) {
        var p = rec.photos[slot];
        var cls = statusClass(res.status);
        if (cls === 'ok') {
          var v = validateUploadResponse(res, rec, p);
          if (v.ok) {
            return adopt(v.claim).then(function () { return ackPhoto(slot, v.photo.id); }).then(function () { return { ok: true }; });
          }
          return reconcile(slot, 'Odpowiedź serwera na wysyłkę zdjęcia jest niezgodna (' + v.reason + ').');
        }
        if (cls === 'accepted') return reconcile(slot, failureText(res));
        if (cls === 'transient') return reconcile(slot, failureText(res), true);
        if (cls === 'conflict') {
          return reconcile(slot, failureText(res), false).then(function (r) {
            if (r.ok || !allowVersionRefresh || r.fatal || !rec.claim) return r;
            // Zdjęcia nie ma na serwerze, a wersja się przesunęła: ten sam klucz, jawnie nowa wersja.
            if (rec.claim.version === rec.photos[slot].op.expected_version) return r;
            if (EDITABLE.indexOf(rec.claim.status) < 0) return r;
            return commit(function (x) { x.photos[slot].op.expected_version = x.claim.version; })
              .then(function () { return uploadOne(slot, false); });
          });
        }
        if (cls === 'auth') return { ok: false, auth: true, message: failureText(res) };
        if (cls === 'forbidden' || cls === 'unavailable') return { ok: false, fatal: true, message: failureText(res) };
        // 4xx walidacji (zły plik/slot/hash): zdjęcie trzeba zrobić ponownie.
        return commit(function (r) { r.photos[slot].state = 'failed'; r.photos[slot].error = failureText(res); })
          .then(function () { return { ok: false, failedSlot: slot, message: slotLabel(slot) + ': ' + failureText(res) }; });
      });
    }

    /** Wynik uploadu nieznany albo niepewny → odczyt; potwierdzenie tylko, gdy zdjęcie jest aktywne na serwerze. */
    function reconcile(slot, message, retry) {
      return readback().then(function (rb) {
        if (rb.ok) {
          var hit = findOnServer(rb.detail, rec.photos[slot]);
          if (hit) return ackPhoto(slot, hit.id).then(function () { return { ok: true }; });
          return { ok: false, retry: retry !== false, message: message };
        }
        return { ok: false, retry: true, auth: rb.auth, fatal: rb.fatal, message: rb.fatal ? rb.message : message };
      });
    }

    /** Serial: tworzenie → uploady po kolei. Jedna próba na zdjęcie na jedno wywołanie. */
    function syncUploads() {
      return ensureCreated().then(function (created) {
        if (!created.ok) return created;
        var chain = Promise.resolve({ ok: true });
        SLOT_IDS.concat(Object.keys(rec.photos).filter(function (key) { return key.indexOf('extra:') === 0; })).forEach(function (slot) {
          chain = chain.then(function (prev) {
            if (!prev.ok) return prev;
            var p = rec.photos[slot];
            if (!p) return { ok: false, message: 'Brakuje zdjęcia: ' + SLOT_BY_ID[slot].label };
            if (p.state === 'acked') return prev;
            if (p.state === 'failed') return { ok: false, failedSlot: slot, message: slotLabel(slot) + ': ' + (p.error || 'zrób zdjęcie ponownie') };
            return uploadOne(slot, true);
          });
        });
        return chain;
      });
    }

    function finalize(detail, op) {
      return commit(function (r) {
        r.claim = detail; r.version = detail.version;
        r.submit.state = 'confirmed'; r.submit.message = '';
        if (detail.status === 'NEEDS_CORRECTION') { r.submit.cycle += 1; r.submit.operation = null; r.submit.state = 'idle'; }
      }).then(function () { return { ok: true, sent: true, status: detail.status, op: op }; });
    }

    function failSubmit(message, definitive) {
      return commit(function (r) {
        r.submit.message = message;
        if (definitive) { r.submit.cycle += 1; r.submit.operation = null; r.submit.state = 'idle'; }
        else r.submit.state = 'unknown';
      }).then(function () { return { ok: false, sent: false, message: message, retry: !definitive }; });
    }

    function sendFlow() {
      if (saveError) return Promise.resolve({ ok: false, message: saveError });
      if (!rec.confirmations.own_funds || !rec.confirmations.same_wash) {
        return Promise.resolve({ ok: false, message: 'Potwierdź oba oświadczenia przed wysłaniem.' });
      }
      return syncUploads().then(function (up) {
        if (!up.ok) return up;
        return readback().then(function (rb) {
          if (!rb.ok) return rb;
          var d = rb.detail;
          var op = rec.submit.operation;
          var awaiting = ['pending', 'unknown'].indexOf(rec.submit.state) >= 0;
          if (op && awaiting && classifySent(d, rec, op).sent) return finalize(d, op);
          if (EDITABLE.indexOf(d.status) < 0) {
            return { ok: false, message: 'Zgłoszenie ma status ' + d.status + ' i nie przyjmie nowej wysyłki.' };
          }
          if (!manifestMatches(d, rec.photos)) {
            return { ok: false, message: 'Zdjęcia na serwerze nie zgadzają się z tym, co masz na telefonie. Odśwież i spróbuj ponownie.' };
          }
          var manifest = localManifest(rec.photos);
          var reuse = op && sameList(op.evidence_hashes.slice().sort(), manifest);
          var prep = reuse ? Promise.resolve() : commit(function (r) {
            r.submit.operation = {
              operation_key: submitKey(r.claim_id, r.submit.cycle, manifest),
              expected_version: d.version,
              own_funds_confirmed: true,
              same_wash_confirmed: true,
              evidence_hashes: manifest
            };
            r.submit.state = 'pending';
            r.submit.message = '';
          });
          return prep.then(function () {
            if (rec.submit.state !== 'pending') return commit(function (r) { r.submit.state = 'pending'; });
          }).then(function () {
            var o = rec.submit.operation;
            return call('request', 'POST', claimPath('submit'), clone(o)).then(function (res) {
              // Zawsze odczyt: sukces to tylko to, co potwierdzi GET.
              return readback(function (d) { return classifySent(d, rec, o).sent || EDITABLE.indexOf(d.status) >= 0; }).then(function (after) {
                if (!after.ok) {
                  if (after.fatal) return failSubmit(after.message, false);
                  return failSubmit('Nie wiadomo, czy zgłoszenie dotarło do biura. ' + (statusClass(res.status) === 'ok' ? 'Serwer odpowiedział OK, ale odczyt się nie udał. ' : '') + 'Ponów wysyłkę — jest bezpieczna (ten sam klucz).', false);
                }
                var verdict = classifySent(after.detail, rec, o);
                if (verdict.sent) return finalize(after.detail, o);
                var cls = statusClass(res.status);
                var editableNow = EDITABLE.indexOf(after.detail.status) >= 0;
                var definitive = editableNow && (cls === 'invalid' || cls === 'forbidden' || cls === 'conflict');
                var text = cls === 'ok'
                  ? 'Serwer odpowiedział OK, ale odczyt nie potwierdza wysyłki (' + verdict.reason + ').'
                  : failureText(res);
                return failSubmit(text, definitive);
              });
            });
          });
        });
      });
    }

    function run(fn) {
      if (running) return Promise.resolve({ ok: false, busy: true, message: 'Poprzednia operacja jeszcze trwa.' });
      running = true;
      return Promise.resolve().then(fn).then(function (r) { running = false; lastMessage = r && r.message || ''; return r; }, function (e) {
        running = false;
        if (e && e.stale) return { ok: false, stale: true, message: '' };
        if (e && e.save) return { ok: false, saveFailed: true, message: e.message };
        return { ok: false, message: 'Nieoczekiwany błąd: ' + (e && e.message || e) };
      });
    }

    function addPhoto(slot, captureResult) {
      return run(function () {
        if (!SLOT_BY_ID[slot] && slot !== 'extra') return { ok: false, message: 'Nieznane ujecie.' };
        if (!captureAllowed(rec, slot)) return { ok: false, message: 'Najpierw uzupelnij zdjecia z poprzedniego etapu.' };
        if (!isEditable(rec)) return { ok: false, message: 'To zgłoszenie jest zablokowane do edycji.' };
        var cap = validateCapture(captureResult);
        if (cap.cancelled) return { ok: true, cancelled: true };
        if (!cap.ok) {
          if (cap.token) release(cap.token);
          return { ok: false, message: cap.message };
        }
        var ph = cap.photo;
        var extra = slot === 'extra';
        var photoId = newUuid(deps);
        var wireSlot = slot;
        if (extra) slot = 'extra:' + photoId;
        if (Object.keys(rec.photos).length + (rec.photos[slot] ? 0 : 1) > 30) { release(ph.token); return { ok: false, message: 'Maksymalnie 30 zdjęć.' }; }
        var dup = Object.keys(rec.photos).filter(function (id) { return id !== slot && rec.photos[id] && rec.photos[id].sha256 === ph.sha256; })[0];
        var oldTokenUsed = Object.keys(rec.photos).some(function (id) { return rec.photos[id] && rec.photos[id].token === ph.token; });
        if (dup) {
          if (!oldTokenUsed) release(ph.token);
          return { ok: false, message: 'To samo zdjęcie jest już użyte w ujęciu „' + slotLabel(dup) + '”. Zrób nowe zdjęcie.' };
        }
        var total = ph.size;
        Object.keys(rec.photos).forEach(function (id) { if (id !== slot && rec.photos[id]) total += rec.photos[id].size; });
        if (total > LIMITS.MAX_TOTAL_BYTES) {
          if (!oldTokenUsed) release(ph.token);
          return { ok: false, message: 'Przekroczono łączny limit 100 MiB zdjęć.' };
        }
        var old = rec.photos[slot];
        var id = photoId;
        return commit(function (r) {
          r.photos[slot] = {
            id: id, slot: wireSlot, token: ph.token, mime: ph.mime, size: ph.size, sha256: ph.sha256,
            width: ph.width, height: ph.height, source_hint: 'camera', key: photoKey(id),
            state: 'local', op: null, server_photo_id: null, error: ''
          };
          // Zmiana manifestu unieważnia poprzednią operację wysyłki; nowa dostanie nowy klucz.
          r.confirmations = { own_funds: false, same_wash: false };
          if (r.submit.operation) {
            if (r.submit.state === 'confirmed') r.submit.cycle += 1;
            r.submit.operation = null;
            r.submit.state = 'idle';
          }
        }).then(function () {
          if (old && old.token !== ph.token) release(old.token);
          return { ok: true };
        }, function (e) {
          release(ph.token);
          throw e;
        });
      });
    }

    /**
     * Lokalne usunięcie wyłącznie dodatkowego zdjęcia, którego serwer NIE przyjął
     * (state local albo failed). Zdjęcia potwierdzone (acked), w trakcie wysyłki
     * (wynik nieznany — mogło zostać zastosowane) i wymagane sloty zostają.
     * Nie wykonuje żadnego żądania; zmiana manifestu unieważnia operację wysyłki.
     */
    function removablePhoto(key) {
      var p = rec.photos[key];
      return !!p && typeof key === 'string' && key.indexOf('extra:') === 0 && (p.state === 'local' || p.state === 'failed');
    }

    function removePhoto(key) {
      return run(function () {
        if (!isEditable(rec)) return { ok: false, message: 'To zgłoszenie jest zablokowane do edycji.' };
        if (!removablePhoto(key)) return { ok: false, message: 'Usunąć można tylko dodatkowe zdjęcie, którego serwer nie przyjął.' };
        var token = rec.photos[key].token;
        return commit(function (r) {
          delete r.photos[key];
          r.confirmations = { own_funds: false, same_wash: false };
          if (r.submit.operation) {
            if (r.submit.state === 'confirmed') r.submit.cycle += 1;
            r.submit.operation = null;
            r.submit.state = 'idle';
          }
        }).then(function () {
          release(token);
          return { ok: true };
        });
      });
    }

    function setConfirm(key, value) {
      return run(function () {
        if (!isEditable(rec)) return { ok: false, message: 'Zgłoszenie jest zablokowane.' };
        return commit(function (r) { r.confirmations[key] = value === true; }).then(function () { return { ok: true }; });
      });
    }

    return {
      record: function () { return rec; },
      saveError: function () { return saveError; },
      busy: function () { return running; },
      lastMessage: function () { return lastMessage; },
      missing: function () { return localProblems(rec); },
      editable: function () { return isEditable(rec); },
      canSend: function () {
        return !saveError && !running && localProblems(rec).length === 0 && rec.confirmations.own_funds && rec.confirmations.same_wash &&
          (isEditable(rec) || (rec.submit.operation && ['pending', 'unknown'].indexOf(rec.submit.state) >= 0));
      },
      addPhoto: addPhoto,
      removePhoto: removePhoto,
      canRemove: function (key) { return !running && isEditable(rec) && removablePhoto(key); },
      setConfirm: setConfirm,
      retrySave: function () { return run(function () { return commit(function () {}).then(function () { return { ok: true }; }); }); },
      refresh: function () {
        return run(function () {
          return readback().then(function (rb) {
            if (!rb.ok) return rb;
            var op = rec.submit.operation;
            if (op && ['pending', 'unknown'].indexOf(rec.submit.state) >= 0 && classifySent(rb.detail, rec, op).sent) return finalize(rb.detail, op);
            if (rb.detail.status === 'NEEDS_CORRECTION' && rec.submit.state === 'confirmed') {
              // Biuro zwróciło zgłoszenie: nowy cykl poprawek, nowy klucz wysyłki.
              return commit(function (r) { r.submit.cycle += 1; r.submit.operation = null; r.submit.state = 'idle'; })
                .then(function () { return { ok: true }; });
            }
            return { ok: true };
          });
        });
      },
      sync: function () { return run(syncUploads); },
      send: function () { return run(sendFlow); }
    };
  }

  /* ------------------------------------------------------------------ */
  /* UI                                                                  */
  /* ------------------------------------------------------------------ */

  function h(tag, attrs, children) {
    var el = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      var v = attrs[k];
      if (v === false || v == null) return;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k.indexOf('on') === 0) el[k] = v;
      else if (v === true) el.setAttribute(k, '');
      else el.setAttribute(k, v);
    });
    (Array.isArray(children) ? children : [children]).forEach(function (c) {
      if (c == null || c === false) return;
      el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return el;
  }

  function mergeItems(locals, remotes, ctx) {
    var items = [];
    var usedClaims = {};
    locals.forEach(function (rec) {
      var remote = rec.claim_id && remotes.filter(function (d) { return d.claim_id === rec.claim_id; })[0];
      if (remote) usedClaims[remote.claim_id] = true;
      var detail = remote && validateDetail(remote, rec).ok && (!rec.claim || remote.version >= rec.claim.version) ? remote : rec.claim;
      items.push({ rec: rec, detail: detail, at: rec.updated_at || rec.created_at || '' });
    });
    remotes.forEach(function (d) {
      if (!usedClaims[d.claim_id] && validateOwnedDetail(d, ctx)) items.push({ rec: null, detail: d, at: d.created_at || '' });
    });
    items.sort(function (a, b) { return a.at < b.at ? 1 : a.at > b.at ? -1 : 0; });
    return items;
  }

  /**
   * options: { host, owner, isCurrent(), request, upload, capture, release, onClose,
   *            indexedDB?, store?, now?, uuid? }
   * Zwraca { close(), ready }.
   */
  function open(options) {
    options = options || {};
    var host = options.host || (typeof document !== 'undefined' && document.querySelector('.device'));
    if (!host) throw new Error('SuperSpedytorCarWashLive.open: brak elementu host (.device).');
    if (!nonEmpty(options.owner) || typeof options.request !== 'function') throw new Error('SuperSpedytorCarWashLive.open: brak właściciela albo mostka.');
    var owner = options.owner;
    var closed = false;
    var store = options.store || (typeof indexedDB !== 'undefined' && indexedDB ? createIdbStore(indexedDB) : null);
    var overlay = h('div', { class: 'cwl-overlay', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Mycie zewnętrzne — zgłoszenie' });
    host.appendChild(overlay);

    var st = {
      view: 'loading', ctx: null, ctxResult: null, items: [], skipped: 0, listError: '', session: null,
      detailOnly: null, stage: 0, busy: false, error: '', notice: '', remotePage: 1, remoteSize: 25, remoteCount: 0
    };

    var deps = {
      store: store, request: options.request, upload: options.upload, release: options.release,
      now: options.now, uuid: options.uuid,
      isCurrent: function () { return !closed && (typeof options.isCurrent !== 'function' || options.isCurrent()); }
    };
    function alive() {
      if (closed) return false;
      if (!deps.isCurrent()) { close(); return false; }
      return true;
    }

    function close() {
      if (closed) return;
      closed = true;
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      if (typeof options.onClose === 'function') { try { options.onClose(); } catch (e) { /* host */ } }
    }

    function rawCall(method, path) {
      return Promise.resolve().then(function () { return options.request(method, path, null); })
        .catch(function () { return { status: 0, message: 'Warstwa natywna nie odpowiedziała.' }; }).then(normalizeResult);
    }

    function load() {
      st.view = 'loading'; render();
      var localsP = store ? store.list(owner).catch(function () { st.listError = 'Nie udało się odczytać szkiców z telefonu.'; return []; }) : Promise.resolve([]);
      return Promise.all([rawCall('GET', 'car-wash/context/'), localsP]).then(function (pair) {
        if (!alive()) return;
        var cr = validateContext(pair[0]);
        st.ctxResult = cr;
        st.ctx = cr.context || cr.identity || null;
        // Szkice innego kierowcy (np. po zmianie przypisania konta) nie są używane.
        var locals = pair[1].filter(function (r) { return r && r.owner === owner && (!st.ctx || r.context.driver_id === st.ctx.driver_id); });
        if (cr.state === 'auth' || cr.state === 'forbidden' || cr.state === 'unavailable') {
          st.items = mergeItems(locals, [], null); st.view = 'list'; render(); return;
        }
        return rawCall('GET', 'car-wash/claims/').then(function (res) {
          if (!alive()) return;
          var remotes = [];
          if (statusClass(res.status) === 'ok' && Array.isArray(res.body.results)) remotes = res.body.results;
          else st.listError = 'Nie udało się pobrać listy z serwera: ' + failureText(res);
          st.remotePage = 1; st.remoteSize = Number(res.body && res.body.page_size) || 25; st.remoteCount = Number(res.body && res.body.count) || 0;
          var valid = st.ctx ? remotes.filter(function (d) { return validateOwnedDetail(d, st.ctx); }) : [];
          st.skipped = remotes.length - valid.length;
          st.items = mergeItems(locals, st.ctx ? valid : [], st.ctx);
          st.view = 'list'; render();
        });
      });
    }

    function loadMore() {
      st.busy = true; render();
      var page = st.remotePage + 1;
      rawCall('GET', 'car-wash/claims/?page=' + page + '&page_size=25').then(function (res) {
        if (!alive()) return;
        st.busy = false;
        if (statusClass(res.status) !== 'ok' || !Array.isArray(res.body.results)) { st.listError = failureText(res); render(); return; }
        var locals = st.items.filter(function (item) { return item.rec; }).map(function (item) { return item.rec; });
        var old = st.items.filter(function (item) { return item.detail; }).map(function (item) { return item.detail; });
        var merged = old.concat(res.body.results).filter(function (item, index, all) {
          return validateOwnedDetail(item, st.ctx) && all.findIndex(function (other) { return other.claim_id === item.claim_id; }) === index;
        });
        st.remotePage = page; st.remoteSize = Number(res.body.page_size) || 25; st.remoteCount = Number(res.body.count) || 0;
        st.items = mergeItems(locals, merged, st.ctx); render();
      });
    }

    function openItem(item) {
      st.error = ''; st.notice = '';
      if (!item.rec) { st.detailOnly = item.detail; st.session = null; st.view = 'detail'; render(); return; }
      st.session = createSession(deps, item.rec);
      st.detailOnly = null;
      st.stage = 0; st.view = 'edit'; render();
      if (item.rec.created_remote) act(function () { return st.session.refresh(); });
    }

    function startNew() {
      var cr = st.ctxResult;
      if (!cr || cr.state !== 'ready' || !store) return;
      var rec = createRecord(owner, cr, { now: options.now, uuid: options.uuid });
      st.busy = true; st.error = ''; render();
      store.put(rec).then(function () {
        if (!alive()) return;
        st.busy = false;
        st.session = createSession(deps, rec);
        st.stage = 0; st.view = 'edit'; render();
      }, function () {
        if (!alive()) return;
        st.busy = false;
        st.error = 'Nie udało się zapisać szkicu na telefonie (brak miejsca?). Zgłoszenie nie zostało rozpoczęte.';
        render();
      });
    }

    function act(fn) {
      st.busy = true; st.error = ''; st.notice = ''; render();
      return fn().then(function (r) {
        if (!alive()) return;
        st.busy = false;
        if (r && r.stale) return;
        if (r && r.message && !r.ok) st.error = r.message;
        else if (r && r.sent) st.notice = 'Serwer potwierdził zgłoszenie: ' + statusView(st.session.record().claim).label + '.';
        else if (r && r.ok && !r.cancelled) st.notice = 'Zapisano.';
        render();
      });
    }

    function capture(slot) {
      var session = st.session;
      if (!session || typeof options.capture !== 'function') { st.error = 'Aparat jest niedostępny w tej wersji aplikacji.'; render(); return; }
      act(function () {
        return Promise.resolve().then(function () { return options.capture(); }).catch(function () { return { status: 'error', message: 'Aparat nie odpowiedział.' }; })
          .then(function (result) {
            if (!alive()) return { stale: true };
            return session.addPhoto(slot, result);
          });
      });
    }

    /* --- widoki --- */

    function banner(kind, text) { return h('p', { class: 'cwl-banner cwl-' + kind, role: kind === 'error' ? 'alert' : 'status', text: text }); }

    function contextCard(ctx) {
      return h('div', { class: 'cwl-card' }, [
        h('strong', { text: ctx.driver_full_name }),
        h('span', { text: 'Pojazd: ' + ctx.vehicle_registration + ' · Runda: ' + ctx.round_id }),
        h('span', { class: 'cwl-muted', text: 'Własne środki · stały ryczałt 15,00 EUR po akceptacji biura. Zdjęcia ocenia człowiek w biurze.' })
      ]);
    }

    function itemLabel(item) {
      var d = item.detail;
      if (!d) return item.rec && item.rec.created_remote ? 'Szkic (stan serwera nieznany)' : 'Szkic tylko na telefonie — nie wysłano';
      return statusView(d).label;
    }

    function renderList() {
      var body = [];
      var cr = st.ctxResult;
      if (cr && cr.context) body.push(contextCard(cr.context));
      if (cr && cr.state !== 'ready') {
        var title = cr.state === 'unavailable' ? 'Mycie niedostępne' : cr.state === 'auth' ? 'Zaloguj się ponownie' : cr.state === 'blocked' ? 'Nowe mycie zablokowane' : 'Nie można pobrać danych';
        body.push(h('div', { class: 'cwl-panel' }, [h('h2', { text: title }), h('p', { text: cr.reason }), h('p', { class: 'cwl-muted', text: 'Nic nie zostało wysłane. Szkice na telefonie zostają.' })]));
      }
      if (st.listError) body.push(banner('error', st.listError));
      if (st.skipped) body.push(banner('error', 'Pominięto ' + st.skipped + ' pozycji z serwera niezgodnych z Twoim kontem.'));
      body.push(h('h2', { class: 'cwl-h2', text: 'Twoje zgłoszenia' }));
      if (!st.items.length) body.push(h('p', { class: 'cwl-muted', text: 'Brak zgłoszeń.' }));
      st.items.forEach(function (item) {
        var d = item.detail;
        var when = d && d.washed_at ? d.washed_at.slice(0, 10) : item.rec ? item.rec.creation.washed_at.slice(0, 10) : '';
        var name = d ? d.driver_full_name + ' · ' + d.vehicle_registration + ' · runda ' + d.round_id
          : item.rec.context.driver_full_name + ' · ' + item.rec.context.vehicle_registration + ' · runda ' + item.rec.context.round_id;
        body.push(h('button', { type: 'button', class: 'cwl-item', onclick: function () { openItem(item); } }, [
          h('strong', { text: itemLabel(item) }),
          h('span', { text: name }),
          h('span', { class: 'cwl-muted', text: 'Mycie: ' + when + (item.rec && !item.rec.created_remote ? ' · lokalny szkic' : '') })
        ]));
      });
      var canNew = cr && cr.state === 'ready' && !!store && !st.busy;
      return {
        body: body,
        footer: [
          h('button', { type: 'button', class: 'cwl-btn cwl-primary', disabled: !canNew, onclick: startNew }, 'Nowe mycie'),
          h('button', { type: 'button', class: 'cwl-btn', disabled: st.busy, onclick: load }, 'Odśwież'),
          st.remotePage * st.remoteSize < st.remoteCount ? h('button', { type: 'button', class: 'cwl-btn', disabled: st.busy, onclick: loadMore }, 'Starsze zgłoszenia') : null,
          !store ? banner('error', 'Brak trwałego magazynu na telefonie — nie można zacząć zgłoszenia.') : null
        ]
      };
    }

    function photoThumb(p) {
      if (p && p.token && !p.released) return h('img', { class: 'cwl-thumb', src: 'ssfile://local/' + p.token, alt: '' });
      return h('div', { class: 'cwl-thumb cwl-thumb-empty', text: p ? 'zwolnione' : 'brak' });
    }
    function photoStateText(p) {
      if (!p) return 'Brak zdjęcia';
      if (p.state === 'acked') return 'Na serwerze ✓';
      if (p.state === 'sending') return 'Wysyłanie… (jeszcze niepotwierdzone)';
      if (p.state === 'failed') return 'Odrzucone: ' + p.error;
      return 'Tylko na telefonie';
    }

    function renderDetailBlock(detail) {
      var sv = statusView(detail);
      var rows = [
        h('div', { class: 'cwl-panel cwl-' + sv.tone }, [
          h('strong', { text: sv.label }),
          h('p', { text: sv.text })
        ]),
        h('div', { class: 'cwl-card' }, [
          h('strong', { text: detail.driver_full_name }),
          h('span', { text: 'Pojazd: ' + detail.vehicle_registration + ' · Runda: ' + detail.round_id }),
          h('span', { text: 'Ryczałt: 15,00 EUR (stały, ustalany przez serwer) · wersja ' + detail.version }),
          h('span', { class: 'cwl-muted', text: 'Zdjęcia aktywne na serwerze: ' + activePhotos(detail).length + '/' + SLOT_IDS.length })
        ])
      ];
      return rows;
    }

    function renderDetailOnly() {
      var body = renderDetailBlock(st.detailOnly);
      body.push(h('p', { class: 'cwl-muted', text: 'To zgłoszenie powstało na innym urządzeniu — tutaj tylko podgląd statusu.' }));
      return { body: body, footer: [h('button', { type: 'button', class: 'cwl-btn', onclick: backToList }, 'Wróć do listy')] };
    }

    function renderEdit() {
      var s = st.session;
      var rec = s.record();
      var body = [];
      var editable = s.editable();
      var detail = rec.claim;
      body.push(contextCard(rec.context));
      if (detail) renderDetailBlock(detail).slice(0, 1).forEach(function (n) { body.push(n); });
      else body.push(banner('info', 'Szkic tylko na telefonie — nie wysłano. Zdjęcia są zapisane w pamięci aplikacji.'));
      if (s.saveError()) {
        body.push(banner('error', s.saveError()));
        body.push(h('button', { type: 'button', class: 'cwl-btn', disabled: st.busy, onclick: function () { act(function () { return s.retrySave(); }); } }, 'Zapisz ponownie'));
      }
      if (rec.submit.message && ['pending', 'unknown'].indexOf(rec.submit.state) >= 0) body.push(banner('error', rec.submit.message));
      if (rec.submit.state === 'unknown' || rec.submit.state === 'pending') {
        body.push(banner('info', 'Wysyłka czeka na potwierdzenie z serwera. Zdjęcia są zablokowane do czasu sprawdzenia.'));
      }
      var stage = STAGES[st.stage];
      var tabs = h('div', { class: 'cwl-tabs' }, STAGES.map(function (sg, i) {
        var slots = SLOTS.filter(function (x) { return x.stage === sg.id; });
        var done = slots.filter(function (x) { return rec.photos[x.id]; }).length;
        return h('button', { type: 'button', class: 'cwl-tab' + (i === st.stage ? ' cwl-on' : ''), onclick: function () { st.stage = i; render(); } }, sg.label + ' ' + done + '/' + slots.length);
      }).concat([h('button', { type: 'button', class: 'cwl-tab' + (st.stage === STAGES.length ? ' cwl-on' : ''), onclick: function () { st.stage = STAGES.length; render(); } }, 'Wyślij')]));
      body.push(tabs);

      if (stage) {
        body.push(h('p', { class: 'cwl-muted', text: 'Kolejność: zdjęcia przed myciem → auto w myjni → po myciu → detale. Aparat otwiera się w aplikacji.' }));
        SLOTS.filter(function (x) { return x.stage === stage.id; }).forEach(function (slot) {
          var p = rec.photos[slot.id];
          body.push(h('div', { class: 'cwl-slot' }, [
            photoThumb(p),
            h('div', { class: 'cwl-slot-text' }, [
              h('strong', { text: slot.label }),
              h('span', { class: 'cwl-muted', text: slot.instruction }),
              h('span', { class: 'cwl-state', text: photoStateText(p) + (p ? ' · ' + p.width + '×' + p.height : '') }),
              editable ? h('button', { type: 'button', class: 'cwl-btn', disabled: st.busy || !options.capture || !captureAllowed(rec, slot.id), onclick: function () { capture(slot.id); } }, p ? 'Zrób ponownie' : 'Zrób zdjęcie') : null
            ])
          ]));
        });
      } else {
        var missing = s.missing();
        body.push(h('h2', { class: 'cwl-h2', text: 'Przegląd i wysyłka' }));
        body.push(missing.length
          ? banner('error', 'Brakuje ' + missing.length + ' zdjęć: ' + missing.map(function (id) { return SLOT_BY_ID[id].label; }).join('; '))
          : banner('ok', 'Komplet ' + SLOT_IDS.length + ' zdjęć jest na telefonie.'));
        var thumbs = h('div', { class: 'cwl-grid' }, SLOTS.map(function (slot) { return h('figure', {}, [photoThumb(rec.photos[slot.id]), h('figcaption', { text: slot.label + ' — ' + photoStateText(rec.photos[slot.id]) })]); }));
        body.push(thumbs);
        var extras = Object.keys(rec.photos).filter(function (key) { return key.indexOf('extra:') === 0; });
        body.push(h('h2', { class: 'cwl-h2', text: 'Zdjęcia dodatkowe (' + extras.length + ')' }));
        body.push(h('p', { class: 'cwl-muted', text: 'Możesz pokazać dodatkowe detale czystości. Łącznie do 30 zdjęć i 100 MiB.' }));
        body.push(h('div', { class: 'cwl-grid' }, extras.map(function (key, index) { return h('figure', {}, [
          photoThumb(rec.photos[key]), h('figcaption', { text: 'Dodatkowe ' + (index + 1) + ' — ' + photoStateText(rec.photos[key]) }),
          editable && s.canRemove(key) ? h('button', { type: 'button', class: 'cwl-btn', disabled: st.busy,
            onclick: function () { act(function () { return s.removePhoto(key); }); }
          }, 'Usuń z telefonu') : null
        ]); })));
        if (editable) body.push(h('button', { type: 'button', class: 'cwl-btn',
          disabled: st.busy || !options.capture || !captureAllowed(rec, 'extra') || Object.keys(rec.photos).length >= 30,
          onclick: function () { capture('extra'); }
        }, 'Zrób dodatkowe zdjęcie'));
        if (editable || s.canSend()) {
          body.push(h('label', { class: 'cwl-check' }, [
            h('input', { type: 'checkbox', checked: rec.confirmations.own_funds, disabled: st.busy || !editable, onchange: function (e) { act(function () { return s.setConfirm('own_funds', e.target.checked); }); } }),
            'Zapłaciłem za to mycie z własnych pieniędzy (myjnia bezdotykowa, mycie zewnętrzne).'
          ]));
          body.push(h('label', { class: 'cwl-check' }, [
            h('input', { type: 'checkbox', checked: rec.confirmations.same_wash, disabled: st.busy || !editable, onchange: function (e) { act(function () { return s.setConfirm('same_wash', e.target.checked); }); } }),
            'Wszystkie zdjęcia (przed, w myjni i po) dotyczą tego samego mycia tego samego auta.'
          ]));
        }
      }

      var pendingSend = rec.submit.operation && ['pending', 'unknown'].indexOf(rec.submit.state) >= 0;
      var footer = [];
      if (editable || pendingSend) {
        footer.push(h('button', { type: 'button', class: 'cwl-btn cwl-primary', disabled: st.busy || !s.canSend(), onclick: function () { act(function () { return s.send(); }); } },
          pendingSend ? 'Ponów wysyłkę' : (rec.created_remote ? 'Wyślij do biura / dokończ' : 'Wyślij do biura')));
      }
      if (rec.created_remote) footer.push(h('button', { type: 'button', class: 'cwl-btn', disabled: st.busy, onclick: function () { act(function () { return s.refresh(); }); } }, 'Sprawdź status na serwerze'));
      if (editable && Object.keys(rec.photos).some(function (id) { return rec.photos[id] && rec.photos[id].state !== 'acked'; }) && !pendingSend) {
        footer.push(h('button', { type: 'button', class: 'cwl-btn', disabled: st.busy || !!s.saveError(), onclick: function () { act(function () { return s.sync(); }); } }, 'Wyślij tylko zdjęcia'));
      }
      footer.push(h('button', { type: 'button', class: 'cwl-btn', disabled: st.busy, onclick: backToList }, 'Wróć do listy'));
      return { body: body, footer: footer };
    }

    function backToList() { st.session = null; st.detailOnly = null; st.error = ''; st.notice = ''; load(); }

    function render() {
      if (closed) return;
      var v;
      if (st.view === 'loading') v = { body: [h('p', { class: 'cwl-muted', text: 'Wczytywanie…' })], footer: [] };
      else if (st.view === 'list') v = renderList();
      else if (st.view === 'detail') v = renderDetailOnly();
      else v = renderEdit();
      var header = h('header', { class: 'cwl-header' }, [
        h('button', { type: 'button', class: 'cwl-back', 'aria-label': 'Zamknij', onclick: close }, '←'),
        h('div', {}, [h('h1', { class: 'cwl-title', text: 'Mycie zewnętrzne · 15 EUR' }), h('p', { class: 'cwl-sub', text: st.session ? SLOT_IDS.filter(function (id) { return st.session.record().photos[id]; }).length + '/' + SLOT_IDS.length + ' wymaganych zdjęć' : 'Własne środki, zwrot po akceptacji biura' })])
      ]);
      var banners = [];
      if (st.busy) banners.push(banner('info', 'Pracuję… nie zamykaj aplikacji.'));
      if (st.error) banners.push(banner('error', st.error));
      else if (st.notice) banners.push(banner('ok', st.notice));
      var scroller = h('div', { class: 'cwl-body' }, banners.concat(v.body));
      var footer = v.footer && v.footer.length ? h('footer', { class: 'cwl-footer' }, v.footer) : null;
      while (overlay.firstChild) overlay.removeChild(overlay.firstChild);
      [header, scroller, footer].forEach(function (n) { if (n) overlay.appendChild(n); });
    }

    var handle = { close: close, isOpen: function () { return !closed; }, ready: null, state: st };
    render();
    handle.ready = load().catch(function () {
      if (!alive()) return;
      st.error = 'Nie udało się wczytać zgłoszeń mycia.'; st.view = 'list'; render();
    });
    return handle;
  }

  return {
    SLOTS: SLOTS,
    SLOT_IDS: SLOT_IDS,
    STAGES: STAGES,
    LIMITS: LIMITS,
    AMOUNT_MINOR: AMOUNT_MINOR,
    CURRENCY: CURRENCY,
    CATEGORY: CATEGORY,
    isUuid: isUuid,
    newUuid: newUuid,
    claimKey: claimKey,
    photoKey: photoKey,
    submitKey: submitKey,
    statusClass: statusClass,
    failureText: failureText,
    validateContext: validateContext,
    validateCapture: validateCapture,
    validateDetail: validateDetail,
    validateOwnedDetail: validateOwnedDetail,
    validateUploadResponse: validateUploadResponse,
    manifestMatches: manifestMatches,
    localManifest: localManifest,
    classifySent: classifySent,
    statusView: statusView,
    createRecord: createRecord,
    createMemoryStore: createMemoryStore,
    createIdbStore: createIdbStore,
    createSession: createSession,
    mergeItems: mergeItems,
    open: open
  };
});
