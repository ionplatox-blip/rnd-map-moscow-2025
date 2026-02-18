import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { MapCenter, MatchReason } from '../types';

import './MapView.css';

// Fix for default marker icons in React-Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface MapViewProps {
    centers: MapCenter[];
    selectedCenter: MapCenter | null;
    onCenterClick: (center: MapCenter) => void;
    highlightedCenters?: string[]; // OGRNs to highlight
    onMapClick?: () => void;
    isSearchActive?: boolean;
    matchReasons?: Record<string, MatchReason>;
}


// Component to fly to selected center
function MapController({ center }: { center: MapCenter | null }) {
    const map = useMap();

    useEffect(() => {
        if (center && center.lat && center.lon) {
            map.flyTo([center.lat, center.lon], 14, {
                duration: 1
            });
        }
    }, [center, map]);

    return null;
}

// Component to handle map clicks
function MapClickHandler({ onClick }: { onClick: () => void }) {
    useMapEvents({
        click: () => {
            onClick();
        },
    });
    return null;
}

export const MapView: React.FC<MapViewProps> = ({
    centers,
    selectedCenter,
    onCenterClick,
    highlightedCenters = [],
    onMapClick,
    isSearchActive = false,
    matchReasons = {}
}) => {

    const defaultCenter: [number, number] = [55.7558, 37.6173]; // Moscow center
    const defaultZoom = 11;

    // Create custom marker icons based on Funding
    const createMarkerIcon = (center: MapCenter, isHighlighted: boolean) => {
        const funding = center.total_funding || 0; // in thousands
        let color = '#3b82f6'; // blue (Small < 100M)

        if (isSearchActive || isHighlighted) {
            color = '#8b5cf6'; // purple for searched/highlighted
        } else if (funding > 1000000) { // > 1 Billion (1,000,000 thousands)
            color = '#ef4444'; // red for large
        } else if (funding > 100000) { // > 100 Million (100,000 thousands)
            color = '#f59e0b'; // orange for medium
        }

        // Logarithmic size based on funding (clamped)
        const sizeValue = funding > 0 ? Math.log10(funding) : 0;
        const size = isHighlighted || isSearchActive ? 16 : Math.max(8, Math.min(6 + sizeValue * 1.5, 20));

        return L.divIcon({
            className: 'custom-marker',
            html: `<div style="
        width: ${size}px;
        height: ${size}px;
        background: ${color};
        border: 2px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        ${(isHighlighted || isSearchActive) ? 'animation: pulse 1.5s ease-in-out infinite;' : ''}
      "></div>`,
            iconSize: [size, size],
            iconAnchor: [size / 2, size / 2],
        });
    };

    return (
        <div className="map-container">
            <MapContainer
                center={defaultCenter}
                zoom={defaultZoom}
                style={{ height: '100%', width: '100%' }}
                zoomControl={true}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {onMapClick && <MapClickHandler onClick={onMapClick} />}

                {centers.map((center) => {
                    if (!center.lat || !center.lon) return null;

                    const isHighlighted = highlightedCenters.includes(center.ogrn);
                    const markerIcon = createMarkerIcon(center, isHighlighted);

                    // We use a custom event handler that stops propagation to prevent map click
                    const handleMarkerClick = (e: any) => {
                        L.DomEvent.stopPropagation(e);
                        onCenterClick(center);
                    };

                    return (
                        <Marker
                            key={center.ogrn}
                            position={[center.lat, center.lon]}
                            icon={markerIcon}
                            eventHandlers={{
                                click: handleMarkerClick,
                            }}
                        >
                            <Popup>
                                <div className="marker-popup">
                                    <h3>{center.short_name || center.name}</h3>
                                    {center.short_name && center.short_name !== center.name && (
                                        <p className="popup-subtitle" style={{ fontSize: '0.8rem', color: '#666', margin: '0 0 0.5rem 0' }}>
                                            {center.name}
                                        </p>
                                    )}
                                    {matchReasons[center.ogrn] && (matchReasons[center.ogrn].type === 'project' || matchReasons[center.ogrn].type === 'rid') && (
                                        <div className="match-count-badge" style={{
                                            background: 'rgba(139, 92, 246, 0.1)',
                                            color: '#8b5cf6',
                                            padding: '4px 8px',
                                            borderRadius: '4px',
                                            fontSize: '0.8rem',
                                            fontWeight: 600,
                                            marginBottom: '8px',
                                            border: '1px solid rgba(139, 92, 246, 0.2)'
                                        }}>
                                            {matchReasons[center.ogrn].type === 'project' ? '🚀 ' : '📜 '}
                                            Найдено {matchReasons[center.ogrn].matchCount} релевантных {matchReasons[center.ogrn].type === 'project' ? 'проектов' : 'РИД'}

                                        </div>
                                    )}

                                    <div className="popup-stats">
                                        <div className="stat">
                                            <span className="stat-value">{center.rid_count}</span>
                                            <span className="stat-label">РИД</span>
                                        </div>
                                        <div className="stat">
                                            <span className="stat-value">{center.project_count}</span>
                                            <span className="stat-label">Проектов</span>
                                        </div>
                                    </div>
                                    <div className="popup-keywords">
                                        {center.top_keywords.slice(0, 3).map((kw, i) => (
                                            <span key={i} className="badge">{kw.keyword}</span>
                                        ))}
                                    </div>
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}

                <MapController center={selectedCenter} />
            </MapContainer>
        </div>
    );
};
