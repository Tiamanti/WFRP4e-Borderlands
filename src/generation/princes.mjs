// SPECS.md "PRINCE GENERATION SUMMARY" — Table 1-3 (count, shared with ruins), 2-1 (type),
// 2-2 (race), 2-3/2-4 (experience), 2-5..2-9 (personality), 2-10 (court size), 2-11 (title).
// PDF pages 12, 21, 27, 28, 28-33, 34, 35.

/**
 * @param {ReturnType<typeof import("./region.mjs").createRegion>} region
 * @param {number} [count] Number of princes to generate; prompts via Table 1-3 if omitted.
 * @returns {Promise<{ princes: object[] }>}
 */
export async function generatePrinces(region, count) {
    throw new Error("generatePrinces not yet implemented — see SPECS.md PRINCE GENERATION SUMMARY / Tables 1-3, 2-1..2-11");
}
