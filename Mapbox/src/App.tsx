import { useRef, useState, useEffect } from 'react';
import type { ChangeEventHandler } from 'react';
import type { FeatureCollection } from 'geojson';
import styled from 'styled-components';
import MapboxMap, { type MapboxMapHandle } from './components/MapboxMap';
import GlobalStyle from './GlobalStyle';

// Layout base
const AppShell = styled.div`
  width: 100vw;
  height: 100vh;
  background-color: #f1f5f9;
  position: relative;
`;

// Toolbar vertical no topo direito
const Toolbar = styled.div`
  position: absolute;
  top: 24px;
  right: 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  z-index: 25;
  align-items: flex-end; /* todos os itens alinhados pela direita */
`;

const ToolGroup = styled.div`
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(15,23,42,0.15);
  border: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  overflow: hidden;
`;

const IconButton = styled.button`
  appearance: none;
  background: #fff;
  border: none;
  border-left: 1px solid #e2e8f0;
  width: 36px;
  height: 36px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  line-height: 1;
  &:first-child { border-left: none; }
  &:hover { background: #f8fafc; }
`;

const InfoChip = styled.div`
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(15,23,42,0.12);
  padding: 6px 10px;
  font-size: 12px;
  color: #475569;
  max-width: 60vw;
  /* posiciona no canto inferior direito do mapa (1px da borda direita) */
  position: absolute;
  right: 3px;
  bottom: 24px;
  z-index: 22;
`;

const MapWrapper = styled.section`
  position: relative;
  height: 100%;
  width: 100%;
  min-height: 0;
  min-width: 0;
`;

const MapLoading = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(160deg, rgba(15, 23, 42, 0.85), rgba(30, 64, 175, 0.7));
  color: #e2e8f0;
  font-weight: 600;
  letter-spacing: 0.04em;
  z-index: 10;
`;

const TokenWarning = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  height: 100vh;
  padding: 2rem;
  text-align: center;
  background: linear-gradient(160deg, #1d4ed8 0%, #0ea5e9 100%);
  color: #ffffff;
  & h1 { font-size: 2rem; margin: 0; }
  & a { color: #bfdbfe; text-decoration: underline; }
`;

const emptyCollection: FeatureCollection = { type: 'FeatureCollection', features: [] };

function isFeatureCollection(value: unknown): value is FeatureCollection {
  if (typeof value !== 'object' || value === null) return false;
  const maybe = value as FeatureCollection;
  return maybe.type === 'FeatureCollection' && Array.isArray(maybe.features);
}

