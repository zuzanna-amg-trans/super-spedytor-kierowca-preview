'use strict';

const assert = require('node:assert/strict');
const timing = require('../dist/operation-timing.js');

assert.equal(timing.stageForElapsed(0), 'normal');
assert.equal(timing.stageForElapsed(19 * 60 + 59), 'normal');
assert.equal(timing.stageForElapsed(20 * 60), 'check-in');
assert.equal(timing.stageForElapsed(39 * 60 + 59), 'check-in');
assert.equal(timing.stageForElapsed(40 * 60), 'urgent');
assert.equal(timing.stageForElapsed(59 * 60 + 59), 'urgent');
assert.equal(timing.stageForElapsed(60 * 60), 'limit');

assert.equal(timing.describe(20 * 60).requiresResponse, false);
assert.equal(timing.describe(40 * 60).requiresResponse, true);
assert.equal(timing.describe(40 * 60, 40 * 60).requiresResponse, false);
assert.equal(timing.describe(60 * 60, 40 * 60).requiresResponse, true);
assert.equal(timing.describe(60 * 60, 60 * 60).requiresResponse, false);

assert.equal(timing.formatDuration(0), '00:00:00');
assert.equal(timing.formatDuration(20 * 60 + 5), '00:20:05');
assert.equal(timing.formatDuration(60 * 60), '01:00:00');
assert.equal(timing.subtractMinutesFromClock('08:00', 15), '07:45');
assert.equal(timing.subtractMinutesFromClock('00:10', 15), '23:55');
assert.equal(timing.subtractMinutesFromClock('brak', 15), '');

console.log('operation-timing: all assertions passed');
