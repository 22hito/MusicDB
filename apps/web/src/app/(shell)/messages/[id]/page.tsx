import { MessagesView } from "@/components/pages/messages";

export const metadata = { robots: { index: false } };

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <MessagesView conversationId={id} />;
}
