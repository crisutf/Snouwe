const XMLBuilder = require("xmlbuilder");
const uuid = require("uuid");
const bcrypt = require("bcrypt");
const fs = require("fs");
const crypto = require("crypto");
const path = require("path");

const User = require("../model/user.js");
const Profile = require("../model/profiles.js");
const profileManager = require("../structs/profile.js");
const Friends = require("../model/friends.js");
const Arena = require("../model/arena.js");
const log = require("../structs/log.js");

async function sleep(ms) {
    await new Promise((resolve, reject) => {
        setTimeout(resolve, ms);
    })
}

function getBaseUrl(req) {
    const proto = (req.headers["x-forwarded-proto"] || req.protocol || "http").toString();
    const host = (req.headers["host"] || "localhost").toString();
    return `${proto}://${host}`;
}

function GetVersionInfo(req) {
    let memory = {
        season: 0,
        build: 0.0,
        CL: "0",
        lobby: ""
    }

    if (req.headers["user-agent"]) {
        let CL = "";

        try {
            let BuildID = req.headers["user-agent"].split("-")[3].split(",")[0];

            if (!Number.isNaN(Number(BuildID))) CL = BuildID;
            else {
                BuildID = req.headers["user-agent"].split("-")[3].split(" ")[0];

                if (!Number.isNaN(Number(BuildID))) CL = BuildID;
            }
        } catch {
            try {
                let BuildID = req.headers["user-agent"].split("-")[1].split("+")[0];

                if (!Number.isNaN(Number(BuildID))) CL = BuildID;
            } catch {}
        }

        try {
            let Build = req.headers["user-agent"].split("Release-")[1].split("-")[0];

            if (Build.split(".").length == 3) {
                let Value = Build.split(".");
                Build = Value[0] + "." + Value[1] + Value[2];
            }

            memory.season = Number(Build.split(".")[0]);
            memory.build = Number(Build);
            memory.CL = CL;
            memory.lobby = `LobbySeason${memory.season}`;

            if (Number.isNaN(memory.season)) throw new Error();
        } catch {
            if (Number(memory.CL) < 3724489) {
                memory.season = 0;
                memory.build = 0.0;
                memory.CL = CL;
                memory.lobby = "LobbySeason0";
            } else if (Number(memory.CL) <= 3790078) {
                memory.season = 1;
                memory.build = 1.0;
                memory.CL = CL;
                memory.lobby = "LobbySeason1";
            } else {
                memory.season = 2;
                memory.build = 2.0;
                memory.CL = CL;
                memory.lobby = "LobbyWinterDecor";
            }
        }
    }

    return memory;
}

