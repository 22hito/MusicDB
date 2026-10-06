/**
 * Редагування пісні адміном (як на сайті): назва, виконавці, реліз, дата, тривалість, жанри, explicit,
 * YouTube, текст і LRC, статус, джерело. Надсилаються лише змінені поля.
 */
import { type AdminTrackDetail, endpoints } from "@musicdb/contracts/client";
import { invalidate, useApi } from "@musicdb/sdk/react";
import { useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { AlertTriangle, BadgeCheck, CheckCircle2, RotateCcw, Trash2, X } from "lucide-react-native";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Switch, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, IconButton, Segmented, Text } from "@/components/ui";
import { fonts, useColors, useT } from "@/lib/theme";

type Form = {
  title: string;
  artists: string;
  releaseTitle: string;
  releaseDate: string;
  duration: string;
  explicit: boolean;
  youtube: string;
  genres: string;
  lyrics: string;
  lyricsSynced: string;
  status: "published" | "hidden";
  source: "catalog" | "community";
};

const fmtDuration = (ms: number) =>
  ms > 0 ? `${Math.floor(ms / 60000)}:${String(Math.round((ms % 60000) / 1000)).padStart(2, "0")}` : "";

function parseDuration(v: string): number | null {
  const s = v.trim();
  if (!s) return 0;
  const m = s.match(/^(\d{1,3}):([0-5]?\d)$/);
  if (m) return (Number(m[1]) * 60 + Number(m[2])) * 1000;
  return /^\d{1,5}$/.test(s) ? Number(s) * 1000 : null;
}

function youtubeId(v: string): string | null {
  const s = v.trim();
  if (!s) return null;
  if (/^[\w-]{11}$/.test(s)) return s;
  const m = s.match(/(?:v=|youtu\.be\/|shorts\/|embed\/|live\/)([\w-]{11})/);
  return m ? m[1]! : null;
}

const list = (v: string, lower = false) =>
  v
    .split(",")
    .map((x) => (lower ? x.trim().toLowerCase() : x.trim()))
    .filter(Boolean);

function toForm(d: AdminTrackDetail): Form {
  return {
    title: d.title,
    artists: d.artists.join(", "),
    releaseTitle: d.releaseTitle ?? "",
    releaseDate: d.releaseDate ?? "",
    duration: fmtDuration(d.durationMs),
    explicit: d.explicit,
    youtube: d.youtubeVideoId ?? "",
    genres: d.genres.join(", "),
    lyrics: d.lyrics ?? "",
    lyricsSynced: d.lyricsSynced ?? "",
    status: d.status === "hidden" ? "hidden" : "published",
    source: d.source,
  };
}

