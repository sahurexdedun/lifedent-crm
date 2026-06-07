# Dedun — Agentic SEO Update Spec

**Prepared by:** Khaled Abdelaziz / Sahure Labs
**Context:** Abraham's Indianola migration completing — Dedun runs next as the content layer. Showcase asset for LEAP. Foundation for per-product pricing model going forward.
**Scope:** showcase subset of Abraham's catalog (final scope TBD — see §9), but architecture must be production-grade so the same code serves future clients without rework.

---

## 1. Why This Update Exists

Current Dedun is template-driven single-pass content rewriting using Gemini. That's enough for basic content fill but not enough for:

- **LEAP showcase quality** — output must be visibly better than typical AI-generated content, defensible under critical inspection
- **Per-product commercial pricing** — needs cost tracking, quality consistency, scalable architecture
- **Two operating modes** — products with rich source content (rewrite-and-optimize) vs products with minimal signal (generate-from-research)
- **Tool use** — web search, image analysis, schema validation as first-class capabilities, not afterthoughts

The update reframes Dedun from a single-pass generator to a **scaffolded agentic loop**: deterministic input prep and output validation, LLM-driven content generation and tool use decisions in between.

---

## 2. Current State (What Exists)

| Component | State |
|---|---|
| Backend | FastAPI, Python |
| LLM | Gemini |
| Architecture | Single-pass template fill |
| UI | Console tab in Thoth |
| Storage | SQLite / Turso for TM + state |
| Output target | Shopify products (Body HTML, SEO Title, SEO Description) |
| Modes | One (generic rewrite) |
| Tool use | None |
| Validation | None beyond LLM output |
| Cost tracking | None |
| Batch handling | Manual |

**Strengths to keep:** FastAPI foundation, Gemini integration, Console UI, Turso for state.

**Gaps to close:** everything in the "None" rows above.

---

## 3. Required Capabilities (What Needs to Exist)

### 3.1 Two Operating Modes

**Mode A — Source-driven (rewrite-and-optimize):**
- Input: rich source content (description_long, description_short, meta_description, title_long, brand, categories, images)
- Strategy: use source as ground truth, optimize for SEO without losing brand voice or factual accuracy
- Lower cost (less external research needed), higher quality ceiling (real source signal)
- Applies to: ~1,667 of Abraham's 1,776 products

**Mode B — Cold-start (generate-from-research):**
- Input: minimal — title, brand, categories, images only
- Strategy: web research for brand/product context, image analysis for visual features, generate from scratch
- Higher cost (more tool calls), lower quality ceiling (no ground truth)
- Applies to: 109 Abraham's products with no description + all future new products

Both modes share the agentic loop architecture. The mode is selected automatically based on source data density per product.

### 3.2 Agentic Loop (replaces single-pass template fill)

Per product:

1. **Plan** — read source data, classify product type, determine optimization strategy and tool needs, pick mode (A/B)
2. **Research** (Mode B always, Mode A optional) — web search for brand context, product line, competitive positioning
3. **Image analysis** (when applicable) — extract visual features from product images for descriptions and alt text
4. **Generate** — produce all output blocks in one structured call (Body HTML, SEO Title, SEO Description, Image Alt Texts, JSON-LD)
5. **Validate** — check against quality gates (length, keyword density, factual grounding, schema validity)
6. **Iterate** (if validation fails) — retry generation with feedback, max N retries
7. **Output** — structured result with metadata (mode, tools used, validation score, iterations, token cost)

The loop is **scaffolded**: steps 1, 5, and 7 are deterministic. Steps 2–4 and 6 are LLM-driven.

### 3.3 Tool Inventory

Minimum viable for showcase:

| Tool | Purpose | Required? |
|---|---|---|
| Gemini grounding / Brave Search API | Web search for brand/product context | Yes (Mode B always, Mode A optional) |
| Gemini Vision | Image analysis for visual feature extraction | Yes (when images present) |
| Schema.org JSON-LD validator | Validate output schema markup | Yes (cheap, no API needed) |
| HTML structure validator | Validate Body HTML | Yes (cheap, no API needed) |

Deferred to iteration 2 (post-showcase):

- DataForSEO / Semrush keyword research API
- Competitor SERP scraping
- Internal link graph optimization
- Brand voice fingerprint analyzer

### 3.4 Output Specification (per product)

