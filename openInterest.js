const axios = require("axios");
const fs = require("fs");
const config = require("./config");

// Load the access token from tokens.json
const tokens = JSON.parse(fs.readFileSync(config.TOKEN_FILE, "utf8"));
const ACCESS_TOKEN = tokens.access_token;
const TICKERS = ["SPY", "QQQ", "DIA"];

// ✅ Fetch a ticker's Mark Price and round to the nearest whole number
async function getMarkPrice(symbol) {
    try {
        console.log(`\nFetching ${symbol} Mark Price...`);
        const response = await axios.get("https://api.schwabapi.com/marketdata/v1/quotes", {
            headers: { Authorization: `Bearer ${ACCESS_TOKEN}`, Accept: "application/json" },
            params: { symbols: symbol }
        });

        const quote = response.data[symbol]?.quote;
        if (!quote || typeof quote.mark !== "number") {
            throw new Error("'mark' field missing or invalid in API response.");
        }

        const exactMarkPrice = quote.mark; // Keep the exact mark price
        const markPrice = Math.round(quote.mark); // Round for calculations
        console.log(`${symbol} Mark Price: ${exactMarkPrice} (Rounded: ${markPrice})`);
        return { markPrice, exactMarkPrice };
    } catch (error) {
        console.error(`Error fetching ${symbol} mark price:`, error.response?.data || error.message);
        return { markPrice: null, exactMarkPrice: null };
    }
}
// ✅ Get Expiration Dates (Today, Rest of Week, Next Two Fridays)
function getTargetExpirations() {
    const today = new Date();
    let expirations = new Set();

    let tempDate = new Date(today);
    while (tempDate.getDay() >= 1 && tempDate.getDay() <= 5) {
        expirations.add(formatDate(tempDate));
        tempDate.setDate(tempDate.getDate() + 1);
    }

    let nextFriday = getNextFriday(tempDate);
    let secondFriday = new Date(nextFriday);
    secondFriday.setDate(secondFriday.getDate() + 7);

    expirations.add(formatDate(nextFriday));
    expirations.add(formatDate(secondFriday));
    return Array.from(expirations);
}

// ✅ Helper Function to Get the Next Friday After a Given Date
function getNextFriday(date) {
    let nextFriday = new Date(date);
    nextFriday.setDate(nextFriday.getDate() + ((5 - nextFriday.getDay() + 7) % 7 || 7));
    return nextFriday;
}

