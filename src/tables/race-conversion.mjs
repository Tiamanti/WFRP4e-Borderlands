// Princes are NPCs, not PCs — per direction, race stays narrative flavor (recorded on the
// Actor's species field) and does NOT feed characteristic math. This drops
// Conversion_Rules.pdf's per-race characteristic-offset table (WS/BS/S/T/Agi/Int/WP/Fel/M)
// entirely: every prince uses the Table 2-1 type's baseline characteristics unchanged,
// regardless of rolled race. The one piece of the conversion that still has to happen at
// generation time — because 2e has neither stat at all — is generating fresh Initiative and
// Dexterity values; Conversion_Rules.pdf's Human dice (PDF page 3) are used for every prince.

export const NEW_CHARACTERISTIC_DICE = { initiative: "2d10+20", dexterity: "2d10+20" };
