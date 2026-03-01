import { describe, it, expect } from "vitest";
import { sanitizeFilename, detectExtension } from "../save-image";

// ── sanitizeFilename ─────────────────────────────────────────────────

describe("sanitizeFilename", () => {
  it("passes through simple alphanumeric strings", () => {
    expect(sanitizeFilename("Sentinel")).toBe("Sentinel");
  });

  it("replaces special characters with underscores", () => {
    expect(sanitizeFilename("My Agent!")).toBe("My_Agent_");
  });

  it("collapses multiple underscores", () => {
    expect(sanitizeFilename("a!!!b")).toBe("a_b");
  });

  it("truncates to 40 characters", () => {
    const long = "a".repeat(60);
    expect(sanitizeFilename(long).length).toBe(40);
  });

  it("handles empty string", () => {
    expect(sanitizeFilename("")).toBe("");
  });

  it("preserves hyphens and underscores", () => {
    expect(sanitizeFilename("my-agent_v2")).toBe("my-agent_v2");
  });

  it("handles spaces by replacing with underscores", () => {
    expect(sanitizeFilename("Hyper Rare")).toBe("Hyper_Rare");
  });
});

// ── detectExtension ──────────────────────────────────────────────────

describe("detectExtension", () => {
  it("detects JPEG from magic bytes", () => {
    // JPEG starts with 0xFF 0xD8 → base64 of [0xFF, 0xD8] = "/9g=" (approx)
    const jpegBase64 = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]).toString("base64");
    expect(detectExtension(jpegBase64)).toBe("jpg");
  });

  it("detects PNG from magic bytes", () => {
    // PNG starts with 0x89 0x50
    const pngBase64 = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0, 0, 0, 0, 0]).toString("base64");
    expect(detectExtension(pngBase64)).toBe("png");
  });

  it("detects WebP from magic bytes", () => {
    // WebP starts with 0x52 0x49 (RIFF)
    const webpBase64 = Buffer.from([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0, 0, 0, 0]).toString("base64");
    expect(detectExtension(webpBase64)).toBe("webp");
  });

  it("defaults to png for unknown format", () => {
    const unknownBase64 = Buffer.from([0x00, 0x00, 0x00, 0x00, 0, 0, 0, 0, 0, 0, 0, 0]).toString("base64");
    expect(detectExtension(unknownBase64)).toBe("png");
  });

  it("handles empty string by defaulting to png", () => {
    expect(detectExtension("")).toBe("png");
  });
});
