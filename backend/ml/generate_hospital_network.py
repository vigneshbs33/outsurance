"""
Generate hospital_network.json — 2000 hospitals across 10 Indian cities,
linked to all 154 insurance plans with cashless/cash settlement and rich comparison benefits.
"""

from __future__ import annotations

import json
import random
from pathlib import Path

random.seed(42)

ROOT = Path(__file__).resolve().parents[2]
DATA_JSON = ROOT / "data.json"
OUTPUT = ROOT / "hospital_network.json"

CITIES = [
    {"id": 1, "name": "Mumbai", "state": "Maharashtra"},
    {"id": 2, "name": "Delhi", "state": "Delhi"},
    {"id": 3, "name": "Bengaluru", "state": "Karnataka"},
    {"id": 4, "name": "Hyderabad", "state": "Telangana"},
    {"id": 5, "name": "Chennai", "state": "Tamil Nadu"},
    {"id": 6, "name": "Kolkata", "state": "West Bengal"},
    {"id": 7, "name": "Pune", "state": "Maharashtra"},
    {"id": 8, "name": "Ahmedabad", "state": "Gujarat"},
    {"id": 9, "name": "Jaipur", "state": "Rajasthan"},
    {"id": 10, "name": "Lucknow", "state": "Uttar Pradesh"},
]

CITY_AREAS: dict[int, list[str]] = {
    1: ["Andheri", "Bandra", "Powai", "Goregaon", "Mulund", "Dadar", "Colaba", "Worli", "Thane", "Navi Mumbai",
        "Borivali", "Kandivali", "Chembur", "Ghatkopar", "Malad", "Juhu", "Santacruz", "Lower Parel", "BKC", "Vile Parle"],
    2: ["Connaught Place", "Saket", "Dwarka", "Rohini", "Karol Bagh", "Lajpat Nagar", "Vasant Kunj", "Pitampura",
        "Mayur Vihar", "Nehru Place", "Defence Colony", "Hauz Khas", "Janakpuri", "Rajouri Garden", "Greater Kailash",
        "Noida Sector 18", "Gurgaon Sector 14", "Faridabad", "South Extension", "Chanakyapuri"],
    3: ["Indiranagar", "Koramangala", "Whitefield", "Jayanagar", "MG Road", "Hebbal", "Marathahalli", "Electronic City",
        "HSR Layout", "BTM Layout", "Malleshwaram", "Rajajinagar", "Yelahanka", "Banashankari", "Sarjapur", "Bellandur",
        "Domlur", "Vijayanagar", "RT Nagar", "Basavanagudi"],
    4: ["Banjara Hills", "Jubilee Hills", "Gachibowli", "Madhapur", "Secunderabad", "Kukatpally", "Ameerpet", "Hitech City",
        "Kondapur", "Begumpet", "Abids", "Uppal", "Miyapur", "LB Nagar", "Somajiguda", "Malakpet", "Tolichowki", "Mehdipatnam",
        "Kompally", "Financial District"],
    5: ["Adyar", "Anna Nagar", "T Nagar", "Velachery", "OMR", "Mylapore", "Nungambakkam", "Porur", "Ambattur", "Tambaram",
        "Chromepet", "Guindy", "Egmore", "Kodambakkam", "Perungudi", "Sholinganallur", "Medavakkam", "Alwarpet", "Kilpauk", "Royapuram"],
    6: ["Park Street", "Salt Lake", "New Town", "Ballygunge", "Alipore", "Howrah", "Dum Dum", "Gariahat", "Behala", "Jadavpur",
        "Rashbehari", "Esplanade", "Bhowanipore", "Kasba", "Rajarhat", "Sealdah", "Tollygunge", "Ultadanga", "Barasat", "Kankurgachi"],
    7: ["Koregaon Park", "Kothrud", "Hinjewadi", "Baner", "Aundh", "Camp", "Deccan", "Hadapsar", "Wakad", "Viman Nagar",
        "Kalyani Nagar", "Magarpatta", "Pimpri", "Chinchwad", "Shivajinagar", "Kharadi", "Bavdhan", "Pashan", "Warje", "Yerwada"],
    8: ["Satellite", "Navrangpura", "Vastrapur", "Bopal", "Maninagar", "Paldi", "SG Highway", "Thaltej", "Gota", "Naranpura",
        "Ellisbridge", "Ambawadi", "Memnagar", "Chandkheda", "Nikol", "Bapunagar", "Naroda", "Vejalpur", "Jodhpur Village", "Ashram Road"],
    9: ["Malviya Nagar", "Vaishali Nagar", "C Scheme", "Mansarovar", "Raja Park", "Tonk Road", "Jhotwara", "Sanganer", "Vidhyadhar Nagar",
        "Bani Park", "Jagatpura", "Pratap Nagar", "Sitapura", "Amer", "Shastri Nagar", "Civil Lines", "Sodala", "Khatipura", "Galta", "Chitrakoot"],
    10: ["Gomti Nagar", "Hazratganj", "Aliganj", "Indira Nagar", "Mahanagar", "Alambagh", "Aminabad", "Charbagh", "Vikas Nagar",
         "Jankipuram", "Rajajipuram", "Khurram Nagar", "Telibagh", "Chinhat", "Ashiyana", "Aliganj Extension", "Sushant Golf City",
         "Faizabad Road", "Kanpur Road", "Sitapur Road"],
}

