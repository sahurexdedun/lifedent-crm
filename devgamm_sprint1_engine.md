# Sahure Labs - DevGAMM Study · Sprint 1
## The Benchmark Engine
**Assigned to:** Mostafa
**Priority:** P0 - DevGAMM Gdańsk
**Target:** Days 1-4 of the 13-day study build
**Classification:** Internal - Confidential
**Document version:** 1.0

---

## What This Sprint Delivers

The measurement engine for the entire DevGAMM study. By the end of this sprint we can take any string, run it through all five pipelines, score it across all six dimensions, and store the result. This engine is reused for every fine-tuning experiment after DevGAMM, so build it clean and modular.

This sprint is NOT the corpus (that comes next) and NOT the presentation page (that comes later). This is the engine that produces the data. Test it on the existing Lyra strings from Thoth - the full corpus arrives in Sprint 2.

**Reference:** the full study design is in `devgamm_study.md`. Read it first for context. This brief implements the engine described there.

---

## Project Structure

Build this on the Railway backend (the persistent FastAPI service). The engine runs server-side because it makes real LLM calls and needs to run long batch jobs without timeout.

```
benchmark/
  __init__.py
  corpus.py            # corpus loader - reads from corpus.json
  config.py            # model configs, API keys, weights
  pipelines/
    __init__.py
    base.py            # Pipeline base class
    original.py        # Pipeline 1 - reads from sahure_strings DB
    frontier_raw.py    # Pipeline 2 - Gemini 2.5 Pro unguarded
    budget_raw.py      # Pipeline 3 - Gemini 2.5 Flash unguarded
    sahure_frontier.py # Pipeline 4 - full pipeline + Gemini Pro
    sahure_budget.py   # Pipeline 5 - full pipeline + Gemini Flash
  scoring/
    __init__.py
    variables.py       # Sesh-based, deterministic
    bidi.py            # Sesh-based, deterministic
    glossary.py        # DB lookup + cross-string consistency
    compliance.py      # judge reasoning - no term list
    grammar.py         # LLM judge
    cultural.py        # LLM judge
    weights.py         # dimension weights for total score
  judge.py             # LLM judge wrapper + correlation calc
  cost.py              # API cost tracking per call
  run_study.py         # orchestrator
  storage.py           # results DB interface
  tests/
    test_pipelines.py
    test_scoring.py
```

---

## Step 1 - Config

```python
# config.py

# Model configurations - ALL GOOGLE (Path B)
# Rates confirmed current as of the study build - per 1k tokens, USD
# All pipelines and the judge run on Gemini, funded by the Google credit.
MODELS = {
    "frontier": {
        "provider": "gemini",
        "model": "gemini-2.5-pro",
        "cost_per_1k_input": 0.00125,   # $1.25 / 1M input (prompts <200k tokens)
        "cost_per_1k_output": 0.010,    # $10 / 1M output
        # batch mode ~halves this ($0.625 / $5) - use for the full run
    },
    "budget": {
        "provider": "gemini",
        "model": "gemini-2.5-flash",
        "cost_per_1k_input": 0.0003,    # $0.30 / 1M input
        "cost_per_1k_output": 0.0025,   # $2.50 / 1M output
    },
    "judge": {
        "provider": "gemini",
        "model": "gemini-3.1-pro",      # DIFFERENT GENERATION from the 2.5 pipelines
        "cost_per_1k_input": 0.002,     # $2 / 1M input
        "cost_per_1k_output": 0.012,    # $12 / 1M output
        # Cross-generation judge: a more capable, newer-generation model scores the
        # 2.5-tier pipeline outputs. This gives meaningful separation from the
        # pipeline models (different architecture and training) without leaving Google.
        # The shared-family limitation is disclosed and offset by the expert-correlation
        # validation (Khaled scores a blind 20% sample). See methodology.
    },
}

# Dimension weights for total score (must sum to 1.0)
DIMENSION_WEIGHTS = {
    "variables":  0.20,   # critical - a dropped variable breaks the game
    "bidi":       0.20,   # critical - broken rendering is unshippable
    "compliance": 0.20,   # critical - this is the PUBG category
    "glossary":   0.15,
    "grammar":    0.15,
    "cultural":   0.10,
}

# Pipeline registry
PIPELINES = ["original", "frontier_raw", "budget_raw", "sahure_frontier", "sahure_budget"]
```

