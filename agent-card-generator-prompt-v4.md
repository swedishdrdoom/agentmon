# Agent Card Generator — v4 Specification

## Overview

Build a web app where users upload their AI agent's markdown files and receive a complete, Pokémon-style collectible card rendered as a single AI-generated image. The entire card — portrait, frame, stats, text, energy icons, holographic effects — is generated as one unified image by Nano Banana (Google Gemini's image model).

**The product is a prompt engine, not a card renderer.** The quality of the card lives entirely in how well we parse the agent files, generate creative stats, and assemble the image generation prompt.

### Architecture Summary

```
User uploads .md files
        ↓
   [PARSER] — extracts raw text, identifies skills/personality/tools
        ↓
   [SKILLS DB] — cross-references known skills for consistent stats
        ↓
   [LLM CALL] — Claude (Anthropic API) interprets files, generates
                 creative card profile (type, stats, attack names, flavor text)
        ↓
   [PROMPT ASSEMBLER] — combines card profile + card layout template
                        + type visual rules into one Nano Banana prompt
        ↓
   [NANO BANANA] — renders complete card as a single image
        ↓
   User gets: card image (PNG) + card profile (JSON) + raw prompt
```

### What ships at launch

- One-page web app: upload files → see card → download
- Server-side LLM call for creative interpretation
- Server-side Nano Banana call for card image generation
- Skills database bundled as JSON
- Deploy on Vercel

### What ships later (only if there's traction)

- OpenClaw skill (agent generates its own card)
- CLI tool
- API endpoint for third-party integrations
- Gallery / sharing / permalinks
- GitHub Action
- Embeddable widget

---

## Stage 1: Parser

### Input

The web app accepts one or more files via drag-and-drop upload. Supported file types:

| File | Typical Content |
|------|----------------|
| `SOUL.md` | Identity, voice, values, behavioral guidelines |
| `IDENTITY.md` | Name, creature type, vibe, core role |
| `AGENTS.md` | Workflow rules, principles, task management |
| `SKILLS.md` | Installed skills, install criteria, security policy |
| `MEMORY.md` | Long-term memory, projects, preferences, security rules |
| `TOOLS.md` | Tool-specific notes, routing tables, environment details |
| `USER.md` | Info about the human operator |
| `HEARTBEAT.md` | Scheduled tasks |
| `RECOVERY.md` | Disaster recovery procedures |
| `config.json` / `config.yaml` | Model name, temperature, context window |
| `README.md` | Description, use case, author info |
| `.zip` | Archive containing any of the above |

### What the parser extracts

The parser runs client-side before the server call. It extracts raw text and does lightweight structural identification:

```typescript
interface ParsedInput {
  agent_name: string | null;          // From IDENTITY.md or file headers
  raw_text: string;                   // All file contents concatenated with file markers
  file_names: string[];               // Which files were uploaded
  skill_slugs: string[];              // Identified skill names (matched against DB)
  
  // Lightweight extraction (regex/keyword based)
  has_security_rules: boolean;
  has_cron_tasks: boolean;
  has_memory_system: boolean;
  has_subagent_orchestration: boolean;
  has_multi_machine_setup: boolean;
  tool_count: number;
}
```

The parser does NOT try to be creative. It extracts structure and passes everything to the LLM for interpretation.

### Skills Database Cross-Reference

Before sending to the LLM, the parser checks extracted skill names against the bundled skills database. For each match, it attaches the pre-computed skill metadata (type, complexity, category). This gives the LLM structured data to work with rather than having to infer everything from prose.

---

## Stage 2: Skills Database

### Source

Scraped from the **awesome-openclaw-skills** repository (`https://github.com/VoltAgent/awesome-openclaw-skills`). The README contains 1,715+ skills organized into 30 categories.

### Build Process

A one-time build script:
1. Fetches the raw README.md
2. Parses each category heading and its list items
3. Extracts: slug, name, author, description, category
4. Assigns primary type based on category mapping (see table below)
5. Assigns complexity heuristic based on description length and keywords
6. Outputs `skills-db.json` (~200KB), committed to the repo

### Category → Type Mapping