// ✅ Helper Function to Format Date ("yyyy-MM-dd")
function formatDate(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

// ✅ Fetch Options Data for the given ticker and strike range
async function fetchOptionsData(symbol, markPrice) {
    console.log(`Fetching ${symbol} options for strikes between ${markPrice - 10} and ${markPrice + 10}`);
    
    const validExpirations = getTargetExpirations();
    let allOptionsData = { callExpDateMap: {}, putExpDateMap: {} };

    try {
        for (const expiration of validExpirations) {
            console.log(`- Fetching ${symbol} Data for Expiration: ${expiration}`);
            const strikes = Array.from({ length: 21 }, (_, i) => markPrice - 10 + i).join(",");

            const callsResponse = await axios.get("https://api.schwabapi.com/marketdata/v1/chains", {
                headers: { Authorization: `Bearer ${ACCESS_TOKEN}`, Accept: "application/json" },
                params: {
                    symbol: symbol,
                    contractType: "CALL",
                    includeQuotes: false,
                    strikes,
                    toDate: expiration
                }
            });

            const putsResponse = await axios.get("https://api.schwabapi.com/marketdata/v1/chains", {
                headers: { Authorization: `Bearer ${ACCESS_TOKEN}`, Accept: "application/json" },
                params: {
                    symbol: symbol,
                    contractType: "PUT",
                    includeQuotes: false,
                    strikes,
                    toDate: expiration
                }
            });
            
            // Debug logs to see the structure
            console.log(`${symbol} CALL Response:`, 
                        Object.keys(callsResponse.data.callExpDateMap || {}).length > 0 ? 
                        "Data received" : "No call data received");
            console.log(`${symbol} PUT Response:`, 
                        Object.keys(putsResponse.data.putExpDateMap || {}).length > 0 ? 
                        "Data received" : "No put data received");

            Object.assign(allOptionsData.callExpDateMap, callsResponse.data.callExpDateMap || {});
            Object.assign(allOptionsData.putExpDateMap, putsResponse.data.putExpDateMap || {});
        }
        
        // Log final data structure summary
        console.log(`${symbol} Final data structure:`, 
            Object.keys(allOptionsData.callExpDateMap).length, 
            "call expirations,", 
            Object.keys(allOptionsData.putExpDateMap).length, 
            "put expirations");
            
        return { 
            symbol,
            markPrice, 
            data: allOptionsData, 
            expirations: validExpirations 
        };
    } catch (error) {
        console.error(`Error fetching ${symbol} options chain:`, error.response?.data || error.message);
        return { 
            symbol, 
            markPrice, 
            data: { callExpDateMap: {}, putExpDateMap: {} }, 
            expirations: validExpirations 
        };
    }
}

// Function to display top 8 call strikes above mark price and top 8 put strikes below mark price
// Modified function to display calls in descending strike order and puts in ascending order
// Function to display top 8 call strikes and top 8 put strikes by highest OI
// Function to display top 8 call strikes above mark price and top 8 put strikes below mark price
// Add this modified function to your openInterest.js file
function displayTopCallAndPutStrikes(tickersData) {
    console.log("\n===== TOP OPEN INTEREST CALL AND PUT STRIKES BY TICKER =====");
    
    for (const { symbol, markPrice, exactMarkPrice, data, expirations } of tickersData) {
        console.log(`\n${symbol} - Current Mark Price: ${markPrice} (Exact: ${exactMarkPrice})`);
        
        // Collect all OI data by strike for this ticker
        const strikeOIData = {};
        
        // Initialize the strikeOIData object with all strikes
        for (let strike = markPrice - 10; strike <= markPrice + 10; strike++) {
            strikeOIData[strike] = {
                strike,
                totalCallOI: 0,
                totalPutOI: 0
            };
        }
        
        // Process each expiration and accumulate OI data
        for (const expiration of expirations) {
            const callExpKeys = Object.keys(data.callExpDateMap).filter(key => key.startsWith(expiration));
            const putExpKeys = Object.keys(data.putExpDateMap).filter(key => key.startsWith(expiration));
            
            // Process each strike
            for (let strike = markPrice - 10; strike <= markPrice + 10; strike++) {
                const strikeFormats = [strike.toString(), strike.toFixed(1), strike.toFixed(2)];
                
                // Process calls
                for (const callKey of callExpKeys) {
                    const callMap = data.callExpDateMap[callKey];
                    for (const strikeStr of strikeFormats) {
                        if (callMap && callMap[strikeStr] && callMap[strikeStr][0]) {
                            strikeOIData[strike].totalCallOI += callMap[strikeStr][0].openInterest || 0;
                        }
                    }
                }
                
                // Process puts
                for (const putKey of putExpKeys) {
                    const putMap = data.putExpDateMap[putKey];
                    for (const strikeStr of strikeFormats) {
                        if (putMap && putMap[strikeStr] && putMap[strikeStr][0]) {
                            strikeOIData[strike].totalPutOI += putMap[strikeStr][0].openInterest || 0;
                        }
                    }
                }
            }
        }
        
        // Get all strikes data as an array
        const allStrikesData = Object.values(strikeOIData);
        
        // Filter calls to strikes > mark price and puts to strikes < mark price
        const callStrikes = allStrikesData
            .filter(data => data.strike > markPrice && data.totalCallOI > 0)
            .sort((a, b) => b.totalCallOI - a.totalCallOI) // First sort by OI to get top 8
            .slice(0, 8)
            .sort((a, b) => b.strike - a.strike); // Then sort by strike price (descending)
            
        const putStrikes = allStrikesData
            .filter(data => data.strike < markPrice && data.totalPutOI > 0)
            .sort((a, b) => b.totalPutOI - a.totalPutOI) // First sort by OI to get top 8
            .slice(0, 8)
            .sort((a, b) => b.strike - a.strike); // Then sort by strike price (descending)
            
        // Display Call OI Results
        console.log("C/P  | Strike | OI");
        console.log("------------------------");
        
        callStrikes.forEach(data => {
            console.log(
                `Call | ` +
                `${data.strike.toString().padStart(6)} | ` +
                `${(data.totalCallOI / 1000).toFixed(1)}k`
            );
        });
        
        // Display Put OI Results
        console.log("------------------------");
        
        putStrikes.forEach(data => {
            console.log(
                `Put  | ` +
                `${data.strike.toString().padStart(6)} | ` +
                `${(data.totalPutOI / 1000).toFixed(1)}k`
            );
        });
        
        // Display summary statistics
        const totalCallOI = Object.values(strikeOIData).reduce((sum, data) => sum + data.totalCallOI, 0);
        const totalPutOI = Object.values(strikeOIData).reduce((sum, data) => sum + data.totalPutOI, 0);
        const putCallRatio = totalCallOI > 0 ? (totalPutOI / totalCallOI).toFixed(2) : "N/A";
        
        // Save this output to a JSON file for easy reading by the visualization
        const outputData = {
            ticker: symbol,
            markPrice: markPrice,
            exactMarkPrice: exactMarkPrice, // Include the unrounded mark price
            topCalls: callStrikes.map(data => ({
                strike: data.strike,
                callOI: data.totalCallOI
            })),
            topPuts: putStrikes.map(data => ({
                strike: data.strike,
                putOI: data.totalPutOI
            })),
            allStrikes: allStrikesData.map(data => ({
                strike: data.strike,
                callOI: data.totalCallOI,
                putOI: data.totalPutOI
            })),
            summary: {
                totalCallOI,
                totalPutOI,
                putCallRatio
            }
        };
        
        const filePath = `${symbol.toLowerCase()}_top_strikes.json`;
        fs.writeFileSync(filePath, JSON.stringify(outputData, null, 2));
        console.log(`✅ ${symbol} top strikes data saved as: ${filePath}`);
    }
}

// ✅ Save Open Interest Data to CSV (Filtered to +/-10 strikes only)
function saveOIToCSV(tickersData) {
    for (const { symbol, markPrice, data, expirations } of tickersData) {
        console.log(`Saving ${symbol} Open Interest to CSV...`);
        const filePath = `${symbol.toLowerCase()}_open_interest.csv`;
        
        // Track total OI by strike
        const strikeOITotals = {};
        for (let strike = markPrice - 10; strike <= markPrice + 10; strike++) {
            strikeOITotals[strike] = { totalCallOI: 0, totalPutOI: 0 };
        }
        
        // Start CSV with headers
        let csvContent = "Expiration,Strike,CallOI,PutOI\n";

        // Process each expiration date
        for (const expiration of expirations) {
            // Find the actual key in the response that matches our expiration date
            const callExpKeys = Object.keys(data.callExpDateMap).filter(key => key.startsWith(expiration));
            const putExpKeys = Object.keys(data.putExpDateMap).filter(key => key.startsWith(expiration));
            
            console.log(`Processing ${symbol} expiration ${expiration}:`);
            console.log(`- Found ${callExpKeys.length} matching call keys and ${putExpKeys.length} matching put keys`);
            
            for (let strike = markPrice - 10; strike <= markPrice + 10; strike++) {
                // Try both integer and decimal format for strike lookup
                const strikeFormats = [
                    strike.toString(),
                    strike.toFixed(1),
                    strike.toFixed(2)
                ];
                
                let callOI = 0;
                let putOI = 0;
                
                // Look through all matching expiration keys
                for (const callKey of callExpKeys) {
                    const callMap = data.callExpDateMap[callKey];
                    // Try different strike formats
                    for (const strikeStr of strikeFormats) {
                        if (callMap && callMap[strikeStr] && callMap[strikeStr][0]) {
                            callOI = callMap[strikeStr][0].openInterest || 0;
                            if (callOI > 0) {
                                console.log(`Found ${symbol} Call OI: ${callOI} for ${expiration} strike ${strikeStr}`);
                                break;
                            }
                        }
                    }
                    if (callOI > 0) break; // Stop if we found valid data
                }
                
                // Same approach for puts
                for (const putKey of putExpKeys) {
                    const putMap = data.putExpDateMap[putKey];
                    for (const strikeStr of strikeFormats) {
                        if (putMap && putMap[strikeStr] && putMap[strikeStr][0]) {
                            putOI = putMap[strikeStr][0].openInterest || 0;
                            if (putOI > 0) {
                                console.log(`Found ${symbol} Put OI: ${putOI} for ${expiration} strike ${strikeStr}`);
                                break;
                            }
                        }
                    }
                    if (putOI > 0) break; // Stop if we found valid data
                }
                
                // Add to strike totals
                strikeOITotals[strike].totalCallOI += callOI;
                strikeOITotals[strike].totalPutOI += putOI;
                
                csvContent += `${expiration},${strike},${callOI},${putOI}\n`;
            }
        }
        
        // Add summary section to CSV
        csvContent += "\nSummary - Total Open Interest By Strike\n";
        csvContent += "Strike,Total Call OI,Total Put OI,Put/Call Ratio\n";
        
        for (let strike = markPrice - 10; strike <= markPrice + 10; strike++) {
            const { totalCallOI, totalPutOI } = strikeOITotals[strike];
            const putCallRatio = totalCallOI > 0 ? (totalPutOI / totalCallOI).toFixed(2) : "N/A";
            
            csvContent += `${strike},${totalCallOI},${totalPutOI},${putCallRatio}\n`;
            
            // Log totals for monitoring
            console.log(`${symbol} Strike ${strike}: ${totalCallOI} calls, ${totalPutOI} puts, P/C Ratio: ${putCallRatio}`);
        }
        
        // Add grand totals
        const grandTotalCalls = Object.values(strikeOITotals).reduce((sum, data) => sum + data.totalCallOI, 0);
        const grandTotalPuts = Object.values(strikeOITotals).reduce((sum, data) => sum + data.totalPutOI, 0);
        const overallPutCallRatio = grandTotalCalls > 0 ? (grandTotalPuts / grandTotalCalls).toFixed(2) : "N/A";
        
        csvContent += `\nGRAND TOTAL,${grandTotalCalls},${grandTotalPuts},${overallPutCallRatio}\n`;
        console.log(`${symbol} GRAND TOTAL: ${grandTotalCalls} calls, ${grandTotalPuts} puts, Overall P/C Ratio: ${overallPutCallRatio}`);

        fs.writeFileSync(filePath, csvContent);
        console.log(`✅ ${symbol} CSV file saved at: ${filePath}`);
    }
    
    // Create a combined summary CSV
    createCombinedSummary(tickersData);
}

// ✅ Create a combined summary CSV with data from all tickers
function createCombinedSummary(tickersData) {
    console.log("\nCreating combined market summary...");
    const filePath = "market_options_summary.csv";
    
    let csvContent = "Ticker,Total Call OI,Total Put OI,Put/Call Ratio\n";
    
    for (const { symbol, markPrice, data, expirations } of tickersData) {
        // Calculate totals for this ticker
        let totalCallOI = 0;
        let totalPutOI = 0;
        
        for (const expiration of expirations) {
            const callExpKeys = Object.keys(data.callExpDateMap).filter(key => key.startsWith(expiration));
            const putExpKeys = Object.keys(data.putExpDateMap).filter(key => key.startsWith(expiration));
            
            for (let strike = markPrice - 10; strike <= markPrice + 10; strike++) {
                const strikeFormats = [strike.toString(), strike.toFixed(1), strike.toFixed(2)];
                
                // Find call OI
                for (const callKey of callExpKeys) {
                    const callMap = data.callExpDateMap[callKey];
                    for (const strikeStr of strikeFormats) {
                        if (callMap && callMap[strikeStr] && callMap[strikeStr][0]) {
                            totalCallOI += callMap[strikeStr][0].openInterest || 0;
                        }
                    }
                }
                
                // Find put OI
                for (const putKey of putExpKeys) {
                    const putMap = data.putExpDateMap[putKey];
                    for (const strikeStr of strikeFormats) {
                        if (putMap && putMap[strikeStr] && putMap[strikeStr][0]) {
                            totalPutOI += putMap[strikeStr][0].openInterest || 0;
                        }
                    }
                }
            }
        }
        
        const putCallRatio = totalCallOI > 0 ? (totalPutOI / totalCallOI).toFixed(2) : "N/A";
        csvContent += `${symbol},${totalCallOI},${totalPutOI},${putCallRatio}\n`;
    }
    
    // Calculate market-wide totals
    const totalMarketCallOI = tickersData.reduce((sum, ticker) => {
        // Calculate total calls for this ticker
        let tickerCallOI = 0;
        
        for (const expiration of ticker.expirations) {
            const callExpKeys = Object.keys(ticker.data.callExpDateMap).filter(key => key.startsWith(expiration));
            
            for (let strike = ticker.markPrice - 10; strike <= ticker.markPrice + 10; strike++) {
                const strikeFormats = [strike.toString(), strike.toFixed(1), strike.toFixed(2)];
                
                for (const callKey of callExpKeys) {
                    const callMap = ticker.data.callExpDateMap[callKey];
                    for (const strikeStr of strikeFormats) {
                        if (callMap && callMap[strikeStr] && callMap[strikeStr][0]) {
                            tickerCallOI += callMap[strikeStr][0].openInterest || 0;
                        }
                    }
                }
            }
        }
        
        return sum + tickerCallOI;
    }, 0);
    
    const totalMarketPutOI = tickersData.reduce((sum, ticker) => {
        // Calculate total puts for this ticker
        let tickerPutOI = 0;
        
        for (const expiration of ticker.expirations) {
            const putExpKeys = Object.keys(ticker.data.putExpDateMap).filter(key => key.startsWith(expiration));
            
            for (let strike = ticker.markPrice - 10; strike <= ticker.markPrice + 10; strike++) {
                const strikeFormats = [strike.toString(), strike.toFixed(1), strike.toFixed(2)];
                
                for (const putKey of putExpKeys) {
                    const putMap = ticker.data.putExpDateMap[putKey];
                    for (const strikeStr of strikeFormats) {
                        if (putMap && putMap[strikeStr] && putMap[strikeStr][0]) {
                            tickerPutOI += putMap[strikeStr][0].openInterest || 0;
                        }
                    }
                }
            }
        }
        
        return sum + tickerPutOI;
    }, 0);
    
    const marketPutCallRatio = totalMarketCallOI > 0 ? (totalMarketPutOI / totalMarketCallOI).toFixed(2) : "N/A";
    
    csvContent += `\nMARKET TOTAL,${totalMarketCallOI},${totalMarketPutOI},${marketPutCallRatio}\n`;
    console.log(`MARKET TOTAL: ${totalMarketCallOI} calls, ${totalMarketPutOI} puts, Overall P/C Ratio: ${marketPutCallRatio}`);
    
    fs.writeFileSync(filePath, csvContent);
    console.log(`✅ Combined market summary saved at: ${filePath}`);
}

// ✅ Run the process
(async function main() {
    console.log("Starting options data collection for multiple tickers...");
    
    // Collect data for all tickers
    const tickersData = [];
    
    for (const ticker of TICKERS) {
        const markPriceData = await getMarkPrice(ticker);
        if (markPriceData.markPrice) {
            const optionsData = await fetchOptionsData(ticker, markPriceData.markPrice);
            // Add the exact mark price to the options data
            optionsData.exactMarkPrice = markPriceData.exactMarkPrice;
            tickersData.push(optionsData);
        }
    }
    
    // Save all data to CSV files
    if (tickersData.length > 0) {
        saveOIToCSV(tickersData);
        // Use the new display function
        displayTopCallAndPutStrikes(tickersData);
        console.log("All operations completed successfully!");
    } else {
        console.error("Failed to retrieve data for any tickers. Please check your API access.");
    }
})();