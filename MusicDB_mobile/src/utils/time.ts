// Час з API приходить у UTC рядком "yyyy-MM-dd HH:mm" (або ISO) — показуємо його
// в часовому поясі телефона: "щойно", "12 хв тому", "14:05", "вчора, 14:05", "28 вер, 14:05".
import type { Lang } from '@/constants/i18n';

const MONTHS: Record<Lang, string[]> = {
  uk: ['січ', 'лют', 'бер', 'кві', 'тра', 'чер', 'лип', 'сер', 'вер', 'жов', 'лис', 'гру'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
};
const WORDS: Record<Lang, { now: string; min: string; yesterday: string }> = {
  uk: { now: 'щойно', min: 'хв тому', yesterday: 'вчора' },
  en: { now: 'just now', min: 'min ago', yesterday: 'yesterday' },
};

// "2026-10-01 06:42" без позначки поясу — це UTC; ISO з "Z"/зсувом читаємо як є.
export function parseUtc(stamp: string | null | undefined): Date | null {
  if (!stamp) return null;
  const s = stamp.trim();
  const iso = /[zZ]|[+-]\d\d:?\d\d$/.test(s) ? s : `${s.replace(' ', 'T')}Z`;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

const pad = (n: number) => String(n).padStart(2, '0');
const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export function formatStamp(stamp: string | null | undefined, lang: Lang, now = new Date()): string {
  const d = parseUtc(stamp);
  if (!d) return stamp ?? '';
  const w = WORDS[lang];
  const diffMin = Math.floor((now.getTime() - d.getTime()) / 60000);
  if (diffMin >= 0 && diffMin < 1) return w.now;
  if (diffMin >= 0 && diffMin < 60) return `${diffMin} ${w.min}`;
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  if (sameDay(d, now)) return time;
  const y = new Date(now);
  y.setDate(now.getDate() - 1);
  if (sameDay(d, y)) return `${w.yesterday}, ${time}`;
  const date = lang === 'en' ? `${MONTHS.en[d.getMonth()]} ${d.getDate()}` : `${d.getDate()} ${MONTHS.uk[d.getMonth()]}`;
  return d.getFullYear() === now.getFullYear() ? `${date}, ${time}` : `${date} ${d.getFullYear()}`;
}

// Повна дата й час (для довгого натискання / підказки): "01.10.2026, 09:42".
export function formatFull(stamp: string | null | undefined): string {
  const d = parseUtc(stamp);
  if (!d) return stamp ?? '';
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Групи для довгих списків (історія): сьогодні / вчора / цього тижня / місяць рік.
export function dayGroup(date: Date, lang: Lang, now = new Date()): string {
  const words = lang === 'en' ? { today: 'Today', yesterday: 'Yesterday', week: 'This week' } : { today: 'Сьогодні', yesterday: 'Вчора', week: 'Цього тижня' };
  if (sameDay(date, now)) return words.today;
  const y = new Date(now);
  y.setDate(now.getDate() - 1);
  if (sameDay(date, y)) return words.yesterday;
  const days = (now.getTime() - date.getTime()) / 86400000;
  if (days < 7) return words.week;
  const full = lang === 'en'
    ? ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
    : ['Січень', 'Лютий', 'Березень', 'Квітень', 'Травень', 'Червень', 'Липень', 'Серпень', 'Вересень', 'Жовтень', 'Листопад', 'Грудень'];
  return `${full[date.getMonth()]} ${date.getFullYear()}`;
}
