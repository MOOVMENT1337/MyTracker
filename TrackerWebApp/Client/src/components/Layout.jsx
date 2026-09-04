import { useTracker } from "../context";
import { Avatar, Icon } from "./common";

export function Sidebar({
  view,
  queueId,
  navigate,
  collapsed,
  toggle,
  createQueue,
  admin,
  deleteQueue,
}) {
  const { user, queues, t } = useTracker();
  const nav = (value, icon, label) => (
    <a
      href="#"
      className={`nav-item ${view === value ? "active" : ""}`}
      data-view={value}
      onClick={(e) => {
        e.preventDefault();
        navigate(value);
      }}
    >
      <Icon name={icon} />
      <span className="nav-label">{t(label)}</span>
    </a>
  );
  return (
    <aside id="sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon">
          <Icon name="fa-solid fa-layer-group" />
        </div>
        <span className="logo-text">YTracker</span>
        <button
          type="button"
          className="sidebar-collapse-btn"
          id="sidebarToggle"
          title={t(
            collapsed ? "tooltips.expandSidebar" : "tooltips.collapseSidebar",
          )}
          aria-label={t(
            collapsed ? "tooltips.expandSidebar" : "tooltips.collapseSidebar",
          )}
          aria-expanded={!collapsed}
          aria-controls="sidebar"
          onClick={toggle}
        >
          <Icon name="fa-solid fa-chevron-left" />
        </button>
      </div>
      <nav className="sidebar-nav">
        <div className="nav-section-label">{t("nav.navigation")}</div>
        {nav("my-tasks", "fa-solid fa-user-check", "nav.myTasks")}
        {nav("all-issues", "fa-solid fa-table-columns", "nav.allIssues")}
        <div className="nav-section-label queues-label">
          <span>{t("nav.queues")}</span>
          <button
            className="btn-add-queue-small"
            id="btnAddQueueSidebar"
            title={t("actions.createQueue")}
            onClick={createQueue}
          >
            <Icon name="fa-solid fa-plus" />
          </button>
        </div>
        {user.isAdmin && (
          <button
            type="button"
            className="nav-item admin-panel-btn"
            id="btnAdminPanelSidebar"
            onClick={admin}
          >
            <Icon name="fa-solid fa-user-shield" />
            <span className="nav-label">{t("admin.title")}</span>
          </button>
        )}
        {queues.map((queue) => (
          <div
            key={queue.id}
            role="button"
            tabIndex={0}
            className={`nav-item nav-queue ${view === "queue" && queueId === queue.id ? "active" : ""}`}
            data-view="queue"
            data-queue-id={queue.id}
            onClick={() => navigate("queue", queue.id)}
            onKeyDown={(e) => {
              if (
                e.target === e.currentTarget &&
                ["Enter", " "].includes(e.key)
              ) {
                e.preventDefault();
                navigate("queue", queue.id);
              }
            }}
          >
            <span className="queue-dot" style={{ background: queue.color }} />
            <span className="nav-label">{queue.name}</span>
            <span className="queue-key-badge">{queue.key}</span>
            {user.isAdmin && (
              <button
                type="button"
                className="delete-queue-btn"
                data-queue-id={queue.id}
                title={t("admin.deleteQueue")}
                aria-label={t("admin.deleteQueue")}
                onClick={(e) => {
                  e.stopPropagation();
                  deleteQueue(queue);
                }}
              >
                <Icon name="fa-solid fa-trash-can" />
              </button>
            )}
          </div>
        ))}
      </nav>
      <div className="sidebar-footer">
        {nav("activity", "fa-solid fa-clock-rotate-left", "nav.activityLog")}
      </div>
    </aside>
  );
}
export function Topbar({ view, queueId, toggleMenu, settings, createIssue }) {
  const { user, queues, t, auth, logout } = useTracker();
  const queue = queues.find((item) => item.id === queueId);
  const breadcrumb =
    view === "queue" ? (
      <span style={{ color: queue?.color }}>
        <Icon name="fa-solid fa-folder" /> {queue?.name || t("labels.queue")}
      </span>
    ) : (
      <>
        <Icon
          name={
            {
              "my-tasks": "fa-solid fa-user-check",
              "all-issues": "fa-solid fa-table-columns",
              activity: "fa-solid fa-clock-rotate-left",
            }[view]
          }
          style={{ color: "var(--color-primary)" }}
        />{" "}
        {t(
          {
            "my-tasks": "nav.myTasks",
            "all-issues": "nav.allIssues",
            activity: "nav.activityLog",
          }[view],
        )}
      </>
    );
  return (
    <header id="topbar">
      <div className="topbar-left">
        <button
          className="hamburger-btn"
          id="hamburgerBtn"
          title={t("tooltips.toggleMenu")}
          onClick={toggleMenu}
        >
          <Icon name="fa-solid fa-bars" />
        </button>
        <div className="topbar-breadcrumb" id="topbarBreadcrumb">
          {breadcrumb}
        </div>
      </div>
      <div className="topbar-right">
        <button
          className="btn btn-ghost"
          id="btnOpenSettings"
          onClick={settings}
        >
          <Icon name="fa-solid fa-gear" />
          <span>{t("actions.settings")}</span>
        </button>
        <button
          className="btn btn-primary"
          id="btnCreateIssue"
          onClick={createIssue}
        >
          <Icon name="fa-solid fa-plus" />
          <span>{t("actions.createIssue")}</span>
        </button>
        <div
          className="user-profile"
          id="loggedInUserProfile"
          title={user.email}
        >
          <Avatar user={user} size={32} />
          <div className="user-profile-text">
            <span className="user-name">{user.displayName}</span>
            <span className="user-provider">
              {t(`roles.${user.role}`).replace(/^roles\./, "")}
            </span>
          </div>
        </div>
        <button
          className="btn btn-ghost btn-icon btn-logout-top"
          id="btnTopbarLogout"
          title={auth("logout")}
          aria-label={auth("logout")}
          onClick={logout}
        >
          <Icon name="fa-solid fa-right-from-bracket" />
        </button>
      </div>
    </header>
  );
}
