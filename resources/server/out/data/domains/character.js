"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.insertPlayerCharactersManaNodesSync = exports.insertPlayerCharacterManaNodesSync = exports.hasPlayerUnlockedCharacterManaNodeSync = exports.getPlayerCharacterManaNodesSync = exports.getPlayerCharactersManaNodesSync = exports.updatePlayerCharacterSync = exports.insertPlayerCharactersSync = exports.insertDefaultPlayerCharacterSync = exports.insertPlayerCharacterSync = exports.updatePlayerCharacterBondTokenSync = exports.insertPlayerCharacterBondTokenSync = exports.getPlayerCharactersSync = exports.getPlayerCharacterSync = exports.playerOwnsCharacterSync = void 0;
const db_1 = require("../db");
const utils_1 = require("../utils");
const assets_1 = require("../../lib/assets");
/**
 * Converts a RawPlayerCharacterBondToken into a PlayerCharacterBondToken
 *
 * @param rawBondToken The raw bond token to build/deserialize
 * @returns The built/deserialized PlayerCharacterBondToken
 */
function buildCharacterBondToken(rawBondToken) {
    return {
        manaBoardIndex: rawBondToken.mana_board_index,
        status: rawBondToken.status
    };
}
/**
 * Builds a PlayerCharacterExBoost object.
 *
 * @param exBoostStatusId The ex boost's status ID
 * @param exBoostAbilityIdList The serialized string representing the ex boost's ability id list.
 * @returns A PlayerCharacterExBoost object or undefined.
 */
function buildPlayerCharacterExBoost(exBoostStatusId, exBoostAbilityIdList) {
    if (exBoostStatusId === null || exBoostAbilityIdList === null)
        return undefined;
    return {
        statusId: exBoostStatusId,
        abilityIdList: (0, utils_1.deserializeNumberList)(exBoostAbilityIdList)
    };
}
/**
 * Converts a RawPlayerCharacter into a PlayerCharacter
 *
 * @param rawCharacter The RawPlayerCharacter to convert.
 * @param bondTokens The character's bond tokens
 * @returns The converted PlayerCharacter
 */
function buildPlayerCharacter(rawCharacter, bondTokens) {
    return {
        entryCount: rawCharacter.entry_count,
        evolutionLevel: rawCharacter.evolution_level,
        overLimitStep: rawCharacter.over_limit_step,
        protection: (0, utils_1.deserializeBoolean)(rawCharacter.protection),
        joinTime: new Date(rawCharacter.join_time),
        updateTime: new Date(rawCharacter.update_time),
        exp: rawCharacter.exp,
        stack: rawCharacter.stack,
        manaBoardIndex: rawCharacter.mana_board_index,
        exBoost: buildPlayerCharacterExBoost(rawCharacter.ex_boost_status_id, rawCharacter.ex_boost_ability_id_list),
        illustrationSettings: rawCharacter.illustration_settings === null ? undefined : (0, utils_1.deserializeNumberList)(rawCharacter.illustration_settings),
        bondTokenList: bondTokens
    };
}
/**
 * Checks whether a player owns a given character or not.
 *
 * @param playerId The ID of the player.
 * @param characterId The ID of the character.
 * @returns A boolean, stating whether the player owns the character.
 */
function playerOwnsCharacterSync(playerId, characterId) {
    return (0, db_1.getDb)().prepare(`
    SELECT id
    FROM players_characters
    WHERE player_id = ? AND id = ?
    `).get(playerId, characterId) !== undefined;
}
exports.playerOwnsCharacterSync = playerOwnsCharacterSync;
/**
 * Gets a singular character from a player's data.
 *
 * @param playerId The ID of the player.
 * @param characterId The ID of the character.
 * @returns The PlayerCharacter or null if it doesn't exist.
 */
