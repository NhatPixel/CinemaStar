# -*- coding: utf-8 -*-
"""Audit & fix tmp-from-temp.json poster (upload.wikimedia.org) + YouTube trailer (oEmbed)."""
from __future__ import annotations

import json
import re
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import ssl
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
JSON_PATH = ROOT / "tmp-from-temp.json"

UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
)
ctx = ssl.create_default_context()
GAP = 0.85


def curl_final_status(url: str) -> int | None:
    r = subprocess.run(
        [
            "curl.exe",
            "-sI",
            "-L",
            "--max-time",
            "35",
            "-A",
            UA,
            url,
        ],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    codes: list[int] = []
    for ln in r.stdout.splitlines():
        if ln.startswith("HTTP/"):
            m = re.match(r"HTTP/\S+\s+(\d{3})", ln)
            if m:
                codes.append(int(m.group(1)))
    return codes[-1] if codes else None


def probe_poster(url: str) -> int | None:
    for attempt in range(6):
        time.sleep(GAP)
        code = curl_final_status(url)
        if code == 429:
            time.sleep(3.0 + attempt * 1.5)
            continue
        return code
    return curl_final_status(url)


def probe_youtube(url: str) -> int | None:
    q = urllib.parse.urlencode({"url": url, "format": "json"})
    oembed = "https://www.youtube.com/oembed?" + q
    req = urllib.request.Request(oembed, headers={"User-Agent": UA})
    for attempt in range(5):
        time.sleep(GAP)
        try:
            with urllib.request.urlopen(req, timeout=30, context=ctx) as resp:
                return resp.status
        except urllib.error.HTTPError as e:
            if e.code == 429:
                time.sleep(2.5 + attempt)
                continue
            return e.code
        except Exception:
            return None
    return None


# Poster fixes: wrong Wikimedia path -> known-good upload.wikimedia.org URL (verify separately).
POSTER_FIXES: dict[str, str] = {
    # 404 in curl checks — swap to stable EN wiki filenames where applicable
    "Lars and the Real Girl": "https://upload.wikimedia.org/wikipedia/en/thumb/7/72/Lars_and_the_Real_Girl_poster.jpg/220px-Lars_and_the_Real_Girl_poster.jpg",
}

# Full replacements when poster fix unknown or trailer dead (title -> full film dict).
# Must use upload.wikimedia.org for poster; trailer youtube watch URL.
REPLACEMENTS: list[dict] = [
    {
        "duration": 169,
        "country": "Mỹ",
        "type": "Khoa Học Viễn Tưởng, Phiêu Lưu",
        "releaseDate": "2014-11-07",
        "language": "Tiếng Anh - Phụ đề Tiếng Việt",
        "ageRating": "RATING_4",
        "title": "Interstellar (2014)",
        "description": "Phi hành gia và nhóm nhà khoa học vượt qua lỗ đen để tìm ngôi nhà mới cho nhân loại.",
        "trailer": "https://www.youtube.com/watch?v=zSWdZVtXT7E",
        "poster": "https://upload.wikimedia.org/wikipedia/en/b/bc/Interstellar_film_poster.jpg",
        "director": "Christopher Nolan",
        "actor": "Matthew McConaughey, Anne Hathaway, Jessica Chastain",
        "status": "NOW_SHOWING",
    },
    {
        "duration": 107,
        "country": "Anh",
        "type": "Chiến Tranh, Chính Kịch",
        "releaseDate": "2017-07-21",
        "language": "Tiếng Anh - Phụ đề Tiếng Việt",
        "ageRating": "RATING_4",
        "title": "Dunkirk (2017)",
        "description": "Cuộc di tản Dunkirk nhìn từ đất liền, biển và không trung trong Thế chiến II.",
        "trailer": "https://www.youtube.com/watch?v=F-eMt3SrfFU",
        "poster": "https://upload.wikimedia.org/wikipedia/en/1/15/Dunkirk_Film_poster.jpg",
        "director": "Christopher Nolan",
        "actor": "Fionn Whitehead, Tom Hardy, Mark Rylance",
        "status": "ENDED",
    },
    {
        "duration": 106,
        "country": "Mỹ",
        "type": "Hành Động, Khoa Học Viễn Tưởng",
        "releaseDate": "2010-07-16",
        "language": "Tiếng Anh - Phụ đề Tiếng Việt",
        "ageRating": "RATING_4",
        "title": "Inception (2010)",
        "description": "Đạo tặc ý thức thực hiện phi vụ cài đặt ý tưởng qua nhiều tầng giấc mơ.",
        "trailer": "https://www.youtube.com/watch?v=YoHD9XEac0g",
        "poster": "https://upload.wikimedia.org/wikipedia/en/7/7b/Inception_ver3.jpg",
        "director": "Christopher Nolan",
        "actor": "Leonardo DiCaprio, Joseph Gordon-Levitt, Ellen Page",
        "status": "COMING_SOON",
    },
]


def verify_pair(poster: str, trailer: str) -> tuple[bool, int | None, int | None]:
    pc = probe_poster(poster)
    yt = probe_youtube(trailer)
    return (pc == 200 and yt == 200, pc, yt)


def main() -> None:
    audit_only = "--audit" in sys.argv
    data = json.loads(JSON_PATH.read_text(encoding="utf-8"))

    posters: dict[str, None] = {}
    trailers: dict[str, None] = {}
    for m in data:
        posters.setdefault(m["poster"], None)
        trailers.setdefault(m["trailer"], None)

    print("Probing", len(posters), "posters,", len(trailers), "trailers…")
    poster_codes: dict[str, int | None] = {}
    for u in posters:
        poster_codes[u] = probe_poster(u)
        print("  poster", poster_codes[u], u[:76])

    trailer_codes: dict[str, int | None] = {}
    for u in trailers:
        trailer_codes[u] = probe_youtube(u)
        print("  trailer", trailer_codes[u], u[:76])

    bad_idx: list[tuple[int, str, int | None, int | None]] = []
    for i, m in enumerate(data):
        pc = poster_codes[m["poster"]]
        yt = trailer_codes[m["trailer"]]
        if pc != 200 or yt != 200:
            bad_idx.append((i, m["title"], pc, yt))

    print("\nBAD entries:", len(bad_idx), "/", len(data))
    for row in bad_idx:
        print(row)

    if audit_only:
        return

    used_titles = {x["title"] for x in data}
    rep_q = list(REPLACEMENTS)
    rep_i = 0

    for i, title, _, _ in bad_idx:
        m = data[i]
        fixed = False

        # Try poster-only fix by title
        if title in POSTER_FIXES:
            np = POSTER_FIXES[title]
            ok, pc, yt = verify_pair(np, m["trailer"])
            print(f"Try poster fix {title}: ok={ok} poster={pc} yt={yt}")
            if ok:
                m["poster"] = np
                fixed = True

        if fixed:
            used_titles.add(m["title"])
            continue

        # Swap entire row from replacement pool (verified before insert in loop)
        while rep_i < len(rep_q):
            cand = json.loads(json.dumps(rep_q[rep_i]))
            rep_i += 1
            if cand["title"] in used_titles:
                continue
            ok, pc, yt = verify_pair(cand["poster"], cand["trailer"])
            print(f"Replacement candidate {cand['title']}: ok={ok} poster={pc} yt={yt}")
            if ok:
                data[i] = cand
                used_titles.add(cand["title"])
                fixed = True
                print(f"  -> replaced index {i} (was {title})")
                break

        if not fixed:
            raise SystemExit(f"Could not fix index {i} title={title}: extend REPLACEMENTS pool")

    JSON_PATH.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("Wrote", JSON_PATH)


if __name__ == "__main__":
    main()
