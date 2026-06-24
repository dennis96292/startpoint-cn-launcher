"use strict";
// Updates an outdated wdfp_data database
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateAfterInit = exports.updateBeforeInit = void 0;
/**
 * Updates a database before its initialization function has been called.
 *
 * @param database A better-sqlite3 database.
 */
function updateBeforeInit(database, currentVersion) {
    if (0 >= currentVersion) {
        // update to version 1
        // Only run if tables exist and _old tables don't (skip for fresh DBs or already-migrated DBs)
        const tableExists = database.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='players_parties'").get();
        const oldExists = database.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='players_parties_old'").get();
        if (tableExists && !oldExists) {
            database.prepare(`ALTER TABLE players_parties RENAME TO players_parties_old`).run();
            database.prepare(`ALTER TABLE players_party_groups RENAME TO players_party_groups_old`).run();
        }
    }
    if (1 >= currentVersion) {
        // update to version 2
        const tableExists = database.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='players_party_options'").get();
        if (tableExists) {
            database.prepare(`DROP TABLE players_party_options`).run();
        }
    }
}
exports.updateBeforeInit = updateBeforeInit;
/**
 * Updates a database after its initialization function has been called.
 *
 * @param database A better-sqlite3 database.
 */
function updateAfterInit(database, currentVersion) {
    if (0 >= currentVersion) {
        // update to version 1
        // Only run if _old tables exist (skip for fresh DBs)
        const oldTableExists = database.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='players_party_groups_old'").get();
        if (oldTableExists) {
            database.prepare(`
            INSERT INTO players_party_groups
            SELECT *, 1 FROM players_party_groups_old
            `).run();
            database.prepare(`
            INSERT INTO players_parties
            SELECT *, 1 FROM players_parties_old
            `).run();
            database.prepare(`DELETE FROM players_parties_old`).run();
            database.prepare(`DELETE FROM players_party_groups_old`).run();
        }
    }
}
exports.updateAfterInit = updateAfterInit;
