#!/usr/bin/env python3
from __future__ import annotations

import argparse
import csv
import json
import zipfile
from pathlib import Path
from xml.sax.saxutils import escape

from validate_crm import CRM_FIELDS, read_crm, validate_rows


def ordered_fields(rows: list[dict]) -> list[str]:
    extras: list[str] = []
    for row in rows:
        for field in row.keys():
            if field not in CRM_FIELDS and field not in extras:
                extras.append(field)
    return CRM_FIELDS + extras


def write_csv(rows: list[dict], output_path: Path) -> None:
    fields = ordered_fields(rows)
    with output_path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        for row in rows:
            writer.writerow({field: row.get(field, "") for field in fields})


def column_name(index: int) -> str:
    name = ""
    while index:
        index, remainder = divmod(index - 1, 26)
        name = chr(65 + remainder) + name
    return name


def sheet_xml(rows: list[dict], fields: list[str]) -> str:
    all_rows = [fields] + [[row.get(field, "") for field in fields] for row in rows]
    xml_rows: list[str] = []
    for row_index, values in enumerate(all_rows, start=1):
        cells: list[str] = []
        for col_index, value in enumerate(values, start=1):
            ref = f"{column_name(col_index)}{row_index}"
            text = escape("" if value is None else str(value))
            cells.append(f'<c r="{ref}" t="inlineStr"><is><t>{text}</t></is></c>')
        xml_rows.append(f'<row r="{row_index}">{"".join(cells)}</row>')
    return (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
        f'<sheetData>{"".join(xml_rows)}</sheetData>'
        "</worksheet>"
    )


def write_xlsx(rows: list[dict], output_path: Path) -> None:
    fields = ordered_fields(rows)
    files = {
        "[Content_Types].xml": (
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
            '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
            '<Default Extension="xml" ContentType="application/xml"/>'
            '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
            '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
            "</Types>"
        ),
        "_rels/.rels": (
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'
            "</Relationships>"
        ),
        "xl/workbook.xml": (
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
            'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
            '<sheets><sheet name="Leads" sheetId="1" r:id="rId1"/></sheets>'
            "</workbook>"
        ),
        "xl/_rels/workbook.xml.rels": (
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>'
            "</Relationships>"
        ),
        "xl/worksheets/sheet1.xml": sheet_xml(rows, fields),
    }
    with zipfile.ZipFile(output_path, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for name, content in files.items():
            archive.writestr(name, content)


def main() -> int:
    parser = argparse.ArgumentParser(description="Exporta el CRM de Summa Vendes a CSV o XLSX.")
    parser.add_argument("crm_path", type=Path)
    parser.add_argument("output_path", type=Path)
    parser.add_argument("--allow-warnings", action="store_true")
    args = parser.parse_args()

    rows = read_crm(args.crm_path)
    errors, warnings = validate_rows(rows)
    if errors:
        print("CRM_EXPORT_BLOCKED")
        for error in errors:
            print(f"- {error}")
        return 1
    if warnings and not args.allow_warnings:
        print("CRM_EXPORT_WARNINGS")
        for warning in warnings:
            print(f"- {warning}")
        print("Torna a executar amb --allow-warnings si vols exportar igualment.")
        return 1

    args.output_path.parent.mkdir(parents=True, exist_ok=True)
    suffix = args.output_path.suffix.lower()
    if suffix == ".csv":
        write_csv(rows, args.output_path)
    elif suffix == ".xlsx":
        write_xlsx(rows, args.output_path)
    else:
        raise SystemExit("El fitxer de sortida ha de ser .csv o .xlsx.")

    print(f"CRM_EXPORT_OK {len(rows)} leads -> {args.output_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
