"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRushEventEndlessBattleRankPlayedPartyListSync = exports.getPlayerRushEventEndlessBattleRankingSync = exports.getSerializedPlayerRushEventPlayedPartiesSync = void 0;
const types_1 = require("../data/types");
const wdfpData_1 = require("../data/wdfpData");
/**
 * Gets all of a player's played parties, serializes them into client formant, and organizes them by their RushEventBattleType.
 *
 * @param playerId The ID of the player.
 * @param eventId The ID of the rush event.
 * @returns The serialized parties organized by type.
 */
function getSerializedPlayerRushEventPlayedPartiesSync(playerId, eventId) {
    // get played parties
    const playedParties = (0, wdfpData_1.getPlayerRushEventPlayedPartiesSync)(playerId, eventId);
    // convert played parties to the expected client format
    const rushBattlePlayedPartyList = {};
    const endlessBattlePlayedPartyList = {};
    for (const party of playedParties) {
        const record = party.battleType === types_1.RushEventBattleType.FOLDER ? rushBattlePlayedPartyList : endlessBattlePlayedPartyList;
        record[party.round] = (0, wdfpData_1.serializePlayerRushEventPlayedParty)(party);
    }
    // return parties
    return {
        folderParties: rushBattlePlayedPartyList,
        endlessParties: endlessBattlePlayedPartyList
    };
}
exports.getSerializedPlayerRushEventPlayedPartiesSync = getSerializedPlayerRushEventPlayedPartiesSync;
/**
 * Converts player data & rush event data into the format that the client expects for rush event endless battle rankings.
 *
 * @param playerId The ID of the player.
 * @param eventId The ID of the rush event.
 * @param playerData Existing data to use instead of fetching brand new data.
 * @returns A UserRushEventEndlessBattleRanking object or null.
 */
function getPlayerRushEventEndlessBattleRankingSync(playerId, eventId, useData) {
    var _a, _b;
    const playerData = (useData === null || useData === void 0 ? void 0 : useData.playerData) === undefined ? (0, wdfpData_1.getPlayerSync)(playerId) : useData === null || useData === void 0 ? void 0 : useData.playerData;
    if (playerData === null)
        return null;
    const rushEventData = (useData === null || useData === void 0 ? void 0 : useData.rushEventData) === undefined ? (0, wdfpData_1.getPlayerRushEventSync)(playerId, eventId) : useData === null || useData === void 0 ? void 0 : useData.rushEventData;
    if (rushEventData === null)
        return null;
    const bestRound = rushEventData.endlessBattleMaxRound;
    const bestTime = rushEventData.endlessBattleMaxRoundTime;
    const endlessCharacterIds = rushEventData.endlessBattleMaxRoundCharacterIds;
    const endlessCharacterEvolutionImgLevel = rushEventData.endlessBattleMaxRoundCharacterEvolutionImgLvls;
    if (bestRound === null || bestTime === null || endlessCharacterIds === null || endlessCharacterEvolutionImgLevel === null)
        return null;
    // build party member list
    const partyMemberList = [];
    for (let n = 0; n < endlessCharacterIds.length; n++) {
        const characterId = endlessCharacterIds[n];
        if (characterId !== null) {
            partyMemberList.push({
                character_id: characterId,
                evolution_img_level: (_a = endlessCharacterEvolutionImgLevel[n]) !== null && _a !== void 0 ? _a : 0
            });
        }
    }
    return {
        best_round: bestRound,
        elapsed_time_ms: bestTime,
        name: playerData.name,
        party_member_list: partyMemberList,
        rank_number: (_b = useData === null || useData === void 0 ? void 0 : useData.rankNumber) !== null && _b !== void 0 ? _b : 0,
        user_rank: 215
    };
}
exports.getPlayerRushEventEndlessBattleRankingSync = getPlayerRushEventEndlessBattleRankingSync;
/**
 * Gets the played party list for the player currently at a rank in an endless battle leaderboard for a rush event.
 *
 * @param rank The rank of the player.
 * @param eventId The ID of the rush event.
 * @returns A serialized player rush event played party list or null.
 */
function getRushEventEndlessBattleRankPlayedPartyListSync(rank, eventId) {
    // Get the ID of the player who is currently at rank [rank].
    const playerId = (0, wdfpData_1.getPlayerIdFromRushEventEndlessRankSync)(rank, eventId);
    if (playerId === null)
        return null;
    // get the played party list
    const parties = getSerializedPlayerRushEventPlayedPartiesSync(playerId, eventId);
    return parties.endlessParties;
}
exports.getRushEventEndlessBattleRankPlayedPartyListSync = getRushEventEndlessBattleRankPlayedPartyListSync;
