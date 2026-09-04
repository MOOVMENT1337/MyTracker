import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTracker } from "../context";

export const Icon = ({ name, ...props }) => (
  <i className={name} aria-hidden="true" {...props} />
);
export const statusClass = (status) =>
  ({
    Open: "badge-open",
    "In Progress": "badge-inprogress",
    "Need Info": "badge-needinfo",
    Done: "badge-done",
    Closed: "badge-closed",
  })[status] || "badge-open";
export const priorityClass = (priority) => `badge-${priority.toLowerCase()}`;
export const TypeIcon = ({ type }) => (
  <Icon
    name={
      {
        Task: "fa-solid fa-circle-check type-task",
        Bug: "fa-solid fa-bug type-bug",
        Story: "fa-solid fa-bookmark type-story",
        Epic: "fa-solid fa-bolt type-epic",
      }[type]
    }
  />
);
export const PriorityIcon = ({ priority }) => (
  <Icon
    name={
      {
        High: "fa-solid fa-arrow-up prio-high",
        Medium: "fa-solid fa-equals prio-medium",
        Low: "fa-solid fa-arrow-down prio-low",
      }[priority]
    }
  />
);
export function initials(name = "User") {
  const parts = name.trim().split(/\s+/);
  return (
    parts.length === 1 ? parts[0].slice(0, 2) : parts[0][0] + parts.at(-1)[0]
  ).toUpperCase();
}
export function Avatar({ user, size = 28 }) {
  return (
    <span
      className={`avatar${user ? "" : " avatar-empty"}`}
      style={{
        ...(user ? { background: user.avatarColor || "#4F8EF7" } : {}),
        width: size,
        height: size,
        fontSize: Math.floor(size * 0.4),
      }}
      title={user?.displayName}
    >
      {user ? user.initials || user.avatar || initials(user.displayName) : "?"}
    </span>
  );
}
export function formatDateFull(iso) {
  if (!iso) return "—";
  const d = new Date(iso),
    pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
export function useDate() {
  const { t, language } = useTracker();
  return (iso) => {
    if (!iso) return "—";
    const date = new Date(iso),
      days = Math.floor((Date.now() - date) / 86400000);
    return days === 0
      ? t("misc.today")
      : days === 1
        ? t("misc.yesterday")
        : days < 7
          ? t("misc.daysAgo", { count: days })
          : date.toLocaleDateString(language === "ru" ? "ru-RU" : "en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            });
  };
}
export function StatusTimer({ issue }) {
  const { t } = useTracker();
  const [, tick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => tick((value) => value + 1), 60000);
    return () => clearInterval(timer);
  }, []);
  const minutes = Math.max(
    0,
    Math.floor(
      (Date.now() - new Date(issue.statusChangedAt || issue.createdAt)) / 60000,
    ),
  );
  const hours = Math.floor(minutes / 60),
    days = Math.floor(hours / 24);
  const duration =
    minutes < 60
      ? `${minutes}m`
      : hours < 24
        ? `${hours}h ${minutes % 60}m`
        : days < 7
          ? `${days}d ${hours % 24}h`
          : `${days}d`;
  return (
    <>
      <span className={`badge ${statusClass(issue.status)}`}>
        {t(`statuses.${issue.status}`)}
      </span>{" "}
      <span className="task-status-duration">
        <Icon name="fa-regular fa-clock" /> {duration}
      </span>
    </>
  );
}
export function taskUrl(id) {
  const url = new URL(window.location.href);
  if (id) url.searchParams.set("taskId", id);
  else url.searchParams.delete("taskId");
  return url.href;
}

