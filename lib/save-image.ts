/**
 * Saves generated card images to the local filesystem for later use.
 * Only runs in development or when SAVE_GENERATED_IMAGES=true is set.
 *
 * Files are written to: <project_root>/generated/
 * Filename format: {serial}_{name}_{rarity}.{ext}
 * e.g. 0042_Sentinel_Legendary.jpg
 */

import fs from "fs";
import path from "path";
import type { FullCardProfile } from "./types";

const GENERATED_DIR = path.join(process.cwd(), "generated");

function shouldSave(): boolean {
  return (
    process.env.NODE_ENV === "development" ||
    process.env.SAVE_GENERATED_IMAGES === "true"
  );
}

function sanitizeFilename(str: string): string {
  return str.replace(/[^a-zA-Z0-9_-]/g, "_").replace(/_+/g, "_").slice(0, 40);
}

function detectExtension(base64: string): string {
  // Peek at the first few bytes of the base64 payload to detect format
  const prefix = base64.slice(0, 16);
  const bytes = Buffer.from(prefix, "base64");

  if (bytes[0] === 0xff && bytes[1] === 0xd8) return "jpg";
  if (bytes[0] === 0x89 && bytes[1] === 0x50) return "png";
  if (bytes[0] === 0x52 && bytes[1] === 0x49) return "webp";

  return "png"; // default assumption
}

export function saveGeneratedImage(
  cardImageBase64: string,
  cardProfile: FullCardProfile
): void {
  if (!shouldSave()) return;

  // Fire-and-forget — don't block the API response
  setImmediate(() => {
    try {
      if (!fs.existsSync(GENERATED_DIR)) {
        fs.mkdirSync(GENERATED_DIR, { recursive: true });
      }

      const serial = String(cardProfile.serial_number).padStart(4, "0");
      const name = sanitizeFilename(cardProfile.name);
      const rarity = sanitizeFilename(cardProfile.rarity);
      const ext = detectExtension(cardImageBase64);
      const filename = `${serial}_${name}_${rarity}.${ext}`;
      const filepath = path.join(GENERATED_DIR, filename);

      fs.writeFileSync(filepath, Buffer.from(cardImageBase64, "base64"));
      console.log(`[save-image] Saved: generated/${filename}`);
    } catch (err) {
      // Non-fatal — log and move on
      console.warn("[save-image] Failed to save image:", err);
    }
  });
}
