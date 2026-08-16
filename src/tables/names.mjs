// Appendix I: Border Prince Names (Renegade Crowns, book pages 114-116, PDF pages 116-118).
// Six cultural styles, each a First Element + Second Element pair concatenated into a place
// name. Re-verified with `pdftotext -table` — `-layout` wrapped several longer words
// ("Hunter's", "Hangman's", "Sigmar's", "Wolf's") onto the row below, shifting that column's
// alignment; every `-table`-mode band's widths were hand-summed to exactly 100, confirming
// the transcription (same cross-check method used for every other Renegade Crowns table).
//
// Only Flavourful's Second Element (Table A-12) is itself a banded d100 table like every
// First Element — every other style's Second Element (Tables A-2/A-4/A-6/A-8/A-10) is a
// plain 1d10 direct-index list of 10 suffixes.
//
// Table 2-2's Race table (tables/princes.mjs RACE_TABLE) only names 4 Human sub-cultures
// (Border Princes, Bretonnian, Empire, Tilean) plus a catch-all "Other" and Dwarf/Elf/
// Halfling — it has no entry matching Estalian or Kislevite. RACE_TO_STYLE maps every
// *directly*-named race; "Human—Other" is deliberately absent from it and instead split
// 50/50 between Estalian and Kislevite in generation/names.mjs's rollNamingStyleForRace, so
// every one of the 6 tables sees use. Non-Human races (no cultural table of their own in
// this Appendix at all) default to Flavourful, the setting's own "native, unclaimed land"
// style — a judgment call, not stated by the book, flagged here per project convention.

export const NAMING_STYLES = ["Empire", "Bretonnian", "Tilean", "Estalian", "Kislevite", "Flavourful"];

export const RACE_TO_STYLE = {
    "Dwarf": "Flavourful",
    "Elf": "Flavourful",
    "Halfling": "Flavourful",
    "Human—Border Princes": "Flavourful",
    "Human—Bretonnian": "Bretonnian",
    "Human—Empire": "Empire",
    "Human—Tilean": "Tilean",
    // "Human—Other" is intentionally absent — see rollNamingStyleForRace.
};

/** Table A-1: Empire Name First Element. */
export const EMPIRE_FIRST_ELEMENT = [
    { max: 2, element: "Aber" }, { max: 5, element: "Bunt" }, { max: 8, element: "Ceilen" },
    { max: 11, element: "Dunkel" }, { max: 14, element: "Essel" }, { max: 17, element: "Eich" },
    { max: 20, element: "Feider" }, { max: 23, element: "Garder" }, { max: 26, element: "Haber" },
    { max: 29, element: "Her" }, { max: 32, element: "Hoch" }, { max: 35, element: "Jaar" },
    { max: 38, element: "Kreig" }, { max: 41, element: "Leib" }, { max: 44, element: "Lieder" },
    { max: 47, element: "Mach" }, { max: 50, element: "Nord" }, { max: 53, element: "Put" },
    { max: 56, element: "Raach" }, { max: 59, element: "Rit" }, { max: 63, element: "Schafer" },
    { max: 66, element: "Schaken" }, { max: 69, element: "Sheil" }, { max: 72, element: "Streis" },
    { max: 75, element: "Tasch" }, { max: 78, element: "Unt" }, { max: 81, element: "Var" },
    { max: 84, element: "Vassen" }, { max: 87, element: "Vate" }, { max: 90, element: "Volken" },
    { max: 93, element: "Walden" }, { max: 96, element: "Waren" }, { max: 98, element: "Wesser" },
    { max: 99, element: "Zaach" }, { max: 100, element: "Zeib" },
];

/** Table A-2: Empire Name Second Element, 1d10 direct index. */
export const EMPIRE_SECOND_ELEMENT = [
    null, "bad", "burg", "dorf", "gart", "hafen", "heim", "hof", "mund", "schlosse", "wald",
];

