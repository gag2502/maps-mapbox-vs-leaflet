# Leaflet Version

Esta é uma cópia do app Mapbox, mas usando Leaflet como biblioteca de mapa. Todos os elementos de tela, controles, layout e lógica permanecem idênticos ao original.

## Como rodar

1. Instale as dependências:

```bash
npm install leaflet styled-components
```

2. Importe e use o `App` normalmente no seu projeto React.

- Não é necessário token de API para Leaflet/OpenStreetMap.

## Observações
- O desenho de polígonos está como stub (alert), mas pode ser facilmente implementado com [leaflet-draw](https://github.com/Leaflet/Leaflet.draw) ou similar.
- Importação/exportação de GeoJSON, zoom, fullscreen, marcador e label funcionam igual ao Mapbox.

---

Se quiser ativar desenho real, basta integrar leaflet-draw e adaptar o método `startDrawPolygon` em `LeafletMap.tsx`.
