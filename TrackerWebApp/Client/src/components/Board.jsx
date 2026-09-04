import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { data, list, queryString } from "../api";
import { errorText, useTracker } from "../context";
import {
  Avatar,
  FormError,
  Icon,
  PriorityIcon,
  StatusTimer,
  TypeIcon,
  priorityClass,
  statusClass,
  useDate,
} from "./common";

function Filters({ filters, setFilters }) {
  const { users, metadata, t } = useTracker();
  const [open, setOpen] = useState(null);
  useEffect(() => {
    const outside = (e) => {
      if (!e.target.closest(".filter-dropdown-wrap")) setOpen(null);
    };
    const escape = (e) => {
      if (e.key === "Escape") setOpen(null);
    };
    document.addEventListener("click", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("click", outside);
      document.removeEventListener("keydown", escape);
    };
  }, []);
  const toggle = (key, value) =>
    setFilters((old) => ({
      ...old,
      [key]: old[key].includes(value)
        ? old[key].filter((item) => item !== value)
        : [...old[key], value],
    }));
  const active =
    filters.search ||
    filters.status.length ||
    filters.priority.length ||
    filters.assigneeId;
  return (
    <div className="filter-toolbar">
      <div className="search-wrap">
        <Icon name="fa-solid fa-magnifying-glass search-icon" />
        <input
          type="text"
          className="search-input"
          id="searchInput"
          placeholder={t("fields.searchPlaceholder")}
          value={filters.search}
          maxLength={200}
          onChange={(e) =>
            setFilters((old) => ({ ...old, search: e.target.value }))
          }
        />
        {filters.search && (
          <button
            className="search-clear"
            id="searchClear"
            aria-label={t("actions.resetFilters")}
            onClick={() => setFilters((old) => ({ ...old, search: "" }))}
          >
            <Icon name="fa-solid fa-xmark" />
          </button>
        )}
      </div>
      <div className="filter-group">
        {["status", "priority", "assignee"].map((key) => {
          const count =
            key === "assignee"
              ? Number(!!filters.assigneeId)
              : filters[key].length;
          return (
            <div className="filter-dropdown-wrap" key={key}>
              <button
                className={`filter-btn ${count ? "active" : ""}`}
                id={`${key}FilterBtn`}
                aria-expanded={open === key}
                onClick={() => setOpen((value) => (value === key ? null : key))}
              >
                <Icon
                  name={
                    {
                      status: "fa-solid fa-circle-half-stroke",
                      priority: "fa-solid fa-flag",
                      assignee: "fa-solid fa-user",
                    }[key]
                  }
                />
                {t(`filters.${key}`)} {count ? `(${count})` : ""}
                <Icon name="fa-solid fa-chevron-down" />
              </button>
              <div
                className={`filter-dropdown ${open === key ? "open" : ""}`}
                id={`${key}Dropdown`}
              >
                <div className="filter-dropdown-header">
                  {t(`filters.filterBy${key[0].toUpperCase() + key.slice(1)}`)}
                </div>
                {key === "assignee" ? (
                  <>
                    <label className="filter-check-item">
                      <input
                        type="radio"
                        name="assignee"
                        value=""
                        checked={!filters.assigneeId}
                        onChange={() =>
                          setFilters((old) => ({ ...old, assigneeId: "" }))
                        }
                      />
                      <span>{t("fields.anyAssignee")}</span>
                    </label>
                    {users.map((user) => (
                      <label className="filter-check-item" key={user.id}>
                        <input
                          type="radio"
                          name="assignee"
                          value={user.id}
                          checked={filters.assigneeId === user.id}
                          onChange={() =>
                            setFilters((old) => ({
                              ...old,
                              assigneeId: user.id,
                            }))
                          }
                        />
                        <Avatar user={user} size={20} />
                        <span>{user.displayName}</span>
                      </label>
                    ))}
                  </>
                ) : (
                  metadata[key === "status" ? "statuses" : "priorities"].map(
                    (value) => (
                      <label className="filter-check-item" key={value}>
                        <input
                          type="checkbox"
                          name={key}
                          value={value}
                          checked={filters[key].includes(value)}
                          onChange={() => toggle(key, value)}
                        />
                        {key === "priority" && (
                          <PriorityIcon priority={value} />
                        )}
                        <span
                          className={`badge ${key === "status" ? statusClass(value) : priorityClass(value)}`}
                        >
                          {t(
                            `${key === "status" ? "statuses" : "priorities"}.${value}`,
                          )}
                        </span>
                      </label>
                    ),
                  )
                )}
              </div>
            </div>
          );
        })}
      </div>
      {!!active && (
        <button
          className="btn btn-ghost reset-filters-btn"
          id="resetFilters"
          onClick={() => {
            setFilters({
              search: "",
              status: [],
              priority: [],
              assigneeId: "",
            });
            setOpen(null);
          }}
        >
          <Icon name="fa-solid fa-xmark" />
          {t("actions.resetFilters")}
        </button>
      )}
    </div>
  );
}

