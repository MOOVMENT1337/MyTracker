import { useCallback, useEffect, useRef, useState } from "react";
import { data, list } from "./api";
import { TrackerContext, errorText, translator } from "./context";
import { Confirmation, Toast } from "./components/common";
import Login from "./components/Login";
import { Sidebar, Topbar } from "./components/Layout";
import Board from "./components/Board";
import { IssueDetail, StandaloneTask } from "./components/IssueDetail";
import { CreateIssue, CreateQueue } from "./components/CreateForms";
import {
  AdminPanel,
  EditName,
  CreateUser,
  Settings,
} from "./components/Account";

const emptyFilters = () => ({
  search: "",
  status: [],
  priority: [],
  assigneeId: "",
});
export default function App() {
  const [user, setUser] = useState(null),
    [users, setUsers] = useState([]),
    [queues, setQueues] = useState([]);
  const [metadata, setMetadata] = useState({
    statuses: [],
    priorities: [],
    types: [],
    roles: [],
  });
  const [settings, setSettings] = useState({ language: "ru", theme: "dark" });
  const [initializing, setInitializing] = useState(true),
    [authError, setAuthError] = useState("");
  const [view, setView] = useState("all-issues"),
    [queueId, setQueueId] = useState(null),
    [filters, setFilters] = useState(emptyFilters);
  const [collapsed, setCollapsed] = useState(false),
    [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [modal, setModal] = useState(null),
    [editUser, setEditUser] = useState(null),
    [createUser, setCreateUser] = useState(false);
  const [confirmation, setConfirmation] = useState(null),
    [toasts, setToasts] = useState([]),
    [revision, setRevision] = useState(0);
  const taskId = new URLSearchParams(window.location.search).get("taskId");
  const toastCounter = useRef(0),
    generation = useRef(0),
    authenticated = useRef(false);
  const language = settings.language,
    t = translator(language),
    auth = translator(language, true);
  const notify = useCallback((message, type = "success") => {
    const id = ++toastCounter.current;
    const onRemove = () =>
      setToasts((items) => items.filter((item) => item.id !== id));
    setToasts((items) => [...items, { id, message, type, onRemove }]);
  }, []);
  const run = async (action) => {
    try {
      await action();
      return true;
    } catch (error) {
      if (error.name !== "AbortError")
        notify(errorText(error, language), "error");
      return false;
    }
  };
  const clearSession = useCallback(() => {
    authenticated.current = false;
    generation.current++;
    setUser(null);
    setUsers([]);
    setQueues([]);
    setModal(null);
    setEditUser(null);
    setCreateUser(false);
    setConfirmation(null);
    setMobileOpen(false);
    setView("all-issues");
    setQueueId(null);
    setFilters(emptyFilters());
    setSettings({ language: "ru", theme: "dark" });
  }, []);
  const loadWorkspace = async (account, signal) => {
    const id = generation.current;
    const results = await Promise.all([
      list("/users", {}, signal),
      data("/queues", { signal }),
      data("/metadata", { signal }),
      data("/settings", { signal }),
    ]);
    if (signal?.aborted || id !== generation.current) return;
    authenticated.current = true;
    setUsers(results[0]);
    setQueues(results[1]);
    setMetadata(results[2]);
    setSettings(results[3]);
    setUser(account);
  };
  const reload = async () => {
    const id = generation.current;
    const [newUsers, newQueues] = await Promise.all([
      list("/users"),
      data("/queues"),
    ]);
    if (id !== generation.current) return;
    setUsers(newUsers);
    setQueues(newQueues);
    setUser(
      (current) => newUsers.find((item) => item.id === current?.id) || current,
    );
    setRevision((value) => value + 1);
  };
  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const account = await data("/auth/me", { signal: controller.signal });
        await loadWorkspace(account, controller.signal);
      } catch (error) {
        if (error.name !== "AbortError" && error.status !== 401)
          setAuthError(errorText(error, "ru"));
      } finally {
        if (!controller.signal.aborted) setInitializing(false);
      }
    })();
    const expired = () => {
      if (authenticated.current) {
        clearSession();
        setAuthError(
          errorText({ code: "UNAUTHORIZED" }, document.documentElement.lang),
        );
      }
    };
    window.addEventListener("tracker-session-expired", expired);
    return () => {
      controller.abort();
      window.removeEventListener("tracker-session-expired", expired);
    };
  }, []);
  useEffect(() => {
    document.body.classList.toggle("dark-theme", settings.theme === "dark");
    document.body.classList.toggle("auth-view", !user);
    document.body.classList.toggle("task-page-mode", !!user && !!taskId);
    document.documentElement.lang = language;
  }, [settings.theme, user, taskId, language]);
  useEffect(() => {
    const resize = () => {
      setIsMobile(window.innerWidth <= 768);
      if (window.innerWidth > 768) setMobileOpen(false);
    };
    const escape = (event) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("resize", resize);
    window.addEventListener("keydown", escape);
    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("keydown", escape);
    };
  }, []);
  const login = async (credentials) => {
    const session = await data("/auth/login", {
      method: "POST",
      body: credentials,
    });
    await loadWorkspace(session.user);
    setAuthError("");
    notify(auth("welcome", { name: session.user.displayName }));
  };
  const logout = () =>
    run(async () => {
      await data("/auth/logout", { method: "POST", body: {} });
      clearSession();
      setAuthError("");
      notify(auth("loggedOut"), "info");
    });
  const navigate = (next, id = null) => {
    setView(next);
    setQueueId(id);
    setFilters(emptyFilters());
    setMobileOpen(false);
  };
  const openIssue = (id) =>
    run(async () => {
      const issue = await data(`/issues/${encodeURIComponent(id)}`);
      setModal({ type: "issue", issue });
    });
  const deleteQueue = (queue) =>
    run(async () => {
      const stats = await data(
        `/issues/stats?queueId=${encodeURIComponent(queue.id)}`,
      );
      setConfirmation({
        title: t("admin.deleteQueue"),
        message: t("admin.deleteQueueConfirm", {
          name: queue.name,
          count: stats.total,
        }),
        onConfirm: async () => {
          await data(`/queues/${encodeURIComponent(queue.id)}`, {
            method: "DELETE",
          });
          if (queueId === queue.id) navigate("all-issues");
          await reload();
          notify(t("toasts.queueDeleted", { key: queue.key }));
        },
      });
    });
  const context = {
    user,
    users,
    queues,
    metadata,
    settings,
    language,
    t,
    auth,
    notify,
    run,
    reload,
    revision,
    setConfirmation,
    openIssue,
    logout,
    setSettings,
  };
  return (
    <TrackerContext.Provider value={context}>
      <div id="login-container" className={user ? "hidden" : undefined}>
        {!user && (
          <Login
            onLogin={login}
            initializing={initializing}
            initialError={authError}
          />
        )}
      </div>
      {user && (
        <div id="app-container">
          {!taskId && (
            <div
              id="app"
              className={`${collapsed && !isMobile ? "sidebar-collapsed" : ""}${mobileOpen ? " sidebar-open" : ""}`}
              onClick={(event) => {
                if (
                  mobileOpen &&
                  !event.target.closest("#sidebar, #hamburgerBtn")
                )
                  setMobileOpen(false);
              }}
            >
              <Sidebar
                view={view}
                queueId={queueId}
                navigate={navigate}
                collapsed={collapsed}
                toggle={() => setCollapsed((value) => !value)}
                createQueue={() => setModal({ type: "queue" })}
                admin={() => setModal({ type: "admin" })}
                deleteQueue={deleteQueue}
              />
              <Topbar
                view={view}
                queueId={queueId}
                toggleMenu={() => setMobileOpen((value) => !value)}
                settings={() => setModal({ type: "settings" })}
                createIssue={() => setModal({ type: "createIssue" })}
              />
              <main id="mainArea">
                <Board
                  view={view}
                  queueId={queueId}
                  filters={filters}
                  setFilters={setFilters}
                />
              </main>
            </div>
          )}
          <div
            id="taskPageView"
            className="task-page-root"
            style={taskId ? { display: "block" } : undefined}
          >
            {taskId && <StandaloneTask taskId={taskId} />}
          </div>
          {modal?.type === "issue" && (
            <IssueDetail
              key={modal.issue.id}
              initialIssue={modal.issue}
              onClose={() => setModal(null)}
            />
          )}
          {modal?.type === "createIssue" && (
            <CreateIssue
              defaultQueueId={view === "queue" ? queueId : ""}
              onClose={() => setModal(null)}
            />
          )}
          {modal?.type === "queue" && (
            <CreateQueue onClose={() => setModal(null)} />
          )}
          {modal?.type === "settings" && (
            <Settings onClose={() => setModal(null)} />
          )}
          {modal?.type === "admin" && user.isAdmin && (
            <AdminPanel
              onClose={() => setModal(null)}
              onEdit={setEditUser}
              onCreate={() => setCreateUser(true)}
            />
          )}
          {editUser && user.isAdmin && (
            <EditName user={editUser} onClose={() => setEditUser(null)} />
          )}
          {createUser && user.isAdmin && (
            <CreateUser onClose={() => setCreateUser(false)} />
          )}
        </div>
      )}
      <div id="toastContainer">
        {toasts.map((toast) => (
          <Toast key={toast.id} {...toast} />
        ))}
      </div>
      {confirmation && (
        <Confirmation {...confirmation} onClose={() => setConfirmation(null)} />
      )}
    </TrackerContext.Provider>
  );
}
