import React from 'react';
import './SummaryInfo.css';
import type { MapCenter } from '../types';

interface SummaryInfoProps {
    centers: MapCenter[];
}

export const SummaryInfo: React.FC<SummaryInfoProps> = ({ centers }) => {
    const totalCenters = centers.length;

    // total_funding is in thousands of rubles
    const totalFundingThousands = centers.reduce(
        (sum, c) => sum + (c.total_funding || 0),
        0
    );

    const totalRids = centers.reduce(
        (sum, c) => sum + (c.rid_count || 0),
        0
    );

    // Format funding: convert thousands -> millions, then display
    const formatFunding = (thousandsVal: number) => {
        if (thousandsVal === 0) return '0 ₽';
        const mln = thousandsVal / 1000;
        if (mln >= 1000) {
            // Display as billions
            const bln = mln / 1000;
            return new Intl.NumberFormat('ru-RU', {
                maximumFractionDigits: 1,
            }).format(bln) + ' млрд ₽';
        }
        return new Intl.NumberFormat('ru-RU', {
            maximumFractionDigits: 1,
        }).format(mln) + ' млн ₽';
    };

    return (
        <div className="summary-info glass">
            <h4>Общая информация</h4>
            <div className="summary-grid">
                <div className="summary-stat">
                    <span className="summary-value">{totalCenters.toLocaleString('ru-RU')}</span>
                    <span className="summary-label">Центров</span>
                </div>
                <div className="summary-stat">
                    <span className="summary-value">{formatFunding(totalFundingThousands)}</span>
                    <span className="summary-label">Финансирование</span>
                </div>
                <div className="summary-stat">
                    <span className="summary-value">{totalRids.toLocaleString('ru-RU')}</span>
                    <span className="summary-label">РИД</span>
                </div>
            </div>
        </div>
    );
};
