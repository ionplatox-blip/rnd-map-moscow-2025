import React from 'react';
import './Legend.css';
import type { FundingTier } from '../types';

interface LegendProps {
    activeFilter: FundingTier;
    onFilterChange: (filter: FundingTier) => void;
}

export const Legend: React.FC<LegendProps> = ({ activeFilter, onFilterChange }) => {
    return (
        <div className="map-legend glass">
            <h4>Условные обозначения</h4>
            <div
                className={`legend-item clickable ${activeFilter === 'small' ? 'active' : ''}`}
                onClick={() => onFilterChange(activeFilter === 'small' ? 'all' : 'small')}
            >
                <div className="legend-marker small"></div>
                <span>Малые (&lt; 100 млн ₽)</span>
            </div>
            <div
                className={`legend-item clickable ${activeFilter === 'medium' ? 'active' : ''}`}
                onClick={() => onFilterChange(activeFilter === 'medium' ? 'all' : 'medium')}
            >
                <div className="legend-marker medium"></div>
                <span>Средние (100 млн - 1 млрд ₽)</span>
            </div>
            <div
                className={`legend-item clickable ${activeFilter === 'large' ? 'active' : ''}`}
                onClick={() => onFilterChange(activeFilter === 'large' ? 'all' : 'large')}
            >
                <div className="legend-marker large"></div>
                <span>Крупные (&gt; 1 млрд ₽)</span>
            </div>
            <div className="legend-item">
                <div className="legend-marker highlighted"></div>
                <span>Найденные по запросу</span>
            </div>
        </div>
    );
};
