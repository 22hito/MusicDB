"use client";
import type { UploadPurpose } from "@musicdb/contracts/client";
import { api } from "./api";

/**
 * Завантаження файлу напряму у сховище: квиток від API → PUT за підписаним посиланням (з прогресом) →
 * підтвердження. Повертає id завантаження для форм (аватар, аудіо пісні, вкладення).
 */
export async function uploadFile(
  file: File,
  purpose: UploadPurpose,
  onProgress?: (fraction: number) => void,
) {
  const ticket = await api.uploads.create({
    body: {
      purpose,
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      sizeBytes: file.size,
    },
  });
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(ticket.method, ticket.url);
    for (const [k, v] of Object.entries(ticket.headers)) xhr.setRequestHeader(k, v);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(e.loaded / e.total);
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`upload failed: ${xhr.status}`));
    xhr.onerror = () => reject(new Error("upload failed"));
    xhr.send(file);
  });
  const status = await api.uploads.complete({ params: { id: ticket.uploadId } });
  return { uploadId: ticket.uploadId, status };
}
