// Shared by the Worker and the browser. Unlabelled DMS uses longitude first,
// matching formatCoords() and the favourites list in the page.
export function parseDmsCoordinates(text) {
  const input = String(text || '').trim()
    .replace(/[−－]/g, '-')
    .replace(/(\d)\s*度/g, '$1°').replace(/[分′’]/g, "'").replace(/[秒″“”]/g, '"');
  const angle = /(?:(经度|纬度|东经|西经|北纬|南纬|[NSEW])\s*[:：]?\s*)?([+-]?\d{1,3})\s*°\s*(\d{1,2})\s*'\s*(\d{1,2}(?:\.\d+)?)\s*"(?:(东经|西经|北纬|南纬|[NSEW])|\s+(东经|西经|北纬|南纬|[NSEW])(?!\s*[:：]?\s*[+-]?\d))?/gi;
  const matches = [...input.matchAll(angle)];
  if (matches.length !== 2) return null;
  // Only separators may surround or separate the two angles.
  const remainder = input.replace(angle, '');
  if (!/^[\s,，;；]*$/.test(remainder)) return null;
  const points = matches.map(match => {
    const labels = [match[1], match[5] || match[6]].filter(Boolean).map(label => label.toUpperCase());
    const axes = labels.map(label => /^(经度|东经|西经|E|W)$/.test(label) ? 'lon' : 'lat');
    if (axes.length === 2 && axes[0] !== axes[1]) return null;
    const directions = labels.filter(label => !/^(经度|纬度)$/.test(label));
    const signs = directions.map(label => /^(西经|南纬|W|S)$/.test(label) ? -1 : 1);
    if (signs.length === 2 && signs[0] !== signs[1]) return null;
    const minutes = Number(match[3]);
    const seconds = Number(match[4]);
    if (minutes >= 60 || seconds >= 60) return null;
    const explicitSign = match[2].startsWith('-') ? -1 : match[2].startsWith('+') ? 1 : null;
    if (explicitSign !== null && signs.length && explicitSign !== signs[0]) return null;
    const sign = signs[0] || explicitSign || 1;
    return { axis: axes[0], value: sign * (Math.abs(Number(match[2])) + minutes / 60 + seconds / 3600) };
  });
  if (points.some(point => !point)) return null;
  if (!points[0].axis && !points[1].axis) {
    points[0].axis = 'lon';
    points[1].axis = 'lat';
  } else if (!points[0].axis) {
    points[0].axis = points[1].axis === 'lat' ? 'lon' : 'lat';
  } else if (!points[1].axis) {
    points[1].axis = points[0].axis === 'lat' ? 'lon' : 'lat';
  }
  if (points[0].axis === points[1].axis) return null;
  const result = Object.fromEntries(points.map(point => [point.axis, point.value]));
  if (Math.abs(result.lat) > 90 || Math.abs(result.lon) > 180) return null;
  return { ...result, coordinateSystem: 'wgs84' };
}