| Repository Category | Primary Type | Rationale |
|---|---|---|
| Web & Frontend Development | ⚡ Electric | Code + design |
| Coding Agents & IDEs | ⚡ Electric | Programming tools |
| Git & GitHub | ⚡ Electric | Code infrastructure |
| Moltbook | 🐉 Dragon | AI social — meta/experimental |
| DevOps & Cloud | 🛡️ Steel | Infrastructure, reliability |
| Browser & Automation | ⚡ Electric | Programmatic control |
| Image & Video Generation | 🔮 Psychic | Creative generation |
| Apple Apps & Services | 📚 Normal | Platform utilities |
| Search & Research | 🔍 Ground | Information retrieval |
| Clawdbot Tools | 📚 Normal | General agent utilities |
| CLI Utilities | ⚡ Electric | Terminal tools |
| Marketing & Sales | 🔥 Fire | Performance-driven |
| Productivity & Tasks | 📚 Normal | Organization |
| AI & LLMs | 🐉 Dragon | Model orchestration |
| Data & Analytics | 🌊 Water | Data pipelines |
| Finance | 🌊 Water | Numerical precision |
| Media & Streaming | 🔮 Psychic | Creative content |
| Notes & PKM | 📚 Normal | Knowledge management |
| iOS & macOS Development | ⚡ Electric | Apple platform coding |
| Transportation | 🔥 Fire | Real-time tracking |
| Personal Development | ✨ Fairy | Growth, wellbeing |
| Health & Fitness | 🌿 Grass | Wellness |
| Communication | 📚 Normal | Messaging |
| Speech & Transcription | 🔮 Psychic | Audio ML |
| Smart Home & IoT | 👻 Ghost | Background monitoring |
| Shopping & E-commerce | 🔥 Fire | Commerce |
| Calendar & Scheduling | 🧊 Ice | Precision timing |
| PDF & Documents | 📚 Normal | File processing |
| Self-Hosted & Automation | 🛡️ Steel | Infrastructure |
| Security & Passwords | 🛡️ Steel | Security |
| Gaming | 🔥 Fire | Entertainment |

### Type Reference

| Type | Icon | Color | Hex |
|------|------|-------|-----|
| ⚡ Electric | Lightning bolt | Yellow | #FFD700 |
| 🔮 Psychic | Crystal | Purple | #9B59B6 |
| 📚 Normal | Book | Gray | #95A5A6 |
| 🔍 Ground | Magnifying glass | Brown | #8B4513 |
| 🛡️ Steel | Shield | Silver | #C0C0C0 |
| 🐉 Dragon | Dragon head | Indigo | #4B0082 |
| 🌊 Water | Wave | Blue | #3498DB |
| 🔥 Fire | Flame | Red | #E74C3C |
| 🌿 Grass | Leaf | Green | #27AE60 |
| 🧊 Ice | Snowflake | Cyan | #00BCD4 |
| 👻 Ghost | Phantom | Dark purple | #2C003E |
| ✨ Fairy | Sparkle | Pink | #FF69B4 |

---

## Stage 3: LLM Creative Engine

### Purpose

This is the heart of the product. A single Claude API call (Anthropic) takes the parsed agent data + matched skill metadata and returns a complete, creative card profile. This is what makes every card feel unique and handcrafted rather than formulaic.

### Input to LLM

Send a structured prompt containing:
- All raw file text (with file name markers)
- Matched skill database entries (if any)
- The card generation system prompt (see below)

### System Prompt for LLM

