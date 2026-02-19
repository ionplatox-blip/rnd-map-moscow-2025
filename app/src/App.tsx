import { useState, useEffect, useMemo } from 'react';
import { Header } from './components/Header';
import { MapView } from './components/MapView';
import { Sidebar } from './components/Sidebar';
import { Legend } from './components/Legend';
import { SummaryInfo } from './components/SummaryInfo';

import type { MapData, MapCenter, FundingTier, SearchScope, MatchReason, SearchResult } from './types';
import './index.css';



interface SearchResponse {
  results: SearchResult[];
  rewritten_query?: string;
}

function App() {
  const [mapData, setMapData] = useState<MapData | null>(null);
  const [searchIndex, setSearchIndex] = useState<Record<string, { projects: string[], rids: string[] }> | null>(null);
  const [loading, setLoading] = useState(true);


  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchScope, setSearchScope] = useState<SearchScope>(null);
  const [matchReasons, setMatchReasons] = useState<Record<string, MatchReason>>({});


  // Map State
  const [fundingFilter, setFundingFilter] = useState<FundingTier>('all');
  const [selectedCenter, setSelectedCenter] = useState<MapCenter | null>(null);
  const [highlightedCenters, setHighlightedCenters] = useState<string[]>([]);

  // AI Search State
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResults, setAiResults] = useState<SearchResult[] | null>(null);
  const [sidebarMode, setSidebarMode] = useState<'details' | 'ai-results'>('details');
  const [highlightProjectId, setHighlightProjectId] = useState<string | null>(null);

  // Load map data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const [mapRes, indexRes] = await Promise.all([
          fetch('/data/map_index.json'),
          fetch('/data/search_index.json')
        ]);
        const data = await mapRes.json();
        const indexData = await indexRes.json();
        setMapData(data);
        setSearchIndex(indexData);
      } catch (error) {
        console.error('Failed to load map data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);


  // AI Search Logic
  const handleAISearch = async () => {
    if (!searchQuery.trim()) return;

    setAiLoading(true);
    setAiResults(null);
    setSidebarMode('ai-results');
    // Clear selected center to show results
    setSelectedCenter(null);

    // Determine API URL:
    // 1. Use VITE_API_URL if set (build-time env var)
    // 2. On Render, use the known backend URL
    // 3. Fallback to localhost for local dev
    let API_URL = import.meta.env.VITE_API_URL || '';

    if (!API_URL) {
      const hostname = window.location.hostname;
      if (hostname.includes('onrender.com')) {
        // Use the known backend service name on Render
        API_URL = 'https://rnd-map-backend.onrender.com';
      } else {
        API_URL = 'http://localhost:8000';
      }
    }

    if (API_URL && !API_URL.startsWith('http')) {
      API_URL = `https://${API_URL}`;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout (Render cold start can be slow)

      const response = await fetch(`${API_URL}/ai-search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: searchQuery,
          top_k_results: 10,
          use_rewrite: true,
          use_rerank: true
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) throw new Error(`Server error: ${response.status}`);

      const text = await response.text();
      if (!text) throw new Error('Empty response from server');

      const data: SearchResponse = JSON.parse(text);
      setAiResults(data.results);
    } catch (error) {
      console.error('AI Search Error:', error);
      // Show empty results with error indicator so user sees feedback
      setAiResults([]);
    } finally {
      setAiLoading(false);
    }
  };


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

    const tokens = query.split(/\s+/).filter(t => t.length > 1);
    const newMatchReasons: Record<string, MatchReason> = {};

    const searched = results.map(center => {
      let score = 0;
      const name = (center.name || '').toLowerCase();
      const shortName = (center.short_name || '').toLowerCase();
      const okogu = (center.okogu || '').toLowerCase();

      let bestReason: MatchReason | null = null;

      // Define scopes based on filter
      const checkNames = searchScope === null || searchScope === 'center';
      const checkProjects = searchScope === null || searchScope === 'project';
      const checkRids = searchScope === null || searchScope === 'rid';

      if (checkNames) {
        // Precise match
        if (shortName === query || name === query) {
          score += 100;
          bestReason = { type: 'name', detail: 'Соответствие по названию' };
        } else if (shortName.includes(query) || name.includes(query)) {
          score += 50;
          bestReason = { type: 'name', detail: 'Соответствие по названию' };
        }
      }

      // Token match
      let tokenMatches = 0;
      for (const token of tokens) {
        let tokenScore = 0;

        if (checkNames) {
          if (shortName.includes(token)) tokenScore += 20;
          else if (name.includes(token)) tokenScore += 15;
          if (okogu.includes(token)) tokenScore += 10;

          if (tokenScore > 0 && !bestReason) {
            bestReason = { type: 'name', detail: 'Соответствие по названию' };
          }
        }

        if (checkProjects || checkRids) {
          // Accurate keyword matching using searchIndex
          const indexEntry = searchIndex ? searchIndex[center.ogrn] : null;

          if (indexEntry) {
            let pCount = 0;
            let rCount = 0;

            if (checkProjects) {
              pCount = indexEntry.projects.filter(pText => tokens.every(t => pText.toLowerCase().includes(t))).length;
            }
            if (checkRids) {
              rCount = indexEntry.rids.filter(rText => tokens.every(t => rText.toLowerCase().includes(t))).length;
            }

            if (pCount > 0 || rCount > 0) {
              tokenScore += 30; // High score for accurate project/RID match

              if (!bestReason || (bestReason.type !== 'name' && bestReason.type !== 'project' && bestReason.type !== 'rid')) {
                if (searchScope === 'project' && pCount > 0) {
                  bestReason = {
                    type: 'project',
                    detail: 'Найдены релевантные проекты',
                    matchCount: pCount
                  };
                } else if (searchScope === 'rid' && rCount > 0) {
                  bestReason = {
                    type: 'rid',
                    detail: 'Найдены релевантные РИД',
                    matchCount: rCount
                  };
                } else if (searchScope === null) {
                  // Fallback if no scope selected but we found something
                  if (pCount > 0) bestReason = { type: 'project', detail: 'Найдено в проектах', matchCount: pCount };
                  else if (rCount > 0) bestReason = { type: 'rid', detail: 'Найдено в РИД', matchCount: rCount };
                }
              }
            }
          }

          // Fallback to center keywords if searchIndex not loaded yet or no project matches
          if (!bestReason || (bestReason.type !== 'name' && bestReason.type !== 'project' && bestReason.type !== 'rid')) {
            const keywordMatch = (center.top_keywords || []).find(k => k.keyword.toLowerCase().includes(tokens[0]));
            if (keywordMatch) {
              tokenScore += 5 + (keywordMatch.count * 0.1);
              if (!bestReason) {
                bestReason = { type: 'keyword', detail: `Ключевое слово: ${keywordMatch.keyword}` };
              }
            }
          }

          // Domains
          const domainMatch = (center.scientific_domains || []).find(d => d.name.toLowerCase().includes(tokens[0]));
          if (domainMatch) {
            tokenScore += 5;
            if (!bestReason || (bestReason.type !== 'name' && bestReason.type !== 'project' && bestReason.type !== 'rid' && bestReason.type !== 'keyword')) {
              bestReason = { type: 'domain', detail: `Область: ${domainMatch.name}` };
            }
          }
        }


        if (tokenScore > 0) {
          score += tokenScore;
          tokenMatches++;
        }
      }


      if (tokenMatches > 1) score += tokenMatches * 10;

      if (score > 0 && bestReason) {
        newMatchReasons[center.ogrn] = bestReason;
      }

      return { center, score };
    });

    // Update match reasons in a delayed way or just expose them
    // WARNING: Setting state inside useMemo is generally discouraged, 
    // but here it's derived from the same inputs and useful for the sidebar.
    // I'll keep it for now but maybe move to a separate memo + effect later if issues arise.

    return {
      centers: searched
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 50)
        .map(item => item.center),
      reasons: newMatchReasons
    };
  }, [mapData, fundingFilter, searchQuery, searchScope]);

  // Sync reasons to state
  useEffect(() => {
    if (typeof filteredCenters === 'object' && 'reasons' in filteredCenters) {
      setMatchReasons(filteredCenters.reasons);
    }
  }, [filteredCenters]);

  const displayCenters = useMemo(() => {
    if (!Array.isArray(filteredCenters)) {
      return filteredCenters.centers;
    }
    return filteredCenters;
  }, [filteredCenters]);


  // Handle highlighted centers
  useEffect(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query || displayCenters.length === 0) {
      setHighlightedCenters([]);
      return;
    }
    setHighlightedCenters(displayCenters.slice(0, 10).map(c => c.ogrn));
  }, [searchQuery, displayCenters]);


  // Handle center selection from map or list
  const handleMapSelection = (center: MapCenter | null) => {
    setSelectedCenter(center);
    if (center) {
      setSidebarMode('details');
    }
    // Clear highlight if selecting a new center manually
    if (!aiResults) {
      setHighlightProjectId(null);
    }
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: '1rem'
      }}>
        <div className="spinner" style={{ width: '40px', height: '40px' }} />
        <p style={{ color: 'var(--text-secondary)' }}>Загрузка карты...</p>
      </div>
    );
  }

  if (!mapData) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'var(--text-secondary)' }}>Ошибка загрузки данных</div>;

  return (
    <>
      <Header
        onSearch={setSearchQuery}
        searchQuery={searchQuery}
        onScopeChange={setSearchScope}
        activeScope={searchScope}
        aiSummary={null}
        onAISearchClick={handleAISearch}
      />

      <MapView
        centers={displayCenters}
        selectedCenter={selectedCenter}
        onCenterClick={handleMapSelection}
        highlightedCenters={highlightedCenters}
        onMapClick={() => setSelectedCenter(null)}
        isSearchActive={!!searchQuery}
        matchReasons={matchReasons}
      />


      <div className="map-controls-left">
        <SummaryInfo centers={displayCenters} />
        <Legend
          activeFilter={fundingFilter}
          onFilterChange={setFundingFilter}
        />
      </div>

      <Sidebar
        center={selectedCenter}
        onClose={() => {
          setSelectedCenter(null);
          setSidebarMode('details');
          setAiResults(null);
          setHighlightProjectId(null);
        }}
        mode={sidebarMode}
        aiResults={aiResults}
        aiLoading={aiLoading}
        onCenterClick={(center) => {
          handleMapSelection(center);
        }}
        onSetMode={setSidebarMode}
        highlightProjectId={highlightProjectId}
        onProjectClick={setHighlightProjectId}
        matchReason={selectedCenter ? matchReasons[selectedCenter.ogrn] : undefined}
        searchScope={searchScope}
        searchQuery={searchQuery}
      />

    </>
  );

}

export default App;