CHAINS = [
    "Apollo", "Fortis", "Max", "Manipal", "Narayana", "Kokilaben", "Lilavati", "Hinduja", "Global", "Columbia Asia",
    "Hiranandani", "Jaslok", "Asian Heart", "Wockhardt", "Aster", "Medanta", "Yashoda", "KIMS", "Care", "Continental",
    "Rainbow", "Cloudnine", "Motherhood", "Sahyadri", "Ruby Hall", "Deenanath", "BLK", "Artemis", "Paras", "Saifee",
    "Sir Ganga Ram", "Primus", "Moolchand", "Shalby", "Zydus", "Sterling", "Nanavati", "Raheja", "Bhatia", "Wadia",
    "Metro", "RG Stone", "Cygnus", "P.D. Hinduja", "Amrita", "Kasturba", "Holy Family", "St. John's", "Breath Easy",
    "Vijaya", "MIOT", "Kauvery", "Billroth", "Gleneagles", "Sparsh", "Breach Candy", "Cooper", "Lokmanya Tilak", "KEM",
    "Nair", "Grant Medical", "Sion", "AIIMS", "Safdarjung", "Ram Manohar Lohia", "Indraprastha", "Sitaram Bhartia",
    "Inlaks", "B.M. Birla", "BM Birla", "P.D. Hinduja", "Bhagwan Mahaveer", "Kalinga", "Sunshine", "Omega", "Lifeline",
    "Pulse", "Aakash", "Surya", "Unity", "Heritage", "Regency", "City", "Central", "Prime", "Elite", "Supreme", "Royal",
    "National", "People's", "Community", "Trust", "Mission", "Grace", "Mercy", "Hope", "Life", "HealthFirst", "MediCare",
    "Wellness", "Heal", "Cure", "Vital", "Nova", "Zenith", "Apex", "Summit", "Pinnacle", "Horizon", "Genesis", "Origin",
]

SUFFIXES = [
    "Hospital", "Multispeciality Hospital", "Super Speciality Hospital", "Medical Centre", "Healthcare",
    "Institute of Medical Sciences", "Charitable Hospital", "Research Centre", "Clinic & Hospital",
    "Women & Children Hospital", "Cancer Institute", "Heart Institute", "Eye Hospital", "Orthopaedic Centre",
]

INSURER_NETWORK_TIER: dict[str, float] = {
    "HDFC ERGO": 0.92, "Star Health": 0.90, "Niva Bupa": 0.88, "Care Health Insurance": 0.87,
    "Care Health": 0.85, "ICICI Lombard": 0.86, "Tata AIG": 0.84, "Bajaj Allianz": 0.83,
    "Aditya Birla": 0.82, "ManipalCigna": 0.81, "Max Bupa": 0.80, "LIC": 0.72, "SBI General": 0.75,
    "National Insurance": 0.68, "Oriental Insurance": 0.67, "New India Assurance": 0.69,
    "United India": 0.66, "Kotak Mahindra": 0.78, "Reliance General": 0.77, "Cholamandalam MS": 0.74,
    "Future Generali": 0.73, "Liberty General": 0.71, "Raheja QBE": 0.70, "Universal Sompo": 0.72,
    "IFFCO Tokio": 0.71, "Shriram General": 0.68, "Acko General": 0.76, "Magma HDI": 0.70,
    "Navi General": 0.74, "Royal Sundaram": 0.73, "Go Digit": 0.75, "Zuno General": 0.69,
    "Max Life": 0.65, "Hizuno": 0.68,
}

