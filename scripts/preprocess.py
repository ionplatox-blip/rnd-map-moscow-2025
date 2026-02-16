#!/usr/bin/env python3
"""
Preprocess ЕГИСУ НИОКТР data to extract Moscow R&D centers.
Outputs: public/data/moscow_rd_centers.json
"""

import json
import time
from collections import defaultdict
from pathlib import Path

# Paths
BASE_DIR = Path(__file__).parent.parent
DATA_DIR = BASE_DIR  # JSON files are in the root of RnD_MAP
OUTPUT_DIR = BASE_DIR / "app" / "public" / "data"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Files
RID_FILE = DATA_DIR / "open_data_rid_2025_all_months.json"
IKSI_FILE = DATA_DIR / "open_data_iksi_2025_all_months.json"
IKSPO_FILE = DATA_DIR / "open_data_ikspo_2025_all_months.json"
IKRBS_FILE = DATA_DIR / "open_data_ikrbs_2025_all_months.json"


def is_moscow_ogrn(ogrn: str) -> bool:
    """Check if OGRN belongs to Moscow (region code 77)."""
    if not ogrn or len(ogrn) < 5:
        return False
    return ogrn[3:5] == "77"


def load_json(filepath: Path, label: str) -> list:
    """Load JSON file and return cards array."""
    print(f"  Loading {label} ({filepath.name})...")
    t = time.time()
    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)
    cards = data.get("cards", [])
    print(f"    -> {len(cards):,} cards in {time.time()-t:.1f}s")
    return cards


def load_ikrbs_streaming(filepath: Path) -> list:
    """
    Load ikrbs file using streaming approach for the huge file.
    We parse it as regular JSON but with patience.
    """
    print(f"  Loading IKRBS ({filepath.name}) - this is a large file...")
    t = time.time()
    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)
    cards = data.get("cards", [])
    print(f"    -> {len(cards):,} cards in {time.time()-t:.1f}s")
    return cards


def extract_org_info(org_data: dict) -> dict:
    """Extract clean org info from executor/customer data."""
    return {
        "name": org_data.get("name", ""),
        "short_name": org_data.get("short_name", ""),
        "ogrn": org_data.get("ogrn", ""),
        "supervisor": " ".join(filter(None, [
            org_data.get("supervisor_surname", ""),
            org_data.get("supervisor_name", ""),
            org_data.get("supervisor_patronymic", ""),
        ])),
        "org_type": org_data.get("organization_type", ""),
        "okogu": org_data.get("okogu", ""),
        "okopf": org_data.get("okopf", ""),
    }


def extract_rid_info(card: dict) -> dict:
    """Extract clean RID info from a card."""
    return {
        "registration_number": card.get("registration_number", ""),
        "name": card.get("name", ""),
        "abstract": card.get("abstract", ""),
        "keywords": card.get("keyword_list", []),
        "rid_type": card.get("rid_type", ""),
        "using_ways": card.get("using_ways", ""),
        "rubrics": [
            {"code": r.get("code", ""), "name": r.get("name", "")}
            for r in card.get("rubrics", [])
        ],
        "oesrs": [
            {"code": r.get("code", ""), "name": r.get("name", "")}
            for r in card.get("oesrs", [])
        ],
        "authors": [
            {
                "name": f"{a.get('surname', '')} {a.get('name', '')} {a.get('patronymic', '')}".strip(),
                "degree": a.get("degree", ""),
                "rank": a.get("rank", ""),
                "orcid": a.get("orcid", ""),
                "scopus_id": a.get("scopus_author_id", ""),
            }
            for a in card.get("authors", [])
        ],
        "created_date": card.get("created_date", ""),
        "nioktr": card.get("nioktr", ""),
    }


def extract_nioktr_info(card: dict) -> dict:
    """Extract NIOKTR project info from ikrbs card."""
    return {
        "registration_number": card.get("registration_number", ""),
        "nioktr": card.get("nioktr", ""),
        "name": card.get("name", ""),
        "abstract": (card.get("abstract", "") or "")[:2000],
        "keywords": card.get("keyword_list", []),
        "report_type": card.get("report_type", ""),
        "stage_start_date": card.get("stage_start_date", ""),
        "stage_end_date": card.get("stage_end_date", ""),
        "status": "Завершен" if card.get("stage_end_date", "") < "2025-01-01" else "В работе", # Simple heuristic
        "stage_number": card.get("stage_number", ""),
        "workers_total": card.get("workers_total", ""),
        "finance_total": sum([float(b.get("funds", 0) or 0) for b in card.get("budgets", [])]),
        "publication_count": card.get("publication_count", 0),
        "rubrics": [
            {"code": r.get("code", ""), "name": r.get("name", "")}
            for r in card.get("rubrics", [])
        ],
        "oesrs": [
            {"code": r.get("code", ""), "name": r.get("name", "")}
            for r in card.get("oesrs", [])
        ],
        "budgets": [
            {
                "funds": b.get("funds", ""),
                "budget_type": b.get("budget_type", ""),
            }
            for b in card.get("budgets", [])
        ],
        "created_date": card.get("created_date", ""),
    }


