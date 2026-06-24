"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCharactersEvolutionImgLevels = exports.givePlayerCharactersExpSync = exports.givePlayerCharacterSync = exports.characterExpCaps = void 0;
const utils_1 = require("../data/utils");
const wdfpData_1 = require("../data/wdfpData");
const assets_1 = require("./assets");
const types_1 = require("./types");
exports.characterExpCaps = {
    [1]: [
        11416, // level 40
        15820, // level 45
        21477, // level 50
        28538, // level 55
        37241, // level 60
        49481, // level 65
        66600, // level 70
        91180, // level 75
        125223, // level 80
        170928, // level 85
        216633, // level 90
        262338, // level 95
        308043, // level 100
    ],
    [2]: [
        21477, // level 50
        28538, // level 55
        37241, // level 60
        49481, // level 65
        66600, // level 70
        91180, // level 75
        125223, // level 80
        170928, // level 85
        216633, // level 90
        262338, // level 95
        308043, // level 100
    ],
    [3]: [
        37241, // level 60
        49481, // level 65
        66600, // level 70
        91180, // level 75
        125223, // level 80
        170928, // level 85
        216633, // level 90
        262338, // level 95
        308043 // level 100
    ],
    [4]: [
        76272, // level 70
        102829, // level 75
        139190, // level 80
        189995, // level 85
        240800, // level 90
        291605, // level 95
        342410 // level 100
    ],
    [5]: [
        153988, // level 80
        210488, // level 85
        266988, // level 90
        323488, // level 95
        379988, // level 100
    ],
};
const dupeItemRewards = {
    [3]: {
        [types_1.Element.FIRE]: 14001,
        [types_1.Element.WATER]: 14004,
        [types_1.Element.LIGHTNING]: 14007,
        [types_1.Element.WIND]: 14010,
        [types_1.Element.LIGHT]: 14016,
        [types_1.Element.DARK]: 14013
    },
    [4]: {
        [types_1.Element.FIRE]: 14002,
        [types_1.Element.WATER]: 14005,
        [types_1.Element.LIGHTNING]: 14008,
        [types_1.Element.WIND]: 14011,
        [types_1.Element.LIGHT]: 14017,
        [types_1.Element.DARK]: 14014
    },
    [5]: {
        [types_1.Element.FIRE]: 14003,
        [types_1.Element.WATER]: 14006,
        [types_1.Element.LIGHTNING]: 14009,
        [types_1.Element.WIND]: 14012,
        [types_1.Element.LIGHT]: 14018,
        [types_1.Element.DARK]: 14015
    }
};
/**
 * Rewards a player a character.
 *
 * @param playerId The ID of the player.
 * @param characterId The ID of the character to give.
 * @returns An items list, indicating what, if any, items were given to the player.
 */
function givePlayerCharacterSync(playerId, characterId) {
    // get the character's asset data
    const assetData = (0, assets_1.getCharacterDataSync)(characterId);
    if (assetData === null)
        return null;
    // get the current character data
    const playerCharacter = (0, wdfpData_1.getPlayerCharacterSync)(playerId, characterId);
    if (playerCharacter === null) {
        const bondTokenList = [
            {
                manaBoardIndex: 1,
                status: 0
            }
        ];
        // add the second bond token list item
        // if the character has more than 1 mana board
        if (assetData.skill_count > 3) {
            bondTokenList.push({
                manaBoardIndex: 2,
                status: 0
            });
        }
        // give the player the character
        const joinTime = new Date();
        (0, wdfpData_1.insertPlayerCharacterSync)(playerId, characterId, {
            entryCount: 1,
            evolutionLevel: 0,
            overLimitStep: 0,
            protection: false,
            joinTime: joinTime,
            updateTime: joinTime,
            exp: 0,
            stack: 0,
            manaBoardIndex: 1,
            bondTokenList: bondTokenList
        });
        const serializedDate = (0, utils_1.clientSerializeDate)(joinTime);
        return {
            character: {
                "viewer_id": 0,
                "character_id": characterId,
                "entry_count": 1,
                "exp": 0,
                "exp_total": 0,
                "bond_token_list": bondTokenList.map(bondToken => {
                    return {
                        "mana_board_index": bondToken.manaBoardIndex,
                        "status": bondToken.status
                    };
                }),
                "mana_board_index": 1,
                "create_time": serializedDate,
                "update_time": serializedDate,
                "join_time": serializedDate,
            }
        };
    }
    else {
        // otherwise, it was a dupe
        const dupeRewards = dupeItemRewards[assetData.rarity];
        let returnItem = undefined;
        if (dupeRewards) {
            const itemId = dupeRewards[assetData.element];
            (0, wdfpData_1.givePlayerItemSync)(playerId, itemId, 1);
            returnItem = {
                id: itemId,
                count: 1
            };
        }
        // update stack
        const newStack = playerCharacter.stack + 1;
        (0, wdfpData_1.updatePlayerCharacterSync)(playerId, characterId, {
            stack: newStack
        });
        return {
            character: {
                "character_id": characterId,
                "stack": newStack,
                "create_time": (0, utils_1.clientSerializeDate)(playerCharacter.joinTime),
                "update_time": (0, utils_1.clientSerializeDate)(playerCharacter.updateTime),
                "join_time": (0, utils_1.clientSerializeDate)(playerCharacter.joinTime),
            },
            item: returnItem
        };
    }
}
exports.givePlayerCharacterSync = givePlayerCharacterSync;
/**
 * Adds a given amount of exp to a list of characters.
 *
 * @param playerId The ID of the player who owns the characters.
 * @param characterIds A list of character IDs to add exp to.
 * @param expAmount The amount of exp to add.
 * @returns A RewardPlayerCharacterExpResult, detailing how much exp was added.
 */
