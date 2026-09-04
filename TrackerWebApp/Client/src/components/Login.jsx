import { useEffect, useState } from "react";
import { useTracker, errorText } from "../context";

export default function Login({ onLogin, initializing, initialError }) {
  const { auth, language } = useTracker();
  const [identifier, setIdentifier] = useState(""),
    [password, setPassword] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    setError(initialError);
  }, [initialError]);
  return (
    <div className="auth-shell">
      <div className="auth-card" role="main" aria-label={auth("signIn")}>
        <div className="auth-brand">
          <div className="auth-brand-icon">📋</div>
          <div>
            <h1>{auth("title")}</h1>
            <p>{auth("subtitle")}</p>
          </div>
        </div>
        <div className="auth-tabs" aria-label="Authentication mode">
          <button
            type="button"
            className="auth-tab active"
            data-auth-mode="login"
          >
            {auth("signIn")}
          </button>
        </div>
        <div className="auth-error" id="authError" role="alert" hidden={!error}>
          {error}
        </div>
        <form
          className="auth-form"
          id="loginForm"
          noValidate
          onSubmit={async (event) => {
            event.preventDefault();
            if (busy || initializing) return;
            if (!identifier.trim() || !password) {
              setError(auth("invalidCredentials"));
              return;
            }
            setBusy(true);
            setError("");
            try {
              await onLogin({ identifier: identifier.trim(), password });
            } catch (error) {
              setError(errorText(error, language));
            } finally {
              setBusy(false);
            }
          }}
        >
          <label className="auth-field">
            <span>{auth("emailOrUsername")}</span>
            <input
              type="text"
              id="loginEmail"
              autoComplete="username"
              placeholder="alice@example.com"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              maxLength={254}
            />
          </label>
          <label className="auth-field">
            <span>{auth("password")}</span>
            <input
              type="password"
              id="loginPassword"
              autoComplete="current-password"
              placeholder="••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              maxLength={128}
            />
          </label>
          <button
            type="submit"
            className="btn btn-primary auth-submit"
            disabled={busy || initializing}
            aria-busy={busy || initializing}
          >
            {auth("signIn")}
          </button>
          <p className="auth-demo-hint">
            {language === "ru"
              ? "Логин и пароль выдаёт администратор."
              : "Your administrator provides your login and password."}
          </p>
        </form>
      </div>
    </div>
  );
}
