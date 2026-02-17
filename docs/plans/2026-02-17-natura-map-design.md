# natura-map v1 Design

## Overview

A standalone JavaScript web app that renders iNaturalist observation data on
interactive maps. Ships as a static site deployable to Netlify, Vercel, GitHub
Pages, or run locally with `npx serve`.

Named in honor of Alan Rockefeller (mycologist) who suggested the idea.

## Tech Stack

- **MapLibre GL JS** -- vector tile map engine, GPU-accelerated, open source
- **Deck.gl** -- lazy-loaded escape hatch for heavy visualizations (HexagonLayer, etc.)
- **Vite** -- dev server and bundler
- **Vanilla JS** -- no framework, ES modules
- **CARTO Positron** basemap -- free, no API key, light style

## Architecture

```
natura-map/
  index.html
  package.json
  vite.config.js
  src/
    main.js              # Entry, wires map + UI + data
    map/
      engine.js          # MapLibre setup, base map, layer management
      layers/
        points.js        # Categorical colored circles
        heatmap.js       # Density heatmap with taxon color channels
        clusters.js      # Clustered markers with donut composition
        choropleth.js    # Region fills by aggregated stats
      deckgl.js          # Lazy-loaded Deck.gl MapboxOverlay
    data/
      api.js             # Rate-limited iNaturalist API client (1 req/sec)
      paginator.js       # Cursor-based pagination via id_above
      transform.js       # API response -> GeoJSON features
      cache.js           # IndexedDB query cache
    ui/
      search.js          # Search panel with parameter inputs
      quickselect.js     # Pre-configured query buttons
      legend.js          # Dynamic color legend
      controls.js        # Layer type toggle, settings
    presets/
      defaults.json      # Quick-select query configurations
  public/
    data/
      default.geojson    # Pre-cached observations for instant first load
  style/
    app.css
```

## Layer Types

### Points (circle layer)
Each observation is a MapLibre `circle`. Color mapped from any GeoJSON
property using `match` expressions. Hover shows tooltip with species,
observer, date. Click opens iNaturalist observation page.

### Heatmap (heatmap layer)
MapLibre native heatmap. Weight by observation density, color ramp via
`heatmap-color` interpolation. Transitions to circle layer at zoom ~9.
`colorBy` splits data into separate heatmap layers per taxon group.

### Clusters (clustered GeoJSON source)
`cluster: true` with `clusterRadius: 50`, `clusterMaxZoom: 14`.
Uses `clusterProperties` to aggregate taxon counts per cluster.
Circle size by count, color by dominant taxon.

### Choropleth (fill layer)
Separate GeoJSON source for region boundaries (Natural Earth countries/states).
Joins observation counts to regions, colors via `fill-color` step expressions.

## Deck.gl Escape Hatch

Lazy-loaded via dynamic `import()`. Uses `MapboxOverlay` from `@deck.gl/mapbox`
added via `map.addControl(overlay)`. Renders interleaved with MapLibre layers.
Exposes `addDeckLayer()` for dropping in any Deck.gl layer (HexagonLayer, etc.).

## iNaturalist API Integration

### Compliance
- Rate limit: 1 request/second, queued
- Pagination: `per_page=200`, cursor via `id_above` for >200 results
- 10K result ceiling: warn user, offer to narrow search
- No auth required for reads (unauthenticated = server-cached)
- Custom User-Agent: `natura-map/1.0`

### Data Transform
API response -> GeoJSON FeatureCollection. Each feature:
```json
{
  "type": "Feature",
  "geometry": { "type": "Point", "coordinates": [lng, lat] },
  "properties": {
    "id": 12345,
    "taxon_name": "Amanita muscaria",
    "taxon_common_name": "Fly Agaric",
    "taxon_family": "Amanitaceae",
    "taxon_order": "Agaricales",
    "taxon_class": "Agaricomycetes",
    "iconic_taxon_name": "Fungi",
    "observed_on": "2024-03-15",
    "observer": "username",
    "quality_grade": "research",
    "photo_url": "https://...",
    "uri": "https://www.inaturalist.org/observations/12345"
  }
}
```

## Search UI

### Parameters
- Taxon name (autocomplete)
- Place (autocomplete via iNat places API)
- Date range (from/to)
- Quality grade (research / needs_id / casual)

### Quick-Select Presets
Pre-configured queries shown as buttons:
- "Fungi of California"
- "Birds of Costa Rica"
- "Reptiles of Australia"
- "Wildflowers of the Pacific Northwest"
- "Mushrooms of the Northeast US"

### Progress
Shows "Fetching observations... 400 of ~2,000" during multi-page fetches.
Map updates incrementally as each page arrives.

## Performance

- `setWorkerCount(4)` for GeoJSON parsing
- `cancelPendingTileRequestsWhileZooming: true`
- `fitBounds` auto-zoom to data extent on load
- Clustering enabled by default, user can disable
- Pre-cached default GeoJSON avoids API calls on first load
- IndexedDB cache for repeat queries
