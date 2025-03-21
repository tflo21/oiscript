const cron = require("node-cron");
const { exec } = require("child_process");
const moment = require("moment-timezone");

// Function to refresh token and then fetch options data
function refreshAndFetchData() {
    const now = moment().tz("America/New_York").format("YYYY-MM-DD HH:mm:ss");
    console.log(`🚀 Running Token Refresh at ${now} (Eastern Time)`);

    exec("node refreshTokens.js", (error, stdout, stderr) => {
        if (error) {
            console.error(`❌ Error refreshing token: ${error.message}`);
            return;
        }
        if (stderr) {
            console.error(`⚠️ Token refresh stderr: ${stderr}`);
            return;
        }
        console.log(`✅ Token refresh output: ${stdout}`);

        // Wait 5 seconds before running openInterest.js
        setTimeout(() => {
            console.log(`🚀 Running Open Interest Fetcher at ${now} (Eastern Time)`);
            exec("node openInterest.js", (error, stdout, stderr) => {
                if (error) {
                    console.error(`❌ Error executing script: ${error.message}`);
                    return;
                }
                if (stderr) {
                    console.error(`⚠️ Script stderr: ${stderr}`);
                    return;
                }
                console.log(`✅ Script output: ${stdout}`);
            });
        }, 5000); // Small delay to ensure token update
    });
}

// Schedule the job for 9:00 AM ET every weekday (Mon-Fri)
cron.schedule("0 9 * * 1-5", refreshAndFetchData, {
    timezone: "America/New_York",
});

console.log("✅ Cron job scheduled for 9 AM ET on weekdays.");