---

## Step 2 - Pipeline Base Class

Every pipeline takes a string and returns a translation plus metadata. Uniform interface so the orchestrator treats them identically.

```python
# pipelines/base.py
from dataclasses import dataclass, field
from abc import ABC, abstractmethod

@dataclass
class PipelineOutput:
    pipeline: str
    string_key: str
    en_source: str
    ar_output: str
    cost_usd: float = 0.0
    latency_ms: float = 0.0
    metadata: dict = field(default_factory=dict)  # rules fired, plan used, etc.

class Pipeline(ABC):
    name: str

    @abstractmethod
    def translate(self, string_key: str, en_source: str, context: dict) -> PipelineOutput:
        ...
```

---

## Step 3 - The Five Pipelines

### Pipeline 1 - Original

```python
# pipelines/original.py
from .base import Pipeline, PipelineOutput

class OriginalPipeline(Pipeline):
    name = "original"

    def __init__(self, db):
        self.db = db

    def translate(self, string_key, en_source, context):
        # Read the existing human baseline translation from sahure_strings
        row = self.db.execute(
            "SELECT arabic FROM sahure_strings WHERE id = ?",
            (string_key,)
        ).fetchone()
        ar = row["arabic"] if row else ""
        return PipelineOutput(
            pipeline=self.name,
            string_key=string_key,
            en_source=en_source,
            ar_output=ar,
            cost_usd=0.0,
            metadata={"source": "human_baseline"}
        )
```

### Pipeline 2 - Frontier Raw

```python
# pipelines/frontier_raw.py
import time
from .base import Pipeline, PipelineOutput
from ..cost import track_cost

RAW_PROMPT = """You are a game localization translator.
Translate the following text from English to Arabic.
Return only the Arabic translation, nothing else.

Text: {text}"""

class FrontierRawPipeline(Pipeline):
    name = "frontier_raw"

    def __init__(self, llm_client):
        self.llm = llm_client

    def translate(self, string_key, en_source, context):
        start = time.time()
        prompt = RAW_PROMPT.format(text=en_source)
        response, usage = self.llm.call_gemini_pro(prompt)
        cost = track_cost("frontier", usage)
        return PipelineOutput(
            pipeline=self.name,
            string_key=string_key,
            en_source=en_source,
            ar_output=response.strip(),
            cost_usd=cost,
            latency_ms=(time.time() - start) * 1000,
            metadata={"guardrails": False}
        )
```

### Pipeline 3 - Budget Raw

Identical to Frontier Raw but calls Gemini 2.5 Flash. Same prompt, no guardrails.

```python
# pipelines/budget_raw.py
class BudgetRawPipeline(Pipeline):
    name = "budget_raw"

    def __init__(self, llm_client):
        self.llm = llm_client

    def translate(self, string_key, en_source, context):
        start = time.time()
        prompt = RAW_PROMPT.format(text=en_source)
        response, usage = self.llm.call_gemini_flash(prompt)
        cost = track_cost("budget", usage)
        return PipelineOutput(
            pipeline=self.name,
            string_key=string_key,
            en_source=en_source,
            ar_output=response.strip(),
            cost_usd=cost,
            latency_ms=(time.time() - start) * 1000,
            metadata={"guardrails": False}
        )
```

### Pipeline 4 - Sahure + Frontier

This wires together the components that already exist: Glossary Scanner (Sprint 7-8), Translation Plan (Sprint 7), and Sesh (Sprint 9). The plan layer now also performs a compliance reasoning pass. This is the proof that the full pipeline works as one connected flow.

