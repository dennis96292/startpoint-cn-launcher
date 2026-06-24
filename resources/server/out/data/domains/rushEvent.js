"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updatePlayerRushEventPlayedPartySync = exports.deletePlayerRushEventPlayedPartiesUntilSync = exports.deletePlayerRushEventPlayedPartySync = exports.deletePlayerRushEventPlayedPartyListSync = exports.insertPlayerRushEventPlayedPartyListSync = exports.insertPlayerRushEventPlayedPartySync = exports.getPlayerRushEventNextEndlessBattleRoundSync = exports.getPlayerRushEventListPlayedPartiesSync = exports.getPlayerRushEventPlayedPartiesSync = exports.serializePlayerRushEventPlayedParty = exports.deserializePlayerRushEventPlayedParty = exports.insertPlayerRushEventClearedFolderListSync = exports.insertPlayerRushEventClearedFolderSync = exports.getPlayerRushEventListClearedFoldersSync = exports.getPlayerRushEventClearedFoldersSync = exports.updatePlayerRushEventSync = exports.insertPlayerRushEventListSync = exports.insertPlayerRushEventSync = exports.getPlayerIdFromRushEventEndlessRankSync = exports.getRushEventEndlessRankingListSync = exports.getPlayerRushEventListSync = exports.getPlayerRushEventSync = exports.getDefaultPlayerRushEventSync = exports.deserializeRushEvent = void 0;
const db_1 = require("../db");
const types_1 = require("../types");
const rush_1 = require("../../lib/rush");
/**
 * Deserializes a RawPlayerRushEvent into a PlayerRushEvent
 *
 * @param raw
 * @param endlessBattleNextRound The next endless battle round for this event.
 */
function deserializeRushEvent(raw, endlessBattleNextRound) {
    return {
        eventId: raw.event_id,
        endlessBattleNextRound: endlessBattleNextRound,
        activeRushBattleFolderId: raw.active_rush_battle_folder_id,
        endlessBattleMaxRound: raw.endless_battle_max_round,
        endlessBattleMaxRoundTime: raw.endless_battle_max_round_time,
        endlessBattleMaxRoundCharacterIds: [
            raw.endless_battle_max_round_character_id_1,
            raw.endless_battle_max_round_character_id_2,
            raw.endless_battle_max_round_character_id_3
        ],
        endlessBattleMaxRoundCharacterEvolutionImgLvls: [
            raw.endless_battle_max_round_character_evolution_img_lvl_1,
            raw.endless_battle_max_round_character_evolution_img_lvl_2,
            raw.endless_battle_max_round_character_evolution_img_lvl_3,
        ]
    };
}
exports.deserializeRushEvent = deserializeRushEvent;
/**
 * Returns a default PlayerRushEvent.
 *
 * @param eventId The ID of the event to get the default PlayerRushEvent of.
 * @returns A default PlayerRushEvent
 */
function getDefaultPlayerRushEventSync(eventId) {
    return {
        eventId: eventId,
        endlessBattleNextRound: 1,
        activeRushBattleFolderId: null,
        endlessBattleMaxRound: null,
        endlessBattleMaxRoundTime: null,
        endlessBattleMaxRoundCharacterIds: [null, null, null],
        endlessBattleMaxRoundCharacterEvolutionImgLvls: [null, null, null]
    };
}
exports.getDefaultPlayerRushEventSync = getDefaultPlayerRushEventSync;
/**
 * Gets the data for a player's rush event progress.
 *
 * @param playerId The ID of the player.
 * @param eventId The ID of the rush event.
 * @returns The rush event data or null.
 */
function getPlayerRushEventSync(playerId, eventId) {
    const rawData = (0, db_1.getDb)().prepare(`
    SELECT *
    FROM players_rush_events
    WHERE player_id = ? AND event_id = ?
    `).get(playerId, eventId);
    // get next endless round
    const nextEndlessBattleRound = getPlayerRushEventNextEndlessBattleRoundSync(playerId, eventId);
    return rawData === undefined ? null : deserializeRushEvent(rawData, nextEndlessBattleRound);
}
exports.getPlayerRushEventSync = getPlayerRushEventSync;
/**
 * Batch gets the data for every rush event a player has participated in.
 *
 * @param playerId The ID of the player.
 * @returns An array of PlayerRushEvent objects.
 */
