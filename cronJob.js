const cron = require("node-cron");
const { exec } = require("child_process");
const moment = require("moment-timezone");

// Function to trigger the script
function runOpenInterestScript() {
    const now = moment().tz("America/New_York").format("YYYY-MM-DD HH:mm:ss");
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
}

// Schedule the job for 9:00 AM ET every weekday (Mon-Fri)
cron.schedule("0 9 * * 1-5", runOpenInterestScript, {
    timezone: "America/New_York",
});

console.log("✅ Cron job scheduled for 9 AM ET on weekdays.");
