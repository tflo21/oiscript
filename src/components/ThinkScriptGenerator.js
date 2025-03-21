import React, { useState, useEffect } from 'react';
import './ThinkScriptGenerator.css';

const ThinkScriptGenerator = ({ expectedMoves, data, lastUpdated }) => {
  const [thinkScript, setThinkScript] = useState('');
  const [copySuccess, setCopySuccess] = useState('');
  
  useEffect(() => {
    generateThinkScript();
  }, [expectedMoves, data, lastUpdated]);
  
  const generateThinkScript = () => {
    // Extract the current values from props
    const spyData = data?.SPY || {};
    const qqqData = data?.QQQ || {};
    const diaData = data?.DIA || {};
    
    // Get the exact mark prices and expected moves
    const spyPrice = spyData.exactMarkPrice || 0;
    const qqqPrice = qqqData.exactMarkPrice || 0;
    const diaPrice = diaData.exactMarkPrice || 0;
    
    // Get the expected move values
    const spyEM = expectedMoves?.SPY || 0;
    const qqqEM = expectedMoves?.QQQ || 0;
    const diaEM = expectedMoves?.DIA || 0;
    
    // Calculate the EM levels
    const spyPlusEM = Math.round((spyPrice + spyEM) * 100) / 100;
    const spyMinusEM = Math.round((spyPrice - spyEM) * 100) / 100;
    
    const qqqPlusEM = Math.round((qqqPrice + qqqEM) * 100) / 100;
    const qqqMinusEM = Math.round((qqqPrice - qqqEM) * 100) / 100;
    
    const diaPlusEM = Math.round((diaPrice + diaEM) * 100) / 100;
    const diaMinusEM = Math.round((diaPrice - diaEM) * 100) / 100;
    
    // Function to find top strikes for each ticker - sorted by OI
    const findTopStrikes = (tickerData) => {
      if (!tickerData || !tickerData.topCalls || !tickerData.topPuts) {
        return {
          callStrikes: Array(8).fill(0),
          putStrikes: Array(8).fill(0),
          callOIs: Array(8).fill(0),
          putOIs: Array(8).fill(0)
        };
      }
      
      // Sort calls by OI (highest first) and grab the top ones
      const sortedCalls = [...tickerData.topCalls || []].sort((a, b) => b.callOI - a.callOI);
      const calls = sortedCalls.slice(0, 8).map(item => ({
        strike: item.strike,
        oi: item.callOI
      }));
      
      // Pad calls array if fewer than 8
      while (calls.length < 8) {
        calls.push({ strike: 0, oi: 0 });
      }
      
      // Sort puts by OI (highest first) and grab the top ones
      const sortedPuts = [...tickerData.topPuts || []].sort((a, b) => b.putOI - a.putOI);
      const puts = sortedPuts.slice(0, 8).map(item => ({
        strike: item.strike,
        oi: item.putOI
      }));
      
      // Pad puts array if fewer than 8
      while (puts.length < 8) {
        puts.push({ strike: 0, oi: 0 });
      }
      
      // Extract arrays for thinkscript
      const callStrikes = calls.map(item => item.strike);
      const callOIs = calls.map(item => item.oi);
      const putStrikes = puts.map(item => item.strike);
      const putOIs = puts.map(item => item.oi);
      
      return {
        callStrikes,
        putStrikes,
        callOIs,
        putOIs
      };
    };
    
    // Get top strikes for each ticker
    const spyStrikes = findTopStrikes(spyData);
    const qqqStrikes = findTopStrikes(qqqData);
    const diaStrikes = findTopStrikes(diaData);
    
    // Format OI in thousands (45000 -> 45)
    const formatOI = (oi) => {
      if (!oi || oi === 0) return "0";
      return (oi / 1000).toFixed(1);
    };
    
    // Format date for display
    const formatDate = (dateString) => {
      if (!dateString) return new Date().toLocaleString(undefined, {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
      
      return new Date(dateString).toLocaleString(undefined, {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    };
    
    const formattedDate = lastUpdated ? formatDate(lastUpdated) : formatDate();
    
    // Generate the ThinkScript
    const script = `# Plot Expected Moves & Top OI from Trading Alphas | Tickers: SPY, QQQ, DIA | Generated: ${new Date().toLocaleDateString()} | Last Updated: ${formattedDate}
declare upper;
# Input settings
input showBubbleEM = yes;
input showOIBubbles = yes;
input showClouds = yes;
# Basic setup
def LastPrice = close(priceType = PriceType.LAST);
def isSPY = GetSymbol() == "SPY";
def isQQQ = GetSymbol() == "QQQ";
def isDIA = GetSymbol() == "DIA";
def highestBar = BarNumber() == HighestAll(BarNumber());

# Define global colors
DefineGlobalColor("Call", CreateColor(0, 153, 204));
DefineGlobalColor("Put", CreateColor(204, 0, 102));

# Assign expected move values based on ticker
def emU = if isSPY then ${spyPlusEM} else if isQQQ then ${qqqPlusEM} else if isDIA then ${diaPlusEM} else Double.NaN;
def emD = if isSPY then ${spyMinusEM} else if isQQQ then ${qqqMinusEM} else if isDIA then ${diaMinusEM} else Double.NaN;

# Assign top OI strikes based on ticker (8 call strikes and 8 put strikes)
# Call strikes - sorted by OI value, not by proximity to current price
def callStrike1 = if isSPY then ${spyStrikes.callStrikes[0]} 
                else if isQQQ then ${qqqStrikes.callStrikes[0]} 
                else if isDIA then ${diaStrikes.callStrikes[0]} 
                else Double.NaN;
def callStrike2 = if isSPY then ${spyStrikes.callStrikes[1]} 
                else if isQQQ then ${qqqStrikes.callStrikes[1]} 
                else if isDIA then ${diaStrikes.callStrikes[1]} 
                else Double.NaN;
def callStrike3 = if isSPY then ${spyStrikes.callStrikes[2]} 
                else if isQQQ then ${qqqStrikes.callStrikes[2]} 
                else if isDIA then ${diaStrikes.callStrikes[2]} 
                else Double.NaN;
def callStrike4 = if isSPY then ${spyStrikes.callStrikes[3]} 
                else if isQQQ then ${qqqStrikes.callStrikes[3]} 
                else if isDIA then ${diaStrikes.callStrikes[3]} 
                else Double.NaN;
def callStrike5 = if isSPY then ${spyStrikes.callStrikes[4]} 
                else if isQQQ then ${qqqStrikes.callStrikes[4]} 
                else if isDIA then ${diaStrikes.callStrikes[4]} 
                else Double.NaN;
def callStrike6 = if isSPY then ${spyStrikes.callStrikes[5]} 
                else if isQQQ then ${qqqStrikes.callStrikes[5]} 
                else if isDIA then ${diaStrikes.callStrikes[5]} 
                else Double.NaN;
def callStrike7 = if isSPY then ${spyStrikes.callStrikes[6]} 
                else if isQQQ then ${qqqStrikes.callStrikes[6]} 
                else if isDIA then ${diaStrikes.callStrikes[6]} 
                else Double.NaN;
def callStrike8 = if isSPY then ${spyStrikes.callStrikes[7]} 
                else if isQQQ then ${qqqStrikes.callStrikes[7]} 
                else if isDIA then ${diaStrikes.callStrikes[7]} 
                else Double.NaN;

# Put strikes - sorted by OI value, not by proximity to current price
def putStrike1 = if isSPY then ${spyStrikes.putStrikes[0]} 
               else if isQQQ then ${qqqStrikes.putStrikes[0]} 
               else if isDIA then ${diaStrikes.putStrikes[0]} 
               else Double.NaN;
def putStrike2 = if isSPY then ${spyStrikes.putStrikes[1]} 
               else if isQQQ then ${qqqStrikes.putStrikes[1]} 
               else if isDIA then ${diaStrikes.putStrikes[1]} 
               else Double.NaN;
def putStrike3 = if isSPY then ${spyStrikes.putStrikes[2]} 
               else if isQQQ then ${qqqStrikes.putStrikes[2]} 
               else if isDIA then ${diaStrikes.putStrikes[2]} 
               else Double.NaN;
def putStrike4 = if isSPY then ${spyStrikes.putStrikes[3]} 
               else if isQQQ then ${qqqStrikes.putStrikes[3]} 
               else if isDIA then ${diaStrikes.putStrikes[3]} 
               else Double.NaN;
def putStrike5 = if isSPY then ${spyStrikes.putStrikes[4]} 
               else if isQQQ then ${qqqStrikes.putStrikes[4]} 
               else if isDIA then ${diaStrikes.putStrikes[4]} 
               else Double.NaN;
def putStrike6 = if isSPY then ${spyStrikes.putStrikes[5]} 
               else if isQQQ then ${qqqStrikes.putStrikes[5]} 
               else if isDIA then ${diaStrikes.putStrikes[5]} 
               else Double.NaN;
def putStrike7 = if isSPY then ${spyStrikes.putStrikes[6]} 
               else if isQQQ then ${qqqStrikes.putStrikes[6]} 
               else if isDIA then ${diaStrikes.putStrikes[6]} 
               else Double.NaN;
def putStrike8 = if isSPY then ${spyStrikes.putStrikes[7]} 
               else if isQQQ then ${qqqStrikes.putStrikes[7]} 
               else if isDIA then ${diaStrikes.putStrikes[7]} 
               else Double.NaN;

# Plot expected move levels
plot UpperExpectedMove = emU;
plot LowerExpectedMove = emD;

# Plot top 8 call strikes
plot TopCall1 = callStrike1;
plot TopCall2 = callStrike2;
plot TopCall3 = callStrike3;
plot TopCall4 = callStrike4;
plot TopCall5 = callStrike5;
plot TopCall6 = callStrike6;
plot TopCall7 = callStrike7;
plot TopCall8 = callStrike8;

# Plot top 8 put strikes
plot TopPut1 = putStrike1;
plot TopPut2 = putStrike2;
plot TopPut3 = putStrike3;
plot TopPut4 = putStrike4;
plot TopPut5 = putStrike5;
plot TopPut6 = putStrike6;
plot TopPut7 = putStrike7;
plot TopPut8 = putStrike8;

# Style the plots
UpperExpectedMove.SetDefaultColor(Color.GREEN);
UpperExpectedMove.SetLineWeight(3);
UpperExpectedMove.SetStyle(Curve.SHORT_DASH);

LowerExpectedMove.SetDefaultColor(Color.RED);
LowerExpectedMove.SetLineWeight(3);
LowerExpectedMove.SetStyle(Curve.SHORT_DASH);

# Style Call plots based on OI rank (not on strike proximity)
TopCall1.SetDefaultColor(GlobalColor("Call"));
TopCall1.SetLineWeight(4); # Highest OI gets thickest line
TopCall1.SetStyle(Curve.LONG_DASH);

TopCall2.SetDefaultColor(GlobalColor("Call"));
TopCall2.SetLineWeight(3); # Second highest OI
TopCall2.SetStyle(Curve.LONG_DASH);

TopCall3.SetDefaultColor(GlobalColor("Call"));
TopCall3.SetLineWeight(3);
TopCall3.SetStyle(Curve.LONG_DASH);

TopCall4.SetDefaultColor(GlobalColor("Call"));
TopCall4.SetLineWeight(2);
TopCall4.SetStyle(Curve.LONG_DASH);

TopCall5.SetDefaultColor(GlobalColor("Call"));
TopCall5.SetLineWeight(2);
TopCall5.SetStyle(Curve.SHORT_DASH);

TopCall6.SetDefaultColor(GlobalColor("Call"));
TopCall6.SetLineWeight(1);
TopCall6.SetStyle(Curve.SHORT_DASH);

TopCall7.SetDefaultColor(GlobalColor("Call"));
TopCall7.SetLineWeight(1);
TopCall7.SetStyle(Curve.SHORT_DASH);

TopCall8.SetDefaultColor(GlobalColor("Call"));
TopCall8.SetLineWeight(1);
TopCall8.SetStyle(Curve.SHORT_DASH);

# Style Put plots based on OI rank (not on strike proximity)
TopPut1.SetDefaultColor(GlobalColor("Put"));
TopPut1.SetLineWeight(4); # Highest OI gets thickest line
TopPut1.SetStyle(Curve.LONG_DASH);

TopPut2.SetDefaultColor(GlobalColor("Put"));
TopPut2.SetLineWeight(3); # Second highest OI
TopPut2.SetStyle(Curve.LONG_DASH);

TopPut3.SetDefaultColor(GlobalColor("Put"));
TopPut3.SetLineWeight(3);
TopPut3.SetStyle(Curve.LONG_DASH);

TopPut4.SetDefaultColor(GlobalColor("Put"));
TopPut4.SetLineWeight(2);
TopPut4.SetStyle(Curve.LONG_DASH);

TopPut5.SetDefaultColor(GlobalColor("Put"));
TopPut5.SetLineWeight(2);
TopPut5.SetStyle(Curve.SHORT_DASH);

TopPut6.SetDefaultColor(GlobalColor("Put"));
TopPut6.SetLineWeight(1);
TopPut6.SetStyle(Curve.SHORT_DASH);

TopPut7.SetDefaultColor(GlobalColor("Put"));
TopPut7.SetLineWeight(1);
TopPut7.SetStyle(Curve.SHORT_DASH);

TopPut8.SetDefaultColor(GlobalColor("Put"));
TopPut8.SetLineWeight(1);
TopPut8.SetStyle(Curve.SHORT_DASH);

# Add cloud for each call strike - size based on OI importance
AddCloud(if showClouds and callStrike1 > 0 then callStrike1 else Double.NaN, callStrike1 * 1.0008, GlobalColor("Call"), GlobalColor("Call")); # Largest cloud for highest OI
AddCloud(if showClouds and callStrike2 > 0 then callStrike2 else Double.NaN, callStrike2 * 1.0007, GlobalColor("Call"), GlobalColor("Call"));
AddCloud(if showClouds and callStrike3 > 0 then callStrike3 else Double.NaN, callStrike3 * 1.0006, GlobalColor("Call"), GlobalColor("Call"));
AddCloud(if showClouds and callStrike4 > 0 then callStrike4 else Double.NaN, callStrike4 * 1.0005, GlobalColor("Call"), GlobalColor("Call"));
AddCloud(if showClouds and callStrike5 > 0 then callStrike5 else Double.NaN, callStrike5 * 1.0004, GlobalColor("Call"), GlobalColor("Call"));
AddCloud(if showClouds and callStrike6 > 0 then callStrike6 else Double.NaN, callStrike6 * 1.0003, GlobalColor("Call"), GlobalColor("Call"));
AddCloud(if showClouds and callStrike7 > 0 then callStrike7 else Double.NaN, callStrike7 * 1.0002, GlobalColor("Call"), GlobalColor("Call"));
AddCloud(if showClouds and callStrike8 > 0 then callStrike8 else Double.NaN, callStrike8 * 1.0001, GlobalColor("Call"), GlobalColor("Call"));

# Add cloud for each put strike - size based on OI importance
AddCloud(if showClouds and putStrike1 > 0 then putStrike1 else Double.NaN, putStrike1 * 0.9992, GlobalColor("Put"), GlobalColor("Put")); # Largest cloud for highest OI
AddCloud(if showClouds and putStrike2 > 0 then putStrike2 else Double.NaN, putStrike2 * 0.9993, GlobalColor("Put"), GlobalColor("Put"));
AddCloud(if showClouds and putStrike3 > 0 then putStrike3 else Double.NaN, putStrike3 * 0.9994, GlobalColor("Put"), GlobalColor("Put"));
AddCloud(if showClouds and putStrike4 > 0 then putStrike4 else Double.NaN, putStrike4 * 0.9995, GlobalColor("Put"), GlobalColor("Put"));
AddCloud(if showClouds and putStrike5 > 0 then putStrike5 else Double.NaN, putStrike5 * 0.9996, GlobalColor("Put"), GlobalColor("Put"));
AddCloud(if showClouds and putStrike6 > 0 then putStrike6 else Double.NaN, putStrike6 * 0.9997, GlobalColor("Put"), GlobalColor("Put"));
AddCloud(if showClouds and putStrike7 > 0 then putStrike7 else Double.NaN, putStrike7 * 0.9998, GlobalColor("Put"), GlobalColor("Put"));
AddCloud(if showClouds and putStrike8 > 0 then putStrike8 else Double.NaN, putStrike8 * 0.9999, GlobalColor("Put"), GlobalColor("Put"));

# Add Expected Move bubbles
AddChartBubble(showBubbleEM and isSPY and highestBar, emU, "+EM", Color.GREEN, yes);
AddChartBubble(showBubbleEM and isSPY and highestBar, emD, "-EM", Color.RED, yes);
AddChartBubble(showBubbleEM and isQQQ and highestBar, emU, "+EM", Color.GREEN, yes);
AddChartBubble(showBubbleEM and isQQQ and highestBar, emD, "-EM", Color.RED, yes);
AddChartBubble(showBubbleEM and isDIA and highestBar, emU, "+EM", Color.GREEN, yes);
AddChartBubble(showBubbleEM and isDIA and highestBar, emD, "-EM", Color.RED, yes);

# Add OI bubbles with values for SPY
AddChartBubble(showOIBubbles and isSPY and highestBar and callStrike1 > 0, callStrike1, "${formatOI(spyStrikes.callOIs[0])}", GlobalColor("Call"), yes);
AddChartBubble(showOIBubbles and isSPY and highestBar and callStrike2 > 0, callStrike2, "${formatOI(spyStrikes.callOIs[1])}", GlobalColor("Call"), yes);
AddChartBubble(showOIBubbles and isSPY and highestBar and callStrike3 > 0, callStrike3, "${formatOI(spyStrikes.callOIs[2])}", GlobalColor("Call"), yes);
AddChartBubble(showOIBubbles and isSPY and highestBar and callStrike4 > 0, callStrike4, "${formatOI(spyStrikes.callOIs[3])}", GlobalColor("Call"), yes);
AddChartBubble(showOIBubbles and isSPY and highestBar and callStrike5 > 0, callStrike5, "${formatOI(spyStrikes.callOIs[4])}", GlobalColor("Call"), yes);
AddChartBubble(showOIBubbles and isSPY and highestBar and callStrike6 > 0, callStrike6, "${formatOI(spyStrikes.callOIs[5])}", GlobalColor("Call"), yes);
AddChartBubble(showOIBubbles and isSPY and highestBar and callStrike7 > 0, callStrike7, "${formatOI(spyStrikes.callOIs[6])}", GlobalColor("Call"), yes);
AddChartBubble(showOIBubbles and isSPY and highestBar and callStrike8 > 0, callStrike8, "${formatOI(spyStrikes.callOIs[7])}", GlobalColor("Call"), yes);
AddChartBubble(showOIBubbles and isSPY and highestBar and putStrike1 > 0, putStrike1, "${formatOI(spyStrikes.putOIs[0])}", GlobalColor("Put"), yes);
AddChartBubble(showOIBubbles and isSPY and highestBar and putStrike2 > 0, putStrike2, "${formatOI(spyStrikes.putOIs[1])}", GlobalColor("Put"), yes);
AddChartBubble(showOIBubbles and isSPY and highestBar and putStrike3 > 0, putStrike3, "${formatOI(spyStrikes.putOIs[2])}", GlobalColor("Put"), yes);
AddChartBubble(showOIBubbles and isSPY and highestBar and putStrike4 > 0, putStrike4, "${formatOI(spyStrikes.putOIs[3])}", GlobalColor("Put"), yes);
AddChartBubble(showOIBubbles and isSPY and highestBar and putStrike5 > 0, putStrike5, "${formatOI(spyStrikes.putOIs[4])}", GlobalColor("Put"), yes);
AddChartBubble(showOIBubbles and isSPY and highestBar and putStrike6 > 0, putStrike6, "${formatOI(spyStrikes.putOIs[5])}", GlobalColor("Put"), yes);
AddChartBubble(showOIBubbles and isSPY and highestBar and putStrike7 > 0, putStrike7, "${formatOI(spyStrikes.putOIs[6])}", GlobalColor("Put"), yes);
AddChartBubble(showOIBubbles and isSPY and highestBar and putStrike8 > 0, putStrike8, "${formatOI(spyStrikes.putOIs[7])}", GlobalColor("Put"), yes);

# Add OI bubbles with values for QQQ
AddChartBubble(showOIBubbles and isQQQ and highestBar and callStrike1 > 0, callStrike1, "${formatOI(qqqStrikes.callOIs[0])}", GlobalColor("Call"), yes);
AddChartBubble(showOIBubbles and isQQQ and highestBar and callStrike2 > 0, callStrike2, "${formatOI(qqqStrikes.callOIs[1])}", GlobalColor("Call"), yes);
AddChartBubble(showOIBubbles and isQQQ and highestBar and callStrike3 > 0, callStrike3, "${formatOI(qqqStrikes.callOIs[2])}", GlobalColor("Call"), yes);
AddChartBubble(showOIBubbles and isQQQ and highestBar and callStrike4 > 0, callStrike4, "${formatOI(qqqStrikes.callOIs[3])}", GlobalColor("Call"), yes);
AddChartBubble(showOIBubbles and isQQQ and highestBar and callStrike5 > 0, callStrike5, "${formatOI(qqqStrikes.callOIs[4])}", GlobalColor("Call"), yes);
AddChartBubble(showOIBubbles and isQQQ and highestBar and callStrike6 > 0, callStrike6, "${formatOI(qqqStrikes.callOIs[5])}", GlobalColor("Call"), yes);
AddChartBubble(showOIBubbles and isQQQ and highestBar and callStrike7 > 0, callStrike7, "${formatOI(qqqStrikes.callOIs[6])}", GlobalColor("Call"), yes);
AddChartBubble(showOIBubbles and isQQQ and highestBar and callStrike8 > 0, callStrike8, "${formatOI(qqqStrikes.callOIs[7])}", GlobalColor("Call"), yes);
AddChartBubble(showOIBubbles and isQQQ and highestBar and putStrike1 > 0, putStrike1, "${formatOI(qqqStrikes.putOIs[0])}", GlobalColor("Put"), yes);
AddChartBubble(showOIBubbles and isQQQ and highestBar and putStrike2 > 0, putStrike2, "${formatOI(qqqStrikes.putOIs[1])}", GlobalColor("Put"), yes);
AddChartBubble(showOIBubbles and isQQQ and highestBar and putStrike3 > 0, putStrike3, "${formatOI(qqqStrikes.putOIs[2])}", GlobalColor("Put"), yes);
AddChartBubble(showOIBubbles and isQQQ and highestBar and putStrike4 > 0, putStrike4, "${formatOI(qqqStrikes.putOIs[3])}", GlobalColor("Put"), yes);
AddChartBubble(showOIBubbles and isQQQ and highestBar and putStrike5 > 0, putStrike5, "${formatOI(qqqStrikes.putOIs[4])}", GlobalColor("Put"), yes);
AddChartBubble(showOIBubbles and isQQQ and highestBar and putStrike6 > 0, putStrike6, "${formatOI(qqqStrikes.putOIs[5])}", GlobalColor("Put"), yes);
AddChartBubble(showOIBubbles and isQQQ and highestBar and putStrike7 > 0, putStrike7, "${formatOI(qqqStrikes.putOIs[6])}", GlobalColor("Put"), yes);
AddChartBubble(showOIBubbles and isQQQ and highestBar and putStrike8 > 0, putStrike8, "${formatOI(qqqStrikes.putOIs[7])}", GlobalColor("Put"), yes);

# Add OI bubbles with values for DIA
AddChartBubble(showOIBubbles and isDIA and highestBar and callStrike1 > 0, callStrike1, "${formatOI(diaStrikes.callOIs[0])}", GlobalColor("Call"), yes);
AddChartBubble(showOIBubbles and isDIA and highestBar and callStrike2 > 0, callStrike2, "${formatOI(diaStrikes.callOIs[1])}", GlobalColor("Call"), yes);
AddChartBubble(showOIBubbles and isDIA and highestBar and callStrike3 > 0, callStrike3, "${formatOI(diaStrikes.callOIs[2])}", GlobalColor("Call"), yes);
AddChartBubble(showOIBubbles and isDIA and highestBar and callStrike4 > 0, callStrike4, "${formatOI(diaStrikes.callOIs[3])}", GlobalColor("Call"), yes);
AddChartBubble(showOIBubbles and isDIA and highestBar and callStrike5 > 0, callStrike5, "${formatOI(diaStrikes.callOIs[4])}", GlobalColor("Call"), yes);
AddChartBubble(showOIBubbles and isDIA and highestBar and callStrike6 > 0, callStrike6, "${formatOI(diaStrikes.callOIs[5])}", GlobalColor("Call"), yes);
AddChartBubble(showOIBubbles and isDIA and highestBar and callStrike7 > 0, callStrike7, "${formatOI(diaStrikes.callOIs[6])}", GlobalColor("Call"), yes);
AddChartBubble(showOIBubbles and isDIA and highestBar and callStrike8 > 0, callStrike8, "${formatOI(diaStrikes.callOIs[7])}", GlobalColor("Call"), yes);
AddChartBubble(showOIBubbles and isDIA and highestBar and putStrike1 > 0, putStrike1, "${formatOI(diaStrikes.putOIs[0])}", GlobalColor("Put"), yes);
AddChartBubble(showOIBubbles and isDIA and highestBar and putStrike2 > 0, putStrike2, "${formatOI(diaStrikes.putOIs[1])}", GlobalColor("Put"), yes);
AddChartBubble(showOIBubbles and isDIA and highestBar and putStrike3 > 0, putStrike3, "${formatOI(diaStrikes.putOIs[2])}", GlobalColor("Put"), yes);
AddChartBubble(showOIBubbles and isDIA and highestBar and putStrike4 > 0, putStrike4, "${formatOI(diaStrikes.putOIs[3])}", GlobalColor("Put"), yes);
AddChartBubble(showOIBubbles and isDIA and highestBar and putStrike5 > 0, putStrike5, "${formatOI(diaStrikes.putOIs[4])}", GlobalColor("Put"), yes);
AddChartBubble(showOIBubbles and isDIA and highestBar and putStrike6 > 0, putStrike6, "${formatOI(diaStrikes.putOIs[5])}", GlobalColor("Put"), yes);
AddChartBubble(showOIBubbles and isDIA and highestBar and putStrike6 > 0, putStrike6, "${formatOI(diaStrikes.putOIs[5])}", GlobalColor("Put"), yes);
AddChartBubble(showOIBubbles and isDIA and highestBar and putStrike7 > 0, putStrike7, "${formatOI(diaStrikes.putOIs[6])}", GlobalColor("Put"), yes);
AddChartBubble(showOIBubbles and isDIA and highestBar and putStrike8 > 0, putStrike8, "${formatOI(diaStrikes.putOIs[7])}", GlobalColor("Put"), yes);`;
    
    setThinkScript(script);
  };
  const copyToClipboard = () => {
    navigator.clipboard.writeText(thinkScript)
      .then(() => {
        setCopySuccess('Copied!');
        setTimeout(() => setCopySuccess(''), 2000);
      })
      .catch(err => {
        console.error('Failed to copy: ', err);
        setCopySuccess('Copy failed');
      });
  };
  
  return (
    <div className="thinkscript-generator">  
      <button 
        className={`copy-button ${copySuccess === 'Copied!' ? 'success' : ''}`} 
        onClick={copyToClipboard}
      >
        {copySuccess || 'Copy ThinkScript'}
      </button>
      
    </div>
  );
};

export default ThinkScriptGenerator;