```json
{
  "product_id": "...",
  "shopify_handle": "...",
  "output": {
    "body_html": "<h2>...</h2><ul>...</ul>",
    "seo_title": "...",              // 50–60 chars, includes brand + product + key feature
    "seo_description": "...",         // 150–160 chars, action-oriented, target keyword
    "image_alt_texts": [
      {"position": 1, "alt": "..."},
      {"position": 2, "alt": "..."}
    ],
    "tags_suggested": ["...", "..."],  // 5–15 tags
    "json_ld": {...}                   // Schema.org Product schema
  },
  "metadata": {
    "mode": "A" | "B",
    "tools_used": ["web_search", "image_analysis"],
    "validation_score": 0.95,
    "iterations": 1,
    "token_cost_input": 8420,
    "token_cost_output": 1140,
    "estimated_cost_usd": 0.024,
    "model": "gemini-2.5-pro",
    "duration_ms": 12450
  }
}
```

### 3.5 Quality Validation Gates

Before declaring output valid:

- **SEO Title:** 50–60 chars, contains brand name OR primary keyword
- **SEO Description:** 140–160 chars, includes call-to-action verb, no truncation mid-word
- **Body HTML:** valid HTML, includes at least one H2, at least one structured element (ul/ol/table), word count appropriate to product complexity (200–600 words typical)
- **Image Alt Texts:** every image has alt text, 5–125 chars each, descriptive (not "image1.jpg")
- **JSON-LD:** validates against Schema.org Product schema
- **Factual grounding (Mode A only):** key facts in output must appear in source content (no hallucinated specs, sizes, materials)
- **Brand mention:** brand appears in Body HTML and either Title or Description

Validation failure → iterate with explicit feedback to the LLM. Max 3 iterations, then flag for human review.

### 3.6 Write-Back to Shopify

Two paths:

**Option A — Shopify Admin API (live per-product update):**
- Pros: granular, real-time, can demo "click → page updates" live for LEAP
- Cons: rate limits (2 req/sec on standard plans), error handling per product

**Option B — Matrixify update CSV (batch):**
- Pros: bulk efficient, simple error recovery, audit-friendly
- Cons: not real-time, can't do live demo

**Recommendation:** Build both. Default to API for showcase (impressive live demo), Matrixify CSV for production batches.

### 3.7 Cost Tracking & Budgeting

Per-call tracking baked in from start:

- Input tokens, output tokens, model used
- Tool call costs (web search, image analysis)
- Total cost in USD
- Aggregate per batch, per client, per time period

This data feeds the per-product pricing model. Estimated cost per product: $0.10–$0.50 depending on mode, iterations, and tool usage. Margin target at $1–5 per product pricing.

---

## 4. Architecture Updates (Concrete Changes)

| Existing | Change Required |
|---|---|
| Single Gemini call generates everything | Replace with planning → generation → validation pipeline |
| No tool use | Add web search adapter, Gemini Vision adapter, validator modules |
| No mode distinction | Auto-classify each product as Mode A or B based on source density |
| No iteration | Add validation + retry loop, max 3 iterations |
| No structured output | Pydantic schema for output, with validation at boundary |
| Output goes to single field | Output is structured: body, title, description, alt texts, tags, JSON-LD |
| No cost tracking | Token + tool cost tracked per call, aggregated per batch |
| No write-back to Shopify | Build both Admin API and Matrixify CSV writers |
| Console UI shows single result | Console shows per-product full breakdown (mode, tools, validation, cost) |

---

## 5. The Agentic Loop in Code Terms

Pseudo-architecture for Mostafa:

```
class DedunAgentLoop:
    def run(self, product: Product) -> DedunOutput:
        plan = self.plan(product)               # LLM call 1: strategy
        context = self.research(plan)            # tool calls (web, image)
        for attempt in range(MAX_ITER):
            draft = self.generate(plan, context)  # LLM call 2: full output
            validation = self.validate(draft)
            if validation.passed:
                return self.finalize(draft, metadata)
            context.feedback = validation.errors  # iterate
        return self.finalize(draft, metadata, flagged=True)
```

Plan = which mode, which tools, what to emphasize.
Research = web search + image analysis as decided by plan.
Generate = single structured call producing all fields.
Validate = deterministic checks against quality gates.

---

## 6. Showcase Scope (Open Decision — §9)

For LEAP, recommend **single brand showcase, ~50 products max.** Best demo profile:

| Candidate | Products | Why |
|---|---|---|
| **Julie Vos** | ~50 | Recognizable luxury brand, rich source content, structured product data, distinct brand voice — most compelling before/after |
| Polo Ralph Lauren | ~80 | Universally known, broad audience appeal |
| Coastal Cotton | ~40 | Smaller brand, simpler showcase |

Single brand keeps the demo visually coherent (brand voice consistency is easier to point at), keeps showcase cost in range ($10–50 total), and lets us run live during a pitch.