function getContentPages(req) {
    const memory = GetVersionInfo(req);
    const baseUrl = getBaseUrl(req);

    const contentpages = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "responses", "contentpages.json")).toString());

    let Language = "en";

    try {
        if (req.headers["accept-language"]) {
            if (req.headers["accept-language"].includes("-") && req.headers["accept-language"] != "es-419") {
                Language = req.headers["accept-language"].split("-")[0];
            } else {
                Language = req.headers["accept-language"];
            }
        }
    } catch {}

    const modes = ["saveTheWorldUnowned", "battleRoyale", "creative", "saveTheWorld"];
    const news = ["savetheworldnews", "battleroyalenews"];

    try {
        modes.forEach(mode => {
            contentpages.subgameselectdata[mode].message.title = contentpages.subgameselectdata[mode].message.title[Language]
            contentpages.subgameselectdata[mode].message.body = contentpages.subgameselectdata[mode].message.body[Language]
        })
    } catch {}

    try {
        if (memory.build < 5.30) { 
            news.forEach(mode => {
                contentpages[mode].news.messages[0].image = "https://api-leilos.crisu.qzz.io/images/images/leilos/png/logo_banner.png";
                contentpages[mode].news.messages[1].image = "https://api-leilos.crisu.qzz.io/images/leilos/jpg/background.jpg";
            });
        }
    } catch {}

    try {
        const backgrounds = contentpages.dynamicbackgrounds.backgrounds.backgrounds;
        const season = `season${memory.season}${memory.season >= 21 ? "00" : ""}`;
        backgrounds[0].stage = season;
        backgrounds[1].stage = season;

        switch (memory.season) {
            case 9:
                contentpages.lobby.backgroundimage = "";
                contentpages.lobby.stage = "default";
                break;
            case 10:
                backgrounds[0].stage = "seasonx";
                backgrounds[1].stage = "seasonx";
                break;
            case 11:
            case 12:
            case 13:
            case 14:
            case 15:
            case 16:
            case 17:
            case 18:
            case 19:
                break;
            case 20:
                backgrounds[0].backgroundimage = "https://cdn2.unrealengine.com/t-bp20-lobby-2048x1024-d89eb522746c.png";
                break;
            case 21:
                backgrounds[0].backgroundimage = "https://cdn2.unrealengine.com/s21-lobby-background-2048x1024-2e7112b25dc3.jpg";
                break;
            case 22:
                backgrounds[0].backgroundimage = "https://cdn2.unrealengine.com/t-bp22-lobby-square-2048x2048-2048x2048-e4e90c6e8018.jpg";
                break;
            case 23:
                backgrounds[0].backgroundimage = "https://cdn2.unrealengine.com/t-bp23-lobby-2048x1024-2048x1024-26f2c1b27f63.png";
                break;
            case 24:
                backgrounds[0].backgroundimage = "https://cdn2.unrealengine.com/t-ch4s2-bp-lobby-4096x2048-edde08d15f7e.jpg";
                break;
            case 25:
                backgrounds[0].backgroundimage = "https://cdn2.unrealengine.com/s25-lobby-4k-4096x2048-4a832928e11f.jpg";
                backgrounds[1].backgroundimage = "https://cdn2.unrealengine.com/fn-shop-ch4s3-04-1920x1080-785ce1d90213.png";
                break;
            case 27:
                backgrounds[0].stage = "rufus";
                break;
            default:
                backgrounds[0].stage = "defaultnotris";
                backgrounds[0].backgroundimage = "https://api-leilos.crisu.qzz.io/images/lobby/background_2048.png";
        }

        switch (memory.build) {
            case 9.30:
                contentpages.lobby.stage = "summer";
                break;
            case 11.10:
                backgrounds[0].stage = "fortnitemares";
                backgrounds[1].stage = "fortnitemares";
                break;
            case 11.31:
            case 11.40:
                backgrounds[0].stage = "winter19";
                backgrounds[1].stage = "winter19";
                break;
            case 19.01:
                backgrounds[0].stage = "winter2021";
                backgrounds[0].backgroundimage = "https://cdn2.unrealengine.com/t-bp19-lobby-xmas-2048x1024-f85d2684b4af.png";
                contentpages.subgameinfo.battleroyale.image = "https://cdn2.unrealengine.com/19br-wf-subgame-select-512x1024-16d8bb0f218f.jpg";
                contentpages.specialoffervideo.bSpecialOfferEnabled = "true";
                break;
            case 20.40:
                backgrounds[0].backgroundimage = "https://cdn2.unrealengine.com/t-bp20-40-armadillo-glowup-lobby-2048x2048-2048x2048-3b83b887cc7f.jpg";
                break;
            case 21.10:
                backgrounds[0].stage = "season2100";
                break;
            case 21.30:
                backgrounds[0].backgroundimage = "https://cdn2.unrealengine.com/nss-lobbybackground-2048x1024-f74a14565061.jpg";
                backgrounds[0].stage = "season2130";
                break;
            case 23.10:
                backgrounds[0].backgroundimage = "https://cdn2.unrealengine.com/t-bp23-winterfest-lobby-square-2048x2048-2048x2048-277a476e5ca6.png";
                contentpages.specialoffervideo.bSpecialOfferEnabled = "true";
                break;
            case 25.11:
                backgrounds[0].backgroundimage = "https://cdn2.unrealengine.com/t-s25-14dos-lobby-4096x2048-2be24969eee3.jpg";
                break;
            case 28.30:
                backgrounds[0].backgroundimage = `https://api-leilos.crisu.qzz.io/images/lobby/background_2048.png`;
                break;
        }

        if (contentpages.subgameselectdata && contentpages.subgameselectdata.battleRoyale) {
            contentpages.subgameselectdata.battleRoyale.message.hidden = false;
            contentpages.subgameselectdata.battleRoyale.message.spotlight = true;
        }
    } catch {}

    if (contentpages.battlepassaboutmessages && contentpages.battlepassaboutmessages.news) {
        contentpages.battlepassaboutmessages.news.messages = [];
    }
    if (contentpages.savetheworldnews && contentpages.savetheworldnews.news) {
        contentpages.savetheworldnews.news.messages = [];
    }
    if (contentpages.battleroyalenews && contentpages.battleroyalenews.news) {
        contentpages.battleroyalenews.news.messages = [];
    }
    if (contentpages.athenamessage && contentpages.athenamessage.overrideablemessage) {
        contentpages.athenamessage.overrideablemessage.message.hidden = true;
    }
    if (contentpages.playlistinformation && contentpages.playlistinformation.playlists) {
        contentpages.playlistinformation.playlists = contentpages.playlistinformation.playlists.filter(playlist => {
            const name = playlist.playlist_name ? playlist.playlist_name.toLowerCase() : "";
            return !name.includes("crucible") && !name.includes("race") && !name.includes("arena") && !name.includes("tournament");
        });
    }

    return contentpages;
}

