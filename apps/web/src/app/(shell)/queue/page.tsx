"use client";
import { RightPanel } from "@/components/shell/right-panel";

export default function QueuePage() {
  return (
    <div className="h-[calc(100dvh-200px)] px-2">
      <RightPanel panel="queue" />
    </div>
  );
}