function App() {
  const accessToken = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;
  const mapRef = useRef<MapboxMapHandle | null>(null);
  const wrapperRef = useRef<HTMLElement | null>(null);
  const [drawData, setDrawData] = useState<FeatureCollection>(emptyCollection);
  const [error, setError] = useState<string | null>(null);
  const [lastImportedFile, setLastImportedFile] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Fallback: some o overlay após 3s se algo falhar
  useEffect(() => {
    if (!mapReady && !error) {
      const t = setTimeout(() => setMapReady(true), 3000);
      return () => clearTimeout(t);
    }
  }, [mapReady, error]);

  // Sincroniza estado de fullscreen para alternar os botões
  useEffect(() => {
    const onFsChange = () => {
      const el = wrapperRef.current;
      const active = !!document.fullscreenElement && document.fullscreenElement === el;
      setIsFullscreen(active);
    };
    document.addEventListener('fullscreenchange', onFsChange);
    // estado inicial
    onFsChange();
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);
  // Atualiza estado quando os desenhos mudam
  const handleDrawChange = (collection: FeatureCollection) => {
    setDrawData(collection);
  };

  // Contador de polígonos
  const polygonCount = drawData.features.filter(
    (f) => f.geometry && (f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon')
  ).length;

  // Ações da toolbar
  const handleDrawPolygon = () => mapRef.current?.startDrawPolygon?.();
  const handleZoomIn = () => mapRef.current?.zoomIn?.();
  const handleZoomOut = () => mapRef.current?.zoomOut?.();
  // Fullscreen no wrapper para manter a toolbar visível no modo tela cheia
  const handleFullscreen = () => {
    const el = wrapperRef.current as any;
    if (!document.fullscreenElement && el && typeof el.requestFullscreen === 'function') {
      el.requestFullscreen();
    }
  };
  const handleClear = () => mapRef.current?.deleteSelected?.();

  // Estado para o seletor de cor do polígono
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [selectedColor, setSelectedColor] = useState('#ffffff');
  const [selectedOpacity, setSelectedOpacity] = useState(0.2);

  // Estado para o seletor de borda do polígono
  const [strokePickerOpen, setStrokePickerOpen] = useState(false);
  const [selectedStrokeColor, setSelectedStrokeColor] = useState('#ffffff');
  const [selectedStrokeWidth, setSelectedStrokeWidth] = useState(2);

  // Estado para adicionar texto ao polígono
  const [textInput, setTextInput] = useState('');
  const [textPickerOpen, setTextPickerOpen] = useState(false);

  const applyColorToSelected = () => {
    console.log('[UI] Aplicar cor clicado', selectedColor, selectedOpacity);
    const changeFn = mapRef.current?.changeSelectedFill;
    if (typeof changeFn !== 'function') {
      alert('Ação indisponível: a API do mapa não implementou changeSelectedFill.');
      return setColorPickerOpen(false);
    }
    try {
      changeFn(selectedColor, selectedOpacity);
      // small verification: check if any feature now has the color
      const data = mapRef.current?.getDrawData?.();
      const has = data?.features?.some((f: any) => f?.properties?.fillColor === selectedColor);
      if (!has) {
        // provavelmente não havia seleção
        alert('Nenhum polígono selecionado ou atualização não aplicada. Selecione um polígono antes de trocar a cor.');
      }
    } catch (err) {
      console.error('Erro ao aplicar cor:', err);
      alert('Erro ao aplicar cor. Veja o console para mais detalhes.');
    }
    setColorPickerOpen(false);
  };

  const applyColorToAll = () => {
    console.log('[UI] Aplicar cor a todos clicado', selectedColor, selectedOpacity);
    const applyFn = mapRef.current?.applyFillToAll;
    if (typeof applyFn !== 'function') {
      alert('Ação indisponível: a API do mapa não implementou applyFillToAll.');
      return setColorPickerOpen(false);
    }
    try {
      applyFn(selectedColor, selectedOpacity);
    } catch (err) {
      console.error('Erro ao aplicar cor a todos:', err);
      alert('Erro ao aplicar cor a todos. Veja o console para mais detalhes.');
    }
    setColorPickerOpen(false);
  };

  const applyStrokeToSelected = () => {
    console.log('[UI] Aplicar borda clicado', selectedStrokeColor, selectedStrokeWidth);
    const strokeFn = mapRef.current?.changeSelectedStroke;
    if (typeof strokeFn !== 'function') {
      alert('Ação indisponível: a API do mapa não implementou changeSelectedStroke.');
      return setStrokePickerOpen(false);
    }
    try {
      strokeFn(selectedStrokeColor, selectedStrokeWidth);
      // small verification: check if any feature now has the stroke
      const data = mapRef.current?.getDrawData?.();
      const has = data?.features?.some((f: any) => f?.properties?.strokeColor === selectedStrokeColor);
      if (!has) {
        alert('Nenhum polígono selecionado ou atualização não aplicada. Selecione um polígono antes de trocar a borda.');
      }
    } catch (err) {
      console.error('Erro ao aplicar borda:', err);
      alert('Erro ao aplicar borda. Veja o console para mais detalhes.');
    }
    setStrokePickerOpen(false);
  };

  const applyStrokeToAll = () => {
    console.log('[UI] Aplicar borda a todos clicado', selectedStrokeColor, selectedStrokeWidth);
    const applyFn = mapRef.current?.applyStrokeToAll;
    if (typeof applyFn !== 'function') {
      alert('Ação indisponível: a API do mapa não implementou applyStrokeToAll.');
      return setStrokePickerOpen(false);
    }
    try {
      applyFn(selectedStrokeColor, selectedStrokeWidth);
    } catch (err) {
      console.error('Erro ao aplicar borda a todos:', err);
      alert('Erro ao aplicar borda a todos. Veja o console para mais detalhes.');
    }
    setStrokePickerOpen(false);
  };

  const addTextToSelected = () => {
    console.log('[UI] Adicionar texto clicado', textInput);
    const textFn = mapRef.current?.addTextToSelected;
    if (typeof textFn !== 'function') {
      alert('Ação indisponível: a API do mapa não implementou addTextToSelected.');
      return setTextPickerOpen(false);
    }
    if (!textInput.trim()) {
      alert('Digite um texto para adicionar ao polígono.');
      return;
    }
    try {
      textFn(textInput.trim());
      setTextInput(''); // Limpa o input após adicionar
      const data = mapRef.current?.getDrawData?.();
      const hasText = data?.features?.some((f: any) => f?.properties?.labelText);
      if (!hasText) {
        alert('Nenhum polígono selecionado. Selecione um polígono antes de adicionar texto.');
      }
    } catch (err) {
      console.error('Erro ao adicionar texto:', err);
      alert('Erro ao adicionar texto. Veja o console para mais detalhes.');
    }
    setTextPickerOpen(false);
  };

  const removeTextFromSelected = () => {
    console.log('[UI] Remover texto clicado');
    const removeFn = mapRef.current?.removeTextFromSelected;
    if (typeof removeFn !== 'function') {
      alert('Ação indisponível: a API do mapa não implementou removeTextFromSelected.');
      return setTextPickerOpen(false);
    }
    try {
      removeFn();
    } catch (err) {
      console.error('Erro ao remover texto:', err);
      alert('Erro ao remover texto. Veja o console para mais detalhes.');
    }
    setTextPickerOpen(false);
  };

  const exportGeoJson = () => {
    const data = mapRef.current?.getDrawData?.();
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/geo+json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'desenhos.geojson';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileUpload: ChangeEventHandler<HTMLInputElement> = async (event) => {
    try {
      const file = event.target.files?.[0];
      if (!file) return;
      const text = await file.text();
      const json = JSON.parse(text);
      if (!isFeatureCollection(json)) {
        throw new Error('Arquivo não é um FeatureCollection válido');
      }
      mapRef.current?.loadGeoJson?.(json, { fitBounds: true });
      setLastImportedFile(file.name);
    } catch (uploadError) {
      console.error(uploadError);
      alert('Falha ao importar o GeoJSON. Verifique o arquivo.');
    }
  };

  if (!accessToken) {
    return (
      <>
        <GlobalStyle />
        <TokenWarning>
          <h1>Token do Mapbox não configurado</h1>
          <p>
            Defina a variável de ambiente do Vite no arquivo <code>.env</code> na raiz do projeto.
          </p>
          <p>
            Exemplo de conteúdo:
            <br />
            <code>VITE_MAPBOX_TOKEN=coloque_seu_token_aqui</code>
          </p>
        </TokenWarning>
      </>
    );
  }

  return (
    <>
      <GlobalStyle />
      <AppShell>
  <MapWrapper ref={wrapperRef as any}>
          <MapboxMap
            ref={mapRef}
            accessToken={accessToken}
            initialCenter={[-56.93025371958118, -14.886187924998506]}
            initialZoom={17}
            onDrawChange={handleDrawChange}
            onMapLoad={() => { setMapReady(true); setError(null); }}
            onMapError={() => { setMapReady(false); setError('Não foi possível carregar o mapa. Verifique seu token ou conexão com a internet.'); }}
          />
          {!mapReady && !error && (<MapLoading>Carregando mapa...</MapLoading>)}

          {/* Toolbar com layout semelhante à imagem */}
          <Toolbar>
            <ToolGroup>
              <IconButton aria-label="Mais zoom" onClick={handleZoomIn} title="Mais zoom">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
                  <rect x="3" y="3" width="18" height="18" rx="4"/>
                  <path d="M12 8v8M8 12h8"/>
                </svg>
              </IconButton>
              <IconButton aria-label="Menos zoom" onClick={handleZoomOut} title="Menos zoom">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
                  <rect x="3" y="3" width="18" height="18" rx="4"/>
                  <path d="M8 12h8"/>
                </svg>
              </IconButton>
            </ToolGroup>
            <ToolGroup>
              {!isFullscreen && (
                <IconButton aria-label="Tela cheia" onClick={handleFullscreen} title="Entrar em tela cheia">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
                    <path d="M4 9V4h5"/>
                    <path d="M20 9V4h-5"/>
                    <path d="M4 15v5h5"/>
                    <path d="M20 15v5h-5"/>
                  </svg>
                </IconButton>
              )}
              {isFullscreen && (
                <IconButton aria-label="Sair da tela cheia" onClick={() => (document as any).exitFullscreen?.()} title="Sair da tela cheia">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
                    <path d="M9 4H4v5"/>
                    <path d="M15 4h5v5"/>
                    <path d="M9 20H4v-5"/>
                    <path d="M20 20h-5v-5"/>
                  </svg>
                </IconButton>
              )}
            </ToolGroup>
            <ToolGroup>
              <IconButton aria-label="Desenhar polígono" onClick={handleDrawPolygon} title="Desenhar polígono">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
                  <polygon points="7 3 17 3 21 9 17 21 7 21 3 9"/>
                  <circle cx="7" cy="3" r="1.5" fill="currentColor" stroke="none"/>
                  <circle cx="17" cy="3" r="1.5" fill="currentColor" stroke="none"/>
                  <circle cx="21" cy="9" r="1.5" fill="currentColor" stroke="none"/>
                  <circle cx="17" cy="21" r="1.5" fill="currentColor" stroke="none"/>
                  <circle cx="7" cy="21" r="1.5" fill="currentColor" stroke="none"/>
                  <circle cx="3" cy="9" r="1.5" fill="currentColor" stroke="none"/>
                </svg>
              </IconButton>
            </ToolGroup>
            <ToolGroup>
              <IconButton as="label" aria-label="Importar GeoJSON" title="Importar GeoJSON">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
                  <path d="M12 3v10"/>
                  <path d="M8 9l4 4 4-4"/>
                  <rect x="4" y="17" width="16" height="4" rx="1"/>
                </svg>
                <input type="file" accept=".json,.geojson,application/geo+json" onChange={handleFileUpload} style={{ display: 'none' }} />
              </IconButton>
            </ToolGroup>
            <ToolGroup>
              <IconButton aria-label="Exportar GeoJSON" onClick={exportGeoJson} title="Exportar GeoJSON">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
                  <path d="M12 21V11"/>
                  <path d="M8 15l4 4 4-4"/>
                  <rect x="4" y="3" width="16" height="4" rx="1"/>
                </svg>
              </IconButton>
            </ToolGroup>
            <ToolGroup>
              <IconButton aria-label="Limpar polígonos" onClick={handleClear} title="Limpar polígonos">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
                  <path d="M3 6h18"/>
                  <path d="M8 6v-2a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                  <path d="M10 11v6M14 11v6"/>
                </svg>
              </IconButton>
            </ToolGroup>
            <ToolGroup style={{ overflow: 'visible' }}>
              <div style={{ position: 'relative' }}>
                <IconButton aria-label="Trocar cor" title="Trocar cor do polígono" onClick={() => { console.log('[UI] Abrir color picker'); setColorPickerOpen(v => !v); }} style={{ background: 'transparent', border: 'none', boxShadow: 'none', width: 32, height: 32, padding: 6 }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
                    <path d="M2 22l4-1 11-11a2.5 2.5 0 0 0 0-3.5l-1.5-1.5a2.5 2.5 0 0 0-3.5 0L2 16v6z" />
                    <path d="M14 7l3 3" />
                  </svg>
                </IconButton>
                <IconButton aria-label="Trocar borda" title="Trocar borda do polígono" onClick={() => { console.log('[UI] Abrir stroke picker'); setStrokePickerOpen(v => !v); }} style={{ background: 'transparent', border: 'none', boxShadow: 'none', width: 32, height: 32, padding: 6 }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" fill="none" strokeWidth="3"/>
                  </svg>
                </IconButton>
                <IconButton aria-label="Adicionar texto" title="Adicionar texto ao polígono" onClick={() => { console.log('[UI] Abrir text picker'); setTextPickerOpen(v => !v); }} style={{ background: 'transparent', border: 'none', boxShadow: 'none', width: 32, height: 32, padding: 6 }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
                    <path d="M4 7V4h16v3"/>
                    <path d="M9 20h6"/>
                    <path d="M12 4v16"/>
                  </svg>
                </IconButton>
                {colorPickerOpen && (
                  <div style={{ position: 'absolute', right: 0, marginTop: 8, background: '#fff', border: '1px solid #e2e8f0', padding: 8, borderRadius: 8, boxShadow: '0 6px 24px rgba(15,23,42,0.12)', zIndex: 40 }}>
                    {/* Preview mostrando a cor+opacidade selecionada (funciona mesmo sem seleção de polígono) */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <div style={{ width: 40, height: 24, borderRadius: 4, border: '1px solid #e6e6e6', background: selectedColor, opacity: selectedOpacity }} aria-hidden />
                      <div style={{ fontSize: 12, color: '#475569' }}>{selectedColor} • Opacidade: {Math.round(selectedOpacity * 100)}%</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input type="color" value={selectedColor} onChange={(e) => setSelectedColor(e.target.value)} />
                      <label style={{ fontSize: 12, color: '#475569' }}>Opacidade</label>
                      <input type="range" min={0} max={1} step={0.05} value={selectedOpacity} onChange={(e) => setSelectedOpacity(Number(e.target.value))} />
                    </div>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
                      <button onClick={applyColorToAll} style={{ padding: '6px 10px', background: '#059669', color: '#fff', border: 'none', borderRadius: 6 }}>Todos</button>
                      <button onClick={() => setColorPickerOpen(false)} style={{ padding: '6px 10px' }}>Cancelar</button>
                      <button onClick={applyColorToSelected} style={{ padding: '6px 10px', background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: 6 }}>Aplicar</button>
                    </div>
                  </div>
                )}
                {strokePickerOpen && (
                  <div style={{ position: 'absolute', right: 0, marginTop: 8, background: '#fff', border: '1px solid #e2e8f0', padding: 8, borderRadius: 8, boxShadow: '0 6px 24px rgba(15,23,42,0.12)', zIndex: 40 }}>
                    {/* Preview mostrando a cor+espessura da borda selecionada */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <div style={{ width: 40, height: 24, borderRadius: 4, border: `${selectedStrokeWidth}px solid ${selectedStrokeColor}`, background: 'transparent' }} aria-hidden />
                      <div style={{ fontSize: 12, color: '#475569' }}>{selectedStrokeColor} • {selectedStrokeWidth}px</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <label style={{ fontSize: 12, color: '#374151', minWidth: 30 }}>Cor:</label>
                      <input type="color" value={selectedStrokeColor} onChange={(e) => setSelectedStrokeColor(e.target.value)} style={{ width: 120, height: 28, border: 'none', borderRadius: 4 }} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <label style={{ fontSize: 12, color: '#374151', minWidth: 30 }}>Espessura:</label>
                      <input type="range" min={1} max={10} step={1} value={selectedStrokeWidth} onChange={(e) => setSelectedStrokeWidth(Number(e.target.value))} />
                    </div>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
                      <button onClick={applyStrokeToAll} style={{ padding: '6px 10px', background: '#059669', color: '#fff', border: 'none', borderRadius: 6 }}>Todos</button>
                      <button onClick={() => setStrokePickerOpen(false)} style={{ padding: '6px 10px' }}>Cancelar</button>
                      <button onClick={applyStrokeToSelected} style={{ padding: '6px 10px', background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: 6 }}>Aplicar</button>
                    </div>
                  </div>
                )}
                {textPickerOpen && (
                  <div style={{ position: 'absolute', right: 0, marginTop: 8, background: '#fff', border: '1px solid #e2e8f0', padding: 8, borderRadius: 8, boxShadow: '0 6px 24px rgba(15,23,42,0.12)', zIndex: 40, minWidth: 250 }}>
                    <div style={{ marginBottom: 8 }}>
                      <label style={{ fontSize: 12, color: '#374151', display: 'block', marginBottom: 4 }}>Texto para o polígono:</label>
                      <input
                        type="text"
                        value={textInput}
                        onChange={(e) => setTextInput(e.target.value)}
                        placeholder="Digite o texto aqui..."
                        style={{ 
                          width: '100%', 
                          padding: '6px 8px', 
                          border: '1px solid #d1d5db', 
                          borderRadius: 4, 
                          fontSize: 12,
                          boxSizing: 'border-box'
                        }}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && textInput.trim()) {
                            addTextToSelected();
                          }
                        }}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      <button 
                        onClick={removeTextFromSelected} 
                        style={{ 
                          padding: '6px 10px', 
                          background: '#ef4444', 
                          color: '#fff', 
                          border: 'none', 
                          borderRadius: 6,
                          fontSize: 12
                        }}
                      >
                        Remover
                      </button>
                      <button 
                        onClick={() => setTextPickerOpen(false)} 
                        style={{ 
                          padding: '6px 10px',
                          background: '#f3f4f6',
                          color: '#374151',
                          border: 'none',
                          borderRadius: 6,
                          fontSize: 12
                        }}
                      >
                        Cancelar
                      </button>
                      <button 
                        onClick={addTextToSelected} 
                        disabled={!textInput.trim()}
                        style={{ 
                          padding: '6px 10px', 
                          background: textInput.trim() ? '#0ea5e9' : '#d1d5db', 
                          color: textInput.trim() ? '#fff' : '#9ca3af', 
                          border: 'none', 
                          borderRadius: 6,
                          cursor: textInput.trim() ? 'pointer' : 'not-allowed',
                          fontSize: 12
                        }}
                      >
                        Adicionar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </ToolGroup>
          </Toolbar>

          {/* InfoChip movido para o canto inferior direito do mapa (fora da toolbar) */}
          {lastImportedFile && (
            <InfoChip>
              Arquivo: {lastImportedFile} | Polígonos: <strong>{polygonCount}</strong>
            </InfoChip>
          )}
        </MapWrapper>
      </AppShell>
    </>
  );
}

export default App;
 