/** Table A-3: Bretonnian Name First Element. */
export const BRETONNIAN_FIRST_ELEMENT = [
    { max: 3, element: "Ber" }, { max: 6, element: "Blaz" }, { max: 9, element: "Bon" },
    { max: 13, element: "Bredot" }, { max: 16, element: "Briot" }, { max: 19, element: "Brul" },
    { max: 22, element: "Caer" }, { max: 25, element: "Carr" }, { max: 28, element: "Cheval" },
    { max: 31, element: "Daub" }, { max: 34, element: "Ep" }, { max: 37, element: "Esp" },
    { max: 40, element: "Foix" }, { max: 43, element: "Gast" }, { max: 46, element: "Gil" },
    { max: 49, element: "Haux" }, { max: 52, element: "Juill" }, { max: 55, element: "Jus" },
    { max: 58, element: "L'" }, { max: 61, element: "Labas" }, { max: 64, element: "Lac" },
    { max: 67, element: "Laud" }, { max: 70, element: "Louen" }, { max: 73, element: "Mont" },
    { max: 76, element: "Noul" }, { max: 79, element: "Orli" }, { max: 82, element: "Oui" },
    { max: 85, element: "Pont" }, { max: 88, element: "Renn" }, { max: 91, element: "Sall" },
    { max: 94, element: "Sav" }, { max: 97, element: "Tal" }, { max: 98, element: "Tour" },
    { max: 99, element: "Tout" }, { max: 100, element: "Vair" },
];

/** Table A-4: Bretonnian Name Second Element, 1d10 direct index. */
export const BRETONNIAN_SECOND_ELEMENT = [
    null, "aine", "eaux", "elles", "enne", "erin", "esse", "ette", "oeur", "onne", "uile",
];

/** Table A-5: Tilean Name First Element. */
export const TILEAN_FIRST_ELEMENT = [
    { max: 3, element: "Aguil" }, { max: 6, element: "Arn" }, { max: 9, element: "Astur" },
    { max: 12, element: "Belt" }, { max: 15, element: "Bib" }, { max: 18, element: "Cast" },
    { max: 21, element: "Colum" }, { max: 24, element: "Dicamb" }, { max: 26, element: "Etrus" },
    { max: 29, element: "Etug" }, { max: 32, element: "Fabrian" }, { max: 35, element: "Fund" },
    { max: 37, element: "Futal" }, { max: 40, element: "Guigl" }, { max: 43, element: "Isol" },
    { max: 46, element: "Jes" }, { max: 49, element: "Lar" }, { max: 52, element: "Luangl" },
    { max: 55, element: "Mass" }, { max: 58, element: "Mir" }, { max: 61, element: "Mot" },
    { max: 64, element: "Norc" }, { max: 66, element: "Nurs" }, { max: 69, element: "Ortic" },
    { max: 72, element: "Perut" }, { max: 75, element: "Piomb" }, { max: 78, element: "Seneg" },
    { max: 81, element: "Serm" }, { max: 84, element: "Terracel" }, { max: 86, element: "Tibol" },
    { max: 89, element: "Tod" }, { max: 92, element: "Tord" }, { max: 95, element: "Urb" },
    { max: 98, element: "Viter" }, { max: 100, element: "Volter" },
];

/** Table A-6: Tilean Name Second Element, 1d10 direct index. */
export const TILEAN_SECOND_ELEMENT = [
    null, "ello", "ena", "enze", "ici", "imo", "ino", "lio", "ome", "oni", "orno",
];

/** Table A-7: Estalian Name First Element. */
export const ESTALIAN_FIRST_ELEMENT = [
    { max: 3, element: "Alb" }, { max: 6, element: "And" }, { max: 9, element: "Barr" },
    { max: 12, element: "Blan" }, { max: 15, element: "Camp" }, { max: 18, element: "Cast" },
    { max: 21, element: "Cort" }, { max: 24, element: "Don" }, { max: 27, element: "Esc" },
    { max: 30, element: "Est" }, { max: 32, element: "Fuen" }, { max: 35, element: "Garc" },
    { max: 38, element: "Gran" }, { max: 40, element: "Guad" }, { max: 42, element: "Hoy" },
    { max: 45, element: "Ist" }, { max: 48, element: "Lag" }, { max: 51, element: "Mad" },
    { max: 54, element: "Man" }, { max: 57, element: "Mat" }, { max: 60, element: "Mon" },
    { max: 63, element: "Nav" }, { max: 66, element: "Nuest" }, { max: 69, element: "Orteg" },
    { max: 72, element: "Palom" }, { max: 75, element: "Pesc" }, { max: 78, element: "Pin" },
    { max: 81, element: "Puen" }, { max: 84, element: "Ques" }, { max: 87, element: "Ran" },
    { max: 90, element: "Riv" }, { max: 93, element: "Sla" }, { max: 96, element: "Torr" },
    { max: 98, element: "Yes" }, { max: 100, element: "Zah" },
];

