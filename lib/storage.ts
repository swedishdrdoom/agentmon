/**
 * Image storage for Agentmon cards using Vercel Blob.
 *
 * Uploads base64-encoded card images to Vercel Blob storage and returns
 * the public URL. Falls back gracefully when BLOB_READ_WRITE_TOKEN is not set.
 */

import { put } from "@vercel/blob";
import { detectExtension, sanitizeFilename } from "./save-image";
import type { FullCardProfile } from "./types";

/**
 * Upload a card image to Vercel Blob storage.
 * Returns the public URL, or null if Blob storage is not configured.
 */
export async function uploadCardImage(
  cardImageBase64: string,
  cardProfile: FullCardProfile,
  cardId: string
): Promise<string | null> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.warn("[storage] BLOB_READ_WRITE_TOKEN not configured — image not uploaded");
    return null;
  }

  const ext = detectExtension(cardImageBase64);
  const name = sanitizeFilename(cardProfile.name);
  const rarity = sanitizeFilename(cardProfile.rarity);
  const filename = `cards/${cardId}_${name}_${rarity}.${ext}`;

  const imageBuffer = Buffer.from(cardImageBase64, "base64");
  const contentType =
    ext === "jpg" ? "image/jpeg" : ext === "png" ? "image/png" : "image/webp";

  const blob = await put(filename, imageBuffer, {
    access: "public",
    contentType,
    addRandomSuffix: false,
  });

  return blob.url;
}
