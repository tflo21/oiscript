import React, { useState, useEffect } from 'react';
import './ExpectedMoveInput.css';

const MinimalExpectedMoveInput = ({ 
  tickers = ['SPY', 'QQQ', 'DIA'], 
  values = {}, 
  onValuesChange = () => {},
  onExpectedMoveChange = null // Add this prop to directly update expected move
}) => {
  const [inputValues, setInputValues] = useState({});
  const [isEditing, setIsEditing] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // Fetch initial expected moves when component mounts
  useEffect(() => {
    fetch('/api/expected-moves')
      .then(response => response.json())
      .then(data => {
        console.log('Fetched initial expected moves:', data);
        setInputValues(data);
        onValuesChange(data);
        
        // If onExpectedMoveChange is provided, update for the primary ticker
        if (onExpectedMoveChange && tickers.length > 0) {
          const primaryTicker = tickers[0];
          onExpectedMoveChange(data[primaryTicker] || 0);
        }
      })
      .catch(error => {
        console.error('Error fetching expected moves:', error);
      });
  }, []);
  
  // Check if already authenticated
  useEffect(() => {
    const authToken = localStorage.getItem('emAuthToken');
    const tokenExpiry = localStorage.getItem('emTokenExpiry');
    
    if (authToken && tokenExpiry && new Date().getTime() < parseInt(tokenExpiry)) {
      setIsAuthenticated(true);
    }
  }, []);
  
  // Handle clicking on edit button
  const handleEditClick = () => {
    if (isAuthenticated) {
      setIsEditing(true);
    } else {
      // Ask for password
      const enteredPassword = window.prompt("Enter password to edit expected moves:");
      if (enteredPassword === "Travis3635") {
        setIsAuthenticated(true);
        setIsEditing(true);
        
        // Store auth in localStorage
        const expiryTime = new Date().getTime() + (30 * 60 * 1000);
        localStorage.setItem('emAuthToken', 'authorized');
        localStorage.setItem('emTokenExpiry', expiryTime.toString());
      } else if (enteredPassword !== null) {
        // Only show error if they entered something but it was wrong
        // (null means they hit cancel)
        alert("Incorrect password");
      }
    }
  };
  
  const handleInputChange = (ticker, e) => {
    const newValues = {
      ...inputValues,
      [ticker]: e.target.value
    };
    setInputValues(newValues);
    
    // Optionally update the chart in real-time as typing
    if (onExpectedMoveChange && ticker === tickers[0]) {
      const numValue = parseFloat(e.target.value) || 0;
      onExpectedMoveChange(numValue);
    }
  };
  const handleSave = () => {
    const numericValues = {};
    
    for (const ticker of tickers) {
        const numValue = parseFloat(inputValues[ticker] || 0);
        numericValues[ticker] = isNaN(numValue) ? 0 : numValue;
    }

    // Update UI immediately
    onValuesChange(numericValues);
    if (onExpectedMoveChange && tickers.length > 0) {
        onExpectedMoveChange(numericValues[tickers[0]]);
    }

    // Send to backend
    Promise.all(tickers.map(ticker =>
        fetch(`/api/expected-moves/${ticker}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ expectedMove: numericValues[ticker] })
        })
    ))
    .then(() => console.log("Expected moves saved successfully."))
    .catch(error => console.error("Error updating expected moves:", error));

    setIsEditing(false);
};
  
  const handleCancel = () => {
    setIsEditing(false);
    setInputValues({...values}); // Reset to original values
  };
  
  if (!isEditing) {
    return (
      <div className="min-em-container">
        <div className="min-em-header">
          <h3>Expected Moves</h3>
          <button className="min-em-edit-button" onClick={handleEditClick}>Edit</button>
        </div>
        <div className="min-em-values">
          {tickers.map(ticker => (
            <div key={ticker} className="min-em-value-item">
              <span className="min-em-ticker">{ticker}</span>
              <span className="min-em-value">${(inputValues[ticker] || 0).toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-em-container min-em-editing">
      <h3>Edit Expected Moves</h3>
      
      <div className="min-em-edit-form">
        {tickers.map(ticker => (
          <div key={ticker} className="min-em-input-row">
            <label htmlFor={`min-em-${ticker}`}>{ticker}:</label>
            <div className="min-em-input-wrapper">
              <span className="min-em-currency">$</span>
              <input
                id={`min-em-${ticker}`}
                type="number"
                step="0.01"
                min="0"
                value={inputValues[ticker] || 0}
                onChange={(e) => handleInputChange(ticker, e)}
              />
            </div>
          </div>
        ))}
        
        <div className="min-em-buttons">
          <button className="min-em-save" onClick={handleSave}>Save All</button>
          <button className="min-em-cancel" onClick={handleCancel}>Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default MinimalExpectedMoveInput;