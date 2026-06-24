"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStaminaRecoverySeconds = exports.getConfigSync = exports.getRushEventFolderClearRewards = exports.getShopItemSync = exports.getBossCoinShopItemsSync = exports.getEventShopItemsSync = exports.getGenericShopItemsSync = exports.getGachaCampaignIdSync = exports.getGachaSync = exports.getBoxGachaSync = exports.getExBoostItemSync = exports.getExStatusPoolSync = exports.getExAbilityPoolsSync = exports.getCharacterManaNodeSync = exports.getCharacterManaBoardCountSync = exports.getCharacterManaNodesSync = exports.getCharacterDataSync = exports.getQuestFromCategorySync = exports.getHardMultiEventQuest = exports.getAdventEventQuest = exports.getWorldStoryEventBossBattleQuestSync = exports.getWorldStoryEventQuestSync = exports.getCharacterQuestSync = exports.getBossBattleQuestSync = exports.getPracticeQuestSync = exports.getExQuestSync = exports.getMainQuestSync = exports.getScoreRewardGroup = exports.getRareScoreRewardGroup = exports.getClearRewardSync = void 0;
const advent_event_quest_json_1 = __importDefault(require("../../assets/advent_event_quest.json"));
const boss_battle_quest_json_1 = __importDefault(require("../../assets/boss_battle_quest.json"));
const box_gacha_json_1 = __importDefault(require("../../assets/box_gacha.json"));
const box_reward_json_1 = __importDefault(require("../../assets/box_reward.json"));
const character_json_1 = __importDefault(require("../../assets/character.json"));
const character_quest_json_1 = __importDefault(require("../../assets/character_quest.json"));
const clear_reward_json_1 = __importDefault(require("../../assets/clear_reward.json"));
const daily_exp_mana_event_quest_json_1 = __importDefault(require("../../assets/daily_exp_mana_event_quest.json"));
const daily_week_event_quest_json_1 = __importDefault(require("../../assets/daily_week_event_quest.json"));
const world_story_event_boss_battle_quest_json_1 = __importDefault(require("../../assets/world_story_event_boss_battle_quest.json"));
const world_story_event_quest_json_1 = __importDefault(require("../../assets/world_story_event_quest.json"));
const carnival_event_quest_json_1 = __importDefault(require("../../assets/carnival_event_quest.json"));
const challenge_dungeon_event_quest_json_1 = __importDefault(require("../../assets/challenge_dungeon_event_quest.json"));
const expert_single_event_quest_json_1 = __importDefault(require("../../assets/expert_single_event_quest.json"));
const raid_event_quest_json_1 = __importDefault(require("../../assets/raid_event_quest.json"));
const ranking_event_single_quest_json_1 = __importDefault(require("../../assets/ranking_event_single_quest.json"));
const rush_event_quest_json_1 = __importDefault(require("../../assets/rush_event_quest.json"));
const score_attack_event_quest_json_1 = __importDefault(require("../../assets/score_attack_event_quest.json"));
const solo_time_attack_event_quest_json_1 = __importDefault(require("../../assets/solo_time_attack_event_quest.json"));
const story_event_single_quest_json_1 = __importDefault(require("../../assets/story_event_single_quest.json"));
const tower_dungeon_event_quest_json_1 = __importDefault(require("../../assets/tower_dungeon_event_quest.json"));
const hard_multi_event_quest_json_1 = __importDefault(require("../../assets/hard_multi_event_quest.json"));
const ex_ability_json_1 = __importDefault(require("../../assets/ex_ability.json"));
const ex_boost_json_1 = __importDefault(require("../../assets/ex_boost.json"));
const ex_quest_json_1 = __importDefault(require("../../assets/ex_quest.json"));
const ex_status_json_1 = __importDefault(require("../../assets/ex_status.json"));
const gacha_json_1 = __importDefault(require("../../assets/gacha.json"));
const main_quest_json_1 = __importDefault(require("../../assets/main_quest.json"));
const practice_quest_json_1 = __importDefault(require("../../assets/practice_quest.json"));
const mana_node_json_1 = __importDefault(require("../../assets/mana_node.json"));
const rare_score_reward_json_1 = __importDefault(require("../../assets/rare_score_reward.json"));
const score_reward_json_1 = __importDefault(require("../../assets/score_reward.json"));
const gacha_campaign_json_1 = __importDefault(require("../../assets/gacha_campaign.json"));
const boss_coin_shop_json_1 = __importDefault(require("../../assets/boss_coin_shop.json"));
const boss_coin_shop_item_category_map_json_1 = __importDefault(require("../../assets/boss_coin_shop_item_category_map.json"));
const event_item_shop_json_1 = __importDefault(require("../../assets/event_item_shop.json"));
const event_item_shop_id_map_json_1 = __importDefault(require("../../assets/event_item_shop_id_map.json"));
const general_shop_json_1 = __importDefault(require("../../assets/general_shop.json"));
const star_grain_shop_json_1 = __importDefault(require("../../assets/star_grain_shop.json"));
const treasure_shop_json_1 = __importDefault(require("../../assets/treasure_shop.json"));
const equipment_enhancement_shop_json_1 = __importDefault(require("../../assets/equipment_enhancement_shop.json"));
const rush_event_quest_folder_json_1 = __importDefault(require("../../assets/rush_event_quest_folder.json"));
const config_json_1 = __importDefault(require("../../assets/config.json"));
const types_1 = require("./types");
/**
 * Gets a clear reward from its ID.
 *
 * @param clearRewardId The ID of the clear reward.
 * @returns The clear reward that was found, or null.
 */
