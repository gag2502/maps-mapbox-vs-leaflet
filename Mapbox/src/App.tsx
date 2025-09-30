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
  align-self: flex-end; /* garante alinhamento à direita */
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
            {lastImportedFile && (
              <InfoChip>
                Último: {lastImportedFile} | Polígonos: <strong>{polygonCount}</strong>
              </InfoChip>
            )}
          </Toolbar>
        </MapWrapper>
      </AppShell>
    </>
  );
}

export default App;
 
