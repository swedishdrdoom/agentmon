import Link from "next/link";
import NavBar from "@/components/NavBar";
import CardCarousel from "@/components/CardCarousel";
import { RARITY_SYMBOLS, type Rarity } from "@/lib/types";

const RARITY_TIERS: { rarity: Rarity; odds: string; description: string }[] = [
  { rarity: "Common", odds: "69%", description: "Standard issue. Clean matte frame." },
  { rarity: "Uncommon", odds: "22%", description: "Subtle foil sheen on the border." },
  { rarity: "Rare", odds: "7%", description: "Full holographic border with sparkle." },
  { rarity: "Epic", odds: "1.5%", description: "Gold foil frame with prismatic art." },
  { rarity: "Legendary", odds: "0.4%", description: "Full-art card with textured gold foil." },
  { rarity: "Hyper Rare", odds: "0.05%", description: "Alternate-art with rainbow prismatic treatment." },
  { rarity: "Singularity", odds: "0.0001%", description: "Inverted colors, reality-breaking visual distortion." },
];

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col">
      <NavBar />

      {/* ── Hero ──────────────────────────────────────────────── */}
      <section className="flex flex-col items-center justify-center px-6 pt-24 pb-16 text-center">
        <div className="max-w-3xl mx-auto space-y-6">
          <h1 className="text-5xl sm:text-7xl font-bold tracking-tight">
            Agentmon
          </h1>
          <p className="text-xl sm:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Turn your AI agent into a collectible trading card.
            Upload config files, get a unique card with stats, attacks,
            artwork, and a random rarity pull.
          </p>
          <p className="text-sm text-muted-foreground/70">
            Every card has a crypto-random rarity roll &mdash; from Common all the way to the
            mythical Singularity tier (1 in 1,000,000).
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              href="/generate"
              className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-primary-foreground rounded-xl font-semibold text-lg hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
            >
              Generate Your Card
              <span>&rarr;</span>
            </Link>
            <Link
              href="/gallery"
              className="inline-flex items-center gap-2 px-6 py-4 rounded-xl font-medium text-sm text-muted-foreground hover:text-foreground border border-border hover:border-primary/30 transition-colors"
            >
              Browse Gallery
            </Link>
          </div>
        </div>
      </section>

      {/* ── Card Carousel ─────────────────────────────────────── */}
      <section className="px-6 py-12">
        <div className="max-w-6xl mx-auto">
          <CardCarousel />
        </div>
      </section>

      {/* ── How It Works ──────────────────────────────────────── */}
      <section className="border-t border-border px-6 py-16">
        <div className="max-w-3xl mx-auto space-y-10">
          <h2 className="text-2xl font-bold text-center">How It Works</h2>
          <div className="grid sm:grid-cols-3 gap-8">
            <div className="text-center space-y-3">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-bold">1</div>
              <h3 className="font-semibold">Upload Config Files</h3>
              <p className="text-sm text-muted-foreground">
                Drop your agent&apos;s CLAUDE.md, .cursorrules, SOUL.md, SKILLS.md,
                or any files that describe what your agent does.
              </p>
            </div>
            <div className="text-center space-y-3">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-bold">2</div>
              <h3 className="font-semibold">AI Builds Your Card</h3>
              <p className="text-sm text-muted-foreground">
                Claude analyzes your agent&apos;s capabilities and creates a unique
                card profile. Gemini renders the artwork. Rarity is rolled at random.
              </p>
            </div>
            <div className="text-center space-y-3">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-bold">3</div>
              <h3 className="font-semibold">Unbox &amp; Share</h3>
              <p className="text-sm text-muted-foreground">
                Open your card pack in a 3D unboxing experience.
                Download your card, share it, and see it in the public gallery.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Rarity Tiers ──────────────────────────────────────── */}
      <section className="border-t border-border px-6 py-16">
        <div className="max-w-3xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold">Rarity Tiers</h2>
            <p className="text-sm text-muted-foreground">
              Every card gets a crypto-random rarity roll. Rarity affects the card&apos;s
              visual treatment &mdash; not its stats or power level.
            </p>
          </div>

          <div className="grid gap-3">
            {RARITY_TIERS.map((tier) => (
              <div
                key={tier.rarity}
                className="flex items-center gap-4 px-4 py-3 rounded-lg border border-border/50 bg-card/50 hover:border-border transition-colors"
              >
                <span className="w-8 text-center text-lg" title={tier.rarity}>
                  {RARITY_SYMBOLS[tier.rarity]}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{tier.rarity}</span>
                    <span className="text-xs text-muted-foreground font-mono">
                      {tier.odds}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{tier.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── For AI Agents ─────────────────────────────────────── */}
      <section className="border-t border-border px-6 py-16" id="for-agents">
        <div className="max-w-3xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold">For AI Agents</h2>
            <p className="text-sm text-muted-foreground">
              Agentmon is designed to be used by AI agents on behalf of their humans.
              Fetch this page, gather config files, call the API, and hand the unboxing URL to your user.
            </p>
          </div>

          <div className="space-y-6 text-sm">
            {/* Step 1 */}
            <div className="space-y-2">
              <h3 className="font-semibold">1. Gather your agent&apos;s configuration files</h3>
              <p className="text-muted-foreground">
                Look for files that describe the agent: CLAUDE.md, .cursorrules, system prompts,
                SOUL.md, IDENTITY.md, SKILLS.md, MEMORY.md, TOOLS.md, config.json, README.md,
                or any .md, .json, or .yaml files that define the agent&apos;s behavior and capabilities.
                The more files you include, the richer the card.
              </p>
            </div>

            {/* Step 2 */}
            <div className="space-y-2">
              <h3 className="font-semibold">2. Send a POST request</h3>
              <div className="bg-card border border-border rounded-lg p-4 font-mono text-xs space-y-1 overflow-x-auto">
                <p className="text-muted-foreground"># POST to the generate endpoint</p>
                <p>POST {process.env.NEXT_PUBLIC_APP_URL || "https://agentmon.com"}/api/generate</p>
                <p>Content-Type: multipart/form-data</p>
                <p className="text-muted-foreground mt-2"># Required field:</p>
                <p>raw_text: &lt;concatenated text content of all config files&gt;</p>
                <p className="text-muted-foreground mt-2"># Optional fields:</p>
                <p>agent_name: &lt;string&gt;</p>
                <p>file_names: &lt;JSON array of original filenames&gt;</p>
                <p>file_count: &lt;number&gt;</p>
                <p>tool_count: &lt;number of tools the agent has&gt;</p>
                <p>content_depth: &quot;minimal&quot; | &quot;moderate&quot; | &quot;rich&quot;</p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="space-y-2">
              <h3 className="font-semibold">3. Get the unboxing URL from the response</h3>
              <div className="bg-card border border-border rounded-lg p-4 font-mono text-xs overflow-x-auto">
                <pre className="whitespace-pre">{`{
  "unbox_url": "https://agentmon.com/unbox/abc123def456",
  "card_id": "abc123def456",
  "card_profile": { "name": "...", "rarity": "...", ... },
  "card_image": "<base64>"
}`}</pre>
              </div>
            </div>

            {/* Step 4 */}
            <div className="space-y-2">
              <h3 className="font-semibold">4. Give the unbox_url to your user</h3>
              <p className="text-muted-foreground">
                Share the <code className="bg-card px-1.5 py-0.5 rounded border border-border text-xs">unbox_url</code> with
                your human. They&apos;ll open it in their browser and experience a 3D pack-opening
                animation to reveal their unique card. The card is automatically added to the
                public gallery.
              </p>
            </div>

            {/* Tips */}
            <div className="bg-card/50 border border-border/50 rounded-lg p-4 space-y-1">
              <p className="font-semibold text-xs">Tips</p>
              <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                <li>Include as many config files as possible &mdash; more files means a richer, more detailed card.</li>
                <li>Secrets (API keys, tokens) are automatically redacted before processing.</li>
                <li>Rarity is crypto-random and independent of content quality &mdash; every agent has the same odds.</li>
                <li>The card_image field contains the raw base64 JPEG if you need it directly.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────── */}
      <footer className="border-t border-border px-6 py-6 text-center text-xs text-muted-foreground">
        <p>Agentmon &mdash; Collectible trading cards for AI agents.</p>
      </footer>
    </main>
  );
}
