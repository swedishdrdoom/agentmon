/**
 * Shared form data parser for the generate route endpoints.
 * Extracts all standard fields from the multipart form data.
 */

import type { ContentDepth } from "./types";

export interface ParsedFormData {
  rawText: string | null;
  fileNames: string[];
  skillSlugs: string[];
  agentName: string | null;
  hasSecurityRules: boolean;
  hasCronTasks: boolean;
  hasMemorySystem: boolean;
  hasSubagentOrchestration: boolean;
  hasMultiMachineSetup: boolean;
  toolCount: number;
  contentDepth: ContentDepth;
  totalContentLength: number;
  fileCount: number;
  forceRarity: string | null;
}

export function parseGenerateFormData(formData: FormData): ParsedFormData {
  return {
    rawText: formData.get("raw_text") as string | null,
    fileNames: JSON.parse((formData.get("file_names") as string) || "[]"),
    skillSlugs: JSON.parse((formData.get("skill_slugs") as string) || "[]"),
    agentName: formData.get("agent_name") as string | null,
    hasSecurityRules: formData.get("has_security_rules") === "true",
    hasCronTasks: formData.get("has_cron_tasks") === "true",
    hasMemorySystem: formData.get("has_memory_system") === "true",
    hasSubagentOrchestration: formData.get("has_subagent_orchestration") === "true",
    hasMultiMachineSetup: formData.get("has_multi_machine_setup") === "true",
    toolCount: parseInt((formData.get("tool_count") as string) || "0", 10),
    contentDepth: ((formData.get("content_depth") as string) || "moderate") as ContentDepth,
    totalContentLength: parseInt((formData.get("total_content_length") as string) || "0", 10),
    fileCount: parseInt((formData.get("file_count") as string) || "0", 10),
    forceRarity: formData.get("force_rarity") as string | null,
  };
}
