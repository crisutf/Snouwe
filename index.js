const express = require("express");
require("dotenv").config();
const app = express();
const mongoose = require("mongoose");
const fs = require("fs");
const rateLimit = require("express-rate-limit");
const jwt = require("jsonwebtoken");
const path = require("path");
const cookieParser = require("cookie-parser");

const log = require("./structs/log.js");
const error = require("./structs/error.js");
const functions = require("./structs/functions.js");
const { scheduleRestart } = require("./structs/autobackendrestart.js");

if (!fs.existsSync("./ClientSettings")) fs.mkdirSync("./ClientSettings");

global.JWT_SECRET = process.env.JWT_SECRET || functions.MakeID();
const PORT = process.env.PORT || 80;

const tokens = JSON.parse(fs.readFileSync("./tokenManager/tokens.json").toString());

for (let tokenType in tokens) {
    for (let tokenIndex in tokens[tokenType]) {
        let decodedToken = jwt.decode(tokens[tokenType][tokenIndex].token.replace("eg1~", ""));

        if (DateAddHours(new Date(decodedToken.creation_date), decodedToken.hours_expire).getTime() <= new Date().getTime()) {
            tokens[tokenType].splice(Number(tokenIndex), 1);
        }
    }
}

fs.writeFileSync("./tokenManager/tokens.json", JSON.stringify(tokens, null, 2));

global.accessTokens = tokens.accessTokens;
global.refreshTokens = tokens.refreshTokens;
global.clientTokens = tokens.clientTokens;

global.exchangeCodes = [];

mongoose.connect(process.env.MONGODB_URI || "mongodb://127.0.0.1/leilos_data", () => {
    log.backend("Leilos successfully connected to MongoDB!");
});

mongoose.connection.on("error", err => {
    log.error("MongoDB failed to connect, please make sure you have MongoDB installed and running.");
    throw err;
});

app.set("trust proxy", true);
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

// Configuración de rateLimit corregida
const limiter = rateLimit({
    windowMs: 0.5 * 60 * 1000,
    max: 45,
    keyGenerator: (req) => {
        return req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.ip;
    }
});
app.use(limiter);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
    try {
        const logLine = `[${new Date().toISOString()}] ${req.method} ${req.url}\n`;
    } catch (e) {}
    next();
});

fs.readdirSync("./routes").forEach(fileName => {
    if (!fileName.endsWith(".js")) return;
    try {
        const route = require(`./routes/${fileName}`);
        if (typeof route === 'function') {
            app.use(route);
        } else {
            console.warn(`[Warning] Skipped invalid route file: ${fileName} (Not a middleware function)`);
        }
    } catch (err) {
        console.error(`[Error] Failed to load route ${fileName}:`, err.message);
    }
});

app.listen(PORT, () => {
    log.backend(`App started listening on port ${PORT}`);

    require("./xmpp/xmpp.js");
    require("./DiscordBot");

    // Iniciamos el ciclo de reinicio de 6 horas
    scheduleRestart();
}).on("error", async (err) => {
    if (err.code == "EADDRINUSE") {
        log.error(`Port ${PORT} is already in use!\nClosing in 3 seconds...`);
        await functions.sleep(3000)
        process.exit(0);
    } else throw err;
});

// if endpoint not found, return this error
app.use((req, res, next) => {
    error.createError(
        "errors.com.leilos.common.not_found", 
        "Sorry the resource you were trying to find could not be found", 
        undefined, 1004, undefined, 404, res
    );
});

function DateAddHours(pdate, number) {
    let date = pdate;
    date.setHours(date.getHours() + number);

    return date;
}
