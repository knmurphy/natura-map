# Known Issues

## PNG/PDF Export Produces Blank Images

**Status:** Broken  
**Reported:** 2025-02-17  
**Affects:** All users attempting to export maps

### Symptoms

Clicking "Export PNG" or "Print / PDF" downloads a file, but the image is completely transparent/black (100% transparent pixels).

### Root Cause

The current implementation uses `map._render()` (a private MapLibre API) and a 50ms timeout, but this doesn't properly capture the WebGL canvas. Even with `preserveDrawingBuffer: true` set in the map configuration, the WebGL drawing buffer gets cleared after rendering, and the timing of `toDataURL()` is critical.

### Previous Incorrect Fix

Commit `daf526a` claimed to fix this issue by:
- Using `map.once('idle')` to wait for render
- Calling `map._render()` to force repaint
- Adding 50ms delay

This fix was **never tested** - if it had been, the blank image issue would have been discovered. The files are created (18-38KB) but contain no visual data.

### Verified Failure

```python
# Analysis of exported file natura-map-export-2026-02-17-151109.png
Size: (740, 1039)
Transparent pixels: 768860/768860 (100.0%)
Non-black pixels: 0/768860 (0.0%)
Result: BLANK
```

### Research Summary

The issue is well-documented in the MapLibre community. The `preserveDrawingBuffer: true` setting alone is insufficient - the canvas must be captured **during** an active render cycle, not after.

**Potential solutions:**

1. **Use the `'render'` event** - Hook into MapLibre's render event to capture the canvas immediately after a frame is drawn
2. **Use a dedicated plugin** - `@watergis/maplibre-gl-export` is a well-maintained plugin that handles this complexity
3. **Trigger user interaction** - Canvas can be captured immediately after a user-triggered event (click, drag, zoom)

### Recommended Fix

**Option A: Use @watergis/maplibre-gl-export (Recommended)**

```bash
npm install @watergis/maplibre-gl-export
```

This plugin is production-tested, handles all the WebGL timing complexity, and provides export to PNG, JPEG, PDF, and SVG formats.

**Option B: Implement render event hook**

Hook into MapLibre's render cycle to capture during the frame:

```javascript
function captureCanvas(map, resolve) {
  const canvas = map.getCanvas();
  const renderListener = () => {
    try {
      const dataUrl = canvas.toDataURL('image/png');
      map.off('render', renderListener);
      resolve(dataUrl);
    } catch (err) {
      map.off('render', renderListener);
      resolve(null);
    }
  };
  
  map.on('render', renderListener);
  map.triggerRepaint(); // Note: this method may not exist
  
  // Fallback timeout
  setTimeout(() => {
    map.off('render', renderListener);
    resolve(null);
  }, 1000);
}
```

**Note:** `map.triggerRepaint()` doesn't exist in MapLibre. Need to find alternative method to trigger render.

### Testing Requirements

Any fix must be verified by:
1. Exporting a PNG
2. Opening the file in an image viewer
3. Confirming the map content is visible (not blank)
4. Checking that file size indicates actual content (should be >100KB for a typical map)

### Related

- Original commit: `daf526a` - "fix: export functions now wait for map render before capturing canvas"
- Related commit: `82420ce` - "feat: Turf.js choropleth spatial join, color palettes, map export"
