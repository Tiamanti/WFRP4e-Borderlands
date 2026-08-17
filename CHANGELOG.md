# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Project scaffold: build tooling (Rollup/vitest), `/borderlands` command, `BorderlandsWizard`
  ApplicationV2 app, and the six-phase generation pipeline matching SPECS.md.
- **Geography**: Table 1-1/1-2 rolls, redesigned as a single one-shot batch (same trigger as
  every other phase): all rolls happen up front, then Swamps/Mountains/Hills/Badlands/Plains
  are placed as region-aware clustered blobs (Swamps/Mountains anchored to the map border,
  Hills hugging Mountains). Rivers path a biased random walk that never crosses itself or
  another river — including diagonally, where two crossing diagonal steps could otherwise
  thread past each other through the same 2x2 block without ever sharing a cell — and never
  flows uphill (Isolated Mountain counts as Mountains-tier elevation here too, since it's
  placed before rivers specifically for this), sourced away from the border and preferring the
  map's center, retried from the same source if a walk dead-ends short of its target, and touch
  the true map edge (or the Swamp tile's own edge) when they reach it — the map edge always
  ends a river even one biased toward a Swamp, and at least one river is guaranteed even if
  none were rolled. Each of the 10 Special Features is placed per its own book
  preference/avoidance rule (never on the map edge, except when anchored to a river's path);
  Cliffs trace the connected boundary chain between two terrain blobs, stopping wherever a
  third blob interrupts it, and Cave entrances get a location-aware label ("Cave entrance in
  Grassy Hills"). Terrain tiles
  vary opacity by vegetation density on top of their terrain color. Scene gets Global
  Illumination and is reused (not recreated) on a re-run.
- **Ancient Ruins**: Table 1-3..1-8 rolls; ruins placed as scene `Note`s deep-linked to pages
  in a shared journal.
- **Princes**: Tables 1-3, 2-1..2-11 rolls; full `npc` Actors with linked Career/Skill/Talent
  Items, filed into a shared Actor folder.
- **Relationships**: Tables 2-12..2-22 rolls; one journal page per prince, mutual vs.
  one-directional relationship natures rendered on the correct page(s).
- **Settlements**: Tables 3-1..3-7 rolls; one journal page per prince plus the uncontrolled
  area, sorted largest-population-first; no scene placement.
- **Hazards** (final phase): Tables 4-1..4-12 rolls behind a GM-chosen Few/Moderate/Many lair
  count; four monster-type branches (Chaos/Greenskin/Monster/Undead); one journal page per
  lair; no scene placement.
- **Settings**: Default Map Size, Ban Large Geography Regions, Default Grid Shape, and Generate
  Names (Appendix I place names for settlements, biased toward the owning prince's cultural
  style).
- **Hex grid support**: a new Default Grid Shape setting (Square/Hex, world-scope) lets a
  Geography Scene use hexagonal tiles (pointy-top, odd-row offset) instead of squares — every
  placement rule (terrain blobs, rivers, cliffs, special features) and Ancient Ruins' Note
  placement now works for either, addressing cells by the same coordinates regardless of shape.
  A hex Scene's own rectangular boundary previously left blank, unpainted slivers where the
  offset hex tiling didn't quite reach it (a half-hex column gap on alternating rows at the
  left/right edges, and small triangular notches between adjacent cells at the top/bottom
  edges) — these are now filled with the color/opacity of whichever real cell(s) border them
  (or the river's own color, if a river genuinely exits the map right there).

See `docs/DECISIONS.md` for the design rationale behind each of the above.