function getClearRewardSync(clearRewardId) {
    const clearReward = clear_reward_json_1.default[String(clearRewardId)];
    return clearReward ? clearReward : null;
}
exports.getClearRewardSync = getClearRewardSync;
/**
 * Gets a rare score reward group from its ID.
 *
 * @param groupId The ID of the rare score reward group.
 * @returns The score reward group that was found, or null.
 */
function getRareScoreRewardGroup(groupId) {
    const group = rare_score_reward_json_1.default[String(groupId)];
    return group ? group : null;
}
exports.getRareScoreRewardGroup = getRareScoreRewardGroup;
/**
 * Gets a score reward group from its ID.
 *
 * @param groupId The ID of the group.
 * @returns The score reward group that was found, or null.
 */
function getScoreRewardGroup(groupId) {
    const group = score_reward_json_1.default[String(groupId)];
    return group ? group : null;
}
exports.getScoreRewardGroup = getScoreRewardGroup;
/**
 * Generic quest fetching function.
 *
 * @param quests The list of quests to search.
 * @param questId The ID of the quest to get.
 * @returns The found BattleQuest, StoryQuest, or null
 */
function getQuestSync(quests, questId) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
    const quest = quests[String(questId)];
    // return null if the quest doesn't exist
    if (!quest)
        return null;
    // always return BattleQuest; missing fields default to 0
    return {
        name: quest.name,
        clearReward: quest.clearRewardId === undefined ? undefined : getClearRewardSync(quest.clearRewardId),
        sPlusReward: quest.sPlusRewardId === undefined ? undefined : getClearRewardSync(quest.sPlusRewardId),
        scoreRewardGroupId: (_a = quest.scoreRewardGroupId) !== null && _a !== void 0 ? _a : undefined,
        scoreRewardGroup: quest.scoreRewardGroupId != null ? getScoreRewardGroup(quest.scoreRewardGroupId) : undefined,
        element: quest.element,
        eventId: quest.eventId,
        folderId: quest.folderId,
        bRankTime: (_b = quest.bRankTime) !== null && _b !== void 0 ? _b : 0,
        aRankTime: (_c = quest.aRankTime) !== null && _c !== void 0 ? _c : 0,
        sRankTime: (_d = quest.sRankTime) !== null && _d !== void 0 ? _d : 0,
        sPlusRankTime: (_e = quest.sPlusRankTime) !== null && _e !== void 0 ? _e : 0,
        rankPointReward: (_f = quest.rankPointReward) !== null && _f !== void 0 ? _f : 0,
        characterExpReward: (_g = quest.characterExpReward) !== null && _g !== void 0 ? _g : 0,
        manaReward: (_h = quest.manaReward) !== null && _h !== void 0 ? _h : 0,
        poolExpReward: (_j = quest.poolExpReward) !== null && _j !== void 0 ? _j : 0,
        fixedParty: quest.fixedParty,
        rushEventId: quest.rushEventId,
        rushEventFolderId: quest.rushEventFolderId,
        rushEventRound: quest.rushEventRound
    };
}
/**
 * Gets the data for a main quest from the database.
 *
 * @param questId The ID of the quest.
 * @returns A BattleQuest, StoryQuest, or null
 */
