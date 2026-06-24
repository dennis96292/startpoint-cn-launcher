"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.givePlayerEquipmentSync = exports.clientSerializeEquipment = void 0;
const wdfpData_1 = require("../data/wdfpData");
/**
 * Serializes a PlayerEquipment object for sending to the game client.
 *
 * @param equipmentId The ID of the equipment to serialize.
 * @param toSerialize The data of the equipment to serialize.
 * @returns A serialized equipment object for returning to the game client.
 */
function clientSerializeEquipment(equipmentId, toSerialize) {
    return {
        "null": 1,
        "viewer_id": 0,
        "equipment_id": equipmentId,
        "protection": toSerialize.protection,
        "level": toSerialize.level,
        "enhancement_level": toSerialize.enhancementLevel,
        "stack": toSerialize.stack
    };
}
exports.clientSerializeEquipment = clientSerializeEquipment;
/**
 * Gives a player an amount of equipment.
 *
 * @param playerId The ID of the player to give the equipment to.
 * @param equipmentId The ID of the equipment to give.
 * @param amount The amount of equipment to give.
 * @returns A serialized equipment object for returning to the game client.
 */
function givePlayerEquipmentSync(playerId, equipmentId, amount) {
    amount = Math.abs(amount); // ensure that amount isn't negative.
    let owned = (0, wdfpData_1.getPlayerEquipmentSync)(playerId, equipmentId);
    if (owned === null) {
        // insert into inventory since it's not owned.
        owned = {
            enhancementLevel: 0,
            level: 1,
            protection: false,
            stack: amount - 1
        };
        (0, wdfpData_1.insertPlayerEquipmentSync)(playerId, equipmentId, owned);
    }
    else {
        // simply increase the stack
        const newStack = owned.stack + amount;
        (0, wdfpData_1.updatePlayerEquipmentSync)(playerId, equipmentId, {
            stack: newStack
        });
        owned.stack = newStack;
    }
    return clientSerializeEquipment(equipmentId, owned);
}
exports.givePlayerEquipmentSync = givePlayerEquipmentSync;
