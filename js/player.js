const Player = {
  currentMatchId: null,
  currentCategory: 'football',
  currentSourceIndex: 0,
  sources: [],

  async init(matchId, category) {
    this.currentMatchId = matchId;
    this.currentCategory = category || 'football';
    this.currentSourceIndex = 0;
    const sourcePanel = document.getElementById('source-panel');
    if (sourcePanel) {
      sourcePanel.innerHTML = `<div class="stream-loading" style="padding:40px"><div class="spinner"></div><p>Loading sources...</p></div>`;
    }
    const data = await API.getSportDetail(matchId, this.currentCategory);
    if (data.success && data.data && data.data.sources && data.data.sources.length > 0) {
      this.sources = data.data.sources;
      this.renderMatchInfo(data.data);
      if (sourcePanel) {
        sourcePanel.innerHTML = `<div id="source-list"></div>`;
      }
      this.renderSourceList();
      this.loadSource(0);
    } else {
      const playerEl = document.getElementById('stream-player');
      if (playerEl) {
        playerEl.innerHTML = `<div class="stream-error"><span class="error-icon">⚠️</span><p>No streams available</p></div>`;
      }
      if (sourcePanel) {
        sourcePanel.innerHTML = `<div class="empty-state"><div class="empty-icon">📺</div><p>No sources found</p></div>`;
      }
    }
  },

  renderMatchInfo(match) {
    const header = document.getElementById('match-header');
    if (!header) return;
    const homeBadge = this.badgeHtml(match.teams?.home?.badge, match.teams?.home?.name);
    const awayBadge = this.badgeHtml(match.teams?.away?.badge, match.teams?.away?.name);
    const matchTime = match.date || 0;
    const now = Date.now();
    const isLive = matchTime <= now && matchTime > now - 7200000;
    header.innerHTML = `
      <div class="team-info">
        ${homeBadge}
        <span class="team-name">${match.teams?.home?.name || 'TBD'}</span>
      </div>
      <div class="score-display">
        <div class="score">${isLive ? '•' : '—'} : ${isLive ? '•' : '—'}</div>
        <div class="time">${isLive ? '🔴 LIVE' : this.formatTime(matchTime)}</div>
      </div>
      <div class="team-info">
        ${awayBadge}
        <span class="team-name">${match.teams?.away?.name || 'TBD'}</span>
      </div>`;
  },

  badgeHtml(url, name) {
    const letter = (name || '?')[0];
    if (url) {
      return `<img class="badge" src="${url}" alt="${name || ''}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><span class="badge-placeholder" style="display:none">${letter}</span>`;
    }
    return `<span class="badge-placeholder">${letter}</span>`;
  },

  formatTime(ts) {
    const d = new Date(ts);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  },

  loadSource(index) {
    if (index < 0 || index >= this.sources.length) return;
    this.currentSourceIndex = index;
    const source = this.sources[index];
    const playerEl = document.getElementById('stream-player');
    if (!playerEl) return;
    playerEl.innerHTML = `
      <div class="player-embed-wrap">
        <iframe 
          src="${source.embedUrl}"
          frameborder="0"
          allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
          allowfullscreen
          referrerpolicy="no-referrer"
          sandbox="allow-scripts allow-same-origin allow-forms"
          style="width:100%;height:100%;border:0;position:absolute;top:0;left:0;"
        ></iframe>
        <div class="player-embed-bar">
          <button class="open-browser-btn" onclick="Player.openInBrowser()">🌐 Open in Browser</button>
          <span class="player-embed-hint">If black screen, tap Open in Browser</span>
        </div>
      </div>`;
    this.updateOpenButton();
    this.highlightSource(index);
  },

  openInBrowser() {
    const source = this.sources[this.currentSourceIndex];
    if (source && source.embedUrl) {
      window.open(source.embedUrl, '_blank', 'noopener');
    }
  },

  updateOpenButton() {
    const btn = document.querySelector('.open-browser-btn');
    if (!btn) return;
    const source = this.sources[this.currentSourceIndex];
    if (source) {
      btn.onclick = () => window.open(source.embedUrl, '_blank', 'noopener');
    }
  },

  renderSourceList() {
    const listEl = document.getElementById('source-list');
    if (!listEl) return;
    listEl.innerHTML = `
      <div class="source-header">
        <span class="source-count">${this.sources.length} sources</span>
        <div class="source-nav">
          <button class="source-nav-btn" onclick="Player.prevSource()">◀ Prev</button>
          <button class="source-nav-btn" onclick="Player.nextSource()">Next ▶</button>
        </div>
      </div>
      <div class="source-grid">
        ${this.sources.map((s, i) => `
          <button class="source-btn ${i === this.currentSourceIndex ? 'active' : ''}" onclick="Player.loadSource(${i})" data-index="${i}">
            <span class="source-num">${i + 1}</span>
            <span class="source-info">
              <span class="source-lang">${s.language || 'Auto'}</span>
              <span class="source-meta">
                ${s.hd ? '<span class="hd-badge">HD</span>' : '<span class="sd-badge">SD</span>'}
                ${s.viewers > 0 ? `<span class="viewers">${s.viewers} 👁</span>` : ''}
              </span>
            </span>
            <span class="source-external" onclick="event.stopPropagation();window.open('${s.embedUrl}','_blank','noopener')" title="Open in browser">↗</span>
          </button>
        `).join('')}
      </div>
      <div class="source-footer">
        <span>💡 Install <strong>uBlock Origin</strong> (free ad blocker) for fewer ads</span>
      </div>`;
  },

  highlightSource(index) {
    document.querySelectorAll('.source-btn').forEach(btn => {
      btn.classList.toggle('active', parseInt(btn.dataset.index) === index);
    });
  },

  nextSource() {
    this.loadSource((this.currentSourceIndex + 1) % this.sources.length);
  },

  prevSource() {
    this.loadSource((this.currentSourceIndex - 1 + this.sources.length) % this.sources.length);
  }
};
