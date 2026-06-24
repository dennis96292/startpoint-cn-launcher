"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.givePlayerRewardSync = exports.givePlayerRewardsSync = exports.givePlayerScoreRewardsSync = void 0;
const crypto_1 = require("crypto");
const wdfpData_1 = require("../data/wdfpData");
const assets_1 = require("./assets");
const character_1 = require("./character");
const equipment_1 = require("./equipment");
const types_1 = require("./types");
const reward_element_map_json_1 = __importDefault(require("../../assets/reward_element_map.json"));
const ELEMENT_TO_ENEMY_MAP = {
    0: 3, 1: 0, 2: 1, 3: 2, 4: 5, 5: 4,
};
function resolveElementItemId(rarity, questElement) {
    var _a;
    const enemyElement = (_a = ELEMENT_TO_ENEMY_MAP[questElement !== null && questElement !== void 0 ? questElement : 0]) !== null && _a !== void 0 ? _a : 3;
    const map = reward_element_map_json_1.default;
    return Number(map["1"][String(rarity)][String(enemyElement)][0][0]);
}
function resolveAetherItemId(rarity, questElement) {
    var _a;
    const enemyElement = (_a = ELEMENT_TO_ENEMY_MAP[questElement !== null && questElement !== void 0 ? questElement : 0]) !== null && _a !== void 0 ? _a : 3;
    const map = reward_element_map_json_1.default;
    return Number(map["2"][String(rarity)][String(enemyElement)][0][0]);
}
/**
 * Grants a player score rewards.
 *
 * @param playerId The ID of the player.
 * @param groupId The ID of the score reward group.
 * @param scoreRewards The score rewards inside of the group.
 * @returns A result detailing what was added/changed.
 */
