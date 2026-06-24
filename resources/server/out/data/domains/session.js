"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateViewerIdSession = exports.deleteAccountSessionsOfType = exports.deleteAccountSessions = exports.deleteSession = exports.insertSession = exports.insertSessionWithToken = exports.getAccountSessionsOfType = exports.deleteDeviceBindingSync = exports.insertDeviceBindingSync = exports.getDeviceBindingSync = exports.getViewerIdSync = exports.getSession = void 0;
const db_1 = require("../db");
const crypto_1 = require("crypto");
const types_1 = require("../types");
const utils_1 = require("../../utils");
/**
 * Converts a RawSession into a Session.
 *
 * @param rawSession The RawSession to convert.
 * @returns The converted Session.
 */
function buildSession(rawSession) {
    return {
        token: rawSession.token,
        accountId: rawSession.account_id,
        expires: new Date(rawSession.expires),
        type: rawSession.type
    };
}
/**
 * Synchronously retrieves a session based on its token.
 *
 * @param token The token of the session to retrieve.
 * @returns The session that was found or null
 */
function getSessionSync(token) {
    const raw = (0, db_1.getDb)().prepare(`
    SELECT token, account_id, expires, type
    FROM sessions
    WHERE token = ?
    `).get(token);
    if (raw === undefined)
        return null;
    const session = buildSession(raw);
    // viewer tokens don't expire.
    if (session.type !== types_1.SessionType.VIEWER && new Date() >= session.expires) {
        console.log(`session of type (${session.type}) expired:`, session);
        deleteSessionSync(session.token);
        return null;
    }
    return session;
}
/**
 * Retrieves a session based on its token.
 *
 * @param token The token of the session to retrieve.
 * @returns A promise that resolves with the session that was found or null
 */
function getSession(token) {
    return new Promise((resolve, reject) => {
        try {
            resolve(getSessionSync(token));
        }
        catch (error) {
            reject(error);
        }
    });
}
exports.getSession = getSession;
/**
 * Gets the viewer_id (session token) for an account.
 * Returns 0 if no viewer session exists.
 */
function getViewerIdSync(accountId) {
    var _a;
    const row = (0, db_1.getDb)().prepare(`
        SELECT token FROM sessions WHERE account_id = ? AND type = 2 LIMIT 1
    `).get(accountId);
    return (_a = row === null || row === void 0 ? void 0 : row.token) !== null && _a !== void 0 ? _a : 0;
}
exports.getViewerIdSync = getViewerIdSync;
/**
 * Device binding: maps device_id → account_id
 */
function getDeviceBindingSync(deviceId) {
    const row = (0, db_1.getDb)().prepare(`SELECT device_id, account_id FROM device_bindings WHERE device_id = ?`).get(deviceId);
    return row !== null && row !== void 0 ? row : null;
}
exports.getDeviceBindingSync = getDeviceBindingSync;
function insertDeviceBindingSync(deviceId, accountId) {
    (0, db_1.getDb)().prepare(`INSERT OR REPLACE INTO device_bindings (device_id, account_id, last_seen) VALUES (?, ?, ?)`)
        .run(deviceId, accountId, new Date().toISOString());
}
exports.insertDeviceBindingSync = insertDeviceBindingSync;
function deleteDeviceBindingSync(deviceId) {
    (0, db_1.getDb)().prepare(`DELETE FROM device_bindings WHERE device_id = ?`).run(deviceId);
}
exports.deleteDeviceBindingSync = deleteDeviceBindingSync;
/**
 * Synchronously returns all of the sessions of a particular type belonging to an account.
 *
 * @param accountId The ID of the account to get the sessions of.
 * @param type The type of session to get.
 * @returns An array of sessions.
 */
function getAccountSessionsOfTypeSync(accountId, type) {
    const rawResult = (0, db_1.getDb)().prepare(`
    SELECT token, account_id, expires, type
    FROM sessions
    WHERE account_id = ? AND type = ?    
    `).all(accountId, type);
    return rawResult.map(raw => buildSession(raw));
}
/**
 * Returns all of the sessions of a particular type belonging to an account.
 *
 * @param accountId The ID of the account to get the sessions of.
 * @param type The type of session to get.
 * @returns A promise that resolves with an array of sessions.
 */
function getAccountSessionsOfType(accountId, type) {
    return new Promise((resolve, reject) => {
        try {
            resolve(getAccountSessionsOfTypeSync(accountId, type));
        }
        catch (error) {
            reject(error);
        }
    });
}
exports.getAccountSessionsOfType = getAccountSessionsOfType;
/**
 * Synchronously inserts a session into the database that already has a token.
 *
 * @param session The session to insert.
 */
