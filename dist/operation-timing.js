'use strict';

(function exposeOperationTiming(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.SuperSpedytorOperationTiming = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createOperationTiming() {
  const thresholds = Object.freeze({
    checkInSeconds: 20 * 60,
    urgentSeconds: 40 * 60,
    limitSeconds: 60 * 60
  });

  function normalizeSeconds(value) {
    const seconds = Number(value);
    return Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  }

  function stageForElapsed(value) {
    const seconds = normalizeSeconds(value);
    if (seconds >= thresholds.limitSeconds) return 'limit';
    if (seconds >= thresholds.urgentSeconds) return 'urgent';
    if (seconds >= thresholds.checkInSeconds) return 'check-in';
    return 'normal';
  }

  function thresholdForStage(stage) {
    if (stage === 'limit') return thresholds.limitSeconds;
    if (stage === 'urgent') return thresholds.urgentSeconds;
    if (stage === 'check-in') return thresholds.checkInSeconds;
    return 0;
  }

  function describe(value, acknowledgedThreshold = 0) {
    const elapsedSeconds = normalizeSeconds(value);
    const stage = stageForElapsed(elapsedSeconds);
    const threshold = thresholdForStage(stage);
    const acknowledged = normalizeSeconds(acknowledgedThreshold);
    // Time escalation is advisory; it never gates navigation or completion.
    // Keep the legacy field for existing consumers, always non-blocking.
    const requiresResponse = false;
    const invitesResponse = stage !== 'normal' && acknowledged < threshold;
    const remainingSeconds = Math.max(0, thresholds.limitSeconds - elapsedSeconds);

    return {
      elapsedSeconds,
      stage,
      threshold,
      requiresResponse,
      invitesResponse,
      remainingSeconds,
      progressPercent: Math.min(100, elapsedSeconds / thresholds.limitSeconds * 100)
    };
  }

  function formatDuration(value) {
    const seconds = normalizeSeconds(value);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainder = seconds % 60;
    return [hours, minutes, remainder].map(part => String(part).padStart(2, '0')).join(':');
  }

  function subtractMinutesFromClock(clock, minutes) {
    const match = String(clock || '').match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return '';
    const total = (Number(match[1]) * 60 + Number(match[2]) - Number(minutes || 0) + 1440) % 1440;
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
  }

  return Object.freeze({
    thresholds,
    stageForElapsed,
    thresholdForStage,
    describe,
    formatDuration,
    subtractMinutesFromClock
  });
});
