// SPECS.md "GEOGRAPHY PROCESS" — Table 1-1 (Geography, PDF p.9) and Table 1-2 (Special Features, PDF p.10).
// Loop: roll 1-1 with running bonus -> place feature or river -> +10 running bonus -> repeat,
// until a roll >=101 triggers a Table 1-2 special feature and resets the running bonus.

/**
 * @param {ReturnType<typeof import("./region.mjs").createRegion>} region
 * @returns {Promise<{ geography: { features: object[], rivers: object[] } }>}
 */
export async function generateGeography(region) {
    throw new Error("generateGeography not yet implemented — see SPECS.md GEOGRAPHY PROCESS / Tables 1-1, 1-2");
}
