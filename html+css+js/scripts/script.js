// ============================================================
// script.js – Application Logic, Event Handling, State Management
// ============================================================

// NEW: i18n translation
const translations = {
  en: {
    nav: {
      navigation: 'Navigation',
      myTasks: 'My Tasks',
      allIssues: 'All Issues',
      queues: 'Queues',
      activityLog: 'Activity Log',
      adminPanel: 'Admin Panel',
    },
    actions: {
      createIssue: 'Create Issue',
      createQueue: 'Create Queue',
      settings: 'Settings',
      save: 'Save',
      delete: 'Delete',
      cancel: 'Cancel',
      close: 'Close',
      addComment: 'Add Comment',
      resetFilters: 'Reset Filters',
      confirm: 'Confirm',
      editRole: 'Edit Role',
    },
    labels: {
      summary: 'Summary',
      description: 'Description',
      status: 'Status',
      priority: 'Priority',
      type: 'Type',
      assignee: 'Assignee',
      comments: 'Comments',
      created: 'Created',
      updated: 'Updated',
      reporter: 'Reporter',
      queue: 'Queue',
      queueName: 'Queue Name',
      queueKey: 'Queue Key',
      color: 'Color',
      theme: 'Theme',
      language: 'Language',
      timer: 'Timer',
    },
    filters: {
      status: 'Status',
      priority: 'Priority',
      assignee: 'Assignee',
      filterByStatus: 'Filter by Status',
      filterByPriority: 'Filter by Priority',
      filterByAssignee: 'Filter by Assignee',
    },
    fields: {
      searchPlaceholder: 'Search by summary or description...',
      selectQueue: 'Select queue…',
      selectAssignee: 'Select assignee…',
      anyAssignee: 'Any assignee',
      unassigned: 'Unassigned',
      writeComment: 'Write a comment…',
      issueSummaryPlaceholder: 'Enter issue summary…',
      issueDescriptionPlaceholder: 'Describe the issue in detail…',
    },
    settings: {
      title: 'Settings',
      light: 'Light',
      dark: 'Dark',
      english: 'English',
      russian: 'Русский',
    },
    misc: {
      total: 'Total',
      noIssues: 'No issues',
      noCommentsYet: 'No comments yet.',
      recentActivity: 'Recent Activity',
      noActivityYet: 'No activity yet.',
      backToBoard: 'Back to board',
      taskNotFound: 'Task not found',
      taskNotFoundDesc: 'The requested task does not exist or was deleted.',
      keyWillBe: 'Key will be:',
      openFullPage: 'Open full page',
      today: 'Today',
      yesterday: 'Yesterday',
      daysAgo: '{count} days ago',
      noQueuesCreateOne: 'No queues. Create one.',
    },
    admin: {
      title: 'Admin Panel',
      users: 'Users',
      user: 'User',
      role: 'Role',
      actions: 'Actions',
      editRole: 'Edit Role',
      predefinedRoles: 'Predefined roles',
      customRole: 'Custom role',
      customRolePlaceholder: 'Enter custom role name...',
      currentAdmin: 'Current admin',
      deleteQueue: 'Delete Queue',
      deleteQueueConfirm: 'Delete queue "{name}"? {count} task(s) will be permanently deleted. This action cannot be undone.',
      editName: 'Edit Name',
      newDisplayName: 'New display name',
    },
    roles: {
      Analyst: 'Analyst',
      Tester: 'Tester',
      'Frontend Developer': 'Frontend Developer',
      'Backend Developer': 'Backend Developer',
      'Fullstack Developer': 'Fullstack Developer',
      'DevOps Engineer': 'DevOps Engineer',
      'Project Manager': 'Project Manager',
      Designer: 'Designer',
      'System Administrator': 'System Administrator',
      Employee: 'Employee',
      Administrator: 'Administrator',
    },
    createIssue: {
      title: 'Create Issue',
    },
    createQueue: {
      title: 'Create Queue',
      keyHint: 'Short unique identifier (letters only, e.g. DEV, QA, MOB)',
    },
    tooltips: {
      toggleSidebar: 'Toggle sidebar',
      toggleMenu: 'Toggle menu',
    },
    confirm: {
      deleteTitle: 'Delete Issue',
      deleteMessage: 'Are you sure you want to delete this task?',
      deleteWithName: 'Are you sure you want to delete "{key}: {summary}"? This action cannot be undone.',
    },
    errors: {
      summaryCannotBeEmpty: 'Summary cannot be empty',
      queueRequired: 'Please select a queue',
      summaryRequired: 'Summary is required',
      queueNameRequired: 'Queue name is required',
      queueKeyLettersOnly: 'Queue key must be letters only',
      queueKeyExists: 'Queue key "{key}" already exists',
      customRoleRequired: 'Please enter custom role name',
      displayNameRequired: 'Please enter display name',
    },
    toasts: {
      switchedTo: 'Switched to {name}',
      commentAdded: 'Comment added',
      commentDeleted: 'Comment deleted',
      issueSaved: 'Issue saved',
      issueDeleted: 'Issue {key} deleted',
      issueCreated: 'Issue {key} created',
      queueCreated: 'Queue "{name}" created',
      statusChanged: 'Status → {status}',
      roleUpdated: 'Role updated for {name}',
      queueDeleted: 'Queue {key} deleted',
      displayNameUpdated: 'Display name updated',
    },
    statuses: {
      Open: 'Open',
      'In Progress': 'In Progress',
      'Need Info': 'Need Info',
      Done: 'Done',
      Closed: 'Closed',
    },
    priorities: {
      High: 'High',
      Medium: 'Medium',
      Low: 'Low',
    },
    types: {
      Bug: 'Bug',
      Task: 'Task',
      Story: 'Story',
      Epic: 'Epic',
    },
  },
  ru: {
    nav: {
      navigation: 'Навигация',
      myTasks: 'Мои задачи',
      allIssues: 'Все задачи',
      queues: 'Очереди',
      activityLog: 'Журнал активности',
      adminPanel: 'Панель администратора',
    },
    actions: {
      createIssue: 'Создать задачу',
      createQueue: 'Создать очередь',
      settings: 'Настройки',
      save: 'Сохранить',
      delete: 'Удалить',
      cancel: 'Отмена',
      close: 'Закрыть',
      addComment: 'Добавить комментарий',
      resetFilters: 'Сбросить фильтры',
      confirm: 'Подтвердить',
      editRole: 'Изменить роль',
    },
    labels: {
      summary: 'Краткое описание',
      description: 'Описание',
      status: 'Статус',
      priority: 'Приоритет',
      type: 'Тип',
      assignee: 'Исполнитель',
      comments: 'Комментарии',
      created: 'Создана',
      updated: 'Обновлена',
      reporter: 'Автор',
      queue: 'Очередь',
      queueName: 'Название очереди',
      queueKey: 'Ключ очереди',
      color: 'Цвет',
      theme: 'Тема',
      language: 'Язык',
      timer: 'Время',
    },
    filters: {
      status: 'Статус',
      priority: 'Приоритет',
      assignee: 'Исполнитель',
      filterByStatus: 'Фильтр по статусу',
      filterByPriority: 'Фильтр по приоритету',
      filterByAssignee: 'Фильтр по исполнителю',
    },
    fields: {
      searchPlaceholder: 'Поиск по названию или описанию...',
      selectQueue: 'Выберите очередь…',
      selectAssignee: 'Выберите исполнителя…',
      anyAssignee: 'Любой исполнитель',
      unassigned: 'Не назначен',
      writeComment: 'Напишите комментарий…',
      issueSummaryPlaceholder: 'Введите краткое описание…',
      issueDescriptionPlaceholder: 'Опишите задачу подробнее…',
    },
    settings: {
      title: 'Настройки',
      light: 'Светлая',
      dark: 'Тёмная',
      english: 'Английский',
      russian: 'Русский',
    },
    misc: {
      total: 'Всего',
      noIssues: 'Нет задач',
      noCommentsYet: 'Комментариев пока нет.',
      recentActivity: 'Последняя активность',
      noActivityYet: 'Активности пока нет.',
      backToBoard: 'Назад к доске',
      taskNotFound: 'Задача не найдена',
      taskNotFoundDesc: 'Запрошенная задача не существует или была удалена.',
      keyWillBe: 'Ключ будет:',
      openFullPage: 'Открыть полную страницу',
      today: 'Сегодня',
      yesterday: 'Вчера',
      daysAgo: '{count} дн. назад',
      noQueuesCreateOne: 'Нет очередей. Создайте очередь.',
    },
    admin: {
      title: 'Панель администратора',
      users: 'Пользователи',
      user: 'Пользователь',
      role: 'Роль',
      actions: 'Действия',
      editRole: 'Изменить роль',
      predefinedRoles: 'Готовые роли',
      customRole: 'Своя роль',
      customRolePlaceholder: 'Введите название роли...',
      currentAdmin: 'Текущий администратор',
      deleteQueue: 'Удалить очередь',
      deleteQueueConfirm: 'Удалить очередь "{name}"? {count} задач(а/и) будут удалены безвозвратно. Это действие нельзя отменить.',
      editName: 'Изменить имя',
      newDisplayName: 'Новое отображаемое имя',
    },
    roles: {
      Analyst: 'Аналитик',
      Tester: 'Тестировщик',
      'Frontend Developer': 'Frontend-разработчик',
      'Backend Developer': 'Backend-разработчик',
      'Fullstack Developer': 'Fullstack-разработчик',
      'DevOps Engineer': 'DevOps-инженер',
      'Project Manager': 'Project Manager',
      Designer: 'Дизайнер',
      'System Administrator': 'Системный администратор',
      Employee: 'Сотрудник',
      Administrator: 'Администратор',
    },
    createIssue: {
      title: 'Создать задачу',
    },
    createQueue: {
      title: 'Создать очередь',
      keyHint: 'Короткий уникальный идентификатор (только буквы, например DEV, QA, MOB)',
    },
    tooltips: {
      toggleSidebar: 'Свернуть боковую панель',
      toggleMenu: 'Открыть меню',
    },
    confirm: {
      deleteTitle: 'Удалить задачу',
      deleteMessage: 'Вы уверены, что хотите удалить эту задачу?',
      deleteWithName: 'Вы уверены, что хотите удалить "{key}: {summary}"? Это действие нельзя отменить.',
    },
    errors: {
      summaryCannotBeEmpty: 'Краткое описание не может быть пустым',
      queueRequired: 'Пожалуйста, выберите очередь',
      summaryRequired: 'Краткое описание обязательно',
      queueNameRequired: 'Название очереди обязательно',
      queueKeyLettersOnly: 'Ключ очереди должен содержать только буквы',
      queueKeyExists: 'Ключ очереди "{key}" уже существует',
      customRoleRequired: 'Введите название своей роли',
      displayNameRequired: 'Введите отображаемое имя',
    },
    toasts: {
      switchedTo: 'Переключено на пользователя {name}',
      commentAdded: 'Комментарий добавлен',
      commentDeleted: 'Комментарий удалён',
      issueSaved: 'Задача сохранена',
      issueDeleted: 'Задача {key} удалена',
      issueCreated: 'Задача {key} создана',
      queueCreated: 'Очередь "{name}" создана',
      statusChanged: 'Статус → {status}',
      roleUpdated: 'Роль пользователя {name} обновлена',
      queueDeleted: 'Очередь {key} удалена',
      displayNameUpdated: 'Имя обновлено',
    },
    statuses: {
      Open: 'Открыта',
      'In Progress': 'В работе',
      'Need Info': 'Требуется информация',
      Done: 'Готово',
      Closed: 'Закрыта',
    },
    priorities: {
      High: 'Высокий',
      Medium: 'Средний',
      Low: 'Низкий',
    },
    types: {
      Bug: 'Ошибка',
      Task: 'Задача',
      Story: 'История',
      Epic: 'Эпик',
    },
  },
};


