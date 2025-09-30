// Hook reutilizável para adicionar um marcador customizado ao mapa MapboxGL
import mapboxgl from 'mapbox-gl';

export type UseMapboxMarkerOptions = {
  map: mapboxgl.Map;
  coordinates: [number, number];
  label: string;
  iconUrl?: string;
  iconSize?: number;
};

/**
 * Adiciona um marcador customizado ao mapa MapboxGL.
 * @param map Instância do mapa MapboxGL
 * @param coordinates Coordenadas [lng, lat] do marcador
 * @param label Texto da legenda exibida ao lado do ícone
 * @param iconUrl URL do ícone (opcional)
 * @param iconSize Tamanho do ícone em pixels (opcional, padrão 32)
 */
export function useMapboxMarker({ map, coordinates, label, iconUrl, iconSize = 32 }: UseMapboxMarkerOptions) {
  // Cria o elemento do marcador com legenda customizada
  const markerEl = document.createElement('div');
  markerEl.style.display = 'flex';
  markerEl.style.alignItems = 'center';

  // Ícone do marcador
  const iconEl = document.createElement('div');
  iconEl.style.width = `${iconSize}px`;
  iconEl.style.height = `${iconSize}px`;
  iconEl.style.backgroundImage = `url(${iconUrl ?? 'https://maps.gstatic.com/mapfiles/api-3/images/spotlight-poi2_hdpi.png'})`;
  iconEl.style.backgroundSize = '100% 100%';
  iconEl.style.backgroundRepeat = 'no-repeat';
  iconEl.style.cursor = 'pointer';

  // Legenda
  const labelEl = document.createElement('span');
  labelEl.textContent = label;
  labelEl.style.marginLeft = '8px';
  labelEl.style.padding = '2px 8px';
  labelEl.style.borderRadius = '4px';
  labelEl.style.fontSize = '14px';
  labelEl.style.color = '#222';
  labelEl.style.boxShadow = '0 1px 4px rgba(0,0,0,0.12)';

  markerEl.appendChild(iconEl);
  markerEl.appendChild(labelEl);

  new mapboxgl.Marker({ element: markerEl })
    .setLngLat(coordinates)
    .addTo(map);
}
