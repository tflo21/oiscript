// frontend/src/components/OptionsChart.js
import React, { useEffect, useRef, useState } from 'react';
import Chart from 'chart.js/auto';
import './OptionsChart.css';

const OptionsChart = ({ data, ticker, expectedMove, showExpectedMove, onExpectedMoveChange }) => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  const [showEMEditor, setShowEMEditor] = useState(false);
  const [emInputValue, setEmInputValue] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // Check if already authenticated
  useEffect(() => {
    const authToken = localStorage.getItem('emAuthToken');
    const tokenExpiry = localStorage.getItem('emTokenExpiry');
    
    if (authToken && tokenExpiry && new Date().getTime() < parseInt(tokenExpiry)) {
      setIsAuthenticated(true);
    }
  }, []);
  
  useEffect(() => {
    // Clean up function
    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, []);
  
  // Update local EM value when props change
  useEffect(() => {
    if (!data) return;
    
    const exactMarkPrice = data.exactMarkPrice || data.markPrice || 0;
    
    if (expectedMove) {
      // Extract just the numeric value from expectedMove
      if (typeof expectedMove === 'object' && expectedMove.plusEM && expectedMove.minusEM) {
        // Calculate the difference between plusEM and markPrice to get the move value
        const emValue = expectedMove.plusEM - exactMarkPrice;
        setEmInputValue(emValue.toFixed(2));
      } 
      // If expectedMove is already a number, use it directly
      else if (typeof expectedMove === 'number') {
        setEmInputValue(expectedMove.toFixed(2));
      }
    }
  }, [expectedMove, data]);
  
  useEffect(() => {
    if (!data || !chartRef.current) {
      console.log("Missing data or chartRef");
      return;
    }
    
    // Clean up previous chart if it exists
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }
    
    // Get mark price (debugging log added)
    const markPrice = data.markPrice || 0;
    const exactMarkPrice = data.exactMarkPrice || markPrice;
    console.log("Price data in chart effect:", {
      rawMarkPrice: data.markPrice, 
      rawExactMarkPrice: data.exactMarkPrice, 
      usedExactMarkPrice: exactMarkPrice
    });
    
    // Extract strike data
    let allStrikesData = [];
    
    // First try to use the ticker array if it exists (e.g., data.SPY for SPY ticker)
    if (data[ticker] && Array.isArray(data[ticker])) {
      allStrikesData = data[ticker];
    } 
    // Otherwise, use allStrikes if available
    else if (data.allStrikes && Array.isArray(data.allStrikes)) {
      allStrikesData = data.allStrikes;
    }
    // If no array data is found, log an error and return
    else {
      console.error("No valid data found for chart");
      return;
    }
    
    if (allStrikesData.length === 0) {
      console.error("Empty strikes data array");
      return;
    }
    
    // Step 1: Filter and get the top put strikes by OI that are below current price
    const putStrikes = allStrikesData
      .filter(item => item.strike < exactMarkPrice && item.putOI > 0) // Only strikes below current price
      .sort((a, b) => b.putOI - a.putOI) // Sort by putOI desc (highest OI first)
      .slice(0, 8) // Take top 8 by OI
      .sort((a, b) => a.strike - b.strike) // Then sort by strike price for display
      .map(item => ({
        strike: item.strike,
        value: item.putOI,
        type: 'put'
      }));
    
    // Step 2: Filter and get the top call strikes by OI that are above current price
    const callStrikes = allStrikesData
      .filter(item => item.strike > exactMarkPrice && item.callOI > 0) // Only strikes above current price
      .sort((a, b) => b.callOI - a.callOI) // Sort by callOI desc (highest OI first)
      .slice(0, 8) // Take top 8 by OI
      .sort((a, b) => a.strike - b.strike) // Then sort by strike price for display
      .map(item => ({
        strike: item.strike,
        value: item.callOI,
        type: 'call'
      }));
    
    console.log("Top put strikes below current price:", putStrikes);
    console.log("Top call strikes above current price:", callStrikes);
    
    // Step 3: Combine all strikes
    const allStrikes = [...putStrikes, ...callStrikes];
    allStrikes.sort((a, b) => a.strike - b.strike);
    
    // Step 4: Extract data for the chart
    const labels = allStrikes.map(item => item.strike);
    const values = allStrikes.map(item => item.value);
    const backgroundColors = allStrikes.map(item => 
      item.type === 'put' ? '#f542b3' : '#4287f5'
    );
    
    // Create the chart
    const ctx = chartRef.current.getContext('2d');
    chartInstance.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            data: values,
            backgroundColor: backgroundColors,
            borderWidth: 0,
            barPercentage: 1,
            categoryPercentage: 0.95
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        resizeDelay: 100,
        layout: {
          padding: {
            left: 15,
            right: 15,
            top: 20,
            bottom: 0
          }
        },
        scales: {
          x: {
            title: {
              display: true,
              text: 'Strike',
              color: '#666',
              font: {
                size: 12
              },
              padding: {top: 10}
            },
            grid: {
              display: false
            },
            ticks: {
              font: {
                size: 11
              },
              color: '#666',
              maxRotation: 0,
              minRotation: 0
            },
            border: {
              display: false
            }
          },
          y: {
            title: {
              display: true,
              text: 'Open Interest',
              color: '#666',
              font: {
                size: 12
              }
            },
            position: 'left',
            border: {
              display: false
            },
            grid: {
              color: '#eee',
              drawBorder: false,
              drawTicks: false
            },
            ticks: {
              font: {
                size: 11
              },
              color: '#666',
              padding: 10
            },
            beginAtZero: true
          }
        },
        plugins: {
          legend: {
            position: 'bottom',
            align: 'center',

              labels: {
              generateLabels: function() {
                return [
                  {
                    text: 'Puts',
                    fillStyle: '#f542b3',
                    strokeStyle: '#f542b3',
                    lineWidth: 0,
                  },
                  {
                    text: 'Calls',
                    fillStyle: '#4287f5',
                    strokeStyle: '#4287f5',
                    lineWidth: 0
                  }
                ];
              },
              boxWidth: 12,
              boxHeight: 12,
              cornerRadius: 6,
              padding: 15,
              font: {
                size: 12
              },
              color: '#666',
            }
          },
          tooltip: {
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            titleColor: '#333',
            bodyColor: '#333',
            titleFont: {
              size: 12,
              weight: 'normal'
            },
            bodyFont: {
              size: 12
            },
            padding: 10,
            cornerRadius: 4,
            borderColor: 'rgba(0, 0, 0, 0.1)',
            borderWidth: 1,
            displayColors: true,
            callbacks: {
              title: function(tooltipItems) {
                return `Strike: ${tooltipItems[0].label}`;
              },
              label: function(context) {
                const index = context.dataIndex;
                const type = allStrikes[index].type === 'put' ? 'Puts' : 'Calls';
                return `${type}: ${context.parsed.y.toLocaleString()}`;
              }
            }
          }
        }
      }
    });
  }, [data, ticker, expectedMove, showExpectedMove]);

  // Handle edit button click
  const handleEditButtonClick = () => {
    if (isAuthenticated) {
      setShowEMEditor(true);
    } else {
      // Ask for password
      const password = prompt("Enter password to edit expected move:");
      if (password === "admin123") {
        setIsAuthenticated(true);
        
        // Store in localStorage for 30 minutes
        const expiryTime = new Date().getTime() + (30 * 60 * 1000);
        localStorage.setItem('emAuthToken', 'authorized');
        localStorage.setItem('emTokenExpiry', expiryTime.toString());
        
        setShowEMEditor(true);
      } else if (password !== null) {
        alert("Incorrect password");
      }
    }
  };
  
  // Handle saving the new EM value
  const handleEMSave = () => {
    if (onExpectedMoveChange) {
      const numValue = parseFloat(emInputValue);
      if (!isNaN(numValue) && numValue >= 0) {
        // Create a timestamp for when the EM was updated
        const timestamp = new Date().toISOString();
        
        // Save the timestamp to localStorage
        localStorage.setItem('emLastUpdated', timestamp);
        
        // Pass the numeric value to the parent component
        // We'll modify this to include the timestamp
        console.log(`Saving new EM value in OptionsChart: ${numValue}, timestamp: ${timestamp}`);
        onExpectedMoveChange(numValue, timestamp);
        
        // Log for debugging
        console.log(`Saved EM value: ${numValue}, type: ${typeof numValue}, timestamp: ${timestamp}`);
      }
    }
    setShowEMEditor(false);
  };

  // Exit early if no data
  if (!data) {
    return <div className="chart-container">Loading data...</div>;
  }
  
  // Calculate summary statistics for display
  // Use raw data properties directly to avoid any manipulation
  const displayMarkPrice = data.exactMarkPrice !== undefined ? data.exactMarkPrice : data.markPrice || 0;
  console.log("Using display mark price:", displayMarkPrice);
  
  const totalCallOI = data.summary?.totalCallOI || 0;
  const totalPutOI = data.summary?.totalPutOI || 0;
  
  // Calculate EM values
  const emValue = parseFloat(emInputValue) || 0; // Full expected move value
  
  // Calculate price points based on current price and EM
  const plusEM = displayMarkPrice + emValue;
  const minusEM = displayMarkPrice - emValue;
  
  // Get last updated timestamp from localStorage
  const lastUpdated = localStorage.getItem('emLastUpdated');
  
  return (
    <div className="options-chart-container">
      <div className="chart-canvas-container">
        <canvas ref={chartRef}></canvas>
      </div>
      
      <div className="stats-container">
        <div className="stat-item">
          <div className="stat-label">Current Price</div>
          <div className="stat-value">
            ${displayMarkPrice.toFixed(2)}
          </div>
        </div>
        {showExpectedMove && (
          <>            
            <div className="stat-item">
              <div className="stat-label">+EM</div>
              <div className="stat-value green-text">
                ${plusEM.toFixed(2)}
              </div>
            </div>
            <div className="stat-item">
              <div className="stat-label">Expected Move</div>
              <div className="stat-value em-value">${emValue.toFixed(2)}</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">-EM</div>
              <div className="stat-value red-text">
                ${minusEM.toFixed(2)}
              </div>
            </div>
          </>
        )}
        <div className="stat-item">
          <div className="stat-label">Total Calls</div>
          <div className="stat-value">{totalCallOI.toLocaleString()}</div>
        </div>
        <div className="stat-item">
          <div className="stat-label">Total Puts</div>
          <div className="stat-value">{totalPutOI.toLocaleString()}</div>
        </div>
      </div>
      
      {/* Small circular edit button in bottom right */}
      <div className="em-edit-container">
  <button 
    className="em-edit-circle" 
    onClick={handleEditButtonClick}
    title="Edit Expected Move">
    <span className="em-edit-icon"></span>
  </button>
  {lastUpdated && (
    <div className="em-last-updated">
      Last Updated: {new Date(lastUpdated).toLocaleString(undefined, {
        year: '2-digit',
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      })}
    </div>
  )}
</div>
      
      {/* EM Editor modal */}
      {showEMEditor && (
        <div className="em-editor-overlay">
          <div className="em-editor-modal">
            <h4>Edit Expected Move</h4>
            <div className="em-editor-form">
              <label htmlFor="em-value">{ticker} Expected Move ($):</label>
              <input
                id="em-value"
                type="number"
                step="0.01"
                min="0"
                value={emInputValue}
                onChange={(e) => setEmInputValue(e.target.value)}
              />
            </div>
            <div className="em-editor-buttons">
              <button className="em-save-btn" onClick={handleEMSave}>Save</button>
              <button className="em-cancel-btn" onClick={() => setShowEMEditor(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OptionsChart;