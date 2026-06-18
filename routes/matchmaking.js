const express = require("express");
const app = express.Router();
const fs = require("fs");
const functions = require("../structs/functions.js");

const { verifyToken, verifyClient } = require("../tokenManager/tokenVerify.js");

let buildUniqueId = {};

app.get("/fortnite/api/game/v2/matchmakingservice/ticket/player/*", verifyToken, (req, res) => {
    const bucketId = req.query.bucketId || "";
    if (!bucketId) return res.status(400).end();

    const parts = bucketId.split(":");
    buildUniqueId[req.user.accountId] = parts[0];

    const matchmakerUrl = (process.env.MATCHMAKER_IP || "ws://backend-leilos-services.crisu.qzz.io:8080").replace(/"/g, "").trim();

    res.json({
        "serviceUrl": matchmakerUrl,
        "ticketType": "mms-player",
        "payload": "69=",
        "signature": "account"
    });
});

app.get("/fortnite/api/game/v2/matchmaking/account/:accountId/session/:sessionId", (req, res) => {
    res.json({
        "accountId": req.params.accountId,
        "sessionId": req.params.sessionId,
        "key": "none"
    });
});

app.get("/fortnite/api/matchmaking/session/:sessionId", verifyToken, (req, res) => {
    const bucketId = req.query.bucketId || "";
    const parts = bucketId.split(":");
    const region = parts[2] || "EU";
    const rawPlaylist = parts[3] || "Playlist_DefaultSolo";
    const playlist = functions.PlaylistNames(rawPlaylist);

    let serverIp = "127.0.0.1";
    let serverPort = 7777;

    const EU_IP = (process.env.EU_IP || "mad-eu.leilos.qzz.io:7777").replace(/"/g, "").trim();
    const NAE_IP = (process.env.NAE_IP || "nae-.leilos.qzz.io:7777").replace(/"/g, "").trim();

    if (region.toUpperCase() === "NAE" || region.toUpperCase() === "NA") {
        const naeParts = NAE_IP.split(":");
        serverIp = naeParts[0];
        serverPort = Number(naeParts[1]) || 7777;
    } else {
        const euParts = EU_IP.split(":");
        serverIp = euParts[0];
        serverPort = Number(euParts[1]) || 7777;
    }

    res.json({
        "id": req.params.sessionId,
        "ownerId": functions.MakeID().replace(/-/ig, "").toUpperCase(),
        "ownerName": "SnouweServer",
        "serverName": "SnouweServer",
        "serverAddress": serverIp,
        "serverPort": serverPort,
        "maxPublicPlayers": 100,
        "openPublicPlayers": 100,
        "maxPrivatePlayers": 0,
        "openPrivatePlayers": 0,
        "attributes": {
          "REGION_s": region.toUpperCase(),
          "GAMEMODE_s": "FORTATHENA",
          "ALLOWBROADCASTING_b": true,
          "SUBREGION_s": region.toUpperCase() === "NAE" ? "VA" : "GB",
          "DCID_s": region.toUpperCase() === "NAE" ? "FORTNITE-LIVENAEC1C2E30UBRCORE0A-14840880" : "FORTNITE-LIVEEUGCEC1C2E30UBRCORE0A-14840880",
          "tenant_s": "Fortnite",
          "MATCHMAKINGPOOL_s": "Any",
          "STORMSHIELDDEFENSETYPE_i": 0,
          "HOTFIXVERSION_i": 0,
          "PLAYLISTNAME_s": playlist,
          "SESSIONKEY_s": functions.MakeID().replace(/-/ig, "").toUpperCase(),
          "SESSION_ID_s": req.params.sessionId,
          "TENANT_s": "Fortnite",
          "BEACONPORT_i": 15009,
          "MATCHMAKING_VERSION_i": 1,
          "REGION_CUSTOM_s": region.toUpperCase(),
          "NEEDS_GS_JOIN_b": true,
          "IS_DEDICATED_b": true,
          "ALLOW_JOIN_IN_PROGRESS_b": false,
          "BUILDID_i": 32112345,
          "MAPNAME_s": "Athena",
        },
        "publicPlayers": [],
        "privatePlayers": [],
        "totalPlayers": 1,
        "allowJoinInProgress": false,
        "shouldAdvertise": false,
        "isDedicated": false,
        "usesStats": false,
        "allowInvites": false,
        "usesPresence": false,
        "allowJoinViaPresence": true,
        "allowJoinViaPresenceFriendsOnly": false,
        "buildUniqueId": buildUniqueId[req.user.accountId] || "0",
        "lastUpdated": new Date().toISOString(),
        "started": true
      });
});

app.post("/fortnite/api/matchmaking/session/*/join", (req, res) => {
    res.status(204).end();
});

app.get("/fortnite/api/matchmaking/session/findPlayer/*", (req, res) => {
    res.json({
        "results": [],
        "hasMore": false
    });
});

app.post("/fortnite/api/matchmaking/session/matchMakingRequest", (req, res) => {
    res.json([]);
});


module.exports = app;

