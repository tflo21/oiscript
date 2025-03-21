import React from 'react';
import './TickerSelector.css';

const TickerSelector = ({ tickers, selected, onSelect }) => {
  return (
    <div className="ticker-selector">
      {tickers.map(ticker => (
        <button
          key={ticker}
          className={`ticker-button ${selected === ticker ? ticker : ''}`}
          onClick={() => onSelect(ticker)}
        >
          {ticker}
        </button>
      ))}
    </div>
  );
};

export default TickerSelector;