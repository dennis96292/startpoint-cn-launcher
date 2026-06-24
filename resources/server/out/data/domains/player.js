"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.dailyResetPlayerSync = exports.dailyResetPlayerDataSync = exports.collectPlayerPooledExpSync = exports.collectPlayerDataPooledExpSync = exports.deletePlayerSync = exports.replacePlayerDataSync = exports.updatePlayerSync = exports.insertDefaultPlayerSync = exports.getDefaultPlayerPartyGroupsSync = exports.insertMergedPlayerDataSync = exports.insertPlayerSync = exports.getAllPlayersSync = exports.getPlayerSync = exports.getAccountFromPlayerIdSync = exports.getPlayerFromAccountIdSync = exports.serializePlayerRushEventPlayedParty = exports.deserializePlayerRushEventPlayedParty = exports.updatePlayerDailyChallengePointSync = exports.insertPlayerDailyChallengePointListSync = exports.getPlayerDailyChallengePointListSync = void 0;
const db_1 = require("../db");
const types_1 = require("../types");
const utils_1 = require("../../utils");
const utils_2 = require("../utils");
const account_1 = require("./account");
const daily_challenge_point_lookup_json_1 = __importDefault(require("../../../assets/daily_challenge_point_lookup.json"));
function getDailyChallengePointDefaults() {
    const lookup = daily_challenge_point_lookup_json_1.default;
    const entries = [];
    for (const [idStr, data] of Object.entries(lookup)) {
        entries.push({
            id: Number(idStr),
            point: data.maxPoint,
            campaignList: []
        });
    }
    return entries;
}
const expPoolMax = 100000;
const tutorial_1 = require("./tutorial");
const option_1 = require("./option");
const item_1 = require("./item");
const equipment_1 = require("./equipment");
const party_1 = require("./party");
const character_1 = require("./character");
const quest_1 = require("./quest");
const gacha_1 = require("./gacha");
const boxGacha_1 = require("./boxGacha");
const rushEvent_1 = require("./rushEvent");
const mission_1 = require("./mission");
const campaign_1 = require("./campaign");
/**
 * Gets a player's daily challenge point list based on their id.
 *
 * @param playerId The ID of the player to get the daily challenge point list of.
 * @returns The player's daily challenge point list.
 */
function getPlayerDailyChallengePointListSync(playerId) {
    const rawEntries = (0, db_1.getDb)().prepare(`
    SELECT id, point
    FROM daily_challenge_point_list_entries
    WHERE player_id = ?
    `).all(playerId);
    const rawCampaigns = (0, db_1.getDb)().prepare(`
    SELECT campaign_id, additional_point, list_entry_id
    FROM daily_challenge_point_list_campaigns
    WHERE player_id = ?
    `).all(playerId);
    const campaignBuckets = {};
    for (const rawCampaign of rawCampaigns) {
        const listEntryId = rawCampaign.list_entry_id;
        let bucket = campaignBuckets[listEntryId];
        if (!bucket) {
            bucket = [];
            campaignBuckets[listEntryId] = bucket;
        }
        bucket.push({
            campaignId: rawCampaign.campaign_id,
            additionalPoint: rawCampaign.additional_point
        });
    }
    const entries = [];
    for (const rawEntry of rawEntries) {
        const id = rawEntry.id;
        entries.push({
            id: id,
            point: rawEntry.point,
            campaignList: campaignBuckets[id] || []
        });
    }
    return entries;
}
exports.getPlayerDailyChallengePointListSync = getPlayerDailyChallengePointListSync;
/**
 * Inserts a singular DailyChallengePointListEntry into the database.
 *
 * @param playerId The ID of the player.
 * @param entry The entry to insert.
 */
function insertPlayerDailyChallengePointListEntrySync(playerId, entry) {
    const id = entry.id;
    // insert into the list entry table
    (0, db_1.getDb)().prepare(`
    INSERT INTO daily_challenge_point_list_entries (id, point, player_id)
    VALUES (?, ?, ?)
    `).run(id, entry.point, playerId);
    // insert campaigns
    for (const campaign of entry.campaignList) {
        (0, db_1.getDb)().prepare(`
        INSERT INTO daily_challenge_point_list_campaigns (campaign_id, additional_point, list_entry_id, player_id)
        VALUES (?, ?, ?, ?)
        `).run(campaign.campaignId, campaign.additionalPoint, id, playerId);
    }
}
/**
 * Batch inserts a list of DailyChallengePointListEntries into the database.
 *
 * @param playerId The ID of the player.
 * @param entries The entries to insert.
 */