function getItemShop() {
    const catalog = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "responses", "catalog.json")).toString());
    const CatalogConfig = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "Config", "catalog_config.json").toString()));

    try {
        for (let value in CatalogConfig) {
            if (!Array.isArray(CatalogConfig[value].itemGrants)) continue;
            if (CatalogConfig[value].itemGrants.length == 0) continue;
            
            const CatalogEntry = {"devName":"","offerId":"","fulfillmentIds":[],"dailyLimit":-1,"weeklyLimit":-1,"monthlyLimit":-1,"categories":[],"prices":[{"currencyType":"MtxCurrency","currencySubType":"","regularPrice":0,"finalPrice":0,"saleExpiration":"9999-12-02T01:12:00Z","basePrice":0}],"meta":{"SectionId":"Featured","TileSize":"Small"},"matchFilter":"","filterWeight":0,"appStoreId":[],"requirements":[],"offerType":"StaticPrice","giftInfo":{"bIsEnabled":true,"forcedGiftBoxTemplateId":"","purchaseRequirements":[],"giftRecordIds":[]},"refundable":false,"metaInfo":[{"key":"SectionId","value":"Featured"},{"key":"TileSize","value":"Small"}],"displayAssetPath":"","itemGrants":[],"sortPriority":0,"catalogGroupPriority":0};

            let i = catalog.storefronts.findIndex(p => p.name == (value.toLowerCase().startsWith("daily") ? "BRDailyStorefront" : "BRWeeklyStorefront"));
            if (i == -1) continue;

            if (value.toLowerCase().startsWith("daily")) {
                // Make featured items appear on the left side of the screen
                CatalogEntry.sortPriority = -1;
            } else {
                CatalogEntry.meta.TileSize = "Normal";
                CatalogEntry.metaInfo[1].value = "Normal";
            }

            for (let itemGrant of CatalogConfig[value].itemGrants) {
                if (typeof itemGrant != "string") continue;
                if (itemGrant.length == 0) continue;

                CatalogEntry.requirements.push({ "requirementType": "DenyOnItemOwnership", "requiredId": itemGrant, "minQuantity": 1 });
                CatalogEntry.itemGrants.push({ "templateId": itemGrant, "quantity": 1 });
            }

            CatalogEntry.prices = [{
                "currencyType": "MtxCurrency",
                "currencySubType": "",
                "regularPrice": CatalogConfig[value].price,
                "finalPrice": CatalogConfig[value].price,
                "saleExpiration": "9999-12-02T01:12:00Z",
                "basePrice": CatalogConfig[value].price
            }];

            if (CatalogEntry.itemGrants.length > 0) {
                let uniqueIdentifier = crypto.createHash("sha1").update(`${JSON.stringify(CatalogConfig[value].itemGrants)}_${CatalogConfig[value].price}`).digest("hex");

                CatalogEntry.devName = uniqueIdentifier;
                CatalogEntry.offerId = uniqueIdentifier;

                catalog.storefronts[i].catalogEntries.push(CatalogEntry);
            }
        }
    } catch {}

    return catalog;
}

