import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { parseDmsCoordinates } from '../src/dms.js';
import { extractFromString, parseCoords } from '../src/parse.js';
import { getPageHtml } from '../src/page.js';

const examples = [
  ['经度 113°56\'28.10"  纬度 22°32\'40.48"', 113 + 56 / 60 + 28.1 / 3600, 22 + 32 / 60 + 40.48 / 3600],
  ['113°56\'28.10", 22°32\'40.48"', 113 + 56 / 60 + 28.1 / 3600, 22 + 32 / 60 + 40.48 / 3600],
  ['北纬22度30分0秒，东经113度30分0秒', 113.5, 22.5],
  ['22°30′0″N 113°30′0″E', 113.5, 22.5],
  ['S 22°30\'0" W 113°30\'0"', -113.5, -22.5],
  ['经度 -0°30\'0" 纬度 -22°30\'0"', -0.5, -22.5],
  ['经度 80°30\'0" 纬度 22°30\'0"', 80.5, 22.5],
  ['纬度90°0\'0" 经度180°0\'0"', 180, 90],
];

test('Worker and rendered browser parse DMS consistently', async () => {
  const html = getPageHtml();
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  const script = scripts.at(-1)[1];
  // Check the entire generated inline script, including template escaping.
  new vm.Script(script);
  const context = vm.createContext({});
  vm.runInContext(script.slice(script.indexOf('const parseDmsCoordinates ='), script.indexOf('const SAVE_API')) + '\nthis.parseDmsCoordinates = parseDmsCoordinates;', context);
  for (const [input, lon, lat] of examples) {
    assert.ok(parseDmsCoordinates(input), input);
    for (const result of [parseDmsCoordinates(input), extractFromString(input), await parseCoords(input), context.parseDmsCoordinates(input)]) {
      assert.ok(result, input);
      assert.ok(Math.abs(result.lon - lon) < 1e-9, input);
      assert.ok(Math.abs(result.lat - lat) < 1e-9, input);
      assert.equal(result.coordinateSystem, 'wgs84');
    }
  }
});

test('invalid minutes, seconds, ranges and conflicting axes are rejected', () => {
  for (const input of [
    '113°60\'0" 22°30\'0"', '113°0\'60" 22°30\'0"',
    '180°0\'1" 22°30\'0"', '113°0\'0" 90°0\'1"',
    '纬度22°0\'0" 纬度23°0\'0"', 'N22°0\'0"S E113°0\'0"',
    'S+22°0\'0" E113°0\'0"', '经度113°0\'0"',
    'garbage 113°0\'0" 22°0\'0"',
  ]) assert.equal(parseDmsCoordinates(input), null, input);
});

test('existing decimal and map URL formats retain their order and coordinate system', () => {
  const decimal = extractFromString('22.544577,113.941140');
  assert.equal(decimal.lat, 22.544577);
  assert.equal(decimal.lon, 113.94114);
  const apple = extractFromString('https://maps.apple.com/?ll=22.544577,113.941140');
  assert.equal(apple.coordinateSystem, 'gcj02');
  assert.equal(apple.lat, decimal.lat);
  assert.equal(apple.lon, decimal.lon);
});
