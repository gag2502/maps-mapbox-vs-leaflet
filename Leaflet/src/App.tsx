
// React hooks e tipos
import { useRef, useState, useEffect } from 'react';
// Tipo para eventos de mudança em inputs (ex: upload de arquivo)
import type { ChangeEventHandler } from 'react';
// Tipo para coleções de feições GeoJSON
import type { FeatureCollection } from 'geojson';
// Estilização com styled-components
import styled from 'styled-components';
// Componente do mapa Leaflet e seu handle para comandos externos
import LeafletMap, { type LeafletMapHandle } from './components/LeafletMap';
// Ícones SVG como componentes React
import {
  IconZoomIn,
  IconZoomOut,
  IconFullscreen,
  IconExitFullscreen,
  IconPolygon,
  IconImport,
  IconExport,
  IconTrash
} from './components/icons';
// Estilo global da aplicação
import GlobalStyle from '../GlobalStyle';


// Container principal da aplicação
const AppShell = styled.div`
  width: 100vw;
  height: 100vh;
  background-color: #f1f5f9;
  position: fixed;
  inset: 0;
  overflow: hidden;
`;


// Wrapper do mapa para posicionamento absoluto dos controles
const MapWrapper = styled.section`
  position: relative;
  height: 100%;
  width: 100%;
  z-index: 0;
`;


// Barra de ferramentas flutuante (estilo Mapbox)
const Toolbar = styled.div`
  position: absolute;
  top: 24px;
  right: 24px;
  display: flex;
        flex-direction: column;
        gap: 14px;
  z-index: 25;
  align-items: flex-end;
`;

// Agrupamento de botões na barra de ferramentas (estilo Mapbox)
const ToolGroup = styled.div`
  background: transparent;
  border-radius: 8px;
  box-shadow: none;
  border: none;
  display: flex;
  align-items: stretch;
  overflow: visible;
  margin: 0;
`;

// Botão de ícone estilizado (estilo Mapbox)
const IconButton = styled.button`
  appearance: none;
  background: #fff;
  border: none;
  border-left: 1px solid #e2e8f0;
  width: 36px;
  height: 36px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  line-height: 1;
  box-sizing: border-box;
  padding: 0;
  &:first-child { border-left: none; }
  &:hover { background: #f8fafc; }
  & > div {
    margin: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 20px;
    width: 20px;
  }
`;

// Chip de informação (canto inferior direito, igual Mapbox)
const InfoChip = styled.div`
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(15,23,42,0.12);
  padding: 6px 10px;
  font-size: 12px;
  color: #475569;
  max-width: 60vw;
        position: fixed;
        right: 24px;
        bottom: 24px;
  z-index: 22;
`;

// Tela de carregamento do mapa
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

// Aviso de token (não utilizado neste app, mas mantido para padrão)
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

// FeatureCollection vazio para inicialização
const emptyCollection: FeatureCollection = { type: 'FeatureCollection', features: [] };

// Função utilitária para validar se um objeto é um FeatureCollection
function isFeatureCollection(value: unknown): value is FeatureCollection {
  if (typeof value !== 'object' || value === null) return false;
  const maybe = value as FeatureCollection;
  return maybe.type === 'FeatureCollection' && Array.isArray(maybe.features);
}


