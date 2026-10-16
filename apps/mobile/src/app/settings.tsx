import {
  type CosmeticMedia,
  type CosmeticPreset,
  type CosmeticSlot,
  endpoints,
} from "@musicdb/contracts/client";
import type { Locale } from "@musicdb/i18n";
import { invalidate, useApi, useEndpoint, useMe } from "@musicdb/sdk/react";
import { type AccentName, accentNames, FEATURES, palette } from "@musicdb/tokens";
import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { Check, ChevronLeft, Trash2 } from "lucide-react-native";
import { type ReactNode, useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Switch, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CosmeticLayer, PRESETS, ScreenBackground } from "@/components/cosmetics";
import { Button, Chip, IconButton, Text } from "@/components/ui";
import { authClient } from "@/lib/auth";
import { DISTRIBUTION, WEB_URL } from "@/lib/config";
import { type ThemeSetting, usePrefs } from "@/lib/theme";
import { playerStore, usePlayer } from "@/player/store";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ marginTop: 28, gap: 14 }}>
      <Text variant="title">{title}</Text>
      {children}
    </View>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.row}>
      <Text style={{ flex: 1 }}>{label}</Text>
      {children}
    </View>
  );
}

export default function SettingsScreen() {
  const prefs = usePrefs();
  const { t, colors: c } = prefs;
  const insets = useSafeAreaInsets();
  const api = useApi();
  const qc = useQueryClient();
  const me = useMe().data;
  const autoplay = usePlayer((s) => s.autoplay);
  const normalize = usePlayer((s) => s.normalize);

  const signOut = () =>
    Alert.alert(t("confirm.signOut"), undefined, [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.signOut"),
        style: "destructive",
        onPress: async () => {
          await authClient.signOut();
          qc.clear();
          router.replace("/");
        },
      },
    ]);
  const deleteAccount = () =>
    Alert.alert(t("settings.deleteAccount"), t("settings.deleteAccountText"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"),
        style: "destructive",
        onPress: async () => {
          await api.me.delete({ body: { confirm: "DELETE" } });
          await authClient.signOut().catch(() => {});
          qc.clear();
          router.replace("/");
        },
      },
    ]);

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top + 4 }}>
      <ScreenBackground />
      <View style={styles.header}>
        <IconButton label={t("common.back")} onPress={() => router.back()}>
          <ChevronLeft size={26} color={c.text} />
        </IconButton>
        <Text variant="heading">{t("settings.title")}</Text>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 40 }}>
        <Section title={t("settings.appearance")}>
          <View style={{ gap: 10 }}>
            <Text>{t("settings.theme")}</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {(["dark", "gray", "light", "system"] as ThemeSetting[]).map((th) => (
                <Chip
                  key={th}
                  label={t(`settings.theme${th[0]!.toUpperCase()}${th.slice(1)}` as "settings.themeDark")}
                  active={prefs.theme === th}
                  onPress={() => prefs.setPrefs({ theme: th })}
                />
              ))}
            </View>
          </View>
          <View style={{ gap: 10 }}>
            <Text>{t("settings.motion")}</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {(["full", "reduced", "system"] as const).map((m) => (
                <Chip
                  key={m}
                  label={t(`settings.motion${m[0]!.toUpperCase()}${m.slice(1)}` as "settings.motionFull")}
                  active={prefs.motion === m}
                  onPress={() => prefs.setPrefs({ motion: m })}
                />
              ))}
            </View>
            <Text variant="caption" muted>
              {t("settings.motionHint")}
            </Text>
          </View>
          <Row label={t("settings.accent")}>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {accentNames.map((a: AccentName) => (
                <Pressable
                  key={a}
                  accessibilityLabel={t(`settings.accents.${a}`)}
                  onPress={() => prefs.setPrefs({ accent: a })}
                  style={[styles.swatch, { backgroundColor: palette("dark", a).accent }]}
                >
                  {prefs.accent === a ? <Check size={14} color="#1a1208" /> : null}
                </Pressable>
              ))}
            </View>
          </Row>
          <Row label={t("settings.language")}>
            <View style={{ flexDirection: "row", gap: 6 }}>
              {(["uk", "en"] as Locale[]).map((l) => (
                <Chip
                  key={l}
                  label={l === "uk" ? "Українська" : "English"}
                  active={prefs.locale === l}
                  onPress={() => {
                    prefs.setPrefs({ locale: l });
                    if (me)
                      void api.me
                        .update({ body: { locale: l } })
                        .then(() => invalidate(qc, endpoints.discover.home));
                  }}
                />
              ))}
            </View>
          </Row>
        </Section>
        <Section title={t("settings.playback")}>
          <Row label={t("settings.autoplay")}>
            <Switch
              value={autoplay}
              onValueChange={(v) => playerStore.getState().setAutoplay(v)}
              trackColor={{ true: c.accent }}
            />
          </Row>
          <Row label={t("settings.normalize")}>
            <Switch
              value={normalize}
              onValueChange={(v) => playerStore.getState().setNormalize(v)}
              trackColor={{ true: c.accent }}
            />
          </Row>
        </Section>
        {me ? (
          <>
            <Section title={t("settings.privacy")}>
              <Row label={t("settings.privateProfile")}>
                <Switch
                  value={me.isPrivate}
                  onValueChange={async (v) => {
                    await api.me.update({ body: { isPrivate: v } });
                    await invalidate(qc, endpoints.me.get);
                  }}
                  trackColor={{ true: c.accent }}
                />
              </Row>
            </Section>
            {FEATURES.premium || me.role === "admin" ? (
              <Section title={t("nav.premium")}>
                <PremiumStatus />
              </Section>
            ) : null}
            {me.premium.active ? (
              <Section title={t("cosmetics.title")}>
                <CosmeticsSettings />
              </Section>
            ) : null}
            <Section title={t("settings.account")}>
              <Text muted>{me.email}</Text>
              <Button title={t("common.signOut")} variant="outline" onPress={signOut} />
              <Button title={t("settings.deleteAccount")} variant="danger" onPress={deleteAccount} />
            </Section>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 6 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 40 },
  swatch: { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  preset: { width: 44, height: 30, borderRadius: 8, overflow: "hidden", borderWidth: 2 },
});

