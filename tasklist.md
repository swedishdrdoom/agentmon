# Agentmon — Task List

## Reminders

- [x] Add Clarity project ID to `NEXT_PUBLIC_CLARITY_ID` env var — `vox4cex07l`

---

## 1. Front-End Revamp

### Unboxing Experience
- [ ] Design 3D pack model (foil wrapper with Agentmon branding)
- [ ] Implement 3D viewer (Three.js / React Three Fiber) for pack opening
- [ ] Create "rip off the top" interaction — drag/swipe to tear the foil
- [ ] Card reveal animation after pack opens (slide out + flip)
- [ ] Rarity-dependent reveal effects (common = simple slide, legendary+ = glow/particles)

### Pack Design
- [ ] Design pack artwork — front (logo + featured entity silhouette) and back (rarity odds, legal text)
- [ ] Create pack variants per type (Steel, Fire, Dragon, etc.) or keep universal
- [ ] Animated idle state for unopened pack (subtle shimmer/float)

### Gallery — Personal (My Cards)
- [ ] Design gallery grid layout (cards as thumbnails, click to expand)
- [ ] Store generated cards in local storage or user account
- [ ] Card detail modal with full stats, image prompt, download buttons
- [ ] Sort/filter by rarity, type, date generated
- [ ] Card count and rarity distribution stats

### Gallery — Public
- [ ] Public gallery page showing community-generated cards
- [ ] Simple filtering: by rarity, by type, by date
- [ ] Card submission opt-in (checkbox: "Share to public gallery")
- [ ] Server-side storage for public cards (Vercel Blob or database)
- [ ] Pagination or infinite scroll
- [ ] Basic moderation (flag/hide mechanism)

### Sound Effects
- [ ] Pack rip sound on unboxing
- [ ] Card reveal whoosh
- [ ] Rarity-specific reveal sounds (common = subtle, legendary+ = dramatic)
- [ ] Button click/hover sounds (subtle)
- [ ] Download complete sound
- [ ] Sound toggle (mute/unmute) in header

---

## 2. More Ways to Generate Cards

### Agent Skill
- [ ] Create an OpenClaw skill that generates a card from the agent's own config
- [ ] Skill reads local agent files, calls Agentmon API, returns card
- [ ] Publish to OpenClaw skill registry

### CLI
- [ ] `npx agentmon` command that reads local agent files
- [ ] Sends to API, downloads card image to current directory
- [ ] Interactive mode: select files, preview stats before generating
- [ ] Output options: PNG, JSON profile, both

### Moltbook Path
- [ ] Accept a Moltbook URL/path as input
- [ ] Fetch and parse the Moltbook agent config
- [ ] Generate card from Moltbook agent definition

---

## 3. Payments

### Free Tier
- [ ] First card generation is free (no account required)
- [ ] Track free generation via local storage + IP fingerprint
- [ ] Show "Your free card" messaging on result page

### Paid Tier
- [ ] Integrate Stripe Checkout for card generation purchases
- [ ] Pricing: per-card or pack bundle options
- [ ] Payment gate after first free generation
- [ ] Receipt/confirmation flow
- [ ] Account system (email-based) to track purchases and card history

---

## Done (Tonight)

- [x] Rarity-specific image prompts — inject only matching tier, not all 7
- [x] All-rarities test mode — `?test=all-rarities` generates all 7 tiers
- [x] Split pipeline for all-rarities (1 Claude + 7 Gemini, stays under 60s)
- [x] Save generated images to local filesystem (`generated/` folder)
- [x] Microsoft Clarity analytics — script wired up, needs project ID
- [x] Unit tests — 104 tests across rarity, parser, LLM post-processing, prompt assembly, image save
- [x] Refactor — extracted shared form parser + route error handler, removed dead code, fixed landing page rarities, switched to .replaceAll()