/** Table A-8: Estalian Name Second Element, 1d10 direct index. */
export const ESTALIAN_SECOND_ELEMENT = [
    null, "alba", "echa", "eta", "erra", "evas", "ida", "isto", "ivada", "oja", "onio",
];

/** Table A-9: Kislevite Name First Element. */
export const KISLEVITE_FIRST_ELEMENT = [
    { max: 3, element: "Arvam" }, { max: 6, element: "Astrak" }, { max: 9, element: "Balak" },
    { max: 12, element: "Belgor" }, { max: 15, element: "Chebok" }, { max: 18, element: "Dedog" },
    { max: 21, element: "Dern" }, { max: 24, element: "Enis" }, { max: 27, element: "Gers" },
    { max: 30, element: "Goro" }, { max: 33, element: "Hosch" }, { max: 36, element: "Iaro" },
    { max: 39, element: "Kalinin" }, { max: 42, element: "Kysly" }, { max: 45, element: "Luch" },
    { max: 48, element: "Milkov" }, { max: 51, element: "Morav" }, { max: 54, element: "Nekol" },
    { max: 58, element: "Nov" }, { max: 62, element: "Ocha" }, { max: 65, element: "Ples" },
    { max: 68, element: "Pomez" }, { max: 71, element: "Radogo" }, { max: 74, element: "Res" },
    { max: 77, element: "San" }, { max: 80, element: "Sepuk" }, { max: 83, element: "Smol" },
    { max: 86, element: "Temni" }, { max: 90, element: "Ugro" }, { max: 94, element: "Uvet" },
    { max: 98, element: "Zhid" }, { max: 100, element: "Zveni" },
];

/** Table A-10: Kislevite Name Second Element, 1d10 direct index. */
export const KISLEVITE_SECOND_ELEMENT = [
    null, "ov", "sin", "grad", "khan", "les", "itsy", "ovsk", "polye", "most", "ryeka",
];

/**
 * Table A-11: Flavourful Place Name First Element. "'Wocky" (band 1-2) is a best-effort
 * transcription — the source PDF's text layer renders its leading character as a bare
 * backtick in both `-table` and `-layout` mode, almost certainly a mis-encoded apostrophe
 * rather than a literal backtick.
 */
export const FLAVOURFUL_FIRST_ELEMENT = [
    { max: 2, element: "'Wocky" }, { max: 4, element: "Arrow" }, { max: 6, element: "Axe" },
    { max: 8, element: "Bad" }, { max: 10, element: "Bilge" }, { max: 12, element: "Black" },
    { max: 14, element: "Blade" }, { max: 16, element: "Bloody" }, { max: 18, element: "Bolt" },
    { max: 20, element: "Clank" }, { max: 22, element: "Clay" }, { max: 24, element: "Dagger" },
    { max: 26, element: "Dark" }, { max: 28, element: "Death" }, { max: 30, element: "Dirt" },
    { max: 32, element: "Doom" }, { max: 34, element: "Dragon" }, { max: 36, element: "Dun" },
    { max: 38, element: "Dusty" }, { max: 40, element: "Fire" }, { max: 42, element: "Gold" },
    { max: 44, element: "Greasy" }, { max: 46, element: "Grim" }, { max: 48, element: "Gutter" },
    { max: 50, element: "Hammer" }, { max: 52, element: "Hangman's" }, { max: 54, element: "Helm" },
    { max: 56, element: "Hunter's" }, { max: 58, element: "Iron" }, { max: 60, element: "Mattock" },
    { max: 62, element: "Noose" }, { max: 64, element: "Orc" }, { max: 66, element: "Ox" },
    { max: 68, element: "Pain" }, { max: 70, element: "Pig" }, { max: 72, element: "Pike" },
    { max: 74, element: "Red" }, { max: 76, element: "Reeky" }, { max: 78, element: "Rock" },
    { max: 80, element: "Bullock" }, { max: 82, element: "Shadow" }, { max: 84, element: "Sigmar's" },
    { max: 86, element: "Snake" }, { max: 88, element: "Spike" }, { max: 90, element: "Spit" },
    { max: 92, element: "Stink" }, { max: 94, element: "Thief" }, { max: 96, element: "Thorn" },
    { max: 98, element: "Wolf's" }, { max: 100, element: "Wyvern" },
];

