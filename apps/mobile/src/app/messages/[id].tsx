import { endpoints, type Message } from "@musicdb/contracts/client";
import { formatRelative } from "@musicdb/i18n";
import { invalidate, useApi, useEndpoint, useInfiniteEndpoint, useMe } from "@musicdb/sdk/react";
import { useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { ChevronLeft, Play, Send } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Avatar, Button, Cover, IconButton, Text } from "@/components/ui";
import { fonts, usePrefs } from "@/lib/theme";
import { playerStore } from "@/player/store";

export default function ConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, colors: c, locale } = usePrefs();
  const insets = useSafeAreaInsets();
  const api = useApi();
  const qc = useQueryClient();
  const me = useMe().data;
  const conv = useEndpoint(endpoints.conversations.get, { params: { id } });
  const list = useInfiniteEndpoint(endpoints.conversations.messages, {
    params: { id },
    query: { limit: 40 },
  });
  const messages = useMemo(() => list.data?.pages.flatMap((p) => p.items as Message[]) ?? [], [list.data]);
  const [text, setText] = useState("");

  useEffect(() => {
    if (!conv.data?.unreadCount) return;
    void api.conversations
      .read({ params: { id } })
      .then(() => invalidate(qc, endpoints.conversations.list, endpoints.me.badges));
  }, [conv.data?.unreadCount, id, api, qc]);

  const refresh = () =>
    invalidate(
      qc,
      endpoints.conversations.messages,
      endpoints.conversations.list,
      endpoints.conversations.get,
    );

  const send = async () => {
    if (!text.trim()) return;
    const body = text.trim();
    setText("");
    await api.conversations.send({ params: { id }, body: { body } });
    await refresh();
  };

  const c2 = conv.data;
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: c.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.header, { paddingTop: insets.top + 4, borderBottomColor: c.border }]}>
        <IconButton label={t("common.back")} onPress={() => router.back()}>
          <ChevronLeft size={26} color={c.text} />
        </IconButton>
        {c2 ? (
          <Pressable
            onPress={() =>
              router.push({ pathname: "/user/[id]", params: { id: c2.peer.username ?? c2.peer.id } })
            }
            style={styles.peer}
          >
            <Avatar src={c2.peer.image} name={c2.peer.name} size={34} />
            <Text variant="title">{c2.peer.name}</Text>
          </Pressable>
        ) : null}
      </View>
      <FlatList
        inverted
        data={messages}
        keyExtractor={(m) => m.id}
        onEndReached={() => list.hasNextPage && list.fetchNextPage()}
        contentContainerStyle={{ padding: 12, gap: 6 }}
        renderItem={({ item }) => {
          const mine = item.sender?.id === me?.id;
          return (
            <View style={{ alignItems: mine ? "flex-end" : "flex-start" }}>
              <View
                style={[
                  styles.bubble,
                  mine
                    ? { backgroundColor: c.accent, borderBottomRightRadius: 4 }
                    : { backgroundColor: c.surface3, borderBottomLeftRadius: 4 },
                ]}
              >
                {item.deleted ? (
                  <Text
                    variant="body"
                    style={{ color: mine ? c.onAccent : c.textSubtle, fontStyle: "italic" }}
                  >
                    {t("messages.deleted")}
                  </Text>
                ) : item.body ? (
                  <Text variant="body" style={{ color: mine ? c.onAccent : c.text }}>
                    {item.body}
                  </Text>
                ) : null}
                {item.track ? (
                  <Pressable
                    onPress={() =>
                      playerStore
                        .getState()
                        .playTrack(item.track!, { type: "queue", name: item.track!.title })
                    }
                    style={styles.track}
                  >
                    <Cover src={item.track.release?.coverUrl} size={44} seed={item.track.id} radius={4} />
                    <View style={{ flex: 1 }}>
                      <Text
                        variant="small"
                        numberOfLines={1}
                        style={{ color: mine ? c.onAccent : c.text, fontWeight: "700" }}
                      >
                        {item.track.title}
                      </Text>
                      <Text
                        variant="caption"
                        numberOfLines={1}
                        style={{ color: mine ? c.onAccent : c.textMuted }}
                      >
                        {item.track.artists.map((a) => a.name).join(", ")}
                      </Text>
                    </View>
                    <Play size={18} color={mine ? c.onAccent : c.text} fill={mine ? c.onAccent : c.text} />
                  </Pressable>
                ) : null}
                {item.attachment ? (
                  <Text variant="small" style={{ color: mine ? c.onAccent : c.text }}>
                    📎 {item.attachment.name}
                  </Text>
                ) : null}
              </View>
              <Text variant="caption" muted style={{ marginTop: 2 }}>
                {formatRelative(item.createdAt, t, locale)}
              </Text>
            </View>
          );
        }}
      />
      {c2?.state === "request" ? (
        <View style={styles.request}>
          <Button
            title={t("messages.accept")}
            variant="accent"
            onPress={async () => {
              await api.conversations.respond({ params: { id }, body: { accept: true } });
              await refresh();
            }}
          />
          <Button
            title={t("messages.decline")}
            variant="outline"
            onPress={async () => {
              await api.conversations.respond({ params: { id }, body: { accept: false } });
              await refresh();
            }}
          />
        </View>
      ) : null}
      {c2 && c2.state !== "declined" ? (
        <View style={[styles.composer, { paddingBottom: insets.bottom + 8, borderTopColor: c.border }]}>
          {c2.state === "pending" ? (
            <Text variant="caption" muted style={{ textAlign: "center", marginBottom: 6 }}>
              {t("messages.pending")}
            </Text>
          ) : null}
          <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8 }}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder={t("messages.placeholder")}
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
      ) : (
        <Text muted style={{ textAlign: "center", padding: 16 }}>
          {c2?.state === "declined" ? t("messages.declined") : ""}
        </Text>
      )}
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
  peer: { flexDirection: "row", alignItems: "center", gap: 10 },
  bubble: { maxWidth: "80%", borderRadius: 18, paddingHorizontal: 14, paddingVertical: 9, gap: 6 },
  track: { flexDirection: "row", alignItems: "center", gap: 10, minWidth: 220 },
  request: { flexDirection: "row", justifyContent: "center", gap: 12, padding: 12 },
  composer: { paddingHorizontal: 12, paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth },
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