// React owns modal markup. Native listeners only implement focus and Escape, with cleanup.
export function Modal({
  id,
  className = "",
  title,
  icon,
  onClose,
  children,
  header,
  closeId,
  backdropId,
}) {
  const { t } = useTracker();
  const [closing, setClosing] = useState(false);
  const panel = useRef(null),
    closeRef = useRef(onClose);
  closeRef.current = onClose;
  const close = () => setClosing(true);
  useEffect(() => {
    if (!closing) return;
    const timer = setTimeout(() => closeRef.current(), 180);
    return () => clearTimeout(timer);
  }, [closing]);
  useEffect(() => {
    const previous = document.activeElement;
    panel.current
      ?.querySelector("input:not([disabled]),textarea,select,button")
      ?.focus();
    const keydown = (event) => {
      const roots = [
        ...document.querySelectorAll(
          ".modal-root:not(.is-closing), .confirm-overlay",
        ),
      ];
      if (roots.at(-1) !== panel.current?.parentElement) return;
      if (event.key === "Escape") {
        event.preventDefault();
        close();
      }
      if (event.key === "Tab") {
        const controls = [
          ...panel.current.querySelectorAll(
            'button,a,input,select,textarea,[tabindex="0"]',
          ),
        ].filter((el) => !el.disabled && el.getClientRects().length);
        if (!controls.length) return;
        if (event.shiftKey && document.activeElement === controls[0]) {
          event.preventDefault();
          controls.at(-1).focus();
        } else if (
          !event.shiftKey &&
          document.activeElement === controls.at(-1)
        ) {
          event.preventDefault();
          controls[0].focus();
        }
      }
    };
    document.addEventListener("keydown", keydown);
    return () => {
      document.removeEventListener("keydown", keydown);
      if (previous?.isConnected) previous.focus();
    };
  }, []);
  return (
    <div
      id={id}
      className={`modal-root${closing ? " is-closing" : ""}`}
      style={{ display: "block" }}
    >
      <div className="modal-backdrop" id={backdropId} onClick={close} />
      <div
        ref={panel}
        className={`modal-panel ${className}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="modal-header">
          {header || (
            <div className="modal-header-left">
              <Icon name={icon} style={{ color: "var(--color-primary)" }} />
              <strong>{title}</strong>
            </div>
          )}
          <div
            className={id === "issueModal" ? "modal-header-right" : undefined}
          >
            <button
              className="btn btn-ghost btn-icon"
              id={closeId}
              title={t("actions.close")}
              aria-label={t("actions.close")}
              onClick={close}
            >
              <Icon name="fa-solid fa-xmark" />
            </button>
          </div>
        </div>
        {typeof children === "function" ? children(close) : children}
      </div>
    </div>
  );
}
export function Field({ id, label, required, className = "", children }) {
  return (
    <div className={`form-field${className ? ` ${className}` : ""}`}>
      <label className="form-label" htmlFor={id}>
        {label}
        {required && (
          <>
            {" "}
            <span className="required">*</span>
          </>
        )}
      </label>
      {children}
    </div>
  );
}
export function FormError({ message }) {
  return message ? (
    <div className="auth-error" role="alert">
      {message}
    </div>
  ) : null;
}
export function Toast({ message, type, onRemove }) {
  const [closing, setClosing] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setClosing(true), 3000);
    const removal = setTimeout(onRemove, 3300);
    return () => {
      clearTimeout(timer);
      clearTimeout(removal);
    };
  }, [onRemove]);
  return (
    <div
      className={`toast ${type}`}
      role={type === "error" ? "alert" : "status"}
      style={
        closing
          ? {
              opacity: 0,
              transform: "translateY(8px)",
              transition: "opacity .3s, transform .3s",
            }
          : undefined
      }
    >
      <Icon
        name={`fa-solid ${{ success: "fa-circle-check", error: "fa-circle-exclamation", info: "fa-circle-info" }[type]}`}
      />{" "}
      {message}
    </div>
  );
}
export function Confirmation({ title, message, onConfirm, onClose }) {
  const { t, run } = useTracker();
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const listener = (e) => {
      if (e.key === "Escape" && !busy) {
        e.stopImmediatePropagation();
        onClose();
      }
    };
    document.addEventListener("keydown", listener, true);
    return () => document.removeEventListener("keydown", listener, true);
  }, [onClose, busy]);
  return createPortal(
    <div
      className="confirm-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div
        className="confirm-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
      >
        <h3>{title}</h3>
        <p>{message}</p>
        <div className="confirm-actions">
          <button
            className="btn btn-ghost"
            id="confirmCancel"
            disabled={busy}
            onClick={onClose}
          >
            {t("actions.cancel")}
          </button>
          <button
            autoFocus
            className="btn btn-danger"
            id="confirmOk"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              const ok = await run(onConfirm);
              setBusy(false);
              if (ok) onClose();
            }}
          >
            <Icon name="fa-solid fa-check" />
            {t("actions.confirm")}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
