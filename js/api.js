const API = {
  BASE: 'https://api.sportsrc.org/',
  CACHE: {},
  CACHE_TTL: 30000,

  async get(endpoint) {
    const now = Date.now();
    if (this.CACHE[endpoint] && now - this.CACHE[endpoint].time < this.CACHE_TTL) {
      return this.CACHE[endpoint].data;
    }
    try {
      const res = await fetch(this.BASE + endpoint, { signal: AbortSignal.timeout(8000) });
      const data = await res.json();
      this.CACHE[endpoint] = { data, time: now };
      return data;
    } catch (e) {
      console.error('API Error:', endpoint, e);
      return { success: false, data: [] };
    }
  },

  getMatches() {
    return this.get('?data=matches&category=football');
  },

  getMatchDetail(id) {
    return this.get(`?data=detail&category=football&id=${id}`);
  },

  getSportMatches(category) {
    return this.get(`?data=matches&category=${category}`);
  },

  getSportDetail(id, category) {
    return this.get(`?data=detail&category=${category}&id=${id}`);
  },

  getLeagues() {
    return this.get('?data=results&category=leagues');
  },

  getStandings(league) {
    return this.get(`?data=results&category=tables&league=${league}`);
  },

  getScores(league) {
    return this.get(`?data=results&category=scores&league=${league}`);
  }
};
