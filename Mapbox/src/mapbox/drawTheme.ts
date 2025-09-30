import type { MapboxStyle } from '../types/mapbox-style';

// Cores principais do tema
const blue = '#3bb2d0';   // Azul padrão para polígonos e linhas
const orange = '#fbb03b'; // Laranja para elementos ativos
const white = '#fff';     // Branco para círculos externos

// Tema customizado para o Mapbox Draw
// Cada objeto representa um estilo para um tipo de geometria ou estado
const drawTheme: MapboxStyle[] = [
  {
    // Preenchimento dos polígonos desenhados
    id: 'gl-draw-polygon-fill',
    type: 'fill',
    filter: ['all', ['==', '$type', 'Polygon']],
    paint: {
      // Cor de preenchimento: laranja se ativo, azul se inativo
      'fill-color': ['case', ['==', ['get', 'active'], 'true'], orange, blue],
      'fill-opacity': 0.1, // Transparência do preenchimento
    },
  },
  {
    // Linhas de polígonos e linhas desenhadas
    id: 'gl-draw-lines',
    type: 'line',
    filter: ['any', ['==', '$type', 'LineString'], ['==', '$type', 'Polygon']],
    layout: {
      'line-cap': 'round', // Pontas arredondadas
      'line-join': 'round', // Junções arredondadas
    },
    paint: {
      // Cor da linha: laranja se ativo, azul se inativo
      'line-color': ['case', ['==', ['get', 'active'], 'true'], orange, blue],
      // Tracejado: diferente para ativo/inativo
      'line-dasharray': ['case', ['==', ['get', 'active'], 'true'], ['literal', [0.2, 2]], ['literal', [2, 0]]],
      'line-width': 2, // Espessura da linha
    },
  },
  {
    // Círculo externo dos pontos (feature)
    id: 'gl-draw-point-outer',
    type: 'circle',
    filter: ['all', ['==', '$type', 'Point'], ['==', 'meta', 'feature']],
    paint: {
      // Raio maior se ativo
      'circle-radius': ['case', ['==', ['get', 'active'], 'true'], 7, 5],
      'circle-color': white, // Sempre branco
    },
  },
  {
    // Círculo interno dos pontos (feature)
    id: 'gl-draw-point-inner',
    type: 'circle',
    filter: ['all', ['==', '$type', 'Point'], ['==', 'meta', 'feature']],
    paint: {
      // Raio menor se inativo
      'circle-radius': ['case', ['==', ['get', 'active'], 'true'], 5, 3],
      // Cor: laranja se ativo, azul se inativo
      'circle-color': ['case', ['==', ['get', 'active'], 'true'], orange, blue],
    },
  },
  {
    // Círculo externo dos vértices (quando editando)
    id: 'gl-draw-vertex-outer',
    type: 'circle',
    filter: ['all', ['==', '$type', 'Point'], ['==', 'meta', 'vertex'], ['!=', 'mode', 'simple_select']],
    paint: {
      'circle-radius': ['case', ['==', ['get', 'active'], 'true'], 7, 5],
      'circle-color': white,
    },
  },
  {
    // Círculo interno dos vértices (quando editando)
    id: 'gl-draw-vertex-inner',
    type: 'circle',
    filter: ['all', ['==', '$type', 'Point'], ['==', 'meta', 'vertex'], ['!=', 'mode', 'simple_select']],
    paint: {
      'circle-radius': ['case', ['==', ['get', 'active'], 'true'], 5, 3],
      'circle-color': orange,
    },
  },
  {
    // Pontos de meio (midpoint) para edição de linhas/polígonos
    id: 'gl-draw-midpoint',
    type: 'circle',
    filter: ['all', ['==', 'meta', 'midpoint']],
    paint: {
      'circle-radius': 3,
      'circle-color': orange,
    },
  },
];

// Exporta o tema para ser usado no MapboxDraw
export default drawTheme;