function getOfferID(offerId) {
    const catalog = getItemShop();

    for (let storefront of catalog.storefronts) {
        let findOfferId = storefront.catalogEntries.find(i => i.offerId == offerId);

        if (findOfferId) return {
            name: storefront.name,
            offerId: findOfferId
        };
    }
}

function MakeID() {
    return uuid.v4();
}

function sendXmppMessageToAll(body) {
    if (!global.Clients) return;
    if (typeof body == "object") body = JSON.stringify(body);

    global.Clients.forEach(ClientData => {
        ClientData.client.send(XMLBuilder.create("message")
        .attribute("from", `xmpp-admin@${global.xmppDomain}`)
        .attribute("xmlns", "jabber:client")
        .attribute("to", ClientData.jid)
        .element("body", `${body}`).up().toString());
    });
}

function sendXmppMessageToId(body, toAccountId) {
    if (!global.Clients) return;
    if (typeof body == "object") body = JSON.stringify(body);

    let receiver = global.Clients.find(i => i.accountId == toAccountId);
    if (!receiver) return;

    receiver.client.send(XMLBuilder.create("message")
    .attribute("from", `xmpp-admin@${global.xmppDomain}`)
    .attribute("to", receiver.jid)
    .attribute("xmlns", "jabber:client")
    .element("body", `${body}`).up().toString());
}

function getPresenceFromUser(fromId, toId, offline) {
    if (!global.Clients) return;

    let SenderData = global.Clients.find(i => i.accountId == fromId);
    let ClientData = global.Clients.find(i => i.accountId == toId);

    if (!SenderData || !ClientData) return;

    let xml = XMLBuilder.create("presence")
    .attribute("to", ClientData.jid)
    .attribute("xmlns", "jabber:client")
    .attribute("from", SenderData.jid)
    .attribute("type", offline ? "unavailable" : "available")

    if (SenderData.lastPresenceUpdate.away) xml = xml.element("show", "away").up().element("status", SenderData.lastPresenceUpdate.status).up();
    else xml = xml.element("status", SenderData.lastPresenceUpdate.status).up();

    ClientData.client.send(xml.toString());
}

