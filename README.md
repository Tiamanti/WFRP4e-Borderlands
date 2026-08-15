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

Scaffold only — the wizard and phase pipeline are wired up, but the actual table rolls
(`src/generation/*.mjs`) are stubs pending table data transcription from the source PDF.
See `SPECS.md` for the process summaries and table locations, and `docs/SOURCE-MAP.md` for
the source layout.

## Requirements

| Dependency | Minimum version |
|---|---|
| Foundry VTT | 13 (verified 14) |
| WFRP4e system | — |

## Development

See [DEVELOPMENT.md](DEVELOPMENT.md) for the build / test workflow and project layout.

## License

This module is released under the [MIT License](LICENSE) and is free for anyone to use, modify, or maintain.  
This work is licensed under Foundry Virtual Tabletop [EULA - Limited License for Package Development from March 2, 2023](https://foundryvtt.com/article/license/).
