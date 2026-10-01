const APEX_CURRENT = {
  cache: null,

  async load() {
    if (this.cache) return this.cache;
    if (!window.APEX_CURRENT_SNAPSHOT) {
      throw new Error("Embedded current-season snapshot missing.");
    }
    this.cache = window.APEX_CURRENT_SNAPSHOT;
    return this.cache;
  },

  driverByNumber(data, number) {
    return data.drivers.find(d => Number(d.driverNumber) === Number(number));
  },

  wins(data, driverName) {
    return data.races.filter(r => r.winner === driverName).length;
  },

  latestFinish(data, number) {
    return data.latestRace.results.find(r => Number(r.driverNumber) === Number(number)) || null;
  }
};
window.APEX_CURRENT = APEX_CURRENT;
