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
const wdfpData_1 = require("../../data/wdfpData");
const activeAccount_1 = require("../../data/activeAccount");
const utils_1 = require("../../utils");
const updateRoute = (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
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
    if (playerId === null)
        return reply.status(500).send({
            "error": "Internal Server Error",
            "message": "No player bound to account."
        });
    // update options
    const updatedOptions = body.option_params;
    (0, wdfpData_1.updatePlayerOptionsSync)(playerId, updatedOptions);
    reply.header("content-type", "application/x-msgpack");
    return reply.status(200).send({
        "data_headers": (0, utils_1.generateDataHeaders)({
            viewer_id: viewerId
        }),
        "data": {
            "user_option": updatedOptions
        }
    });
});
const routes = (fastify) => __awaiter(void 0, void 0, void 0, function* () {
    fastify.post("/update", updateRoute);
    fastify.post("/update_in_battle", updateRoute);
});
exports.default = routes;