function TaskCard({
  issue,
  className = "",
  style,
  onClick,
  onMouseDown,
  ghost,
}) {
  const { users, t } = useTracker(),
    formatDate = useDate();
  const assignee = users.find((user) => user.id === issue.assigneeId),
    commentCount = issue.comments?.length || 0;
  return (
    <article
      className={`task-card${className ? ` ${className}` : ""}`}
      style={style}
      data-issue-id={issue.id}
      tabIndex={ghost ? undefined : 0}
      role={ghost ? undefined : "button"}
      aria-label={`${issue.key} ${issue.summary}`}
      aria-hidden={ghost || undefined}
      onClick={onClick}
      onMouseDown={onMouseDown}
      onKeyDown={(e) => {
        if (["Enter", " "].includes(e.key)) {
          e.preventDefault();
          onClick?.(e);
        }
      }}
    >
      <div className="task-card-top">
        <span className="task-key">{issue.key}</span>
        <span className={`badge ${priorityClass(issue.priority)}`}>
          {t(`priorities.${issue.priority}`)}
        </span>
      </div>
      <div className="task-summary" title={issue.summary}>
        {issue.summary}
      </div>
      <div className="task-meta">
        <span className="task-type">
          <TypeIcon type={issue.type} /> <span>{t(`types.${issue.type}`)}</span>
        </span>
        <span className="task-updated">{formatDate(issue.updatedAt)}</span>
      </div>
      <div
        className="task-status-timer"
        data-issue-id={issue.id}
        data-status={issue.status}
        data-status-changed-at={issue.statusChangedAt || issue.createdAt}
      >
        <StatusTimer issue={issue} />
      </div>
      <div className="task-card-footer">
        <div className="task-assignee">
          <Avatar user={assignee} />
          <span className="task-assignee-name">
            {assignee?.displayName || t("fields.unassigned")}
          </span>
        </div>
        {!!commentCount && (
          <span className="task-comments">
            <Icon name="fa-regular fa-comment" /> {commentCount}
          </span>
        )}
      </div>
    </article>
  );
}

function Kanban({ issues }) {
  const { metadata, queues, t, openIssue, run, reload, notify } = useTracker();
  const [drag, setDrag] = useState(null),
    [entering, setEntering] = useState(true);
  const dragRef = useRef(null),
    preventClick = useRef(false),
    cleanup = useRef(() => {}),
    resetTimer = useRef(null);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setEntering(false));
    return () => cancelAnimationFrame(frame);
  }, []);
  useEffect(
    () => () => {
      cleanup.current();
      clearTimeout(resetTimer.current);
      document.body.classList.remove("dragging-card");
    },
    [],
  );
  const start = (event, issue) => {
    if (
      event.button !== 0 ||
      event.target.closest("button,input,select,textarea,a,label")
    )
      return;
    cleanup.current();
    const rect = event.currentTarget.getBoundingClientRect();
    dragRef.current = {
      issue,
      startX: event.clientX,
      startY: event.clientY,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      width: rect.width,
      started: false,
    };
    const columnAt = (e) =>
      document
        .elementsFromPoint(e.clientX, e.clientY)
        .find((node) => node.classList.contains("kanban-column"))?.dataset
        .status;
    const move = (e) => {
      const current = dragRef.current;
      if (
        !current ||
        (!current.started &&
          Math.hypot(e.clientX - current.startX, e.clientY - current.startY) <
            6)
      )
        return;
      current.started = true;
      preventClick.current = true;
      document.body.classList.add("dragging-card");
      current.status = columnAt(e);
      setDrag({
        ...current,
        x: e.clientX - current.offsetX,
        y: e.clientY - current.offsetY,
      });
      e.preventDefault();
    };
    const cancel = () => {
      cleanup.current();
      setDrag(null);
      dragRef.current = null;
      document.body.classList.remove("dragging-card");
    };
    const up = (e) => {
      const current = dragRef.current,
        status = columnAt(e) || current?.status;
      cancel();
      if (current?.started && status && status !== issue.status)
        run(async () => {
          await data(`/issues/${issue.id}`, {
            method: "PATCH",
            body: { status, version: issue.version },
          });
          await reload();
          notify(
            t("toasts.statusChanged", { status: t(`statuses.${status}`) }),
          );
        });
      resetTimer.current = setTimeout(() => {
        preventClick.current = false;
      }, 80);
    };
    const escape = (e) => {
      if (e.key === "Escape") {
        cancel();
        preventClick.current = false;
      }
    };
    cleanup.current = () => {
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", up);
      document.removeEventListener("keydown", escape);
      window.removeEventListener("blur", cancel);
    };
    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", up);
    document.addEventListener("keydown", escape);
    window.addEventListener("blur", cancel);
  };
  if (!queues.length)
    return (
      <div className="empty-state">
        <Icon name="fa-solid fa-folder-open empty-state-icon" />
        <p>{t("misc.noQueuesCreateOne")}</p>
      </div>
    );
  return (
    <>
      <div className={`kanban-board${entering ? " board-entering" : ""}`}>
        {metadata.statuses.map((status) => {
          const items = issues.filter((issue) => issue.status === status);
          return (
            <section
              className={`kanban-column${drag?.status === status ? " drag-over" : ""}`}
              data-status={status}
              key={status}
            >
              <div className="kanban-column-header">
                <div className="kanban-column-title-wrap">
                  <span className="kanban-column-title">
                    {t(`statuses.${status}`)}
                  </span>
                </div>
                <span className="kanban-count">{items.length}</span>
              </div>
              <div className="kanban-column-body">
                {!items.length ? (
                  <div className="kanban-empty">{t("misc.noIssues")}</div>
                ) : (
                  items.map((issue) => (
                    <TaskCard
                      key={issue.id}
                      issue={issue}
                      className={drag?.issue.id === issue.id ? "dragging" : ""}
                      onMouseDown={(e) => start(e, issue)}
                      onClick={(e) => {
                        if (preventClick.current) {
                          e.preventDefault();
                          return;
                        }
                        openIssue(issue.id);
                      }}
                    />
                  ))
                )}
              </div>
            </section>
          );
        })}
      </div>
      {drag &&
        createPortal(
          <TaskCard
            issue={drag.issue}
            ghost
            className="task-drag-ghost"
            style={{
              width: drag.width,
              transform: `translate(${drag.x}px, ${drag.y}px)`,
            }}
          />,
          document.body,
        )}
    </>
  );
}

