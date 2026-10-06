/**
 * Одноразове налаштування бота оплати преміуму: вебхук на сайт, команди й опис (укр/англ).
 *
 *   TELEGRAM_BOT_TOKEN=… TELEGRAM_WEBHOOK_SECRET=… pnpm --filter @musicdb/api telegram-setup [https://nowl.pp.ua]
 *
 * Ті самі TELEGRAM_* мають бути в змінних середовища сайту (Vercel), інакше вебхук відповідатиме 404/401.
 */
import { tg } from "../src/modules/premium/telegram";

const token = process.env.TELEGRAM_BOT_TOKEN;
const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
const site = (process.argv[2] ?? process.env.API_URL ?? "https://nowl.pp.ua").replace(/\/$/, "");
if (!token || !secret) throw new Error("Потрібні TELEGRAM_BOT_TOKEN і TELEGRAM_WEBHOOK_SECRET");

const me = await tg<{ username: string; first_name: string }>(token, "getMe", {});
console.log(`бот: @${me.username} (${me.first_name})`);

await tg(token, "setWebhook", {
  url: `${site}/v1/telegram/webhook`,
  secret_token: secret,
  allowed_updates: ["message", "pre_checkout_query"],
});

const commands = {
  uk: [
    { command: "start", description: "Оформити N'Owl Premium" },
    { command: "paysupport", description: "Питання щодо оплати" },
    { command: "terms", description: "Умови підписки" },
  ],
  en: [
    { command: "start", description: "Get N'Owl Premium" },
    { command: "paysupport", description: "Payment support" },
    { command: "terms", description: "Subscription terms" },
  ],
};
const description = {
  uk:
    "N'Owl — музичний каталог і плеєр. Тут оформлюється N'Owl Premium за Telegram Stars: офлайн-бібліотека " +
    `й завантаження плейлистів у застосунку. Почніть з кнопки «Оформити в Telegram» на ${site}/premium.`,
  en:
    "N'Owl is a music catalog and player. Get N'Owl Premium here with Telegram Stars: offline library and " +
    `playlist downloads in the app. Start with “Subscribe in Telegram” at ${site}/premium.`,
};
const short = { uk: "Оплата N'Owl Premium за Telegram Stars", en: "N'Owl Premium with Telegram Stars" };

for (const lang of ["uk", "en"] as const) {
  // англійська — за замовчуванням (порожній language_code), українська — для українського інтерфейсу Telegram
  const code = lang === "en" ? {} : { language_code: lang };
  await tg(token, "setMyCommands", { commands: commands[lang], ...code });
  await tg(token, "setMyDescription", { description: description[lang], ...code });
  await tg(token, "setMyShortDescription", { short_description: short[lang], ...code });
}

const info = await tg<{ url: string; pending_update_count: number; last_error_message?: string }>(
  token,
  "getWebhookInfo",
  {},
);
console.log(
  `вебхук: ${info.url} | у черзі: ${info.pending_update_count}${info.last_error_message ? ` | остання помилка: ${info.last_error_message}` : ""}`,
);
console.log(`посилання на бота: https://t.me/${me.username}`);
