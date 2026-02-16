import { useState, useEffect, useMemo } from 'react';
import { Header } from './components/Header';
import { MapView } from './components/MapView';
import { Sidebar } from './components/Sidebar';
import { Legend } from './components/Legend';
import { SummaryInfo } from './components/SummaryInfo';
import type { MapData, MapCenter, FundingTier } from './types';
import './index.css';

function App() {
  const [mapData, setMapData] = useState<MapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [fundingFilter, setFundingFilter] = useState<FundingTier>('all');
  const [selectedCenter, setSelectedCenter] = useState<MapCenter | null>(null);
  const [highlightedCenters, setHighlightedCenters] = useState<string[]>([]);

  // Load map data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetch('/data/map_index.json');
        const data = await response.json();
        setMapData(data);
      } catch (error) {
        console.error('Failed to load map data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Combined filtering logic
  const filteredCenters = useMemo(() => {
    if (!mapData) return [];

    let results = mapData.centers;

    // Filter by Funding Tier
    if (fundingFilter !== 'all') {
      results = results.filter(center => {
        const funding = center.total_funding || 0;
        if (fundingFilter === 'small') return funding <= 100000;
        if (fundingFilter === 'medium') return funding > 100000 && funding <= 1000000;
        if (fundingFilter === 'large') return funding > 1000000;
        return true;
      });
    }

    // Filter by Search Query
    const query = searchQuery.toLowerCase().trim();
    if (!query) return results;

    const tokens = query.split(/\s+/).filter(t => t.length > 1); // Ignore single chars
    if (tokens.length === 0) return results;

    const searched = results.map(center => {
      let score = 0;
      const name = (center.name || '').toLowerCase();
      const shortName = (center.short_name || '').toLowerCase();
      const okogu = (center.okogu || '').toLowerCase();

      // precise match bonus
      if (shortName === query) score += 100;
      if (name === query) score += 100;

      // contains query bonus
      if (shortName.includes(query)) score += 50;
      if (name.includes(query)) score += 40;

      // Token matching
      let tokenMatches = 0;
      for (const token of tokens) {
        let tokenScore = 0;

        // Match against names
        if (shortName.includes(token)) tokenScore += 20;
        else if (name.includes(token)) tokenScore += 15;

        // Match against OKOGU (agency)
        if (okogu.includes(token)) tokenScore += 10;

        // Match against Keywords
        const keywordMatch = (center.top_keywords || []).find(k => k.keyword.toLowerCase().includes(token));
        if (keywordMatch) {
          tokenScore += 5 + (keywordMatch.count * 0.1);
        }

        // Match against Scientific Domains
        if ((center.scientific_domains || []).some(d => d.name.toLowerCase().includes(token))) {
          tokenScore += 5;
        }

        if (tokenScore > 0) {
          score += tokenScore;
          tokenMatches++;
        }
      }

      // Boost for multi-token matches (semantic overlap)
      if (tokenMatches > 1) score += tokenMatches * 10;

      return { center, score };
    });

    // Filter by score threshold and sort
    return searched
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 50)
      .map(item => item.center);
  }, [mapData, fundingFilter, searchQuery]);

  // Handle highlighted centers from search
  useEffect(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query || filteredCenters.length === 0) {
      setHighlightedCenters([]);
      return;
    }
    setHighlightedCenters(filteredCenters.slice(0, 10).map(c => c.ogrn));
  }, [searchQuery, filteredCenters]);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        <div className="spinner" style={{ width: '40px', height: '40px' }} />
        <p style={{ color: 'var(--text-secondary)' }}>Загрузка карты...</p>
      </div>
    );
  }

  if (!mapData) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh'
      }}>
        <p style={{ color: 'var(--text-secondary)' }}>Ошибка загрузки данных</p>
      </div>
    );
  }

  return (
    <>
      <Header
        onSearch={setSearchQuery}
        searchQuery={searchQuery}
        aiSummary={null}
      />
      <MapView
        centers={filteredCenters}
        selectedCenter={selectedCenter}
        onCenterClick={setSelectedCenter}
        highlightedCenters={highlightedCenters}
        onMapClick={() => setSelectedCenter(null)}
      />
      <div className="map-controls-left">
        <SummaryInfo centers={filteredCenters} />
        <Legend
          activeFilter={fundingFilter}
          onFilterChange={setFundingFilter}
        />
      </div>
      <Sidebar
        center={selectedCenter}
        onClose={() => setSelectedCenter(null)}
      />
    </>
  );
}

export default App;