function getPlayerRushEventListSync(playerId) {
    const rawData = (0, db_1.getDb)().prepare(`
    SELECT *
    FROM players_rush_events
    WHERE player_id = ?
    `).all(playerId);
    return rawData.map(raw => deserializeRushEvent(raw, 1));
}
exports.getPlayerRushEventListSync = getPlayerRushEventListSync;
/**
 * Gets rush event endless battle rankings for a specific rush event.
 *
 * @param eventId The rush event's ID.
 * @param page The current page.
 * @param pageSize The size of each page.
 * @returns The ranking list result.
 */
function getRushEventEndlessRankingListSync(eventId, page, pageSize = 100) {
    var _a, _b;
    const offset = page * pageSize;
    const results = (0, db_1.getDb)().prepare(`
    SELECT *,
        COUNT(*) OVER() as total_count
    FROM players_rush_events
    WHERE event_id = ?
    ORDER BY endless_battle_max_round DESC,
        endless_battle_max_round_time ASC
    LIMIT ?
    OFFSET ?
    `).all(eventId, pageSize, offset);
    const totalCount = (_b = (_a = results[0]) === null || _a === void 0 ? void 0 : _a.total_count) !== null && _b !== void 0 ? _b : 0;
    const mappedResults = [];
    let rankNumber = 1;
    for (const raw of results) {
        const ranking = (0, rush_1.getPlayerRushEventEndlessBattleRankingSync)(raw.player_id, eventId, {
            rankNumber: rankNumber + offset
        });
        if (ranking !== null) {
            mappedResults.push(ranking);
            rankNumber += 1;
        }
    }
    return {
        pageMax: Math.ceil(totalCount / pageSize),
        list: mappedResults
    };
}
exports.getRushEventEndlessRankingListSync = getRushEventEndlessRankingListSync;
/**
 * Gets the player ID who is at a specific rank for the endless battle leaderboard for a raid event.
 *
 * @param rank The rank to get the player ID of.
 * @param eventId The ID of the rush event.
 * @returns A player ID or null.
 */
function getPlayerIdFromRushEventEndlessRankSync(rank, eventId) {
    var _a;
    const result = (0, db_1.getDb)().prepare(`
    SELECT player_id
    FROM players_rush_events
    WHERE event_id = ?
    ORDER BY endless_battle_max_round DESC,
        endless_battle_max_round_time ASC
    LIMIT 1
    OFFSET ?
    `).get(eventId, rank - 1);
    return (_a = result === null || result === void 0 ? void 0 : result.player_id) !== null && _a !== void 0 ? _a : null;
}
exports.getPlayerIdFromRushEventEndlessRankSync = getPlayerIdFromRushEventEndlessRankSync;
/**
 * Inserts the data for a player's rush event progress.
 *
 * @param playerId The ID of the player.
 * @param rushEvent The data of the rush event to insert.
 */
