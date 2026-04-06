(function () {
  const BRAND_NAME = 'Roam.ai';
  const originalShowPage = window.showPage;
  const originalUpdateNav = window.updateNav;
  const baseTitle = `${BRAND_NAME} - Travel Planner`;
  document.title = baseTitle;

  function applyBranding() {
    document.title = baseTitle;
    document.querySelectorAll('.logo').forEach((logo) => {
      logo.textContent = BRAND_NAME;
    });
    document.querySelectorAll('p').forEach((node) => {
      if (/WanderAI uses Ollama|Xpedition Unknown uses Ollama|Roam\.ai uses Ollama/.test(node.textContent)) {
        node.textContent = `${BRAND_NAME} uses Ollama to build hyper-personalised trip recommendations. Sign in to start planning your dream journey.`;
      }
    });
  }

  applyBranding();

  function syncPlanPreviewFlags() {
    const pagePlan = document.getElementById('page-plan');
    if (!pagePlan) return;
    const cards = pagePlan.querySelectorAll('.rec-grid .rec-card');
    cards.forEach((card) => {
      const nameEl = card.querySelector('.rec-name');
      const imgEl = card.querySelector('.rec-img');
      const countryEl = card.querySelector('.rec-country');
      if (!nameEl || !imgEl) return;

      const previewCountryMap = {
        Paris: 'France',
        Kyoto: 'Japan',
        Patagonia: 'Argentina',
        Bali: 'Indonesia'
      };

      const country = previewCountryMap[nameEl.textContent.trim()];
      if (!country) return;
      imgEl.innerHTML = getPlaceVisualMarkup({ name: nameEl.textContent.trim(), country });
      if (countryEl && /sign in to see why this matches you/i.test(countryEl.textContent.trim())) {
        const countryNode = document.createElement('div');
        countryNode.className = 'rec-country';
        countryNode.textContent = country;
        card.querySelector('.rec-body')?.insertBefore(countryNode, countryEl);
      }
    });
  }

  function getUnreadMessageCount() {
    return Object.values(STATE.unreadMessages || {}).reduce((sum, count) => sum + count, 0);
  }

  function syncUnreadUi() {
    const unreadCount = getUnreadMessageCount();
    document.title = unreadCount ? `(${unreadCount}) ${baseTitle}` : baseTitle;

    const badge = document.getElementById('messages-badge');
    if (badge) {
      badge.textContent = String(unreadCount);
      badge.style.display = unreadCount ? 'inline-flex' : 'none';
    }
  }

  function normalizeActivityEmoji(rawEmoji, activity = {}) {
    const aliasMap = {
      ':boat:': '\u26F5',
      ':ship:': '\u26F5',
      ':bar:': '\u{1F378}',
      ':cocktail:': '\u{1F378}',
      ':history:': '\u{1F3DB}\uFE0F',
      ':museum:': '\u{1F3DB}\uFE0F',
      ':art:': '\u{1F3A8}',
      ':food:': '\u{1F958}',
      ':restaurant:': '\u{1F37D}\uFE0F',
      ':beach:': '\u{1F3D6}\uFE0F',
      ':nature:': '\u{1F333}',
      ':hiking:': '\u{1F97E}',
      ':nightlife:': '\u{1F387}',
      ':shopping:': '\u{1F6CD}\uFE0F',
      ':camera:': '\u{1F4F8}',
      ':wellness:': '\u{1F9D8}',
      ':spa:': '\u{1F9D8}',
      ':music:': '\u{1F3B5}'
    };

    const keywordMap = [
      { pattern: /(museum|gallery|exhibit|art)\b/i, emoji: '\u{1F3A8}' },
      { pattern: /(history|historic|old town|castle|fort|cathedral|temple|palace|heritage)\b/i, emoji: '\u{1F3DB}\uFE0F' },
      { pattern: /(market|food|restaurant|dinner|lunch|breakfast|brunch|street food|cooking|chef|pastry|wine|tasting)\b/i, emoji: '\u{1F958}' },
      { pattern: /(bar|cocktail|nightlife|club|rooftop|pub)\b/i, emoji: '\u{1F378}' },
      { pattern: /(beach|coast|island|shore|bay)\b/i, emoji: '\u{1F3D6}\uFE0F' },
      { pattern: /(boat|cruise|river|harbor|harbour|sail|ferry)\b/i, emoji: '\u26F5' },
      { pattern: /(hike|hiking|trail|trek|climb|mountain|summit|volcano)\b/i, emoji: '\u{1F97E}' },
      { pattern: /(park|garden|nature|forest|wildlife|lake)\b/i, emoji: '\u{1F333}' },
      { pattern: /(shopping|boutique|fashion|mall|souvenir)\b/i, emoji: '\u{1F6CD}\uFE0F' },
      { pattern: /(spa|wellness|massage|yoga|meditation|thermal)\b/i, emoji: '\u{1F9D8}' },
      { pattern: /(music|concert|jazz|opera|live show)\b/i, emoji: '\u{1F3B5}' },
      { pattern: /(photo|viewpoint|sunset|panoramic|lookout)\b/i, emoji: '\u{1F4F8}' },
      { pattern: /(train|day trip|excursion|tour|bus ride)\b/i, emoji: '\u{1F69E}\uFE0F' }
    ];

    const cleaned = String(rawEmoji || '').trim().toLowerCase();
    const assetName = cleaned.replace(/\.(png|jpg|jpeg|webp|svg|gif)$/i, '');
    if (aliasMap[cleaned]) return aliasMap[cleaned];
    if (aliasMap[assetName]) return aliasMap[assetName];

    const fileNameMap = {
      waves: '\u{1F30A}',
      beach: '\u{1F3D6}\uFE0F',
      mountain: '\u{1F3D4}\uFE0F',
      hiking: '\u{1F97E}',
      food: '\u{1F958}',
      restaurant: '\u{1F37D}\uFE0F',
      museum: '\u{1F3DB}\uFE0F',
      history: '\u{1F3DB}\uFE0F',
      bar: '\u{1F378}',
      nightlife: '\u{1F387}',
      camera: '\u{1F4F8}',
      shopping: '\u{1F6CD}\uFE0F',
      spa: '\u{1F9D8}',
      wellness: '\u{1F9D8}',
      music: '\u{1F3B5}',
      boat: '\u26F5',
      cruise: '\u26F5',
      art: '\u{1F3A8}',
      market: '\u{1F6D2}',
      sunset: '\u{1F307}',
      viewpoint: '\u{1F4F8}'
    };
    if (fileNameMap[assetName]) return fileNameMap[assetName];
    if (cleaned && !cleaned.startsWith(':') && !/\.(png|jpg|jpeg|webp|svg|gif)$/i.test(cleaned)) return rawEmoji;

    const text = [
      activity.name || '',
      activity.description || '',
      activity.tips || '',
      activity.category || ''
    ].join(' ');

    const keywordMatch = keywordMap.find((entry) => entry.pattern.test(text));
    if (keywordMatch) return keywordMatch.emoji;

    const categoryMap = {
      Culture: '\u{1F3DB}\uFE0F',
      Food: '\u{1F958}',
      Nature: '\u{1F333}',
      Nightlife: '\u{1F378}',
      Shopping: '\u{1F6CD}\uFE0F',
      Wellness: '\u{1F9D8}',
      Adventure: '\u{1F30B}',
      'Day Trip': '\u{1F69E}\uFE0F'
    };

    return categoryMap[activity.category] || '\u{1F4CD}';
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function recommendationSummary(user) {
    const reasons = Array.isArray(user.recommendationReasons) ? user.recommendationReasons : [];
    return reasons.length
      ? reasons.join(' • ')
      : 'Suggested from destination, dates, interests, travel style, and location.';
  }

  function buildProfileModal(user) {
    const initials = (user.name || '?').split(' ').map((part) => part[0]).join('').toUpperCase().slice(0, 2);
    const interests = (user.interests || []).length
      ? user.interests.map((interest) => `<span class="tag tag-rose">${escapeHtml(interest)}</span>`).join('')
      : '<span class="tag tag-amber">Open to anything</span>';
    const isConnected = (STATE.connections || {})[user.id] === 'connected';

    return `
      <div class="modal" style="max-width:560px;padding:0;overflow:hidden;background:linear-gradient(180deg,var(--white),#fffdf9);">
        <div style="padding:1.4rem 1.4rem 0.9rem;background:linear-gradient(135deg,var(--teal3),#f8efe0);border-bottom:1px solid var(--sand2);">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:1rem;">
            <div style="display:flex;gap:1rem;align-items:center;">
              <div style="width:68px;height:68px;border-radius:22px;background:var(--teal);color:var(--white);display:flex;align-items:center;justify-content:center;font-family:'Syne',sans-serif;font-weight:800;font-size:1.8rem;box-shadow:0 14px 24px rgba(19,124,122,.18);">${initials}</div>
              <div>
                <div style="font-family:'Syne',sans-serif;font-size:1.45rem;line-height:1.05;">${escapeHtml(user.name)}</div>
                <div style="color:var(--ink3);font-size:0.92rem;margin-top:0.35rem;">${escapeHtml(user.location || 'Location TBD')}</div>
                <div style="margin-top:0.55rem;display:flex;gap:0.5rem;flex-wrap:wrap;">
                  <span class="tag ${user.type === 'offering' ? 'tag-amber' : 'tag-teal'}">${user.type === 'offering' ? 'Offering to join' : 'Seeking companions'}</span>
                  <span class="tag tag-teal">${escapeHtml(user.destination || 'Destination TBD')}</span>
                </div>
              </div>
            </div>
            <button onclick="this.closest('.modal-overlay').remove()" style="background:none;border:none;cursor:pointer;font-size:1.4rem;color:var(--ink3);padding:0.2rem 0.3rem;">x</button>
          </div>
        </div>
        <div style="padding:1.25rem 1.4rem 1.4rem;display:flex;flex-direction:column;gap:1rem;max-height:min(75vh,700px);overflow-y:auto;">
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:0.8rem;">
            <div style="padding:0.9rem 1rem;border:1px solid var(--sand2);border-radius:18px;background:rgba(255,255,255,.75);">
              <div style="font-size:0.74rem;letter-spacing:.08em;text-transform:uppercase;color:var(--ink3);">Travel Dates</div>
              <div style="margin-top:0.35rem;font-weight:700;color:var(--ink);">${escapeHtml(user.dates || 'Dates TBD')}</div>
            </div>
            <div style="padding:0.9rem 1rem;border:1px solid var(--sand2);border-radius:18px;background:rgba(255,255,255,.75);">
              <div style="font-size:0.74rem;letter-spacing:.08em;text-transform:uppercase;color:var(--ink3);">Destination</div>
              <div style="margin-top:0.35rem;font-weight:700;color:var(--ink);">${escapeHtml(user.destination || 'Destination TBD')}</div>
            </div>
          </div>
          <div style="padding:1rem 1.05rem;border-radius:18px;background:#fff8eb;border:1px solid #f3dfb1;">
            <div style="font-size:0.78rem;letter-spacing:.08em;text-transform:uppercase;color:#b97e12;">About This Traveler</div>
            <div style="margin-top:0.5rem;color:var(--ink2);line-height:1.7;">${escapeHtml(user.post || user.bio || 'No introduction yet.')}</div>
          </div>
          <div>
            <div style="font-size:0.78rem;letter-spacing:.08em;text-transform:uppercase;color:var(--ink3);margin-bottom:0.55rem;">Interests</div>
            <div style="display:flex;flex-wrap:wrap;gap:0.45rem;">${interests}</div>
          </div>
          ${user.recommendationReasons?.length ? `
            <div style="padding:1rem 1.05rem;border-radius:18px;background:var(--teal3);border:1px solid rgba(19,124,122,.18);">
              <div style="font-size:0.78rem;letter-spacing:.08em;text-transform:uppercase;color:var(--teal);margin-bottom:0.45rem;">Why Recommended</div>
              <div style="display:flex;flex-wrap:wrap;gap:0.45rem;">
                ${user.recommendationReasons.map((reason) => `<span class="tag tag-teal">${escapeHtml(reason)}</span>`).join('')}
              </div>
            </div>` : ''}
          <div style="display:flex;gap:0.7rem;flex-wrap:wrap;">
            <button class="btn btn-outline btn-sm" onclick="this.closest('.modal-overlay').remove()">Close</button>
            ${String(user.id) !== String((STATE.user || {}).id) ? `<button class="btn btn-primary btn-sm" onclick="this.closest('.modal-overlay').remove();${isConnected ? `openChat('${user.id}')` : `sendConnectionRequest('${user.id}')`}">${isConnected ? 'Open Chat' : 'Connect'}</button>` : ''}
          </div>
        </div>
      </div>`;
  }

  function getVisionModelName() {
    if (typeof OLLAMA_VISION_MODEL !== 'undefined' && OLLAMA_VISION_MODEL) {
      return OLLAMA_VISION_MODEL;
    }
    return 'llava:7b';
  }

  function looksLikeGibberish(value) {
    const text = String(value || '').trim();
    if (!text) return true;
    const printableMatches = text.match(/[A-Za-z0-9\s.,:;!?'"()\-/%$€£&@#\n]/g) || [];
    const controlMatches = text.match(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g) || [];
    const printableRatio = printableMatches.length / text.length;
    return controlMatches.length > 0 || printableRatio < 0.45;
  }

  function looksLikePromptEcho(value) {
    const text = String(value || '').trim().toLowerCase();
    if (!text) return false;
    return text.includes('you are an ocr translation tool')
      || text.includes('translate only the visible text in the uploaded image')
      || text.includes('read the attached image directly')
      || text.includes('do not ask the user to paste the image or data url again');
  }

  function resetUnreadMessages(userId) {
    if (!STATE.unreadMessages) STATE.unreadMessages = {};
    if (userId) {
      delete STATE.unreadMessages[String(userId)];
    } else {
      STATE.unreadMessages = {};
    }
    save();
    updateNav();
  }

  function openMessagesInbox() {
    if (!STATE.user) {
      showAuth();
      return;
    }
    document.querySelectorAll('.modal-overlay').forEach((modal) => {
      if (modal.querySelector('h3')?.textContent === 'Your Messages') {
        modal.remove();
      }
    });
    const connectedUsers = (STATE.acceptedConnections || [])
      .filter((user) => (STATE.connections || {})[String(user.id)] === 'connected');

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal" style="max-width:520px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;">
          <h3>Your Messages</h3>
          <button onclick="this.parentElement.parentElement.parentElement.remove()" style="background:none;border:none;cursor:pointer;font-size:1.4rem;color:var(--ink3);">x</button>
        </div>
        ${connectedUsers.length ? `
          <div style="display:flex;flex-direction:column;gap:0.75rem;max-height:420px;overflow-y:auto;">
            ${connectedUsers.map((user) => {
              const unread = (STATE.unreadMessages || {})[String(user.id)] || 0;
              return `
                <button onclick="openChatFromInbox('${user.id}')" style="display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:0.9rem 1rem;border:1px solid var(--sand2);border-radius:var(--radius-sm);background:var(--white);cursor:pointer;text-align:left;">
                  <span>
                    <strong style="display:block;font-family:'Syne',sans-serif;">${user.name}</strong>
                    <span style="font-size:0.84rem;color:var(--ink3);">${user.destination || 'Travel companion'}</span>
                  </span>
                  <span style="display:flex;align-items:center;gap:0.5rem;">
                    ${unread ? `<span style="min-width:24px;height:24px;padding:0 8px;border-radius:999px;background:var(--teal);color:var(--white);display:inline-flex;align-items:center;justify-content:center;font-size:0.75rem;font-weight:700;">${unread}</span>` : ''}
                    <span style="font-size:0.85rem;color:var(--ink3);">Open</span>
                  </span>
                </button>`;
            }).join('')}
          </div>` : `
          <div style="padding:1rem;border:1px solid var(--sand2);border-radius:var(--radius-sm);color:var(--ink3);">
            You do not have any active conversations yet. Connect with another traveler first.
          </div>
          <div style="margin-top:1rem;">
            <button class="btn btn-primary btn-sm" onclick="this.parentElement.parentElement.parentElement.remove();showPage('connect')">Go to Connect</button>
          </div>`}
      </div>`;
    document.body.appendChild(modal);
    modal.style.display = 'flex';
  }

  async function ensureNotificationPermission() {
    if (!('Notification' in window)) return 'unsupported';
    if (Notification.permission === 'granted') return 'granted';
    if (Notification.permission === 'denied') return 'denied';
    try {
      return await Notification.requestPermission();
    } catch (error) {
      return 'denied';
    }
  }

  async function notifyIncomingMessage(companionName, body, userId) {
    const permission = await ensureNotificationPermission();
    if (permission !== 'granted') return;

    const notification = new Notification(`New message from ${companionName}`, {
      body: body.length > 120 ? `${body.slice(0, 117)}...` : body,
      tag: `wanderai-message-${userId}`,
      renotify: true
    });

    notification.onclick = () => {
      window.focus();
      openChat(userId);
      resetUnreadMessages(userId);
      notification.close();
    };
  }

  window.updateNav = function updateNavWithMessages() {
    originalUpdateNav();
    if (!STATE.user) return;
    const nav = document.getElementById('nav-right');
    const messageButton = `
      <button onclick="openMessagesInbox()" aria-label="Messages" title="Messages" style="position:relative;width:34px;height:34px;padding:0;display:inline-flex;align-items:center;justify-content:center;background:transparent;border:none;cursor:pointer;color:var(--ink);">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5c-1.4 0-2.72-.34-3.88-.95L3 21l1.73-4.62A8.46 8.46 0 0 1 4 11.5 8.5 8.5 0 1 1 21 11.5Z"></path>
        </svg>
        <span id="messages-badge" style="position:absolute;top:-6px;right:-6px;min-width:20px;height:20px;padding:0 6px;border-radius:999px;background:var(--teal);color:var(--white);display:none;align-items:center;justify-content:center;font-size:0.72rem;font-weight:700;"></span>
      </button>`;
    nav.innerHTML = `${messageButton}${nav.innerHTML}`;
    syncUnreadUi();
  };

  window.openMessagesInbox = openMessagesInbox;
  window.openChatFromInbox = function openChatFromInbox(userId) {
    document.querySelectorAll('.modal-overlay').forEach((modal) => {
      if (modal.querySelector('h3')?.textContent === 'Your Messages') {
        modal.remove();
      }
    });
    openChat(userId);
    resetUnreadMessages(userId);
  };

  window.setupSocket = function setupSocketWithNotifications() {
    if (!STATE.user || !getToken()) {
      if (STATE.socket) {
        STATE.socket.disconnect();
        STATE.socket = null;
      }
      return;
    }

    if (STATE.socket) {
      STATE.socket.disconnect();
    }

    STATE.socket = io({
      auth: { token: getToken() }
    });

    STATE.socket.on('connection:request', async ({ from }) => {
      showToast(`${from.name} sent you a connection request.`);
      await refreshConnections();
      await refreshConnectExtras();
      if (STATE.currentPage === 'connect') renderConnectMain(document.getElementById('connect-content'));
    });

    STATE.socket.on('connection:accepted', async ({ by }) => {
      showToast(`${by.name} accepted the connection request.`);
      await refreshConnections();
      await refreshConnectExtras();
      if (STATE.currentPage === 'connect') renderConnectMain(document.getElementById('connect-content'));
    });

    STATE.socket.on('connection:declined', async () => {
      await refreshConnections();
      await refreshConnectExtras();
      if (STATE.currentPage === 'connect') renderConnectMain(document.getElementById('connect-content'));
    });

    STATE.socket.on('message:new', (message) => {
      const otherUserId = String(message.senderId) === String((STATE.user || {}).id)
        ? String(message.receiverId)
        : String(message.senderId);

      STATE.lastMessageUserId = otherUserId;

      if (STATE.activeChatUserId && String(STATE.activeChatUserId) === otherUserId) {
        appendChatMessage(message);
        resetUnreadMessages(otherUserId);
        return;
      }

      if (String(message.senderId) !== String((STATE.user || {}).id)) {
        if (!STATE.unreadMessages) STATE.unreadMessages = {};
        STATE.unreadMessages[otherUserId] = (STATE.unreadMessages[otherUserId] || 0) + 1;
        const companion = getCompanionById(otherUserId);
        showToast(`New message from ${companion?.name || 'another traveler'}.`);
        notifyIncomingMessage(companion?.name || 'another traveler', message.body || '', otherUserId);
        save();
        updateNav();
        if (document.querySelector('.modal-overlay h3')?.textContent === 'Your Messages') {
          openMessagesInbox();
        }
      }
    });

    STATE.socket.on('group:message:new', (message) => {
      if (STATE.activeGroupChatId && String(STATE.activeGroupChatId) === String(message.groupId)) {
        appendGroupChatMessage(message);
        return;
      }

      if (String(message.senderId) !== String((STATE.user || {}).id)) {
        const group = (STATE.groupData || []).find((item) => String(item.id) === String(message.groupId));
        showToast(`New group message in ${group?.name || 'your group'}.`);
      }
    });
  };

  window.doLogin = async function doLogin() {
    const email = document.getElementById('login-email').value.trim();
    const pass = document.getElementById('login-pass').value;
    if (!email) {
      alert('Enter your email');
      return;
    }

    try {
      const data = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password: pass })
      });
      setToken(data.token);
      STATE.user = normalizeUser(data.user);
      loadUserState(STATE.user.id);
      setupSocket();
      await refreshConnections();
      closeAuth();
      updateNav();
      originalShowPage(STATE.currentPage || 'plan');
      showToast(`Welcome back, ${STATE.user.name}.`);
    } catch (error) {
      alert(error.message);
    }
  };

  window.doRegister = async function doRegister() {
    const name = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const pass = document.getElementById('reg-pass').value;
    const location = document.getElementById('reg-location').value.trim() || 'Unknown';
    const destination = document.getElementById('reg-dest').value.trim();
    const dates = document.getElementById('reg-dates').value.trim();
    const type = document.getElementById('reg-type').value;
    const bio = document.getElementById('reg-bio').value.trim();
    const interests = [...document.querySelectorAll('#reg-interests-grid .chip.selected')].map((el) => el.dataset.interest);

    if (!name || !email || !pass) {
      alert('Fill in your name, email, and password');
      return;
    }

    try {
      const data = await apiFetch('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name,
          email,
          password: pass,
          location,
          destination: destination || 'TBD',
          dates: dates || 'TBD',
          type,
          bio,
          interests: interests.length ? interests : ['Culture']
        })
      });
      setToken(data.token);
      STATE.user = normalizeUser(data.user);
      loadUserState(STATE.user.id);
      setupSocket();
      await refreshConnections();
      closeAuth();
      updateNav();
      originalShowPage(STATE.currentPage || 'plan');
      showToast(`Welcome ${name}! Your profile is now visible to other travelers on the Connect page.`);
    } catch (error) {
      alert(error.message);
    }
  };

  window.demoLogin = async function demoLogin() {
    const seed = Date.now();
    document.getElementById('reg-name').value = `Explorer ${String(seed).slice(-4)}`;
    document.getElementById('reg-email').value = `demo-${seed}@wanderai.local`;
    document.getElementById('reg-pass').value = 'wanderai-demo';
    document.getElementById('reg-location').value = 'Local Demo';
    document.getElementById('reg-dest').value = 'Lisbon, Portugal';
    document.getElementById('reg-dates').value = 'Anytime';
    switchAuth('register');
    await window.doRegister();
  };

  window.logout = function logout() {
    if (STATE.user) {
      save();
    }
    setToken('');
    if (STATE.socket) {
      STATE.socket.disconnect();
      STATE.socket = null;
    }
    STATE.user = null;
    STATE.connectData = null;
    STATE.acceptedConnections = [];
    STATE.outgoingRequests = [];
    STATE.connectionRequests = [];
    STATE.connections = {};
    STATE.unreadMessages = {};
    STATE.lastMessageUserId = null;
    STATE.activeChatUserId = null;
    updateNav();
    document.getElementById('tab-book').disabled = true;
    document.getElementById('tab-enjoy').disabled = true;
    STATE.currentPage = 'plan';
    originalShowPage('plan');
  };

  window.renderConnect = async function renderConnect() {
    const el = document.getElementById('connect-content');
    if (!STATE.user) {
      el.innerHTML = `
        <div class="hero">
          <div class="hero-tag" style="background:var(--coral3);color:var(--coral);">Travel Companions</div>
          <h1>Find your perfect<br><em>travel buddy</em></h1>
          <p>Connect with fellow travelers worldwide. Post requests for companionship or offer to join others on their adventures.</p>
          <div style="display:flex;gap:12px;justify-content:center;margin-top:2rem;flex-wrap:wrap;">
            <button class="btn btn-primary btn-lg" onclick="showAuth()">Sign in to connect</button>
            <button class="btn btn-outline btn-lg" onclick="demoLogin()">Try demo</button>
          </div>
        </div>`;
      return;
    }

    el.innerHTML = `<div class="loading"><div class="spinner"></div>Loading travelers and connections...</div>`;
    try {
      await refreshConnections();
      await refreshConnectExtras();
      window.renderConnectMain(el);
    } catch (error) {
      el.innerHTML = `<div class="card"><p>${error.message}</p></div>`;
    }
  };

  async function refreshConnectExtras() {
    const [recommendationData, groupsData] = await Promise.all([
      apiFetch('/api/recommendations', { method: 'GET' }),
      apiFetch('/api/groups', { method: 'GET' })
    ]);
    STATE.recommendedUsers = (recommendationData.recommendations || []).map(normalizeUser);
    STATE.groupData = groupsData.groups || [];
    save();
  }

  window.renderConnectMain = function renderConnectMain(el) {
    const pending = STATE.connectionRequests || [];
    const recommendations = (STATE.recommendedUsers || []).filter((user) => String(user.id) !== String((STATE.user || {}).id));
    const groups = STATE.groupData || [];
    const inboxHtml = pending.length > 0 ? `
      <div class="inbox-banner">
        <div>
          <h4>Connection Requests (${pending.length})</h4>
          <p>Accept a request to start messaging</p>
        </div>
        <button class="btn btn-outline btn-sm" onclick="toggleInbox()">View Requests</button>
      </div>
      <div id="inbox-panel" style="display:none;margin-bottom:1.5rem;">
        ${pending.map((r) => `
          <div class="inbox-request" id="inbox-${r.id}">
            <div class="inbox-request-info">
              <strong>${r.name}</strong>
              <p>${r.destination || 'No destination yet'} · ${r.dates || 'Dates TBD'} - "${(r.post || '').slice(0, 60)}..."</p>
            </div>
            <div style="display:flex;gap:8px;">
              <button class="btn btn-teal btn-sm" onclick="acceptRequest('${r.id}')">Accept</button>
              <button class="btn btn-outline btn-sm" onclick="declineRequest('${r.id}')">Decline</button>
            </div>
          </div>`).join('')}
      </div>` : '';

    const allUsers = (STATE.connectData || []).filter((u) => String(u.id) !== String((STATE.user || {}).id));
    const cards = allUsers.map((user) => window.buildCompanionCard(user)).join('');
    const recommendationCards = recommendations.map((user) => `
      <div class="card" style="padding:1rem;">
        <div style="display:flex;justify-content:space-between;gap:1rem;align-items:flex-start;">
          <div>
            <div style="font-family:'Syne',sans-serif;font-size:1rem;font-weight:700;">${user.name}</div>
            <div style="font-size:0.84rem;color:var(--ink3);margin-top:4px;">${user.destination || 'Destination TBD'} · ${user.dates || 'Dates TBD'}</div>
            <div style="font-size:0.84rem;color:var(--ink3);margin-top:6px;">Suggested based on similar destination and interests</div>
          </div>
          <button class="btn btn-outline btn-sm" onclick="sendConnectionRequest('${user.id}')">Connect</button>
        </div>
      </div>`).join('');
    const groupCards = groups.map((group) => `
      <div class="card" style="padding:1rem;">
        <div style="display:flex;justify-content:space-between;gap:1rem;align-items:flex-start;">
          <div>
            <div style="font-family:'Syne',sans-serif;font-size:1rem;font-weight:700;">${group.name}</div>
            <div style="font-size:0.84rem;color:var(--ink3);margin-top:4px;">${group.destination} · ${group.dates}</div>
            <div style="font-size:0.84rem;color:var(--ink3);margin-top:4px;">${group.memberCount} members · Created by ${group.creatorName}</div>
            <div style="font-size:0.86rem;color:var(--ink2);margin-top:8px;">${group.description || 'Travel group for coordinating plans together.'}</div>
          </div>
          ${group.joined ? `<span class="tag tag-teal">Joined</span>` : `<button class="btn btn-outline btn-sm" onclick="joinGroup('${group.id}')">Join</button>`}
        </div>
      </div>`).join('');

    el.innerHTML = `
      <div style="margin-bottom:2rem;">
        <div class="section-head">
          <div>
            <h2>Travel Companions</h2>
            <p style="color:var(--ink3);font-size:0.9rem;margin-top:4px;">Send a connection request to start chatting</p>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button class="btn btn-outline btn-sm" onclick="openGroupModal()">+ Create Group</button>
            <button class="btn btn-primary btn-sm" onclick="openPostModal()">+ Post Request</button>
          </div>
        </div>
        ${inboxHtml}
        <div style="display:flex;gap:12px;margin-bottom:1rem;">
          <input type="text" id="connect-search" placeholder="Search destinations, names..." style="flex:1;padding:10px;border:1px solid var(--sand2);border-radius:var(--radius-sm);" oninput="filterConnect()"/>
        </div>
        <div class="filter-bar">
          <span class="filter-label">Filter:</span>
          <div class="filter-chip ${STATE.connectFilters.includes('Seeking Companions') ? 'active' : ''}" onclick="toggleConnectFilter('Seeking Companions')">Seeking Companions</div>
          <div class="filter-chip ${STATE.connectFilters.includes('Offering to Join') ? 'active' : ''}" onclick="toggleConnectFilter('Offering to Join')">Offering to Join</div>
          <div class="filter-chip ${STATE.connectFilters.includes('Culture') ? 'active' : ''}" onclick="toggleConnectFilter('Culture')">Culture</div>
          <div class="filter-chip ${STATE.connectFilters.includes('Adventure') ? 'active' : ''}" onclick="toggleConnectFilter('Adventure')">Adventure</div>
          <div class="filter-chip ${STATE.connectFilters.includes('Food') ? 'active' : ''}" onclick="toggleConnectFilter('Food')">Food</div>
          <div class="filter-chip ${STATE.connectFilters.includes('Nature') ? 'active' : ''}" onclick="toggleConnectFilter('Nature')">Nature</div>
        </div>
      </div>
      ${recommendations.length ? `
        <div style="margin-bottom:1.5rem;">
          <div class="section-title">Recommended For You</div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:1rem;">${recommendationCards}</div>
        </div>` : ''}
      <div style="margin-bottom:1.5rem;">
        <div class="section-title">Travel Groups</div>
        ${groups.length ? `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:1rem;">${groupCards}</div>` : `<div class="card"><p style="color:var(--ink3);">No groups yet. Create the first one for your destination.</p></div>`}
      </div>
      ${allUsers.length ? `
        <div style="margin-bottom:1.5rem;">
          <div class="section-title" style="font-size:0.9rem;color:var(--coral);font-family:'Syne',sans-serif;font-weight:700;display:flex;align-items:center;gap:10px;margin-bottom:1rem;">
            <span style="background:var(--coral3);color:var(--coral);padding:3px 10px;border-radius:100px;font-size:0.75rem;">LIVE</span>
            Real Travelers (${allUsers.length})
            <span style="flex:1;height:1px;background:var(--sand2);display:block;"></span>
          </div>
          <div class="rec-grid" id="connect-grid">${cards}</div>
        </div>` : `
        <div style="background:var(--coral3);border:1px dashed var(--coral);border-radius:var(--radius);padding:1rem 1.25rem;margin-bottom:1.5rem;font-size:0.88rem;color:var(--coral);">
          <strong style="font-family:'Syne',sans-serif;">No real travelers yet</strong> - Be the first! Create an account and your profile will appear here for others to connect with.
        </div>`}
    `;
    window.filterConnect();
  };

  window.buildCompanionCard = function buildCompanionCard(c) {
    const status = (STATE.connections || {})[c.id];
    const tagClass = c.type === 'offering' ? 'tag-amber' : 'tag-teal';
    const tagLabel = c.type === 'offering' ? 'Offering' : 'Seeking';
    const interestTags = (c.interests || []).map((i) => `<span class="tag tag-rose">${i}</span>`).join('');
    const connectedBadge = status === 'connected' ? `<div class="connected-badge">Connected</div>` : '';
    const initials = c.name.split(' ').map((x) => x[0]).join('').toUpperCase().slice(0, 2);

    let actionBtns = '';
    if (status === 'connected') {
      actionBtns = `
        <button class="btn btn-teal btn-sm" onclick="openChat('${c.id}')">Message</button>
        <button class="btn btn-outline btn-sm" onclick="viewProfile('${c.id}')">View Profile</button>`;
    } else if (status === 'pending_sent') {
      actionBtns = `
        <button class="btn btn-sm btn-pending" disabled>Request Sent</button>
        <button class="btn btn-outline btn-sm" onclick="viewProfile('${c.id}')">View Profile</button>`;
    } else if (status === 'pending_received') {
      actionBtns = `
        <button class="btn btn-teal btn-sm" onclick="acceptRequest('${c.id}')">Accept Request</button>
        <button class="btn btn-outline btn-sm" onclick="declineRequest('${c.id}')">Decline</button>`;
    } else {
      actionBtns = `
        <button class="btn btn-sm btn-connect" onclick="sendConnectionRequest('${c.id}')">Connect</button>
        <button class="btn btn-outline btn-sm" onclick="viewProfile('${c.id}')">View Profile</button>`;
    }

    return `
      <div class="rec-card" data-id="${c.id}" data-type="${c.type}" data-interests="${(c.interests || []).join(',')}" data-name="${c.name}" data-dest="${c.destination || ''}" data-post="${(c.post || '').replace(/"/g, '&quot;')}">
        <div class="rec-img" style="background:var(--teal);font-size:3rem;padding:0;">
          <div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:var(--teal);color:var(--white);font-family:'Syne',sans-serif;font-size:2.5rem;font-weight:800;">${initials}</div>
        </div>
        <div class="rec-body">
          <div style="display:inline-flex;align-items:center;gap:4px;background:var(--teal);color:var(--white);font-size:0.7rem;font-weight:700;font-family:'Syne',sans-serif;padding:2px 8px;border-radius:100px;margin-bottom:6px;">REAL USER</div>
          ${connectedBadge}
          <div class="rec-name">${c.name}</div>
          <div class="rec-country">${c.location || ''}${c.destination ? ` -> ${c.destination}` : ''}</div>
          <div style="font-size:0.84rem;color:var(--ink3);margin:4px 0 0.75rem;">Travel dates: ${c.dates || 'Dates TBD'}</div>
          <div class="rec-why">${c.post || ''}</div>
          <div class="rec-tags">
            <span class="tag ${tagClass}">${tagLabel}</span>
            ${interestTags}
          </div>
          <div class="connect-btn-group">${actionBtns}</div>
        </div>
      </div>`;
  };

  window.sendConnectionRequest = async function sendConnectionRequest(id) {
    try {
      await apiFetch('/api/connections/request', {
        method: 'POST',
        body: JSON.stringify({ receiverId: Number(id) })
      });
      await refreshConnections();
      await refreshConnectExtras();
      window.renderConnectMain(document.getElementById('connect-content'));
      showToast('Connection request sent! Waiting for them to accept.');
    } catch (error) {
      showToast(error.message);
    }
  };

  window.acceptRequest = async function acceptRequest(id) {
    try {
      await apiFetch('/api/connections/accept', {
        method: 'POST',
        body: JSON.stringify({ requesterId: Number(id) })
      });
      await refreshConnections();
      await refreshConnectExtras();
      window.renderConnectMain(document.getElementById('connect-content'));
      const companion = getCompanionById(id);
      showToast(`Connected with ${companion ? companion.name : 'them'}! You can now message each other.`);
    } catch (error) {
      showToast(error.message);
    }
  };

  window.declineRequest = async function declineRequest(id) {
    try {
      await apiFetch('/api/connections/decline', {
        method: 'POST',
        body: JSON.stringify({ requesterId: Number(id) })
      });
      await refreshConnections();
      await refreshConnectExtras();
      window.renderConnectMain(document.getElementById('connect-content'));
    } catch (error) {
      showToast(error.message);
    }
  };

  window.filterConnect = function filterConnect() {
    const search = (document.getElementById('connect-search') || {}).value?.toLowerCase() || '';
    const cards = document.querySelectorAll('#connect-grid .rec-card');
    cards.forEach((card) => {
      const name = (card.dataset.name || '').toLowerCase();
      const dest = (card.dataset.dest || '').toLowerCase();
      const post = (card.dataset.post || '').toLowerCase();
      const type = card.dataset.type;
      const interests = (card.dataset.interests || '').split(',');
      const matchesSearch = !search || name.includes(search) || dest.includes(search) || post.includes(search);
      const matchesFilter = STATE.connectFilters.length === 0
        || STATE.connectFilters.includes(type === 'seeking' ? 'Seeking Companions' : 'Offering to Join')
        || STATE.connectFilters.some((f) => interests.includes(f));
      card.style.display = matchesSearch && matchesFilter ? 'block' : 'none';
    });
  };

  window.toggleConnectFilter = function toggleConnectFilter(filter) {
    const idx = STATE.connectFilters.indexOf(filter);
    if (idx >= 0) STATE.connectFilters.splice(idx, 1);
    else STATE.connectFilters.push(filter);
    window.renderConnectMain(document.getElementById('connect-content'));
  };

  window.openPostModal = function openPostModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem;">
          <h3>Post Travel Companion Request</h3>
          <button onclick="this.parentElement.parentElement.parentElement.remove()" style="background:none;border:none;cursor:pointer;font-size:1.4rem;color:var(--ink3);">x</button>
        </div>
        <div class="form-group">
          <label>Type</label>
          <select id="post-type">
            <option value="seeking">Seeking Companions</option>
            <option value="offering">Offering to Join</option>
          </select>
        </div>
        <div class="form-group"><label>Destination</label><input type="text" id="post-dest" placeholder="e.g., Paris, France"/></div>
        <div class="form-group"><label>Dates</label><input type="text" id="post-dates" placeholder="e.g., June 15-25"/></div>
        <div class="form-group"><label>Your Message</label><textarea id="post-msg" rows="4" placeholder="Describe what you're looking for..."></textarea></div>
        <button class="btn btn-primary" style="width:100%;justify-content:center;" onclick="submitPost()">Post</button>
      </div>`;
    document.body.appendChild(modal);
    modal.style.display = 'flex';
  };

  window.submitPost = function submitPost() {
    const type = document.getElementById('post-type').value;
    const dest = document.getElementById('post-dest').value;
    const dates = document.getElementById('post-dates').value;
    const msg = document.getElementById('post-msg').value;
    if (!dest || !msg) {
      alert('Fill in destination and message');
      return;
    }

    apiFetch('/api/profile', {
      method: 'PUT',
      body: JSON.stringify({
        destination: dest,
        dates,
        type,
        bio: msg
      })
    }).then(async (data) => {
      STATE.user = normalizeUser(data.user);
      document.querySelector('.modal-overlay').remove();
      await refreshConnections();
      await refreshConnectExtras();
      window.renderConnectMain(document.getElementById('connect-content'));
      updateNav();
      showToast('Your traveler profile is live on the Connect page.');
    }).catch((error) => showToast(error.message));
  };

  window.openGroupModal = function openGroupModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal" style="max-width:520px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;">
          <h3>Create Travel Group</h3>
          <button onclick="this.parentElement.parentElement.parentElement.remove()" style="background:none;border:none;cursor:pointer;font-size:1.4rem;color:var(--ink3);">x</button>
        </div>
        <div class="form-group"><label>Group name</label><input type="text" id="group-name" placeholder="e.g. Lisbon Summer Crew"/></div>
        <div class="form-group"><label>Destination</label><input type="text" id="group-destination" placeholder="e.g. Lisbon, Portugal"/></div>
        <div class="form-group"><label>Travel dates</label><input type="text" id="group-dates" placeholder="e.g. July 10-20"/></div>
        <div class="form-group"><label>Description</label><textarea id="group-description" rows="4" style="width:100%;padding:11px 14px;border:1.5px solid var(--sand2);border-radius:var(--radius-sm);font-family:'DM Sans',sans-serif;font-size:0.92rem;resize:vertical;" placeholder="Who should join and what are you planning?"></textarea></div>
        <button class="btn btn-primary" style="width:100%;justify-content:center;" onclick="createGroup()">Create Group</button>
      </div>`;
    document.body.appendChild(modal);
    modal.style.display = 'flex';
  };

  window.createGroup = async function createGroup() {
    try {
      const data = await apiFetch('/api/groups', {
        method: 'POST',
        body: JSON.stringify({
          name: document.getElementById('group-name').value.trim(),
          destination: document.getElementById('group-destination').value.trim(),
          dates: document.getElementById('group-dates').value.trim(),
          description: document.getElementById('group-description').value.trim()
        })
      });
      document.querySelector('.modal-overlay').remove();
      setupSocket();
      await refreshConnectExtras();
      window.renderConnectMain(document.getElementById('connect-content'));
      showToast(`Group "${data.group.name}" created.`);
    } catch (error) {
      showToast(error.message);
    }
  };

  window.joinGroup = async function joinGroup(groupId) {
    try {
      await apiFetch(`/api/groups/${groupId}/join`, { method: 'POST' });
      setupSocket();
      await refreshConnectExtras();
      window.renderConnectMain(document.getElementById('connect-content'));
      showToast('Joined the group.');
    } catch (error) {
      showToast(error.message);
    }
  };

  window.renderChatMessages = function renderChatMessages(items) {
    const messages = document.getElementById('chat-messages');
    if (!messages) return;
    if (!items.length) {
      messages.innerHTML = `<div style="text-align:center;color:var(--ink3);font-size:0.9rem;margin-bottom:1rem;">Start chatting!</div>`;
      return;
    }
    messages.innerHTML = items.map((message) => {
      const isMe = String(message.senderId) === String((STATE.user || {}).id);
      const name = isMe ? 'You' : (getCompanionById(STATE.activeChatUserId)?.name || 'Traveler');
      return `<div data-message-id="${message.id}" style="margin-bottom:8px;${isMe ? '' : 'color:var(--ink3);'}"><strong>${name}:</strong> ${message.body}</div>`;
    }).join('');
    messages.scrollTop = messages.scrollHeight;
  };

  window.appendChatMessage = function appendChatMessage(message) {
    const messages = document.getElementById('chat-messages');
    if (!messages) return;
    const messageId = String(message.id || `${message.senderId}-${message.sentAt}-${message.body}`);
    if (messages.querySelector(`[data-message-id="${messageId}"]`)) return;
    if (messages.textContent.includes('Start chatting!')) messages.innerHTML = '';
    const isMe = String(message.senderId) === String((STATE.user || {}).id);
    const name = isMe ? 'You' : (getCompanionById(STATE.activeChatUserId)?.name || 'Traveler');
    messages.innerHTML += `<div data-message-id="${messageId}" style="margin-bottom:8px;${isMe ? '' : 'color:var(--ink3);'}"><strong>${name}:</strong> ${message.body}</div>`;
    messages.scrollTop = messages.scrollHeight;
  };

  window.openChat = async function openChat(id) {
    const companion = getCompanionById(id);
    if (!companion) return;
    const status = (STATE.connections || {})[id];
    if (status !== 'connected') {
      showToast('You need to be connected before you can message this person.');
      return;
    }

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal" style="max-width:500px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem;">
          <h3>Chat with ${companion.name}</h3>
          <button onclick="STATE.activeChatUserId=null;this.parentElement.parentElement.parentElement.remove()" style="background:none;border:none;cursor:pointer;font-size:1.4rem;color:var(--ink3);">x</button>
        </div>
        <div id="chat-messages" style="height:300px;overflow-y:auto;border:1px solid var(--sand2);border-radius:var(--radius-sm);padding:1rem;margin-bottom:1rem;background:var(--sand);">
          <div style="text-align:center;color:var(--ink3);font-size:0.9rem;margin-bottom:1rem;">Start chatting!</div>
        </div>
        <div style="display:flex;gap:8px;">
          <input type="text" id="chat-input" placeholder="Type a message..." style="flex:1;padding:10px;border:1px solid var(--sand2);border-radius:var(--radius-sm);" onkeydown="if(event.key==='Enter'){sendMessage('${id}')}" />
          <button class="btn btn-primary btn-sm" onclick="sendMessage('${id}')">Send</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
    modal.style.display = 'flex';
    STATE.activeChatUserId = String(id);
    STATE.lastMessageUserId = String(id);
    resetUnreadMessages(id);

    const messages = document.getElementById('chat-messages');
    messages.innerHTML = `<div class="loading"><div class="spinner"></div>Loading messages...</div>`;
    try {
      const data = await apiFetch(`/api/messages/${id}`, { method: 'GET' });
      window.renderChatMessages(data.messages || []);
    } catch (error) {
      messages.innerHTML = `<div style="color:var(--rose);">${error.message}</div>`;
    }
  };

  window.sendMessage = async function sendMessage(id) {
    const input = document.getElementById('chat-input');
    const msg = input.value.trim();
    if (!msg) return;
    input.value = '';
    try {
      const data = await apiFetch('/api/messages', {
        method: 'POST',
        body: JSON.stringify({ receiverId: Number(id), body: msg })
      });
      window.appendChatMessage(data.message);
    } catch (error) {
      showToast(error.message);
    }
  };

  window.renderGroupChatMessages = function renderGroupChatMessages(items) {
    const messages = document.getElementById('group-chat-messages');
    if (!messages) return;
    if (!items.length) {
      messages.innerHTML = `<div style="text-align:center;color:var(--ink3);font-size:0.9rem;margin-bottom:1rem;">Start the group chat!</div>`;
      return;
    }
    messages.innerHTML = items.map((message) => {
      const isMe = String(message.senderId) === String((STATE.user || {}).id);
      const name = isMe ? 'You' : (message.senderName || 'Traveler');
      return `<div data-group-message-id="${message.id}" style="margin-bottom:8px;${isMe ? '' : 'color:var(--ink3);'}"><strong>${escapeHtml(name)}:</strong> ${escapeHtml(message.body)}</div>`;
    }).join('');
    messages.scrollTop = messages.scrollHeight;
  };

  window.appendGroupChatMessage = function appendGroupChatMessage(message) {
    const messages = document.getElementById('group-chat-messages');
    if (!messages) return;
    const messageId = String(message.id || `${message.groupId}-${message.senderId}-${message.sentAt}`);
    if (messages.querySelector(`[data-group-message-id="${messageId}"]`)) return;
    if (messages.textContent.includes('Start the group chat!')) messages.innerHTML = '';
    const isMe = String(message.senderId) === String((STATE.user || {}).id);
    const name = isMe ? 'You' : (message.senderName || 'Traveler');
    messages.innerHTML += `<div data-group-message-id="${messageId}" style="margin-bottom:8px;${isMe ? '' : 'color:var(--ink3);'}"><strong>${escapeHtml(name)}:</strong> ${escapeHtml(message.body)}</div>`;
    messages.scrollTop = messages.scrollHeight;
  };

  window.openGroupChat = async function openGroupChat(groupId) {
    const group = (STATE.groupData || []).find((item) => String(item.id) === String(groupId));
    if (!group || !group.joined) {
      showToast('Join the group before opening the group chat.');
      return;
    }

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal" style="max-width:560px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem;">
          <div>
            <h3 style="margin-bottom:0.2rem;">${escapeHtml(group.name)}</h3>
            <p style="color:var(--ink3);font-size:0.9rem;">Group chat</p>
          </div>
          <button onclick="STATE.activeGroupChatId=null;this.parentElement.parentElement.parentElement.remove()" style="background:none;border:none;cursor:pointer;font-size:1.4rem;color:var(--ink3);">x</button>
        </div>
        <div id="group-chat-messages" style="height:320px;overflow-y:auto;border:1px solid var(--sand2);border-radius:var(--radius-sm);padding:1rem;margin-bottom:1rem;background:var(--sand);">
          <div style="text-align:center;color:var(--ink3);font-size:0.9rem;margin-bottom:1rem;">Start the group chat!</div>
        </div>
        <div style="display:flex;gap:8px;">
          <input type="text" id="group-chat-input" placeholder="Message the group..." style="flex:1;padding:10px;border:1px solid var(--sand2);border-radius:var(--radius-sm);" onkeydown="if(event.key==='Enter'){sendGroupMessage('${group.id}')}" />
          <button class="btn btn-primary btn-sm" onclick="sendGroupMessage('${group.id}')">Send</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
    modal.style.display = 'flex';
    STATE.activeGroupChatId = String(group.id);

    const messages = document.getElementById('group-chat-messages');
    messages.innerHTML = `<div class="loading"><div class="spinner"></div>Loading messages...</div>`;
    try {
      const data = await apiFetch(`/api/groups/${group.id}/messages`, { method: 'GET' });
      window.renderGroupChatMessages(data.messages || []);
    } catch (error) {
      messages.innerHTML = `<div style="color:var(--rose);">${escapeHtml(error.message)}</div>`;
    }
  };

  window.sendGroupMessage = async function sendGroupMessage(groupId) {
    const input = document.getElementById('group-chat-input');
    const msg = input.value.trim();
    if (!msg) return;
    input.value = '';
    try {
      const data = await apiFetch(`/api/groups/${groupId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ body: msg })
      });
      window.appendGroupChatMessage(data.message);
    } catch (error) {
      showToast(error.message);
    }
  };

  window.viewProfile = function viewProfile(id) {
    const companion = getCompanionById(id);
    if (!companion) {
      alert('Profile not found');
      return;
    }
    alert(`Profile: ${companion.name}\nFrom: ${companion.location || 'N/A'}\nTraveling to: ${companion.destination || 'N/A'}\nDates: ${companion.dates || 'N/A'}\n\n${companion.post || ''}`);
  };

  window.renderConnectMain = function renderConnectMainWithProfiles(el) {
    const pending = STATE.connectionRequests || [];
    const recommendations = (STATE.recommendedUsers || []).filter((user) => String(user.id) !== String((STATE.user || {}).id));
    const groups = STATE.groupData || [];
    const inboxHtml = pending.length > 0 ? `
      <div class="inbox-banner">
        <div>
          <h4>Connection Requests (${pending.length})</h4>
          <p>Accept a request to start messaging</p>
        </div>
        <button class="btn btn-outline btn-sm" onclick="toggleInbox()">View Requests</button>
      </div>
      <div id="inbox-panel" style="display:none;margin-bottom:1.5rem;">
        ${pending.map((r) => `
          <div class="inbox-request" id="inbox-${r.id}">
            <div class="inbox-request-info">
              <strong>${escapeHtml(r.name)}</strong>
              <p>${escapeHtml(r.destination || 'No destination yet')} • ${escapeHtml(r.dates || 'Dates TBD')} - "${escapeHtml((r.post || '').slice(0, 60))}..."</p>
            </div>
            <div style="display:flex;gap:8px;">
              <button class="btn btn-teal btn-sm" onclick="acceptRequest('${r.id}')">Accept</button>
              <button class="btn btn-outline btn-sm" onclick="declineRequest('${r.id}')">Decline</button>
            </div>
          </div>`).join('')}
      </div>` : '';

    const allUsers = (STATE.connectData || []).filter((u) => String(u.id) !== String((STATE.user || {}).id));
    const cards = allUsers.map((user) => window.buildCompanionCard(user)).join('');
    const recommendationCards = recommendations.map((user) => {
      return `
        <div class="rec-card" style="border:1px solid rgba(19,124,122,.15);background:linear-gradient(180deg,#fffefb,var(--white));">
          <div class="rec-body" style="padding-top:1.2rem;">
            <div style="display:flex;justify-content:space-between;gap:0.8rem;align-items:flex-start;margin-bottom:0.75rem;">
              <div>
                <div style="display:inline-flex;align-items:center;gap:4px;background:var(--teal3);color:var(--teal);font-size:0.72rem;font-weight:700;font-family:'Syne',sans-serif;padding:3px 9px;border-radius:100px;margin-bottom:8px;">Recommended</div>
                <div class="rec-name">${escapeHtml(user.name)}</div>
                <div class="rec-country">${escapeHtml(user.location || '')}${user.destination ? ` -> ${escapeHtml(user.destination)}` : ''}</div>
                <div style="font-size:0.84rem;color:var(--ink3);margin-top:4px;">Travel dates: ${escapeHtml(user.dates || 'Dates TBD')}</div>
              </div>
              <div style="font-family:'Syne',sans-serif;font-size:1.2rem;color:var(--teal);">${Math.max(1, Math.round((user.recommendationScore || 0) / 10))}%</div>
            </div>
            <div style="font-size:0.9rem;color:var(--ink2);line-height:1.6;margin-bottom:0.8rem;">${escapeHtml(user.post || user.bio || 'Potential fit for your next trip.')}</div>
            <div class="rec-tags">
              <span class="tag ${user.type === 'offering' ? 'tag-amber' : 'tag-teal'}">${user.type === 'offering' ? 'Offering' : 'Seeking'}</span>
              ${(user.interests || []).slice(0, 3).map((interest) => `<span class="tag tag-rose">${escapeHtml(interest)}</span>`).join('')}
            </div>
            <div class="connect-btn-group">
              <button class="btn btn-sm btn-connect" onclick="sendConnectionRequest('${user.id}')">Connect</button>
              <button class="btn btn-outline btn-sm" onclick="viewProfile('${user.id}')">View Profile</button>
            </div>
          </div>
        </div>`;
    }).join('');
    const groupCards = groups.map((group) => `
      <div class="card" style="padding:1.05rem;background:linear-gradient(180deg,#fffefc,var(--white));">
        <div style="display:flex;justify-content:space-between;gap:1rem;align-items:flex-start;">
          <div>
            <div style="font-family:'Syne',sans-serif;font-size:1rem;font-weight:700;">${escapeHtml(group.name)}</div>
            <div style="font-size:0.84rem;color:var(--ink3);margin-top:4px;">${escapeHtml(group.destination)} • ${escapeHtml(group.dates)}</div>
            <div style="font-size:0.84rem;color:var(--ink3);margin-top:4px;">${group.memberCount} members • Created by ${escapeHtml(group.creatorName)}</div>
            <div style="font-size:0.86rem;color:var(--ink2);margin-top:8px;">${escapeHtml(group.description || 'Travel group for coordinating plans together.')}</div>
          </div>
          ${group.joined ? `<div style="display:flex;gap:0.45rem;flex-wrap:wrap;justify-content:flex-end;"><button class="btn btn-teal btn-sm" onclick="openGroupChat('${group.id}')">Group Chat</button><span class="tag tag-teal">Joined</span></div>` : `<button class="btn btn-outline btn-sm" onclick="joinGroup('${group.id}')">Join</button>`}
        </div>
        <div style="margin-top:1rem;padding-top:0.9rem;border-top:1px solid var(--sand2);">
          <div style="font-size:0.76rem;letter-spacing:.08em;text-transform:uppercase;color:var(--ink3);margin-bottom:0.55rem;">Who's in this group</div>
          <div style="display:flex;flex-wrap:wrap;gap:0.55rem;">
            ${(group.members || []).length ? group.members.map((member) => `
              <button onclick="viewProfile('${member.id}')" style="display:inline-flex;align-items:center;gap:0.55rem;padding:0.45rem 0.7rem;border:1px solid var(--sand2);border-radius:999px;background:var(--white);cursor:pointer;color:var(--ink);">
                <span style="width:28px;height:28px;border-radius:50%;background:var(--teal3);display:inline-flex;align-items:center;justify-content:center;color:var(--teal);font-family:'Syne',sans-serif;font-size:0.78rem;font-weight:800;">${escapeHtml((member.name || '?').slice(0, 1).toUpperCase())}</span>
                <span style="display:flex;flex-direction:column;align-items:flex-start;line-height:1.1;">
                  <span style="font-size:0.86rem;font-weight:700;">${escapeHtml(member.name)}</span>
                  <span style="font-size:0.72rem;color:var(--ink3);">${escapeHtml(member.role === 'owner' ? 'Organizer' : member.destination || 'Traveler')}</span>
                </span>
              </button>`).join('') : `<span style="font-size:0.84rem;color:var(--ink3);">${group.memberCount > 0 ? 'Member profiles will appear after the server refreshes group data.' : 'No members yet'}</span>`}
          </div>
        </div>
      </div>`).join('');

    el.innerHTML = `
      <div style="margin-bottom:2rem;">
        <div class="section-head">
          <div>
            <h2>Travel Companions</h2>
            <p style="color:var(--ink3);font-size:0.9rem;margin-top:4px;">Send a connection request to start chatting</p>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button class="btn btn-outline btn-sm" onclick="openGroupModal()">+ Create Group</button>
            <button class="btn btn-primary btn-sm" onclick="openPostModal()">+ Post Request</button>
          </div>
        </div>
        ${inboxHtml}
        <div style="display:flex;gap:12px;margin-bottom:1rem;">
          <input type="text" id="connect-search" placeholder="Search destinations, names..." style="flex:1;padding:10px;border:1px solid var(--sand2);border-radius:var(--radius-sm);" oninput="filterConnect()"/>
        </div>
        <div class="filter-bar">
          <span class="filter-label">Filter:</span>
          <div class="filter-chip ${STATE.connectFilters.includes('Seeking Companions') ? 'active' : ''}" onclick="toggleConnectFilter('Seeking Companions')">Seeking Companions</div>
          <div class="filter-chip ${STATE.connectFilters.includes('Offering to Join') ? 'active' : ''}" onclick="toggleConnectFilter('Offering to Join')">Offering to Join</div>
          <div class="filter-chip ${STATE.connectFilters.includes('Culture') ? 'active' : ''}" onclick="toggleConnectFilter('Culture')">Culture</div>
          <div class="filter-chip ${STATE.connectFilters.includes('Adventure') ? 'active' : ''}" onclick="toggleConnectFilter('Adventure')">Adventure</div>
          <div class="filter-chip ${STATE.connectFilters.includes('Food') ? 'active' : ''}" onclick="toggleConnectFilter('Food')">Food</div>
          <div class="filter-chip ${STATE.connectFilters.includes('Nature') ? 'active' : ''}" onclick="toggleConnectFilter('Nature')">Nature</div>
        </div>
      </div>
      ${recommendations.length ? `
        <div style="margin-bottom:1.5rem;">
          <div class="section-title">Recommended For You</div>
          <p style="color:var(--ink3);font-size:0.9rem;margin:-0.35rem 0 1rem;">Currently based on destination match, overlapping dates, shared interests, complementary travel style, and location.</p>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:1rem;">${recommendationCards}</div>
        </div>` : ''}
      <div style="margin-bottom:1.5rem;">
        <div class="section-title">Travel Groups</div>
        ${groups.length ? `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:1rem;">${groupCards}</div>` : `<div class="card"><p style="color:var(--ink3);">No groups yet. Create the first one for your destination.</p></div>`}
      </div>
      ${allUsers.length ? `
        <div style="margin-bottom:1.5rem;">
          <div class="section-title" style="font-size:0.9rem;color:var(--teal);font-family:'Syne',sans-serif;font-weight:700;display:flex;align-items:center;gap:10px;margin-bottom:1rem;">
            <span style="background:var(--teal3);color:var(--teal);padding:3px 10px;border-radius:100px;font-size:0.75rem;">LIVE</span>
            Real Travelers (${allUsers.length})
            <span style="flex:1;height:1px;background:var(--sand2);display:block;"></span>
          </div>
          <div class="rec-grid" id="connect-grid">${cards}</div>
        </div>` : `
        <div style="background:var(--teal3);border:1px dashed var(--teal);border-radius:var(--radius);padding:1rem 1.25rem;margin-bottom:1.5rem;font-size:0.88rem;color:var(--teal);">
          <strong style="font-family:'Syne',sans-serif;">No real travelers yet</strong> - Be the first! Create an account and your profile will appear here for others to connect with.
        </div>`}
    `;
    window.filterConnect();
  };

  window.viewProfile = function viewProfileModal(id) {
    const pool = [
      ...(STATE.connectData || []),
      ...(STATE.acceptedConnections || []),
      ...(STATE.connectionRequests || []),
      ...(STATE.outgoingRequests || []),
      ...(STATE.recommendedUsers || []),
      ...((STATE.groupData || []).flatMap((group) => group.members || []))
    ];
    const companion = pool.find((user) => String(user.id) === String(id));
    if (!companion) {
      showToast('Profile not found');
      return;
    }
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = buildProfileModal(companion);
    document.body.appendChild(modal);
    modal.style.display = 'flex';
  };

  window.processImageFile = async function processImageFile(file) {
    const result = document.getElementById('translate-result');
    result.innerHTML = `<div class="loading"><div class="spinner"></div>Reading image...</div>`;
    const reader = new FileReader();
    reader.onload = async function onLoad(event) {
      const base64 = event.target.result.split(',')[1];
      result.innerHTML = `
        <div class="translate-result">
          <img src="${event.target.result}" class="uploaded-img" alt="Uploaded image"/>
          <div class="loading" style="padding:1rem 0;"><div class="spinner"></div>Ollama is translating...</div>
        </div>`;
      try {
        const translationPrompt = `You are an OCR translation tool.
Translate only the visible text in the uploaded image into clear English.

Rules:
- Do not describe the image.
- Do not explain what kind of document it is.
- Do not provide extra context, tips, or commentary.
- Preserve the structure when possible, such as headings, sections, and line breaks.
- If some text is unreadable, mark that portion as "[unclear]".
- Output only the translated text.`;
        const visionModel = getVisionModelName();
        const response = await fetch(`${OLLAMA_API}/api/ollama/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: visionModel,
            prompt: `${translationPrompt}

Return plain, readable English only.
Do not output binary-looking characters, encoded symbols, or raw OCR fragments.
Read the attached image directly. Do not ask the user to paste the image or data URL again.`,
            stream: false,
            images: [base64],
            options: { num_predict: 700 }
          })
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || `Ollama returned ${response.status}.`);
        }
        const text = data.response || 'Could not read image.';
        if (/provide the data url|provide the image|cannot perform steps/i.test(text)) {
          throw new Error(`The Ollama model "${visionModel}" did not process the image. Make sure a vision model is installed, for example: ollama pull ${visionModel}`);
        }
        if (looksLikePromptEcho(text)) {
          throw new Error(`The Ollama model "${visionModel}" echoed the prompt instead of reading the image. Make sure you're using a vision-capable model and that it is installed locally.`);
        }
        if (looksLikeGibberish(text)) {
          throw new Error(`The vision model "${visionModel}" returned unreadable text. Try a stronger vision model such as llava:13b or minicpm-v:8b.`);
        }
        result.innerHTML = `
          <div class="translate-result">
            <img src="${event.target.result}" class="uploaded-img" alt="Uploaded image"/>
            <h4>Translation Result</h4>
            <p>${text.replace(/\n/g, '<br/>')}</p>
            <button class="btn btn-outline btn-sm" style="margin-top:1rem;" onclick="document.getElementById('img-upload').click()">Translate another -></button>
          </div>`;
      } catch (error) {
        result.innerHTML = `<div class="translate-result"><img src="${event.target.result}" class="uploaded-img" alt="Uploaded"/><h4>Error</h4><p>${error.message}</p><p style="font-size:0.85rem;color:var(--ink3);margin-top:1rem;">Make sure Ollama is running at http://localhost:11434 and that the vision model "${getVisionModelName()}" is installed.</p></div>`;
      }
    };
    reader.readAsDataURL(file);
  };

  window.getFallbackActivities = function getFallbackActivitiesFixed() {
    if (typeof getFallbackActivities === 'function') {
      return getFallbackActivities();
    }
    return [];
  };

  window.renderEnjoyMain = function renderEnjoyMainFixed(el) {
    const acts = (STATE.enjoyData || []).map((activity) => ({
      ...activity,
      emoji: normalizeActivityEmoji(activity.emoji, activity)
    }));
    const dest = STATE.selectedDest;
    const filterOptions = ['Free', 'Under $30', 'Indoor', 'Outdoor', 'Morning', 'Evening', 'Culture', 'Food', 'Adventure'];
    const nights = (STATE.preferences?.duration || 10) - 1;
    el.innerHTML = `
      <div class="trip-summary-banner">
        <div>
          <div class="trip-sum-item">Destination</div>
          <div class="trip-sum-val">${getPlaceVisualMarkup(dest)} ${dest.name}, ${dest.country}</div>
        </div>
        <div>
          <div class="trip-sum-item">Flight</div>
          <div class="trip-sum-val">${STATE.selectedFlight?.airline || '-'}</div>
        </div>
        <div>
          <div class="trip-sum-item">Hotel</div>
          <div class="trip-sum-val">${STATE.selectedHotel?.name || '-'}</div>
        </div>
        <div>
          <div class="trip-sum-item">Duration</div>
          <div class="trip-sum-val">${nights + 1} days</div>
        </div>
        <div>
          <div class="trip-sum-item">Booking Ref</div>
          <div class="trip-sum-val" style="color:var(--teal2);">${STATE.bookingRef || '-'}</div>
        </div>
      </div>

      <div class="section-head" style="margin-bottom:1rem;">
        <div>
          <h2>Your activities</h2>
          <p style="color:var(--ink3);font-size:0.9rem;margin-top:4px;">AI-curated for you · <button onclick="resetEnjoy()" style="background:none;border:none;color:var(--teal);cursor:pointer;font-size:0.9rem;text-decoration:underline;">Redo preferences</button></p>
        </div>
        <button class="btn btn-outline btn-sm" onclick="generateEnjoyData(STATE.enjoyFilters)">Refresh activities</button>
      </div>
      <div class="filter-bar">
        <span class="filter-label">Filter:</span>
        ${filterOptions.map((f) => `<div class="filter-chip ${STATE.enjoyFilters.includes(f) ? 'active' : ''}" onclick="toggleEnjoyFilter('${f}')">${f}</div>`).join('')}
      </div>
      <div class="activity-grid">
        ${acts.map((a, i) => `
          <div class="activity-card" style="animation:fadeUp ${0.1 + i * 0.07}s ease both;">
            <div class="activity-icon">${a.emoji}</div>
            <div class="activity-name">${a.name}</div>
            <div class="activity-meta">&#9201; ${a.duration} · &#128176; ${a.cost} · &#128336; ${a.timeOfDay}</div>
            <p style="font-size:0.85rem;color:var(--ink2);line-height:1.6;margin-bottom:0.75rem;">${a.description}</p>
            <div style="font-size:0.82rem;background:var(--amber3);color:var(--amber);padding:8px 12px;border-radius:var(--radius-sm);margin-bottom:0.75rem;">&#128161; ${a.tips}</div>
            <div class="activity-badges">
              <span class="tag tag-teal">${a.category}</span>
              <span class="tag tag-amber">${a.indoor ? 'Indoor' : 'Outdoor'}</span>
            </div>
          </div>`).join('')}
      </div>

      </div>`;
  };

  window.showPage = function showPage(page) {
    originalShowPage(page);
    if (page === 'plan') {
      syncPlanPreviewFlags();
    }
    if (page === 'connect') {
      window.renderConnect();
    }
  };

  async function initApp() {
    await loadCurrentUser();
    applyBranding();
    if (STATE.user) {
      loadUserState(STATE.user.id);
    }
    updateNav();
    if (STATE.user) setupSocket();
    syncUnreadUi();
    if (STATE.currentPage === 'connect') {
      await window.renderConnect();
    } else {
      renderPlan();
      syncPlanPreviewFlags();
    }
    if (STATE.selectedDest) document.getElementById('tab-book').disabled = false;
    if (STATE.bookingRef) document.getElementById('tab-enjoy').disabled = false;
  }

  initApp();
})();