function getMainQuestSync(questId) {
    return getQuestSync(main_quest_json_1.default, questId);
}
exports.getMainQuestSync = getMainQuestSync;
/**
 * Gets an EX quest.
 *
 * @param questId The ID of the quest to get.
 * @returns The found BattleQuest or null
 */
function getExQuestSync(questId) {
    return getQuestSync(ex_quest_json_1.default, questId);
}
exports.getExQuestSync = getExQuestSync;
/**
 * Gets a practice quest.
 *
 * @param questId The ID of the quest to get.
 * @returns The found BattleQuest or null
 */
function getPracticeQuestSync(questId) {
    return getQuestSync(practice_quest_json_1.default, questId);
}
exports.getPracticeQuestSync = getPracticeQuestSync;
/**
 * Gets a boss battle quest.
 *
 * @param questId The ID of the quest to get.
 * @returns The found BattleQuest or null
 */
function getBossBattleQuestSync(questId) {
    return getQuestSync(boss_battle_quest_json_1.default, questId);
}
exports.getBossBattleQuestSync = getBossBattleQuestSync;
/**
 * Gets a character quest.
 *
 * @param questId The ID of the quest to get.
 * @returns The found StoryQuest or null
 */
function getCharacterQuestSync(questId) {
    return getQuestSync(character_quest_json_1.default, questId);
}
exports.getCharacterQuestSync = getCharacterQuestSync;
/**
 * Gets a world story event quest.
 *
 * @param questId The ID of the quest to get.
 * @returns The found StoryQuest or null
 */
function getWorldStoryEventQuestSync(questId) {
    return getQuestSync(world_story_event_quest_json_1.default, questId);
}
exports.getWorldStoryEventQuestSync = getWorldStoryEventQuestSync;
/**
 * Gets a world story event boss battle quest.
 *
 * @param questId The ID of the quest to get.
 * @returns The found StoryQuest or null
 */
function getWorldStoryEventBossBattleQuestSync(questId) {
    return getQuestSync(world_story_event_boss_battle_quest_json_1.default, questId);
}
exports.getWorldStoryEventBossBattleQuestSync = getWorldStoryEventBossBattleQuestSync;
/**
 * Gets an advent quest.
 *
 * @param questId The ID of the quest to get.
 * @returns The found StoryQuest or null
 */
function getAdventEventQuest(questId) {
    return getQuestSync(advent_event_quest_json_1.default, questId);
}
exports.getAdventEventQuest = getAdventEventQuest;
/**
 * Gets a hard multi event quest.
 *
 * @param questId The ID of the quest to get.
 * @returns The found BattleQuest or null
 */
function getHardMultiEventQuest(questId) {
    return getQuestSync(hard_multi_event_quest_json_1.default, questId);
}
exports.getHardMultiEventQuest = getHardMultiEventQuest;
/**
 * Gets a quest from a specific quest category.
 *
 * @param category The category of the quest.
 * @param questId The ID of the quest.
 * @returns The BattleQuest or StoryQuest that was found, or null if nothing was found.
 */
