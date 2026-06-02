#!/usr/bin/env python3
from __future__ import annotations

import argparse
import csv
import json
import re
import sys
import unicodedata
from pathlib import Path
from typing import Any


CRM_FIELDS = [
    "id",
    "entitat",
    "web",
    "persona_contacte",
    "rol",
    "canal",
    "prioritat",
    "estat",
    "fets_verificats",
    "hipotesi_comercial",
    "risc",
    "angle",
    "missatge_proposat",
    "data_ultim_contacte",
    "proper_pas",
    "notes",
    "pla_probable",
    "motiu_pla_probable",
    "dolor_probable",
    "pregunta_obertura",
]

REQUIRED_FIELDS = ["id", "entitat", "estat", "prioritat"]
STATES = {
    "nou",
    "revisat",
    "descartat",
    "missatge_aprovat",
    "contactat",
    "resposta",
    "conversa",
    "demo",
    "perdut",
}
PRIORITIES = {"alta", "mitjana", "baixa"}
HYPOTHESIS_MARKERS = {
    "probable",
    "sembla",
    "podria",
    "potser",
    "hipotesi",
    "inferit",
    "intuicio",
}
FORBIDDEN_MESSAGE_TERMS = {
    "solucion",
    "optimizar",
    "potenciar",
    "impulsar",
    "transformacion digital",
    "saas",
    "pitch",
    "demo generica",
    "escalar",
    "disruptivo",
    "sinergia",
}


def normalize_text(value: Any) -> str:
    text = "" if value is None else str(value)
    text = unicodedata.normalize("NFKD", text.strip().lower())
    return "".join(ch for ch in text if not unicodedata.combining(ch))


def normalize_key(value: Any) -> str:
    text = normalize_text(value)
    text = re.sub(r"^https?://", "", text)
    text = re.sub(r"^www\.", "", text)
    text = re.sub(r"/+$", "", text)
    text = re.sub(r"[^a-z0-9]+", " ", text)
    return " ".join(text.split())


def row_value(row: dict[str, Any], field: str) -> str:
    value = row.get(field, "")
    return "" if value is None else str(value).strip()


def read_crm(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        raise FileNotFoundError(path)

    if path.suffix.lower() == ".csv":
        with path.open("r", encoding="utf-8-sig", newline="") as handle:
            return [dict(row) for row in csv.DictReader(handle)]

    with path.open("r", encoding="utf-8") as handle:
        data = json.load(handle)

    if isinstance(data, list):
        return [dict(row) for row in data]
    if isinstance(data, dict) and isinstance(data.get("leads"), list):
        return [dict(row) for row in data["leads"]]
    raise ValueError("El CRM ha de ser una llista JSON o un objecte amb camp 'leads'.")


def validate_rows(rows: list[dict[str, Any]]) -> tuple[list[str], list[str]]:
    errors: list[str] = []
    warnings: list[str] = []
    seen_ids: dict[str, int] = {}
    seen_entities: dict[str, int] = {}
    seen_webs: dict[str, int] = {}

    if not rows:
        warnings.append("El CRM no conte cap lead.")

    for index, row in enumerate(rows, start=1):
        label = row_value(row, "entitat") or f"fila {index}"

        for field in REQUIRED_FIELDS:
            if not row_value(row, field):
                errors.append(f"{label}: falta el camp obligatori '{field}'.")

        for field, value in row.items():
            if normalize_text(value) == "undefined":
                errors.append(f"{label}: el camp '{field}' conte el valor prohibit 'undefined'.")

        state = normalize_text(row_value(row, "estat"))
        priority = normalize_text(row_value(row, "prioritat"))
        if state and state not in STATES:
            errors.append(f"{label}: estat invalid '{row_value(row, 'estat')}'.")
        if priority and priority not in PRIORITIES:
            errors.append(f"{label}: prioritat invalida '{row_value(row, 'prioritat')}'.")

        lead_id = normalize_key(row_value(row, "id"))
        entity_key = normalize_key(row_value(row, "entitat"))
        web_key = normalize_key(row_value(row, "web"))

        if lead_id:
            if lead_id in seen_ids:
                errors.append(f"{label}: id duplicat amb fila {seen_ids[lead_id]}.")
            seen_ids[lead_id] = index

        if entity_key:
            if entity_key in seen_entities:
                errors.append(f"{label}: entitat duplicada amb fila {seen_entities[entity_key]}.")
            seen_entities[entity_key] = index

        if web_key:
            if web_key in seen_webs:
                errors.append(f"{label}: web duplicada amb fila {seen_webs[web_key]}.")
            seen_webs[web_key] = index

        facts = normalize_text(row_value(row, "fets_verificats"))
        hypothesis = normalize_text(row_value(row, "hipotesi_comercial"))
        if facts and any(marker in facts for marker in HYPOTHESIS_MARKERS):
            warnings.append(f"{label}: 'fets_verificats' sembla contenir hipotesis.")
        if hypothesis and "verificat" in hypothesis:
            warnings.append(f"{label}: 'hipotesi_comercial' sembla contenir llenguatge de fet verificat.")
        if not facts and state in {"revisat", "missatge_aprovat", "contactat", "resposta", "conversa", "demo"}:
            warnings.append(f"{label}: estat '{state}' sense fets verificats.")

        if state == "contactat":
            for field in ["canal", "data_ultim_contacte", "proper_pas"]:
                if not row_value(row, field):
                    errors.append(f"{label}: estat contactat requereix '{field}'.")

        if state == "missatge_aprovat" and not row_value(row, "missatge_proposat"):
            errors.append(f"{label}: estat missatge_aprovat requereix 'missatge_proposat'.")

        if state == "descartat" and not (row_value(row, "risc") or row_value(row, "notes")):
            warnings.append(f"{label}: descartat sense risc ni nota de motiu.")

        message = normalize_text(row_value(row, "missatge_proposat"))
        for term in FORBIDDEN_MESSAGE_TERMS:
            if term in message:
                warnings.append(f"{label}: missatge_proposat conte llenguatge a revisar: '{term}'.")

    return errors, warnings


def main() -> int:
    parser = argparse.ArgumentParser(description="Valida un CRM local de Summa Vendes.")
    parser.add_argument("crm_path", type=Path)
    parser.add_argument("--json", action="store_true", help="Mostra el resultat en JSON.")
    args = parser.parse_args()

    try:
        rows = read_crm(args.crm_path)
        errors, warnings = validate_rows(rows)
    except Exception as exc:  # noqa: BLE001 - CLI diagnostic
        if args.json:
            print(json.dumps({"ok": False, "errors": [str(exc)], "warnings": []}, ensure_ascii=False, indent=2))
        else:
            print("CRM_VALIDATE_FAIL")
            print(f"- {exc}")
        return 1

    ok = not errors
    if args.json:
        print(json.dumps({"ok": ok, "rows": len(rows), "errors": errors, "warnings": warnings}, ensure_ascii=False, indent=2))
        return 0 if ok else 1

    print("CRM_VALIDATE_OK" if ok else "CRM_VALIDATE_FAIL")
    print(f"Files revisades: {len(rows)}")
    if errors:
        print("\nErrors:")
        for error in errors:
            print(f"- {error}")
    if warnings:
        print("\nAvisos:")
        for warning in warnings:
            print(f"- {warning}")
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
