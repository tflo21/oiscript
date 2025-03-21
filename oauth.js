const https = require("https");
const fs = require("fs");
const express = require("express");
const axios = require("axios");
const log4js = require("log4js");
const querystring = require("querystring");
const config = require("./config");

// ✅ Load SSL Certificate
const options = {
    key: fs.readFileSync("server.key"), 
    cert: fs.readFileSync("server.crt")
};

const app = express();
const port = 443; // Use HTTPS default port

// ✅ Logger setup
log4js.configure({
    appenders: { console: { type: "console" } },
    categories: { default: { appenders: ["console"], level: "info" } },
});
const logger = log4js.getLogger();

// ✅ Step 1: Construct OAuth Authorization URL
const authUrl = `https://api.schwabapi.com/v1/oauth/authorize?client_id=${config.APP_KEY}&redirect_uri=${config.REDIRECT_URI}`;

logger.info("🚀 OAuth server running at https://127.0.0.1");
logger.info("Click to authenticate:", authUrl);

// ✅ Automatically open the browser for authentication
import("open").then((open) => {
    open.default(authUrl);
}).catch((err) => {
    logger.error("❌ Failed to open browser:", err);
});

// ✅ Step 2: Handle OAuth Callback & Extract Authorization Code
app.get("/", async (req, res) => {
    logger.info("✅ Received request at `/` with query params:", req.query);

    const authCode = req.query.code;
    if (!authCode) {
        res.send("❌ Error: Authorization code not received! Please check your app settings.");
        return logger.error("❌ Authorization code missing in the callback.");
    }

    logger.info("✅ Extracted Authorization Code:", authCode);

    // ✅ Step 3: Exchange Authorization Code for Tokens
    try {
        const credentials = Buffer.from(`${config.APP_KEY}:${config.APP_SECRET}`).toString("base64");

        const response = await axios.post(
            "https://api.schwabapi.com/v1/oauth/token",
            querystring.stringify({
                grant_type: "authorization_code",
                code: authCode,
                redirect_uri: config.REDIRECT_URI,
            }),
            {
                headers: {
                    Authorization: `Basic ${credentials}`,
                    "Content-Type": "application/x-www-form-urlencoded",
                },
            }
        );

        if (response.status === 200) {
            logger.info("✅ Successfully exchanged code for tokens.");
            
            // ✅ Save tokens to file
            fs.writeFileSync(config.TOKEN_FILE, JSON.stringify(response.data, null, 2));
            logger.info("🔒 Tokens saved to tokens.json.");
        }

        res.send("✅ OAuth authentication successful! You can close this window.");
    } catch (error) {
        logger.error("❌ Token exchange failed:", error.response?.data || error.message);
        res.send("❌ Error during token exchange.");
    }
});

// ✅ Start HTTPS Server on `https://127.0.0.1`
https.createServer(options, app).listen(port, "127.0.0.1", () => {
    logger.info("🚀 Secure OAuth server running at https://127.0.0.1");
});

setInterval(() => {
    console.log("🔄 Refreshing tokens...");
    require("./refreshTokens");
}, 20 * 60 * 1000); // Runs every 30 minutes

