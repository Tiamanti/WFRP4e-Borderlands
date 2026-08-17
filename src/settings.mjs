export const MODULE_ID = "wfrp4e-borderlands";

export const SETTINGS = {
    defaultMapSize: "defaultMapSize",
    banLargeRegions: "banLargeRegions",
    generateNames: "generateNames",
    defaultGridShape: "defaultGridShape",
};

export function registerSettings() {
    game.settings.register(MODULE_ID, SETTINGS.defaultMapSize, {
        name: "BORDERLANDS.Settings.DefaultMapSize.Name",
        hint: "BORDERLANDS.Settings.DefaultMapSize.Hint",
        scope: "world",
        config: true,
        type: String,
        default: "20x20",
    });

    game.settings.register(MODULE_ID, SETTINGS.banLargeRegions, {
        name: "BORDERLANDS.Settings.BanLargeRegions.Name",
        hint: "BORDERLANDS.Settings.BanLargeRegions.Hint",
        scope: "world",
        config: true,
        type: Boolean,
        default: false,
    });

    game.settings.register(MODULE_ID, SETTINGS.generateNames, {
        name: "BORDERLANDS.Settings.GenerateNames.Name",
        hint: "BORDERLANDS.Settings.GenerateNames.Hint",
        scope: "world",
        config: true,
        type: Boolean,
        default: true,
    });

    game.settings.register(MODULE_ID, SETTINGS.defaultGridShape, {
        name: "BORDERLANDS.Settings.DefaultGridShape.Name",
        hint: "BORDERLANDS.Settings.DefaultGridShape.Hint",
        scope: "world",
        config: true,
        type: String,
        choices: {
            square: "BORDERLANDS.Settings.DefaultGridShape.Square",
            hex: "BORDERLANDS.Settings.DefaultGridShape.Hex",
        },
        default: "square",
    });
}