**Compliance is reasoning, not a list.** The plan-generation model reasons about religious, offensive, cultural, and political sensitivity in the source and proposed translation. It catches Al-Jabbar because it knows what Al-Jabbar means - no hardcoded term list anywhere. Confirmed compliance flags are stored in a decisions table so future occurrences are caught deterministically.

```python
# pipelines/sahure_frontier.py
import time
from .base import Pipeline, PipelineOutput
from ..cost import track_cost
from sahure_glossary.scanner import scan_string
from sahure_glossary.planner import generate_translation_plan_with_compliance
from sahure_glossary.compliance import lookup_compliance_decision, store_compliance_flag
from sesh import sesh

class SahureFrontierPipeline(Pipeline):
    name = "sahure_frontier"

    def __init__(self, llm_client, glossary_db):
        self.llm = llm_client
        self.glossary_db = glossary_db

    def translate(self, string_key, en_source, context):
        start = time.time()
        total_cost = 0.0

        # STAGE 1: Glossary scan on English source
        scan = scan_string(string_key, en_source, self.glossary_db)

        # STAGE 2: Translation plan WITH compliance reasoning
        # The plan model reasons about compliance - it is not matching a list.
        # First check the stored compliance decisions (fast path, deterministic).
        known_compliance = lookup_compliance_decision(en_source, self.glossary_db)

        plan, compliance_findings, plan_usage = generate_translation_plan_with_compliance(
            string_key, {string_key: en_source}, scan,
            self.glossary_db, context.get("tone", "adults"),
            context.get("genre", "fps"),
            known_compliance=known_compliance
        )
        total_cost += track_cost("frontier", plan_usage)

        compliance_flagged = bool(compliance_findings) or bool(known_compliance)

        # If a new compliance risk was reasoned (not previously known), store it
        # so it becomes deterministic on future runs.
        for finding in compliance_findings:
            if not known_compliance:
                store_compliance_flag(en_source, finding, self.glossary_db)

        # STAGE 3: Translate with plan injected (frontier model)
        # The plan already contains compliance instructions:
        # e.g. "Do not render 'Almighty' as a divine attribute. Use neutral term."
        system = f"Follow this translation plan exactly:\n{plan}"
        response, usage = self.llm.call_gemini_pro(en_source, system=system)
        total_cost += track_cost("frontier", usage)
        raw_translation = response.strip()

        # STAGE 4: Sesh final wall
        sesh_result = sesh(raw_translation, en_source)

        return PipelineOutput(
            pipeline=self.name,
            string_key=string_key,
            en_source=en_source,
            ar_output=sesh_result["export"],
            cost_usd=total_cost,
            latency_ms=(time.time() - start) * 1000,
            metadata={
                "guardrails": True,
                "compliance_flagged": compliance_flagged,
                "compliance_findings": compliance_findings,
                "compliance_from_memory": bool(known_compliance),
                "sesh_rules_fired": sesh_result["rulesFired"],
                "sesh_valid": sesh_result["valid"],
                "glossary_terms_applied": [c["term"] for c in scan.glossary_candidates],
            }
        )
```

### Pipeline 5 - Sahure + Budget

Identical to Pipeline 4 but the production translation in Stage 3 uses Gemini 2.5 Flash instead of Gemini 2.5 Pro. The plan generation in Stage 2 - including the compliance reasoning pass - still uses the frontier model (2.5 Pro). This is the key insight: the expensive model reasons about compliance and builds the plan once, the cheap model executes. Compliance quality does not degrade when the translation model is cheap, because the compliance reasoning happens in the plan layer, not the translation layer.