function givePlayerScoreRewardsSync(playerId, groupId, scoreRewards, boostPointUsed = false, questElement) {
    var _a, _b;
    const dropScoreRewardIds = [];
    const dropRareRewardIds = [];
    let mana = 0;
    let vmoney = 0;
    let expPool = 0;
    let joinedCharacterIdList = [];
    let characterList = [];
    let equipmentList = [];
    let items = {};
    if (scoreRewards != null && groupId != null) {
        const dropMultiplier = parseFloat(process.env.DROP_MULTIPLIER || '1');
        console.log(`[QUEST] givePlayerScoreRewards group=${groupId} items=${scoreRewards.length} pid=${playerId}`);
        let seqIndex = 0;
        for (const scoreReward of scoreRewards) {
            seqIndex += 1;
            const rewardIndex = (_a = scoreReward.position) !== null && _a !== void 0 ? _a : seqIndex;
            switch (scoreReward.type) {
                case types_1.ScoreRewardType.ITEM: {
                    const reward = scoreReward;
                    let rewardAmount = 0;
                    switch (reward.reward_type) {
                        case types_1.RewardType.ITEM: {
                            const itemReward = reward;
                            const itemId = itemReward.id;
                            rewardAmount = itemReward.count * dropMultiplier * (boostPointUsed ? 2 : 1);
                            items[String(itemId)] = (0, wdfpData_1.givePlayerItemSync)(playerId, itemId, rewardAmount);
                            break;
                        }
                        case types_1.RewardType.MANA: {
                            const player = (0, wdfpData_1.getPlayerSync)(playerId);
                            const currencyReward = reward;
                            rewardAmount = currencyReward.count * dropMultiplier * (boostPointUsed ? 2 : 1);
                            mana += rewardAmount;
                            (0, wdfpData_1.updatePlayerSync)({
                                id: playerId,
                                freeMana: ((player === null || player === void 0 ? void 0 : player.freeMana) || 0) + rewardAmount
                            });
                            break;
                        }
                        case types_1.RewardType.EXP: {
                            const player = (0, wdfpData_1.getPlayerSync)(playerId);
                            const currencyReward = reward;
                            rewardAmount = currencyReward.count * dropMultiplier * (boostPointUsed ? 2 : 1);
                            expPool += rewardAmount;
                            (0, wdfpData_1.updatePlayerSync)({
                                id: playerId,
                                expPool: ((player === null || player === void 0 ? void 0 : player.expPool) || 0) + rewardAmount
                            });
                            break;
                        }
                        case types_1.RewardType.ELEMENT: {
                            const itemReward = reward;
                            const itemId = resolveElementItemId(itemReward.id, questElement);
                            rewardAmount = itemReward.count * dropMultiplier * (boostPointUsed ? 2 : 1);
                            items[String(itemId)] = (0, wdfpData_1.givePlayerItemSync)(playerId, itemId, rewardAmount);
                            break;
                        }
                        case types_1.RewardType.AETHER: {
                            const itemReward = reward;
                            const itemId = resolveAetherItemId(itemReward.id, questElement);
                            rewardAmount = itemReward.count * dropMultiplier * (boostPointUsed ? 2 : 1);
                            items[String(itemId)] = (0, wdfpData_1.givePlayerItemSync)(playerId, itemId, rewardAmount);
                            break;
                        }
                    }
                    dropScoreRewardIds.push({
                        group_id: groupId,
                        index: rewardIndex,
                        number: rewardAmount
                    });
                    break;
                }
                case types_1.ScoreRewardType.RARE_POOL: {
                    const reward = scoreReward;
                    const roll = (0, crypto_1.randomInt)(0, 100) / 100;
                    if (reward.rarity >= roll) {
                        // give reward from group
                        // TODO: implement RareScoreReward rarity using .rarity field instead of having an even chance between all items in pool
                        const rareGroupId = reward.id;
                        const group = (0, assets_1.getRareScoreRewardGroup)(rareGroupId);
                        console.log(`[QUEST] RARE_POOL rareGroup=${rareGroupId} found=${group !== null} items=${(_b = group === null || group === void 0 ? void 0 : group.length) !== null && _b !== void 0 ? _b : 0}`);
                        if (group !== null) {
                            const random_index = 1 >= group.length ? 0 : (0, crypto_1.randomInt)(group.length);
                            const reward = group[random_index];
                            const result = givePlayerRewardSync(playerId, reward);
                            if (result) {
                                // merge arrays
                                mana += result.user_info.free_mana;
                                vmoney += result.user_info.free_vmoney;
                                joinedCharacterIdList = [...joinedCharacterIdList, ...result.joined_character_id_list];
                                characterList = [...characterList, ...result.character_list];
                                equipmentList = [...equipmentList, ...result.equipment_list];
                                // merge items
                                for (const [itemId, count] of Object.entries(result.items)) {
                                    const existingCount = items[itemId];
                                    if (existingCount === undefined) {
                                        items[itemId] = count;
                                    }
                                    else {
                                        items[itemId] = existingCount + count;
                                    }
                                }
                                // calculate number
                                let number = 0;
                                switch (reward.type) {
                                    case types_1.RewardType.ITEM:
                                    case types_1.RewardType.EQUIPMENT:
                                    case types_1.RewardType.ELEMENT:
                                    case types_1.RewardType.AETHER:
                                        number = reward.count;
                                        break;
                                    case types_1.RewardType.CHARACTER:
                                        number = 1;
                                        break;
                                    case types_1.RewardType.BEADS:
                                    case types_1.RewardType.EXP:
                                    case types_1.RewardType.MANA:
                                        number = reward.count;
                                        break;
                                }
                                // add reward id to table
                                dropRareRewardIds.push({
                                    group_id: rareGroupId,
                                    index: random_index + 1,
                                    number: number
                                });
                            }
                        }
                    }
                    break;
                }
            }
        }
    }
    return {
        drop_score_reward_ids: dropScoreRewardIds,
        drop_rare_reward_ids: dropRareRewardIds,
        user_info: {
            free_mana: mana,
            free_vmoney: vmoney,
            exp_pool: expPool
        },
        character_list: characterList,
        joined_character_id_list: joinedCharacterIdList,
        equipment_list: equipmentList,
        items: items
    };
}
exports.givePlayerScoreRewardsSync = givePlayerScoreRewardsSync;
/**
 * Batch gives a specific player data an array of rewards.
 *
 * @param playerId The ID of the player to reward.
 * @param rewards The array of rewards to give.
 * @returns A PlayerRewardResult.
 */
