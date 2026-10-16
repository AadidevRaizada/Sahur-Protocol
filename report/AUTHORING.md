# Sahur Protocol report — authoring guide

Everything in the report is generated from the Markdown files in `content/`. One file per chapter.
`node src/build.js` turns them into a designed PDF ("retro arcade zine" look) **and** a plain DOCX.
Write the content once, in the dialect below, and both outputs follow.

## 1. The report at a glance

| File | Type | Num | Badge (`exp`) | Title |
|---|---|---|---|---|
| `00a-acknowledgement.md` | front | – | – | Acknowledgement |
| `00b-abstract.md` | front | – | – | Abstract |
| `01-introduction.md` | chapter | 1 | Overview | Introduction |
| `02-literature-survey.md` | chapter | 2 | Experiment 1 · Part I | Literature Survey & Project Selection |
| `03-requirements.md` | chapter | 3 | Experiment 1 · Part II | Requirements Analysis & Specification |
| `04-agile-nfr.md` | chapter | 4 | Experiment 2 | Agile Non-Functional Requirements |
| `05-use-case.md` | chapter | 5 | Experiment 3 | Use Case Modelling |
| `06-activity.md` | chapter | 6 | Experiment 4 | Activity Modelling |
| `07-class.md` | chapter | 7 | Experiment 5 | Class Modelling |
| `08-sequence.md` | chapter | 8 | Experiment 6 | Sequence Modelling |
| `09-implementation.md` | chapter | 9 | Build & Results | Implementation, Testing & Results |
| `10-conclusion.md` | chapter | 10 | Wrap-up | Conclusion & Future Scope |
| `11-appendix-controls.md` | appendix | A | – | How to Play: Controls & Screens |
| `12-appendix-bestiary.md` | appendix | B | – | Bestiary: Enemies & Bosses |
| `13-appendix-skills.md` | appendix | C | – | Skill & Challenge Index |

References are generated automatically (from citations) and placed before the appendices.
Cover, certificate, contents, list of figures and list of tables are generated too — do not write them.

## 2. Ground truth (read before writing)

- `research/game-facts.md` — the verified fact sheet for the **real** game (read from its source code). It wins over everything else.
- `research/src-exp*.txt` — text of the original lab write-ups (Exp 1–6). These are the *content* source for each chapter: keep their structure, tasks and analysis, but **rewrite** them in better academic prose.
- The original write-ups contradicted each other (Exp 1 said "Unity/C# 2D platformer", Exp 3 said "rhythm bullet-hell where hits only land on the beat"). The team decided: **align everything to the real game**. So:
  - Never repeat a claim the fact sheet marks FALSE. Replace it with the true fact (e.g. the tech stack is a single HTML file with HTML5 Canvas + JavaScript running in the browser, deployed on Vercel — not Unity/C#).
  - Do **not** write about "earlier drafts", "corrections", or "the previous document was wrong". Just state the correct thing.
  - The diagram images are kept exactly as drawn. If a diagram label uses a different word from the game's on-screen term (e.g. "relic" vs the game's term), say so neutrally in the text or an `::: aside` (e.g. "the *Choose a Relic* node corresponds to the skill-pick screen").
- Team: Aadidev Raizada (N152), Kush Modi (N135), Pratham Baldewa (N153); Class E; Semester V; Software Engineering; SVKM's NMIMS MPSTME, Dept. of Computer Engineering; AY 2026–27. Repo: github.com/AadidevRaizada/Sahur-Protocol. Do **not** invent who-did-what splits, faculty names, marks or survey data.
- Dates that exist in the docs: Exp 4 performed 27/08/2026, Exp 5 02/09/2026, Exp 6 13/09/2026. Don't invent other dates.

## 3. Voice and style

- Academic report register: clear, precise, third person or "we/the team". Short-to-medium sentences. Define terms before using them. No hype words ("revolutionary", "seamless", "cutting-edge"), no filler ("It is worth noting that…", "In today's fast-paced world…").
- Each chapter = theory (condensed from the lab sheet, with citations) → application to Sahur Protocol → diagram/table → explanation → observations/learning → a closing `::: cleared` box.
- **"In plain words" notes** (`::: plain`) are the fun part: 2–4 casual sentences that explain the idea like you would to a friend who games. Light humour is welcome (the game is a meme-y satire about an "AI Bubble" and a log-shaped hero called Sahur), but keep them accurate. Put one after every diagram and after any heavy theory block. Don't overdo: roughly 1–2 per page of content.
- **Every printed page should have something visual**: a figure, table, stats strip, cards, a theory box or a sticky note. Avoid more than ~1 page of uninterrupted prose.
- Plain hyphens and commas are preferred over em dashes; use an em dash at most occasionally.
- Use British/Indian academic spelling consistently ("modelling", "behaviour", "colour").
- Keys: write `[[W]]`, `[[Space]]`, `[[Esc]]` — they render as keyboard caps.