export default function Board({ view, queueId, filters, setFilters }) {
  const { user, revision, metadata, t, language } = useTracker(),
    formatDate = useDate();
  const [issues, setIssues] = useState([]),
    [stats, setStats] = useState(null),
    [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(false),
    [error, setError] = useState(""),
    [retry, setRetry] = useState(0);
  const query = queryString({
    ...filters,
    queueId: view === "queue" ? queueId : undefined,
    myTasks: view === "my-tasks",
  });
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    const timer = setTimeout(
      async () => {
        try {
          if (view === "activity") {
            const entries = await data("/activity?limit=20", {
              signal: controller.signal,
            });
            setActivity(entries);
          } else {
            const params = Object.fromEntries(new URLSearchParams(query));
            params.status = new URLSearchParams(query).getAll("status");
            params.priority = new URLSearchParams(query).getAll("priority");
            const [items, counts] = await Promise.all([
              list("/issues", params, controller.signal),
              data(`/issues/stats?${query}`, { signal: controller.signal }),
            ]);
            if (controller.signal.aborted) return;
            setIssues(items);
            setStats(counts);
          }
        } catch (error) {
          if (error.name !== "AbortError") setError(errorText(error, language));
        } finally {
          if (!controller.signal.aborted) setLoading(false);
        }
      },
      filters.search ? 250 : 90,
    );
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, view, revision, user.id, retry]);
  return (
    <>
      <div id="filterToolbar">
        {view !== "activity" && (
          <Filters filters={filters} setFilters={setFilters} />
        )}
      </div>
      <div id="statsSummary">
        {view !== "activity" && (
          <div className="stats-bar">
            {metadata.statuses.map((status) => (
              <div className="stat-item" key={status}>
                <span className={`badge ${statusClass(status)}`}>
                  {t(`statuses.${status}`)}
                </span>
                <span className="stat-count">
                  {stats?.byStatus[status] || 0}
                </span>
              </div>
            ))}
            <div className="stat-item stat-total">
              <span>{t("misc.total")}</span>
              <span className="stat-count">{stats?.total || 0}</span>
            </div>
          </div>
        )}
      </div>
      <div
        id="issueBoardContainer"
        className={loading ? "board-refreshing" : undefined}
        aria-busy={loading}
      >
        {error && (
          <>
            <FormError message={error} />
            <button
              className="btn btn-ghost"
              onClick={() => setRetry((value) => value + 1)}
            >
              {language === "ru" ? "Повторить" : "Retry"}
            </button>
          </>
        )}
        {view === "activity" ? (
          <div className="activity-log-panel">
            <div className="activity-log-title">
              <Icon name="fa-solid fa-clock-rotate-left" />
              {t("misc.recentActivity")}
            </div>
            {!activity.length ? (
              <div className="empty-state">
                <Icon name="fa-solid fa-inbox empty-state-icon" />
                <p>{t("misc.noActivityYet")}</p>
              </div>
            ) : (
              <div className="activity-list">
                {activity.map((entry) => (
                  <div className="activity-entry" key={entry.id}>
                    <span className="activity-dot" />
                    <div className="activity-content">
                      <span className="activity-msg">{entry.msg}</span>
                      <span className="activity-time">
                        {formatDate(entry.time)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <Kanban issues={issues} />
        )}
      </div>
    </>
  );
}
