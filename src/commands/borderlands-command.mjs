import BorderlandsWizard from "../apps/borderlands-wizard.mjs";
import { parseMapSize, DEFAULT_MAP_SIZE } from "../generation/map-size.mjs";
import { MODULE_ID, SETTINGS } from "../settings.mjs";

/** GM-only: `/borderlands` is restricted to the GM at the point it runs, since the
 * shared ChatCommands framework has no registry-level permission gate of its own. */
export async function handleBorderlandsCommand(sceneName, mapSize) {
    if (!game.user.isGM) {
        ui.notifications.error(game.i18n.localize("BORDERLANDS.GMOnly"));
        return;
    }

    // The "Default Map Size" setting is itself just a "WxH" string, parsed the same way as
    // the command's own arg — an invalid setting value (shouldn't happen, since the setting
    // never accepts anything else) falls back to the hardcoded 20x20 constant.
    const defaultMapSize = parseMapSize(game.settings.get(MODULE_ID, SETTINGS.defaultMapSize), DEFAULT_MAP_SIZE);

    new BorderlandsWizard({
        sceneName: sceneName || "Borderlands",
        mapSize: parseMapSize(mapSize, defaultMapSize),
    }).render(true);
}