const authTranslations = {
  en: {
    title: 'Yandex Tracker',
    subtitle: 'Sign in to manage queues, tasks, and comments.',
    signIn: 'Sign In',
    register: 'Register',
    createAccount: 'Create account',
    backToLogin: 'Back to Login',
    email: 'Email',
    emailOrUsername: 'Email or display name',
    password: 'Password',
    confirmPassword: 'Confirm Password',
    displayName: 'Display Name',
    orContinue: 'or continue with',
    continueGoogle: 'Continue with Google',
    continueYandex: 'Continue with Yandex',
    continueMail: 'Continue with Mail.ru',
    noAccount: "Don't have an account?",
    haveAccount: 'Already have an account?',
    demoHint: 'Demo users: admin@tracker.com / admin123, alice@example.com / pass123, bob@example.com / pass456',
    account: 'Account',
    providerLocal: 'Local',
    logout: 'Logout',
    welcome: 'Welcome, {name}!',
    loggedOut: 'You have been logged out',
    invalidCredentials: 'Invalid email or password',
    emailExists: 'Email already registered',
    passwordMismatch: 'Passwords do not match',
    validEmail: 'Please enter valid email',
    passwordShort: 'Password must be at least 4 characters',
    displayNameRequired: 'Please enter display name',
  },
  ru: {
    title: 'Yandex Tracker',
    subtitle: 'Войдите, чтобы управлять очередями, задачами и комментариями.',
    signIn: 'Войти',
    register: 'Зарегистрироваться',
    createAccount: 'Создать аккаунт',
    backToLogin: 'Назад ко входу',
    email: 'Email',
    emailOrUsername: 'Email или имя',
    password: 'Пароль',
    confirmPassword: 'Подтвердите пароль',
    displayName: 'Отображаемое имя',
    orContinue: 'или продолжить через',
    continueGoogle: 'Продолжить с Google',
    continueYandex: 'Продолжить с Yandex',
    continueMail: 'Продолжить с Mail.ru',
    noAccount: 'Нет аккаунта?',
    haveAccount: 'Уже есть аккаунт?',
    demoHint: 'Демо-пользователи: admin@tracker.com / admin123, alice@example.com / pass123, bob@example.com / pass456',
    account: 'Аккаунт',
    providerLocal: 'Локальный',
    logout: 'Выйти',
    welcome: 'Добро пожаловать, {name}!',
    loggedOut: 'Вы вышли из системы',
    invalidCredentials: 'Неверный email или пароль',
    emailExists: 'Email уже зарегистрирован',
    passwordMismatch: 'Пароли не совпадают',
    validEmail: 'Введите корректный email',
    passwordShort: 'Пароль должен быть не короче 4 символов',
    displayNameRequired: 'Введите отображаемое имя',
  },
};

function translateMessage(dictionary, language, key, params) {
  const path = key.split('.');
  const value = path.reduce((acc, part) => acc?.[part], dictionary[language])
    ?? path.reduce((acc, part) => acc?.[part], dictionary.en)
    ?? key;

  if (typeof value !== 'string') return key;
  return value.replace(/\{(\w+)\}/g, (_, token) => params[token] ?? `{${token}}`);
}

function authText(key, params = {}) {
  let language = 'en';
  try {
    language = typeof getCurrentLanguage === 'function' ? getCurrentLanguage() : 'en';
  } catch {
    language = 'en';
  }

  return translateMessage(authTranslations, language, key, params);
}

function createEmptyFilters() {
  return { status: [], priority: [], assigneeId: '', search: '' };
}

const State = {
  currentView: 'all-issues',
  authMode: 'login',
  currentQueueId: null,
  sidebarCollapsed: false,
  currentIssueId: null,
  preventNextCardClick: false,
  language: localStorage.getItem('yt_clone_language') || 'en',
  dragState: null,
  statusTimerInterval: null,
  filters: createEmptyFilters(),
  get users() { return AppData.getUsers(); },
  get queues() { return AppData.getQueues(); },
  get currentUserId() { return AppData.getCurrentUser()?.id; },
};

function getCurrentLanguage() {
  return translations[State.language] ? State.language : 'en';
}

function t(key, params = {}) {
  return translateMessage(translations, getCurrentLanguage(), key, params);
}

function translateStatus(status) {
  return translations[getCurrentLanguage()].statuses[status] || status;
}

function translatePriority(priority) {
  return translations[getCurrentLanguage()].priorities[priority] || priority;
}

function translateType(type) {
  return translations[getCurrentLanguage()].types[type] || type;
}

// NEW: user roles
const PREDEFINED_ROLE_NAMES = [
  'Analyst',
  'Tester',
  'Frontend Developer',
  'Backend Developer',
  'Fullstack Developer',
  'DevOps Engineer',
  'Project Manager',
  'Designer',
  'System Administrator',
  'Employee',
];

function getCanonicalRole(role) {
  return normalizeRole(role);
}

function getPredefinedRoles() {
  return [...PREDEFINED_ROLE_NAMES];
}

function translateRole(role) {
  const canonical = getCanonicalRole(role);
  return translations[getCurrentLanguage()].roles?.[canonical]
    || translations.en.roles?.[canonical]
    || role
    || translations[getCurrentLanguage()].roles.Employee;
}

