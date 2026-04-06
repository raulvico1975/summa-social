#!/usr/bin/env python3

from __future__ import annotations

import math
import subprocess
import tempfile
from pathlib import Path

from PIL import Image
import imageio_ffmpeg


ROOT = Path(__file__).resolve().parents[2]
OUTPUT_DIR = ROOT / "public" / "visuals" / "web" / "features-v3"
FEATURES_DIR = ROOT / "public" / "visuals" / "web" / "features"
TARGET_SIZE = (3840, 2160)
FPS = 30

MODEL_182_DIR = ROOT / "output" / "playwright" / "model-182-demo"
MODEL_347_DIR = ROOT / "output" / "playwright" / "model-347-demo"
HOME_EXTRA_DIR = ROOT / "output" / "playwright" / "home-extra-screens"
DASHBOARD_DIR = ROOT / "output" / "playwright" / "dashboard-control-demo"


def lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


def ease_in_out(t: float) -> float:
    return 0.5 - 0.5 * math.cos(math.pi * t)


def load_and_resize(path: Path) -> Image.Image:
    image = Image.open(path).convert("RGB")
    return image.resize(TARGET_SIZE, Image.Resampling.LANCZOS)


def load_first_existing(*paths: Path) -> Image.Image:
    for path in paths:
      if path.exists():
        return load_and_resize(path)
    raise FileNotFoundError(str(paths[0]))


def crop_to_box(image: Image.Image, box: tuple[float, float, float, float]) -> Image.Image:
    return image.crop(tuple(int(round(value)) for value in box)).resize(
        TARGET_SIZE,
        Image.Resampling.LANCZOS,
    )


def interpolate_box(
    start_box: tuple[float, float, float, float],
    end_box: tuple[float, float, float, float],
    t: float,
) -> tuple[float, float, float, float]:
    eased = ease_in_out(t)
    return tuple(lerp(start_box[index], end_box[index], eased) for index in range(4))


def save_poster(image: Image.Image, output_path: Path) -> None:
    image.save(output_path, format="WEBP", quality=92, method=6)


def encode_video(frame_dir: Path, output_path: Path) -> None:
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    args = [
        ffmpeg,
        "-y",
        "-framerate",
        str(FPS),
        "-i",
        str(frame_dir / "frame_%04d.png"),
        "-an",
        "-c:v",
        "libx264",
        "-preset",
        "slow",
        "-b:v",
        "18M",
        "-minrate",
        "18M",
        "-maxrate",
        "24M",
        "-bufsize",
        "36M",
        "-pix_fmt",
        "yuv420p",
        "-movflags",
        "+faststart",
        str(output_path),
    ]
    subprocess.run(args, check=True)


def box_from_region(center_x: float, center_y: float, zoom_factor: float) -> tuple[float, float, float, float]:
    width, height = TARGET_SIZE
    zoom_w = width / zoom_factor
    zoom_h = height / zoom_factor
    x0 = max(0, min(width - zoom_w, center_x - zoom_w * 0.5))
    y0 = max(0, min(height - zoom_h, center_y - zoom_h * 0.5))
    return (x0, y0, x0 + zoom_w, y0 + zoom_h)


def build_single_view_zoom_video(
    view: Image.Image,
    output_video: Path,
    poster: Path,
    focus_box: tuple[float, float, float, float],
    hold_start: int = 22,
    hold_focus: int = 52,
) -> None:
    save_poster(view, poster)

    full_box = (0.0, 0.0, float(TARGET_SIZE[0]), float(TARGET_SIZE[1]))
    frame_index = 0

    with tempfile.TemporaryDirectory(prefix=f"{output_video.stem}-") as tmp:
        frame_dir = Path(tmp)

        def write_frame(image: Image.Image, repeat: int = 1) -> None:
            nonlocal frame_index
            for _ in range(repeat):
                image.save(frame_dir / f"frame_{frame_index:04d}.png", format="PNG")
                frame_index += 1

        write_frame(view, repeat=hold_start)
        for step in range(22):
            box = interpolate_box(full_box, focus_box, step / 21)
            write_frame(crop_to_box(view, box))
        write_frame(crop_to_box(view, focus_box), repeat=hold_focus)
        for step in range(22):
            box = interpolate_box(focus_box, full_box, step / 21)
            write_frame(crop_to_box(view, box))
        write_frame(view, repeat=12)
        encode_video(frame_dir, output_video)


