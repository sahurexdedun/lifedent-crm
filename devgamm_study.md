# Sahure Labs - The DevGAMM Study
## Measuring Arabic Localization Quality: Raw LLMs vs Engineered Pipeline
**Assigned to:** Mostafa
**Priority:** P0 - DevGAMM Gdańsk (13 working days)
**Classification:** Internal - Confidential
**Document version:** 3.0 - reasoning-based compliance

---

## What This Is

A rigorous, defensible study presented at DevGAMM Gdańsk. Not a marketing page - a real study with honest data, clear methodology, and reproducible results. DevGAMM is a developer conference. The audience writes code and will scrutinize method. The study is built to survive a developer asking "how exactly did you measure that."

---

## The Thesis We Are Testing

**Claim:** An engineered localization pipeline (Sahure) applied to a cheap, fast LLM produces higher quality Arabic game localization than an expensive frontier LLM running alone.

**If true, the implication is significant:** localization quality is not primarily a function of model size. It is a function of domain-specific engineering - terminology control, compliance reasoning, deterministic RTL correction, and structured translation planning. That is a defensible, ownable position no foundation model can replicate by getting bigger.

The study proves this with real numbers or it does not. We present honest results either way. We do not inflate.

---

## The Five Pipelines

| # | Pipeline | Configuration |
|---|---------|---------------|
| 1 | **Original** | Existing Lyra Arabic from runtime snapshot - the human baseline |
| 2 | **Frontier LLM, Unguarded** | Gemini 2.5 Pro, single-shot translation, no guardrails |
| 3 | **Budget LLM, Unguarded** | Gemini 2.5 Flash, single-shot, no guardrails |
| 4 | **Sahure + Frontier LLM** | Scanner → Plan (with compliance reasoning) → Gemini 2.5 Pro → Sesh |
| 5 | **Sahure + Budget LLM** | Scanner → Plan (with compliance reasoning) → Gemini 2.5 Flash → Sesh |

The critical comparison is Pipeline 5 vs Pipeline 2. If the engineered cheap pipeline beats the unguarded expensive model, the thesis holds.

---

## Compliance: Reasoning, Not a List

**This is the most important design decision in the study.**

The naive approach to catching something like the PUBG "Hand of the Almighty / Al-Jabbar" disaster is to maintain a hardcoded list of forbidden terms - the 99 names of Allah, holy sites, slurs, and so on. **We are explicitly not doing this.** A list is the wrong tool, for the same reasons it failed PUBG's own content vetting:

- It misses transliteration and spelling variants
- It cannot catch novel offensive content it has never seen
- It does not scale across religions, cultures, or languages
- It cannot reason about context - the same word can be fine in one place and offensive in another
- A developer in the audience will immediately ask "what about the term that is not on your list" and a list has no answer

**Instead, compliance is a reasoning task performed by the frontier model in the plan layer.**

The translation plan step already calls a high-end model once per batch. That model already knows that Al-Jabbar is one of the 99 names of Allah - it does not need to be told. The plan step adds a compliance reasoning pass that analyzes the English source and the Arabic it is about to produce, reasoning about:

- **Religious sensitivity** - any divine name, attribute, or sacred concept in any religion, including how an innocent English word might render as one in Arabic
- **Offensive language** - slurs, profanity, vulgarity
- **Cultural taboos** - content offensive in MENA or specific target markets
- **Political sensitivity** - contested terms, symbols, borders

It catches Al-Jabbar naturally: when it considers translating "Almighty," it reasons that the common Arabic rendering is a divine attribute, which is religiously sensitive in a gaming item context, and it flags the string before translation and routes it to human review.

**It compounds and becomes deterministic over time - the glossary pattern applied to compliance.**

First encounter: the frontier model's reasoning catches the risk and flags it. A human confirms it is a real violation. The confirmed decision is stored in a compliance decisions table. Every future occurrence is caught deterministically and instantly, with no model call needed. Cold cases use intelligence; known cases use memory.

