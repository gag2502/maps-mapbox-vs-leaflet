import { forwardRef, useEffect, useImperativeHandle, useRef, type Ref } from 'react';


/**
 * Componente MapboxMap
 * --------------------
 * Este componente React encapsula a renderização de um mapa interativo usando Mapbox GL JS,
 * com suporte a desenho de polígonos (MapboxDraw), manipulação via ref, importação/exportação de GeoJSON,
 * customização de cor dos polígonos, marcador customizado e integração com eventos externos.
 *
 * Principais recursos:
 * - Renderiza mapa Mapbox com estilo satélite
 * - Permite desenhar, editar e remover polígonos (MapboxDraw)
 * - Permite adicionar marcador customizado reutilizável
 * - Permite controlar o mapa via ref (zoom, fullscreen, fit, etc.)
 * - Suporta importação/exportação de GeoJSON
 * - Suporta atualização dinâmica da cor dos polígonos
 * - Expõe eventos de mudança de desenho e carregamento do mapa
 * - Totalmente tipado com TypeScript
 */

// Importa o hook de marcador customizado
import { useMapboxMarker } from '../hooks/useMapboxMarker';

// Importa styled-components para estilização CSS-in-JS do container do mapa
import styled from 'styled-components';

// Importa a biblioteca principal do Mapbox GL JS e o tipo LngLatLike para coordenadas
import mapboxgl, { type LngLatLike } from 'mapbox-gl';

// Importa o plugin MapboxDraw para permitir desenho e edição de formas no mapa
import MapboxDraw from '@mapbox/mapbox-gl-draw';

// Importa o tema customizado de estilos para o MapboxDraw (cores, preenchimentos, etc.)
import drawTheme from '../mapbox/drawTheme';

// Importa tipos do GeoJSON para tipagem forte dos dados geográficos
import type { Feature, FeatureCollection, Geometry } from 'geojson';

// Importa os estilos CSS padrão do Mapbox GL JS para renderização correta do mapa
import 'mapbox-gl/dist/mapbox-gl.css';
// Importa os estilos CSS padrão do MapboxDraw para renderização dos controles de desenho
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';


// Removed worker overrides

// ===============================
// Interface de controle externo
// ===============================
// Define os métodos expostos via ref para controlar o mapa de fora do componente
export type MapboxMapHandle = {
  /** Move a visualização do mapa para as coordenadas e zoom especificados */
  flyTo: (
    options: {
      lng: number; // longitude de destino
      lat: number; // latitude de destino
      zoom?: number; // zoom opcional
    }
  ) => void;
  /** Retorna todos os dados desenhados no mapa (GeoJSON FeatureCollection) */
  getDrawData: () => FeatureCollection; // retorna todos os desenhos atuais
  /** Carrega um GeoJSON no mapa, substituindo os desenhos atuais. Pode ajustar o zoom automaticamente */
  loadGeoJson: (
    collection: FeatureCollection, // coleção GeoJSON a ser carregada
    options?: { fitBounds?: boolean } // se deve ajustar o zoom automaticamente
  ) => void;
  /** Remove todos os desenhos do mapa */
  clearDrawings: () => void; // apaga todos os desenhos
  /** Inicia o modo de desenho de polígono */
  startDrawPolygon: () => void; // ativa modo de desenho
  /** Dá zoom in (aproxima) no mapa */
  zoomIn: () => void; // aproxima
  /** Dá zoom out (afasta) no mapa */
  zoomOut: () => void; // afasta
  /** Alterna entre modo tela cheia e normal */
  toggleFullscreen: () => void; // alterna fullscreen
  /** Ajusta o mapa para enquadrar todos os desenhos atuais */
  fitToDrawings: () => void; // ajusta o mapa para mostrar todos os desenhos
  /** Entra no modo tela cheia */
  enterFullscreen: () => void; // entra em fullscreen
  /** Sai do modo tela cheia */
  exitFullscreen: () => void; // sai do fullscreen
  /** Exclui o(s) desenho(s) selecionado(s) */
  deleteSelected: () => void; // apaga desenhos selecionados
  /** Muda a cor de preenchimento (hex) e opacidade (0-1) dos polígonos selecionados */
  changeSelectedFill?: (color: string, opacity?: number) => void;
  /** Muda a cor da borda (hex) e espessura (px) dos polígonos selecionados */
  changeSelectedStroke?: (color: string, width?: number) => void;
  /** Aplica cor de preenchimento (hex) e opacidade (0-1) a todos os polígonos */
  applyFillToAll?: (color: string, opacity?: number) => void;
  /** Aplica cor da borda (hex) e espessura (px) a todos os polígonos */
  applyStrokeToAll?: (color: string, width?: number) => void;
  /** Adiciona texto no centro dos polígonos selecionados */
  addTextToSelected?: (text: string) => void;
  /** Remove texto dos polígonos selecionados */
  removeTextFromSelected?: () => void;
};


// ===============================
// Propriedades do componente
// ===============================
// Define as props aceitas pelo componente MapboxMap
export type MapboxMapProps = {
  /** Token de acesso da API do Mapbox (obrigatório) */
  accessToken: string; // token de acesso do Mapbox
  /** Centro inicial do mapa ([longitude, latitude]) */
  initialCenter?: LngLatLike; // centro inicial do mapa
  /** Zoom inicial do mapa */
  initialZoom?: number; // zoom inicial
  /** Dados GeoJSON para desenhar inicialmente no mapa */
  initialData?: FeatureCollection; // dados iniciais
  /** Callback chamado sempre que os desenhos no mapa mudam */
  onDrawChange?: (collection: FeatureCollection) => void; // callback de mudança
  /** Callback chamado quando o mapa termina de carregar */
  onMapLoad?: () => void; // callback de carregamento
  /** Callback chamado em caso de erro ao carregar o mapa */
  onMapError?: (error: Error) => void; // callback de erro
  /** Cor de preenchimento dos polígonos desenhados */
  fillColor?: string; // cor dos polígonos
};



// ===============================
// Constantes de configuração
// ===============================
// Centro padrão do mapa (coordenadas de referência)
const defaultCenter: [number, number] = [-14.886187924998506, -56.93025371958118];
// Zoom padrão do mapa
const defaultZoom = 17;
// Coleção GeoJSON vazia (usada como valor inicial ou fallback)
const emptyCollection: FeatureCollection = { type: 'FeatureCollection', features: [] };


