
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


// Barra de ferramentas flutuante
const Toolbar = styled.div`
  position: absolute;
  top: 24px;
  right: 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  z-index: 10;
  align-items: flex-end;
`;

// Agrupamento de botões na barra de ferramentas
const ToolGroup = styled.div`
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(15,23,42,0.15);
  border: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  overflow: hidden;
`;

// Botão de ícone estilizado
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

// Chip de informação (exibe nome do arquivo e contagem de polígonos)
const InfoChip = styled.div`
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(15,23,42,0.12);
  padding: 6px 10px;
  font-size: 12px;
  color: #475569;
  max-width: 60vw;
  align-self: flex-end;
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