function isModalVisible(id) {
  const element = document.getElementById(id);
  return !!element && element.style.display === 'block';
}

function setLanguage(lang) {
  if (!translations[lang]) return;

  const settingsOpen = isModalVisible('settingsModal');
  const adminOpen = isModalVisible('adminPanelModal');
  const issueOpen = isModalVisible('issueModal') ? State.currentIssueId : null;

  State.language = lang;
  localStorage.setItem('yt_clone_language', lang);
  document.documentElement.lang = lang;

  if (getStandaloneTaskId()) {
    renderStandaloneTaskPage(getStandaloneTaskId());
  } else {
    render();
  }

  if (issueOpen && !settingsOpen) {
    openModal(issueOpen);
  }

  if (settingsOpen) {
    openSettingsModal();
  }

  if (adminOpen) {
    openAdminPanel();
  }
}


const AUTH_SESSION_KEY = 'tracker_current_user';

function readAuthSession() {
  const raw = localStorage.getItem(AUTH_SESSION_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === 'string' ? { id: parsed } : parsed;
  } catch {
    return { id: raw };
  }
}

function sanitizeUserForSession(user) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    avatar: user.avatar || user.initials,
    provider: user.provider || 'local',
    // NEW: user roles
    role: user.role || 'Employee',
    isAdmin: Boolean(user.isAdmin),
  };
}

function saveAuthSession(user) {
  localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(sanitizeUserForSession(user)));
}

function clearAuthSession() {
  localStorage.removeItem(AUTH_SESSION_KEY);
}

function checkAuth() {
  const session = readAuthSession();
  const sessionUserId = session?.id;
  const sessionUser = sessionUserId ? AppData.getUserById(sessionUserId) : null;

  if (!sessionUser) {
    clearAuthSession();
    if (AppData.getCurrentUser()) AppData.setCurrentUser(null);
    return false;
  }

  if (AppData.getCurrentUser()?.id !== sessionUser.id) {
    AppData.setCurrentUser(sessionUser.id);
  }

  return true;
}

function requireAuth() {
  if (checkAuth()) return true;
  showLoginScreen('login');
  return false;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
}

function setAuthError(message) {
  const error = document.getElementById('authError');
  if (!error) {
    alert(message);
    return;
  }

  error.textContent = message;
  error.hidden = false;
}

function clearAuthError() {
  const error = document.getElementById('authError');
  if (!error) return;
  error.textContent = '';
  error.hidden = true;
}

function closeProtectedModals() {
  ['issueModal', 'createIssueModal', 'createQueueModal', 'settingsModal', 'adminPanelModal', 'editNameModal'].forEach(id => {
    const modal = document.getElementById(id);
    if (!modal) return;
    modal.style.display = 'none';
    modal.innerHTML = '';
    modal.classList.remove('is-closing');
    delete modal.dataset.closing;
  });
}

function renderAuthScreen(mode = 'login') {
  const isRegister = mode === 'register';

  return `
    <div class="auth-shell">
      <div class="auth-card" role="main" aria-label="${isRegister ? authText('register') : authText('signIn')}">
        <div class="auth-brand">
          <div class="auth-brand-icon">📋</div>
          <div>
            <h1>${authText('title')}</h1>
            <p>${authText('subtitle')}</p>
          </div>
        </div>

        <div class="auth-tabs" aria-label="Authentication mode">
          <button type="button" class="auth-tab ${!isRegister ? 'active' : ''}" data-auth-mode="login">${authText('signIn')}</button>
          <button type="button" class="auth-tab ${isRegister ? 'active' : ''}" data-auth-mode="register">${authText('register')}</button>
        </div>

        <div class="auth-error" id="authError" role="alert" hidden></div>

        ${isRegister ? `
          <form class="auth-form" id="registerForm" novalidate>
            <label class="auth-field">
              <span>${authText('displayName')}</span>
              <input type="text" id="registerDisplayName" autocomplete="name" placeholder="Alice Smith">
            </label>
            <label class="auth-field">
              <span>${authText('email')}</span>
              <input type="email" id="registerEmail" autocomplete="email" placeholder="alice@example.com">
            </label>
            <label class="auth-field">
              <span>${authText('password')}</span>
              <input type="password" id="registerPassword" autocomplete="new-password" placeholder="••••">
            </label>
            <label class="auth-field">
              <span>${authText('confirmPassword')}</span>
              <input type="password" id="registerConfirmPassword" autocomplete="new-password" placeholder="••••">
            </label>
            <button type="submit" class="btn btn-primary auth-submit">${authText('register')}</button>
            <p class="auth-switch">
              ${authText('haveAccount')}
              <button type="button" class="auth-link" data-auth-mode="login">${authText('backToLogin')}</button>
            </p>
          </form>
        ` : `
          <form class="auth-form" id="loginForm" novalidate>
            <label class="auth-field">
              <span>${authText('emailOrUsername')}</span>
              <input type="text" id="loginEmail" autocomplete="username" placeholder="alice@example.com">
            </label>
            <label class="auth-field">
              <span>${authText('password')}</span>
              <input type="password" id="loginPassword" autocomplete="current-password" placeholder="••••">
            </label>
            <button type="submit" class="btn btn-primary auth-submit">${authText('signIn')}</button>

            <div class="auth-divider"><span>${authText('orContinue')}</span></div>

            <div class="social-login-row">
              <button type="button" class="social-btn google" data-auth-provider="google">
                <span class="provider-mark">G</span>
                <span>${authText('continueGoogle')}</span>
              </button>
              <button type="button" class="social-btn yandex" data-auth-provider="yandex">
                <span class="provider-mark">Ya</span>
                <span>${authText('continueYandex')}</span>
              </button>
              <button type="button" class="social-btn mail" data-auth-provider="mail">
                <span class="provider-mark">@</span>
                <span>${authText('continueMail')}</span>
              </button>
            </div>

            <p class="auth-demo-hint">${authText('demoHint')}</p>
            <p class="auth-switch">
              ${authText('noAccount')}
              <button type="button" class="auth-link" data-auth-mode="register">${authText('createAccount')}</button>
            </p>
          </form>
        `}
      </div>
    </div>
  `;
}

// AUTH: login screen
function showLoginScreen(mode = 'login') {
  State.authMode = mode === 'register' ? 'register' : 'login';
  closeProtectedModals();

  const loginContainer = document.getElementById('login-container');
  const appContainer = document.getElementById('app-container');
  const taskPage = document.getElementById('taskPageView');

  if (appContainer) appContainer.classList.add('hidden');
  if (taskPage) {
    taskPage.classList.remove('active');
    taskPage.innerHTML = '';
  }

  if (loginContainer) {
    loginContainer.classList.remove('hidden');
    loginContainer.innerHTML = renderAuthScreen(State.authMode);
    bindAuthEvents();
  }

  document.body.classList.add('auth-view');
  document.title = `${State.authMode === 'register' ? authText('register') : authText('signIn')} – YTracker`;
}

function showAppContainer() {
  const loginContainer = document.getElementById('login-container');
  const appContainer = document.getElementById('app-container');

  if (loginContainer) {
    loginContainer.classList.add('hidden');
    loginContainer.innerHTML = '';
  }
  if (appContainer) appContainer.classList.remove('hidden');
  document.body.classList.remove('auth-view');
}

function showApp() {
  if (!checkAuth()) {
    showLoginScreen('login');
    return;
  }

  showAppContainer();
  applyLayout();

  const standaloneTaskId = getStandaloneTaskId();
  if (standaloneTaskId) {
    renderStandaloneTaskPage(standaloneTaskId);
  } else {
    render();
  }
}

function bindAuthEvents() {
  document.querySelectorAll('[data-auth-mode]').forEach(button => {
    button.addEventListener('click', () => showLoginScreen(button.dataset.authMode));
  });

  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', event => {
      event.preventDefault();
      login();
    });
  }

  const registerForm = document.getElementById('registerForm');
  if (registerForm) {
    registerForm.addEventListener('submit', event => {
      event.preventDefault();
      register();
    });
  }

  document.querySelectorAll('[data-auth-provider]').forEach(button => {
    button.addEventListener('click', () => socialLogin(button.dataset.authProvider));
  });

  window.setTimeout(() => {
    const firstInput = document.querySelector('#login-container input');
    if (firstInput) firstInput.focus();
  }, 50);
}

