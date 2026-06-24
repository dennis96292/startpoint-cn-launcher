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
Object.defineProperty(exports, "__esModule", { value: true });
const types_1 = require("../../data/types");
const utils_1 = require("../../data/utils");
const wdfpData_1 = require("../../data/wdfpData");
const activeAccount_1 = require("../../data/activeAccount");
const utils_2 = require("../../utils");
const routes = (fastify) => __awaiter(void 0, void 0, void 0, function* () {
    fastify.post("/load", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        const body = request.body;
        const zat = body.access_token;
        let viewerId = body.viewer_id;
        if (!zat || !viewerId || isNaN(viewerId))
            return reply.status(400).send({
                "error": "Bad Request",
                "message": "Invalid request body."
            });
        const session = yield (0, wdfpData_1.getSession)(zat);
        if (session === null || session.type !== types_1.SessionType.ZAT)
            return reply.status(400).send({
                "error": "Bad Request",
                "message": "Invalid zat provided."
            });
        const viewerSession = yield (0, wdfpData_1.getSession)(String(viewerId));
        if (viewerSession === null || viewerSession.type !== types_1.SessionType.VIEWER)
            return reply.status(400).send({
                "error": "Bad Request",
                "message": "Invalid viewer ID provided."
            });
        const accountId = session.accountId;
        const playerId = (0, activeAccount_1.resolvePlayerIdSync)(accountId);
        const player = playerId !== null ? (0, wdfpData_1.getPlayerSync)(playerId) : null;
        if (player === null)
            return reply.status(500).send({
                "error": "Internal Server Error",
                "message": "No players bound to account."
            });
        // get last login time
        (0, wdfpData_1.dailyResetPlayerDataSync)(player);
        // collect the player's pooled exp
        (0, wdfpData_1.collectPlayerDataPooledExpSync)(player);
        const clientData = (0, utils_1.getClientSerializedData)(playerId, { viewerId: viewerId });
        if (clientData === null)
            return reply.status(500).send({
                "error": "Internal Server Error",
                "message": "No player data."
            });
        reply.header("content-type", "application/x-msgpack");
        reply.status(200).send({
            "data_headers": (0, utils_2.generateDataHeaders)({
                asset_update: true,
                viewer_id: viewerId
            }),
            "data": clientData
        });
    }));
});
exports.default = routes;
