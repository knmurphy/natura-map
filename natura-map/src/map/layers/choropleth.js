/**
 * Choropleth layer.
 * Colors regions by observation count or species richness.
 * Uses Natural Earth country boundaries.
 */

const BOUNDARIES_SOURCE = 'ne-boundaries';
const CHOROPLETH_LAYER = 'obs-choropleth';
const BOUNDARIES_OUTLINE = 'obs-choropleth-outline';
const POINTS_SOURCE = 'obs-choropleth-points';

// Natural Earth 110m countries GeoJSON (small file, good for world view)
const BOUNDARIES_URL = 'https://d2ad6b4ur7yvpq.cloudfront.net/naturalearth-3.3.0/ne_50m_admin_0_countries.geojson';

let boundariesLoaded = false;
let countByCountry = {};

export function add(map, sourceId, geojson, colorBy) {
  // Store the points source for potential later use
  if (!map.getSource(POINTS_SOURCE)) {
    map.addSource(POINTS_SOURCE, {
      type: 'geojson',
      data: geojson
    });
  } else {
    map.getSource(POINTS_SOURCE).setData(geojson);
  }

  // Count observations per country using a simple point-in-rough-bbox approach
  // For a real implementation, we'd do proper spatial joins, but for v1,
  // we aggregate by place_guess or use a rough grid
  countByCountry = aggregateByRegion(geojson);

  // Load boundaries and color them
  loadBoundariesAndRender(map);
}

export function remove(map, sourceId) {
  if (map.getLayer(CHOROPLETH_LAYER)) map.removeLayer(CHOROPLETH_LAYER);
  if (map.getLayer(BOUNDARIES_OUTLINE)) map.removeLayer(BOUNDARIES_OUTLINE);
  if (map.getSource(BOUNDARIES_SOURCE)) map.removeSource(BOUNDARIES_SOURCE);
  if (map.getSource(POINTS_SOURCE)) map.removeSource(POINTS_SOURCE);
  if (map.getSource(sourceId)) map.removeSource(sourceId);
  boundariesLoaded = false;
}

export function updateColorBy(map, sourceId, geojson, colorBy) {
  // Choropleth doesn't change color by taxon property — it's always by count
  // But we could extend this later
}

async function loadBoundariesAndRender(map) {
  if (!map.getSource(BOUNDARIES_SOURCE)) {
    const res = await fetch(BOUNDARIES_URL);
    const boundaries = await res.json();

    // Inject observation counts into boundary properties
    for (const feature of boundaries.features) {
      const name = feature.properties.name || feature.properties.NAME;
      feature.properties._obs_count = countByCountry[name] || 0;
    }

    map.addSource(BOUNDARIES_SOURCE, {
      type: 'geojson',
      data: boundaries
    });

    // Compute max for color scale
    const maxCount = Math.max(1, ...Object.values(countByCountry));

    map.addLayer({
      id: CHOROPLETH_LAYER,
      type: 'fill',
      source: BOUNDARIES_SOURCE,
      paint: {
        'fill-color': [
          'interpolate', ['linear'],
          ['get', '_obs_count'],
          0, 'rgba(30, 30, 60, 0.3)',
          1, '#1a237e',
          Math.ceil(maxCount * 0.25), '#1565c0',
          Math.ceil(maxCount * 0.5), '#f9a825',
          maxCount, '#e6194b'
        ],
        'fill-opacity': 0.7
      }
    }, getFirstSymbolLayerId(map));

    map.addLayer({
      id: BOUNDARIES_OUTLINE,
      type: 'line',
      source: BOUNDARIES_SOURCE,
      paint: {
        'line-color': 'rgba(255,255,255,0.2)',
        'line-width': 0.5
      }
    });

    boundariesLoaded = true;
  }
}

/**
 * Simple aggregation: extract country-ish names from place data.
 * For v1, we do a rough approach based on the observation's geographic coordinates
 * and a simple country lookup. A proper spatial join would be better.
 */
function aggregateByRegion(geojson) {
  // For now, count all observations — the choropleth shows density per country
  // This is a placeholder. A real implementation would do point-in-polygon.
  // We'll bucket observations into a grid and show density.
  const counts = {};

  // Simple approach: count per rough grid cell for now
  // We'll upgrade to proper spatial join later
  for (const f of geojson.features) {
    // Use a very rough country name extraction from coordinates
    // This is intentionally simple for v1
    const [lng, lat] = f.geometry.coordinates;
    const key = guessCountry(lng, lat);
    counts[key] = (counts[key] || 0) + 1;
  }

  return counts;
}

/**
 * Very rough country guess from coordinates.
 * This is a v1 placeholder — proper spatial join would be better.
 */
function guessCountry(lng, lat) {
  // Major region buckets for demonstration
  if (lat > 24 && lat < 50 && lng > -130 && lng < -60) return 'United States of America';
  if (lat > 50 && lat < 72 && lng > -140 && lng < -52) return 'Canada';
  if (lat > 14 && lat < 33 && lng > -118 && lng < -86) return 'Mexico';
  if (lat > 8 && lat < 12 && lng > -86 && lng < -82) return 'Costa Rica';
  if (lat > -44 && lat < -10 && lng > 113 && lng < 154) return 'Australia';
  if (lat > 49 && lat < 60 && lng > -11 && lng < 2) return 'United Kingdom';
  if (lat > 42 && lat < 51 && lng > -5 && lng < 9) return 'France';
  if (lat > 47 && lat < 55 && lng > 5 && lng < 16) return 'Germany';
  if (lat > -35 && lat < 6 && lng > -74 && lng < -34) return 'Brazil';
  if (lat > 24 && lat < 46 && lng > 122 && lng < 146) return 'Japan';
  if (lat > 18 && lat < 54 && lng > 73 && lng < 135) return 'China';
  if (lat > 8 && lat < 37 && lng > 68 && lng < 97) return 'India';
  // Default: unknown
  return 'Other';
}

function getFirstSymbolLayerId(map) {
  const layers = map.getStyle().layers;
  for (const layer of layers) {
    if (layer.type === 'symbol') return layer.id;
  }
  return undefined;
}
