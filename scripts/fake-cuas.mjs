// Writes a small, entirely made-up CUAS-DataChallenge folder so the NATO CUAS tracker
// can be screenshotted without real data. Nothing here comes from a real trial.
// Usage: node scripts/fake-cuas.mjs <out-dir>
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const out = process.argv[2] || "FAKE-CUAS-DataChallenge";
const run = join(out, "Testing datasets", "Scenario 1", "Iteration 1");
const truthDir = join(run, "GroundTruthData"), sensorDir = join(run, "SensorData");
mkdirSync(truthDir, { recursive: true });
mkdirSync(sensorDir, { recursive: true });

// seeded random so every capture looks the same
let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const gauss = () => Math.sqrt(-2 * Math.log(rnd() + 1e-12)) * Math.cos(2 * Math.PI * rnd());

const BASE = { lat: 44.2915, lon: -76.4123 }; // open farmland, chosen at random
const GROUND = 96;
const M_LAT = 111320, M_LON = 111320 * Math.cos((BASE.lat * Math.PI) / 180);
const at = (n, e) => ({ lat: BASE.lat + n / M_LAT, lon: BASE.lon + e / M_LON });
const T0 = Date.UTC(2026, 0, 1, 12, 0, 0), DUR = 240; // seconds
const iso = (t) => new Date(t).toISOString().replace("Z", "");
const q = (s) => `"${String(s).replace(/"/g, '""')}"`;

// Drones: north/east offsets in metres as a function of seconds since start.
const DRONES = [
  { name: "FAKE-FPV-RED1", side: "RED", f: (s) => ({ n: 1400 - s * 5.2 + 120 * Math.sin(s / 14), e: -900 + s * 3.1, h: 60 + 25 * Math.sin(s / 30) }) },
  { name: "FAKE-FPV-RED2", side: "RED", f: (s) => ({ n: -700 + 500 * Math.sin(s / 38), e: 1300 - s * 4.4, h: 90 + 15 * Math.cos(s / 20) }) },
  { name: "FAKE-FPV-BLUE1", side: "BLUE", f: (s) => ({ n: 380 * Math.sin(s / 26), e: 520 * Math.sin(s / 52), h: 45 + 10 * Math.sin(s / 11) }) },
];
const SITES = [
  { id: "RDRA", type: "RADAR", n: 0, e: 0 },
  { id: "RFDF", type: "RF", n: 220, e: -340 },
  { id: "CAMB", type: "CAMERA", n: -260, e: 180 },
  { id: "ACSC", type: "ACOUSTIC", n: 140, e: 420 },
];
const stamp = (name) => `${name}_260101_1200_1204.csv`;

const pos = (d, s) => { const p = d.f(s), g = at(p.n, p.e); return { ...p, ...g, alt: GROUND + p.h }; };

for (const d of DRONES) {
  const rows = ["timestamp,latitude,longitude,geo_altitude,height,flight_id"];
  for (let k = 0; k <= DUR * 10; k++) {
    const s = k / 10, p = pos(d, s);
    rows.push([iso(T0 + s * 1000), p.lat.toFixed(7), p.lon.toFixed(7), p.alt.toFixed(1), p.h.toFixed(1), `fake-${d.name.toLowerCase()}`].join(","));
  }
  writeFileSync(join(truthDir, `DroneTag_${d.side}_260101_1200_1204_${d.name}.csv`), rows.join("\n") + "\n");
}

const CLS = q("[{'type': 'UAV'}, {'type': 'UAV Rotary Wing'}]");
const BIRD = q("[{'type': 'Animal'}, {'type': 'Bird'}]");

for (const site of SITES) {
  const sl = at(site.n, site.e);
  const sens = [sl.lon.toFixed(7), sl.lat.toFixed(7), GROUND.toFixed(1), "WGS84"];
  const positional = site.type === "RADAR";
  const head = positional
    ? "timestamp,sensor_location_x,sensor_location_y,sensor_location_z,sensor_location_coordinateSystem,objectId,classification,location_x,location_y,location_z,location_coordinateSystem"
    : "timestamp,sensor_location_x,sensor_location_y,sensor_location_z,sensor_location_coordinateSystem,objectId,classification,rangeBearing_azimuth,rangeBearing_elevation,rangeBearing_range,rangeBearing_coordinateSystem";
  const rows = [head];
  const hz = positional ? 2 : site.type === "CAMERA" ? 2 : 1;
  for (let k = 0; k <= DUR * hz; k++) {
    const s = k / hz, t = iso(T0 + s * 1000);
    DRONES.forEach((d, j) => {
      if (site.type === "RF" && d.side === "BLUE") return; // RF only hears the hostile links
      const p = pos(d, s);
      const dn = p.n - site.n, de = p.e - site.e, dist = Math.hypot(dn, de);
      const reach = { RADAR: 2600, RF: 3000, CAMERA: 1300, ACOUSTIC: 700 }[site.type];
      if (dist > reach || rnd() < 0.08) return;
      const id = `${site.id.toLowerCase()}-${j + 1}`;
      if (positional) {
        const g = at(p.n + gauss() * 6, p.e + gauss() * 6);
        rows.push([t, ...sens, id, CLS, g.lon.toFixed(7), g.lat.toFixed(7), (p.alt + gauss() * 3).toFixed(1), "WGS84"].join(","));
      } else {
        const noise = { RF: 3, CAMERA: 0.6, ACOUSTIC: 5 }[site.type];
        const az = (((Math.atan2(de, dn) * 180) / Math.PI + gauss() * noise) + 360) % 360;
        const el = (Math.atan2(p.h, dist) * 180) / Math.PI;
        const range = site.type === "CAMERA" ? (dist * (1 + gauss() * 0.05)).toFixed(1) : "";
        rows.push([t, ...sens, id, CLS, az.toFixed(2), el.toFixed(2), range, "DEGREES"].join(","));
      }
    });
    // a little radar clutter
    if (positional && rnd() < 0.3) {
      const g = at(gauss() * 900, gauss() * 900);
      rows.push([t, ...sens, `rdra-c${Math.floor(s / 20)}`, BIRD, g.lon.toFixed(7), g.lat.toFixed(7), (GROUND + 20 + rnd() * 40).toFixed(1), "WGS84"].join(","));
    }
  }
  writeFileSync(join(sensorDir, stamp(`FAKE_${site.id}_${site.type}`)), rows.join("\n") + "\n");
}
console.log("wrote fake CUAS data to", out);
