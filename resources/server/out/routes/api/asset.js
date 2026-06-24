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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.availableAssetVersion = void 0;
const en_android_full_json_1 = __importDefault(require("../../../assets/asset_lists/en-android-full.json"));
const en_android_short_json_1 = __importDefault(require("../../../assets/asset_lists/en-android-short.json"));
const en_ios_full_json_1 = __importDefault(require("../../../assets/asset_lists/en-ios-full.json"));
const ko_android_full_json_1 = __importDefault(require("../../../assets/asset_lists/ko-android-full.json"));
const ko_android_short_json_1 = __importDefault(require("../../../assets/asset_lists/ko-android-short.json"));
const ko_ios_full_json_1 = __importDefault(require("../../../assets/asset_lists/ko-ios-full.json"));
const th_android_full_json_1 = __importDefault(require("../../../assets/asset_lists/th-android-full.json"));
const th_android_short_json_1 = __importDefault(require("../../../assets/asset_lists/th-android-short.json"));
const th_ios_full_json_1 = __importDefault(require("../../../assets/asset_lists/th-ios-full.json"));
const utils_1 = require("../../utils");
const fs_1 = require("fs");
const crypto_1 = require("crypto");
const path_1 = __importDefault(require("path"));
/**
 * Gets a base path list for a platform & language.
 *
 * @param platform
 * @param lang
 * @param full Whether the path list should be for the partial or full sizes.
 * @returns
 */
function getBasePathList(platform, lang, full) {
    switch (platform) {
        case utils_1.Platform.ANDROID:
            switch (lang) {
                case "ko":
                    return full || !koShortAvailable ? ko_android_full_json_1.default : ko_android_short_json_1.default;
                case "th":
                    return full || !thShortAvailable ? th_android_full_json_1.default : th_android_short_json_1.default;
                default:
                    return full || !enShortAvailable ? en_android_full_json_1.default : en_android_short_json_1.default;
            }
        case utils_1.Platform.IOS:
            switch (lang) {
                case "ko":
                    return ko_ios_full_json_1.default;
                case "th":
                    return th_ios_full_json_1.default;
                default:
                    return en_ios_full_json_1.default;
            }
    }
}
/**
 * Generates a CDN version string from a version number.
 *
 * @param version
 * @returns
 */