function getQuestFromCategorySync(category, questId) {
    switch (category) {
        case types_1.QuestCategory.MAIN:
            return getMainQuestSync(questId);
        case types_1.QuestCategory.EX:
            return getExQuestSync(questId);
        case types_1.QuestCategory.BOSS_BATTLE:
            return getBossBattleQuestSync(questId);
        case types_1.QuestCategory.CHARACTER:
            return getCharacterQuestSync(questId);
        case types_1.QuestCategory.WORLD_STORY_EVENT:
            return getWorldStoryEventQuestSync(questId);
        case types_1.QuestCategory.WORLD_STORY_EVENT_BOSS_BATTLE:
            return getWorldStoryEventBossBattleQuestSync(questId);
        case types_1.QuestCategory.ADVENT_EVENT_SINGLE:
        case types_1.QuestCategory.ADVENT_EVENT_MULTI:
            return getAdventEventQuest(questId);
        case types_1.QuestCategory.STORY_EVENT_SINGLE:
            return getQuestSync(story_event_single_quest_json_1.default, questId);
        case types_1.QuestCategory.RANKING_EVENT_SINGLE:
            return getQuestSync(ranking_event_single_quest_json_1.default, questId);
        case types_1.QuestCategory.CHALLENGE_DUNGEON_EVENT:
            return getQuestSync(challenge_dungeon_event_quest_json_1.default, questId);
        case types_1.QuestCategory.DAILY_EXP_MANA_EVENT:
            return getQuestSync(daily_exp_mana_event_quest_json_1.default, questId);
        case types_1.QuestCategory.PRACTICE:
            return getPracticeQuestSync(questId);
        case types_1.QuestCategory.DAILY_WEEK_EVENT:
            return getQuestSync(daily_week_event_quest_json_1.default, questId);
        case types_1.QuestCategory.TOWER_DUNGEON_EVENT:
            return getQuestSync(tower_dungeon_event_quest_json_1.default, questId);
        case types_1.QuestCategory.EXPERT_SINGLE_EVENT:
            return getQuestSync(expert_single_event_quest_json_1.default, questId);
        case types_1.QuestCategory.CARNIVAL_EVENT:
            return getQuestSync(carnival_event_quest_json_1.default, questId);
        case types_1.QuestCategory.RAID_EVENT:
            return getQuestSync(raid_event_quest_json_1.default, questId);
        case types_1.QuestCategory.RUSH_EVENT:
            return getQuestSync(rush_event_quest_json_1.default, questId);
        case types_1.QuestCategory.SOLO_TIME_ATTACK_EVENT:
            return getQuestSync(solo_time_attack_event_quest_json_1.default, questId);
        case types_1.QuestCategory.SCORE_ATTACK_EVENT:
            return getQuestSync(score_attack_event_quest_json_1.default, questId);
        case types_1.QuestCategory.HARD_MULTI_EVENT:
            return getHardMultiEventQuest(questId);
        default:
            return null;
    }
}
exports.getQuestFromCategorySync = getQuestFromCategorySync;
/**
 * Gets a character's asset data from their id.
 *
 * @param characterId The ID of the character.
 * @returns The character's asset data, or null if it wasn't found.
 */
function getCharacterDataSync(characterId) {
    const character = character_json_1.default[String(characterId)];
    if (!character)
        return null;
    return character;
}
exports.getCharacterDataSync = getCharacterDataSync;
/**
 * Gets all mana node data for a character on a specific level.
 *
 * @param characterId The ID of the character.
 * @param level The mana node level.
 * @returns A record containing ManaNode objects or null.
 */
function getCharacterManaNodesSync(characterId, level) {
    const characterManaNodes = mana_node_json_1.default[String(characterId)];
    if (!characterManaNodes)
        return null;
    return characterManaNodes[String(level)] || null;
}
exports.getCharacterManaNodesSync = getCharacterManaNodesSync;
/**
 * Gets the number of mana boards a character has in CDN data.
 */
