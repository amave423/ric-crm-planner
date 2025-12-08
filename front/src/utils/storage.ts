export function loadData<T>(key: string, fallback: T[]): T[] {
  const raw = localStorage.getItem(key);
  return raw ? JSON.parse(raw) : fallback;
}

export function saveData<T>(key: string, data: T[]) {
  localStorage.setItem(key, JSON.stringify(data));
}
