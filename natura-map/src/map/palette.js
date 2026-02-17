/**
 * Color palette for categorical data visualization.
 * Distinct, colorblind-friendly-ish palette for up to 20 categories.
 */

const PALETTE = [
  '#e6194b', // red
  '#3cb44b', // green
  '#4363d8', // blue
  '#f58231', // orange
  '#911eb4', // purple
  '#42d4f4', // cyan
  '#f032e6', // magenta
  '#bfef45', // lime
  '#fabed4', // pink
  '#469990', // teal
  '#dcbeff', // lavender
  '#9A6324', // brown
  '#fffac8', // beige
  '#800000', // maroon
  '#aaffc3', // mint
  '#808000', // olive
  '#ffd8b1', // apricot
  '#000075', // navy
  '#a9a9a9', // grey
  '#ffe119', // yellow
];

const FALLBACK_COLOR = '#888888';

// Iconic taxon colors (iNaturalist standard-ish)
const ICONIC_TAXON_COLORS = {
  'Fungi': '#e6194b',
  'Plantae': '#3cb44b',
  'Aves': '#4363d8',
  'Mammalia': '#f58231',
  'Reptilia': '#911eb4',
  'Amphibia': '#42d4f4',
  'Insecta': '#f032e6',
  'Arachnida': '#9A6324',
  'Mollusca': '#469990',
  'Actinopterygii': '#000075',
  'Chromista': '#bfef45',
  'Protozoa': '#dcbeff',
  'Unknown': FALLBACK_COLOR
};

/**
 * Build a MapLibre match expression for coloring features by a property.
 */
export function buildColorMatch(property, uniqueValues) {
  if (property === 'iconic_taxon_name') {
    return buildIconicColorMatch();
  }

  const expr = ['match', ['get', property]];
  uniqueValues.forEach((val, i) => {
    expr.push(val);
    expr.push(PALETTE[i % PALETTE.length]);
  });
  expr.push(FALLBACK_COLOR); // fallback
  return expr;
}

/**
 * Build iconic taxon color match expression.
 */
function buildIconicColorMatch() {
  const expr = ['match', ['get', 'iconic_taxon_name']];
  for (const [name, color] of Object.entries(ICONIC_TAXON_COLORS)) {
    expr.push(name);
    expr.push(color);
  }
  expr.push(FALLBACK_COLOR);
  return expr;
}

/**
 * Get the color assigned to a specific value for a given property.
 */
export function getColor(property, value, uniqueValues) {
  if (property === 'iconic_taxon_name') {
    return ICONIC_TAXON_COLORS[value] || FALLBACK_COLOR;
  }
  const idx = uniqueValues.indexOf(value);
  return idx >= 0 ? PALETTE[idx % PALETTE.length] : FALLBACK_COLOR;
}

/**
 * Get the full legend data (value → color) for a property.
 */
export function getLegendData(property, uniqueValues) {
  return uniqueValues.map((val, i) => ({
    label: val,
    color: property === 'iconic_taxon_name'
      ? (ICONIC_TAXON_COLORS[val] || FALLBACK_COLOR)
      : PALETTE[i % PALETTE.length]
  }));
}
