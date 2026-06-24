"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addPlayerShopPurchaseSync = exports.getPlayerShopPurchaseCountSync = exports.getPlayerShopPurchasesMapSync = exports.getPlayerShopPurchasesSync = void 0;
const db_1 = require("../db");
function getPlayerShopPurchasesSync(playerId) {
    const rows = (0, db_1.getDb)().prepare(`
        SELECT shop_item_id, count
        FROM players_shop_purchases
        WHERE player_id = ?
    `).all(playerId);
    return rows.map(r => ({ shopItemId: r.shop_item_id, count: r.count }));
}
exports.getPlayerShopPurchasesSync = getPlayerShopPurchasesSync;
function getPlayerShopPurchasesMapSync(playerId) {
    const map = {};
    const rows = getPlayerShopPurchasesSync(playerId);
    for (const r of rows) {
        map[r.shopItemId] = r.count;
    }
    return map;
}
exports.getPlayerShopPurchasesMapSync = getPlayerShopPurchasesMapSync;
function getPlayerShopPurchaseCountSync(playerId, shopItemId) {
    var _a;
    const row = (0, db_1.getDb)().prepare(`
        SELECT count FROM players_shop_purchases
        WHERE player_id = ? AND shop_item_id = ?
    `).get(playerId, shopItemId);
    return (_a = row === null || row === void 0 ? void 0 : row.count) !== null && _a !== void 0 ? _a : 0;
}
exports.getPlayerShopPurchaseCountSync = getPlayerShopPurchaseCountSync;
function addPlayerShopPurchaseSync(playerId, shopItemId) {
    (0, db_1.getDb)().prepare(`
        INSERT INTO players_shop_purchases (player_id, shop_item_id, count)
        VALUES (?, ?, 1)
        ON CONFLICT(player_id, shop_item_id) DO UPDATE SET count = count + 1
    `).run(playerId, shopItemId);
    return getPlayerShopPurchaseCountSync(playerId, shopItemId);
}
exports.addPlayerShopPurchaseSync = addPlayerShopPurchaseSync;
