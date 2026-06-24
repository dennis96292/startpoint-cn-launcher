"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getReceiveHistorySync = exports.insertReceiveHistorySync = exports.deleteAllPlayerMailSync = exports.receiveAllMailsSync = exports.receiveMailSync = exports.getPlayerMailCountSync = exports.getPlayerMailsSync = exports.insertMailSync = exports.MailType = void 0;
const db_1 = require("../db");
/**
 * Mail attachment types matching the client's MailKind enum.
 */
var MailType;
(function (MailType) {
    MailType[MailType["ITEM"] = 1] = "ITEM";
    MailType[MailType["PAID_VMONEY"] = 3] = "PAID_VMONEY";
    MailType[MailType["FREE_VMONEY"] = 4] = "FREE_VMONEY";
    MailType[MailType["CHARACTER"] = 5] = "CHARACTER";
    MailType[MailType["EQUIPMENT"] = 6] = "EQUIPMENT";
    MailType[MailType["STAR_CRUMB"] = 7] = "STAR_CRUMB";
    MailType[MailType["FREE_MANA"] = 8] = "FREE_MANA";
    MailType[MailType["EXP_POOL"] = 9] = "EXP_POOL";
    MailType[MailType["BOND_TOKEN"] = 10] = "BOND_TOKEN";
    MailType[MailType["BOSS_BOOST_POINT"] = 11] = "BOSS_BOOST_POINT";
    MailType[MailType["BOOST_POINT"] = 12] = "BOOST_POINT";
    MailType[MailType["DEGREE"] = 13] = "DEGREE";
    MailType[MailType["DAILY_CHALLENGE_POINT"] = 14] = "DAILY_CHALLENGE_POINT";
    MailType[MailType["RANK_POINT"] = 15] = "RANK_POINT";
    MailType[MailType["PERIODIC_REWARD_POINT"] = 16] = "PERIODIC_REWARD_POINT";
    MailType[MailType["PASS_CARD_POINT"] = 17] = "PASS_CARD_POINT";
})(MailType || (exports.MailType = MailType = {}));
/**
 * Inserts a mail record for a player. Returns the auto-generated mail ID.
 */
function insertMailSync(playerId, mail) {
    const result = (0, db_1.getDb)().prepare(`
        INSERT INTO players_mails (player_id, reason_id, subject, description, type, type_id, number, receive_time, create_time, reward_period_limited, reward_limit_time)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(playerId, mail.reason_id, mail.subject, mail.description, mail.type, mail.type_id, mail.number, mail.receive_time, mail.create_time, mail.reward_period_limited, mail.reward_limit_time);
    return Number(result.lastInsertRowid);
}
exports.insertMailSync = insertMailSync;
/**
 * Gets paginated mail list for a player.
 * @param unreceivedOnly If true, only returns unreceived mails.
 */
function getPlayerMailsSync(playerId, page = 1, perPage = 100, unreceivedOnly = false) {
    const offset = (page - 1) * perPage;
    let query = `SELECT * FROM players_mails WHERE player_id = ?`;
    if (unreceivedOnly) {
        query += ` AND receive_time = '0000-00-00 00:00:00'`;
    }
    query += ` ORDER BY id DESC LIMIT ? OFFSET ?`;
    return (0, db_1.getDb)().prepare(query).all(playerId, perPage, offset);
}
exports.getPlayerMailsSync = getPlayerMailsSync;
/**
 * Gets total mail count for a player.
 */
function getPlayerMailCountSync(playerId, unreceivedOnly = false) {
    let query = `SELECT COUNT(*) as count FROM players_mails WHERE player_id = ?`;
    if (unreceivedOnly) {
        query += ` AND receive_time = '0000-00-00 00:00:00'`;
    }
    const row = (0, db_1.getDb)().prepare(query).get(playerId);
    return row.count;
}
exports.getPlayerMailCountSync = getPlayerMailCountSync;
/**
 * Marks a mail as received and returns its attachment data.
 * Does NOT apply the reward — caller must do that.
 */
function receiveMailSync(playerId, mailId) {
    const mail = (0, db_1.getDb)().prepare(`
        SELECT * FROM players_mails WHERE id = ? AND player_id = ? AND receive_time = '0000-00-00 00:00:00'
    `).get(mailId, playerId);
    if (!mail)
        return null;
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    (0, db_1.getDb)().prepare(`UPDATE players_mails SET receive_time = ? WHERE id = ?`).run(now, mailId);
    return {
        mail_id: mail.id,
        type: mail.type,
        type_id: mail.type_id,
        number: mail.number,
    };
}
exports.receiveMailSync = receiveMailSync;
/**
 * Batch receive mails. Returns list of successfully claimed mail IDs.
 */
function receiveAllMailsSync(playerId, mailIds) {
    const claimed = [];
    (0, db_1.getDb)().transaction(() => {
        for (const mailId of mailIds) {
            const result = receiveMailSync(playerId, mailId);
            if (result !== null) {
                claimed.push(mailId);
            }
        }
    })();
    return claimed;
}
exports.receiveAllMailsSync = receiveAllMailsSync;
/**
 * Deletes all mail for a player (admin recovery: clear mailbox).
 * @returns number of mail rows deleted.
 */
function deleteAllPlayerMailSync(playerId) {
    const result = (0, db_1.getDb)().prepare(`DELETE FROM players_mails WHERE player_id = ?`).run(playerId);
    return result.changes;
}
exports.deleteAllPlayerMailSync = deleteAllPlayerMailSync;
function insertReceiveHistorySync(playerId, record) {
    var _a;
    const now = new Date().toISOString().replace("T", " ").substring(0, 19);
    (0, db_1.getDb)().prepare(`
        INSERT INTO players_receive_history (player_id, type, type_id, number, reason_id, create_time)
        VALUES (?, ?, ?, ?, ?, ?)
    `).run(playerId, record.type, record.type_id, record.number, (_a = record.reason_id) !== null && _a !== void 0 ? _a : 0, now);
}
exports.insertReceiveHistorySync = insertReceiveHistorySync;
function getReceiveHistorySync(playerId, sinceDays = 7, limit = 500) {
    const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000).toISOString().replace("T", " ").substring(0, 19);
    return (0, db_1.getDb)().prepare(`
        SELECT * FROM players_receive_history
        WHERE player_id = ? AND create_time >= ?
        ORDER BY create_time DESC
        LIMIT ?
    `).all(playerId, since, limit);
}
exports.getReceiveHistorySync = getReceiveHistorySync;
