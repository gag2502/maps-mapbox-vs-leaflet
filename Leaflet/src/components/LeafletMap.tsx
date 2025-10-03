
// Hooks do React e tipos
import { forwardRef, useEffect, useImperativeHandle, useRef, type Ref } from 'react';
// Biblioteca principal do Leaflet
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw';
import 'leaflet-draw/dist/leaflet.draw.css';
// Import leaflet-draw types if available, or declare minimal types for L.Draw
// @ts-ignore
import 'leaflet-draw'; // Ensures side effects are loaded

// Extend Leaflet namespace for Draw if types are missing
declare global {
  namespace L {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Draw {
      class Polygon {
        constructor(map: L.Map, options?: any);
        enable(): void;
        disable(): void;
      }
    }
  }
}
// Estilização
import styled from 'styled-components';
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
  // Novos métodos para parity com Mapbox implementation
  changeSelectedFill?: (color: string, opacity?: number) => void;
  changeSelectedStroke?: (color: string, width?: number) => void;
  applyFillToAll?: (color: string, opacity?: number) => void;
  applyStrokeToAll?: (color: string, width?: number) => void;
  addTextToSelected?: (text: string) => void;
  removeTextFromSelected?: () => void;
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
  // Camadas para rótulos de vértices e rótulos de texto central
  const coordLabelsRef: React.MutableRefObject<L.LayerGroup<any> | null> = useRef<L.LayerGroup<any> | null>(null);
  const textLabelsRef: React.MutableRefObject<L.LayerGroup<any> | null> = useRef<L.LayerGroup<any> | null>(null);
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
    // limpa camadas desenhadas e labels
    drawnItemsRef.current.clearLayers();
    coordLabelsRef.current?.clearLayers();
    textLabelsRef.current?.clearLayers();

    // Cria camada GeoJSON aplicando estilos a partir das propriedades (se existirem)
    const geoLayer = L.geoJSON(geojson, {
      onEachFeature: (feature: any, layer: any) => {
        // Preserve feature properties on the Leaflet layer for later export
        if (!layer.feature) layer.feature = feature;

        layer.on('click', () => {
          selectedLayerRef.current = layer;
          // Destaca camada selecionada
          if ((layer as L.Path).setStyle) {
            (layer as L.Path).setStyle({ color: '#2563eb', weight: 3 });
          }
        });

        // Apply stored style properties if present
        try {
          const props = feature.properties || {};
          const style: any = {};
          if (props.strokeColor) style.color = props.strokeColor;
          if (props.strokeWidth) style.weight = props.strokeWidth;
          if (typeof props.fillOpacity !== 'undefined') style.fillOpacity = props.fillOpacity;
          if (props.fillColor) style.fillColor = props.fillColor;
          if (Object.keys(style).length && (layer as L.Path).setStyle) {
            (layer as L.Path).setStyle(style);
          }
        } catch (e) { /* ignore */ }
      },
      style: (feature: any) => {
        const props = feature.properties || {};
        return {
          color: props.strokeColor || '#3bb2d0',
          weight: props.strokeWidth || 2,
          fillOpacity: typeof props.fillOpacity === 'number' ? props.fillOpacity : 0.4,
          fillColor: props.fillColor || '#3bb2d0'
        } as L.PathOptions;
      },
      pointToLayer: (feature: any, latlng: any) => L.circleMarker(latlng, { radius: 7, color: '#3bb2d0', fillOpacity: 0.7 })
    });

    geoLayer.addTo(drawnItemsRef.current);

    // After adding features, create coordinate labels and text labels
    upsertCoordinateLabels(geojson);
    upsertTextLabels(geojson);

    if (fitBounds && geoLayer.getBounds().isValid()) {
      mapRef.current.fitBounds(geoLayer.getBounds(), { padding: [48, 48] });
    }
  }

  // Atualiza/insere rótulos de vértices no mapa com base em um FeatureCollection
  function upsertCoordinateLabels(collection: FeatureCollection) {
    if (!mapRef.current) return;
    coordLabelsRef.current = coordLabelsRef.current || L.layerGroup().addTo(mapRef.current);
    coordLabelsRef.current.clearLayers();
    // Keep placed label screen positions to avoid stacking multiple labels at same point
    const placed: L.Point[] = [];
    const minPxDistance = 40; // minimum pixel distance between labels

    const entries: Array<{ coord: [number, number]; label: string }> = [];
    for (const f of collection.features) {
      if (!f.geometry) continue;
      if (f.geometry.type === 'Polygon') {
        const rings = f.geometry.coordinates as number[][][];
        if (rings.length === 0) continue;
        const ring = rings[0];
        for (const pt of ring) entries.push({ coord: [pt[1], pt[0]], label: `${pt[1].toFixed(6)}, ${pt[0].toFixed(6)}` });
      } else if (f.geometry.type === 'MultiPolygon') {
        const polys = f.geometry.coordinates as number[][][][];
        for (const poly of polys) {
          const ring = poly[0];
          for (const pt of ring) entries.push({ coord: [pt[1], pt[0]], label: `${pt[1].toFixed(6)}, ${pt[0].toFixed(6)}` });
        }
      }
    }

    // Convert candidate label coords to container points and filter by distance
    for (const e of entries) {
      try {
        const pt = L.latLng(e.coord[0], e.coord[1]);
        const containerPoint = mapRef.current.project(pt);
        let tooClose = false;
        for (const p of placed) {
          if (p.distanceTo(containerPoint) < minPxDistance) {
            tooClose = true;
            break;
          }
        }
        if (tooClose) continue;
        placed.push(containerPoint);

        const marker = L.marker([e.coord[0], e.coord[1]] as any, {
          icon: L.divIcon({ className: 'coord-label', html: `<div style="font-size:10px;line-height:1;padding:2px 6px;background:#fff;border:1px solid #e6e6e6;border-radius:4px;box-shadow:0 1px 2px rgba(0,0,0,0.06);">${e.label}</div>` }),
          interactive: false
        });
        coordLabelsRef.current.addLayer(marker);
      } catch (err) {
        // in case projection fails, skip the label
        continue;
      }
    }
  }

  // Atualiza/insere rótulos de texto centralizados para polígonos que têm properties.labelText
  function upsertTextLabels(collection: FeatureCollection) {
    if (!mapRef.current) return;
    textLabelsRef.current = textLabelsRef.current || L.layerGroup().addTo(mapRef.current);
    textLabelsRef.current.clearLayers();

    for (const f of collection.features) {
      if (!f.geometry) continue;
      const props = f.properties || {};
      if (!props.labelText) continue;

      let centroid: [number, number] | null = null;
      if (f.geometry.type === 'Polygon') {
        const ring = (f.geometry.coordinates as number[][][])[0];
        centroid = calculatePolygonCentroid(ring);
      } else if (f.geometry.type === 'MultiPolygon') {
        const first = (f.geometry.coordinates as number[][][][])[0];
        if (first) centroid = calculatePolygonCentroid(first[0]);
      }

      if (!centroid) continue;
      const latlng: [number, number] = [centroid[1], centroid[0]];
      const marker = L.marker(latlng as any, {
        icon: L.divIcon({ className: 'polygon-label', html: `<div style="font-size:14px;color:#000;text-align:center;text-shadow:0 0 2px #fff;padding:2px 6px">${props.labelText}</div>` }),
        interactive: false
      });
      textLabelsRef.current.addLayer(marker);
    }
  }

  // Calcula centroide simples (média) de um anel de polígono [[lng,lat],...]
  function calculatePolygonCentroid(ring: number[][]): [number, number] | null {
    if (!ring || ring.length === 0) return null;
    let sx = 0, sy = 0, count = 0;
    for (const p of ring) {
      if (!p || p.length < 2) continue;
      sx += p[0]; sy += p[1]; count++;
    }
    if (count === 0) return null;
    return [sx / count, sy / count];
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
      if (coordLabelsRef.current) {
        try { coordLabelsRef.current.clearLayers(); (mapRef.current as L.Map | null)?.removeLayer(coordLabelsRef.current as any); } catch (e) { /* ignore */ }
        coordLabelsRef.current = null;
      }
      if (textLabelsRef.current) {
        try { textLabelsRef.current.clearLayers(); (mapRef.current as L.Map | null)?.removeLayer(textLabelsRef.current as any); } catch (e) { /* ignore */ }
        textLabelsRef.current = null;
      }
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
      // Preserve properties/styles stored on each layer.feature
      const fc = drawnItemsRef.current.toGeoJSON() as FeatureCollection;
      // Merge back any properties that were stored on layers
      const features = fc.features.map((f: any) => {
        // attempt to find the corresponding layer by comparing coordinates
        // fallback: keep existing properties
        return f;
      });
      return { ...fc, features };
    },
    // Carrega um GeoJSON no mapa
    loadGeoJson: (collection, options) => {
      // Ensure incoming features keep their properties
      const processed = { ...collection, features: collection.features.map(f => ({ ...f, properties: f.properties || {} })) };
      addGeoJsonToMap(processed, options?.fitBounds !== false);
      onDrawChangeRef.current?.(processed);
    },
    // Limpa todos os desenhos
    clearDrawings: () => {
      drawnItemsRef.current?.clearLayers();
      onDrawChangeRef.current?.(emptyCollection);
    },
    // Inicia modo de desenho de polígono usando leaflet-draw
    startDrawPolygon: () => {
      if (!mapRef.current || !drawnItemsRef.current) return;
      // Configuração do modo de desenho de polígono
      const polygonOptions = {
        allowIntersection: true,
        showArea: true,
        shapeOptions: {
          color: '#3bb2d0',
          weight: 2,
          fillOpacity: 0.4,
          fillColor: '#3bb2d0',
        },
      };
      // Escuta o evento de criação
  const onDrawCreated = function (e: any) {
        const layer = e.layer;
        // Adiciona evento de clique para seleção
        layer.on('click', () => {
          selectedLayerRef.current = layer;
          if ((layer as L.Path).setStyle) {
            (layer as L.Path).setStyle({ color: '#2563eb', weight: 3 });
          }
        });
        // Salva propriedades de estilo no feature.properties
        const style = (layer as any).options || {};
        if (!layer.feature) layer.feature = { type: 'Feature', properties: {}, geometry: null };
        layer.feature.properties = {
          ...layer.feature.properties,
          fillColor: style.fillColor || style.color || '#3bb2d0',
          fillOpacity: typeof style.fillOpacity === 'number' ? style.fillOpacity : 0.4,
          strokeColor: style.color || '#3bb2d0',
          strokeWidth: typeof style.weight === 'number' ? style.weight : 2
        };
        if (drawnItemsRef.current) {
          drawnItemsRef.current.addLayer(layer);
        }
        // Fire change event
        if (drawnItemsRef.current) {
          onDrawChangeRef.current?.(drawnItemsRef.current.toGeoJSON() as FeatureCollection);
        }
        if (drawnItemsRef.current) {
          upsertCoordinateLabels(drawnItemsRef.current.toGeoJSON() as FeatureCollection);
        }
        if (drawnItemsRef.current) {
          upsertTextLabels(drawnItemsRef.current.toGeoJSON() as FeatureCollection);
        }
        // Não reativa o modo de desenho automaticamente
      };
      mapRef.current.on('draw:created', onDrawCreated);
      // Ativa o modo de desenho de polígono sem adicionar controles visuais
      (new (L.Draw as any).Polygon(mapRef.current, polygonOptions)).enable();
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
        const fc = drawnItemsRef.current.toGeoJSON() as FeatureCollection;
        onDrawChangeRef.current?.(fc);
        upsertCoordinateLabels(fc);
        upsertTextLabels(fc);
      }
    },
    // Change fill color/opacity for selected layer
    changeSelectedFill: (color: string, opacity?: number) => {
      if (!selectedLayerRef.current) return;
      try {
        const layer = selectedLayerRef.current as any;
        const props = (layer.feature && layer.feature.properties) ? layer.feature.properties : (layer.options && layer.options.properties ? layer.options.properties : {});
        props.fillColor = color;
        if (typeof opacity === 'number') props.fillOpacity = opacity;
        if ((layer as L.Path).setStyle) {
          (layer as L.Path).setStyle({ fillColor: color, fillOpacity: typeof opacity === 'number' ? opacity : (layer as any).options.fillOpacity });
        }
        // update stored feature props
        if (layer.feature) layer.feature.properties = props;
        onDrawChangeRef.current?.(drawnItemsRef.current?.toGeoJSON() as FeatureCollection);
        // update labels
        upsertTextLabels(drawnItemsRef.current?.toGeoJSON() as FeatureCollection);
        upsertCoordinateLabels(drawnItemsRef.current?.toGeoJSON() as FeatureCollection);
      } catch (e) { console.error(e); }
    },
    // Change stroke color/width for selected layer
    changeSelectedStroke: (color: string, width?: number) => {
      if (!selectedLayerRef.current) return;
      try {
        const layer = selectedLayerRef.current as any;
        const props = (layer.feature && layer.feature.properties) ? layer.feature.properties : {};
        props.strokeColor = color;
        if (typeof width === 'number') props.strokeWidth = width;
        if ((layer as L.Path).setStyle) {
          (layer as L.Path).setStyle({ color, weight: typeof width === 'number' ? width : (layer as any).options.weight });
        }
        if (layer.feature) layer.feature.properties = props;
        onDrawChangeRef.current?.(drawnItemsRef.current?.toGeoJSON() as FeatureCollection);
        upsertTextLabels(drawnItemsRef.current?.toGeoJSON() as FeatureCollection);
      } catch (e) { console.error(e); }
    },
    applyFillToAll: (color: string, opacity?: number) => {
      if (!drawnItemsRef.current) return;
      drawnItemsRef.current.eachLayer((layer: any) => {
        try {
          const props = (layer.feature && layer.feature.properties) ? layer.feature.properties : {};
          props.fillColor = color;
          if (typeof opacity === 'number') props.fillOpacity = opacity;
          if ((layer as L.Path).setStyle) (layer as L.Path).setStyle({ fillColor: color, fillOpacity: typeof opacity === 'number' ? opacity : (layer as any).options.fillOpacity });
          if (layer.feature) layer.feature.properties = props;
        } catch (e) { /* ignore */ }
      });
      onDrawChangeRef.current?.(drawnItemsRef.current?.toGeoJSON() as FeatureCollection);
      upsertTextLabels(drawnItemsRef.current?.toGeoJSON() as FeatureCollection);
    },
    applyStrokeToAll: (color: string, width?: number) => {
      if (!drawnItemsRef.current) return;
      drawnItemsRef.current.eachLayer((layer: any) => {
        try {
          const props = (layer.feature && layer.feature.properties) ? layer.feature.properties : {};
          props.strokeColor = color;
          if (typeof width === 'number') props.strokeWidth = width;
          if ((layer as L.Path).setStyle) (layer as L.Path).setStyle({ color, weight: typeof width === 'number' ? width : (layer as any).options.weight });
          if (layer.feature) layer.feature.properties = props;
        } catch (e) { /* ignore */ }
      });
      onDrawChangeRef.current?.(drawnItemsRef.current?.toGeoJSON() as FeatureCollection);
      upsertTextLabels(drawnItemsRef.current?.toGeoJSON() as FeatureCollection);
    },
    addTextToSelected: (text: string) => {
      if (!selectedLayerRef.current) return;
      try {
        const layer = selectedLayerRef.current as any;
        const props = (layer.feature && layer.feature.properties) ? layer.feature.properties : {};
        props.labelText = text;
        if (layer.feature) layer.feature.properties = props;
        onDrawChangeRef.current?.(drawnItemsRef.current?.toGeoJSON() as FeatureCollection);
        upsertTextLabels(drawnItemsRef.current?.toGeoJSON() as FeatureCollection);
      } catch (e) { console.error(e); }
    },
    removeTextFromSelected: () => {
      if (!selectedLayerRef.current) return;
      try {
        const layer = selectedLayerRef.current as any;
        if (layer.feature && layer.feature.properties) {
          delete layer.feature.properties.labelText;
        }
        onDrawChangeRef.current?.(drawnItemsRef.current?.toGeoJSON() as FeatureCollection);
        upsertTextLabels(drawnItemsRef.current?.toGeoJSON() as FeatureCollection);
      } catch (e) { console.error(e); }
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
