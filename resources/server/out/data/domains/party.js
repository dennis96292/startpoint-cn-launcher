"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updatePlayerPartyGroupSync = exports.updatePlayerPartySync = exports.insertPlayerPartyGroupListSync = exports.getPlayerPartyGroupListSync = void 0;
const db_1 = require("../db");
const types_1 = require("../types");
const utils_1 = require("../utils");
function getPlayerPartyGroupListSync(playerId, category = types_1.PartyCategory.NORMAL) {
    var _a, _b;
    const db = (0, db_1.getDb)();
    const rawPartyGroups = db.prepare(`
    SELECT id, color_id, category
    FROM players_party_groups
    WHERE player_id = ? AND category = ?
    `).all(playerId, category);
    const rawParties = db.prepare(`
    SELECT slot, name, character_id_1, character_id_2, character_id_3, unison_character_1,
        unison_character_2, unison_character_3, equipment_1, equipment_2, equipment_3,
        ability_soul_1, ability_soul_2, ability_soul_3, edited, group_id, category,
        current_battle_power, before_battle_power
    FROM players_parties
    WHERE player_id = ? AND category = ?
    `).all(playerId, category);
    const groupLists = {};
    for (const rawParty of rawParties) {
        const groupId = rawParty.group_id.toString();
        let bucket = groupLists[groupId];
        if (!bucket) {
            bucket = {};
            groupLists[groupId] = bucket;
        }
        bucket[rawParty.slot.toString()] = {
            name: rawParty.name,
            characterIds: [rawParty.character_id_1, rawParty.character_id_2, rawParty.character_id_3],
            unisonCharacterIds: [rawParty.unison_character_1, rawParty.unison_character_2, rawParty.unison_character_3],
            equipmentIds: [rawParty.equipment_1, rawParty.equipment_2, rawParty.equipment_3],
            abilitySoulIds: [rawParty.ability_soul_1, rawParty.ability_soul_2, rawParty.ability_soul_3],
            edited: (0, utils_1.deserializeBoolean)(rawParty.edited),
            options: {
                allowOtherPlayersToHealMe: true
            },
            category: rawParty.category,
            currentBattlePower: (_a = rawParty.current_battle_power) !== null && _a !== void 0 ? _a : 0,
            beforeBattlePower: (_b = rawParty.before_battle_power) !== null && _b !== void 0 ? _b : 0
        };
    }
    const final = {};
    for (const rawPartyGroup of rawPartyGroups) {
        const id = rawPartyGroup.id.toString();
        final[id] = {
            list: groupLists[id] || [],
            colorId: rawPartyGroup.color_id,
            category: rawPartyGroup.category
        };
    }
    // Log group summary
    console.log(`[PARTY-READ] player=${playerId} groups=${Object.keys(final).length} totalParties=${rawParties.length}`);
    return final;
}
exports.getPlayerPartyGroupListSync = getPlayerPartyGroupListSync;
function insertPlayerPartySync(playerId, slot, groupId, party) {
    var _a, _b;
    const db = (0, db_1.getDb)();
    db.prepare(`
    INSERT INTO players_parties (slot, name, character_id_1, character_id_2, character_id_3, 
        unison_character_1, unison_character_2, unison_character_3, equipment_1, equipment_2,
        equipment_3, ability_soul_1, ability_soul_2, ability_soul_3, edited, player_id, group_id, category,
        current_battle_power, before_battle_power)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(Number(slot), party.name, party.characterIds[0] || null, party.characterIds[1] || null, party.characterIds[2] || null, party.unisonCharacterIds[0] || null, party.unisonCharacterIds[1] || null, party.unisonCharacterIds[2] || null, party.equipmentIds[0] || null, party.equipmentIds[1] || null, party.equipmentIds[2] || null, party.abilitySoulIds[0] || null, party.abilitySoulIds[1] || null, party.abilitySoulIds[2] || null, (0, utils_1.serializeBoolean)(party.edited), playerId, Number(groupId), party.category, (_a = party.currentBattlePower) !== null && _a !== void 0 ? _a : 0, (_b = party.beforeBattlePower) !== null && _b !== void 0 ? _b : 0);
}
function insertPlayerPartyGroupSync(playerId, groupId, group) {
    const db = (0, db_1.getDb)();
    db.prepare(`
    INSERT INTO players_party_groups (id, color_id, player_id, category)
    VALUES (?, ?, ?, ?)
    `).run(Number(groupId), group.colorId, playerId, group.category);
    for (const [slot, party] of Object.entries(group.list)) {
        insertPlayerPartySync(playerId, slot, groupId, party);
    }
}
function insertPlayerPartyGroupListSync(playerId, groups) {
    const db = (0, db_1.getDb)();
    db.transaction(() => {
        for (const [groupId, group] of Object.entries(groups)) {
            insertPlayerPartyGroupSync(playerId, groupId, group);
        }
    })();
}
exports.insertPlayerPartyGroupListSync = insertPlayerPartyGroupListSync;
function updatePlayerPartySync(playerId, slot, party, groupId = 1) {
    var _a, _b;
    const db = (0, db_1.getDb)();
    // Upsert: try update first, insert if not exists
    const result = db.prepare(`
    UPDATE players_parties SET name = ?, character_id_1 = ?, character_id_2 = ?, character_id_3 = ?,
        unison_character_1 = ?, unison_character_2 = ?, unison_character_3 = ?,
        equipment_1 = ?, equipment_2 = ?, equipment_3 = ?,
        ability_soul_1 = ?, ability_soul_2 = ?, ability_soul_3 = ?, edited = ?,
        current_battle_power = ?, before_battle_power = ?
    WHERE slot = ? AND player_id = ? AND group_id = ? AND category = ?
    `).run(party.name, party.characterIds[0], party.characterIds[1], party.characterIds[2], party.unisonCharacterIds[0], party.unisonCharacterIds[1], party.unisonCharacterIds[2], party.equipmentIds[0], party.equipmentIds[1], party.equipmentIds[2], party.abilitySoulIds[0], party.abilitySoulIds[1], party.abilitySoulIds[2], (0, utils_1.serializeBoolean)(party.edited), (_a = party.currentBattlePower) !== null && _a !== void 0 ? _a : 0, (_b = party.beforeBattlePower) !== null && _b !== void 0 ? _b : 0, slot, playerId, groupId, party.category);
    if (result.changes === 0) {
        console.log(`[PARTY-DB] insert: player=${playerId} group=${groupId} slot=${slot} name="${party.name}" chars=${party.characterIds.filter(Boolean).length}`);
        // Ensure group exists
        const groupExists = db.prepare('SELECT id FROM players_party_groups WHERE id = ? AND player_id = ? AND category = ?').get(groupId, playerId, party.category);
        if (!groupExists) {
            console.log(`[PARTY-DB] new group: player=${playerId} id=${groupId}`);
            db.prepare('INSERT INTO players_party_groups (id, color_id, player_id, category) VALUES (?, ?, ?, ?)').run(groupId, 15, playerId, party.category);
        }
        insertPlayerPartySync(playerId, slot, groupId, party);
    }
    else {
        console.log(`[PARTY-DB] update: player=${playerId} group=${groupId} slot=${slot} name="${party.name}" chars=${party.characterIds.filter(Boolean).length}`);
    }
}
exports.updatePlayerPartySync = updatePlayerPartySync;
function updatePlayerPartyGroupSync(playerId, groupId, colorId, category = types_1.PartyCategory.NORMAL) {
    const db = (0, db_1.getDb)();
    db.prepare(`
    UPDATE players_party_groups SET color_id = ?
    WHERE id = ? AND player_id = ? AND category = ?
    `).run(colorId, groupId, playerId, category);
}
exports.updatePlayerPartyGroupSync = updatePlayerPartyGroupSync;