function insertPlayerDailyChallengePointListSync(playerId, entries) {
    (0, db_1.getDb)().transaction(() => {
        for (const entry of entries) {
            insertPlayerDailyChallengePointListEntrySync(playerId, entry);
        }
    })();
}
exports.insertPlayerDailyChallengePointListSync = insertPlayerDailyChallengePointListSync;
/**
 * Updates a player's daily challenge point for a specific entry.
 */
function updatePlayerDailyChallengePointSync(playerId, entryId, point) {
    (0, db_1.getDb)().prepare(`
    UPDATE daily_challenge_point_list_entries SET point = ?
    WHERE id = ? AND player_id = ?
    `).run(point, entryId, playerId);
}
exports.updatePlayerDailyChallengePointSync = updatePlayerDailyChallengePointSync;
/**
 * Inserts a singular item into the player's inventory.
 *
 * @param playerId The ID of the player.
 * @param itemId The ID of the item to insert.
 * @param amount The amount of the item to insert.
 */
function insertPlayerItemSync(playerId, itemId, amount) {
    (0, db_1.getDb)().prepare(`
    INSERT INTO players_items (id, amount, player_id)
    VALUES (?, ?, ?)
    `).run(Number(itemId), amount, playerId);
}
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
 * Synchronously gets the first player bound to an account.
 */
function getPlayerFromAccountIdSync(accountId) {
    const response = (0, db_1.getDb)().prepare(`
    SELECT id
    FROM players
    WHERE account_id = ?
    `).get(accountId);
    if (response === undefined)
        return null;
    return getPlayerSync(response.id);
}
exports.getPlayerFromAccountIdSync = getPlayerFromAccountIdSync;
/**
 * Gets the account that is tied to an individual player.
 *
 * @param playerId The ID of the player.
 * @returns The account that is tied to the player.
 */
function getAccountFromPlayerIdSync(playerId) {
    const raw = (0, db_1.getDb)().prepare(`
    SELECT account_id
    FROM players
    WHERE id = ?
    `).get(playerId);
    return raw === undefined ? null : (0, account_1.getAccountSync)(raw.account_id);
}
exports.getAccountFromPlayerIdSync = getAccountFromPlayerIdSync;
/**
 * Converts a RawPlayer into a Player
 *
 * @param raw The raw player to convert into a player.
 * @returns The converted Player
 */
