'use strict';
/*
 * AA9/AA10: kreatory załadunku i rozładunku na realnym API Super Spedytora —
 * czysta logika, bez DOM.
 *
 * Buduje rekord operacji w kształcie, którego używają ekrany z makiety
 * (fresh('load') / fresh('unload') w flow.js: items, cmrSeal, documents, step…),
 * ale z faktów backendu: sztuki i plomby z GET documents/labels/targets/
 * (załadunek) albo GET routes/points/{id}/label-scan/ (rozładunek), zdjęcia
 * i CMR z potwierdzonych uploadów. Lokalne pola (zdjęcia, checkboxy, krok)
 * przeżywają ponowny odczyt celów (readback po każdym zapisie).
 *
 * UMD jak operation-timing.js: module.exports dla `node --test`,
 * window.SuperSpedytorLiveOperation dla WebView.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SuperSpedytorLiveOperation = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const has = value => value !== null && value !== undefined && String(value).trim() !== '';
  const text = value => (has(value) ? String(value).trim() : '');
  const number = value => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const COUNTRY_NAMES = { PL: 'Polska', DE: 'Niemcy', FR: 'Francja', NL: 'Holandia', BE: 'Belgia', IT: 'Włochy', ES: 'Hiszpania', CZ: 'Czechy', SK: 'Słowacja', AT: 'Austria', DK: 'Dania', SE: 'Szwecja', CH: 'Szwajcaria', HU: 'Węgry', LU: 'Luksemburg' };
  const countryName = code => COUNTRY_NAMES[text(code).toUpperCase()] || text(code);

  /** document_type dla upload_document — te same wartości co kreator w przeglądarce. */
  const DOCUMENT_TYPES = {
    load: { photo: 'photo_loading', cmr: 'cmr_loading' },
    unload: { photo: 'photo_unloading', cmr: 'cmr_unloading' },
  };

  /** Status zlecenia wysyłany przez kierowcę (driver-update-status) — jak usePointStatusUpdate w przeglądarce. */
  const ORDER_STATUS = {
    load: { start: 'at_loading', complete: 'en_route_to_unloading' },
    unload: { start: 'at_unloading', complete: null }, // `unloaded` ustawia backend
  };

  const freshTiming = () => ({
    startedAt: null, endedAt: null, offsetSeconds: 0, acknowledgedThreshold: 0,
    response: null, responseAt: null, alertedThreshold: 0, renderedStage: 'normal',
  });

  const emptyPhotos = () => ({ near: null, far: null, unload: null });

  /** 'load' | 'unload' | null — czy punkt z karty nadaje się do kreatora. */
  function wizardMode(point) {
    if (!point || !has(point.id) || !has(point.transport_offer)) return null;
    if (text(point.status).toLowerCase() !== 'in_progress') return null;
    const type = text(point.operation_type).toLowerCase();
    if (type === 'loading') return 'load';
    if (type === 'unloading') return 'unload';
    return null;
  }

  /** Ścieżka odczytu celów dla trybu — względem /api/. */
  function targetsPath(mode, pointId) {
    const id = encodeURIComponent(String(pointId));
    return mode === 'unload'
      ? `routes/points/${id}/label-scan/`
      : `documents/labels/targets/?point_id=${id}`;
  }

  /** Bezwzględny URL obrazu /media/ (backend oddaje względne ścieżki, WebView ma origin file://). */
  function absoluteMediaUrl(origin, url) {
    const value = text(typeof url === 'object' && url ? url.url : url);
    if (!value) return '';
    if (/^https?:\/\//i.test(value)) return value;
    const base = text(origin).replace(/\/+$/, '');
    if (!base) return value;
    return `${base}${value.startsWith('/') ? '' : '/'}${value}`;
  }

  /** Miejsce punktu w kształcie `assignment.pickup` z makiety (travelView, placeView). */
  function placeFromPoint(point) {
    const location = (point && point.location_details) || {};
    const country = text(point && point.country) || text(location.country);
    return {
      company: text(point && point.location_name) || text(location.label) || text(point && point.operation_type_display) || 'Punkt trasy',
      address: text(point && point.location_address) || text(location.full_address),
      country,
      countryName: countryName(country),
      latitude: has(point && point.latitude) ? point.latitude : location.latitude,
      longitude: has(point && point.longitude) ? point.longitude : location.longitude,
    };
  }

  const unknownPlace = label => ({ company: label, address: '', country: '', countryName: '', latitude: null, longitude: null });

  /**
   * Sztuka ładunku z `cargo_items[]` (labels/targets) w kształcie makePiece() z makiety.
   * `previous` = ta sama sztuka z poprzedniego odczytu — zachowuje zdjęcia i checkbox.
   */
  function pieceFromCargoItem(item, index, previous) {
    const seal = text(item.label_code) || null;
    const unloading = text(item.unloading_label);
    return {
      id: `cargo-${item.id}`,
      cargoItemId: item.id,
      name: text(item.description) || `Sztuka ładunku ${index + 1}`,
      description: unloading ? `Rozładunek: ${unloading}` : '',
      mass: number(item.weight),
      dimensions: '',
      // plomba przypięta w TMS = na pewno naklejona; bez plomby pamiętamy zaznaczenie kierowcy
      label: Boolean(seal) || Boolean(previous && previous.label),
      seal,
      expectedSeal: null,
      photos: previous ? previous.photos : emptyPhotos(),
      loadingPhotos: { near: null, far: null },
    };
  }

  /**
   * Sztuka do rozładunku z `items[]` (label-scan GET): plomba z załadunku to
   * `expectedSeal`, a `scanned` = potwierdzona w tym punkcie (`seal`).
   */
  function pieceFromUnloadingItem(item, index, previous) {
    const expected = text(item.label_code) || null;
    return {
      id: `cargo-${item.id}`,
      cargoItemId: item.id,
      name: text(item.description) || `Sztuka ładunku ${index + 1}`,
      description: '',
      mass: number(item.weight),
      dimensions: '',
      label: true,
      seal: item.scanned ? (expected || 'ZESKANOWANA') : null,
      expectedSeal: expected,
      photos: previous ? previous.photos : emptyPhotos(),
      loadingPhotos: { near: null, far: null },
    };
  }

  /** Plomba CMR per odbiorca (`cmr_items[]`, B667/B811). */
  function cmrFromItem(item) {
    return {
      cmrItemId: item.id,
      seal: text(item.label_code) || null,
      unloadingPointId: has(item.unloading_point_id) ? item.unloading_point_id : null,
      label: text(item.unloading_label) || '',
    };
  }

  function baseRecord(mode, prev) {
    return {
      mode,
      arrived: true,
      physicalConfirmed: Boolean(prev && prev.physicalConfirmed),
      started: Boolean(prev && prev.started),
      items: [],
      cmrItems: [],
      cmrRequired: true,
      cmrLabel: Boolean(prev && prev.cmrLabel),
      cmrSeal: prev ? prev.cmrSeal : null,
      cmrSealSkipped: Boolean(prev && prev.cmrSealSkipped),
      expectedCmrSeal: null,
      loadingDocuments: [],
      documents: prev ? prev.documents : [],
      documentsComplete: Boolean(prev && prev.documentsComplete),
      messages: prev ? prev.messages : [],
      finished: false,
      timing: prev ? prev.timing : freshTiming(),
      step: prev ? prev.step : (mode === 'unload' ? 'seals' : 'info'),
    };
  }

  /**
   * Rekord operacji załadunku z punktu (routes/driver/status) i celów oklejania.
   * Kształt = fresh('load') z flow.js + `live` z faktami backendu.
   */
  function buildLoadingRecord(point, targets, previous) {
    const prev = previous && previous.live && previous.mode === 'load' ? previous : null;
    const prevItems = new Map((prev ? prev.items : []).map(item => [item.cargoItemId, item]));
    const cargoItems = Array.isArray(targets && targets.cargo_items) ? targets.cargo_items : [];
    const cmrItems = Array.isArray(targets && targets.cmr_items) ? targets.cmr_items : [];
    const record = baseRecord('load', prev);
    record.items = cargoItems.map((item, index) => pieceFromCargoItem(item, index, prevItems.get(item.id)));
    record.cmrItems = cmrItems.map(cmrFromItem);
    record.cmrRequired = (targets && targets.cmr_hint) !== 'not_required';
    const sealedCmrs = record.cmrItems.filter(cmr => cmr.seal);
    // checkbox „plomba naklejona na CMR” — lokalny, ale plomba w TMS go wymusza
    record.cmrLabel = Boolean(prev && prev.cmrLabel) || sealedCmrs.length > 0;
    // makieta trzyma jedną plombę CMR; przy kilku odbiorcach pokazujemy listę z `cmrItems`
    record.cmrSeal = sealedCmrs.length ? sealedCmrs.map(cmr => cmr.seal).join(' · ') : null;
    record.live = {
      pointId: point && has(point.id) ? String(point.id) : null,
      offerId: has(targets && targets.offer_id) ? targets.offer_id : (point && point.transport_offer) || null,
      orderNumber: text(targets && targets.order_number) || text(point && point.order_number),
      checklist: (targets && targets.checklist) || null,
      cmrSingleDocument: Boolean(targets && targets.cmr_single_document),
      unloadingPointsCount: number(targets && targets.unloading_points_count) || record.cmrItems.length || 0,
      cmrHint: (targets && targets.cmr_hint) || null,
      loadingPhotos: [],
      state: null,
      fileTokens: prev ? prev.live.fileTokens : [],
    };
    return record;
  }

  /**
   * Rekord operacji rozładunku z punktu i odpowiedzi GET routes/points/{id}/label-scan/.
   * Kształt = fresh('unload'): najpierw plomba CMR (`seals`), potem sztuki i skan CMR.
   * Zdjęcia z załadunku (`loading_photos`) trafiają do live.loadingPhotos — galeria nad sztukami.
   */
  function buildUnloadingRecord(point, targets, previous, mediaOrigin) {
    const prev = previous && previous.live && previous.mode === 'unload' ? previous : null;
    const prevItems = new Map((prev ? prev.items : []).map(item => [item.cargoItemId, item]));
    const items = Array.isArray(targets && targets.items) ? targets.items : [];
    const record = baseRecord('unload', prev);
    record.items = items.map((item, index) => pieceFromUnloadingItem(item, index, prevItems.get(item.id)));
    const state = (targets && targets.state) || null;
    const photos = Array.isArray(targets && targets.loading_photos) ? targets.loading_photos : [];
    record.live = {
      pointId: point && has(point.id) ? String(point.id) : null,
      offerId: has(targets && targets.offer_id) ? targets.offer_id : (point && point.transport_offer) || null,
      orderNumber: text(targets && targets.order_number) || text(point && point.order_number),
      checklist: (targets && targets.checklist) || null,
      cmrSingleDocument: false,
      unloadingPointsCount: 1,
      cmrHint: null,
      loadingPhotos: photos.map(url => absoluteMediaUrl(mediaOrigin, url)).filter(has),
      state,
      fileTokens: prev ? prev.live.fileTokens : [],
    };
    return record;
  }

  function buildRecord(mode, point, targets, previous, mediaOrigin) {
    return mode === 'unload'
      ? buildUnloadingRecord(point, targets, previous, mediaOrigin)
      : buildLoadingRecord(point, targets, previous);
  }

  /** Dane zlecenia w kształcie `assignment` z makiety (nagłówki, travelView, cargoView). */
  function buildAssignment(point, record) {
    const items = record.items;
    const mass = items.reduce((sum, item) => sum + (item.mass || 0), 0);
    const destinations = [...new Set(items.map(item => item.description.replace(/^Rozładunek: /, '')).filter(has))];
    const here = placeFromPoint(point);
    const unload = record.mode === 'unload';
    return {
      id: record.live.orderNumber || `punkt ${record.live.pointId || ''}`.trim(),
      // makieta: currentPlace() = pickup dla załadunku, delivery dla rozładunku
      pickup: unload ? unknownPlace('Według zlecenia w Super Spedytorze') : here,
      delivery: unload ? here : unknownPlace(destinations.length ? destinations.join(' · ') : 'Według zlecenia w Super Spedytorze'),
      cargo: {
        name: text(point && point.cargo_description) || text(point && point.cargo_summary) || 'Sztuki ładunku ze zlecenia',
        quantity: items.length,
        unit: items.length === 1 ? 'sztuka' : 'sztuki',
        mass: Math.round(mass * 100) / 100,
        dimensions: '',
        demo: false,
      },
    };
  }

  /** Ciało POST documents/labels/assign/ dla celu skanu z makiety ({kind:'piece',index} | {kind:'cmr', cmrIndex}). */
  function assignBody(record, target, code) {
    const body = { code: text(code).toUpperCase(), point_id: Number(record.live.pointId) };
    if (target.kind === 'cmr') {
      const cmr = record.cmrItems[target.cmrIndex || 0];
      if (!cmr) return null;
      body.cmr_item_id = cmr.cmrItemId;
    } else {
      const piece = record.items[target.index];
      if (!piece) return null;
      body.cargo_item_id = piece.cargoItemId;
    }
    return body;
  }

  /** Lokalne odbicie 201 z assign — do readbacku i tak idzie ponowny GET celów. */
  function applyAssignResult(record, target, body) {
    const code = text(body && body.code);
    if (!code) return record;
    if (target.kind === 'cmr') {
      const cmr = record.cmrItems[target.cmrIndex || 0];
      if (cmr) cmr.seal = code;
      const sealed = record.cmrItems.filter(item => item.seal).map(item => item.seal);
      record.cmrSeal = sealed.length ? sealed.join(' · ') : code;
      record.cmrLabel = true;
    } else {
      const piece = record.items[target.index];
      if (piece) {
        piece.seal = code;
        piece.label = true;
      }
    }
    return record;
  }

  /** Ciało POST routes/points/{id}/label-scan/ (rozładunek). */
  function scanBody(code, manual) {
    return { code: text(code).toUpperCase(), manual: Boolean(manual) };
  }

  /**
   * Odbicie 200 z label-scan. Backend sam rozstrzyga, czyja to plomba: `kind` 'cmr'
   * (nie liczona do bramki) albo 'cargo' z `cargo_item_id`. Gdy kierowca celował
   * w inną pozycję niż ta, którą TMS rozpoznał, zwracamy komunikat — skan i tak
   * został zaliczony właściwej sztuce.
   */
  function applyScanResult(record, target, body) {
    const code = text(body && body.code);
    const kind = text(body && body.kind).toLowerCase();
    if (kind === 'cmr') {
      record.cmrSeal = code || record.cmrSeal || 'ZESKANOWANA';
      record.cmrSealSkipped = false;
      return { ok: true, mismatch: target.kind !== 'cmr', message: target.kind !== 'cmr' ? 'To plomba dokumentu CMR, nie sztuki — zapisana jako plomba CMR.' : '' };
    }
    const itemId = body && body.cargo_item_id;
    const piece = record.items.find(item => String(item.cargoItemId) === String(itemId))
      || (target.kind === 'piece' ? record.items[target.index] : null);
    if (piece) piece.seal = code || piece.expectedSeal || 'ZESKANOWANA';
    const expectedPiece = target.kind === 'piece' ? record.items[target.index] : null;
    const mismatch = Boolean(expectedPiece && piece && expectedPiece !== piece);
    return {
      ok: true,
      mismatch,
      message: mismatch ? `To plomba innej sztuki (${piece.name}) — zaliczona tej sztuce.` : (target.kind === 'cmr' ? 'To plomba sztuki ładunku, nie dokumentu CMR.' : ''),
    };
  }

  /** Pola multipart dla upload_document: rodzaj dokumentu z kroku makiety. */
  function uploadFields(mode, kind) {
    const types = DOCUMENT_TYPES[mode] || DOCUMENT_TYPES.load;
    return { document_type: kind === 'cmr' ? types.cmr : types.photo };
  }

  /** Rekord zdjęcia/CMR dla addEvidence() po potwierdzonym uploadzie (201). */
  function evidenceRecord(file, kind, pieceIndex, uploadBody) {
    return {
      hash: `upload-${file.token}`,
      url: file.url,
      name: file.name || (kind === 'cmr' ? 'cmr-skan.pdf' : 'zdjecie.jpg'),
      mime: file.mime || (kind === 'cmr' ? 'application/pdf' : 'image/jpeg'),
      demo: false,
      kind,
      pieceIndex,
      source: 'step',
      token: file.token,
      documentId: uploadBody && has(uploadBody.id) ? uploadBody.id : null,
      pages: number(file.pages),
    };
  }

  /** Plomby CMR gotowe = każda pozycja cmr_items ma plombę (gdy CMR jest wymagane); na rozładunku: zeskanowana albo świadomie pominięta. */
  function cmrSealsReady(record) {
    if (record.mode === 'unload') return Boolean(record.cmrSeal) || Boolean(record.cmrSealSkipped);
    if (!record.cmrRequired) return true;
    if (!record.cmrItems.length) return Boolean(record.cmrSeal);
    return record.cmrItems.every(cmr => cmr.seal);
  }

  /**
   * Czy bramka plomb (B659) po stronie TMS przepuści `complete`.
   * Załadunek: plomba na każdej sztuce i każdej CMR. Rozładunek: skan każdej sztuki
   * schodzącej tutaj (TMS: `state.blockers` puste; `legacy` = sztuki bez plomb przechodzą).
   */
  function sealsSatisfyGate(record) {
    if (record.mode === 'unload') {
      const state = record.live && record.live.state;
      if (state && Array.isArray(state.blockers)) return state.blockers.length === 0 || record.items.every(item => item.seal);
      return record.items.every(item => item.seal);
    }
    return record.items.length > 0 && record.items.every(item => item.seal) && cmrSealsReady(record);
  }

  /** Status zlecenia po potwierdzonym zapisie punktu (start/complete) albo null. */
  function orderStatusAfterWrite(point, action) {
    const type = text(point && point.operation_type).toLowerCase();
    const mode = type === 'loading' ? 'load' : type === 'unloading' ? 'unload' : null;
    if (!mode || !has(point && point.transport_offer)) return null;
    const status = (ORDER_STATUS[mode] || {})[action] || null;
    if (!status) return null;
    return { offerId: point.transport_offer, status, path: `documents/transport/${encodeURIComponent(String(point.transport_offer))}/driver-update-status/` };
  }

  /** Komunikat dla kierowcy z odpowiedzi mostka ({status, body} albo {status:'error', message}). */
  function errorMessage(result, fallback) {
    if (!result) return fallback || 'Brak odpowiedzi z Super Spedytora.';
    if (result.status === 'error' || result.status === 0) {
      return result.message || fallback || 'Nie udało się połączyć z Super Spedytorem.';
    }
    const body = result.body && typeof result.body === 'object' ? result.body : {};
    const reasons = {
      unknown: 'Ten kod nie wygląda jak plomba z puli AMG. Sprawdź naklejkę albo wpisz numer ręcznie.',
      void: 'Ta plomba jest unieważniona. Weź inną naklejkę.',
      already_used: 'Ta plomba jest już przypięta do innej sztuki albo dokumentu.',
      wrong_offer: 'Ta plomba należy do innego zlecenia albo do sztuki, która nie schodzi w tym punkcie.',
      not_yours: 'Ta plomba nie jest z Twojej trasy.',
    };
    if (has(body.result) && reasons[body.result]) return reasons[body.result];
    if (Array.isArray(body.label_blockers) && body.label_blockers.length) {
      return `${text(body.error) || 'Brakuje plomb.'} ${body.label_blockers.map(blocker => blocker.label).filter(has).join(' · ')}`.trim();
    }
    if (has(body.error)) return String(body.error);
    if (has(body.detail)) return String(body.detail);
    if (has(body.message)) return String(body.message);
    if (result.status === 401) return 'Sesja wygasła — zaloguj się ponownie.';
    if (result.status === 403) return 'Super Spedytor odmówił dostępu do tego punktu.';
    if (result.status === 404) return 'Super Spedytor nie znalazł tego punktu albo sztuki na Twojej trasie.';
    if (Number(result.status) >= 500) return 'Super Spedytor ma chwilowy problem. Spróbuj ponownie.';
    return fallback || `Super Spedytor odrzucił żądanie (HTTP ${result.status}).`;
  }

  const isSuccess = result => result && Number.isInteger(result.status) && result.status >= 200 && result.status < 300;

  /** Zgodność wsteczna z AA9. */
  const canOpenLoadingWizard = point => wizardMode(point) === 'load';

  return {
    DOCUMENT_TYPES,
    ORDER_STATUS,
    wizardMode,
    targetsPath,
    absoluteMediaUrl,
    buildLoadingRecord,
    buildUnloadingRecord,
    buildRecord,
    buildAssignment,
    placeFromPoint,
    assignBody,
    applyAssignResult,
    scanBody,
    applyScanResult,
    uploadFields,
    evidenceRecord,
    cmrSealsReady,
    sealsSatisfyGate,
    orderStatusAfterWrite,
    errorMessage,
    isSuccess,
    canOpenLoadingWizard,
  };
});
