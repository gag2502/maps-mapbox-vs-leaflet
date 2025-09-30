
// Hooks do React e tipos
import { forwardRef, useEffect, useImperativeHandle, useRef, type Ref } from 'react';
// Estilização
import styled from 'styled-components';
// Biblioteca principal do Leaflet
import L from 'leaflet';
// CSS do Leaflet
import 'leaflet/dist/leaflet.css';
// Tipo para coleções GeoJSON
import type { FeatureCollection } from 'geojson';


// Métodos expostos para manipulação externa do mapa
export type LeafletMapHandle = {
  flyTo: (options: { lng: number; lat: number; zoom?: number }) => void; // Move o mapa para uma coordenada
  getDrawData: () => FeatureCollection; // Retorna os dados desenhados (GeoJSON)
  loadGeoJson: (collection: FeatureCollection, options?: { fitBounds?: boolean }) => void; // Carrega GeoJSON no mapa
  clearDrawings: () => void; // Limpa todos os desenhos
  startDrawPolygon: () => void; // Inicia modo de desenho de polígono
  zoomIn: () => void; // Dá zoom in
  zoomOut: () => void; // Dá zoom out
  fitToDrawings: () => void; // Ajusta o mapa para caber os desenhos
  deleteSelected: () => void; // Remove o desenho selecionado
};


// Propriedades aceitas pelo componente LeafletMap
export type LeafletMapProps = {
  initialCenter?: [number, number]; // Centro inicial do mapa
  initialZoom?: number; // Zoom inicial
  initialData?: FeatureCollection; // Dados GeoJSON iniciais
  onDrawChange?: (collection: FeatureCollection) => void; // Callback ao desenhar
  onMapLoad?: () => void; // Callback ao carregar o mapa
  onMapError?: (error: Error) => void; // Callback em erro
};


// Centro e zoom padrão (Brasília)
const defaultCenter: [number, number] = [-47.8825, -15.7942];
const defaultZoom = 12;
// FeatureCollection vazio
const emptyCollection: FeatureCollection = { type: 'FeatureCollection', features: [] };