function buildPlayer(raw) {
    return {
        id: raw.id,
        stamina: raw.stamina,
        staminaHealTime: new Date(raw.stamina_heal_time),
        boostPoint: raw.boost_point,
        bossBoostPoint: raw.boss_boost_point,
        transitionState: raw.transition_state,
        role: raw.role,
        name: raw.name,
        lastLoginTime: new Date(raw.last_login_time),
        comment: raw.comment,
        vmoney: raw.vmoney,
        freeVmoney: raw.free_vmoney,
        rankPoint: raw.rank_point,
        starCrumb: raw.star_crumb,
        bondToken: raw.bond_token,
        expPool: raw.exp_pool,
        expPooledTime: new Date(raw.exp_pooled_time),
        leaderCharacterId: raw.leader_character_id,
        partySlot: raw.party_slot,
        degreeId: raw.degree_id,
        birth: raw.birth,
        freeMana: raw.free_mana,
        paidMana: raw.paid_mana,
        enableAuto3x: (0, utils_2.deserializeBoolean)(raw.enable_auto_3x),
        tutorialStep: raw.tutorial_step,
        tutorialSkipFlag: raw.tutorial_skip_flag === null ? null : (0, utils_2.deserializeBoolean)(raw.tutorial_skip_flag),
        tutorialGachaCharacterId: raw.tutorial_gacha_character_id,
    };
}
function getPlayerSync(playerId) {
    const raw = (0, db_1.getDb)().prepare(`
    SELECT id, stamina, stamina_heal_time, boost_point, boss_boost_point,
        transition_state, role, name, last_login_time, comment,
        vmoney, free_vmoney, rank_point, star_crumb,
        bond_token, exp_pool, exp_pooled_time, leader_character_id, party_slot,
        degree_id, birth, free_mana, paid_mana, enable_auto_3x, tutorial_step, tutorial_skip_flag, tutorial_gacha_character_id
    FROM players
    WHERE id = ?    
    `).get(playerId);
    if (raw === undefined)
        return null;
    return buildPlayer(raw);
}
exports.getPlayerSync = getPlayerSync;
function getAllPlayersSync(offset = 0, limit = 25) {
    const raw = (0, db_1.getDb)().prepare(`
    SELECT id, stamina, stamina_heal_time, boost_point, boss_boost_point,
        transition_state, role, name, last_login_time, comment,
        vmoney, free_vmoney, rank_point, star_crumb,
        bond_token, exp_pool, exp_pooled_time, leader_character_id, party_slot,
        degree_id, birth, free_mana, paid_mana, enable_auto_3x, tutorial_step, tutorial_skip_flag, tutorial_gacha_character_id
    FROM players
    LIMIT ?
    OFFSET ?
    `).all(limit, offset);
    return raw.map(rawPlayer => buildPlayer(rawPlayer));
}
exports.getAllPlayersSync = getAllPlayersSync;
/**
 * Inserts a player into the database.
 *
 * @param accountId The ID of the account that this player is linked to.
 * @param player The player data to insert.
 * @returns The ID of the player that was inserted.
 */
function insertPlayerSync(accountId, player) {
    const playerId = player.id;
    const playerIdGiven = playerId !== undefined;
    const values = [
        player.stamina,
        player.staminaHealTime.toISOString(),
        player.boostPoint,
        player.bossBoostPoint,
        player.transitionState,
        player.role,
        player.name,
        player.lastLoginTime.toISOString(),
        player.comment,
        player.vmoney,
        player.freeVmoney,
        player.rankPoint,
        player.starCrumb,
        player.bondToken,
        player.expPool,
        player.expPooledTime.toISOString(),
        player.leaderCharacterId,
        player.partySlot,
        player.degreeId,
        player.birth,
        player.freeMana,
        player.paidMana,
        (0, utils_2.serializeBoolean)(player.enableAuto3x),
        accountId,
        player.tutorialStep === null ? null : player.tutorialStep,
        player.tutorialSkipFlag === null ? null : (0, utils_2.serializeBoolean)(player.tutorialSkipFlag),
        player.tutorialGachaCharacterId === undefined ? null : player.tutorialGachaCharacterId
    ];
    if (playerIdGiven)
        values.push(playerId);
    const insert = (0, db_1.getDb)().prepare(`
    INSERT INTO players (stamina, stamina_heal_time, boost_point, boss_boost_point,
        transition_state, role, name, last_login_time, comment, vmoney, free_vmoney,
        rank_point, star_crumb, bond_token, exp_pool, exp_pooled_time, leader_character_id,
        party_slot, degree_id, birth, free_mana, paid_mana, enable_auto_3x, account_id, 
        tutorial_step, tutorial_skip_flag, tutorial_gacha_character_id${playerIdGiven ? ', id' : ''})
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?${playerIdGiven ? ', ?' : ''})
    `).run(values);
    // return
    return Number(insert.lastInsertRowid);
}
exports.insertPlayerSync = insertPlayerSync;
/**
 * Inserts the data from a MergedPlayerData object into the database.
 *
 * @param toInsert The data to insert into the database.
 * @returns The newly inserted player's id.
 */
