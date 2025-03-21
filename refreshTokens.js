const axios = require("axios");
const fs = require("fs");
const log4js = require("log4js");
const querystring = require("querystring");
const config = require("./config");

// Logger setup
log4js.configure({ appenders: { console: { type: "console" } }, categories: { default: { appenders: ["console"], level: "info" } } });
const logger = log4js.getLogger();

async function refreshTokens() {
    logger.info("Refreshing tokens...");

    let tokens;
    try {
        tokens = JSON.parse(fs.readFileSync(config.TOKEN_FILE, "utf8"));
        if (!tokens.refresh_token) throw new Error("No refresh token found.");
    } catch (error) {
        logger.error("Failed to read refresh token:", error.message);
        return;
    }

    const payload = querystring.stringify({ grant_type: "refresh_token", refresh_token: tokens.refresh_token });
    const credentials = Buffer.from(`${config.APP_KEY}:${config.APP_SECRET}`).toString("base64");

    try {
        const response = await axios.post("https://api.schwabapi.com/v1/oauth/token", payload, { headers: { Authorization: `Basic ${credentials}`, "Content-Type": "application/x-www-form-urlencoded" } });

        fs.writeFileSync(config.TOKEN_FILE, JSON.stringify(response.data, null, 2));
        logger.info("Tokens updated successfully.");
    } catch (error) {
        logger.error("Failed to refresh tokens:", error.response?.data || error.message);
    }
}

// Run token refresh
refreshTokens();
