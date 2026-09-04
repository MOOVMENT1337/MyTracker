import { useEffect, useRef, useState } from "react";
import { data } from "../api";
import { errorText, useTracker } from "../context";
import {
  Avatar,
  Field,
  FormError,
  Icon,
  Modal,
  formatDateFull,
  initials,
  priorityClass,
  statusClass,
  taskUrl,
  useDate,
} from "./common";
import { IssueSelects } from "./CreateForms";

function Comments({ issue, setIssue, full }) {
  const { users, user, t, language, notify, reload, run } = useTracker(),
    formatDate = useDate();
  const [text, setText] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const input = useRef(null);
  const refreshComments = async () => {
    const fresh = await data(`/issues/${issue.id}`);
    setIssue((old) => {
      // Own comments advance the version. Do not adopt another editor's version
      // if their issue fields changed while this form still contains a draft.
      const unchanged = [
        "summary",
        "description",
        "status",
        "priority",
        "type",
        "assigneeId",
      ].every((key) => old[key] === fresh[key]);
      return {
        ...old,
        comments: fresh.comments,
        updatedAt: fresh.updatedAt,
        version: unchanged ? fresh.version : old.version,
      };
    });
  };
  const update = async (action) => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (error) {
      setError(errorText(error, language));
    } finally {
      setBusy(false);
    }
  };
  const post = () => {
    if (!text.trim()) {
      input.current?.focus();
      return;
    }
    update(async () => {
      const comment = await data(`/issues/${issue.id}/comments`, {
        method: "POST",
        body: { text: text.trim() },
      });
      setIssue((old) => ({ ...old, comments: [...old.comments, comment] }));
      setText("");
      notify(t("toasts.commentAdded"));
      await refreshComments();
      await run(reload);
    });
  };
  return (
    <div
      className={`comments-section${full ? " task-page-comments-section" : ""}`}
    >
      <div className="comments-header">
        <h3>{t("labels.comments")}</h3>
        <span
          className="comments-count"
          id={full ? "taskPageCommentsCount" : "commentsCount"}
        >
          {issue.comments.length}
        </span>
      </div>
      <div
        className="comments-list"
        id={full ? "taskPageCommentsList" : "commentsList"}
      >
        {!issue.comments.length ? (
          <div className="comment-empty">
            <Icon name="fa-regular fa-comment-dots" /> {t("misc.noCommentsYet")}
          </div>
        ) : (
          issue.comments.map((comment) => {
            const author = users.find((user) => user.id === comment.authorId),
              name = author?.displayName || comment.author || "Unknown";
            return (
              <div
                className="comment-item"
                data-comment-id={comment.id}
                key={comment.id}
              >
                <Avatar
                  user={
                    author || {
                      displayName: name,
                      initials: initials(name),
                      avatarColor: "#9099A8",
                    }
                  }
                  size={32}
                />
                <div className="comment-body">
                  <div className="comment-meta">
                    <strong className="comment-author">{name}</strong>
                    <span className="comment-time">
                      {formatDate(comment.createdAt)}
                    </span>
                    {comment.authorId === user.id && (
                      <button
                        className="comment-delete-btn"
                        data-comment-id={comment.id}
                        title={t("actions.delete")}
                        disabled={busy}
                        onClick={() =>
                          update(async () => {
                            await data(
                              `/issues/${issue.id}/comments/${comment.id}`,
                              { method: "DELETE" },
                            );
                            setIssue((old) => ({
                              ...old,
                              comments: old.comments.filter(
                                (item) => item.id !== comment.id,
                              ),
                            }));
                            notify(t("toasts.commentDeleted"));
                            await refreshComments();
                            await run(reload);
                          })
                        }
                      >
                        <Icon name="fa-solid fa-trash-can" />
                      </button>
                    )}
                  </div>
                  <div className="comment-text">
                    {comment.text.split("\n").map((line, index) => (
                      <span key={index}>
                        {index > 0 && <br />}
                        {line}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
      <FormError message={error} />
      <div className="comment-input-wrap">
        <Avatar user={user} size={32} />
        <div className="comment-input-inner">
          <textarea
            ref={input}
            className="comment-textarea"
            id={full ? "taskPageCommentInput" : "commentInput"}
            rows={3}
            maxLength={10000}
            placeholder={t("fields.writeComment")}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                e.preventDefault();
                post();
              }
            }}
          />
          <div className="comment-actions">
            <button
              className="btn btn-primary btn-sm"
              id={full ? "taskPageAddComment" : "btnPostComment"}
              disabled={busy}
              onClick={post}
            >
              {t("actions.addComment")}
            </button>
            <button
              className="btn btn-ghost btn-sm"
              id={full ? "taskPageClearComment" : "btnClearComment"}
              onClick={() => {
                setText("");
                input.current?.focus();
              }}
            >
              {t("actions.cancel")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function IssueEditor({ initialIssue, full = false, close }) {
  const { users, queues, t, language, run, reload, notify, setConfirmation } =
    useTracker();
  const [issue, setIssue] = useState(initialIssue);
  const [form, setForm] = useState(() => ({
    summary: initialIssue.summary,
    description: initialIssue.description || "",
    status: initialIssue.status,
    priority: initialIssue.priority,
    type: initialIssue.type,
    assigneeId: initialIssue.assigneeId || "",
  }));
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const queue = queues.find((item) => item.id === issue.queueId),
    reporter = users.find((item) => item.id === issue.reporterId);
  const summaryId = full ? "taskPageSummary" : "summaryField",
    descriptionId = full ? "taskPageDescription" : "descriptionField";
  const save = async () => {
    if (busy) return;
    if (!form.summary.trim()) {
      setError(t("errors.summaryCannotBeEmpty"));
      document.getElementById(summaryId).focus();
      return;
    }
    setBusy(true);
    setError("");
    try {
      const saved = await data(`/issues/${issue.id}`, {
        method: "PATCH",
        body: {
          ...form,
          summary: form.summary.trim(),
          assigneeId: form.assigneeId || null,
          version: issue.version,
        },
      });
      setIssue(saved);
      setForm((old) => ({ ...old, summary: saved.summary }));
      if (!full) close();
      notify(t("toasts.issueSaved"));
      await run(reload);
    } catch (error) {
      setError(errorText(error, language));
    } finally {
      setBusy(false);
    }
  };
  const deleteIssue = () =>
    setConfirmation({
      title: t("confirm.deleteTitle"),
      message: t("confirm.deleteWithName", {
        key: issue.key,
        summary: issue.summary,
      }),
      onConfirm: async () => {
        await data(`/issues/${issue.id}`, { method: "DELETE" });
        if (full) window.location.assign(taskUrl());
        else close();
        notify(t("toasts.issueDeleted", { key: issue.key }));
        await run(reload);
      },
    });
  const summary = (
    <Field
      className={full ? "task-page-span-full" : "issue-modal-full"}
      id={summaryId}
      label={t("labels.summary")}
    >
      <input
        type="text"
        className="form-input issue-summary-input"
        id={summaryId}
        value={form.summary}
        maxLength={500}
        onChange={(e) =>
          setForm((old) => ({ ...old, summary: e.target.value }))
        }
      />
    </Field>
  );
  const meta = (
    <div
      className={
        full ? "task-page-meta task-page-span-full" : "issue-meta-inline"
      }
    >
      {[
        ["queue", queue?.name || "—"],
        ["reporter", reporter?.displayName || "—"],
        ["created", formatDateFull(issue.createdAt)],
        ["updated", formatDateFull(issue.updatedAt)],
      ].map(([name, value]) => (
        <div className="meta-inline-block" key={name}>
          <span className="meta-label">{t(`labels.${name}`)}</span>
          <span
            className="meta-inline-value"
            id={
              name === "updated"
                ? full
                  ? "taskPageUpdated"
                  : "metaUpdated"
                : undefined
            }
          >
            {value}
          </span>
        </div>
      ))}
    </div>
  );
  const fields = (
    <>
      {full && summary}
      <Field
        className={full ? "task-page-span-full" : "issue-modal-full"}
        id={descriptionId}
        label={t("labels.description")}
      >
        <textarea
          className="form-textarea issue-description-input"
          id={descriptionId}
          rows={full ? 7 : 5}
          placeholder={
            full ? undefined : t("fields.issueDescriptionPlaceholder")
          }
          maxLength={50000}
          value={form.description}
          onChange={(e) =>
            setForm((old) => ({ ...old, description: e.target.value }))
          }
        />
      </Field>
      <IssueSelects
        form={form}
        setForm={setForm}
        ids={
          full
            ? {
                status: "taskPageStatus",
                priority: "taskPagePriority",
                type: "taskPageType",
                assigneeId: "taskPageAssignee",
              }
            : {
                status: "statusSelect",
                priority: "prioritySelect",
                type: "typeSelect",
                assigneeId: "assigneeSelect",
              }
        }
      />
      {full ? meta : <div className="form-field issue-modal-full">{meta}</div>}
    </>
  );
  return (
    <>
      {full ? (
        <div className="task-page-title-row">
          <div>
            <div className="task-page-key">{issue.key}</div>
            <h1 className="task-page-title">{issue.summary}</h1>
          </div>
          <div className="task-page-badges">
            <span className={`badge ${statusClass(issue.status)}`}>
              {t(`statuses.${issue.status}`)}
            </span>
            <span className={`badge ${priorityClass(issue.priority)}`}>
              {t(`priorities.${issue.priority}`)}
            </span>
          </div>
        </div>
      ) : (
        <button
          className="task-open-full-link"
          id="openFullTaskLink"
          type="button"
          onClick={() =>
            window.open(taskUrl(issue.id), "_blank", "noopener,noreferrer")
          }
        >
          <span className="task-open-full-link-text">
            <strong>{issue.key}</strong>
            <span>{issue.summary}</span>
            <small>{t("misc.openFullPage")}</small>
          </span>
          <Icon name="fa-solid fa-up-right-from-square" />
        </button>
      )}
      <FormError message={error} />
      {!full && summary}
      <div className={full ? "task-page-grid" : "issue-modal-grid"}>
        {fields}
      </div>
      <Comments issue={issue} setIssue={setIssue} full={full} />
      <div className={full ? "task-page-actions" : "issue-modal-actions"}>
        <button
          className="btn btn-danger"
          id={full ? "taskPageDelete" : "btnDeleteIssue"}
          disabled={busy}
          onClick={deleteIssue}
        >
          <Icon name="fa-solid fa-trash" />
          {t("actions.delete")}
        </button>
        <div
          className={
            full ? "task-page-actions-right" : "issue-modal-actions-right"
          }
        >
          {full ? (
            <a className="btn btn-ghost" href={taskUrl()}>
              {t("misc.backToBoard")}
            </a>
          ) : (
            <button
              className="btn btn-ghost"
              id="btnCancelModal"
              onClick={close}
            >
              {t("actions.cancel")}
            </button>
          )}
          <button
            className="btn btn-primary"
            id={full ? "taskPageSave" : "btnSaveIssue"}
            disabled={busy}
            onClick={save}
          >
            <Icon name="fa-solid fa-floppy-disk" />
            {t("actions.save")}
          </button>
        </div>
      </div>
    </>
  );
}

export function IssueDetail({ initialIssue, onClose }) {
  const { queues } = useTracker(),
    queue = queues.find((item) => item.id === initialIssue.queueId);
  return (
    <Modal
      id="issueModal"
      className="issue-modal-panel"
      title={initialIssue.summary}
      closeId="btnCloseModal"
      backdropId="modalBackdrop"
      onClose={onClose}
      header={
        <div className="modal-header-left">
          <span
            className="modal-queue-badge"
            style={{
              background: `${queue?.color || "#999"}20`,
              color: queue?.color || "#999",
            }}
          >
            {queue?.key || "?"}
          </span>
          <span className="modal-key">{initialIssue.key}</span>
        </div>
      }
    >
      {(close) => (
        <div className="modal-body issue-modal-body">
          <IssueEditor initialIssue={initialIssue} close={close} />
        </div>
      )}
    </Modal>
  );
}
export function StandaloneTask({ taskId }) {
  const { t, language } = useTracker();
  const [issue, setIssue] = useState(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    data(`/issues/${encodeURIComponent(taskId)}`, { signal: controller.signal })
      .then(setIssue)
      .catch((error) => {
        if (error.name !== "AbortError" && error.status !== 404)
          setError(errorText(error, language));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [taskId, retry]);
  const back = (
    <div className="task-page-header-row">
      <a className="task-page-back" href={taskUrl()}>
        <Icon name="fa-solid fa-arrow-left" />
        {t("misc.backToBoard")}
      </a>
    </div>
  );
  if (!issue)
    return (
      <div className="task-page-shell task-page-shell-empty">
        <div className="task-page-card task-page-empty-card">
          {back}
          {error ? (
            <>
              <FormError message={error} />
              <button
                className="btn btn-ghost"
                onClick={() => setRetry((value) => value + 1)}
              >
                {language === "ru" ? "Повторить" : "Retry"}
              </button>
            </>
          ) : (
            !loading && (
              <div className="empty-state">
                <Icon name="fa-solid fa-file-circle-xmark empty-state-icon" />
                <h3>{t("misc.taskNotFound")}</h3>
                <p>{t("misc.taskNotFoundDesc")}</p>
              </div>
            )
          )}
        </div>
      </div>
    );
  return (
    <div className="task-page-shell">
      {back}
      <div className="task-page-card">
        <IssueEditor key={issue.id} initialIssue={issue} full />
      </div>
    </div>
  );
}