function insertMergedPlayerDataSync(accountId, toInsert) {
    const player = toInsert.player;
    const playerId = player.id;
    insertPlayerSync(accountId, player);
    insertPlayerDailyChallengePointListSync(playerId, toInsert.dailyChallengePointList);
    (0, tutorial_1.insertPlayerTriggeredTutorialsSync)(playerId, toInsert.triggeredTutorial);
    (0, mission_1.insertPlayerClearedRegularMissionListSync)(playerId, toInsert.clearedRegularMissionList);
    (0, character_1.insertPlayerCharactersSync)(playerId, toInsert.characterList);
    (0, character_1.insertPlayerCharactersManaNodesSync)(playerId, toInsert.characterManaNodeList);
    (0, party_1.insertPlayerPartyGroupListSync)(playerId, toInsert.partyGroupList);
    (0, item_1.insertPlayerItemsSync)(playerId, toInsert.itemList);
    (0, equipment_1.insertPlayerEquipmentListSync)(playerId, toInsert.equipmentList);
    (0, quest_1.insertPlayerQuestProgressListSync)(playerId, toInsert.questProgress);
    (0, gacha_1.insertPlayerGachaInfoListSync)(playerId, toInsert.gachaInfoList);
    (0, gacha_1.insertPlayerGachaCampaignListSync)(playerId, toInsert.gachaCampaignList);
    (0, quest_1.insertPlayerDrawnQuestsSync)(playerId, toInsert.drawnQuestList);
    (0, campaign_1.insertPlayerPeriodicRewardPointsListSync)(playerId, toInsert.periodicRewardPointList);
    (0, mission_1.insertPlayerActiveMissionsSync)(playerId, toInsert.allActiveMissionList);
    (0, boxGacha_1.insertPlayerBoxGachasSync)(playerId, toInsert.boxGachaList);
    (0, campaign_1.insertPlayerStartDashExchangeCampaignsSync)(playerId, toInsert.startDashExchangeCampaignList);
    (0, campaign_1.insertPlayerMultiSpecialExchangeCampaignsSync)(playerId, toInsert.multiSpecialExchangeCampaignList);
    (0, option_1.insertPlayerOptionsSync)(playerId, toInsert.userOption);
    // insert data that could be undefined.
    const rushEventList = toInsert.rushEventList;
    if (rushEventList !== undefined) {
        (0, rushEvent_1.insertPlayerRushEventListSync)(playerId, rushEventList);
    }
    const rushEventClearedFolderList = toInsert.rushEventClearedFolderList;
    if (rushEventClearedFolderList !== undefined) {
        (0, rushEvent_1.insertPlayerRushEventClearedFolderListSync)(playerId, rushEventClearedFolderList);
    }
    const rushEventPlayedPartyList = toInsert.rushEventPlayedPartyList;
    if (rushEventPlayedPartyList !== undefined) {
        (0, rushEvent_1.insertPlayerRushEventPlayedPartyListSync)(playerId, rushEventPlayedPartyList);
    }
}
exports.insertMergedPlayerDataSync = insertMergedPlayerDataSync;
function getDefaultPlayerPartyGroupsSync(partyType = types_1.PartyCategory.NORMAL, characterIds = [1, null, null]) {
    const partyGroups = {};
    const partyNames = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];
    const groupCount = 12; // CN version: 12 groups × 10 slots = 120 parties
    const character1 = characterIds[0];
    const character2 = characterIds[1];
    const character3 = characterIds[2];
    for (let i = 0; i < groupCount; i++) {
        const list = {};
        const group = {
            list: list,
            colorId: 15,
            category: partyType
        };
        for (let slot = 1; slot <= 10; slot++) {
            const name = partyNames[slot - 1];
            list[slot] = {
                name: `Party ${name}`,
                characterIds: [character1, character2, character3],
                unisonCharacterIds: [null, null, null],
                equipmentIds: [null, null, null],
                abilitySoulIds: [null, null, null],
                edited: false,
                options: {
                    allowOtherPlayersToHealMe: true
                },
                category: partyType
            };
        }
        partyGroups[(i + 1).toString()] = group;
    }
    return partyGroups;
}
exports.getDefaultPlayerPartyGroupsSync = getDefaultPlayerPartyGroupsSync;
/**
 * Inserts a default player data into the database, linked to a provided account id.
 *
 * @param accountId The account ID to link the new player to.
 * @returns The newly created player.
 */