function getCharacterManaBoardCountSync(characterId) {
    const characterManaNodes = mana_node_json_1.default[String(characterId)];
    if (!characterManaNodes)
        return 0;
    return Object.keys(characterManaNodes).length;
}
exports.getCharacterManaBoardCountSync = getCharacterManaBoardCountSync;
/**
 * Gets the data for a character mana node.
 *
 * @param characterId The ID of the character.
 * @param level The mana node level to get the node from.
 * @param manaNodeId The ID of the mana node.
 * @returns A ManaNode object or null.
 */
function getCharacterManaNodeSync(characterId, level, manaNodeId) {
    const nodes = getCharacterManaNodesSync(characterId, level);
    if (!nodes)
        return null;
    return nodes[String(manaNodeId)] || null;
}
exports.getCharacterManaNodeSync = getCharacterManaNodeSync;
/**
 * Gets the ExAbilities record.
 *
 * @returns
 */
function getExAbilityPoolsSync() {
    return ex_ability_json_1.default;
}
exports.getExAbilityPoolsSync = getExAbilityPoolsSync;
/**
 * Gets an ex status pool.
 *
 * @param tier The tier of the pool to get.
 * @returns A list of numbers with the StatusIDs corresponding to the requested pool.
 */
function getExStatusPoolSync(tier) {
    const pool = ex_status_json_1.default[String(tier)];
    return pool === undefined ? null : pool;
}
exports.getExStatusPoolSync = getExStatusPoolSync;
/**
 * Gets an ex boost item.
 *
 * @param itemId The ID of the item.
 * @returns The ExBoostItem that was found, or null.
 */
function getExBoostItemSync(itemId) {
    const item = ex_boost_json_1.default[String(itemId)];
    return item === undefined ? null : item;
}
exports.getExBoostItemSync = getExBoostItemSync;
/**
 * Gets the data for a box gacha from the assets folder.
 *
 * @param id The ID of the box gacha.
 * @returns A BoxGacha object or null, if it didn't exist.
 */
function getBoxGachaSync(id) {
    const idString = String(id);
    // get redeem item data
    const redeemItemData = box_gacha_json_1.default[idString];
    if (redeemItemData === undefined)
        return null;
    // get boxes
    const boxes = box_reward_json_1.default[idString];
    if (boxes === undefined)
        return null;
    // build box gacha
    return {
        redeemItemId: redeemItemData.itemId,
        redeemItemCount: redeemItemData.count,
        boxes: boxes,
        availableCounts: redeemItemData.availableCounts
    };
}
exports.getBoxGachaSync = getBoxGachaSync;
/**
 * Gets the data for a gacha.
 *
 * @param id The ID of the gacha.
 * @returns The gacha's data, or null.
 */
function getGachaSync(id) {
    const data = gacha_json_1.default[String(id)];
    return data !== null && data !== void 0 ? data : null;
}
exports.getGachaSync = getGachaSync;
/**
 * Gets the ID of the gacha campaign assigned to a gacha.
 *
 * @param gachaId The ID of the gacha.
 * @returns The ID of the assigned gacha campaign or null.
 */
function getGachaCampaignIdSync(gachaId) {
    var _a;
    return (_a = gacha_campaign_json_1.default[String(gachaId)]) !== null && _a !== void 0 ? _a : null;
}
exports.getGachaCampaignIdSync = getGachaCampaignIdSync;
// shop functions
/**
 * Gets the items for a generic shop.
 *
 * @param shopType The type of shop to get the items of.
 * @returns A list of shop items belonging to the specified shop type or null.
 */
