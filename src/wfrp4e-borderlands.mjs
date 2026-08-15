import { handleBorderlandsCommand } from "./commands/borderlands-command.mjs";

Hooks.once("setup", () => {
    game.wfrp4e.commands.add({
        borderlands: {
            description: game.i18n.localize("BORDERLANDS.CommandDescription"),
            args: [],
            callback: () => handleBorderlandsCommand(),
        }
    });
});
