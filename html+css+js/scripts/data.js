// ============================================================
// data.js – Mock data & data access layer for Yandex Tracker Clone
// ============================================================

const DEFAULT_USERS = [
  // NEW: admin panel
  {
    id: 'admin1',
    email: 'admin@tracker.com',
    password: 'admin123', // demo only: real apps hash passwords server-side
    displayName: 'Admin',
    avatar: 'AD',
    initials: 'AD',
    avatarColor: '#8B5CF6',
    role: 'Administrator',
    isAdmin: true,
    provider: 'local',
  },
  {
    id: 'u1',
    email: 'alice@example.com',
    password: 'pass123', // demo only: real apps hash passwords server-side
    displayName: 'Alice Johnson',
    avatar: 'AJ',
    initials: 'AJ',
    avatarColor: '#4F8EF7',
    role: 'Employee',
    isAdmin: false,
    provider: 'local',
  },
  {
    id: 'u2',
    email: 'bob@example.com',
    password: 'pass456',
    displayName: 'Bob Smith',
    avatar: 'BS',
    initials: 'BS',
    avatarColor: '#E06C75',
    role: 'Employee',
    isAdmin: false,
    provider: 'local',
  },
  {
    id: 'u3',
    email: 'carol@example.com',
    password: 'carol123',
    displayName: 'Carol White',
    avatar: 'CW',
    initials: 'CW',
    avatarColor: '#98C379',
    role: 'Employee',
    isAdmin: false,
    provider: 'local',
  },
  {
    id: 'u4',
    email: 'david@example.com',
    password: 'david123',
    displayName: 'David Lee',
    avatar: 'DL',
    initials: 'DL',
    avatarColor: '#E5C07B',
    role: 'Employee',
    isAdmin: false,
    provider: 'local',
  },
  {
    id: 'u5',
    email: 'eva@example.com',
    password: 'eva123',
    displayName: 'Eva Martinez',
    avatar: 'EM',
    initials: 'EM',
    avatarColor: '#C678DD',
    role: 'Employee',
    isAdmin: false,
    provider: 'local',
  },
];

// Public alias for the demo user model; AppData persists this list to localStorage.
let users = DEFAULT_USERS;

const USER_COLOR_PALETTE = ['#4F8EF7', '#E06C75', '#98C379', '#E5C07B', '#C678DD', '#56B6C2', '#D19A66', '#8B5CF6'];

// NEW: user roles
const DEFAULT_USER_ROLE = 'Employee';
const DEFAULT_ADMIN_ROLE = 'Administrator';
const ROLE_ALIASES = {
  'Сотрудник': 'Employee',
  'Администратор': 'Administrator',
  'Аналитик': 'Analyst',
  'Тестировщик': 'Tester',
  'Frontend-разработчик': 'Frontend Developer',
  'Backend-разработчик': 'Backend Developer',
  'Fullstack-разработчик': 'Fullstack Developer',
  'DevOps-инженер': 'DevOps Engineer',
  'Дизайнер': 'Designer',
  'Системный администратор': 'System Administrator',
};

function normalizeRole(role, isAdmin = false) {
  const fallback = isAdmin ? DEFAULT_ADMIN_ROLE : DEFAULT_USER_ROLE;
  const value = String(role || fallback).trim() || fallback;
  return ROLE_ALIASES[value] || value;
}

const DEFAULT_QUEUES = [
  { id: 'q1', key: 'DEV',    name: 'Development',       color: '#4F8EF7', counter: 6 },
  { id: 'q2', key: 'DESIGN', name: 'Design',            color: '#C678DD', counter: 3 },
  { id: 'q3', key: 'QA',     name: 'Quality Assurance', color: '#98C379', counter: 3 },
];

const STATUS_LIST   = ['Open', 'In Progress', 'Need Info', 'Done', 'Closed'];
const PRIORITY_LIST = ['High', 'Medium', 'Low'];
const TYPE_LIST     = ['Task', 'Bug', 'Story', 'Epic'];

