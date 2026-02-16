#!/usr/bin/env python3
"""
Geocode Moscow R&D organizations and optimize data for web app.
Two-step process:
1. Geocode using hardcoded coords for top orgs + Nominatim API for others
2. Split data into lightweight index (for map) + detail files (lazy-loaded)
"""

import json
import os
import time
import urllib.request
import urllib.parse
from pathlib import Path
from collections import defaultdict

BASE_DIR = Path(__file__).parent.parent
DATA_DIR = BASE_DIR / "app" / "public" / "data"
INPUT_FILE = DATA_DIR / "moscow_rd_centers.json"
OUTPUT_MAP_FILE = DATA_DIR / "map_index.json"
OUTPUT_DETAILS_DIR = DATA_DIR / "centers"

# =====================================================
# Hardcoded coordinates for major Moscow organizations
# =====================================================
KNOWN_COORDS = {
    # Universities
    "1027739630401": (55.7298, 37.5952),   # МГУ им. Ломоносова (Воробьёвы горы)
    "1037739552740": (55.6700, 37.4804),   # РТУ МИРЭА (пр. Вернадского)
    "1027739386135": (55.9297, 37.5218),   # МФТИ (Долгопрудный — формально МО, но кампус)
    "1027739051779": (55.7656, 37.6843),   # МГТУ им. Баумана
    "1027739123224": (55.7773, 37.5941),   # РХТУ им. Менделеева
    "1037700246451": (55.7787, 37.6057),   # МГТУ «СТАНКИН»
    "1027739615584": (55.9825, 37.1627),   # НИУ МИЭТ (Зеленоград)
    "1037739180820": (55.8106, 37.5017),   # МАИ
    "1027739455996": (55.7109, 37.6111),   # НМИЦ эндокринологии
    "1027739439749": (55.7317, 37.6004),   # НИТУ МИСиС
    "1027700575044": (55.7629, 37.6326),   # НИУ МГСУ
    "1027700251644": (55.7520, 37.6819),   # НИУ «МЭИ»
    "1167746817810": (55.7790, 37.6663),   # Московский Политех
    "1037739630697": (55.8347, 37.5535),   # РГАУ-МСХА им. Тимирязева
    "1037700012008": (55.7394, 37.5931),   # РЭУ им. Плеханова
    "1027739017976": (55.6944, 37.5439),   # ГУУ
    "1027739610018": (55.7519, 37.6159),   # РАНХиГС
    "1027739733922": (55.8000, 37.4860),   # МГМУ им. Сеченова
    "1037739366477": (55.6501, 37.6637),   # РУДН

    # Research institutes
    "1027739576006": (55.6930, 37.3667),   # НИЦ «Курчатовский институт»
    "1037739771827": (55.6957, 37.5441),   # ФНАЦ (агрохимия)
    "1027700196468": (55.7490, 37.6260),   # ИБРАЭ РАН
    "1027739267214": (55.7328, 37.5670),   # РНЦХ им. Петровского
    "1027700046615": (55.7550, 37.6680),   # ЦНИИ Эпидемиологии
    "1037700067492": (55.8056, 37.5806),   # ИМАШ РАН
    "1037736018066": (55.7875, 37.5500),   # ИМБ РАН
    "1027700168495": (55.7700, 37.5900),   # ЦСП ФМБА
    "1027739172240": (55.6960, 37.5710),   # НМИЦ ТПМ
    "5087746697198": (55.7950, 37.5340),   # ВНИИНМ
    "1027739625550": (55.6985, 37.5607),   # ВИЭВ
    "1027739714606": (55.7430, 37.5740),   # МНТК Микрохирургия глаза
    "1037739481229": (55.8097, 37.6090),   # НПКЦ ДиТ ДЗМ
    "1027739416286": (55.7800, 37.5600),   # ВНИИГИМ
    "1027739045399": (55.7300, 37.5800),   # ВНИИА
    "1157746176400": (55.4676, 37.3039),   # ТЖ ГНЦ (Троицк)
    "1027739154343": (55.7188, 37.5897),   # ФИПС
    "1037739448460": (55.7600, 37.6000),   # НМИЦ онкологии
    "1027739623031": (55.7340, 37.5650),   # НМИЦ хирургии
    "1037739051530": (55.7500, 37.5700),   # МГРИ
    "1197746696399": (55.7710, 37.6120),   # Союз Спорт и Здоровье
    "1027700143937": (55.6989, 37.5574),   # ВНИИ Агроэкологии (?)
    "1027739558596": (55.7680, 37.6870),   # РосНИИТиИ
}


