#!/usr/bin/env python3

from __future__ import annotations

import math
import shutil
import subprocess
import tempfile
from pathlib import Path

from PIL import Image
import imageio_ffmpeg


ROOT = Path(__file__).resolve().parents[2]
SOURCE_DIR = ROOT / "output" / "playwright" / "bank-reconciliation-import-only"
OUTPUT_STILLS_DIR = ROOT / "public" / "media" / "features" / "importar-extracte-bancari" / "stills"
OUTPUT_VIDEO_DIR = ROOT / "public" / "media" / "features" / "importar-extracte-bancari" / "video"
TARGET_SIZE = (3840, 2160)
FPS = 30


def lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


def ease_in_out(t: float) -> float:
    return 0.5 - 0.5 * math.cos(math.pi * t)


def load_and_resize(path: Path) -> Image.Image:
    image = Image.open(path).convert("RGB")
    return image.resize(TARGET_SIZE, Image.Resampling.LANCZOS)


def detect_import_button(image: Image.Image) -> tuple[int, int, int, int]:
    width, height = image.size
    x_min, y_min, x_max, y_max = width, height, 0, 0
    found = False

    pixels = image.load()
    for y in range(0, int(height * 0.45)):
        for x in range(0, int(width * 0.32)):
            r, g, b = pixels[x, y]
            if b > 150 and g > 95 and r < 110:
                found = True
                x_min = min(x_min, x)
                y_min = min(y_min, y)
                x_max = max(x_max, x)
                y_max = max(y_max, y)

    if not found:
        return (
            int(width * 0.11),
            int(height * 0.18),
            int(width * 0.26),
            int(height * 0.33),
        )

    return (x_min, y_min, x_max, y_max)


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


def build_zoom_box(button_box: tuple[int, int, int, int]) -> tuple[float, float, float, float]:
    width, height = TARGET_SIZE
    full_w = width / 1.32
    full_h = height / 1.32
    center_x = (button_box[0] + button_box[2]) / 2
    center_y = (button_box[1] + button_box[3]) / 2

    x0 = max(0, min(width - full_w, center_x - full_w * 0.45))
    y0 = max(0, min(height - full_h, center_y - full_h * 0.5))
    return (x0, y0, x0 + full_w, y0 + full_h)


def build_preimport_metric_zoom_box() -> tuple[float, float, float, float]:
    width, height = TARGET_SIZE
    zoom_w = width / 1.72
    zoom_h = height / 1.72

    center_x = width * 0.33
    center_y = height * 0.27

    x0 = max(0, min(width - zoom_w, center_x - zoom_w * 0.5))
    y0 = max(0, min(height - zoom_h, center_y - zoom_h * 0.46))
    return (x0, y0, x0 + zoom_w, y0 + zoom_h)


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


def main() -> None:
    OUTPUT_STILLS_DIR.mkdir(parents=True, exist_ok=True)
    OUTPUT_VIDEO_DIR.mkdir(parents=True, exist_ok=True)

    start = load_and_resize(SOURCE_DIR / "movements-start.png")
    modal = load_and_resize(SOURCE_DIR / "import-account-dialog.png")
    preimport = load_and_resize(ROOT / "output" / "playwright" / "bank-reconciliation-demo" / "import-dedupe.png")

    save_poster(start, OUTPUT_STILLS_DIR / "import-extractes-start.webp")
    save_poster(modal, OUTPUT_STILLS_DIR / "import-extractes-modal.webp")
    save_poster(preimport, OUTPUT_STILLS_DIR / "import-extractes-preimport.webp")

    button_box = detect_import_button(start)
    full_box = (0.0, 0.0, float(TARGET_SIZE[0]), float(TARGET_SIZE[1]))
    zoom_box = build_zoom_box(button_box)
    preimport_zoom_box = build_preimport_metric_zoom_box()

    frame_index = 0
    with tempfile.TemporaryDirectory(prefix="home-import-video-") as tmp:
        frame_dir = Path(tmp)

        def write_frame(image: Image.Image, repeat: int = 1) -> None:
            nonlocal frame_index
            for _ in range(repeat):
                image.save(frame_dir / f"frame_{frame_index:04d}.png", format="PNG")
                frame_index += 1

        write_frame(start, repeat=48)

        for step in range(28):
            box = interpolate_box(full_box, zoom_box, step / 27)
            write_frame(crop_to_box(start, box))

        write_frame(crop_to_box(start, zoom_box), repeat=20)
        write_frame(modal, repeat=34)

        for step in range(16):
            alpha = ease_in_out(step / 15)
            frame = Image.blend(modal, preimport, alpha)
            write_frame(frame)

        write_frame(preimport, repeat=28)

        for step in range(20):
            box = interpolate_box(full_box, preimport_zoom_box, step / 19)
            write_frame(crop_to_box(preimport, box))

        write_frame(crop_to_box(preimport, preimport_zoom_box), repeat=26)

        for step in range(18):
            alpha = ease_in_out(step / 17)
            frame = Image.blend(crop_to_box(preimport, preimport_zoom_box), start, alpha)
            write_frame(frame)

        write_frame(start, repeat=36)

        encode_video(frame_dir, OUTPUT_VIDEO_DIR / "import-extractes-loop.mp4")


if __name__ == "__main__":
    main()
