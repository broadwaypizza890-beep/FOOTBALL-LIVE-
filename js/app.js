const App = {
  currentRoute: '',
  matches: [],
  standingsCache: {},

  async init() {
    this.setupNav();
    window.addEventListener('hashchange', () => this.route());
    document.addEventListener('click', e => {
      const tab = e.target.closest('.date-tab');
      if (tab && tab.dataset.filter) this.setDateFilter(tab.dataset.filter);
    });
    this.route();
  },

  setupNav() {
    document.querySelector('.hamburger').addEventListener('click', () => {
      document.querySelector('.nav-links').classList.toggle('open');
    });
    document.querySelectorAll('.nav-links a').forEach(a => {
      a.addEventListener('click', () => {
        document.querySelector('.nav-links').classList.remove('open');
      });
    });
    document.querySelector('.logo').addEventListener('click', () => {
      window.location.hash = '#home';
    });
  },

  async route() {
    const hash = window.location.hash || '#home';
    const main = document.getElementById('main-content');
    this.updateActiveNav(hash);
    const [path, ...parts] = hash.slice(1).split('/');
    const param = parts.join('/');

    switch (path) {
      case 'home':
        this.currentRoute = 'home';
        await this.renderHome(main);
        break;
      case 'sports':
        this.currentRoute = 'sports';
        this.renderSportsGrid(main);
        break;
      case 'sport':
        this.currentRoute = 'sport';
        await this.renderSportCategory(param, main);
        break;
      case 'leagues':
        this.currentRoute = 'leagues';
        this.renderLeagueList(main);
        break;
      case 'cups':
        this.currentRoute = 'cups';
        this.renderCupList(main);
        break;
      case 'league':
        this.currentRoute = 'league';
        await this.renderLeague(param, main);
        break;
      case 'match':
        this.currentRoute = 'match';
        await this.renderMatch(param, main);
        break;
      case 'standings':
        this.currentRoute = 'standings';
        await this.renderStandings('PL', main);
        break;
      case 'standings-view':
        this.currentRoute = 'standings-view';
        await this.renderStandings(param || 'PL', main);
        break;
      case 'tv':
        this.currentRoute = 'tv';
        this.renderTVHome(main);
        break;
      case 'tv-country':
        this.currentRoute = 'tv-country';
        this.renderTVCountry(param, main);
        break;
      case 'tv-channel':
        this.currentRoute = 'tv-channel';
        this.renderTVChannel(param, main);
        break;
      default:
        window.location.hash = '#home';
    }
  },

  updateActiveNav(hash) {
    document.querySelectorAll('.nav-links a').forEach(a => {
      const href = a.getAttribute('href');
      a.classList.toggle('active', hash.startsWith(href));
    });
  },

  // ===== HOME =====
  async renderHome(main) {
    main.innerHTML = `
      <div class="hero">
        <h1>Watch <span class="highlight">Live Sports</span><br>Streams For Free</h1>
        <p>Football, Basketball, Boxing, Tennis & more — all in one place</p>
      </div>
      <div class="date-tabs" id="date-tabs">
        <button class="date-tab" data-filter="live">🔴 Live</button>
        <button class="date-tab" data-filter="today">Today</button>
        <button class="date-tab" data-filter="tomorrow">Tomorrow</button>
        <button class="date-tab" data-filter="week">This Week</button>
        <button class="date-tab active" data-filter="all">All</button>
      </div>
      <div id="home-content">
        <div class="loading-state"><div class="spinner"></div><p>Loading matches...</p></div>
      </div>
    `;
    const data = await API.getMatches();
    if (data.success && data.data && data.data.length > 0) {
      this.matches = data.data;
      this.activeDateFilter = 'all';
      this.renderDateView('all');
    } else {
      document.getElementById('home-content').innerHTML = `<div class="empty-state"><div class="empty-icon">⚽</div><p>No matches available</p></div>`;
    }
  },

  setDateFilter(filter) {
    this.activeDateFilter = filter;
    document.querySelectorAll('.date-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.filter === filter);
    });
    this.renderDateView(filter);
  },

  getDateGroup(timestamp) {
    const d = new Date(timestamp);
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);
    const day3Start = new Date(todayStart);
    day3Start.setDate(day3Start.getDate() + 2);
    const weekEnd = new Date(todayStart);
    weekEnd.setDate(weekEnd.getDate() + 8);
    const ts = timestamp;
    const nowTs = now.getTime();
    if (ts <= nowTs && ts > nowTs - 7200000) return 'live';
    if (d >= todayStart && d < tomorrowStart) return 'today';
    if (d >= tomorrowStart && d < day3Start) return 'tomorrow';
    if (d >= day3Start && d < weekEnd) return 'week';
    return 'later';
  },

  renderDateView(filter) {
    const container = document.getElementById('home-content');
    if (!container) return;
    const now = Date.now();
    let filtered = this.matches.filter(m => {
      const t = m.date || 0;
      if (filter === 'live') return t <= now && t > now - 7200000;
      if (filter === 'all') return (t <= now && t > now - 7200000) || t > now;
      return this.getDateGroup(t) === filter;
    });
    if (filter !== 'live') {
      const live = this.matches.filter(m => {
        const t = m.date || 0;
        return t <= now && t > now - 7200000;
      });
      filtered = [...live, ...filtered.filter(m => {
        const t = m.date || 0;
        return !(t <= now && t > now - 7200000);
      })];
    }
    if (filtered.length === 0) {
      container.innerHTML = `<div class="empty-state"><div class="empty-icon">📅</div><p>No matches ${filter === 'today' ? 'today' : filter === 'tomorrow' ? 'tomorrow' : filter === 'week' ? 'this week' : filter === 'live' ? 'live now' : 'found'}</p></div>`;
      return;
    }
    const liveMatches = filtered.filter(m => {
      const t = m.date || 0;
      return t <= now && t > now - 7200000;
    });
    const upcomingMatches = filtered.filter(m => {
      const t = m.date || 0;
      return !(t <= now && t > now - 7200000);
    });
    const groups = this.groupMatches(upcomingMatches);
    let html = '';
    if (liveMatches.length > 0) {
      html += `
        <div class="match-section">
          <div class="section-header">
            <h2>🔴 Live Now</h2>
            <span class="badge badge-live">${liveMatches.length} LIVE</span>
          </div>
          <div class="matches-grid" id="flive-matches"></div>
        </div>`;
    }
    groups.forEach(g => {
      if (g.matches.length === 0) return;
      const c = g.competition;
      html += `
        <div class="comp-section">
          <div class="comp-section-header" style="--comp-color:${c.color}">
            <div class="comp-section-title">
              <span class="comp-section-dot" style="background:${c.color}"></span>
              <h3>${c.name}</h3>
            </div>
            <span class="comp-match-count">${g.matches.length} match${g.matches.length > 1 ? 'es' : ''}</span>
          </div>
          <div class="matches-grid" id="fcomp-${c.id}"></div>
        </div>`;
    });
    html += `
      <div class="section-header" style="margin-top:32px">
        <h2>⚽ Leagues & Competitions</h2>
      </div>
      <div class="league-grid" id="fhome-leagues"></div>`;
    container.innerHTML = html;
    this.renderLeagueCards('fhome-leagues');
    if (liveMatches.length > 0) this.renderMatchList(liveMatches, 'flive-matches');
    groups.forEach(g => this.renderMatchList(g.matches, `fcomp-${g.competition.id}`));
  },

  renderMatchList(matches, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    if (!matches || matches.length === 0) {
      container.innerHTML = `<div class="empty-state"><div class="empty-icon">⚽</div><p>No matches right now</p></div>`;
      return;
    }
    const now = Date.now();
    container.innerHTML = matches.slice(0, 30).map(m => {
      const matchTime = m.date || 0;
      const isLive = matchTime <= now && matchTime > now - 7200000;
      const isFinished = matchTime < now - 7200000;
      const status = isLive ? 'live' : isFinished ? 'finished' : 'scheduled';
      const comp = this.detectCompetition(m);
      const homeBadge = this.getBadgeHtml(m.teams?.home?.badge, m.teams?.home?.name);
      const awayBadge = this.getBadgeHtml(m.teams?.away?.badge, m.teams?.away?.name);
      const statusClass = status === 'live' ? 'status-live' : status === 'scheduled' ? 'status-scheduled' : 'status-finished';
      const statusText = status === 'live' ? '🔴 LIVE' : status === 'scheduled' ? this.formatTime(matchTime) : 'FT';
      return `
        <div class="match-card" onclick="window.location.hash='#match/${m.category || 'football'}/${m.id}'">
          <div class="match-competition">
            <span class="comp-badge" style="background:${comp.color};color:#fff">${comp.id || '?'}</span>
            <span class="comp-name">${comp.name}</span>
          </div>
          <div class="match-body">
            <div class="match-teams">
              <div class="team home">${homeBadge}<span class="name">${m.teams?.home?.name || 'TBD'}</span></div>
              <span class="vs">vs</span>
              <div class="team away">${awayBadge}<span class="name">${m.teams?.away?.name || 'TBD'}</span></div>
            </div>
            <div class="match-right">
              <span class="status-badge ${statusClass}">${statusText}</span>
              <button class="watch-btn">▶ Watch</button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  },

  getBadgeHtml(url, name) {
    if (url) {
      return `<img class="badge" src="${url}" alt="${name || ''}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><span class="badge-placeholder" style="display:none">${(name || '?')[0]}</span>`;
    }
    return `<span class="badge-placeholder">${(name || '?')[0]}</span>`;
  },

  formatTime(ts) {
    const d = new Date(ts);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const opts = { hour: '2-digit', minute: '2-digit' };
    if (isToday) return d.toLocaleTimeString('en-US', opts);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString('en-US', opts);
  },

  detectCompetition(match) {
    const home = match.teams?.home?.name || '';
    const away = match.teams?.away?.name || '';
    const homeL = CONFIG.TEAM_LEAGUE_MAP[home];
    const awayL = CONFIG.TEAM_LEAGUE_MAP[away];
    if (homeL && homeL === awayL) return CONFIG.ALL.find(c => c.id === homeL) || null;
    if (homeL && !awayL) return CONFIG.ALL.find(c => c.id === homeL) || null;
    if (!homeL && awayL) return CONFIG.ALL.find(c => c.id === awayL) || null;
    if (match.category && match.category !== 'football') {
      const sport = CONFIG.SPORTS.find(s => s.id === match.category);
      if (sport) return { id: sport.icon, name: sport.name, color: sport.color, type: 'sport' };
    }
    return { id: 'INT', name: 'International', color: '#888899', type: 'friendly' };
  },

  groupMatches(matches) {
    const groups = {};
    matches.forEach(m => {
      const comp = this.detectCompetition(m);
      const key = comp.id;
      if (!groups[key]) groups[key] = { competition: comp, matches: [] };
      groups[key].matches.push(m);
    });
    const order = ['PL', 'PD', 'SA', 'BL1', 'FL1', 'CL', 'DED', 'BSA', 'PPL', 'ELC', 'EC', 'WC', 'INT'];
    return Object.entries(groups)
      .sort(([a], [b]) => {
        const ai = order.indexOf(a);
        const bi = order.indexOf(b);
        return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
      })
      .map(([, v]) => v);
  },

  // ===== LEAGUE LIST =====
  renderLeagueList(main) {
    main.innerHTML = `
      <div class="hero">
        <h1>⚽ Leagues</h1>
        <p>Select a league to view matches and standings</p>
      </div>
      <div class="league-grid" id="league-grid"></div>
    `;
    this.renderLeagueCards('league-grid');
  },

  // ===== CUP LIST =====
  renderCupList(main) {
    main.innerHTML = `
      <div class="hero">
        <h1>🏆 Cups & Tournaments</h1>
        <p>Select a competition to view matches and standings</p>
      </div>
      <div class="league-grid" id="cup-grid"></div>
    `;
    this.renderCompetitionCards('cup-grid', CONFIG.CUPS);
  },

  renderLeagueCards(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = CONFIG.LEAGUES.map(l => `
      <div class="league-card" onclick="window.location.hash='#league/${l.id}'" style="--accent:${l.color}">
        <div class="league-icon" style="background:${l.color}">${l.name[0]}</div>
        <div class="league-name">${l.name}</div>
        <div class="league-country">${l.country}</div>
        <div class="league-type">LEAGUE</div>
      </div>
    `).join('');
  },

  renderCompetitionCards(containerId, comps) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = comps.map(c => `
      <div class="league-card" onclick="window.location.hash='#league/${c.id}'" style="--accent:${c.color}">
        <div class="league-icon" style="background:${c.color}">${c.name[0]}</div>
        <div class="league-name">${c.name}</div>
        <div class="league-country">${c.country}</div>
        <div class="league-type">CUP</div>
      </div>
    `).join('');
  },

  // ===== SPORTS =====
  renderSportsGrid(main) {
    main.innerHTML = `
      <div class="hero">
        <h1>🏅 All Sports</h1>
        <p>Select a sport to watch live matches & streams</p>
      </div>
      <div class="sports-grid" id="sports-grid"></div>
    `;
    const container = document.getElementById('sports-grid');
    if (!container) return;
    container.innerHTML = CONFIG.SPORTS.map(s => `
      <div class="sport-card" onclick="window.location.hash='#sport/${s.id}'" style="--sport-color:${s.color}" data-sport="${s.id}">
        <div class="sport-icon" style="background:${s.color}">${s.icon}</div>
        <div class="sport-name">${s.name}</div>
        <div class="sport-count loading">...</div>
      </div>
    `).join('');
    CONFIG.SPORTS.forEach(s => {
      API.getSportMatches(s.id).then(data => {
        const card = container.querySelector(`[data-sport="${s.id}"]`);
        if (!card) return;
        const count = (data.success && data.data) ? data.data.length : 0;
        const now = Date.now();
        const live = data.data ? data.data.filter(m => {
          const t = m.date || 0;
          return t <= now && t > now - 7200000;
        }).length : 0;
        const countEl = card.querySelector('.sport-count');
        if (count === 0) {
          countEl.textContent = 'No matches';
          countEl.className = 'sport-count empty';
        } else if (live > 0) {
          countEl.textContent = `${live} LIVE`;
          countEl.className = 'sport-count live';
        } else {
          countEl.textContent = `${count} matches`;
          countEl.className = 'sport-count';
        }
      }).catch(() => {});
    });
  },

  async renderSportCategory(category, main) {
    const sport = CONFIG.SPORTS.find(s => s.id === category);
    if (!sport) { window.location.hash = '#sports'; return; }
    main.innerHTML = `
      <button class="back-btn" onclick="history.back()">← Back</button>
      <div class="comp-header">
        <div class="comp-icon" style="background:${sport.color};font-size:28px">${sport.icon}</div>
        <div class="comp-info">
          <h1>${sport.name}</h1>
          <p>Live matches & streams</p>
        </div>
      </div>
      <div id="sport-content">
        <div class="loading-state"><div class="spinner"></div><p>Loading ${sport.name} matches...</p></div>
      </div>
    `;
    const data = await API.getSportMatches(category);
    const content = document.getElementById('sport-content');
    if (data.success && data.data && data.data.length > 0) {
      const now = Date.now();
      const liveMatches = data.data.filter(m => {
        const t = m.date || 0;
        return t <= now && t > now - 7200000;
      });
      const upcoming = data.data.filter(m => {
        const t = m.date || 0;
        return t > now;
      });
      let html = '';
      if (liveMatches.length > 0) {
        html += `
          <div class="match-section">
            <div class="section-header">
              <h2>🔴 Live Now</h2>
              <span class="badge badge-live">${liveMatches.length} LIVE</span>
            </div>
            <div class="matches-grid" id="slive-matches"></div>
          </div>`;
      }
      if (upcoming.length > 0) {
        html += `
          <div class="section-header"><h2>📅 Upcoming Matches</h2></div>
          <div class="matches-grid" id="supcoming-matches"></div>`;
      }
      content.innerHTML = html;
      if (liveMatches.length > 0) this.renderMatchList(liveMatches, 'slive-matches');
      if (upcoming.length > 0) this.renderMatchList(upcoming, 'supcoming-matches');
    } else {
      content.innerHTML = `<div class="empty-state"><div class="empty-icon">📺</div><p>No ${sport.name} matches available</p></div>`;
    }
  },

  // ===== LIVE TV =====
  renderTVHome(main) {
    main.innerHTML = `
      <div class="hero">
        <h1>📺 Live TV</h1>
        <p>Free live news channels from around the world</p>
      </div>
      <div class="tv-country-grid" id="tv-countries"></div>
    `;
    const grid = document.getElementById('tv-countries');
    grid.innerHTML = CONFIG.TV_COUNTRIES.map(c => {
      const count = CONFIG.TV_CHANNELS.filter(ch => ch.country === c.id).length;
      if (count === 0) return '';
      return `
        <div class="tv-country-card" onclick="window.location.hash='#tv-country/${c.id}'">
          <div class="tv-country-flag">${c.flag}</div>
          <div class="tv-country-name">${c.name}</div>
          <div class="tv-country-count">${count} channel${count > 1 ? 's' : ''}</div>
        </div>
      `;
    }).join('');
  },

  renderTVCountry(countryId, main) {
    const country = CONFIG.TV_COUNTRIES.find(c => c.id === countryId);
    if (!country) { window.location.hash = '#tv'; return; }
    const channels = CONFIG.TV_CHANNELS.filter(c => c.country === countryId);
    main.innerHTML = `
      <button class="back-btn" onclick="history.back()">← Back</button>
      <div class="comp-header">
        <div class="comp-icon" style="background:#333;font-size:28px">${country.flag}</div>
        <div class="comp-info">
          <h1>${country.name}</h1>
          <p>${channels.length} live channel${channels.length > 1 ? 's' : ''}</p>
        </div>
      </div>
      <div class="tv-channel-grid">
        ${channels.map(ch => `
          <div class="tv-channel-card" onclick="window.open('${ch.embed}', '_blank', 'noopener')">
            <div class="tv-channel-icon">${ch.flag}</div>
            <div class="tv-channel-info">
              <div class="tv-channel-name">${ch.name}</div>
              <div class="tv-channel-type">${ch.type.toUpperCase()}</div>
            </div>
            <button class="watch-btn">▶ Watch</button>
          </div>
        `).join('')}
      </div>
      <p class="tv-note">⚠️ Channels open in a new tab (most block iframe embedding)</p>
    `;
  },

  renderTVChannel(channelId, main) {
    const channel = CONFIG.TV_CHANNELS.find(c => c.id === channelId);
    if (!channel) { window.location.hash = '#tv'; return; }
    main.innerHTML = `
      <button class="back-btn" onclick="history.back()">← Back</button>
      <div class="tv-player-section">
        <div class="tv-channel-big">
          <div class="tv-channel-big-icon">${channel.flag}</div>
          <h2>${channel.name}</h2>
          <span class="comp-badge" style="background:#333;color:#fff">${channel.type.toUpperCase()}</span>
        </div>
        <div class="tv-open-btn-wrap">
          <a href="${channel.embed}" target="_blank" rel="noopener" class="tv-open-btn">▶ Open ${channel.name}</a>
        </div>
        <p class="tv-note">⚠️ Opens in a new tab — most broadcasters block embedded streaming</p>
      </div>
    `;
  },

  // ===== LEAGUE PAGE =====
  async renderLeague(code, main) {
    const league = CONFIG.ALL.find(l => l.id === code);
    if (!league) {
      window.location.hash = '#leagues';
      return;
    }
    main.innerHTML = `
      <button class="back-btn" onclick="history.back()">← Back</button>
      <div class="comp-header">
        <div class="comp-icon" style="background:${league.color}">${league.name[0]}</div>
        <div class="comp-info">
          <h1>${league.name}</h1>
          <p>${league.country} • ${league.type.toUpperCase()}</p>
        </div>
      </div>
      <div class="tabs">
        <button class="tab active" onclick="App.switchLeagueTab('matches', '${code}')">Matches</button>
        <button class="tab" onclick="App.switchLeagueTab('standings', '${code}')">Standings</button>
      </div>
      <div id="league-content">
        <div class="loading-state"><div class="spinner"></div><p>Loading matches...</p></div>
      </div>
    `;
    await this.renderLeagueMatches(code);
  },

  async switchLeagueTab(tab, code) {
    const tabs = document.querySelectorAll('.tabs .tab');
    tabs.forEach(t => t.classList.remove('active'));
    if (tab === 'matches') tabs[0].classList.add('active');
    else tabs[1].classList.add('active');
    const content = document.getElementById('league-content');
    if (tab === 'matches') {
      await this.renderLeagueMatches(code);
    } else {
      await this.renderLeagueStandings(code);
    }
  },

  async renderLeagueMatches(code) {
    const content = document.getElementById('league-content');
    if (!content) return;
    content.innerHTML = `<div class="loading-state"><div class="spinner"></div><p>Loading matches...</p></div>`;
    const data = await API.getMatches();
    if (data.success && data.data) {
      const leagueMatches = data.data.filter(m => {
        const homeName = m.teams?.home?.name || '';
        const awayName = m.teams?.away?.name || '';
        return CONFIG.TEAM_LEAGUE_MAP[homeName] === code || CONFIG.TEAM_LEAGUE_MAP[awayName] === code;
      });
      const matchesHtml = leagueMatches.length > 0
        ? `<div class="matches-grid" id="league-matches"></div>`
        : `<div class="empty-state"><div class="empty-icon">⚽</div><p>No matches found for this competition</p></div>`;
      content.innerHTML = matchesHtml;
      if (leagueMatches.length > 0) {
        this.renderMatchList(leagueMatches, 'league-matches');
      }
    } else {
      content.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><p>Could not load matches</p></div>`;
    }
  },

  async renderLeagueStandings(code) {
    const content = document.getElementById('league-content');
    if (!content) return;
    content.innerHTML = `<div class="loading-state"><div class="spinner"></div><p>Loading standings...</p></div>`;
    const data = await API.getStandings(code);
    if (data.success && data.data && data.data.standings && data.data.standings.length > 0) {
      const table = data.data.standings[0].table;
      content.innerHTML = this.buildStandingsTable(table, data.data.competition);
    } else {
      content.innerHTML = `<div class="empty-state"><div class="empty-icon">📊</div><p>Standings not available for this competition</p></div>`;
    }
  },

  buildStandingsTable(table, competition) {
    if (!table || table.length === 0) {
      return `<div class="empty-state"><div class="empty-icon">📊</div><p>No standings data</p></div>`;
    }
    return `
      <table class="standings-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Team</th>
            <th>P</th>
            <th>W</th>
            <th>D</th>
            <th>L</th>
            <th>GF</th>
            <th>GA</th>
            <th>GD</th>
            <th>Pts</th>
          </tr>
        </thead>
        <tbody>
          ${table.map(row => {
            const pos = row.position || row.position;
            const crestHtml = row.team?.crest
              ? `<img class="team-crest" src="${row.team.crest}" alt="" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><span class="team-crest-placeholder" style="display:none">${(row.team.shortName || row.team.name || '?')[0]}</span>`
              : `<span class="team-crest-placeholder">${(row.team.shortName || row.team.name || '?')[0]}</span>`;
            return `
              <tr>
                <td class="pos pos-${pos <= 3 ? pos : ''}">${pos}</td>
                <td><div class="team-cell">${crestHtml}<span>${row.team.shortName || row.team.name}</span></div></td>
                <td>${row.playedGames}</td>
                <td>${row.won}</td>
                <td>${row.draw}</td>
                <td>${row.lost}</td>
                <td>${row.goalsFor}</td>
                <td>${row.goalsAgainst}</td>
                <td>${row.goalDifference > 0 ? '+' : ''}${row.goalDifference}</td>
                <td class="pts">${row.points}</td>
              </tr>`;
          }).join('')}
        </tbody>
      </table>`;
  },

  // ===== MATCH + PLAYER =====
  async renderMatch(param, main) {
    const idx = param.indexOf('/');
    const category = idx > 0 ? param.slice(0, idx) : 'football';
    const id = idx > 0 ? param.slice(idx + 1) : param;
    main.innerHTML = `
      <button class="back-btn" onclick="history.back()">← Back</button>
      <div class="match-header" id="match-header">
        <div class="loading-state"><div class="spinner"></div><p>Loading match...</p></div>
      </div>
      <div class="player-section">
        <div class="player-container" id="stream-player">
          <div class="stream-loading"><div class="spinner"></div><p>Loading stream...</p></div>
        </div>
      </div>
      <div class="source-panel" id="source-panel"></div>
    `;
    await Player.init(id, category);
  },

  // ===== STANDINGS =====
  async renderStandings(selectedLeague, main) {
    main.innerHTML = `
      <div class="hero">
        <h1>📊 League Standings</h1>
        <p>Select a league to view the table</p>
      </div>
      <div class="standings-selector">
        <select id="standings-select" onchange="App.switchStandings(this.value)">
          ${CONFIG.ALL.map(l => `
            <option value="${l.id}" ${l.id === selectedLeague ? 'selected' : ''}>${l.name}</option>
          `).join('')}
        </select>
      </div>
      <div id="standings-content">
        <div class="loading-state"><div class="spinner"></div><p>Loading standings...</p></div>
      </div>
    `;
    await this.renderStandingsTable(selectedLeague);
  },

  async renderStandingsTable(code) {
    const content = document.getElementById('standings-content');
    if (!content) return;
    content.innerHTML = `<div class="loading-state"><div class="spinner"></div><p>Loading standings...</p></div>`;
    const data = await API.getStandings(code);
    if (data.success && data.data && data.data.standings && data.data.standings.length > 0) {
      const table = data.data.standings[0].table;
      content.innerHTML = this.buildStandingsTable(table, data.data.competition);
    } else {
      content.innerHTML = `<div class="empty-state"><div class="empty-icon">📊</div><p>Standings not available for this competition</p></div>`;
    }
  },

  switchStandings(code) {
    window.location.hash = `#standings-view/${code}`;
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