CRITICAL_ILLNESS_NAMES = [
    "Cancer", "Heart Attack", "Stroke", "Kidney Failure", "Major Organ Transplant",
    "Paralysis", "Multiple Sclerosis", "Parkinson's Disease", "Alzheimer's Disease",
]

DIABETES_ILLNESS = {"name": "Diabetes Mellitus Type 2", "category": "metabolic"}
HYPERTENSION_ILLNESS = {"name": "Hypertension (High Blood Pressure)", "category": "cardiovascular"}


def generate_hospitals() -> list[dict]:
    hospitals = []
    hid = 1
    used_names: set[str] = set()
    for city in CITIES:
        cid = city["id"]
        areas = CITY_AREAS[cid]
        for i in range(200):
            for _ in range(20):
                chain = random.choice(CHAINS)
                suffix = random.choice(SUFFIXES)
                area = areas[i % len(areas)]
                if random.random() < 0.35:
                    name = f"{chain} {suffix}"
                elif random.random() < 0.5:
                    name = f"{area} {chain} {suffix}"
                else:
                    name = f"Dr. {random.choice(['Reddy', 'Sharma', 'Patel', 'Iyer', 'Singh', 'Gupta', 'Mehta', 'Nair', 'Das', 'Kapoor'])} {suffix}"
                full = f"{name}, {city['name']}"
                if full not in used_names:
                    used_names.add(full)
                    break
            tier = random.choices(
                ["premium", "multispecialty", "standard", "budget"],
                weights=[15, 35, 40, 10],
            )[0]
            hospitals.append({
                "id": hid,
                "name": name,
                "city_id": cid,
                "city": city["name"],
                "area": area,
                "tier": tier,
                "beds": random.choice([50, 80, 100, 150, 200, 250, 350, 500, 750]),
                "accreditation": random.choice(["NABH", "NABH", "JCI", "NABH+", None]),
            })
            hid += 1
    return hospitals


