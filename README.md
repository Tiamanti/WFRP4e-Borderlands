# [WFRP4e] Borderlands

A [Foundry VTT](https://foundryvtt.com) module for the [Warhammer Fantasy Roleplay 4th Edition](https://github.com/moo-man/WFRP4e-FoundryVTT) system that automates Borderlands region generation from the *Renegade Crowns* sourcebook.

Run `/borderlands` to open the region generator and step through:

1. Geography
2. Ancient Ruins
3. Princes
4. Relationships between Princes
5. Settlements
6. Monsters & Hazards

## Status

All six phases are implemented: Geography, Ancient Ruins, Princes, Relationships,
Settlements, and Monsters & Hazards. Three world-scope settings (default map size, banning
oversized geography regions, and generating Appendix I place names for settlements) are also
in. See `CLAUDE.md` for a phase-by-phase summary, `docs/SOURCE-MAP.md` for the full source
map, and `PLAN.md`/`docs/DECISIONS.md` for the design rationale behind each phase.

## Requirements

| Dependency | Minimum version |
|---|---|
| Foundry VTT | 13 (verified 14) |
| WFRP4e system | — |
| [`wfrp4e-core`](https://foundryvtt.com) module | — (required by `module.json` for the whole module, though only the Princes phase actually needs its Career/Skill/Talent compendiums — see `CLAUDE.md`'s Known Limitations) |

## Development

See [DEVELOPMENT.md](DEVELOPMENT.md) for the build / test workflow and project layout.

## License

This module is released under the [MIT License](LICENSE) and is free for anyone to use, modify, or maintain.  
This work is licensed under Foundry Virtual Tabletop [EULA - Limited License for Package Development from March 2, 2023](https://foundryvtt.com/article/license/).
