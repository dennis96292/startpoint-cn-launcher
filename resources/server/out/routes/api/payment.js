"use strict";
// Handles payment (IAP) endpoints.
// Private server: accepts any valid request, no real payment validation.
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
const utils_1 = require("../../utils");
const assets_1 = require("../../lib/assets");
const payment_products_json_1 = __importDefault(require("../../../assets/payment_products.json"));
const PRODUCTS = payment_products_json_1.default;
// In-memory purchase tracking (resets on server restart)
const purchaseHistory = {};
const routes = (fastify) => __awaiter(void 0, void 0, void 0, function* () {
    fastify.post("/item_list", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        const body = request.body;
        const viewerId = body.viewer_id;
        if (!viewerId || isNaN(viewerId))
            return reply.status(400).send({
                "error": "Bad Request", "message": "Invalid request body."
            });
        const session = yield (0, wdfpData_1.getSession)(viewerId.toString());
        if (!session)
            return reply.status(400).send({
                "error": "Bad Request", "message": "Invalid viewer id."
            });
        // Payment disabled on private server — return empty list
        reply.header("content-type", "application/x-msgpack");
        return reply.status(200).send({
            "data_headers": (0, utils_1.generateDataHeaders)({ viewer_id: viewerId }),
            "data": {
                "payment_item_list": [],
                "refund_penalty_status": null
            }
        });
    }));
    fastify.post("/start", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        const body = request.body;
        const viewerId = body.viewer_id;
        // Leiting SDK wraps product_id in nested payment object
        const productId = ((_a = body.payment) === null || _a === void 0 ? void 0 : _a.product_id) || body.product_id;
        if (!viewerId || isNaN(viewerId) || !productId) {
            console.warn(`[PAYMENT-START] invalid request, body: ${JSON.stringify(body)}`);
            reply.header("content-type", "application/x-msgpack");
            return reply.status(200).send({
                "data_headers": (0, utils_1.generateDataHeaders)({ viewer_id: viewerId }),
                "data": {}
            });
        }
        const session = yield (0, wdfpData_1.getSession)(viewerId.toString());
        if (!session) {
            reply.header("content-type", "application/x-msgpack");
            return reply.status(200).send({
                "data_headers": (0, utils_1.generateDataHeaders)({ viewer_id: viewerId }),
                "data": {}
            });
        }
        const product = PRODUCTS[productId];
        if (!product) {
            console.warn(`[PAYMENT-START] unknown product: ${productId}`);
            reply.header("content-type", "application/x-msgpack");
            return reply.status(200).send({
                "data_headers": (0, utils_1.generateDataHeaders)({ viewer_id: viewerId }),
                "data": {}
            });
        }
        console.log(`[PAYMENT-START] viewer ${viewerId}, product: ${productId} (paid=${product.charge_vmoney_num} free=${product.free_vmoney_num})`);
        reply.header("content-type", "application/x-msgpack");
        return reply.status(200).send({
            "data_headers": (0, utils_1.generateDataHeaders)({ viewer_id: viewerId }),
            "data": {}
        });
    }));
    fastify.post("/finish", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        var _b, _c;
        const body = request.body;
        const viewerId = body.viewer_id;
        // Leiting SDK wraps receipt in nested payment object
        const receipt = body.receipt || ((_b = body.payment) === null || _b === void 0 ? void 0 : _b.original_receipt) || "";
        if (!viewerId || isNaN(viewerId)) {
            console.warn(`[PAYMENT-FINISH] invalid viewer_id`);
            reply.header("content-type", "application/x-msgpack");
            return reply.status(200).send({
                "data_headers": (0, utils_1.generateDataHeaders)({ viewer_id: viewerId }),
                "data": {}
            });
        }
        const session = yield (0, wdfpData_1.getSession)(viewerId.toString());
        if (!session) {
            reply.header("content-type", "application/x-msgpack");
            return reply.status(200).send({
                "data_headers": (0, utils_1.generateDataHeaders)({ viewer_id: viewerId }),
                "data": {}
            });
        }
        const playerId = (0, activeAccount_1.resolvePlayerIdSync)(session.accountId);
        if (!playerId)
            return reply.status(500).send({ "error": "Internal Server Error", "message": "No player bound to account." });
        const player = (0, wdfpData_1.getPlayerSync)(playerId);
        if (!player)
            return reply.status(500).send({ "error": "Internal Server Error", "message": "Player not found." });
        // Determine product_id from pending payment
        const productId = body.product_id || "";
        const product = PRODUCTS[productId];
        if (!product) {
            console.warn(`[PAYMENT-FINISH] unknown product: ${productId}, receipt: ${receipt}`);
            reply.header("content-type", "application/x-msgpack");
            return reply.status(200).send({
                "data_headers": (0, utils_1.generateDataHeaders)({ viewer_id: viewerId }),
                "data": {}
            });
        }
        const paidVmoney = Math.max(0, isFinite(product.charge_vmoney_num) ? product.charge_vmoney_num : 0);
        const freeVmoney = Math.max(0, isFinite(product.free_vmoney_num) ? product.free_vmoney_num : 0);
        if (paidVmoney === 0 && freeVmoney === 0) {
            console.warn(`[PAYMENT-FINISH] product ${productId} has zero vmoney`);
        }
        const config = (0, assets_1.getConfigSync)();
        const maxVmoney = config.max_virtual_money;
        const afterPaid = Math.min(player.vmoney + paidVmoney, maxVmoney);
        const afterFree = Math.min(player.freeVmoney + freeVmoney, maxVmoney);
        (0, wdfpData_1.updatePlayerSync)({
            id: playerId,
            vmoney: afterPaid,
            freeVmoney: afterFree
        });
        // Track purchase count per player+product
        const purchaseKey = `${playerId}_${productId}`;
        const times = ((_c = purchaseHistory[purchaseKey]) !== null && _c !== void 0 ? _c : 0) + 1;
        purchaseHistory[purchaseKey] = times;
        console.log(`[PAYMENT-FINISH] player ${playerId}: paid ${player.vmoney}->${afterPaid} (+${paidVmoney}), free ${player.freeVmoney}->${afterFree} (+${freeVmoney}), product: ${productId}, times: ${times}`);
        reply.header("content-type", "application/x-msgpack");
        return reply.status(200).send({
            "data_headers": (0, utils_1.generateDataHeaders)({ viewer_id: viewerId }),
            "data": {
                "after_vmoney": afterPaid,
                "after_free_vmoney": afterFree,
                "first_payment": times === 1,
                "first_time": times === 1,
                "purchased_times_list": { [productId]: times },
                "monthly_payment_total": 0,
                "monthly_charge_bonus_info": null,
                "premium_bonus_list": null
            }
        });
    }));
    // Leiting SDK: report purchase result from native SDK callback
    fastify.post("/report_purchase_result", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        const body = request.body;
        console.log(`[PAYMENT-REPORT] order=${body.order_id} status=${body.status}`);
        reply.header("content-type", "application/x-msgpack");
        return reply.status(200).send({
            "data_headers": (0, utils_1.generateDataHeaders)({ viewer_id: body.viewer_id }),
            "data": {}
        });
    }));
});
exports.default = routes;