def geocode_nominatim(name: str, retry: int = 2) -> tuple:
    """Geocode organization name using Nominatim API."""
    # Clean name for search
    clean_name = name
    for prefix in ["ФЕДЕРАЛЬНОЕ", "ГОСУДАРСТВЕННОЕ", "БЮДЖЕТНОЕ", "АВТОНОМНОЕ",
                   "ОБРАЗОВАТЕЛЬНОЕ", "УЧРЕЖДЕНИЕ", "ВЫСШЕГО", "ОБРАЗОВАНИЯ",
                   "НАУЧНОЕ", "КАЗЕННОЕ", "УНИТАРНОЕ", "ПРЕДПРИЯТИЕ"]:
        clean_name = clean_name.replace(prefix, "")
    clean_name = clean_name.strip().strip('"').strip()

    # Try with Moscow qualifier
    queries = [
        f"{clean_name}, Москва, Россия",
        f"{name[:80]}, Москва",
    ]

    for query in queries:
        try:
            url = "https://nominatim.openstreetmap.org/search?" + urllib.parse.urlencode({
                "q": query,
                "format": "json",
                "limit": 1,
                "countrycodes": "ru",
            })
            req = urllib.request.Request(url, headers={
                "User-Agent": "RnD-Map-Moscow/1.0 (research project)"
            })
            with urllib.request.urlopen(req, timeout=10) as resp:
                data = json.loads(resp.read().decode())
                if data:
                    lat = float(data[0]["lat"])
                    lon = float(data[0]["lon"])
                    # Verify it's roughly in Moscow area (54.5-56.5, 36.5-38.5)
                    if 54.5 <= lat <= 56.5 and 36.0 <= lon <= 39.0:
                        return (lat, lon)
            time.sleep(1.1)  # Nominatim rate limit
        except Exception as e:
            if retry > 0:
                time.sleep(2)
                continue
            pass

    return None


def main():
    print("=" * 60)
    print("R&D MAP Moscow — Geocoding & Optimization")
    print("=" * 60)

    # Load preprocessed data
    print("\nLoading preprocessed data...")
    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    centers = data["centers"]
    print(f"  {len(centers)} centers loaded")

    # =========================================================
    # Step 1: Geocode organizations
    # =========================================================
    print("\n[1/2] Geocoding organizations...")

    geocoded = 0
    hardcoded = 0
    api_geocoded = 0
    failed = []

    for i, center in enumerate(centers):
        ogrn = center["ogrn"]
        name = center["short_name"] or center["name"]

        # Try hardcoded first
        if ogrn in KNOWN_COORDS:
            center["lat"], center["lon"] = KNOWN_COORDS[ogrn]
            center["geocode_method"] = "hardcoded"
            hardcoded += 1
            geocoded += 1
            continue

        # Try Nominatim API for top organizations (skip tiny ones)
        total_items = center["rid_count"] + center["project_count"]
        if total_items >= 5:  # Only geocode orgs with at least 5 items
            coords = geocode_nominatim(name)
            if coords:
                center["lat"], center["lon"] = coords
                center["geocode_method"] = "nominatim"
                api_geocoded += 1
                geocoded += 1
                if (api_geocoded % 10) == 0:
                    print(f"    API geocoded {api_geocoded} so far...")
                continue

        # Fallback: random offset from Moscow center for display
        import random
        random.seed(hash(ogrn))
        center["lat"] = 55.7558 + random.uniform(-0.08, 0.08)
        center["lon"] = 37.6173 + random.uniform(-0.12, 0.12)
        center["geocode_method"] = "approximate"
        failed.append((name[:60], total_items))
        geocoded += 1

    print(f"  Hardcoded: {hardcoded}")
    print(f"  API geocoded: {api_geocoded}")
    print(f"  Approximate (fallback): {len(failed)}")

    if failed:
        print(f"  Top approximate orgs:")
        failed.sort(key=lambda x: -x[1])
        for name, cnt in failed[:10]:
            print(f"    ({cnt}) {name}")

    # =========================================================
    # Step 2: Create optimized files for web app
    # =========================================================
    print("\n[2/2] Creating optimized files...")

    # Create index file (lightweight, for map rendering)
    map_index = {
        "generated_at": time.strftime("%Y-%m-%d %H:%M:%S"),
        "total_centers": len(centers),
        "centers": []
    }

    # Create detail files per center
    OUTPUT_DETAILS_DIR.mkdir(parents=True, exist_ok=True)

    for center in centers:
        ogrn = center["ogrn"]

        # Limit RIDs abstracts/details for index
        index_entry = {
            "ogrn": ogrn,
            "name": center["name"],
            "short_name": center["short_name"],
            "lat": center["lat"],
            "lon": center["lon"],
            "geocode_method": center.get("geocode_method", ""),
            "rid_count": center["rid_count"],
            "project_count": center["project_count"],
            "rid_types": center["rid_types"],
            "top_keywords": center["top_keywords"][:20],
            "scientific_domains": center["scientific_domains"],
            "okogu": center["okogu"],
            "total_funding": center.get("total_funding", 0),
        }
        map_index["centers"].append(index_entry)

        # Save full details to separate file
        detail_file = OUTPUT_DETAILS_DIR / f"{ogrn}.json"
        with open(detail_file, "w", encoding="utf-8") as f:
            json.dump(center, f, ensure_ascii=False)

    # Save index
    with open(OUTPUT_MAP_FILE, "w", encoding="utf-8") as f:
        json.dump(map_index, f, ensure_ascii=False)

    index_size = OUTPUT_MAP_FILE.stat().st_size / 1024
    print(f"  Map index: {index_size:.0f} KB ({len(map_index['centers'])} centers)")
    print(f"  Detail files: {len(centers)} files in {OUTPUT_DETAILS_DIR}")

    print(f"\n{'='*60}")
    print(f"Geocoding complete!")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
