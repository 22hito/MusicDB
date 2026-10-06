/**
 * Автентифікація (better-auth): сесії в Postgres, Google, email+пароль, мобільний застосунок (Expo).
 * Сесія = пристрій; «Мої пристрої» й вихід на іншому пристрої — це список сесій.
 */
import { expo } from "@better-auth/expo";
import { accounts, type Database, newId, sessions, users, verifications } from "@musicdb/db";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin, bearer } from "better-auth/plugins";
import type { Env } from "./env";

export function createAuth(env: Env, db: Database) {
  const socialProviders =
    env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
      ? {
          google: {
            clientId: env.GOOGLE_CLIENT_ID,
            clientSecret: env.GOOGLE_CLIENT_SECRET,
            prompt: "select_account" as const,
          },
        }
      : {};

  return betterAuth({
    appName: "N'Owl",
    baseURL: env.API_URL,
    basePath: "/v1/auth",
    secret: env.AUTH_SECRET,
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: { user: users, session: sessions, account: accounts, verification: verifications },
    }),
    trustedOrigins: [...env.webOrigins, `${env.MOBILE_SCHEME}://`, "exp://"],
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      requireEmailVerification: false,
    },
    socialProviders,
    account: {
      // Старі акаунти переносяться з email без прив'язки до Google: перший вхід через Google зв'яже їх за email.
      accountLinking: { enabled: true, trustedProviders: ["google"] },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 60,
      updateAge: 60 * 60 * 24,
      // Без кешу сесії в cookie: блокування й відкликання пристрою діють миттєво.
      cookieCache: { enabled: false },
    },
    user: {
      deleteUser: { enabled: false },
    },
    advanced: {
      cookiePrefix: "nowl",
      useSecureCookies: env.isProd,
      database: { generateId: () => newId() },
    },
    rateLimit: { enabled: env.isProd, window: 60, max: 30 },
    plugins: [admin({ defaultRole: "user", adminRoles: ["admin"] }), bearer(), expo()],
    databaseHooks: {
      user: {
        create: {
          before: async (user) =>
            env.adminEmails.has(user.email.toLowerCase())
              ? { data: { ...user, role: "admin" } }
              : { data: user },
        },
      },
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;
