// Table 1-1: Geography and Table 1-2: Special Features (Renegade Crowns, PDF pages 9-10).
// Transcribed with `pdftotext -table` (not `-layout` — layout mode breaks the 3-column
// table's alignment for wrapped multi-line cells in rows 73-100; `-table` mode extracts
// it cleanly). Cross-checked against the book's own pattern of "9 terrain rows then a
// River row" repeating every 10 rows from 10 through 100 — holds for the whole table,
// which is strong confirmation the transcription is correct.
//
// One known misprint in the source book: column 2 prints "54" twice (rows 54 and what
// should be 55) and never prints 55 on its own — corrected to 55 here to keep the
// roll-total index sequential, consistent with the 9-terrain-then-river pattern.

/** 1-indexed; GEOGRAPHY_TABLE[0] is unused so `GEOGRAPHY_TABLE[total]` reads naturally. */
export const GEOGRAPHY_TABLE = [
    null,
    { type: "terrain", terrain: "Plains", vegetation: "Barren", sizeFormula: "1d100" }, // 1
    { type: "terrain", terrain: "Plains", vegetation: "Scrubland", sizeFormula: "1d100" }, // 2
    { type: "terrain", terrain: "Plains", vegetation: "Forested", sizeFormula: "1d100" }, // 3
    { type: "terrain", terrain: "Hills", vegetation: "Barren", sizeFormula: "1d100" }, // 4
    { type: "terrain", terrain: "Hills", vegetation: "Scrubland", sizeFormula: "1d100" }, // 5
    { type: "terrain", terrain: "Hills", vegetation: "Grassy", sizeFormula: "1d100" }, // 6
    { type: "terrain", terrain: "Mountains", vegetation: "Barren", sizeFormula: "1d100" }, // 7
    { type: "terrain", terrain: "Swamps", vegetation: "Barren", sizeFormula: "1d100" }, // 8
    { type: "terrain", terrain: "Badlands", vegetation: "Barren", sizeFormula: "1d100" }, // 9
    { type: "river" }, // 10
    { type: "terrain", terrain: "Plains", vegetation: "Barren", sizeFormula: "1d100" }, // 11
    { type: "terrain", terrain: "Plains", vegetation: "Scrubland", sizeFormula: "1d100" }, // 12
    { type: "terrain", terrain: "Plains", vegetation: "Grassy", sizeFormula: "1d100" }, // 13
    { type: "terrain", terrain: "Hills", vegetation: "Barren", sizeFormula: "1d100" }, // 14
    { type: "terrain", terrain: "Hills", vegetation: "Scrubland", sizeFormula: "1d100" }, // 15
    { type: "terrain", terrain: "Hills", vegetation: "Forested", sizeFormula: "1d100" }, // 16
    { type: "terrain", terrain: "Mountains", vegetation: "Scrubland", sizeFormula: "1d100" }, // 17
    { type: "terrain", terrain: "Swamps", vegetation: "Scrubland", sizeFormula: "1d100" }, // 18
    { type: "terrain", terrain: "Badlands", vegetation: "Scrubland", sizeFormula: "1d100" }, // 19
    { type: "river" }, // 20
    { type: "terrain", terrain: "Plains", vegetation: "Barren", sizeFormula: "1d100" }, // 21
    { type: "terrain", terrain: "Plains", vegetation: "Scrubland", sizeFormula: "1d100" }, // 22
    { type: "terrain", terrain: "Plains", vegetation: "Forested", sizeFormula: "1d100" }, // 23
    { type: "terrain", terrain: "Hills", vegetation: "Barren", sizeFormula: "1d100" }, // 24
    { type: "terrain", terrain: "Hills", vegetation: "Scrubland", sizeFormula: "1d100" }, // 25
    { type: "terrain", terrain: "Hills", vegetation: "Grassy", sizeFormula: "1d100" }, // 26
    { type: "terrain", terrain: "Mountains", vegetation: "Forested", sizeFormula: "1d100" }, // 27
    { type: "terrain", terrain: "Swamps", vegetation: "Grassy", sizeFormula: "1d100" }, // 28
    { type: "terrain", terrain: "Badlands", vegetation: "Grassy", sizeFormula: "1d100" }, // 29
    { type: "river" }, // 30
    { type: "terrain", terrain: "Plains", vegetation: "Barren", sizeFormula: "1d100" }, // 31
    { type: "terrain", terrain: "Plains", vegetation: "Scrubland", sizeFormula: "1d100" }, // 32
    { type: "terrain", terrain: "Plains", vegetation: "Grassy", sizeFormula: "1d100" }, // 33
    { type: "terrain", terrain: "Hills", vegetation: "Barren", sizeFormula: "1d100" }, // 34
    { type: "terrain", terrain: "Hills", vegetation: "Scrubland", sizeFormula: "1d100" }, // 35
    { type: "terrain", terrain: "Hills", vegetation: "Forested", sizeFormula: "1d100" }, // 36
    { type: "terrain", terrain: "Mountains", vegetation: "Barren", sizeFormula: "1d100" }, // 37
    { type: "terrain", terrain: "Swamps", vegetation: "Barren", sizeFormula: "1d100" }, // 38
    { type: "terrain", terrain: "Badlands", vegetation: "Barren", sizeFormula: "1d100" }, // 39
    { type: "river" }, // 40
    { type: "terrain", terrain: "Plains", vegetation: "Barren", sizeFormula: "1d100" }, // 41
    { type: "terrain", terrain: "Plains", vegetation: "Scrubland", sizeFormula: "1d100" }, // 42
    { type: "terrain", terrain: "Plains", vegetation: "Forested", sizeFormula: "1d100" }, // 43
    { type: "terrain", terrain: "Hills", vegetation: "Barren", sizeFormula: "1d100" }, // 44
    { type: "terrain", terrain: "Hills", vegetation: "Scrubland", sizeFormula: "1d100" }, // 45
    { type: "terrain", terrain: "Hills", vegetation: "Grassy", sizeFormula: "1d100" }, // 46
    { type: "terrain", terrain: "Mountains", vegetation: "Scrubland", sizeFormula: "1d100" }, // 47
    { type: "terrain", terrain: "Swamps", vegetation: "Scrubland", sizeFormula: "1d100" }, // 48
    { type: "terrain", terrain: "Badlands", vegetation: "Scrubland", sizeFormula: "1d100" }, // 49
    { type: "river" }, // 50
    { type: "terrain", terrain: "Plains", vegetation: "Barren", sizeFormula: "1d100" }, // 51
    { type: "terrain", terrain: "Plains", vegetation: "Scrubland", sizeFormula: "1d100" }, // 52
    { type: "terrain", terrain: "Plains", vegetation: "Grassy", sizeFormula: "1d100" }, // 53
    { type: "terrain", terrain: "Hills", vegetation: "Barren", sizeFormula: "1d100" }, // 54
    { type: "terrain", terrain: "Hills", vegetation: "Scrubland", sizeFormula: "1d100" }, // 55 (book misprints this row as "54" a second time — see header note)
    { type: "terrain", terrain: "Hills", vegetation: "Forested", sizeFormula: "1d100" }, // 56
    { type: "terrain", terrain: "Mountains", vegetation: "Forested", sizeFormula: "1d100" }, // 57
    { type: "terrain", terrain: "Swamps", vegetation: "Grassy", sizeFormula: "1d100" }, // 58
    { type: "terrain", terrain: "Badlands", vegetation: "Grassy", sizeFormula: "1d100" }, // 59
    { type: "river" }, // 60
    { type: "terrain", terrain: "Plains", vegetation: "Barren", sizeFormula: "1d100" }, // 61
    { type: "terrain", terrain: "Plains", vegetation: "Scrubland", sizeFormula: "1d100" }, // 62
    { type: "terrain", terrain: "Plains", vegetation: "Forested", sizeFormula: "1d100" }, // 63
    { type: "terrain", terrain: "Hills", vegetation: "Barren", sizeFormula: "1d100" }, // 64
    { type: "terrain", terrain: "Hills", vegetation: "Scrubland", sizeFormula: "1d100" }, // 65
    { type: "terrain", terrain: "Hills", vegetation: "Grassy", sizeFormula: "1d100" }, // 66
    { type: "terrain", terrain: "Mountains", vegetation: "Barren", sizeFormula: "1d100" }, // 67
    { type: "terrain", terrain: "Swamps", vegetation: null, sizeFormula: "1d100" }, // 68 (book prints "Swamps" with no vegetation qualifier, unlike every other row)
    { type: "terrain", terrain: "Badlands", vegetation: "Barren", sizeFormula: "1d100" }, // 69
    { type: "river" }, // 70
    { type: "terrain", terrain: "Plains", vegetation: "Desert", sizeFormula: "1d100" }, // 71 ("Desert" is a one-off vegetation variant — see VEGETATION_DESCRIPTIONS)
    { type: "terrain", terrain: "Plains", vegetation: "Scrubland", sizeFormula: "1d100" }, // 72
    { type: "terrain", terrain: "Plains", vegetation: "Grassy", sizeFormula: "1d100" }, // 73
    { type: "terrain", terrain: "Hills", vegetation: "Barren", sizeFormula: "1d100" }, // 74
    { type: "terrain", terrain: "Hills", vegetation: "Scrubland", sizeFormula: "1d100" }, // 75
    { type: "terrain", terrain: "Hills", vegetation: "Forested", sizeFormula: "1d100" }, // 76
    { type: "terrain", terrain: "Mountains", vegetation: "Grassy", sizeFormula: "1d100" }, // 77
    { type: "terrain", terrain: "Swamps", vegetation: "Forested", sizeFormula: "1d100" }, // 78
    { type: "terrain", terrain: "Badlands", vegetation: "Forested", sizeFormula: "1d100" }, // 79
    { type: "river" }, // 80
    { type: "terrain", terrain: "Plains", vegetation: "Forested", sizeFormula: "1d10 * 20" }, // 81
    { type: "terrain", terrain: "Plains", vegetation: "Scrubland", sizeFormula: "1d10 * 20" }, // 82
    { type: "terrain", terrain: "Plains", vegetation: "Barren", sizeFormula: "1d10 * 20" }, // 83
    { type: "terrain", terrain: "Hills", vegetation: "Grassy", sizeFormula: "1d10 * 20" }, // 84
    { type: "terrain", terrain: "Hills", vegetation: "Scrubland", sizeFormula: "1d10 * 20" }, // 85
    { type: "terrain", terrain: "Hills", vegetation: "Barren", sizeFormula: "1d10 * 20" }, // 86
    { type: "terrain", terrain: "Mountains", vegetation: "Scrubland", sizeFormula: "1d10 * 20" }, // 87
    { type: "terrain", terrain: "Swamps", vegetation: "Scrubland", sizeFormula: "1d10 * 20" }, // 88
    { type: "terrain", terrain: "Badlands", vegetation: "Scrubland", sizeFormula: "1d10 * 20" }, // 89
    { type: "river" }, // 90
    { type: "terrain", terrain: "Plains", vegetation: "Grassy", sizeFormula: "1d10 * 50" }, // 91
    { type: "terrain", terrain: "Plains", vegetation: "Scrubland", sizeFormula: "1d10 * 50" }, // 92
    { type: "terrain", terrain: "Plains", vegetation: "Barren", sizeFormula: "1d10 * 50" }, // 93
    { type: "terrain", terrain: "Hills", vegetation: "Forested", sizeFormula: "1d10 * 50" }, // 94
    { type: "terrain", terrain: "Hills", vegetation: "Scrubland", sizeFormula: "1d10 * 50" }, // 95
    { type: "terrain", terrain: "Hills", vegetation: "Barren", sizeFormula: "1d10 * 50" }, // 96
    { type: "terrain", terrain: "Mountains", vegetation: "Barren", sizeFormula: "1d10 * 50" }, // 97
    { type: "terrain", terrain: "Swamps", vegetation: "Scrubland", sizeFormula: "1d10 * 50" }, // 98
    { type: "terrain", terrain: "Badlands", vegetation: "Barren", sizeFormula: "1d10 * 50" }, // 99
    { type: "river" }, // 100
];

