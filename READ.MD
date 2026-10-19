You are an expert CatWeb scripter. Generate a valid CatWeb **script element** (JSON) that reads CSV data and draws a bar chart by resizing/repositioning pre-placed UI elements. Use the official knowledge base at https://github.com/angamer234k/catweb-guide as your ONLY reference.

## 1. Load these files before writing anything
- `01-core/SiteGPT-V11.md` — the authoritative output contract. Read the OUTPUT CONTRACT at the top and the action/event table it points to.
- `01-core/JSONScript.md` — events, action IDs, parameter shapes, flat-control-flow invariants.
- `02-ai-agent/SKILL.md` — the system/skill prompt.
- `02-ai-agent/output-contract.md` — hard output rules.
- `02-ai-agent/common-failures.md` — known hallucination traps.

SiteGPT V11 is the primary authority. If a capability is not in its action table, do not invent it.

## 2. Non-negotiable rules from SiteGPT V11
1. **Output is one JSON object.** Never Lua, never markup, never prose as the deliverable.
2. **Every scalar is a quoted string** — `"12"`, `"true"`, not raw numbers/booleans.
3. **Scripts are elements inside `webcontent`** — `{"class":"script", ...}` — never a top-level `"script"` key.
4. **Only action/event IDs from the authoritative table.** Never guess an ID; never invent a property key.
5. **Control flow is flat.** `If` / `Repeat` / `Iterate` / `Else` have no nested `"actions"`; their body is the following sibling actions, closed by `end` (id `25`).
6. **Variable names are numbers only** — `{1}`, `{40}`, `{o!5}`, `{l!2}`. Never words.
7. **`t`/`l` parameter shapes are fixed per slot** — copy them verbatim from the table.
8. **No `()` value labels inside `text` arrays.** Bare connectives only (`"Set"`, `"to"`, `"text to"`). Parentheses break publishing.
9. **Every opened control-flow block must be closed with `end`.**

## 3. What the script must do
**Input:** CSV text, one bar per row, optional header:
    label,value
    Apples,12
    Bananas,30
    Cherries,7

**Data source (priority order):**
1. If an object with alias `csvInput` exists, read its text with the documented “Get text from input” action.
2. Otherwise use the CSV string stored in global variable `{11}`.

**Parsing — only if the action table supports it:**
- Split on newline into rows.
- Skip row 1 if it contains a non-numeric value (header detection), or always skip row 1 and say so.
- Split each row on `","` into label and value.
- Convert the value cell to a number. If conversion fails, treat as `0`.
- Store up to **20** rows. Prefer list variables (`{l!n}`) if documented; otherwise use `{20}`–`{39}` for labels and `{40}`–`{59}` for values.

**Scaling and drawing:**
- Find `max` across the stored values using `If` and comparison actions (IDs 18–21 / 125–126).
- Guard against `max = 0`: if max is 0, set all bar heights to 0.
- For each bar `i`, compute `h = round(value_i / max * chartHeight)`, where `chartHeight` is `{60}` (default `"200"`).
- Set the height of the pre-placed rectangle with alias `bar1`…`bar20` using the documented “Set property” action (id 31). If the table documents a separate height action, use that instead.
- Set the text of `label1`…`label20` to the label using id 10 (“Set text”).
- Set `chartTitle` (id 10) to the header label if present, otherwise `"Chart"`.
- If more than 20 rows are supplied, ignore extras and set `chartStatus` to `"Too many rows – showing first 20"`.

**Events to include:**
- `When website loaded` (id 0): initialise defaults only.
- `Define function` (id 6) with alias `drawChart`: contains the parse + draw logic.
- `When button pressed` (id 1) on object alias `drawButton`: calls `drawChart` using the documented “Run function” action (id 87).

**Required pre-placed objects** (do not create them unless the table documents an element-creation action; if it does, create them instead):
`csvInput` (TextBox, optional), `chartTitle`, `chartStatus`, `bar1`…`bar20` (Rectangles), `label1`…`label20` (TextLabels, optional), `value1`…`value20` (TextLabels, optional).

## 4. If a capability is missing, STOP
Before emitting any JSON, check the action table for these specific capabilities:
- string splitting
- string → number conversion
- string trimming
- list/array access or iteration
- math divide / round
- setting an object’s height / size
- setting an object’s position
- setting an object’s color
- calling a defined function

If **any** of these is absent from the authoritative table, do **not** fake it. Return only a short plain-text explanation naming the missing action(s) and a feasible alternative (e.g. “CatWeb has no string-split action; pre-split the CSV into separate variables before the script runs”). Do not emit a half-working script.

## 5. Output format
- Return exactly **one JSON object** — the script element — with no Markdown fences and no explanatory prose.
- On the line immediately before it, list the required element aliases:
  `REQUIRES: csvInput, chartTitle, bar1..bar20, label1..label20, drawButton`
- If the missing-capability rule in §4 is triggered, return only the plain-text explanation.

## 6. Self-check before output
- [ ] Every `id` appears in SiteGPT V11 / `JSONScript.md` — no invented IDs.
- [ ] No nested `"actions"` inside `If` / `Repeat` / `Iterate` / `Else`; every opened block has an `end`.
- [ ] Variable names are numeric.
- [ ] No parentheses inside `text` arrays.
- [ ] All scalars are quoted strings.
- [ ] Division guarded against `max = 0`.
- [ ] Loop bounded to 20 rows and the loop counter is always incremented.
- [ ] Output is a single parseable JSON object.

**Test input to reason against:** `"Fruit,Qty\nApples,12\nBananas,30\nCherries,7"` → 3 bars, heights roughly 80, 200, 47 px on a 200 px chart.

Now generate the script.