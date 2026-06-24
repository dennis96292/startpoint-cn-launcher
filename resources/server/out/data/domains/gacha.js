"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updatePlayerGachaCampaignSync = exports.insertPlayerGachaCampaignListSync = exports.insertPlayerGachaCampaignSync = exports.getPlayerGachaCampaignListSync = exports.getPlayerGachaCampaignSync = exports.updatePlayerGachaInfoSync = exports.insertPlayerGachaInfoListSync = exports.insertPlayerGachaInfoSync = exports.getPlayerGachaInfoSync = exports.getPlayerGachaInfoListSync = void 0;
const db_1 = require("../db");
const utils_1 = require("../utils");
/**
 * Converts a RawPlayerGachaInfo object into a PlayerGachaInfo object.
 *
 * @param rawInfo The raw object to convert.
 * @returns The converted object.
 */
function buildPlayerGachaInfo(rawInfo) {
    return {
        gachaId: rawInfo.gacha_id,
        isDailyFirst: (0, utils_1.deserializeBoolean)(rawInfo.is_daily_first),
        isAccountFirst: (0, utils_1.deserializeBoolean)(rawInfo.is_account_first),
        gachaExchangePoint: rawInfo.gacha_exchange_point
    };
}
/**
 * Retrieves the status of various gacha banners for the player.
 *
 * @param playerId The ID of the player.
 * @returns A list of PlayerGachaInfo.
 */
function getPlayerGachaInfoListSync(playerId) {
    const rawInfo = (0, db_1.getDb)().prepare(`
    SELECT gacha_id, is_daily_first, is_account_first, gacha_exchange_point
    FROM players_gacha_info
    WHERE player_id = ?
    `).all(playerId);
    return rawInfo.map(raw => {
        return buildPlayerGachaInfo(raw);
    });
}
exports.getPlayerGachaInfoListSync = getPlayerGachaInfoListSync;
/**
 * Gets an individual gacha info for a player.
 *
 * @param playerId The ID of the player.
 * @param gachaId The ID of the gacha.
 * @returns The info that corresponds to the provided gachaId, or null.
 */
function getPlayerGachaInfoSync(playerId, gachaId) {
    const rawInfo = (0, db_1.getDb)().prepare(`
    SELECT gacha_id, is_daily_first, is_account_first, gacha_exchange_point
    FROM players_gacha_info
    WHERE player_id = ? AND gacha_id = ?
    `).get(playerId, gachaId);
    return rawInfo === undefined ? null : buildPlayerGachaInfo(rawInfo);
}
exports.getPlayerGachaInfoSync = getPlayerGachaInfoSync;
/**
 * Inserts a singular gacha info into the database for a player.
 *
 * @param playerId The ID of the player.
 * @param gachaInfo The PlayerGachaInfo data.
 */
function insertPlayerGachaInfoSync(playerId, gachaInfo) {
    (0, db_1.getDb)().prepare(`
    INSERT INTO players_gacha_info (gacha_id, is_daily_first, is_account_first, gacha_exchange_point, player_id)
    VALUES (?, ?, ?, ?, ?)
    `).run(gachaInfo.gachaId, (0, utils_1.serializeBoolean)(gachaInfo.isDailyFirst), (0, utils_1.serializeBoolean)(gachaInfo.isAccountFirst), gachaInfo.gachaExchangePoint == undefined ? null : gachaInfo.gachaExchangePoint, playerId);
}
exports.insertPlayerGachaInfoSync = insertPlayerGachaInfoSync;
/**
 * Batch inserts a list of gacha info into the database.
 *
 * @param playerId The player's ID.
 * @param gachaInfoList The list of of PlayerGachaInfo data.
 */
function insertPlayerGachaInfoListSync(playerId, gachaInfoList) {
    (0, db_1.getDb)().transaction(() => {
        for (const gachaInfo of gachaInfoList) {
            insertPlayerGachaInfoSync(playerId, gachaInfo);
        }
    })();
}
exports.insertPlayerGachaInfoListSync = insertPlayerGachaInfoListSync;
/**
 * Updates a player's gacha info.
 *
 * @param playerId The ID of the player.
 * @param gachaInfo The partial PlayerGachaInfo object containing data to update.
 */