/**
 * 1d10 table for Table 1-1 totals over 100 (i.e. "101 or more"). 1-indexed, same as above.
 * `placement` distinguishes the table's own "most special features occupy a single
 * square... those that do not are specified" rule:
 *   - "area": `sizeFormula` is a genuine square count (only Caves — "Caves, d% squares").
 *   - "boundary": `sizeFormula` rolls something else entirely (only Cliff — the roll is
 *     the escarpment's *height in feet*; the book describes it running along a terrain
 *     boundary and extending across the map, not filling a blob of squares). Handled like
 *     a River: logged only, never claims grid cells.
 *   - "single": every other feature — no sizeFormula, claims exactly one cell.
 */
export const SPECIAL_FEATURES_TABLE = [
    null,
    { feature: "Caves", placement: "area", sizeFormula: "1d100", description: "Entrance to an extensive system of underground chambers." }, // 1
    { feature: "Cliff", placement: "boundary", sizeFormula: "(1d10 * 50) + 200", sizeUnit: "feet", description: "A steep escarpment at least 200ft high; runs along terrain boundaries, rarely through mountains." }, // 2
    { feature: "Fertile Valley", placement: "single", sizeFormula: null, description: "Unusually fertile ground; settlements should be placed here before anywhere else." }, // 3
    { feature: "Geyser", placement: "single", sizeFormula: null, description: "Always forms the source of a river." }, // 4
    { feature: "Isolated Mountain", placement: "single", sizeFormula: null, description: "A single mountain standing apart from the rest of the terrain, possibly an extinct volcano." }, // 5
    { feature: "Pool", placement: "single", sizeFormula: null, description: "A still body of water with no visible source or outlet." }, // 6
    { feature: "Tor", placement: "single", sizeFormula: null, description: "A defensible hill with a flat peak; almost always inhabited." }, // 7
    { feature: "Volcano", placement: "single", sizeFormula: null, description: "Active; the soil in adjacent squares is unusually fertile (a Fertile Valley may be placed next to it)." }, // 8
    { feature: "Waterfall", placement: "single", sizeFormula: null, description: "Must be sited on a river at a sudden change of elevation (add a river/cliff first if needed)." }, // 9
    { feature: "Whirlpool", placement: "single", sizeFormula: null, description: "Impassable water; the region needs a river or coastline first (add one if it has none)." }, // 10
];