function insertDefaultPlayerSync(accountId) {
    const player = (0, utils_2.getDefaultPlayerData)();
    const playerId = insertPlayerSync(accountId, player);
    // daily challenge point list — initialize all 282 CDN entries
    insertPlayerDailyChallengePointListSync(playerId, getDailyChallengePointDefaults());
    // insert triggered tutorials — empty to trigger tutorial on new accounts
    (0, tutorial_1.insertPlayerTriggeredTutorialsSync)(playerId, []);
    // insert cleared regular missions
    (0, mission_1.insertPlayerClearedRegularMissionListSync)(playerId, {});
    // insert characterList
    (0, character_1.insertPlayerCharactersSync)(playerId, {
        "1": {
            entryCount: 1,
            evolutionLevel: 0,
            overLimitStep: 0,
            protection: false,
            joinTime: new Date(),
            updateTime: new Date(),
            exp: 10,
            stack: 0,
            bondTokenList: [
                {
                    manaBoardIndex: 1,
                    status: 0
                },
                {
                    manaBoardIndex: 2,
                    status: 0
                }
            ],
            manaBoardIndex: 1
        }
    });
    // insert characterManaNodeList
    (0, character_1.insertPlayerCharactersManaNodesSync)(playerId, {});
    // insert default parties
    (0, party_1.insertPlayerPartyGroupListSync)(playerId, getDefaultPlayerPartyGroupsSync());
    // insert items
    (0, item_1.insertPlayerItemsSync)(playerId, {});
    // insert equipment
    (0, equipment_1.insertPlayerEquipmentListSync)(playerId, {});
    // insert quest progress
    (0, quest_1.insertPlayerQuestProgressListSync)(playerId, {});
    // insert options
    (0, option_1.insertPlayerOptionsSync)(playerId, {
        "gacha_play_no_rarity_up_movie": false,
        "auto_play": false,
        "number_notation_symbol": true,
        "payment_alert": true,
        "room_number_hidden": false,
        "attention_sound_effect": true,
        "attention_vibration": false,
        "attention_enable_in_battle": true,
        "simple_ability_description": false
    });
    // insert gacha info
    (0, gacha_1.insertPlayerGachaInfoListSync)(playerId, []);
    // insert drawnQuestList
    (0, quest_1.insertPlayerDrawnQuestsSync)(playerId, [
        {
            categoryId: 6,
            questId: 5001,
            oddsId: 5
        },
        {
            categoryId: 6,
            questId: 5002,
            oddsId: 3
        },
        {
            categoryId: 6,
            questId: 5003,
            oddsId: 1
        },
        {
            categoryId: 6,
            questId: 5004,
            oddsId: 6
        },
        {
            categoryId: 6,
            questId: 5005,
            oddsId: 2
        },
        {
            categoryId: 6,
            questId: 13001,
            oddsId: 2
        },
        {
            categoryId: 6,
            questId: 13002,
            oddsId: 4
        },
        {
            categoryId: 6,
            questId: 13003,
            oddsId: 3
        },
        {
            categoryId: 6,
            questId: 13004,
            oddsId: 2
        },
        {
            categoryId: 6,
            questId: 13005,
            oddsId: 9
        },
        {
            categoryId: 6,
            questId: 13006,
            oddsId: 2
        },
        {
            categoryId: 6,
            questId: 14001,
            oddsId: 4
        },
        {
            categoryId: 6,
            questId: 14002,
            oddsId: 3
        },
        {
            categoryId: 6,
            questId: 14003,
            oddsId: 6
        },
        {
            categoryId: 6,
            questId: 14004,
            oddsId: 5
        },
        {
            categoryId: 6,
            questId: 14005,
            oddsId: 8
        },
        {
            categoryId: 6,
            questId: 14006,
            oddsId: 6
        },
        {
            categoryId: 6,
            questId: 15001,
            oddsId: 6
        },
        {
            categoryId: 6,
            questId: 15002,
            oddsId: 3
        },
        {
            categoryId: 6,
            questId: 15003,
            oddsId: 5
        },
        {
            categoryId: 6,
            questId: 15004,
            oddsId: 4
        },
        {
            categoryId: 6,
            questId: 15005,
            oddsId: 7
        },
        {
            categoryId: 6,
            oddsId: 5,
            questId: 15006
        },
        {
            categoryId: 6,
            questId: 16001,
            oddsId: 1
        },
        {
            categoryId: 6,
            questId: 16002,
            oddsId: 8
        },
        {
            categoryId: 6,
            questId: 16003,
            oddsId: 3
        },
        {
            categoryId: 6,
            questId: 16004,
            oddsId: 6
        },
        {
            categoryId: 6,
            questId: 16005,
            oddsId: 1
        },
        {
            categoryId: 6,
            questId: 16006,
            oddsId: 9
        },
        {
            categoryId: 6,
            questId: 17001,
            oddsId: 6
        },
        {
            categoryId: 6,
            questId: 17002,
            oddsId: 8
        },
        {
            categoryId: 6,
            questId: 17003,
            oddsId: 2
        },
        {
            categoryId: 6,
            questId: 17004,
            oddsId: 3
        },
        {
            categoryId: 6,
            questId: 17005,
            oddsId: 7
        },
        {
            categoryId: 6,
            questId: 17006,
            oddsId: 6
        },
        {
            categoryId: 6,
            questId: 18001,
            oddsId: 8
        },
        {
            categoryId: 6,
            questId: 18002,
            oddsId: 3
        },
        {
            categoryId: 6,
            questId: 18003,
            oddsId: 4
        },
        {
            categoryId: 6,
            questId: 18004,
            oddsId: 3
        },
        {
            categoryId: 6,
            questId: 18005,
            oddsId: 4
        },
        {
            categoryId: 6,
            questId: 18006,
            oddsId: 6
        },
        {
            categoryId: 6,
            questId: 19001,
            oddsId: 6
        },
        {
            categoryId: 6,
            questId: 19002,
            oddsId: 7
        },
        {
            categoryId: 6,
            questId: 19003,
            oddsId: 3
        },
        {
            categoryId: 6,
            questId: 19004,
            oddsId: 3
        },
        {
            categoryId: 6,
            questId: 19005,
            oddsId: 2
        },
        {
            categoryId: 6,
            questId: 19006,
            oddsId: 1
        },
        {
            categoryId: 6,
            questId: 19007,
            oddsId: 7
        },
        {
            categoryId: 6,
            questId: 19008,
            oddsId: 7
        },
        {
            categoryId: 6,
            questId: 19009,
            oddsId: 5
        },
        {
            categoryId: 6,
            questId: 19010,
            oddsId: 2
        },
        {
            categoryId: 6,
            questId: 19011,
            oddsId: 2
        },
        {
            categoryId: 6,
            questId: 19012,
            oddsId: 9
        },
        {
            categoryId: 6,
            questId: 19013,
            oddsId: 4
        },
        {
            categoryId: 6,
            questId: 19014,
            oddsId: 8
        },
        {
            categoryId: 6,
            questId: 19015,
            oddsId: 1
        },
        {
            categoryId: 6,
            questId: 19016,
            oddsId: 1
        },
        {
            categoryId: 6,
            questId: 19017,
            oddsId: 6
        },
        {
            categoryId: 6,
            questId: 19018,
            oddsId: 4
        },
        {
            categoryId: 14,
            questId: 1001,
            oddsId: 21
        },
        {
            categoryId: 14,
            questId: 1002,
            oddsId: 30
        },
        {
            categoryId: 14,
            questId: 1003,
            oddsId: 20
        },
        {
            categoryId: 14,
            questId: 1004,
            oddsId: 27
        },
        {
            categoryId: 14,
            questId: 1005,
            oddsId: 9
        },
        {
            categoryId: 14,
            questId: 1006,
            oddsId: 35
        },
    ]);
    // insert periodicReward
    (0, campaign_1.insertPlayerPeriodicRewardPointsListSync)(playerId, [
        {
            id: 1,
            point: 22,
        },
        {
            id: 2,
            point: 2,
        },
        {
            id: 3,
            point: 2,
        },
        {
            id: 10000000,
            point: 2,
        },
    ]);
    // insert active missions
    (0, mission_1.insertPlayerActiveMissionsSync)(playerId, {});
    // insert box gacha
    (0, boxGacha_1.insertPlayerBoxGachasSync)(playerId, {
        "1001": [
            {
                boxId: 1,
                resetTimes: 0,
                remainingNumber: 572,
                isClosed: false
            },
            {
                boxId: 2,
                resetTimes: 0,
                remainingNumber: 647,
                isClosed: false
            },
            {
                boxId: 3,
                resetTimes: 0,
                remainingNumber: 732,
                isClosed: false
            },
            {
                boxId: 4,
                resetTimes: 0,
                remainingNumber: 912,
                isClosed: false
            },
            {
                boxId: 5,
                resetTimes: 0,
                remainingNumber: 1401,
                isClosed: false
            },
        ]
    });
    // insert start dash campaign list
    (0, campaign_1.insertPlayerStartDashExchangeCampaignsSync)(playerId, []);
    // insert the multi special exchange campaign list
    (0, campaign_1.insertPlayerMultiSpecialExchangeCampaignsSync)(playerId, [
        {
            campaignId: 3,
            status: 1
        }
    ]);
    const finalPlayer = player;
    finalPlayer.id = playerId;
    return finalPlayer;
}
exports.insertDefaultPlayerSync = insertDefaultPlayerSync;
/**
 * Updates a player within the database.
 *
 * @param player The properties of the player to change. Id must always be present.
 */
