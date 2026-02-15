# Inspection Mode — Final Architecture Spec

## Two Inspection Types
1. **Inspection – Internal / Operator** — routine property walks
2. **Inspection – Bank-Ready (PCA Lite)** — turns on extra required fields (RUL + severity + exposure)

Both use the same core system structure.

## Priority Scale (5-level, industry standard)
| Priority | Label | Timeline | Color |
|----------|-------|----------|-------|
| 1 | Immediate | Fix now — safety/code | Red |
| 2 | Urgent | 0–3 months | Orange |
| 3 | Short-term | 3–6 months | Yellow |
| 4 | Planned | 6–12 months | Blue |
| 5 | Monitor | 12+ months | Green |
| — | Good | No issue found | Gray |

## Exposure Tiers (per finding)
$500 / $1,000 / $2,000 / $3,000 / Custom

## Risk Flags (multi-select per finding)
Life Safety, Water Intrusion, Electrical Hazard, Structural

## Section-Level Fields
- Condition Rating: 1–5
- Remaining Useful Life: <1 year, 1–3 years, 3–5 years, 5+ years, Unknown

## Section Groups

### GROUP 1 — SITE & EXTERIOR
1.1 Site Drainage & Grading (Ponding, Improper slope, Erosion, Downspout discharge, Retaining walls)
1.2 Paving & Flatwork (Asphalt condition, Concrete cracking, Trip hazards, ADA ramps visual)
1.3 Exterior Lighting (Fixture condition, Outages, Dark zones)
1.4 Landscaping & Site Features (Overgrowth against structure, Irrigation leaks, Fencing/gates, Dumpster enclosures)

### GROUP 2 — STRUCTURE & ENVELOPE
2.1 Foundation (Visible cracking, Settlement indicators, Water intrusion)
2.2 Structural Framing Visual Only (Beam deflection, Joist sagging, Balcony attachment condition)
2.3 Roof (Roof type, Age estimate, Active leaks, Flashing condition, Penetrations)
2.4 Exterior Walls / Facade (Siding condition, Masonry cracking, Sealant failure)
2.5 Windows & Doors (Broken seals, Rot, Hardware condition)

### GROUP 3 — LIFE SAFETY
3.1 Fire Alarm System (Panel present, Pull stations, Strobes visible, Tags current visual)
3.2 Sprinkler / Fire Suppression (Riser condition, Tags visible, Obstructions)
3.3 Emergency Lighting & Exit Signs (Functioning, Coverage gaps)
3.4 Egress Paths (Obstructions, Stair rails secure, Fire doors self-closing)

### GROUP 4 — MECHANICAL / ELECTRICAL / PLUMBING
4.1 Electrical Service & Panels (Panel brand, Labeling, Clearance, Double taps, Exposed wiring)
4.2 Unit Electrical Sampling (GFCI presence, Damaged receptacles, Open knockouts)
4.3 Plumbing Supply & Drain (Pipe type, Corrosion, Active leaks, PRVs)
4.4 Water Heaters (Age, Venting, T&P discharge, Pan presence)
4.5 HVAC Systems (Type PTAC/split/VRV, Age, Operational status, Condensate management)

### GROUP 5 — COMMON AREAS
5.1 Corridors & Interior Finishes (Ceiling damage, Flooring wear, Water staining)
5.2 Amenities (Clubhouse, Fitness, Pool visual compliance)
5.3 Laundry (if applicable)

### GROUP 6 — UNITS (UNIT MODE)
Per unit: Overall condition, Tenant housekeeping grade, Floors, Cabinets, Countertops, Appliances, Plumbing fixtures, Electrical fixtures, Windows/doors, Bath condition, Evidence of leaks, Mold indicators

## Key Differences from DD Mode
- Less cosmetic detail
- More system structure
- RUL tracking
- Severity classification
- Exposure tagging
- Required life-safety flags

## Export Requirements
- Auto-compute: Immediate Repairs Total, Short-Term Exposure (0-24 months), Total Identified Repair Exposure
- Breakdown by system category
- Required disclaimer: "Repair Exposure Estimate - Visual Assessment Only..."