function login() {
  clearAuthError();

  const identifier = document.getElementById('loginEmail')?.value.trim() || '';
  const password = document.getElementById('loginPassword')?.value || '';

  if (!identifier || !password) {
    setAuthError(authText('invalidCredentials'));
    return;
  }

  if (identifier.includes('@') && !isValidEmail(identifier)) {
    setAuthError(authText('validEmail'));
    return;
  }

  const normalizedIdentifier = identifier.toLowerCase();
  const user = AppData.getUserByEmail(identifier)
    || AppData.getUsers().find(candidate => candidate.displayName.toLowerCase() === normalizedIdentifier);

  if (!user || String(user.password || '') !== password) {
    setAuthError(authText('invalidCredentials'));
    return;
  }

  completeLogin(user);
}

function register() {
  clearAuthError();

  const displayName = document.getElementById('registerDisplayName')?.value.trim() || '';
  const email = document.getElementById('registerEmail')?.value.trim() || '';
  const password = document.getElementById('registerPassword')?.value || '';
  const confirmPassword = document.getElementById('registerConfirmPassword')?.value || '';

  if (!displayName) {
    setAuthError(authText('displayNameRequired'));
    return;
  }
  if (!isValidEmail(email)) {
    setAuthError(authText('validEmail'));
    return;
  }
  if (password.length < 4) {
    setAuthError(authText('passwordShort'));
    return;
  }
  if (password !== confirmPassword) {
    setAuthError(authText('passwordMismatch'));
    return;
  }
  if (AppData.getUserByEmail(email)) {
    setAuthError(authText('emailExists'));
    return;
  }

  try {
    const user = AppData.createUser({ displayName, email, password, provider: 'local', role: 'Employee', isAdmin: false });
    completeLogin(user);
  } catch (error) {
    setAuthError(error.message === 'Email already registered' ? authText('emailExists') : error.message);
  }
}

// AUTH: social login simulation
function socialLogin(provider) {
  clearAuthError();

  const socialUsers = {
    google: {
      provider: 'google',
      email: 'google_demo@example.com',
      displayName: 'Google User',
      avatarColor: '#DB4437',
    },
    yandex: {
      provider: 'yandex',
      email: 'yandex_demo@yandex.ru',
      displayName: 'Yandex User',
      avatarColor: '#FC3F1D',
    },
    mail: {
      provider: 'mail',
      email: 'mail_demo@mail.ru',
      displayName: 'Mail User',
      avatarColor: '#168DE2',
    },
  };

  const config = socialUsers[provider];
  if (!config) return;

  const button = document.querySelector(`[data-auth-provider="${provider}"]`);
  if (button) {
    button.classList.add('loading');
    button.disabled = true;
  }

  window.setTimeout(() => {
    const user = AppData.createOrUpdateSocialUser(config);
    completeLogin(user);
  }, 350);
}

function completeLogin(user) {
  AppData.setCurrentUser(user.id);
  saveAuthSession(user);
  showApp();
  showToast(authText('welcome', { name: user.displayName }), 'success');
}

// AUTH: logout
function logout() {
  clearAuthSession();
  AppData.setCurrentUser(null);
  State.currentView = 'all-issues';
  State.currentQueueId = null;
  State.currentIssueId = null;
  State.filters = createEmptyFilters();
  cleanupDragState();
  closeProtectedModals();
  showLoginScreen('login');
  showToast(authText('loggedOut'), 'info');
}

document.addEventListener('DOMContentLoaded', () => {
  document.documentElement.lang = getCurrentLanguage();
  AppData.init();
  applyTheme(AppData.getTheme());
  bindGlobalEvents();
  startStatusTimerRefresh();

  if (!checkAuth()) {
    showLoginScreen('login');
    return;
  }

  showApp();
});

// ============================================================
// FULL RENDER
// ============================================================
function render() {
  if (!requireAuth()) return;

  showMainApp();
  renderSidebar(buildSidebarState());
  renderTopbar({ users: State.users, currentUserId: State.currentUserId });
  renderMainArea();
  bindSidebarEvents();
  bindTopbarEvents();
}

function buildSidebarState() {
  return {
    queues: State.queues,
    currentView: State.currentView,
    currentQueueId: State.currentQueueId,
    sidebarCollapsed: State.sidebarCollapsed,
  };
}

function renderMainArea() {
  updateBreadcrumb();

  if (State.currentView === 'activity') {
    document.getElementById('filterToolbar').innerHTML = '';
    document.getElementById('statsSummary').innerHTML = '';
    renderActivityLog();
    return;
  }

  const issues = getFilteredIssues();
  renderFilterToolbar({ filters: State.filters, users: State.users });
  renderStatsSummary(issues);
  renderKanbanBoard(issues);

  bindFilterEvents();
  bindBoardEvents();
}

function getFilteredIssues() {
  return AppData.filterIssues({
    status: State.filters.status.length ? State.filters.status : null,
    priority: State.filters.priority.length ? State.filters.priority : null,
    assigneeId: State.filters.assigneeId || null,
    search: State.filters.search || null,
    myTasks: State.currentView === 'my-tasks',
    queueId: State.currentView === 'queue' ? State.currentQueueId : null,
  });
}

function updateBreadcrumb() {
  const breadcrumb = document.getElementById('topbarBreadcrumb');
  if (!breadcrumb) return;

  const map = {
    'my-tasks': `<i class="fa-solid fa-user-check" style="color:var(--color-primary)"></i> ${t('nav.myTasks')}`,
    'all-issues': `<i class="fa-solid fa-table-columns" style="color:var(--color-primary)"></i> ${t('nav.allIssues')}`,
    activity: `<i class="fa-solid fa-clock-rotate-left" style="color:var(--color-primary)"></i> ${t('nav.activityLog')}`,
    queue: (() => {
      const queue = AppData.getQueueById(State.currentQueueId);
      return queue
        ? `<span style="color:${queue.color}"><i class="fa-solid fa-folder"></i> ${escapeHtml(queue.name)}</span>`
        : t('labels.queue');
    })(),
  };

  breadcrumb.innerHTML = map[State.currentView] || '';
}

// ============================================================
// LAYOUT / THEME
// ============================================================
function applyLayout() {
  const app = document.getElementById('app');
  if (!app) return;

  if (window.innerWidth <= 768) {
    app.classList.remove('sidebar-collapsed');
  } else {
    app.classList.toggle('sidebar-collapsed', State.sidebarCollapsed);
  }
}

function applyTheme(theme) {
  document.body.classList.toggle('dark-theme', theme === 'dark');
}

function setTheme(theme) {
  AppData.setTheme(theme === 'dark' ? 'dark' : 'light');
  applyTheme(AppData.getTheme());
}

// ============================================================
// SIDEBAR EVENTS
// ============================================================
function bindSidebarEvents() {
  document.querySelectorAll('.nav-item[data-view]').forEach(link => {
    link.addEventListener('click', event => {
      event.preventDefault();
      navigateTo(link.dataset.view, link.dataset.queueId || null);

      if (window.innerWidth <= 768) {
        document.getElementById('app').classList.remove('sidebar-open');
      }
    });

    link.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        navigateTo(link.dataset.view, link.dataset.queueId || null);
      }
    });
  });

  // NEW ADMIN: delete queue
  document.querySelectorAll('.delete-queue-btn').forEach(button => {
    button.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      confirmDeleteQueue(button.dataset.queueId);
    });
  });

  const toggleBtn = document.getElementById('sidebarToggle');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      State.sidebarCollapsed = !State.sidebarCollapsed;
      applyLayout();
    });
  }

  const addQueueBtn = document.getElementById('btnAddQueueSidebar');
  if (addQueueBtn) {
    addQueueBtn.addEventListener('click', event => {
      event.stopPropagation();
      openCreateQueueModal();
    });
  }

  // NEW: admin panel
  const adminPanelBtn = document.getElementById('btnAdminPanelSidebar');
  if (adminPanelBtn) {
    adminPanelBtn.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      openAdminPanel();
    });
  }
}

function navigateTo(view, queueId = null) {
  State.currentView = view;
  State.currentQueueId = queueId;
  State.filters = createEmptyFilters();
  render();
}

// ============================================================
// NEW ADMIN: delete queue
// ============================================================
function confirmDeleteQueue(queueId) {
  const currentUser = AppData.getCurrentUser();
  if (!currentUser?.isAdmin) return;

  const queue = AppData.getQueueById(queueId);
  if (!queue) return;

  const count = AppData.getIssuesByQueue(queueId).length;
  showConfirm(
    t('admin.deleteQueue'),
    t('admin.deleteQueueConfirm', { name: queue.name, count }),
    () => deleteQueue(queueId),
    { confirmText: t('actions.delete'), confirmClass: 'btn-danger' }
  );
}

