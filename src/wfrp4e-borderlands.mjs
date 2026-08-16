import { handleBorderlandsCommand } from "./commands/borderlands-command.mjs";

Hooks.once("setup", () => {
    game.wfrp4e.commands.add({
        borderlands: {
            description: game.i18n.localize("BORDERLANDS.CommandDescription"),
            args: ["sceneName", "mapSize"],
            defaultArg: "sceneName",
            examples: "<br><span style='font-family:monospaced'>/borderlands</span><br><span style='font-family:monospaced'>/borderlands My Region mapSize=15x15</span>",
            callback: (sceneName, mapSize) => handleBorderlandsCommand(sceneName, mapSize),
        }
    });
});