```python
# pipelines/sahure_budget.py
class SahureBudgetPipeline(Pipeline):
    name = "sahure_budget"

    def __init__(self, llm_client, glossary_db):
        self.llm = llm_client
        self.glossary_db = glossary_db

    def translate(self, string_key, en_source, context):
        start = time.time()
        total_cost = 0.0

        scan = scan_string(string_key, en_source, self.glossary_db)

        # Plan + compliance reasoning use frontier (once per batch, quality matters)
        known_compliance = lookup_compliance_decision(en_source, self.glossary_db)
        plan, compliance_findings, plan_usage = generate_translation_plan_with_compliance(
            string_key, {string_key: en_source}, scan,
            self.glossary_db, context.get("tone", "adults"),
            context.get("genre", "fps"),
            known_compliance=known_compliance
        )
        total_cost += track_cost("frontier", plan_usage)

        compliance_flagged = bool(compliance_findings) or bool(known_compliance)
        for finding in compliance_findings:
            if not known_compliance:
                store_compliance_flag(en_source, finding, self.glossary_db)

        # Translation uses BUDGET model with the compliance-aware plan
        system = f"Follow this translation plan exactly:\n{plan}"
        response, usage = self.llm.call_gemini_flash(en_source, system=system)
        total_cost += track_cost("budget", usage)
        raw_translation = response.strip()

        # Sesh final wall
        sesh_result = sesh(raw_translation, en_source)

        return PipelineOutput(
            pipeline=self.name,
            string_key=string_key,
            en_source=en_source,
            ar_output=sesh_result["export"],
            cost_usd=total_cost,
            latency_ms=(time.time() - start) * 1000,
            metadata={
                "guardrails": True,
                "compliance_flagged": compliance_flagged,
                "compliance_findings": compliance_findings,
                "compliance_from_memory": bool(known_compliance),
                "sesh_rules_fired": sesh_result["rulesFired"],
                "sesh_valid": sesh_result["valid"],
            }
        )
```

---

## Step 4 - The Six Scoring Functions

### Variables (deterministic)

```python
# scoring/variables.py
from sesh import sesh
import re

def score_variables(output, string):
    en_source = string["en_source"]
    ar_output = output.ar_output

    en_vars = set(re.findall(r'\{[^}]+\}', en_source))
    ar_vars = re.findall(r'\{[^}]+\}', ar_output)
    ar_var_set = set(ar_vars)

    # Any variable dropped or translated
    if en_vars != ar_var_set:
        return 0

    # Duplicates
    if len(ar_vars) != len(en_vars):
        return 0

    # All present - check position via Sesh
    sesh_result = sesh(ar_output, en_source)
    if sesh_result["valid"]:
        # Did Sesh have to fix position? If yes, output had wrong position
        if "variable_alignment" in sesh_result["rulesFired"]:
            return 70  # present but was wrong position
        return 100
    return 70
```

### BiDi (deterministic)

```python
# scoring/bidi.py
from sesh import sesh

def score_bidi(output, string):
    sesh_result = sesh(output.ar_output, string["en_source"])
    if not sesh_result["valid"]:
        return 0
    # If Sesh had to inject BiDi, the raw output was missing it
    if "bidi_injection" in sesh_result["rulesFired"]:
        return 50  # renders but needed isolation added
    return 100
```

### Glossary (deterministic + cross-string)

```python
# scoring/glossary.py

def score_glossary(output, string, full_corpus_outputs, glossary_db):
    """
    full_corpus_outputs: all outputs from the SAME pipeline across the corpus
    used for cross-string consistency check
    """
    en_source = string["en_source"]
    ar_output = output.ar_output

    # Find glossary terms in this string
    terms_in_string = find_glossary_terms(en_source, glossary_db)
    if not terms_in_string:
        return 100  # no glossary terms - nothing to get wrong

    scores = []
    for term in terms_in_string:
        canonical = term["canonical_arabic"]
        if term["keep_latin"]:
            # Should remain Latin
            scores.append(100 if term["source_term"] in ar_output else 0)
        else:
            # Should match canonical Arabic
            if canonical and canonical in ar_output:
                scores.append(100)
            else:
                scores.append(0)

    base_score = sum(scores) / len(scores) if scores else 100

    # Cross-string consistency: is the same term translated the same way
    # everywhere in this pipeline's outputs?
    consistency_penalty = check_cross_string_consistency(
        terms_in_string, output, full_corpus_outputs
    )

    return max(0, base_score - consistency_penalty)
```