function deleteQueue(queueId) {
  const currentUser = AppData.getCurrentUser();
  if (!currentUser?.isAdmin) return;

  const result = AppData.deleteQueue(queueId);
  if (!result) return;

  if (State.currentView === 'queue' && State.currentQueueId === queueId) {
    State.currentView = 'all-issues';
    State.currentQueueId = null;
  }

  State.filters = createEmptyFilters();
  render();
  showToast(t('toasts.queueDeleted', { key: result.queue.key }), 'success');
}

// ============================================================
// TOPBAR EVENTS
// ============================================================
function bindTopbarEvents() {
  const btnCreate = document.getElementById('btnCreateIssue');
  if (btnCreate) {
    btnCreate.addEventListener('click', () => {
      openCreateIssueModal(State.currentQueueId || null);
    });
  }

  const btnSettings = document.getElementById('btnOpenSettings');
  if (btnSettings) {
    btnSettings.addEventListener('click', openSettingsModal);
  }

  const hamburger = document.getElementById('hamburgerBtn');
  if (hamburger) {
    hamburger.addEventListener('click', () => {
      document.getElementById('app').classList.toggle('sidebar-open');
    });
  }

  const logoutBtn = document.getElementById('btnTopbarLogout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', logout);
  }
}

// ============================================================
// FILTER EVENTS
// ============================================================
function bindFilterEvents() {
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', debounce(() => {
      State.filters.search = searchInput.value.trim();
      refreshBoard(true);
    }, 200));
  }

  const searchClear = document.getElementById('searchClear');
  if (searchClear) {
    searchClear.addEventListener('click', () => {
      State.filters.search = '';
      renderFilterToolbar({ filters: State.filters, users: State.users });
      bindFilterEvents();
      refreshBoard(true);
    });
  }

  ['status', 'priority', 'assignee'].forEach(name => {
    const button = document.getElementById(`${name}FilterBtn`);
    const dropdown = document.getElementById(`${name}Dropdown`);

    if (button && dropdown) {
      button.addEventListener('click', event => {
        event.stopPropagation();
        closeAllDropdowns(dropdown);
        dropdown.classList.toggle('open');
      });
    }
  });

  document.querySelectorAll('#statusDropdown input[name="status"]').forEach(input => {
    input.addEventListener('change', () => {
      State.filters.status = [...document.querySelectorAll('#statusDropdown input[name="status"]:checked')].map(item => item.value);
      refreshBoard(true);
    });
  });

  document.querySelectorAll('#priorityDropdown input[name="priority"]').forEach(input => {
    input.addEventListener('change', () => {
      State.filters.priority = [...document.querySelectorAll('#priorityDropdown input[name="priority"]:checked')].map(item => item.value);
      refreshBoard(true);
    });
  });

  document.querySelectorAll('#assigneeDropdown input[name="assignee"]').forEach(input => {
    input.addEventListener('change', () => {
      State.filters.assigneeId = input.value;
      refreshBoard(true);
    });
  });

  const resetBtn = document.getElementById('resetFilters');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      State.filters = createEmptyFilters();
      renderFilterToolbar({ filters: State.filters, users: State.users });
      bindFilterEvents();
      refreshBoard(true);
    });
  }
}

// ============================================================
// NEW: status timer
// ============================================================
function refreshVisibleStatusTimers() {
  const timers = document.querySelectorAll('.task-status-timer');
  if (!timers.length) return;

  const issuesById = new Map();
  AppData.getIssues().forEach(issue => {
    // Match getIssueById: if IDs repeat, the first issue wins.
    if (!issuesById.has(issue.id)) issuesById.set(issue.id, issue);
  });

  timers.forEach(timer => {
    const issue = issuesById.get(timer.dataset.issueId);
    if (!issue) return;
    timer.dataset.status = issue.status;
    timer.dataset.statusChangedAt = issue.statusChangedAt || issue.createdAt || '';
    timer.innerHTML = renderStatusTimer(issue);
  });
}

function startStatusTimerRefresh() {
  if (State.statusTimerInterval) return;
  refreshVisibleStatusTimers();
  State.statusTimerInterval = window.setInterval(refreshVisibleStatusTimers, 60000);
}

// ============================================================
// NEW: smooth animations
// ============================================================
function animateBoardUpdate(renderCallback) {
  const container = document.getElementById('issueBoardContainer');
  if (!container) {
    renderCallback();
    return;
  }

  container.classList.add('board-refreshing');
  window.setTimeout(() => {
    renderCallback();
    requestAnimationFrame(() => {
      container.classList.remove('board-refreshing');
    });
  }, 90);
}

function refreshBoard(withAnimation = true) {
  if (State.currentView === 'activity') {
    renderMainArea();
    return;
  }

  const rerender = () => {
    const issues = getFilteredIssues();
    renderStatsSummary(issues);
    renderKanbanBoard(issues);
    bindBoardEvents();
  };

  if (withAnimation) {
    animateBoardUpdate(rerender);
  } else {
    rerender();
  }
}

// ============================================================
// FIXED: drag-and-drop
// ============================================================
function bindBoardEvents() {
  document.querySelectorAll('.task-card').forEach(card => {
    card.addEventListener('click', event => {
      if (State.preventNextCardClick) {
        event.preventDefault();
        event.stopPropagation();
        State.preventNextCardClick = false;
        return;
      }
      openModal(card.dataset.issueId);
    });

    card.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openModal(card.dataset.issueId);
      }
    });

    card.addEventListener('mousedown', onCardMouseDown);
  });
}

function onCardMouseDown(event) {
  if (event.button !== 0) return;
  if (event.target.closest('button, input, select, textarea, a, label')) return;

  const card = event.currentTarget;
  const rect = card.getBoundingClientRect();

  State.dragState = {
    card,
    issueId: card.dataset.issueId,
    startX: event.clientX,
    startY: event.clientY,
    offsetX: event.clientX - rect.left,
    offsetY: event.clientY - rect.top,
    started: false,
    ghostEl: null,
    hoverColumn: null,
  };

  document.addEventListener('mousemove', onCardMouseMove);
  document.addEventListener('mouseup', onCardMouseUp);
}

function onCardMouseMove(event) {
  const drag = State.dragState;
  if (!drag) return;

  const distance = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY);
  if (!drag.started && distance < 6) return;

  if (!drag.started) {
    startCardDrag(event);
  }

  updateDragGhostPosition(event.clientX, event.clientY);
  updateDragHover(event.clientX, event.clientY);
  event.preventDefault();
}

function startCardDrag(event) {
  const drag = State.dragState;
  if (!drag || drag.started) return;

  drag.started = true;
  State.preventNextCardClick = true;

  drag.card.classList.add('dragging');
  document.body.classList.add('dragging-card');

  const ghost = drag.card.cloneNode(true);
  ghost.classList.add('task-drag-ghost');
  ghost.style.width = `${drag.card.offsetWidth}px`;
  document.body.appendChild(ghost);
  drag.ghostEl = ghost;

  updateDragGhostPosition(event.clientX, event.clientY);
}

function updateDragGhostPosition(clientX, clientY) {
  const drag = State.dragState;
  if (!drag || !drag.ghostEl) return;

  drag.ghostEl.style.transform = `translate(${clientX - drag.offsetX}px, ${clientY - drag.offsetY}px)`;
}

function getColumnFromPoint(clientX, clientY) {
  return document.elementsFromPoint(clientX, clientY)
    .find(element => element.classList && element.classList.contains('kanban-column')) || null;
}

function updateDragHover(clientX, clientY) {
  const drag = State.dragState;
  if (!drag) return;

  const nextColumn = getColumnFromPoint(clientX, clientY);
  if (drag.hoverColumn === nextColumn) return;

  document.querySelectorAll('.kanban-column.drag-over').forEach(column => {
    column.classList.remove('drag-over');
  });

  drag.hoverColumn = nextColumn;
  if (nextColumn) nextColumn.classList.add('drag-over');
}

function onCardMouseUp(event) {
  const drag = State.dragState;
  if (!drag) return;

  document.removeEventListener('mousemove', onCardMouseMove);
  document.removeEventListener('mouseup', onCardMouseUp);

  const wasDragging = drag.started;
  const issueId = drag.issueId;
  const targetColumn = wasDragging ? (getColumnFromPoint(event.clientX, event.clientY) || drag.hoverColumn) : null;

  cleanupDragState();

  if (!wasDragging) return;

  const issue = AppData.getIssueById(issueId);
  const targetStatus = targetColumn?.dataset.status;

  if (issue && targetStatus && issue.status !== targetStatus) {
    AppData.updateIssue(issueId, { status: targetStatus });
    refreshBoard(true);
    showToast(t('toasts.statusChanged', { status: translateStatus(targetStatus) }), 'success');
  }

  window.setTimeout(() => {
    State.preventNextCardClick = false;
  }, 80);
}