function getCDNVersionString(version) {
    return `2.1.${version}`;
}
// check whether short CDNs are available.
const envCdnDir = process.env.CDN_DIR || ".cdn";
const cdnDir = path_1.default.isAbsolute(envCdnDir) ? envCdnDir : path_1.default.join(__dirname, "..", "..", "..", envCdnDir);
const enShortAvailable = (0, fs_1.existsSync)(path_1.default.join(cdnDir, "en", "entities", "files"));
const koShortAvailable = (0, fs_1.existsSync)(path_1.default.join(cdnDir, "ko", "entities", "files"));
const thShortAvailable = (0, fs_1.existsSync)(path_1.default.join(cdnDir, "th", "entities", "files"));
// mod directory
const modsDir = path_1.default.join(cdnDir, "mods");
const modsExist = (0, fs_1.existsSync)(modsDir);
// metadata
const cdnMetadataPath = path_1.default.join(envCdnDir, "metadata.json");
let cdnMetadata = {
    version: 125,
    mods: []
};
// load metadata
if ((0, fs_1.existsSync)(cdnMetadataPath)) {
    try {
        const data = (0, fs_1.readFileSync)(cdnMetadataPath).toString('utf8');
        cdnMetadata = JSON.parse(data);
    }
    catch (error) {
        console.log(`Error when reading CDN metadata: ${error}`);
    }
}
// load mods
if (modsExist) {
    try {
        const modZipNames = (0, fs_1.readdirSync)(modsDir);
        const loadedMods = cdnMetadata.mods;
        // check if we need to update the asset version (load new mods)
        let update = loadedMods.length !== modZipNames.length;
        if (!update) {
            for (const mod of loadedMods) {
                const modPath = path_1.default.join(modsDir, "..", mod.location.replace("{$cdnAddress}", ""));
                update = (0, fs_1.existsSync)(modPath) ? (0, crypto_1.createHash)('sha256').update((0, fs_1.readFileSync)(modPath)).digest('base64') !== mod.sha256 : true;
                if (update) {
                    break;
                }
            }
        }
        if (update) {
            console.log("Loading Mods...");
            const newLoadedMods = [];
            for (const modZipName of modZipNames) {
                const modZipPath = path_1.default.join(modsDir, modZipName);
                const stats = (0, fs_1.statSync)(modZipPath);
                // calculate hash
                newLoadedMods.push({
                    location: `{$cdnAddress}/mods/${modZipName}`,
                    size: stats.size,
                    sha256: (0, crypto_1.createHash)('sha256').update((0, fs_1.readFileSync)(modZipPath)).digest('base64')
                });
            }
            cdnMetadata = {
                version: cdnMetadata.version += 1,
                mods: newLoadedMods
            };
            // save metadata
            const toSave = JSON.stringify(cdnMetadata);
            (0, fs_1.writeFileSync)(cdnMetadataPath, toSave, { encoding: "utf-8" });
        }
        console.log(`${cdnMetadata.mods.length} Mods Loaded.`);
    }
    catch (error) {
        console.log(`Error when loading mods: ${error}`);
    }
}
const latestMajFirstVersion = "2.1.0";
exports.availableAssetVersion = getCDNVersionString(cdnMetadata.version);
const routes = (fastify) => __awaiter(void 0, void 0, void 0, function* () {
    fastify.post("/version_info", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        const platform = (0, utils_1.getRequestPlatformSync)(request);
        const deviceLang = request.headers['device_lang'] || 'en';
        let baseUrl = '';
        let filesList = '';
        let totalSize = 0;
        let delayedAssetsSize = 0;
        switch (platform) {
            case utils_1.Platform.ANDROID:
                switch (deviceLang) {
                    case "ko":
                        baseUrl = '{$cdnAddress}/ko/entities/files/';
                        filesList = '{$cdnAddress}/ko/entities/2.1.121-android_medium.csv';
                        totalSize = 8846079322;
                        delayedAssetsSize = 6919955738;
                        break;
                    case "th":
                        baseUrl = '{$cdnAddress}/th/entities/files/';
                        filesList = '{$cdnAddress}/th/entities/2.1.124-android_medium.csv';
                        totalSize = 8846063872;
                        delayedAssetsSize = 6919955738;
                        break;
                    default:
                        baseUrl = '{$cdnAddress}/en/entities/files/';
                        filesList = '{$cdnAddress}/en/entities/2.1.125-android_medium.csv';
                        totalSize = 8846063846;
                        delayedAssetsSize = 6919955738;
                }
                break;
            case utils_1.Platform.IOS:
                switch (deviceLang) {
                    case "ko":
                        baseUrl = '{$cdnAddress}/ko/entities/files/';
                        filesList = '{$cdnAddress}/ko/entities/2.1.121-ios_medium.csv';
                        totalSize = 7928642125;
                        delayedAssetsSize = 6362644965;
                        break;
                    case "th":
                        baseUrl = '{$cdnAddress}/th/entities/files/';
                        filesList = '{$cdnAddress}/th/entities/2.1.124-ios_medium.csv';
                        totalSize = 7928642125;
                        delayedAssetsSize = 6362644965;
                        break;
                    default:
                        baseUrl = '{$cdnAddress}/en/entities/files/';
                        filesList = '{$cdnAddress}/en/entities/2.1.125-ios_medium.csv';
                        totalSize = 7928642125;
                        delayedAssetsSize = 6362644965;
                }
                break;
        }
        reply.header("content-type", "application/x-msgpack");
        reply.status(200).send({
            "data_headers": (0, utils_1.generateDataHeaders)(),
            "data": {
                "base_url": baseUrl,
                "files_list": filesList,
                "total_size": totalSize,
                "delayed_assets_size": delayedAssetsSize
            }
        });
    }));
    fastify.post("/get_path", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        const body = request.body;
        const deviceLang = request.headers['device_lang'];
        const sizeHeader = request.headers['asset_size'];
        const currentVersionHeader = request.headers['res_ver'];
        if (!deviceLang)
            return reply.status(400).send({
                "error": "Bad Request",
                "message": "Invalid headers provided."
            });
        // get the platform that this request originates from.
        const platform = (0, utils_1.getRequestPlatformSync)(request);
        const sendFull = sizeHeader === 'fulfill';
        const headers = (0, utils_1.generateDataHeaders)({
            viewer_id: body.viewer_id,
            asset_update: true
        });
        reply.header("content-type", "application/x-msgpack");
        reply.status(200);
        if (currentVersionHeader !== undefined && (currentVersionHeader !== exports.availableAssetVersion)) {
            // update required, not initial
            const pathList = {
                info: {
                    client_asset_version: String(currentVersionHeader),
                    target_asset_version: exports.availableAssetVersion,
                    eventual_target_asset_version: exports.availableAssetVersion,
                    is_initial: false,
                    latest_maj_first_version: latestMajFirstVersion
                },
                full: {
                    version: exports.availableAssetVersion,
                    archive: cdnMetadata.mods
                },
                diff: [],
                asset_version_hash: ""
            };
            return reply.send({
                "data_headers": headers,
                "data": pathList
            });
        }
        else {
            // send
            return reply.send({
                "data_headers": headers,
                "data": getBasePathList(platform, String(deviceLang), sendFull)
            });
        }
    }));
});
exports.default = routes;