function updatePlayerSync(player) {
    const id = player.id;
    const fieldMap = {
        'stamina': 'stamina',
        'staminaHealTime': 'stamina_heal_time',
        'boostPoint': 'boost_point',
        'bossBoostPoint': 'boss_boost_point',
        'transitionState': 'transition_state',
        'role': 'role',
        'name': 'name',
        'lastLoginTime': 'last_login_time',
        'comment': 'comment',
        'vmoney': 'vmoney',
        'freeVmoney': 'free_vmoney',
        'rankPoint': 'rank_point',
        'starCrumb': 'star_crumb',
        'bondToken': 'bond_token',
        'expPool': 'exp_pool',
        'expPooledTime': 'exp_pooled_time',
        'leaderCharacterId': 'leader_character_id',
        'partySlot': 'party_slot',
        'degreeId': 'degree_id',
        'birth': 'birth',
        'freeMana': 'free_mana',
        'paidMana': 'paid_mana',
        'enableAuto3x': 'enable_auto_3x',
        'tutorialStep': 'tutorial_step',
        'tutorialSkipFlag': 'tutorial_skip_flag',
        'tutorialGachaCharacterId': 'tutorial_gacha_character_id'
    };
    const sets = [];
    const values = [];
    for (const key in player) {
        const value = player[key];
        const mapped = fieldMap[key];
        if (mapped && value !== undefined) {
            sets.push(`${mapped} = ?`);
            if (value instanceof Date) {
                values.push(value.toISOString());
            }
            else if (typeof (value) === 'boolean') {
                values.push((0, utils_2.serializeBoolean)(value));
            }
            else {
                values.push(value);
            }
        }
    }
    if (sets.length > 0)
        (0, db_1.getDb)().prepare(`
        UPDATE players
        SET ${sets.join(', ')}
        WHERE id = ?
        `).run([...values, id]);
}
exports.updatePlayerSync = updatePlayerSync;
/**
 * Replaces a player's data with the provided MergedPlayerData object.
 *
 * @param replaceWith The MergedPlayerData to replace.
 */