function cleanupDragState() {
  const drag = State.dragState;
  if (!drag) return;

  if (drag.card) drag.card.classList.remove('dragging');
  if (drag.ghostEl) drag.ghostEl.remove();

  document.querySelectorAll('.kanban-column.drag-over').forEach(column => {
    column.classList.remove('drag-over');
  });

  document.body.classList.remove('dragging-card');
  State.dragState = null;
}

// ============================================================
// ISSUE MODAL
// ============================================================
function openModal(issueId) {
  if (!requireAuth()) return;

  const issue = AppData.getIssueById(issueId);
  if (!issue) return;

  State.currentIssueId = issueId;
  const modal = document.getElementById('issueModal');
  modal.classList.remove('is-closing');
  modal.style.display = 'block';
  renderIssueModal(issue);
  bindIssueModalEvents(issueId);
}

function animateModalClose(rootId, afterClose) {
  const modal = document.getElementById(rootId);
  if (!modal || modal.style.display === 'none') {
    if (afterClose) afterClose();
    return;
  }

  if (modal.dataset.closing === 'true') return;

  modal.dataset.closing = 'true';
  modal.classList.add('is-closing');

  window.setTimeout(() => {
    modal.style.display = 'none';
    modal.innerHTML = '';
    modal.classList.remove('is-closing');
    delete modal.dataset.closing;
    if (afterClose) afterClose();
  }, 180);
}

function closeModal() {
  animateModalClose('issueModal', () => {
    State.currentIssueId = null;
    refreshBoard(true);
  });
}

function bindIssueModalEvents(issueId) {
  const closeBtn = document.getElementById('btnCloseModal');
  const cancelBtn = document.getElementById('btnCancelModal');
  const backdrop = document.getElementById('modalBackdrop');
  const saveBtn = document.getElementById('btnSaveIssue');
  const deleteBtn = document.getElementById('btnDeleteIssue');
  const postBtn = document.getElementById('btnPostComment');
  const clearBtn = document.getElementById('btnClearComment');
  const commentInput = document.getElementById('commentInput');
  const openFullLink = document.getElementById('openFullTaskLink');

  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
  if (backdrop) backdrop.addEventListener('click', closeModal);
  if (saveBtn) saveBtn.addEventListener('click', () => saveTaskFromModal(issueId));
  if (openFullLink) openFullLink.addEventListener('click', () => openFullPageTask(issueId));

  if (deleteBtn) {
    deleteBtn.addEventListener('click', () => {
      const issue = AppData.getIssueById(issueId);
      if (!issue) return;

      showConfirm(
        t('confirm.deleteTitle'),
        t('confirm.deleteWithName', { key: issue.key, summary: issue.summary }),
        () => {
          AppData.deleteIssue(issueId);
          closeModal();
          showToast(t('toasts.issueDeleted', { key: issue.key }), 'success');
        }
      );
    });
  }

  if (postBtn && commentInput) {
    postBtn.addEventListener('click', () => {
      const text = commentInput.value.trim();
      if (!text) {
        commentInput.focus();
        return;
      }

      AppData.addComment(issueId, text);
      commentInput.value = '';
      refreshModalComments(issueId);
      showToast(t('toasts.commentAdded'), 'success');
    });
  }

  if (clearBtn && commentInput) {
    clearBtn.addEventListener('click', () => {
      commentInput.value = '';
      commentInput.focus();
    });
  }

  if (commentInput) {
    commentInput.addEventListener('keydown', event => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        postBtn?.click();
      }
    });
  }

  bindCommentDeleteEvents(issueId);
}

function refreshModalComments(issueId) {
  const issue = AppData.getIssueById(issueId);
  if (!issue) return;

  const commentsList = document.getElementById('commentsList');
  const commentsCount = document.getElementById('commentsCount');
  const metaUpdated = document.getElementById('metaUpdated');

  if (commentsList) commentsList.innerHTML = renderComments(issue);
  if (commentsCount) commentsCount.textContent = issue.comments.length;
  if (metaUpdated) metaUpdated.textContent = formatDateFull(issue.updatedAt);

  bindCommentDeleteEvents(issueId);
}

function saveTaskForm(issueId, fieldIds, onSaved) {
  const summaryEl = document.getElementById(fieldIds.summary);
  const descriptionEl = document.getElementById(fieldIds.description);
  const statusEl = document.getElementById(fieldIds.status);
  const priorityEl = document.getElementById(fieldIds.priority);
  const typeEl = document.getElementById(fieldIds.type);
  const assigneeEl = document.getElementById(fieldIds.assignee);

  if (!summaryEl) return;

  const summary = summaryEl.value.trim();
  if (!summary) {
    showToast(t('errors.summaryCannotBeEmpty'), 'error');
    summaryEl.focus();
    return;
  }

  AppData.updateIssue(issueId, {
    summary,
    description: descriptionEl ? descriptionEl.value : '',
    status: statusEl ? statusEl.value : 'Open',
    priority: priorityEl ? priorityEl.value : 'Medium',
    type: typeEl ? typeEl.value : 'Task',
    assigneeId: assigneeEl && assigneeEl.value ? assigneeEl.value : null,
  });

  onSaved();
  showToast(t('toasts.issueSaved'), 'success');
}

function saveTaskFromModal(issueId) {
  saveTaskForm(issueId, {
    summary: 'summaryField',
    description: 'descriptionField',
    status: 'statusSelect',
    priority: 'prioritySelect',
    type: 'typeSelect',
    assignee: 'assigneeSelect',
  }, closeModal);
}

// ============================================================
// CREATE ISSUE MODAL
// ============================================================
function openCreateIssueModal(defaultQueueId) {
  if (!requireAuth()) return;

  const modal = document.getElementById('createIssueModal');
  modal.classList.remove('is-closing');
  modal.style.display = 'block';
  renderCreateIssueModal(defaultQueueId);
  bindCreateIssueEvents();
}

function closeCreateIssueModal() {
  animateModalClose('createIssueModal');
}

function bindCreateIssueEvents() {
  const backdrop = document.getElementById('createModalBackdrop');
  const closeBtn = document.getElementById('btnCloseCreateModal');
  const cancelBtn = document.getElementById('btnCancelCreate');
  const submitBtn = document.getElementById('btnSubmitCreate');
  const queueSelect = document.getElementById('createQueue');

  if (backdrop) backdrop.addEventListener('click', closeCreateIssueModal);
  if (closeBtn) closeBtn.addEventListener('click', closeCreateIssueModal);
  if (cancelBtn) cancelBtn.addEventListener('click', closeCreateIssueModal);

  if (queueSelect) {
    queueSelect.addEventListener('change', updateKeyPreview);
    updateKeyPreview();
  }

  if (submitBtn) {
    submitBtn.addEventListener('click', () => {
      const queueId = document.getElementById('createQueue').value;
      const summary = document.getElementById('createSummary').value.trim();
      const description = document.getElementById('createDescription').value.trim();
      const type = document.getElementById('createType').value;
      const priority = document.getElementById('createPriority').value;
      const assigneeId = document.getElementById('createAssignee').value;
      const status = document.getElementById('createStatus').value;

      if (!queueId) {
        showToast(t('errors.queueRequired'), 'error');
        document.getElementById('createQueue').focus();
        return;
      }
      if (!summary) {
        showToast(t('errors.summaryRequired'), 'error');
        document.getElementById('createSummary').focus();
        return;
      }

      const issue = AppData.createIssue({ queueId, summary, description, type, priority, assigneeId, status });
      closeCreateIssueModal();
      window.setTimeout(() => render(), 190);
      showToast(t('toasts.issueCreated', { key: issue.key }), 'success');
    });
  }

  window.setTimeout(() => {
    const summaryInput = document.getElementById('createSummary');
    if (summaryInput) summaryInput.focus();
  }, 50);
}

function updateKeyPreview() {
  const queueSelect = document.getElementById('createQueue');
  const preview = document.getElementById('newKeyPreview');
  const previewText = document.getElementById('keyPreviewText');
  if (!queueSelect || !preview || !previewText) return;

  const queueId = queueSelect.value;
  if (!queueId) {
    preview.style.display = 'none';
    return;
  }

  const queue = AppData.getQueueById(queueId);
  if (!queue) {
    preview.style.display = 'none';
    return;
  }

  preview.style.display = 'flex';
  previewText.textContent = `${queue.key}-${queue.counter + 1}`;
}

