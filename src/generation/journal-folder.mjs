// Shared "<Map Name>" JournalEntry folder — every phase that creates a JournalEntry
// (Geography now, Ancient Ruins/Settlements/Relationships later per PLAN.md) files it
// into this same folder instead of leaving journals scattered at the top level.

/** Creates (or reuses) the region's JournalEntry folder, named after the map/scene. */
export async function getOrCreateJournalFolder(region) {
    let folder = region.journalFolderId ? game.folders.get(region.journalFolderId) : null;
    if (!folder) {
        folder = await Folder.create({ name: region.geography.sceneName, type: "JournalEntry" });
        region.journalFolderId = folder.id;
    }
    return folder;
}