function replacePlayerDataSync(replaceWith) {
    try {
        const playerId = replaceWith.player.id;
        const account = getAccountFromPlayerIdSync(playerId);
        if (account === null)
            throw new Error("No account tied to player id.");
        // delete player
        deletePlayerSync(playerId);
        // insert new
        insertMergedPlayerDataSync(account.id, replaceWith);
    }
    catch (error) {
        console.error(error);
        throw error;
    }
}
exports.replacePlayerDataSync = replacePlayerDataSync;
/**
 * Deletes a player from the database completely.
 *
 * @param playerId The ID of the player to delete
 */
function deletePlayerSync(playerId) {
    (0, db_1.getDb)().prepare(`DELETE FROM players WHERE id = ?`).run(playerId);
}
exports.deletePlayerSync = deletePlayerSync;
function collectPlayerDataPooledExpSync(player, dateNow = new Date()) {
    const serverTimeNow = (0, utils_1.getServerTime)(dateNow);
    const poolTime = (0, utils_1.getServerTime)(player.expPooledTime);
    const diff = Math.max(0, serverTimeNow - poolTime);
    if (60 > diff)
        return;
    updatePlayerSync({
        id: player.id,
        expPooledTime: dateNow,
        expPool: player.expPool + Math.min(expPoolMax, Math.floor(diff / 60))
    });
}
exports.collectPlayerDataPooledExpSync = collectPlayerDataPooledExpSync;
/**
 * Collects any pooled exp that a player might have.
 * Exp regenerates at a rate of 1 per minute.
 *
 * @param playerId The ID of the player to collect the pooled EXP of.
 */
