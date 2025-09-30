import type { ExpressionSpecification } from 'mapbox-gl';

export type MapboxStyle = {
  id: string;
  type: string;
  filter?: unknown;
  layout?: Record<string, unknown>;
  paint?: Record<string, number | string | ExpressionSpecification | readonly unknown[]>;
};