// Componente principal do mapa Leaflet
const LeafletMap = forwardRef(function LeafletMap(
  { initialCenter, initialZoom, initialData, onDrawChange, onMapLoad, onMapError }: LeafletMapProps,
  ref: Ref<LeafletMapHandle>
) {
  // Referência para o container do mapa
  const containerRef = useRef<HTMLDivElement | null>(null);
  // Referência para a instância do mapa Leaflet
  const mapRef = useRef<L.Map | null>(null);
  // Grupo de camadas desenhadas
  const drawnItemsRef = useRef<L.FeatureGroup | null>(null);
  // Camada selecionada
  const selectedLayerRef = useRef<L.Layer | null>(null);
  // Dados iniciais
  const initialDataRef = useRef<FeatureCollection | undefined>(initialData);
  // Callback de mudança de desenho
  const onDrawChangeRef = useRef(onDrawChange);
  // Centro inicial
  const initialCenterRef = useRef<[number, number]>(initialCenter ?? defaultCenter);
  // Zoom inicial
  const initialZoomRef = useRef<number>(initialZoom ?? defaultZoom);

  // Função auxiliar: adiciona GeoJSON ao mapa
  function addGeoJsonToMap(geojson: FeatureCollection, fitBounds = true) {
    if (!mapRef.current || !drawnItemsRef.current) return;
    drawnItemsRef.current.clearLayers();
    const geoLayer = L.geoJSON(geojson, {
      onEachFeature: (feature: any, layer: any) => {
        layer.on('click', () => {
          selectedLayerRef.current = layer;
          // Destaca camada selecionada
          if ((layer as L.Path).setStyle) {
            (layer as L.Path).setStyle({ color: '#2563eb', weight: 3 });
          }
        });
      },
      style: { color: '#3bb2d0', weight: 2, fillOpacity: 0.4 },
      pointToLayer: (feature: any, latlng: any) => L.circleMarker(latlng, { radius: 7, color: '#3bb2d0', fillOpacity: 0.7 })
    });
    geoLayer.addTo(drawnItemsRef.current);
    if (fitBounds && geoLayer.getBounds().isValid()) {
      mapRef.current.fitBounds(geoLayer.getBounds(), { padding: [48, 48] });
    }
  }


  // Efeito para inicializar o mapa Leaflet
  useEffect(() => {
    if (!containerRef.current) return;
    if (mapRef.current) return;
    try {
      // Cria o mapa
      const map = L.map(containerRef.current, {
        center: initialCenterRef.current,
        zoom: initialZoomRef.current,
        zoomControl: false,
      });
      // Adiciona camada de tiles (satélite MapTiler ou OSM)
      const maptilerToken = import.meta.env.VITE_MAPTILER_TOKEN;
      if (maptilerToken && maptilerToken !== 'COLE_SEU_TOKEN_AQUI') {
        L.tileLayer(
          `https://api.maptiler.com/tiles/satellite-v2/{z}/{x}/{y}.jpg?key=${maptilerToken}`,
          {
            attribution: '© MapTiler © OpenStreetMap contributors',
            tileSize: 256,
            maxZoom: 20
          }
        ).addTo(map);
      } else {
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors',
        }).addTo(map);
      }
      mapRef.current = map;
      // Grupo de camadas desenhadas
      const drawnItems = L.featureGroup().addTo(map);
      drawnItemsRef.current = drawnItems;
      // Adiciona marcador e tooltip (estilo Google Maps)
      const marker = L.marker([-14.886146449974284, -56.93058631349245], {
        icon: L.icon({
          iconUrl: 'https://maps.gstatic.com/mapfiles/api-3/images/spotlight-poi2_hdpi.png',
          iconSize: [32, 32],
          iconAnchor: [16, 32],
        })
      }).addTo(map);
      marker.bindTooltip('Fazenda', { permanent: true, direction: 'right', offset: [8, 0] });
      // Carrega dados iniciais, se houver
      if (initialDataRef.current && initialDataRef.current.features.length) {
        addGeoJsonToMap(initialDataRef.current, true);
      }
      // Callback de mapa carregado
      if (onMapLoad) onMapLoad();
    } catch (e) {
      // Callback de erro
      onMapError?.(e instanceof Error ? e : new Error('Erro ao inicializar o mapa Leaflet'));
    }
    // Cleanup ao desmontar
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
      drawnItemsRef.current = null;
    };
  }, []);


  // Expõe métodos para o componente pai via ref
  useImperativeHandle(ref, () => ({
    // Move o mapa para uma coordenada
    flyTo: ({ lng, lat, zoom }) => {
      mapRef.current?.setView([lat, lng], zoom ?? mapRef.current.getZoom());
    },
    // Retorna os dados desenhados
    getDrawData: () => {
      if (!drawnItemsRef.current) return emptyCollection;
      return drawnItemsRef.current.toGeoJSON() as FeatureCollection;
    },
    // Carrega um GeoJSON no mapa
    loadGeoJson: (collection, options) => {
      addGeoJsonToMap(collection, options?.fitBounds !== false);
      onDrawChangeRef.current?.(collection);
    },
    // Limpa todos os desenhos
    clearDrawings: () => {
      drawnItemsRef.current?.clearLayers();
      onDrawChangeRef.current?.(emptyCollection);
    },
    // Inicia modo de desenho de polígono (apenas alerta, implementar com leaflet-draw)
    startDrawPolygon: () => {
      alert('Desenho de polígono: implemente com leaflet-draw');
    },
    // Zoom in
    zoomIn: () => {
      mapRef.current?.zoomIn();
    },
    // Zoom out
    zoomOut: () => {
      mapRef.current?.zoomOut();
    },
    // Ajusta o mapa para caber os desenhos
    fitToDrawings: () => {
      if (!drawnItemsRef.current) return;
      const bounds = drawnItemsRef.current.getBounds();
      if (bounds.isValid()) mapRef.current?.fitBounds(bounds, { padding: [48, 48] });
    },
    // Remove camada selecionada
    deleteSelected: () => {
      if (selectedLayerRef.current && drawnItemsRef.current) {
        drawnItemsRef.current.removeLayer(selectedLayerRef.current);
        selectedLayerRef.current = null;
        onDrawChangeRef.current?.(drawnItemsRef.current.toGeoJSON() as FeatureCollection);
      }
    },
  }));


  // Renderiza o container do mapa
  return <StyledMapContainer ref={containerRef} />;
});


// Container estilizado do mapa
const StyledMapContainer = styled.div`
  width: 100%;
  height: 100%;
  min-height: 400px;
  position: relative;
  z-index: 0;
`;


// Nome do componente para debug
LeafletMap.displayName = 'LeafletMap';

export default LeafletMap;
