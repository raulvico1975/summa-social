# Summa Social HyperFrames — Storyboard

Working rule: this file maps the current compositions to actual scene beats,
copy, reusable components, and overlays. It is not a pitch deck summary.

## 05-devolucions-estat-real-16x9
- Composition: `compositions/05-devolucions-estat-real-16x9.html`
- Format: `16:9`
- Duration: `12s`
- Base sequence: `compositions/components/summa-sequence.html`
- Caption system: `compositions/components/summa-caption.html`
- Lower third: `compositions/components/summa-lower-third.html` from `6s` to `9s`

| Time | Scene | Primary text | Visual component | Caption / overlay | CTA / action |
| --- | --- | --- | --- | --- | --- |
| `0-3s` | Hook | `Si no saps quina quota ha tornat, la feina s'encalla.` | `summa-sequence` → `scene-hook` | Caption: `Si no saps quina quota ha tornat, no pots decidir bé.` | None |
| `3-6s` | Problem | `Banc, Excel i trucades no coincideixen.` | `summa-sequence` → `scene-problem` | Caption: `Quan banc i Excel no coincideixen, el control es trenca.` | None |
| `6-9s` | Solution | `Quota, motiu i estat queden junts.` | `summa-sequence` → `scene-solution` | Lower third: `Lligar` + operational copy | Operational action only |
| `9-12s` | Outcome | `Abans de reintentar, ja sabeu què toca.` | `summa-sequence` → `scene-outcome` | Caption: `Primer entendre el cas. Després decidir l'acció.` | No dedicated CTA shell |
