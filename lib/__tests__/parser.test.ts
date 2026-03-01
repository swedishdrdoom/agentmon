import { describe, it, expect } from "vitest";
import {
  isSensitiveFile,
  redactSecrets,
  extractAgentName,
  extractSkillSlugs,
  calculateContentDepth,
  generateNameNumber,
} from "../parser";

// ── isSensitiveFile ──────────────────────────────────────────────────

describe("isSensitiveFile", () => {
  it("flags .env files", () => {
    expect(isSensitiveFile(".env")).toBe(true);
    expect(isSensitiveFile(".env.local")).toBe(true);
    expect(isSensitiveFile(".env.production")).toBe(true);
  });

  it("flags credential files", () => {
    expect(isSensitiveFile("credentials.json")).toBe(true);
    expect(isSensitiveFile("my-credentials.yaml")).toBe(true);
  });

  it("flags private key files", () => {
    expect(isSensitiveFile("server.pem")).toBe(true);
    expect(isSensitiveFile("private.key")).toBe(true);
    expect(isSensitiveFile("id_rsa")).toBe(true);
    expect(isSensitiveFile("id_ed25519")).toBe(true);
  });

  it("flags secret files", () => {
    expect(isSensitiveFile("secrets.json")).toBe(true);
    expect(isSensitiveFile("secret.yaml")).toBe(true);
  });

  it("flags token and auth files", () => {
    expect(isSensitiveFile("token.json")).toBe(true);
    expect(isSensitiveFile(".npmrc")).toBe(true);
    expect(isSensitiveFile(".netrc")).toBe(true);
  });

  it("allows normal files", () => {
    expect(isSensitiveFile("SOUL.md")).toBe(false);
    expect(isSensitiveFile("README.md")).toBe(false);
    expect(isSensitiveFile("config.json")).toBe(false);
    expect(isSensitiveFile("SKILLS.md")).toBe(false);
  });

  it("checks basename only (ignores path)", () => {
    expect(isSensitiveFile("some/path/.env.local")).toBe(true);
    expect(isSensitiveFile("deep/nested/credentials.json")).toBe(true);
    expect(isSensitiveFile("deep/nested/SOUL.md")).toBe(false);
  });
});

// ── redactSecrets ────────────────────────────────────────────────────

describe("redactSecrets", () => {
  it("redacts Anthropic API keys", () => {
    const input = "ANTHROPIC_API_KEY=sk-ant-api03-abcdefghijklmnop1234567890";
    const result = redactSecrets(input);
    expect(result).not.toContain("sk-ant-api03");
    expect(result).toContain("[REDACTED");
  });

  it("redacts Google API keys", () => {
    const input = "key=AIzaSyD-abcdefghijklmnopqrstuvwxyz12345";
    const result = redactSecrets(input);
    expect(result).not.toContain("AIzaSy");
    expect(result).toContain("[REDACTED");
  });

  it("redacts GitHub tokens", () => {
    const input = "token: ghp_aBcDeFgHiJkLmNoPqRsTuVwXyZ1234567890ab";
    const result = redactSecrets(input);
    expect(result).not.toContain("ghp_");
    expect(result).toContain("[REDACTED");
  });

  it("redacts GitHub PATs", () => {
    const input = "github_pat_aBcDeFgHiJkLmNoPqRsTuVw";
    const result = redactSecrets(input);
    expect(result).not.toContain("github_pat_");
    expect(result).toContain("[REDACTED");
  });

  it("redacts Slack tokens", () => {
    const input = "SLACK_TOKEN=xoxb-12345-67890-abcdefgh";
    const result = redactSecrets(input);
    expect(result).not.toContain("xoxb-");
    expect(result).toContain("[REDACTED");
  });

  it("redacts Bearer tokens", () => {
    const input = "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9abcdef";
    const result = redactSecrets(input);
    expect(result).toContain("Bearer [REDACTED");
  });

  it("redacts AWS access keys", () => {
    const input = "aws_key=AKIAIOSFODNN7EXAMPLE";
    const result = redactSecrets(input);
    expect(result).not.toContain("AKIAIOSFODNN7EXAMPLE");
    expect(result).toContain("[REDACTED");
  });

  it("redacts KEY=value patterns", () => {
    const input = "API_KEY=super_secret_value_12345678";
    const result = redactSecrets(input);
    expect(result).toContain("API_KEY=");
    expect(result).not.toContain("super_secret_value_12345678");
  });

  it("preserves normal text", () => {
    const input = "This is a normal agent configuration with no secrets.";
    expect(redactSecrets(input)).toBe(input);
  });

  it("preserves short strings that look like keys but are too short", () => {
    const input = "key=abc";
    // "abc" is only 3 chars, below the {8,} threshold
    expect(redactSecrets(input)).toBe(input);
  });
});

// ── extractAgentName ─────────────────────────────────────────────────