// Componente principal da aplicação
function App() {
  // Referência para manipular o mapa Leaflet
  const mapRef = useRef<LeafletMapHandle | null>(null);
  // Referência para o wrapper do mapa (usado para fullscreen)
  const wrapperRef = useRef<HTMLElement | null>(null);
  // Estado com os dados desenhados no mapa (GeoJSON)
  const [drawData, setDrawData] = useState<FeatureCollection>(emptyCollection);
  // Estado para erros de carregamento do mapa
  const [error, setError] = useState<string | null>(null);
  // Nome do último arquivo importado
  const [lastImportedFile, setLastImportedFile] = useState<string | null>(null);
  // Indica se o mapa está pronto
  const [mapReady, setMapReady] = useState(false);
  // Indica se está em tela cheia
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Efeito para simular carregamento do mapa (fallback)
  useEffect(() => {
    if (!mapReady && !error) {
      const t = setTimeout(() => setMapReady(true), 3000);
      return () => clearTimeout(t);
    }
  }, [mapReady, error]);

  // Efeito para monitorar mudanças de fullscreen
  // Este efeito garante que o estado 'isFullscreen' fique sincronizado com o modo de tela cheia do navegador
  useEffect(() => {
    // Função chamada sempre que ocorre um evento de mudança de fullscreen
    const onFsChange = () => {
      // Pega o elemento do wrapper do mapa
      const el = wrapperRef.current;
      // Verifica se há algum elemento em fullscreen e se é o nosso wrapper
      // document.fullscreenElement é o elemento atualmente em tela cheia (ou null)
      // Se for igual ao nosso wrapper, então estamos em fullscreen
      const active = !!document.fullscreenElement && document.fullscreenElement === el;
      // Atualiza o estado para refletir se estamos ou não em fullscreen
      setIsFullscreen(active);
    };
    // Adiciona o listener para o evento 'fullscreenchange' (toda vez que entra ou sai do modo tela cheia)
    document.addEventListener('fullscreenchange', onFsChange);
    // Chama uma vez para garantir que o estado inicial está correto (caso já esteja em fullscreen ao montar)
    onFsChange();
    // Remove o listener ao desmontar o componente para evitar vazamento de memória
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  // Atualiza o estado ao desenhar no mapa
  const handleDrawChange = (collection: FeatureCollection) => {
    setDrawData(collection);
  };

  // Conta quantos polígonos existem no GeoJSON desenhado
  const polygonCount = drawData.features.filter(
    (f: any) => f.geometry && (f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon')
  ).length;

  // Inicia o modo de desenho de polígono
  const handleDrawPolygon = () => mapRef.current?.startDrawPolygon?.();
  // Dá zoom in no mapa
  const handleZoomIn = () => mapRef.current?.zoomIn?.();
  // Dá zoom out no mapa
  const handleZoomOut = () => mapRef.current?.zoomOut?.();
  // Coloca o mapa em tela cheia
  const handleFullscreen = () => {
    const el = wrapperRef.current as any;
    if (!document.fullscreenElement && el && typeof el.requestFullscreen === 'function') {
      el.requestFullscreen();
    }
  };
  // Limpa os polígonos desenhados
  const handleClear = () => mapRef.current?.deleteSelected?.();

  // Estado para o seletor de cor do polígono
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [selectedColor, setSelectedColor] = useState('#ffffff');
  const [selectedOpacity, setSelectedOpacity] = useState(0.4);
  // Estado para o seletor de borda
  const [strokePickerOpen, setStrokePickerOpen] = useState(false);
  const [selectedStrokeColor, setSelectedStrokeColor] = useState('#222222');
  const [selectedStrokeWidth, setSelectedStrokeWidth] = useState(2);
  // Estado para o seletor de texto
  const [textPickerOpen, setTextPickerOpen] = useState(false);
  const [textInput, setTextInput] = useState('');

  // Exporta o GeoJSON desenhado para um arquivo .geojson baixado pelo usuário
  // Esta função é chamada ao clicar no botão de exportar
  const exportGeoJson = () => {
    // Obtém os dados desenhados no mapa (FeatureCollection)
    const data = mapRef.current?.getDrawData?.();
    if (!data) return; // Se não houver dados, não faz nada

    // Converte o objeto GeoJSON para string formatada
    const jsonString = JSON.stringify(data, null, 2);

    // Cria um Blob (arquivo temporário em memória) com o conteúdo do GeoJSON
    const blob = new Blob([jsonString], { type: 'application/geo+json' });

    // Gera uma URL temporária para o Blob
    const url = URL.createObjectURL(blob);

    // Cria um elemento <a> para simular o download
    const a = document.createElement('a');
    a.href = url;
    a.download = 'desenhos.geojson'; // Nome sugerido para o arquivo

    // Dispara o clique no <a> para iniciar o download
    a.click();

    // Libera a URL temporária da memória
    URL.revokeObjectURL(url);
  };

  // Importa um arquivo GeoJSON do disco e carrega no mapa
  // Esta função é chamada quando o usuário seleciona um arquivo no input
  const handleFileUpload: ChangeEventHandler<HTMLInputElement> = async (event) => {
    try {
      // Pega o primeiro arquivo selecionado pelo usuário
      const file = event.target.files?.[0];
      if (!file) return; // Se não houver arquivo, não faz nada

      // Lê o conteúdo do arquivo como texto
      const text = await file.text();

      // Tenta fazer o parse do texto para JSON
      const json = JSON.parse(text);

      // Valida se o JSON é um FeatureCollection válido (GeoJSON)
      if (!isFeatureCollection(json)) {
        // Se não for, lança erro para ser tratado abaixo
        throw new Error('Arquivo não é um FeatureCollection válido');
      }

      // Carrega o GeoJSON no mapa e ajusta o mapa para enquadrar os dados
      mapRef.current?.loadGeoJson?.(json, { fitBounds: true });

      // Atualiza o estado com o nome do último arquivo importado
      setLastImportedFile(file.name);
    } catch (uploadError) {
      // Se ocorrer qualquer erro (parse, leitura, validação), mostra no console e alerta o usuário
      console.error(uploadError);
      alert('Falha ao importar o GeoJSON. Verifique o arquivo.');
    }
  };

  // Renderização do componente
  return (
    <>
      <GlobalStyle />
      <AppShell>
        {/*
          Renderiza o componente do mapa principal (LeafletMap)
          - ref={mapRef}: permite controlar o mapa via métodos expostos (zoom, desenho, etc)
          - initialCenter: define o centro inicial do mapa (latitude, longitude)
          - initialZoom: nível de zoom inicial
          - onDrawChange: callback chamado sempre que o usuário desenha/edita polígonos
          - onMapLoad: callback chamado quando o mapa termina de carregar
          - onMapError: callback chamado se houver erro ao carregar o mapa
          O wrapper (MapWrapper) é usado para fullscreen e posicionamento dos controles.
        */}
        <MapWrapper ref={wrapperRef as any}>
          <LeafletMap
            ref={mapRef}
            initialCenter={[-14.886187924998506, -56.93025371958118]}
            initialZoom={17}
            onDrawChange={handleDrawChange}
            onMapLoad={() => { setMapReady(true); setError(null); }}
            onMapError={() => { setMapReady(false); setError('Não foi possível carregar o mapa.'); }}
          />
          {/* Exibe tela de carregamento enquanto o mapa não está pronto */}
          {!mapReady && !error && (<MapLoading>Carregando mapa...</MapLoading>)}
          <Toolbar>
            {/* Grupo de botões de zoom */}
            <ToolGroup>
              <IconButton aria-label="Mais zoom" onClick={handleZoomIn} title="Mais zoom">
                <IconZoomIn />
              </IconButton>
              <IconButton aria-label="Menos zoom" onClick={handleZoomOut} title="Menos zoom">
                <IconZoomOut />
              </IconButton>
            </ToolGroup>
            {/* Botão de fullscreen */}
            <ToolGroup>
              {!isFullscreen && (
                <IconButton aria-label="Tela cheia" onClick={handleFullscreen} title="Entrar em tela cheia">
                  <IconFullscreen />
                </IconButton>
              )}
              {isFullscreen && (
                <IconButton aria-label="Sair da tela cheia" onClick={() => (document as any).exitFullscreen?.()} title="Sair da tela cheia">
                  <IconExitFullscreen />
                </IconButton>
              )}
            </ToolGroup>
            {/* Botão para desenhar polígono */}
            <ToolGroup>
              <IconButton aria-label="Desenhar polígono" onClick={handleDrawPolygon} title="Desenhar polígono">
                <IconPolygon />
              </IconButton>
            </ToolGroup>
            {/* Botão para importar GeoJSON */}
            <ToolGroup>
              <IconButton as="label" aria-label="Importar GeoJSON" title="Importar GeoJSON">
                <IconImport />
                <input type="file" accept=".json,.geojson,application/geo+json" onChange={handleFileUpload} style={{ display: 'none' }} />
              </IconButton>
            </ToolGroup>
            {/* Grupo: Cor, Borda, Texto */}
            <ToolGroup style={{ overflow: 'visible' }}>
              {/* Botão de cor de preenchimento (sem div extra) */}
              <div style={{ position: 'relative' }}>
                <IconButton
                  aria-label="Cor do polígono"
                  title="Cor do polígono"
                  onClick={() => setColorPickerOpen(v => !v)}
                >
                  <span style={{
                    display: 'block',
                    width: 18,
                    height: 18,
                    background: selectedColor,
                    borderRadius: 4,
                    border: '1.5px solid #e2e8f0',
                    boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.06)'
                  }} />
                </IconButton>
                {colorPickerOpen && (
                  <div style={{
                    position: 'absolute',
                    right: 0,
                    top: '110%',
                    background: '#fff',
                    border: '1.5px solid #e2e8f0',
                    padding: 10,
                    borderRadius: 10,
                    boxShadow: '0 6px 24px rgba(15,23,42,0.18)',
                    zIndex: 10001,
                    margin: 0,
                    minWidth: 220,
                    filter: 'none',
                  }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                      <input type="color" value={selectedColor} onChange={(e) => setSelectedColor(e.target.value)} />
                      <div style={{ fontSize: 12, color: '#475569' }}>{selectedColor} • Opacidade: {Math.round(selectedOpacity * 100)}%</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <label style={{ fontSize: 12, color: '#374151' }}>Opacidade</label>
                      <input type="range" min={0} max={1} step={0.05} value={selectedOpacity} onChange={(e) => setSelectedOpacity(Number(e.target.value))} />
                    </div>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      <button onClick={() => { try { mapRef.current?.applyFillToAll?.(selectedColor, selectedOpacity); } catch (err) { console.error(err); alert('Erro ao aplicar cor a todos'); } setColorPickerOpen(false); }} style={{ padding: '6px 10px', background: '#059669', color: '#fff', border: 'none', borderRadius: 6 }}>Todos</button>
                      <button onClick={() => setColorPickerOpen(false)} style={{ padding: '6px 10px' }}>Cancelar</button>
                      <button onClick={() => { try { mapRef.current?.changeSelectedFill?.(selectedColor, selectedOpacity); } catch (err) { console.error(err); alert('Erro ao aplicar cor'); } setColorPickerOpen(false); }} style={{ padding: '6px 10px', background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: 6 }}>Aplicar</button>
                    </div>
                  </div>
                )}
              </div>
              {/* Botão de cor da borda */}
              <div style={{ position: 'relative' }}>
                <IconButton aria-label="Cor da borda" title="Cor da borda" onClick={() => setStrokePickerOpen(v => !v)}>
                  {/* Ícone círculo com borda */}
                  <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="7" stroke={selectedStrokeColor} strokeWidth={selectedStrokeWidth} fill="none"/></svg>
                </IconButton>
                {strokePickerOpen && (
                  <div style={{
                    position: 'absolute',
                    right: 0,
                    top: '110%',
                    background: '#fff',
                    border: '1.5px solid #e2e8f0',
                    padding: 10,
                    borderRadius: 10,
                    boxShadow: '0 6px 24px rgba(15,23,42,0.18)',
                    zIndex: 10001,
                    margin: 0,
                    minWidth: 220,
                    filter: 'none',
                  }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                      <input type="color" value={selectedStrokeColor} onChange={(e) => setSelectedStrokeColor(e.target.value)} />
                      <div style={{ fontSize: 12, color: '#475569' }}>{selectedStrokeColor}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <label style={{ fontSize: 12, color: '#374151' }}>Espessura</label>
                      <input type="range" min={1} max={8} step={1} value={selectedStrokeWidth} onChange={(e) => setSelectedStrokeWidth(Number(e.target.value))} />
                      <span style={{ fontSize: 12 }}>{selectedStrokeWidth}px</span>
                    </div>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      <button onClick={() => { try { mapRef.current?.applyStrokeToAll?.(selectedStrokeColor, selectedStrokeWidth); } catch (err) { console.error(err); alert('Erro ao aplicar borda a todos'); } setStrokePickerOpen(false); }} style={{ padding: '6px 10px', background: '#059669', color: '#fff', border: 'none', borderRadius: 6 }}>Todos</button>
                      <button onClick={() => setStrokePickerOpen(false)} style={{ padding: '6px 10px' }}>Cancelar</button>
                      <button onClick={() => { try { mapRef.current?.changeSelectedStroke?.(selectedStrokeColor, selectedStrokeWidth); } catch (err) { console.error(err); alert('Erro ao aplicar borda'); } setStrokePickerOpen(false); }} style={{ padding: '6px 10px', background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: 6 }}>Aplicar</button>
                    </div>
                  </div>
                )}
              </div>
              {/* Botão de texto central */}
              <div style={{ position: 'relative' }}>
                <IconButton aria-label="Texto no polígono" title="Texto no polígono" onClick={() => setTextPickerOpen(v => !v)}>
                  {/* Ícone texto */}
                  <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><text x="4" y="15" fontSize="13" fontFamily="Arial" fill="#222">T</text></svg>
                </IconButton>
                {textPickerOpen && (
                  <div style={{
                    position: 'absolute',
                    right: 0,
                    top: '110%',
                    background: '#fff',
                    border: '1.5px solid #e2e8f0',
                    padding: 10,
                    borderRadius: 10,
                    boxShadow: '0 6px 24px rgba(15,23,42,0.18)',
                    zIndex: 10001,
                    margin: 0,
                    minWidth: 220,
                    filter: 'none',
                  }}>
                    <div style={{ marginBottom: 8 }}>
                      <input type="text" value={textInput} onChange={e => setTextInput(e.target.value)} placeholder="Texto do polígono" style={{ width: '100%', padding: 6, fontSize: 14, borderRadius: 4, border: '1px solid #e2e8f0' }} />
                    </div>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      <button onClick={() => setTextPickerOpen(false)} style={{ padding: '6px 10px' }}>Cancelar</button>
                      <button onClick={() => { try { mapRef.current?.addTextToSelected?.(textInput); } catch (err) { console.error(err); alert('Erro ao adicionar texto'); } setTextPickerOpen(false); }} style={{ padding: '6px 10px', background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: 6 }}>Aplicar</button>
                    </div>
                  </div>
                )}
              </div>
            </ToolGroup>
            {/* Botão para exportar GeoJSON */}
            <ToolGroup>
              <IconButton aria-label="Exportar GeoJSON" onClick={exportGeoJson} title="Exportar GeoJSON">
                <IconExport />
              </IconButton>
            </ToolGroup>
            {/* Botão para limpar polígonos */}
            <ToolGroup>
              <IconButton aria-label="Limpar polígonos" onClick={handleClear} title="Limpar polígonos">
                <IconTrash />
              </IconButton>
            </ToolGroup>
            {/* Exibe informações do último arquivo importado e contagem de polígonos */}
            {lastImportedFile && (
              <InfoChip>
                Arquivo: {lastImportedFile} | Polígonos: <strong>{polygonCount}</strong>
              </InfoChip>
            )}
          </Toolbar>
        </MapWrapper>
      </AppShell>
    </>
  );
}

export default App;
