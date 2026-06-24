"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.insertActiveQuest = exports.activeQuests = void 0;
const wdfpData_1 = require("../../data/wdfpData");
const assets_1 = require("../../lib/assets");
const character_1 = require("../../lib/character");
const quest_1 = require("../../lib/quest");
const types_1 = require("../../lib/types");
const utils_1 = require("../../utils");
const rushEvent_1 = require("./rushEvent");
const types_2 = require("../../data/types");
const activeAccount_1 = require("../../data/activeAccount");
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const quest_entry_costs_json_1 = __importDefault(require("../../../assets/quest_entry_costs.json"));
const score_attack_border_reward_json_1 = __importDefault(require("../../../assets/score_attack_border_reward.json"));
const event_challenge_point_map_json_1 = __importDefault(require("../../../assets/event_challenge_point_map.json"));
// Load carnival quest score data
let carnivalScoreLookup = {};
try {
    const scorePath = path_1.default.join(process.cwd(), "assets", "carnival_event_quest_scores.json");
    if ((0, fs_1.existsSync)(scorePath)) {
        carnivalScoreLookup = JSON.parse((0, fs_1.readFileSync)(scorePath, "utf-8"));
    }
}
catch (_a) { } // Init failed silently; carnival scoring won't work
const rush_1 = require("../../lib/rush");
const continueVmoneyCost = 50;
exports.activeQuests = {};
function insertActiveQuest(playerId, quest) {
    var _a, _b, _c;
    exports.activeQuests[playerId] = quest;
    // Persist to DB for battle recovery across server restarts
    (0, wdfpData_1.insertPlayerActiveQuestSync)(playerId, {
        playerId,
        playId: quest.playId,
        questId: quest.questId,
        category: quest.category,
        useBossBoostPoint: quest.useBossBoostPoint,
        useBoostPoint: quest.useBoostPoint,
        isAutoStartMode: quest.isAutoStartMode,
        isMulti: quest.isMulti,
        roomNumber: (_a = quest.roomNumber) !== null && _a !== void 0 ? _a : null,
        entryItemId: (_b = quest.entryItemId) !== null && _b !== void 0 ? _b : null,
        eventId: (_c = quest.eventId) !== null && _c !== void 0 ? _c : null,
        continueCount: quest.continueCount
    });
}
exports.insertActiveQuest = insertActiveQuest;
const routes = (fastify) => __awaiter(void 0, void 0, void 0, function* () {
    fastify.post("/finish", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        var _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w;
        const body = request.body;
        const viewerId = body.viewer_id;
        if (!viewerId || isNaN(viewerId))
            return reply.status(400).send({
                "error": "Bad Request",
                "message": "Invalid request body."
            });
        const viewerIdSession = yield (0, wdfpData_1.getSession)(viewerId.toString());
        if (!viewerIdSession)
            return reply.status(400).send({
                "error": "Bad Request",
                "message": "Invalid viewer id."
            });
        // get player
        const playerId = (0, activeAccount_1.resolvePlayerIdSync)(viewerIdSession.accountId);
        const playerData = playerId !== null ? (0, wdfpData_1.getPlayerSync)(playerId) : null;
        if (playerData === null)
            return reply.status(500).send({
                "error": "Internal Server Error",
                "message": "No player bound to account."
            });
        // get active quest data
        const activeQuestData = exports.activeQuests[playerId];
        console.log(`[FINISH] req: playerId=${playerId} questId=${body.quest_id} category=${body.category} activeExists=${activeQuestData !== undefined} multi=${(_b = activeQuestData === null || activeQuestData === void 0 ? void 0 : activeQuestData.isMulti) !== null && _b !== void 0 ? _b : false}`);
        if (activeQuestData === undefined)
            return reply.status(400).send({
                "error": "Bad Request",
                "message": "No active quest to finish."
            });
        const questCategory = activeQuestData.category;
        const questId = activeQuestData.questId;
        console.log(`[FINISH] active: category=${questCategory} questId=${questId}`);
        const questData = (0, assets_1.getQuestFromCategorySync)(questCategory, questId);
        if (questData === null || !('rankPointReward' in questData)) {
            console.log(`[BATTLE] finish failed: category=${questCategory} questId=${questId} found=${!!questData} hasRankReward=${questData ? ('rankPointReward' in questData) : 'N/A'}`);
            return reply.status(400).send({
                "error": "Bad Request",
                "message": "Quest doesn't exist."
            });
        }
        // delete the active quest data from global record
        delete exports.activeQuests[playerId];
        (0, wdfpData_1.deletePlayerActiveQuestSync)(playerId);
        // calculate clear rank (only if quest has rank time thresholds)
        const clearTime = body.elapsed_time_ms;
        const hasRankThresholds = questData.bRankTime > 0;
        const clearRank = hasRankThresholds ? (questData.sPlusRankTime >= clearTime ? 5
            : questData.sRankTime >= clearTime ? 4
                : questData.aRankTime >= clearTime ? 3
                    : questData.bRankTime >= clearTime ? 2
                        : 1) : null;
        // calculate player rewards
        const newExpPool = playerData.expPool + questData.poolExpReward;
        const beforeRankPoint = playerData.rankPoint;
        const newRankPoint = beforeRankPoint + questData.rankPointReward;
        let newMana = playerData.freeMana + questData.manaReward + body.add_mana;
        // calculate boost point
        let newBoostPoint = playerData.boostPoint - (activeQuestData.useBoostPoint ? 1 : 0);
        let newBossBoostPoint = playerData.bossBoostPoint - (activeQuestData.useBossBoostPoint ? 1 : 0);
        let useBoostPoint = (activeQuestData.useBoostPoint && (newBoostPoint >= 0)) || (activeQuestData.useBossBoostPoint && (newBossBoostPoint >= 0));
        // check current quest progress
        const questProgress = (0, wdfpData_1.getPlayerSingleQuestProgressSync)(playerId, questCategory, questId);
        const questPreviouslyCompleted = questProgress !== null;
        // Score attack: accomplished determined by border reward minimum tier (from CDN)
        let questAccomplished = body.is_accomplished;
        if (questCategory === types_1.QuestCategory.SCORE_ATTACK_EVENT) {
            const eventId = questData.eventId;
            const folderId = questData.folderId;
            if (eventId !== undefined && folderId !== undefined) {
                const borderTiers = score_attack_border_reward_json_1.default[`${eventId}_${folderId}`];
                if (borderTiers && borderTiers.length > 0) {
                    questAccomplished = body.score >= borderTiers[0].score;
                }
            }
        }
        const clearReward = !questPreviouslyCompleted && questData.clearReward !== undefined ? (0, quest_1.givePlayerRewardSync)(playerId, questData.clearReward) : null;
        const sPlusClearReward = (clearRank === 5) && ((questProgress === null || questProgress === void 0 ? void 0 : questProgress.clearRank) !== 5) && (questData.sPlusReward !== undefined) ? (0, quest_1.givePlayerRewardSync)(playerId, questData.sPlusReward) : null;
        if (questAccomplished) {
            // update quest progress
            if (questPreviouslyCompleted) {
                // simply update the quest progress if it already exists.
                const updateData = {
                    questId: questId,
                    finished: true,
                    bestElapsedTimeMs: questProgress.bestElapsedTimeMs === undefined || questProgress.bestElapsedTimeMs === null ? clearTime : Math.min(clearTime, questProgress.bestElapsedTimeMs),
                    highScore: questProgress.highScore === undefined ? body.score : Math.max(body.score, questProgress.highScore)
                };
                if (clearRank !== null) {
                    updateData.clearRank = questProgress.clearRank === undefined ? clearRank : Math.max(clearRank, questProgress.clearRank);
                }
                (0, wdfpData_1.updatePlayerQuestProgressSync)(playerId, questCategory, updateData);
            }
            else {
                // insert if it doesn't already exist.
                const insertData = {
                    questId: questId,
                    finished: true,
                    bestElapsedTimeMs: clearTime,
                    highScore: body.score,
                    clearRank: clearRank !== null && clearRank !== void 0 ? clearRank : 5 // default S+ for quests without rank thresholds
                };
                (0, wdfpData_1.insertPlayerQuestProgressSync)(playerId, questCategory, insertData);
            }
        }
        // update player
        (0, wdfpData_1.updatePlayerSync)({
            id: playerId,
            freeMana: newMana,
            expPool: newExpPool,
            rankPoint: newRankPoint,
            boostPoint: newBoostPoint,
            bossBoostPoint: newBossBoostPoint
        });
        // Consume daily challenge point
        let dailyChallengePointList = null;
        if (questCategory === types_1.QuestCategory.EXPERT_SINGLE_EVENT && questData.eventId) {
            const cpKey = `expert_${questData.eventId}`;
            const challengePointId = event_challenge_point_map_json_1.default[cpKey];
            if (challengePointId) {
                const entries = (0, wdfpData_1.getPlayerDailyChallengePointListSync)(playerId);
                const entry = entries.find(e => e.id === challengePointId);
                if (entry && entry.point > 0) {
                    (0, wdfpData_1.updatePlayerDailyChallengePointSync)(playerId, challengePointId, entry.point - 1);
                    console.log(`[BATTLE] challengePoint consumed: id=${challengePointId} old=${entry.point} new=${entry.point - 1}`);
                }
                // Serialize for response
                dailyChallengePointList = entries.map(e => ({
                    "id": e.id,
                    "point": e.id === challengePointId ? Math.max(0, e.point - 1) : e.point,
                    "campaign_list": e.campaignList.map(c => ({
                        "campaign_id": c.campaignId,
                        "additional_point": c.additionalPoint
                    }))
                }));
            }
        }
        // reward score rewards
        if (questCategory === types_1.QuestCategory.SCORE_ATTACK_EVENT) {
            console.log(`[SCORE_ATTACK] questId=${questId} body={score:${body.score}, elapsed:${body.elapsed_time_ms}, accomplished:${body.is_accomplished}, addMana:${body.add_mana}, continue:${body.continue_count}}`);
            console.log(`[SCORE_ATTACK] questData={groupId:${questData.scoreRewardGroupId}, groupLen:${(_d = (_c = questData.scoreRewardGroup) === null || _c === void 0 ? void 0 : _c.length) !== null && _d !== void 0 ? _d : 'null'}, bRank:${questData.bRankTime}, aRank:${questData.aRankTime}, sRank:${questData.sRankTime}, sPlus:${questData.sPlusRankTime}, rankPt:${questData.rankPointReward}, charExp:${questData.characterExpReward}, mana:${questData.manaReward}, poolExp:${questData.poolExpReward}, clearReward:${(_f = (_e = questData.clearReward) === null || _e === void 0 ? void 0 : _e.id) !== null && _f !== void 0 ? _f : 'none'}}`);
        }
        console.log(`[BATTLE] scoreReward groupId=${questData.scoreRewardGroupId} groupLen=${(_h = (_g = questData.scoreRewardGroup) === null || _g === void 0 ? void 0 : _g.length) !== null && _h !== void 0 ? _h : 'null'} questId=${questId} category=${questCategory}`);
        const scoreRewardsResult = (0, quest_1.givePlayerScoreRewardsSync)(playerId, questData.scoreRewardGroupId, questData.scoreRewardGroup, useBoostPoint, questData.element);
        let scoreAttackRewardIds = [];
        if (questCategory === types_1.QuestCategory.SCORE_ATTACK_EVENT) {
            // Look up border rewards for score attack events
            const eventId = questData.eventId;
            const folderId = questData.folderId;
            if (eventId !== undefined && folderId !== undefined) {
                const borderKey = `${eventId}_${folderId}`;
                const borderTiers = score_attack_border_reward_json_1.default[borderKey];
                if (borderTiers) {
                    // Find highest tier the player's score qualifies for
                    let matched = null;
                    for (const tier of borderTiers) {
                        if (body.score >= tier.score) {
                            matched = tier;
                        }
                    }
                    if (matched) {
                        console.log(`[SCORE_ATTACK] borderReward matched: score=${body.score} tierScore=${matched.score} coinItem=${matched.coinItemId}x${matched.coinCount}`);
                        // Give coin item only (rewardItemId=16001 does not exist in CDN)
                        if (matched.coinItemId > 0 && matched.coinCount > 0) {
                            (0, wdfpData_1.givePlayerItemSync)(playerId, matched.coinItemId, matched.coinCount);
                            scoreRewardsResult.items[String(matched.coinItemId)] = ((_j = scoreRewardsResult.items[String(matched.coinItemId)]) !== null && _j !== void 0 ? _j : 0) + matched.coinCount;
                            scoreAttackRewardIds.push(matched.coinItemId);
                        }
                    }
                }
            }
            console.log(`[SCORE_ATTACK] afterReward: dropIds=${JSON.stringify(scoreRewardsResult.drop_score_reward_ids)}, drops=${scoreRewardsResult.drop_score_reward_ids.length}, items=${JSON.stringify(scoreRewardsResult.items)}, equipList=${(_l = (_k = scoreRewardsResult.equipment_list) === null || _k === void 0 ? void 0 : _k.length) !== null && _l !== void 0 ? _l : 0}`);
            console.log(`[SCORE_ATTACK] response: accomplished=${questAccomplished}, clearRank=${clearRank}, score=${body.score}, elapsed=${body.elapsed_time_ms}, items=${JSON.stringify(scoreRewardsResult.items)}, clientCategory=${questCategory}`);
        }
        // reward character exp
        const bodyPartyStatistics = body.statistics.party;
        const partyCharacterIds = [...bodyPartyStatistics.characters, ...bodyPartyStatistics.unison_characters];
        const partyCharacterIdsArray = [];
        for (const value of partyCharacterIds.values()) {
            if (value !== null && value.id !== null)
                partyCharacterIdsArray.push(value.id);
        }
        const addExpAmount = questData.characterExpReward;
        const rewardCharacterExpResult = (0, character_1.givePlayerCharactersExpSync)(playerId, partyCharacterIdsArray, addExpAmount, questData.fixedParty !== undefined);
        const dataHeaders = (0, utils_1.generateDataHeaders)({
            viewer_id: viewerId
        });
        // handle event quest-specific data & rewards
        let rushEventData = null;
        let rushEventRewardsResult = null;
        if (questCategory === types_1.QuestCategory.RUSH_EVENT) {
            // rush event
            const rushEventId = questData.rushEventId;
            const rushEventFolderId = questData.rushEventFolderId;
            const rushEventRound = questData.rushEventRound;
            console.log(`[RUSH] finish: playerId=${playerId} eventId=${rushEventId} folderId=${rushEventFolderId} round=${rushEventRound} clearTime=${clearTime}`);
            if (rushEventFolderId !== undefined && rushEventRound !== undefined && rushEventId !== undefined) {
                // update rush event data
                const rushEventBattleType = rushEventRound === 0 ? types_2.RushEventBattleType.ENDLESS : types_2.RushEventBattleType.FOLDER;
                // map character ids
                const characterIds = bodyPartyStatistics.characters.map(val => { var _a; return (_a = val === null || val === void 0 ? void 0 : val.id) !== null && _a !== void 0 ? _a : null; });
                const unisonCharacterIds = bodyPartyStatistics.unison_characters.map(val => { var _a; return (_a = val === null || val === void 0 ? void 0 : val.id) !== null && _a !== void 0 ? _a : null; });
                // get evolution image levels
                const evolutionImgLevels = (0, character_1.getCharactersEvolutionImgLevels)(playerId, characterIds);
                const unisonEvolutionImgLevels = (0, character_1.getCharactersEvolutionImgLevels)(playerId, unisonCharacterIds);
                let round = questId;
                // update endless battle stats
                let oldEndlessMaxRound = null;
                let oldBestElapsedTimeMs = null;
                let newEndlessMaxRound = null;
                let newEndlessNextRound = null;
                let newBestElapsedTimeMs = null;
                if (rushEventBattleType === types_2.RushEventBattleType.ENDLESS) {
                    // get player rush event data
                    const playerRushEventData = (0, wdfpData_1.getPlayerRushEventSync)(playerId, rushEventId);
                    const playerNextRound = (_m = playerRushEventData === null || playerRushEventData === void 0 ? void 0 : playerRushEventData.endlessBattleNextRound) !== null && _m !== void 0 ? _m : 1;
                    const playerMaxRound = (_o = playerRushEventData === null || playerRushEventData === void 0 ? void 0 : playerRushEventData.endlessBattleMaxRound) !== null && _o !== void 0 ? _o : 1;
                    const playerBestClearTime = (_p = playerRushEventData === null || playerRushEventData === void 0 ? void 0 : playerRushEventData.endlessBattleMaxRoundTime) !== null && _p !== void 0 ? _p : Number.MAX_SAFE_INTEGER;
                    round = playerNextRound;
                    // Capture old values before update
                    oldEndlessMaxRound = playerMaxRound;
                    oldBestElapsedTimeMs = playerBestClearTime < Number.MAX_SAFE_INTEGER ? playerBestClearTime : null;
                    const isNewRecord = (playerNextRound >= playerMaxRound && playerBestClearTime >= clearTime) || (playerNextRound > playerMaxRound);
                    if (isNewRecord) {
                        console.log(`[RUSH] finish: ENDLESS NEW RECORD! round=${playerNextRound} time=${clearTime}`);
                        (0, wdfpData_1.updatePlayerRushEventSync)(playerId, {
                            eventId: rushEventId,
                            endlessBattleMaxRound: playerNextRound,
                            endlessBattleMaxRoundTime: clearTime,
                            endlessBattleMaxRoundCharacterIds: characterIds,
                            endlessBattleMaxRoundCharacterEvolutionImgLvls: evolutionImgLevels
                        });
                        newEndlessMaxRound = playerNextRound;
                        newBestElapsedTimeMs = clearTime;
                    }
                    else {
                        newEndlessMaxRound = playerMaxRound;
                        newBestElapsedTimeMs = playerBestClearTime < Number.MAX_SAFE_INTEGER ? playerBestClearTime : null;
                    }
                    newEndlessNextRound = playerNextRound + 1;
                    // always record played party for endless
                    (0, wdfpData_1.insertPlayerRushEventPlayedPartySync)(playerId, rushEventId, {
                        characterIds, unisonCharacterIds,
                        equipmentIds: bodyPartyStatistics.equipments.map(val => { var _a; return (_a = val === null || val === void 0 ? void 0 : val.id) !== null && _a !== void 0 ? _a : null; }),
                        abilitySoulIds: bodyPartyStatistics.ability_soul_ids,
                        evolutionImgLevels, unisonEvolutionImgLevels,
                        battleType: rushEventBattleType, round
                    });
                }
                else if (rushEventBattleType === types_2.RushEventBattleType.FOLDER) {
                    const isFolderFinal = rushEventRound >= ((_q = rushEvent_1.rushEventFolderMaxRounds[rushEventFolderId]) !== null && _q !== void 0 ? _q : 0);
                    if (isFolderFinal) {
                        // mark folder as complete
                        (0, wdfpData_1.insertPlayerRushEventClearedFolderSync)(playerId, rushEventId, rushEventFolderId);
                        (0, wdfpData_1.updatePlayerRushEventSync)(playerId, { eventId: rushEventId, activeRushBattleFolderId: null });
                        (0, wdfpData_1.deletePlayerRushEventPlayedPartyListSync)(playerId, rushEventId, rushEventBattleType);
                    }
                    else {
                        // record played party for non-final rounds
                        (0, wdfpData_1.insertPlayerRushEventPlayedPartySync)(playerId, rushEventId, {
                            characterIds, unisonCharacterIds,
                            equipmentIds: bodyPartyStatistics.equipments.map(val => { var _a; return (_a = val === null || val === void 0 ? void 0 : val.id) !== null && _a !== void 0 ? _a : null; }),
                            abilitySoulIds: bodyPartyStatistics.ability_soul_ids,
                            evolutionImgLevels, unisonEvolutionImgLevels,
                            battleType: rushEventBattleType, round
                        });
                    }
                }
                // get serialized parties
                const serializedPlayedParties = (0, rush_1.getSerializedPlayerRushEventPlayedPartiesSync)(playerId, rushEventId);
                // set rush event data
                const isEndless = rushEventBattleType === types_2.RushEventBattleType.ENDLESS;
                rushEventData = {
                    "rush_battle_reward_list": [],
                    "rush_battle_played_party_list": serializedPlayedParties.folderParties,
                    "endless_battle_played_party_list": serializedPlayedParties.endlessParties,
                    "is_out_of_period": false,
                    "endless_battle_next_round": isEndless ? newEndlessNextRound : null,
                    "endless_battle_max_round": isEndless ? newEndlessMaxRound : null,
                    "high_score": isEndless ? clearTime : null,
                    "best_elapsed_time_ms": isEndless ? newBestElapsedTimeMs : null,
                    "old_endless_battle_max_round": isEndless ? oldEndlessMaxRound : null,
                    "old_best_elapsed_time_ms": isEndless ? oldBestElapsedTimeMs : null
                };
                // give rewards if allowed (FOLDER only, not ENDLESS)
                if (rushEventBattleType === types_2.RushEventBattleType.FOLDER && rushEventRound >= ((_r = rushEvent_1.rushEventFolderMaxRounds[rushEventFolderId]) !== null && _r !== void 0 ? _r : 0)) {
                    const rewards = (_s = (0, assets_1.getRushEventFolderClearRewards)(rushEventId, rushEventFolderId)) !== null && _s !== void 0 ? _s : [];
                    console.log(`[RUSH] finish: folder clear! rewards=${rewards.length} items`);
                    rushEventRewardsResult = (0, quest_1.givePlayerRewardsSync)(playerId, rewards);
                    rushEventData.rush_battle_reward_list = rewards.map(reward => {
                        const itemReward = reward;
                        return {
                            "kind": 1,
                            "kind_id": itemReward.id,
                            "number": itemReward.count
                        };
                    });
                }
            }
        }
        // Record played party for RAID_EVENT
        if (questCategory === types_1.QuestCategory.RAID_EVENT && activeQuestData.eventId) {
            const eventId = activeQuestData.eventId;
            const characterIds = bodyPartyStatistics.characters.map(val => { var _a; return (_a = val === null || val === void 0 ? void 0 : val.id) !== null && _a !== void 0 ? _a : null; });
            const unisonCharacterIds = bodyPartyStatistics.unison_characters.map(val => { var _a; return (_a = val === null || val === void 0 ? void 0 : val.id) !== null && _a !== void 0 ? _a : null; });
            const evolutionImgLevels = (0, character_1.getCharactersEvolutionImgLevels)(playerId, characterIds);
            const unisonEvolutionImgLevels = (0, character_1.getCharactersEvolutionImgLevels)(playerId, unisonCharacterIds);
            (0, wdfpData_1.insertPlayerRushEventPlayedPartySync)(playerId, eventId, {
                characterIds, unisonCharacterIds,
                equipmentIds: bodyPartyStatistics.equipments.map(val => { var _a; return (_a = val === null || val === void 0 ? void 0 : val.id) !== null && _a !== void 0 ? _a : null; }),
                abilitySoulIds: bodyPartyStatistics.ability_soul_ids,
                evolutionImgLevels,
                unisonEvolutionImgLevels,
                battleType: types_2.RushEventBattleType.FOLDER,
                round: questId
            });
            console.log(`[RAID] recorded played party: eventId=${eventId} questId=${questId}`);
        }
        // handle carnival event score & records
        let carnivalEventData = null;
        if (questCategory === types_1.QuestCategory.CARNIVAL_EVENT && questAccomplished) {
            const carnivalInfo = carnivalScoreLookup[String(questId)];
            if (carnivalInfo) {
                const characterIds = bodyPartyStatistics.characters.map((v) => { var _a; return (_a = v === null || v === void 0 ? void 0 : v.id) !== null && _a !== void 0 ? _a : null; });
                const unisonCharacterIds = bodyPartyStatistics.unison_characters.map((v) => { var _a; return (_a = v === null || v === void 0 ? void 0 : v.id) !== null && _a !== void 0 ? _a : null; });
                const leaderCharId = (_u = (_t = bodyPartyStatistics.leader) === null || _t === void 0 ? void 0 : _t.id) !== null && _u !== void 0 ? _u : 0;
                const difficultyBonus = carnivalInfo.difficulty_score * 100;
                const timeBonus = Math.max(0, carnivalInfo.time_limit_ms - clearTime);
                const totalScore = difficultyBonus + timeBonus;
                (0, wdfpData_1.upsertPlayerCarnivalEventRecordSync)(playerId, carnivalInfo.event_id, carnivalInfo.folder_id, totalScore, characterIds, unisonCharacterIds);
                // Build carnival_event response for client
                const previousTotalBest = carnivalEventData === null ? 0 : 0; // simplified: no previous total
                carnivalEventData = {
                    is_record_valid: true,
                    leader_character_id: leaderCharId,
                    new_degree_ids: [],
                    previous_total_best_score: previousTotalBest,
                    reward_ids: [],
                    score: {
                        difficulty_bonus: difficultyBonus,
                        time_bonus: timeBonus
                    }
                };
            }
        }
        reply.header("content-type", "application/x-msgpack");
        return reply.status(200).send({
            "data_headers": dataHeaders,
            "data": {
                "user_info": {
                    "free_mana": newMana + ((clearReward === null || clearReward === void 0 ? void 0 : clearReward.user_info.free_mana) || 0) + ((sPlusClearReward === null || sPlusClearReward === void 0 ? void 0 : sPlusClearReward.user_info.free_mana) || 0) + scoreRewardsResult.user_info.free_mana,
                    "exp_pool": rewardCharacterExpResult.exp_pool + ((clearReward === null || clearReward === void 0 ? void 0 : clearReward.user_info.exp_pool) || 0) + scoreRewardsResult.user_info.exp_pool,
                    "exp_pooled_time": (0, utils_1.getServerTime)(playerData.expPooledTime),
                    "free_vmoney": playerData.freeVmoney + ((clearReward === null || clearReward === void 0 ? void 0 : clearReward.user_info.free_vmoney) || 0) + ((sPlusClearReward === null || sPlusClearReward === void 0 ? void 0 : sPlusClearReward.user_info.free_vmoney) || 0) + scoreRewardsResult.user_info.free_vmoney,
                    "rank_point": newRankPoint,
                    "stamina": playerData.stamina,
                    "stamina_heal_time": (0, utils_1.getServerTime)(),
                    "boost_point": newBoostPoint,
                    "boss_boost_point": newBossBoostPoint
                },
                "add_exp_list": rewardCharacterExpResult.add_exp_list,
                "character_list": [
                    ...rewardCharacterExpResult.character_list,
                    ...((clearReward === null || clearReward === void 0 ? void 0 : clearReward.character_list) || []),
                    ...((sPlusClearReward === null || sPlusClearReward === void 0 ? void 0 : sPlusClearReward.character_list) || []),
                    ...scoreRewardsResult.character_list
                ],
                "bond_token_status_list": rewardCharacterExpResult.bond_token_status_list,
                "rewards": {
                    "overflow_pool_exp": 0,
                    "converted_pool_exp": 0,
                    "reward_pool_exp": questData.poolExpReward,
                    "reward_mana": questData.manaReward,
                    "field_mana": body.add_mana
                },
                "old_high_score": questProgress === null ? 0 : questProgress.highScore || 0,
                "joined_character_id_list": [
                    ...((clearReward === null || clearReward === void 0 ? void 0 : clearReward.joined_character_id_list) || []),
                    ...((sPlusClearReward === null || sPlusClearReward === void 0 ? void 0 : sPlusClearReward.joined_character_id_list) || []),
                    ...scoreRewardsResult.joined_character_id_list
                ],
                "before_rank_point": beforeRankPoint,
                "clear_rank": clearRank !== null && clearRank !== void 0 ? clearRank : 5,
                "drop_score_reward_ids": scoreRewardsResult.drop_score_reward_ids,
                "drop_rare_reward_ids": scoreRewardsResult.drop_rare_reward_ids,
                "drop_additional_reward_ids": [],
                "drop_periodic_reward_ids": [],
                "equipment_list": [
                    ...scoreRewardsResult.equipment_list,
                    ...((clearReward === null || clearReward === void 0 ? void 0 : clearReward.equipment_list) || []),
                    ...((sPlusClearReward === null || sPlusClearReward === void 0 ? void 0 : sPlusClearReward.equipment_list) || []),
                    ...((rushEventRewardsResult === null || rushEventRewardsResult === void 0 ? void 0 : rushEventRewardsResult.equipment_list) || [])
                ],
                "category_id": body.category,
                "start_time": dataHeaders['servertime'],
                "is_multi": "single",
                "quest_name": "",
                "item_list": Object.assign(Object.assign(Object.assign({}, (activeQuestData.entryItemId ? { [activeQuestData.entryItemId]: (_v = (0, wdfpData_1.getPlayerItemSync)(playerId, activeQuestData.entryItemId)) !== null && _v !== void 0 ? _v : 0 } : {})), scoreRewardsResult.items), ((_w = rushEventRewardsResult === null || rushEventRewardsResult === void 0 ? void 0 : rushEventRewardsResult.items) !== null && _w !== void 0 ? _w : {})),
                "rush_event": rushEventData,
                "carnival_event": carnivalEventData,
                "user_daily_challenge_point_list": dailyChallengePointList !== null && dailyChallengePointList !== void 0 ? dailyChallengePointList : [],
                "presigned_quest_category": []
            }
        });
    }));
    fastify.post("/abort", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        const body = request.body;
        const viewerId = body.viewer_id;
        if (isNaN(viewerId))
            return reply.status(400).send({
                "error": "Bad Request",
                "message": "Invalid request body."
            });
        const viewerIdSession = yield (0, wdfpData_1.getSession)(viewerId.toString());
        if (!viewerIdSession)
            return reply.status(400).send({
                "error": "Bad Request",
                "message": "Invalid viewer id."
            });
        // get player
        const playerId = (0, activeAccount_1.resolvePlayerIdSync)(viewerIdSession.accountId);
        if (playerId === null)
            return reply.status(500).send({
                "error": "Internal Server Error",
                "message": "No player bound to account."
            });
        const headers = (0, utils_1.generateDataHeaders)({ viewer_id: body.viewer_id });
        // delete existing active quest
        delete exports.activeQuests[playerId];
        (0, wdfpData_1.deletePlayerActiveQuestSync)(playerId);
        return reply.status(200).send({
            "data_headers": headers,
            "data": {
                "user_info": {},
                "category_id": body.category,
                "is_multi": "single",
                "start_time": headers['servertime'],
                "quest_name": ""
            }
        });
    }));
    fastify.post("/start", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        var _x, _y, _z;
        const body = request.body;
        const viewerId = body.viewer_id;
        const partyId = body.party_id;
        const questId = body.quest_id;
        const category = body.category;
        const useBoostPoint = body.use_boost_point;
        const useBossBoostPoint = body.use_boss_boost_point;
        const isAutoStartMode = body.is_auto_start_mode;
        if (isNaN(viewerId) || isNaN(partyId) || isNaN(questId) || isNaN(category) || useBoostPoint === undefined || useBossBoostPoint === undefined || isAutoStartMode === undefined)
            return reply.status(400).send({
                "error": "Bad Request",
                "message": "Invalid request body."
            });
        const viewerIdSession = yield (0, wdfpData_1.getSession)(viewerId.toString());
        if (!viewerIdSession)
            return reply.status(400).send({
                "error": "Bad Request",
                "message": "Invalid viewer id."
            });
        // get player
        const playerId = (0, activeAccount_1.resolvePlayerIdSync)(viewerIdSession.accountId);
        if (playerId === null)
            return reply.status(500).send({
                "error": "Internal Server Error",
                "message": "No player bound to account."
            });
        // get quest data
        const questData = (0, assets_1.getQuestFromCategorySync)(category, questId);
        if (questData === null || !('rankPointReward' in questData)) {
            console.log(`[BATTLE] start failed: category=${category} questId=${questId} found=${!!questData} hasRankReward=${questData ? ('rankPointReward' in questData) : 'N/A'}`);
            return reply.status(400).send({
                "error": "Bad Request",
                "message": "Quest doesn't exist."
            });
        }
        // Deduct entry cost (ticket/item)
        const questKey = `${category}_${questId}`;
        const entryCost = quest_entry_costs_json_1.default[questKey];
        console.log(`[BATTLE] start entry: questId=${questId} questKey=${questKey} entryCost=${JSON.stringify(entryCost)}`);
        if (entryCost && entryCost.itemId > 0) {
            const playerItemCount = (_x = (0, wdfpData_1.getPlayerItemSync)(playerId, entryCost.itemId)) !== null && _x !== void 0 ? _x : 0;
            console.log(`[BATTLE] start deduct: itemId=${entryCost.itemId} playerHas=${playerItemCount} need=${entryCost.itemCount}`);
            if (playerItemCount < entryCost.itemCount) {
                return reply.status(400).send({
                    "error": "Bad Request",
                    "message": `Not enough entry items (need ${entryCost.itemCount} of ${entryCost.itemId}, have ${playerItemCount}).`
                });
            }
            (0, wdfpData_1.updatePlayerItemSync)(playerId, entryCost.itemId, playerItemCount - entryCost.itemCount);
        }
        // Deduct stamina cost
        const staminaCost = (_y = entryCost === null || entryCost === void 0 ? void 0 : entryCost.stamina) !== null && _y !== void 0 ? _y : 0;
        let afterStamina = 0;
        if (staminaCost > 0) {
            const player = (0, wdfpData_1.getPlayerSync)(playerId);
            if (!player) {
                console.error(`[BATTLE-START] player not found: ${playerId}`);
                return reply.status(500).send({
                    "error": "Internal Server Error",
                    "message": "Player not found."
                });
            }
            const currentStamina = player.stamina;
            if (currentStamina < staminaCost) {
                console.warn(`[BATTLE-START] player ${playerId} stamina insufficient: ${currentStamina} < ${staminaCost}`);
                return reply.status(400).send({
                    "error": "Bad Request",
                    "message": "Insufficient stamina."
                });
            }
            const newStamina = Math.max(0, currentStamina - staminaCost);
            (0, wdfpData_1.updatePlayerSync)({
                id: playerId,
                stamina: newStamina,
                staminaHealTime: new Date()
            });
            afterStamina = newStamina;
            console.log(`[BATTLE-START] stamina: ${currentStamina} -> ${newStamina} (cost: ${staminaCost})`);
        }
        else {
            // No stamina deduction, read current stamina for response
            const player = (0, wdfpData_1.getPlayerSync)(playerId);
            afterStamina = (_z = player === null || player === void 0 ? void 0 : player.stamina) !== null && _z !== void 0 ? _z : 0;
        }
        // add to active quests table
        delete exports.activeQuests[playerId];
        exports.activeQuests[playerId] = {
            questId: questId,
            category: category,
            useBoostPoint: useBoostPoint,
            useBossBoostPoint: useBossBoostPoint,
            isAutoStartMode: isAutoStartMode,
            isMulti: false,
            entryItemId: entryCost === null || entryCost === void 0 ? void 0 : entryCost.itemId,
            playId: body.play_id,
            continueCount: 0
        };
        // update player last party slot
        if (questData.fixedParty === undefined) {
            (0, wdfpData_1.updatePlayerSync)({
                id: playerId,
                partySlot: partyId
            });
        }
        const dataHeaders = (0, utils_1.generateDataHeaders)({
            viewer_id: viewerId
        });
        reply.header("content-type", "application/x-msgpack");
        return reply.status(200).send({
            "data_headers": dataHeaders,
            "data": {
                "user_info": {
                    "last_main_quest_id": body.quest_id,
                    "stamina": afterStamina,
                    "stamina_heal_time": (0, utils_1.getServerTime)()
                },
                "category_id": body.category,
                "is_multi": "single",
                "start_time": dataHeaders['servertime'],
                "quest_name": ""
            }
        });
    }));
    fastify.post("/play_continue", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        const body = request.body;
        const viewerId = body.viewer_id;
        if (isNaN(viewerId))
            return reply.status(400).send({
                "error": "Bad Request",
                "message": "Invalid request body."
            });
        const viewerIdSession = yield (0, wdfpData_1.getSession)(viewerId.toString());
        if (!viewerIdSession)
            return reply.status(400).send({
                "error": "Bad Request",
                "message": "Invalid viewer id."
            });
        // get player
        const playerId = (0, activeAccount_1.resolvePlayerIdSync)(viewerIdSession.accountId);
        const player = playerId !== null ? (0, wdfpData_1.getPlayerSync)(playerId) : null;
        if (player === null)
            return reply.status(500).send({
                "error": "Internal Server Error",
                "message": "No player bound to account."
            });
        // get active quest data
        const activeQuestData = exports.activeQuests[playerId];
        if (activeQuestData === undefined)
            return reply.status(400).send({
                "error": "Bad Request",
                "message": "No active quest to continue."
            });
        const freeVmoney = player.freeVmoney;
        const newFreeVmoney = freeVmoney - continueVmoneyCost;
        const vmoney = player.vmoney;
        const newVmoney = 0 > newFreeVmoney ? vmoney - continueVmoneyCost : vmoney;
        if (0 > newFreeVmoney && 0 > newVmoney)
            return reply.status(400).send({
                "error": "Bad Request",
                "message": "Not enough vmoney to continue"
            });
        // update the player's vmoney balances
        const setNewFreeVmoney = 0 > newFreeVmoney ? freeVmoney : newFreeVmoney;
        (0, wdfpData_1.updatePlayerSync)({
            id: playerId,
            freeVmoney: setNewFreeVmoney,
            vmoney: newVmoney
        });
        // increment continue count for battle recovery
        activeQuestData.continueCount++;
        (0, wdfpData_1.updatePlayerActiveQuestContinueCountSync)(playerId, activeQuestData.continueCount);
        reply.header("content-type", "application/x-msgpack");
        return reply.status(200).send({
            "data_headers": (0, utils_1.generateDataHeaders)({
                viewer_id: viewerId
            }),
            "data": {
                "user_info": {
                    "free_vmoney": setNewFreeVmoney,
                    "vmoney": newVmoney
                },
                "mail_arrived": false
            }
        });
    }));
});
exports.default = routes;