async function registerUser(discordId, username, email, password, customId) {
    const plainPassword = password || "1234567890";
    const userEmail = email || `${customId || discordId}@leilos.tf`.toLowerCase();

    if (!discordId || !username) return { message: "Discord ID and Username are required.", status: 400 };

    if (await User.findOne({ discordId })) return { message: "Account already exists with this Discord ID!", status: 400 };

    if (customId) {
        const allowedIdChars = /^[a-zA-Z0-9_.-]+$/;
        if (!allowedIdChars.test(customId)) return { message: "Your custom ID has special characters, please remove them and try again.", status: 400 };
    }

    if (await User.findOne({ email: userEmail })) return { message: "Email is already in use.", status: 400 };

    const accountId = MakeID().replace(/-/ig, "");
    const matchmakingId = MakeID().replace(/-/ig, "");

    if (username.length >= 25) return { message: "Your username must be less than 25 characters long.", status: 400 };
    if (username.length < 3) return { message: "Your username must be atleast 3 characters long.", status: 400 };

    const allowedCharacters = (" !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~").split("");
    
    for (let character of username) {
        if (!allowedCharacters.includes(character)) return { message: "Your username has special characters, please remove them and try again.", status: 400 };
    }

    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    try {
        const user = await User.create({ 
            created: new Date().toISOString(), 
            discordId, 
            accountId, 
            username, 
            username_lower: username.toLowerCase(), 
            email: userEmail, 
            password: hashedPassword,
            matchmakingId
        });
        
        await Profile.create({ created: user.created, accountId: user.accountId, profiles: profileManager.createProfiles(user.accountId) });
        await Friends.create({ created: user.created, accountId: user.accountId });
        
        return { user, status: 200 };
    } catch (err) {
        if (err.code == 11000) return { message: `Username is already in use.`, status: 400 };

        return { message: "An unknown error has occured, please try again later.", status: 400 };
    }
}

function DecodeBase64(str) {
    return Buffer.from(str, 'base64').toString();
}

function UpdateTokens() {
    fs.writeFileSync("./tokenManager/tokens.json", JSON.stringify({
        accessTokens: global.accessTokens,
        refreshTokens: global.refreshTokens,
        clientTokens: global.clientTokens
    }, null, 2));
}

function PlaylistNames(playlist) {
    if (typeof playlist !== 'string') return playlist;

    const playlistLower = playlist.toLowerCase();

    // Mapeos para versiones antiguas (números)
    switch (playlist) {
      case "2": return "Playlist_DefaultSolo";
      case "10": return "Playlist_DefaultDuo";
      case "9": return "Playlist_DefaultSquad";
      case "50": return "Playlist_50v50";
      case "11": return "Playlist_50v50";
      case "13": return "Playlist_HighExplosives_Squads";
      case "22": return "Playlist_5x20";
      case "36": return "Playlist_Blitz_Solo";
      case "37": return "Playlist_Blitz_Duos";
      case "19": return "Playlist_Blitz_Squad";
      case "33": return "Playlist_Carmine";
      case "32": return "Playlist_Fortnite";
      case "23": return "Playlist_HighExplosives_Solo";
      case "24": return "Playlist_HighExplosives_Squads";
      case "44": return "Playlist_Impact_Solo";
      case "45": return "Playlist_Impact_Duos";
      case "46": return "Playlist_Impact_Squads";
      case "35": return "Playlist_Playground";
      case "30": return "Playlist_SkySupply";
      case "42": return "Playlist_SkySupply_Duos";
      case "43": return "Playlist_SkySupply_Squads";
      case "41": return "Playlist_Snipers";
      case "39": return "Playlist_Snipers_Solo";
      case "40": return "Playlist_Snipers_Duos";
      case "26": return "Playlist_SolidGold_Solo";
      case "27": return "Playlist_SolidGold_Squads";
      case "28": return "Playlist_ShowdownAlt_Solo";
      case "solo": return "Playlist_DefaultSolo";
      case "duo": return "Playlist_DefaultDuo";
      case "squad": return "Playlist_DefaultSquad";
      case "trios": return "Playlist_Trios";
    }

    // Mapeos para versiones modernas (v28.30+)
    if (playlistLower.includes("playlist_defaultsolo")) return "Playlist_DefaultSolo";
    if (playlistLower.includes("playlist_defaultduo")) return "Playlist_DefaultDuo";
    if (playlistLower.includes("playlist_defaultsquad")) return "Playlist_DefaultSquad";
    if (playlistLower.includes("playlist_trios")) return "Playlist_Trios";
    if (playlistLower.includes("playlist_habanero_solo")) return "Playlist_Habanero_Solo";
    if (playlistLower.includes("playlist_habanero_duo")) return "Playlist_Habanero_Duo";
    if (playlistLower.includes("playlist_habanero_squad")) return "Playlist_Habanero_Squad";
    if (playlistLower.includes("playlist_habanero_trios")) return "Playlist_Habanero_Trios";
    if (playlistLower.includes("playlist_juno")) return "Playlist_Juno";
    if (playlistLower.includes("playlist_papaya")) return "Playlist_Papaya";

    // Si no coincide con nada, intentamos devolverlo en PascalCase si es el formato de playlist_...
    if (playlistLower.startsWith("playlist_")) {
        return playlist.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join('_');
    }

    return playlist;
}

