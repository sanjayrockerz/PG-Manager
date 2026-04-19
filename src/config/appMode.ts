export type AppMode = 'demo' | 'live';

const APP_MODE_KEY = 'app_mode';

const normalizeMode = (value: string | null): AppMode => {
  if (value === 'live') {
    return 'live';
  }
  return 'demo';
};

export const getAppMode = (): AppMode => {
  if (typeof window === 'undefined') {
    return 'live';
  }
  return normalizeMode(window.localStorage.getItem(APP_MODE_KEY));
};

export const setAppMode = (mode: AppMode, options?: { reload?: boolean }): void => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(APP_MODE_KEY, mode);

  if (options?.reload === false) {
    return;
  }

  window.location.reload();
};
