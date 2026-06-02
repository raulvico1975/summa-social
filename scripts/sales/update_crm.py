#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from datetime import date
from pathlib import Path
from typing import Any

from validate_crm import CRM_FIELDS, normalize_key, read_crm, validate_rows


def write_crm(path: Path, rows: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(rows, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def find_row(rows: list[dict[str, Any]], lead: dict[str, Any] | None = None, entity: str | None = None) -> int | None:
    keys = []
    if lead:
        keys.extend(
            [
                ("id", normalize_key(lead.get("id", ""))),
                ("entitat", normalize_key(lead.get("entitat", ""))),
                ("web", normalize_key(lead.get("web", ""))),
            ]
        )
    if entity:
        keys.append(("entitat", normalize_key(entity)))

    keys = [(field, value) for field, value in keys if value]
    for index, row in enumerate(rows):
        for field, value in keys:
            if normalize_key(row.get(field, "")) == value:
                return index
    return None


def load_lead(args: argparse.Namespace) -> dict[str, Any]:
    if args.lead_json:
        lead = json.loads(args.lead_json)
    elif args.lead_file:
        lead = json.loads(args.lead_file.read_text(encoding="utf-8"))
    else:
        raise ValueError("Cal --lead-json o --lead-file.")
    if not isinstance(lead, dict):
        raise ValueError("El lead ha de ser un objecte JSON.")
    return lead


def merge_lead(existing: dict[str, Any], incoming: dict[str, Any]) -> dict[str, Any]:
    merged = dict(existing)
    for field, value in incoming.items():
        if value is not None and str(value).strip() != "":
            merged[field] = value
    for field in CRM_FIELDS:
        merged.setdefault(field, "")
    return merged


def append_note(row: dict[str, Any], note: str) -> None:
    current = str(row.get("notes", "") or "").strip()
    row["notes"] = f"{current}\n{note}".strip() if current else note


def cmd_upsert(rows: list[dict[str, Any]], args: argparse.Namespace) -> tuple[list[dict[str, Any]], str]:
    lead = load_lead(args)
    for field in CRM_FIELDS:
        lead.setdefault(field, "")
    index = find_row(rows, lead=lead)
    if index is None:
        rows.append(lead)
        return rows, f"Afegit lead: {lead.get('entitat', '')}"
    rows[index] = merge_lead(rows[index], lead)
    return rows, f"Actualitzat lead: {rows[index].get('entitat', '')}"


def cmd_record_contact(rows: list[dict[str, Any]], args: argparse.Namespace) -> tuple[list[dict[str, Any]], str]:
    index = find_row(rows, entity=args.entity)
    if index is None:
        raise ValueError(f"No he trobat l'entitat al CRM: {args.entity}")
    row = rows[index]
    contact_date = args.date or date.today().isoformat()
    row["estat"] = "contactat"
    row["canal"] = args.channel
    row["data_ultim_contacte"] = contact_date
    row["proper_pas"] = args.next_step
    if args.destinatari:
        row["persona_contacte"] = row.get("persona_contacte") or args.destinatari
    note = f"{contact_date} · contactat · {args.channel} · {args.destinatari or '-'} · {args.summary}"
    append_note(row, note)
    return rows, f"Registrat contacte: {row.get('entitat', args.entity)}"


def cmd_record_response(rows: list[dict[str, Any]], args: argparse.Namespace) -> tuple[list[dict[str, Any]], str]:
    index = find_row(rows, entity=args.entity)
    if index is None:
        raise ValueError(f"No he trobat l'entitat al CRM: {args.entity}")
    row = rows[index]
    row["estat"] = args.state
    row["dolor_probable"] = args.topic or row.get("dolor_probable", "")
    row["proper_pas"] = args.next_question
    note = (
        f"{args.date or date.today().isoformat()} · resposta · "
        f"literal: {args.literal} · resum: {args.summary}"
    )
    append_note(row, note)
    if args.classification:
        row["classificacio_lead"] = args.classification
    return rows, f"Registrada resposta: {row.get('entitat', args.entity)}"


def add_write_argument(parser: argparse.ArgumentParser) -> None:
    parser.add_argument(
        "--write",
        action="store_true",
        default=argparse.SUPPRESS,
        help="Escriu els canvis. Sense aixo nomes mostra el pla.",
    )


def main() -> int:
    parser = argparse.ArgumentParser(description="Actualitza un CRM local de Summa Vendes.")
    parser.add_argument("crm_path", type=Path)
    parser.add_argument("--write", action="store_true", help="Escriu els canvis. Sense aixo nomes mostra el pla.")
    subparsers = parser.add_subparsers(dest="command", required=True)

    upsert = subparsers.add_parser("upsert")
    upsert.add_argument("--lead-json")
    upsert.add_argument("--lead-file", type=Path)
    add_write_argument(upsert)
    upsert.set_defaults(handler=cmd_upsert)

    contact = subparsers.add_parser("record-contact")
    contact.add_argument("--entity", required=True)
    contact.add_argument("--channel", required=True)
    contact.add_argument("--destinatari", default="")
    contact.add_argument("--date")
    contact.add_argument("--summary", required=True)
    contact.add_argument("--next-step", required=True)
    add_write_argument(contact)
    contact.set_defaults(handler=cmd_record_contact)

    response = subparsers.add_parser("record-response")
    response.add_argument("--entity", required=True)
    response.add_argument("--literal", required=True)
    response.add_argument("--summary", required=True)
    response.add_argument("--state", choices=["resposta", "conversa", "demo", "perdut"], default="resposta")
    response.add_argument("--topic", default="")
    response.add_argument("--next-question", required=True)
    response.add_argument("--classification", default="")
    response.add_argument("--date")
    add_write_argument(response)
    response.set_defaults(handler=cmd_record_response)

    args = parser.parse_args()
    rows = read_crm(args.crm_path) if args.crm_path.exists() else []
    rows, message = args.handler(rows, args)
    errors, warnings = validate_rows(rows)

    print("CRM_UPDATE_PLAN" if not args.write else "CRM_UPDATE_WRITE")
    print(message)
    if errors:
        print("\nErrors de validacio:")
        for error in errors:
            print(f"- {error}")
        return 1
    if warnings:
        print("\nAvisos:")
        for warning in warnings:
            print(f"- {warning}")

    if args.write:
        write_crm(args.crm_path, rows)
        print(f"CRM_UPDATE_OK -> {args.crm_path}")
    else:
        print("No s'ha escrit cap canvi. Afegeix --write per aplicar-lo.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
