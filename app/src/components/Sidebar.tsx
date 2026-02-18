import React, { useState, useEffect } from 'react';
import type { MapCenter, CenterDetail, ProjectEntry, SearchResult, MatchReason, SearchScope } from '../types';
import { ProjectModal } from './ProjectModal';
import './Sidebar.css';

interface SidebarProps {
    center: MapCenter | null;
    onClose: () => void;
    mode?: 'details' | 'ai-results';
    aiResults?: SearchResult[] | null;
    aiLoading?: boolean;
    onCenterClick?: (center: MapCenter | null) => void;
    matchReason?: MatchReason;
    searchScope?: SearchScope;
    searchQuery?: string;
    onSetMode?: (mode: 'details' | 'ai-results') => void;
    highlightProjectId?: string | null;
    onProjectClick?: (projectId: string | null) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
    center,
    onClose,
    mode = 'details',
    aiResults,
    aiLoading,
    onCenterClick,
    matchReason,
    searchScope,
    searchQuery = '',
    onSetMode,
    highlightProjectId,
    onProjectClick
}) => {
    const [details, setDetails] = useState<CenterDetail | null>(null);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'projects' | 'rids'>('projects');
    const [selectedProject, setSelectedProject] = useState<ProjectEntry | null>(null);
    const [sortedProjects, setSortedProjects] = useState<ProjectEntry[]>([]);
    const [sortedRids, setSortedRids] = useState<any[]>([]);
    const [matchIds, setMatchIds] = useState<string[]>([]);


    // Load details and handle initial state
    useEffect(() => {
        if (mode === 'details' && center) {
            loadDetails(center.ogrn);
            // If we have a highlight project, scroll to it
            if (highlightProjectId) {
                setActiveTab('projects');
            } else if (searchScope === 'project') {
                setActiveTab('projects');
            } else if (searchScope === 'rid') {
                setActiveTab('rids');
            } else if (matchReason && matchReason.type !== 'name') {
                setActiveTab('projects');
            }
        } else if (mode === 'details' && !center) {
            setDetails(null);
        }
    }, [center, mode, searchScope, matchReason, highlightProjectId]);

    // Auto-open project modal if highlightProjectId is set
    useEffect(() => {
        if (details && highlightProjectId) {
            const project = details.projects.find(p => p.registration_number === highlightProjectId || p.name === highlightProjectId);
            if (project) {
                setSelectedProject(project);
            }
        }
    }, [details, highlightProjectId]);


    // Derived sorted projects and RIDs
    useEffect(() => {
        if (details) {
            const query = (searchQuery || '').trim().toLowerCase();
            const tokens = query.split(/\s+/).filter(t => t.length > 1);
            const foundNames: string[] = [];

            // Helper to sort by status/date
            const statusOrder = (status: string) => status === 'В работе' ? 0 : 1;
            const getYear = (dateStr: string) => {
                const match = (dateStr || '').match(/\d{4}/);
                return match ? parseInt(match[0]) : 0;
            };

            // Sort Projects
            let projects = [...details.projects];
            projects.sort((a, b) => {
                // ABSOLUTE TOP: Highlighted project from AI results
                if (highlightProjectId) {
                    if (a.registration_number === highlightProjectId || a.name === highlightProjectId) return -1;
                    if (b.registration_number === highlightProjectId || b.name === highlightProjectId) return 1;
                }

                // Primary: relevance if search query exists
                if (query.length > 1) {
                    let aScore = 0;
                    let bScore = 0;
                    tokens.forEach(t => {
                        if (a.name.toLowerCase().includes(t)) aScore += 50;
                        if ((a.abstract || '').toLowerCase().includes(t)) aScore += 10;
                        if (b.name.toLowerCase().includes(t)) bScore += 50;
                        if ((b.abstract || '').toLowerCase().includes(t)) bScore += 10;
                    });

                    if (aScore !== bScore) return bScore - aScore;
                }

                // Secondary: Status ('В работе' first)
                const aStatus = statusOrder(a.status || '');
                const bStatus = statusOrder(b.status || '');
                if (aStatus !== bStatus) return aStatus - bStatus;

                // Tertiary: Date descending
                return getYear(b.stage_start_date) - getYear(a.stage_start_date);
            });

            // Track match ids for UI highlighting
            if (query.length > 1) {
                projects.forEach(p => {
                    const match = tokens.some(t => p.name.toLowerCase().includes(t) || (p.abstract || '').toLowerCase().includes(t));
                    if (match && !foundNames.includes(p.name)) foundNames.push(p.name);
                });
            }
            setSortedProjects(projects);

            // Sort RIDs
            let rids = [...details.rids];
            rids.sort((a, b) => {
                if (query.length > 1) {
                    let aScore = 0;
                    let bScore = 0;
                    tokens.forEach(t => {
                        if (a.name.toLowerCase().includes(t)) aScore += 50;
                        if (b.name.toLowerCase().includes(t)) bScore += 50;
                    });
                    if (aScore !== bScore) return bScore - aScore;
                }
                return getYear(b.created_date) - getYear(a.created_date);
            });

            if (query.length > 1) {
                rids.forEach(r => {
                    const match = tokens.some(t => r.name.toLowerCase().includes(t));
                    if (match && !foundNames.includes(r.name)) foundNames.push(r.name);
                });
            }
            setSortedRids(rids);
            setMatchIds(foundNames);
        } else {
            setSortedProjects([]);
            setSortedRids([]);
            setMatchIds([]);
        }
    }, [details, searchQuery]);


    const loadDetails = async (ogrn: string) => {
        setLoading(true);
        try {
            const response = await fetch(`/data/centers/${ogrn}.json`);
            const data = await response.json();
            setDetails(data);
        } catch (error) {
            console.error('Failed to load center details:', error);
        } finally {
            setLoading(false);
        }
    };

    // Determine if sidebar should be open
    const isOpen = (mode === 'details' && !!center) || (mode === 'ai-results' && (aiLoading || !!aiResults));

    if (!isOpen) return null;

    const getSummary = () => {
        if (!details) return 'Загрузка информации...';
        const keywords = details.top_keywords.slice(0, 5).map(k => k.keyword.toLowerCase()).join(', ');
        let text = `Организация с компетенциями в областях: ${keywords || 'научные исследования'}.`;
        const activeProjects = details.projects.filter(p => p.status === 'В работе').length;
        if (activeProjects > 0) {
            text += ` В настоящее время ведется работа над ${activeProjects} проектами.`;
        } else {
            text += ` Реализовано ${details.projects.length} научно-исследовательских работ.`;
        }
        return text;
    };

    const formatMoneyMln = (amount?: number) => {
        if (!amount || amount === 0) return null;
        const mln = amount / 1000;
        return new Intl.NumberFormat('ru-RU', {
            style: 'currency',
            currency: 'RUB',
            maximumFractionDigits: 1
        }).format(mln).replace('₽', 'млн ₽');
    };

    return (
        <>
            <div className={`sidebar ${isOpen ? 'open' : ''} glass slide-in`}>
                <div className="sidebar-header">
                    <div style={{ flex: 1 }}>
                        {mode === 'details' && center ? (
                            <>
                                {aiResults && onSetMode && (
                                    <button
                                        className="back-to-search"
                                        onClick={() => onSetMode('ai-results')}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            background: 'rgba(255,255,255,0.05)',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            borderRadius: '6px',
                                            padding: '4px 10px',
                                            fontSize: '0.75rem',
                                            color: '#aaa',
                                            cursor: 'pointer',
                                            marginBottom: '1rem',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        ← К результатам поиска
                                    </button>
                                )}
                                {matchReason && (
                                    <div className="match-badge fade-in" style={{
                                        background: matchReason.type === 'name' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(139, 92, 246, 0.2)',
                                        color: matchReason.type === 'name' ? '#60a5fa' : '#a78bfa',
                                        padding: '0.25rem 0.6rem',
                                        borderRadius: '6px',
                                        fontSize: '0.75rem',
                                        fontWeight: 600,
                                        display: 'inline-block',
                                        marginBottom: '0.75rem',
                                        border: `1px solid ${matchReason.type === 'name' ? 'rgba(59, 130, 246, 0.3)' : 'rgba(139, 92, 246, 0.3)'}`
                                    }}>
                                        {matchReason.type === 'name' ? '🔍 ' : '🚀 '}
                                        {matchReason.detail || (matchReason.type === 'name' ? 'Соответствие по названию' : 'Релевантно запросу')}
                                    </div>
                                )}
                                <h2 className="sidebar-title">{center.short_name || center.name || details?.short_name || details?.name || 'Загрузка...'}</h2>
                                {center.short_name && center.short_name !== center.name && (
                                    <p className="sidebar-subtitle" style={{ fontSize: '0.9rem', color: '#888', marginTop: '0.25rem', marginBottom: '0.5rem', lineHeight: '1.2' }}>
                                        {center.name}
                                    </p>
                                )}
                                <div className="sidebar-stats">
                                    <span className="badge purple">{center.project_count} проектов</span>
                                    <span className="badge">{center.rid_count} РИД</span>
                                    {center.total_funding ? (
                                        <span className="badge yellow">
                                            💰 {formatMoneyMln(center.total_funding)}
                                        </span>
                                    ) : null}
                                </div>
                            </>
                        ) : (
                            <>
                                <h2 className="sidebar-title">⚡ Результаты ИИ Поиска</h2>
                                <p className="sidebar-subtitle" style={{ color: '#888' }}>
                                    {aiLoading ? 'Анализирую базу знаний...' : `Найдено ${aiResults?.length || 0} подходящих проектов`}
                                </p>
                            </>
                        )}
                    </div>
                    <button className="close-button" onClick={onClose} aria-label="Закрыть">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                </div>

                <div className="sidebar-content">
                    {mode === 'ai-results' ? (
                        <div className="ai-results-list">
                            {aiLoading && (
                                <div className="loading-container">
                                    <div className="spinner" />
                                    <p>ИИ анализирует проекты...</p>
                                </div>
                            )}

                            {!aiLoading && aiResults && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {aiResults.map((res, idx) => (
                                        <div
                                            key={`${res.project_id}-${idx}`}
                                            className="result-card"
                                            style={{
                                                padding: '1rem',
                                                background: 'rgba(255,255,255,0.03)',
                                                borderRadius: '12px',
                                                border: '1px solid rgba(255,255,255,0.05)',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s'
                                            }}
                                            onClick={() => {
                                                if (onSetMode) onSetMode('details');
                                                if (onCenterClick) onCenterClick({ ogrn: res.center_id } as MapCenter);
                                                if (onProjectClick) onProjectClick(res.project_id);
                                            }}
                                        >
                                            <div style={{ fontSize: '0.7rem', color: 'var(--accent-primary)', marginBottom: '0.25rem', display: 'flex', justifyContent: 'space-between' }}>
                                                <span>{res.year}</span>
                                                <span style={{ opacity: 0.7 }}>Score: {res.score.toFixed(2)}</span>
                                            </div>
                                            <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.95rem', lineHeight: '1.4', fontWeight: 600 }}>{res.title}</h4>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                                                🏛 {res.center_name}
                                            </div>

                                            {res.evidence_snippets && res.evidence_snippets.length > 0 && (
                                                <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                                                    {res.evidence_snippets.map((snip, i) => (
                                                        <div key={i} style={{ fontSize: '0.8rem', color: '#ffd60a', fontStyle: 'italic', display: 'flex', gap: '0.5rem', marginBottom: '0.25rem' }}>
                                                            <span>💡</span>
                                                            <span>{snip}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        loading ? (
                            <div className="loading-container">
                                <div className="spinner" />
                                <p>Загрузка...</p>
                            </div>
                        ) : details ? (
                            <>
                                {searchScope !== 'project' && (
                                    <section className="section summary-section">
                                        <h3 className="section-title">Описание R&D центра</h3>
                                        <p className="summary-text">{getSummary()}</p>
                                    </section>
                                )}

                                <div className="tabs">
                                    <button
                                        className={`tab ${activeTab === 'projects' ? 'active' : ''}`}
                                        onClick={() => setActiveTab('projects')}
                                    >
                                        Проекты ({details.projects.length})
                                    </button>
                                    <button
                                        className={`tab ${activeTab === 'rids' ? 'active' : ''}`}
                                        onClick={() => setActiveTab('rids')}
                                    >
                                        РИД ({sortedRids.length})
                                    </button>

                                </div>

                                <div className="tab-content">
                                    {activeTab === 'projects' && (
                                        <div className="items-list">
                                            {sortedProjects.slice(0, 30).map((project, i) => (
                                                <div
                                                    key={i}
                                                    className={`card item-card fade-in clickable ${matchIds.includes(project.name) ? 'matched' : ''}`}
                                                    onClick={() => setSelectedProject(project)}
                                                >

                                                    <div className="item-header">
                                                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                                            <span className={`badge ${project.status === 'В работе' ? 'green' : 'gray'}`}>
                                                                {project.status || 'Завершен'}
                                                            </span>
                                                            {project.finance_total ? (
                                                                <span className="badge yellow">
                                                                    💰 {formatMoneyMln(project.finance_total)}
                                                                </span>
                                                            ) : null}
                                                        </div>
                                                        <span className="item-date">
                                                            {project.stage_start_date} — {project.stage_end_date}
                                                        </span>
                                                    </div>
                                                    <h4 className="item-title">{project.name}</h4>
                                                    {project.abstract && (
                                                        <p className="item-abstract">
                                                            {project.abstract.slice(0, 150)}
                                                            {project.abstract.length > 150 ? '...' : ''}
                                                        </p>
                                                    )}
                                                </div>
                                            ))}
                                            {sortedProjects.length > 30 && (
                                                <p className="more-items">и еще {sortedProjects.length - 30} проектов...</p>
                                            )}
                                        </div>
                                    )}

                                    {activeTab === 'rids' && (
                                        <div className="items-list">
                                            {sortedRids.slice(0, 30).map((rid, i) => (
                                                <div key={i} className={`card item-card fade-in ${matchIds.includes(rid.name) ? 'matched' : ''}`}>

                                                    <div className="item-header">
                                                        <span className="badge cyan">{rid.rid_type}</span>
                                                        <span className="item-date">{rid.created_date}</span>
                                                    </div>
                                                    <h4 className="item-title">{rid.name}</h4>
                                                    {rid.usage && rid.usage.length > 0 && (
                                                        <div className="usage-badge" title="Результат используется в реальном секторе">
                                                            🚀 Внедрено ({rid.usage.length})
                                                        </div>
                                                    )}
                                                    {rid.abstract && (
                                                        <p className="item-abstract">
                                                            {rid.abstract.slice(0, 150)}
                                                            {rid.abstract.length > 150 ? '...' : ''}
                                                        </p>
                                                    )}
                                                </div>
                                            ))}
                                            {details.rids.length > 20 && (
                                                <p className="more-items">и еще {details.rids.length - 20} РИД...</p>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {searchScope !== 'project' && (
                                    <>
                                        {details.scientific_domains.length > 0 && (
                                            <section className="section mt-4">
                                                <h3 className="section-title">Научные области (ОЕСP)</h3>
                                                <div className="domains-list">
                                                    {details.scientific_domains.map((domain, i) => (
                                                        <div key={i} className="domain-item">
                                                            <span className="domain-code">{domain.code}</span>
                                                            <span className="domain-name">{domain.name}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </section>
                                        )}

                                        {Object.keys(details.rid_types).length > 0 && (
                                            <section className="section">
                                                <h3 className="section-title">Типы РИД</h3>
                                                <div className="rid-types">
                                                    {Object.entries(details.rid_types).map(([type, count]) => (
                                                        <div key={type} className="rid-type-item">
                                                            <span className="rid-type-name">{type}</span>
                                                            <span className="rid-type-count">{count}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </section>
                                        )}
                                    </>
                                )}

                                {details.top_keywords.length > 0 && (
                                    <section className="section">
                                        <h3 className="section-title">Ключевые слова</h3>
                                        <div className="keywords-grid">
                                            {details.top_keywords.slice(0, 20).map((kw, i) => (
                                                <div key={i} className="keyword-item">
                                                    <span className="keyword-text">{kw.keyword}</span>
                                                    <span className="keyword-count">{kw.count}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </section>
                                )}
                            </>
                        ) : (
                            <p className="no-data">Нет данных</p>
                        )
                    )}
                </div>
            </div>

            {selectedProject && (
                <ProjectModal
                    project={selectedProject}
                    onClose={() => setSelectedProject(null)}
                    onViewCenter={() => setSelectedProject(null)}
                />
            )}
            {!selectedProject && highlightProjectId && mode === 'details' && (
                <div className="project-highlight-bar glass fade-in" style={{
                    position: 'sticky',
                    bottom: '1rem',
                    left: '1rem',
                    right: '1rem',
                    margin: '0 1rem',
                    padding: '0.75rem 1rem',
                    background: 'rgba(139, 92, 246, 0.2)',
                    border: '1px solid rgba(139, 92, 246, 0.4)',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    zIndex: 10,
                    backdropFilter: 'blur(10px)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                }}>
                    <div style={{ fontSize: '0.8rem', color: '#a78bfa', fontWeight: 500 }}>
                        📍 Найденный проект активен
                    </div>
                    <button
                        onClick={() => {
                            const p = details?.projects.find(p => p.registration_number === highlightProjectId || p.name === highlightProjectId);
                            if (p) setSelectedProject(p);
                        }}
                        style={{
                            background: '#8b5cf6',
                            border: 'none',
                            color: 'white',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                        }}
                    >
                        Вернуться к проекту
                    </button>
                </div>
            )}
        </>
    );
};
