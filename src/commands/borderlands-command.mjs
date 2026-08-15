import BorderlandsWizard from "../apps/borderlands-wizard.mjs";

export async function handleBorderlandsCommand() {
    if (!game.user.isGM) {
        ui.notifications.error(game.i18n.localize("BORDERLANDS.GMOnly"));
        return;
    }

    new BorderlandsWizard().render(true);
}
