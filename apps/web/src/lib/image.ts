/** Картинка потрібного розміру: Deezer CDN віддає будь-який квадрат (56, 250, 500, 1000…). */
export function sized(url: string | null | undefined, px: number): string | null {
  if (!url) return null;
  if (url.includes("dzcdn.net")) {
    const size = px <= 64 ? 56 : px <= 140 ? 120 : px <= 260 ? 250 : px <= 520 ? 500 : 1000;
    return url.replace(/\/\d+x\d+-/, `/${size}x${size}-`);
  }
  if (url.includes("googleusercontent.com"))
    return url.replace(/=s\d+(-c)?$/, `=s${Math.min(px * 2, 512)}-c`);
  return url;
}
