/**
 * Image generation via Google Gemini (Nano Banana).
 *
 * Tries Nano Banana Pro first (production model), then falls back to
 * gemini-2.0-flash if quota is exceeded (free tier).
 */

// ── Model fallback chain ─────────────────────────────────────────────

const IMAGE_MODELS = [
  "nano-banana-pro-preview",  // Production: best image quality
  "gemini-2.0-flash",         // Fallback: free tier image generation
] as const;

// ── Gemini Image Generation ──────────────────────────────────────────

interface GeminiImageResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        inlineData?: {
          mimeType: string;
          data: string; // base64
        };
        text?: string;
      }>;
    };
  }>;
  error?: {
    message: string;
    code: number;
  };
}

async function tryGenerateWithModel(
  model: string,
  prompt: string,
  apiKey: string
): Promise<{ success: true; data: string } | { success: false; error: string; retryable: boolean }> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: prompt,
            },
          ],
        },
      ],
      generationConfig: {
        responseModalities: ["IMAGE", "TEXT"],
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    const isQuotaError = response.status === 429;
    return {
      success: false,
      error: `${model} returned ${response.status}: ${errorBody.slice(0, 300)}`,
      retryable: isQuotaError,
    };
  }

  const data: GeminiImageResponse = await response.json();

  if (data.error) {
    return {
      success: false,
      error: `${model}: ${data.error.message}`,
      retryable: data.error.code === 429,
    };
  }

  const candidates = data.candidates;
  if (!candidates || candidates.length === 0) {
    return { success: false, error: `${model}: No candidates in response`, retryable: false };
  }

  const parts = candidates[0].content?.parts;
  if (!parts || parts.length === 0) {
    return { success: false, error: `${model}: No parts in response`, retryable: false };
  }

  const imagePart = parts.find((part) => part.inlineData?.mimeType?.startsWith("image/"));
  if (!imagePart?.inlineData) {
    const textPart = parts.find((part) => part.text);
    return {
      success: false,
      error: `${model}: No image returned. ${textPart?.text ? `Model said: ${textPart.text.slice(0, 200)}` : ""}`,
      retryable: false,
    };
  }

  return { success: true, data: imagePart.inlineData.data };
}

// ── Public API ───────────────────────────────────────────────────────

export async function generateCardImage(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey.includes("PLACEHOLDER")) {
    throw new Error("GEMINI_API_KEY is not configured. Set it in .env.local");
  }

  const errors: string[] = [];

  for (const model of IMAGE_MODELS) {
    console.log(`[image-gen] Trying model: ${model}`);
    const result = await tryGenerateWithModel(model, prompt, apiKey);

    if (result.success) {
      console.log(`[image-gen] Success with model: ${model}`);
      return result.data;
    }

    console.warn(`[image-gen] ${result.error}`);
    errors.push(result.error);

    // If the error isn't retryable (not a quota issue), don't try fallbacks
    if (!result.retryable) {
      break;
    }

    console.log(`[image-gen] Quota exceeded, trying next model...`);
  }

  throw new Error(
    `All image models failed.\n${errors.join("\n")}`
  );
}
