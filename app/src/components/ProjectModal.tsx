import React from 'react';
import type { CenterDetail } from '../types';
import './ProjectModal.css';

interface ProjectModalProps {
    project: CenterDetail['projects'][0];
    onClose: () => void;
    onViewCenter?: () => void;
}

export const ProjectModal: React.FC<ProjectModalProps> = ({ project, onClose, onViewCenter }) => {
    if (!project) return null;

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
        <div className="modal-overlay fade-in" onClick={onClose}>
            <div className="modal-content glass" onClick={e => e.stopPropagation()}>
                <button className="modal-close" onClick={onClose}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                </button>

                <div className="modal-header">
                    <div className="modal-meta">
                        <span className="badge purple">{project.report_type}</span>
                        <span className={`badge ${project.status === 'В работе' ? 'green' : 'gray'}`}>
                            {project.status || 'Статус не указан'}
                        </span>
                    </div>
                    <h2 className="modal-title">{project.name}</h2>
                    <div className="modal-dates">
                        <span className="date-label">Сроки реализации:</span>
                        <span className="date-value">{project.stage_start_date} — {project.stage_end_date}</span>
                    </div>
                </div>

                <div className="modal-actions" style={{ padding: '0 2rem', marginBottom: '1rem' }}>
                    <button
                        className="btn-view-center"
                        onClick={onViewCenter}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            background: 'rgba(59, 130, 246, 0.15)',
                            border: '1px solid rgba(59, 130, 246, 0.3)',
                            color: '#60a5fa',
                            padding: '8px 16px',
                            borderRadius: '8px',
                            fontSize: '0.85rem',
                            fontWeight: 500,
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                    >
                        🏛 Перейти к организации
                    </button>
                </div>

                <div className="modal-body">
                    {project.finance_total ? (
                        <div className="finance-block">
                            <span className="finance-label">Объем финансирования:</span>
                            <span className="finance-value">{formatMoneyMln(project.finance_total)}</span>
                        </div>
                    ) : null}

                    <div className="modal-section">
                        <h3 className="modal-subtitle">Аннотация</h3>
                        <p className="modal-text">{project.abstract || 'Аннотация отсутствует.'}</p>
                    </div>

                    {project.keywords.length > 0 && (
                        <div className="modal-section">
                            <h3 className="modal-subtitle">Ключевые слова</h3>
                            <div className="modal-keywords">
                                {project.keywords.map((kw, i) => (
                                    <span key={i} className="badge">{kw}</span>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="modal-stats">
                        {project.workers_total && (
                            <div className="stat-item">
                                <span className="stat-value">{Number(project.workers_total).toFixed(0)}</span>
                                <span className="stat-label">Исследователей</span>
                            </div>
                        )}
                        <div className="stat-item">
                            <span className="stat-value">{project.publication_count}</span>
                            <span className="stat-label">Публикаций</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