// ============================================================
// CREATE QUEUE MODAL
// ============================================================
function openCreateQueueModal() {
  if (!requireAuth()) return;

  const modal = document.getElementById('createQueueModal');
  modal.classList.remove('is-closing');
  modal.style.display = 'block';
  renderCreateQueueModal();
  bindCreateQueueEvents();
}

function closeCreateQueueModal() {
  animateModalClose('createQueueModal');
}

function bindCreateQueueEvents() {
  const backdrop = document.getElementById('queueModalBackdrop');
  const closeBtn = document.getElementById('btnCloseQueueModal');
  const cancelBtn = document.getElementById('btnCancelQueue');
  const submitBtn = document.getElementById('btnSubmitQueue');
  const nameInput = document.getElementById('queueName');
  const keyInput = document.getElementById('queueKey');

  if (backdrop) backdrop.addEventListener('click', closeCreateQueueModal);
  if (closeBtn) closeBtn.addEventListener('click', closeCreateQueueModal);
  if (cancelBtn) cancelBtn.addEventListener('click', closeCreateQueueModal);

  if (nameInput && keyInput) {
    nameInput.addEventListener('input', () => {
      const words = nameInput.value.trim().split(/\s+/).filter(Boolean);
      let key = '';

      if (words.length >= 2) {
        key = words.map(word => word[0]).join('').toUpperCase().slice(0, 6);
      } else if (words.length === 1) {
        key = words[0].toUpperCase().slice(0, 5);
      }

      keyInput.value = key;
    });
  }

  if (keyInput) {
    keyInput.addEventListener('input', () => {
      keyInput.value = keyInput.value.toUpperCase().replace(/[^A-Z]/g, '');
    });
  }

  document.querySelectorAll('.color-swatch').forEach(swatch => {
    swatch.addEventListener('click', () => {
      document.querySelectorAll('.color-swatch').forEach(item => item.classList.remove('selected'));
      swatch.classList.add('selected');
    });
  });

  if (submitBtn) {
    submitBtn.addEventListener('click', () => {
      const name = document.getElementById('queueName').value.trim();
      const key = document.getElementById('queueKey').value.trim().toUpperCase();
      const colorEl = document.querySelector('.color-swatch.selected');
      const color = colorEl ? colorEl.dataset.color : '#4F8EF7';

      if (!name) {
        showToast(t('errors.queueNameRequired'), 'error');
        document.getElementById('queueName').focus();
        return;
      }
      if (!key || !/^[A-Z]+$/.test(key)) {
        showToast(t('errors.queueKeyLettersOnly'), 'error');
        document.getElementById('queueKey').focus();
        return;
      }
      if (AppData.getQueueByKey(key)) {
        showToast(t('errors.queueKeyExists', { key }), 'error');
        document.getElementById('queueKey').focus();
        return;
      }

      const queue = AppData.createQueue({ name, key, color });
      closeCreateQueueModal();
      window.setTimeout(() => render(), 190);
      showToast(t('toasts.queueCreated', { name: queue.name }), 'success');
    });
  }
}

// ============================================================
// NEW: admin panel
// ============================================================
function openAdminPanel() {
  if (!requireAuth()) return;

  const currentUser = AppData.getCurrentUser();
  if (!currentUser?.isAdmin) {
    showToast(authText('invalidCredentials'), 'error');
    return;
  }

  const modal = document.getElementById('adminPanelModal');
  if (!modal) return;
  modal.classList.remove('is-closing');
  modal.style.display = 'block';
  renderAdminPanelModal();
  bindAdminPanelEvents();
}

function closeAdminPanel() {
  animateModalClose('adminPanelModal');
}

function bindAdminPanelEvents() {
  const backdrop = document.getElementById('adminPanelBackdrop');
  const closeBtn = document.getElementById('btnCloseAdminPanel');

  if (backdrop) backdrop.addEventListener('click', closeAdminPanel);
  if (closeBtn) closeBtn.addEventListener('click', closeAdminPanel);

  document.querySelectorAll('.admin-role-mode input[type="radio"]').forEach(input => {
    input.addEventListener('change', () => {
      const row = input.closest('tr');
      const select = row?.querySelector('.admin-role-select');
      const customInput = row?.querySelector('.admin-custom-role-input');
      const customMode = input.value === 'custom' && input.checked;
      if (select) select.disabled = customMode;
      if (customInput) {
        customInput.disabled = !customMode;
        if (customMode) customInput.focus();
      }
    });
  });

  document.querySelectorAll('.admin-save-role').forEach(button => {
    button.addEventListener('click', () => {
      updateUserRole(button.dataset.userId);
    });
  });

  // NEW ADMIN: edit display name
  document.querySelectorAll('.admin-edit-name').forEach(button => {
    button.addEventListener('click', () => {
      openEditNameModal(button.dataset.userId);
    });
  });
}

function updateUserRole(userId) {
  const currentUser = AppData.getCurrentUser();
  if (!currentUser?.isAdmin || !userId || userId === currentUser.id) return;

  const row = document.querySelector(`tr[data-user-id="${userId}"]`);
  const mode = row?.querySelector(`input[name="roleMode_${userId}"]:checked`)?.value || 'predefined';
  const select = row?.querySelector('.admin-role-select');
  const customInput = row?.querySelector('.admin-custom-role-input');
  const nextRole = mode === 'custom' ? customInput?.value.trim() : select?.value;

  if (!nextRole) {
    showToast(t('errors.customRoleRequired'), 'error');
    customInput?.focus();
    return;
  }

  const user = AppData.updateUserRole(userId, nextRole);
  if (!user) return;

  showToast(t('toasts.roleUpdated', { name: user.displayName }), 'success');
  renderAdminPanelModal();
  bindAdminPanelEvents();
  renderSidebar(buildSidebarState());
  bindSidebarEvents();
  renderTopbar({ users: State.users, currentUserId: State.currentUserId });
  bindTopbarEvents();
}


// ============================================================
// NEW ADMIN: edit display name
// ============================================================
function openEditNameModal(userId) {
  const currentUser = AppData.getCurrentUser();
  if (!currentUser?.isAdmin) return;

  const user = AppData.getUserById(userId);
  if (!user) return;

  const modal = document.getElementById('editNameModal');
  if (!modal) return;
  modal.classList.remove('is-closing');
  modal.style.display = 'block';
  modal.dataset.userId = userId;
  renderEditNameModal(user);
  bindEditNameEvents(userId);
}

function closeEditNameModal() {
  animateModalClose('editNameModal');
}

function bindEditNameEvents(userId) {
  const backdrop = document.getElementById('editNameBackdrop');
  const closeBtn = document.getElementById('btnCloseEditName');
  const cancelBtn = document.getElementById('btnCancelEditName');
  const saveBtn = document.getElementById('btnSaveDisplayName');
  const input = document.getElementById('editDisplayNameInput');

  if (backdrop) backdrop.addEventListener('click', closeEditNameModal);
  if (closeBtn) closeBtn.addEventListener('click', closeEditNameModal);
  if (cancelBtn) cancelBtn.addEventListener('click', closeEditNameModal);
  if (saveBtn) saveBtn.addEventListener('click', () => updateUserDisplayName(userId));

  if (input) {
    input.focus();
    input.select();
    input.addEventListener('keydown', event => {
      if (event.key === 'Enter') {
        event.preventDefault();
        updateUserDisplayName(userId);
      }
    });
  }
}

function updateUserDisplayName(userId) {
  const currentUser = AppData.getCurrentUser();
  if (!currentUser?.isAdmin) return;

  const input = document.getElementById('editDisplayNameInput');
  const nextName = input?.value.trim() || '';
  if (!nextName) {
    showToast(t('errors.displayNameRequired'), 'error');
    input?.focus();
    return;
  }

  const user = AppData.updateUserDisplayName(userId, nextName);
  if (!user) return;

  if (user.id === currentUser.id) saveAuthSession(user);
  closeEditNameModal();
  renderAdminPanelModal();
  bindAdminPanelEvents();
  renderSidebar(buildSidebarState());
  bindSidebarEvents();
  renderTopbar({ users: State.users, currentUserId: State.currentUserId });
  bindTopbarEvents();
  refreshBoard(false);
  showToast(t('toasts.displayNameUpdated'), 'success');
}

