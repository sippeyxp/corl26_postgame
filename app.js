/* CoRL 2026 Interactive Session & Video Archive — Frontend Application */
(function () {
  'use strict';

  const DATA = window.CORL2026_DATA || { talks: [], posters: [], streams: {}, conference: {} };
  const TALKS = DATA.talks || [];
  const POSTERS = DATA.posters || [];
  const TALK_BY_ID = new Map(TALKS.map((t) => [t.id, t]));

  const state = {
    view: 'theater', // 'theater' | 'catalog' | 'papers'
    query: '',
    day: 'all',
    type: 'all',
    paperFilter: 'all',
    activeTalkId: TALKS[0] ? TALKS[0].id : null,
    activeVideoId: TALKS[0] ? TALKS[0].video_id : null,
    currentPlaySec: TALKS[0] ? TALKS[0].start_sec : 0,
    isPlaying: false,
    playbackRate: 1,
    collapsedSessions: new Set(),
    allCollapsed: false,
    lightboxTalkId: null,
    lightboxSubIdx: 0,
  };

  // DOM Elements
  const el = {
    headerStats: document.getElementById('headerStats'),
    brandReset: document.getElementById('brandReset'),
    searchInput: document.getElementById('searchInput'),
    searchCount: document.getElementById('searchCount'),
    clearSearchBtn: document.getElementById('clearSearchBtn'),
    searchKbd: document.getElementById('searchKbd'),
    viewBtns: document.querySelectorAll('.seg-btn[data-view]'),
    themeToggleBtn: document.getElementById('themeToggleBtn'),
    themeIcon: document.getElementById('themeIcon'),
    dayChips: document.querySelectorAll('#dayFilters .chip'),
    typeChips: document.querySelectorAll('#typeFilters .chip'),
    activeFilterStrip: document.getElementById('activeFilterStrip'),
    activeFilterSummary: document.getElementById('activeFilterSummary'),
    resetAllFiltersBtn: document.getElementById('resetAllFiltersBtn'),

    theaterView: document.getElementById('theaterView'),
    catalogView: document.getElementById('catalogView'),
    papersView: document.getElementById('papersView'),

    chapterScrubber: document.getElementById('chapterScrubber'),
    scrubberTooltip: document.getElementById('scrubberTooltip'),
    prevTalkBtn: document.getElementById('prevTalkBtn'),
    nextTalkBtn: document.getElementById('nextTalkBtn'),
    rewind10Btn: document.getElementById('rewind10Btn'),
    forward10Btn: document.getElementById('forward10Btn'),
    livePlayDot: document.getElementById('livePlayDot'),
    currentClock: document.getElementById('currentClock'),
    talkEndClock: document.getElementById('talkEndClock'),
    speedBtns: document.querySelectorAll('.speed-btn'),
    shareMomentBtn: document.getElementById('shareMomentBtn'),
    ytExternalLink: document.getElementById('ytExternalLink'),
    streamSyncBar: document.getElementById('streamSyncBar'),
    streamSyncText: document.getElementById('streamSyncText'),
    streamSyncFollowBtn: document.getElementById('streamSyncFollowBtn'),

    activeTalkBadges: document.getElementById('activeTalkBadges'),
    activeTalkTitle: document.getElementById('activeTalkTitle'),
    activeTalkByline: document.getElementById('activeTalkByline'),
    activeTalkSummary: document.getElementById('activeTalkSummary'),
    activeTalkTopics: document.getElementById('activeTalkTopics'),
    activeTalkExtra: document.getElementById('activeTalkExtra'),
    activeTalkExtraBody: document.getElementById('activeTalkExtraBody'),
    subsectionsHeading: document.getElementById('subsectionsHeading'),
    subsectionsSubheading: document.getElementById('subsectionsSubheading'),
    subsectionsGrid: document.getElementById('subsectionsGrid'),

    sidebarTitle: document.getElementById('sidebarTitle'),
    sidebarCount: document.getElementById('sidebarCount'),
    sidebarList: document.getElementById('sidebarList'),
    scrollActiveBtn: document.getElementById('scrollActiveBtn'),
    toggleExpandAllBtn: document.getElementById('toggleExpandAllBtn'),

    catalogSubtitle: document.getElementById('catalogSubtitle'),
    catalogContainer: document.getElementById('catalogContainer'),

    paperFilterChips: document.querySelectorAll('[data-pfilter]'),
    papersCountBar: document.getElementById('papersCountBar'),
    papersTableBody: document.getElementById('papersTableBody'),

    lightboxModal: document.getElementById('lightboxModal'),
    lightboxBackdrop: document.getElementById('lightboxBackdrop'),
    lightboxCloseBtn: document.getElementById('lightboxCloseBtn'),
    lightboxTime: document.getElementById('lightboxTime'),
    lightboxTalkName: document.getElementById('lightboxTalkName'),
    lightboxImg: document.getElementById('lightboxImg'),
    lightboxPrevBtn: document.getElementById('lightboxPrevBtn'),
    lightboxNextBtn: document.getElementById('lightboxNextBtn'),
    lightboxTitle: document.getElementById('lightboxTitle'),
    lightboxSummary: document.getElementById('lightboxSummary'),
    lightboxCaption: document.getElementById('lightboxCaption'),
    lightboxPlayBtn: document.getElementById('lightboxPlayBtn'),
    lightboxPlayLabel: document.getElementById('lightboxPlayLabel'),

    toast: document.getElementById('toast'),
  };

  // Helpers
  function fmtHms(sec) {
    sec = Math.max(0, Math.floor(Number(sec) || 0));
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    const mm = String(m).padStart(2, '0');
    const ss = String(s).padStart(2, '0');
    return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
  }

  function fmtDur(sec) {
    sec = Math.max(1, Math.round(Number(sec) || 0));
    if (sec < 60) return `${sec}s`;
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return s > 0 && m < 10 ? `${m}m ${s}s` : `${m}m`;
  }

  function escHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function highlightText(text, tokens) {
    const safe = escHtml(text);
    if (!tokens || !tokens.length) return safe;
    const escaped = tokens
      .filter((t) => t.length >= 2)
      .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    if (!escaped.length) return safe;
    const re = new RegExp(`(${escaped.join('|')})`, 'gi');
    return safe.replace(re, '<mark>$1</mark>');
  }

  function badgeClassAndLabel(talk) {
    const tt = talk.talk_type;
    if (tt === 'keynote') return ['badge-keynote', 'Keynote'];
    if (tt === 'fireside_chat') return ['badge-keynote', 'Fireside Chat'];
    if (tt === 'early_career_keynote') return ['badge-keynote', 'Early Career Keynote'];
    if (tt === 'oral') return ['badge-oral', `Oral ${talk.session_code}`];
    if (tt === 'spotlight') return ['badge-spotlight', `Spotlight ${talk.session_code}`];
    if (tt === 'panel') return ['badge-keynote', 'Special Panel'];
    if (tt === 'awards') return ['badge-award', 'Awards & Farewell'];
    if (tt === 'sponsor') return ['badge-sponsor', 'Diamond Sponsor'];
    if (tt === 'welcome') return ['badge-sponsor', 'Welcome'];
    if (tt === 'interlude') return ['badge-sponsor', 'Musical Interlude'];
    return ['badge-spotlight', talk.session_code || 'Session'];
  }

  let toastTimer = null;
  function showToast(msg) {
    el.toast.textContent = msg;
    el.toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      el.toast.hidden = true;
    }, 2600);
  }

  function trackEvent(eventName, params = {}) {
    const id = (window.GA_MEASUREMENT_ID || '').trim();
    if (!id || id === 'G-XXXXXXXXXX' || typeof window.gtag !== 'function') return;
    window.gtag('event', eventName, params);
  }

  // Prebuild search text per talk & subsection for instant (<3ms) search
  TALKS.forEach((t) => {
    const topParts = [
      t.title,
      (t.presenters || []).join(' '),
      (t.authors_or_panelists || []).join(' '),
      t.affiliation,
      t.session_code,
      t.session_title,
      t.session_chair,
      (t.topics || []).join(' '),
      t.summary,
      t.official_abstract,
      t.is_award_finalist ? 'award finalist best paper' : '',
    ];
    t._topBlob = topParts.join(' ').toLowerCase();
    (t.subsections || []).forEach((s) => {
      s._blob = `${s.title} ${s.summary} ${s.visual_caption}`.toLowerCase();
    });
    t._fullBlob = (t._topBlob + ' ' + (t.subsections || []).map((s) => s._blob).join(' ')).toLowerCase();
  });

  POSTERS.forEach((p) => {
    p._blob = `${p.title} ${p.poster_session} #${p.poster_number} ${p.also_presented_in} ${p.is_award_finalist ? 'award finalist' : ''}`.toLowerCase();
  });

  // YouTube IFrame Player Integration
  let ytPlayer = null;
  let ytReady = false;
  let pendingSeek = null;
  let pollHandle = null;
  let syncedCandidateTalk = null;

  function loadYouTubeApi() {
    if (window.YT && window.YT.Player) {
      initPlayer();
      return;
    }
    window.onYouTubeIframeAPIReady = initPlayer;
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    tag.onerror = () => mountFallbackIframe(state.activeVideoId, state.currentPlaySec, false);
    document.head.appendChild(tag);
  }

  function mountFallbackIframe(videoId, startSec, autoplay) {
    const mount = document.getElementById('ytPlayerMount');
    if (!mount || !videoId) return;
    const ap = autoplay ? 1 : 0;
    mount.innerHTML = `<iframe src="https://www.youtube.com/embed/${encodeURIComponent(videoId)}?start=${Math.floor(startSec)}&autoplay=${ap}&rel=0&modestbranding=1&playsinline=1" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen title="CoRL 2026 Livestream Player"></iframe>`;
  }

  function initPlayer() {
    const first = TALK_BY_ID.get(state.activeTalkId) || TALKS[0];
    if (!first) return;
    const initVid = pendingSeek ? pendingSeek.videoId : first.video_id;
    const initSec = pendingSeek ? pendingSeek.sec : first.start_sec;
    const shouldAuto = pendingSeek ? pendingSeek.autoplay : false;

    ytPlayer = new window.YT.Player('ytPlayerMount', {
      videoId: initVid,
      playerVars: {
        start: Math.floor(initSec),
        autoplay: shouldAuto ? 1 : 0,
        rel: 0,
        modestbranding: 1,
        playsinline: 1,
         origin: window.location.origin.startsWith('http') ? window.location.origin : undefined,
      },
      events: {
        onReady: () => {
          ytReady = true;
          state.activeVideoId = initVid;
          if (pendingSeek) {
            playVideoAt(pendingSeek.videoId, pendingSeek.sec, pendingSeek.autoplay);
            pendingSeek = null;
          }
          startPlayheadPolling();
        },
        onStateChange: (ev) => {
          state.isPlaying = ev.data === window.YT.PlayerState.PLAYING;
          el.livePlayDot.classList.toggle('is-playing', state.isPlaying);
        },
      },
    });
  }

  function playVideoAt(videoId, sec, autoplay = true) {
    sec = Math.max(0, Math.floor(sec));
    state.currentPlaySec = sec;
    el.currentClock.textContent = fmtHms(sec);
    updateExternalLink(videoId, sec);

    if (!ytReady || !ytPlayer || typeof ytPlayer.loadVideoById !== 'function') {
      pendingSeek = { videoId, sec, autoplay };
      // If YT API failed to load after 3s, ensure direct iframe works
      if (!window.YT) {
        mountFallbackIframe(videoId, sec, autoplay);
      }
      updatePlaybackHighlights(sec);
      return;
    }

    if (state.activeVideoId === videoId) {
      ytPlayer.seekTo(sec, true);
      if (autoplay) ytPlayer.playVideo();
    } else {
      state.activeVideoId = videoId;
      if (autoplay) {
        ytPlayer.loadVideoById({ videoId, startSeconds: sec });
      } else {
        ytPlayer.cueVideoById({ videoId, startSeconds: sec });
      }
    }
    if (state.playbackRate !== 1 && typeof ytPlayer.setPlaybackRate === 'function') {
      ytPlayer.setPlaybackRate(state.playbackRate);
    }
    updatePlaybackHighlights(sec);
  }

  function startPlayheadPolling() {
    clearInterval(pollHandle);
    pollHandle = setInterval(() => {
      if (!ytReady || !ytPlayer || typeof ytPlayer.getCurrentTime !== 'function') return;
      const cur = ytPlayer.getCurrentTime();
      if (typeof cur !== 'number' || Number.isNaN(cur)) return;
      const sec = Math.floor(cur);
      state.currentPlaySec = sec;
      el.currentClock.textContent = fmtHms(sec);
      updateExternalLink(state.activeVideoId, sec);
      updatePlaybackHighlights(sec);
    }, 500);
  }

  function updateExternalLink(videoId, sec) {
    if (!videoId) return;
    el.ytExternalLink.href = `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}&t=${Math.floor(sec)}s`;
  }

  function updatePlaybackHighlights(sec) {
    const activeTalk = TALK_BY_ID.get(state.activeTalkId);
    if (!activeTalk) return;

    // Update scrubber fills & active subsection cards if on same stream
    const sameStream = state.activeVideoId === activeTalk.video_id;
    const subs = activeTalk.subsections || [];

    const segEls = el.chapterScrubber.querySelectorAll('.scrubber-seg');
    const cardEls = el.subsectionsGrid.querySelectorAll('.sub-card');

    subs.forEach((sub, idx) => {
      const seg = segEls[idx];
      const card = cardEls[idx];
      const fill = seg ? seg.querySelector('.scrubber-fill') : null;
      const badge = card ? card.querySelector('.sub-playing-pill') : null;

      let pct = 0;
      let isCurrent = false;
      if (sameStream) {
        if (sec >= sub.end_sec) {
          pct = 100;
        } else if (sec >= sub.start_sec && sec < sub.end_sec) {
          pct = Math.min(100, Math.max(4, ((sec - sub.start_sec) / Math.max(1, sub.end_sec - sub.start_sec)) * 100));
          isCurrent = true;
        }
      }
      if (fill) fill.style.width = `${pct}%`;
      if (seg) seg.classList.toggle('is-current', isCurrent);
      if (card) card.classList.toggle('is-playing', isCurrent);
      if (badge) badge.hidden = !isCurrent;
    });

    // Detect if stream naturally played into another talk in the same video
    if (sameStream && state.isPlaying && (sec < activeTalk.start_sec - 5 || sec > activeTalk.end_sec + 8)) {
      const other = TALKS.find((t) => t.video_id === state.activeVideoId && sec >= t.start_sec && sec <= t.end_sec);
      if (other && other.id !== activeTalk.id) {
        syncedCandidateTalk = other;
        el.streamSyncText.textContent = `Livestream is now in: "${other.title}" (${other.start_hms})`;
        el.streamSyncBar.hidden = false;
      } else {
        el.streamSyncBar.hidden = true;
      }
    } else {
      el.streamSyncBar.hidden = true;
    }
  }

  // Filtering & Search Logic
  function getQueryTokens() {
    return state.query
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);
  }

  function matchesDayAndType(talk) {
    if (state.day !== 'all' && talk.day_key !== state.day) return false;
    if (state.type !== 'all') {
      if (state.type === 'keynote_group') {
        if (!['keynote', 'fireside_chat'].includes(talk.talk_type)) return false;
      } else if (state.type === 'panel_awards') {
        if (!['panel', 'awards', 'interlude', 'welcome'].includes(talk.talk_type)) return false;
      } else if (state.type === 'award_finalist') {
        if (!talk.is_award_finalist && talk.talk_type !== 'awards') return false;
      } else if (talk.talk_type !== state.type) {
        return false;
      }
    }
    return true;
  }

  function getFilteredTalks() {
    const tokens = getQueryTokens();
    const results = [];

    for (const talk of TALKS) {
      if (!matchesDayAndType(talk)) continue;
      if (!tokens.length) {
        results.push({ talk, matchedSubs: [], score: 0 });
        continue;
      }
      // Every query token must appear somewhere in the talk or its subsections
      if (!tokens.every((tok) => talk._fullBlob.includes(tok))) continue;

      let score = 0;
      const titleLow = talk.title.toLowerCase();
      const presLow = (talk.presenters || []).join(' ').toLowerCase();
      const topicLow = (talk.topics || []).join(' ').toLowerCase();
      tokens.forEach((tok) => {
        if (titleLow.includes(tok)) score += 10;
        if (presLow.includes(tok)) score += 9;
        if (topicLow.includes(tok)) score += 6;
        if (talk._topBlob.includes(tok)) score += 2;
      });

      const matchedSubs = (talk.subsections || []).filter((s) =>
        tokens.some((tok) => s._blob.includes(tok))
      );
      score += matchedSubs.length;
      results.push({ talk, matchedSubs, score });
    }

    if (tokens.length) {
      results.sort((a, b) => b.score - a.score);
    }
    return results;
  }

  function getFilteredPosters() {
    const tokens = getQueryTokens();
    return POSTERS.filter((p) => {
      if (state.paperFilter === 'recorded' && !p.talk_id) return false;
      if (state.paperFilter === 'award' && !p.is_award_finalist) return false;
      if (state.paperFilter === 'p1' && !p.poster_session.includes('1')) return false;
      if (state.paperFilter === 'p2' && !p.poster_session.includes('2')) return false;
      if (state.paperFilter === 'p3' && !p.poster_session.includes('3')) return false;
      if (tokens.length && !tokens.every((tok) => p._blob.includes(tok))) return false;
      return true;
    });
  }

  // Rendering: Active Talk & Subsections
  function selectTalk(talkId, seekSec = null, autoplay = true, switchToTheater = true) {
    const talk = TALK_BY_ID.get(talkId);
    if (!talk) return;
    state.activeTalkId = talk.id;
    const targetSec = seekSec !== null ? seekSec : talk.start_sec;

    if (switchToTheater && state.view !== 'theater') {
      setView('theater', false);
    }

    renderActiveTalk(talk);
    highlightActiveSidebarItem();
    playVideoAt(talk.video_id, targetSec, autoplay);
    updateHash(talk.id, targetSec);

    if (seekSec !== null && seekSec !== talk.start_sec) {
      const matchedSub = (talk.subsections || []).find(
        (s) => Math.abs(s.start_sec - seekSec) <= 3 || (seekSec >= s.start_sec && seekSec < s.end_sec)
      );
      trackEvent('select_subsection', {
        talk_id: talk.id,
        talk_title: talk.title,
        session_code: talk.session_code,
        subsection_title: matchedSub ? matchedSub.title : '',
        start_sec: targetSec,
      });
    } else {
      trackEvent('select_talk', {
        talk_id: talk.id,
        talk_title: talk.title,
        session_code: talk.session_code,
        talk_type: talk.talk_type,
        presenter: (talk.presenters || []).join(', '),
      });
    }
  }

  function renderActiveTalk(talk) {
    const [bCls, bLabel] = badgeClassAndLabel(talk);
    const badges = [
      `<span class="badge ${bCls}">${escHtml(bLabel)}</span>`,
      `<span class="mono-badge">${escHtml(talk.day_label)}${talk.scheduled_time ? ' · ' + escHtml(talk.scheduled_time) : ''}</span>`,
      `<span class="mono-badge">${escHtml(talk.start_hms)} – ${escHtml(talk.end_hms)} (${fmtDur(talk.duration_sec)})</span>`,
    ];
    if (talk.is_award_finalist) {
      badges.push(`<span class="badge badge-award"><span class="material-symbols-outlined chip-icon">workspace_premium</span>Award Finalist</span>`);
    }
    el.activeTalkBadges.innerHTML = badges.join('');

    el.activeTalkTitle.textContent = talk.title;
    el.talkEndClock.textContent = talk.end_hms;

    const bylineParts = [];
    if (talk.presenters && talk.presenters.length) {
      bylineParts.push(`<span class="byline-presenters">${escHtml(talk.presenters.join(', '))}</span>`);
    }
    if (talk.affiliation) {
      bylineParts.push(`<span>${escHtml(talk.affiliation)}</span>`);
    }
    if (talk.session_chair) {
      bylineParts.push(`<span>Chair: ${escHtml(talk.session_chair)}</span>`);
    }
    if (talk.poster_info) {
      bylineParts.push(`<span>${escHtml(talk.poster_info)}</span>`);
    }
    if (talk.openreview_url) {
      bylineParts.push(`<a href="${escHtml(talk.openreview_url)}" target="_blank" rel="noopener">OpenReview Paper ↗</a>`);
    }
    el.activeTalkByline.innerHTML = bylineParts.join(' · ');

    el.activeTalkSummary.textContent = talk.summary || '';

    // Topics
    el.activeTalkTopics.innerHTML = (talk.topics || [])
      .map((tp) => `<button type="button" class="topic-pill" data-topic="${escHtml(tp)}">${escHtml(tp)}</button>`)
      .join('');

    // Official abstract / bio
    if (talk.official_abstract || talk.speaker_bio) {
      el.activeTalkExtra.hidden = false;
      let extraHtml = '';
      if (talk.official_abstract) {
        extraHtml += `<p><strong>Official Abstract:</strong> ${escHtml(talk.official_abstract)}</p>`;
      }
      if (talk.speaker_bio) {
        extraHtml += `<p><strong>Speaker Bio:</strong> ${escHtml(talk.speaker_bio)}</p>`;
      }
      el.activeTalkExtraBody.innerHTML = extraHtml;
    } else {
      el.activeTalkExtra.hidden = true;
    }

    // Proportional Chapter Scrubber
    const subs = talk.subsections || [];
    const totalDur = Math.max(1, subs.reduce((acc, s) => acc + Math.max(10, s.duration_sec || 30), 0));
    el.chapterScrubber.innerHTML = subs
      .map((s, i) => {
        const flex = Math.max(10, s.duration_sec || 30) / totalDur;
        return `<div class="scrubber-seg" style="flex:${flex.toFixed(4)}" data-sub-idx="${i}" role="button" tabindex="0" aria-label="Jump to ${escHtml(s.title)} at ${s.start_hms}"><div class="scrubber-fill"></div></div>`;
      })
      .join('');

    // Subsections & Key Visuals Grid
    const tokens = getQueryTokens();
    el.subsectionsHeading.textContent = `Subsections & Key Visuals (${subs.length})`;
    el.subsectionsGrid.innerHTML = subs
      .map((s, idx) => {
        const num = String(idx + 1).padStart(2, '0');
        return `
          <article class="sub-card" data-start="${s.start_sec}" data-sub-idx="${idx}" tabindex="0" role="button" aria-label="Play subsection ${num}: ${escHtml(s.title)} at ${s.start_hms}">
            <div class="sub-thumb-wrap">
              <img src="./${escHtml(s.thumb)}" alt="${escHtml(s.visual_caption || s.title)}" loading="lazy" />
              <span class="sub-playing-pill" hidden>Playing</span>
              <span class="sub-time-pill"><span class="material-symbols-outlined">play_arrow</span>${escHtml(s.start_hms)}</span>
              <span class="sub-dur-pill">${fmtDur(s.duration_sec)}</span>
              <button type="button" class="sub-zoom-btn" data-zoom-idx="${idx}" title="Inspect key visual slide/demo" aria-label="Zoom key visual">
                <span class="material-symbols-outlined">zoom_in</span>
              </button>
            </div>
            <div class="sub-body">
              <div class="sub-head">
                <span class="sub-idx">${num}</span>
                <h3 class="sub-title">${highlightText(s.title, tokens)}</h3>
              </div>
              <p class="sub-summary">${highlightText(s.summary, tokens)}</p>
              ${
                s.visual_caption
                  ? `<div class="sub-visual-note"><span class="material-symbols-outlined">image</span><span>${highlightText(s.visual_caption, tokens)}</span></div>`
                  : ''
              }
            </div>
          </article>
        `;
      })
      .join('');

    updatePlaybackHighlights(state.currentPlaySec);
  }

  // Rendering: Sidebar Schedule & Search Results
  function groupBySession(filteredItems) {
    const groups = [];
    const map = new Map();
    for (const item of filteredItems) {
      const t = item.talk;
      const key = `${t.video_id}::${t.session_code}`;
      if (!map.has(key)) {
        const g = {
          key,
          day_label: t.day_label,
          scheduled_time: t.scheduled_time,
          session_code: t.session_code,
          session_title: t.session_title,
          session_chair: t.session_chair,
          venue: t.venue,
          items: [],
        };
        map.set(key, g);
        groups.push(g);
      }
      map.get(key).items.push(item);
    }
    return groups;
  }

  function renderSidebar(filtered) {
    const tokens = getQueryTokens();
    const isSearching = tokens.length > 0;
    const totalMatchedSubs = filtered.reduce((acc, x) => acc + x.matchedSubs.length, 0);

    el.sidebarTitle.textContent = isSearching ? 'Search Matches' : 'Conference Schedule';
    el.sidebarCount.textContent = isSearching
      ? `${filtered.length} talks · ${totalMatchedSubs} chapters`
      : `${filtered.length} talks`;

    if (!filtered.length) {
      const posterHits = isSearching ? getFilteredPosters() : [];
      el.sidebarList.innerHTML = `
        <div class="empty-state">
          <p>No recorded livestream talks matched <strong>"${escHtml(state.query)}"</strong>.</p>
          ${
            posterHits.length
              ? `<p><button type="button" class="watch-inline-btn" id="jumpToPosterHitsBtn">View ${posterHits.length} matching Poster Papers →</button></p>`
              : ''
          }
        </div>
      `;
      const btn = document.getElementById('jumpToPosterHitsBtn');
      if (btn) btn.addEventListener('click', () => setView('papers'));
      return;
    }

    if (isSearching) {
      // Flat relevance-ranked list with deep subsection visual cards!
      let html = filtered
        .map(({ talk: t, matchedSubs }) => {
          const [bCls, bLabel] = badgeClassAndLabel(t);
          const isAct = t.id === state.activeTalkId ? 'is-active' : '';
          const subsHtml = matchedSubs.length
            ? `<div class="st-matched-subs">
                ${matchedSubs
                  .slice(0, 4)
                  .map(
                    (s) => `
                  <div class="matched-sub-row" data-talk-id="${t.id}" data-seek="${s.start_sec}">
                    <img class="msr-thumb" src="./${escHtml(s.thumb)}" alt="" loading="lazy" />
                    <div class="msr-copy">
                      <div class="msr-title">${highlightText(s.title, tokens)}</div>
                      <div class="msr-sum">${highlightText(s.summary, tokens)}</div>
                    </div>
                    <span class="msr-time">▶ ${escHtml(s.start_hms)}</span>
                  </div>
                `
                  )
                  .join('')}
              </div>`
            : '';

          return `
            <div class="session-group">
              <div class="sidebar-talk ${isAct}" data-talk-id="${t.id}" style="border-top:none">
                <div class="st-main">
                  <div class="st-thumb">
                    <img src="./${escHtml(t.hero_thumb)}" alt="" loading="lazy" />
                    <span class="st-time">${escHtml(t.start_hms)}</span>
                  </div>
                  <div class="st-info">
                    <div class="st-title">${highlightText(t.title, tokens)}</div>
                    <div class="st-presenter">${highlightText((t.presenters || []).join(', ') || t.affiliation, tokens)}</div>
                    <div class="st-submeta">
                      <span class="badge ${bCls}" style="font-size:10px;padding:1px 6px">${escHtml(bLabel)}</span>
                      <span>${escHtml(t.day_label)}</span>
                    </div>
                  </div>
                </div>
                ${subsHtml}
              </div>
            </div>
          `;
        })
        .join('');

      // Also surface poster-only matches count at bottom of search
      const posterOnly = getFilteredPosters().filter((p) => !p.talk_id);
      if (posterOnly.length) {
        html += `
          <div class="session-group" style="padding:10px 12px;text-align:center">
            <span style="font-size:12.5px;color:var(--ink-secondary)">Also matched <strong>${posterOnly.length}</strong> poster-only accepted paper(s).</span>
            <div style="margin-top:6px"><button type="button" class="watch-inline-btn" id="seePosterMatchesBtn">Browse matching papers →</button></div>
          </div>
        `;
      }
      el.sidebarList.innerHTML = html;
      const pBtn = document.getElementById('seePosterMatchesBtn');
      if (pBtn) pBtn.addEventListener('click', () => setView('papers'));
      return;
    }

    // Standard grouped schedule view
    const groups = groupBySession(filtered);
    el.sidebarList.innerHTML = groups
      .map((g) => {
        const collapsed = state.collapsedSessions.has(g.key) ? 'is-collapsed' : '';
        const talksHtml = g.items
          .map(({ talk: t }) => {
            const isAct = t.id === state.activeTalkId ? 'is-active' : '';
            return `
              <div class="sidebar-talk ${isAct}" data-talk-id="${t.id}">
                <div class="st-main">
                  <div class="st-thumb">
                    <img src="./${escHtml(t.hero_thumb)}" alt="" loading="lazy" />
                    <span class="st-time">${escHtml(t.start_hms)}</span>
                  </div>
                  <div class="st-info">
                    <div class="st-title">${escHtml(t.title)}</div>
                    <div class="st-presenter">${escHtml((t.presenters || []).join(', ') || t.affiliation)}</div>
                    <div class="st-submeta">
                      <span>${fmtDur(t.duration_sec)}</span>
                      <span>· ${(t.subsections || []).length} chapters</span>
                      ${t.is_award_finalist ? '<span>· ★ Finalist</span>' : ''}
                    </div>
                  </div>
                </div>
              </div>
            `;
          })
          .join('');

        return `
          <div class="session-group ${collapsed}" data-group-key="${escHtml(g.key)}">
            <button type="button" class="session-group-header" data-toggle-group="${escHtml(g.key)}">
              <div class="sg-meta">
                <span class="sg-kicker">${escHtml(g.day_label)}${g.scheduled_time ? ' · ' + escHtml(g.scheduled_time) : ''} · ${g.items.length} ${g.items.length === 1 ? 'talk' : 'talks'}</span>
                <span class="sg-title">${escHtml(g.session_title)}</span>
              </div>
              <span class="material-symbols-outlined sg-chevron">expand_more</span>
            </button>
            <div class="session-talks">${talksHtml}</div>
          </div>
        `;
      })
      .join('');
  }

  function highlightActiveSidebarItem() {
    el.sidebarList.querySelectorAll('.sidebar-talk').forEach((node) => {
      node.classList.toggle('is-active', node.dataset.talkId === state.activeTalkId);
    });
  }

  // Rendering: View 2 — Full Visual Catalog
  function renderCatalog(filtered) {
    const tokens = getQueryTokens();
    const groups = groupBySession(filtered);
    el.catalogSubtitle.textContent = `Showing ${filtered.length} recorded talks across ${groups.length} sessions. Click any talk or chapter thumbnail to watch in the built-in player.`;

    if (!filtered.length) {
      el.catalogContainer.innerHTML = `<div class="empty-state">No recorded talks match the current filters.</div>`;
      return;
    }

    el.catalogContainer.innerHTML = groups
      .map((g) => {
        const cards = g.items
          .map(({ talk: t }) => {
            const [bCls, bLabel] = badgeClassAndLabel(t);
            const previewSubs = (t.subsections || []).slice(0, 3);
            return `
              <article class="cat-card">
                <div class="cat-hero" data-play-talk="${t.id}">
                  <img src="./${escHtml(t.hero_thumb)}" alt="${escHtml(t.title)}" loading="lazy" />
                  <span class="sub-time-pill"><span class="material-symbols-outlined">play_arrow</span>${escHtml(t.start_hms)} · ${fmtDur(t.duration_sec)}</span>
                  <div class="cat-play-overlay"><div class="cat-play-circle"><span class="material-symbols-outlined">play_arrow</span></div></div>
                </div>
                <div class="cat-body">
                  <div class="talk-meta-top" style="margin-bottom:2px">
                    <span class="badge ${bCls}">${escHtml(bLabel)}</span>
                    ${t.is_award_finalist ? '<span class="badge badge-award">Award Finalist</span>' : ''}
                  </div>
                  <h3 class="cat-title" data-play-talk="${t.id}">${highlightText(t.title, tokens)}</h3>
                  <div class="cat-pres">${highlightText((t.presenters || []).join(', ') || t.affiliation, tokens)}${t.affiliation && (t.presenters || []).length ? ' · ' + highlightText(t.affiliation, tokens) : ''}</div>
                  <p class="cat-sum">${highlightText(t.summary, tokens)}</p>
                  <div class="cat-mini-chapters">
                    <span class="cat-mini-label">${(t.subsections || []).length} Subsections — Jump to visual</span>
                    <div class="cat-mini-strip">
                      ${previewSubs
                        .map(
                          (s) => `
                        <button type="button" class="cat-mini-item" data-play-talk="${t.id}" data-seek="${s.start_sec}" title="${escHtml(s.start_hms + ' — ' + s.title)}">
                          <img src="./${escHtml(s.thumb)}" alt="" loading="lazy" />
                          <span>${escHtml(s.start_hms)} ${escHtml(s.title)}</span>
                        </button>
                      `
                        )
                        .join('')}
                    </div>
                  </div>
                </div>
              </article>
            `;
          })
          .join('');

        return `
          <section class="catalog-session-block">
            <div class="csb-header">
              <h2 class="csb-title">${escHtml(g.session_title)}</h2>
              <span class="csb-meta">${escHtml(g.day_label)}${g.scheduled_time ? ' · ' + escHtml(g.scheduled_time) : ''}${g.session_chair ? ' · Chair: ' + escHtml(g.session_chair) : ''}</span>
            </div>
            <div class="catalog-grid">${cards}</div>
          </section>
        `;
      })
      .join('');
  }

  // Rendering: View 3 — All 687 Accepted Papers
  function renderPapers() {
    const tokens = getQueryTokens();
    const rows = getFilteredPosters();
    el.papersCountBar.textContent = `Showing ${rows.length} of ${POSTERS.length} accepted CoRL 2026 papers${state.query ? ` matching "${state.query}"` : ''}.`;

    el.papersTableBody.innerHTML = rows
      .map((p) => {
        const linkedTalk = p.talk_id ? TALK_BY_ID.get(p.talk_id) : null;
        let videoCell = `<span style="color:var(--ink-muted);font-size:12.5px">Poster only</span>`;
        if (linkedTalk) {
          videoCell = `<button type="button" class="watch-inline-btn" data-play-talk="${linkedTalk.id}">
            <span class="material-symbols-outlined" style="font-size:15px">play_circle</span>
            Watch ${escHtml(linkedTalk.session_code)} (${escHtml(linkedTalk.start_hms)})
          </button>`;
        } else if (p.also_presented_in) {
          videoCell = `<span class="badge badge-spotlight">${escHtml(p.also_presented_in)}</span>`;
        }
        return `
          <tr>
            <td style="white-space:nowrap">
              <span class="mono-badge">${escHtml(p.poster_session.replace('Poster Session ', 'P'))} · #${escHtml(p.poster_number)}</span>
            </td>
            <td>
              <strong>${highlightText(p.title, tokens)}</strong>
              ${p.is_award_finalist ? ' <span class="badge badge-award">Award Finalist</span>' : ''}
            </td>
            <td>${videoCell}</td>
            <td style="white-space:nowrap">
              ${p.openreview_url ? `<a href="${escHtml(p.openreview_url)}" target="_blank" rel="noopener">OpenReview ↗</a>` : '—'}
            </td>
          </tr>
        `;
      })
      .join('');
  }

  // Master Render Refresh
  function refreshAll() {
    const filtered = getFilteredTalks();
    const hasFilters = state.query.trim() !== '' || state.day !== 'all' || state.type !== 'all';

    // Update search badge & clear button
    el.clearSearchBtn.hidden = !state.query;
    el.searchKbd.hidden = Boolean(state.query);
    if (state.query.trim()) {
      el.searchCount.hidden = false;
      el.searchCount.textContent = `${filtered.length} talks`;
    } else {
      el.searchCount.hidden = true;
    }

    // Active filter banner
    if (hasFilters) {
      el.activeFilterStrip.hidden = false;
      const parts = [];
      if (state.query.trim()) parts.push(`Query: "${state.query.trim()}"`);
      if (state.day !== 'all') parts.push(`Day: ${state.day.toUpperCase().replace('_', ' ')}`);
      if (state.type !== 'all') parts.push(`Category: ${state.type.replace(/_/g, ' ')}`);
      el.activeFilterSummary.textContent = `Filtered (${filtered.length} talks shown) — ${parts.join(' · ')}`;
    } else {
      el.activeFilterStrip.hidden = true;
    }

    renderSidebar(filtered);
    if (state.view === 'catalog') renderCatalog(filtered);
    if (state.view === 'papers') renderPapers();
    if (state.activeTalkId && TALK_BY_ID.has(state.activeTalkId)) {
      renderActiveTalk(TALK_BY_ID.get(state.activeTalkId));
    }
  }

  function setView(viewName, doRefresh = true) {
    state.view = viewName;
    el.viewBtns.forEach((b) => {
      const act = b.dataset.view === viewName;
      b.classList.toggle('is-active', act);
      b.setAttribute('aria-selected', act ? 'true' : 'false');
    });
    el.theaterView.hidden = viewName !== 'theater';
    el.catalogView.hidden = viewName !== 'catalog';
    el.papersView.hidden = viewName !== 'papers';
    trackEvent('view_mode_change', { view_mode: viewName });
    if (doRefresh) refreshAll();
  }

  // Lightbox Modal
  function openLightbox(talkId, subIdx) {
    const talk = TALK_BY_ID.get(talkId);
    if (!talk || !talk.subsections || !talk.subsections[subIdx]) return;
    state.lightboxTalkId = talkId;
    state.lightboxSubIdx = subIdx;
    updateLightboxContent();
    el.lightboxModal.hidden = false;
    trackEvent('zoom_visual', {
      talk_id: talk.id,
      talk_title: talk.title,
      subsection_title: talk.subsections[subIdx].title,
      visual_sec: talk.subsections[subIdx].visual_sec,
    });
  }

  function updateLightboxContent() {
    const talk = TALK_BY_ID.get(state.lightboxTalkId);
    if (!talk) return;
    const subs = talk.subsections || [];
    const s = subs[state.lightboxSubIdx];
    if (!s) return;
    el.lightboxTime.textContent = `${s.start_hms} – ${s.end_hms}`;
    el.lightboxTalkName.textContent = `${talk.title} (${state.lightboxSubIdx + 1}/${subs.length})`;
    el.lightboxImg.src = `./${s.thumb}`;
    el.lightboxImg.alt = s.visual_caption || s.title;
    el.lightboxTitle.textContent = s.title;
    el.lightboxSummary.textContent = s.summary;
    el.lightboxCaption.textContent = s.visual_caption ? `Visual frame (${s.visual_hms}): ${s.visual_caption}` : '';
    el.lightboxPlayLabel.textContent = `Play from ${s.start_hms}`;
  }

  function closeLightbox() {
    el.lightboxModal.hidden = true;
    state.lightboxTalkId = null;
  }

  // URL Deep-Linking (#talk=talk-005&t=10527)
  function updateHash(talkId, sec) {
    const hash = `#talk=${encodeURIComponent(talkId)}&t=${Math.floor(sec)}`;
    if (window.history && window.history.replaceState) {
      window.history.replaceState(null, '', hash);
    }
  }

  function parseInitialHash() {
    const raw = (window.location.hash || '').replace(/^#/, '');
    if (!raw) return null;
    const params = new URLSearchParams(raw);
    const tid = params.get('talk');
    const t = params.get('t');
    if (tid && TALK_BY_ID.has(tid)) {
      return { talkId: tid, sec: t !== null ? Number(t) : null };
    }
    return null;
  }

  // Event Listeners
  function bindEvents() {
    let searchTrackTimer = null;
    // Search input
    el.searchInput.addEventListener('input', (e) => {
      state.query = e.target.value;
      refreshAll();
      clearTimeout(searchTrackTimer);
      const q = state.query.trim();
      if (q.length >= 2) {
        searchTrackTimer = setTimeout(() => {
          trackEvent('search', {
            search_term: q,
            results_count: getFilteredTalks().length,
          });
        }, 650);
      }
    });

    el.clearSearchBtn.addEventListener('click', () => {
      state.query = '';
      el.searchInput.value = '';
      refreshAll();
      el.searchInput.focus();
    });

    el.brandReset.addEventListener('click', (e) => {
      e.preventDefault();
      resetFilters();
      setView('theater');
      if (TALKS[0]) selectTalk(TALKS[0].id, TALKS[0].start_sec, false);
    });

    el.resetAllFiltersBtn.addEventListener('click', resetFilters);

    function resetFilters() {
      state.query = '';
      state.day = 'all';
      state.type = 'all';
      el.searchInput.value = '';
      el.dayChips.forEach((c) => c.classList.toggle('is-active', c.dataset.day === 'all'));
      el.typeChips.forEach((c) => c.classList.toggle('is-active', c.dataset.type === 'all'));
      refreshAll();
    }

    // View mode buttons
    el.viewBtns.forEach((btn) => {
      btn.addEventListener('click', () => setView(btn.dataset.view));
    });

    // Day chips
    el.dayChips.forEach((chip) => {
      chip.addEventListener('click', () => {
        state.day = chip.dataset.day;
        el.dayChips.forEach((c) => c.classList.toggle('is-active', c === chip));
        trackEvent('filter_change', { filter_kind: 'day', filter_value: state.day });
        refreshAll();
      });
    });

    // Type chips
    el.typeChips.forEach((chip) => {
      chip.addEventListener('click', () => {
        state.type = chip.dataset.type;
        el.typeChips.forEach((c) => c.classList.toggle('is-active', c === chip));
        trackEvent('filter_change', { filter_kind: 'session_type', filter_value: state.type });
        refreshAll();
      });
    });

    // Paper filter chips
    el.paperFilterChips.forEach((chip) => {
      chip.addEventListener('click', () => {
        state.paperFilter = chip.dataset.pfilter;
        el.paperFilterChips.forEach((c) => c.classList.toggle('is-active', c === chip));
        renderPapers();
      });
    });

    // Theme toggle
    const savedTheme = localStorage.getItem('corl26_theme');
    if (savedTheme === 'dark' || savedTheme === 'light') {
      document.documentElement.setAttribute('data-theme', savedTheme);
      el.themeIcon.textContent = savedTheme === 'dark' ? 'light_mode' : 'dark_mode';
    }
    el.themeToggleBtn.addEventListener('click', () => {
      const cur = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', cur);
      localStorage.setItem('corl26_theme', cur);
      el.themeIcon.textContent = cur === 'dark' ? 'light_mode' : 'dark_mode';
    });

    // Topic pill clicks in Active Talk
    el.activeTalkTopics.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-topic]');
      if (!btn) return;
      state.query = btn.dataset.topic;
      el.searchInput.value = state.query;
      refreshAll();
    });

    // Scrubber clicks & hover tooltips
    el.chapterScrubber.addEventListener('click', (e) => {
      const seg = e.target.closest('.scrubber-seg');
      if (!seg) return;
      const talk = TALK_BY_ID.get(state.activeTalkId);
      const sub = talk && talk.subsections[Number(seg.dataset.subIdx)];
      if (sub) selectTalk(talk.id, sub.start_sec, true, false);
    });

    el.chapterScrubber.addEventListener('mousemove', (e) => {
      const seg = e.target.closest('.scrubber-seg');
      if (!seg) {
        el.scrubberTooltip.hidden = true;
        return;
      }
      const talk = TALK_BY_ID.get(state.activeTalkId);
      const idx = Number(seg.dataset.subIdx);
      const sub = talk && talk.subsections[idx];
      if (!sub) return;
      const wrapRect = el.chapterScrubber.parentElement.getBoundingClientRect();
      const x = Math.min(wrapRect.width - 80, Math.max(80, e.clientX - wrapRect.left));
      el.scrubberTooltip.style.left = `${x}px`;
      el.scrubberTooltip.textContent = `${idx + 1}. ${sub.title} (${sub.start_hms})`;
      el.scrubberTooltip.hidden = false;
    });
    el.chapterScrubber.addEventListener('mouseleave', () => {
      el.scrubberTooltip.hidden = true;
    });

    // Subsections grid clicks & zoom
    el.subsectionsGrid.addEventListener('click', (e) => {
      const zoomBtn = e.target.closest('[data-zoom-idx]');
      if (zoomBtn) {
        e.stopPropagation();
        openLightbox(state.activeTalkId, Number(zoomBtn.dataset.zoomIdx));
        return;
      }
      const card = e.target.closest('.sub-card');
      if (!card) return;
      selectTalk(state.activeTalkId, Number(card.dataset.start), true, false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // Sidebar clicks
    el.sidebarList.addEventListener('click', (e) => {
      const subRow = e.target.closest('.matched-sub-row');
      if (subRow) {
        e.stopPropagation();
        selectTalk(subRow.dataset.talkId, Number(subRow.dataset.seek), true, true);
        return;
      }
      const toggleGrp = e.target.closest('[data-toggle-group]');
      if (toggleGrp) {
        const key = toggleGrp.dataset.toggleGroup;
        if (state.collapsedSessions.has(key)) state.collapsedSessions.delete(key);
        else state.collapsedSessions.add(key);
        const grpEl = toggleGrp.closest('.session-group');
        if (grpEl) grpEl.classList.toggle('is-collapsed');
        return;
      }
      const talkRow = e.target.closest('.sidebar-talk');
      if (talkRow) {
        selectTalk(talkRow.dataset.talkId, null, true, true);
      }
    });

    el.scrollActiveBtn.addEventListener('click', () => {
      const act = el.sidebarList.querySelector('.sidebar-talk.is-active');
      if (act) act.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    el.toggleExpandAllBtn.addEventListener('click', () => {
      state.allCollapsed = !state.allCollapsed;
      el.toggleExpandAllBtn.textContent = state.allCollapsed ? 'Expand all' : 'Collapse all';
      el.sidebarList.querySelectorAll('.session-group').forEach((g) => {
        const k = g.dataset.groupKey;
        if (!k) return;
        if (state.allCollapsed) state.collapsedSessions.add(k);
        else state.collapsedSessions.delete(k);
        g.classList.toggle('is-collapsed', state.allCollapsed);
      });
    });

    // Catalog & Papers delegated play clicks
    document.addEventListener('click', (e) => {
      const playEl = e.target.closest('[data-play-talk]');
      if (!playEl) return;
      const tid = playEl.dataset.playTalk;
      const seek = playEl.dataset.seek !== undefined ? Number(playEl.dataset.seek) : null;
      selectTalk(tid, seek, true, true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // Player transport controls
    el.prevTalkBtn.addEventListener('click', () => {
      const idx = TALKS.findIndex((t) => t.id === state.activeTalkId);
      if (idx > 0) selectTalk(TALKS[idx - 1].id, null, true, false);
    });
    el.nextTalkBtn.addEventListener('click', () => {
      const idx = TALKS.findIndex((t) => t.id === state.activeTalkId);
      if (idx >= 0 && idx < TALKS.length - 1) selectTalk(TALKS[idx + 1].id, null, true, false);
    });
    el.rewind10Btn.addEventListener('click', () => {
      playVideoAt(state.activeVideoId, Math.max(0, state.currentPlaySec - 10), true);
    });
    el.forward10Btn.addEventListener('click', () => {
      playVideoAt(state.activeVideoId, state.currentPlaySec + 10, true);
    });

    el.speedBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const rate = Number(btn.dataset.rate);
        state.playbackRate = rate;
        el.speedBtns.forEach((b) => b.classList.toggle('is-active', b === btn));
        if (ytReady && ytPlayer && typeof ytPlayer.setPlaybackRate === 'function') {
          ytPlayer.setPlaybackRate(rate);
        }
      });
    });

    el.shareMomentBtn.addEventListener('click', () => {
      updateHash(state.activeTalkId, state.currentPlaySec);
      const url = window.location.href;
      trackEvent('share_moment', {
        talk_id: state.activeTalkId,
        timestamp_sec: state.currentPlaySec,
      });
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(() => {
          showToast(`Copied link to ${fmtHms(state.currentPlaySec)}`);
        });
      } else {
        showToast(`Link updated in address bar (${fmtHms(state.currentPlaySec)})`);
      }
    });

    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href*="openreview.net"]');
      if (a) {
        trackEvent('outbound_paper_click', { openreview_url: a.href });
      }
    });

    el.streamSyncFollowBtn.addEventListener('click', () => {
      if (syncedCandidateTalk) {
        state.activeTalkId = syncedCandidateTalk.id;
        renderActiveTalk(syncedCandidateTalk);
        highlightActiveSidebarItem();
        el.streamSyncBar.hidden = true;
      }
    });

    // Lightbox events
    el.lightboxBackdrop.addEventListener('click', closeLightbox);
    el.lightboxCloseBtn.addEventListener('click', closeLightbox);
    el.lightboxPrevBtn.addEventListener('click', () => {
      const talk = TALK_BY_ID.get(state.lightboxTalkId);
      if (!talk) return;
      state.lightboxSubIdx = (state.lightboxSubIdx - 1 + talk.subsections.length) % talk.subsections.length;
      updateLightboxContent();
    });
    el.lightboxNextBtn.addEventListener('click', () => {
      const talk = TALK_BY_ID.get(state.lightboxTalkId);
      if (!talk) return;
      state.lightboxSubIdx = (state.lightboxSubIdx + 1) % talk.subsections.length;
      updateLightboxContent();
    });
    el.lightboxPlayBtn.addEventListener('click', () => {
      const talk = TALK_BY_ID.get(state.lightboxTalkId);
      const sub = talk && talk.subsections[state.lightboxSubIdx];
      closeLightbox();
      if (talk && sub) {
        selectTalk(talk.id, sub.start_sec, true, true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      const inInput = ['INPUT', 'TEXTAREA'].includes(document.activeElement && document.activeElement.tagName);
      if (e.key === 'Escape') {
        if (!el.lightboxModal.hidden) {
          closeLightbox();
        } else if (inInput && state.query) {
          state.query = '';
          el.searchInput.value = '';
          refreshAll();
        } else if (inInput) {
          el.searchInput.blur();
        }
        return;
      }
      if (!el.lightboxModal.hidden) {
        if (e.key === 'ArrowLeft') el.lightboxPrevBtn.click();
        if (e.key === 'ArrowRight') el.lightboxNextBtn.click();
        return;
      }
      if (inInput) return;
      if (e.key === '/') {
        e.preventDefault();
        el.searchInput.focus();
      } else if (e.key === 'j' || e.key === 'J' || e.key === 'k' || e.key === 'K') {
        const talk = TALK_BY_ID.get(state.activeTalkId);
        if (!talk || !talk.subsections.length) return;
        let curIdx = talk.subsections.findIndex(
          (s) => state.currentPlaySec >= s.start_sec && state.currentPlaySec < s.end_sec
        );
        if (curIdx < 0) curIdx = 0;
        const nextIdx = e.key.toLowerCase() === 'k'
          ? Math.min(talk.subsections.length - 1, curIdx + 1)
          : Math.max(0, curIdx - 1);
        selectTalk(talk.id, talk.subsections[nextIdx].start_sec, true, false);
      }
    });
  }

  // Bootstrap
  function init() {
    const stats = (DATA.conference && DATA.conference.stats) || {};
    if (stats.talks) {
      el.headerStats.textContent = `Nov 9–11, 2026 · Austin, TX · ${stats.talks} Talks · ${stats.subsections} Visual Chapters · ${stats.accepted_papers} Papers`;
    }

    bindEvents();

    const hashTarget = parseInitialHash();
    if (hashTarget) {
      state.activeTalkId = hashTarget.talkId;
      const t = TALK_BY_ID.get(hashTarget.talkId);
      state.activeVideoId = t.video_id;
      state.currentPlaySec = hashTarget.sec !== null ? hashTarget.sec : t.start_sec;
      pendingSeek = { videoId: t.video_id, sec: state.currentPlaySec, autoplay: false };
    } else if (TALKS.length) {
      // Default to first Keynote or Spotlight S1 Talk 1 if Welcome is first, or first talk
      const defaultTalk = TALKS.find((t) => t.talk_type === 'keynote' || t.session_code === 'S1') || TALKS[0];
      state.activeTalkId = defaultTalk.id;
      state.activeVideoId = defaultTalk.video_id;
      state.currentPlaySec = defaultTalk.start_sec;
    }

    refreshAll();
    if (state.activeTalkId) {
      const act = TALK_BY_ID.get(state.activeTalkId);
      el.currentClock.textContent = fmtHms(state.currentPlaySec);
      updateExternalLink(act.video_id, state.currentPlaySec);
    }
    loadYouTubeApi();
  }

  init();
})();