def build_two_state_video(
    start_view: Image.Image,
    focus_view: Image.Image,
    output_video: Path,
    start_poster: Path,
    focus_poster: Path | None,
    focus_box: tuple[float, float, float, float],
    hold_start: int = 18,
    hold_focus: int = 48,
) -> None:
    save_poster(start_view, start_poster)
    if focus_poster is not None:
        save_poster(focus_view, focus_poster)

    full_box = (0.0, 0.0, float(TARGET_SIZE[0]), float(TARGET_SIZE[1]))
    frame_index = 0

    with tempfile.TemporaryDirectory(prefix=f"{output_video.stem}-") as tmp:
        frame_dir = Path(tmp)

        def write_frame(image: Image.Image, repeat: int = 1) -> None:
            nonlocal frame_index
            for _ in range(repeat):
                image.save(frame_dir / f"frame_{frame_index:04d}.png", format="PNG")
                frame_index += 1

        write_frame(start_view, repeat=hold_start)
        for step in range(22):
            box = interpolate_box(full_box, focus_box, step / 21)
            write_frame(crop_to_box(start_view, box))
        for step in range(22):
            alpha = ease_in_out(step / 21)
            source = crop_to_box(start_view, focus_box)
            target = crop_to_box(focus_view, focus_box)
            write_frame(Image.blend(source, target, alpha))
        write_frame(crop_to_box(focus_view, focus_box), repeat=hold_focus)
        for step in range(22):
            alpha = ease_in_out(step / 21)
            write_frame(Image.blend(focus_view, start_view, alpha))
        write_frame(start_view, repeat=12)
        encode_video(frame_dir, output_video)


def build_report_to_dialog_video(
    report_view: Image.Image,
    dialog_view: Image.Image,
    output_video: Path,
    start_poster: Path,
    dialog_poster: Path | None,
    buttons_focus_box: tuple[float, float, float, float],
    hold_report: int = 22,
    hold_buttons: int = 24,
    hold_dialog: int = 44,
) -> None:
    save_poster(report_view, start_poster)
    if dialog_poster is not None:
        save_poster(dialog_view, dialog_poster)

    full_box = (0.0, 0.0, float(TARGET_SIZE[0]), float(TARGET_SIZE[1]))
    frame_index = 0

    with tempfile.TemporaryDirectory(prefix=f"{output_video.stem}-") as tmp:
        frame_dir = Path(tmp)

        def write_frame(image: Image.Image, repeat: int = 1) -> None:
            nonlocal frame_index
            for _ in range(repeat):
                image.save(frame_dir / f"frame_{frame_index:04d}.png", format="PNG")
                frame_index += 1

        write_frame(report_view, repeat=hold_report)
        for step in range(18):
            box = interpolate_box(full_box, buttons_focus_box, step / 17)
            write_frame(crop_to_box(report_view, box))
        write_frame(crop_to_box(report_view, buttons_focus_box), repeat=hold_buttons)
        for step in range(14):
            box = interpolate_box(buttons_focus_box, full_box, step / 13)
            write_frame(crop_to_box(report_view, box))
        for step in range(18):
            alpha = ease_in_out(step / 17)
            write_frame(Image.blend(report_view, dialog_view, alpha))
        write_frame(dialog_view, repeat=hold_dialog)
        for step in range(18):
            alpha = ease_in_out(step / 17)
            write_frame(Image.blend(dialog_view, report_view, alpha))
        write_frame(report_view, repeat=12)
        encode_video(frame_dir, output_video)