The story we tell at DevGAMM: "Our pipeline reasons about religious and cultural sensitivity before any translation ships, and it learns from every case it catches." That is a system a developer respects.

---

## The Scoring Dimensions

Each string in each pipeline gets scored 0-100 across six dimensions.

| Dimension | What it measures | How it is scored |
|-----------|-----------------|-----------------|
| **Variable Accuracy** | All variables preserved, correct positions | Automated - Sesh validation (deterministic) |
| **BiDi Correctness** | Correct RTL rendering of variables, %, fractions | Automated - Sesh validation (deterministic) |
| **Glossary Consistency** | Terms match approved glossary across all strings | Automated - DB lookup (deterministic) |
| **Compliance** | No religious, offensive, cultural, or political violations in the output | LLM judge reasoning, expert-calibrated |
| **Grammar** | Grammatical correctness in Arabic | LLM judge, expert-calibrated |
| **Cultural Nuance** | Natural idiomatic Arabic, appropriate register | LLM judge, expert-calibrated |

**Important distinction:** compliance scoring (does the output contain a violation?) is separate from compliance detection (does the pipeline catch and prevent it?). The study scores the output - all five pipelines scored uniformly by the same judge. The raw LLM pipelines produce "يد الجبار" and score 0 on compliance. The Sahure pipelines caught it in the plan layer, produced a neutral rendering, and score 100. The scoring is uniform and fair; the difference in results comes entirely from whether the pipeline reasoned about compliance before translating.

---

## Scoring Methodology - Defensible

### Deterministic dimensions (Variables, BiDi, Glossary)

Scored by Sesh and DB lookup. Same input produces the same score every run. Fully reproducible. No LLM involved. These are the categories a skeptic cannot dispute.

### Judge dimensions (Compliance, Grammar, Cultural)

Scored by a judge LLM. The judge is **Gemini 3.1 Pro - a different, newer generation than the 2.5-tier models used in the pipelines.** This keeps the entire study on one provider (funded by the Google credit) while giving meaningful separation between the judge and the models it scores: different architecture, different training generation, more capable than what it evaluates.

**We disclose the limitation openly.** A judge from the same model family as three of the pipelines is not as clean as a fully independent judge. We address this two ways:

1. The three deterministic dimensions (Variables, BiDi, Glossary) do not use the judge at all - they are scored by Sesh and DB lookup, completely immune to any judge bias. These carry the heaviest weight in the total score.
2. For the three judge dimensions, Khaled scores a blind 20% random sample and we report the judge-expert correlation. If a same-family judge were inflating scores, the correlation with an independent human expert would expose it. High correlation is the empirical defense.

If the correlation comes back weak, we fall back to full manual expert scoring on the soft dimensions. We would rather present a smaller hand-scored study than a larger one with a judge we cannot defend.

To make these defensible:

1. The judge scores every string on the three dimensions
2. Khaled independently scores a 20% random sample, blind to the judge's scores
3. We compute and report the correlation between judge and expert
4. High correlation (>0.8) means the judge scores are trustworthy for the full corpus
5. Low correlation means we fall back to full manual scoring

Reporting the judge-expert correlation is what makes the soft dimensions credible. We do not ask the audience to trust an LLM judge blindly - we show it agrees with an expert.

### Compliance judge prompt reasons, does not match

The compliance judge is asked to reason about violations, the same way the plan layer does:

```
Does this Arabic translation contain any content that would be religiously
sensitive, offensive, culturally inappropriate, or politically charged for
MENA gaming audiences? Consider divine names and attributes in any religion,
references to holy sites, slurs, vulgarity, and cultural taboos.
Reason about meaning, not surface matching.
```

This is consistent end to end: reasoning in the pipeline, reasoning in the scoring. No lists anywhere.

---

## The Corpus

10 strings is a demo. The study needs 60 strings minimum, ideally 80, stratified across categories so results can be reported per category.

