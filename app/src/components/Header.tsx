import React, { useState } from 'react';
import './Header.css';

import type { SearchScope } from '../types';

interface HeaderProps {
    onSearch: (query: string) => void;
    searchQuery: string;
    onScopeChange: (scope: SearchScope) => void;
    activeScope: SearchScope;
    aiSummary?: string | null;
    onAISearchClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
    onSearch,
    searchQuery,
    onScopeChange,
    activeScope,
    aiSummary,
    onAISearchClick
}) => {
    const [inputValue, setInputValue] = useState(searchQuery);

    // Update internal input if external searchQuery changes
    React.useEffect(() => {
        setInputValue(searchQuery);
    }, [searchQuery]);

    // Debounced search effect
    React.useEffect(() => {
        const timer = setTimeout(() => {
            if (inputValue !== searchQuery) {
                onSearch(inputValue);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [inputValue, onSearch, searchQuery]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setInputValue(value);

        // Default to 'center' scope if none selected and user starts typing
        if (value.trim().length > 0 && activeScope === null) {
            onScopeChange('center');
        }
    };

    const handleClearSearch = () => {
        setInputValue('');
        onSearch('');
    };

    const toggleScope = (scope: SearchScope) => {
        if (activeScope === scope) {
            onScopeChange(null);
        } else {
            onScopeChange(scope);
        }
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
                        <h1 className="title">R&D Карта Москвы v. 1.1</h1>
                        <p className="subtitle">данные ЕГИСУ НИОКТР на 2025 год. ЦРИиР МИК</p>
                    </div>
                </div>

                <div className="search-section">
                    <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                        <div className="search-box">
                            <div className="search-icon">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                    <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>
                            <input
                                type="text"
                                placeholder="Поиск по названию, ключевым словам и ТЗ"
                                value={inputValue}
                                onChange={handleInputChange}
                                className="search-input"
                            />
                            {inputValue && (
                                <button
                                    className="clear-button"
                                    onClick={handleClearSearch}
                                    title="Очистить поиск"
                                >
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                        <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </button>
                            )}
                        </div>

                        {onAISearchClick && (
                            <button
                                onClick={onAISearchClick}
                                className="ai-search-button"
                                style={{
                                    marginLeft: '0.5rem',
                                    padding: '0.4rem 0.8rem',
                                    borderRadius: '8px',
                                    border: '1px solid rgba(255,255,255,0.2)',
                                    background: 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))',
                                    color: 'white',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.3rem',
                                    fontSize: '0.85rem',
                                    fontWeight: 500,
                                    transition: 'all 0.2s ease',
                                    height: '40px',
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                <span style={{ fontSize: '1rem' }}>✨</span>
                                <span>ИИ Поиск</span>
                            </button>
                        )}
                    </div>

                    {/* Scope Selector (appears when typing) */}
                    {inputValue.trim().length > 0 && (
                        <div className="scope-selector fade-in">
                            <button
                                className={`scope-btn ${activeScope === 'center' ? 'active' : ''}`}
                                onClick={() => toggleScope('center')}
                            >
                                R&D-центр
                            </button>
                            <button
                                className={`scope-btn ${activeScope === 'project' ? 'active' : ''}`}
                                onClick={() => toggleScope('project')}
                            >
                                Проект
                            </button>
                            <button
                                className={`scope-btn ${activeScope === 'rid' ? 'active' : ''}`}
                                onClick={() => toggleScope('rid')}
                            >
                                РИД
                            </button>
                        </div>
                    )}
                </div>
            </header>

            {aiSummary && (
                <div className="ai-summary-bar glass fade-in" style={{ marginTop: '2.5rem' }}>
                    <div className="ai-icon">🤖</div>
                    <p className="ai-text">{aiSummary}</p>
                </div>
            )}

        </div>
    );
};