describe("extractAgentName", () => {
  it("extracts name from # heading in IDENTITY.md", () => {
    const files = [{ name: "IDENTITY.md", content: "# Sentinel\nA guardian agent." }];
    expect(extractAgentName(files)).toBe("Sentinel");
  });

  it("extracts name from Name: field in SOUL.md", () => {
    const files = [{ name: "SOUL.md", content: "Name: Warden\nPurpose: protect." }];
    expect(extractAgentName(files)).toBe("Warden");
  });

  it("prioritizes IDENTITY.md over SOUL.md", () => {
    const files = [
      { name: "SOUL.md", content: "# SoulName" },
      { name: "IDENTITY.md", content: "# IdentityName" },
    ];
    expect(extractAgentName(files)).toBe("IdentityName");
  });

  it("falls back to README.md", () => {
    const files = [
      { name: "README.md", content: "# MyAgent\nSome docs." },
      { name: "TOOLS.md", content: "# Tools" },
    ];
    expect(extractAgentName(files)).toBe("MyAgent");
  });

  it("returns null when no name is found", () => {
    const files = [{ name: "config.json", content: '{"key": "value"}' }];
    expect(extractAgentName(files)).toBeNull();
  });

  it("trims whitespace from extracted names", () => {
    const files = [{ name: "IDENTITY.md", content: "#   Sentinel   " }];
    expect(extractAgentName(files)).toBe("Sentinel");
  });

  it("is case-insensitive for filenames", () => {
    const files = [{ name: "identity.md", content: "# Agent007" }];
    expect(extractAgentName(files)).toBe("Agent007");
  });
});

// ── extractSkillSlugs ────────────────────────────────────────────────

describe("extractSkillSlugs", () => {
  it("extracts slugs from install commands", () => {
    const text = "npx clawhub@latest install my-cool-skill";
    expect(extractSkillSlugs(text)).toContain("my-cool-skill");
  });

  it("extracts slugs from skill paths", () => {
    const text = "Using skills/author/web-search for research.";
    expect(extractSkillSlugs(text)).toContain("web-search");
  });

  it("deduplicates slugs", () => {
    const text = "npx clawhub install my-skill\nnpx clawhub install my-skill";
    const result = extractSkillSlugs(text);
    const mySkillCount = result.filter((s) => s === "my-skill").length;
    expect(mySkillCount).toBe(1);
  });

  it("filters out common words from list items", () => {
    const text = "- the\n- and\n- my-real-skill";
    const result = extractSkillSlugs(text);
    expect(result).not.toContain("the");
    expect(result).not.toContain("and");
  });

  it("returns empty array for text with no skills", () => {
    const text = "Just a normal paragraph with no skill references.";
    expect(extractSkillSlugs(text)).toEqual([]);
  });
});

// ── calculateContentDepth ────────────────────────────────────────────

describe("calculateContentDepth", () => {
  it("returns minimal for single short file", () => {
    expect(calculateContentDepth(100, 1)).toBe("minimal");
    expect(calculateContentDepth(499, 1)).toBe("minimal");
  });

  it("returns minimal for very short content regardless of file count", () => {
    expect(calculateContentDepth(199, 3)).toBe("minimal");
    expect(calculateContentDepth(50, 5)).toBe("minimal");
  });

  it("returns moderate for middle-range content", () => {
    expect(calculateContentDepth(1000, 2)).toBe("moderate");
    expect(calculateContentDepth(4999, 3)).toBe("moderate");
  });

  it("returns rich for 4+ files", () => {
    expect(calculateContentDepth(500, 4)).toBe("rich");
    expect(calculateContentDepth(200, 10)).toBe("rich");
  });

  it("returns rich for large content", () => {
    expect(calculateContentDepth(5000, 2)).toBe("rich");
    expect(calculateContentDepth(10000, 1)).toBe("rich");
  });

  it("handles edge case: single file at exactly 500 chars", () => {
    // fileCount=1, totalLength=500 → NOT minimal (< 500 fails), check rich (no), so moderate
    expect(calculateContentDepth(500, 1)).toBe("moderate");
  });
});

// ── generateNameNumber ───────────────────────────────────────────────

describe("generateNameNumber", () => {
  it("returns a number between 1 and 999", () => {
    const result = generateNameNumber("test content");
    expect(result).toBeGreaterThanOrEqual(1);
    expect(result).toBeLessThanOrEqual(999);
  });

  it("is deterministic (same input → same output)", () => {
    const a = generateNameNumber("identical input");
    const b = generateNameNumber("identical input");
    expect(a).toBe(b);
  });

  it("produces different results for different inputs", () => {
    const a = generateNameNumber("input A");
    const b = generateNameNumber("input B");
    expect(a).not.toBe(b);
  });

  it("handles empty string", () => {
    const result = generateNameNumber("");
    expect(result).toBeGreaterThanOrEqual(1);
    expect(result).toBeLessThanOrEqual(999);
  });
});
