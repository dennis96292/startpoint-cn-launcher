"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const wdfpData_1 = require("./updaters/wdfpData");
const wdfpData_2 = __importDefault(require("./initializers/wdfpData"));
// DB_DIR lets the launcher store the database outside the install dir (survives app updates);
// fall back to <serverRoot>/.database relative to the source file.
const dataDir = process.env.DB_DIR || path_1.default.resolve(__dirname, "../../.database");
const versionFileExtension = ".version";
if (!(0, fs_1.existsSync)(dataDir)) {
    // make the data directory since it doesn't exist
    try {
        (0, fs_1.mkdirSync)(dataDir);
    }
    catch (error) {
        throw new Error(`Failed to create the data directory. Reason: ${error.message}`);
    }
}
const databasesMetadata = {
    [0 /* Database.WDFP_DATA */]: {
        path: "/wdfp_data.db",
        init: wdfpData_2.default,
        updateBefore: wdfpData_1.updateBeforeInit,
        updateAfter: wdfpData_1.updateAfterInit,
        latestVersion: 2
    }
};
const loadedDatabases = {};
function getDatabase(database) {
    // don't try to load an already-loaded database
    const isLoaded = loadedDatabases[database];
    if (isLoaded)
        return isLoaded;
    // get metadata
    const metadata = databasesMetadata[database];
    const relativeDatabasePath = metadata.path;
    const absoluteDatabasePath = path_1.default.join(dataDir, relativeDatabasePath);
    // check if the db already exists
    const dbExists = (0, fs_1.existsSync)(absoluteDatabasePath);
    // get the database's version
    let currentVersion = 0;
    const versionFilePath = path_1.default.join(dataDir, `${relativeDatabasePath}${versionFileExtension}`);
    if (dbExists && (0, fs_1.existsSync)(versionFilePath)) {
        const fileContents = (0, fs_1.readFileSync)(versionFilePath).toString('utf-8');
        const versionNumber = Number(fileContents);
        currentVersion = isNaN(versionNumber) ? currentVersion : versionNumber;
    }
    // create new db
    const db = new better_sqlite3_1.default(absoluteDatabasePath);
    // set pragma
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = OFF');
    // call init & update function
    const init = metadata.init;
    const updateBefore = metadata.updateBefore;
    const updateAfter = metadata.updateAfter;
    if (init !== undefined) {
        try {
            // try to update before initialization
            const latestVersion = metadata.latestVersion;
            const updateRequired = dbExists && metadata.latestVersion > currentVersion;
            console.log(`[DB] init: dbExists=${dbExists} currentVersion=${currentVersion} latestVersion=${latestVersion} updateRequired=${updateRequired}`);
            if (updateRequired && updateBefore !== undefined) {
                console.log("Updating wdfp_data.db...");
                updateBefore(db, currentVersion);
            }
            // initialize
            console.log("[DB] calling init...");
            init(db, dbExists);
            console.log("[DB] init done");
            // try to update after initialization
            if (updateRequired && updateAfter !== undefined) {
                updateAfter(db, currentVersion);
                console.log("Successfully updated wdfp_data.db");
            }
            // write version file
            (0, fs_1.writeFileSync)(versionFilePath, latestVersion.toString(), { encoding: 'utf-8' });
        }
        catch (error) {
            console.log(error);
            console.log(`Initalization failed for module ${metadata.path}. Error: ${error}`);
        }
    }
    // re-enable foreign keys
    db.pragma('foreign_keys = ON');
    // add to loaded databases
    loadedDatabases[database] = db;
    return db;
}
exports.default = getDatabase;