function collectPlayerPooledExpSync(playerId) {
    // exp regenerates at a rate of 1/min
    const playerData = getPlayerSync(playerId);
    if (!playerData)
        return;
    collectPlayerDataPooledExpSync(playerData);
}
exports.collectPlayerPooledExpSync = collectPlayerPooledExpSync;
/**
 * Performs a daily reset for a a player data object.
 *
 * @param player The player data to perform the daily reset for
 * @param loginDate
 * @returns A boolean; whether the daily reset was performed
 */
function dailyResetPlayerDataSync(player, loginDate = new Date()) {
    var _a;
    const lastLoginTime = player.lastLoginTime;
    const playerId = player.id;
    if ((loginDate.getUTCFullYear() > lastLoginTime.getUTCFullYear()) || (loginDate.getUTCMonth() > lastLoginTime.getUTCMonth()) || (loginDate.getUTCDate() > lastLoginTime.getUTCDate())) {
        // TODO: daily reset logic.
        updatePlayerSync({
            id: playerId,
            lastLoginTime: loginDate,
            bossBoostPoint: 3,
            boostPoint: 3
        });
        // Reset daily challenge points — sync with CDN and rebuild if missing
        const dcEntries = getPlayerDailyChallengePointListSync(playerId);
        const defaults = getDailyChallengePointDefaults();
        if (dcEntries.length === 0) {
            insertPlayerDailyChallengePointListSync(playerId, defaults);
        }
        else {
            // Reset existing entries to CDN max
            for (const entry of dcEntries) {
                const cdn = daily_challenge_point_lookup_json_1.default[String(entry.id)];
                const maxPoint = (_a = cdn === null || cdn === void 0 ? void 0 : cdn.maxPoint) !== null && _a !== void 0 ? _a : entry.point;
                updatePlayerDailyChallengePointSync(playerId, entry.id, maxPoint + entry.campaignList.reduce((s, c) => s + c.additionalPoint, 0));
            }
            // Add any new CDN entries not yet in player's list
            const existingIds = new Set(dcEntries.map(e => e.id));
            const missing = defaults.filter(e => !existingIds.has(e.id));
            if (missing.length > 0) {
                insertPlayerDailyChallengePointListSync(playerId, missing);
            }
        }
        // reset gacha "isDailyFirst" values.
        const gachaInfo = (0, gacha_1.getPlayerGachaInfoListSync)(playerId);
        for (const gacha of gachaInfo) {
            (0, gacha_1.updatePlayerGachaInfoSync)(playerId, {
                gachaId: gacha.gachaId,
                isDailyFirst: true
            });
        }
        // reset campaigns
        const gachaCampaigns = (0, gacha_1.getPlayerGachaCampaignListSync)(playerId);
        for (const campaign of gachaCampaigns) {
            (0, gacha_1.updatePlayerGachaCampaignSync)(playerId, campaign.gachaId, campaign.campaignId, 1);
        }
        // weekly reset
        if (loginDate.getUTCDay() === 0) {
        }
        // monthly reset
        if (loginDate.getUTCDate() === 1) {
        }
        return true;
    }
    else {
        updatePlayerSync({
            id: playerId,
            lastLoginTime: loginDate,
        });
        return false;
    }
}
exports.dailyResetPlayerDataSync = dailyResetPlayerDataSync;
/**
 * Performs a daily reset for a player
 *
 * @param playerId The ID of the player to perform the daily reset for.
 * @returns A boolean; whether the daily reset was performed
 */
function dailyResetPlayerSync(playerId) {
    const playerData = getPlayerSync(playerId);
    if (!playerData)
        return false;
    return dailyResetPlayerDataSync(playerData);
}
exports.dailyResetPlayerSync = dailyResetPlayerSync;
