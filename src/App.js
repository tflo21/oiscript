import React, { useState, useEffect } from 'react';
import './App.css';
import OptionsChart from './components/OptionsChart';
import TickerSelector from './components/TickerSelector';
import Header from './components/Header';
import Footer from './components/Footer';
import ExpectedMoveInput from './components/ExpectedMoveInput';
import ThinkScriptGenerator from './components/ThinkScriptGenerator';

function App() {
  const [data, setData] = useState({});
  const [selectedTicker, setSelectedTicker] = useState('SPY');
  const [isLoading, setIsLoading] = useState(true);
  // Initialize with empty object instead of hardcoded values
  const [expectedMoves, setExpectedMoves] = useState({});
  // Add state for last updated timestamps
  const [lastUpdated, setLastUpdated] = useState({});
  const [emLoaded, setEmLoaded] = useState(false);
  const tickers = ['SPY', 'QQQ', 'DIA'];
  
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      
      try {
        // First fetch expected moves
        console.log("Fetching expected moves from API...");
        const emResponse = await fetch('http://localhost:3001/api/expected-moves');
        if (emResponse.ok) {
          const emResult = await emResponse.json();
          console.log("Received expected moves from server:", emResult);
          setExpectedMoves(emResult);
          
          // Try to load timestamps from localStorage if they exist
          const savedTimestamps = {};
          tickers.forEach(ticker => {
            const timestamp = localStorage.getItem(`${ticker}_lastUpdated`);
            if (timestamp) {
              savedTimestamps[ticker] = timestamp;
            }
          });
          
          if (Object.keys(savedTimestamps).length > 0) {
            setLastUpdated(savedTimestamps);
          }
          
          setEmLoaded(true);
        } else {
          console.error("Failed to fetch expected moves, using empty defaults");
          setEmLoaded(true);
        }
        
        // Then fetch options data
        console.log("Fetching options data from API...");
        const response = await fetch('http://localhost:3001/api/options');
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        const result = await response.json();
        console.log("Received options data:", result);
        setData(result);
      } catch (error) {
        console.error('Error fetching data:', error);
        // Use fallback demo data
        console.log("Using fallback demo data");
        setData(createDemoData());
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  const handleTickerChange = (ticker) => {
    setSelectedTicker(ticker);
  };
  
  const handleExpectedMoveChange = (value, timestamp) => {
    console.log(`Updating ${selectedTicker} expected move to:`, value, `(type: ${typeof value})`);
    console.log(`Timestamp for update:`, timestamp);
    
    // Store previous value for comparison
    const previousValue = expectedMoves[selectedTicker];
    console.log(`Previous expected move was:`, previousValue);
    
    // Update expected moves
    setExpectedMoves(prev => {
      const updated = {
        ...prev,
        [selectedTicker]: value
      };
      console.log('Updated expected moves state:', updated);
      return updated;
    });
    
    // Update last updated timestamp
    setLastUpdated(prev => {
      const updated = {
        ...prev,
        [selectedTicker]: timestamp
      };
      console.log('Updated timestamps:', updated);
      return updated;
    });
    
    // Store timestamp in localStorage
    localStorage.setItem(`${selectedTicker}_lastUpdated`, timestamp);
    
    // Make an API call to update the value on the server
    fetch(`http://localhost:3001/api/expected-moves/${selectedTicker}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        expectedMove: value,
        lastUpdated: timestamp 
      })
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`Failed to update ${selectedTicker} expected move`);
      }
      return response.json();
    })
    .then(data => {
      console.log(`Server updated ${selectedTicker} expected move to:`, data.expectedMove);
    })
    .catch(error => {
      console.error('Error updating expected move:', error);
    });
  };

  // Create demo data for testing if API fails
  const createDemoData = () => {
    const mockPrices = { SPY: 562, QQQ: 480, DIA: 425 };
    const result = {};
    
    for (const ticker of tickers) {
      const markPrice = mockPrices[ticker];
      const strikeData = [];
      
      for (let i = -10; i <= 10; i++) {
        const strike = markPrice + i;
        const isCallStrike = i > 0;
        const isPutStrike = i < 0;
        const atTheMoneyFactor = Math.abs(i) <= 2 ? 3 : 1;
        
        let callOI = Math.round(Math.random() * 5000 * atTheMoneyFactor);
        let putOI = Math.round(Math.random() * 5000 * atTheMoneyFactor);
        
        if (isCallStrike) callOI = Math.round(callOI * (1.5 - Math.abs(i) * 0.05));
        if (isPutStrike) putOI = Math.round(putOI * (1.5 - Math.abs(i) * 0.05));
        
        strikeData.push({ strike, callOI, putOI });
      }
      
      result[ticker] = {
        [ticker]: strikeData,
        markPrice,
        exactMarkPrice: markPrice,
        plusEM: markPrice + 5,
        minusEM: markPrice - 5
      };
    }
    
    return result;
  };
  
  // Calculate expected move values based on current ticker data and EM value
  const getExpectedMoveValues = (ticker) => {
    console.log(`Getting EM values for ${ticker}, current state:`, expectedMoves);
    
    if (!data[ticker]) return { plusEM: 0, minusEM: 0 };
    
    const markPrice = data[ticker].markPrice || 0;
    const exactMarkPrice = data[ticker].exactMarkPrice || markPrice;
    console.log(`Mark price: ${markPrice}, Exact mark price: ${exactMarkPrice}`);
    
    // Use 1.0 as a fallback instead of 5
    const moveValue = expectedMoves[ticker] || 1.0;
    console.log(`Using move value: ${moveValue} for ${ticker}`);
    
    return {
      plusEM: Math.round((exactMarkPrice + moveValue) * 100) / 100,
      minusEM: Math.round((exactMarkPrice - moveValue) * 100) / 100
    };
  };
  
  // Get the current ticker's last updated timestamp
  const getCurrentTickerTimestamp = () => {
    return lastUpdated[selectedTicker] || null;
  };
  
  return (
    <div className="App">
      <Header />
      
      <main className="App-main">
        {isLoading ? (
          <div className="loading">Loading options data...</div>
        ) : (
          <>
            <OptionsChart 
              data={data[selectedTicker]} 
              ticker={selectedTicker}
              expectedMove={getExpectedMoveValues(selectedTicker)}
              showExpectedMove={true}
              onExpectedMoveChange={handleExpectedMoveChange} 
              lastUpdated={getCurrentTickerTimestamp()}
            />
            <TickerSelector 
              tickers={tickers} 
              selected={selectedTicker} 
              onSelect={handleTickerChange} 
            />

            <ThinkScriptGenerator 
              expectedMoves={expectedMoves}
              data={data}
              lastUpdated={lastUpdated}
            />
          </>
        )}
      </main>
      
      <Footer />
    </div>
  );
}

export default App;