function getGenericShopItemsSync(shopType) {
    switch (shopType) {
        case types_1.ShopType.TREASURE:
            return treasure_shop_json_1.default;
        case types_1.ShopType.TREASURE_EQUIPMENT:
            return equipment_enhancement_shop_json_1.default;
        case types_1.ShopType.GENERAL:
            return general_shop_json_1.default;
        case types_1.ShopType.STAR_GRAIN:
            return star_grain_shop_json_1.default;
    }
    return null;
}
exports.getGenericShopItemsSync = getGenericShopItemsSync;
/**
 * Gets the items for a specific event shop.
 *
 * @param eventType The type of event.
 * @param eventId The ID of the event.
 * @returns A list of shop items or null.
 */
function getEventShopItemsSync(eventType, eventId) {
    var _a, _b;
    const typeSection = event_item_shop_json_1.default[String(eventType)];
    if (typeSection === undefined)
        return null;
    // Try exact event ID first
    let result = (_a = typeSection[String(eventId)]) !== null && _a !== void 0 ? _a : null;
    if (result !== null)
        return result;
    // Fallback: for rush event reruns (700011-700017), try primary event (ID - 10)
    const eventIdNum = Number(eventId);
    if (eventIdNum >= 700010 && eventIdNum <= 700019) {
        return (_b = typeSection[String(eventIdNum - 10)]) !== null && _b !== void 0 ? _b : null;
    }
    return null;
}
exports.getEventShopItemsSync = getEventShopItemsSync;
/**
 * Gets the items belonging to a specific boss coin shop.
 *
 * @param bossId The ID of the boss to get the items of.
 * @returns A list of shop items or null.
 */
function getBossCoinShopItemsSync(bossId) {
    var _a;
    return (_a = boss_coin_shop_json_1.default[String(bossId)]) !== null && _a !== void 0 ? _a : null;
}
exports.getBossCoinShopItemsSync = getBossCoinShopItemsSync;
/**
 * Gets the data for a specfic ShopItem.
 *
 * @param shopType The type of shop that this item belongs to.
 * @param itemId The ID of this item.
 * @returns The ShopItem data or null.
 */
function getShopItemSync(shopType, itemId) {
    var _a, _b, _c, _d, _e, _f;
    switch (shopType) {
        case types_1.ShopType.TREASURE:
            return (_a = treasure_shop_json_1.default[String(itemId)]) !== null && _a !== void 0 ? _a : null;
        case types_1.ShopType.TREASURE_EQUIPMENT:
            return (_b = equipment_enhancement_shop_json_1.default[String(itemId)]) !== null && _b !== void 0 ? _b : null;
        case types_1.ShopType.GENERAL:
            return (_c = general_shop_json_1.default[String(itemId)]) !== null && _c !== void 0 ? _c : null;
        case types_1.ShopType.STAR_GRAIN:
            return (_d = star_grain_shop_json_1.default[String(itemId)]) !== null && _d !== void 0 ? _d : null;
        case types_1.ShopType.BOSS_COIN:
            const category = boss_coin_shop_item_category_map_json_1.default[itemId];
            if (category === undefined)
                return null;
            return (_e = boss_coin_shop_json_1.default[category][itemId]) !== null && _e !== void 0 ? _e : null;
        case types_1.ShopType.EVENT_ITEM:
            const mapInfo = event_item_shop_id_map_json_1.default[itemId];
            if (mapInfo === undefined)
                return null;
            return (_f = event_item_shop_json_1.default[mapInfo.eventType][mapInfo.eventId][itemId]) !== null && _f !== void 0 ? _f : null;
        default:
            return null;
    }
}
exports.getShopItemSync = getShopItemSync;
/**
 * Gets the rewards that should be given when clearing a given folder.
 *
 * @param rushEventId The ID of the rush event.
 * @param folderId The ID of the folder.
 * @returns
 */
