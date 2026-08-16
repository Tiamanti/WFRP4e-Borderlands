export const DEFAULT_MAP_SIZE = { width: 20, height: 20 };

/** Parses a "WxH" map size string (e.g. "20x20", "15x30"). Falls back to 20x20 on anything else. */
export function parseMapSize(input, fallback = DEFAULT_MAP_SIZE) {
    if (!input) return fallback;

    const match = /^(\d+)x(\d+)$/i.exec(input.trim());
    if (!match) {
        ui.notifications.warn(game.i18n.format("BORDERLANDS.InvalidMapSize", { input }));
        return fallback;
    }

    return { width: Number(match[1]), height: Number(match[2]) };
}
