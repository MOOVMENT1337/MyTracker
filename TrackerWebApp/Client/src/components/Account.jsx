import { useState } from "react";
import { data } from "../api";
import { errorText, useTracker } from "../context";
import { Avatar, Field, FormError, Icon, Modal } from "./common";

export function Settings({ onClose }) {
  const { user, t, auth, settings, setSettings, logout, language } =
    useTracker();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const change = async (name, value) => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      setSettings(
        await data("/settings", { method: "PATCH", body: { [name]: value } }),
      );
    } catch (error) {
      setError(errorText(error, language));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      id="settingsModal"
      className="modal-panel-small settings-modal-panel"
      title={t("settings.title")}
      icon="fa-solid fa-gear"
      closeId="btnCloseSettingsModal"
      backdropId="settingsModalBackdrop"
      onClose={onClose}
    >
      {(close) => (
        <div className="modal-body-create">
          <FormError message={error} />
          <div className="settings-sections">
            <div className="settings-section settings-account-section">
              <div className="form-label">{auth("account")}</div>
              <div className="settings-account">
                <Avatar user={user} size={40} />
                <div className="settings-account-info">
                  <strong>{user.displayName}</strong>
                  <span>{user.email}</span>
                  <small>
                    {t(`roles.${user.role}`).replace(/^roles\./, "")}
                  </small>
                </div>
              </div>
            </div>
            {["theme", "language"].map((name) => (
              <div className="settings-section" key={name}>
                <div className="form-label">{t(`labels.${name}`)}</div>
                {(name === "theme"
                  ? [
                      ["light", "light"],
                      ["dark", "dark"],
                    ]
                  : [
                      ["en", "english"],
                      ["ru", "russian"],
                    ]
                ).map(([value, label]) => (
                  <label className="settings-option" key={value}>
                    <input
                      type="radio"
                      name={`${name}Setting`}
                      value={value}
                      checked={settings[name] === value}
                      disabled={busy}
                      onChange={() => change(name, value)}
                    />
                    <span>{t(`settings.${label}`)}</span>
                  </label>
                ))}
              </div>
            ))}
          </div>
          <div className="form-actions settings-actions">
            <button
              className="btn btn-danger"
              id="btnLogoutSettings"
              onClick={logout}
            >
              <Icon name="fa-solid fa-right-from-bracket" />
              {auth("logout")}
            </button>
            <button
              className="btn btn-ghost"
              id="btnCloseSettingsAction"
              onClick={close}
            >
              {t("actions.close")}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

const predefinedRoles = [
  "Analyst",
  "Tester",
  "Frontend Developer",
  "Backend Developer",
  "Fullstack Developer",
  "DevOps Engineer",
  "Project Manager",
  "Designer",
  "System Administrator",
  "Employee",
];
function AdminRow({ account, onEdit }) {
  const { user, t, language, reload, notify, run } = useTracker();
  const [mode, setMode] = useState(
    predefinedRoles.includes(account.role) ? "predefined" : "custom",
  );
  const [selected, setSelected] = useState(
    predefinedRoles.includes(account.role) ? account.role : predefinedRoles[0],
  );
  const [custom, setCustom] = useState(
    predefinedRoles.includes(account.role) ? "" : account.role,
  );
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const locked = account.id === user.id;
  const save = async () => {
    if (busy) return;
    const role = (mode === "custom" ? custom : selected).trim();
    if (!role) {
      setError(t("errors.customRoleRequired"));
      return;
    }
    setBusy(true);
    setError("");
    try {
      await data(`/users/${account.id}`, { method: "PATCH", body: { role } });
      notify(t("toasts.roleUpdated", { name: account.displayName }));
      await run(reload);
    } catch (error) {
      setError(errorText(error, language));
    } finally {
      setBusy(false);
    }
  };
  return (
    <tr data-user-id={account.id}>
      <td>
        <div className="admin-user-cell">
          <Avatar user={account} size={32} />
          <div>
            <strong>{account.displayName}</strong>
            {account.isAdmin && <small>{t("roles.Administrator")}</small>}
          </div>
        </div>
      </td>
      <td>{account.email}</td>
      <td>
        <span className="admin-role-current">
          {t(`roles.${account.role}`).replace(/^roles\./, "")}
        </span>
      </td>
      <td>
        <div className="admin-actions-stack">
          <button
            className="btn btn-ghost btn-sm admin-edit-name"
            data-user-id={account.id}
            onClick={() => onEdit(account)}
          >
            <Icon name="fa-solid fa-pen" />
            {t("admin.editName")}
          </button>
        </div>
        {locked ? (
          <span className="admin-self-note">{t("admin.currentAdmin")}</span>
        ) : (
          <div className="admin-role-editor">
            <div className="admin-role-mode">
              {["predefined", "custom"].map((value) => (
                <label key={value}>
                  <input
                    type="radio"
                    name={`roleMode_${account.id}`}
                    value={value}
                    checked={mode === value}
                    onChange={() => setMode(value)}
                  />
                  <span>
                    {t(
                      value === "predefined"
                        ? "admin.predefinedRoles"
                        : "admin.customRole",
                    )}
                  </span>
                </label>
              ))}
            </div>
            <div className="admin-role-inputs">
              <select
                className="form-select admin-role-select"
                data-user-id={account.id}
                disabled={mode !== "predefined" || busy}
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
              >
                {predefinedRoles.map((role) => (
                  <option value={role} key={role}>
                    {t(`roles.${role}`)}
                  </option>
                ))}
              </select>
              <input
                className="form-input admin-custom-role-input"
                data-user-id={account.id}
                type="text"
                value={custom}
                maxLength={120}
                placeholder={t("admin.customRolePlaceholder")}
                disabled={mode !== "custom" || busy}
                onChange={(e) => setCustom(e.target.value)}
              />
              <button
                className="btn btn-ghost btn-sm admin-save-role"
                data-user-id={account.id}
                disabled={busy}
                onClick={save}
              >
                <Icon name="fa-solid fa-floppy-disk" />
                {t("actions.save")}
              </button>
            </div>
            <FormError message={error} />
          </div>
        )}
      </td>
    </tr>
  );
}
export function AdminPanel({ onClose, onEdit, onCreate }) {
  const { users, t, auth, language } = useTracker();
  return (
    <Modal
      id="adminPanelModal"
      className="admin-panel-modal"
      title={t("admin.title")}
      icon="fa-solid fa-user-shield"
      closeId="btnCloseAdminPanel"
      backdropId="adminPanelBackdrop"
      onClose={onClose}
    >
      <div className="modal-body-create admin-panel-body">
        <div className="admin-panel-heading">
          <h3>{t("admin.users")}</h3>
          <span>{users.length}</span>
          <button
            className="btn btn-primary btn-sm"
            id="btnCreateUser"
            onClick={onCreate}
          >
            <Icon name="fa-solid fa-plus" />
            {language === "ru" ? "Создать пользователя" : "Create user"}
          </button>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-users-table">
            <thead>
              <tr>
                <th>{t("admin.user")}</th>
                <th>{auth("email")}</th>
                <th>{t("admin.role")}</th>
                <th>{t("admin.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((account) => (
                <AdminRow
                  key={`${account.id}:${account.role}`}
                  account={account}
                  onEdit={onEdit}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Modal>
  );
}
export function EditName({ user, onClose }) {
  const { t, language, notify, reload, run } = useTracker();
  const [name, setName] = useState(user.displayName),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const submit = async (event, close) => {
    event.preventDefault();
    if (busy) return;
    if (!name.trim()) {
      setError(t("errors.displayNameRequired"));
      return;
    }
    setBusy(true);
    setError("");
    try {
      await data(`/users/${user.id}`, {
        method: "PATCH",
        body: { displayName: name.trim() },
      });
      close();
      notify(t("toasts.displayNameUpdated"));
      await run(reload);
    } catch (error) {
      setError(errorText(error, language));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      id="editNameModal"
      className="modal-panel-small edit-name-modal"
      title={t("admin.editName")}
      icon="fa-solid fa-user-pen"
      closeId="btnCloseEditName"
      backdropId="editNameBackdrop"
      onClose={onClose}
    >
      {(close) => (
        <div className="modal-body-create">
          <form
            className="create-form"
            noValidate
            onSubmit={(e) => submit(e, close)}
          >
            <div className="settings-account">
              <Avatar user={user} size={40} />
              <div className="settings-account-info">
                <strong>{user.displayName}</strong>
                <span>{user.email}</span>
              </div>
            </div>
            <FormError message={error} />
            <Field id="editDisplayNameInput" label={t("admin.newDisplayName")}>
              <input
                type="text"
                className="form-input"
                id="editDisplayNameInput"
                maxLength={80}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </Field>
            <div className="form-actions">
              <button
                type="submit"
                className="btn btn-primary"
                id="btnSaveDisplayName"
                disabled={busy}
              >
                <Icon name="fa-solid fa-floppy-disk" />
                {t("actions.save")}
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                id="btnCancelEditName"
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
export function CreateUser({ onClose }) {
  const { auth, t, language, notify, reload, run } = useTracker();
  const [form, setForm] = useState({
    displayName: "",
    email: "",
    password: "",
  });
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const title = language === "ru" ? "Создать пользователя" : "Create user";
  const submit = async (event, close) => {
    event.preventDefault();
    if (busy) return;
    if (!form.displayName.trim()) {
      setError(auth("displayNameRequired"));
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setError(auth("validEmail"));
      return;
    }
    if (form.password.length < 8) {
      setError(
        language === "ru"
          ? "Пароль должен содержать от 8 до 128 символов."
          : "Password must be 8–128 characters.",
      );
      return;
    }
    setBusy(true);
    setError("");
    try {
      await data("/users", {
        method: "POST",
        body: {
          ...form,
          email: form.email.trim(),
          displayName: form.displayName.trim(),
        },
      });
      setForm({ displayName: "", email: "", password: "" });
      close();
      notify(
        language === "ru"
          ? "Пользователь создан. Передайте ему логин и пароль."
          : "User created. Give them their login and password.",
      );
      await run(reload);
    } catch (error) {
      setError(errorText(error, language));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      id="createUserModal"
      className="modal-panel-small edit-name-modal"
      title={title}
      icon="fa-solid fa-user-plus"
      closeId="btnCloseCreateUser"
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
            {["displayName", "email", "password"].map((name) => (
              <Field
                key={name}
                id={`newUser_${name}`}
                label={auth(name)}
                required
              >
                <input
                  className="form-input"
                  id={`newUser_${name}`}
                  type={
                    name === "password"
                      ? "password"
                      : name === "email"
                        ? "email"
                        : "text"
                  }
                  autoComplete={name === "password" ? "new-password" : "off"}
                  maxLength={
                    name === "email" ? 254 : name === "password" ? 128 : 120
                  }
                  value={form[name]}
                  onChange={(e) =>
                    setForm((old) => ({ ...old, [name]: e.target.value }))
                  }
                />
              </Field>
            ))}
            <small className="form-hint">
              {language === "ru"
                ? "Email используется как логин. Передайте логин и заданный пароль пользователю самостоятельно."
                : "Email is the login. Give the user their login and chosen password yourself."}
            </small>
            <div className="form-actions">
              <button
                type="submit"
                className="btn btn-primary"
                id="btnSubmitUser"
                disabled={busy}
              >
                <Icon name="fa-solid fa-plus" />
                {title}
              </button>
              <button type="button" className="btn btn-ghost" onClick={close}>
                {t("actions.cancel")}
              </button>
            </div>
          </form>
        </div>
      )}
    </Modal>
  );
}
