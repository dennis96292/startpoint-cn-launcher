"use strict";
// Handles the insertion of mana into characters.
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
const wdfpData_1 = require("../../data/wdfpData");
const activeAccount_1 = require("../../data/activeAccount");
const assets_1 = require("../../lib/assets");
const types_1 = require("../../lib/types");
const utils_1 = require("../../utils");
const quest_1 = require("../../lib/quest");
const equipment_1 = require("../../lib/equipment");
const cdn_general_shop_whitelist_json_1 = __importDefault(require("../../../assets/cdn_general_shop_whitelist.json"));
const GENERAL_SHOP_CDN_KEYS = new Set(cdn_general_shop_whitelist_json_1.default);
function buildEnhancementSalesList(playerId, items) {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    if (Object.keys(items).length === 0)
        return [];
    // Group items by groupId
    const groups = new Map();
    for (const [itemId, item] of Object.entries(items)) {
        const gid = (_a = item.groupId) !== null && _a !== void 0 ? _a : 0;
        if (!groups.has(gid)) {
            groups.set(gid, {
                groupId: gid,
                items: [],
                equipmentId: (_b = item.equipmentId) !== null && _b !== void 0 ? _b : 0
            });
        }
        groups.get(gid).items.push({ id: itemId, item, stage: (_c = item.stage) !== null && _c !== void 0 ? _c : 0 });
    }
    const result = [];
    for (const [, group] of groups) {
        // Sort by stage ascending
        group.items.sort((a, b) => a.stage - b.stage);
        const equipmentId = group.equipmentId;
        const enhancementLevel = (0, wdfpData_1.playerOwnsEquipmentSync)(playerId, equipmentId)
            ? ((_e = (_d = (0, wdfpData_1.getPlayerEquipmentSync)(playerId, equipmentId)) === null || _d === void 0 ? void 0 : _d.enhancementLevel) !== null && _e !== void 0 ? _e : 0)
            : -1;
        // Find target product: first item with enhancementMaxLevel > current enhancementLevel
        let targetItem = null;
        let stockQuantity = 0;
        let totalPurchaseNum = 0;
        if (enhancementLevel < 0) {
            // Player doesn't have the equipment
            targetItem = group.items[0];
            stockQuantity = (_f = targetItem.item.enhancementMaxLevel) !== null && _f !== void 0 ? _f : 0;
            totalPurchaseNum = 0;
        }
        else {
            for (const entry of group.items) {
                const maxLv = (_g = entry.item.enhancementMaxLevel) !== null && _g !== void 0 ? _g : 0;
                if (maxLv > enhancementLevel) {
                    targetItem = entry;
                    stockQuantity = maxLv - enhancementLevel;
                    break;
                }
            }
            // If no target found (fully maxed), use last item with stock_quantity=0
            if (!targetItem) {
                targetItem = group.items[group.items.length - 1];
                stockQuantity = 0;
            }
            totalPurchaseNum = enhancementLevel;
        }
        // Group info: max level from last item in group
        const maxLevel = (_h = group.items[group.items.length - 1].item.enhancementMaxLevel) !== null && _h !== void 0 ? _h : 0;
        const multiStage = group.items.length > 1;
        result.push({
            "shop_item_id": Number(targetItem.id),
            "stock_quantity": stockQuantity,
            "today_purchase_num": 0,
            "this_month_purchase_num": null, // null → MsgPack nil / Option.None
            "total_purchase_num": totalPurchaseNum,
            "discount_id": null,
            "discount_rate": null,
            "discounted_price": null,
            "group_info": {
                "group_total_stock_quantity": maxLevel - totalPurchaseNum,
                "group_total_purchase_num": totalPurchaseNum,
                "multi_stage": multiStage
            },
            "shop_type": types_1.ShopType.TREASURE_EQUIPMENT
        });
    }
    return result;
}
const routes = (fastify) => __awaiter(void 0, void 0, void 0, function* () {
    fastify.post("/buy", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        const body = request.body;
        const viewerId = body.viewer_id;
        const shopType = body.shop_type;
        const rawPurchaseAmount = body.number;
        const shopItemId = body.shop_item_id;
        if (isNaN(viewerId) || isNaN(shopType) || isNaN(rawPurchaseAmount) || isNaN(shopItemId))
            return reply.status(400).send({
                "error": "Bad Request",
                "message": "Invalid request body."
            });
        const purchaseAmount = Math.max(1, rawPurchaseAmount);
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
                "message": "No players bound to account."
            });
        // get the shop item's data
        const shopItemData = (0, assets_1.getShopItemSync)(shopType, shopItemId);
        if (shopItemData === null)
            return reply.status(400).send({
                "error": "Bad Request",
                "message": "Shop item with specified id does not exist."
            });
        // validate stock limit
        if (shopItemData.stock !== undefined && shopItemData.stock > 0) {
            const purchased = (0, wdfpData_1.getPlayerShopPurchaseCountSync)(playerId, shopItemId);
            if (purchased + purchaseAmount > shopItemData.stock) {
                return reply.status(400).send({
                    "error": "Bad Request",
                    "message": "Shop item purchase limit reached."
                });
            }
        }
        console.log(`[shop:buy] player=${playerId} shopType=${shopType} item=${shopItemId} x${purchaseAmount} before freeMana=${player.freeMana} freeVmoney=${player.freeVmoney}`);
        // keep track of various stats
        const itemList = {};
        let freeVmoney = player.freeVmoney;
        let freeMana = player.freeMana;
        let bondTokens = player.bondToken;
        // verify user costs
        const userCost = shopItemData.userCost;
        if (userCost !== undefined) {
            switch (userCost.type) {
                case types_1.ShopItemUserCostType.MANA:
                    freeMana -= (userCost.amount * purchaseAmount);
                    break;
                case types_1.ShopItemUserCostType.BEADS:
                    freeVmoney -= (userCost.amount * purchaseAmount);
                    break;
                case types_1.ShopItemUserCostType.AMITY_SCROLL:
                    bondTokens -= (userCost.amount * purchaseAmount);
            }
            if (0 > freeVmoney)
                return reply.status(400).send({
                    "error": "Bad Request",
                    "message": `Not enough beads to purchase shop item.`
                });
            if (0 > freeMana)
                return reply.status(400).send({
                    "error": "Bad Request",
                    "message": `Not enough mana to purchase shop item.`
                });
            if (0 > bondTokens)
                return reply.status(400).send({
                    "error": "Bad Request",
                    "message": `Not enough amity scrolls to purchase shop item.`
                });
        }
        // verify cost items
        {
            for (const cost of shopItemData.costs) {
                const itemId = cost.id;
                const itemAmount = (_a = (0, wdfpData_1.getPlayerItemSync)(playerId, itemId)) !== null && _a !== void 0 ? _a : 0;
                const newItemAmount = itemAmount - (cost.amount * purchaseAmount);
                if (0 > newItemAmount)
                    return reply.status(400).send({
                        "error": "Bad Request",
                        "message": `Not enough of item with id ${itemId} to purchase shop item.`
                    });
                itemList[itemId] = newItemAmount;
            }
            // deduct cost item
            for (const [itemId, newAmount] of Object.entries(itemList)) {
                (0, wdfpData_1.updatePlayerItemSync)(playerId, itemId, newAmount);
            }
        }
        // update player
        (0, wdfpData_1.updatePlayerSync)({
            id: playerId,
            freeMana: freeMana,
            freeVmoney: freeVmoney,
            bondToken: bondTokens
        });
        // Equipment enhancement shop: update equipment enhancement level
        if (shopType === types_1.ShopType.TREASURE_EQUIPMENT) {
            const equipmentId = shopItemData.equipmentId;
            const targetLevel = shopItemData.enhancementMaxLevel;
            if (equipmentId === undefined || targetLevel === undefined)
                return reply.status(400).send({
                    "error": "Bad Request",
                    "message": "Enhancement item missing equipment_id or target level."
                });
            const currentEquipment = (0, wdfpData_1.getPlayerEquipmentSync)(playerId, equipmentId);
            if (currentEquipment === null)
                return reply.status(400).send({
                    "error": "Bad Request",
                    "message": "Player does not own the target equipment."
                });
            // Update to target enhancement level
            const newLevel = Math.max(currentEquipment.enhancementLevel, targetLevel);
            (0, wdfpData_1.updatePlayerEquipmentSync)(playerId, equipmentId, { enhancementLevel: newLevel });
            currentEquipment.enhancementLevel = newLevel;
            // Record purchase
            for (let i = 0; i < purchaseAmount; i++) {
                (0, wdfpData_1.addPlayerShopPurchaseSync)(playerId, shopItemId);
            }
            reply.header("content-type", "application/x-msgpack");
            return reply.status(200).send({
                "data_headers": (0, utils_1.generateDataHeaders)({
                    viewer_id: viewerId
                }),
                "data": {
                    "user_info": {
                        "free_vmoney": freeVmoney,
                        "free_mana": freeMana,
                        "bond_token": bondTokens
                    },
                    "character_list": [],
                    "equipment_list": [(0, equipment_1.clientSerializeEquipment)(equipmentId, currentEquipment)],
                    "item_list": itemList,
                    "mail_arrived": false
                }
            });
        }
        // build rewards array
        const rewards = [];
        for (const reward of shopItemData.rewards) {
            switch (reward.type) {
                case types_1.ShopItemRewardType.ITEM: {
                    const shopReward = reward;
                    rewards.push({
                        name: "",
                        type: types_1.RewardType.ITEM,
                        id: shopReward.id,
                        count: shopReward.count * purchaseAmount
                    });
                    break;
                }
                case types_1.ShopItemRewardType.EXP: {
                    const shopReward = reward;
                    rewards.push({
                        name: "",
                        type: types_1.RewardType.EXP,
                        count: shopReward.count * purchaseAmount
                    });
                    break;
                }
                case types_1.ShopItemRewardType.MANA: {
                    const shopReward = reward;
                    rewards.push({
                        name: "",
                        type: types_1.RewardType.MANA,
                        count: shopReward.count * purchaseAmount
                    });
                    break;
                }
                case types_1.ShopItemRewardType.CHARACTER: {
                    const shopReward = reward;
                    for (let i = 0; i < purchaseAmount; i++) {
                        rewards.push({
                            name: "",
                            type: types_1.RewardType.CHARACTER,
                            id: shopReward.id
                        });
                    }
                    break;
                }
                case types_1.ShopItemRewardType.EQUIPMENT: {
                    const shopReward = reward;
                    rewards.push({
                        name: "",
                        type: types_1.RewardType.EQUIPMENT,
                        id: shopReward.id,
                        count: shopReward.count * purchaseAmount
                    });
                    break;
                }
            }
        }
        // give rewards
        const rewardResult = (0, quest_1.givePlayerRewardsSync)(playerId, rewards);
        // record purchase for stock tracking
        for (let i = 0; i < purchaseAmount; i++) {
            (0, wdfpData_1.addPlayerShopPurchaseSync)(playerId, shopItemId);
        }
        // verify DB write
        const afterPlayer = (0, wdfpData_1.getPlayerSync)(playerId);
        console.log(`[shop:buy] after DB freeMana=${afterPlayer.freeMana} freeVmoney=${afterPlayer.freeVmoney} rewardItems=${JSON.stringify((_b = rewardResult === null || rewardResult === void 0 ? void 0 : rewardResult.items) !== null && _b !== void 0 ? _b : {})}`);
        reply.header("content-type", "application/x-msgpack");
        return reply.status(200).send({
            "data_headers": (0, utils_1.generateDataHeaders)({
                viewer_id: viewerId
            }),
            "data": {
                "user_info": {
                    "free_vmoney": freeVmoney + ((_c = rewardResult === null || rewardResult === void 0 ? void 0 : rewardResult.user_info.free_vmoney) !== null && _c !== void 0 ? _c : 0),
                    "free_mana": freeMana + ((_d = rewardResult === null || rewardResult === void 0 ? void 0 : rewardResult.user_info.free_mana) !== null && _d !== void 0 ? _d : 0),
                    "bond_token": bondTokens,
                    "exp_pool": player.expPool + ((_e = rewardResult === null || rewardResult === void 0 ? void 0 : rewardResult.user_info.exp_pool) !== null && _e !== void 0 ? _e : 0),
                },
                "character_list": (_f = rewardResult === null || rewardResult === void 0 ? void 0 : rewardResult.character_list) !== null && _f !== void 0 ? _f : [],
                "equipment_list": (_g = rewardResult === null || rewardResult === void 0 ? void 0 : rewardResult.equipment_list) !== null && _g !== void 0 ? _g : [],
                "item_list": Object.assign(Object.assign({}, itemList), ((_h = rewardResult === null || rewardResult === void 0 ? void 0 : rewardResult.items) !== null && _h !== void 0 ? _h : {})),
                "mail_arrived": false
            }
        });
    }));
    fastify.post("/get_sales_list", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        var _j, _k, _l, _m;
        const body = request.body;
        const viewerId = body.viewer_id;
        const shopTypes = body.shop_types;
        const bossCoinShopCategoryIds = body.boss_coin_shop_category_ids;
        const equipmentEnhancementCategoryIds = body.equipment_enhancement_shop_category_ids;
        const eventList = body.event_list;
        if (isNaN(viewerId) || shopTypes === undefined || bossCoinShopCategoryIds === undefined || eventList === undefined)
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
                "message": "No players bound to account."
            });
        console.log(`[shop:req] viewer=${viewerId} types=${JSON.stringify(shopTypes)} bossCats=${JSON.stringify(bossCoinShopCategoryIds)} equipCats=${JSON.stringify(equipmentEnhancementCategoryIds)} events=${eventList.length} eventList=${JSON.stringify(eventList)}`);
        let toParseShopItems = {};
        // shop types
        for (const type of shopTypes) {
            const items = (0, assets_1.getGenericShopItemsSync)(type);
            const existing = (_j = toParseShopItems[type]) !== null && _j !== void 0 ? _j : {};
            toParseShopItems[type] = items === null ? existing : Object.assign(Object.assign({}, existing), items);
        }
        // event list
        for (const event of eventList) {
            const type = event.event_type;
            for (const eventId of event.event_ids) {
                const items = (0, assets_1.getEventShopItemsSync)(type, eventId);
                const existing = (_k = toParseShopItems[types_1.ShopType.EVENT_ITEM]) !== null && _k !== void 0 ? _k : {};
                toParseShopItems[types_1.ShopType.EVENT_ITEM] = items === null ? existing : Object.assign(Object.assign({}, existing), items);
            }
        }
        // boss coin shop category ids
        for (const category of bossCoinShopCategoryIds) {
            const items = (0, assets_1.getBossCoinShopItemsSync)(category);
            const existing = (_l = toParseShopItems[types_1.ShopType.BOSS_COIN]) !== null && _l !== void 0 ? _l : {};
            toParseShopItems[types_1.ShopType.BOSS_COIN] = items === null ? existing : Object.assign(Object.assign({}, existing), items);
        }
        // parse shop items
        const salesList = [];
        // Load purchase history for stock tracking
        const purchasedMap = (0, wdfpData_1.getPlayerShopPurchasesMapSync)(playerId);
        const totalPurchased = Object.values(purchasedMap).reduce((a, b) => a + b, 0);
        console.log(`[shop:get_sales] player=${playerId} purchasedKeys=${Object.keys(purchasedMap).length} totalPurchased=${totalPurchased}`);
        let filteredCdnCount = 0;
        // Collect enhancement shop items for group-level processing
        const enhancementItems = {};
        for (const [shopType, items] of Object.entries(toParseShopItems)) {
            const shopTypeNum = Number(shopType);
            for (const [itemId, item] of Object.entries(items)) {
                if (shopTypeNum === types_1.ShopType.GENERAL && !GENERAL_SHOP_CDN_KEYS.has(Number(itemId))) {
                    filteredCdnCount++;
                    continue;
                }
                // Filter equipment enhancement shop by category IDs
                if (shopTypeNum === types_1.ShopType.TREASURE_EQUIPMENT && (equipmentEnhancementCategoryIds === null || equipmentEnhancementCategoryIds === void 0 ? void 0 : equipmentEnhancementCategoryIds.length)) {
                    if (item.shopCategoryId === undefined || !equipmentEnhancementCategoryIds.includes(item.shopCategoryId)) {
                        continue;
                    }
                }
                // Date filtering: only show items active at current server time
                {
                    const now = (0, utils_1.getServerDate)();
                    if (item.availableFrom) {
                        const fromStr = item.availableFrom.replace(' ', 'T') + 'Z';
                        if (new Date(fromStr) > now)
                            continue;
                    }
                    if (item.availableUntil) {
                        const untilStr = item.availableUntil.replace(' ', 'T') + 'Z';
                        if (new Date(untilStr) < now)
                            continue;
                    }
                }
                if (shopTypeNum === types_1.ShopType.TREASURE_EQUIPMENT) {
                    // Collect for group-level processing later
                    enhancementItems[itemId] = item;
                    continue;
                }
                const purchased = (_m = purchasedMap[Number(itemId)]) !== null && _m !== void 0 ? _m : 0;
                const stock = item.stock;
                const stockQuantity = stock !== undefined ? Math.max(0, stock - purchased) : -1;
                salesList.push({
                    "shop_item_id": Number(itemId),
                    "stock_quantity": stockQuantity,
                    "today_purchase_num": purchased,
                    "this_month_purchase_num": purchased,
                    "total_purchase_num": purchased,
                    "group_info": {
                        "group_total_stock_quantity": stockQuantity,
                        "group_total_purchase_num": purchased,
                        "multi_stage": false
                    },
                    "shop_type": Number(shopType)
                });
            }
        }
        // Process equipment enhancement items by group
        const enhancementSales = buildEnhancementSalesList(playerId, enhancementItems);
        salesList.push(...enhancementSales);
        if (filteredCdnCount > 0) {
            console.log(`[shop] Filtered ${filteredCdnCount} general shop items not in CDN master data`);
        }
        const salesByType = {};
        for (const item of salesList) {
            const t = item.shop_type;
            salesByType[t] = (salesByType[t] || 0) + 1;
        }
        console.log(`[shop:res] totalSales=${salesList.length} byType=${JSON.stringify(salesByType)} toParseItems=${JSON.stringify(Object.fromEntries(Object.entries(toParseShopItems).map(([k, v]) => [k, Object.keys(v).length])))}`);
        reply.header("content-type", "application/x-msgpack");
        return reply.status(200).send({
            "data_headers": (0, utils_1.generateDataHeaders)({
                viewer_id: viewerId
            }),
            "data": {
                "sales_list": salesList
            }
        });
    }));
    fastify.post("/recover_stamina", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        const body = request.body;
        const viewerId = body.viewer_id;
        if (!viewerId || isNaN(viewerId)) {
            console.warn(`[RECOVER-STAMINA] invalid viewer_id: ${viewerId}`);
            return reply.status(400).send({
                "error": "Bad Request", "message": "Invalid viewer_id."
            });
        }
        const session = yield (0, wdfpData_1.getSession)(viewerId.toString());
        if (!session)
            return reply.status(400).send({
                "error": "Bad Request", "message": "Invalid viewer id."
            });
        const playerId = (0, activeAccount_1.resolvePlayerIdSync)(session.accountId);
        if (playerId === null)
            return reply.status(500).send({
                "error": "Internal Server Error", "message": "No player bound to account."
            });
        const player = (0, wdfpData_1.getPlayerSync)(playerId);
        if (!player)
            return reply.status(500).send({
                "error": "Internal Server Error", "message": "Player not found."
            });
        const config = (0, assets_1.getConfigSync)();
        const recoveryCost = config.stamina_recovery_virtual_money;
        const recoveryValue = config.stamina_recovery_value;
        const recoverySeconds = config.stamina_recovery_seconds;
        const maxOverflow = config.max_stamina_overflow;
        // Compute real-time stamina using client formula
        const staminaHealTimeSec = player.staminaHealTime.getTime() / 1000;
        const nowSec = Math.floor(Date.now() / 1000);
        const elapsed = (nowSec - staminaHealTimeSec) / recoverySeconds;
        const currentStamina = Math.min(Math.max(0, player.stamina + Math.floor(elapsed)), maxOverflow);
        // Already at max
        if (currentStamina >= maxOverflow) {
            console.log(`[RECOVER-STAMINA] player ${playerId} already at max (${currentStamina} >= ${maxOverflow})`);
            reply.header("content-type", "application/x-msgpack");
            return reply.status(200).send({
                "data_headers": (0, utils_1.generateDataHeaders)({ viewer_id: viewerId, result_code: 2102 }),
                "data": {}
            });
        }
        // Insufficient vmoney
        const freeVmoney = player.freeVmoney;
        if (freeVmoney < recoveryCost) {
            console.warn(`[RECOVER-STAMINA] player ${playerId} insufficient vmoney: ${freeVmoney} < ${recoveryCost}`);
            reply.header("content-type", "application/x-msgpack");
            return reply.status(200).send({
                "data_headers": (0, utils_1.generateDataHeaders)({ viewer_id: viewerId, result_code: 0 }),
                "data": {}
            });
        }
        // Calculate recovery amount (capped at overflow)
        const afterStamina = Math.min(currentStamina + recoveryValue, maxOverflow);
        const actualRecovery = afterStamina - currentStamina;
        (0, wdfpData_1.updatePlayerSync)({
            id: playerId,
            stamina: afterStamina,
            staminaHealTime: new Date(),
            freeVmoney: freeVmoney - recoveryCost
        });
        console.log(`[RECOVER-STAMINA] player ${playerId}: stamina ${currentStamina}->${afterStamina} (+${actualRecovery}), freeVmoney ${freeVmoney}->${freeVmoney - recoveryCost}`);
        reply.header("content-type", "application/x-msgpack");
        return reply.status(200).send({
            "data_headers": (0, utils_1.generateDataHeaders)({ viewer_id: viewerId }),
            "data": {
                "user_info": {
                    "stamina": afterStamina,
                    "stamina_heal_time": (0, utils_1.getServerTime)(),
                    "free_vmoney": freeVmoney - recoveryCost
                }
            }
        });
    }));
    // bulk_buy — stub, returns empty (TODO: implement multi-item purchase)
    fastify.post("/bulk_buy", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        const body = request.body;
        const viewerId = body.viewer_id;
        if (!viewerId || isNaN(viewerId))
            return reply.status(400).send({
                "error": "Bad Request", "message": "Invalid request body."
            });
        reply.header("content-type", "application/x-msgpack");
        return reply.status(200).send({
            "data_headers": (0, utils_1.generateDataHeaders)({ viewer_id: viewerId }),
            "data": {}
        });
    }));
    // get_campaign_lineup_id — stub
    fastify.post("/get_campaign_lineup_id", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        const body = request.body;
        const viewerId = body.viewer_id;
        if (!viewerId || isNaN(viewerId))
            return reply.status(400).send({
                "error": "Bad Request", "message": "Invalid request body."
            });
        reply.header("content-type", "application/x-msgpack");
        return reply.status(200).send({
            "data_headers": (0, utils_1.generateDataHeaders)({ viewer_id: viewerId }),
            "data": { "lineup_id": null }
        });
    }));
    // set_campaign_lineup_id — stub
    fastify.post("/set_campaign_lineup_id", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        const body = request.body;
        const viewerId = body.viewer_id;
        if (!viewerId || isNaN(viewerId))
            return reply.status(400).send({
                "error": "Bad Request", "message": "Invalid request body."
            });
        reply.header("content-type", "application/x-msgpack");
        return reply.status(200).send({
            "data_headers": (0, utils_1.generateDataHeaders)({ viewer_id: viewerId }),
            "data": {}
        });
    }));
});
exports.default = routes;
