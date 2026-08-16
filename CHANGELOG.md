# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Project scaffold: build tooling (Rollup/vitest), `/borderlands` command, `BorderlandsWizard`
  ApplicationV2 app, and the six-phase generation pipeline matching SPECS.md.
- **Geography**: Table 1-1/1-2 rolls via an interactive `GeographyRoller` dialog; terrain
  painted directly onto a Scene as `Drawing` documents, radiating out from the map's
  frontier; rivers logged only.
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
- **Settings**: Default Map Size, Ban Large Geography Regions, and Generate Names (Appendix I
  place names for settlements, biased toward the owning prince's cultural style).

See `docs/DECISIONS.md` for the design rationale behind each of the above.