## 4. Markdown dialect

### Front matter (top of every file)

```yaml
---
num: 5
title: Use Case Modelling
exp: Experiment 3
kicker: One line under the title, shown in a terminal font.
shot: shots/09-upgrade-choice.png      # screenshot shown in a CRT frame in the chapter opener (optional)
objectives:                            # 3–5 short "quest log" items (optional)
  - Identify the actors around the game system
  - Separate «include» from «extend»
---
```
Front docs use `type: front`, `title:`, `kicker:` and `tocLabel:` (e.g. `ABSTRACT`). Appendices use `type: appendix`, `letter: A`.

### Headings

- `## Section` → numbered 5.1, 5.2 … (appears in Contents). `### Sub-section` → 5.1.1. `#### Minor heading` → unnumbered small caps label.
- Never use a single `#` heading. Add ` {-}` at the end of a `##`/`###` to make it unnumbered.

### Citations and cross-references

- Cite with `[@key]` or `[@key1; @key2]` — keys from `content/refs.json`. They become IEEE numbers `[3]` automatically, numbered by first use across the whole report.
- If you truly need a new source, add it to `content/refs-<yourname>.json` (same format as refs.json, IEEE style string, *italics* with `*…*`). Only real, verifiable sources (books, standards, official docs, published papers, the actual games). Never invent a reference.
- Refer to figures/tables with `@fig:id` / `@tbl:id` → "Fig. 5.2" / "Table 5.3" (clickable). Ids must be unique across the whole report — prefix them with your chapter, e.g. `uc-diagram`, `req-fr`.

### Figures

```
::: figure src="diagrams/exp3-usecase.png" id="uc-diagram" size="full" frame="plain"
Caption sentence. Can use **bold** and citations.
:::
```
- `src` is relative to `assets/` (`shots/…` or `diagrams/…`).
- `size`: `full` (default) | `wide` | `large` | `half` | `small` | `rotate` (whole page, rotated 90° — use for very wide diagrams such as the class diagram).
- `frame`: `plain` (diagrams, default) | `crt` (game screenshots — use this for every screenshot) | `polaroid` (occasional fun one) | `none`.

Side-by-side images:
```
:::: gallery cols="2"
::: figure src="shots/06-biome1-combat.png" id="impl-b1" frame="crt"
Biome 1 combat.
:::
::: figure src="shots/07-biome2-combat.png" id="impl-b2" frame="crt"
Biome 2 combat.
:::
::::
```
(Outer containers use **four** colons, inner ones three.)

### Tables

Put a caption line (starting `Table:`) directly above the table, with or without a blank line between them:
```
Table: Functional requirements of Sahur Protocol {#tbl:req-fr}
| ID | Requirement | Priority |
|---|---|---|
| FR-01 | The system shall … | High |
```
Every table needs a caption. Keep tables ≤ 5 columns; cells short.

### Callouts

```
::: plain
Casual 2–4 sentence explanation. Optional label: ::: plain label="TL;DR"
:::

::: theory title="What is an activity diagram?"
Condensed textbook theory with citations [@pressman].
:::

::: aside title="DESIGN NOTE"
Side remark, mapping note, or interesting detail.
:::

::: patch title="FOUND IN REVIEW"
An issue/limitation discovered while modelling, and how it should be fixed.
:::

::: cleared
- Bullet summary of what the chapter achieved (end of every chapter; title defaults to LEVEL CLEARED)
:::
```

### Stats strip, cards, user stories, columns

```
::: stats
- 3 | Biomes
- 4 | Bosses
- 26 | Use cases
:::

:::: cards cols="3"
::: card title="The Scraper" tag="BOSS · BIOME 2" color="cyan" img="shots/10-boss-scraper.png"
- **HP:** 900
- One-line behaviour.
:::
::::
```
Card colours: `magenta` `cyan` `yellow` `lime` `violet` `orange` `wood`. `img` optional. Keep card bodies short (≤ 5 lines).

```
::: story id="NFR-US-01" title="Instant start" tag="PERFORMANCE"
**As a** player, **I want** …, **so that** ….

#### Acceptance criteria
1. Measurable criterion.
:::
```

```
:::: columns
::: col
Left column markdown.
:::
::: col
Right column markdown.
:::
::::
```

`::: pagebreak` + `:::` forces a new page (rarely needed).

## 5. Checking your work

```
node src/build.js --pdf --pages --outdir=build-<yourname> --only=05,06
python -I src/contact.py build-<yourname>/pages build-<yourname>/contact.png 4
```
`--only` limits chapters (front/back matter is always included). Look at the PNGs in `build-<yourname>/pages/` with the Read tool and fix anything ugly: big empty gaps, a figure stranded alone, a table split awkwardly, overflowing text. Every WARN line printed by the build must be fixed (unknown citation keys, unresolved cross-refs, missing assets).
