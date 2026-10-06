/** Модальне вікно «Зберегти як плейлист»: назва й видимість, потім — перехід до плейлиста. */
import type { Track } from "@musicdb/contracts/client";
import { usePlaylistActions } from "@musicdb/sdk/react";
import { router } from "expo-router";
import { Globe, Lock } from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { fonts, useColors, useT } from "@/lib/theme";
import { Button, Text } from "./ui";

export function SavePlaylistSheet({
  visible,
  onClose,
  defaultTitle,
  loadTracks,
}: {
  visible: boolean;
  onClose: () => void;
  defaultTitle: string;
  loadTracks: () => Promise<Track[]> | Track[];
}) {
  const t = useT();
  const c = useColors();
  const actions = usePlaylistActions();
  const [title, setTitle] = useState(defaultTitle);
  const [visibility, setVisibility] = useState<"private" | "public">("private");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (visible) setTitle(defaultTitle);
  }, [visible, defaultTitle]);

  const save = async () => {
    setBusy(true);
    try {
      const tracks = await loadTracks();
      const p = await actions.create.mutateAsync({
        title: title.trim() || defaultTitle,
        visibility,
        trackIds: tracks.slice(0, 500).map((x) => x.id),
      });
      onClose();
      router.push({ pathname: "/playlist/[id]", params: { id: p.id } });
    } catch {
      Alert.alert(t("errors.generic"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.wrap}>
        <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: c.overlay }]} onPress={onClose} />
        <View style={[styles.dialog, { backgroundColor: c.surface2 }]}>
          <Text variant="heading">{t("playlist.saveTitle")}</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            maxLength={100}
            autoFocus
            style={[styles.input, { backgroundColor: c.surface3, color: c.text }]}
          />
          <View style={{ flexDirection: "row", gap: 8 }}>
            {(
              [
                ["private", Lock, t("playlist.private")],
                ["public", Globe, t("playlist.public")],
              ] as const
            ).map(([value, Icon, label]) => {
              const on = visibility === value;
              return (
                <Pressable
                  key={value}
                  onPress={() => setVisibility(value)}
                  style={[
                    styles.option,
                    {
                      borderColor: on ? c.accent : c.border,
                      backgroundColor: on ? c.accentSoft : "transparent",
                    },
                  ]}
                >
                  <Icon size={16} color={on ? c.accent : c.textMuted} />
                  <Text variant="small" numberOfLines={1} style={{ color: on ? c.accent : c.text, flex: 1 }}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 8 }}>
            <Button variant="ghost" title={t("common.cancel")} onPress={onClose} />
            <Button title={t("common.save")} loading={busy} onPress={save} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  dialog: { width: "100%", maxWidth: 420, borderRadius: 20, padding: 18, gap: 14 },
  input: { height: 46, borderRadius: 12, paddingHorizontal: 14, fontFamily: fonts.regular, fontSize: 15 },
  option: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
  },
});
