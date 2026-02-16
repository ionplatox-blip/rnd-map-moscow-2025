import React, { useState } from 'react';
import './Header.css';

interface HeaderProps {
    onSearch: (query: string) => void;
    searchQuery: string;
    aiSummary?: string | null;
}

export const Header: React.FC<HeaderProps> = ({
    onSearch,
    searchQuery,
    aiSummary
}) => {
    const [inputValue, setInputValue] = useState(searchQuery);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInputValue(e.target.value);
        onSearch(e.target.value);
    };

    return (
        <div className="header-container">
            <header className="header glass">
                <div className="logo-section">
                    <div className="logo-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>
                    <div>
                        <h1 className="title">R&D Карта Москвы v. 1.0</h1>
                        <p className="subtitle">данные ЕГИСУ НИОКТР на 2025 год. ЦРИиР МИК</p>
                    </div>
                </div>

                <div className="search-section">
                    <div className="search-box">
                        <input
                            type="text"
                            placeholder="Поиск по названию, области, ключевым словам..."
                            value={inputValue}
                            onChange={handleInputChange}
                            className="search-input"
                        />
                        <div className="search-icon">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                    </div>
                </div>
            </header>

            {aiSummary && (
                <div className="ai-summary-bar glass fade-in">
                    <div className="ai-icon">🤖</div>
                    <p className="ai-text">{aiSummary}</p>
                </div>
            )}
        </div>
    );
};
