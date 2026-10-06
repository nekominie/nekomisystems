import { ref, watch } from 'vue';

const TIME_KEY = 'the_dropper_sandbox_time_v1';
const DEFAULT_HOUR = 13;

/** In auto-play mode a whole day lasts 24 / DAY_HOURS_PER_SECOND seconds (96 s) */
export const DAY_HOURS_PER_SECOND = 0.25;

function loadStoredHour(): number {
  try {
    const raw = localStorage.getItem(TIME_KEY);
    if (raw !== null) {
      const n = Number(raw);
      if (Number.isFinite(n)) return ((n % 24) + 24) % 24;
    }
  } catch {}
  return DEFAULT_HOUR;
}

/** Hour of the day shown by the sandbox, 0-24 (13.5 = 13:30). Remembered between sessions. */
export const timeOfDay = ref<number>(loadStoredHour());

/** When true the sandbox advances the clock by itself (day/night cycle) */
export const timeAutoPlay = ref<boolean>(false);

// Throttled persistence (the value changes every frame while auto-playing)
let saveTimer: ReturnType<typeof setTimeout> | null = null;
watch(timeOfDay, (hour) => {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(TIME_KEY, String(Math.round(hour * 100) / 100));
    } catch {}
  }, 500);
});

export function formatTime(hour: number): string {
  const h = ((hour % 24) + 24) % 24;
  let hh = Math.floor(h);
  let mm = Math.round((h - hh) * 60);
  if (mm === 60) {
    mm = 0;
    hh = (hh + 1) % 24;
  }
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}