def main():
    print("=" * 60)
    print("R&D MAP Moscow — Data Preprocessing")
    print("=" * 60)

    # =========================================================
    # Step 1: Load RID data and extract Moscow organizations
    # =========================================================
    print("\n[1/5] Loading RID data...")
    rid_cards = load_json(RID_FILE, "RID")

    # Build org registry indexed by OGRN
    orgs = {}  # ogrn -> org info
    org_rids = defaultdict(list)  # ogrn -> list of RID infos
    rid_to_org = {}  # rid_reg_number -> ogrn

    for card in rid_cards:
        for executor in card.get("executors", []):
            ogrn = executor.get("ogrn", "")
            if not is_moscow_ogrn(ogrn):
                continue

            # Register org
            if ogrn not in orgs:
                orgs[ogrn] = extract_org_info(executor)

            # Register RID
            rid_info = extract_rid_info(card)
            # Ensure usage field exists
            rid_info["usage"] = []
            org_rids[ogrn].append(rid_info)
            rid_to_org[card.get("registration_number", "")] = ogrn

    print(f"  Found {len(orgs)} Moscow organizations with {sum(len(v) for v in org_rids.values())} RIDs")

    # =========================================================
    # Step 2: Load IKSPO data (IP protection)
    # =========================================================
    print("\n[2/5] Loading IKSPO data (IP protection)...")
    ikspo_cards = load_json(IKSPO_FILE, "IKSPO")

    # Map RID reg numbers to IKSPO protections
    rid_protections = defaultdict(list)  # rid_reg_number -> list of protections
    for card in ikspo_cards:
        rid_ref = card.get("rid", "")
        if rid_ref in rid_to_org:
            for prot in card.get("copyright_protections", []):
                rid_protections[rid_ref].append({
                    "date": prot.get("date", ""),
                    "rid_type": prot.get("rid_type", ""),
                    "protection_way": prot.get("protection_way", ""),
                    "registration_authority": prot.get("registration_authority", ""),
                    "territory": prot.get("territory", []),
                })

    matched_ikspo = sum(1 for k in rid_protections if k in rid_to_org)
    print(f"  Linked {matched_ikspo} IP protection records to Moscow RIDs")

    # =========================================================
    # Step 3: Load IKSI data (usage of RID)
    # =========================================================
    print("\n[3/5] Loading IKSI data (RID usage)...")
    iksi_cards = load_json(IKSI_FILE, "IKSI")

    rid_usage = defaultdict(list)  # rid_reg_number -> list of usage entries
    for card in iksi_cards:
        rid_ref = card.get("rid", "")
        if rid_ref in rid_to_org:
            for usage in card.get("iksi_own_using", []):
                rid_usage[rid_ref].append({
                    "type": "own",
                    "date": usage.get("date", ""),
                    "description": usage.get("using_description", ""),
                    "estimated_time": usage.get("estimated_time", ""),
                })
            for usage in card.get("iksi_external_using", []):
                org_state = usage.get("organization_state", {})
                rid_usage[rid_ref].append({
                    "type": "external",
                    "date": usage.get("date", ""),
                    "contract_type": usage.get("contract_type", ""),
                    "organization": org_state.get("short_name", org_state.get("name", "")),
                    "estimated_time": usage.get("estimated_time", ""),
                })

    matched_iksi = sum(1 for k in rid_usage if k in rid_to_org)
    print(f"  Linked {matched_iksi} usage records to Moscow RIDs")

    # =========================================================
    # Step 4: Load IKRBS data (NIOKTR project reports)
    # =========================================================
    print("\n[4/5] Loading IKRBS data (NIOKTR projects)...")
    ikrbs_cards = load_ikrbs_streaming(IKRBS_FILE)

    # Collect NIOKTR numbers linked to Moscow orgs
    moscow_nioktr_ids = set()
    for rids_list in org_rids.values():
        for rid in rids_list:
            nioktr_id = rid.get("nioktr")
            if nioktr_id:
                moscow_nioktr_ids.add(nioktr_id)

    # Also check executor directly in ikrbs
    org_nioktr = defaultdict(list)  # ogrn -> list of NIOKTR projects
    nioktr_by_id = {}  # nioktr_id -> project info

    for card in ikrbs_cards:
        nioktr_id = card.get("nioktr", "")
        executor = card.get("executor", {})
        ogrn = executor.get("ogrn", "") if executor else ""

        # Include if executor is Moscow org OR if linked from Moscow RID
        is_moscow_exec = is_moscow_ogrn(ogrn)
        is_linked = nioktr_id in moscow_nioktr_ids

        if is_moscow_exec or is_linked:
            project_info = extract_nioktr_info(card)
            nioktr_by_id[nioktr_id] = project_info

            if is_moscow_exec:
                if ogrn not in orgs:
                    orgs[ogrn] = extract_org_info(executor)
                org_nioktr[ogrn].append(project_info)

    print(f"  Found {len(nioktr_by_id)} NIOKTR projects linked to Moscow")
    print(f"  {len(org_nioktr)} Moscow orgs have direct NIOKTR projects")

    # =========================================================
    # Step 5: Assemble final data + attach protections/usage
    # =========================================================
    print("\n[5/5] Assembling final dataset...")

    # Enrich RIDs with protection and usage data
    for ogrn, rids in org_rids.items():
        for rid in rids:
            reg_num = rid["registration_number"]
            rid["protections"] = rid_protections.get(reg_num, [])
            if reg_num in rid_usage:
                rid["usage"] = rid_usage[reg_num]

    # Build aggregated keywords and rubrics per org
    centers = []
    for ogrn, org_info in orgs.items():
        rids = org_rids.get(ogrn, [])
        projects = org_nioktr.get(ogrn, [])

        # Aggregate keywords
        all_keywords = []
        for r in rids:
            all_keywords.extend(r.get("keywords", []))
        for p in projects:
            all_keywords.extend(p.get("keywords", []))

        # Deduplicate and count keywords
        kw_counts = defaultdict(int)
        for kw in all_keywords:
            kw_counts[kw.lower().strip()] += 1
        top_keywords = sorted(kw_counts.items(), key=lambda x: -x[1])[:50]

        # Aggregate rubrics
        all_rubrics = {}
        for r in rids:
            for rub in r.get("rubrics", []):
                all_rubrics[rub["code"]] = rub["name"]
        for p in projects:
            for rub in p.get("rubrics", []):
                all_rubrics[rub["code"]] = rub["name"]

        # Aggregate OESR (scientific domains)
        all_oesrs = {}
        for r in rids:
            for o in r.get("oesrs", []):
                all_oesrs[o["code"]] = o["name"]
        for p in projects:
            for o in p.get("oesrs", []):
                all_oesrs[o["code"]] = o["name"]

        # RID type distribution
        rid_type_counts = defaultdict(int)
        for r in rids:
            rid_type_counts[r.get("rid_type", "Другое")] += 1

        # Build center entry
        center = {
            "ogrn": ogrn,
            "name": org_info["name"],
            "short_name": org_info["short_name"],
            "supervisor": org_info["supervisor"],
            "org_type": org_info["org_type"],
            "okogu": org_info["okogu"],
            "okopf": org_info["okopf"],
            "rid_count": len(rids),
            "project_count": len(projects),
            "rid_types": dict(rid_type_counts),
            "top_keywords": [{"keyword": kw, "count": cnt} for kw, cnt in top_keywords],
            "rubrics": [{"code": c, "name": n} for c, n in all_rubrics.items()],
            "scientific_domains": [{"code": c, "name": n} for c, n in all_oesrs.items()],
            "rids": rids,
            "projects": sorted(projects, key=lambda x: -(x.get("finance_total", 0) or 0)),
            # Coordinates will be filled by geocoding step
            "lat": None,
            "lon": None,
            "total_funding": sum(p.get("finance_total", 0) for p in projects),
        }
        centers.append(center)

    # Sort by Total Funding descending (prioritize money)
    centers.sort(key=lambda x: -x["total_funding"])

    # =========================================================
    # Save output
    # =========================================================
    output_file = OUTPUT_DIR / "moscow_rd_centers.json"
    print(f"\nSaving to {output_file}...")
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump({
            "generated_at": time.strftime("%Y-%m-%d %H:%M:%S"),
            "total_centers": len(centers),
            "total_rids": sum(c["rid_count"] for c in centers),
            "total_projects": sum(c["project_count"] for c in centers),
            "total_funding": sum(c["total_funding"] for c in centers),
            "centers": centers,
        }, f, ensure_ascii=False, indent=2)

    file_size_mb = output_file.stat().st_size / (1024 * 1024)
    print(f"  -> {file_size_mb:.1f} MB")

    print(f"\n{'='*60}")
    print(f"Done! {len(centers)} Moscow R&D centers")
    print(f"  Total RIDs: {sum(c['rid_count'] for c in centers):,}")
    print(f"  Total Projects: {sum(c['project_count'] for c in centers):,}")
    print(f"  Total Funding: {sum(c['total_funding'] for c in centers):,.2f} Rubles")
    print(f"{'='*60}")

    # Print top 20
    print("\nTop 20 centers by Funding:")
    for i, c in enumerate(centers[:20], 1):
        name = c["short_name"] or c["name"]
        funding_mln = c["total_funding"] / 1000  # Convert to millions
        print(f"  {i:2d}. [{funding_mln:6.1f} млн ₽] {name[:70]}")


if __name__ == "__main__":
    main()
