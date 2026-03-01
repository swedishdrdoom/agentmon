import Link from "next/link";

export default function NavBar() {
  return (
    <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
      <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-3">
        <Link href="/" className="font-bold text-lg tracking-tight">
          Agentmon
        </Link>
        <div className="flex items-center gap-6 text-sm">
          <Link
            href="/generate"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Generate
          </Link>
          <Link
            href="/gallery"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Gallery
          </Link>
        </div>
      </div>
    </nav>
  );
}