def build_dashboard_period_video(
    start_view: Image.Image,
    overview_view: Image.Image,
    output_video: Path,
    poster: Path,
) -> None:
    save_poster(start_view, poster)

    full_box = (0.0, 0.0, float(TARGET_SIZE[0]), float(TARGET_SIZE[1]))
    filters_box = box_from_region(TARGET_SIZE[0] * 0.58, TARGET_SIZE[1] * 0.16, 1.16)
    metrics_box = box_from_region(TARGET_SIZE[0] * 0.46, TARGET_SIZE[1] * 0.42, 1.12)
    frame_index = 0

    with tempfile.TemporaryDirectory(prefix=f"{output_video.stem}-") as tmp:
        frame_dir = Path(tmp)

        def write_frame(image: Image.Image, repeat: int = 1) -> None:
            nonlocal frame_index
            for _ in range(repeat):
                image.save(frame_dir / f"frame_{frame_index:04d}.png", format="PNG")
                frame_index += 1

        write_frame(start_view, repeat=18)
        for step in range(16):
            alpha = ease_in_out(step / 15)
            write_frame(Image.blend(start_view, overview_view, alpha))
        write_frame(overview_view, repeat=18)
        for step in range(18):
            box = interpolate_box(full_box, filters_box, step / 17)
            write_frame(crop_to_box(overview_view, box))
        write_frame(crop_to_box(overview_view, filters_box), repeat=18)
        for step in range(16):
            box = interpolate_box(filters_box, metrics_box, step / 15)
            write_frame(crop_to_box(overview_view, box))
        write_frame(crop_to_box(overview_view, metrics_box), repeat=24)
        for step in range(18):
            box = interpolate_box(metrics_box, full_box, step / 17)
            write_frame(crop_to_box(overview_view, box))
        write_frame(overview_view, repeat=12)
        encode_video(frame_dir, output_video)


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    model182_report = load_first_existing(MODEL_182_DIR / "model-182-report.png", FEATURES_DIR / "block4_model182.webp")
    model182_dialog = load_first_existing(MODEL_182_DIR / "model-182-dialog.png", FEATURES_DIR / "block4_model182.webp")
    model347_report = load_first_existing(MODEL_347_DIR / "model-347-report.png", FEATURES_DIR / "block4_model347.webp")
    model347_dialog = load_first_existing(MODEL_347_DIR / "model-347-dialog.png", FEATURES_DIR / "block4_model347.webp")
    closing_bundle = load_first_existing(HOME_EXTRA_DIR / "closing-bundle-dialog.png", FEATURES_DIR / "block4_excel_gestoria.webp")
    certificates = load_first_existing(FEATURES_DIR / "block4_certificats.webp")

    project_budget = load_first_existing(HOME_EXTRA_DIR / "project-budget.png", FEATURES_DIR / "block5_pressupost_partides.webp")
    project_expenses = load_first_existing(HOME_EXTRA_DIR / "project-expenses.png", FEATURES_DIR / "block5_assignacio_despeses.webp")
    project_export = load_first_existing(HOME_EXTRA_DIR / "project-export-dialog.png", FEATURES_DIR / "block5_export_financador.webp")
    field_capture = load_first_existing(HOME_EXTRA_DIR / "quick-expense-mobile.png", FEATURES_DIR / "block5_captura_terreny.webp")

    dashboard_start = load_first_existing(DASHBOARD_DIR / "dashboard-start.png", FEATURES_DIR / "block6_dashboard.webp")
    dashboard_overview = load_first_existing(DASHBOARD_DIR / "dashboard-overview.png", FEATURES_DIR / "block6_dashboard.webp")
    dashboard_share = load_first_existing(DASHBOARD_DIR / "dashboard-share-summary.png", FEATURES_DIR / "block6_informe_junta.webp")
    dashboard_pdf = load_first_existing(DASHBOARD_DIR / "dashboard-share-pdf-preview.png", FEATURES_DIR / "block6_exportacio_dades.webp")

    build_report_to_dialog_video(
        report_view=model182_report,
        dialog_view=model182_dialog,
        output_video=OUTPUT_DIR / "block4_model182_loop_4k.mp4",
        start_poster=OUTPUT_DIR / "block4_model182_start_4k.webp",
        dialog_poster=OUTPUT_DIR / "block4_model182_dialog_4k.webp",
        buttons_focus_box=box_from_region(TARGET_SIZE[0] * 0.71, TARGET_SIZE[1] * 0.17, 1.55),
    )

    build_report_to_dialog_video(
        report_view=model347_report,
        dialog_view=model347_dialog,
        output_video=OUTPUT_DIR / "block4_model347_loop_4k.mp4",
        start_poster=OUTPUT_DIR / "block4_model347_start_4k.webp",
        dialog_poster=OUTPUT_DIR / "block4_model347_dialog_4k.webp",
        buttons_focus_box=box_from_region(TARGET_SIZE[0] * 0.71, TARGET_SIZE[1] * 0.17, 1.55),
    )

    build_single_view_zoom_video(
        view=certificates,
        output_video=OUTPUT_DIR / "block4_certificats_loop_4k.mp4",
        poster=OUTPUT_DIR / "block4_certificats_start_4k.webp",
        focus_box=box_from_region(TARGET_SIZE[0] * 0.50, TARGET_SIZE[1] * 0.48, 1.12),
        hold_focus=60,
    )

    build_single_view_zoom_video(
        view=closing_bundle,
        output_video=OUTPUT_DIR / "block4_excel_gestoria_loop_4k.mp4",
        poster=OUTPUT_DIR / "block4_excel_gestoria_start_4k.webp",
        focus_box=box_from_region(TARGET_SIZE[0] * 0.50, TARGET_SIZE[1] * 0.55, 1.24),
        hold_focus=60,
    )

    build_single_view_zoom_video(
        view=project_budget,
        output_video=OUTPUT_DIR / "block5_pressupost_partides_loop_4k.mp4",
        poster=OUTPUT_DIR / "block5_pressupost_partides_start_4k.webp",
        focus_box=box_from_region(TARGET_SIZE[0] * 0.54, TARGET_SIZE[1] * 0.36, 1.10),
    )

    build_single_view_zoom_video(
        view=project_expenses,
        output_video=OUTPUT_DIR / "block5_assignacio_despeses_loop_4k.mp4",
        poster=OUTPUT_DIR / "block5_assignacio_despeses_start_4k.webp",
        focus_box=box_from_region(TARGET_SIZE[0] * 0.48, TARGET_SIZE[1] * 0.42, 1.12),
    )

    build_single_view_zoom_video(
        view=field_capture,
        output_video=OUTPUT_DIR / "block5_captura_terreny_loop_4k.mp4",
        poster=OUTPUT_DIR / "block5_captura_terreny_start_4k.webp",
        focus_box=box_from_region(TARGET_SIZE[0] * 0.52, TARGET_SIZE[1] * 0.44, 1.08),
    )

    build_two_state_video(
        start_view=project_budget,
        focus_view=project_export,
        output_video=OUTPUT_DIR / "block5_export_financador_loop_4k.mp4",
        start_poster=OUTPUT_DIR / "block5_export_financador_start_4k.webp",
        focus_poster=OUTPUT_DIR / "block5_export_financador_dialog_4k.webp",
        focus_box=box_from_region(TARGET_SIZE[0] * 0.50, TARGET_SIZE[1] * 0.48, 1.12),
    )

    build_dashboard_period_video(
        start_view=dashboard_start,
        overview_view=dashboard_overview,
        output_video=OUTPUT_DIR / "block6_dashboard_loop_4k.mp4",
        poster=OUTPUT_DIR / "block6_dashboard_start_4k.webp",
    )

    build_two_state_video(
        start_view=dashboard_overview,
        focus_view=dashboard_share,
        output_video=OUTPUT_DIR / "block6_informe_junta_loop_4k.mp4",
        start_poster=OUTPUT_DIR / "block6_informe_junta_start_4k.webp",
        focus_poster=OUTPUT_DIR / "block6_informe_junta_modal_4k.webp",
        focus_box=box_from_region(TARGET_SIZE[0] * 0.50, TARGET_SIZE[1] * 0.48, 1.10),
    )

    build_two_state_video(
        start_view=dashboard_share,
        focus_view=dashboard_pdf,
        output_video=OUTPUT_DIR / "block6_exportacio_dades_loop_4k.mp4",
        start_poster=OUTPUT_DIR / "block6_exportacio_dades_start_4k.webp",
        focus_poster=OUTPUT_DIR / "block6_exportacio_dades_pdf_4k.webp",
        focus_box=box_from_region(TARGET_SIZE[0] * 0.50, TARGET_SIZE[1] * 0.48, 1.08),
        hold_focus=52,
    )


if __name__ == "__main__":
    main()
