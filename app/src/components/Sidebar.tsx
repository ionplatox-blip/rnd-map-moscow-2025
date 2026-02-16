import React, { useState, useEffect } from 'react';
import type { MapCenter, CenterDetail, ProjectEntry } from '../types';
import { ProjectModal } from './ProjectModal';
import './Sidebar.css';

interface SidebarProps {
    center: MapCenter | null;
    onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ center, onClose }) => {
    const [details, setDetails] = useState<CenterDetail | null>(null);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'projects' | 'rids'>('projects');
    const [selectedProject, setSelectedProject] = useState<ProjectEntry | null>(null);

    useEffect(() => {
        if (center) {
            loadDetails(center.ogrn);
            setActiveTab('projects');
        } else {
            setDetails(null);
        }
    }, [center]);

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

    if (!center) return null;

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
        // Convert thousands to millions (raw data is in thousands)
        const mln = amount / 1000;
        return new Intl.NumberFormat('ru-RU', {
            style: 'currency',
            currency: 'RUB',
            maximumFractionDigits: 1
        }).format(mln).replace('₽', 'млн ₽');
    };

    return (
        <>
            <div className={`sidebar ${center ? 'open' : ''} glass slide-in`}>
                <div className="sidebar-header">
                    <div>
                        <h2 className="sidebar-title">{center.short_name || center.name}</h2>
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
                    </div>
                    <button className="close-button" onClick={onClose}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                    </button>
                </div>

                <div className="sidebar-content">
                    {loading ? (
                        <div className="loading-container">
                            <div className="spinner" />
                            <p>Загрузка...</p>
                        </div>
                    ) : details ? (
                        <>
                            <section className="section summary-section">
                                <h3 className="section-title">
                                    Описание R&D центра
                                </h3>
                                <p className="summary-text">
                                    {getSummary()}
                                </p>
                            </section>

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
                                    РИД ({details.rids.length})
                                </button>
                            </div>

                            <div className="tab-content">
                                {activeTab === 'projects' && (
                                    <>
                                        <div className="items-list">
                                            {details.projects.slice(0, 20).map((project, i) => (
                                                <div
                                                    key={i}
                                                    className="card item-card fade-in clickable"
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
                                            {details.projects.length > 20 && (
                                                <p className="more-items">
                                                    и еще {details.projects.length - 20} проектов...
                                                </p>
                                            )}
                                        </div>
                                    </>
                                )}

                                {activeTab === 'rids' && (
                                    <>
                                        <div className="items-list">
                                            {details.rids.slice(0, 20).map((rid, i) => (
                                                <div key={i} className="card item-card fade-in">
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
                                                <p className="more-items">
                                                    и еще {details.rids.length - 20} РИД...
                                                </p>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>

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
                    )}
                </div>
            </div>

            {selectedProject && (
                <ProjectModal
                    project={selectedProject}
                    onClose={() => setSelectedProject(null)}
                />
            )}
        </>
    );
};
