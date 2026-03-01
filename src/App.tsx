/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Layers, 
  List, 
  MapPin, 
  Plus, 
  Trash2, 
  Download, 
  CheckSquare, 
  Square,
  Play,
  Loader2,
  ExternalLink,
  Map as MapIcon
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { motion, AnimatePresence } from 'motion/react';

// Fix Leaflet marker icons
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// Types
interface GeoResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

interface SavedLocation {
  id: string;
  query: string;
  displayName: string;
  lat: string;
  lon: string;
  timestamp: string;
}

// Helper to format coordinates
const formatCoord = (lat: string, lon: string) => {
  const lVal = parseFloat(lat);
  const rVal = parseFloat(lon);
  const latDir = lVal >= 0 ? 'N' : 'S';
  const lonDir = rVal >= 0 ? 'E' : 'W';
  return `${Math.abs(lVal).toFixed(4)}° ${latDir} / ${Math.abs(rVal).toFixed(4)}° ${lonDir}`;
};

// Stable ID generator (GitHub Pages / older browsers safe)
const makeId = () => {
  // randomUUID is not available in some older browsers / webviews
  // so we provide a safe fallback.
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    // @ts-expect-error - randomUUID may be missing in some TS DOM libs
    return crypto.randomUUID();
  }
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
};