def plan_benefits(plan: dict) -> dict:
    pid = plan["id"]
    insurer = plan["insurer"]
    name_lower = plan["name"].lower()
    ptype = plan.get("type", "Standard")
    coverage = plan.get("coverage", 500000)
    copay = plan.get("copayment_pct", 0)
    room = plan.get("room_rent_limit", "Single Private")
    ncb = plan.get("no_claim_bonus_pct", 10)
    wait = plan.get("pre_existing_wait_years", 2)
    is_floater = plan.get("is_family_floater", False)
    network_count = plan.get("hospital_network_count", 5000)
    diabetes_d1 = plan.get("diabetes_day1", False)
    hypertension_d1 = plan.get("hypertension_day1", False)

    tier_score = min(1.0, coverage / 3_000_000 + (0 if copay else 0.15) + (0.1 if "no limit" in str(room).lower() else 0))
    pre_days = 90 if tier_score > 0.7 else (60 if tier_score > 0.4 else 30)
    post_days = 180 if tier_score > 0.7 else (90 if tier_score > 0.4 else 60)
    domiciliary = ptype in ("Comprehensive", "Senior") or tier_score > 0.5

    maternity_covered = (
        "maternity" in name_lower or "mater" in name_lower
        or (is_floater and ptype == "Comprehensive" and random.Random(pid).random() > 0.55)
    )
    if ptype == "Critical Illness" or ptype == "Term Life":
        maternity_covered = False

    rng = random.Random(pid + 1000)
    renewal_discount = min(25, max(0, int(ncb * 0.5) + rng.randint(0, 5)))

    existing_illness = []
    if diabetes_d1:
        existing_illness.append({
            "name": DIABETES_ILLNESS["name"],
            "waiting_period_years": 0,
            "sum_insured_inr": coverage,
            "covered_from": "Day 1",
        })
    else:
        existing_illness.append({
            "name": DIABETES_ILLNESS["name"],
            "waiting_period_years": wait,
            "sum_insured_inr": int(coverage * 0.5) if wait <= 2 else None,
            "covered_from": f"After {wait} year(s)",
        })
    if hypertension_d1:
        existing_illness.append({
            "name": HYPERTENSION_ILLNESS["name"],
            "waiting_period_years": 0,
            "sum_insured_inr": coverage,
            "covered_from": "Day 1",
        })
    else:
        existing_illness.append({
            "name": HYPERTENSION_ILLNESS["name"],
            "waiting_period_years": max(0, wait - 1) if wait else 2,
            "sum_insured_inr": int(coverage * 0.4),
            "covered_from": f"After {max(1, wait - 1) if wait else 2} year(s)",
        })
    if ptype == "Critical Illness":
        for ill in rng.sample(CRITICAL_ILLNESS_NAMES, min(5, len(CRITICAL_ILLNESS_NAMES))):
            existing_illness.append({
                "name": ill,
                "waiting_period_years": wait,
                "sum_insured_inr": coverage,
                "covered_from": "Lump sum on diagnosis",
            })

    cashless_pct = int(INSURER_NETWORK_TIER.get(insurer, 0.72) * 100)
    cashless_primary = cashless_pct >= 70

    return {
        "renewal_bonus": {
            "type": "cumulative_ncb" if ncb > 0 else "none",
            "max_increase_pct": ncb,
            "description": (
                f"Up to {ncb}% increase in sum insured per claim-free year, subject to policy terms"
                if ncb > 0
                else "No cumulative bonus on this plan"
            ),
            "restoration_benefit": plan.get("restoration_benefit", False),
        },
        "pre_hospitalization": {
            "covered": True,
            "days": pre_days,
            "description": f"Medical expenses up to {pre_days} days before hospitalization",
        },
        "post_hospitalization": {
            "covered": True,
            "days": post_days,
            "description": f"Follow-up treatment up to {post_days} days after discharge",
        },
        "domiciliary_hospitalization": {
            "covered": domiciliary,
            "max_days_per_year": 7 if domiciliary else 0,
            "description": (
                "Treatment at home when hospital beds unavailable or patient immobile"
                if domiciliary
                else "Not covered under this plan"
            ),
        },
        "room_rent_limit": room,
        "co_pay": {
            "applicable": copay > 0,
            "percentage": copay,
            "description": (
                f"{copay}% co-payment on admissible claim amount"
                if copay > 0
                else "Zero co-payment on network hospitalization"
            ),
        },
        "ambulance": {
            "covered": ptype != "Term Life",
            "limit_per_trip_inr": rng.choice([1500, 2000, 2500, 3000, 5000]),
            "air_ambulance": tier_score > 0.75,
            "description": "Road ambulance to nearest network hospital; air ambulance where specified",
        },
        "claim_settlement": {
            "cashless_available": cashless_primary,
            "reimbursement_available": True,
            "primary_mode": "cashless" if cashless_primary else "reimbursement",
            "description": (
                f"Cashless at {cashless_pct}% of network hospitals; reimbursement at all empanelled centres"
                if cashless_primary
                else "Primarily reimbursement; cashless at select network hospitals"
            ),
        },
        "network_hospital_count": network_count,
        "mid_year_member_addition": {
            "allowed": is_floater or ptype in ("Comprehensive", "Standard"),
            "premium_adjustment": "pro-rata from date of addition",
            "medical_underwriting": "May be required for members above 45",
            "description": "Spouse/child can be added mid-term with premium adjustment",
        },
        "renewal_discount": {
            "no_claim_bonus_pct": ncb,
            "wellness_discount_pct": rng.randint(0, 10) if tier_score > 0.5 else 0,
            "online_renewal_discount_pct": rng.randint(2, 8),
            "max_combined_discount_pct": renewal_discount,
            "description": f"Up to {renewal_discount}% premium discount on renewal for claim-free years",
        },
        "existing_illness_cover": existing_illness,
        "maternity": {
            "covered": maternity_covered,
            "waiting_period_years": 2 if maternity_covered else None,
            "normal_delivery_inr": rng.choice([25000, 35000, 50000, 75000]) if maternity_covered else None,
            "cesarean_inr": rng.choice([50000, 75000, 100000, 150000]) if maternity_covered else None,
            "newborn_vaccination": maternity_covered,
            "description": (
                "Maternity and newborn expenses after waiting period"
                if maternity_covered
                else "Maternity not covered; buy maternity rider if available"
            ),
        },
        "newborn_cover": {
            "covered": maternity_covered or (is_floater and tier_score > 0.4),
            "from_day": 1 if maternity_covered else None,
            "limit_inr": int(coverage * 0.05) if maternity_covered else None,
            "description": "Automatic cover for newborn from day 1 of birth when maternity is covered",
        },
        "baby_addition_mid_policy": {
            "allowed": is_floater or maternity_covered,
            "from_days_after_birth": 91,
            "premium_adjustment": "pro-rata from addition date",
            "free_cover_period_days": 91,
            "description": (
                "Baby can be added to floater policy after 91 days from birth with pro-rata premium"
                if is_floater
                else "Available on family floater variants only"
            ),
        },
    }