function givePlayerRewardsSync(playerId, rewards) {
    var _a, _b, _c;
    let mana = 0;
    let vmoney = 0;
    let expPool = 0;
    let joinedCharacterIdList = [];
    let characters = new Map();
    let equipment = new Map();
    let items = new Map();
    for (const reward of rewards) {
        switch (reward.type) {
            case types_1.RewardType.ITEM: {
                const convertedReward = reward;
                const itemId = convertedReward.id;
                const result = (0, wdfpData_1.givePlayerItemSync)(playerId, itemId, convertedReward.count);
                items.set(itemId, ((_a = items.get(itemId)) !== null && _a !== void 0 ? _a : 0) + result);
                break;
            }
            case types_1.RewardType.EQUIPMENT: {
                const convertedReward = reward;
                const equipmentId = convertedReward.id;
                const result = (0, equipment_1.givePlayerEquipmentSync)(playerId, equipmentId, convertedReward.count);
                equipment.set(equipmentId, result);
                break;
            }
            case types_1.RewardType.CHARACTER: {
                const characterId = reward.id;
                const giveResult = (0, character_1.givePlayerCharacterSync)(playerId, characterId);
                const giveItem = giveResult === null || giveResult === void 0 ? void 0 : giveResult.item;
                if (giveItem !== undefined) {
                    const itemId = giveItem.id;
                    items.set(itemId, ((_b = items.get(itemId)) !== null && _b !== void 0 ? _b : 0) + giveItem.count);
                }
                const giveCharacter = giveResult === null || giveResult === void 0 ? void 0 : giveResult.character;
                if (giveCharacter !== undefined) {
                    characters.set(characterId, giveCharacter);
                }
                break;
            }
            case types_1.RewardType.BEADS: {
                vmoney += reward.count;
                break;
            }
            case types_1.RewardType.MANA: {
                mana += reward.count;
                break;
            }
            case types_1.RewardType.EXP: {
                expPool += reward.count;
                break;
            }
            case types_1.RewardType.ELEMENT:
            case types_1.RewardType.AETHER: {
                const convertedReward = reward;
                const itemId = convertedReward.id;
                const result = (0, wdfpData_1.givePlayerItemSync)(playerId, itemId, convertedReward.count);
                items.set(itemId, ((_c = items.get(itemId)) !== null && _c !== void 0 ? _c : 0) + result);
                break;
            }
        }
    }
    if (mana > 0 || vmoney > 0 || expPool > 0) {
        // get player
        const player = (0, wdfpData_1.getPlayerSync)(playerId);
        if (player === null)
            return null;
        (0, wdfpData_1.updatePlayerSync)({
            id: playerId,
            freeVmoney: player.freeVmoney + vmoney,
            freeMana: player.freeMana + mana,
            expPool: player.expPool + expPool
        });
    }
    // build return values
    const characterList = [];
    const equipmentList = [];
    const itemsRecord = {};
    characters.forEach(character => {
        characterList.push(character);
    });
    equipment.forEach(equipment => {
        equipmentList.push(equipment);
    });
    items.forEach((number, id) => {
        itemsRecord[id] = number;
    });
    return {
        user_info: {
            free_mana: mana,
            free_vmoney: vmoney,
            exp_pool: expPool
        },
        character_list: characterList,
        joined_character_id_list: joinedCharacterIdList,
        equipment_list: equipmentList,
        items: itemsRecord
    };
}
exports.givePlayerRewardsSync = givePlayerRewardsSync;
/**
 * Gives a player a specific reward.
 *
 * @param playerId The ID of the player.
 * @param reward The reward to give.
 * @returns A PlayerRewardResult.
 */
function givePlayerRewardSync(playerId, reward) {
    return givePlayerRewardsSync(playerId, [reward]);
}
exports.givePlayerRewardSync = givePlayerRewardSync;