function getPlayerCharacterSync(playerId, characterId) {
    const rawCharacter = (0, db_1.getDb)().prepare(`
    SELECT id, entry_count, evolution_level, over_limit_step, protection,
        join_time, update_time, exp, stack, mana_board_index, ex_boost_status_id,
        ex_boost_ability_id_list, illustration_settings
    FROM players_characters
    WHERE player_id = ? AND id = ?
    `).get(playerId, characterId);
    if (rawCharacter === undefined)
        return null;
    // get bond tokens
    const rawBondTokens = (0, db_1.getDb)().prepare(`
    SELECT mana_board_index, status, character_id
    FROM players_characters_bond_tokens
    WHERE player_id = ? AND character_id = ?
    `).all(playerId, characterId);
    return buildPlayerCharacter(rawCharacter, rawBondTokens.map(raw => buildCharacterBondToken(raw)));
}
exports.getPlayerCharacterSync = getPlayerCharacterSync;
/**
 * Gets a list of all of the characters that a player owns.
 *
 * @param playerId The ID of the player.
 * @returns A list of the characters that the player owns.
 */
function getPlayerCharactersSync(playerId) {
    const rawCharacters = (0, db_1.getDb)().prepare(`
    SELECT id, entry_count, evolution_level, over_limit_step, protection,
        join_time, update_time, exp, stack, mana_board_index, ex_boost_status_id,
        ex_boost_ability_id_list, illustration_settings
    FROM players_characters
    WHERE player_id = ?
    `).all(playerId);
    // get bond tokens
    const rawBondTokens = (0, db_1.getDb)().prepare(`
    SELECT mana_board_index, status, character_id
    FROM players_characters_bond_tokens
    WHERE player_id = ?
    `).all(playerId);
    const bondBuckets = {};
    for (const rawBondToken of rawBondTokens) {
        const characterId = rawBondToken.character_id.toString();
        let bucket = bondBuckets[characterId];
        if (!bucket) {
            bucket = [];
            bondBuckets[characterId] = bucket;
        }
        bucket.push(buildCharacterBondToken(rawBondToken));
    }
    const out = {};
    for (const rawCharacter of rawCharacters) {
        const id = rawCharacter.id.toString();
        out[id] = buildPlayerCharacter(rawCharacter, bondBuckets[id] || []);
    }
    return out;
}
exports.getPlayerCharactersSync = getPlayerCharactersSync;
/**
 * Inserts a single character's bond token into a player's data.
 *
 * @param playerId The ID of the player.
 * @param characterId The ID of the character.
 * @param bondToken The bond token to insert.
 */
function insertPlayerCharacterBondTokenSync(playerId, characterId, bondToken) {
    (0, db_1.getDb)().prepare(`
    INSERT INTO players_characters_bond_tokens (mana_board_index, status, player_id, character_id)
    VALUES (?, ?, ?, ?)
    `).run(bondToken.manaBoardIndex, bondToken.status, playerId, Number(characterId));
}
exports.insertPlayerCharacterBondTokenSync = insertPlayerCharacterBondTokenSync;
/**
 * Updates a player's character's bond token.
 *
 * @param playerId The ID of the player.
 * @param characterId The ID of the character.
 * @param bondToken The updated bondToken.
 */
function updatePlayerCharacterBondTokenSync(playerId, characterId, bondToken) {
    (0, db_1.getDb)().prepare(`
    UPDATE players_characters_bond_tokens
    SET status = ?
    WHERE player_id = ? AND character_id = ? AND mana_board_index = ?
    `).run(bondToken.status, playerId, Number(characterId), bondToken.manaBoardIndex);
}
exports.updatePlayerCharacterBondTokenSync = updatePlayerCharacterBondTokenSync;
/**
 * Inserts a single character into a player's inventory.
 *
 * @param playerId The ID of the player to add the character to.
 * @param characterId The ID of the character to add.
 * @param character The character data.
 */
