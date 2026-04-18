#!/usr/bin/env python3
"""Wrapper for Summa blog-cover generation.

The wrapper accepts --aspect-ratio to keep a stable CLI contract with the caller,
but the current Nano Banana engine script does not support that flag directly.
Aspect ratio is therefore enforced through prompt composition, while the wrapper
forwards only the flags the engine actually supports.
"""

import argparse
import os
import shutil
import subprocess
import sys


def resolve_nano_banana() -> str:
    from_env = os.environ.get("BLOG_IMAGE_NANO_BANANA_SCRIPT", "").strip()
    if from_env and os.path.exists(from_env):
        return from_env

    return os.path.expanduser(
        "~/.openclaw/lib/node_modules/openclaw/skills/nano-banana-pro/scripts/generate_image.py"
    )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--prompt-file", required=True)
    parser.add_argument("--filename", required=True)
    parser.add_argument("--aspect-ratio", "-a", default="16:9")
    parser.add_argument("--resolution", default="2K")
    parser.add_argument("--api-key", default=None)
    parser.add_argument("--input-image", action="append", dest="input_images", default=[])
    args = parser.parse_args()

    with open(args.prompt_file, "r", encoding="utf-8") as handle:
        prompt = handle.read().strip()

    runner = ["uv", "run"] if shutil.which("uv") else [sys.executable or "python3"]
    cmd = runner + [
        resolve_nano_banana(),
        "--prompt",
        prompt,
        "--filename",
        args.filename,
        "--resolution",
        args.resolution,
    ]
    if args.api_key:
        cmd += ["--api-key", args.api_key]
    for input_image in args.input_images:
        cmd += ["--input-image", input_image]

    result = subprocess.run(cmd, env=os.environ)
    return result.returncode


if __name__ == "__main__":
    raise SystemExit(main())
