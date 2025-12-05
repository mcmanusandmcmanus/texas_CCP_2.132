"""
Build a compact Arlington, TX racial profiling summary JSON for the web UI.

The source CSV comes from DPS reports covering 2019-2024. We keep only
Arlington Police Department rows (fire department rows are exempt and zeroed).
"""
from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path

import pandas as pd


ROOT = Path(__file__).resolve().parents[1]
SOURCE_CSV = ROOT / "data" / "tx_data_racial_profiling_2019to2024.csv"
OUTPUT_JSON = ROOT / "webapp" / "data" / "arlington_summary.json"


def safe_sum(frame: pd.DataFrame, col: str) -> int:
    """Return integer sum for a column; missing columns default to 0."""
    if col not in frame.columns:
        return 0
    return int(frame[col].fillna(0).sum())


def main() -> None:
    df = pd.read_csv(SOURCE_CSV, low_memory=False)
    police = df[df["DEPARTMENT_NAME"].str.contains("ARLINGTON POLICE", case=False, na=False)].copy()

    years = sorted(police["YEAR"].dropna().unique().tolist())
    totals_by_year = {int(year): safe_sum(police[police["YEAR"] == year], "total_stops") for year in years}

    race_breakdown = []
    for year in years:
        block = police[police["YEAR"] == year]
        race_breakdown.append(
            {
                "year": int(year),
                "race_black": safe_sum(block, "race_black"),
                "race_white": safe_sum(block, "race_white"),
                "race_hispanic": safe_sum(block, "race_hispanic"),
                "race_asian": safe_sum(block, "race_asian"),
                "race_native": safe_sum(block, "race_native"),
                "race_known_yes": safe_sum(block, "race_known_yes"),
                "race_known_no": safe_sum(block, "race_known_no"),
                "total_stops": safe_sum(block, "total_stops"),
            }
        )

    searches = []
    for year in years:
        block = police[police["YEAR"] == year]
        searches.append(
            {
                "year": int(year),
                "search_yes": safe_sum(block, "search_conducted_yes"),
                "search_no": safe_sum(block, "search_conducted_no"),
                "search_reason_consent": safe_sum(block, "search_reason_consent"),
                "search_reason_probable": safe_sum(block, "search_reason_probable"),
                "search_reason_inventory": safe_sum(block, "search_reason_inventory"),
                "search_reason_incident": safe_sum(block, "search_reason_incident_to_arrest"),
                "contraband_yes": safe_sum(block, "contraband_discovered_yes"),
                "contraband_no": safe_sum(block, "contraband_discovered_no"),
            }
        )

    summary = {
        "meta": {
            "department": "Arlington Police Department, TX",
            "source_csv": SOURCE_CSV.name,
            "generated_at_utc": datetime.utcnow().isoformat(timespec="seconds") + "Z",
            "years": years,
            "note": "Fire department rows are exempt and report zero stops; only police rows are included.",
        },
        "totals_by_year": totals_by_year,
        "race_breakdown": race_breakdown,
        "searches": searches,
    }

    OUTPUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_JSON.write_text(json.dumps(summary, indent=2))
    print(f"Wrote summary to {OUTPUT_JSON}")


if __name__ == "__main__":
    main()
