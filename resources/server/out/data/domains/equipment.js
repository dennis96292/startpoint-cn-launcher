"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deletePlayerEquipmentSync = exports.updatePlayerEquipmentSync = exports.insertPlayerEquipmentListSync = exports.insertPlayerEquipmentSync = exports.playerOwnsEquipmentSync = exports.getPlayerEquipmentSync = exports.getPlayerEquipmentListSync = void 0;
const db_1 = require("../db");
const utils_1 = require("../utils");
/**
 * Converts a RawPlayerEquipment object into a PlayerEquipment object.
 */
function buildPlayerEquipment(rawEquipment) {
    return {
        level: rawEquipment.level,
        enhancementLevel: rawEquipment.enhancement_level,
        protection: (0, utils_1.deserializeBoolean)(rawEquipment.protection),
        stack: rawEquipment.stack,
    };
}
function getPlayerEquipmentListSync(playerId) {
    const db = (0, db_1.getDb)();
    const rawEquipment = db.prepare(`
    SELECT id, level, enhancement_level, protection, stack
    FROM players_equipment
    WHERE player_id = ?
    `).all(playerId);
    const final = {};
    for (const raw of rawEquipment) {
        final[raw.id.toString()] = buildPlayerEquipment(raw);
    }
    return final;
}
exports.getPlayerEquipmentListSync = getPlayerEquipmentListSync;
function getPlayerEquipmentSync(playerId, equipmentId) {
    const db = (0, db_1.getDb)();
    const rawEquipment = db.prepare(`
    SELECT id, level, enhancement_level, protection, stack
    FROM players_equipment
    WHERE player_id = ? AND id = ?
    `).get(playerId, Number(equipmentId));
    return rawEquipment === undefined ? null : buildPlayerEquipment(rawEquipment);
}
exports.getPlayerEquipmentSync = getPlayerEquipmentSync;
function playerOwnsEquipmentSync(playerId, equipmentId) {
    const db = (0, db_1.getDb)();
    return db.prepare(`
    SELECT id FROM players_equipment
    WHERE id = ? AND player_id = ?
    `).get(equipmentId, playerId) !== undefined;
}
exports.playerOwnsEquipmentSync = playerOwnsEquipmentSync;
function insertPlayerEquipmentSync(playerId, equipmentId, equipment) {
    const db = (0, db_1.getDb)();
    db.prepare(`
    INSERT INTO players_equipment (id, level, enhancement_level, protection, stack, player_id)
    VALUES (?, ?, ?, ?, ?, ?)
    `).run(Number(equipmentId), equipment.level, equipment.enhancementLevel, (0, utils_1.serializeBoolean)(equipment.protection), equipment.stack, playerId);
}
exports.insertPlayerEquipmentSync = insertPlayerEquipmentSync;
function insertPlayerEquipmentListSync(playerId, equipment) {
    const db = (0, db_1.getDb)();
    db.transaction(() => {
        for (const [equipmentId, data] of Object.entries(equipment)) {
            insertPlayerEquipmentSync(playerId, equipmentId, data);
        }
    })();
}
exports.insertPlayerEquipmentListSync = insertPlayerEquipmentListSync;
function updatePlayerEquipmentSync(playerId, equipmentId, equipment) {
    const db = (0, db_1.getDb)();
    const fieldMap = { 'level': 'level', 'enhancementLevel': 'enhancement_level', 'protection': 'protection', 'stack': 'stack' };
    const sets = [];
    const values = [];
    for (const key in equipment) {
        const value = equipment[key];
        const mapped = fieldMap[key];
        if (mapped && value !== undefined) {
            sets.push(`${mapped} = ?`);
            values.push(typeof value === "boolean" ? (0, utils_1.serializeBoolean)(value) : value);
        }
    }
    if (sets.length > 0)
        db.prepare(`
        UPDATE players_equipment SET ${sets.join(', ')} WHERE id = ? AND player_id = ?
    `).run([...values, Number(equipmentId), playerId]);
}
exports.updatePlayerEquipmentSync = updatePlayerEquipmentSync;
function deletePlayerEquipmentSync(playerId, equipmentId) {
    const db = (0, db_1.getDb)();
    db.prepare(`
    DELETE FROM players_equipment WHERE id = ? AND player_id = ?
    `).run(Number(equipmentId), playerId);
}
exports.deletePlayerEquipmentSync = deletePlayerEquipmentSync;