// ============================================================
// NEW: Settings modal
// ============================================================
function openSettingsModal() {
  if (!requireAuth()) return;

  const modal = document.getElementById('settingsModal');
  modal.classList.remove('is-closing');
  modal.style.display = 'block';
  renderSettingsModal();
  bindSettingsEvents();
}

function closeSettingsModal() {
  animateModalClose('settingsModal');
}

function bindSettingsEvents() {
  const backdrop = document.getElementById('settingsModalBackdrop');
  const closeBtn = document.getElementById('btnCloseSettingsModal');
  const closeAction = document.getElementById('btnCloseSettingsAction');
  const logoutBtn = document.getElementById('btnLogoutSettings');

  if (backdrop) backdrop.addEventListener('click', closeSettingsModal);
  if (closeBtn) closeBtn.addEventListener('click', closeSettingsModal);
  if (closeAction) closeAction.addEventListener('click', closeSettingsModal);
  if (logoutBtn) logoutBtn.addEventListener('click', logout);

  document.querySelectorAll('input[name="themeSetting"]').forEach(input => {
    input.addEventListener('change', () => {
      setTheme(input.value);
    });
  });

  document.querySelectorAll('input[name="languageSetting"]').forEach(input => {
    input.addEventListener('change', () => {
      setLanguage(input.value);
    });
  });
}

// ============================================================
// NEW: full-page task view
// ============================================================
function getStandaloneTaskId() {
  return new URLSearchParams(window.location.search).get('taskId');
}

function showMainApp() {
  showAppContainer();

  const app = document.getElementById('app');
  const taskPage = document.getElementById('taskPageView');
  if (app) app.classList.remove('hidden');
  if (taskPage) {
    taskPage.classList.remove('active');
    taskPage.innerHTML = '';
  }
  document.title = 'YTracker – Project Tracker';
}

function showStandaloneTaskPage() {
  showAppContainer();

  const app = document.getElementById('app');
  const taskPage = document.getElementById('taskPageView');
  if (app) app.classList.add('hidden');
  if (taskPage) taskPage.classList.add('active');
}

function openFullPageTask(issueId) {
  window.open(getTaskUrl(issueId), '_blank', 'noopener');
}

function renderStandaloneTaskPage(issueId) {
  if (!requireAuth()) return;

  showStandaloneTaskPage();

  const issue = AppData.getIssueById(issueId);
  renderFullPageTaskView(issue);
  document.title = issue ? `${issue.key} – ${issue.summary}` : `${t('misc.taskNotFound')} – YTracker`;

  if (issue) {
    bindStandaloneTaskPageEvents(issueId);
  }
}

function bindStandaloneTaskPageEvents(issueId) {
  const saveBtn = document.getElementById('taskPageSave');
  const deleteBtn = document.getElementById('taskPageDelete');
  const addCommentBtn = document.getElementById('taskPageAddComment');
  const clearCommentBtn = document.getElementById('taskPageClearComment');
  const commentInput = document.getElementById('taskPageCommentInput');

  if (saveBtn) {
    saveBtn.addEventListener('click', () => saveStandaloneTask(issueId));
  }

  if (deleteBtn) {
    deleteBtn.addEventListener('click', () => {
      const issue = AppData.getIssueById(issueId);
      if (!issue) return;

      showConfirm(
        t('confirm.deleteTitle'),
        t('confirm.deleteWithName', { key: issue.key, summary: issue.summary }),
        () => {
          AppData.deleteIssue(issueId);
          window.location.href = getBoardUrl();
        }
      );
    });
  }

  if (addCommentBtn && commentInput) {
    addCommentBtn.addEventListener('click', () => {
      const text = commentInput.value.trim();
      if (!text) {
        commentInput.focus();
        return;
      }

      AppData.addComment(issueId, text);
      commentInput.value = '';
      refreshStandaloneComments(issueId);
      showToast(t('toasts.commentAdded'), 'success');
    });
  }

  if (clearCommentBtn && commentInput) {
    clearCommentBtn.addEventListener('click', () => {
      commentInput.value = '';
      commentInput.focus();
    });
  }

  if (commentInput) {
    commentInput.addEventListener('keydown', event => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        addCommentBtn?.click();
      }
    });
  }

  bindCommentDeleteEvents(issueId);
}

function refreshStandaloneComments(issueId) {
  const issue = AppData.getIssueById(issueId);
  if (!issue) return;

  const commentsList = document.getElementById('taskPageCommentsList');
  const commentsCount = document.getElementById('taskPageCommentsCount');
  const updated = document.getElementById('taskPageUpdated');

  if (commentsList) commentsList.innerHTML = renderComments(issue);
  if (commentsCount) commentsCount.textContent = issue.comments.length;
  if (updated) updated.textContent = formatDateFull(issue.updatedAt);

  bindCommentDeleteEvents(issueId);
}

function saveStandaloneTask(issueId) {
  saveTaskForm(issueId, {
    summary: 'taskPageSummary',
    description: 'taskPageDescription',
    status: 'taskPageStatus',
    priority: 'taskPagePriority',
    type: 'taskPageType',
    assignee: 'taskPageAssignee',
  }, () => renderStandaloneTaskPage(issueId));
}

// ============================================================
// COMMENTS DELETE
// ============================================================
function bindCommentDeleteEvents(issueId) {
  document.querySelectorAll('.comment-delete-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      AppData.deleteComment(issueId, btn.dataset.commentId);

      if (getStandaloneTaskId()) {
        refreshStandaloneComments(issueId);
      } else {
        refreshModalComments(issueId);
      }

      showToast(t('toasts.commentDeleted'), 'info');
    });
  });
}

// ============================================================
// GLOBAL EVENTS
// ============================================================
function bindGlobalEvents() {
  document.addEventListener('click', event => {
    if (!event.target.closest('.filter-dropdown-wrap')) {
      document.querySelectorAll('.filter-dropdown.open').forEach(dropdown => dropdown.classList.remove('open'));
    }
  });

  window.addEventListener('resize', debounce(() => {
    applyLayout();
    if (window.innerWidth > 768) {
      const app = document.getElementById('app');
      if (app) app.classList.remove('sidebar-open');
    }
  }, 200));

  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;

    if (isModalVisible('issueModal')) closeModal();
    if (isModalVisible('createIssueModal')) closeCreateIssueModal();
    if (isModalVisible('createQueueModal')) closeCreateQueueModal();
    if (isModalVisible('settingsModal')) closeSettingsModal();
    if (isModalVisible('adminPanelModal')) closeAdminPanel();
    if (isModalVisible('editNameModal')) closeEditNameModal();

    const app = document.getElementById('app');
    if (app) app.classList.remove('sidebar-open');
  });
}

function closeAllDropdowns(except) {
  document.querySelectorAll('.filter-dropdown.open').forEach(dropdown => {
    if (dropdown !== except) dropdown.classList.remove('open');
  });
}

// ============================================================
// TOAST NOTIFICATIONS
// ============================================================
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const icons = {
    success: 'fa-circle-check',
    error: 'fa-circle-exclamation',
    info: 'fa-circle-info',
  };

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<i class="fa-solid ${icons[type] || icons.info}"></i> ${escapeHtml(message)}`;
  container.appendChild(toast);

  window.setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(8px)';
    toast.style.transition = 'opacity .3s, transform .3s';
    window.setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ============================================================
// CONFIRMATION DIALOG
// ============================================================
function showConfirm(title, message, onConfirm, options = {}) {
  document.querySelectorAll('.confirm-overlay').forEach(node => node.remove());

  const confirmText = options.confirmText || t('actions.confirm');
  const confirmClass = options.confirmClass || 'btn-danger';
  const overlay = document.createElement('div');
  overlay.className = 'confirm-overlay';
  overlay.innerHTML = `
    <div class="confirm-dialog">
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(message)}</p>
      <div class="confirm-actions">
        <button class="btn btn-ghost" id="confirmCancel">${t('actions.cancel')}</button>
        <button class="btn ${escapeAttr(confirmClass)}" id="confirmOk">
          <i class="fa-solid fa-check"></i>
          ${escapeHtml(confirmText)}
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  document.getElementById('confirmCancel').addEventListener('click', () => overlay.remove());
  document.getElementById('confirmOk').addEventListener('click', () => {
    overlay.remove();
    onConfirm();
  });
  overlay.addEventListener('click', event => {
    if (event.target === overlay) overlay.remove();
  });
}

// ============================================================
// UTILITIES
// ============================================================
function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = window.setTimeout(() => fn(...args), delay);
  };
}