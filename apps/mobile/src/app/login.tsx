import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { X } from "lucide-react-native";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, IconButton, Text } from "@/components/ui";
import { authClient } from "@/lib/auth";
import { fonts, useColors, useT } from "@/lib/theme";

export default function LoginScreen() {
  const t = useT();
  const c = useColors();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const done = async () => {
    await qc.invalidateQueries();
    router.back();
  };

  const submit = async () => {
    setBusy(true);
    setError(null);
    const res =
      mode === "login"
        ? await authClient.signIn.email({ email: email.trim(), password })
        : await authClient.signUp.email({
            email: email.trim(),
            password,
            name: name.trim() || email.split("@")[0]!,
          });
    setBusy(false);
    if (res.error) {
      setError(mode === "login" ? t("auth.invalid") : (res.error.message ?? t("errors.generic")));
      return;
    }
    await done();
  };

  const google = async () => {
    setError(null);
    const res = await authClient.signIn.social({ provider: "google", callbackURL: "/" });
    if (res.error) setError(res.error.message ?? t("errors.generic"));
    else await done();
  };

  const input = [styles.input, { backgroundColor: c.surface2, color: c.text, borderColor: c.borderStrong }];

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: c.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={{ padding: 24, paddingTop: insets.top + 12 }}
        keyboardShouldPersistTaps="handled"
      >
        <IconButton label={t("common.close")} onPress={() => router.back()} style={{ alignSelf: "flex-end" }}>
          <X size={24} color={c.text} />
        </IconButton>
        <Text variant="display" style={{ marginTop: 12 }}>
          {mode === "login" ? t("auth.title") : t("common.signUp")}
        </Text>
        <Text muted style={{ marginTop: 6, marginBottom: 24 }}>
          {t("auth.subtitle")}
        </Text>
        <Button title={t("auth.continueGoogle")} variant="outline" size="lg" onPress={google} />
        <View style={styles.or}>
          <View style={[styles.line, { backgroundColor: c.border }]} />
          <Text variant="small" muted>
            {t("common.or")}
          </Text>
          <View style={[styles.line, { backgroundColor: c.border }]} />
        </View>
        {mode === "signup" ? (
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder={t("auth.name")}
            placeholderTextColor={c.textSubtle}
            style={input}
          />
        ) : null}
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder={t("auth.email")}
          placeholderTextColor={c.textSubtle}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          style={input}
        />
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder={t("auth.password")}
          placeholderTextColor={c.textSubtle}
          secureTextEntry
          autoComplete={mode === "login" ? "password" : "new-password"}
          style={input}
        />
        {error ? (
          <Text variant="small" style={{ color: c.danger, marginBottom: 12 }}>
            {error}
          </Text>
        ) : null}
        <Button
          title={mode === "login" ? t("common.signIn") : t("common.signUp")}
          variant="accent"
          size="lg"
          loading={busy}
          onPress={submit}
        />
        <Button
          variant="ghost"
          title={
            mode === "login"
              ? `${t("auth.noAccount")} ${t("common.signUp")}`
              : `${t("auth.haveAccount")} ${t("common.signIn")}`
          }
          onPress={() => setMode(mode === "login" ? "signup" : "login")}
          style={{ marginTop: 12 }}
        />
        <Text variant="caption" muted style={{ textAlign: "center", marginTop: 24 }}>
          {t("auth.terms")}
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  input: {
    height: 52,
    borderRadius: 10,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    fontFamily: fonts.medium,
    fontSize: 15,
  },
  or: { flexDirection: "row", alignItems: "center", gap: 12, marginVertical: 20 },
  line: { flex: 1, height: StyleSheet.hairlineWidth },
});
