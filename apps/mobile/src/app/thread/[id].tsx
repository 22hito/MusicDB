import { endpoints, type Post } from "@musicdb/contracts/client";
import { formatRelative } from "@musicdb/i18n";
import { invalidate, useApi, useEndpoint, useMe } from "@musicdb/sdk/react";
import { useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { ChevronLeft, Send, X } from "lucide-react-native";
import { useState } from "react";
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Avatar, IconButton, Text } from "@/components/ui";
import { fonts, usePrefs } from "@/lib/theme";

export default function ThreadScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, colors: c, locale } = usePrefs();
  const insets = useSafeAreaInsets();
  const api = useApi();
  const qc = useQueryClient();
  const me = useMe().data;
  const { data } = useEndpoint(endpoints.threads.get, { params: { id } });
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState<Post | null>(null);

  const send = async () => {
    if (!body.trim()) return;
    await api.threads.reply({
      params: { id },
      body: { body: body.trim(), ...(replyTo ? { replyToId: replyTo.id } : {}) },
    });
    setBody("");
    setReplyTo(null);
    await invalidate(qc, endpoints.threads.get, endpoints.threads.list);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: c.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.header, { paddingTop: insets.top + 4, borderBottomColor: c.border }]}>
        <IconButton label={t("common.back")} onPress={() => router.back()}>
          <ChevronLeft size={26} color={c.text} />
        </IconButton>
        <Text variant="title" numberOfLines={1} style={{ flex: 1 }}>
          {data?.title ?? ""}
        </Text>
      </View>
      <FlatList
        data={data?.posts ?? []}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ padding: 16, gap: 14 }}
        ListHeaderComponent={
          data ? (
            <View style={[styles.op, { backgroundColor: c.surface2 }]}>
              <View style={styles.meta}>
                <Avatar src={data.author?.image} name={data.author?.name ?? "?"} size={32} />
                <Text variant="bodyStrong">{data.author?.name ?? "—"}</Text>
                <Text variant="caption" muted>
                  {formatRelative(data.createdAt, t, locale)}
                </Text>
              </View>
              <Text style={{ marginTop: 10 }}>{data.body}</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <Pressable
            onLongPress={() =>
              me &&
              Alert.alert(item.author?.name ?? "", undefined, [
                { text: t("community.reply"), onPress: () => setReplyTo(item) },
                {
                  text: t("common.report"),
                  onPress: () => router.push({ pathname: "/report", params: { type: "post", id: item.id } }),
                },
                { text: t("common.cancel"), style: "cancel" },
              ])
            }
            style={{ gap: 4 }}
          >
            <View style={styles.meta}>
              <Avatar src={item.author?.image} name={item.author?.name ?? "?"} size={28} />
              <Text variant="bodyStrong">{item.author?.name ?? "—"}</Text>
              <Text variant="caption" muted>
                {formatRelative(item.createdAt, t, locale)}
              </Text>
            </View>
            {item.replyTo ? (
              <Text
                variant="small"
                muted
                style={[styles.quote, { borderLeftColor: c.accent }]}
                numberOfLines={2}
              >
                {item.replyTo.author?.name}: {item.replyTo.excerpt}
              </Text>
            ) : null}
            <Text style={item.deleted ? { color: c.textSubtle, fontStyle: "italic" } : undefined}>
              {item.deleted ? t("messages.deleted") : item.body}
            </Text>
          </Pressable>
        )}
      />
      {me && data && !data.locked ? (
        <View style={[styles.composer, { paddingBottom: insets.bottom + 8, borderTopColor: c.border }]}>
          {replyTo ? (
            <View style={styles.replying}>
              <Text variant="caption" muted numberOfLines={1} style={{ flex: 1 }}>
                {t("community.replyingTo", { name: replyTo.author?.name ?? "" })}
              </Text>
              <Pressable onPress={() => setReplyTo(null)}>
                <X size={16} color={c.textMuted} />
              </Pressable>
            </View>
          ) : null}
          <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8 }}>
            <TextInput
              value={body}
              onChangeText={setBody}
              placeholder={t("community.reply")}
              placeholderTextColor={c.textSubtle}
              multiline
              style={[styles.input, { backgroundColor: c.surface2, color: c.text }]}
            />
            <IconButton
              label={t("common.send")}
              onPress={send}
              style={{ backgroundColor: c.accent, borderRadius: 20 }}
            >
              <Send size={18} color={c.onAccent} />
            </IconButton>
          </View>
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 6,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  op: { padding: 16, borderRadius: 14, marginBottom: 6 },
  meta: { flexDirection: "row", alignItems: "center", gap: 8 },
  quote: { borderLeftWidth: 2, paddingLeft: 8 },
  composer: { paddingHorizontal: 12, paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth },
  replying: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 120,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontFamily: fonts.regular,
    fontSize: 15,
  },
});