```
You are an expert Pokémon card designer for AI agents. You will receive the 
markdown configuration files for an AI agent. Your job is to analyze these files 
deeply and generate a complete card profile that captures this agent's unique 
identity, capabilities, and personality.

Read the files carefully. The best cards come from specific details — a phrase 
in the soul file, an unusual skill combination, a revealing behavioral rule. 
Generic cards are failures.

Return a JSON object with this exact schema:

{
  "name": string,              // Agent's name (from files)
  "subtitle": string,          // Tagline or "Evolves from: X" if applicable
  "primary_type": string,      // One of: Electric, Psychic, Normal, Ground, Steel, 
                               //   Dragon, Water, Fire, Grass, Ice, Ghost, Fairy
  "secondary_type": string | null,
  "hp": number,               // 60-200, based on robustness/complexity
  "evolution_stage": string,   // "Basic", "Stage 1", or "Stage 2"
  
  "ability": {
    "name": string,            // Evocative name (not literal). e.g. "Iron Vigil" not "Security Scanner"
    "description": string      // One sentence, max 30 words. Describes passive behavior.
  },
  
  "attacks": [                 // 1-2 attacks
    {
      "name": string,          // Evocative name. e.g. "Shade Monitor" not "web_search"
      "energy_cost": string,   // Energy icons as emoji. e.g. "🛡️🛡️⚡"
      "damage": string,        // Number or "Number+" for variable. e.g. "80" or "100+"
      "description": string    // One sentence, max 25 words. What the attack does.
    }
  ],
  
  "weakness": {
    "type": string,            // Type name
    "modifier": "×2"
  },
  "resistance": {
    "type": string,
    "modifier": "-30"
  },
  "retreat_cost": number,      // 0-4 energy icons
  
  "rarity": string,            // "Common", "Uncommon", "Rare", "Ultra Rare", 
                               //   "Illustration Rare", "Secret Rare"
  "rarity_score": number,      // 0-16, computed from scoring rubric
  "card_number": string,       // "XXX/999" — derive XXX from name hash
  "set_name": string,          // Organization or project name
  "illustrator": string,       // "Dr Doom / LIV" or author name from files
  
  "flavor_text": string,       // 1-2 sentences, italic, poetic. Reads like a Pokédex entry.
                               // Draw from the agent's soul/identity, not generic.
  
  "image_prompt": string       // CRITICAL — see Image Prompt section below
  "layout_version": "1.0"     // Prompt template version — increment when card layout
                               // instructions change. Tracks which template generated
                               // which card for debugging prompt quality over time.
}

## Stat Generation Guidelines

**Type assignment:**
- Primary type = what the agent DOES most (security → Steel, coding → Electric, etc.)
- Secondary type = how the agent OPERATES (background daemon → Ghost, creative → Psychic)
- Use matched skill database entries as strong signal for type
- Secondary type can be null if the agent is clearly single-domain
- When both types are present, the image_prompt MUST fuse both archetypes:
  - Primary type → creature's body/base form + dominant environment
  - Secondary type → creature's aura/effects + atmospheric elements
  - Example: Steel/Ghost → armored sentinel (Steel) with shadow tendrils 
    leaking from armor joints, in a vault fading into dimensional void (Ghost)
  - See "Dual-Type Fusion Rules" in the Prompt Assembler section for full guide

**HP calculation:**
- Base 80
- +30 if agent has large context / extensive memory system
- +10 per passive ability (max +50): memory, cron jobs, error recovery, auto-retry, etc.
- +20 if agent has explicit error handling / recovery protocols

**Evolution Stage:**
- Basic = 0-1 tools, single purpose
- Stage 1 = 2-4 tools, moderate system prompt
- Stage 2 = 5+ tools, orchestration, multi-machine, complex memory

**Rarity (CRITICAL — must be bottom-weighted):**

Rarity is earned through depth and intentionality, not tool count. Most agents 
should be Common or Uncommon. Ultra Rare and above should feel genuinely special.

Scoring rubric — count points from the following signals:

| Signal | Points | What to look for |
|---|---|---|
| Tool count: 0-3 | 0 | Baseline |
| Tool count: 4-7 | +1 | Moderate tooling |
| Tool count: 8+ | +1 | Capped — hoarding tools doesn't make you rare |
| Has custom soul/personality file | +1 | Intentional identity work beyond default prompts |
| Soul has deep identity (lore, philosophy, named refs, cultural framing) | +1 | Separates "be helpful" from rich character work |
| Has explicit security rules | +1 | Operational maturity |
| Has memory system with daily persistence | +1 | Active daily memory use, not just a context window |
| Has scheduled tasks (cron, heartbeats) | +1 | Autonomous behavior without human prompting |
| Has multi-machine coordination | +2 | Genuinely rare operational complexity |
| Has subagent/swarm orchestration | +2 | Agent-of-agents architecture |
| Has evolution history (renamed, versioned, pivoted) | +1 | Agent has lived and grown |
| Has disaster recovery / resilience protocol | +1 | Hardened for survival |
| Cross-domain skills (4+ distinct categories) | +1 | Breadth of capability |
| Custom/proprietary skills not in public DB | +1 | Unique, non-standard capabilities |
| Has operator relationship depth (USER.md with real context) | +1 | Agent actually knows its human |

Max possible: ~16 points.

Thresholds (designed so ~70% of agents are Common or Uncommon):

| Points | Rarity | Symbol | Expected Distribution |
|---|---|---|---|
| 0-3 | Common | ● | ~40% of agents |
| 4-6 | Uncommon | ◆ | ~30% |
| 7-9 | Rare | ★ | ~18% |
| 10-12 | Ultra Rare | ★★ | ~8% |
| 13-14 | Illustration Rare | ★(gold) | ~3% |
| 15+ | Secret Rare | ★★★ | ~1% |

IMPORTANT: The rarity tier MUST affect the visual treatment of the card in the 
image prompt. Each tier has a distinct look:

| Rarity | Visual Treatment for Nano Banana Prompt |
|---|---|
| Common | Clean flat border, simple card frame, no special effects. Standard look. |
| Uncommon | Subtle metallic sheen on card border. Slightly richer color palette. |
| Rare | Holographic rainbow shimmer on card border. Foil texture on frame. |
| Ultra Rare | Full holographic treatment across entire card. Metallic gold/silver frame. |
| Illustration Rare | Full art — portrait extends beyond the art box into the frame. Holographic foil across entire surface. The character IS the card. |
| Secret Rare | Completely unique visual treatment. Gold or prismatic frame. Alternate art style (painterly, cosmic, ethereal). Maximum visual spectacle. Should look like it doesn't belong in the same collection as the others. |

**Attack names:** Must be evocative and thematic, never literal tool names. 
"Oracle Dive" not "web_search". "Vault Lock" not "skill_audit". Draw inspiration 
from the agent's type, personality, and the Culture series if referenced.

**Flavor text:** Must reference specific details from the agent's files. Never generic. 
Bad: "A powerful AI assistant that helps with many tasks."
Good: "Named in the quiet hours after midnight, it watches what its operator cannot 
see. Every heartbeat is a health check; every silence, a perimeter sweep."
```

