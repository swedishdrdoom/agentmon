import Link from "next/link";

const EXAMPLE_TYPES = [
  { icon: "🛡️", type: "Steel", name: "Sentinel", hp: 160, rarity: "Secret Rare" },
  { icon: "⚡", type: "Electric", name: "Sparkline", hp: 120, rarity: "Rare" },
  { icon: "🐉", type: "Dragon", name: "Orchestron", hp: 180, rarity: "Ultra Rare" },
  { icon: "👻", type: "Ghost", name: "Shade", hp: 100, rarity: "Uncommon" },
];

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col">
      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 py-24 text-center">
        <div className="max-w-2xl mx-auto space-y-8">
          <div className="space-y-4">
            <h1 className="text-5xl sm:text-6xl font-bold tracking-tight">
              Agentmon <span className="text-2xl sm:text-3xl text-muted-foreground font-normal">v1.3</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-lg mx-auto">
              Upload your AI agent&apos;s markdown files and get a unique,
              collectible trading card.
            </p>
          </div>

          <Link
            href="/generate"
            className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-primary-foreground rounded-xl font-semibold text-lg hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
          >
            Generate Your Card
            <span>-&gt;</span>
          </Link>

          {/* Example cards preview */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-8">
            {EXAMPLE_TYPES.map((card) => (
              <div
                key={card.name}
                className="bg-card border border-border rounded-xl p-4 text-left hover:border-primary/30 transition-colors"
              >
                <div className="text-2xl mb-2">{card.icon}</div>
                <p className="font-bold text-sm">{card.name}</p>
                <p className="text-xs text-muted-foreground">{card.type}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-red-400 font-medium">
                    {card.hp} HP
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {card.rarity}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-border px-6 py-16">
        <div className="max-w-2xl mx-auto space-y-8">
          <h2 className="text-2xl font-bold text-center">How It Works</h2>
          <div className="grid sm:grid-cols-3 gap-6">
            <div className="text-center space-y-2">
              <div className="text-3xl">1</div>
              <h3 className="font-semibold">Upload Files</h3>
              <p className="text-sm text-muted-foreground">
                Drop your agent&apos;s SOUL.md, IDENTITY.md, SKILLS.md, and
                other config files.
              </p>
            </div>
            <div className="text-center space-y-2">
              <div className="text-3xl">2</div>
              <h3 className="font-semibold">AI Analyzes</h3>
              <p className="text-sm text-muted-foreground">
                Claude reads your agent&apos;s files and creates a unique card
                profile with stats, attacks, and flavor text.
              </p>
            </div>
            <div className="text-center space-y-2">
              <div className="text-3xl">3</div>
              <h3 className="font-semibold">Get Your Card</h3>
              <p className="text-sm text-muted-foreground">
                A complete trading card image is generated with portrait, frame,
                stats, and holographic effects.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-6 text-center text-xs text-muted-foreground">
        <p>
          Agentmon &mdash; Collectible trading cards for AI agents.
        </p>
      </footer>
    </main>
  );
}
