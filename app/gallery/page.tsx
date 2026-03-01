import NavBar from "@/components/NavBar";
import GalleryGrid from "@/components/GalleryGrid";
import GalleryFilters from "@/components/GalleryFilters";
import { listCards } from "@/lib/db";
import { RARITIES, CARD_TYPES, type Rarity, type CardType } from "@/lib/types";

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function GalleryPage({ searchParams }: PageProps) {
  const sp = await searchParams;

  const page = Math.max(parseInt((sp.page as string) || "1", 10), 1);
  const limit = 24;
  const offset = (page - 1) * limit;

  const rarityParam = sp.rarity as string | undefined;
  const typeParam = sp.type as string | undefined;

  const rarity =
    rarityParam && (RARITIES as readonly string[]).includes(rarityParam)
      ? (rarityParam as Rarity)
      : undefined;

  const type =
    typeParam && (CARD_TYPES as readonly string[]).includes(typeParam)
      ? (typeParam as CardType)
      : undefined;

  const { cards, total } = await listCards({ limit, offset, rarity, type });
  const totalPages = Math.ceil(total / limit);

  return (
    <main className="min-h-screen flex flex-col">
      <NavBar />

      <section className="flex-1 px-6 py-12">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold">Gallery</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {total} {total === 1 ? "card" : "cards"} generated
              </p>
            </div>
            <GalleryFilters
              currentRarity={rarity}
              currentType={type}
            />
          </div>

          {cards.length > 0 ? (
            <GalleryGrid cards={cards} />
          ) : (
            <div className="text-center py-24 text-muted-foreground">
              <p className="text-lg">No cards yet.</p>
              <p className="text-sm mt-2">
                Be the first &mdash;{" "}
                <a href="/generate" className="text-primary underline">
                  generate a card
                </a>
                .
              </p>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              {page > 1 && (
                <a
                  href={buildGalleryUrl(page - 1, rarity, type)}
                  className="px-4 py-2 border border-border rounded-lg text-sm hover:bg-muted transition-colors"
                >
                  Previous
                </a>
              )}
              <span className="text-sm text-muted-foreground px-4">
                Page {page} of {totalPages}
              </span>
              {page < totalPages && (
                <a
                  href={buildGalleryUrl(page + 1, rarity, type)}
                  className="px-4 py-2 border border-border rounded-lg text-sm hover:bg-muted transition-colors"
                >
                  Next
                </a>
              )}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function buildGalleryUrl(page: number, rarity?: Rarity, type?: CardType): string {
  const params = new URLSearchParams();
  if (page > 1) params.set("page", String(page));
  if (rarity) params.set("rarity", rarity);
  if (type) params.set("type", type);
  const qs = params.toString();
  return `/gallery${qs ? `?${qs}` : ""}`;
}