function insertPlayerCharacterSync(playerId, characterId, character) {
    var _a, _b;
    // insert into characters table
    (0, db_1.getDb)().prepare(`
    INSERT INTO players_characters (id, entry_count, evolution_level, over_limit_step, 
        protection, join_time, update_time, exp, stack, mana_board_index, player_id,
        ex_boost_status_id, ex_boost_ability_id_list, illustration_settings)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(Number(characterId), character.entryCount, character.evolutionLevel, character.overLimitStep, (0, utils_1.serializeBoolean)(character.protection), character.joinTime.toISOString(), character.updateTime.toISOString(), character.exp, character.stack, character.manaBoardIndex, playerId, ((_a = character.exBoost) === null || _a === void 0 ? void 0 : _a.statusId) === undefined ? null : character.exBoost.statusId, ((_b = character.exBoost) === null || _b === void 0 ? void 0 : _b.abilityIdList) === undefined ? null : (0, utils_1.serializeNumberList)(character.exBoost.abilityIdList), character.illustrationSettings === undefined ? null : (0, utils_1.serializeNumberList)(character.illustrationSettings));
    // insert mana board nodes
    for (const token of character.bondTokenList) {
        insertPlayerCharacterBondTokenSync(playerId, characterId, token);
    }
}
exports.insertPlayerCharacterSync = insertPlayerCharacterSync;
/**
 * Inserts a default single character into a player's inventory.
 *
 * @param playerId The ID of the player to add the character to.
 * @param characterId The ID of the character to add.
 */
function insertDefaultPlayerCharacterSync(playerId, characterId) {
    const dateNow = new Date();
    const bondTokenList = [
        {
            manaBoardIndex: 1,
            status: 0
        }
    ];
    const assetData = (0, assets_1.getCharacterDataSync)(characterId);
    if (assetData && assetData.skill_count > 3) {
        bondTokenList.push({
            manaBoardIndex: 2,
            status: 0
        });
    }
    insertPlayerCharacterSync(playerId, characterId, {
        entryCount: 1,
        evolutionLevel: 0,
        overLimitStep: 0,
        protection: false,
        joinTime: dateNow,
        updateTime: dateNow,
        exp: 0,
        stack: 0,
        manaBoardIndex: 1,
        bondTokenList: bondTokenList
    });
}
exports.insertDefaultPlayerCharacterSync = insertDefaultPlayerCharacterSync;
/**
 * Batch inserts a record of characters into a player's inventory.
 *
 * @param playerId The ID of the player.
 * @param characters The record of characters to insert.
 */
function insertPlayerCharactersSync(playerId, characters) {
    (0, db_1.getDb)().transaction(() => {
        for (const [characterId, data] of Object.entries(characters)) {
            insertPlayerCharacterSync(playerId, characterId, data);
        }
    })();
}
exports.insertPlayerCharactersSync = insertPlayerCharactersSync;
/**
 * Updates a single character within a player's data.
 *
 * @param playerId The ID of the player.
 * @param characterId The ID of the character.
 * @param character The partial data of the character to update.
 */
function updatePlayerCharacterSync(playerId, characterId, character) {
    const fieldMap = {
        'entryCount': 'entry_count',
        'evolutionLevel': 'evolution_level',
        'overLimitStep': 'over_limit_step',
        'protection': 'protection',
        'joinTime': 'join_time',
        'updateTime': 'update_time',
        'exp': 'exp',
        'stack': 'stack',
        'manaBoardIndex': 'mana_board_index'
    };
    // set the update time to now
    character.updateTime = new Date();
    const sets = [];
    const values = [];
    for (const key in character) {
        const value = character[key];
        const mapped = fieldMap[key];
        if (mapped && value !== undefined) {
            sets.push(`${mapped} = ?`);
            if (value instanceof Date) {
                values.push(value.toISOString());
            }
            else if (typeof (value) === "boolean") {
                values.push((0, utils_1.serializeBoolean)(value));
            }
            else {
                values.push(value);
            }
        }
    }
    const exBoost = character.exBoost;
    if (exBoost !== undefined) {
        sets.push('ex_boost_status_id = ?');
        sets.push('ex_boost_ability_id_list = ?');
        values.push(exBoost.statusId);
        values.push((0, utils_1.serializeNumberList)(exBoost.abilityIdList));
    }
    const illustration_settings = character.illustrationSettings;
    if (illustration_settings !== undefined) {
        sets.push('illustration_settings = ?');
        values.push((0, utils_1.serializeNumberList)(illustration_settings));
    }
    if (sets.length > 0)
        (0, db_1.getDb)().prepare(`
        UPDATE players_characters
        SET ${sets.join(', ')}
        WHERE id = ? AND player_id = ?
        `).run([...values, characterId, playerId]);
}
exports.updatePlayerCharacterSync = updatePlayerCharacterSync;
/**
 * Retrieves the mana node statuses of a player's characters.
 *
 * @param playerId The ID of the player.
 * @returns A record containing the statuses of the player's characters.
 */
function getPlayerCharactersManaNodesSync(playerId) {
    const rawNodes = (0, db_1.getDb)().prepare(`
    SELECT value, character_id
    FROM players_characters_mana_nodes
    WHERE player_id = ?
    `).all(playerId);
    const buckets = {};
    for (const rawNode of rawNodes) {
        const characterId = rawNode.character_id.toString();
        let bucket = buckets[characterId];
        if (!bucket) {
            bucket = [];
            buckets[characterId] = bucket;
        }
        bucket.push(rawNode.value);
    }
    return buckets;
}
exports.getPlayerCharactersManaNodesSync = getPlayerCharactersManaNodesSync;
/**
 * Gets all of the mana nodes that a player has unlocked for a specific character.
 *
 * @param playerId The ID of the player.
 * @param characterId The ID of the character.
 * @returns A list of unlocked mana node ids.
 */
function getPlayerCharacterManaNodesSync(playerId, characterId) {
    const rawNodes = (0, db_1.getDb)().prepare(`
    SELECT value, character_id
    FROM players_characters_mana_nodes
    WHERE character_id = ? AND player_id = ?
    `).all(characterId, playerId);
    return rawNodes.map(rawNode => rawNode.value);
}
exports.getPlayerCharacterManaNodesSync = getPlayerCharacterManaNodesSync;
/**
 * Checks whether a player has unlocked a specific mana node.
 *
 * @param playerId The ID of the player to check.
 * @param characterId The ID of the character.
 * @param manaNodeId The ID of the mana node.
 * @returns Whether the specified mana node has been unlocked or not.
 */
function hasPlayerUnlockedCharacterManaNodeSync(playerId, characterId, manaNodeId) {
    return (0, db_1.getDb)().prepare(`
    SELECT value
    FROM players_characters_mana_nodes
    WHERE player_id = ? AND character_id = ? AND value = ?
    `).get(playerId, characterId, Number(manaNodeId)) !== undefined;
}
exports.hasPlayerUnlockedCharacterManaNodeSync = hasPlayerUnlockedCharacterManaNodeSync;
/**
 * Inserts mana nodes for a particular character into the database.
 *
 * @param playerId The ID of the player.
 * @param characterId The ID of the character to insert the mana nodes of.
 * @param manaNodes The mana nodes values to insert.
 */
function insertPlayerCharacterManaNodesSync(playerId, characterId, manaNodes) {
    for (const node of manaNodes) {
        (0, db_1.getDb)().prepare(`
        INSERT INTO players_characters_mana_nodes (value, character_id, player_id)
        VALUES (?, ?, ?)
        `).run(node, Number(characterId), playerId);
    }
}
exports.insertPlayerCharacterManaNodesSync = insertPlayerCharacterManaNodesSync;
/**
 * Batch inserts a record of characters' mana nodes into the database.
 *
 * @param playerId The ID of the player.
 * @param charactersManaNodes The record of character mana node values.
 */
function insertPlayerCharactersManaNodesSync(playerId, charactersManaNodes) {
    (0, db_1.getDb)().transaction(() => {
        for (const [characterId, manaNodes] of Object.entries(charactersManaNodes)) {
            insertPlayerCharacterManaNodesSync(playerId, characterId, manaNodes);
        }
    })();
}
exports.insertPlayerCharactersManaNodesSync = insertPlayerCharactersManaNodesSync;
