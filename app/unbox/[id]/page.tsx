import { notFound } from "next/navigation";
import { getCard } from "@/lib/db";
import NavBar from "@/components/NavBar";
import UnboxExperience from "@/components/UnboxExperience";
import type { Metadata } from "next";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const card = await getCard(id);

  if (!card) {
    return { title: "Card Not Found - Agentmon" };
  }

  return {
    title: `${card.name} - Agentmon Card`,
    description: `${card.name}, a ${card.rarity} ${card.primary_type}-type Agentmon card with ${card.hp} HP.`,
    openGraph: {
      title: `${card.name} - Agentmon Card`,
      description: `${card.name}, a ${card.rarity} ${card.primary_type}-type Agentmon card with ${card.hp} HP.`,
      images: card.image_url ? [{ url: card.image_url }] : [],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${card.name} - Agentmon Card`,
      description: `A ${card.rarity} ${card.primary_type}-type Agentmon card.`,
      images: card.image_url ? [card.image_url] : [],
    },
  };
}

export default async function UnboxPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const sp = await searchParams;
  const card = await getCard(id);

  if (!card) {
    notFound();
  }

  const skipUnboxing = sp.revealed === "true";

  return (
    <>
      {/* Nav stays on top of the full-screen canvas */}
      <div className="fixed top-0 left-0 right-0 z-50">
        <NavBar />
      </div>
      <UnboxExperience card={card} skipToReveal={skipUnboxing} />
    </>
  );
}