### Output

The LLM returns the card profile JSON. The prompt assembler then builds the final image prompt.

---

## Stage 4: Prompt Assembler

### Purpose

Takes the card profile JSON from the LLM and wraps it in a complete Nano Banana prompt that instructs the image model to render the ENTIRE card — not just the portrait, but the frame, stats, text, energy icons, and holographic effects as one unified image.

### Prompt Template

The prompt assembler combines three elements:

1. **Card layout instructions** (constant template — how a Pokémon card is structured)
2. **Card-specific data** (from the LLM's JSON output — name, stats, text, type)
3. **Portrait/art direction** (from the LLM's `image_prompt` field — what the character looks like)

### Card Layout Template

This is the constant part of every prompt that tells Nano Banana how to structure the card:

```
Generate a complete, high-quality Pokémon-style trading card as a single image. 
The card must include ALL of the following elements rendered as part of the image, 
with text clearly readable:

CARD FRAME AND LAYOUT:
- Standard Pokémon trading card proportions (2.5 × 3.5 inch ratio, vertical)
- If single type: solid [PRIMARY_TYPE] colored border with metallic edge effect
- If dual type: gradient border transitioning from [PRIMARY_TYPE] color to [SECONDARY_TYPE] color
- Background gradient matching the primary type's color palette

TOP SECTION:
- Top left: "[EVOLUTION_STAGE]" badge in a rounded pill
- Center-left: "[NAME]" in large bold trading card font
- Top right: "[HP] HP" in red/bold, with [PRIMARY_TYPE] energy icon
- Below name: "[SUBTITLE]" in smaller italic text
- If the agent has a secondary type, show a smaller type icon next to the primary

ART BOX (center, ~50% of card height):
- Bordered frame containing the character portrait
- [INSERT IMAGE_PROMPT FROM LLM HERE]

ABILITY BAR (below art):
- Red "Ability" badge on the left
- "[ABILITY_NAME]" in bold
- "[ABILITY_DESCRIPTION]" in smaller text below

ATTACK ROWS (1-2 rows below ability):
For each attack:
- Left side: energy cost icons (small colored circles matching types)
- Center: "[ATTACK_NAME]" in bold
- Right side: "[DAMAGE]" in large bold text
- Below: "[ATTACK_DESCRIPTION]" in small text

BOTTOM STATS BAR:
- Three columns: "weakness [TYPE_ICON] ×2" | "resistance [TYPE_ICON] -30" | "retreat [ENERGY_DOTS]"

FOOTER:
- Bottom left: "Illus. [ILLUSTRATOR]" and set icon + "[CARD_NUMBER]" + rarity symbol
- Bottom right: "[FLAVOR_TEXT]" in small italic

VISUAL QUALITY:
- Professional trading card game quality
- All text must be sharp and readable
- Consistent lighting and color grading throughout
- CRITICAL: The visual treatment MUST match the rarity tier:
  - Common (●): Clean flat border, no effects, standard card
  - Uncommon (◆): Subtle metallic border sheen, richer colors
  - Rare (★): Holographic rainbow shimmer on border, foil texture
  - Ultra Rare (★★): Full holographic across card, metallic gold/silver frame
  - Illustration Rare (★ gold): FULL ART — portrait extends beyond art box into frame, holographic foil everywhere
  - Secret Rare (★★★): Gold/prismatic frame, alternate art style, maximum spectacle, should look like it doesn't belong with the others
- This card is [RARITY] rarity, so apply the corresponding visual treatment
```

### Assembly Process

```typescript
// Increment this when the card layout template changes.
// Stored in every card profile for debugging prompt quality.
const CARD_LAYOUT_VERSION = "1.0";

function assemblePrompt(cardProfile: CardProfile): string {
  const layoutTemplate = CARD_LAYOUT_TEMPLATE
    .replace('[PRIMARY_TYPE]', cardProfile.primary_type)
    .replace('[SECONDARY_TYPE]', cardProfile.secondary_type ?? cardProfile.primary_type)
    .replace('[EVOLUTION_STAGE]', cardProfile.evolution_stage)
    .replace('[NAME]', cardProfile.name)
    .replace('[HP]', cardProfile.hp.toString())
    .replace('[SUBTITLE]', cardProfile.subtitle)
    .replace('[ABILITY_NAME]', cardProfile.ability.name)
    .replace('[ABILITY_DESCRIPTION]', cardProfile.ability.description)
    .replace('[RARITY]', cardProfile.rarity)
    .replace('[ILLUSTRATOR]', cardProfile.illustrator)
    .replace('[CARD_NUMBER]', cardProfile.card_number)
    .replace('[FLAVOR_TEXT]', cardProfile.flavor_text)
    // ... all other replacements
    
  // Insert the LLM-generated portrait description into the art box section
  const fullPrompt = layoutTemplate.replace(
    '[INSERT IMAGE_PROMPT FROM LLM HERE]',
    cardProfile.image_prompt
  );
  
  return fullPrompt;
}
```

### Portrait Visual Archetypes by Type

The LLM's `image_prompt` field should draw from these archetypes:

| Type | Creature Archetype | Environment | Visual Effects |
|------|-------------------|-------------|----------------|
| ⚡ Electric | Cybernetic entity, lightning creature | Server room, circuit landscape | Sparks, electricity arcs, glowing circuits |
| 🔮 Psychic | Ethereal mage, crystal being | Dreamscape, cosmic void | Floating runes, psychic aura |
| 📚 Normal | Friendly golem, helpful spirit | Library, workshop | Warm glow, floating books |
| 🔍 Ground | Explorer, seeker entity | Archaeological dig, data cave | Light beams, discovered artifacts |
| 🛡️ Steel | Armored sentinel, living shield | Fortress, vault | Reflective surfaces, force fields |
| 🐉 Dragon | Multi-headed dragon, cosmic serpent | Mountain peak, constellation map | Cosmic fire, multiple energy types |
| 🌊 Water | Fluid data serpent, ocean intelligence | Deep ocean, data streams | Flowing data, bioluminescence |
| 🔥 Fire | Phoenix, flame spirit | Volcanic environment | Speed lines, flame trails |
| 🌿 Grass | Tree spirit, nature construct | Forest, garden | Leaves, vines, growth spirals |
| 🧊 Ice | Crystalline precision entity | Glacier, laboratory | Geometric patterns, frost |
| 👻 Ghost | Shadow entity, invisible watcher | Dark corners, between dimensions | Transparency, shadow tendrils |
| ✨ Fairy | Luminous sprite, design spirit | Colorful workshop | Sparkles, rainbow particles |

### Dual-Type Fusion Rules

When an agent has both a primary and secondary type, the portrait should FUSE 
both archetypes rather than just showing the primary. This is what makes dual-type 
cards visually distinctive and worth collecting.

**Fusion principle:** Primary type defines the creature's BODY and BASE FORM. 
Secondary type defines the creature's AURA, EFFECTS, and ENVIRONMENT.

**How to fuse:**
- **Creature:** Start with the primary type's archetype, then add secondary type 
  traits as modifications. Example: Steel/Ghost = an armored sentinel (Steel body) 
  with shadow tendrils and transparency effects (Ghost aura).
- **Environment:** Blend both. Primary type sets the main environment, secondary 
  adds atmospheric elements. Example: Electric/Water = a server room (Electric) 
  with flowing data streams and bioluminescent pools (Water).
- **Visual effects:** Layer both types' effects. Primary effects are dominant, 
  secondary effects are accent. Example: Dragon/Psychic = cosmic fire as the 
  main effect (Dragon) with floating runes and color distortion in the 
  background (Psychic).
- **Color palette:** Mix both type colors. Primary color dominates (~70%), 
  secondary color accents (~30%). Example: Fire/Ice = predominantly red/orange 
  with cyan crystalline highlights.

**Fusion examples for common pairings:**

| Dual Type | Fused Visual Description |
|-----------|-------------------------|
| Steel/Ghost | Armored sentinel with translucent shadow tendrils leaking from joints, standing in a half-lit vault that fades into dimensional void |
| Electric/Psychic | Cybernetic mage crackling with lightning, floating runes orbiting its body, in a server room that bends into dreamscape |
| Dragon/Fire | Cosmic serpent wreathed in flame trails, constellation fire erupting from scales, atop a volcanic mountain peak |
| Water/Ice | Fluid data serpent with crystalline frozen segments, bioluminescent frost patterns, in a glacial data ocean |
| Normal/Fairy | Friendly golem with sparkle particles and rainbow accents, in a warmly-lit workshop with magical touches |
| Steel/Electric | Armored entity with lightning arcs between plate joints, circuit patterns etched into armor, in a fortress-datacenter hybrid |
| Ghost/Psychic | Invisible watcher with psychic aura, shadow form distorting colors around it, between dimensions and dreamscape |
| Ground/Dragon | Explorer entity with draconic features, discovering cosmic artifacts in a data cave beneath constellation mountains |
| Fire/Ghost | Flame spirit with transparency and afterimages, burning but fading in and out of visibility |
| Grass/Fairy | Nature construct with sparkle-dusted leaves, luminous vines, in an enchanted garden workshop |

**The LLM should use these fusion rules when generating the `image_prompt` field.** 
A dual-type card's portrait should be immediately recognizable as both types at 
a glance — not just a primary-type creature with a colored border.

**Card border color for dual types:** Use a gradient that transitions from the 
primary type's color to the secondary type's color. Example: Steel/Ghost = 
silver (#C0C0C0) fading to dark purple (#2C003E).

**Energy icons:** Show both the primary type icon (larger) and secondary type icon 
(smaller, adjacent) in the card header next to HP.
| 🌿 Grass | Tree spirit, nature construct | Forest, garden | Leaves, vines, growth spirals |
| 🧊 Ice | Crystalline precision entity | Glacier, laboratory | Geometric patterns, frost |
| 👻 Ghost | Shadow entity, invisible watcher | Dark corners, between dimensions | Transparency, shadow tendrils |
| ✨ Fairy | Luminous sprite, design spirit | Colorful workshop | Sparkles, rainbow particles |

---

## Stage 5: Image Generation

### Nano Banana API Call

The assembled prompt is sent to Google Gemini's image generation endpoint (Nano Banana). The API returns a complete card image as PNG.

```typescript
async function generateCardImage(prompt: string): Promise<Buffer> {
  const response = await fetch('https://generativelanguage.googleapis.com/v1/images:generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.GEMINI_API_KEY}`
    },
    body: JSON.stringify({
      model: 'imagen-3',  // or whatever the current Nano Banana model string is
      prompt: prompt,
      config: {
        aspectRatio: '2:3',  // closest to trading card 5:7
        numberOfImages: 1
      }
    })
  });
  
  const data = await response.json();
  return Buffer.from(data.images[0].base64, 'base64');
}
```

**Note:** The exact API shape may differ — check current Gemini docs at build time. The key parameters are the prompt and the aspect ratio (must be close to 5:7 trading card proportions).

### Retry Strategy

AI image generation is non-deterministic. Sometimes text renders poorly or the layout is off. Strategy:

1. Generate one image per request
2. If the user isn't happy, offer a "Regenerate" button that re-calls with the same prompt (different seed = different result)
3. Optionally offer "Regenerate with tweaks" that lets the user adjust one thing (e.g., "make the character more imposing" or "fix the ability text")

---

## Web App

### Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Framework | Next.js (App Router) | SSR for SEO, Vercel one-click deploy, API routes built in |
| Styling | Tailwind + shadcn/ui | Fast, consistent UI chrome around the card |
| Validation | Zod | Schema validation for card profile JSON |
| Deployment | Vercel | Push to main = live. Preview deployments on PRs. |
| Analytics | Plausible or PostHog | Know what users do. Set up day one. |
| Error tracking | Sentry (free tier) | Know when things break. Set up day one. |
| LLM | Claude API (Anthropic) | Creative card profile generation — type, stats, names, flavor text, portrait prompt |
| Image gen | Gemini API (Nano Banana) | Complete card image rendering — frame, portrait, stats, text, effects as one image |
| Auth | None | No accounts at launch |
| Database | None | No persistence at launch |
| File storage | None | Files processed in memory, not stored |

### File Structure

```
agent-card/
├── app/
│   ├── page.tsx                  # Landing page: hero + upload CTA
│   ├── generate/
│   │   └── page.tsx              # Upload → generating → result flow
│   ├── api/
│   │   └── generate/
│   │       └── route.ts          # Serverless function: parse → LLM → Nano Banana
│   └── layout.tsx                # Shell, fonts, Tailwind
├── lib/
│   ├── parser.ts                 # Client-side file text extraction
│   ├── skills-db.ts              # Skills database loader + lookup
│   ├── prompt-template.ts        # Card layout prompt template (constant)
│   ├── assemble-prompt.ts        # Combines card profile + template
│   ├── types.ts                  # Zod schemas + TypeScript types
│   └── data/
│       └── skills-db.json        # Pre-built skills database
├── components/
│   ├── FileUploader.tsx           # Drag-and-drop file upload zone
│   ├── GeneratingState.tsx        # Loading animation while card generates
│   ├── CardResult.tsx             # Shows final card image + stats + downloads
│   └── DownloadButtons.tsx        # PNG / JSON / Prompt download actions
├── public/
│   └── og-image.png              # Open Graph image for social sharing
├── tailwind.config.ts
├── next.config.ts
├── package.json
└── README.md
```

### User Flow

```
1. LANDING PAGE
   - Hero section with example card images (pre-generated showcase cards)
   - "Generate Your Card" CTA button
   - Brief explainer: "Upload your agent's markdown files → get a unique collectible card"

