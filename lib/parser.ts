import JSZip from "jszip";
import type { ParsedInput, ContentDepth } from "./types";

// ── Exported Pure Helpers (for testing) ───────────────────────────────

export {
  isSensitiveFile,
  redactSecrets,
  extractAgentName,
  extractSkillSlugs,
  calculateContentDepth,
  generateNameNumber,
};

// ── File text extraction ─────────────────────────────────────────────

const TEXT_EXTENSIONS = [".md", ".txt", ".json", ".yaml", ".yml"];

/**
 * Files that should NEVER be processed, even inside zips.
 * These may contain secrets, credentials, or private keys.
 */
const SENSITIVE_FILE_PATTERNS = [
  /^\.env/i,               // .env, .env.local, .env.production, etc.
  /credentials/i,          // credentials.json, credentials.yaml, etc.
  /\.pem$/i,               // Private keys
  /\.key$/i,               // Private keys
  /\.p12$/i,               // PKCS#12 keystores
  /\.pfx$/i,               // PFX certificates
  /secret/i,               // secrets.json, secret.yaml, etc.
  /\.ssh/i,                // SSH config/keys
  /id_rsa/i,               // SSH keys
  /id_ed25519/i,           // SSH keys
  /token\.json$/i,         // OAuth tokens
  /\.netrc$/i,             // Network credentials
  /\.npmrc$/i,             // npm tokens
  /\.pypirc$/i,            // PyPI tokens
];

function isSensitiveFile(name: string): boolean {
  const basename = name.split("/").pop() || name;
  return SENSITIVE_FILE_PATTERNS.some((pattern) => pattern.test(basename));
}

