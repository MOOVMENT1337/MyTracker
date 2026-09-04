import { useState } from "react";
import { data } from "../api";
import { errorText, useTracker } from "../context";
import { Field, FormError, Icon, Modal } from "./common";

export function IssueSelects({ form, setForm, ids }) {
  const { metadata, users, t } = useTracker();
  const selects = {
    status: metadata.statuses.map((value) => [value, t(`statuses.${value}`)]),
    priority: metadata.priorities.map((value) => [
      value,
      t(`priorities.${value}`),
    ]),
    type: metadata.types.map((value) => [value, t(`types.${value}`)]),
    assigneeId: [
      ["", t("fields.unassigned")],
      ...users.map((user) => [user.id, user.displayName]),
    ],
  };
  return Object.entries(ids).map(([name, id]) => (
    <Field
      key={name}
      id={id}
      label={t(`labels.${name === "assigneeId" ? "assignee" : name}`)}
    >
      <select
        className="form-select"
        id={id}
        value={form[name] || ""}
        onChange={(e) => setForm((old) => ({ ...old, [name]: e.target.value }))}
      >
        {selects[name].map(([value, label]) => (
          <option value={value} key={value}>
            {label}
          </option>
        ))}
      </select>
    </Field>
  ));
}

export function CreateIssue({ defaultQueueId, onClose }) {
  const { queues, t, language, reload, notify, run } = useTracker();
  const [form, setForm] = useState({
    queueId: defaultQueueId || "",
    summary: "",
    description: "",
    type: "Task",
    priority: "Medium",
    assigneeId: "",
    status: "Open",
  });
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const queue = queues.find((queue) => queue.id === form.queueId);
  const update = (name) => (e) =>
    setForm((old) => ({ ...old, [name]: e.target.value }));
  const submit = async (event, close) => {
    event.preventDefault();
    if (busy) return;
    if (!form.queueId) {
      setError(t("errors.queueRequired"));
      document.getElementById("createQueue").focus();
      return;
    }
    if (!form.summary.trim()) {
      setError(t("errors.summaryRequired"));
      document.getElementById("createSummary").focus();
      return;
    }
    setBusy(true);
    setError("");
    try {
      const issue = await data("/issues", {
        method: "POST",
        body: {
          ...form,
          summary: form.summary.trim(),
          assigneeId: form.assigneeId || null,
        },
      });
      close();
      notify(t("toasts.issueCreated", { key: issue.key }));
      await run(reload);
    } catch (error) {
      setError(errorText(error, language));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      id="createIssueModal"
      className="modal-panel-create"
      title={t("createIssue.title")}
      icon="fa-solid fa-circle-plus"
      closeId="btnCloseCreateModal"
      backdropId="createModalBackdrop"
      onClose={onClose}
    >
      {(close) => (
        <div className="modal-body-create">
          <form
            className="create-form"
            noValidate
            onSubmit={(event) => submit(event, close)}
          >
            <FormError message={error} />
            <Field id="createQueue" label={t("labels.queue")} required>
              <select
                className="form-select"
                id="createQueue"
                required
                value={form.queueId}
                onChange={update("queueId")}
              >
                <option value="">{t("fields.selectQueue")}</option>
                {queues.map((queue) => (
                  <option key={queue.id} value={queue.id}>
                    {queue.name} ({queue.key})
                  </option>
                ))}
              </select>
            </Field>
            <Field id="createSummary" label={t("labels.summary")} required>
              <input
                type="text"
                className="form-input"
                id="createSummary"
                placeholder={t("fields.issueSummaryPlaceholder")}
                maxLength={255}
                value={form.summary}
                onChange={update("summary")}
              />
            </Field>
            <Field id="createDescription" label={t("labels.description")}>
              <textarea
                className="form-textarea"
                id="createDescription"
                placeholder={t("fields.issueDescriptionPlaceholder")}
                rows={4}
                maxLength={50000}
                value={form.description}
                onChange={update("description")}
              />
            </Field>
            <div className="form-row">
              <IssueSelects
                form={form}
                setForm={setForm}
                ids={{ type: "createType", priority: "createPriority" }}
              />
            </div>
            <div className="form-row">
              <IssueSelects
                form={form}
                setForm={setForm}
                ids={{ assigneeId: "createAssignee", status: "createStatus" }}
              />
            </div>
            <div
              className="form-field"
              id="newKeyPreview"
              style={{ display: queue ? "flex" : "none" }}
            >
              <div className="key-preview">
                <Icon name="fa-solid fa-key" />
                {t("misc.keyWillBe")}{" "}
                <strong id="keyPreviewText">
                  {queue ? `${queue.key}-${queue.counter + 1}` : ""}
                </strong>
              </div>
            </div>
            <div className="form-actions">
              <button
                type="submit"
                className="btn btn-primary"
                id="btnSubmitCreate"
                disabled={busy}
              >
                <Icon name="fa-solid fa-plus" />
                {t("actions.createIssue")}
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                id="btnCancelCreate"
                onClick={close}
              >
                {t("actions.cancel")}
              </button>
            </div>
          </form>
        </div>
      )}
    </Modal>
  );
}

export function CreateQueue({ onClose }) {
  const { queues, t, language, notify, reload, run } = useTracker();
  const [name, setName] = useState(""),
    [key, setKey] = useState(""),
    [color, setColor] = useState("#4F8EF7");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const colors = [
    "#4F8EF7",
    "#E06C75",
    "#98C379",
    "#E5C07B",
    "#C678DD",
    "#56B6C2",
    "#D19A66",
  ];
  const submit = async (event, close) => {
    event.preventDefault();
    if (busy) return;
    if (!name.trim()) {
      setError(t("errors.queueNameRequired"));
      document.getElementById("queueName").focus();
      return;
    }
    if (!/^[A-Z]{1,10}$/.test(key)) {
      setError(t("errors.queueKeyLettersOnly"));
      document.getElementById("queueKey").focus();
      return;
    }
    if (queues.some((queue) => queue.key === key)) {
      setError(t("errors.queueKeyExists", { key }));
      return;
    }
    setBusy(true);
    setError("");
    try {
      const queue = await data("/queues", {
        method: "POST",
        body: { name: name.trim(), key, color },
      });
      close();
      notify(t("toasts.queueCreated", { name: queue.name }));
      await run(reload);
    } catch (error) {
      setError(errorText(error, language));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      id="createQueueModal"
      className="modal-panel-small"
      title={t("createQueue.title")}
      icon="fa-solid fa-folder-plus"
      closeId="btnCloseQueueModal"
      backdropId="queueModalBackdrop"
      onClose={onClose}
    >
      {(close) => (
        <div className="modal-body-create">
          <form
            className="create-form"
            noValidate
            onSubmit={(e) => submit(e, close)}
          >
            <FormError message={error} />
            <Field id="queueName" label={t("labels.queueName")} required>
              <input
                type="text"
                className="form-input"
                id="queueName"
                placeholder="e.g. Mobile App"
                maxLength={60}
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  const words = e.target.value
                    .trim()
                    .split(/\s+/)
                    .filter(Boolean);
                  setKey(
                    (words.length >= 2
                      ? words
                          .map((word) => word[0])
                          .join("")
                          .slice(0, 6)
                      : words[0]?.slice(0, 5) || ""
                    ).toUpperCase(),
                  );
                }}
              />
            </Field>
            <Field id="queueKey" label={t("labels.queueKey")} required>
              <input
                type="text"
                className="form-input"
                id="queueKey"
                placeholder="e.g. MOB"
                maxLength={10}
                style={{ textTransform: "uppercase" }}
                value={key}
                onChange={(e) =>
                  setKey(e.target.value.toUpperCase().replace(/[^A-Z]/g, ""))
                }
              />
              <small className="form-hint">{t("createQueue.keyHint")}</small>
            </Field>
            <Field label={t("labels.color")}>
              <div className="color-picker" id="colorPicker">
                {colors.map((item) => (
                  <button
                    type="button"
                    key={item}
                    className={`color-swatch ${color === item ? "selected" : ""}`}
                    data-color={item}
                    style={{ background: item }}
                    title={item}
                    aria-label={item}
                    aria-pressed={color === item}
                    onClick={() => setColor(item)}
                  />
                ))}
              </div>
            </Field>
            <div className="form-actions">
              <button
                type="submit"
                className="btn btn-primary"
                id="btnSubmitQueue"
                disabled={busy}
              >
                <Icon name="fa-solid fa-plus" />
                {t("actions.createQueue")}
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                id="btnCancelQueue"
                onClick={close}
              >
                {t("actions.cancel")}
              </button>
            </div>
          </form>
        </div>
      )}
    </Modal>
  );
}
