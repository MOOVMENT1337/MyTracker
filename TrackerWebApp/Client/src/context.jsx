import { createContext, useContext } from "react";
import { translations, authTranslations } from "./translations";

export const TrackerContext = createContext(null);
export const useTracker = () => useContext(TrackerContext);
export function translator(language, auth = false) {
  const dictionary = auth ? authTranslations : translations;
  return (key, params = {}) => {
    const get = (lang) =>
      key.split(".").reduce((value, part) => value?.[part], dictionary[lang]);
    return String(get(language) ?? get("en") ?? key).replace(
      /\{(\w+)\}/g,
      (_, name) => params[name] ?? `{${name}}`,
    );
  };
}
export function errorText(error, language) {
  const messages = {
    NETWORK_ERROR: [
      "Cannot connect to server. Please try again.",
      "Не удалось связаться с сервером. Попробуйте ещё раз.",
    ],
    INVALID_CREDENTIALS: [
      "Invalid email or password",
      "Неверный email или пароль",
    ],
    UNAUTHORIZED: [
      "Session expired. Please sign in again.",
      "Сессия истекла. Войдите снова.",
    ],
    LOGIN_EMAIL_REQUIRED: [
      "Several users have this name. Sign in with your email.",
      "Это имя используется несколькими пользователями. Введите email.",
    ],
    REGISTRATION_DISABLED: [
      "Accounts are created by an administrator. Use your assigned login and password.",
      "Аккаунты создаёт администратор. Используйте выданные логин и пароль.",
    ],
    VERSION_CONFLICT: [
      "This issue was changed by another user. Reopen it before saving. Your draft is kept here.",
      "Задача изменена другим пользователем. Откройте её заново перед сохранением. Ваш черновик сохранён в форме.",
    ],
    CONFLICT: [
      "This email or queue key already exists.",
      "Такой email или ключ очереди уже существует.",
    ],
    FORBIDDEN: [
      "You do not have permission for this action.",
      "Недостаточно прав для этого действия.",
    ],
    RATE_LIMITED: [
      "Too many requests. Please try again later.",
      "Слишком много запросов. Попробуйте позже.",
    ],
  };
  return (
    messages[error.code]?.[language === "ru" ? 1 : 0] ||
    error.message ||
    (language === "ru" ? "Ошибка сервера" : "Server error")
  );
}
