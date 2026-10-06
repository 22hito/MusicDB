/**
 * API всередині сайту на Vercel (EMBEDDED_API=1): усі /v1/* обробляє той самий застосунок Hono,
 * що й окремий сервер. Локально й у Docker /v1 проксується на окремий API (next.config → rewrites).
 */
import { drainJobs, handleApiRequest } from "@musicdb/api/vercel";
import { after } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function handler(req: Request) {
  if (!process.env.EMBEDDED_API) return new Response("Not found", { status: 404 });
  const res = await handleApiRequest(req);
  // Фонові задачі (обробка аудіо, сповіщення) — після відповіді, щоб не затримувати клієнта.
  if (req.method !== "GET") after(drainJobs);
  return res;
}

export {
  handler as DELETE,
  handler as GET,
  handler as HEAD,
  handler as OPTIONS,
  handler as PATCH,
  handler as POST,
  handler as PUT,
};
