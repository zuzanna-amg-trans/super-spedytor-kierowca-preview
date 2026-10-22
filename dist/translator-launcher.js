/* B792: only the native DEV capability can expose a translator entry. */
(function(root) {
  'use strict';
  const valid = value => /^[1-9][0-9]*$/.test(String(value ?? '')) && Number.isSafeInteger(Number(value));
  function context(point) {
    const orderId = point?.transport_offer?.id ?? point?.transport_offer;
    return valid(orderId) && valid(point?.id) ? { orderId: String(orderId), pointId: String(point.id) } : null;
  }
  function available(state) {
    try { return state?.status === 'connected' && state?.read_only !== true
      && Boolean(root.SuperSpedytorNative?.translatorAvailable?.()); } catch { return false; }
  }
  function button(point, state) {
    const value = context(point);
    return value && available(state) ? `<button type="button" class="b792-order" data-b792-order="${value.orderId}" data-b792-point="${value.pointId}">Translator w tym zleceniu</button>` : '';
  }
  function refresh(state) {
    const header = root.document?.querySelector('.app-header'); if (!header) return;
    let button = header.querySelector('[data-b792-general]');
    if (!available(state)) { button?.remove(); return; }
    if (!button) {
      button = root.document.createElement('button'); button.type = 'button'; button.className = 'b792-general';
      button.dataset.b792General = ''; button.textContent = 'Translator'; button.setAttribute('aria-label','Otwórz ogólny translator AI');
      button.onclick = () => root.SuperSpedytorNative.openTranslator('', ''); header.append(button);
    }
  }
  root.document?.addEventListener('click', event => {
    const button = event.target.closest?.('[data-b792-order]');
    if (button && valid(button.dataset.b792Order) && valid(button.dataset.b792Point))
      root.SuperSpedytorNative?.openTranslator(button.dataset.b792Order, button.dataset.b792Point);
  });
  const api = { context, available, button, refresh };
  if (typeof module !== 'undefined') module.exports = api;
  root.SuperSpedytorTranslator = api;
})(typeof window !== 'undefined' ? window : globalThis);
