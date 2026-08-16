import { rollGeographyStep } from "../generation/geography.mjs";
import { createGrid, claimNextCells, isGridFull } from "../generation/geography-grid.mjs";
import { createGeographyScene, placeCellLabels } from "../generation/geography-scene.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * Interactive Geography roller (SPECS.md GEOGRAPHY PROCESS). Rolls Table 1-1/1-2 one step
 * at a time and paints terrain straight onto a Scene as it goes — see PLAN.md §5. Opened
 * from BorderlandsWizard's Geography row instead of the generic runPhase flow, since this
 * is the only phase whose process is an interactive loop rather than a single roll.
 */
export default class GeographyRoller extends HandlebarsApplicationMixin(ApplicationV2) {

    static DEFAULT_OPTIONS = {
        id: "borderlands-geography-roller",
        classes: ["borderlands-geography-roller", "warhammer"],
        window: {
            title: "BORDERLANDS.GeographyRollerTitle",
            resizable: true,
        },
        position: {
            width: 480,
            height: "auto",
        },
        actions: {
            rollNext: GeographyRoller._onRollNext,
            endPhase: GeographyRoller._onEndPhase,
        },
    };

    static PARTS = {
        form: {
            template: "modules/wfrp4e-borderlands/templates/apps/geography-roller.hbs",
        },
    };

    /**
     * @param {ReturnType<typeof import("../generation/region.mjs").createRegion>} region
     * @param {{onClose?: () => void}} [options]
     */
    constructor(region, { onClose, ...appOptions } = {}) {
        super(appOptions);
        this.region = region;
        this.onCloseCallback = onClose;
        this.runningBonus = 0;
        this.grid = createGrid(region.geography.mapSize.width, region.geography.mapSize.height);
        // Replay cells already claimed in a prior session so re-opening this dialog on a
        // partially-generated region doesn't re-offer already-painted squares.
        for (const entry of region.geography.log) {
            if (entry.cells?.length) claimNextCells(this.grid, entry.cells.length);
        }
    }

    async _prepareContext(options) {
        const context = await super._prepareContext(options);
        context.log = this.region.geography.log;
        context.runningBonus = this.runningBonus;
        context.full = isGridFull(this.grid);
        context.stopped = Boolean(this.region.geography.stoppedReason);
        return context;
    }

    async _onClose(options) {
        await super._onClose?.(options);
        this.onCloseCallback?.();
    }

    static async _onRollNext(event, target) {
        if (!this.region.geography.sceneId) {
            await createGeographyScene(this.region, this.region.geography.mapSize);
        }

        const result = await rollGeographyStep(this.runningBonus);

        if (result.type === "river") {
            this.region.geography.log.push({ ...result, cells: [] });
            this.runningBonus += 10;
        } else {
            // terrain (Table 1-1) or special (Table 1-2) — both claim grid cells and paint them.
            const size = result.size ?? 1;
            const cells = claimNextCells(this.grid, size);
            if (cells.length > 0) {
                const scene = game.scenes.get(this.region.geography.sceneId);
                await placeCellLabels(scene, cells, {
                    terrain: result.terrain ?? result.feature,
                    vegetation: result.vegetation ?? null,
                });
            }
            this.region.geography.log.push({ ...result, cells });
            this.runningBonus = result.type === "special" ? 0 : this.runningBonus + 10;
        }

        if (isGridFull(this.grid)) this.region.geography.stoppedReason = "map-full";
        this.render();
    }

    static async _onEndPhase(event, target) {
        this.region.geography.stoppedReason ??= "ended-early";
        this.close();
    }
}
