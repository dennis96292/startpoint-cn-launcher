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
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const cli_progress_1 = __importDefault(require("cli-progress"));
const readline_sync_1 = __importDefault(require("readline-sync"));
const crypto_1 = require("crypto");
const CDN_URL = "http://patch.wdfp.kakaogames.com/Live/2.0.0";
const ROOT = __dirname;
const cdn_dir = process.env.CDN_DIR || ".cdn";
const OUTPUT_DIR = path_1.default.isAbsolute(cdn_dir) ? cdn_dir : path_1.default.join(ROOT, "..", cdn_dir);
if (!(0, fs_1.existsSync)(OUTPUT_DIR)) {
    (0, fs_1.mkdirSync)(OUTPUT_DIR, {
        recursive: true
    });
}
const ASSET_LISTS_DIR = path_1.default.join(ROOT, "..", "assets/asset_lists");
const assetListsPaths = {
    "en-android": [
        path_1.default.join(ASSET_LISTS_DIR, "en-android-full.json"),
        path_1.default.join(ASSET_LISTS_DIR, "en-android-short.json")
    ],
    "ko-android": [
        path_1.default.join(ASSET_LISTS_DIR, "ko-android-full.json"),
        path_1.default.join(ASSET_LISTS_DIR, "ko-android-short.json")
    ],
    "th-android": [
        path_1.default.join(ASSET_LISTS_DIR, "th-android-full.json"),
        path_1.default.join(ASSET_LISTS_DIR, "th-android-short.json")
    ],
    "en-ios": [
        path_1.default.join(ASSET_LISTS_DIR, "en-ios-full.json")
    ],
    "ko-ios": [
        path_1.default.join(ASSET_LISTS_DIR, "ko-ios-full.json")
    ],
    "th-ios": [
        path_1.default.join(ASSET_LISTS_DIR, "th-ios-full.json")
    ]
};
const entityFileLists = {
    "en-android": "/en/entities/2.1.125-android_medium.csv",
    "ko-android": "/ko/entities/2.1.121-android_medium.csv",
    "th-android": "/th/entities/2.1.124-android_medium.csv",
    "en-ios": "/en/entities/2.1.125-ios_medium.csv",
    "ko-ios": "/ko/entities/2.1.121-ios_medium.csv",
    "th-ios": "/th/entities/2.1.124-ios_medium.csv"
};
function getAssetLocations(languages) {
    const locationSizeMap = {};
    const hashes = new Map();
    for (const lang of languages) {
        const paths = assetListsPaths[lang];
        for (const path of paths) {
            const textAssetList = (0, fs_1.readFileSync)(path, "utf-8");
            const assetList = JSON.parse(textAssetList);
            try {
                for (const data of assetList['full']['archive']) {
                    const location = data['location'].replace('{$cdnAddress}', '');
                    locationSizeMap[location] = data['size'];
                    hashes.set(location, data['sha256']);
                }
                for (const diffData of assetList['diff']) {
                    for (const data of diffData['archive']) {
                        const location = data['location'].replace('{$cdnAddress}', '');
                        locationSizeMap[location] = data['size'];
                        hashes.set(location, data['sha256']);
                    }
                }
            }
            catch (error) {
                console.log(`Error when parsing asset list data. Error: ${error}`);
            }
        }
        // load the file list
        const fileList = entityFileLists[lang];
        if (fileList !== undefined) {
            locationSizeMap[fileList] = 0;
        }
    }
    return [locationSizeMap, hashes];
}
function checkHash(start, end, locations, hashes, bar) {
    return new Promise((resolve, reject) => {
        const toInstall = [];
        for (let i = start; i < end; i++) {
            const location = locations[i];
            try {
                const outputPath = path_1.default.join(OUTPUT_DIR, location);
                // check hash
                if ((0, fs_1.existsSync)(outputPath)) {
                    const file = (0, fs_1.readFileSync)(outputPath);
                    const hash = hashes.get(location);
                    if (!location.includes("/entities/") && (0, crypto_1.createHash)('sha256').update(file).digest('base64') !== hash) {
                        toInstall.push(location);
                    }
                }
                else {
                    toInstall.push(location);
                }
                bar.increment();
            }
            catch (error) {
                reject(`Error when validating asset '${location}'. Error: ${error}`);
            }
        }
        resolve(toInstall);
    });
}
function validateAssetsMultithread(locations_1, hashes_1) {
    return __awaiter(this, arguments, void 0, function* (locations, hashes, threadCount = 8) {
        console.log("Validating CDN files...");
        const hashWork = [];
        const invalidLocations = [];
        const validateBar = new cli_progress_1.default.SingleBar({}, cli_progress_1.default.Presets.shades_classic);
        {
            const locationCount = locations.length;
            threadCount = Math.min(locationCount, threadCount);
            const locationsPerThread = Math.floor(locationCount / threadCount);
            validateBar.start(locationCount, 0);
            // validate hashes
            for (let i = 0; i < threadCount; i++) {
                const start = locationsPerThread * i;
                const end = (i == (threadCount - 1)) ? locationCount : Math.min(locationCount, start + locationsPerThread);
                hashWork.push(checkHash(start, end, locations, hashes, validateBar).then(res => invalidLocations.push(...res)));
            }
        }
        yield Promise.all(hashWork);
        validateBar.stop();
        const invalidCount = invalidLocations.length;
        const isCDNInvalid = invalidCount > 0;
        console.log(isCDNInvalid ? `Your copy of the CDN contains ${invalidCount} invalid and/or missing files.` : "Your copy of the CDN is valid.");
        if (isCDNInvalid) {
            console.log("Invalid and/or missing files: [", invalidLocations.join(", "), ']');
        }
    });
}
let platformChoice = readline_sync_1.default.question('Enter the platform you downloaded the CDN for. \nPlatform [ALL/android/ios]: ');
switch (platformChoice.trim()) {
    case 'ios':
        platformChoice = 'ios';
        break;
    case 'android':
        platformChoice = 'android';
        break;
    default:
        platformChoice = 'all';
}
console.log(`Selected platform: "${platformChoice}".`);
let langChoice = readline_sync_1.default.question('Enter the language code of the CDN you downloaded. \nLanguage Code [ALL/en/ko/th]: ');
switch (langChoice.trim()) {
    case 'en':
        langChoice = 'en';
        break;
    case 'ko':
        langChoice = 'ko';
        break;
    case 'th':
        langChoice = 'th';
        break;
    default:
        langChoice = 'all';
}
console.log(`Selected language: "${langChoice}".`);
const languages = [];
for (const [lang, _] of Object.entries(assetListsPaths)) {
    if ((langChoice === 'all' || lang.startsWith(langChoice)) && (platformChoice === 'all' || lang.endsWith(platformChoice))) {
        languages.push(lang);
    }
}
// get locations
const [locationsMap, hashes] = getAssetLocations(languages);
const locations = [];
let total_size = 0;
for (const [location, size] of Object.entries(locationsMap)) {
    locations.push(location);
    total_size += size;
}
validateAssetsMultithread(locations, hashes);
