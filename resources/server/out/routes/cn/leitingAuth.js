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
const utils_1 = require("../../utils");
const routes = (fastify) => __awaiter(void 0, void 0, void 0, function* () {
    fastify.post("/channels/channel_leiting/leiting_login", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        const body = request.body;
        reply.header("content-type", "application/x-msgpack");
        reply.status(200).send({
            data_headers: (0, utils_1.generateDataHeaders)(),
            data: {
                status: "success",
                userId: body.userId,
                data: {
                    idCard: "123456",
                    age: 18,
                    isGuest: 0,
                    auth: 1
                },
                online_server_check: true,
                heart_beat_interval: 240
            }
        });
    }));
    fastify.post("/channels/channel_leiting/leiting_antiaddiction_login", (_request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        reply.header("content-type", "application/x-msgpack");
        reply.status(200).send({
            data_headers: (0, utils_1.generateDataHeaders)(),
            data: {
                status: 0,
                message: "success",
                data: {
                    onlineTime: 0,
                    limitTime: 999999,
                    usableTime: 999999
                }
            }
        });
    }));
    fastify.post("/channels/channel_leiting/leiting_antiaddiction_logout", (_request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        reply.header("content-type", "application/x-msgpack");
        reply.status(200).send({
            data_headers: (0, utils_1.generateDataHeaders)(),
            data: {}
        });
    }));
    fastify.post("/channels/channel_leiting/leiting_update", (_request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        reply.header("content-type", "application/x-msgpack");
        reply.status(200).send({
            data_headers: (0, utils_1.generateDataHeaders)(),
            data: {}
        });
    }));
});
exports.default = routes;
