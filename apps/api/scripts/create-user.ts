/**
 * Створює (або оновлює) акаунт з email і паролем напряму в базі — для розробки й першого адміна.
 * Обходить мінімальну довжину пароля форми реєстрації, тому лише для локальної бази.
 *
 *   npx tsx --env-file-if-exists=.env scripts/create-user.ts --email me@x.dev --password secret --name Me --role admin
 */
import { createDb, newId } from "@musicdb/db";
import { accounts, users } from "@musicdb/db/schema";
import { hashPassword } from "better-auth/crypto";
import { and, eq } from "drizzle-orm";
import { loadEnv } from "../src/env";

function arg(name: string, fallback?: string) {
  const i = process.argv.indexOf(`--${name}`);
  const v = i >= 0 ? process.argv[i + 1] : undefined;
  if (v === undefined && fallback === undefined) throw new Error(`Потрібен параметр --${name}`);
  return v ?? fallback!;
}

const env = loadEnv();
if (env.isProd) throw new Error("Скрипт лише для локальної бази");
const email = arg("email").trim().toLowerCase();
const password = arg("password");
const name = arg("name", email.split("@")[0]);
const role = arg("role", "user");
const username = arg("username", "");

const { db, close } = createDb(env.DATABASE_URL);
try {
  const hash = await hashPassword(password);
  const [existing] = await db.select().from(users).where(eq(users.email, email));
  const userId = existing?.id ?? newId();
  if (existing) {
    await db
      .update(users)
      .set({ role, name, emailVerified: true, banned: false, ...(username ? { username } : {}) })
      .where(eq(users.id, userId));
  } else {
    await db.insert(users).values({
      id: userId,
      email,
      name,
      role,
      emailVerified: true,
      ...(username ? { username, displayUsername: username } : {}),
    });
  }
  const [cred] = await db
    .select()
    .from(accounts)
    .where(and(eq(accounts.userId, userId), eq(accounts.providerId, "credential")));
  if (cred) await db.update(accounts).set({ password: hash }).where(eq(accounts.id, cred.id));
  else
    await db.insert(accounts).values({
      id: newId(),
      accountId: userId,
      providerId: "credential",
      userId,
      password: hash,
    });
  console.log(`${existing ? "Оновлено" : "Створено"}: ${email} (${role})`);
} finally {
  await close();
}