function insertSessionWithTokenSync(session) {
    (0, db_1.getDb)().prepare(`
    INSERT INTO sessions (token, account_id, expires, type)
    VALUES (?, ?, ?, ?)    
    `).run(session.token, session.accountId, session.expires.toISOString(), session.type);
    return session;
}
/**
 * Synchronously inserts a session into the database that already has a token.
 *
 * @param session The session to insert.
 * @returns A promise that resolves with the session that was inserted.
 */
function insertSessionWithToken(session) {
    return new Promise((resolve, reject) => {
        try {
            resolve(insertSessionWithTokenSync(session));
        }
        catch (error) {
            reject(error);
        }
    });
}
exports.insertSessionWithToken = insertSessionWithToken;
/**
 * Synchronously inserts a session into the database.
 *
 * @param session The session to insert into the database without its token.
 * @returns The session that was inserted into the database.
 */
function insertSessionSync(session) {
    const token = (0, crypto_1.randomBytes)(54).toString('base64');
    const completeSession = session;
    completeSession.token = token;
    return insertSessionWithTokenSync(completeSession);
}
/**
 * Inserts a session into the database.
 *
 * @param session The session to insert into the database without its token.
 * @returns A promise that resolves with the session that was inserted into the database.
 */
function insertSession(session) {
    return new Promise((resolve, reject) => {
        try {
            resolve(insertSessionSync(session));
        }
        catch (error) {
            reject(error);
        }
    });
}
exports.insertSession = insertSession;
/**
 * Synchronously deletes a session from the database based on its token.
 *
 * @param token The token of the session to delete.
 */
function deleteSessionSync(token) {
    (0, db_1.getDb)().prepare(`DELETE FROM sessions WHERE token = ?`).run(token);
}
/**
 * Deletes a session from the database based on its token.
 *
 * @param token The token of the session to delete.
 * @returns A promise that resolves when the session is deleted.
 */
function deleteSession(token) {
    return new Promise((resolve, reject) => {
        try {
            resolve(deleteSessionSync(token));
        }
        catch (error) {
            reject(error);
        }
    });
}
exports.deleteSession = deleteSession;
/**
 * Synchronously deletes all of the sessions assigned to a particular player.
 *
 * @param playerId The id of the player to delete all the sessions of.
 */
function deleteAccountSessionsSync(playerId) {
    (0, db_1.getDb)().prepare(`DELETE FROM sessions WHERE account_id = ?`).run(playerId);
}
/**
 * Deletes all of the sessions assigned to a particular player.
 *
 * @param playerId The id of the player to delete all the sessions of.
 * @returns A promise that resolves when the sessions have been deleted.
 */
function deleteAccountSessions(playerId) {
    return new Promise((resolve, reject) => {
        try {
            resolve(deleteAccountSessionsSync(playerId));
        }
        catch (error) {
            reject(error);
        }
    });
}
exports.deleteAccountSessions = deleteAccountSessions;
/**
 * Synchronously deletes all of an account's sessions of a particular type.
 *
 * @param accountId The ID of the account to delete the sessions of.
 * @param type The type of session to delete.
 */
function deleteAccountSessionsOfTypeSync(accountId, type) {
    (0, db_1.getDb)().prepare(`
    DELETE FROM sessions
    WHERE account_id = ? AND type = ?
    `).run(accountId, type);
}
/**
 * Deletes all of an account's sessions of a particular type.
 *
 * @param accountId The ID of the account to delete the sessions of.
 * @param type The type of session to delete.
 * @returns A promise that resolves when the sessions are deleted.
 */
function deleteAccountSessionsOfType(accountId, type) {
    return new Promise((resolve, reject) => {
        try {
            resolve(deleteAccountSessionsOfTypeSync(accountId, type));
        }
        catch (error) {
            reject(error);
        }
    });
}
exports.deleteAccountSessionsOfType = deleteAccountSessionsOfType;
function generateViewerIdSession(accountId) {
    return new Promise((resolve, reject) => {
        try {
            // delete any existing viewer ID sessions
            deleteAccountSessionsOfTypeSync(accountId, types_1.SessionType.VIEWER);
            // insert new session
            resolve(insertSessionWithTokenSync({
                token: (0, utils_1.generateViewerId)().toString(),
                expires: new Date(new Date().getTime()),
                accountId: accountId,
                type: types_1.SessionType.VIEWER
            }));
        }
        catch (error) {
            reject(error);
        }
    });
}
exports.generateViewerIdSession = generateViewerIdSession;
// player
