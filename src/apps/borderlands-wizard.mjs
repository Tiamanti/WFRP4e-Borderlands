import { REGION_PHASES, createRegion, runPhase, isPhaseDone } from "../generation/region.mjs";
import GeographyRoller from "./geography-roller.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * Steps the GM through the six Borderlands generation phases (SPECS.md),
 * building up a single region data object one phase at a time.
 */
export default class BorderlandsWizard extends HandlebarsApplicationMixin(ApplicationV2) {

    static DEFAULT_OPTIONS = {
        id: "borderlands-wizard",
        classes: ["borderlands-wizard", "warhammer"],
        window: {
            title: "BORDERLANDS.WizardTitle",
            resizable: true,
        },
        position: {
            width: 480,
            height: "auto",
        },
        actions: {
            runPhase: BorderlandsWizard._onRunPhase,
        }
    };

    static PARTS = {
        form: {
            template: "modules/wfrp4e-borderlands/templates/apps/borderlands-wizard.hbs"
        }
    };

    /** @param {{sceneName?: string, mapSize?: {width: number, height: number}}} [options] */
    constructor({ sceneName, mapSize, ...appOptions } = {}) {
        super(appOptions);
        this.region = createRegion({ sceneName, mapSize });
    }

    async _prepareContext(options) {
        const context = await super._prepareContext(options);
        context.phases = REGION_PHASES.map(phase => ({
            id: phase.id,
            label: phase.label,
            done: isPhaseDone(this.region, phase.id),
        }));
        context.region = this.region;
        return context;
    }

    static async _onRunPhase(event, target) {
        const phaseId = target.dataset.phase;

        if (phaseId === "geography") {
            new GeographyRoller(this.region, { onClose: () => this.render() }).render(true);
            return;
        }

        try {
            const before = isPhaseDone(this.region, "princes") ? this.region.princes.entries.length : 0;
            await runPhase(this.region, phaseId);
            if (phaseId === "ruins" || phaseId === "relationships") {
                game.journal.get(this.region[phaseId].journalId)?.sheet.render(true);
            } else if (phaseId === "princes") {
                const count = this.region.princes.entries.length - before;
                ui.notifications.info(game.i18n.format("BORDERLANDS.PrincesGenerated", { count }));
            }
        } catch (err) {
            ui.notifications.warn(err.message);
            console.warn("wfrp4e-borderlands |", err);
        }
        this.render();
    }
}