def plan_city_hospitals(plan: dict, hospitals_by_city: dict[int, list[dict]]) -> dict[str, list[dict]]:
    insurer = plan["insurer"]
    tier = INSURER_NETWORK_TIER.get(insurer, 0.70)
    rng = random.Random(plan["id"] * 9973)
    city_networks: dict[str, list[dict]] = {}

    for city in CITIES:
        cid = city["id"]
        city_hospitals = hospitals_by_city[cid]
        tied: list[dict] = []
        for h in city_hospitals:
            # Larger insurers tie to more hospitals; premium tier hospitals favor top insurers
            hospital_factor = {"premium": 0.95, "multispecialty": 0.88, "standard": 0.78, "budget": 0.65}[h["tier"]]
            tie_prob = min(0.98, tier * hospital_factor * rng.uniform(0.85, 1.05))
            if rng.random() > tie_prob:
                continue
            if rng.random() < tier * 0.92:
                settlement = "cashless"
            else:
                settlement = "cash"
            tied.append({
                "hospital_id": h["id"],
                "hospital_name": h["name"],
                "area": h["area"],
                "settlement": settlement,
            })
        city_networks[str(cid)] = tied

    return city_networks


def main() -> None:
    with open(DATA_JSON, encoding="utf-8") as f:
        plans_source = json.load(f)

    hospitals = generate_hospitals()
    hospitals_by_city: dict[int, list[dict]] = {}
    for h in hospitals:
        hospitals_by_city.setdefault(h["city_id"], []).append(h)

    insurers_seen: dict[str, dict] = {}
    plan_entries = []

    for plan in plans_source:
        insurer = plan["insurer"]
        if insurer not in insurers_seen:
            insurers_seen[insurer] = {
                "name": insurer,
                "plan_count": 0,
                "avg_network_hospitals": plan.get("hospital_network_count", 5000),
                "top_cities_network": [c["name"] for c in CITIES],
            }
        insurers_seen[insurer]["plan_count"] += 1

        city_h = plan_city_hospitals(plan, hospitals_by_city)
        cashless_count = sum(
            1 for ch in city_h.values() for t in ch if t["settlement"] == "cashless"
        )
        cash_count = sum(
            1 for ch in city_h.values() for t in ch if t["settlement"] == "cash"
        )

        plan_entries.append({
            "plan_id": plan["id"],
            "plan_name": plan["name"],
            "insurer": insurer,
            "type": plan.get("type"),
            "link": plan.get("link", ""),
            "benefits": plan_benefits(plan),
            "network_summary": {
                "total_tied_in_top_10_cities": cashless_count + cash_count,
                "cashless_in_top_10_cities": cashless_count,
                "cash_reimbursement_in_top_10_cities": cash_count,
                "national_network_count": plan.get("hospital_network_count", 5000),
            },
            "city_hospitals": city_h,
        })

    output = {
        "meta": {
            "version": "1.0",
            "description": "Hospital network and plan comparison data for Fidsurance",
            "total_hospitals": len(hospitals),
            "hospitals_per_city": 200,
            "cities_count": len(CITIES),
            "plans_count": len(plan_entries),
            "generated_for_comparison": True,
        },
        "cities": CITIES,
        "hospitals": hospitals,
        "insurers": list(insurers_seen.values()),
        "plans": plan_entries,
    }

    with open(OUTPUT, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    size_mb = OUTPUT.stat().st_size / (1024 * 1024)
    print(f"Wrote {OUTPUT}")
    print(f"  Hospitals: {len(hospitals)}")
    print(f"  Plans: {len(plan_entries)}")
    print(f"  File size: {size_mb:.2f} MB")
    sample = plan_entries[0]
    print(f"  Sample plan 1 tied hospitals (Mumbai): {len(sample['city_hospitals']['1'])}")


if __name__ == "__main__":
    main()
