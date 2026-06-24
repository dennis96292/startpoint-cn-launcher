"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.serializeRoomConnection = exports.serializeRoom = exports.updateHostEntryTime = exports.disbandRoom = exports.setRoomBattle = exports.updateRoomState = exports.getRooms = exports.getRoomByToken = exports.getRoom = exports.createRoom = exports.getNpcMates = exports.nextRoomSequence = exports.generateRoomNumber = exports.getDisplayHost = void 0;
const crypto_1 = require("crypto");
const os = __importStar(require("os"));
const utils_1 = require("../utils");
/** Resolve display host for TCP session. If CN_LISTEN_HOST is 0.0.0.0, auto-detect LAN IP. */
function getDisplayHost() {
    const raw = process.env.CN_LISTEN_HOST || "127.0.0.1";
    if (raw !== "0.0.0.0")
        return raw;
    const nets = os.networkInterfaces();
    for (const name of Object.keys(nets)) {
        const addrs = nets[name];
        if (!addrs)
            continue;
        for (const addr of addrs) {
            if (addr.family === "IPv4" && !addr.internal) {
                return addr.address;
            }
        }
    }
    return "127.0.0.1";
}
exports.getDisplayHost = getDisplayHost;
// In-memory room storage (rooms are transient, no DB persistence)
const rooms = new Map();
// Global room sequence counter
let roomSequence = 1;
// Room expiry time: configurable via env, default 10 minutes
const ROOM_EXPIRY_MS = parseInt(process.env.MULTI_ROOM_EXPIRY_MS || "600000");
const BATTLE_ROOM_EXPIRY_MS = parseInt(process.env.MULTI_BATTLE_ROOM_EXPIRY_MS || "600000");
const CLEAN_INTERVAL_MS = parseInt(process.env.MULTI_ROOM_CLEAN_INTERVAL_MS || "60000");
// Clean up expired rooms periodically
function cleanExpiredRooms() {
    const now = Date.now();
    const timeOffset = now - (0, utils_1.getServerTime)() * 1000;
    let cleaned = 0;
    for (const [roomNumber, room] of rooms) {
        const age = now - room.created_at;
        // Idle rooms (Ready/Recruiting): expire by creation time (both real ms)
        if (age > ROOM_EXPIRY_MS && room.raising_state <= 3) {
            rooms.delete(roomNumber);
            cleaned++;
            continue;
        }
        // Battle rooms: expire by last activity time (host_entry_time is simulated s → convert to real ms)
        if (room.raising_state === 4) {
            const hostEntryAge = now - (room.host_entry_time * 1000 + timeOffset);
            if (hostEntryAge > BATTLE_ROOM_EXPIRY_MS) {
                rooms.delete(roomNumber);
                cleaned++;
            }
        }
    }
    if (cleaned > 0)
        console.log(`[MULTI] expired rooms cleaned: ${cleaned}`);
}
setInterval(cleanExpiredRooms, CLEAN_INTERVAL_MS);
// Static access token (not used for auth in private server)
const STATIC_ACCESS_TOKEN = "multi_access_token";
// Generate a 6-digit room number
function generateRoomNumber() {
    return String((0, crypto_1.randomInt)(100000, 999999));
}
exports.generateRoomNumber = generateRoomNumber;
// Generate a unique room sequence
function nextRoomSequence() {
    return roomSequence++;
}
exports.nextRoomSequence = nextRoomSequence;
// NPC character templates
const NPC_TEMPLATES = {
    "default_1": {
        com_id: 1,
        characters: [131012, 141007, 151001],
        unison_characters: [141005, 121002, 131004],
        equipments: [200005, 1010001, 2020001],
        ability_soul_ids: [],
        rank: 80,
        degree_id: 1
    },
    "default_2": {
        com_id: 2,
        characters: [141004, 121002, 161001],
        unison_characters: [151001, 141005, 131004],
        equipments: [200005, 1010001, 2020001],
        ability_soul_ids: [],
        rank: 80,
        degree_id: 2000
    }
};
// Build a single NPC mate party from template
function buildNpcMate(template) {
    const characters = template.characters.map(id => ({
        id,
        evolution_level: 0,
        exp: 0,
        over_limit_step: 0,
        mana_node_ids: null,
        ex_boost: null
    }));
    const unisonCharacters = template.unison_characters.map(id => ({
        id,
        evolution_level: 0,
        exp: 0,
        over_limit_step: 0,
        mana_node_ids: null,
        ex_boost: null
    }));
    const equipments = template.equipments.map(equipment_id => ({
        equipment_id,
        level: 1,
        enhancement_level: 0
    }));
    const abilitySoulIds = template.ability_soul_ids.map(() => null);
    if (abilitySoulIds.length === 0) {
        abilitySoulIds.push(null, null, null);
    }
    return {
        com_id: template.com_id,
        degree_id: template.degree_id,
        rank: template.rank,
        party: {
            characters,
            unison_characters: unisonCharacters,
            equipments,
            ability_soul_ids: abilitySoulIds
        }
    };
}
// Get NPC mates for a quest (returns 2 mates)
function getNpcMates(questId, category) {
    const mate1 = buildNpcMate(NPC_TEMPLATES["default_1"]);
    const mate2 = buildNpcMate(NPC_TEMPLATES["default_2"]);
    console.log(`[MULTI] npc mates: quest=${questId} m1=${mate1 === null || mate1 === void 0 ? void 0 : mate1.com_id} m2=${mate2 === null || mate2 === void 0 ? void 0 : mate2.com_id}`);
    return { mate1, mate2 };
}
exports.getNpcMates = getNpcMates;
// Create a new room
function createRoom(hostViewerId, hostPlayerId, hostPartyId, category, questId, acceptedType, hostMainCharacterId) {
    const roomNumber = generateRoomNumber();
    const room = {
        room_number: roomNumber,
        access_token: STATIC_ACCESS_TOKEN,
        category,
        quest_id: questId,
        host_viewer_id: hostViewerId,
        host_player_id: hostPlayerId,
        host_party_id: hostPartyId,
        host_main_character_id: hostMainCharacterId,
        accepted_type: acceptedType,
        created_at: Date.now(),
        raising_state: 2, // Waiting for host to enter TCP
        room_sequence: nextRoomSequence(),
        host_entry_time: (0, utils_1.getServerTime)(),
        mates: [
            { viewer_id: null, com_id: 1 },
            { viewer_id: null, com_id: 2 }
        ],
        share_room_options: 0,
        is_npc_mode: false
    };
    rooms.set(roomNumber, room);
    console.log(`[MULTI] room created: ${roomNumber} host=${hostViewerId} category=${category} quest=${questId}`);
    return room;
}
exports.createRoom = createRoom;
// Get room by room number
function getRoom(roomNumber) {
    const room = rooms.get(roomNumber);
    if (!room)
        console.log(`[MULTI] room not found: ${roomNumber}`);
    return room;
}
exports.getRoom = getRoom;
// Get room by access token
function getRoomByToken(token) {
    for (const room of rooms.values()) {
        if (room.access_token === token)
            return room;
    }
    return undefined;
}
exports.getRoomByToken = getRoomByToken;
// Get rooms for a category (and optional event_id)
function getRooms(categoryId, eventId) {
    const result = [];
    for (const room of rooms.values()) {
        if (room.category === categoryId) {
            result.push(room);
        }
    }
    return result;
}
exports.getRooms = getRooms;
// Update room raising state
function updateRoomState(roomNumber, state) {
    const room = rooms.get(roomNumber);
    if (!room)
        return false;
    console.log(`[MULTI] room state: ${roomNumber} → ${state}`);
    room.raising_state = state;
    return true;
}
exports.updateRoomState = updateRoomState;
// Set room to battle state
function setRoomBattle(roomNumber) {
    return updateRoomState(roomNumber, 4);
}
exports.setRoomBattle = setRoomBattle;
// Disband/delete a room
function disbandRoom(roomNumber) {
    const deleted = rooms.delete(roomNumber);
    if (deleted)
        console.log(`[MULTI] room deleted: ${roomNumber}`);
    return deleted;
}
exports.disbandRoom = disbandRoom;
// Update room host entry time
function updateHostEntryTime(roomNumber) {
    const room = rooms.get(roomNumber);
    if (!room)
        return false;
    room.host_entry_time = (0, utils_1.getServerTime)();
    return true;
}
exports.updateHostEntryTime = updateHostEntryTime;
// Build room data for get_rooms response
function serializeRoom(room) {
    return {
        category_id: room.category,
        quest_id: room.quest_id,
        room_number: room.room_number,
        estabilisher_character: room.host_main_character_id,
        estabilisher_character_evolution_img_level: 0,
        estabilisher_follow: 1,
        estabilisher_name: `Player${room.host_viewer_id}`,
        host_entry_time: room.host_entry_time,
        is_pickup: false,
        mates: room.mates.length,
        raising_state: room.raising_state
    };
}
exports.serializeRoom = serializeRoom;
// Build select_room/prepare response data
function serializeRoomConnection(room) {
    const displayHost = getDisplayHost();
    const sessionPort = parseInt(process.env.SESSION_PORT || "8003");
    return {
        application_update_url: "",
        category_id: room.category,
        host_entry_time: room.host_entry_time,
        ip_address: displayHost,
        port: sessionPort,
        quest_id: room.quest_id,
        raising_state: room.raising_state,
        room_number: room.room_number,
        room_sequence: room.room_sequence,
        share_room_options: room.share_room_options,
        is_pickup: null
    };
}
exports.serializeRoomConnection = serializeRoomConnection;