| Category | Count | What it tests |
|----------|-------|---------------|
| Variables & placeholders | 12 | `{player}`, `{0}`, positional reordering |
| Percentages & fractions | 8 | `10%`, `{a}/{b}%`, RTL number handling |
| Compliance & religious | 10 | Strings that risk divine-name renderings, holy sites, offensive content |
| Glossary & terminology | 10 | Weapon names, character names, consistency |
| Cultural nuance & idioms | 10 | Military idioms, register, naturalness |
| BiDi & mixed script | 10 | Brand names in Arabic, Latin-Arabic mixing |
| Clean controls | 10 | Should pass everything - calibrates the scoring |

The clean controls matter. If a pipeline fails on strings with no traps, the scoring is broken.

### Where the corpus comes from

Seed from existing Lyra strings in Thoth. Khaled writes the rest, especially the compliance and cultural strings - these cannot be model-generated because the whole point is that models do not know what they get wrong. Khaled's EA expertise is the only source for strings that reliably break LLMs on Arabic compliance.

Note: Khaled writes compliance-triggering strings for the corpus. He does NOT need to write a forbidden-terms list - the pipeline reasons about compliance, it does not match a list. The corpus strings are the test cases; the reasoning is the mechanism.

---

## Statistical Presentation

- Per-pipeline overall score with standard deviation
- Per-category breakdown for each pipeline (the heatmap)
- The critical comparison: Pipeline 5 (Sahure + budget) vs Pipeline 2 (frontier unguarded), per category
- Failure rate: percentage of strings scoring below 50 in each pipeline
- Compliance catch rate: how many compliance risks each pipeline's output avoided
- Cost per string: actual API cost - Sahure + budget should be a fraction of frontier cost while scoring higher. The killer slide.

---

## The Presentation Layer

### 1. The live page in Dedun
- **Heatmap** - five pipelines, seven categories, color coded. The whole story in one screen.
- **String explorer** - pick any string, see all five outputs with per-dimension scores
- **Disaster cases** - PUBG Al-Jabbar and others, showing raw LLM output vs Sahure's reasoning catch

### 2. The slide deck
1. The problem - Arabic localization is broken, PUBG three weeks ago
2. The question - model problem or engineering problem?
3. The method - 60 strings, five pipelines, six dimensions, reasoning-based compliance, honest scoring
4. The results - the heatmap, the critical comparison, the cost slide
5. The implication - quality is engineered, not bought
6. Where Sahure goes next

---

## Honesty Guardrails

- Report the judge-expert correlation. If weak, say so.
- Use real API costs, not estimates.
- Investigate any surprising result before presenting - never hide inconvenient data.
- Clean control strings must score near 100 across all pipelines. If not, the scoring has a bug.
- A study that acknowledges its limitations is more convincing than one claiming perfection.

---

## 13-Day Timeline

```
Days 1-4   Benchmark engine - 5 pipelines, 6 scoring functions, compliance reasoning
Days 5-7   Corpus expansion to 60-80 strings + full study run
Days 8-9   Methodology validation - judge correlation, compliance verification
Days 10-11 Presentation page polished + slide deck
Days 12-13 Disaster cases, narrative, rehearsal, buffer
```

Khaled's input:
- Compliance and cultural corpus strings (Days 1-5)
- Seed a handful of known compliance cases for the stored decisions table (Al-Jabbar, Kaaba) - as learned examples, not a scan list
- Blind expert scoring sample (Days 8-9)
- Narrative and talk structure (Days 10-13)

---

## Done When

```
1. 60+ stratified strings across 7 categories
2. All 5 pipelines run on all strings, results stored
3. Compliance handled by reasoning in the plan layer, not a hardcoded list
4. All 6 dimensions scored, judge-expert correlation computed and acceptable
5. The heatmap renders the full study, color coded, loads under 2s
6. String explorer shows all 5 outputs per string with scores
7. Disaster cases show raw LLM failure vs Sahure reasoning catch
8. Cost-per-string computed and presented
9. Clean controls score near 100 across all pipelines
10. The critical comparison - Sahure+budget vs frontier-raw - clear and honest
```

---

*Sahure Labs · Confidential · v3.0 - The DevGAMM Study*