module.exports = {
    sleep,
    GetVersionInfo,
    getContentPages,
    getItemShop,
    getOfferID,
    MakeID,
    sendXmppMessageToAll,
    sendXmppMessageToId,
    getPresenceFromUser,
    registerUser,
    DecodeBase64,
    UpdateTokens,
    PlaylistNames,
    getDivisionPoints,
    addEliminationHypePoints,
    addVictoryHypePoints,
    deductBusFareHypePoints,
    updateHypePoints,
    getNextDivision,
    getAccountIdData
}

async function getDivisionPoints(accountId, statType) {
  const eventListPath = path.join(
    __dirname,
    "./../responses/eventlistactive.json",
  );
  const eventList = JSON.parse(fs.readFileSync(eventListPath, "utf-8"));
  const playerData = await Arena.findOne({ accountId });
  const playerDivision = playerData ? playerData.division : 0;

  const eventWindow = eventList.events[0].eventWindows.find(
    (window) => window.metadata.divisionRank === playerDivision,
  );

  if (!eventWindow) {
    console.error("División no encontrada en la lista de eventos.");
    return 0;
  }

  const scoringRule = eventList.templates
    .find(
      (template) => template.eventTemplateId === eventWindow.eventTemplateId,
    )
    .scoringRules.find((rule) => rule.trackedStat === statType);

  if (scoringRule) {
    const pointsEarned = scoringRule.rewardTiers[0].pointsEarned;
    return pointsEarned;
  }

  return 0;
}

async function addEliminationHypePoints(user) {
  const points = await getDivisionPoints(
    user.account_id || user.accountId,
    "TEAM_ELIMS_STAT_INDEX",
  );
  return await updateHypePoints(user, points);
}

async function addVictoryHypePoints(user) {
  const points = await getDivisionPoints(
    user.account_id || user.accountId,
    "PLACEMENT_STAT_INDEX",
  );
  return await updateHypePoints(user, points);
}

async function deductBusFareHypePoints(user) {
  const points = await getDivisionPoints(user.account_id || user.accountId, "MATCH_PLAYED_STAT");
  return await updateHypePoints(user, -points);
}

async function updateHypePoints(user, points) {
  const accountId = user.account_id || user.accountId;

  let playerData = await Arena.findOne({ accountId });
  let currentHype = playerData ? playerData.hype : 0;
  let currentDivision = playerData ? playerData.division : 0;

  currentHype += points;

  const nextDivision = getNextDivision(currentHype, currentDivision);
  currentDivision = nextDivision;

  await Arena.updateOne(
    { accountId },
    {
      $set: {
        accountId: accountId,
        hype: currentHype,
        division: currentDivision,
      },
    },
    { upsert: true },
  );

  return {
    success: true,
    data: `Puntos actualizados a ${currentHype}, División actual: ${currentDivision}`,
  };
}

function getNextDivision(hypePoints, currentDivision) {
  const thresholds = [
    400, 800, 1200, 2000, 3000, 5000, 7500, 10000, 14999, 15000,
  ];
  for (let i = 0; i < thresholds.length; i++) {
    if (hypePoints < thresholds[i]) return i;
  }
  return currentDivision;
}

function getAccountIdData(UserID) {
  if (!UserID) return "";
  if (UserID.includes("|")) {
      return UserID.split("|")[1];
  }
  return UserID;
}