// ===============================
// Componente principal
// ===============================
// Encapsula toda a lógica de renderização, desenho, eventos e integração do mapa
const MapboxMap = forwardRef(function MapboxMap(
  { accessToken, initialCenter, initialZoom, initialData, onDrawChange, onMapLoad, onMapError, fillColor }: MapboxMapProps,
  ref: Ref<MapboxMapHandle>
) {
  // Refs internas para manter instâncias e valores estáveis
  // containerRef: div onde o mapa será renderizado
  // mapRef: instância do MapboxGL
  // drawRef: instância do MapboxDraw
  // initialDataRef: dados GeoJSON iniciais
  // onDrawChangeRef: callback de mudança dos desenhos
  // initialCenterRef: centro inicial do mapa
  // initialZoomRef: zoom inicial do mapa
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const drawRef = useRef<MapboxDraw | null>(null);
  const initialDataRef = useRef<FeatureCollection | undefined>(initialData);
  const onDrawChangeRef = useRef(onDrawChange);
  const initialCenterRef = useRef<LngLatLike>(initialCenter ?? defaultCenter);
  const initialZoomRef = useRef<number>(initialZoom ?? defaultZoom);



  // Gera o tema de estilos do MapboxDraw, trocando dinamicamente a cor de preenchimento dos polígonos
  /**
   * Gera um tema de estilos para o MapboxDraw com cor de preenchimento customizada.
   *
   * @param fill - Cor de preenchimento desejada para os polígonos (ex: '#ff0000')
   * @returns Um novo array de estilos, com a cor de fill dos polígonos substituída
   */
  function getDrawTheme(fill: string) {
    // Percorre todos os estilos do tema base do MapboxDraw
    return drawTheme.map(style => {
      // If the style id matches any common MapboxDraw polygon fill layer
      // (gl-draw-polygon-fill, gl-draw-polygon-fill-active, gl-draw-polygon-fill-inactive)
      // replace the fill-color and fill-opacity paint properties so feature props are honored.
      if (typeof style.id === 'string' && style.id.indexOf('gl-draw-polygon-fill') !== -1) {
        return { ...style, paint: { ...style.paint, 'fill-color': ['coalesce', ['get', 'fillColor'], fill], 'fill-opacity': ['coalesce', ['get', 'fillOpacity'], (style.paint && style.paint['fill-opacity']) || 0.2] } };
      }
      // Para os demais estilos, retorna sem alterações
      return style;
    });
  }

  // ===============================
  // Efeito de inicialização do mapa
  // ===============================
  // Cria o mapa, adiciona controles, listeners e marcador customizado
  useEffect(() => {
    // Garante que o container do mapa existe antes de tentar inicializar
    if (!containerRef.current) {
      return;
    }

    // Verifica se o token de acesso foi fornecido
    if (!accessToken) {
      console.error('Mapbox access token is required to initialize the map.');
      return;
    }

    // Define o token global do MapboxGL
    mapboxgl.accessToken = accessToken;

    // Cria a instância do mapa com estilo, centro e zoom iniciais
    const map = new mapboxgl.Map({
      container: containerRef.current, // Elemento HTML onde o mapa será renderizado
      style: 'mapbox://styles/mapbox/satellite-streets-v12', // Estilo do mapa (satélite)
      center: initialCenterRef.current, // Centro inicial do mapa
      zoom: initialZoomRef.current,     // Zoom inicial do mapa
    });


    // Adiciona marcador customizado reutilizável
    useMapboxMarker({
      map,
      coordinates: [-56.93025371958118, -14.886187924998506],
      label: 'Fazenda',
      iconUrl: 'https://maps.gstatic.com/mapfiles/api-3/images/spotlight-poi2_hdpi.png',
    });
    // Importa o hook de marcador customizado


    // Gera tema dinâmico para o Draw
    function getDrawTheme(fill: string) {
      // Copia o tema e troca a cor de fill dos polígonos
      return drawTheme.map(style => {
        if (typeof style.id === 'string' && style.id.indexOf('gl-draw-polygon-fill') !== -1) {
          return { ...style, paint: { ...style.paint, 'fill-color': ['coalesce', ['get', 'fillColor'], fill], 'fill-opacity': ['coalesce', ['get', 'fillOpacity'], (style.paint && style.paint['fill-opacity']) || 0.2] } };
        }
        return style;
      });
    }

    // Cria uma nova instância do MapboxDraw (plugin de desenho do Mapbox)
    const draw = new MapboxDraw({
      // Não exibe os controles padrão de UI (botões de desenhar, excluir, etc.)
      displayControlsDefault: false,
      // Não adiciona nenhum controle de UI, tudo será controlado via código/ref
      controls: {},
      // Define o modo padrão como 'simple_select' (seleção simples de features)
      defaultMode: 'simple_select',
      // Aplica o tema de estilos customizado, trocando a cor de preenchimento dos polígonos
      // Se fillColor não for fornecido, usa cor padrão '#3bb2d0'
      styles: getDrawTheme(fillColor || '#3bb2d0'),
    });

    // Necessário adicionar para registrar camadas/eventos, UI está vazia
        // Adiciona o controle de desenho (MapboxDraw) ao mapa, no canto superior esquerdo
        map.addControl(draw, 'top-left');

        // Salva as instâncias do draw e do mapa nas refs para acesso posterior
        drawRef.current = draw;
        mapRef.current = map;

        // Função chamada sempre que há alteração nos desenhos (criação, atualização ou remoção)
        const emitDrawChange = () => {
          // Obtém todos os dados desenhados no mapa (GeoJSON)
          const data = draw.getAll();
          // Dispara o callback de mudança, se fornecido via props
          onDrawChangeRef.current?.(data);
          // Update custom colored layer when draw data changes (this also handles coordinate labels)
          try {
            updateCustomColoredLayer(map, data.features);
          } catch (e) {
            // ignore custom layer errors to not break main flow
          }
        };

        // Função para tratar erros do mapa (ex: falha ao carregar tiles)
        const handleError = (event: { error?: Error }) => {
          if (event?.error) {
            // Dispara o callback de erro, se fornecido
            onMapError?.(event.error);
          }
        };

        // Registra listeners para eventos do mapa:
        // - 'error': erros gerais do mapa
        // - 'draw.create', 'draw.update', 'draw.delete': eventos do MapboxDraw
        map.on('error', handleError);
        map.on('draw.create', emitDrawChange);
        map.on('draw.update', emitDrawChange);
        map.on('draw.delete', emitDrawChange);

        // Quando um novo polígono é criado, força propriedades padrão de preenchimento
        map.on('draw.create', (e: any) => {
          try {
            const created = e.features ?? (e.feature ? [e.feature] : []);
            (created || []).forEach((f: any) => {
              // Se não existir, aplica cor branca semi-transparente como padrão
              if (!f.properties) f.properties = {};
              if (typeof f.properties.fillColor === 'undefined') f.properties.fillColor = '#ffffff';
              if (typeof f.properties.fillOpacity === 'undefined') f.properties.fillOpacity = 0.2;
              // Também salva versão RGB para exportação
              if (typeof f.properties.fillRgb === 'undefined') {
                // simple hex -> rgb
                const hex = (f.properties.fillColor || '#ffffff').replace('#','');
                const r = parseInt(hex.substring(0,2),16) || 255;
                const g = parseInt(hex.substring(2,4),16) || 255;
                const b = parseInt(hex.substring(4,6),16) || 255;
                f.properties.fillRgb = `${r},${g},${b}`;
              }
            });
          } catch (err) { /* ignore */ }
        });

        // Função chamada quando o mapa termina de carregar (evento 'load')
        const handleMapLoad = () => {
          // Se houver dados iniciais, carrega no controle de desenho e ajusta o zoom
          const data = initialDataRef.current;
          if (data && data.features.length) {
            draw.set(data);
            fitToCollection(map, data);
            // Adiciona rótulos para todas as coordenadas presentes nos dados iniciais
            upsertCoordinateLabels(map, data);
          }

          // Dispara o callback de mudança para sincronizar estado inicial
          onDrawChangeRef.current?.(draw.getAll());
          // Força o resize do mapa para garantir renderização correta
          map.resize();
          // Dispara o callback de carregamento, se fornecido
          if (onMapLoad) {
            console.log('[MapboxMap] Chamando onMapLoad');
            onMapLoad();
          }
        };

        // Registra o listener para o evento 'load' do mapa
        map.on('load', handleMapLoad);

    // Fallback: if map is already loaded (e.g., fast reload), call onMapLoad immediately
    if (map.loaded()) {
      handleMapLoad();
    }


        // Função de limpeza do useEffect: remove listeners e destrói o mapa ao desmontar o componente
        return () => {
          // Clean up custom styled layers
          try {
            const fillLayerId = 'custom-colored-polygons-layer';
            const fillSourceId = 'custom-colored-polygons';
            const strokeLayerId = 'custom-stroked-polygons-layer';
            const strokeSourceId = 'custom-stroked-polygons';
            const textLayerId = 'custom-text-labels-layer';
            const textSourceId = 'custom-text-labels';
            if (map.getLayer && map.getLayer(fillLayerId)) map.removeLayer(fillLayerId);
            if (map.getSource && map.getSource(fillSourceId)) map.removeSource(fillSourceId);
            if (map.getLayer && map.getLayer(strokeLayerId)) map.removeLayer(strokeLayerId);
            if (map.getSource && map.getSource(strokeSourceId)) map.removeSource(strokeSourceId);
            if (map.getLayer && map.getLayer(textLayerId)) map.removeLayer(textLayerId);
            if (map.getSource && map.getSource(textSourceId)) map.removeSource(textSourceId);
          } catch (e) {
            // ignore cleanup errors
          }
          // Remove listeners dos eventos de desenho e erro
          map.off('draw.create', emitDrawChange);
          map.off('error', handleError);
          map.off('draw.update', emitDrawChange);
          map.off('draw.delete', emitDrawChange);
          map.off('load', handleMapLoad);
          // Remove o mapa do DOM e libera recursos
          map.remove();
          // Limpa as refs para evitar vazamento de memória
          mapRef.current = null;
          drawRef.current = null;
        };

  }, [accessToken]);

  // ===============================
  // Efeito de atualização de cor dos polígonos
  // ===============================
  useEffect(() => {
        // Efeito que atualiza a cor dos polígonos desenhados quando fillColor muda
        if (!mapRef.current || !drawRef.current || !fillColor) return;

        // Remove o controle de desenho antigo do mapa
        mapRef.current.removeControl(drawRef.current);

        // Cria uma nova instância do MapboxDraw com o novo tema de cor
        const newDraw = new MapboxDraw({
          displayControlsDefault: false,
          controls: {},
          defaultMode: 'simple_select',
          styles: getDrawTheme(fillColor), // Aplica a nova cor de preenchimento
        });

        // Adiciona o novo controle de desenho ao mapa
        mapRef.current.addControl(newDraw, 'top-left');
        // Atualiza a ref para o novo controle
        drawRef.current = newDraw;

        // Se houver dados iniciais, recarrega no novo controle para manter os desenhos
        if (initialDataRef.current) {
          newDraw.set(initialDataRef.current);
        }
      }, [fillColor]);

  // ===============================
  // Efeito de integração com eventos externos
  // ===============================
  // Escuta um evento customizado de mudança de cor de polígono disparado na janela
    useEffect(() => {
      // Handler para o evento customizado (pode ser disparado por outros componentes)
      function handlePolygonColorChange(e: any) {
        if (typeof e.detail === 'string') {
          // Aqui você pode disparar um callback para o App, se desejar
          // Por exemplo: atualizar a cor dos polígonos dinamicamente
        }
      }
      // Adiciona o listener para o evento 'polygonColorChange' na window
      window.addEventListener('polygonColorChange', handlePolygonColorChange);
      // Remove o listener ao desmontar o componente para evitar vazamento de memória
      return () => {
        window.removeEventListener('polygonColorChange', handlePolygonColorChange);
      };
    }, []);

  // ===============================
  // Efeito de atualização dos dados desenhados
  // ===============================
  // Atualiza os desenhos do mapa quando o prop initialData muda
  // Efeito que atualiza os desenhos do mapa quando a prop initialData muda
  useEffect(() => {
    // Se não foi fornecido initialData, não faz nada
    if (!initialData) {
      return;
    }

    // Se o initialData não mudou (mesmo objeto), evita atualização desnecessária
    if (initialDataRef.current === initialData) {
      return;
    }

    // Atualiza a ref para o novo initialData
    initialDataRef.current = initialData;

    // Se o mapa e o controle de desenho já existem
    if (mapRef.current && drawRef.current) {
      // Define os novos desenhos no controle de desenho
      drawRef.current.set(initialData);
      // Ajusta o mapa para enquadrar todos os desenhos
      fitToCollection(mapRef.current, initialData);
      // Atualiza/insere rótulos de coordenadas para o novo GeoJSON
      upsertCoordinateLabels(mapRef.current, initialData);
      // Dispara callback de mudança, se existir
      onDrawChangeRef.current?.(drawRef.current.getAll());
    }
  }, [initialData]);

  // ===============================
  // API imperativa exposta via ref
  // ===============================
  // Permite controlar o mapa de fora do componente (zoom, fullscreen, desenho, etc.)
  // Expõe métodos imperativos via ref para controlar o mapa de fora do componente
  useImperativeHandle(ref, () => ({
    // Move a visualização do mapa para as coordenadas e zoom especificados
    flyTo: ({ lng, lat, zoom }) => {
      // Se o mapa ainda não foi inicializado, não faz nada
      if (!mapRef.current) {
        return;
      }
      // Move o centro do mapa para as coordenadas fornecidas e aplica o zoom (ou 14 se não informado)
      mapRef.current.flyTo({ center: [lng, lat], zoom: zoom ?? 14, essential: true });
    },
    // Inicia o modo de desenho de polígono
    startDrawPolygon: () => {
      // Se o controle de desenho não existe, não faz nada
      if (!drawRef.current) return;
      try {
        // Altera o modo do MapboxDraw para 'draw_polygon', permitindo desenhar um novo polígono
        (drawRef.current as any).changeMode('draw_polygon');
      } catch (e) {
        // Ignora erros silenciosamente (ex: se o modo não existir)
      }
    },
    // Dá zoom in (aproxima) no mapa
    zoomIn: () => {
      // Se o mapa não existe, não faz nada
      if (!mapRef.current) return;
      // Aproxima o zoom do mapa com animação
      mapRef.current.zoomIn({ duration: 300 });
    },
    // Dá zoom out (afasta) no mapa
    zoomOut: () => {
      // Se o mapa não existe, não faz nada
      if (!mapRef.current) return;
      // Afasta o zoom do mapa com animação
      mapRef.current.zoomOut({ duration: 300 });
    },
    // Alterna entre modo tela cheia e normal
    toggleFullscreen: () => {
      // Se o mapa não existe, não faz nada
      if (!mapRef.current) return;
      // Obtém o elemento HTML do mapa
      const el = mapRef.current.getContainer();
      // Referência ao objeto document para fullscreen
      const doc: any = document;
      // Se não está em fullscreen, solicita fullscreen
      if (!document.fullscreenElement) {
        if ((el as any).requestFullscreen) (el as any).requestFullscreen();
      } else {
        // Se já está em fullscreen, sai do modo fullscreen
        if (doc.exitFullscreen) doc.exitFullscreen();
      }
    },
    // Entra no modo tela cheia
    enterFullscreen: () => {
      // Se o mapa não existe, não faz nada
      if (!mapRef.current) return;
      // Obtém o elemento HTML do mapa
      const el = mapRef.current.getContainer();
      // Se não está em fullscreen, solicita fullscreen
      if (!document.fullscreenElement) {
        if ((el as any).requestFullscreen) (el as any).requestFullscreen();
      }
    },
    // Sai do modo tela cheia
    exitFullscreen: () => {
      // Referência ao objeto document para fullscreen
      const doc: any = document;
      // Se está em fullscreen, sai do modo fullscreen
      if (document.fullscreenElement) {
        if (doc.exitFullscreen) doc.exitFullscreen();
      }
    },
    // Ajusta o mapa para enquadrar todos os desenhos atuais
    fitToDrawings: () => {
      // Se o mapa não existe, não faz nada
      if (!mapRef.current) return;
      // Obtém todos os desenhos atuais (GeoJSON)
      const data = drawRef.current?.getAll() ?? emptyCollection;
      // Se há desenhos, ajusta o mapa para enquadrar todos
      if (data.features.length) {
        fitToCollection(mapRef.current, data);
      } else {
        // Se não há desenhos, volta para o centro e zoom iniciais
        mapRef.current.flyTo({ center: initialCenterRef.current as any, zoom: initialZoomRef.current, essential: true });
      }
    },
    // Retorna todos os dados desenhados no mapa (GeoJSON FeatureCollection)
    getDrawData: () => {
      // Se o controle de desenho não existe, retorna coleção vazia
      if (!drawRef.current) {
        return emptyCollection;
      }
      // Retorna todos os desenhos atuais, garantindo que todas as propriedades customizadas sejam exportadas
      try {
        const all = drawRef.current.getAll();
        all.features = all.features.map((f: any) => {
          const props = f.properties || {};
          
          // Ensure all custom styling properties are preserved for export
          // Fill properties
          if (props.fillColor) {
            if (!props.fillRgb) {
              const hex = (props.fillColor || '#ffffff').replace('#','');
              const r = parseInt(hex.substring(0,2),16) || 255;
              const g = parseInt(hex.substring(2,4),16) || 255;
              const b = parseInt(hex.substring(4,6),16) || 255;
              props.fillRgb = `${r},${g},${b}`;
            }
          }
          
          // Stroke properties - ensure they're preserved
          // (strokeColor and strokeWidth are already set by changeSelectedStroke)
          
          f.properties = props;
          return f;
        });
        return all;
      } catch (err) {
        return drawRef.current.getAll();
      }
    },
    // Carrega um GeoJSON no mapa, substituindo os desenhos atuais. Pode ajustar o zoom automaticamente
    loadGeoJson: (collection, options) => {
      // Se o mapa ou controle de desenho não existem, não faz nada
      if (!mapRef.current || !drawRef.current) {
        return;
      }
      
      // Ensure all features have their custom properties preserved when loading
      const processedCollection = {
        ...collection,
        features: collection.features.map((f: any) => {
          // Preserve all existing properties including custom styling
          const props = f.properties || {};
          return {
            ...f,
            properties: props
          };
        })
      };
      
      // Define os novos desenhos no controle de desenho
      drawRef.current.set(processedCollection);
      // Se fitBounds não for false, ajusta o mapa para enquadrar os desenhos
      if (options?.fitBounds !== false) {
        fitToCollection(mapRef.current, processedCollection);
      }
      // Atualiza/insere rótulos de coordenadas para o GeoJSON carregado
      try {
        upsertCoordinateLabels(mapRef.current, processedCollection);
      } catch (e) {
        // ignore
      }
      // Update custom colored layer to restore styling from imported JSON
      try {
        updateCustomColoredLayer(mapRef.current, processedCollection.features);
        console.log('[MapboxMap] Restored custom styling from imported JSON');
      } catch (e) {
        // ignore
      }
      // Dispara callback de mudança, se existir
      onDrawChangeRef.current?.(drawRef.current.getAll());
    },
    // Remove todos os desenhos do mapa
    clearDrawings: () => {
      // Se o controle de desenho não existe, não faz nada
      if (!drawRef.current) {
        return;
      }
      // Remove todos os desenhos
      drawRef.current.deleteAll();
      // Dispara callback de mudança, se existir
      const data = drawRef.current.getAll();
      onDrawChangeRef.current?.(data);
      // Clear custom colored layer (this also handles coordinate labels)
      try { if (mapRef.current) updateCustomColoredLayer(mapRef.current, []); } catch (e) { /* ignore */ }
    },
    // Exclui o(s) desenho(s) selecionado(s)
    deleteSelected: () => {
      // Se o controle de desenho não existe, não faz nada
      if (!drawRef.current) return;
      // Obtém a instância do controle de desenho
      const draw: any = drawRef.current as any;
      // Obtém os IDs dos desenhos selecionados
      const ids: string[] = typeof draw.getSelectedIds === 'function' ? draw.getSelectedIds() : [];
      // Se há IDs selecionados
      if (Array.isArray(ids) && ids.length > 0) {
        // Se existe método delete, usa para remover os desenhos selecionados
        if (typeof draw.delete === 'function') {
          draw.delete(ids);
        } else if (typeof draw.trash === 'function') {
          // Fallback para método trash (caso delete não exista)
          draw.trash();
        }
        // Dispara callback de mudança, se existir
        const data = drawRef.current.getAll();
        onDrawChangeRef.current?.(data);
        // Update custom colored layer (this also handles coordinate labels)
        try { if (mapRef.current) updateCustomColoredLayer(mapRef.current, data.features); } catch (e) { /* ignore */ }
      }
    },
    changeSelectedFill: (color: string, opacity?: number) => {
      console.log('[MapboxMap] changeSelectedFill called', { color, opacity });
      if (!drawRef.current) {
        console.log('[MapboxMap] changeSelectedFill: no drawRef');
        return;
      }
      try {
        const draw: any = drawRef.current as any;
        const ids: string[] = typeof draw.getSelectedIds === 'function' ? draw.getSelectedIds() : [];
        console.log('[MapboxMap] selected ids:', ids);
        if (!Array.isArray(ids) || ids.length === 0) {
          console.log('[MapboxMap] changeSelectedFill: no selected features');
          return;
        }
        ids.forEach((id) => {
          // set properties on feature
          const f = draw.get(id);
          console.log('[MapboxMap] before feature props for', id, f?.properties);
          if (!f) {
            console.log('[MapboxMap] feature not found for id', id);
            return;
          }
          if (!f.properties) f.properties = {};
          f.properties.fillColor = color;
          if (typeof opacity === 'number') f.properties.fillOpacity = opacity;
          const hex = (color || '#ffffff').replace('#','');
          const r = parseInt(hex.substring(0,2),16) || 255;
          const g = parseInt(hex.substring(2,4),16) || 255;
          const b = parseInt(hex.substring(4,6),16) || 255;
          f.properties.fillRgb = `${r},${g},${b}`;

          // persist properties back to the store
          if (typeof draw.setFeatureProperty === 'function') {
            console.log('[MapboxMap] using setFeatureProperty for', id);
            // set commonly used properties so MapboxDraw triggers change
            try {
              draw.setFeatureProperty(id, 'fillColor', f.properties.fillColor);
              draw.setFeatureProperty(id, 'fillOpacity', f.properties.fillOpacity);
              draw.setFeatureProperty(id, 'fillRgb', f.properties.fillRgb);
            } catch (err:any) {
              console.error('[MapboxMap] error calling setFeatureProperty', err);
            }
          } else {
            console.log('[MapboxMap] setFeatureProperty not available for', id);
          }

          // Force visual update: replace feature (delete + add)
          // This is done even when setFeatureProperty exists because some builds
          // of MapboxDraw don't refresh styles based on feature props.
          try {
            console.log('[MapboxMap] forcing replace feature for', id);
            // ensure feature retains same id when added
            const toAdd = { ...f, id } as any;
            draw.delete(id);
            draw.add(toAdd);
          } catch (err:any) {
            console.error('[MapboxMap] error forcing replace feature', err);
          }

          // read back feature to confirm
          try {
            const after = draw.get(id);
            console.log('[MapboxMap] after feature props for', id, after?.properties);
          } catch (err:any) {
            console.error('[MapboxMap] error reading feature after update', err);
          }
        });
        // Reselect the updated features to preserve UI selection
        try {
          if (typeof (draw as any).changeMode === 'function') {
            console.log('[MapboxMap] reselecting features', ids);
            try {
              (draw as any).changeMode('simple_select', { featureIds: ids });
            } catch (err:any) {
              console.error('[MapboxMap] error reselecting features with changeMode', err);
            }
          }
        } catch (err:any) {
          console.error('[MapboxMap] error while attempting to reselect features', err);
        }
        // emit changes
        const data = drawRef.current.getAll();
        console.log('[MapboxMap] emitting draw change, features length:', data.features?.length);
        onDrawChangeRef.current?.(data);

        // Update custom colored layer to show polygons with their assigned colors
        try {
          const map = mapRef.current as mapboxgl.Map | null;
          if (map) {
            updateCustomColoredLayer(map, data.features);
            console.log('[MapboxMap] Successfully updated custom styled layers');
          } else {
            console.log('[MapboxMap] No map instance available for custom layer update');
          }
        } catch (err: any) {
          console.error('[MapboxMap] Error updating custom styled layers:', err);
        }
      } catch (err:any) {
        console.error('[MapboxMap] changeSelectedFill caught error', err);
      }
    },
    changeSelectedStroke: (color: string, width?: number) => {
      console.log('[MapboxMap] changeSelectedStroke called', { color, width });
      if (!drawRef.current) {
        console.log('[MapboxMap] changeSelectedStroke: no drawRef');
        return;
      }
      try {
        const draw: any = drawRef.current as any;
        const ids: string[] = typeof draw.getSelectedIds === 'function' ? draw.getSelectedIds() : [];
        console.log('[MapboxMap] selected ids for stroke:', ids);
        if (!Array.isArray(ids) || ids.length === 0) {
          console.log('[MapboxMap] changeSelectedStroke: no selected features');
          return;
        }
        ids.forEach((id) => {
          const f = draw.get(id);
          console.log('[MapboxMap] before stroke props for', id, f?.properties);
          if (!f) {
            console.log('[MapboxMap] feature not found for stroke id', id);
            return;
          }
          if (!f.properties) f.properties = {};
          f.properties.strokeColor = color;
          if (typeof width === 'number') f.properties.strokeWidth = width;

          // persist stroke properties
          if (typeof draw.setFeatureProperty === 'function') {
            console.log('[MapboxMap] using setFeatureProperty for stroke', id);
            try {
              draw.setFeatureProperty(id, 'strokeColor', f.properties.strokeColor);
              if (typeof width === 'number') draw.setFeatureProperty(id, 'strokeWidth', f.properties.strokeWidth);
            } catch (err:any) {
              console.error('[MapboxMap] error calling setFeatureProperty for stroke', err);
            }
          }

          // Force visual update
          try {
            console.log('[MapboxMap] forcing replace feature for stroke', id);
            const toAdd = { ...f, id } as any;
            draw.delete(id);
            draw.add(toAdd);
          } catch (err:any) {
            console.error('[MapboxMap] error forcing replace feature for stroke', err);
          }

          try {
            const after = draw.get(id);
            console.log('[MapboxMap] after stroke props for', id, after?.properties);
          } catch (err:any) {
            console.error('[MapboxMap] error reading feature after stroke update', err);
          }
        });
        
        // Reselect features
        try {
          if (typeof (draw as any).changeMode === 'function') {
            console.log('[MapboxMap] reselecting features after stroke', ids);
            try {
              (draw as any).changeMode('simple_select', { featureIds: ids });
            } catch (err:any) {
              console.error('[MapboxMap] error reselecting features after stroke', err);
            }
          }
        } catch (err:any) {
          console.error('[MapboxMap] error while attempting to reselect features after stroke', err);
        }
        
        // emit changes and update custom layers
        const data = drawRef.current.getAll();
        console.log('[MapboxMap] emitting draw change after stroke, features length:', data.features?.length);
        onDrawChangeRef.current?.(data);

        try {
          const map = mapRef.current as mapboxgl.Map | null;
          if (map) {
            updateCustomColoredLayer(map, data.features);
            console.log('[MapboxMap] Successfully updated custom styled layers after stroke');
          }
        } catch (err: any) {
          console.error('[MapboxMap] Error updating custom styled layers after stroke:', err);
        }
      } catch (err:any) {
        console.error('[MapboxMap] changeSelectedStroke caught error', err);
      }
    },
    applyFillToAll: (color: string, opacity?: number) => {
      console.log('[MapboxMap] applyFillToAll called', { color, opacity });
      if (!drawRef.current) {
        console.log('[MapboxMap] applyFillToAll: no drawRef');
        return;
      }
      try {
        const draw: any = drawRef.current as any;
        const data = draw.getAll();
        const polygonFeatures = data.features.filter((f: any) => 
          f.geometry && (f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon')
        );
        
        console.log('[MapboxMap] applying fill to', polygonFeatures.length, 'polygons');
        
        polygonFeatures.forEach((f: any) => {
          if (!f.properties) f.properties = {};
          f.properties.fillColor = color;
          if (typeof opacity === 'number') f.properties.fillOpacity = opacity;
          const hex = (color || '#ffffff').replace('#','');
          const r = parseInt(hex.substring(0,2),16) || 255;
          const g = parseInt(hex.substring(2,4),16) || 255;
          const b = parseInt(hex.substring(4,6),16) || 255;
          f.properties.fillRgb = `${r},${g},${b}`;
          
          // Force update
          try {
            const toAdd = { ...f, id: f.id } as any;
            draw.delete(f.id);
            draw.add(toAdd);
          } catch (err:any) {
            console.error('[MapboxMap] error replacing feature in applyFillToAll', err);
          }
        });
        
        // emit changes and update custom layers
        const updatedData = drawRef.current.getAll();
        console.log('[MapboxMap] emitting draw change after applyFillToAll, features length:', updatedData.features?.length);
        onDrawChangeRef.current?.(updatedData);

        try {
          const map = mapRef.current as mapboxgl.Map | null;
          if (map) {
            updateCustomColoredLayer(map, updatedData.features);
            console.log('[MapboxMap] Successfully updated custom styled layers after applyFillToAll');
          }
        } catch (err: any) {
          console.error('[MapboxMap] Error updating custom styled layers after applyFillToAll:', err);
        }
      } catch (err:any) {
        console.error('[MapboxMap] applyFillToAll caught error', err);
      }
    },
    applyStrokeToAll: (color: string, width?: number) => {
      console.log('[MapboxMap] applyStrokeToAll called', { color, width });
      if (!drawRef.current) {
        console.log('[MapboxMap] applyStrokeToAll: no drawRef');
        return;
      }
      try {
        const draw: any = drawRef.current as any;
        const data = draw.getAll();
        const polygonFeatures = data.features.filter((f: any) => 
          f.geometry && (f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon')
        );
        
        console.log('[MapboxMap] applying stroke to', polygonFeatures.length, 'polygons');
        
        polygonFeatures.forEach((f: any) => {
          if (!f.properties) f.properties = {};
          f.properties.strokeColor = color;
          if (typeof width === 'number') f.properties.strokeWidth = width;
          
          // Force update
          try {
            const toAdd = { ...f, id: f.id } as any;
            draw.delete(f.id);
            draw.add(toAdd);
          } catch (err:any) {
            console.error('[MapboxMap] error replacing feature in applyStrokeToAll', err);
          }
        });
        
        // emit changes and update custom layers
        const updatedData = drawRef.current.getAll();
        console.log('[MapboxMap] emitting draw change after applyStrokeToAll, features length:', updatedData.features?.length);
        onDrawChangeRef.current?.(updatedData);

        try {
          const map = mapRef.current as mapboxgl.Map | null;
          if (map) {
            updateCustomColoredLayer(map, updatedData.features);
            console.log('[MapboxMap] Successfully updated custom styled layers after applyStrokeToAll');
          }
        } catch (err: any) {
          console.error('[MapboxMap] Error updating custom styled layers after applyStrokeToAll:', err);
        }
      } catch (err:any) {
        console.error('[MapboxMap] applyStrokeToAll caught error', err);
      }
    },
    addTextToSelected: (text: string) => {
      console.log('[MapboxMap] addTextToSelected called', { text });
      if (!drawRef.current) {
        console.log('[MapboxMap] addTextToSelected: no drawRef');
        return;
      }
      try {
        const draw: any = drawRef.current as any;
        const ids: string[] = typeof draw.getSelectedIds === 'function' ? draw.getSelectedIds() : [];
        console.log('[MapboxMap] selected ids for text:', ids);
        if (!Array.isArray(ids) || ids.length === 0) {
          console.log('[MapboxMap] addTextToSelected: no selected features');
          return;
        }
        
        ids.forEach((id) => {
          const f = draw.get(id);
          if (!f) {
            console.log('[MapboxMap] feature not found for text id', id);
            return;
          }
          if (!f.properties) f.properties = {};
          f.properties.labelText = text;
          
          // Force update
          try {
            const toAdd = { ...f, id } as any;
            draw.delete(id);
            draw.add(toAdd);
          } catch (err:any) {
            console.error('[MapboxMap] error forcing replace feature for text', err);
          }
        });
        
        // emit changes and update custom layers
        const data = drawRef.current.getAll();
        console.log('[MapboxMap] emitting draw change after addText, features length:', data.features?.length);
        onDrawChangeRef.current?.(data);

        try {
          const map = mapRef.current as mapboxgl.Map | null;
          if (map) {
            updateCustomColoredLayer(map, data.features);
            console.log('[MapboxMap] Successfully updated custom layers after addText');
          }
        } catch (err: any) {
          console.error('[MapboxMap] Error updating custom layers after addText:', err);
        }
      } catch (err:any) {
        console.error('[MapboxMap] addTextToSelected caught error', err);
      }
    },
    removeTextFromSelected: () => {
      console.log('[MapboxMap] removeTextFromSelected called');
      if (!drawRef.current) {
        console.log('[MapboxMap] removeTextFromSelected: no drawRef');
        return;
      }
      try {
        const draw: any = drawRef.current as any;
        const ids: string[] = typeof draw.getSelectedIds === 'function' ? draw.getSelectedIds() : [];
        console.log('[MapboxMap] selected ids for text removal:', ids);
        if (!Array.isArray(ids) || ids.length === 0) {
          console.log('[MapboxMap] removeTextFromSelected: no selected features');
          return;
        }
        
        ids.forEach((id) => {
          const f = draw.get(id);
          if (!f) {
            console.log('[MapboxMap] feature not found for text removal id', id);
            return;
          }
          if (f.properties) {
            delete f.properties.labelText;
          }
          
          // Force update
          try {
            const toAdd = { ...f, id } as any;
            draw.delete(id);
            draw.add(toAdd);
          } catch (err:any) {
            console.error('[MapboxMap] error forcing replace feature for text removal', err);
          }
        });
        
        // emit changes and update custom layers
        const data = drawRef.current.getAll();
        console.log('[MapboxMap] emitting draw change after removeText, features length:', data.features?.length);
        onDrawChangeRef.current?.(data);

        try {
          const map = mapRef.current as mapboxgl.Map | null;
          if (map) {
            updateCustomColoredLayer(map, data.features);
            console.log('[MapboxMap] Successfully updated custom layers after removeText');
          }
        } catch (err: any) {
          console.error('[MapboxMap] Error updating custom layers after removeText:', err);
        }
      } catch (err:any) {
        console.error('[MapboxMap] removeTextFromSelected caught error', err);
      }
    },
  }));

  // ===============================
  // Custom colored polygons layer management
  // ===============================
  
  // Create or update custom layers to display polygons with their assigned colors and strokes
  const updateCustomColoredLayer = (map: mapboxgl.Map, features: Feature[]) => {
    const fillSourceId = 'custom-colored-polygons';
    const fillLayerId = 'custom-colored-polygons-layer';
    const strokeSourceId = 'custom-stroked-polygons';
    const strokeLayerId = 'custom-stroked-polygons-layer';
    
    try {
      // Filter polygon features that have custom fill colors
      const coloredFeatures = features.filter(f => 
        f?.properties?.fillColor && 
        f.geometry && 
        (f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon')
      );
      
      // Filter polygon features that have custom stroke properties
      const strokedFeatures = features.filter(f => 
        (f?.properties?.strokeColor || f?.properties?.strokeWidth) && 
        f.geometry && 
        (f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon')
      );
      
      // Handle fill layer
      if (map.getLayer(fillLayerId)) map.removeLayer(fillLayerId);
      if (map.getSource(fillSourceId)) map.removeSource(fillSourceId);
      
      if (coloredFeatures.length > 0) {
        const fillFeatureCollection: FeatureCollection = {
          type: 'FeatureCollection',
          features: coloredFeatures
        };
        
        map.addSource(fillSourceId, {
          type: 'geojson',
          data: fillFeatureCollection
        });
        
        map.addLayer({
          id: fillLayerId,
          type: 'fill',
          source: fillSourceId,
          paint: {
            'fill-color': ['coalesce', ['get', 'fillColor'], '#ffffff'],
            'fill-opacity': ['coalesce', ['get', 'fillOpacity'], 0.2]
          }
        });
        
        console.log('[MapboxMap] Updated custom fill layer with', coloredFeatures.length, 'features');
      }
      
      // Handle stroke layer
      if (map.getLayer(strokeLayerId)) map.removeLayer(strokeLayerId);
      if (map.getSource(strokeSourceId)) map.removeSource(strokeSourceId);
      
      if (strokedFeatures.length > 0) {
        const strokeFeatureCollection: FeatureCollection = {
          type: 'FeatureCollection',
          features: strokedFeatures
        };
        
        map.addSource(strokeSourceId, {
          type: 'geojson',
          data: strokeFeatureCollection
        });
        
        map.addLayer({
          id: strokeLayerId,
          type: 'line',
          source: strokeSourceId,
          paint: {
            'line-color': ['coalesce', ['get', 'strokeColor'], '#ffffff'],
            'line-width': ['coalesce', ['get', 'strokeWidth'], 2],
            'line-opacity': 1
          },
          layout: {
            'line-cap': 'round',
            'line-join': 'round'
          }
        });
        
        console.log('[MapboxMap] Updated custom stroke layer with', strokedFeatures.length, 'features');
      }
      
      // Ensure coordinate labels are present before adding text labels
      // This guarantees text labels added below will be placed above the polygon layers
      try {
        const allData = { type: 'FeatureCollection', features } as FeatureCollection;
        upsertCoordinateLabels(map, allData);
        console.log('[MapboxMap] Upserted coordinate labels before adding text labels');
      } catch (err: any) {
        console.error('[MapboxMap] Error upserting coordinate labels before text labels:', err);
      }
      
      if (coloredFeatures.length === 0 && strokedFeatures.length === 0) {
        console.log('[MapboxMap] No custom styled features to display');
      }
      
      // Handle text labels layer
      const textSourceId = 'custom-text-labels';
      const textLayerId = 'custom-text-labels-layer';
      
      try {
        // Filter polygon features that have custom text
        const textFeatures = features.filter(f => 
          f?.properties?.labelText && 
          f.geometry && 
          (f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon')
        ).map(f => {
          // Calculate centroid for text placement
          let centroid: [number, number] | null = null;
          
          if (f.geometry.type === 'Polygon') {
            centroid = calculatePolygonCentroid(f.geometry.coordinates as number[][][]);
          } else if (f.geometry.type === 'MultiPolygon') {
            // For MultiPolygon, use the centroid of the first polygon
            const firstPolygon = (f.geometry.coordinates as number[][][][])[0];
            if (firstPolygon) {
              centroid = calculatePolygonCentroid(firstPolygon);
            }
          }
          
          if (!centroid) return null;
          
          return {
            type: 'Feature' as const,
            id: `text-${f.id}`,
            properties: {
              labelText: f.properties?.labelText,
              originalId: f.id
            },
            geometry: {
              type: 'Point' as const,
              coordinates: centroid
            }
          };
        }).filter(Boolean);
        
        // Remove existing text layer
        if (map.getLayer(textLayerId)) map.removeLayer(textLayerId);
        if (map.getSource(textSourceId)) map.removeSource(textSourceId);
        
        if (textFeatures.length > 0) {
          const textFeatureCollection: FeatureCollection = {
            type: 'FeatureCollection',
            features: textFeatures as any[]
          };
          
          map.addSource(textSourceId, {
            type: 'geojson',
            data: textFeatureCollection
          });
          
          map.addLayer({
            id: textLayerId,
            type: 'symbol',
            source: textSourceId,
            layout: {
              'text-field': ['get', 'labelText'],
              'text-size': 14,
              'text-anchor': 'center',
              'text-allow-overlap': true,
              'text-ignore-placement': true
            },
            paint: {
              'text-color': '#000000',
              'text-halo-color': '#ffffff',
              'text-halo-width': 2,
              'text-halo-blur': 1
            }
          });
          // Ensure the text layer is above other layers (move to top)
          try {
            if (map.moveLayer) {
              // calling moveLayer without a second argument moves the layer to the top
              map.moveLayer(textLayerId);
              console.log('[MapboxMap] Moved text layer to top');
            }
          } catch (err: any) {
            console.warn('[MapboxMap] Could not move text layer to top:', err);
          }
          
          console.log('[MapboxMap] Updated custom text layer with', textFeatures.length, 'labels');
        }
      } catch (err: any) {
        console.error('[MapboxMap] Error updating text labels:', err);
      }
      
      // (Coordinate labels already upserted before text layer creation)
    } catch (err: any) {
      console.error('[MapboxMap] Error updating custom styled layers:', err);
    }
  };

  return <StyledMapContainer ref={containerRef} />;
}
);

// ===============================
// Estilização do container do mapa
// ===============================
const StyledMapContainer = styled.div`
  width: 100%;
  height: 100%;
  min-height: 400px;
  position: relative;
`;


// Nome do componente para debug
MapboxMap.displayName = 'MapboxMap';


// ===============================
// Funções utilitárias auxiliares
// ===============================

// Ajusta o mapa para enquadrar todos os desenhos de um FeatureCollection
function fitToCollection(map: mapboxgl.Map, collection: FeatureCollection) {
  if (!collection.features.length) {
    return;
  }

  const firstCoordinate = getFirstCoordinate(collection.features[0]);
  if (!firstCoordinate) {
    return;
  }

  const bounds = new mapboxgl.LngLatBounds(firstCoordinate, firstCoordinate);

  for (const feature of collection.features) {
    extendBoundsWithFeature(bounds, feature);
  }

  map.fitBounds(bounds, { padding: 48, animate: true });
}


// Expande os limites do mapa para incluir a geometria de um Feature
function extendBoundsWithFeature(bounds: mapboxgl.LngLatBounds, feature: Feature) {
  if (!feature.geometry) {
    return;
  }

  extendBoundsWithGeometry(bounds, feature.geometry);
}


// Expande os limites do mapa para incluir qualquer tipo de geometria GeoJSON
// Expande os limites do mapa (bounds) para incluir qualquer tipo de geometria GeoJSON
function extendBoundsWithGeometry(bounds: mapboxgl.LngLatBounds, geometry: Geometry) {
  // Verifica o tipo da geometria
  switch (geometry.type) {
    case 'Point':
      // Caso seja um ponto único: expande os bounds para incluir esse ponto
      bounds.extend(geometry.coordinates as [number, number]);
      break;
    case 'MultiPoint':
    case 'LineString':
      // Caso seja uma coleção de pontos ou uma linha: expande para cada coordenada
      for (const coordinate of geometry.coordinates as [number, number][]) {
        bounds.extend(coordinate);
      }
      break;
    case 'MultiLineString':
    case 'Polygon':
      // Caso seja uma coleção de linhas ou um polígono: expande para cada linha e cada coordenada
      for (const line of geometry.coordinates as [number, number][][]) {
        for (const coordinate of line) {
          bounds.extend(coordinate);
        }
      }
      break;
    case 'MultiPolygon':
      // Caso seja uma coleção de polígonos: expande para cada polígono, linha e coordenada
      for (const polygon of geometry.coordinates as [number, number][][][]) {
        for (const line of polygon) {
          for (const coordinate of line) {
            bounds.extend(coordinate);
          }
        }
      }
      break;
    case 'GeometryCollection':
      // Caso seja uma coleção de geometrias: chama recursivamente para cada geometria filha
      if (geometry.geometries) {
        for (const child of geometry.geometries) {
          extendBoundsWithGeometry(bounds, child);
        }
      }
      break;
    default:
      // Para tipos desconhecidos, não faz nada
      break;
  }
}


// Busca a primeira coordenada encontrada em um Feature (usado para inicializar os bounds)
function getFirstCoordinate(feature: Feature): [number, number] | null {
  if (!feature.geometry) {
    return null;
  }

  return getCoordinateFromGeometry(feature.geometry);
}


// Busca recursivamente a primeira coordenada encontrada em uma geometria GeoJSON
// Busca recursivamente a primeira coordenada encontrada em uma geometria GeoJSON
function getCoordinateFromGeometry(geometry: Geometry): [number, number] | null {
  // Se for uma coleção de geometrias (GeometryCollection) e possui geometrias filhas
  if (geometry.type === 'GeometryCollection' && geometry.geometries) {
    // Percorre cada geometria filha
    for (const child of geometry.geometries) {
      // Chama recursivamente para buscar a coordenada na geometria filha
      const coordinate = getCoordinateFromGeometry(child);
      // Se encontrou uma coordenada, retorna imediatamente
      if (coordinate) {
        return coordinate;
      }
    }
    // Se não encontrou em nenhuma geometria filha, retorna null
    return null;
  }

  // Se a geometria possui a propriedade 'coordinates' (ex: Point, LineString, Polygon, etc.)
  if ('coordinates' in geometry) {
    // Busca a primeira coordenada válida dentro do array de coordenadas (pode ser aninhado)
    return findCoordinate(geometry.coordinates);
  }

  // Se não encontrou coordenada, retorna null
  return null;
}


// Calcula o centroide (ponto central) de um polígono
function calculatePolygonCentroid(coordinates: number[][][]): [number, number] | null {
  if (!coordinates || coordinates.length === 0) return null;
  
  // Pega apenas o anel externo (primeiro array)
  const ring = coordinates[0];
  if (!ring || ring.length === 0) return null;
  
  let totalX = 0;
  let totalY = 0;
  let pointCount = 0;
  
  // Calcula a média das coordenadas (centroide simples)
  for (const point of ring) {
    if (point && point.length >= 2) {
      totalX += point[0]; // longitude
      totalY += point[1]; // latitude
      pointCount++;
    }
  }
  
  if (pointCount === 0) return null;
  
  return [totalX / pointCount, totalY / pointCount];
}

// Busca recursivamente a primeira coordenada [lng, lat] em um array de coordenadas aninhado
// Busca recursivamente a primeira coordenada [lng, lat] em um array de coordenadas aninhado
function findCoordinate(value: unknown): [number, number] | null {
  // Se o valor não for um array, não pode ser uma coordenada válida
  if (!Array.isArray(value)) {
    return null;
  }

  // Se o array tem pelo menos dois elementos numéricos, considera como coordenada [lng, lat]
  if (typeof value[0] === 'number' && typeof value[1] === 'number') {
    return value as [number, number];
  }

  // Se não for um par de números, percorre recursivamente cada item do array
  for (const item of value) {
    // Chama recursivamente para buscar coordenada em arrays aninhados
    const coord = findCoordinate(item);
    // Se encontrou uma coordenada, retorna imediatamente
    if (coord) {
      return coord;
    }
  }

  // Se não encontrou nenhuma coordenada válida, retorna null
  return null;
}

export default MapboxMap;

// ===============================
// Helpers: extrair vértices (extremidades) e gerenciar camada de rótulos
// ===============================

/**
 * Extrai todos os vértices (extremidades) [lng, lat] de um FeatureCollection.
 * Para polígonos, inclui todos os vértices dos anéis; para linhas, todos os pontos da linha.
 */
type VertEntry = { coord: [number, number]; angle: number };

function extractVertexEntriesFromFeatureCollection(collection: FeatureCollection): VertEntry[] {
  const entries: VertEntry[] = [];
  for (const feature of collection.features) {
    if (!feature.geometry) continue;
    collectVertexEntriesFromGeometry(feature.geometry, entries);
  }
  // deduplicate by rounded coords (6 decimals)
  const seen = new Set<string>();
  const unique: VertEntry[] = [];
  for (const e of entries) {
    const key = `${e.coord[0].toFixed(6)}|${e.coord[1].toFixed(6)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(e);
  }
  return unique;
}

function collectVertexEntriesFromGeometry(geometry: Geometry, out: VertEntry[]) {
  switch (geometry.type) {
    case 'Point': {
      const p = geometry.coordinates as [number, number];
      out.push({ coord: p, angle: 0 });
      break;
    }
    case 'MultiPoint':
    case 'LineString': {
      const coords = geometry.coordinates as [number, number][];
      for (let i = 0; i < coords.length; i++) {
        const prev = i > 0 ? coords[i - 1] : null;
        const next = i + 1 < coords.length ? coords[i + 1] : null;
        const angle = computeVertexAngle(coords[i], prev, next);
        out.push({ coord: coords[i], angle });
      }
      break;
    }
    case 'MultiLineString': {
      for (const line of geometry.coordinates as [number, number][][]) {
        for (let i = 0; i < line.length; i++) {
          const prev = i > 0 ? line[i - 1] : null;
          const next = i + 1 < line.length ? line[i + 1] : null;
          const angle = computeVertexAngle(line[i], prev, next);
          out.push({ coord: line[i], angle });
        }
      }
      break;
    }
    case 'Polygon': {
      // Only include outer ring (index 0) to ignore holes
      const rings = geometry.coordinates as [number, number][][];
      if (rings.length > 0) {
        const ring = rings[0];
        for (let i = 0; i < ring.length; i++) {
          const prev = i > 0 ? ring[i - 1] : ring[ring.length - 2] ?? ring[ring.length - 1];
          const next = ring[(i + 1) % ring.length];
          const angle = computeVertexAngle(ring[i], prev, next);
          out.push({ coord: ring[i], angle });
        }
      }
      break;
    }
    case 'MultiPolygon': {
      for (const polygon of geometry.coordinates as [number, number][][][]) {
        if (polygon.length === 0) continue;
        const ring = polygon[0];
        for (let i = 0; i < ring.length; i++) {
          const prev = i > 0 ? ring[i - 1] : ring[ring.length - 2] ?? ring[ring.length - 1];
          const next = ring[(i + 1) % ring.length];
          const angle = computeVertexAngle(ring[i], prev, next);
          out.push({ coord: ring[i], angle });
        }
      }
      break;
    }
    case 'GeometryCollection':
      if (geometry.geometries) for (const g of geometry.geometries) collectVertexEntriesFromGeometry(g, out);
      break;
    default:
      break;
  }
}

function computeVertexAngle(curr: [number, number], prev: [number, number] | null, next: [number, number] | null): number {
  // Prefer vector to next; if not available, use vector from prev to curr
  let dx = 0;
  let dy = 0;
  if (next) {
    dx = next[0] - curr[0];
    dy = next[1] - curr[1];
  } else if (prev) {
    dx = curr[0] - prev[0];
    dy = curr[1] - prev[1];
  }
  const rad = Math.atan2(dy, dx);
  const deg = (rad * 180) / Math.PI;
  return deg;
}

function buildPointFeaturesFromVertices(entries: VertEntry[]): FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: entries.map((e, idx) => ({
      type: 'Feature',
      id: `vertex-label-${idx}`,
      properties: { label: `${e.coord[1].toFixed(6)}, ${e.coord[0].toFixed(6)}`, angle: e.angle },
      geometry: { type: 'Point', coordinates: e.coord }
    }))
  };
}

/**
 * Cria ou atualiza uma fonte e camada de símbolo com rótulos posicionados em cada vértice (extremidade).
 * Os rótulos são forçados a aparecer (sobreposição) e escalam com o zoom via expressão.
 */
function upsertCoordinateLabels(map: mapboxgl.Map, collection: FeatureCollection) {
  const entries = extractVertexEntriesFromFeatureCollection(collection);

  const prefix = 'coord-labels';

  // Remove camadas e fontes antigas que usam o prefixo
  const oldLayerIds = [0,1,2,3].map(i => `${prefix}-layer-${i}`);
  const oldSourceIds = [0,1,2,3].map(i => `${prefix}-source-${i}`);
  for (const lid of oldLayerIds) {
    if (map.getLayer(lid)) map.removeLayer(lid);
  }
  for (const sid of oldSourceIds) {
    if (map.getSource(sid)) map.removeSource(sid);
  }

  if (!entries.length) return;

  // Tiers: cada tier tem um minzoom e tamanho de célula em graus para amostragem espacial
  // as células maiores no zoom menor garantem apenas 1 label por região ampla
  const tiers = [
    { id: 0, minzoom: 0, cellDeg: 0.06, textSizeRange: [8,10] },   // muito grosseiro
    { id: 1, minzoom: 8, cellDeg: 0.02, textSizeRange: [9,12] },   // médio
    { id: 2, minzoom: 12, cellDeg: 0.005, textSizeRange: [11,14] },// fino
    { id: 3, minzoom: 14, cellDeg: 0.0015, textSizeRange: [13,16] },// quase todos
  ];

  function sampleByGrid(entries: VertEntry[], cellDeg: number) {
    const seen = new Map<string, VertEntry>();
    for (const e of entries) {
      // chave da célula: floor(lon/cellDeg)|floor(lat/cellDeg)
      const kx = Math.floor(e.coord[0] / cellDeg);
      const ky = Math.floor(e.coord[1] / cellDeg);
      const key = `${kx}|${ky}`;
      if (!seen.has(key)) seen.set(key, e);
      else {
        // opcional: escolher o vértice mais central na célula (mantém o primeiro por simplicidade)
      }
    }
    return Array.from(seen.values());
  }

  // Para cada tier, cria uma fonte com pontos amostrados espacialmente e uma camada com minzoom
  for (const tier of tiers) {
    const sampled = sampleByGrid(entries, tier.cellDeg);
    if (!sampled.length) continue;

    const fc = buildPointFeaturesFromVertices(sampled);
    const sourceId = `${prefix}-source-${tier.id}`;
    const layerId = `${prefix}-layer-${tier.id}`;

    map.addSource(sourceId, { type: 'geojson', data: fc as any });

    // Position coordinate labels as the topmost layer to ensure they appear above all custom styled layers
    let beforeLayer = undefined;
    try {
      // We don't set beforeLayer, which will add coordinate labels as the topmost layer
      // This ensures they appear above all custom fill and stroke layers
    } catch (e) {
      // ignore layer ordering errors
    }

    map.addLayer({
      id: layerId,
      type: 'symbol',
      source: sourceId,
      minzoom: tier.minzoom,
      layout: {
        'text-field': ['get', 'label'],
        // escalonamento simples por zoom; camada já controla quando aparece
        'text-size': ['interpolate', ['linear'], ['zoom'], tier.minzoom, tier.textSizeRange[0], tier.minzoom + 4, tier.textSizeRange[1]],
        'text-offset': [0, 1.0],
        'text-anchor': 'top',
        'text-rotate': ['get', 'angle'],
        // lower-density tiers should avoid overlap; only the closest tier allows overlap
        'text-allow-overlap': tier.id >= 3 ? true : false,
        'text-ignore-placement': tier.id >= 3 ? true : false
      },
      paint: {
        'text-color': '#0f172a',
        'text-halo-color': '#ffffff',
        'text-halo-width': 2,
        'text-halo-blur': 1
      }
    }, beforeLayer);
  }

  // After all coordinate label layers are added, ensure custom layers are below them
  // by moving custom layers below the lowest tier coordinate layer
  try {
    const customLayerIds = ['custom-colored-polygons-layer', 'custom-stroked-polygons-layer'];
    const firstCoordLayer = `${prefix}-layer-0`;
    
    for (const customLayerId of customLayerIds) {
      if (map.getLayer(customLayerId) && map.getLayer(firstCoordLayer)) {
        try {
          map.moveLayer(customLayerId, firstCoordLayer);
          console.log(`[MapboxMap] Moved ${customLayerId} below coordinate layers`);
        } catch (e) {
          // Ignore if layer movement fails
        }
      }
    }
  } catch (e) {
    // Ignore layer reordering errors
  }
}
