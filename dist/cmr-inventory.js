(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SuperSpedytorCmrInventory = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const checks = {
    separate_sleeve: 'Ten ładunek jest w osobnej koszulce.',
    cmr_first: 'Pierwszą stroną, widoczną z przodu, jest CMR.',
    blank_last_reverse: 'Z tyłu jest pusty rewers ostatniej strony CMR z plombą.',
    signatures_stamps_annotations: 'Komplet zawiera wszystkie wymagane podpisy, pieczątki i adnotacje.',
  };
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g,
    char => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[char]));
  const issues = {
    driver_disagrees: 'Kierowca zgłosił niezgodność kompletu.',
    seal_mismatch: 'Plomba jest przypisana do innego dokumentu.',
    back_or_seal_unreadable: 'Nie potwierdzono pustego rewersu i czytelnej, zgodnej plomby.',
    ambiguous_document: 'Kilka dokumentów pasuje do zdjęcia. Wymagana kontrola CWP.',
    document_not_matched: 'Nie znaleziono jednoznacznie zgodnej kopii CMR po rozładunku.',
    verification_error: 'Porównanie dokumentów nie zakończyło się poprawnie.',
    missing_document: 'Zgłoszono brak dokumentu.',
    scope_changed: 'Zmienił się zakres dokumentów.',
  };
  function activeAttempt(data) {
    return (data.attempts || []).find(a => !['packed', 'cancelled'].includes(a.status)
      && !(a.verification && a.verification.reported && !a.resolved_at));
  }
  function canComplete(data) {
    return data.expected > 0 && data.packed === data.expected && data.issues === 0
      && !['completed', 'cancelled', 'scope_changed'].includes(data.status);
  }
  function nextStep(attempt) {
    if (!attempt) return 'scan';
    if (attempt.status === 'capturing') return !attempt.has_back ? 'back' : !attempt.has_front ? 'front' : 'verify';
    if (['queued', 'checking'].includes(attempt.status)) return 'processing';
    if (attempt.status === 'confirmed') return 'pack';
    if (attempt.status === 'matched' || attempt.issue === 'seal_mismatch') return 'confirm';
    return 'review';
  }
  function requestKey() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16);
    });
  }
  class Screen {
    constructor(options) {
      this.options = options; this.data = null; this.busy = false; this.error = '';
      this.images = {}; this.timer = null; this.disposed = false; this.polls = 0; this.files = {};
      this.root = document.createElement('section'); this.root.className = 'cmri-screen';
      this.root.setAttribute('aria-label', 'Inwentaryzacja zamkniętych CMR');
      options.host.appendChild(this.root);
    }
    path(action) { return 'documents/cmr-inventory/' + this.options.id + '/' + (action ? action + '/' : ''); }
    async start() { await this.run(() => this.read()); }
    async read() {
      const data = await this.options.request('GET', this.path());
      if (this.disposed) return;
      this.data = data;
      const active = activeAttempt(data);
      if (this.pendingScan && (data.attempts || []).some(a => a.request_key === this.pendingScan.request_key)) this.pendingScan = null;
      for (const [side, file] of Object.entries(this.files)) {
        if (!active || file.attemptId !== active.id || active['has_' + side]) {
          this.options.release(file.token); delete this.files[side];
        }
      }
      if (active && !['queued', 'checking'].includes(active.status) && (active.has_front || active.has_back)) {
        const imageData = await this.options.request('GET', this.path() + '?images=' + active.id);
        if (!this.disposed) this.images[active.id] = imageData.attempts.find(a => a.id === active.id) || {};
      }
      this.render(); this.schedule();
    }
    schedule() {
      clearTimeout(this.timer);
      const active = this.data && activeAttempt(this.data);
      if (!this.disposed && active && ['queued', 'checking'].includes(active.status) && this.polls++ < 100) {
        this.timer = setTimeout(() => this.run(() => this.read(), true), 3000);
      }
    }
    async run(work, quiet) {
      if (this.busy || this.disposed) return;
      this.busy = true; if (!quiet) this.error = ''; this.render();
      try { await work(); } catch (error) {
        this.error = error.message || 'Nie udało się potwierdzić zapisu. Odśwież stan zadania.';
        // A lost response may hide a committed write. Recover server state before another action.
        try { await this.read(); } catch (_) { /* Keep the original error and last confirmed state. */ }
      } finally { this.busy = false; if (!this.disposed) this.render(); }
    }
    async mutate(action, body) {
      await this.options.request('POST', this.path(action), body); await this.read();
    }
    async scan(replacement) {
      const code = await this.options.scan();
      if (!code) return;
      if (!this.pendingScan || this.pendingScan.code !== code || this.pendingScan.replacement !== replacement) {
        this.pendingScan = {request_key: requestKey(), code, replacement};
      }
      await this.mutate('scan', this.pendingScan); this.pendingScan = null;
    }
    async photo(side) {
      const attempt = activeAttempt(this.data);
      const file = this.files[side] || await this.options.capture();
      if (!file) return;
      this.files[side] = {...file, attemptId: attempt.id};
      await this.options.upload(this.path('photo'), file.token, {side, attempt_id: String(attempt.id)});
      this.options.release(file.token); delete this.files[side];
      await this.read();
    }
    gallery(attempt) {
      const images = this.images[attempt.id] || {};
      return '<div class="cmri-gallery">' + [['front', 'Przód koszulki'], ['back', 'Tył z plombą'], ['reference', 'CMR po rozładunku']]
        .filter(([side]) => images[side + '_preview'])
        .map(([side, label]) => '<figure><figcaption>' + label + '</figcaption><img src="' +
          esc(images[side + '_preview']) + '" alt="' + label + '" data-preview="' + esc(label) + '" tabindex="0" role="button"></figure>').join('') + '</div>';
    }
    form(attempt) {
      const issue = attempt.issue === 'seal_mismatch';
      return this.gallery(attempt) + (issue ? '<p class="cmri-warning">Porównaj papierowy CMR ze skanem po rozładunku. Zgodność treści nie naprawia przypisania plomby.</p>' : '') +
        '<form id="cmri-confirm"><label class="cmri-check"><input type="checkbox" name="documents_match" required> Papierowy CMR jest zgodny ze skanem z rozładunku.</label>' +
        Object.entries(checks).map(([key, text]) => '<label class="cmri-check"><input type="checkbox" name="' + key + '" required> ' + text + '</label>').join('') +
        '<p class="cmri-note">Sprawdź także strony wewnątrz koszulki. Zdjęcia zewnętrzne nie pokazują całego kompletu.</p>' +
        '<button class="primary-button" type="submit">' + (issue ? 'CMR zgodny — zgłoś plombę do CWP' : 'Potwierdzam zgodność i kompletność') + '</button></form>' +
        '<button class="secondary-button" data-action="report">Dokumenty się różnią — zgłoś do CWP</button>';
    }
    step(attempt) {
      const step = nextStep(attempt);
      if (step === 'scan') return '<section class="panel"><h3>Przygotuj pierwszą koszulkę</h3><p>Jeden ładunek — jedna koszulka. Z przodu CMR, z tyłu pusty rewers ostatniej strony z plombą.</p><button class="primary-button" data-action="scan">Skanuj plombę z tyłu</button><button class="secondary-button" data-action="replacement">Na dokumencie nie ma plomby</button></section>';
      const title = {back: '2. Zdjęcie tyłu z plombą', front: '3. Odwróć koszulkę — zdjęcie przodu',
        verify: '4. Porównaj CMR', processing: 'Porównywanie dokumentu…', confirm: '5. Sprawdź komplet',
        pack: '6. Włóż do tekturowej koperty', review: 'Dokument wymaga wyjaśnienia'}[step];
      let body = '';
      if (step === 'back' || step === 'front') body = '<p>' + (step === 'back'
        ? 'Pokaż całą tylną stronę koszulki. Numer plomby musi być czytelny.'
        : 'Odwróć koszulkę na drugą stronę. Pokaż cały CMR widoczny z przodu.') +
        '</p><button class="primary-button" data-action="' + step + '">Zrób zdjęcie</button>';
      if (step === 'verify') body = '<p>Oba zdjęcia zapisano. System rozpozna CMR i porówna go ze skanem z rozładunku.</p><button class="primary-button" data-action="verify">Rozpoznaj i porównaj CMR</button>';
      if (step === 'processing') body = '<p role="status">Zdjęcia są zapisane. Możesz zamknąć ekran i wrócić później do tego samego zadania.</p>';
      if (step === 'confirm') body = this.form(attempt);
      if (step === 'pack') body = '<p>Dokument został zweryfikowany. Włóż całą koszulkę do tekturowej koperty.</p><button class="primary-button" data-action="pack">Włożyłem koszulkę do koperty</button>';
      if (step === 'review') body = this.gallery(attempt) + '<p class="cmri-warning">' + esc(issues[attempt.issue] || 'Wymagana kontrola CWP.') +
        '</p><button class="primary-button" data-action="report">Zgłoś do CWP</button>';
      const cancel = !['pack', 'processing'].includes(step) ? '<button class="secondary-button" data-action="cancel">Powtórz tę koszulkę</button>' : '';
      return '<section class="panel"><small>PLOMBA ' + esc(attempt.scanned_code) + '</small><h3>' + title + '</h3>' + body + cancel + '</section>';
    }
    render() {
      if (this.disposed) return;
      const data = this.data, active = data && activeAttempt(data);
      let content = '<p role="status">Pobieranie zadania…</p>';
      if (data) {
        const packed = new Set(data.attempts.filter(a => a.status === 'packed').map(a => a.cmr_item_id));
        content = '<div class="cmri-identity"><strong>' + esc(data.driver_name) + '</strong><span>' + esc(data.vehicle_registration) + '</span></div>' +
          '<div class="cmri-progress"><strong>' + data.packed + ' / ' + data.expected + '</strong><span>koszulek w kopercie</span></div>' +
          (data.status === 'completed' ? '<section class="panel"><h3>Inwentaryzacja zakończona</h3><p>Raport z parami zdjęć zapisano w SuperSpedytorze i zakolejkowano do CWP.</p></section>'
            : data.status === 'cancelled' ? '<p class="cmri-warning">Zadanie anulowane po zmianie stanu dokumentów.</p>'
            : data.status === 'scope_changed' ? '<p class="cmri-warning">Plan trasy lub stan dokumentów zmienił się. Poczekaj na zakończenie rozładunków i odśwież zakres.</p>'
            : this.step(active)) +
          '<section class="panel"><h3>Lista oczekiwanych kompletów</h3><ul class="cmri-items">' +
          data.scope.map(row => '<li><span>' + esc(row.order_number || ('Zlecenie ' + row.offer_id)) + ' · komplet ' + row.item_id + '</span>' +
            (packed.has(row.item_id) ? '<b>W kopercie</b>' : ['completed', 'cancelled', 'scope_changed'].includes(data.status) ? '<span>Zmiana zakresu</span>' : '<button data-missing="' + row.item_id + '">Zgłoś brak</button>') + '</li>').join('') + '</ul></section>' +
          data.attempts.filter(a => a.verification && a.verification.reported && !a.resolved_at && a.status !== 'cancelled')
            .map(a => '<section class="panel cmri-warning"><strong>Wymaga CWP</strong><p>' + esc(issues[a.issue] || a.note || 'Zgłoszenie do wyjaśnienia.') + '</p><small>Próba ' + a.id + ' · plomba ' + esc(a.scanned_code) + '</small></section>').join('') +
          (canComplete(data) ? '<button class="primary-button" data-action="complete">Wszystkie koszulki są w kopercie — zakończ</button>' : '');
      }
      this.root.innerHTML = '<header class="cmri-header"><button data-action="close" aria-label="Zamknij inwentaryzację">←</button><h2>Zamknięte CMR-y</h2><button data-action="refresh" aria-label="Odśwież zadanie">↻</button></header><div class="cmri-body">' +
        (this.error ? '<p class="cmri-error" role="alert">' + esc(this.error) + '</p>' : '') +
        (this.busy ? '<p class="cmri-note" role="status">Zapisywanie i sprawdzanie stanu…</p>' : '') + content + '</div>';
      this.root.querySelectorAll('button, input').forEach(el => { if (el.dataset.action !== 'close') el.disabled = this.busy; });
      this.root.querySelectorAll('[data-action]').forEach(button => button.onclick = () => {
        const action = button.dataset.action;
        if (action === 'close') { this.close(); return; }
        this.run(async () => {
          if (action === 'refresh') { await this.options.request('POST', this.path('refresh')); await this.read(); return; }
          if (action === 'scan' || action === 'replacement') {
            if (action === 'replacement' && !window.confirm('Naklej nową, nieużytą plombę na pustym rewersie ostatniej strony CMR. Następnie zeskanuj jej kod.')) return;
            await this.scan(action === 'replacement'); return;
          }
          if (action === 'front' || action === 'back') { await this.photo(action); return; }
          if (action === 'complete') { await this.mutate('complete', {placed_in_envelope: true}); return; }
          const attempt = activeAttempt(this.data); if (!attempt) return;
          if (action === 'report' && !window.confirm('Zgłosić tę koszulkę do CWP wraz ze zdjęciami i wynikiem porównania?')) return;
          if (action === 'cancel' && !window.confirm('Zachować dotychczasową próbę w historii i powtórzyć zdjęcia koszulki?')) return;
          await this.mutate(action, {attempt_id: attempt.id, placed_in_envelope: action === 'pack'});
        });
      });
      this.root.querySelectorAll('[data-missing]').forEach(button => button.onclick = () => this.run(async () => {
        if (window.confirm('Zgłosić brak tego kompletu dokumentów do CWP?')) {
          await this.mutate('report', {item_id: Number(button.dataset.missing), note: 'Kierowca zgłosił brak kompletu podczas inwentaryzacji.'});
        }
      }));
      this.root.querySelectorAll('[data-preview]').forEach(image => {
        const open = () => {
          const modal = document.createElement('div'); modal.className = 'cmri-zoom';
          modal.setAttribute('role', 'dialog'); modal.setAttribute('aria-label', image.alt);
          const close = document.createElement('button'); close.textContent = 'Zamknij powiększenie';
          const picture = document.createElement('img'); picture.src = image.src; picture.alt = image.alt;
          close.onclick = () => { modal.remove(); image.focus(); };
          modal.onkeydown = event => { if (event.key === 'Escape') close.click(); };
          modal.append(close, picture); this.root.append(modal); close.focus();
        };
        image.onclick = open;
        image.onkeydown = event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); open(); } };
      });
      const form = this.root.querySelector('#cmri-confirm');
      if (form) form.onsubmit = event => {
        event.preventDefault();
        if (!form.reportValidity()) return;
        const values = {}; Object.keys(checks).forEach(key => { values[key] = form.elements[key].checked; });
        this.run(() => this.mutate('confirm', {attempt_id: activeAttempt(this.data).id, checks: values, matches: form.elements.documents_match.checked}));
      };
    }
    close() {
      this.disposed = true; clearTimeout(this.timer);
      Object.values(this.files).forEach(file => this.options.release(file.token));
      this.root.remove(); this.options.onClose();
    }
  }
  return {Screen, activeAttempt, nextStep, canComplete, checks, issues};
});