function getRushEventFolderClearRewards(rushEventId, folderId) {
    var _a;
    const folders = rush_event_quest_folder_json_1.default[rushEventId];
    if (folders !== undefined) {
        const rewards = folders[folderId];
        if (rewards !== undefined && Array.isArray(rewards) && rewards.length > 0) {
            return rewards;
        }
    }
    // Fallback: for rush event reruns (700011-700017), try primary event (ID - 10)
    if (rushEventId >= 700010 && rushEventId <= 700019) {
        const primaryFolders = rush_event_quest_folder_json_1.default[rushEventId - 10];
        if (primaryFolders !== undefined) {
            return (_a = primaryFolders[folderId]) !== null && _a !== void 0 ? _a : null;
        }
    }
    return null;
}
exports.getRushEventFolderClearRewards = getRushEventFolderClearRewards;
// TODO: 待从CDN二进制 config.orderedmap 提取真实数据
const FALLBACK_CONFIG = {
    continue_virtual_money: 50,
    stamina_recovery_virtual_money: 50,
    stamina_recovery_seconds: 300,
    stamina_recovery_value: 100,
    max_stamina_overflow: 999,
    max_virtual_money: 999999,
    max_mana: 99999999,
    max_star_crumb: 9999,
    pool_exp_gain_value: 1,
    pool_exp_gain_seconds: 1,
    max_pool_exp: 999999,
    max_display_pool_exp: 999999,
    max_follows_count: 100,
    max_followers_count: 50,
    max_display_followers_count: 50,
    max_player_name_length: 12,
    max_player_comment_length: 40,
    overflow_exp_to_mana_conversion_rate: 0.001,
    reward_multiplier_by_boost_point: 1.0,
    common_reward_multiplier_by_multi_play_mode: 1.0,
    limit_payment_under_16: 0,
    limit_payment_16_19: 0,
    alert_payment: 0,
    level_correction_value_by_recommended_element: 0,
    level_correction_value_for_moderate_level_comparison: 0,
    unknown_loc2: 0,
    max_bond_token: 999,
    treasure_shop_item_number: 0,
    special_pack_shop_days_as_new: 7,
    support_url: "",
    max_boss_boost_point: 3,
    max_display_boss_boost_point: 3,
    max_boost_point: 10,
    max_display_boost_point: 10,
    craft_point_item_id: 0,
    wildcard_once_character_ticket_item_id: 0,
    wildcard_ten_times_character_ticket_item_id: 0,
    wildcard_once_rare4_character_ticket_item_id: 0,
    wildcard_once_equipment_ticket_item_id: 0,
    wildcard_ten_times_equipment_ticket_item_id: 0,
    encyclopedia_point_item_id: 0,
    star_grain_item_id: 0,
    gacha_one_max_count: 999,
    gacha_ten_max_count: 999,
    growth_fund_unlock_chapter: 0,
    gacha_crazy_ten_max_count: 999,
    monthly_bonus_payment_total_requirement: 0,
    crazygacha_ten_times_character_ticket_id: 0,
    reward_multiplier_by_newbie: 1.0,
    newbie_rank: 50,
    newbie_days: 7,
};
/**
 * Gets the config values (stamina recovery, vmoney limits, etc.).
 * Returns fallback defaults if config.json fails to load.
 */
function getConfigSync() {
    if (!config_json_1.default) {
        console.error('[CONFIG] config.json not loaded, using fallback defaults');
        return FALLBACK_CONFIG;
    }
    // Merge loaded data with fallback to fill any missing fields
    const merged = Object.assign(Object.assign({}, FALLBACK_CONFIG), config_json_1.default);
    return merged;
}
exports.getConfigSync = getConfigSync;
/**
 * Gets a specific stamina config value with bounds checking.
 */
function getStaminaRecoverySeconds() {
    const v = getConfigSync().stamina_recovery_seconds;
    if (typeof v !== 'number' || v <= 0 || !isFinite(v)) {
        console.warn('[CONFIG] invalid stamina_recovery_seconds, fallback to 300');
        return 300;
    }
    return v;
}
exports.getStaminaRecoverySeconds = getStaminaRecoverySeconds;
