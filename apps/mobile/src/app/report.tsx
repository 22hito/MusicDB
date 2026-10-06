/** Скарга на контент чи людину (вимога Google Play для застосунків з контентом користувачів). */
import type { ReportReason, ReportTarget } from "@musicdb/contracts/client";
import { useApi } from "@musicdb/sdk/react";
import { router, useLocalSearchParams } from "expo-router";
import { Check, X } from "lucide-react-native";
import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, IconButton, Text } from "@/components/ui";
import { fonts, useColors, useT } from "@/lib/theme";

const reasons: ReportReason[] = [
  "spam",
  "harassment",
  "hate",
  "sexual",
  "violence",
  "copyright",
  "impersonation",
  "misinformation",
  "other",
];

export default function ReportScreen() {
  const { type, id } = useLocalSearchParams<{ type: ReportTarget; id: string }>();
  const t = useT();
  const c = useColors();
  const api = useApi();
  const insets = useSafeAreaInsets();
  const [reason, setReason] = useState<ReportReason>("spam");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      await api.reports.create({
        body: {
          targetType: type,
          targetId: id,
          reason,
          ...(details.trim() ? { details: details.trim() } : {}),
        },
      });
      Alert.alert(t("report.sent"));
      router.back();
    } catch {
      Alert.alert(t("errors.generic"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top + 8 }}>
      <View style={styles.header}>
        <Text variant="heading" style={{ flex: 1 }}>
          {t("report.title")}
        </Text>
        <IconButton label={t("common.close")} onPress={() => router.back()}>
          <X size={24} color={c.text} />
        </IconButton>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}>
        <Text variant="title" style={{ marginBottom: 8 }}>
          {t("report.reason")}
        </Text>
        {reasons.map((r) => (
          <Pressable
            key={r}
            onPress={() => setReason(r)}
            style={[styles.reason, { borderBottomColor: c.border }]}
          >
            <Text style={{ flex: 1 }}>{t(`report.reasons.${r}`)}</Text>
            {reason === r ? <Check size={20} color={c.accent} /> : null}
          </Pressable>
        ))}
        <Text variant="title" style={{ marginTop: 20, marginBottom: 8 }}>
          {t("report.details")}
        </Text>
        <TextInput
          value={details}
          onChangeText={setDetails}
          multiline
          maxLength={2000}
          style={[styles.input, { backgroundColor: c.surface2, color: c.text }]}
        />
        <Button
          title={t("common.send")}
          variant="accent"
          size="lg"
          loading={busy}
          onPress={submit}
          style={{ marginTop: 20 }}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, marginBottom: 4 },
  reason: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  input: {
    minHeight: 100,
    borderRadius: 12,
    padding: 12,
    fontFamily: fonts.regular,
    fontSize: 15,
    textAlignVertical: "top",
  },
});
