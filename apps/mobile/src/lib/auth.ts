import { expoClient } from "@better-auth/expo/client";
import { createAuthClient } from "better-auth/react";
import * as SecureStore from "expo-secure-store";
import { API_URL } from "./config";

/** Вхід у застосунку: cookie сесії зберігається в SecureStore, Google — через системний браузер і nowl://. */
export const authClient = createAuthClient({
  baseURL: API_URL,
  basePath: "/v1/auth",
  plugins: [expoClient({ scheme: "nowl", storagePrefix: "nowl", storage: SecureStore })],
});

export async function sessionCookie(): Promise<string> {
  return (await authClient.getCookie()) ?? "";
}
