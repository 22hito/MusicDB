import Constants from "expo-constants";

/**
 * Адреса API: EXPO_PUBLIC_API_URL або (у розробці) IP комп'ютера, з якого Expo віддає бандл, порт 8787.
 */
function devHost() {
  const hostUri = Constants.expoConfig?.hostUri ?? "";
  const host = hostUri.split(":")[0];
  return host ? `http://${host}:8787` : "http://localhost:8787";
}

export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? devHost()).replace(/\/$/, "");
export const REALTIME_URL = `${API_URL.replace(/^http/, "ws")}/v1/realtime`;
export const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL ?? API_URL.replace(":8787", ":3000");

/** play — збірка для Google Play (без посилань на оплату), direct — APK для прямого завантаження. */
export const DISTRIBUTION: "play" | "direct" =
  process.env.EXPO_PUBLIC_DISTRIBUTION === "direct" ? "direct" : "play";