function givePlayerCharactersExpSync(playerId, characterIds, expAmount, ignoreUpdate) {
    const addExpList = [];
    const characterList = [];
    const bondTokenStatusList = {};
    let addToExpPool = 0;
    for (const characterId of characterIds) {
        const characterData = (0, wdfpData_1.getPlayerCharacterSync)(playerId, characterId);
        const assetData = (0, assets_1.getCharacterDataSync)(characterId);
        if ((characterData !== null) && (assetData !== null) && !ignoreUpdate) {
            const expCap = exports.characterExpCaps[assetData.rarity][characterData.overLimitStep] || Number.MAX_SAFE_INTEGER;
            const currentExp = characterData.exp;
            let afterExp = currentExp + expAmount;
            const overflowExp = afterExp > expCap ? afterExp - expCap : 0;
            addToExpPool += overflowExp;
            afterExp = Math.min(expCap, afterExp);
            (0, wdfpData_1.updatePlayerCharacterSync)(playerId, characterId, {
                exp: afterExp
            });
            addExpList.push({
                character_id: characterId,
                add_exp: overflowExp > 0 ? overflowExp - expAmount : expAmount,
                after_exp: afterExp,
                add_exp_pool: overflowExp
            });
            characterList.push({
                "character_id": characterId,
                "exp": afterExp,
                "create_time": (0, utils_1.clientSerializeDate)(characterData.joinTime),
                "update_time": (0, utils_1.clientSerializeDate)(characterData.updateTime),
                "join_time": (0, utils_1.clientSerializeDate)(characterData.joinTime),
                "exp_total": afterExp
            });
            // insert bondTokenStatusList entry
            const bondTokenStatus = characterData.bondTokenList.map(entry => {
                return {
                    mana_board_index: entry.manaBoardIndex,
                    status: entry.status
                };
            });
            bondTokenStatusList[characterId] = {
                before: bondTokenStatus,
                after: bondTokenStatus
            };
        }
        else {
            addExpList.push({
                character_id: characterId,
                add_exp: 0,
                after_exp: 379988,
                add_exp_pool: 0
            });
        }
        // Always create bondTokenStatusList entry for every party character
        // (F1010: client accesses bondTokenStatusVariations.h[id] in experience card)
        if (!(characterId in bondTokenStatusList)) {
            const fallbackBond = [];
            bondTokenStatusList[characterId] = {
                before: fallbackBond,
                after: fallbackBond
            };
        }
    }
    // get player data
    const playerData = (0, wdfpData_1.getPlayerSync)(playerId);
    const currentExpPool = playerData ? playerData.expPool : null;
    const afterExpPool = currentExpPool === null ? null : currentExpPool + addToExpPool;
    if (afterExpPool !== null && addToExpPool > 0) {
        (0, wdfpData_1.updatePlayerSync)({
            id: playerId,
            expPool: afterExpPool
        });
    }
    return {
        add_exp_list: addExpList,
        character_list: characterList,
        bond_token_status_list: bondTokenStatusList,
        exp_pool: afterExpPool === null ? 0 : afterExpPool
    };
}
exports.givePlayerCharactersExpSync = givePlayerCharactersExpSync;
/**
 * Gets the current evolution image levels for an array of character ids for a player.
 *
 * @param playerId The ID of the player.
 * @param characterIds The array of character ids.
 * @returns
 */
function getCharactersEvolutionImgLevels(playerId, characterIds) {
    var _a, _b;
    const evolutionImgLevels = [];
    for (const id of characterIds) {
        if (id !== null) {
            const character = (0, wdfpData_1.getPlayerCharacterSync)(playerId, id);
            const illustrationSettings = (_a = character === null || character === void 0 ? void 0 : character.illustrationSettings) !== null && _a !== void 0 ? _a : [null];
            const evolutionLevel = (_b = character === null || character === void 0 ? void 0 : character.evolutionLevel) !== null && _b !== void 0 ? _b : 0;
            evolutionImgLevels.push(illustrationSettings[0] === null ? evolutionLevel : illustrationSettings[0]);
        }
        else {
            evolutionImgLevels.push(null);
        }
    }
    return evolutionImgLevels;
}
exports.getCharactersEvolutionImgLevels = getCharactersEvolutionImgLevels;