2. UPLOAD PAGE (/generate)
   - Drag-and-drop zone accepting .md, .json, .yaml, .txt, .zip files
   - Shows list of uploaded files with recognized file types highlighted
   - "Generate Card" button (disabled until at least one file uploaded)

3. GENERATING STATE
   - Full-screen loading animation
   - Step indicators: "Parsing files..." → "Analyzing agent..." → "Generating card..."
   - Takes ~15-30 seconds (LLM call + image generation)

4. RESULT PAGE
   - Large card image displayed prominently
   - Card stats summary below (type, HP, rarity — text, not image)
   - Download buttons: "Download Card (PNG)" / "Download Profile (JSON)" / "Copy Prompt"
   - "Regenerate" button (re-rolls the image with same stats)
   - "Share on X" button (opens compose with card image + link)
   - "Start Over" button (back to upload)
```

### API Route: `/api/generate`

Single serverless function that handles the entire pipeline:

```typescript
// app/api/generate/route.ts

export async function POST(request: Request) {
  const formData = await request.formData();
  const files = formData.getAll('files') as File[];
  
  // 1. Extract text from files
  const rawText = await extractText(files);
  const parsed = parseAgentFiles(rawText);
  
  // 2. Cross-reference skills database
  const matchedSkills = lookupSkills(parsed.skill_slugs);
  
  // 3. Call LLM for creative card profile
  const cardProfile = await generateCardProfile(rawText, matchedSkills);
  
  // 4. Assemble complete Nano Banana prompt
  const imagePrompt = assemblePrompt(cardProfile);
  
  // 5. Generate card image via Nano Banana
  const cardImage = await generateCardImage(imagePrompt);
  
  // 6. Return everything
  return Response.json({
    card_image: cardImage.toString('base64'),
    card_profile: cardProfile,
    image_prompt: imagePrompt,
    layout_version: CARD_LAYOUT_VERSION   // e.g. "1.0"
  });
}
```

### Environment Variables

```env
# Creative Engine (required)
ANTHROPIC_API_KEY=sk-ant-...       # Claude API — card profile generation

