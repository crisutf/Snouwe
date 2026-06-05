const express = require("express");
const fs = require("fs");
const app = express.Router();
const path = require("path");

const { verifyToken, verifyClient } = require("../tokenManager/tokenVerify.js");
const log = require("../structs/log.js");
const Arena = require("../model/arena.js");
const User = require("../model/user.js");
const functions = require("../structs/functions.js");

app.get("/api/logs", (req, res) => {
    res.json(log.getRecentLogs());
});

app.post("/fortnite/api/game/v2/chat/*/*/*/pc", (req, res) => {
    let resp = process.env.ENABLE_GLOBAL_CHAT === "true" ? { "GlobalChatRooms": [{ "roomName": "lawinserverglobal" }] } : {};

    res.json(resp);
});

app.post("/fortnite/api/game/v2/tryPlayOnPlatform/account/*", (req, res) => {
    res.setHeader("Content-Type", "text/plain");
    res.send(true);
});

app.get("/launcher/api/public/distributionpoints/", (req, res) => {
    res.json({
        "distributions": [
            "https://download.epicgames.com/",
            "https://download2.epicgames.com/",
            "https://download3.epicgames.com/",
            "https://download4.epicgames.com/",
            "https://epicgames-download1.akamaized.net/"
        ]
    });
});

app.get("/launcher/api/public/assets/*", async (req, res) => {
    res.json({
        "appName": "FortniteContentBuilds",
        "labelName": "LawinServer",
        "buildVersion": "++Fortnite+Release-28.30-CL-19458861-Windows",
        "catalogItemId": "5cb97847cee34581afdbc445400e2f77",
        "expires": "9999-12-31T23:59:59.999Z",
        "items": {
            "MANIFEST": {
                "signature": "LawinServer",
                "distribution": "https://lawinserver.ol.epicgames.com/",
                "path": "Builds/Fortnite/Content/CloudDir/LawinServer.manifest",
                "hash": "55bb954f5596cadbe03693e1c06ca73368d427f3",
                "additionalDistributions": []
            },
            "CHUNKS": {
                "signature": "LawinServer",
                "distribution": "https://lawinserver.ol.epicgames.com/",
                "path": "Builds/Fortnite/Content/CloudDir/LawinServer.manifest",
                "additionalDistributions": []
            }
        },
        "assetId": "FortniteContentBuilds"
    });
})

app.get("/Builds/Fortnite/Content/CloudDir/*.manifest", async (req, res) => {
    res.set("Content-Type", "application/octet-stream")

    const manifest = fs.readFileSync(path.join(__dirname, "..", "responses", "CloudDir", "LawinServer.manifest"));

    res.status(200).send(manifest).end();
})

app.get("/Builds/Fortnite/Content/CloudDir/*.chunk", async (req, res) => {
    res.set("Content-Type", "application/octet-stream")

    const chunk = fs.readFileSync(path.join(__dirname, "..", "responses", "CloudDir", "LawinServer.chunk"));

    res.status(200).send(chunk).end();
})

app.get("/Builds/Fortnite/Content/CloudDir/*.ini", async (req, res) => {
    const ini = fs.readFileSync(path.join(__dirname, "..", "responses", "CloudDir", "Full.ini"));

    res.status(200).send(ini).end();
})

app.get("/waitingroom/api/waitingroom", (req, res) => {
    res.status(204);
    res.end();
});

app.get("/socialban/api/public/v1/*", (req, res) => {
    res.json({
        "bans": [],
        "warnings": []
    });
});

app.get("/fortnite/api/game/v2/events/tournamentandhistory/*/EU/WindowsClient", (req, res) => {
    res.json({});
});

app.get("/fortnite/api/statsv2/account/:accountId", (req, res) => {
    res.json({
        "startTime": 0,
        "endTime": 0,
        "stats": {},
        "accountId": req.params.accountId
    });
});

app.get("/statsproxy/api/statsv2/account/:accountId", (req, res) => {
    res.json({
        "startTime": 0,
        "endTime": 0,
        "stats": {},
        "accountId": req.params.accountId
    });
});

app.get("/fortnite/api/stats/accountId/:accountId/bulk/window/alltime", (req, res) => {
    res.json({
        "startTime": 0,
        "endTime": 0,
        "stats": {},
        "accountId": req.params.accountId
    });
});

app.post("/fortnite/api/feedback/*", (req, res) => {
    res.status(200);
    res.end();
});

app.post("/fortnite/api/statsv2/query", (req, res) => {
    res.json([]);
});

app.post("/statsproxy/api/statsv2/query", (req, res) => {
    res.json([]);
});

app.get("/*/api/statsv2/leaderboards/:leaderboardName", async (req, res) => {
    try {
        let entries = [];
        let maxSize = 100;

        if (req.query.maxSize) {
            if (req.query.maxSize <= 150 && req.query.maxSize > 0) {
                maxSize = Number(req.query.maxSize);
            }
        }

        if (req.params.leaderboardName.toLowerCase().includes("hype")) {
            const arenaStats = await Arena.find({}).sort({ hype: -1 }).limit(maxSize);
            
            for (const stat of arenaStats) {
                 const findUser = await User.findOne({ accountId: stat.accountId });
                 if (!findUser) continue;

                 entries.push({
                     displayName: findUser.username,
                     account: findUser.accountId,
                     value: stat.hype
                 });
            }
        }

        res.json({
            maxSize: maxSize,
            entries: entries
        });
    } catch (err) {
        log.error(`Leaderboard Error: ${err}`);
        res.json({
            error: "stat not found"
        });
    }
});