// Component to update map view
function ChangeView({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 15);
  }, [center, map]);
  return null;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'single' | 'batch' | 'list'>('single');
  
  // Single Search State
  const [singleQuery, setSingleQuery] = useState('');
  const [singleResults, setSingleResults] = useState<GeoResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<GeoResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Batch Search State
  const [batchInput, setBatchInput] = useState('');
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
  const [isBatching, setIsBatching] = useState(false);

  // Saved List State
  const [savedLocations, setSavedLocations] = useState<SavedLocation[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Load saved locations from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('geofinder_saved');
    if (saved) {
      try {
        setSavedLocations(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse saved locations", e);
      }
    }
  }, []);

  // Save to localStorage whenever savedLocations changes
  useEffect(() => {
    localStorage.setItem('geofinder_saved', JSON.stringify(savedLocations));
  }, [savedLocations]);

  // Geocoding function
  const geocode = async (query: string): Promise<GeoResult[]> => {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`;
    const response = await fetch(url, {
      headers: {
        'Accept-Language': 'ko,en'
      }
    });
    if (!response.ok) throw new Error('Geocoding failed');
    return await response.json();
  };

  // Single Search Handler
  const handleSingleSearch = async () => {
    if (!singleQuery.trim()) return;
    setIsSearching(true);
    try {
      const results = await geocode(singleQuery);
      setSingleResults(results);
      if (results.length > 0) {
        setSelectedResult(results[0]);
      }
    } catch (error) {
      alert('검색 중 오류가 발생했습니다.');
    } finally {
      setIsSearching(false);
    }
  };

  // Add to List Handler
  const addToList = (result: GeoResult, query: string) => {
    const newLocation: SavedLocation = {
      id: makeId(),
      query,
      displayName: result.display_name,
      lat: result.lat,
      lon: result.lon,
      timestamp: new Date().toLocaleString('ko-KR')
    };
    setSavedLocations(prev => [newLocation, ...prev]);
    alert('저장 목록에 추가되었습니다.');
  };

  // Batch Search Handler
  const handleBatchSearch = async () => {
    const lines = batchInput.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0) return;

    setIsBatching(true);
    setBatchProgress({ current: 0, total: lines.length });
    
    const newSaved: SavedLocation[] = [];

    for (let i = 0; i < lines.length; i++) {
      setBatchProgress({ current: i + 1, total: lines.length });
      try {
        const results = await geocode(lines[i]);
        if (results.length > 0) {
          const r = results[0];
          newSaved.push({
            id: makeId(),
            query: lines[i],
            displayName: r.display_name,
            lat: r.lat,
            lon: r.lon,
            timestamp: new Date().toLocaleString('ko-KR')
          });
        }
        // Nominatim requires 1 second delay between requests
        if (i < lines.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1100));
        }
      } catch (error) {
        console.error(`Failed to geocode: ${lines[i]}`, error);
      }
    }

    setSavedLocations(prev => [...newSaved, ...prev]);
    setIsBatching(false);
    setBatchInput('');
    alert(`${newSaved.length}개의 항목이 저장되었습니다.`);
    setActiveTab('list');
  };

  // List Management
  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const selectAll = () => {
    setSelectedIds(new Set(savedLocations.map(l => l.id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const deleteSelected = () => {
    if (selectedIds.size === 0) return;
    if (confirm('선택한 항목을 삭제하시겠습니까?')) {
      setSavedLocations(prev => prev.filter(l => !selectedIds.has(l.id)));
      setSelectedIds(new Set());
    }
  };

  const deleteAll = () => {
    if (savedLocations.length === 0) return;
    if (confirm('전체 목록을 삭제하시겠습니까?')) {
      setSavedLocations([]);
      setSelectedIds(new Set());
    }
  };

  // CSV Export
  const exportToCSV = (locations: SavedLocation[], filename: string) => {
    const headers = ['명칭(검색어)', '전체 주소', '위도', '경도', '좌표 형식', '저장 시간'];
    const rows = locations.map(l => [
      l.query,
      `"${l.displayName.replace(/"/g, '""')}"`,
      l.lat,
      l.lon,
      formatCoord(l.lat, l.lon),
      l.timestamp
    ]);
    
    const csvContent = "\uFEFF" + [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-2 rounded-lg">
              <MapIcon className="text-white w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">GeoFinder</h1>
          </div>
          <div className="text-sm text-slate-500 font-medium">
            관광지 좌표 검색 및 관리 시스템
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-6">
        {/* Tabs */}
        <div className="flex gap-1 bg-slate-200/50 p-1 rounded-xl mb-6 w-fit">
          <button
            onClick={() => setActiveTab('single')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'single' 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Search size={18} />
            단일 검색
          </button>
          <button
            onClick={() => setActiveTab('batch')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'batch' 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers size={18} />
            일괄 검색
          </button>
          <button
            onClick={() => setActiveTab('list')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all relative ${
              activeTab === 'list' 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <List size={18} />
            저장 목록
            {savedLocations.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full">
                {savedLocations.length}
              </span>
            )}
          </button>
        </div>

        {/* Tab Panels */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[600px]">
          <AnimatePresence mode="wait">
            {activeTab === 'single' && (
              <motion.div
                key="single"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-6 h-full flex flex-col gap-6"
              >
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                      type="text"
                      value={singleQuery}
                      onChange={(e) => setSingleQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSingleSearch()}
                      placeholder="관광지나 유명 구조물 명칭을 입력하세요 (예: 경복궁, 에펠탑)"
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                  </div>
                  <button
                    onClick={handleSingleSearch}
                    disabled={isSearching}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-3 rounded-xl font-medium flex items-center gap-2 transition-colors"
                  >
                    {isSearching ? <Loader2 className="animate-spin" size={20} /> : <Search size={20} />}
                    검색
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1">
                  {/* Results List */}
                  <div className="flex flex-col gap-4">
                    <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">검색 결과</h3>
                    <div className="flex-1 overflow-y-auto max-h-[400px] space-y-2 pr-2 custom-scrollbar">
                      {singleResults.length === 0 && !isSearching && (
                        <div className="text-center py-12 text-slate-400 border-2 border-dashed border-slate-100 rounded-2xl">
                          검색 결과가 여기에 표시됩니다.
                        </div>
                      )}
                      {singleResults.map((result) => (
                        <div
                          key={result.place_id}
                          onClick={() => setSelectedResult(result)}
                          className={`p-4 rounded-xl border cursor-pointer transition-all ${
                            selectedResult?.place_id === result.place_id
                              ? 'border-blue-500 bg-blue-50 shadow-sm'
                              : 'border-slate-100 hover:border-slate-300 bg-slate-50/50'
                          }`}
                        >
                          <div className="font-medium text-slate-900 line-clamp-2 mb-1">{result.display_name}</div>
                          <div className="text-xs font-mono text-blue-600 flex items-center gap-1">
                            <MapPin size={12} />
                            {formatCoord(result.lat, result.lon)}
                          </div>
                          {selectedResult?.place_id === result.place_id && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                addToList(result, singleQuery);
                              }}
                              className="mt-3 w-full bg-white border border-blue-200 text-blue-600 hover:bg-blue-600 hover:text-white py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all"
                            >
                              <Plus size={14} />
                              목록 추가
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Map Preview */}
                  <div className="flex flex-col gap-4">
                    <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">지도 미리보기</h3>
                    <div className="flex-1 rounded-2xl overflow-hidden border border-slate-200 relative min-h-[300px]">
                      {selectedResult ? (
                        <MapContainer
                          center={[parseFloat(selectedResult.lat), parseFloat(selectedResult.lon)]}
                          zoom={15}
                          style={{ height: '100%', width: '100%' }}
                        >
                          <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                          />
                          <Marker position={[parseFloat(selectedResult.lat), parseFloat(selectedResult.lon)]}>
                            <Popup>
                              <div className="p-1">
                                <div className="font-bold text-sm mb-1">{selectedResult.display_name.split(',')[0]}</div>
                                <div className="text-xs text-slate-500">{formatCoord(selectedResult.lat, selectedResult.lon)}</div>
                              </div>
                            </Popup>
                          </Marker>
                          <ChangeView center={[parseFloat(selectedResult.lat), parseFloat(selectedResult.lon)]} />
                        </MapContainer>
                      ) : (
                        <div className="absolute inset-0 bg-slate-100 flex items-center justify-center text-slate-400">
                          <MapIcon size={48} className="opacity-20" />
                        </div>
                      )}
                    </div>
                    {selectedResult && (
                      <div className="bg-slate-900 text-white p-4 rounded-xl flex items-center justify-between">
                        <div>
                          <div className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mb-1">현재 선택된 좌표</div>
                          <div className="text-lg font-mono font-medium">{formatCoord(selectedResult.lat, selectedResult.lon)}</div>
                        </div>
                        <div className="flex gap-2">
                          <a 
                            href={`https://www.google.com/maps?q=${selectedResult.lat},${selectedResult.lon}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                            title="Google Maps에서 보기"
                          >
                            <ExternalLink size={20} />
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'batch' && (
              <motion.div
                key="batch"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-6 h-full flex flex-col gap-6"
              >
                <div className="flex flex-col gap-2">
                  <h3 className="text-lg font-bold text-slate-900">일괄 검색</h3>
                  <p className="text-sm text-slate-500">여러 장소의 명칭을 한 줄에 하나씩 입력하세요. 검색된 결과는 자동으로 저장 목록에 추가됩니다.</p>
                </div>

                <div className="flex-1 flex flex-col gap-4">
                  <textarea
                    value={batchInput}
                    onChange={(e) => setBatchInput(e.target.value)}
                    disabled={isBatching}
                    placeholder="경복궁&#10;에펠탑&#10;자유의 여신상&#10;도쿄 타워"
                    className="flex-1 p-4 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono text-sm resize-none custom-scrollbar"
                  />
                  
                  {isBatching && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm font-medium">
                        <span className="text-blue-600">진행 중...</span>
                        <span className="text-slate-500">{batchProgress.current} / {batchProgress.total}</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <motion.div 
                          className="h-full bg-blue-600"
                          initial={{ width: 0 }}
                          animate={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-slate-400 text-center italic">Nominatim API 정책에 따라 요청 간 1초의 대기 시간이 발생합니다.</p>
                    </div>
                  )}

                  <button
                    onClick={handleBatchSearch}
                    disabled={isBatching || !batchInput.trim()}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/20"
                  >
                    {isBatching ? <Loader2 className="animate-spin" size={20} /> : <Play size={20} />}
                    일괄 검색 시작
                  </button>
                </div>
              </motion.div>
            )}

            {activeTab === 'list' && (
              <motion.div
                key="list"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-6 h-full flex flex-col gap-6"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex flex-col gap-1">
                    <h3 className="text-lg font-bold text-slate-900">저장 목록</h3>
                    <p className="text-sm text-slate-500">저장된 장소 정보를 관리하고 CSV로 내보낼 수 있습니다.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => exportToCSV(savedLocations, 'geofinder_all.csv')}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white rounded-lg text-sm font-bold transition-all border border-emerald-100"
                    >
                      <Download size={16} />
                      전체 CSV
                    </button>
                    <button
                      onClick={() => {
                        const selected = savedLocations.filter(l => selectedIds.has(l.id));
                        if (selected.length === 0) return alert('선택된 항목이 없습니다.');
                        exportToCSV(selected, 'geofinder_selected.csv');
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white rounded-lg text-sm font-bold transition-all border border-blue-100"
                    >
                      <CheckSquare size={16} />
                      선택 CSV
                    </button>
                    <button
                      onClick={deleteAll}
                      className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 hover:bg-red-600 hover:text-white rounded-lg text-sm font-bold transition-all border border-red-100"
                    >
                      <Trash2 size={16} />
                      전체 삭제
                    </button>
                  </div>
                </div>

                {/* Toolbar */}
                <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={selectAll}
                        className="text-xs font-bold text-slate-600 hover:text-blue-600"
                      >
                        전체 선택
                      </button>
                      <span className="text-slate-300">|</span>
                      <button
                        onClick={deselectAll}
                        className="text-xs font-bold text-slate-600 hover:text-blue-600"
                      >
                        전체 해제
                      </button>
                    </div>
                    <div className="text-xs text-slate-400">
                      선택됨: <span className="text-blue-600 font-bold">{selectedIds.size}</span> / {savedLocations.length}
                    </div>
                  </div>
                  <button
                    onClick={deleteSelected}
                    disabled={selectedIds.size === 0}
                    className="flex items-center gap-1 text-xs font-bold text-red-600 disabled:text-slate-300 hover:underline"
                  >
                    <Trash2 size={14} />
                    선택 삭제
                  </button>
                </div>

                {/* Table */}
                <div className="flex-1 overflow-x-auto border border-slate-200 rounded-2xl">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="p-4 w-10">
                          <button 
                            onClick={() => selectedIds.size === savedLocations.length ? deselectAll() : selectAll()}
                            className="text-slate-400 hover:text-blue-600"
                          >
                            {selectedIds.size === savedLocations.length && savedLocations.length > 0 ? <CheckSquare size={20} /> : <Square size={20} />}
                          </button>
                        </th>
                        <th className="p-4 font-bold text-slate-600">검색어</th>
                        <th className="p-4 font-bold text-slate-600">표시 명칭</th>
                        <th className="p-4 font-bold text-slate-600">좌표 (위도/경도)</th>
                        <th className="p-4 font-bold text-slate-600">저장 시간</th>
                        <th className="p-4 font-bold text-slate-600 w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {savedLocations.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-12 text-center text-slate-400 italic">
                            저장된 장소가 없습니다.
                          </td>
                        </tr>
                      ) : (
                        savedLocations.map((loc) => (
                          <tr 
                            key={loc.id} 
                            className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${selectedIds.has(loc.id) ? 'bg-blue-50/30' : ''}`}
                          >
                            <td className="p-4">
                              <button 
                                onClick={() => toggleSelect(loc.id)}
                                className={selectedIds.has(loc.id) ? 'text-blue-600' : 'text-slate-300'}
                              >
                                {selectedIds.has(loc.id) ? <CheckSquare size={20} /> : <Square size={20} />}
                              </button>
                            </td>
                            <td className="p-4 font-medium text-slate-900">{loc.query}</td>
                            <td className="p-4 text-slate-600 max-w-xs truncate" title={loc.displayName}>{loc.displayName}</td>
                            <td className="p-4 font-mono text-blue-600 whitespace-nowrap">{formatCoord(loc.lat, loc.lon)}</td>
                            <td className="p-4 text-slate-400 text-xs">{loc.timestamp}</td>
                            <td className="p-4">
                              <button
                                onClick={() => setSavedLocations(prev => prev.filter(l => l.id !== loc.id))}
                                className="text-slate-300 hover:text-red-500 transition-colors"
                              >
                                <Trash2 size={18} />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4 text-slate-400 text-xs">
          <div>&copy; 2024 GeoFinder. All rights reserved.</div>
          <div className="flex gap-4">
            <span>Data by OpenStreetMap (Nominatim)</span>
            <span>Built with React & Tailwind</span>
          </div>
        </div>
      </footer>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
      `}</style>
    </div>
  );
}