export default function AdminTrackScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const t = useT();
  const c = useColors();
  const api = useApi();
  const qc = useQueryClient();
  const insets = useSafeAreaInsets();
  const [initial, setInitial] = useState<AdminTrackDetail | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.admin
      .track({ params: { id } })
      .then((d) => {
        setInitial(d);
        setForm(toForm(d));
      })
      .catch(() => {
        Alert.alert(t("errors.generic"));
        router.back();
      });
  }, [api, id, t]);

  const base = useMemo(() => (initial ? toForm(initial) : null), [initial]);
  const durationMs = form ? parseDuration(form.duration) : 0;
  const ytId = form ? youtubeId(form.youtube) : null;
  const ytInvalid = !!form?.youtube.trim() && !ytId;

  const patch = useMemo(() => {
    const p: Record<string, unknown> = {};
    if (!form || !base) return p;
    if (form.title.trim() !== base.title) p.title = form.title.trim();
    if (list(form.artists).join("|") !== list(base.artists).join("|")) p.artists = list(form.artists);
    if (form.releaseTitle.trim() !== base.releaseTitle) p.releaseTitle = form.releaseTitle.trim();
    if (form.releaseDate.trim() !== base.releaseDate) p.releaseDate = form.releaseDate.trim() || null;
    if (form.duration.trim() !== base.duration && durationMs !== null) p.durationMs = durationMs;
    if (form.explicit !== base.explicit) p.explicit = form.explicit;
    if ((ytId ?? "") !== base.youtube && !ytInvalid) p.youtubeUrl = ytId ?? "";
    if (list(form.genres, true).join("|") !== list(base.genres, true).join("|"))
      p.genres = list(form.genres, true).slice(0, 5);
    if (form.lyrics !== base.lyrics) p.lyrics = form.lyrics;
    if (form.lyricsSynced !== base.lyricsSynced) p.lyricsSynced = form.lyricsSynced.trim() || null;
    if (form.status !== base.status) p.status = form.status;
    if (form.source !== base.source) p.source = form.source;
    return p;
  }, [form, base, durationMs, ytId, ytInvalid]);
  const dirty = Object.keys(patch).length > 0;
  const dateOk = !form?.releaseDate.trim() || /^\d{4}-\d{2}-\d{2}$/.test(form.releaseDate.trim());
  const valid =
    !!form?.title.trim() &&
    list(form?.artists ?? "").length > 0 &&
    durationMs !== null &&
    !ytInvalid &&
    dateOk;

  const save = async () => {
    if (!valid || !dirty || busy) return;
    setBusy(true);
    try {
      const d = await api.admin.updateTrack({ params: { id }, body: patch });
      setInitial(d);
      setForm(toForm(d));
      await invalidate(qc, endpoints.tracks.get, endpoints.tracks.lyrics);
      Alert.alert(t("admin.saved"));
    } catch (err) {
      Alert.alert(err instanceof Error ? err.message : t("errors.generic"));
    } finally {
      setBusy(false);
    }
  };

  /** Позначити звірку перевіреною вручну (пісня зникає з розбіжностей) або повернути як було. */
  const resolveCheck = async (resolved: boolean) => {
    setBusy(true);
    try {
      const d = await api.admin.resolveTrackCheck({ params: { id }, body: { resolved } });
      setInitial((cur) => (cur ? { ...cur, check: d.check } : d));
      await invalidate(qc, endpoints.admin.tracks);
      Alert.alert(t(resolved ? "admin.check.resolvedToast" : "admin.check.reopenedToast"));
    } catch (err) {
      Alert.alert(err instanceof Error ? err.message : t("errors.generic"));
    } finally {
      setBusy(false);
    }
  };

  const remove = () =>
    Alert.alert(t("admin.deleteSong"), t("admin.deleteConfirm", { title: initial?.title ?? "" }), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("admin.deleteSong"),
        style: "destructive",
        onPress: async () => {
          try {
            await api.admin.deleteTrack({ params: { id } });
            router.dismissTo("/");
          } catch {
            Alert.alert(t("errors.generic"));
          }
        },
      },
    ]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => (f ? { ...f, [k]: v } : f));
  const input = [styles.input, { backgroundColor: c.surface2, color: c.text }];

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top + 8 }}>
      <View style={styles.header}>
        <Text variant="heading" style={{ flex: 1 }}>
          {t("admin.editSong")}
        </Text>
        <IconButton label={t("common.close")} onPress={() => router.back()}>
          <X size={24} color={c.text} />
        </IconButton>
      </View>
      {!form ? (
        <ActivityIndicator color={c.accent} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: insets.bottom + 32 }}
          keyboardShouldPersistTaps="handled"
        >
          {initial?.check ? (
            <CheckBlock check={initial.check} busy={busy} onResolve={(r) => void resolveCheck(r)} />
          ) : null}
          <Field label={t("admin.f.title")}>
            <TextInput value={form.title} onChangeText={(v) => set("title", v)} style={input} />
          </Field>
          <Field label={t("admin.f.artists")} hint={t("admin.f.artistsHint")}>
            <TextInput value={form.artists} onChangeText={(v) => set("artists", v)} style={input} />
          </Field>
          <Field label={t("admin.f.release")}>
            <TextInput value={form.releaseTitle} onChangeText={(v) => set("releaseTitle", v)} style={input} />
          </Field>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <Field label={t("admin.f.releaseDate")} style={{ flex: 1 }}>
              <TextInput
                value={form.releaseDate}
                onChangeText={(v) => set("releaseDate", v)}
                placeholder="2003-03-25"
                placeholderTextColor={c.textMuted}
                style={[input, !dateOk && { borderColor: c.danger, borderWidth: 1 }]}
              />
            </Field>
            <Field label={t("admin.f.duration")} style={{ width: 120 }}>
              <TextInput
                value={form.duration}
                onChangeText={(v) => set("duration", v)}
                placeholder="3:25"
                placeholderTextColor={c.textMuted}
                style={[input, durationMs === null && { borderColor: c.danger, borderWidth: 1 }]}
              />
            </Field>
          </View>
          <Field label={t("admin.f.genres")}>
            <TextInput
              value={form.genres}
              onChangeText={(v) => set("genres", v)}
              autoCapitalize="none"
              style={input}
            />
          </Field>
          <Field label={t("admin.f.youtube")}>
            <TextInput
              value={form.youtube}
              onChangeText={(v) => set("youtube", v)}
              autoCapitalize="none"
              style={[input, ytInvalid && { borderColor: c.danger, borderWidth: 1 }]}
            />
          </Field>
          <View style={styles.switchRow}>
            <Text style={{ flex: 1 }}>{t("admin.f.explicit")}</Text>
            <Switch
              value={form.explicit}
              onValueChange={(v) => set("explicit", v)}
              trackColor={{ true: c.accent, false: c.surface3 }}
            />
          </View>
          <Field label={t("admin.f.lyrics")}>
            <TextInput
              value={form.lyrics}
              onChangeText={(v) => set("lyrics", v)}
              multiline
              style={[input, styles.area]}
            />
          </Field>
          <Field label={t("admin.f.lyricsSynced")}>
            <TextInput
              value={form.lyricsSynced}
              onChangeText={(v) => set("lyricsSynced", v)}
              multiline
              autoCapitalize="none"
              style={[input, styles.area, { fontFamily: "monospace", fontSize: 12 }]}
            />
          </Field>
          <Field label={t("admin.f.status")}>
            <Segmented
              value={form.status}
              onChange={(v) => set("status", v)}
              options={[
                { value: "published", label: t("admin.f.published") },
                { value: "hidden", label: t("admin.f.hidden") },
              ]}
            />
          </Field>
          <Field label={t("admin.f.source")}>
            <Segmented
              value={form.source}
              onChange={(v) => set("source", v)}
              options={[
                { value: "catalog", label: t("admin.filter.catalog") },
                { value: "community", label: t("admin.filter.community") },
              ]}
            />
          </Field>
          <Button title={t("common.save")} onPress={save} loading={busy} disabled={!valid || !dirty} />
          <Button
            title={t("admin.deleteSong")}
            variant="ghost"
            icon={<Trash2 size={18} color={c.danger} />}
            onPress={remove}
          />
        </ScrollView>
      )}
    </View>
  );
}