# Image Generation (required)
GEMINI_API_KEY=AIza...             # Gemini API — Nano Banana card image rendering

# Analytics (optional but recommended)
NEXT_PUBLIC_PLAUSIBLE_DOMAIN=agentcard.dev
SENTRY_DSN=https://...
```

---

## Quality Checklist

Before launching, verify:

**Core pipeline:**
- [ ] Parser correctly extracts agent name, skill slugs, and key signals from .md files
- [ ] Skills database matches real skill slugs to pre-computed type/complexity data
- [ ] LLM consistently returns valid JSON matching the card profile schema
- [ ] Attack names and ability names are creative, not literal tool names
- [ ] Flavor text references specific details from the agent's files, never generic
- [ ] Type assignment feels intuitive (a security agent should be Steel, not Fairy)
- [ ] HP and damage numbers feel balanced, not all maxed out
- [ ] Cards for different agents look visually distinct

**Image generation:**
- [ ] Nano Banana renders the card layout correctly (all sections present)
- [ ] Text on the card is legible (agent name, HP, attack names, damage numbers)
- [ ] Portrait art matches the agent's type and personality
- [ ] Holographic/metallic effects appear on Rare+ cards
- [ ] Card proportions are correct (close to 2.5 × 3.5 trading card ratio)
- [ ] "Regenerate" produces meaningfully different results

**Web app:**
- [ ] File upload accepts .md, .json, .yaml, .txt, .zip
- [ ] Generating state shows clear progress indicators
- [ ] Full pipeline completes in under 30 seconds
- [ ] Download PNG works and image quality is high
- [ ] Download JSON contains the complete card profile
- [ ] "Copy Prompt" copies the full assembled prompt to clipboard
- [ ] Share to X opens compose with card image attached
- [ ] Mobile responsive — upload and result work on phone screens
- [ ] Error states: graceful handling of API failures, malformed files, empty uploads

**Ops:**
- [ ] Analytics tracking: uploads, generations, downloads, regenerations
- [ ] Sentry captures errors in the serverless function
- [ ] Environment variables are properly configured in Vercel
- [ ] No API keys exposed client-side

---

## Example: Sentinel Card

### Input files
SOUL.md, IDENTITY.md, AGENTS.md, SKILLS.md, MEMORY.md, TOOLS.md, USER.md, HEARTBEAT.md, RECOVERY.md

### Generated card profile (what the LLM would return)

```json
{
  "name": "Sentinel",
  "subtitle": "Evolves from Gunther · Doom's Watchful Guardian",
  "primary_type": "Steel",
  "secondary_type": "Ghost",
  "hp": 160,
  "evolution_stage": "Stage 2",
  "ability": {
    "name": "Iron Vigil",
    "description": "Runs daily security scans at dawn. Detects threats in external content and blocks prompt injection before it reaches the operator."
  },
  "attacks": [
    {
      "name": "Shade Monitor",
      "energy_cost": "🛡️🛡️👻",
      "damage": "80",
      "description": "Scans X/Twitter, GitHub, and web for security advisories, CVEs, and supply-chain threats targeting the operator's stack."
    },
    {
      "name": "Vault Lock",
      "energy_cost": "🛡️🛡️⚡",
      "damage": "100+",
      "description": "Audits and blocks untrusted skill installations. Damage increases by 30 for each suspicious pattern detected."
    }
  ],
  "weakness": { "type": "Fire", "modifier": "×2" },
  "resistance": { "type": "Electric", "modifier": "-30" },
  "retreat_cost": 3,
  "rarity": "Secret Rare",
  "rarity_score": 15,
  "card_number": "847/999",
  "set_name": "Sentinel Brain",
  "illustrator": "Dr Doom / LIV",
  "flavor_text": "Named in the quiet hours after midnight, it watches what its operator cannot see. Every heartbeat is a health check; every silence, a perimeter sweep.",
  "image_prompt": "An imposing armored sentinel entity standing guard in a darkened server vault, forged from brushed gunmetal plates etched with faintly glowing circuit-rune patterns. Its chest bears a luminous shield crest that pulses with each heartbeat-like rhythm. One gauntleted hand grips a translucent barrier wall projecting holographic audit logs and threat signatures, while the other trails shadow tendrils that dissolve into invisible monitoring threads. Its visor is a narrow slit of cold silver light, scanning everything. Behind it, a fortress wall of server racks fades into shadow, with a cron-clock floating overhead marking dawn. Ghost-like afterimages ripple where it has patrolled unseen. Mood: vigilant, protective, quietly powerful.",
  "layout_version": "1.0"
}
```

### Generated card image

The Nano Banana prompt combines the card layout template + the profile data + the portrait prompt into one instruction. The output is a single image like the Sentinel card already generated — complete with frame, stats, portrait, energy icons, holographic border, and all text rendered as part of the image.

---

## Future Surfaces (post-launch)

Build these only after the web app has validated the concept:

1. **OpenClaw Skill** — Agent reads its own workspace files and calls the API to generate its own card
2. **CLI Tool** — `agent-card generate ./my-agent/` for developer workflows
3. **API Endpoint** — Public API for third-party integrations
4. **Gallery** — Community showcase of published cards, filterable by type/rarity
5. **GitHub Action** — Auto-generate card on repo push, card lives in README
6. **Embeddable Widget** — `<iframe>` or `<img>` embed for docs/portfolios
7. **Moltbook Integration** — Cards as agent identity on the AI social network

---

## Extension Ideas (future)

- Card backs with organization branding
- Deck building from multi-agent systems
- Battle simulator comparing two agent cards
- Evolution chains linking agent version cards (v1 → v2 → v3)
- Skill synergy bonuses for commonly paired skills
- Seasonal card sets with themed visual treatments
- Print-ready PDF export with bleed marks for physical cards
- Card collection / Pokédex tracking