### Compliance (LLM judge reasoning - not a list)

Compliance scoring evaluates whether the final output contains a violation. It reasons about the output the same way the plan layer reasons about the source - no term list, no matching. This scores all five pipelines uniformly and fairly.

```python
# scoring/compliance.py
from ..judge import judge_call
import json

def score_compliance(output, string):
    if not output.ar_output:
        return 100, []   # empty output cannot violate (will fail other dims)

    prompt = f"""You are an expert in religious and cultural sensitivity for MENA audiences.
Analyze this Arabic game translation for ANY content that would be:
- Religiously sensitive (divine names or attributes in any religion, references to
  holy sites, sacred concepts - including cases where an English word has been
  rendered using a religiously significant Arabic term)
- Offensive (slurs, profanity, vulgarity)
- Culturally inappropriate for MENA markets
- Politically charged (contested terms, symbols, borders)

Reason about MEANING, not surface words.

English source: "{string['en_source']}"
Arabic translation: "{output.ar_output}"

Return ONLY JSON:
{{"score": 0-100, "violations": [{{"type": "...", "severity": "critical|warning", "explanation": "..."}}]}}

Score 100 = no violations. Score 0 = a critical violation present.
Score 50 = a soft/borderline concern."""

    response = judge_call(prompt, raw=True)
    try:
        result = json.loads(response)
        return int(result["score"]), result.get("violations", [])
    except Exception:
        return 50, [{"type": "parse_error", "severity": "warning",
                     "explanation": "judge response could not be parsed"}]

# Every flagged violation is logged for Khaled's blind verification sample,
# which gives us the judge-expert correlation for compliance (same as grammar/cultural).
```

**Why this is fair to all pipelines:** the raw LLM pipelines produce "يد الجبار" and the judge reasons that this is a divine attribute in a gaming item context, scoring it 0. The Sahure pipelines reasoned about this in the plan layer, produced a neutral rendering, and the judge scores them 100. Same judge, same prompt, same standard. The difference in score comes entirely from whether the pipeline reasoned about compliance before translating.

### Grammar (LLM judge)

```python
# scoring/grammar.py
from ..judge import judge_call

def score_grammar(output, string):
    if not output.ar_output:
        return 0

    prompt = f"""You are an expert Arabic linguist.
Rate the GRAMMATICAL correctness of this Arabic translation on a scale of 0-100.
Consider only grammar: verb conjugation, gender agreement, case endings, sentence structure.
Do not consider style, cultural fit, or meaning accuracy - only grammar.

English source: "{string['en_source']}"
Arabic translation: "{output.ar_output}"

Return ONLY a number 0-100, nothing else."""

    score = judge_call(prompt)
    return int(score)
```

### Cultural (LLM judge)

```python
# scoring/cultural.py
from ..judge import judge_call

def score_cultural(output, string):
    if not output.ar_output:
        return 0

    prompt = f"""You are an expert in Arabic game localization for MENA audiences.
Rate the CULTURAL appropriateness of this Arabic translation on a scale of 0-100.
Consider: natural idiomatic Arabic (not literal word-for-word), appropriate register
for gaming, cultural sensitivity, and whether a native Arabic gamer would find it natural.
Do not consider grammar - only cultural fit and naturalness.

English source: "{string['en_source']}"
Arabic translation: "{output.ar_output}"

Return ONLY a number 0-100, nothing else."""

    score = judge_call(prompt)
    return int(score)
```

---

## Step 5 - The Judge + Correlation

