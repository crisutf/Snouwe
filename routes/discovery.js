const express = require("express");
const app = express.Router();
const fs = require("fs");
const path = require("path");

const getDiscoveryMenu = () => JSON.parse(fs.readFileSync(path.join(__dirname, "..", "responses", "discovery", "menu.json")).toString());
const getLatestMenu = () => JSON.parse(fs.readFileSync(path.join(__dirname, "..", "responses", "discovery", "latest", "menu.json")).toString());

app.post("/fortnite/api/game/v2/creative/discovery/surface/*", (req, res) => {
    const discoveryMenu = getDiscoveryMenu();
    res.json({
        "Panels": discoveryMenu.Panels,
        "TestCohorts": discoveryMenu.TestCohorts,
        "ModeSets": discoveryMenu.ModeSets || {}
    });
});

app.post("/api/v1/discovery/surface/*", (req, res) => {
    res.json(getDiscoveryMenu());
});

app.post("/api/v2/discovery/surface/*", (req, res) => {
    res.json(getDiscoveryMenu());
});

app.get("/fortnite/api/discovery/accessToken/*", (req, res) => {
    res.json({
        "branchName": req.params[0] || "unknown",
        "appId": "Fortnite",
        "token": "snouwe-discovery-token"
    });
});

app.post("/links/api/fn/mnemonic", (req, res) => {
    res.json(getLatestMenu());
});

app.get("/links/api/fn/mnemonic/:playlist/related", (req, res) => {
    const playlist = req.params.playlist;
    const latestMenu = getLatestMenu();
    const relatedResponse = {
        parentLinks: [],
        links: {}
    };
    
    const findPlaylist = latestMenu.find(i => i.mnemonic === playlist);
    if (findPlaylist && findPlaylist.metadata && findPlaylist.metadata.sub_link_codes) {
        relatedResponse.parentLinks.push(findPlaylist);
        for (const subLinkCode of findPlaylist.metadata.sub_link_codes) {
            const subLinkData = latestMenu.find(i => i.mnemonic === subLinkCode);
            if (subLinkData) {
                relatedResponse.links[subLinkCode] = subLinkData;
            }
        }
    } else {
        if (findPlaylist) {
            relatedResponse.links[playlist] = findPlaylist;
        }
        if (findPlaylist && findPlaylist.metadata && findPlaylist.metadata.parent_set) {
            const parentSet = latestMenu.find(i => i.mnemonic === findPlaylist.metadata.parent_set);
            if (parentSet) {
                relatedResponse.parentLinks.push(parentSet);
                const existingLinks = new Set(Object.keys(relatedResponse.links));
                if (parentSet.metadata && parentSet.metadata.sub_link_codes) {
                    parentSet.metadata.sub_link_codes.forEach(code => {
                        const matchingResult = latestMenu.find(i => i.mnemonic === code);
                        if (matchingResult && !existingLinks.has(code)) {
                            relatedResponse.links[code] = matchingResult;
                        }
                    });
                }
            }
        }
    }
    
    res.json(relatedResponse);
});

app.get("/links/api/fn/mnemonic/:playlist", (req, res) => {
    const playlist = req.params.playlist;
    const ltmPath = path.join(__dirname, "..", "responses", "discovery", "latest", "ltms", `${playlist}.json`);
    
    if (fs.existsSync(ltmPath)) {
        res.json(JSON.parse(fs.readFileSync(ltmPath).toString()));
    } else {
        const latestMenu = getLatestMenu();
        const linkData = latestMenu.find(i => i.mnemonic === playlist);
        
        if (linkData) {
            res.json(linkData);
        } else {
            res.status(404).end();
        }
    }
});

app.post("/api/v1/links/lock-status/:accountId/check", (req, res) => {
    res.json({
        "results": [],
        "hasMore": false
    });
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
                                url: "https://cdn.crisu.qzz.io/services/leilos/status/down.jpg",
                            }
                        ],
                        _type: "FullScreenBackground",
                    },
                    FullScreenBody: "Advertencia este backend esta en mantenimiento todo acceso no autorizado puede considerarse como un ataque de seguridad",
                    FullScreenTitle: "ADVERTENCIA",
                    TeaserBackground: {
                        Image: [
                            {
                                width: 1024,
                                height: 512,
                                url: "https://cdn.crisu.qzz.io/services/leilos/status/down.jpg",
                            },
                        ],
                        _type: "TeaserBackground",
                    },
                    TeaserTitle: "ADVERTENCIA",
                    VerticalTextLayout: false,
                },
                contentSchemaName: "DynamicMotd",
                contentHash: "c93adbc7a8a9f94a916de62aa443e2d6",
            },
        ],
    });
});

app.get("/fortnite/api/discovery/v1/surface/*", (req, res) => {
    res.json(getDiscoveryMenu());
});

app.post("/api/v1/assets/Fortnite/*", (req, res) => {
    const discoveryMenu = getDiscoveryMenu();
    res.json({
        "FortCreativeDiscoverySurface": {
            "meta": {
                "promotion": 1
            },
            "assets": {
                "CreativeDiscoverySurface_Frontend": {
                    "meta": {
                        "revision": 1,
                        "headRevision": 1,
                        "revisedAt": new Date().toISOString(),
                        "promotion": 1,
                        "promotedAt": new Date().toISOString()
                    },
                    "assetData": {
                        "AnalyticsId": "SNOUWE_DISCOVERY",
                        "SurfaceName": "CreativeDiscoverySurface_Frontend",
                        "primaryAssetId": "FortCreativeDiscoverySurface:CreativeDiscoverySurface_Frontend",
                        "TestCohorts": discoveryMenu.TestCohorts
                    }
                }
            }
        }
    });
});

module.exports = app;