For internal/post-LEAP iteration: run on full Abraham's catalog (~1,776 products) once architecture is validated.

---

## 7. Cost & Pricing Implications

**Per-product cost estimate (Mode A, full pipeline):**
- Planning call: ~2K input + 0.5K output tokens
- Generation call: ~6K input + 1.5K output tokens
- 1 image analysis call: ~0.02 USD
- 1 web search: ~0.005 USD
- **Total: ~$0.10–$0.20 per product**

**Mode B cost is higher** due to more research:
- 2–3 web searches, 3–5 image analyses, longer generation
- **Total: ~$0.30–$0.50 per product**

**Pricing tier strategy (for future commercial clients):**
- Basic ($1/product): Mode A only, no images, single generation pass
- Enhanced ($3/product): Full agentic loop, both modes, images, validation
- Premium ($5/product): Enhanced + competitor research + keyword optimization + manual QA pass

**Abraham's catalog at $3/product full run = $5,328 if they ever upgrade past current $750/mo retainer.**

---

## 8. Quality Showcase Tactics for LEAP

To make the demo undeniable:

1. **Before/after panels** — original Lightspeed text on left, Dedun output on right, 10 products
2. **Live agent run** — pick a random product on stage, run the loop in 30 seconds, show output appearing live in Shopify
3. **Cost transparency** — show the per-product cost in real-time during the demo ($0.18 displayed onscreen as the loop runs)
4. **Quality validation visible** — show the validation gates passing in real-time (length OK, keywords OK, schema OK)
5. **Scale claim with proof** — "This pipeline ran on the full Abraham's catalog in N hours at $X total cost" backed by actual data

---

## 9. Open Decisions (Khaled to Resolve)

1. **Showcase scope** — single brand (Julie Vos recommended), single category, or full catalog?
2. **Tool stack confirmation** — Gemini grounding (built-in) or external Brave/Perplexity for web search? Gemini Vision or external image analysis?
3. **Write-back default for showcase** — Admin API (for live demo) or Matrixify CSV (for safety)?
4. **Validation strictness** — should validation failures auto-flag for human review, or auto-iterate up to 3 times then publish best?
5. **JSON-LD scope** — Product schema only, or also BreadcrumbList + Offer + AggregateRating placeholder?
6. **Demo timing** — when does Khaled want the live showcase ready? LEAP timing drives Mostafa's sprint plan.

---

## 10. Deliverables Checklist (For Mostafa)

Code:
- [ ] Agent loop scaffold (`dedun/agent/loop.py`) — plan, research, generate, validate, finalize
- [ ] Mode A prompt template (rewrite-and-optimize)
- [ ] Mode B prompt template (generate-from-research)
- [ ] Validator module (length, keywords, HTML, schema, factual grounding)
- [ ] Web search adapter (Gemini grounding or Brave API)
- [ ] Image analysis adapter (Gemini Vision)
- [ ] Output schema (Pydantic)
- [ ] Cost tracker (token + tool cost per call, aggregate per batch)
- [ ] Shopify writer — Admin API path
- [ ] Shopify writer — Matrixify CSV path
- [ ] Console UI: per-product breakdown with mode, tools, validation, cost

Operational:
- [ ] Run on showcase subset, manually QA 10 outputs end-to-end
- [ ] Cost report for showcase run
- [ ] Before/after comparison artifact (10 products) for LEAP deck
- [ ] Demo script for live agent run on stage

Stretch (post-showcase, iteration 2):
- [ ] Keyword research API integration
- [ ] Internal link graph generation
- [ ] Brand voice fingerprint analyzer
- [ ] Multi-language support (Arabic for MENA clients)

---

## 11. Critical Risks to Manage

1. **LLM hallucination in Mode A** — output invents product specs not in source. Mitigation: factual grounding validation, factual_grounding_score in metadata.
2. **Generic AI feel in output** — defeats LEAP showcase purpose. Mitigation: brand voice references in prompt, validation against brand-specific patterns, manual QA on showcase batch.
3. **Cost overrun on Mode B** — iteration loop without good termination wastes tokens. Mitigation: hard cap at 3 iterations, escalate to human review on persistent failure.
4. **Shopify rate limits** — Admin API caps slow down batch operations. Mitigation: queue-based write-back with exponential backoff, fall back to Matrixify CSV for batches >100 products.
5. **Schema mismatches between Mode A source and Mode B generated** — output quality varies visibly between modes. Mitigation: shared style guide enforced via prompt + validation.

---

*This spec is the architecture. Mostafa drives the implementation details, prompt iteration, and final quality calibration. Open decisions in §9 unblock the build.*