/** Table A-12: Flavourful Place Name Second Element — unlike every other style, this is itself a banded d100 table, not a 1d10 list. */
export const FLAVOURFUL_SECOND_ELEMENT = [
    { max: 2, element: "Block" }, { max: 4, element: "Cross" }, { max: 6, element: "Diggings" },
    { max: 8, element: "Ditch" }, { max: 10, element: "Drain" }, { max: 12, element: "Dreg" },
    { max: 14, element: "Drop" }, { max: 16, element: "Ending" }, { max: 18, element: "Farm" },
    { max: 20, element: "Fast" }, { max: 22, element: "Ford" }, { max: 24, element: "Fort" },
    { max: 26, element: "Gap" }, { max: 28, element: "Gorge" }, { max: 30, element: "Hanging" },
    { max: 32, element: "Heap" }, { max: 34, element: "Hill" }, { max: 36, element: "Hold" },
    { max: 38, element: "Hole" }, { max: 40, element: "Hollows" }, { max: 42, element: "Keep" },
    { max: 44, element: "Lay" }, { max: 46, element: "Leavings" }, { max: 48, element: "Manor" },
    { max: 50, element: "Market" }, { max: 52, element: "Mere" }, { max: 54, element: "Midden" },
    { max: 56, element: "Mire" }, { max: 58, element: "Passing" }, { max: 60, element: "Pile" },
    { max: 62, element: "Pit" }, { max: 64, element: "Pool" }, { max: 66, element: "Post" },
    { max: 68, element: "Range" }, { max: 70, element: "Ridge" }, { max: 72, element: "Rising" },
    { max: 74, element: "Run" }, { max: 76, element: "Seat" }, { max: 78, element: "Shield" },
    { max: 80, element: "Stead" }, { max: 82, element: "Stockade" }, { max: 84, element: "Stoppage" },
    { max: 86, element: "Stream" }, { max: 88, element: "Sty" }, { max: 90, element: "Tor" },
    { max: 92, element: "Trench" }, { max: 94, element: "Wall" }, { max: 96, element: "Way" },
    { max: 98, element: "Well" }, { max: 100, element: "Workings" },
];

export const FIRST_ELEMENT_TABLES = {
    Empire: EMPIRE_FIRST_ELEMENT,
    Bretonnian: BRETONNIAN_FIRST_ELEMENT,
    Tilean: TILEAN_FIRST_ELEMENT,
    Estalian: ESTALIAN_FIRST_ELEMENT,
    Kislevite: KISLEVITE_FIRST_ELEMENT,
    Flavourful: FLAVOURFUL_FIRST_ELEMENT,
};

/** Empire/Bretonnian/Tilean/Estalian/Kislevite are 1d10 direct-index lists; Flavourful is banded like its First Element (see FLAVOURFUL_SECOND_ELEMENT). */
export const SECOND_ELEMENT_TABLES = {
    Empire: EMPIRE_SECOND_ELEMENT,
    Bretonnian: BRETONNIAN_SECOND_ELEMENT,
    Tilean: TILEAN_SECOND_ELEMENT,
    Estalian: ESTALIAN_SECOND_ELEMENT,
    Kislevite: KISLEVITE_SECOND_ELEMENT,
    Flavourful: FLAVOURFUL_SECOND_ELEMENT,
};