/**
 * Статус преміуму. Play-збірка (шлях Б): без покупок у застосунку й без посилання на оплату — лише текст.
 * Пряма APK-збірка може відкрити сторінку преміуму на сайті.
 */
function PremiumStatus() {
  const { t, locale } = usePrefs();
  const sub = useEndpoint(endpoints.premium.subscription);
  if (sub.data?.active && sub.data.until) {
    const date = new Date(sub.data.until).toLocaleDateString(locale === "uk" ? "uk-UA" : "en-US", {
      day: "numeric",
      month: "long",
    });
    return (
      <Text accent>
        {sub.data.cancelAtPeriodEnd ? t("premium.canceled", { date }) : t("premium.active", { date })}
      </Text>
    );
  }
  if (DISTRIBUTION === "direct") {
    return (
      <Button
        title={t("nav.premium")}
        variant="accent"
        onPress={() => WebBrowser.openBrowserAsync(`${WEB_URL}/premium`)}
      />
    );
  }
  return <Text muted>{t("premium.onWebsite")}</Text>;
}

const COSMETIC_SLOTS: { slot: CosmeticSlot; w: number; h: number; round?: boolean }[] = [
  { slot: "avatar", w: 56, h: 56, round: true },
  { slot: "banner", w: 120, h: 40 },
  { slot: "background", w: 72, h: 48 },
  { slot: "siteBackground", w: 36, h: 64 },
];

/**
 * Оформлення профілю (Premium). Тут — готові фони й «прибрати»; свій GIF чи відео завантажується на сайті
 * (у застосунку немає вибору файлів без нативного модуля). Посилання на оплату тут немає — лише для власників Premium.
 */
function CosmeticsSettings() {
  const prefs = usePrefs();
  const { t, colors: c } = prefs;
  const api = useApi();
  const qc = useQueryClient();
  const me = useMe().data;
  const [busy, setBusy] = useState<CosmeticSlot | null>(null);
  const processing = me ? Object.values(me.cosmetics).some((m) => m?.status === "processing") : false;

  useEffect(() => {
    if (!processing) return;
    const timer = setInterval(() => void invalidate(qc, endpoints.me.get), 2500);
    return () => clearInterval(timer);
  }, [processing, qc]);

  if (!me) return null;
  const apply = async (slot: CosmeticSlot, preset: CosmeticPreset | null) => {
    setBusy(slot);
    try {
      await api.me.setCosmetic({ body: { slot, preset, ...(preset ? {} : { uploadId: null }) } });
      await invalidate(qc, endpoints.me.get, endpoints.users.get);
    } catch {
      Alert.alert(t("errors.generic"));
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={{ gap: 18 }}>
      {COSMETIC_SLOTS.map(({ slot, w, h, round }) => {
        const media = me.cosmetics[slot] as CosmeticMedia | null;
        const working = busy === slot || media?.status === "processing";
        return (
          <View key={slot} style={{ gap: 8 }}>
            <View style={styles.row}>
              <View
                style={{
                  width: w,
                  height: h,
                  borderRadius: round ? w / 2 : 8,
                  overflow: "hidden",
                  backgroundColor: c.surface2,
                }}
              >
                {media && (media.preset || media.poster) ? <CosmeticLayer media={media} /> : null}
              </View>
              <View style={{ flex: 1 }}>
                <Text>{t(`cosmetics.${slot}`)}</Text>
                <Text variant="caption" muted>
                  {media?.status === "failed"
                    ? t("cosmetics.failed")
                    : working
                      ? t("cosmetics.processing")
                      : t(`cosmetics.${slot}Hint`)}
                </Text>
              </View>
              {media ? (
                <IconButton label={t("cosmetics.remove")} onPress={() => !working && void apply(slot, null)}>
                  <Trash2 size={20} color={c.textMuted} />
                </IconButton>
              ) : null}
            </View>
            {slot !== "avatar" ? (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {(Object.keys(PRESETS) as CosmeticPreset[]).map((p) => (
                  <Pressable
                    key={p}
                    accessibilityLabel={t(`cosmetics.presetNames.${p}`)}
                    accessibilityState={{ selected: media?.preset === p }}
                    disabled={working}
                    onPress={() => void apply(slot, p)}
                    style={[styles.preset, { borderColor: media?.preset === p ? c.accent : "transparent" }]}
                  >
                    <View style={[StyleSheet.absoluteFill, { backgroundColor: PRESETS[p].base }]} />
                    <View
                      style={[
                        StyleSheet.absoluteFill,
                        { backgroundColor: PRESETS[p].colors[0], opacity: 0.6 },
                      ]}
                    />
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>
        );
      })}
      <Text variant="caption" muted>
        {t("cosmetics.uploadOnWebsite")}
      </Text>
      <View style={{ gap: 10 }}>
        <Text>{t("cosmetics.motion")}</Text>
        <View style={{ flexDirection: "row", gap: 6 }}>
          {(["auto", "static"] as const).map((m) => (
            <Chip
              key={m}
              label={t(m === "auto" ? "cosmetics.motionAuto" : "cosmetics.motionStatic")}
              active={prefs.bgMotion === m}
              onPress={() => prefs.setPrefs({ bgMotion: m })}
            />
          ))}
        </View>
      </View>
    </View>
  );
}