function updatePlayerGachaInfoSync(playerId, gachaInfo) {
    const id = gachaInfo.gachaId;
    const fieldMap = {
        'isDailyFirst': 'is_daily_first',
        'isAccountFirst': 'is_account_first',
        'gachaExchangePoint': 'gacha_exchange_point'
    };
    const sets = [];
    const values = [];
    for (const key in gachaInfo) {
        const value = gachaInfo[key];
        const mapped = fieldMap[key];
        if (mapped && value !== undefined) {
            sets.push(`${mapped} = ?`);
            if (typeof (value) === "boolean") {
                values.push((0, utils_1.serializeBoolean)(value));
            }
            else {
                values.push(value);
            }
        }
    }
    if (sets.length > 0)
        (0, db_1.getDb)().prepare(`
        UPDATE players_gacha_info
        SET ${sets.join(', ')}
        WHERE gacha_id = ? AND player_id = ?
        `).run([...values, id, playerId]);
}
exports.updatePlayerGachaInfoSync = updatePlayerGachaInfoSync;
/**
 * Converts a RawPlayerGachaCampaign into a PlayerGachaCampaign.
 *
 * @param raw The RawPlayerGachaCampaign to convert.
 * @returns The converted PlayerGachaCampaign.
 */
function buildPlayerGachaCampaign(raw) {
    return {
        gachaId: raw.gacha_id,
        campaignId: raw.campaign_id,
        count: raw.count
    };
}
/**
 * Gets the status of an individual gacha campaign.
 *
 * @param playerId The ID of the player.
 * @param gachaId The ID of the gacha.
 * @param campaignId The ID of the gacha campaign.
 * @returns A PlayerGachaCampaign object or null.
 */
function getPlayerGachaCampaignSync(playerId, gachaId, campaignId) {
    const raw = (0, db_1.getDb)().prepare(`
    SELECT gacha_id, campaign_id, count
    FROM players_gacha_campaigns
    WHERE player_id = ? AND gacha_id = ? AND campaign_id = ?
    `).get(playerId, gachaId, campaignId);
    return raw === undefined ? null : buildPlayerGachaCampaign(raw);
}
exports.getPlayerGachaCampaignSync = getPlayerGachaCampaignSync;
/**
 * Batch gets a list of player gacha campaigns.
 *
 * @param playerId The ID of the player.
 * @returns The list of gacha campaigns.
 */
function getPlayerGachaCampaignListSync(playerId) {
    const rawList = (0, db_1.getDb)().prepare(`
    SELECT gacha_id, campaign_id, count
    FROM players_gacha_campaigns
    WHERE player_id = ?
    `).all(playerId);
    return rawList.map(raw => buildPlayerGachaCampaign(raw));
}
exports.getPlayerGachaCampaignListSync = getPlayerGachaCampaignListSync;
/**
 * Inserts a gacha campaign into a player's data.
 *
 * @param playerId The ID of the player.
 * @param campaign The campaign to insert.
 */
function insertPlayerGachaCampaignSync(playerId, campaign) {
    (0, db_1.getDb)().prepare(`
    INSERT INTO players_gacha_campaigns (gacha_id, campaign_id, count, player_id)
    VALUES (?, ?, ?, ?)
    `).run(campaign.gachaId, campaign.campaignId, campaign.count, playerId);
}
exports.insertPlayerGachaCampaignSync = insertPlayerGachaCampaignSync;
function insertPlayerGachaCampaignListSync(playerId, campaigns) {
    (0, db_1.getDb)().transaction(() => {
        for (const campaign of campaigns) {
            insertPlayerGachaCampaignSync(playerId, campaign);
        }
    })();
}
exports.insertPlayerGachaCampaignListSync = insertPlayerGachaCampaignListSync;
/**
 * Updates a player's gacha campaign.
 *
 * @param playerId The ID of the player.
 * @param gachaId The ID of the gacha.
 * @param campaignId The ID of the gacha campaign.
 * @param newCount The new count the gacha campaign should have.
 */
function updatePlayerGachaCampaignSync(playerId, gachaId, campaignId, newCount) {
    (0, db_1.getDb)().prepare(`
    UPDATE players_gacha_campaigns
    SET count = ?
    WHERE player_id = ? AND gacha_id = ? AND campaign_id = ?
    `).run(newCount, playerId, gachaId, campaignId);
}
exports.updatePlayerGachaCampaignSync = updatePlayerGachaCampaignSync;
/**
/**
/**
/**
 * Retrieves the missions that a player is currently completing.
 *
 * @param playerId The ID of the player.
 * @returns A record of each mission and its current progress.
 */