const STATUS_TRANSITIONS = {
  'Open':        ['In Progress', 'Need Info'],
  'In Progress': ['Done', 'Need Info'],
  'Need Info':   ['Open', 'In Progress'],
  'Done':        ['Closed', 'Open'],
  'Closed':      ['Open'],
};

const now = () => new Date().toISOString();
const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString();

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function getInitials(displayName) {
  const parts = String(displayName || 'User')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!parts.length) return 'U';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function normalizeUser(user = {}, index = 0) {
  const defaults = DEFAULT_USERS.find(defaultUser => defaultUser.id === user.id) || {};
  const displayName = user.displayName || defaults.displayName || (user.email ? String(user.email).split('@')[0] : 'Demo User');
  const initials = user.initials || user.avatar || defaults.initials || defaults.avatar || getInitials(displayName);
  const safeIdSeed = String(user.id || displayName || 'user').toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.|\.$/g, '') || 'user';

  return {
    ...defaults,
    ...user,
    id: user.id || defaults.id || `u${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
    email: normalizeEmail(user.email || defaults.email || `${safeIdSeed}@demo.com`),
    password: user.password ?? defaults.password ?? 'pass123',
    displayName,
    avatar: user.avatar || initials,
    initials,
    avatarColor: user.avatarColor || defaults.avatarColor || USER_COLOR_PALETTE[index % USER_COLOR_PALETTE.length],
    // NEW: user roles
    role: normalizeRole(user.role || defaults.role, Boolean(user.isAdmin ?? defaults.isAdmin)),
    isAdmin: Boolean(user.isAdmin ?? defaults.isAdmin ?? false),
    provider: user.provider || defaults.provider || 'local',
  };
}

// NEW: status timer
function normalizeIssue(issue = {}) {
  const createdAt = issue.createdAt || now();
  return {
    ...issue,
    createdAt,
    updatedAt: issue.updatedAt || createdAt,
    statusChangedAt: issue.statusChangedAt || createdAt || now(),
    comments: Array.isArray(issue.comments) ? issue.comments : [],
  };
}

const DEFAULT_ISSUES = [
  {
    id: 'i1', key: 'DEV-1', queueId: 'q1',
    summary: 'Set up CI/CD pipeline',
    description: 'Configure GitHub Actions for automated build and deploy.\n\nSteps:\n1. Create workflow YAML\n2. Add secrets\n3. Test deployment',
    status: 'Done', priority: 'High', type: 'Task',
    assigneeId: 'u1', reporterId: 'u2',
    createdAt: daysAgo(10), updatedAt: daysAgo(2),
    statusChangedAt: daysAgo(2),
    comments: [
      { id: 'c1', authorId: 'u2', text: 'Pipeline is ready for review.', createdAt: daysAgo(3) },
      { id: 'c2', authorId: 'u1', text: 'Reviewed and approved. Merging now.', createdAt: daysAgo(2) },
    ],
  },
  {
    id: 'i2', key: 'DEV-2', queueId: 'q1',
    summary: 'Fix login page redirect bug',
    description: 'After login, users are redirected to /home instead of their original destination. Need to preserve the `redirect` query param.',
    status: 'In Progress', priority: 'High', type: 'Bug',
    assigneeId: 'u2', reporterId: 'u1',
    createdAt: daysAgo(7), updatedAt: daysAgo(1),
    statusChangedAt: daysAgo(1),
    comments: [
      { id: 'c3', authorId: 'u1', text: 'Can reproduce consistently. Looking into AuthGuard.', createdAt: daysAgo(1) },
    ],
  },
  {
    id: 'i3', key: 'DEV-3', queueId: 'q1',
    summary: 'Implement dark mode toggle',
    description: 'Add a system-preference-aware dark mode. Store preference in localStorage. Apply CSS variables for theming.',
    status: 'Open', priority: 'Medium', type: 'Story',
    assigneeId: 'u3', reporterId: 'u1',
    createdAt: daysAgo(5), updatedAt: daysAgo(5),
    statusChangedAt: daysAgo(5),
    comments: [],
  },
  {
    id: 'i4', key: 'DEV-4', queueId: 'q1',
    summary: 'Database migration for v2 schema',
    description: 'Migrate users table to new schema. Add `preferences` JSON column and backfill defaults.',
    status: 'Need Info', priority: 'High', type: 'Task',
    assigneeId: 'u4', reporterId: 'u2',
    createdAt: daysAgo(8), updatedAt: daysAgo(4),
    statusChangedAt: daysAgo(4),
    comments: [
      { id: 'c4', authorId: 'u2', text: 'What is the rollback plan if migration fails?', createdAt: daysAgo(4) },
    ],
  },
  {
    id: 'i5', key: 'DEV-5', queueId: 'q1',
    summary: 'Add pagination to issues API',
    description: 'API currently returns all issues. Add cursor-based pagination with `limit` and `cursor` params.',
    status: 'Open', priority: 'Medium', type: 'Task',
    assigneeId: 'u1', reporterId: 'u3',
    createdAt: daysAgo(3), updatedAt: daysAgo(3),
    statusChangedAt: daysAgo(3),
    comments: [],
  },
  {
    id: 'i6', key: 'DEV-6', queueId: 'q1',
    summary: 'Security audit – dependency vulnerabilities',
    description: 'Run `npm audit` and resolve all high/critical vulnerabilities in package.json.',
    status: 'Closed', priority: 'High', type: 'Task',
    assigneeId: 'u5', reporterId: 'u1',
    createdAt: daysAgo(15), updatedAt: daysAgo(6),
    statusChangedAt: daysAgo(6),
    comments: [
      { id: 'c5', authorId: 'u5', text: 'All 3 critical CVEs patched and verified.', createdAt: daysAgo(6) },
    ],
  },
  {
    id: 'i7', key: 'DESIGN-1', queueId: 'q2',
    summary: 'Redesign dashboard home screen',
    description: 'New Figma mockups need to be implemented. Focus on widget layout and data visualization.',
    status: 'In Progress', priority: 'High', type: 'Story',
    assigneeId: 'u3', reporterId: 'u1',
    createdAt: daysAgo(6), updatedAt: daysAgo(1),
    statusChangedAt: daysAgo(1),
    comments: [
      { id: 'c6', authorId: 'u1', text: 'Figma link shared in Slack.', createdAt: daysAgo(5) },
      { id: 'c7', authorId: 'u3', text: 'Working on responsive breakpoints.', createdAt: daysAgo(1) },
    ],
  },
  {
    id: 'i8', key: 'DESIGN-2', queueId: 'q2',
    summary: 'Create icon set for mobile app',
    description: 'Design 40+ icons in 24px and 48px variants. Export as SVG and PNG@2x.',
    status: 'Open', priority: 'Medium', type: 'Task',
    assigneeId: 'u3', reporterId: 'u4',
    createdAt: daysAgo(4), updatedAt: daysAgo(4),
    statusChangedAt: daysAgo(4),
    comments: [],
  },
  {
    id: 'i9', key: 'DESIGN-3', queueId: 'q2',
    summary: 'Update color palette for accessibility (WCAG 2.1 AA)',
    description: 'Current primary blue fails contrast on white backgrounds. Need to update to #2B6CB0 or similar.',
    status: 'Need Info', priority: 'Medium', type: 'Bug',
    assigneeId: 'u5', reporterId: 'u3',
    createdAt: daysAgo(9), updatedAt: daysAgo(3),
    statusChangedAt: daysAgo(3),
    comments: [
      { id: 'c8', authorId: 'u3', text: 'Which backgrounds are affected – all white or just specific components?', createdAt: daysAgo(3) },
    ],
  },
  {
    id: 'i10', key: 'QA-1', queueId: 'q3',
    summary: 'Write E2E tests for checkout flow',
    description: 'Use Playwright to cover: add to cart → review → payment → confirmation. Mock payment API.',
    status: 'In Progress', priority: 'High', type: 'Task',
    assigneeId: 'u4', reporterId: 'u2',
    createdAt: daysAgo(5), updatedAt: daysAgo(0),
    statusChangedAt: daysAgo(0),
    comments: [
      { id: 'c9', authorId: 'u4', text: 'Cart and review steps done. Working on payment mock.', createdAt: daysAgo(0) },
    ],
  },
  {
    id: 'i11', key: 'QA-2', queueId: 'q3',
    summary: 'Performance regression: search page 3s load time',
    description: 'After the v2.3 release, search page load time increased from ~400ms to ~3000ms on prod. Profiling shows N+1 query issue.',
    status: 'Open', priority: 'High', type: 'Bug',
    assigneeId: 'u2', reporterId: 'u4',
    createdAt: daysAgo(2), updatedAt: daysAgo(2),
    statusChangedAt: daysAgo(2),
    comments: [],
  },
  {
    id: 'i12', key: 'QA-3', queueId: 'q3',
    summary: 'Test matrix for browser compatibility',
    description: 'Test on Chrome 120+, Firefox 121+, Safari 17+, Edge 120+. Mobile: iOS Safari, Android Chrome.',
    status: 'Open', priority: 'Low', type: 'Task',
    assigneeId: 'u5', reporterId: 'u1',
    createdAt: daysAgo(1), updatedAt: daysAgo(1),
    statusChangedAt: daysAgo(1),
    comments: [],
  },
];

const AppData = {
  _users: null,
  _queues: null,
  _issues: null,
  _currentUserId: null,
  _activityLog: [],
  _theme: 'light',

  init() {
    const saved = this._load();
    const loadedUsers = Array.isArray(saved.users) && saved.users.length
      ? saved.users
      : JSON.parse(JSON.stringify(DEFAULT_USERS));

    // NEW: user roles / admin panel migration
    this._users = loadedUsers.map((user, index) => normalizeUser(user, index));
    const adminDefault = normalizeUser(DEFAULT_USERS[0], 0);
    const existingAdmin = this._users.find(user => user.id === adminDefault.id || normalizeEmail(user.email) === adminDefault.email);
    if (existingAdmin) {
      existingAdmin.role = DEFAULT_ADMIN_ROLE;
      existingAdmin.isAdmin = true;
      existingAdmin.password = existingAdmin.password || adminDefault.password;
      existingAdmin.provider = existingAdmin.provider || 'local';
    } else {
      this._users.unshift(adminDefault);
    }
    users = this._users;
    this._queues = saved.queues || JSON.parse(JSON.stringify(DEFAULT_QUEUES));
    // NEW: status timer migration
    this._issues = (saved.issues || JSON.parse(JSON.stringify(DEFAULT_ISSUES))).map(normalizeIssue);
    this._currentUserId = saved.currentUserId && this._users.some(user => user.id === saved.currentUserId)
      ? saved.currentUserId
      : null;
    this._activityLog = saved.activityLog || [];
    this._theme = saved.theme || localStorage.getItem('yt_clone_theme') || 'light';
    this._save();
  },

  _save() {
    localStorage.setItem('yt_clone', JSON.stringify({
      users: this._users,
      queues: this._queues,
      issues: this._issues,
      currentUserId: this._currentUserId,
      activityLog: this._activityLog,
      theme: this._theme,
    }));
    localStorage.setItem('yt_clone_theme', this._theme);
  },

  _load() {
    try {
      return JSON.parse(localStorage.getItem('yt_clone') || '{}');
    } catch {
      return {};
    }
  },

  getUsers() { return this._users; },
  getUserById(id) { return this._users.find(u => u.id === id) || null; },
  getUserByEmail(email) {
    const normalizedEmail = normalizeEmail(email);
    return this._users.find(u => normalizeEmail(u.email) === normalizedEmail) || null;
  },
  getCurrentUser() { return this.getUserById(this._currentUserId); },
  setCurrentUser(id) {
    this._currentUserId = id || null;
    this._save();
  },
  createUser({ displayName, email, password, provider = 'local', avatarColor, role = DEFAULT_USER_ROLE, isAdmin = false }) {
    const normalizedEmail = normalizeEmail(email);
    if (this.getUserByEmail(normalizedEmail)) {
      throw new Error('Email already registered');
    }

    const name = String(displayName || normalizedEmail.split('@')[0] || 'Demo User').trim();
    const initials = getInitials(name);
    const user = normalizeUser({
      id: `u${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
      email: normalizedEmail,
      password: password || '',
      displayName: name,
      avatar: initials,
      initials,
      avatarColor: avatarColor || USER_COLOR_PALETTE[this._users.length % USER_COLOR_PALETTE.length],
      // NEW: user roles
      role: normalizeRole(role, isAdmin),
      isAdmin: Boolean(isAdmin),
      provider,
    }, this._users.length);

    this._users.push(user);
    this._save();
    return user;
  },
  createOrUpdateSocialUser({ provider, email, displayName, avatarColor }) {
    const normalizedEmail = normalizeEmail(email);
    const existing = this.getUserByEmail(normalizedEmail);

    if (existing) {
      existing.provider = provider;
      existing.displayName = existing.displayName || displayName;
      existing.initials = existing.initials || existing.avatar || getInitials(existing.displayName);
      existing.avatar = existing.avatar || existing.initials;
      existing.avatarColor = existing.avatarColor || avatarColor || USER_COLOR_PALETTE[this._users.indexOf(existing) % USER_COLOR_PALETTE.length];
      this._save();
      return existing;
    }

    return this.createUser({
      displayName,
      email: normalizedEmail,
      password: '',
      provider,
      avatarColor,
    });
  },

  // NEW: admin panel
  updateUserRole(userId, role) {
    const user = this.getUserById(userId);
    if (!user) return null;
    user.role = normalizeRole(role, Boolean(user.isAdmin));
    this._save();
    return user;
  },

  // NEW ADMIN: edit display name
  updateUserDisplayName(userId, displayName) {
    const user = this.getUserById(userId);
    const name = String(displayName || '').trim();
    if (!user || !name) return null;

    const previousInitials = user.initials || user.avatar;
    user.displayName = name;
    user.initials = getInitials(name);
    if (!user.avatar || user.avatar === previousInitials) {
      user.avatar = user.initials;
    }

    this._save();
    return user;
  },

  getQueues() { return this._queues; },
  getQueueById(id) { return this._queues.find(q => q.id === id) || null; },
  getQueueByKey(key) { return this._queues.find(q => q.key === key) || null; },

  createQueue({ name, key, color }) {
    const id = 'q' + Date.now();
    const queue = { id, key: key.toUpperCase(), name, color: color || '#4F8EF7', counter: 0 };
    this._queues.push(queue);
    this._logActivity(`Queue "${name}" (${key.toUpperCase()}) created`);
    this._save();
    return queue;
  },

  // NEW ADMIN: delete queue
  deleteQueue(queueId) {
    const queue = this.getQueueById(queueId);
    if (!queue) return null;

    const issueCount = this._issues.filter(issue => issue.queueId === queueId).length;
    this._queues = this._queues.filter(item => item.id !== queueId);
    this._issues = this._issues.filter(issue => issue.queueId !== queueId);
    this._logActivity(`Queue "${queue.name}" (${queue.key}) deleted with ${issueCount} issue(s)`);
    this._save();

    return { queue, issueCount };
  },

  getIssues() { return this._issues; },
  getIssueById(id) { return this._issues.find(i => i.id === id) || null; },
  getIssuesByQueue(qid) { return this._issues.filter(i => i.queueId === qid); },

  createIssue({ queueId, summary, description, type, priority, assigneeId, status }) {
    const queue = this.getQueueById(queueId);
    if (!queue) throw new Error('Queue not found');

    queue.counter += 1;
    const key = `${queue.key}-${queue.counter}`;
    const id = 'i' + Date.now();

    const issue = {
      id,
      key,
      queueId,
      summary: summary || 'Untitled Issue',
      description: description || '',
      status: status || 'Open',
      priority: priority || 'Medium',
      type: type || 'Task',
      assigneeId: assigneeId || null,
      reporterId: this.getCurrentUser()?.id || this._currentUserId || null,
      createdAt: now(),
      updatedAt: now(),
      // NEW: status timer
      statusChangedAt: now(),
      comments: [],
    };

    this._issues.push(issue);
    this._logActivity(`Issue "${key}: ${issue.summary}" created`);
    this._save();
    return issue;
  },

  updateIssue(id, changes) {
    const issue = this.getIssueById(id);
    if (!issue) return null;

    const oldStatus = issue.status;
    const nextChanges = { ...changes };
    // NEW: status timer
    if (Object.prototype.hasOwnProperty.call(nextChanges, 'status') && nextChanges.status && nextChanges.status !== oldStatus) {
      nextChanges.statusChangedAt = now();
    }
    Object.assign(issue, nextChanges, { updatedAt: now() });

    if (changes.status && changes.status !== oldStatus) {
      this._logActivity(`"${issue.key}" status changed: ${oldStatus} → ${changes.status}`);
    }

    this._save();
    return issue;
  },

  deleteIssue(id) {
    const index = this._issues.findIndex(i => i.id === id);
    if (index === -1) return false;

    const issue = this._issues[index];
    this._issues.splice(index, 1);
    this._logActivity(`Issue "${issue.key}" deleted`);
    this._save();
    return true;
  },

  addComment(issueId, text) {
    const issue = this.getIssueById(issueId);
    if (!issue) return null;

    const currentUser = this.getCurrentUser();
    const comment = {
      id: 'c' + Date.now(),
      authorId: currentUser?.id || this._currentUserId || null,
      author: currentUser?.displayName || 'Unknown',
      text,
      createdAt: now(),
    };

    issue.comments.push(comment);
    issue.updatedAt = now();
    this._logActivity(`Comment added on "${issue.key}"`);
    this._save();
    return comment;
  },

  deleteComment(issueId, commentId) {
    const issue = this.getIssueById(issueId);
    if (!issue) return false;

    const index = issue.comments.findIndex(c => c.id === commentId);
    if (index === -1) return false;

    issue.comments.splice(index, 1);
    issue.updatedAt = now();
    this._save();
    return true;
  },

  filterIssues({ queueId, status, priority, assigneeId, search, myTasks } = {}) {
    let list = [...this._issues];

    if (myTasks) list = list.filter(i => i.assigneeId === this.getCurrentUser()?.id);
    if (queueId) list = list.filter(i => i.queueId === queueId);
    if (status && status.length) list = list.filter(i => status.includes(i.status));
    if (priority && priority.length) list = list.filter(i => priority.includes(i.priority));
    if (assigneeId) list = list.filter(i => i.assigneeId === assigneeId);
    if (search) {
      const term = search.toLowerCase();
      list = list.filter(i =>
        i.summary.toLowerCase().includes(term) ||
        i.description.toLowerCase().includes(term)
      );
    }

    return list.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  },

  _logActivity(msg) {
    this._activityLog.unshift({ msg, time: now() });
    if (this._activityLog.length > 20) this._activityLog.length = 20;
  },
  getActivityLog() { return this._activityLog; },

  getAvailableTransitions(currentStatus) {
    return STATUS_TRANSITIONS[currentStatus] || [];
  },

  getStatusList() { return STATUS_LIST; },
  getPriorityList() { return PRIORITY_LIST; },
  getTypeList() { return TYPE_LIST; },

  getTheme() {
    return this._theme || 'light';
  },
  setTheme(theme) {
    this._theme = theme === 'dark' ? 'dark' : 'light';
    this._save();
  },
};