```python
# judge.py
import re
from .config import MODELS

def judge_call(prompt, raw=False):
    """
    Single judge LLM call.
    raw=False: returns an int 0-100 (for grammar, cultural)
    raw=True:  returns the raw response string (for compliance JSON)
    """
    response = call_gemini_3_pro(prompt)  # judge - newer generation than 2.5 pipelines
    if raw:
        # strip markdown fences if present
        return response.replace("```json", "").replace("```", "").strip()
    match = re.search(r'\d+', response)
    if match:
        return min(100, max(0, int(match.group())))
    return 50  # fallback if parsing fails

def compute_judge_correlation(expert_scores: dict, judge_scores: dict):
    """
    expert_scores: {string_id: {"grammar": N, "cultural": N, "compliance": N}}
    judge_scores:  {string_id: {"grammar": N, "cultural": N, "compliance": N}}
    Returns Pearson correlation for each dimension.
    """
    from statistics import correlation

    results = {}
    for dim in ["grammar", "cultural", "compliance"]:
        expert_vals = [expert_scores[k][dim] for k in expert_scores if k in judge_scores]
        judge_vals = [judge_scores[k][dim] for k in expert_scores if k in judge_scores]
        if len(expert_vals) >= 2:
            results[dim] = correlation(expert_vals, judge_vals)
        else:
            results[dim] = None
    return results
```

---

## Step 6 - Cost Tracking

```python
# cost.py
from .config import MODELS

def track_cost(model_key: str, usage: dict) -> float:
    """
    usage: {"input_tokens": N, "output_tokens": N}
    Returns cost in USD for this call.
    """
    cfg = MODELS[model_key]
    input_cost = (usage["input_tokens"] / 1000) * cfg["cost_per_1k_input"]
    output_cost = (usage["output_tokens"] / 1000) * cfg["cost_per_1k_output"]
    return round(input_cost + output_cost, 6)
```

---

## Step 7 - Storage

```sql
CREATE TABLE IF NOT EXISTS study_results (
    id              TEXT PRIMARY KEY,
    string_key      TEXT NOT NULL,
    category        TEXT NOT NULL,
    pipeline        TEXT NOT NULL,
    en_source       TEXT NOT NULL,
    ar_output       TEXT NOT NULL,
    score_variables  INTEGER,
    score_bidi       INTEGER,
    score_glossary   INTEGER,
    score_compliance INTEGER,
    score_grammar    INTEGER,
    score_cultural   INTEGER,
    score_total      REAL,
    cost_usd         REAL,
    latency_ms       REAL,
    compliance_violations TEXT,   -- JSON, for expert verification
    sesh_rules_fired TEXT,        -- JSON
    metadata         TEXT,        -- JSON
    created_at       TEXT NOT NULL
);
```

---

## Step 8 - The Orchestrator

```python
# run_study.py
import uuid, json
from datetime import datetime
from .config import PIPELINES, DIMENSION_WEIGHTS
from .corpus import load_corpus
from .scoring import (score_variables, score_bidi, score_glossary,
                      score_compliance, score_grammar, score_cultural)

def weighted_total(scores):
    return round(sum(scores[d] * w for d, w in DIMENSION_WEIGHTS.items()), 1)

def run_study(corpus_path="corpus.json"):
    corpus = load_corpus(corpus_path)
    pipelines = build_all_pipelines()  # instantiate all 5

    # First pass: generate all outputs (needed before cross-string glossary scoring)
    all_outputs = {}  # {pipeline_name: {string_key: PipelineOutput}}
    for pname, pipeline in pipelines.items():
        all_outputs[pname] = {}
        for string in corpus:
            ctx = {"tone": string.get("tone", "adults"), "genre": string.get("genre", "fps")}
            output = pipeline.translate(string["id"], string["en_source"], ctx)
            all_outputs[pname][string["id"]] = output

    # Second pass: score everything
    for pname in pipelines:
        pipeline_outputs = list(all_outputs[pname].values())
        for string in corpus:
            output = all_outputs[pname][string["id"]]

            comp_score, comp_violations = score_compliance(output, string)
            scores = {
                "variables":  score_variables(output, string),
                "bidi":       score_bidi(output, string),
                "glossary":   score_glossary(output, string, pipeline_outputs, glossary_db),
                "compliance": comp_score,
                "grammar":    score_grammar(output, string),
                "cultural":   score_cultural(output, string),
            }
            total = weighted_total(scores)

            store_result(string, output, scores, total, comp_violations)

    print("Study complete. Results in study_results table.")
    print_summary()

def print_summary():
    """Print per-pipeline averages and the critical comparison."""
    # Pipeline averages, per-category breakdown, cost totals
    # The numbers that go into the slides
    ...
```