/** Стан звірки з платформами: що розходиться і кнопка «Позначити перевіреною» (як на сайті). */
function CheckBlock({
  check,
  busy,
  onResolve,
}: {
  check: NonNullable<AdminTrackDetail["check"]>;
  busy: boolean;
  onResolve: (resolved: boolean) => void;
}) {
  const t = useT();
  const c = useColors();
  const ok = check.status === "verified" || check.status === "resolved";
  const fields = Object.keys(check.conflicts)
    .map((f) => t(`admin.check.field.${f}` as "admin.check.field.isrc") || f)
    .join(", ");
  const Icon = check.status === "resolved" ? BadgeCheck : ok ? CheckCircle2 : AlertTriangle;
  return (
    <View
      style={[
        styles.check,
        { borderColor: ok ? c.border : c.accent, backgroundColor: ok ? "transparent" : c.accentSoft },
      ]}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Icon size={18} color={c.accent} />
        <Text style={{ flex: 1, fontFamily: fonts.bold }}>
          {t("admin.check.title")}: {t(`admin.check.${check.status}` as "admin.check.verified")}
        </Text>
      </View>
      {check.resolvedBy ? (
        <Text variant="caption" muted>
          {t("admin.check.resolvedBy", { name: check.resolvedBy })}
        </Text>
      ) : null}
      {fields ? (
        <Text variant="caption" muted>
          {t(check.status === "resolved" ? "admin.check.conflictsResolved" : "admin.check.conflicts")}:{" "}
          {fields}
        </Text>
      ) : null}
      {check.status === "resolved" ? (
        <Button
          title={t("admin.check.reopen")}
          variant="ghost"
          size="sm"
          icon={<RotateCcw size={16} color={c.textMuted} />}
          onPress={() => onResolve(false)}
          disabled={busy}
        />
      ) : check.status !== "verified" ? (
        <>
          <Button title={t("admin.check.resolve")} size="sm" onPress={() => onResolve(true)} loading={busy} />
          <Text variant="caption" muted>
            {t("admin.check.resolveHint")}
          </Text>
        </>
      ) : null}
    </View>
  );
}

function Field({
  label,
  hint,
  style,
  children,
}: {
  label: string;
  hint?: string;
  style?: object;
  children: ReactNode;
}) {
  return (
    <View style={style}>
      <Text variant="caption" muted style={{ marginBottom: 6, fontFamily: fonts.bold }}>
        {label}
      </Text>
      {children}
      {hint ? (
        <Text variant="caption" muted style={{ marginTop: 4 }}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 8 },
  input: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  area: { minHeight: 140, textAlignVertical: "top" },
  switchRow: { flexDirection: "row", alignItems: "center" },
  check: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 8 },
});
