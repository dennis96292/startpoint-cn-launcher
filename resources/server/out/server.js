"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = __importDefault(require("fastify"));
const static_1 = __importDefault(require("@fastify/static"));
const msgpackr_1 = require("msgpackr");
const path_1 = __importDefault(require("path"));
// api routes
const api_1 = __importDefault(require("./routes/api"));
const asset_1 = __importDefault(require("./routes/api/asset"));
const tool_1 = __importDefault(require("./routes/api/tool"));
const reproduce_1 = __importDefault(require("./routes/api/reproduce"));
const tutorial_1 = __importDefault(require("./routes/api/tutorial"));
const gacha_1 = __importDefault(require("./routes/api/gacha"));
const party_1 = __importDefault(require("./routes/api/party"));
const expod_1 = __importDefault(require("./routes/api/expod"));
const storyQuest_1 = __importDefault(require("./routes/api/storyQuest"));
const option_1 = __importDefault(require("./routes/api/option"));
const singleBattleQuest_1 = __importDefault(require("./routes/api/singleBattleQuest"));
const multiBattleQuest_1 = __importDefault(require("./routes/api/multiBattleQuest"));
const attention_1 = __importDefault(require("./routes/api/attention"));
const character_1 = __importDefault(require("./routes/api/character"));
const partyGroup_1 = __importDefault(require("./routes/api/partyGroup"));
const equipment_1 = __importDefault(require("./routes/api/equipment"));
const exBoost_1 = __importDefault(require("./routes/api/exBoost"));
const boxGacha_1 = __importDefault(require("./routes/api/boxGacha"));
const shop_1 = __importDefault(require("./routes/api/shop"));
const encyclopedia_1 = __importDefault(require("./routes/api/encyclopedia"));
const mail_1 = __importDefault(require("./routes/api/mail"));
const rankingEvent_1 = __importDefault(require("./routes/api/rankingEvent"));
const mission_1 = __importDefault(require("./routes/api/mission"));
const payment_1 = __importDefault(require("./routes/api/payment"));
const news_1 = __importDefault(require("./routes/api/news"));
const raidEvent_1 = __importDefault(require("./routes/api/raidEvent"));
const rushEvent_1 = __importDefault(require("./routes/api/rushEvent"));
// web routes
const web_1 = __importDefault(require("./routes/web"));
// web api routes
const web_api_1 = __importDefault(require("./routes/web_api"));
// misc routes
const openapi_1 = __importDefault(require("./routes/openapi"));
const infodesk_1 = __importDefault(require("./routes/infodesk"));
// gc-openapi-zinny3.kakaogames.com
// gc-infodesk-zinny3.kakaogames.com
// na.wdfp.kakaogames.com
// initialize server
const fastify = (0, fastify_1.default)({
    logger: false
});
// serializers
fastify.addHook('onSend', (_, reply, payload, done) => {
    try {
        switch (reply.getHeader('content-type')) {
            case "application/x-msgpack": {
                done(null, (0, msgpackr_1.pack)(payload).toString('base64'));
                break;
            }
            default:
                done(null, payload);
        }
    }
    catch (error) {
        done(null, payload);
    }
});
// content-type parsers
function jsonParser(_, body, done) {
    try {
        var json = JSON.parse(body);
        done(null, json);
    }
    catch (err) {
        done(null, undefined);
    }
}
fastify.addContentTypeParser("application/x-www-form-urlencoded", { parseAs: 'string' }, (request, body, done) => {
    // on IOS, for some reason, requests to infodesk and openapi are JSON, but the content-type header is set as 'application/x-www-form-urlencoded'
    const routeUrl = request.routeOptions.url || '';
    if (routeUrl.startsWith("/openapi") || routeUrl.startsWith("/infodesk"))
        return jsonParser(request, body, done);
    try {
        const unpacked = (0, msgpackr_1.unpack)(Buffer.from(body, "base64"));
        done(null, unpacked);
    }
    catch (err) {
        done(err, undefined);
    }
});
fastify.addContentTypeParser('application/json', { parseAs: 'string' }, jsonParser);
// register plugins
//api
const apiPrefix = "/latest/api/index.php";
fastify.register(api_1.default, { prefix: apiPrefix });
fastify.register(asset_1.default, { prefix: `${apiPrefix}/asset` });
fastify.register(tool_1.default, { prefix: `${apiPrefix}/tool` });
fastify.register(reproduce_1.default, { prefix: `${apiPrefix}/reproduce` });
fastify.register(tutorial_1.default, { prefix: `${apiPrefix}/tutorial` });
fastify.register(gacha_1.default, { prefix: `${apiPrefix}/gacha` });
fastify.register(party_1.default, { prefix: `${apiPrefix}/party` });
fastify.register(expod_1.default, { prefix: `${apiPrefix}/expod` });
fastify.register(storyQuest_1.default, { prefix: `${apiPrefix}/story_quest` });
fastify.register(option_1.default, { prefix: `${apiPrefix}/option` });
fastify.register(singleBattleQuest_1.default, { prefix: `${apiPrefix}/single_battle_quest` });
fastify.register(multiBattleQuest_1.default, { prefix: `${apiPrefix}/multi_battle_quest` });
fastify.register(attention_1.default, { prefix: `${apiPrefix}/attention` });
fastify.register(character_1.default, { prefix: `${apiPrefix}/character` });
fastify.register(partyGroup_1.default, { prefix: `${apiPrefix}/party_group` });
fastify.register(equipment_1.default, { prefix: `${apiPrefix}/equipment` });
fastify.register(exBoost_1.default, { prefix: `${apiPrefix}/ex_boost` });
fastify.register(boxGacha_1.default, { prefix: `${apiPrefix}/box_gacha` });
fastify.register(shop_1.default, { prefix: `${apiPrefix}/shop` });
fastify.register(encyclopedia_1.default, { prefix: `${apiPrefix}/encyclopedia` });
fastify.register(mail_1.default, { prefix: `${apiPrefix}/mail` });
fastify.register(rankingEvent_1.default, { prefix: `${apiPrefix}/ranking_event` });
fastify.register(mission_1.default, { prefix: `${apiPrefix}/mission` });
fastify.register(payment_1.default, { prefix: `${apiPrefix}/payment` });
fastify.register(news_1.default, { prefix: `${apiPrefix}/news` });
fastify.register(raidEvent_1.default, { prefix: `${apiPrefix}/event/raid` });
fastify.register(rushEvent_1.default, { prefix: `${apiPrefix}/event/rush` });
// openapi
fastify.register(openapi_1.default, { prefix: "/openapi/service" });
// infodesk
fastify.register(infodesk_1.default, { prefix: "/infodesk" });
// web routes
fastify.register(web_1.default, { prefix: "/" });
// web api routes
fastify.register(web_api_1.default, { prefix: "/api" });
// web static
fastify.register(static_1.default, {
    root: path_1.default.join(__dirname, "..", "web/public"),
    prefix: "/public",
    decorateReply: false
});
// static CDN
const cdnDir = process.env.CDN_DIR || ".cdn";
fastify.register(static_1.default, {
    root: path_1.default.isAbsolute(cdnDir) ? cdnDir : path_1.default.join(__dirname, "..", process.env.CDN_DIR || ".cdn"),
    prefix: "/patch/Live/2.0.0",
    decorateReply: false
});
// listen
const listenHost = (_a = process.env.LISTEN_HOST) !== null && _a !== void 0 ? _a : "localhost";
const envListenPort = process.env.LISTEN_PORT === undefined ? 8000 : Number.parseInt(process.env.LISTEN_PORT);
const listenPort = isNaN(envListenPort) ? 8000 : envListenPort;
fastify.listen({ port: listenPort, host: listenHost }, (err, address) => {
    if (err) {
        console.error(err);
        fastify.log.error(err);
        process.exit(1);
    }
    console.log(`StarPoint is listening on http://${listenHost}:${listenPort}`);
});
