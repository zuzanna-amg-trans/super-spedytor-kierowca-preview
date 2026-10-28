// Owner TMS driver view model, AMG-Trans/AMG_Fracht 3e29a88262a92966318ed65e601cf57bf3238e92.
// Pure formatting only; the server remains the source of compliance facts.
(function(){'use strict';
// Współdzielone formaty/etykiety tachografu (B343) — używane przez globalny
// panel (DriverTachoPanel) i pasek per-karta (VehicleCardTacho).

// Tryb pracy kierowcy -> etykieta + kolor (spójne z DriverWorkMode na backendzie).
const MODE = {
  drive: { label: 'JAZDA', dot: 'bg-green-500', text: 'text-green-700 dark:text-green-400' },
  rest: { label: 'ODPOCZYNEK', dot: 'bg-blue-500', text: 'text-blue-700 dark:text-blue-400' },
  work: { label: 'PRACA', dot: 'bg-amber-500', text: 'text-amber-700 dark:text-amber-400' },
  available: { label: 'DYSPOZYCYJNOŚĆ', dot: 'bg-gray-400', text: 'text-gray-600 dark:text-gray-400' },
};

const STATUS_ACCENT = {
  ok: 'border-l-green-500',
  warning: 'border-l-amber-500',
  violation: 'border-l-red-500',
  no_data: 'border-l-gray-300 dark:border-l-gray-600',
};

function fmtDur(s) {
  if (s === null || s === undefined) return '—';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m`;
}

// "01:23:45" (HH:MM:SS) — pod stoper licznika przerwy w Panelu tacho (tyka co 1 s).
function fmtStopwatch(s) {
  if (s === null || s === undefined || s < 0) return '00:00:00';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

// "07:48" (MM:SS) — pod odliczanie przerwy u kierowcy. Sekundnik jest celowy: od razu widać,
// że liczba leci w dół, a nie że to stoper. Ujemne domykamy do zera.
function fmtMmSs(s) {
  const total = Math.max(0, Math.floor(s || 0));
  const minutes = Math.floor(total / 60);
  return `${String(minutes).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

// "08:59" (HH:MM z wiodącym zerem) — format licznika Z WYŚWIETLACZA TACHOGRAFU.
// Świadomie inny niż fmtDur ("8h 59m"): kafel liczników ma się czytać 1:1 z tym,
// co kierowca widzi w kabinie, łącznie z „00:05" dla pięciu minut.
function fmtHhMm(s) {
  if (s === null || s === undefined || Number.isNaN(s)) return '—';
  const abs = Math.max(0, Math.floor(s));
  const h = Math.floor(abs / 3600);
  const m = Math.floor((abs % 3600) / 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function fmtClock(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleTimeString('pl-PL', {
      hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Warsaw',
    });
  } catch {
    return '—';
  }
}

// "czw 07:45" — skrót dnia tygodnia (PL) + godzina (Warsaw). Pod etykietę odp. tygodniowego.
function fmtWeekdayClock(value) {
  if (!value) return '—';
  try {
    const wd = new Date(value).toLocaleDateString('pl-PL', {
      weekday: 'short', timeZone: 'Europe/Warsaw',
    });
    return `${wd} ${fmtClock(value)}`;
  } catch {
    return '—';
  }
}

// Kolor pilności odliczania (sekundy do terminu). Próg ostrzeżenia domyślnie 2h.
function urgencyClass(s, warnAtS = 2 * 3600) {
  if (s === null || s === undefined) return 'text-gray-400';
  if (s <= 0) return 'text-red-600 dark:text-red-400 font-semibold';
  if (s <= warnAtS) return 'text-amber-600 dark:text-amber-400';
  return 'text-gray-600 dark:text-gray-300';
}

// "13:05–14:30" w strefie Warszawy — pod tooltip osi czasu doby.
function fmtRange(startIso, endIso) {
  return `${fmtClock(startIso)}–${fmtClock(endIso)}`;
}

// "06-29 15:00" (MM-DD HH:MM, Europe/Warsaw) — pod wiersz tygodniowy (start/koniec).
function fmtDateTime(value) {
  if (!value) return '—';
  try {
    const d = new Date(value);
    const date = d.toLocaleDateString('en-CA', {
      timeZone: 'Europe/Warsaw', month: '2-digit', day: '2-digit',
    });
    return `${date} ${fmtClock(value)}`;
  } catch {
    return '—';
  }
}

// „Ile temu" — odstęp od znacznika ISO do `nowMs` (domyślnie teraz), sformatowany
// jak fmtDur ("3h 12m" / "14m"). Null gdy brak/niepoprawny znacznik. Pod etykietę
// „nieaktualne" statusu tacho (od kiedy dane są stare). Zob. tacho_compliance.last_data_at.
function fmtAgo(value, nowMs = Date.now()) {
  if (!value) return null;
  const t = new Date(value).getTime();
  if (Number.isNaN(t)) return null;
  return fmtDur(Math.max(0, Math.floor((nowMs - t) / 1000)));
}

// Zegar ETA: bazowy czas (ms) + przesunięcie w sekundach → "HH:MM".
function fmtEta(baseMs, offsetS) {
  if (baseMs == null || offsetS == null) return '—';
  return fmtClock(baseMs + offsetS * 1000);
}

const WARSAW_TZ = 'Europe/Warsaw';
const DAY_MS = 24 * 3600 * 1000;
const CLOCK_RE = /^\d{2}:\d{2}$/;

// Przesunięcie strefy Warszawy w danym momencie, jako "+02:00" — DST-aware.
function warsawOffset(date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: WARSAW_TZ, timeZoneName: 'longOffset',
  }).formatToParts(date);
  const name = parts.find((p) => p.type === 'timeZoneName')?.value || 'GMT+00:00';
  return name.replace('GMT', '') || '+00:00';
}

// „05:15" → ISO najbliższego wystąpienia tej godziny PO `fromMs`, liczone w strefie
// Warszawy — tej samej, w której kierowca widzi wszystkie pozostałe godziny tacho.
// Wpisując godzinę wcześniejszą niż teraz kierowca ma na myśli jutro (odpoczynek dobowy
// przechodzi przez noc), stąd doładowanie doby. Offset liczymy dwukrotnie, żeby zgłoszenie
// przez granicę zmiany czasu nie wypadło o godzinę obok.
function nextClockOccurrence(hhmm, fromMs = Date.now()) {
  if (!CLOCK_RE.test(hhmm || '')) return null;
  const build = (dayKey, offset) => new Date(`${dayKey}T${hhmm}:00${offset}`);
  const from = new Date(fromMs);
  let dayKey = warsawDayKey(from);
  let candidate = build(dayKey, warsawOffset(from));
  if (candidate.getTime() <= fromMs) {
    dayKey = warsawDayKey(new Date(fromMs + DAY_MS));
    candidate = build(dayKey, warsawOffset(from));
  }
  const corrected = build(dayKey, warsawOffset(candidate));
  return Number.isNaN(corrected.getTime()) ? null : corrected.toISOString();
}

// Znacznik ISO/ms → "05:15" w strefie Warszawy, czyli wartość gotowa do <input type="time">.
function toClockInput(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-GB', {
    hour: '2-digit', minute: '2-digit', timeZone: WARSAW_TZ,
  });
}

// Klucz lokalnej doby (Europe/Warsaw) dla znacznika ISO — do kubełkowania historii.
function warsawDayKey(value) {
  if (!value) return null;
  try {
    // en-CA daje format YYYY-MM-DD; wymuszamy strefę Warszawy (DST-aware).
    return new Date(value).toLocaleDateString('en-CA', { timeZone: 'Europe/Warsaw' });
  } catch {
    return null;
  }
}


// Syrena SS (B373): eskalujący dźwięk, gdy kierowca zbliża się do limitu czasu pracy.
//
// Podział odpowiedzialności (CLAUDE.md „backend liczy progi, front gra"):
//  - BACKEND (signals[]) decyduje, KTÓRE metryki grają (`sig.sound`) i czym headroom „opada"
//    w czasie (`sig.decays_with` = 'drive' | 'work'); dostarcza też bieżący zapas `sig.value` (s).
//  - FRONT (ten plik) zna tylko KADENCJĘ „marków" (min do limitu) → tier eskalacji oraz
//    generuje tony Web Audio (bez plików audio).
//
// Eskalacja zgodna ze specyfikacją:
//   60 / 45 / 30 min  → tier 1 (łagodny)
//   20 / 15 / 10 min  → tier 2 (agresywny)
//    5 min            → tier 3 (pilny)
//    0 min / poniżej  → tier 4 („alarm bombowy", przekroczenie)

// Marki muszą być POSORTOWANE malejąco po `min` (markForRemaining polega na tym).
const SIREN_MARKS = [
  { min: 60, tier: 1 }, { min: 45, tier: 1 }, { min: 30, tier: 1 },
  { min: 20, tier: 2 }, { min: 15, tier: 2 }, { min: 10, tier: 2 },
  { min: 5, tier: 3 },
  { min: 0, tier: 4 },   // 0 min = limit osiągnięty/przekroczony → bomba
];

// Live „pozostało do limitu" (s) dla sygnału dźwiękowego, z ekstrapolacją od last_data_at.
// sig.value = headroom w chwili danych; maleje, gdy kierowca jedzie/pracuje (decays_with).
function remainingSecondsForSignal(sig, { mode, stale, lastDataMs, now }) {
  const decaying = !stale && lastDataMs && (
    sig.decays_with === 'work' ? (mode === 'drive' || mode === 'work') : mode === 'drive'
  );
  const elapsed = decaying ? Math.max(0, Math.round((now - lastDataMs) / 1000)) : 0;
  return sig.value - elapsed;
}

// Najpilniejszy mark przekroczony przez `remainingMin` (czyli najmniejszy `min` ≥ remainingMin).
// Zwraca null, gdy jeszcze za daleko (> 60 min) — sygnał do „re-arm" w hooku.
function markForRemaining(remainingMin) {
  let hit = null;
  for (const m of SIREN_MARKS) {        // malejąco → ostatni pasujący = najpilniejszy
    if (remainingMin <= m.min) hit = m;
  }
  return hit;
}

// Sygnał jest AKTYWNY, gdy bieżąca aktywność kierowcy może go dalej pogarszać:
// metryka 'drive' → tylko jazda; 'work' → jazda lub inna praca. Kierowca na odpoczynku
// nie ma już czego „interweniować" — np. przekroczone 9h jazdy dziennej i tak nie domknie
// się przed północą (histereza wymaga zapasu 1h), więc alarm wisiałby całą noc.
function isSignalActive(sig, mode) {
  return sig.decays_with === 'work' ? (mode === 'drive' || mode === 'work') : mode === 'drive';
}

function maxSirenTier(compliance, now, wantActive) {
  const c = compliance;
  if (!c || !c.current || c.status === 'no_data') return 0;
  const lastDataMs = c.last_data_at ? Date.parse(c.last_data_at) : null;
  let tier = 0;
  for (const sig of c.signals || []) {
    if (!sig.sound) continue;
    if (isSignalActive(sig, c.current.work_mode) !== wantActive) continue;
    const remMin = remainingSecondsForSignal(sig, {
      mode: c.current.work_mode, stale: c.stale, lastDataMs, now,
    }) / 60;
    const mark = markForRemaining(remMin);
    if (mark && mark.tier > tier) tier = mark.tier;
  }
  return tier;
}

// Bieżący tier syreny kierowcy (max po jego sygnałach dźwiękowych) wg LIVE „pozostało".
// 0 = brak (cisza/bez migania); 1–4 jak w SIREN_MARKS. TYLKO sygnały AKTYWNE (kierowca
// jedzie/pracuje) — to tier „interweniuj" do migania nazwiska w panelu.
function currentSirenTier(compliance, now) {
  return maxSirenTier(compliance, now, true);
}

// Tier „uśpiony": sygnały na marku, których bieżąca aktywność NIE pogarsza (np. odpoczynek
// po przekroczeniu 9h jazdy dziennej) — do statycznej etykiety zamiast całonocnego migania.
function latentSirenTier(compliance, now) {
  return maxSirenTier(compliance, now, false);
}

// Statyczna klasa dla uśpionych przekroczeń: tylko tier ≥3 (limit ≤5 min / przekroczony) —
// fakt dnia wart oznaczenia; niższe tiery na odpoczynku nic nie znaczą (licznik się zresetuje).
function latentNameClass(tier) {
  return tier >= 3 ? 'font-bold text-red-600 dark:text-red-400' : '';
}

// tier → klasa Tailwind dla migającego nazwiska (kolor+waga+tempo rosną z pilnością; 4 = bomba na czerwono).
function sirenNameClass(tier) {
  switch (tier) {
    case 1: return 'font-semibold text-amber-600 dark:text-amber-400 animate-sirenBlink1';
    case 2: return 'font-semibold text-orange-600 dark:text-orange-400 animate-sirenBlink2';
    case 3: return 'font-bold text-red-600 dark:text-red-400 animate-sirenBlink3';
    case 4: return 'font-bold text-white bg-red-600 px-1 rounded animate-sirenBlink4';
    default: return '';
  }
}

// Parametry tonu per tier (częstotliwość rośnie z pilnością; bomba = szybki sweep).
const TONE = {
  1: { freq: 523, beeps: 1, gap: 0.0, dur: 0.18, gain: 0.10, type: 'sine' },
  2: { freq: 698, beeps: 2, gap: 0.12, dur: 0.14, gain: 0.16, type: 'sine' },
  3: { freq: 880, beeps: 3, gap: 0.10, dur: 0.12, gain: 0.22, type: 'square' },
  4: { freq: 1046, beeps: 5, gap: 0.08, dur: 0.13, gain: 0.30, type: 'square', sweep: 1.7 },
};

// Odtwarza ton eskalacji `tier` na danym AudioContext. Czysty Web Audio (oscylator + obwiednia).
function playSiren(ctx, tier) {
  const spec = TONE[tier];
  if (!ctx || !spec || typeof ctx.createOscillator !== 'function') return;
  const t0 = ctx.currentTime;
  for (let i = 0; i < spec.beeps; i += 1) {
    const start = t0 + i * (spec.dur + spec.gap);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = spec.type;
    osc.frequency.setValueAtTime(spec.freq, start);
    if (spec.sweep) osc.frequency.linearRampToValueAtTime(spec.freq * spec.sweep, start + spec.dur);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(spec.gain, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + spec.dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + spec.dur + 0.03);
  }
}



const MODE_DRIVE = 'drive';
const MODE_REST = 'rest';
const MODE_FALLBACK_KEY = 'available';
const STATUS_NO_DATA = 'no_data';
const EM_DASH = '—';

const HERO_KIND_COUNTDOWN = 'countdown';
const HERO_KIND_REST = 'rest';
const HERO_REST_LABEL = 'ODPOCZYWASZ';
const HERO_REST_COUNTDOWN_LABEL = 'DO KOŃCA ODPOCZYNKU';
const COUNTDOWN_ETA_PREFIX = 'do ';
const COUNTDOWN_OVERDUE_ETA_PREFIX = 'termin minął o ';
const REST_ETA_PREFIX = 'możesz ruszyć o ';

const DAILY_REST_SIGNAL_CODE = 'daily_rest_overdue';
const HERO_SIGNAL_LABELS = {
  break_due: 'DO PRZERWY',
  work_break_due: 'DO PRZERWY',
  drive_near_limit: 'JAZDY DZIŚ',
  daily_rest_overdue: 'KONIEC ZMIANY',
};
const HERO_SIGNAL_LIMITS_S = {
  break_due: 4.5 * 3600,
  work_break_due: 6 * 3600,
  drive_near_limit: 9 * 3600,
  daily_rest_overdue: 24 * 3600,
};

const REST_TARGETS_S = [2700, 32400, 39600];

// Progi odpoczynku rysowane RAZEM na pierścieniu: przerwa dzielona 15/30/45, dobowy 9h/11h,
// tygodniowy 24h/45h. Skalą pierścienia jest ostatni próg kontekstu, nie bieżący cel — inaczej
// kierowca nie zobaczyłby, ile mu zostało do progu wyższego (np. z 9h do 11h).
const REST_LADDERS = [
  { key: 'break', marksS: [15 * 60, 30 * 60, 45 * 60] },
  { key: 'daily', marksS: [9 * 3600, 11 * 3600] },
  { key: 'weekly', marksS: [24 * 3600, 45 * 3600] },
];

const BAR_KEY_DAILY = 'daily';
const BAR_BREAK_LIMIT_S = 4.5 * 3600;
const BAR_DAILY_LIMIT_S = 9 * 3600;
const BAR_DAILY_EXTENDED_LIMIT_S = 10 * 3600;
const BAR_EXCEPTION_TIER = 1;
const BAR_WEEKLY_LIMIT_S = 56 * 3600;
const BAR_DEFS = [
  { key: 'break', label: 'Jazda ciągła', limitS: BAR_BREAK_LIMIT_S, muted: false, section: 'break', field: 'continuous_drive_s' },
  { key: BAR_KEY_DAILY, label: 'Jazda dziś', limitS: BAR_DAILY_LIMIT_S, muted: false, section: 'daily', field: 'drive_s' },
  { key: 'weekly', label: 'Jazda w tygodniu', limitS: BAR_WEEKLY_LIMIT_S, muted: true, section: 'weekly', field: 'drive_s' },
];

const EXT_DAILY_MAX_PER_WEEK = 2;
const BREAK_FULL_S = 45 * 60;
const BREAK_SPLIT_1_S = 15 * 60;
const BREAK_SPLIT_2_S = 30 * 60;

// Drabinki odpoczynku: próg MINIMALNY (poniżej niego postój nie liczy się wcale) i PEŁNY.
// Wybór kontekstu idzie z deklaracji kierowcy, a bez niej z długości trwania postoju.
const REST_COACH_GRACE_S = 5 * 60;
const REDUCED_DAILY_MAX = 3;

const COACH_BREAK = 'break';
const COACH_DAILY = 'daily';
const COACH_WEEKLY = 'weekly';

const COACH_PHASE_FIRST = 'first';
const COACH_PHASE_BANKED = 'banked';
const COACH_PHASE_SECOND = 'second';
const COACH_PHASE_DONE = 'done';

const COACH_CONTEXTS = {
  [COACH_BREAK]: {
    minS: 15 * 60,
    fullS: 45 * 60,
    secondS: 30 * 60,
    longFormat: false,
    milestoneLabel: 'przerwa dzielona — pierwsze 15 min',
    milestoneDoneWord: 'zaliczone',
    titleFull: 'ZOSTAŁO DO PEŁNEJ PRZERWY 45 MIN',
    titleSecond: 'ZOSTAŁO DO DRUGIEJ CZĘŚCI PRZERWY — 30 MIN',
    titleDone: 'PRZERWA',
    doneWord: 'zaliczona',
    textFirst: 'Ruszysz teraz — przerwa nie policzy się wcale. Musisz stać minimum 15 minut.',
    textBanked: 'Musisz jechać — jedź, 15 minut masz zaliczone. Ale zostanie Ci wtedy do zrobienia jeszcze 30 minut przerwy. Nie musisz — dokończ tę.',
    textSecond: '15 minut masz już zrobione. Ta przerwa musi trwać całe 30 minut — krótsza nic nie da.',
    textDone: 'Przerwa zaliczona. Znowu masz przed sobą 4 h 30 min jazdy.',
  },
  [COACH_DAILY]: {
    minS: 9 * 3600,
    fullS: 11 * 3600,
    secondS: null,
    longFormat: true,
    milestoneLabel: 'odpoczynek skrócony — 9 h',
    milestoneDoneWord: 'zaliczony',
    titleFull: 'ZOSTAŁO DO PEŁNEGO ODPOCZYNKU 11 H',
    titleSecond: null,
    titleDone: 'ODPOCZYNEK DOBOWY',
    doneWord: 'zaliczony',
    textFirst: 'Ruszysz teraz — odpoczynek nie policzy się wcale. Musisz stać minimum 9 godzin.',
    textBanked: 'Możesz ruszać — to będzie odpoczynek skrócony. Zużyjesz jeden z trzech, jakie masz do najbliższego odpoczynku tygodniowego.',
    textSecond: null,
    textDone: 'Pełny odpoczynek dobowy zaliczony. Nie zużyłeś żadnego skróconego.',
  },
  [COACH_WEEKLY]: {
    minS: 24 * 3600,
    fullS: 45 * 3600,
    secondS: null,
    longFormat: true,
    milestoneLabel: 'odpoczynek skrócony — 24 h',
    milestoneDoneWord: 'zaliczony',
    titleFull: 'ZOSTAŁO DO PEŁNEGO ODPOCZYNKU 45 H',
    titleSecond: null,
    titleDone: 'ODPOCZYNEK TYGODNIOWY',
    doneWord: 'zaliczony',
    textFirst: 'Ruszysz teraz — odpoczynek tygodniowy nie policzy się wcale. Musisz stać minimum 24 godziny.',
    textBanked: 'Możesz ruszać — to będzie odpoczynek skrócony. Brakujące godziny trzeba odebrać w ciągu 3 tygodni, doczepione do innego odpoczynku.',
    textSecond: null,
    textDone: 'Pełny odpoczynek tygodniowy zaliczony. Nic nie musisz odrabiać.',
  },
};

// Typ zadeklarowany przez kierowcę ma pierwszeństwo — wie lepiej niż my, po co stanął.
const COACH_BY_EVENT_PREFIX = [
  { prefix: 'break_', key: COACH_BREAK },
  { prefix: 'daily_rest_', key: COACH_DAILY },
  { prefix: 'weekly_rest_', key: COACH_WEEKLY },
];

const COACH_UNCONFIRMED_PREFIX = 'Tacho pokazuje jeszcze ';
const COACH_UNCONFIRMED_AGE_PREFIX = ' — dane sprzed ';
const COACH_AGE_JUST_NOW = 'chwili';
const COACH_AGE_ZERO = '0m';
const COACH_UNCONFIRMED_TAIL = '. Jeśli już przełączyłeś, licznik ruszył. Bez przełączenia tachografu przerwa się nie policzy.';
const COACH_EXTRA_CABIN = 'Pełnego odpoczynku tygodniowego nie wolno spędzać w kabinie.';
const COACH_EXTRA_MUST_BE_REGULAR = 'Ten odpoczynek musi być regularny (45 h) — skróconego już nie wolno wziąć.';
const COACH_EXTRA_REDUCED_PREFIX = 'Skrócone odpoczynki dobowe: wykorzystane ';
const COACH_EXTRA_REDUCED_INFIX = ' z ';
const COACH_STAY_UNTIL_PREFIX = 'Zostań do ';

// Sugestia z trasy: czy tę przerwę trzeba w ogóle robić. Bez prognozy milczymy — lepiej nic
// nie mówić niż kazać stać komuś, kto i tak dojedzie.
const ROUTE_PLAN_LEFT_PREFIX = 'Do przejechania dziś ';
const ROUTE_PLAN_LEFT_SUFFIX = ' jazdy';
const ROUTE_PLAN_PERIOD = '.';
const ROUTE_PLAN_ALLOWANCE_PREFIX = ', a bez przerwy pojedziesz jeszcze ';
const ROUTE_PLAN_NEEDED = '. Przerwę musisz zrobić.';
const ROUTE_PLAN_NOT_NEEDED = '. Tej przerwy nie musisz robić — dojedziesz.';
const ROUTE_PLAN_TOMORROW_PREFIX = 'Dziś do przejechania ';
const ROUTE_PLAN_TOMORROW_INFIX = ', reszta (';
const ROUTE_PLAN_TOMORROW_SUFFIX = ') zostaje na kolejne doby.';
const ROUTE_PLAN_NO_DRIVE_PREFIX = 'Dziś już nie ruszasz — całą trasę (';
const ROUTE_PLAN_NO_DRIVE_SUFFIX = ') masz na kolejne doby.';
const COACH_STAY_UNTIL_SUFFIX = ' i będzie pełny.';

const BREAK_PLAN_TEXT_FULL = 'Do zrobienia: przerwa 45 min';
const BREAK_PLAN_TEXT_SPLIT_REMAINDER = 'Przerwa 15 min zrobiona — zostało 30 min';

/**
 * @typedef {Object} DriverTachoHero
 * @property {'countdown'|'rest'} kind
 * @property {string|null} code
 * @property {string} label
 * @property {number} seconds
 * @property {string} text
 * @property {string|null} etaText
 * @property {boolean} overdue
 * @property {number} tier
 * @property {number} progress
 * @property {{startRatio: number, endRatio: number, filled: number, reached: boolean, markS: number}[]} segments
 */

/**
 * @typedef {Object} DriverTachoBar
 * @property {'break'|'daily'|'weekly'} key
 * @property {string} label
 * @property {number} valueS
 * @property {number} limitS
 * @property {number} ratio
 * @property {number} tier
 * @property {boolean} muted
 * @property {number|null} markS - próg regulaminowy w sekundach; null = komponent liczy własny próg
 * @property {number} tier - eskalacja koloru liczona od progu regulaminowego (markS), nie od limitu
 */

/**
 * @typedef {Object} DriverTachoBreakPlan
 * @property {number} requiredS
 * @property {string} text
 */

/**
 * @typedef {Object} DriverTachoView
 * @property {boolean} ready
 * @property {boolean} stale
 * @property {string|null} lastDataAgoText
 * @property {{key: string, label: string}|null} mode
 * @property {string|null} sinceText
 * @property {DriverTachoHero|null} hero
 * @property {DriverTachoBar[]} bars
 * @property {boolean} shiftStartMissing
 * @property {{label: string, endText: string, endMs: number}|null} declaredEvent
 * @property {DriverTachoBreakPlan|null} breakPlan
 * @property {Object|null} restCoach - asystent odpoczynku (przerwa/dobowy/tygodniowy)
 * @property {Object|null} routePlan - ile jazdy zostało po trasie i czy przerwa jest konieczna
 * @property {number} extensionsLeft - ile przedłużeń jazdy do 10h zostało w tym tygodniu
 * @property {boolean} weeklyRestMustBeRegular
 */

function emptyView() {
  return {
    ready: false,
    stale: false,
    lastDataAgoText: null,
    mode: null,
    sinceText: null,
    hero: null,
    bars: [],
    shiftStartMissing: false,
    declaredEvent: null,
    breakPlan: null,
    restCoach: null,
    routePlan: null,
    extensionsLeft: 0,
    weeklyRestMustBeRegular: false,
  };
}

function parseMs(value) {
  if (!value) return null;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? null : ms;
}

function textOrNull(value) {
  return value && value !== EM_DASH ? value : null;
}

function clamp01(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function tierForSeconds(seconds) {
  const mark = markForRemaining(seconds / 60);
  return mark ? mark.tier : 0;
}

function driveElapsedSeconds({ stale, lastDataMs, mode, nowMs }) {
  const decays = !stale && lastDataMs && mode === MODE_DRIVE;
  return decays ? Math.max(0, Math.round((nowMs - lastDataMs) / 1000)) : 0;
}

function restTargetSeconds(seconds) {
  const next = REST_TARGETS_S.find((target) => target > seconds);
  return next === undefined ? REST_TARGETS_S[REST_TARGETS_S.length - 1] : next;
}

function ladderForTarget(targetS) {
  const hit = REST_LADDERS.find((l) => targetS <= l.marksS[l.marksS.length - 1]);
  return hit || REST_LADDERS[REST_LADDERS.length - 1];
}

/**
 * Segmenty pierścienia dla drabinki progów: każdy próg to osobny łuk, który wypełnia się
 * po kolei i gaśnie (`reached`), gdy odpoczynek go przekroczy.
 *
 * @param {{marksS: number[]}} ladder
 * @param {number} elapsedS
 * @returns {{startRatio: number, endRatio: number, filled: number, reached: boolean, markS: number}[]}
 */
function buildRestSegments(ladder, elapsedS) {
  const scaleS = ladder.marksS[ladder.marksS.length - 1];
  let prevS = 0;
  return ladder.marksS.map((markS) => {
    const spanS = markS - prevS;
    const segment = {
      startRatio: prevS / scaleS,
      endRatio: markS / scaleS,
      filled: spanS > 0 ? clamp01((elapsedS - prevS) / spanS) : 0,
      reached: elapsedS >= markS,
      markS,
    };
    prevS = markS;
    return segment;
  });
}

function clockLabel(ms, nowMs) {
  const sameDay = warsawDayKey(ms) === warsawDayKey(nowMs);
  return sameDay ? fmtClock(ms) : fmtWeekdayClock(ms);
}

function etaLabel(etaMs, nowMs, prefix) {
  if (etaMs === null) return null;
  const sameDay = warsawDayKey(etaMs) === warsawDayKey(nowMs);
  const clock = textOrNull(sameDay ? fmtClock(etaMs) : fmtWeekdayClock(etaMs));
  return clock === null ? null : `${prefix}${clock}`;
}

function buildRestHero(current, event, nowMs) {
  const declaredS = Number(event?.duration_s);
  const declaredStartMs = parseMs(event?.occurred_at);
  const declared = declaredStartMs !== null && Number.isFinite(declaredS) && declaredS > 0;

  const startMs = declared ? declaredStartMs : parseMs(current.since);
  const seconds = startMs === null ? 0 : Math.max(0, Math.floor((nowMs - startMs) / 1000));
  const targetS = declared ? declaredS : restTargetSeconds(seconds);
  const fallbackEndMs = startMs === null ? null : startMs + targetS * 1000;
  const endMs = declared ? (parseMs(event.end_at) ?? fallbackEndMs) : fallbackEndMs;

  // Zadeklarowany typ = znany koniec, więc liczymy W DÓŁ („zostało 31 min"). Bez deklaracji
  // cel jest zgadywany z drabinki i odliczanie do niego kłamałoby — wtedy stoper w górę.
  const remainingS = endMs === null ? null : Math.floor((endMs - nowMs) / 1000);
  const countsDown = declared && remainingS !== null && remainingS > 0;

  const ladder = ladderForTarget(targetS);
  const scaleS = ladder.marksS[ladder.marksS.length - 1];

  return {
    kind: HERO_KIND_REST,
    code: null,
    label: countsDown ? HERO_REST_COUNTDOWN_LABEL : HERO_REST_LABEL,
    seconds: countsDown ? remainingS : seconds,
    text: fmtStopwatch(countsDown ? remainingS : seconds),
    etaText: etaLabel(endMs, nowMs, REST_ETA_PREFIX),
    overdue: false,
    tier: 0,
    progress: scaleS > 0 ? clamp01(seconds / scaleS) : 0,
    segments: buildRestSegments(ladder, seconds),
  };
}

function buildCountdownHero(compliance, signalCtx, nowMs) {
  const hasShiftStart = Boolean(compliance.daily?.shift_start);
  let best = null;
  for (const sig of compliance.signals || []) {
    const label = HERO_SIGNAL_LABELS[sig?.code];
    if (!label) continue;
    if (sig.code === DAILY_REST_SIGNAL_CODE && !hasShiftStart) continue;
    const seconds = remainingSecondsForSignal(sig, signalCtx);
    if (!Number.isFinite(seconds)) continue;
    if (best === null || seconds < best.seconds) best = { code: sig.code, label, seconds };
  }
  if (best === null) return null;
  const limitS = HERO_SIGNAL_LIMITS_S[best.code];
  const overdue = best.seconds < 0;
  const etaPrefix = overdue ? COUNTDOWN_OVERDUE_ETA_PREFIX : COUNTDOWN_ETA_PREFIX;
  return {
    kind: HERO_KIND_COUNTDOWN,
    code: best.code,
    label: best.label,
    seconds: best.seconds,
    text: fmtDur(Math.abs(best.seconds)),
    etaText: etaLabel(nowMs + best.seconds * 1000, nowMs, etaPrefix),
    overdue,
    tier: tierForSeconds(best.seconds),
    progress: limitS ? clamp01((limitS - best.seconds) / limitS) : 0,
    segments: [],
  };
}

function extensionsLeftFor(weekly) {
  const used = Number(weekly?.tens_used);
  if (!Number.isFinite(used)) return 0;
  return Math.max(0, EXT_DAILY_MAX_PER_WEEK - used);
}

function buildBreakPlan(breakSection) {
  return breakSection?.split_15_taken === true
    ? { requiredS: BREAK_SPLIT_2_S, text: BREAK_PLAN_TEXT_SPLIT_REMAINDER }
    : { requiredS: BREAK_FULL_S, text: BREAK_PLAN_TEXT_FULL };
}

/**
 * Czy dzisiejsza zmiana może jechać do 10h. Backend liczy `tens_used` WŁĄCZNIE z bieżącą,
 * trwającą zmianą — sam licznik puli nie wystarczy jako bramka, bo w chwili przekroczenia
 * 9h na drugim dozwolonym przedłużeniu skasowałby je sam sobie. Liczymy więc przedłużenia
 * SPRZED dzisiaj: gdy dziś już przekroczono 9h, jedno z `tens_used` należy do dzisiaj.
 *
 * @param {Object|null|undefined} dailySection
 * @param {Object|null|undefined} weekly
 * @returns {boolean}
 */
function dailyLimitExtended(dailySection, weekly) {
  const tensUsed = Number(weekly?.tens_used);
  if (!Number.isFinite(tensUsed)) return false;
  const driveS = Number(dailySection?.drive_s);
  const todayIsExtension = Number.isFinite(driveS) && driveS > BAR_DAILY_LIMIT_S;
  const tensBeforeToday = todayIsExtension ? tensUsed - 1 : tensUsed;
  return tensBeforeToday < EXT_DAILY_MAX_PER_WEEK;
}

/**
 * Kolor paska: eskalacja idzie do REALNEGO limitu, ale przekroczenie progu regulaminowego
 * (9h przy dostępnym przedłużeniu) nigdy nie jest zielone — kierowca ma widzieć, że zaczął
 * zużywać wyjątek. Czerwień zostaje zarezerwowana dla dobijania do prawdziwego sufitu.
 *
 * @param {number} valueS
 * @param {number} limitS
 * @param {number|null} markS
 * @returns {number}
 */
function barTier(valueS, limitS, markS) {
  const headroomTier = tierForSeconds(limitS - valueS);
  if (markS === null || valueS < markS) return headroomTier;
  return Math.max(BAR_EXCEPTION_TIER, headroomTier);
}

function buildBars(compliance, elapsedS, dailyExtended) {
  return BAR_DEFS.map((def) => {
    const base = Number(compliance[def.section]?.[def.field]);
    const valueS = (Number.isFinite(base) ? base : 0) + elapsedS;
    const isExtendedDaily = def.key === BAR_KEY_DAILY && dailyExtended;
    const limitS = isExtendedDaily ? BAR_DAILY_EXTENDED_LIMIT_S : def.limitS;
    const markS = isExtendedDaily ? BAR_DAILY_LIMIT_S : null;
    return {
      key: def.key,
      label: def.label,
      valueS,
      limitS,
      ratio: clamp01(valueS / limitS),
      tier: barTier(valueS, limitS, markS),
      muted: def.muted,
      markS,
    };
  });
}

/**
 * Kontekst odpoczynku: z deklaracji kierowcy, a bez niej z tego, jak długo już stoi.
 *
 * @param {Object|null|undefined} event
 * @param {number} elapsedS
 * @returns {string}
 */
function dataAgeText(lastDataAt, nowMs) {
  const ago = fmtAgo(lastDataAt, nowMs);
  if (!ago || ago === COACH_AGE_ZERO) return COACH_AGE_JUST_NOW;
  return ago;
}

function coachContextKey(event, elapsedS) {
  const type = event?.event_type;
  const declared = type && COACH_BY_EVENT_PREFIX.find((c) => String(type).startsWith(c.prefix));
  if (declared) return declared.key;
  if (elapsedS <= COACH_CONTEXTS[COACH_BREAK].fullS + REST_COACH_GRACE_S) return COACH_BREAK;
  if (elapsedS <= COACH_CONTEXTS[COACH_DAILY].fullS + REST_COACH_GRACE_S) return COACH_DAILY;
  return COACH_WEEKLY;
}

/**
 * Czy zaliczona piętnastka pochodzi z POPRZEDNIEGO postoju. Rozstrzyga porównanie jazdy
 * ciągłej w chwili uzbrojenia z bieżącą: jeśli od tamtej przerwy kierowca jechał, to była
 * inna przerwa. Bez tego pola spadamy na długość bieżącego postoju.
 *
 * @param {Object|null|undefined} breakSection
 * @param {number} elapsedS - jak długo trwa bieżący postój
 * @returns {boolean}
 */
function splitEarnedEarlier(breakSection, elapsedS) {
  if (breakSection?.split_15_taken !== true) return false;
  const armedAtS = Number(breakSection.split_15_drive_s);
  const drivenS = Number(breakSection.continuous_drive_s);
  if (Number.isFinite(armedAtS) && Number.isFinite(drivenS)) return armedAtS < drivenS;
  return elapsedS < BREAK_SPLIT_1_S;
}

function coachExtras(contextKey, phase, compliance) {
  const extras = [];
  if (contextKey === COACH_DAILY) {
    const used = Number(compliance.weekly?.reduced_rests);
    if (Number.isFinite(used)) {
      extras.push(`${COACH_EXTRA_REDUCED_PREFIX}${used}${COACH_EXTRA_REDUCED_INFIX}${REDUCED_DAILY_MAX}`);
    }
  }
  if (contextKey === COACH_WEEKLY) {
    if (compliance.weekly?.next_must_be_regular === true && phase !== COACH_PHASE_DONE) {
      extras.push(COACH_EXTRA_MUST_BE_REGULAR);
    }
    extras.push(COACH_EXTRA_CABIN);
  }
  return extras;
}

/**
 * Asystent odpoczynku — jedna liczba i jedno zdanie zamiast wykresu do interpretacji.
 * Wspólny wzór dla przerwy 45 min, odpoczynku dobowego i tygodniowego: poniżej progu
 * minimalnego postój nie liczy się wcale, między progiem a pełnym jest wersja skrócona,
 * a jej koszt (dług 30 min / zużyty skrócony / rekompensata) mówimy wprost.
 *
 * @param {Object} compliance
 * @param {Object} current - compliance.current
 * @param {Object|null|undefined} event - zadeklarowany typ odpoczynku
 * @param {number} nowMs
 * @returns {Object|null}
 */
function buildRestCoach(compliance, current, event, nowMs) {
  const declaredStartMs = parseMs(event?.occurred_at);
  const declaredEndMs = parseMs(event?.end_at);
  const hasDeclaration = declaredStartMs !== null && declaredEndMs !== null && declaredEndMs > nowMs;
  const isResting = current.work_mode === MODE_REST;

  // Deklaracja odpala licznik NATYCHMIAST, nie czeka na potwierdzenie z tachografu — dane
  // mają 1-3 min opóźnienia, a kierowca klika w tej samej sekundzie, w której przełącza.
  if (!isResting && !hasDeclaration) return null;

  const startMs = isResting ? parseMs(current.since) : declaredStartMs;
  if (startMs === null) return null;

  const elapsedS = Math.max(0, Math.floor((nowMs - startMs) / 1000));
  const contextKey = coachContextKey(event, elapsedS);
  const ctx = COACH_CONTEXTS[contextKey];

  // Druga część przerwy dzielonej — tylko gdy piętnastkę odrobił WCZEŚNIEJSZY postój.
  // Backend uzbraja flagę także trwającym postojem (≥15 min), a wtedy 30 minut w jednym
  // kawałku niczego nie domyka: albo pełne 45 teraz, albo 15 teraz + 30 na kolejnym stopie.
  const splitTaken = contextKey === COACH_BREAK && splitEarnedEarlier(compliance.break, elapsedS);
  const targetS = splitTaken ? ctx.secondS : ctx.fullS;
  if (elapsedS > targetS + REST_COACH_GRACE_S) return null;

  // Backend zeruje jazdę ciągłą dopiero, gdy przerwa się DOMKNĘŁA (45 albo 15+30) — to
  // jedyny pewny sygnał, że stój wystarczył. Bez tego domknięty split wyglądałby jak
  // niedokończone 45 minut.
  // Próg 30 min, nie 15: postój ≥30 min zeruje licznik WYŁĄCZNIE wtedy, gdy domknął split
  // (backend wymaga wcześniejszej piętnastki), więc zero + 30 min to pewny dowód domknięcia.
  const breakRegistered = contextKey === COACH_BREAK
    && Number(compliance.break?.continuous_drive_s) === 0
    && elapsedS >= BREAK_SPLIT_2_S;

  let phase = COACH_PHASE_FIRST;
  if (elapsedS >= targetS || breakRegistered) phase = COACH_PHASE_DONE;
  else if (splitTaken) phase = COACH_PHASE_SECOND;
  else if (elapsedS >= ctx.minS) phase = COACH_PHASE_BANKED;

  const doneAtMs = startMs + targetS * 1000;
  const doneAtText = clockLabel(doneAtMs, nowMs);
  const titleByPhase = {
    [COACH_PHASE_FIRST]: ctx.titleFull,
    [COACH_PHASE_BANKED]: ctx.titleFull,
    [COACH_PHASE_SECOND]: ctx.titleSecond,
    [COACH_PHASE_DONE]: ctx.titleDone,
  };
  const textByPhase = {
    [COACH_PHASE_FIRST]: ctx.textFirst,
    [COACH_PHASE_BANKED]: `${ctx.textBanked} ${COACH_STAY_UNTIL_PREFIX}${doneAtText}${COACH_STAY_UNTIL_SUFFIX}`,
    [COACH_PHASE_SECOND]: ctx.textSecond,
    [COACH_PHASE_DONE]: ctx.textDone,
  };
  const toneByPhase = {
    [COACH_PHASE_FIRST]: 'warn',
    [COACH_PHASE_BANKED]: 'info',
    [COACH_PHASE_SECOND]: 'warn',
    [COACH_PHASE_DONE]: 'ok',
  };

  const unconfirmed = !isResting;
  return {
    context: contextKey,
    phase,
    unconfirmed,
    unconfirmedText: unconfirmed
      ? `${COACH_UNCONFIRMED_PREFIX}${(MODE[current.work_mode] || MODE[MODE_FALLBACK_KEY]).label}`
        + `${COACH_UNCONFIRMED_AGE_PREFIX}${dataAgeText(compliance.last_data_at, nowMs)}`
        + `${COACH_UNCONFIRMED_TAIL}`
      : null,
    title: titleByPhase[phase],
    text: textByPhase[phase],
    tone: toneByPhase[phase],
    extras: coachExtras(contextKey, phase, compliance),
    longFormat: ctx.longFormat,
    doneWord: ctx.doneWord,
    remainingS: Math.max(0, targetS - elapsedS),
    targetS,
    progress: clamp01(elapsedS / targetS),
    startText: clockLabel(startMs, nowMs),
    startIsDeclared: unconfirmed,
    doneAtText,
    milestone: splitTaken ? null : {
      reached: elapsedS >= ctx.minS,
      remainingS: Math.max(0, ctx.minS - elapsedS),
      atText: clockLabel(startMs + ctx.minS * 1000, nowMs),
      ratio: ctx.minS / targetS,
      label: ctx.milestoneLabel,
      doneWord: ctx.milestoneDoneWord,
    },
  };
}

/**
 * Plan jazdy z trasy: ile zostało do przejechania i czy zapas do przerwy to pokryje.
 *
 * @param {Object|null|undefined} forecast - blok `forecast` z API (route_forecast)
 * @param {Object} compliance
 * @param {Object|null} coach - kontekst odpoczynku; na noclegu nie doradzamy o przerwie
 * @returns {{text: string, needed: boolean, tomorrowText: string|null}|null}
 */
function buildRoutePlan(forecast, compliance, coach) {
  if (!forecast) return null;
  const todayS = Number(forecast.drive_today_s) || 0;
  const extS = Number(forecast.drive_today_ext_s) || 0;
  const laterS = Number(forecast.drive_remaining_s) || 0;
  const totalS = todayS + extS + laterS;
  if (totalS <= 0) return null;

  const todayS2 = todayS + extS;
  const drivenS = Number(compliance.break?.continuous_drive_s) || 0;
  const allowanceS = Math.max(0, BAR_BREAK_LIMIT_S - drivenS);
  const tomorrowText = laterS > 0
    ? `${ROUTE_PLAN_TOMORROW_PREFIX}${fmtDur(todayS2)}`
      + `${ROUTE_PLAN_TOMORROW_INFIX}${fmtDur(laterS)}${ROUTE_PLAN_TOMORROW_SUFFIX}`
    : null;

  // Limit dobowy albo okna czasowe zamknęły dziś jazdę — przerwa nie jest tym, co blokuje.
  if (todayS2 <= 0) {
    return {
      needed: false,
      text: `${ROUTE_PLAN_NO_DRIVE_PREFIX}${fmtDur(totalS)}${ROUTE_PLAN_NO_DRIVE_SUFFIX}`,
      tomorrowText: null,
    };
  }

  // Na odpoczynku dobowym/tygodniowym werdykt o przerwie 45 min jest nie na miejscu —
  // kierowca śpi, a nie zastanawia się, czy dobić do czterdziestki piątki.
  const verdictPointless = coach !== null
    && (coach.context !== COACH_BREAK || coach.phase === COACH_PHASE_DONE);
  if (verdictPointless) {
    return {
      needed: false,
      text: `${ROUTE_PLAN_LEFT_PREFIX}${fmtDur(todayS2)}${ROUTE_PLAN_LEFT_SUFFIX}${ROUTE_PLAN_PERIOD}`,
      tomorrowText,
    };
  }

  // Porównujemy z jazdą ZAPLANOWANĄ NA DZIŚ, nie z całą trasą — trasa wielodobowa zawsze
  // przebiłaby 4 h 30 i sugestia zawsze mówiłaby „musisz".
  const needed = todayS2 > allowanceS;
  return {
    needed,
    text: `${ROUTE_PLAN_LEFT_PREFIX}${fmtDur(todayS2)}${ROUTE_PLAN_LEFT_SUFFIX}`
      + `${ROUTE_PLAN_ALLOWANCE_PREFIX}${fmtDur(allowanceS)}`
      + `${needed ? ROUTE_PLAN_NEEDED : ROUTE_PLAN_NOT_NEEDED}`,
    tomorrowText,
  };
}

function buildDeclaredEvent(event, nowMs) {
  const endMs = parseMs(event?.end_at);
  if (endMs === null) return null;
  const sameDay = warsawDayKey(endMs) === warsawDayKey(nowMs);
  // Deklarowany wyjazd z parkingu (B575) — null dla przerw i wpisów sprzed zmiany.
  const departureMs = parseMs(event?.departure_at);
  return {
    label: event.event_type_label || event.event_type || '',
    endText: sameDay ? fmtClock(endMs) : fmtWeekdayClock(endMs),
    endMs,
    departureMs,
    departureText: departureMs === null
      ? null
      : (warsawDayKey(departureMs) === warsawDayKey(nowMs)
        ? fmtClock(departureMs)
        : fmtWeekdayClock(departureMs)),
  };
}

/**
 * Viewmodel panelu tacho kierowcy — czysta funkcja, bez Date.now() i bez DOM.
 *
 * @param {Object|null|undefined} data - odpowiedź GET vehicles/vehicles/tacho/me/
 * @param {number} nowMs - bieżący znacznik czasu (ms epoch), wstrzykiwany z zewnątrz
 * @returns {DriverTachoView}
 */
function restFacts(data, nowMs) {
  const progress = data?.rest_progress;
  const type = String(data?.event?.event_type || progress?.event_type || '');
  const observedStartMs = parseMs(progress?.started_at || data?.compliance?.current?.since);
  const unresolvedLongRest = !type && observedStartMs !== null
    && nowMs - observedStartMs > (COACH_CONTEXTS[COACH_DAILY].fullS + REST_COACH_GRACE_S) * 1000;
  const weekly = type.startsWith('weekly_rest_') || unresolvedLongRest;
  const details = [];
  if (!progress) {
    if (weekly) details.push('TMS nie udostępnił rozliczenia ciągłego odpoczynku i rekompensaty. Godzina zakończenia wymaga potwierdzenia.');
    return { current: data?.compliance?.current, event: weekly ? null : data?.event, details, weekly, verified: false };
  }
  const startMs = parseMs(progress.started_at), endMs = parseMs(progress.end_at);
  if (startMs !== null) details.push(`${progress.start_confirmed ? 'Odpoczynek od' : 'Zapis odpoczynku od'} ${fmtWeekdayClock(startMs)}`);
  const base = Number(progress.base_duration_s), compensation = Number(progress.compensation_before_s);
  if (base > 0) details.push(`Podstawa: ${fmtDur(base)}${compensation > 0 ? ' + rekompensata ' + fmtDur(compensation) : ''}`);
  if (Number(progress.other_compensation_owed_s) > 0) details.push(`Inna rekompensata do rozliczenia: ${fmtDur(progress.other_compensation_owed_s)}`);
  if (progress.status !== 'confirmed') details.push(endMs !== null
    ? 'Dane odpoczynku lub historii wymagają weryfikacji. Podany koniec jest szacunkiem.'
    : 'Rozliczenie odpoczynku wymaga weryfikacji w TMS. Termin zakończenia nie został potwierdzony.');
  if (endMs !== null) details.push('Koniec tego odpoczynku nie potwierdza pozostałych limitów jazdy i pracy.');
  const current = startMs === null ? data?.compliance?.current : { ...data.compliance.current, since: progress.started_at };
  const event = endMs !== null && base > 0 ? { ...data?.event, occurred_at: progress.started_at, duration_s: progress.total_duration_s, end_at: progress.end_at } : null;
  return { current, event, details, weekly, verified: progress.status === 'confirmed', hasProgress: true };
}

function buildDriverTachoView(data, nowMs) {
  const view = emptyView();
  const compliance = data?.compliance;
  if (!compliance) return view;

  view.stale = Boolean(compliance.stale || data?.rest_progress?.stale);
  view.lastDataAgoText = fmtAgo(compliance.last_data_at, nowMs);
  // Fakt z historii tygodniowej — nie zależy od tego, czy mamy świeży stan z tachografu.
  view.weeklyRestMustBeRegular = compliance.weekly?.next_must_be_regular === true || data?.rest_progress?.regular_required === true;

  const current = compliance.current;
  if (!current || compliance.status === STATUS_NO_DATA) return view;

  const rest = current.work_mode === MODE_REST ? restFacts(data, nowMs) : null;
  view.restDetails = rest?.details || [];

  const modeKey = MODE[current.work_mode] ? current.work_mode : MODE_FALLBACK_KEY;
  view.ready = true;
  view.mode = { key: modeKey, label: MODE[modeKey].label };
  view.sinceText = textOrNull(rest?.hasProgress ? fmtWeekdayClock(rest.current?.since) : fmtClock(current.since));
  view.shiftStartMissing = !compliance.daily?.shift_start;
  view.declaredEvent = buildDeclaredEvent(rest ? rest.event : data?.event, nowMs);
  view.extensionsLeft = extensionsLeftFor(compliance.weekly);
  if (view.stale) return view;

  view.breakPlan = buildBreakPlan(compliance.break);
  view.restCoach = rest?.weekly ? null : buildRestCoach(compliance, rest?.current || current, rest ? rest.event : data?.event, nowMs);
  view.routePlan = buildRoutePlan(data?.forecast, compliance, view.restCoach);

  const lastDataMs = parseMs(compliance.last_data_at);
  const signalCtx = { mode: current.work_mode, stale: false, lastDataMs, now: nowMs };
  view.hero = current.work_mode === MODE_REST
    ? buildRestHero(rest?.current || current, rest ? rest.event : data?.event, nowMs)
    : buildCountdownHero(compliance, signalCtx, nowMs);
  if (rest?.hasProgress && view.hero) view.hero.etaText = etaLabel(parseMs(rest.event?.end_at), nowMs,
    rest.verified ? 'Koniec odpoczynku: ' : 'Szacowany koniec: ');
  if (rest?.weekly && view.hero && !rest.verified) {
    view.hero.etaText = rest.hasProgress && parseMs(rest.event?.end_at) !== null
      ? etaLabel(parseMs(rest.event.end_at), nowMs, 'Szacowany koniec: ')
      : 'Koniec odpoczynku wymaga potwierdzenia w TMS';
    view.hero.label = rest.hasProgress && rest.event ? 'Szacowany czas odpoczynku' : HERO_REST_LABEL;
  }
  view.bars = buildBars(compliance, driveElapsedSeconds({
    stale: false, lastDataMs, mode: current.work_mode, nowMs,
  }), dailyLimitExtended(compliance.daily, compliance.weekly));
  return view;
}




window.SuperSpedytorLiveTachoModel={build:buildDriverTachoView,formatDuration:fmtDur};
})();
