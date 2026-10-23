"""Inspect originals and produce faithful web derivatives with FFmpeg.

Run with the optional tools environment: pip install -r scripts/requirements-media.txt
Original archives and review sheets stay local; only approved derivatives are public.
"""
import argparse
import hashlib
import json
from pathlib import Path
import re
import shutil
import subprocess

import imageio_ffmpeg
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
ARCHIVE = ROOT / "backend" / "media-originals"
PUBLIC = ROOT / "frontend" / "public" / "media" / "works"
FILES = [
    "WhatsApp Video 2026-10-23 at 1.06.38 PM.mp4",
    "WhatsApp Video 2026-10-23 at 1.06.35 PM.mp4",
    "WhatsApp Video 2026-10-23 at 1.05.40 PM.mp4",
]
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()


def run(*args):
    subprocess.run([FFMPEG, "-hide_banner", "-loglevel", "error", "-y", *map(str, args)], check=True)


def inspect(downloads):
    ARCHIVE.mkdir(parents=True, exist_ok=True)
    reports = []
    for index, name in enumerate(FILES, 1):
        source = downloads / name
        digest = hashlib.sha256(source.read_bytes()).hexdigest()
        directory = ARCHIVE / f"work-{index:02}"
        directory.mkdir(exist_ok=True)
        archive = directory / "original.mp4"
        if archive.exists() and hashlib.sha256(archive.read_bytes()).hexdigest() != digest:
            raise ValueError("Original archive differs; choose a new work identifier")
        if not archive.exists():
            shutil.copy2(source, archive)
        probe = subprocess.run([FFMPEG, "-hide_banner", "-i", str(archive)], capture_output=True, text=True, encoding="utf-8", errors="replace").stderr
        (directory / "probe.txt").write_text(probe, encoding="utf-8")
        match = re.search(r"Duration: (\d+):(\d+):([\d.]+)", probe)
        duration = int(match[1]) * 3600 + int(match[2]) * 60 + float(match[3])
        times = [round(duration * fraction, 2) for fraction in [.03, .15, .27, .39, .51, .63, .75, .87, .96]]
        sheet = Image.new("RGB", (720, 3 * 452), "#fff7fa")
        draw = ImageDraw.Draw(sheet)
        for i, seconds in enumerate(times):
            frame = directory / f"frame-{seconds:.2f}.png"
            run("-ss", seconds, "-i", archive, "-frames:v", 1, frame)
            with Image.open(frame) as image:
                image.thumbnail((240, 425))
                x, y = (i % 3) * 240, (i // 3) * 452
                sheet.paste(image, (x + (240 - image.width) // 2, y + 24))
                draw.text((x + 8, y + 5), f"work-{index:02} | {seconds:.2f}s", fill="#30232a")
        sheet.save(directory / "contact-sheet.jpg", quality=90)
        reports.append({"slug": f"work-{index:02}", "original_name": name, "sha256": digest, "duration": duration, "source_bytes": source.stat().st_size, "review_times": times})
    (ARCHIVE / "inspection.json").write_text(json.dumps(reports, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps(reports, indent=2, ensure_ascii=False))


def build(config):
    entries = json.loads(config.read_text(encoding="utf-8"))
    reports = json.loads((ARCHIVE / "inspection.json").read_text(encoding="utf-8"))
    for entry in entries:
        slug = entry["slug"]
        if not re.fullmatch(r"work-\d{2}", slug):
            raise ValueError("Invalid work identifier")
        original = ARCHIVE / slug / "original.mp4"
        destination = PUBLIC / slug
        destination.mkdir(parents=True, exist_ok=True)
        # No cropping, upscaling, frame interpolation, invented detail or audio changes.
        filters = entry.get("video_filter", "null")
        run("-i", original, "-map", "0:v:0", "-map", "0:a?", "-vf", filters,
            "-c:v", "libx264", "-preset", "slow", "-crf", entry.get("crf", 25), "-pix_fmt", "yuv420p",
            "-c:a", "copy", "-movflags", "+faststart", "-map_metadata", "-1", destination / "video.mp4")
        for i, seconds in enumerate(entry["selected_seconds"]):
            run("-ss", seconds, "-i", original, "-vf", filters, "-frames:v", 1,
                "-c:v", "libwebp", "-quality", 90, destination / ("poster.webp" if i == 0 else f"detail-{i}.webp"))
        report = next(r for r in reports if r["slug"] == slug)
        entry.update({"source_sha256": report["sha256"], "source_bytes": report["source_bytes"], "duration": report["duration"], "web_bytes": (destination / "video.mp4").stat().st_size})
        print(slug, report["source_bytes"], "->", entry["web_bytes"], "bytes")
    (PUBLIC / "manifest.json").write_text(json.dumps(entries, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("stage", choices=["inspect", "build"])
    parser.add_argument("--downloads", type=Path, default=Path.home() / "Downloads")
    parser.add_argument("--config", type=Path, default=ROOT / "scripts" / "work-videos.json")
    args = parser.parse_args()
    inspect(args.downloads) if args.stage == "inspect" else build(args.config)
