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
const types_1 = require("../data/types");
const wdfpData_1 = require("../data/wdfpData");
const utils_1 = require("../utils");
const routes = (fastify) => __awaiter(void 0, void 0, void 0, function* () {
    fastify.post("/v3/util/country/get", (_, reply) => {
        reply.status(200).send({
            "country": "en"
        });
    });
    fastify.post("/v4/device/accessToken/create", (_, reply) => {
        //const body = request.body as CreateDeviceAccessTokenBody
        reply.status(200).send({
            "accessToken": "fwPla7fQ8ty9+DZT/lD//uWZD4uD6C4lD6gGIIZTLKRTQ52/SLCRmk/370jcWGs+e+1iSoZtL7lj8ov9B0/jHmijH4nsHPQT6pchaQM1M9mtwYNQq0BWhVr9hF0jjCK/a5LIVd1kBac/Gemv29WKEDKSrUS9HxxUigoPRwtOy8m+oDj9FmDJZ+rzqWCc0QjES4Ky0fTpXZ7ESoguDzNmRtW3FYr+OFexw8wBPlwiC4w=",
            "expiryTime": new Date().getTime() + 4600000
        });
    });
    fastify.post("/v3/zat/login", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        const body = request.body;
        const clientZat = body.zat;
        if (!clientZat)
            return reply.status(400).send({
                "error": "Bad Request",
                "message": "Invalid request body."
            });
        let session = yield (0, wdfpData_1.getSession)(clientZat);
        if (session === null) {
            // attempt to generate a new session
            const idpAlias = (0, utils_1.generateIdpAlias)(body.appId, body.deviceId, body.os);
            const accountId = Number.parseInt(body.playerId);
            const account = isNaN(accountId) ? null : yield (0, wdfpData_1.getAccount)(accountId);
            if (account && account.idpAlias === idpAlias) {
                // delete old session
                yield (0, wdfpData_1.deleteAccountSessionsOfType)(account.id, types_1.SessionType.ZAT);
                // generate new zat session
                session = yield (0, wdfpData_1.insertSession)({
                    expires: new Date(new Date().getTime() + 43200000),
                    accountId: account.id,
                    type: types_1.SessionType.ZAT
                });
            }
        }
        if (session === null || session.type !== types_1.SessionType.ZAT)
            return reply.status(400).send({
                "error": "Bad Request",
                "message": "Invalid zat provided."
            });
        // get the Account assigned to the session
        const account = yield (0, wdfpData_1.updateAccount)({
            id: session.accountId,
            lastLoginTime: new Date()
        })
            .catch(err => {
            console.log(err);
            reply.status(500).send({
                "error": "Internal Server Error",
                "message": "No account assigned to session."
            });
            return null;
        });
        if (!account)
            return;
        // create new zat session
        yield (0, wdfpData_1.deleteSession)(session.token);
        const newSession = yield (0, wdfpData_1.insertSession)({
            expires: new Date(new Date().getTime() + 43200000),
            accountId: account.id,
            type: types_1.SessionType.ZAT
        });
        reply.status(200).send({
            "externalToken": "",
            "firstLogin": false,
            "player": {
                "agreement": {
                    "E001": "y",
                    "E002": "y",
                    "E006": "y",
                    "N002": "n",
                    "N003": "n",
                    "timestamp": "1717623430484"
                },
                "appId": account.appId,
                "firstLoginTime": account.firstLoginTime.getTime(),
                "idpAlias": account.idpAlias,
                "idpCode": account.idpCode,
                "idpId": account.idpId,
                "lang": body.lang,
                "lastLoginTime": account.lastLoginTime.getTime(),
                "playerId": account.id.toString(),
                "pushOption": {
                    "night": "n",
                    "player": "n"
                },
                "regTime": account.regTime.getTime(),
                "status": account.status
            },
            "zat": newSession.token,
            "zatExpiryTime": newSession.expires.getTime()
        });
    }));
    fastify.post("/v3/push/token/register", (_, reply) => {
        //const body = request.body as PushTokenRegisterBody
        reply.status(200).send({});
    });
    /**
     * Tells the client the status of the user's policy agreements.
     */
    fastify.post("/v3/agreement/getForLogin", (request, reply) => {
        const body = request.body;
        // We want to skip any policy screens, so we just send data to the client indicating prior completion.
        reply.status(200).send({
            "adAgreementStatus": "n",
            "agreement": {
                "E001": "y",
                "E002": "y",
                "E006": "y",
                "N002": "n",
                "N003": "n",
                "timestamp": (new Date().getTime() * 1000).toString()
            },
            "agreementPopup": "n",
            "appId": body.appId,
            "appName": "World Flipper (NA)",
            "context": "login",
            "country": body.country,
            "firstAgreement": "n",
            "idpCode": body.idpCode,
            "idpId": "6076008646",
            "informationSecurityCountry": "kr",
            "kakaoSyncAgreementGetSet": "n",
            "kakaoSyncStatus": "off",
            "kakaogameSdkVer": "3.0",
            "lang": body.lang,
            "partnerId": 825,
            "partnerName": "주식회사 카카오게임즈",
            "plusFriendStatusInfo": null,
            "policyApplyTime": 1630854000000
        });
    });
    fastify.post("/v3/player/heartbeat", (_, reply) => {
        //const body = request.body as PlayerHeartbeatBody
        reply.status(200).send({});
    });
    fastify.post("/v4/auth/loginDevice", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        const body = request.body;
        // validate body
        const appId = body.appId;
        const deviceId = body.deviceId;
        const serialNo = body.serialNo;
        if (!appId || !deviceId || !serialNo)
            return reply.status(400).send({
                "error": "Bad Request",
                "message": "Invalid request body."
            });
        // get player id from the headers if it exists
        const rawAccountId = request.headers['playerid'];
        const accountId = rawAccountId ? Number.parseInt(rawAccountId) : undefined;
        const idpAlias = (0, utils_1.generateIdpAlias)(appId, deviceId, serialNo);
        const idpId = body.whiteKey;
        // create account
        const existingAccount = accountId === undefined ? (0, wdfpData_1.getAccountFromIdpIdSync)(idpId) : yield (0, wdfpData_1.getAccount)(accountId);
        const account = existingAccount === null ? yield (0, wdfpData_1.insertAccount)({
            appId: body.appId,
            idpAlias: idpAlias,
            idpCode: "zd3",
            idpId: idpId,
            status: "normal",
        }) : existingAccount;
        if (account === null || account.idpId !== idpId)
            return reply.status(400).send({
                "error": "Bad Request",
                "message": "Invalid playerId provided."
            });
        if (accountId) {
            // delete all previous sessions
            yield (0, wdfpData_1.deleteAccountSessionsOfType)(accountId, types_1.SessionType.ZAT);
            yield (0, wdfpData_1.deleteAccountSessionsOfType)(accountId, types_1.SessionType.ZRT);
        }
        if (existingAccount === null || existingAccount.idpAlias !== idpAlias) {
            yield (0, wdfpData_1.updateAccount)({
                id: account.id,
                idpAlias: idpAlias
            });
        }
        const zatToken = yield (0, wdfpData_1.insertSession)({
            expires: new Date(new Date().getTime() + 43200000),
            accountId: account.id,
            type: types_1.SessionType.ZAT
        });
        const zrtToken = yield (0, wdfpData_1.insertSession)({
            expires: new Date(new Date().getTime() + 2592000000),
            accountId: account.id,
            type: types_1.SessionType.ZRT
        });
        reply.status(200).send({
            "externalToken": "",
            "firstLogin": true,
            "player": {
                "appId": account.appId,
                "firstLoginTime": account.firstLoginTime.getTime(),
                "idpAlias": idpAlias,
                "idpCode": account.idpCode,
                "idpId": account.idpId,
                "playerId": account.id.toString(),
                "pushOption": {
                    "night": "n",
                    "player": "n"
                },
                "regTime": account.regTime.getTime(),
                "status": account.status
            },
            "zat": zatToken.token,
            "zatExpiryTime": zatToken.expires.getTime(),
            "zrt": zrtToken.token,
            "zrtExpiryTime": zrtToken.expires.getTime()
        });
    }));
});
exports.default = routes;
