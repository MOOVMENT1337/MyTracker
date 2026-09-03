// ============================================================
// components.js – Reusable rendering functions
// ============================================================

function formatDate(isoStr) {
  if (!isoStr) return '—';

  const date = new Date(isoStr);
  const now = new Date();
  const diff = Math.floor((now - date) / 86400000);
  const locale = typeof getCurrentLanguage === 'function' && getCurrentLanguage() === 'ru' ? 'ru-RU' : 'en-GB';

  if (diff === 0) return typeof t === 'function' ? t('misc.today') : 'Today';
  if (diff === 1) return typeof t === 'function' ? t('misc.yesterday') : 'Yesterday';
  if (diff < 7) return typeof t === 'function' ? t('misc.daysAgo', { count: diff }) : `${diff} days ago`;

  return date.toLocaleDateString(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatDateFull(isoStr) {
  if (!isoStr) return '—';
  const d = new Date(isoStr);
  const pad = n => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function el(tag, cls, html) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (html !== undefined) node.innerHTML = html;
  return node;
}

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;');
}

function escapeAttr(str) {
  return escapeHtml(str).replace(/'/g, '&#39;');
}

function componentInitials(displayName) {
  const parts = String(displayName || 'User').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'U';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function authLabel(key, fallback) {
  return typeof authText === 'function' ? authText(key) : fallback;
}

// NEW: user roles
function roleLabel(role) {
  if (typeof translateRole === 'function') return translateRole(role);
  return role || 'Employee';
}

function providerLabel(provider) {
  // Provider is kept internally only; UI now displays user roles instead.
  const map = {
    local: authLabel('providerLocal', 'Local'),
    google: 'Google',
    yandex: 'Yandex',
    mail: 'Mail.ru',
  };
  return map[provider] || provider || '—';
}

// NEW: status timer
function formatDuration(statusChangedAt) {
  const started = new Date(statusChangedAt || Date.now()).getTime();
  const safeStarted = Number.isFinite(started) ? started : Date.now();
  const diffMinutes = Math.max(0, Math.floor((Date.now() - safeStarted) / 60000));
  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;
  const days = Math.floor(hours / 24);
  const restHours = hours % 24;

  if (diffMinutes < 60) return `${diffMinutes}m`;
  if (hours < 24) return `${hours}h ${minutes}m`;
  if (days < 7) return `${days}d ${restHours}h`;
  return `${days}d`;
}

function formatStatusTimer(issue) {
  const status = issue?.status || 'Open';
  return `${translateStatus(status)} • ${formatDuration(issue?.statusChangedAt || issue?.createdAt)}`;
}

function getTaskUrl(issueId) {
  const url = new URL(window.location.href);
  url.searchParams.set('taskId', issueId);
  return url.toString();
}

function getBoardUrl() {
  const url = new URL(window.location.href);
  url.searchParams.delete('taskId');
  return url.toString();
}

function statusClass(status) {
  const map = {
    'Open': 'badge-open',
    'In Progress': 'badge-inprogress',
    'Need Info': 'badge-needinfo',
    'Done': 'badge-done',
    'Closed': 'badge-closed',
  };
  return map[status] || 'badge-open';
}

function priorityClass(priority) {
  const map = {
    High: 'badge-high',
    Medium: 'badge-medium',
    Low: 'badge-low',
  };
  return map[priority] || 'badge-low';
}

function typeIcon(type) {
  const map = {
    Task: '<i class="fa-solid fa-circle-check type-task"></i>',
    Bug: '<i class="fa-solid fa-bug type-bug"></i>',
    Story: '<i class="fa-solid fa-bookmark type-story"></i>',
    Epic: '<i class="fa-solid fa-bolt type-epic"></i>',
  };
  return map[type] || map.Task;
}

function priorityIcon(priority) {
  const map = {
    High: '<i class="fa-solid fa-arrow-up prio-high"></i>',
    Medium: '<i class="fa-solid fa-equals prio-medium"></i>',
    Low: '<i class="fa-solid fa-arrow-down prio-low"></i>',
  };
  return map[priority] || '';
}

function renderAvatar(user, size = 28) {
  if (!user) {
    return `<span class="avatar avatar-empty" style="width:${size}px;height:${size}px;font-size:${Math.floor(size * 0.4)}px">?</span>`;
  }

  const displayName = user.displayName || user.email || 'User';
  const initials = user.initials || user.avatar || componentInitials(displayName);
  const avatarColor = user.avatarColor || '#4F8EF7';

  return `
    <span class="avatar"
          style="background:${avatarColor};width:${size}px;height:${size}px;font-size:${Math.floor(size * 0.4)}px"
          title="${escapeAttr(displayName)}">
      ${escapeHtml(initials)}
    </span>
  `;
}

// ============================================================
// SIDEBAR
// ============================================================
function renderSidebar(state) {
  const { queues, currentView, currentQueueId } = state;
  const currentUser = AppData.getCurrentUser();
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;

  sidebar.innerHTML = `
    <div class="sidebar-logo">
      <div class="logo-icon"><i class="fa-solid fa-layer-group"></i></div>
      <span class="logo-text">YTracker</span>
      <button class="sidebar-collapse-btn" id="sidebarToggle" title="${escapeAttr(t('tooltips.toggleSidebar'))}">
        <i class="fa-solid fa-chevron-left"></i>
      </button>
    </div>

    <nav class="sidebar-nav">
      <div class="nav-section-label">${t('nav.navigation')}</div>

      <a href="#" class="nav-item ${currentView === 'my-tasks' ? 'active' : ''}" data-view="my-tasks">
        <i class="fa-solid fa-user-check"></i>
        <span class="nav-label">${t('nav.myTasks')}</span>
      </a>

      <a href="#" class="nav-item ${currentView === 'all-issues' ? 'active' : ''}" data-view="all-issues">
        <i class="fa-solid fa-table-columns"></i>
        <span class="nav-label">${t('nav.allIssues')}</span>
      </a>

      <div class="nav-section-label queues-label">
        <span>${t('nav.queues')}</span>
        <button class="btn-add-queue-small" id="btnAddQueueSidebar" title="${escapeAttr(t('actions.createQueue'))}">
          <i class="fa-solid fa-plus"></i>
        </button>
      </div>

      ${currentUser?.isAdmin ? `
        <button type="button" class="nav-item admin-panel-btn" id="btnAdminPanelSidebar">
          <i class="fa-solid fa-user-shield"></i>
          <span class="nav-label">${t('admin.title')}</span>
        </button>
      ` : ''}

      ${queues.map(queue => `
        <div role="button"
             tabindex="0"
             class="nav-item nav-queue ${currentView === 'queue' && currentQueueId === queue.id ? 'active' : ''}"
             data-view="queue"
             data-queue-id="${queue.id}">
          <span class="queue-dot" style="background:${queue.color}"></span>
          <span class="nav-label">${escapeHtml(queue.name)}</span>
          <span class="queue-key-badge">${escapeHtml(queue.key)}</span>
          ${currentUser?.isAdmin ? `
            <button type="button"
                    class="delete-queue-btn"
                    data-queue-id="${escapeAttr(queue.id)}"
                    title="${escapeAttr(t('admin.deleteQueue'))}"
                    aria-label="${escapeAttr(t('admin.deleteQueue'))}">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          ` : ''}
        </div>
      `).join('')}
    </nav>

    <div class="sidebar-footer">
      <a href="#" class="nav-item ${currentView === 'activity' ? 'active' : ''}" data-view="activity">
        <i class="fa-solid fa-clock-rotate-left"></i>
        <span class="nav-label">${t('nav.activityLog')}</span>
      </a>
    </div>
  `;
}

// ============================================================
// TOPBAR
// ============================================================
function renderTopbar(state) {
  const { currentUserId } = state;
  const topbar = document.getElementById('topbar');
  if (!topbar) return;

  const currentUser = AppData.getCurrentUser() || AppData.getUserById(currentUserId);
  const logoutText = authLabel('logout', 'Logout');

  topbar.innerHTML = `
    <div class="topbar-left">
      <button class="hamburger-btn" id="hamburgerBtn" title="${escapeAttr(t('tooltips.toggleMenu'))}">
        <i class="fa-solid fa-bars"></i>
      </button>
      <div class="topbar-breadcrumb" id="topbarBreadcrumb"></div>
    </div>

    <div class="topbar-right">
      <button class="btn btn-ghost" id="btnOpenSettings">
        <i class="fa-solid fa-gear"></i>
        <span>${t('actions.settings')}</span>
      </button>

      <button class="btn btn-primary" id="btnCreateIssue">
        <i class="fa-solid fa-plus"></i>
        <span>${t('actions.createIssue')}</span>
      </button>

      <div class="user-profile" id="loggedInUserProfile" title="${escapeAttr(currentUser?.email || '')}">
        ${renderAvatar(currentUser, 32)}
        <div class="user-profile-text">
          <span class="user-name">${currentUser ? escapeHtml(currentUser.displayName) : 'Unknown'}</span>
          <span class="user-provider">${roleLabel(currentUser?.role)}</span>
        </div>
      </div>

      <button class="btn btn-ghost btn-icon btn-logout-top" id="btnTopbarLogout" title="${escapeAttr(logoutText)}" aria-label="${escapeAttr(logoutText)}">
        <i class="fa-solid fa-right-from-bracket"></i>
      </button>
    </div>
  `;
}

// ============================================================
// FILTER TOOLBAR
// ============================================================
function renderFilterToolbar(state) {
  const { filters, users } = state;
  const toolbar = document.getElementById('filterToolbar');
  if (!toolbar) return;

  const statuses = AppData.getStatusList();
  const priorities = AppData.getPriorityList();

  toolbar.innerHTML = `
    <div class="filter-toolbar">
      <div class="search-wrap">
        <i class="fa-solid fa-magnifying-glass search-icon"></i>
        <input type="text"
               class="search-input"
               id="searchInput"
               placeholder="${escapeAttr(t('fields.searchPlaceholder'))}"
               value="${escapeAttr(filters.search || '')}">
        ${filters.search ? `<button class="search-clear" id="searchClear"><i class="fa-solid fa-xmark"></i></button>` : ''}
      </div>

      <div class="filter-group">
        <div class="filter-dropdown-wrap">
          <button class="filter-btn ${filters.status && filters.status.length ? 'active' : ''}" id="statusFilterBtn">
            <i class="fa-solid fa-circle-half-stroke"></i>
            ${t('filters.status')} ${filters.status && filters.status.length ? `(${filters.status.length})` : ''}
            <i class="fa-solid fa-chevron-down"></i>
          </button>
          <div class="filter-dropdown" id="statusDropdown">
            <div class="filter-dropdown-header">${t('filters.filterByStatus')}</div>
            ${statuses.map(status => `
              <label class="filter-check-item">
                <input type="checkbox" name="status" value="${status}" ${filters.status && filters.status.includes(status) ? 'checked' : ''}>
                <span class="badge ${statusClass(status)}">${translateStatus(status)}</span>
              </label>
            `).join('')}
          </div>
        </div>

        <div class="filter-dropdown-wrap">
          <button class="filter-btn ${filters.priority && filters.priority.length ? 'active' : ''}" id="priorityFilterBtn">
            <i class="fa-solid fa-flag"></i>
            ${t('filters.priority')} ${filters.priority && filters.priority.length ? `(${filters.priority.length})` : ''}
            <i class="fa-solid fa-chevron-down"></i>
          </button>
          <div class="filter-dropdown" id="priorityDropdown">
            <div class="filter-dropdown-header">${t('filters.filterByPriority')}</div>
            ${priorities.map(priority => `
              <label class="filter-check-item">
                <input type="checkbox" name="priority" value="${priority}" ${filters.priority && filters.priority.includes(priority) ? 'checked' : ''}>
                ${priorityIcon(priority)}
                <span class="badge ${priorityClass(priority)}">${translatePriority(priority)}</span>
              </label>
            `).join('')}
          </div>
        </div>

        <div class="filter-dropdown-wrap">
          <button class="filter-btn ${filters.assigneeId ? 'active' : ''}" id="assigneeFilterBtn">
            <i class="fa-solid fa-user"></i>
            ${t('filters.assignee')} ${filters.assigneeId ? '(1)' : ''}
            <i class="fa-solid fa-chevron-down"></i>
          </button>
          <div class="filter-dropdown" id="assigneeDropdown">
            <div class="filter-dropdown-header">${t('filters.filterByAssignee')}</div>
            <label class="filter-check-item">
              <input type="radio" name="assignee" value="" ${!filters.assigneeId ? 'checked' : ''}>
              <span>${t('fields.anyAssignee')}</span>
            </label>
            ${users.map(user => `
              <label class="filter-check-item">
                <input type="radio" name="assignee" value="${user.id}" ${filters.assigneeId === user.id ? 'checked' : ''}>
                ${renderAvatar(user, 20)}
                <span>${escapeHtml(user.displayName)}</span>
              </label>
            `).join('')}
          </div>
        </div>
      </div>

      ${(filters.search || (filters.status && filters.status.length) || (filters.priority && filters.priority.length) || filters.assigneeId)
        ? `
          <button class="btn btn-ghost reset-filters-btn" id="resetFilters">
            <i class="fa-solid fa-xmark"></i>
            ${t('actions.resetFilters')}
          </button>
        `
        : ''}
    </div>
  `;
}

// ============================================================
// KANBAN BOARD
// ============================================================
function createTaskCard(issue) {
  const card = el('article', 'task-card');
  const assignee = AppData.getUserById(issue.assigneeId);
  const commentCount = issue.comments ? issue.comments.length : 0;

  card.dataset.issueId = issue.id;
  card.tabIndex = 0;
  card.setAttribute('role', 'button');
  card.setAttribute('aria-label', `${issue.key} ${issue.summary}`);

  card.innerHTML = `
    <div class="task-card-top">
      <span class="task-key">${escapeHtml(issue.key)}</span>
      <span class="badge ${priorityClass(issue.priority)}">${translatePriority(issue.priority)}</span>
    </div>

    <div class="task-summary" title="${escapeAttr(issue.summary)}">${escapeHtml(issue.summary)}</div>

    <div class="task-meta">
      <span class="task-type">${typeIcon(issue.type)} <span>${translateType(issue.type)}</span></span>
      <span class="task-updated">${formatDate(issue.updatedAt)}</span>
    </div>

    <div class="task-status-timer"
         data-issue-id="${escapeAttr(issue.id)}"
         data-status="${escapeAttr(issue.status)}"
         data-status-changed-at="${escapeAttr(issue.statusChangedAt || issue.createdAt || '')}">
      ${formatStatusTimer(issue)}
    </div>

    <div class="task-card-footer">
      <div class="task-assignee">
        ${renderAvatar(assignee, 28)}
        <span class="task-assignee-name">${assignee ? escapeHtml(assignee.displayName) : t('fields.unassigned')}</span>
      </div>
      ${commentCount ? `<span class="task-comments"><i class="fa-regular fa-comment"></i> ${commentCount}</span>` : ''}
    </div>
  `;

  return card;
}

function renderKanbanBoard(issues) {
  const container = document.getElementById('issueBoardContainer');
  if (!container) return;

  // NEW ADMIN: delete queue
  if (AppData.getQueues().length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-folder-open empty-state-icon"></i>
        <p>${t('misc.noQueuesCreateOne')}</p>
      </div>
    `;
    return;
  }

  const statuses = AppData.getStatusList();
  const board = el('div', 'kanban-board board-entering');

  statuses.forEach(status => {
    const statusIssues = issues.filter(issue => issue.status === status);
    const column = el('section', 'kanban-column');
    const header = el('div', 'kanban-column-header');
    const body = el('div', 'kanban-column-body');

    column.dataset.status = status;

    header.innerHTML = `
      <div class="kanban-column-title-wrap">
        <span class="kanban-column-title">${translateStatus(status)}</span>
      </div>
      <span class="kanban-count">${statusIssues.length}</span>
    `;

    if (statusIssues.length === 0) {
      body.innerHTML = `<div class="kanban-empty">${t('misc.noIssues')}</div>`;
    } else {
      statusIssues.forEach(issue => body.appendChild(createTaskCard(issue)));
    }

    column.appendChild(header);
    column.appendChild(body);
    board.appendChild(column);
  });

  container.innerHTML = '';
  container.appendChild(board);

  requestAnimationFrame(() => {
    board.classList.remove('board-entering');
  });
}

// ============================================================
// ISSUE DETAIL MODAL
// ============================================================
function renderIssueModal(issue) {
  const modal = document.getElementById('issueModal');
  if (!modal || !issue) return;

  const queue = AppData.getQueueById(issue.queueId);
  const reporter = AppData.getUserById(issue.reporterId);
  const currentUser = AppData.getCurrentUser();
  const users = AppData.getUsers();

  modal.innerHTML = `
    <div class="modal-backdrop" id="modalBackdrop"></div>

    <div class="modal-panel issue-modal-panel" role="dialog" aria-modal="true" aria-labelledby="issueModalTitle">
      <div class="modal-header">
        <div class="modal-header-left">
          <span class="modal-queue-badge" style="background:${queue ? queue.color : '#999'}20;color:${queue ? queue.color : '#999'}">
            ${queue ? escapeHtml(queue.key) : '?'}
          </span>
          <span class="modal-key">${escapeHtml(issue.key)}</span>
        </div>
        <div class="modal-header-right">
          <button class="btn btn-ghost btn-icon" id="btnCloseModal" title="${escapeAttr(t('actions.close'))}">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
      </div>

      <div class="modal-body issue-modal-body">
        <button class="task-open-full-link" id="openFullTaskLink" type="button">
          <span class="task-open-full-link-text">
            <strong>${escapeHtml(issue.key)}</strong>
            <span>${escapeHtml(issue.summary)}</span>
            <small>${t('misc.openFullPage')}</small>
          </span>
          <i class="fa-solid fa-up-right-from-square"></i>
        </button>

        <div class="form-field issue-modal-full">
          <label class="form-label" for="summaryField">${t('labels.summary')}</label>
          <input type="text" class="form-input issue-summary-input" id="summaryField" value="${escapeAttr(issue.summary)}">
        </div>

        <div class="issue-modal-grid">
          <div class="form-field issue-modal-full">
            <label class="form-label" for="descriptionField">${t('labels.description')}</label>
            <textarea class="form-textarea issue-description-input" id="descriptionField" rows="5" placeholder="${escapeAttr(t('fields.issueDescriptionPlaceholder'))}">${escapeHtml(issue.description || '')}</textarea>
          </div>

          <div class="form-field">
            <label class="form-label" for="statusSelect">${t('labels.status')}</label>
            <select class="form-select" id="statusSelect">
              ${AppData.getStatusList().map(status => `<option value="${status}" ${issue.status === status ? 'selected' : ''}>${translateStatus(status)}</option>`).join('')}
            </select>
          </div>

          <div class="form-field">
            <label class="form-label" for="prioritySelect">${t('labels.priority')}</label>
            <select class="form-select" id="prioritySelect">
              ${AppData.getPriorityList().map(priority => `<option value="${priority}" ${issue.priority === priority ? 'selected' : ''}>${translatePriority(priority)}</option>`).join('')}
            </select>
          </div>

          <div class="form-field">
            <label class="form-label" for="typeSelect">${t('labels.type')}</label>
            <select class="form-select" id="typeSelect">
              ${AppData.getTypeList().map(type => `<option value="${type}" ${issue.type === type ? 'selected' : ''}>${translateType(type)}</option>`).join('')}
            </select>
          </div>

          <div class="form-field">
            <label class="form-label" for="assigneeSelect">${t('labels.assignee')}</label>
            <select class="form-select" id="assigneeSelect">
              <option value="">${t('fields.unassigned')}</option>
              ${users.map(user => `<option value="${user.id}" ${issue.assigneeId === user.id ? 'selected' : ''}>${escapeHtml(user.displayName)}</option>`).join('')}
            </select>
          </div>

          <div class="form-field issue-modal-full">
            <div class="issue-meta-inline">
              <div class="meta-inline-block">
                <span class="meta-label">${t('labels.queue')}</span>
                <span class="meta-inline-value">${queue ? escapeHtml(queue.name) : '—'}</span>
              </div>
              <div class="meta-inline-block">
                <span class="meta-label">${t('labels.reporter')}</span>
                <span class="meta-inline-value">${reporter ? escapeHtml(reporter.displayName) : '—'}</span>
              </div>
              <div class="meta-inline-block">
                <span class="meta-label">${t('labels.created')}</span>
                <span class="meta-inline-value">${formatDateFull(issue.createdAt)}</span>
              </div>
              <div class="meta-inline-block">
                <span class="meta-label">${t('labels.updated')}</span>
                <span class="meta-inline-value" id="metaUpdated">${formatDateFull(issue.updatedAt)}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="comments-section">
          <div class="comments-header">
            <h3>${t('labels.comments')}</h3>
            <span class="comments-count" id="commentsCount">${issue.comments ? issue.comments.length : 0}</span>
          </div>

          <div class="comments-list" id="commentsList">
            ${renderComments(issue)}
          </div>

          <div class="comment-input-wrap">
            ${renderAvatar(currentUser, 32)}
            <div class="comment-input-inner">
              <textarea class="comment-textarea" id="commentInput" rows="3" placeholder="${escapeAttr(t('fields.writeComment'))}"></textarea>
              <div class="comment-actions">
                <button class="btn btn-primary btn-sm" id="btnPostComment">${t('actions.addComment')}</button>
                <button class="btn btn-ghost btn-sm" id="btnClearComment">${t('actions.cancel')}</button>
              </div>
            </div>
          </div>
        </div>

        <div class="issue-modal-actions">
          <button class="btn btn-danger" id="btnDeleteIssue">
            <i class="fa-solid fa-trash"></i>
            ${t('actions.delete')}
          </button>

          <div class="issue-modal-actions-right">
            <button class="btn btn-ghost" id="btnCancelModal">${t('actions.cancel')}</button>
            <button class="btn btn-primary" id="btnSaveIssue">
              <i class="fa-solid fa-floppy-disk"></i>
              ${t('actions.save')}
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderComments(issue) {
  if (!issue.comments || issue.comments.length === 0) {
    return `<div class="comment-empty"><i class="fa-regular fa-comment-dots"></i> ${t('misc.noCommentsYet')}</div>`;
  }

  return issue.comments.map(comment => {
    const author = AppData.getUserById(comment.authorId);
    const authorName = author ? author.displayName : (comment.author || 'Unknown');
    const avatarUser = author || {
      displayName: authorName,
      initials: componentInitials(authorName),
      avatarColor: '#9099A8',
    };
    const isCurrentUser = comment.authorId === AppData.getCurrentUser()?.id;

    return `
      <div class="comment-item" data-comment-id="${comment.id}">
        ${renderAvatar(avatarUser, 32)}
        <div class="comment-body">
          <div class="comment-meta">
            <strong class="comment-author">${escapeHtml(authorName)}</strong>
            <span class="comment-time">${formatDate(comment.createdAt)}</span>
            ${isCurrentUser ? `
              <button class="comment-delete-btn" data-comment-id="${comment.id}" title="${escapeAttr(t('actions.delete'))}">
                <i class="fa-solid fa-trash-can"></i>
              </button>
            ` : ''}
          </div>
          <div class="comment-text">${escapeHtml(comment.text).replace(/\n/g, '<br>')}</div>
        </div>
      </div>
    `;
  }).join('');
}

// ============================================================
// NEW: Settings modal
// ============================================================
function renderSettingsModal() {
  const modal = document.getElementById('settingsModal');
  if (!modal) return;

  const currentLanguage = getCurrentLanguage();
  const currentTheme = AppData.getTheme();
  const currentUser = AppData.getCurrentUser();
  const logoutText = authLabel('logout', 'Logout');

  modal.innerHTML = `
    <div class="modal-backdrop" id="settingsModalBackdrop"></div>
    <div class="modal-panel modal-panel-small settings-modal-panel" role="dialog" aria-modal="true" aria-label="${escapeAttr(t('settings.title'))}">
      <div class="modal-header">
        <div class="modal-header-left">
          <i class="fa-solid fa-gear" style="color:var(--color-primary)"></i>
          <strong>${t('settings.title')}</strong>
        </div>
        <button class="btn btn-ghost btn-icon" id="btnCloseSettingsModal" title="${escapeAttr(t('actions.close'))}">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
      <div class="modal-body-create">
        <div class="settings-sections">
          <div class="settings-section settings-account-section">
            <div class="form-label">${authLabel('account', 'Account')}</div>
            <div class="settings-account">
              ${renderAvatar(currentUser, 40)}
              <div class="settings-account-info">
                <strong>${currentUser ? escapeHtml(currentUser.displayName) : 'Unknown'}</strong>
                <span>${currentUser ? escapeHtml(currentUser.email || '') : ''}</span>
                <small>${roleLabel(currentUser?.role)}</small>
              </div>
            </div>
          </div>

          <div class="settings-section">
            <div class="form-label">${t('labels.theme')}</div>
            <label class="settings-option">
              <input type="radio" name="themeSetting" value="light" ${currentTheme === 'light' ? 'checked' : ''}>
              <span>${t('settings.light')}</span>
            </label>
            <label class="settings-option">
              <input type="radio" name="themeSetting" value="dark" ${currentTheme === 'dark' ? 'checked' : ''}>
              <span>${t('settings.dark')}</span>
            </label>
          </div>

          <div class="settings-section">
            <div class="form-label">${t('labels.language')}</div>
            <label class="settings-option">
              <input type="radio" name="languageSetting" value="en" ${currentLanguage === 'en' ? 'checked' : ''}>
              <span>${t('settings.english')}</span>
            </label>
            <label class="settings-option">
              <input type="radio" name="languageSetting" value="ru" ${currentLanguage === 'ru' ? 'checked' : ''}>
              <span>${t('settings.russian')}</span>
            </label>
          </div>
        </div>

        <div class="form-actions settings-actions">
          <button class="btn btn-danger" id="btnLogoutSettings">
            <i class="fa-solid fa-right-from-bracket"></i>
            ${logoutText}
          </button>
          <button class="btn btn-ghost" id="btnCloseSettingsAction">${t('actions.close')}</button>
        </div>
      </div>
    </div>
  `;
}

// ============================================================
// NEW: full-page task view
// ============================================================
function renderFullPageTaskView(issue) {
  const root = document.getElementById('taskPageView');
  if (!root) return;

  if (!issue) {
    root.innerHTML = `
      <div class="task-page-shell task-page-shell-empty">
        <div class="task-page-card task-page-empty-card">
          <div class="task-page-header-row">
            <a class="task-page-back" href="${escapeAttr(getBoardUrl())}">
              <i class="fa-solid fa-arrow-left"></i>
              ${t('misc.backToBoard')}
            </a>
          </div>
          <div class="empty-state">
            <i class="fa-solid fa-file-circle-xmark empty-state-icon"></i>
            <h3>${t('misc.taskNotFound')}</h3>
            <p>${t('misc.taskNotFoundDesc')}</p>
          </div>
        </div>
      </div>
    `;
    return;
  }

  const queue = AppData.getQueueById(issue.queueId);
  const reporter = AppData.getUserById(issue.reporterId);
  const currentUser = AppData.getCurrentUser();
  const users = AppData.getUsers();

  root.innerHTML = `
    <div class="task-page-shell">
      <div class="task-page-header-row">
        <a class="task-page-back" href="${escapeAttr(getBoardUrl())}">
          <i class="fa-solid fa-arrow-left"></i>
          ${t('misc.backToBoard')}
        </a>
      </div>

      <div class="task-page-card">
        <div class="task-page-title-row">
          <div>
            <div class="task-page-key">${escapeHtml(issue.key)}</div>
            <h1 class="task-page-title">${escapeHtml(issue.summary)}</h1>
          </div>
          <div class="task-page-badges">
            <span class="badge ${statusClass(issue.status)}">${translateStatus(issue.status)}</span>
            <span class="badge ${priorityClass(issue.priority)}">${translatePriority(issue.priority)}</span>
          </div>
        </div>

        <div class="task-page-grid">
          <div class="form-field task-page-span-full">
            <label class="form-label" for="taskPageSummary">${t('labels.summary')}</label>
            <input type="text" class="form-input issue-summary-input" id="taskPageSummary" value="${escapeAttr(issue.summary)}">
          </div>

          <div class="form-field task-page-span-full">
            <label class="form-label" for="taskPageDescription">${t('labels.description')}</label>
            <textarea class="form-textarea issue-description-input" id="taskPageDescription" rows="7">${escapeHtml(issue.description || '')}</textarea>
          </div>

          <div class="form-field">
            <label class="form-label" for="taskPageStatus">${t('labels.status')}</label>
            <select class="form-select" id="taskPageStatus">
              ${AppData.getStatusList().map(status => `<option value="${status}" ${issue.status === status ? 'selected' : ''}>${translateStatus(status)}</option>`).join('')}
            </select>
          </div>

          <div class="form-field">
            <label class="form-label" for="taskPagePriority">${t('labels.priority')}</label>
            <select class="form-select" id="taskPagePriority">
              ${AppData.getPriorityList().map(priority => `<option value="${priority}" ${issue.priority === priority ? 'selected' : ''}>${translatePriority(priority)}</option>`).join('')}
            </select>
          </div>

          <div class="form-field">
            <label class="form-label" for="taskPageType">${t('labels.type')}</label>
            <select class="form-select" id="taskPageType">
              ${AppData.getTypeList().map(type => `<option value="${type}" ${issue.type === type ? 'selected' : ''}>${translateType(type)}</option>`).join('')}
            </select>
          </div>

          <div class="form-field">
            <label class="form-label" for="taskPageAssignee">${t('labels.assignee')}</label>
            <select class="form-select" id="taskPageAssignee">
              <option value="">${t('fields.unassigned')}</option>
              ${users.map(user => `<option value="${user.id}" ${issue.assigneeId === user.id ? 'selected' : ''}>${escapeHtml(user.displayName)}</option>`).join('')}
            </select>
          </div>

          <div class="task-page-meta task-page-span-full">
            <div class="meta-inline-block">
              <span class="meta-label">${t('labels.queue')}</span>
              <span class="meta-inline-value">${queue ? escapeHtml(queue.name) : '—'}</span>
            </div>
            <div class="meta-inline-block">
              <span class="meta-label">${t('labels.reporter')}</span>
              <span class="meta-inline-value">${reporter ? escapeHtml(reporter.displayName) : '—'}</span>
            </div>
            <div class="meta-inline-block">
              <span class="meta-label">${t('labels.created')}</span>
              <span class="meta-inline-value">${formatDateFull(issue.createdAt)}</span>
            </div>
            <div class="meta-inline-block">
              <span class="meta-label">${t('labels.updated')}</span>
              <span class="meta-inline-value" id="taskPageUpdated">${formatDateFull(issue.updatedAt)}</span>
            </div>
          </div>
        </div>

        <div class="comments-section task-page-comments-section">
          <div class="comments-header">
            <h3>${t('labels.comments')}</h3>
            <span class="comments-count" id="taskPageCommentsCount">${issue.comments ? issue.comments.length : 0}</span>
          </div>

          <div class="comments-list" id="taskPageCommentsList">
            ${renderComments(issue)}
          </div>

          <div class="comment-input-wrap">
            ${renderAvatar(currentUser, 32)}
            <div class="comment-input-inner">
              <textarea class="comment-textarea" id="taskPageCommentInput" rows="3" placeholder="${escapeAttr(t('fields.writeComment'))}"></textarea>
              <div class="comment-actions">
                <button class="btn btn-primary btn-sm" id="taskPageAddComment">${t('actions.addComment')}</button>
                <button class="btn btn-ghost btn-sm" id="taskPageClearComment">${t('actions.cancel')}</button>
              </div>
            </div>
          </div>
        </div>

        <div class="task-page-actions">
          <button class="btn btn-danger" id="taskPageDelete">
            <i class="fa-solid fa-trash"></i>
            ${t('actions.delete')}
          </button>
          <div class="task-page-actions-right">
            <a class="btn btn-ghost" href="${escapeAttr(getBoardUrl())}">${t('misc.backToBoard')}</a>
            <button class="btn btn-primary" id="taskPageSave">
              <i class="fa-solid fa-floppy-disk"></i>
              ${t('actions.save')}
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}


// ============================================================
// NEW: admin panel
// ============================================================
function renderAdminPanelModal() {
  const modal = document.getElementById('adminPanelModal');
  if (!modal) return;

  const currentUser = AppData.getCurrentUser();
  const predefinedRoles = typeof getPredefinedRoles === 'function'
    ? getPredefinedRoles()
    : ['Analyst', 'Tester', 'Frontend Developer', 'Backend Developer', 'Fullstack Developer', 'DevOps Engineer', 'Project Manager', 'Designer', 'System Administrator', 'Employee'];
  const users = AppData.getUsers();

  modal.innerHTML = `
    <div class="modal-backdrop" id="adminPanelBackdrop"></div>
    <div class="modal-panel admin-panel-modal" role="dialog" aria-modal="true" aria-label="${escapeAttr(t('admin.title'))}">
      <div class="modal-header">
        <div class="modal-header-left">
          <i class="fa-solid fa-user-shield" style="color:var(--color-primary)"></i>
          <strong>${t('admin.title')}</strong>
        </div>
        <button class="btn btn-ghost btn-icon" id="btnCloseAdminPanel" title="${escapeAttr(t('actions.close'))}">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
      <div class="modal-body-create admin-panel-body">
        <div class="admin-panel-heading">
          <h3>${t('admin.users')}</h3>
          <span>${users.length}</span>
        </div>

        <div class="admin-table-wrap">
          <table class="admin-users-table">
            <thead>
              <tr>
                <th>${t('admin.user')}</th>
                <th>${authLabel('email', 'Email')}</th>
                <th>${t('admin.role')}</th>
                <th>${t('admin.actions')}</th>
              </tr>
            </thead>
            <tbody>
              ${users.map(user => {
                const currentRole = user.role || 'Employee';
                const canonicalRole = typeof getCanonicalRole === 'function' ? getCanonicalRole(currentRole) : currentRole;
                const isPredefined = predefinedRoles.includes(canonicalRole);
                const locked = user.id === currentUser?.id;
                return `
                  <tr data-user-id="${escapeAttr(user.id)}">
                    <td>
                      <div class="admin-user-cell">
                        ${renderAvatar(user, 32)}
                        <div>
                          <strong>${escapeHtml(user.displayName)}</strong>
                          ${user.isAdmin ? `<small>${roleLabel('Administrator')}</small>` : ''}
                        </div>
                      </div>
                    </td>
                    <td>${escapeHtml(user.email || '')}</td>
                    <td><span class="admin-role-current">${roleLabel(currentRole)}</span></td>
                    <td>
                      <div class="admin-actions-stack">
                        <button class="btn btn-ghost btn-sm admin-edit-name" data-user-id="${escapeAttr(user.id)}">
                          <i class="fa-solid fa-pen"></i>
                          ${t('admin.editName')}
                        </button>
                      </div>
                      ${locked ? `<span class="admin-self-note">${t('admin.currentAdmin')}</span>` : `
                        <div class="admin-role-editor">
                          <div class="admin-role-mode">
                            <label>
                              <input type="radio" name="roleMode_${escapeAttr(user.id)}" value="predefined" ${isPredefined ? 'checked' : ''}>
                              <span>${t('admin.predefinedRoles')}</span>
                            </label>
                            <label>
                              <input type="radio" name="roleMode_${escapeAttr(user.id)}" value="custom" ${!isPredefined ? 'checked' : ''}>
                              <span>${t('admin.customRole')}</span>
                            </label>
                          </div>
                          <div class="admin-role-inputs">
                            <select class="form-select admin-role-select" data-user-id="${escapeAttr(user.id)}" ${!isPredefined ? 'disabled' : ''}>
                              ${predefinedRoles.map(role => `<option value="${escapeAttr(role)}" ${canonicalRole === role ? 'selected' : ''}>${roleLabel(role)}</option>`).join('')}
                            </select>
                            <input class="form-input admin-custom-role-input"
                                   data-user-id="${escapeAttr(user.id)}"
                                   type="text"
                                   value="${!isPredefined ? escapeAttr(currentRole) : ''}"
                                   placeholder="${escapeAttr(t('admin.customRolePlaceholder'))}"
                                   ${isPredefined ? 'disabled' : ''}>
                            <button class="btn btn-ghost btn-sm admin-save-role" data-user-id="${escapeAttr(user.id)}">
                              <i class="fa-solid fa-floppy-disk"></i>
                              ${t('actions.save')}
                            </button>
                          </div>
                        </div>
                      `}
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

// ============================================================
// NEW ADMIN: edit display name
// ============================================================
function renderEditNameModal(user) {
  const modal = document.getElementById('editNameModal');
  if (!modal || !user) return;

  modal.innerHTML = `
    <div class="modal-backdrop" id="editNameBackdrop"></div>
    <div class="modal-panel modal-panel-small edit-name-modal" role="dialog" aria-modal="true" aria-label="${escapeAttr(t('admin.editName'))}">
      <div class="modal-header">
        <div class="modal-header-left">
          <i class="fa-solid fa-user-pen" style="color:var(--color-primary)"></i>
          <strong>${t('admin.editName')}</strong>
        </div>
        <button class="btn btn-ghost btn-icon" id="btnCloseEditName" title="${escapeAttr(t('actions.close'))}">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
      <div class="modal-body-create">
        <div class="create-form">
          <div class="settings-account">
            ${renderAvatar(user, 40)}
            <div class="settings-account-info">
              <strong>${escapeHtml(user.displayName)}</strong>
              <span>${escapeHtml(user.email || '')}</span>
            </div>
          </div>

          <div class="form-field">
            <label class="form-label" for="editDisplayNameInput">${t('admin.newDisplayName')}</label>
            <input type="text"
                   class="form-input"
                   id="editDisplayNameInput"
                   value="${escapeAttr(user.displayName)}"
                   maxlength="80">
          </div>

          <div class="form-actions">
            <button class="btn btn-primary" id="btnSaveDisplayName">
              <i class="fa-solid fa-floppy-disk"></i>
              ${t('actions.save')}
            </button>
            <button class="btn btn-ghost" id="btnCancelEditName">${t('actions.cancel')}</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

// ============================================================
// CREATE ISSUE MODAL
// ============================================================
function renderCreateIssueModal(defaultQueueId) {
  const modal = document.getElementById('createIssueModal');
  if (!modal) return;

  const queues = AppData.getQueues();
  const users = AppData.getUsers();

  modal.innerHTML = `
    <div class="modal-backdrop" id="createModalBackdrop"></div>
    <div class="modal-panel modal-panel-create" role="dialog" aria-modal="true" aria-label="${escapeAttr(t('createIssue.title'))}">
      <div class="modal-header">
        <div class="modal-header-left">
          <i class="fa-solid fa-circle-plus" style="color:var(--color-primary)"></i>
          <strong>${t('createIssue.title')}</strong>
        </div>
        <button class="btn btn-ghost btn-icon" id="btnCloseCreateModal" title="${escapeAttr(t('actions.close'))}">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
      <div class="modal-body-create">
        <div class="create-form">
          <div class="form-field">
            <label class="form-label" for="createQueue">${t('labels.queue')} <span class="required">*</span></label>
            <select class="form-select" id="createQueue" required>
              <option value="">${t('fields.selectQueue')}</option>
              ${queues.map(queue => `<option value="${queue.id}" ${queue.id === defaultQueueId ? 'selected' : ''}>${escapeHtml(queue.name)} (${escapeHtml(queue.key)})</option>`).join('')}
            </select>
          </div>

          <div class="form-field">
            <label class="form-label" for="createSummary">${t('labels.summary')} <span class="required">*</span></label>
            <input type="text" class="form-input" id="createSummary" placeholder="${escapeAttr(t('fields.issueSummaryPlaceholder'))}" maxlength="255">
          </div>

          <div class="form-field">
            <label class="form-label" for="createDescription">${t('labels.description')}</label>
            <textarea class="form-textarea" id="createDescription" placeholder="${escapeAttr(t('fields.issueDescriptionPlaceholder'))}" rows="4"></textarea>
          </div>

          <div class="form-row">
            <div class="form-field">
              <label class="form-label" for="createType">${t('labels.type')}</label>
              <select class="form-select" id="createType">
                ${AppData.getTypeList().map(type => `<option value="${type}">${translateType(type)}</option>`).join('')}
              </select>
            </div>
            <div class="form-field">
              <label class="form-label" for="createPriority">${t('labels.priority')}</label>
              <select class="form-select" id="createPriority">
                ${AppData.getPriorityList().map(priority => `<option value="${priority}" ${priority === 'Medium' ? 'selected' : ''}>${translatePriority(priority)}</option>`).join('')}
              </select>
            </div>
          </div>

          <div class="form-row">
            <div class="form-field">
              <label class="form-label" for="createAssignee">${t('labels.assignee')}</label>
              <select class="form-select" id="createAssignee">
                <option value="">${t('fields.unassigned')}</option>
                ${users.map(user => `<option value="${user.id}">${escapeHtml(user.displayName)}</option>`).join('')}
              </select>
            </div>
            <div class="form-field">
              <label class="form-label" for="createStatus">${t('labels.status')}</label>
              <select class="form-select" id="createStatus">
                ${AppData.getStatusList().map(status => `<option value="${status}" ${status === 'Open' ? 'selected' : ''}>${translateStatus(status)}</option>`).join('')}
              </select>
            </div>
          </div>

          <div class="form-field" id="newKeyPreview" style="display:none">
            <div class="key-preview">
              <i class="fa-solid fa-key"></i>
              ${t('misc.keyWillBe')} <strong id="keyPreviewText"></strong>
            </div>
          </div>

          <div class="form-actions">
            <button class="btn btn-primary" id="btnSubmitCreate">
              <i class="fa-solid fa-plus"></i>
              ${t('actions.createIssue')}
            </button>
            <button class="btn btn-ghost" id="btnCancelCreate">${t('actions.cancel')}</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

// ============================================================
// CREATE QUEUE MODAL
// ============================================================
function renderCreateQueueModal() {
  const modal = document.getElementById('createQueueModal');
  if (!modal) return;

  const colors = ['#4F8EF7', '#E06C75', '#98C379', '#E5C07B', '#C678DD', '#56B6C2', '#D19A66'];

  modal.innerHTML = `
    <div class="modal-backdrop" id="queueModalBackdrop"></div>
    <div class="modal-panel modal-panel-small" role="dialog" aria-modal="true" aria-label="${escapeAttr(t('createQueue.title'))}">
      <div class="modal-header">
        <div class="modal-header-left">
          <i class="fa-solid fa-folder-plus" style="color:var(--color-primary)"></i>
          <strong>${t('createQueue.title')}</strong>
        </div>
        <button class="btn btn-ghost btn-icon" id="btnCloseQueueModal" title="${escapeAttr(t('actions.close'))}">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
      <div class="modal-body-create">
        <div class="create-form">
          <div class="form-field">
            <label class="form-label" for="queueName">${t('labels.queueName')} <span class="required">*</span></label>
            <input type="text" class="form-input" id="queueName" placeholder="e.g. Mobile App" maxlength="60">
          </div>

          <div class="form-field">
            <label class="form-label" for="queueKey">${t('labels.queueKey')} <span class="required">*</span></label>
            <input type="text" class="form-input" id="queueKey" placeholder="e.g. MOB" maxlength="10" style="text-transform:uppercase">
            <small class="form-hint">${t('createQueue.keyHint')}</small>
          </div>

          <div class="form-field">
            <label class="form-label">${t('labels.color')}</label>
            <div class="color-picker" id="colorPicker">
              ${colors.map((color, index) => `
                <button class="color-swatch ${index === 0 ? 'selected' : ''}" data-color="${color}" style="background:${color}" title="${color}"></button>
              `).join('')}
            </div>
          </div>

          <div class="form-actions">
            <button class="btn btn-primary" id="btnSubmitQueue">
              <i class="fa-solid fa-plus"></i>
              ${t('actions.createQueue')}
            </button>
            <button class="btn btn-ghost" id="btnCancelQueue">${t('actions.cancel')}</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

// ============================================================
// ACTIVITY LOG
// ============================================================
function renderActivityLog() {
  const container = document.getElementById('issueBoardContainer');
  if (!container) return;

  const log = AppData.getActivityLog();

  container.innerHTML = `
    <div class="activity-log-panel">
      <div class="activity-log-title">
        <i class="fa-solid fa-clock-rotate-left"></i>
        ${t('misc.recentActivity')}
      </div>

      ${log.length === 0
        ? `
          <div class="empty-state">
            <i class="fa-solid fa-inbox empty-state-icon"></i>
            <p>${t('misc.noActivityYet')}</p>
          </div>
        `
        : `
          <div class="activity-list">
            ${log.map(entry => `
              <div class="activity-entry">
                <span class="activity-dot"></span>
                <div class="activity-content">
                  <span class="activity-msg">${escapeHtml(entry.msg)}</span>
                  <span class="activity-time">${formatDate(entry.time)}</span>
                </div>
              </div>
            `).join('')}
          </div>
        `}
    </div>
  `;
}

// ============================================================
// STATS SUMMARY
// ============================================================
function renderStatsSummary(issues) {
  const bar = document.getElementById('statsSummary');
  if (!bar) return;

  const counts = {
    Open: 0,
    'In Progress': 0,
    'Need Info': 0,
    Done: 0,
    Closed: 0,
  };

  issues.forEach(issue => {
    if (counts[issue.status] !== undefined) counts[issue.status] += 1;
  });

  bar.innerHTML = `
    <div class="stats-bar">
      ${Object.entries(counts).map(([status, count]) => `
        <div class="stat-item">
          <span class="badge ${statusClass(status)}">${translateStatus(status)}</span>
          <span class="stat-count">${count}</span>
        </div>
      `).join('')}
      <div class="stat-item stat-total">
        <span>${t('misc.total')}</span>
        <span class="stat-count">${issues.length}</span>
      </div>
    </div>
  `;
}