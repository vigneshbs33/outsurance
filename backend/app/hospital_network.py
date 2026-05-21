"""Load hospital_network.json for plan comparison and network lookup."""

from __future__ import annotations

import json
import os
from functools import lru_cache
from typing import Any

_NETWORK_PATH = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "hospital_network.json")
)


@lru_cache(maxsize=1)
def _load_network() -> dict[str, Any]:
    with open(_NETWORK_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def get_cities() -> list[dict]:
    return _load_network()["cities"]


def get_hospitals(city_id: int | None = None) -> list[dict]:
    hospitals = _load_network()["hospitals"]
    if city_id is None:
        return hospitals
    return [h for h in hospitals if h["city_id"] == city_id]


def get_plan_network(plan_id: int) -> dict | None:
    for plan in _load_network()["plans"]:
        if plan["plan_id"] == plan_id:
            return plan
    return None


def get_plan_benefits(plan_id: int) -> dict | None:
    entry = get_plan_network(plan_id)
    return entry["benefits"] if entry else None


def get_plan_hospitals_by_city(plan_id: int, city_id: int) -> list[dict]:
    entry = get_plan_network(plan_id)
    if not entry:
        return []
    return entry.get("city_hospitals", {}).get(str(city_id), [])


def get_plan_city_stats(plan_id: int) -> list[dict]:
    """Per-city hospital counts for a plan (for network browser UI)."""
    entry = get_plan_network(plan_id)
    if not entry:
        return []
    city_hospitals = entry.get("city_hospitals", {})
    stats = []
    for city in get_cities():
        cid = city["id"]
        hospitals = city_hospitals.get(str(cid), [])
        cashless = sum(1 for h in hospitals if h.get("settlement") == "cashless")
        stats.append({
            **city,
            "total": len(hospitals),
            "cashless": cashless,
            "cash": len(hospitals) - cashless,
        })
    return stats


def filter_plan_hospitals(
    plan_id: int,
    city_id: int,
    *,
    query: str = "",
    settlement: str = "all",
    offset: int = 0,
    limit: int = 80,
) -> dict[str, Any]:
    hospitals = list(get_plan_hospitals_by_city(plan_id, city_id))
    q = (query or "").strip().lower()
    if q:
        hospitals = [
            h
            for h in hospitals
            if q in h.get("hospital_name", "").lower() or q in h.get("area", "").lower()
        ]
    if settlement == "cashless":
        hospitals = [h for h in hospitals if h.get("settlement") == "cashless"]
    elif settlement == "cash":
        hospitals = [h for h in hospitals if h.get("settlement") != "cashless"]
    total = len(hospitals)
    page = hospitals[offset : offset + limit]
    return {
        "total": total,
        "hospitals": page,
        "offset": offset,
        "limit": limit,
        "has_more": offset + limit < total,
    }


def get_comparison_rows(plan_ids: list[int]) -> list[dict]:
    """Flatten benefits into comparison-friendly rows for multiple plans."""
    rows = []
    for pid in plan_ids:
        entry = get_plan_network(pid)
        if not entry:
            continue
        b = entry["benefits"]
        rows.append({
            "plan_id": pid,
            "plan_name": entry["plan_name"],
            "insurer": entry["insurer"],
            "renewal_bonus": b["renewal_bonus"]["description"],
            "pre_hospitalization_days": b["pre_hospitalization"]["days"],
            "domiciliary_at_home": b["domiciliary_hospitalization"]["covered"],
            "room_rent_limit": b["room_rent_limit"],
            "co_pay_pct": b["co_pay"]["percentage"],
            "ambulance_limit_inr": b["ambulance"]["limit_per_trip_inr"],
            "claim_settlement": b["claim_settlement"]["primary_mode"],
            "network_hospital_count": b["network_hospital_count"],
            "mid_year_member_addition": b["mid_year_member_addition"]["allowed"],
            "renewal_discount_max_pct": b["renewal_discount"]["max_combined_discount_pct"],
            "maternity_covered": b["maternity"]["covered"],
            "newborn_covered": b["newborn_cover"]["covered"],
            "baby_addition_after_days": b["baby_addition_mid_policy"]["from_days_after_birth"],
            "existing_illness_cover": b["existing_illness_cover"],
            "network_summary": entry["network_summary"],
        })
    return rows