/** Short GM-facing reference text — shown once as guidance, not repeated per roll. */
export const TERRAIN_DESCRIPTIONS = {
    Plains: "Flat and open — the best land for arable farming and roads, but hard to defend without strong walls.",
    Hills: "Gentle slopes, good for pastoral farming and modest natural defense; most of the region's population lives on hills and plains.",
    Mountains: "High and steep — poor for farming and hard to travel, though high valleys can be farmed and defended.",
    Swamps: "Low-lying and waterlogged; solid ground is hard to tell from deep water, and the air is unhealthy.",
    Badlands: "Broken, rocky, and prone to earthquakes and flash floods; almost nothing arable grows here.",
    River: "No fixed size — routed by the GM across other terrain, generally from mountains toward plains; often disappears into swamps.",
};

/**
 * Fill color per placed feature (terrain name, or special feature name — both are passed
 * through the same `terrain` label to placeCellLabels). Falls back to a neutral grey for
 * anything unmapped.
 */
export const FEATURE_COLORS = {
    Plains: "#c9d97a",
    Hills: "#8fbf5f",
    Mountains: "#9e9e9e",
    Swamps: "#4f6650",
    Badlands: "#b06b3a",
    Caves: "#5c5c5c",
    Cliff: "#795548",
    "Fertile Valley": "#66bb6a",
    Geyser: "#4fc3f7",
    "Isolated Mountain": "#78909c",
    Pool: "#0288d1",
    Tor: "#8d6e63",
    Volcano: "#d84315",
    Waterfall: "#00bcd4",
    Whirlpool: "#01579b",
};

export const VEGETATION_DESCRIPTIONS = {
    Barren: "Almost nothing grows — bare rock, poisoned soil, or true desert. Poor for settlement.",
    Grassy: "Open ground with little beyond grasses; good pastoral land, and the easiest terrain to farm.",
    Forested: "Dense tree cover — a source of timber, easy to get lost in, and home to Beastmen and worse.",
    Scrubland: "Tough, low bushes — poor fodder, no useful timber, and hard to clear for farming.",
    Desert: "One-off vegetation variant printed on row 71 of Table 1-1 only — treat as Barren.",
};