function insertPlayerRushEventSync(playerId, rushEvent) {
    (0, db_1.getDb)().prepare(`
    INSERT INTO players_rush_events
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(playerId, rushEvent.eventId, rushEvent.activeRushBattleFolderId, rushEvent.endlessBattleMaxRound, rushEvent.endlessBattleMaxRoundTime, ...rushEvent.endlessBattleMaxRoundCharacterIds, ...rushEvent.endlessBattleMaxRoundCharacterEvolutionImgLvls);
}
exports.insertPlayerRushEventSync = insertPlayerRushEventSync;
/**
 * Batch inserts a player's data for multiple rush events into the database.
 *
 * @param playerId The ID of the player.
 * @param eventList An array of rush event data entries.
 */
function insertPlayerRushEventListSync(playerId, eventList) {
    (0, db_1.getDb)().transaction(() => {
        for (const event of eventList) {
            insertPlayerRushEventSync(playerId, event);
        }
    })();
}
exports.insertPlayerRushEventListSync = insertPlayerRushEventListSync;
/**
 * Updates the data for a player's rush event progress.
 *
 * @param playerId The ID of the player.
 * @param rushEvent The values to change.
 */
function updatePlayerRushEventSync(playerId, rushEvent) {
    const characterIds = rushEvent.endlessBattleMaxRoundCharacterIds;
    const characterEvolutionImgLevels = rushEvent.endlessBattleMaxRoundCharacterEvolutionImgLvls;
    const fields = {
        'active_rush_battle_folder_id': rushEvent.activeRushBattleFolderId,
        'endless_battle_max_round': rushEvent.endlessBattleMaxRound,
        'endless_battle_max_round_time': rushEvent.endlessBattleMaxRoundTime,
        'endless_battle_max_round_character_id_1': characterIds === null || characterIds === void 0 ? void 0 : characterIds[0],
        'endless_battle_max_round_character_id_2': characterIds === null || characterIds === void 0 ? void 0 : characterIds[1],
        'endless_battle_max_round_character_id_3': characterIds === null || characterIds === void 0 ? void 0 : characterIds[2],
        'endless_battle_max_round_character_evolution_img_lvl_1': characterEvolutionImgLevels === null || characterEvolutionImgLevels === void 0 ? void 0 : characterEvolutionImgLevels[0],
        'endless_battle_max_round_character_evolution_img_lvl_2': characterEvolutionImgLevels === null || characterEvolutionImgLevels === void 0 ? void 0 : characterEvolutionImgLevels[1],
        'endless_battle_max_round_character_evolution_img_lvl_3': characterEvolutionImgLevels === null || characterEvolutionImgLevels === void 0 ? void 0 : characterEvolutionImgLevels[2],
    };
    const sets = [];
    const values = [];
    for (const [field, value] of Object.entries(fields)) {
        if (value !== undefined) {
            sets.push(`${field} = ?`);
            values.push(value);
        }
    }
    if (sets.length > 0)
        (0, db_1.getDb)().prepare(`
        UPDATE players_rush_events
        SET ${sets.join(', ')}
        WHERE player_id = ? AND event_id = ?
        `).run([
            ...values,
            playerId,
            rushEvent.eventId
        ]);
}
exports.updatePlayerRushEventSync = updatePlayerRushEventSync;
/**
 * Gets all of the folders that a player has cleared for a specific rush event.
 *
 * @param playerId The ID of the player.
 * @param eventId The ID of the rush event.
 * @returns An array of cleared folder IDs.
 */
function getPlayerRushEventClearedFoldersSync(playerId, eventId) {
    const rawCleared = (0, db_1.getDb)().prepare(`
    SELECT player_id, event_id, folder_id
    FROM players_rush_events_cleared_folders
    WHERE player_id = ? AND event_id = ?
    `).all(playerId, eventId);
    return rawCleared.map(raw => raw.folder_id);
}
exports.getPlayerRushEventClearedFoldersSync = getPlayerRushEventClearedFoldersSync;
/**
 * Gets all of the cleared folders for every rush event.
 *
 * @param playerId The ID of the player.
 * @returns A record where the key is the event ID and the value is an array of cleared folder IDs.
 */
function getPlayerRushEventListClearedFoldersSync(playerId) {
    const rawCleared = (0, db_1.getDb)().prepare(`
    SELECT player_id, event_id, folder_id
    FROM players_rush_events_cleared_folders
    WHERE player_id = ?
    `).all(playerId);
    const eventFolderBuckets = {};
    for (const clearedFolder of rawCleared) {
        let bucket = eventFolderBuckets[clearedFolder.event_id];
        if (bucket === undefined) {
            bucket = [];
            eventFolderBuckets[clearedFolder.event_id] = bucket;
        }
        bucket.push(clearedFolder.folder_id);
    }
    return eventFolderBuckets;
}
exports.getPlayerRushEventListClearedFoldersSync = getPlayerRushEventListClearedFoldersSync;
/**
 * Marks a rush event's folder as cleared for a specific player.
 *
 * @param playerId The ID of the player
 * @param eventId The ID of the rush event.
 * @param folderId The ID of the cleared folder.
 */
function insertPlayerRushEventClearedFolderSync(playerId, eventId, folderId) {
    (0, db_1.getDb)().prepare(`
    INSERT OR IGNORE INTO players_rush_events_cleared_folders (player_id, event_id, folder_id)
    VALUES (?, ?, ?)
    `).run(playerId, eventId, folderId);
}
exports.insertPlayerRushEventClearedFolderSync = insertPlayerRushEventClearedFolderSync;
/**
 * Batch inserts multiple cleared folder IDs into the database.
 *
 * @param playerId The ID of the player.
 * @param folderList A record where the key is the ID of a rush event and the value is an array of folder IDs.
 */
function insertPlayerRushEventClearedFolderListSync(playerId, folderList) {
    (0, db_1.getDb)().transaction(() => {
        for (const [rawEventId, folders] of Object.entries(folderList)) {
            const eventId = Number(rawEventId);
            for (const folderId of folders) {
                insertPlayerRushEventClearedFolderSync(playerId, eventId, folderId);
            }
        }
    })();
}
exports.insertPlayerRushEventClearedFolderListSync = insertPlayerRushEventClearedFolderListSync;
/**
 * Converts a PlayerRushEventPlayedParty object from database format.
 *
 * @param serialized The PlayerRushEventPlayedParty in database format.
 * @returns
 */
function deserializePlayerRushEventPlayedParty(serialized) {
    return {
        characterIds: [
            serialized.character_id_1,
            serialized.character_id_2,
            serialized.character_id_3
        ],
        unisonCharacterIds: [
            serialized.unison_character_id_1,
            serialized.unison_character_id_2,
            serialized.unison_character_id_3
        ],
        abilitySoulIds: [
            serialized.ability_soul_id_1,
            serialized.ability_soul_id_2,
            serialized.ability_soul_id_3
        ],
        equipmentIds: [
            serialized.equipment_id_1,
            serialized.equipment_id_2,
            serialized.equipment_id_3
        ],
        evolutionImgLevels: [
            serialized.evolution_img_level_1,
            serialized.evolution_img_level_2,
            serialized.evolution_img_level_3
        ],
        unisonEvolutionImgLevels: [
            serialized.unison_evolution_img_level_1,
            serialized.unison_evolution_img_level_2,
            serialized.unison_evolution_img_level_3
        ],
        battleType: serialized.battle_type,
        round: serialized.round
    };
}
exports.deserializePlayerRushEventPlayedParty = deserializePlayerRushEventPlayedParty;
/**
 * Converts a PlayerRushEventPlayedParty into database format.
 *
 * @param playerId The ID of the player.
 * @param eventId The ID of the rush event.
 * @param deserialized The deserialized rush party to convert.
 * @returns A RawPlayerRushEventPlayedParty
 */
function serializePlayerRushEventPlayedParty(deserialized) {
    return {
        character_id_1: deserialized.characterIds[0],
        character_id_2: deserialized.characterIds[1],
        character_id_3: deserialized.characterIds[2],
        unison_character_id_1: deserialized.unisonCharacterIds[0],
        unison_character_id_2: deserialized.unisonCharacterIds[1],
        unison_character_id_3: deserialized.unisonCharacterIds[2],
        equipment_id_1: deserialized.equipmentIds[0],
        equipment_id_2: deserialized.equipmentIds[1],
        equipment_id_3: deserialized.equipmentIds[2],
        ability_soul_id_1: deserialized.abilitySoulIds[0],
        ability_soul_id_2: deserialized.abilitySoulIds[1],
        ability_soul_id_3: deserialized.abilitySoulIds[2],
        evolution_img_level_1: deserialized.evolutionImgLevels[0],
        evolution_img_level_2: deserialized.evolutionImgLevels[1],
        evolution_img_level_3: deserialized.evolutionImgLevels[2],
        unison_evolution_img_level_1: deserialized.unisonEvolutionImgLevels[0],
        unison_evolution_img_level_2: deserialized.unisonEvolutionImgLevels[1],
        unison_evolution_img_level_3: deserialized.unisonEvolutionImgLevels[2],
    };
}
exports.serializePlayerRushEventPlayedParty = serializePlayerRushEventPlayedParty;
/**
 * Gets an array of all of a player's parties that they have used to clear rush events.
 *
 * @param playerId The ID of the player.
 * @param eventId The event ID
 * @returns
 */
function getPlayerRushEventPlayedPartiesSync(playerId, eventId) {
    const rawParties = (0, db_1.getDb)().prepare(`
    SELECT character_id_1, character_id_2, character_id_3,
        unison_character_id_1, unison_character_id_2, unison_character_id_3,
        equipment_id_1, equipment_id_2, equipment_id_3, ability_soul_id_1,
        ability_soul_id_2, ability_soul_id_3, evolution_img_level_1,
        evolution_img_level_2, evolution_img_level_3,
        unison_evolution_img_level_1, unison_evolution_img_level_2,
        unison_evolution_img_level_3, player_id, event_id, round,
        battle_type
    FROM players_rush_events_played_parties
    WHERE player_id = ? AND event_id = ?
    `).all(playerId, eventId);
    return rawParties.map(raw => deserializePlayerRushEventPlayedParty(raw));
}
exports.getPlayerRushEventPlayedPartiesSync = getPlayerRushEventPlayedPartiesSync;
/**
 * Batch gets a list of every played party for every rush event for a specific player.
 *
 * @param playerId The ID of the player.
 * @returns A record where the key is an EventID and the value is an array of PlayerRushEventPlayedParty.
 */
function getPlayerRushEventListPlayedPartiesSync(playerId) {
    const rawParties = (0, db_1.getDb)().prepare(`
    SELECT *
    FROM players_rush_events_played_parties
    WHERE player_id = ?
    `).all(playerId);
    const eventPartyBuckets = {};
    for (const rawParty of rawParties) {
        let bucket = eventPartyBuckets[rawParty.event_id];
        if (bucket === undefined) {
            bucket = [];
            eventPartyBuckets[rawParty.event_id] = bucket;
        }
        bucket.push(deserializePlayerRushEventPlayedParty(rawParty));
    }
    return eventPartyBuckets;
}
exports.getPlayerRushEventListPlayedPartiesSync = getPlayerRushEventListPlayedPartiesSync;
/**
 * Gets the next endless battle round that a player should complete for a specific rush event.
 *
 * @param playerId The ID of the player.
 * @param eventId The ID of the rush event.
 * @returns The next round that the player should complete.
 */
function getPlayerRushEventNextEndlessBattleRoundSync(playerId, eventId) {
    const rawRounds = (0, db_1.getDb)().prepare(`
    SELECT round
    FROM players_rush_events_played_parties
    WHERE player_id = ? AND event_id = ? AND battle_type = ?
    `).all(playerId, eventId, types_1.RushEventBattleType.ENDLESS);
    let nextRound = 1;
    for (const rawRound of rawRounds) {
        if (rawRound.round !== nextRound)
            break;
        nextRound += 1;
    }
    return nextRound;
}
exports.getPlayerRushEventNextEndlessBattleRoundSync = getPlayerRushEventNextEndlessBattleRoundSync;
/**
 * Inserts a rush event played party for a specific player.
 *
 * @param playerId The ID of the player.
 * @param eventId The rush event's ID.
 * @param party The party data.
 */
function insertPlayerRushEventPlayedPartySync(playerId, eventId, party) {
    (0, db_1.getDb)().prepare(`
    INSERT OR REPLACE INTO players_rush_events_played_parties
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(party.characterIds[0], party.characterIds[1], party.characterIds[2], party.unisonCharacterIds[0], party.unisonCharacterIds[1], party.unisonCharacterIds[2], party.equipmentIds[0], party.equipmentIds[1], party.equipmentIds[2], party.abilitySoulIds[0], party.abilitySoulIds[1], party.abilitySoulIds[2], party.evolutionImgLevels[0], party.evolutionImgLevels[1], party.evolutionImgLevels[2], party.unisonEvolutionImgLevels[0], party.unisonEvolutionImgLevels[1], party.unisonEvolutionImgLevels[2], playerId, eventId, party.round, party.battleType);
}
exports.insertPlayerRushEventPlayedPartySync = insertPlayerRushEventPlayedPartySync;
/**
 * Batch inserts PlayerRushEventPlayedParty values into the database.
 *
 * @param playerId The ID of the player.
 * @param partyList A record where the key is an event ID, and the value is an array of rush event played parties.
 */
function insertPlayerRushEventPlayedPartyListSync(playerId, partyList) {
    (0, db_1.getDb)().transaction(() => {
        for (const [rawEventId, parties] of Object.entries(partyList)) {
            const eventId = Number(rawEventId);
            for (const party of parties) {
                insertPlayerRushEventPlayedPartySync(playerId, eventId, party);
            }
        }
    })();
}
exports.insertPlayerRushEventPlayedPartyListSync = insertPlayerRushEventPlayedPartyListSync;
/**
 * Deletes all of a player's rush event played parties for a specific event & battle type.
 *
 * @param playerId The ID of the player.
 * @param eventId The ID of the rush event.
 * @param battleType The type of rush event battle.
 */
function deletePlayerRushEventPlayedPartyListSync(playerId, eventId, battleType) {
    (0, db_1.getDb)().prepare(`
    DELETE FROM players_rush_events_played_parties
    WHERE player_id = ? AND event_id = ? AND battle_type = ?
    `).run(playerId, eventId, battleType);
}
exports.deletePlayerRushEventPlayedPartyListSync = deletePlayerRushEventPlayedPartyListSync;
/**
 * Deletes a single rush event played party for a specific player & rush event.
 *
 * @param playerId The ID of the player.
 * @param eventId The ID of the rush event.
 * @param round The round to delete.
 * @param battleType The type of rush event battle.
 */
function deletePlayerRushEventPlayedPartySync(playerId, eventId, round, battleType) {
    (0, db_1.getDb)().prepare(`
    DELETE FROM players_rush_events_played_parties
    WHERE player_id = ? AND event_id = ? AND round = ? AND battle_type = ?
    `).run(playerId, eventId, round, battleType);
}
exports.deletePlayerRushEventPlayedPartySync = deletePlayerRushEventPlayedPartySync;
/**
 * Deletes a player's rush event played parties while their round number is greater than or equal to the provided value.
 *
 * @param playerId The ID of the player.
 * @param eventId The ID of the rush event.
 * @param battleType The type of rush event battle.
 * @param untilRound Delete parties until this round.
 */
function deletePlayerRushEventPlayedPartiesUntilSync(playerId, eventId, battleType, untilRound) {
    (0, db_1.getDb)().prepare(`
    DELETE FROM players_rush_events_played_parties
    WHERE player_id = ? AND event_id = ? AND battle_type = ?
        AND round >= ?
    `).run(playerId, eventId, battleType, untilRound);
}
exports.deletePlayerRushEventPlayedPartiesUntilSync = deletePlayerRushEventPlayedPartiesUntilSync;
/**
 * Updates an existing rush event played party for a specific player & rush event.
 *
 * @param playerId The player's ID.
 * @param eventId The ID of the rush event.
 * @param party The new party data.
 */
function updatePlayerRushEventPlayedPartySync(playerId, eventId, party) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t;
    (0, db_1.getDb)().prepare(`
    UPDATE players_rush_events_played_parties
    SET character_id_1 = ?,
        character_id_2 = ?,
        character_id_3 = ?,
        unison_character_id_1 = ?,
        unison_character_id_2 = ?,
        unison_character_id_3 = ?,
        equipment_id_1 = ?,
        equipment_id_2 = ?,
        equipment_id_3 = ?,
        ability_soul_id_1 = ?,
        ability_soul_id_2 = ?,
        ability_soul_id_3 = ?,
        evolution_img_level_1 = ?,
        evolution_img_level_2 = ?,
        evolution_img_level_3 = ?,
        unison_evolution_img_level_1 = ?,
        unison_evolution_img_level_2 = ?,
        unison_evolution_img_level_3 = ?,
    WHERE player_id = ? AND event_id = ? AND round = ? AND battle_type = ?
    `).run((_a = party.characterIds[0]) !== null && _a !== void 0 ? _a : null, (_b = party.characterIds[1]) !== null && _b !== void 0 ? _b : null, (_c = party.characterIds[2]) !== null && _c !== void 0 ? _c : null, (_d = party.unisonCharacterIds[0]) !== null && _d !== void 0 ? _d : null, (_e = party.unisonCharacterIds[1]) !== null && _e !== void 0 ? _e : null, (_f = party.unisonCharacterIds[2]) !== null && _f !== void 0 ? _f : null, (_g = party.equipmentIds[0]) !== null && _g !== void 0 ? _g : null, (_h = party.equipmentIds[1]) !== null && _h !== void 0 ? _h : null, (_j = party.equipmentIds[2]) !== null && _j !== void 0 ? _j : null, (_k = party.abilitySoulIds[0]) !== null && _k !== void 0 ? _k : null, (_l = party.abilitySoulIds[1]) !== null && _l !== void 0 ? _l : null, (_m = party.abilitySoulIds[2]) !== null && _m !== void 0 ? _m : null, (_o = party.evolutionImgLevels[0]) !== null && _o !== void 0 ? _o : null, (_p = party.evolutionImgLevels[1]) !== null && _p !== void 0 ? _p : null, (_q = party.evolutionImgLevels[2]) !== null && _q !== void 0 ? _q : null, (_r = party.unisonEvolutionImgLevels[0]) !== null && _r !== void 0 ? _r : null, (_s = party.unisonEvolutionImgLevels[1]) !== null && _s !== void 0 ? _s : null, (_t = party.unisonEvolutionImgLevels[2]) !== null && _t !== void 0 ? _t : null, playerId, eventId, party.round, party.battleType);
}
exports.updatePlayerRushEventPlayedPartySync = updatePlayerRushEventPlayedPartySync;
/**
 * Synchronously gets the first player bound to an account.
 */
