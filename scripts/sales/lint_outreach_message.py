#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import re
import sys
import unicodedata
from pathlib import Path
from typing import Any


REPLACEMENTS = [
    (r"\bsoluci[oó]n(?:es)?\b", "forma de ordenar esa parte"),
    (r"\boptimizar\b", "revisar"),
    (r"\bpotenciar\b", "dar mas orden a"),
    (r"\bimpulsar\b", "acompanar"),
    (r"\btransformaci[oó]n digital\b", "cambio de herramientas"),
    (r"\bSaaS\b", "herramienta"),
    (r"\bpitch\b", "mensaje"),
    (r"\bdemo gen[eé]rica\b", "conversacion corta"),
    (r"\bescalar\b", "hacerlo sostenible"),
    (r"\bdisruptiv[oa]s?\b", "diferente"),
    (r"\bsinergias?\b", "colaboracion concreta"),
]

MASS_MESSAGE_PATTERNS = [
    r"gran labor",
    r"me pongo en contacto",
    r"nos encantaria",
    r"te presento",
    r"agenda una demo",
    r"descubre",
    r"queria presentarte",
]

UNVERIFIED_PROBLEM_PATTERNS = [
    r"teneis problemas",
    r"os cuesta",
    r"seguro que",
    r"necesitais",
    r"os falta",
    r"vuestro problema",
]


def normalize_text(value: str) -> str:
    text = unicodedata.normalize("NFKD", value.strip().lower())
    return "".join(ch for ch in text if not unicodedata.combining(ch))


def count_words(text: str) -> int:
    return len(re.findall(r"\b[\wáéíóúüñçÁÉÍÓÚÜÑÇ'-]+\b", text, flags=re.UNICODE))


def apply_replacements(text: str) -> tuple[str, list[str]]:
    corrected = text
    changes: list[str] = []
    for pattern, replacement in REPLACEMENTS:
        if re.search(pattern, corrected, flags=re.IGNORECASE):
            corrected = re.sub(pattern, replacement, corrected, flags=re.IGNORECASE)
            changes.append(f"{pattern} -> {replacement}")
    return corrected, changes


def fact_tokens(facts: list[str]) -> set[str]:
    tokens: set[str] = set()
    for fact in facts:
        for token in re.findall(r"[a-z0-9áéíóúüñç]+", normalize_text(fact)):
            if len(token) >= 5:
                tokens.add(token)
                if token.endswith("es") and len(token) > 6:
                    tokens.add(token[:-2])
                if token.endswith("s") and len(token) > 5:
                    tokens.add(token[:-1])
    return tokens


def lint_message(text: str, facts: list[str], allow_demo: bool = False) -> dict[str, Any]:
    errors: list[str] = []
    warnings: list[str] = []
    corrected, changes = apply_replacements(text)
    normalized = normalize_text(text)
    word_count = count_words(text)

    for pattern, _replacement in REPLACEMENTS:
        if re.search(pattern, text, flags=re.IGNORECASE):
            errors.append(f"Conté llenguatge prohibit o massa comercial: {pattern}.")

    if word_count > 100:
        errors.append(f"El missatge te {word_count} paraules; el maxim es 100.")

    for pattern in MASS_MESSAGE_PATTERNS:
        if re.search(pattern, normalized):
            warnings.append(f"Sembla massa massiu o comercial: {pattern}.")

    for pattern in UNVERIFIED_PROBLEM_PATTERNS:
        if re.search(pattern, normalized):
            errors.append(f"Atribueix un problema no verificat: {pattern}.")

    if not allow_demo and "demo" in normalized:
        warnings.append("Parla de demo; comprova que no sigui una demo generica ni una entrada massa directa.")

    if text.count("?") + text.count("¿") > 3:
        warnings.append("Fa massa preguntes d'entrada.")

    tokens = fact_tokens(facts)
    if tokens:
        message_tokens = set(re.findall(r"[a-z0-9áéíóúüñç]+", normalized))
        for token in list(message_tokens):
            if token.endswith("es") and len(token) > 6:
                message_tokens.add(token[:-2])
            if token.endswith("s") and len(token) > 5:
                message_tokens.add(token[:-1])
        if not (tokens & message_tokens):
            errors.append("No referencia cap dels fets reals passats amb --fact.")
    else:
        warnings.append("No s'ha passat cap --fact; revisa manualment que el missatge referencia un fet real.")

    if "summa social" in normalized and "te presento" in normalized:
        warnings.append("Presenta Summa Social massa aviat; nomes hauria de passar si Raul ho ha demanat o hi ha context.")

    return {
        "ok": not errors,
        "word_count": word_count,
        "errors": errors,
        "warnings": warnings,
        "corrected_message": corrected.strip(),
        "changes": changes,
    }


def read_message(path: Path | None) -> str:
    if path is None or str(path) == "-":
        return sys.stdin.read()
    return path.read_text(encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description="Revisa un missatge comercial de Summa Vendes.")
    parser.add_argument("message_path", nargs="?", type=Path, help="Fitxer del missatge. Usa '-' o omet per stdin.")
    parser.add_argument("--fact", action="append", default=[], help="Fet real verificat que el missatge ha de poder referenciar.")
    parser.add_argument("--facts-file", type=Path, help="Fitxer amb fets verificats, un per linia.")
    parser.add_argument("--allow-demo", action="store_true", help="Permet mencions de demo si ja hi ha context.")
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    facts = list(args.fact)
    if args.facts_file:
        facts.extend(line.strip() for line in args.facts_file.read_text(encoding="utf-8").splitlines() if line.strip())

    result = lint_message(read_message(args.message_path), facts, args.allow_demo)

    if args.json:
        print(json.dumps(result, ensure_ascii=False, indent=2))
    else:
        print("MESSAGE_LINT_OK" if result["ok"] else "MESSAGE_LINT_FAIL")
        print(f"Paraules: {result['word_count']}")
        if result["errors"]:
            print("\nErrors:")
            for item in result["errors"]:
                print(f"- {item}")
        if result["warnings"]:
            print("\nAvisos:")
            for item in result["warnings"]:
                print(f"- {item}")
        if result["changes"]:
            print("\nCanvis suggerits:")
            for item in result["changes"]:
                print(f"- {item}")
        print("\nMissatge corregit:")
        print(result["corrected_message"])

    return 0 if result["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
