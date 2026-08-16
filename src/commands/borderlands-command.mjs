import BorderlandsWizard from "../apps/borderlands-wizard.mjs";
import { parseMapSize } from "../generation/map-size.mjs";

/** GM-only: `/borderlands` is restricted to the GM at the point it runs, since the
 * shared ChatCommands framework has no registry-level permission gate of its own. */
export async function handleBorderlandsCommand(sceneName, mapSize) {
    if (!game.user.isGM) {
        ui.notifications.error(game.i18n.localize("BORDERLANDS.GMOnly"));
        return;
    }

    new BorderlandsWizard({
        sceneName: sceneName || "Borderlands",
        mapSize: parseMapSize(mapSize),
    }).render(true);
}
