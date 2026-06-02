#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from typing import Any

from validate_crm import read_crm


POSITIVE_FACTORS = [
    ("memoria recent publicada", 10, [r"memoria", r"memòria"]),
    ("subvencions visibles", 10, [r"subvencio", r"subvención", r"subvencions", r"subvenciones"]),
    ("donants/socis/quotes", 10, [r"\bdonants?\b", r"\bdonantes?\b", r"\bsocis?\b", r"\bsocios?\b", r"\bquotes?\b", r"\bcuotas?\b"]),
    ("projectes amb justificacio", 10, [r"projecte", r"proyecto", r"justificacio", r"justificacion"]),
    ("cooperacio internacional", 10, [r"cooperacio", r"cooperacion", r"internacional"]),
    ("gestio economica recurrent", 8, [r"conciliacio", r"banc", r"banco", r"remesa", r"sepa", r"model 182", r"modelo 182"]),
]

NEGATIVE_FACTORS = [
    ("entitat massa gran", -25, [r"massa gran", r"muy grande", r"gran fundacio", r"gran fundación"]),
    ("fundacio molt institucional", -20, [r"molt institucional", r"muy institucional"]),
    ("empresa/federacio/administracio", -20, [r"empresa", r"federacio", r"federacion", r"administracio publica", r"administracion publica"]),
    ("sense activitat recent visible", -15, [r"sense activitat", r"sin actividad", r"inactiva"]),
    ("sense gestio economica rellevant", -10, [r"sense gestio economica", r"sin gestion economica"]),
    ("ja contactada o relacio sensible", -20, [r"ja contactada", r"contactat", r"relacio sensible", r"relacion sensible"]),
    ("possible conflicte GONG o altra eina", -15, [r"\bgong\b", r"altra eina", r"otra herramienta"]),
]


def row_text(row: dict[str, Any]) -> str:
    return " ".join("" if value is None else str(value) for value in row.values()).lower()


def match_patterns(text: str, patterns: list[str]) -> bool:
    return any(re.search(pattern, text, flags=re.IGNORECASE) for pattern in patterns)


def parse_budget_amounts(text: str) -> list[int]:
    amounts: list[int] = []
    for raw in re.findall(r"\b\d[\d\.\s]{3,}(?:,\d{1,2})?\b", text):
        cleaned = re.sub(r"[^\d]", "", raw)
        if cleaned:
            amounts.append(int(cleaned))
    for raw, suffix in re.findall(r"\b(\d{2,4})\s*([kK])\b", text):
        amounts.append(int(raw) * 1000)
    return amounts


def qualify(row: dict[str, Any]) -> dict[str, Any]:
    text = row_text(row)
    score = 0
    signals: list[str] = []
    risks: list[str] = []
    amounts = parse_budget_amounts(text)

    def add_signal(label: str, points: int) -> None:
        nonlocal score
        if label not in signals:
            score += points
            signals.append(label)

    def add_risk(label: str, points: int) -> None:
        nonlocal score
        if label not in risks:
            score += points
            risks.append(label)

    if any(50000 <= amount <= 400000 for amount in amounts):
        add_signal("pressupost dins 50k-400k", 20)
    elif any(amount > 400000 for amount in amounts):
        add_risk("entitat massa gran", -25)

    for label, points, patterns in POSITIVE_FACTORS:
        if match_patterns(text, patterns):
            add_signal(label, points)

    if str(row.get("persona_contacte", "") or "").strip():
        add_signal("persona operativa identificable", 8)

    for label, points, patterns in NEGATIVE_FACTORS:
        if match_patterns(text, patterns):
            add_risk(label, points)

    score = max(0, min(100, score))
    hard_discard = any(risk in risks for risk in ["entitat massa gran", "empresa/federacio/administracio", "sense activitat recent visible"])
    if hard_discard or score < 30:
        temperature = "DESCARTAR"
    elif score >= 70 and not risks:
        temperature = "HOT"
    elif score >= 50:
        temperature = "WARM"
    else:
        temperature = "TEBI"

    return {
        "entitat": row.get("entitat", ""),
        "temperatura": temperature,
        "score": score,
        "icp": "encaix probable" if score >= 50 and not hard_discard else "encaix no confirmat",
        "senyals": signals,
        "riscos": risks,
        "angle": row.get("angle", ""),
        "proper_pas": row.get("proper_pas", "") or "investigar una dada verificable i revisar prioritat",
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Qualifica leads locals de Summa Vendes.")
    parser.add_argument("crm_path", type=Path)
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    rows = read_crm(args.crm_path)
    results = [qualify(row) for row in rows]

    if args.json:
        print(json.dumps(results, ensure_ascii=False, indent=2))
        return 0

    for result in results:
        print(f"Entitat: {result['entitat']}")
        print(f"Temperatura: {result['temperatura']}")
        print(f"Score: {result['score']}")
        print(f"ICP: {result['icp']}")
        print(f"Senyals: {', '.join(result['senyals']) if result['senyals'] else '-'}")
        print(f"Risc: {', '.join(result['riscos']) if result['riscos'] else '-'}")
        print(f"Angle: {result['angle'] or '-'}")
        print(f"Proper pas: {result['proper_pas']}")
        print()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