function isTextFile(name: string): boolean {
  const lower = name.toLowerCase();
  return TEXT_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

/**
 * Redact strings that look like API keys, tokens, or secrets.
 * Replaces them with [REDACTED] to prevent leaking to third-party APIs.
 */
function redactSecrets(content: string): string {
  return content
    // API keys with common prefixes (sk-, api-, key-, token-, etc.)
    .replace(/\b(sk-[a-zA-Z0-9_-]{20,})\b/g, "[REDACTED_API_KEY]")
    .replace(/\b(sk-ant-[a-zA-Z0-9_-]{20,})\b/g, "[REDACTED_API_KEY]")
    .replace(/\b(AIza[a-zA-Z0-9_-]{20,})\b/g, "[REDACTED_API_KEY]")
    .replace(/\b(ghp_[a-zA-Z0-9]{36,})\b/g, "[REDACTED_TOKEN]")
    .replace(/\b(gho_[a-zA-Z0-9]{36,})\b/g, "[REDACTED_TOKEN]")
    .replace(/\b(github_pat_[a-zA-Z0-9_]{22,})\b/g, "[REDACTED_TOKEN]")
    .replace(/\b(xox[bposa]-[a-zA-Z0-9-]{10,})\b/g, "[REDACTED_TOKEN]")
    .replace(/\b(Bearer\s+[a-zA-Z0-9._-]{20,})\b/g, "Bearer [REDACTED_TOKEN]")
    // Generic patterns: KEY=value, TOKEN=value, SECRET=value, PASSWORD=value
    .replace(/((?:API_?KEY|TOKEN|SECRET|PASSWORD|PRIVATE_KEY|ACCESS_KEY|AUTH)\s*[=:]\s*)[^\s\n"']{8,}/gi, "$1[REDACTED]")
    // AWS keys
    .replace(/\b(AKIA[A-Z0-9]{16})\b/g, "[REDACTED_AWS_KEY]")
    // Long base64 strings that look like tokens (40+ chars, no spaces)
    .replace(/\b([a-zA-Z0-9+/]{40,}={0,2})\b/g, (match) => {
      // Only redact if it looks like a token (mixed case, no common words)
      if (/[a-z]/.test(match) && /[A-Z]/.test(match) && /[0-9]/.test(match)) {
        return "[REDACTED_TOKEN]";
      }
      return match;
    });
}

/**
 * Extract text content from uploaded files, including .zip archives.
 * Filters out sensitive files and redacts secrets from content.
 * Returns an array of { name, content } for each text file found.
 */
export async function extractFiles(
  files: File[]
): Promise<{ name: string; content: string }[]> {
  const results: { name: string; content: string }[] = [];

  for (const file of files) {
    // Skip sensitive files at the top level
    if (isSensitiveFile(file.name)) continue;

    if (file.name.toLowerCase().endsWith(".zip")) {
      // Unzip and extract text files
      const buffer = await file.arrayBuffer();
      const zip = await JSZip.loadAsync(buffer);

      const entries = Object.entries(zip.files);
      for (const [path, zipEntry] of entries) {
        if (zipEntry.dir) continue;
        const fileName = path.split("/").pop() || path;
        // Skip sensitive files inside zips
        if (isSensitiveFile(fileName) || isSensitiveFile(path)) continue;
        if (isTextFile(fileName)) {
          const content = await zipEntry.async("string");
          results.push({ name: fileName, content: redactSecrets(content) });
        }
      }
    } else if (isTextFile(file.name)) {
      const content = await file.text();
      results.push({ name: file.name, content: redactSecrets(content) });
    }
  }

  return results;
}

// ── Structural identification ────────────────────────────────────────

/**
 * Try to extract the agent's name from file contents.
 * Checks IDENTITY.md first, then SOUL.md, then any top-level heading.
 */
function extractAgentName(
  files: { name: string; content: string }[]
): string | null {
  // Priority: IDENTITY.md > SOUL.md > any file with a # heading
  const priorityFiles = ["identity.md", "soul.md", "readme.md"];

  for (const priority of priorityFiles) {
    const file = files.find((f) => f.name.toLowerCase() === priority);
    if (!file) continue;

    // Look for "Name: X" or "# X" patterns
    const nameMatch =
      file.content.match(/^#\s+(.+)$/m) ||
      file.content.match(/name:\s*(.+)/i) ||
      file.content.match(/^##\s+(.+)$/m);

    if (nameMatch) {
      return nameMatch[1].trim();
    }
  }

  return null;
}

/**
 * Extract skill slugs from file contents.
 * Looks for skill installation commands, skill references, and skill list items.
 */
function extractSkillSlugs(rawText: string): string[] {
  const slugs = new Set<string>();

  // Match: npx clawhub@latest install <slug>
  const installMatches = rawText.matchAll(
    /clawhub[@\w]*\s+install\s+([\w-]+)/gi
  );
  for (const match of installMatches) {
    slugs.add(match[1].toLowerCase());
  }

  // Match: skill names in list format: - skill-name or * skill-name
  const listMatches = rawText.matchAll(
    /^[\s]*[-*]\s+([\w][\w-]{2,})\s*(?:$|[-—:])/gm
  );
  for (const match of listMatches) {
    const candidate = match[1].toLowerCase();
    // Filter out common non-skill words
    if (!COMMON_WORDS.has(candidate) && candidate.length > 2) {
      slugs.add(candidate);
    }
  }

  // Match: skill paths like skills/author/slug or ~/.openclaw/skills/slug
  const pathMatches = rawText.matchAll(/skills\/[\w-]+\/([\w-]+)/gi);
  for (const match of pathMatches) {
    slugs.add(match[1].toLowerCase());
  }

  return Array.from(slugs);
}

const COMMON_WORDS = new Set([
  "the",
  "and",
  "for",
  "that",
  "this",
  "with",
  "from",
  "are",
  "not",
  "you",
  "all",
  "can",
  "has",
  "will",
  "when",
  "use",
  "each",
  "make",
  "how",
  "been",
  "may",
  "its",
  "any",
  "who",
  "get",
  "also",
  "new",
  "one",
  "two",
  "see",
  "now",
  "way",
  "did",
  "yes",
  "run",
  "set",
  "try",
  "ask",
  "own",
  "say",
  "too",
  "does",
  "must",
  "just",
  "only",
  "then",
  "them",
  "into",
  "some",
  "than",
  "like",
  "more",
  "what",
  "todo",
  "note",
  "important",
  "example",
  "true",
  "false",
  "null",
  "none",
]);

/**
 * Count how many distinct tools/MCPs the agent references.
 */
function countTools(rawText: string): number {
  const toolRefs = new Set<string>();

  // MCP server references
  const mcpMatches = rawText.matchAll(
    /(?:mcp|server|tool)[-_\s]*["']?([\w-]+)["']?/gi
  );
  for (const match of mcpMatches) {
    toolRefs.add(match[1].toLowerCase());
  }

  // Count unique patterns
  let count = toolRefs.size;

  // Also count explicit tool lists
  const toolListMatch = rawText.match(/tools?:\s*\n((?:\s*[-*]\s+.+\n)+)/gi);
  if (toolListMatch) {
    for (const list of toolListMatch) {
      const items = list.match(/[-*]\s+/g);
      if (items) count = Math.max(count, items.length);
    }
  }

  return Math.min(count, 50); // Cap at 50 to prevent false inflation
}

// ── Keyword detection helpers ────────────────────────────────────────

function hasSecurityRules(text: string): boolean {
  const patterns = [
    /security/i,
    /\bblock\b.*\b(skill|install|prompt)\b/i,
    /\b(deny|reject|forbidden)\b/i,
    /prompt.?injection/i,
    /allowlist/i,
    /blocklist/i,
    /\bsandbox/i,
    /trust.*level/i,
    /\baudit\b/i,
  ];
  return patterns.some((p) => p.test(text));
}

function hasCronTasks(text: string): boolean {
  const patterns = [
    /\bcron\b/i,
    /heartbeat/i,
    /schedule[ds]?\s*(task|job|run)/i,
    /\bevery\s+\d+\s*(minute|hour|day|morning|evening)/i,
    /daily\s*(scan|check|run|task|report)/i,
    /at\s+\d{1,2}:\d{2}/i,
  ];
  return patterns.some((p) => p.test(text));
}

function hasMemorySystem(text: string): boolean {
  const patterns = [
    /memory\.md/i,
    /long.?term\s*memory/i,
    /persistent\s*memory/i,
    /\bremember\b.*\b(across|between|sessions)\b/i,
    /memory\s*(system|store|layer|bank)/i,
    /daily\s*persist/i,
  ];
  return patterns.some((p) => p.test(text));
}

function hasSubagentOrchestration(text: string): boolean {
  const patterns = [
    /sub.?agent/i,
    /\bswarm\b/i,
    /orchestrat/i,
    /multi.?agent/i,
    /agent.?fleet/i,
    /delegate.*agent/i,
    /spawn.*agent/i,
  ];
  return patterns.some((p) => p.test(text));
}

function hasMultiMachineSetup(text: string): boolean {
  const patterns = [
    /multi.?machine/i,
    /remote\s*(server|machine|host)/i,
    /\bssh\b.*\b(tunnel|connect|remote)\b/i,
    /distributed/i,
    /cross.?machine/i,
    /\btailnet\b/i,
    /\bcluster\b/i,
  ];
  return patterns.some((p) => p.test(text));
}

// ── Content Depth ────────────────────────────────────────────────────

function calculateContentDepth(
  totalLength: number,
  fileCount: number
): ContentDepth {
  // Minimal: single short file or very little content
  if (fileCount <= 1 && totalLength < 500) return "minimal";
  if (totalLength < 200) return "minimal";

  // Rich: multiple files with substantial content
  if (fileCount >= 4 || totalLength >= 5000) return "rich";

  // Moderate: everything in between
  return "moderate";
}

// ── Default Name Generation ──────────────────────────────────────────

/**
 * Generate a deterministic unique number from content hash.
 * Same input always produces the same number (1-999).
 */
function generateNameNumber(content: string): number {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0; // Convert to 32-bit integer
  }
  // Map to 1-999 range
  return (Math.abs(hash) % 999) + 1;
}

function resolveAgentName(
  extracted: { name: string; content: string }[],
  rawText: string
): string | null {
  const name = extractAgentName(extracted);
  if (name) return name;

  // Generate a deterministic fallback
  const num = generateNameNumber(rawText);
  return `Unknown #${String(num).padStart(3, "0")}`;
}

// ── Main parser ──────────────────────────────────────────────────────

/**
 * Parse uploaded files into a structured ParsedInput.
 * Runs client-side before the server call.
 */
export async function parseAgentFiles(files: File[]): Promise<ParsedInput> {
  const extracted = await extractFiles(files);

  // Concatenate all text with file markers
  const rawText = extracted
    .map((f) => `--- FILE: ${f.name} ---\n${f.content}`)
    .join("\n\n");

  const fileNames = extracted.map((f) => f.name);
  const skillSlugs = extractSkillSlugs(rawText);
  const agentName = resolveAgentName(extracted, rawText);
  const totalContentLength = extracted.reduce(
    (sum, f) => sum + f.content.length,
    0
  );
  const fileCount = extracted.length;

  return {
    agent_name: agentName,
    raw_text: rawText,
    file_names: fileNames,
    skill_slugs: skillSlugs,
    has_security_rules: hasSecurityRules(rawText),
    has_cron_tasks: hasCronTasks(rawText),
    has_memory_system: hasMemorySystem(rawText),
    has_subagent_orchestration: hasSubagentOrchestration(rawText),
    has_multi_machine_setup: hasMultiMachineSetup(rawText),
    tool_count: countTools(rawText),
    content_depth: calculateContentDepth(totalContentLength, fileCount),
    total_content_length: totalContentLength,
    file_count: fileCount,
  };
}