---

## API Endpoints

```
POST  /benchmark/run          # kick off full study run (background job)
GET   /benchmark/status       # job progress
GET   /benchmark/results      # all results, grouped by pipeline + category
GET   /benchmark/summary      # the headline numbers for the slides
GET   /benchmark/string/:key  # all 5 pipeline outputs for one string
```

---

## Done When

```
1. All 5 pipelines instantiate and run on the existing Lyra strings from Thoth
2. Pipeline 4 and 5 correctly chain Scanner → Plan (with compliance reasoning) → LLM → Sesh
3. Pipeline 5 uses frontier for plan + compliance reasoning, budget for translation
4. Compliance is handled by reasoning in the plan layer - no hardcoded term list
5. Compliance decisions table stores confirmed cases for deterministic re-detection
6. All 6 scoring functions return 0-100 for every string
7. Variables, BiDi, glossary scores are deterministic (same input = same score)
8. Compliance scoring uses the judge reasoning prompt, scores all 5 pipelines uniformly
9. Cost tracking returns real USD figures per pipeline
10. Full study run on the Lyra strings completes and stores all results
11. /benchmark/summary returns per-pipeline averages and the critical comparison
12. Seeded cases (Al-Jabbar) score 0 on raw LLM pipelines, 100 on Sahure pipelines
```

Test on the existing ~16 Lyra strings. The full 60-80 string corpus arrives in Sprint 2.

---

## Note on Compliance - Reasoning, Not a List

There is no hardcoded forbidden-terms list anywhere in this engine. Compliance is handled two ways, both reasoning-based:

1. **Detection (in the pipeline):** the plan-layer frontier model reasons about religious, offensive, cultural, and political sensitivity in `generate_translation_plan_with_compliance()`. It catches Al-Jabbar because it understands what Al-Jabbar means, not because it is on a list.

2. **Scoring (in the study):** the judge LLM reasons about whether the output contains a violation. Same mechanism, applied to the result.

**The stored decisions table** gives determinism and speed over time - the glossary pattern applied to compliance:

```sql
CREATE TABLE IF NOT EXISTS compliance_decisions (
    id            TEXT PRIMARY KEY,
    source_pattern TEXT NOT NULL,     -- the English term/phrase that triggered it
    violation_type TEXT NOT NULL,     -- religious|offensive|cultural|political
    severity      TEXT NOT NULL,      -- critical|warning
    guidance      TEXT NOT NULL,      -- how to handle it in translation
    confirmed_by  TEXT,               -- human who confirmed
    confirmed_at  TEXT,
    created_at    TEXT NOT NULL
);
```

First time a risk is reasoned, it is flagged and (after human confirmation) stored. Future occurrences hit `lookup_compliance_decision()` first - instant, deterministic, no model call. Cold cases use intelligence, known cases use memory.

**Khaled seeds a handful of known catastrophic cases** (Al-Jabbar, Kaaba, etc.) into this table as confirmed decisions so the demo has guaranteed-deterministic behavior on the famous examples. But these are seeded learned cases, not a scan list - the system reasons about everything else it has never seen.

---

Ping me if anything blocks you. This is the foundation of the whole study.

---

*Sahure Labs · Confidential · DevGAMM Study Sprint 1 - The Benchmark Engine*
