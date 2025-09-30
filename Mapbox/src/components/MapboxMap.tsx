
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
      // Se o estilo corresponde ao preenchimento de polígono inativo,
      // substitui a cor de preenchimento pelo valor fornecido
      if (style.id === 'gl-draw-polygon-fill-inactive') {
        return { ...style, paint: { ...style.paint, 'fill-color': fill } };
      }
      // Se o estilo corresponde ao preenchimento de polígono ativo (selecionado),
      // também substitui a cor de preenchimento
      if (style.id === 'gl-draw-polygon-fill-active') {
        return { ...style, paint: { ...style.paint, 'fill-color': fill } };
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
        if (style.id === 'gl-draw-polygon-fill-inactive') {
          return { ...style, paint: { ...style.paint, 'fill-color': fill } };
        }
        if (style.id === 'gl-draw-polygon-fill-active') {
          return { ...style, paint: { ...style.paint, 'fill-color': fill } };
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

        // Função chamada quando o mapa termina de carregar (evento 'load')
        const handleMapLoad = () => {
          // Se houver dados iniciais, carrega no controle de desenho e ajusta o zoom
          const data = initialDataRef.current;
          if (data && data.features.length) {
            draw.set(data);
            fitToCollection(map, data);
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
      // Retorna todos os desenhos atuais
      return drawRef.current.getAll();
    },
    // Carrega um GeoJSON no mapa, substituindo os desenhos atuais. Pode ajustar o zoom automaticamente
    loadGeoJson: (collection, options) => {
      // Se o mapa ou controle de desenho não existem, não faz nada
      if (!mapRef.current || !drawRef.current) {
        return;
      }
      // Define os novos desenhos no controle de desenho
      drawRef.current.set(collection);
      // Se fitBounds não for false, ajusta o mapa para enquadrar os desenhos
      if (options?.fitBounds !== false) {
        fitToCollection(mapRef.current, collection);
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
      onDrawChangeRef.current?.(drawRef.current.getAll());
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
        onDrawChangeRef.current?.(drawRef.current.getAll());
      }
    },
  }));

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
