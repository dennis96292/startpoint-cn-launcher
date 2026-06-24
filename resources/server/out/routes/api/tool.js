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
const wdfpData_1 = require("../../data/wdfpData");
const utils_1 = require("../../utils");
const routes = (fastify) => __awaiter(void 0, void 0, void 0, function* () {
    fastify.post("/get_header_response", (request, reply) => {
        const body = request.body;
        reply.header("content-type", "application/x-msgpack");
        reply.status(200).send({
            "data_headers": (0, utils_1.generateDataHeaders)({
                viewer_id: body.viewer_id
            }),
            "data": []
        });
    });
    fastify.post("/signup", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        const body = request.body;
        const zat = body.access_token;
        if (!zat)
            return reply.status(400).send({
                "error": "Bad Request",
                "message": "Invalid request body."
            });
        const udid = request.headers['udid'];
        if (!udid)
            return reply.status(400).send({
                "error": "Bad Request",
                "message": "Invalid headers."
            });
        const session = yield (0, wdfpData_1.getSession)(zat);
        if (session === null || session.type !== types_1.SessionType.ZAT)
            return reply.status(400).send({
                "error": "Bad Request",
                "message": "Invalid zat provided."
            });
        const accountId = session.accountId;
        // Create the player data if it doesn't exist.
        const accountPlayer = (0, wdfpData_1.getPlayerFromAccountIdSync)(accountId);
        if (accountPlayer === null) {
            // create new player account
            (0, wdfpData_1.insertDefaultPlayerSync)(accountId);
        }
        // generate viewer id
        const viewerIds = yield (0, wdfpData_1.getAccountSessionsOfType)(accountId, types_1.SessionType.VIEWER);
        const viewerId = !viewerIds[0] ? yield (0, wdfpData_1.generateViewerIdSession)(accountId) : viewerIds[0];
        reply.header("content-type", "application/x-msgpack");
        reply.status(200).send({
            "data_headers": (0, utils_1.generateDataHeaders)({
                viewer_id: Number.parseInt(viewerId.token),
                udid: String(udid)
            }, ['short_udid', 'viewer_id', 'udid', 'servertime', 'result_code']),
            "data": []
        });
    }));
});
exports.default = routes;
