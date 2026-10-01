/*
  APEX data-source layer

  Current / session-rich data:
    OpenF1

  Historical data:
    Local normalized snapshots generated from F1DB (CC BY 4.0)

  Why local snapshots?
    - GitHub Pages stays fast and static
    - no visitor-by-visitor rate-limit pressure
    - historical facts rarely change
    - we keep source attribution explicit
    - changing providers later does not require rewriting the UI

  Jolpica is intentionally NOT used by the production adapter because its
  data terms are non-commercial unless separate permission is obtained.
*/

const APEX_DATA = {
  openf1Base: "https://api.openf1.org/v1",
  historicalBase: "data/f1db",

  async openf1(path) {
    const response = await fetch(`${this.openf1Base}${path}`);
    if (!response.ok) throw new Error(`OpenF1 ${response.status}`);
    return response.json();
  },

  async localJson(name) {
    const response = await fetch(`${this.historicalBase}/${name}`);
    if (!response.ok) throw new Error(`Historical snapshot missing: ${name}`);
    return response.json();
  },

  async manifest() {
    return this.localJson("manifest.json");
  },

  async historicalReady() {
    try {
      const manifest = await this.manifest();
      return Boolean(manifest.ready);
    } catch {
      return false;
    }
  },

  async seasons() {
    return this.localJson("seasons.json");
  },

  async season(year) {
    return this.localJson(`seasons/${year}.json`);
  },

  async historicalDrivers() {
    return this.localJson("drivers.json");
  },

  async historicalDriver(id) {
    const drivers = await this.historicalDrivers();
    return drivers.find(d => d.id === id) || null;
  },

  async records() {
    return this.localJson("records.json");
  }
};

window.APEX_DATA = APEX_DATA;