app.post("/fortnite/api/game/v2/events/v2/setSubgroup/*", (req, res) => {
    res.status(204);
    res.end();
});

app.get("/fortnite/api/game/v2/enabled_features", (req, res) => {
    res.json([]);
});

app.get("/fortnite/api/game/v2/events/v2/download/:accountId", async (req, res) => {
    const accountId = req.params.accountId;

    try {
        const playerData = await Arena.findOne({ accountId });
        const hypePoints = playerData ? playerData.hype : 0;
        const division = playerData ? playerData.division : 0;

        const eventsDataPath = path.join(
            __dirname,
            "./../responses/eventlistactive.json",
        );
        const events = JSON.parse(fs.readFileSync(eventsDataPath, "utf-8"));

        events.player = {
            accountId: accountId,
            gameId: "Fortnite",
            persistentScores: {
                Hype: hypePoints,
            },
            tokens: [`ARENA_S24_Division${division + 1}`],
        };

        res.json(events);
    } catch (error) {
        console.error("Error fetching Arena data:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

app.get("/api/v1/events/Fortnite/download/:accountId", async (req, res) => {
    const accountId = req.params.accountId;

    try {
        const playerData = await Arena.findOne({ accountId });
        const hypePoints = playerData ? playerData.hype : 0;
        const division = playerData ? playerData.division : 0;

        const eventsDataPath = path.join(
            __dirname,
            "./../responses/eventlistactive.json",
        );
        const events = JSON.parse(fs.readFileSync(eventsDataPath, "utf-8"));

        events.player = {
            accountId: accountId,
            gameId: "Fortnite",
            persistentScores: {
                Hype: hypePoints,
            },
            tokens: [`ARENA_S24_Division${division + 1}`],
        };

        res.json(events);
    } catch (error) {
        console.error("Error fetching Arena data:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

app.get("/fortnite/api/game/v2/twitch/*", (req, res) => {
    res.status(200);
    res.end();
});

app.post("/api/v1/fortnite-br/surfaces/*/target", (req, res) => {
    const id = "fortnite-br-br-motd-collection";
    res.json({
        contentType: "collection",
        contentid: id,
        tcid: id,
        contentMeta: `"${id}":[${id}]}`,
        contentItems: [
            {
                contentType: "content-item",
                contentid: id,
                tcid: id,
                contentFields: {
                    Buttons: [
                        {
                            Action: {
                                _type: "MotdDiscoveryAction",
                                category: "set_br_playlists",
                                islandCode: "set_br_playlists",
                                shouldOpen: true,
                            },
                            Style: "0",
                            Text: "Play Now",
                            _type: "Button",
                        },
                    ],
                    FullScreenBackground: {
                        Image: [
                            {
                                width: 1920,
                                height: 1080,
                                url: "http://cdn.crisu.qzz.io/media/leilos/logo/background.jpg",
                            }
                        ],
                        _type: "FullScreenBackground",
                    },
                    FullScreenBody: "Snouwe Backend",
                    FullScreenTitle: "LEILOS",
                    TeaserBackground: {
                        Image: [
                            {
                                width: 1024,
                                height: 512,
                                url: "https://cdn1.epicgames.com/offer/fn/Blade_2560x1440_2560x1440-95718a8046a942675a0bc4d27560e2bb",
                            },
                        ],
                        _type: "TeaserBackground",
                    },
                    TeaserTitle: "SNOUWE",
                    VerticalTextLayout: false,
                },
                contentSchemaName: "DynamicMotd",
                contentHash: "c93adbc7a8a9f94a916de62aa443e2d6",
            },
        ],
    });
});

app.get("/fortnite/api/game/v2/world/info", (req, res) => {
    res.json({});
});

app.post("/fortnite/api/game/v2/chat/*/recommendGeneralChatRooms/pc", (req, res) => {
    res.json({});
});

app.get("/fortnite/api/receipts/v1/account/*/receipts", (req, res) => {
    res.json([]);
});

app.get("/fortnite/api/game/v2/leaderboards/cohort/*", (req, res) => {
    res.json([]);
});

app.post("/datarouter/api/v1/public/data", async (req, res) => {
    try {
        const accountId = functions.getAccountIdData(req.query.UserID);
        const data = req.body.Events;

        if (Array.isArray(data) && data.length > 0) {
            const findUser = await User.findOne({ accountId });

            if (findUser) {
                for (const event of data) {
                    const { EventName, ProviderType, PlayerKilledPlayerEventCount } = event;

                    if (EventName && ProviderType === "Client") {
                        const playerKills = Number(PlayerKilledPlayerEventCount) || 0;

                        switch (EventName) {
                            case "Athena.ClientWonMatch":
                                await functions.addVictoryHypePoints(findUser);
                                break;
                            case "Combat.AthenaClientEngagement":
                                for (let i = 0; i < playerKills; i++) {
                                    await functions.addEliminationHypePoints(findUser);
                                }
                                break;
                            case "Combat.ClientPlayerDeath":
                                await functions.deductBusFareHypePoints(findUser);
                                break;
                            default:
                                log.debug(`Event List: ${EventName}`);
                                break;
                        }
                    }
                }
            }
        }

        res.status(204).end();
    } catch (error) {
        log.error("Error processing data: " + error);
        res.status(500).send("Internal Server Error");
    }
});

module.exports = app;