export const ls = {
  load: (k) => {
    try {
      const r = localStorage.getItem(k);
      return r ? JSON.parse(r) : null;
    } catch {
      return null;
    }
  },
  save: (k, v) => {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch {}
  },
  del: (k) => {
    try {
      localStorage.removeItem(k);
    } catch {}
  },
};

export function enqueue(key, payload) {
  const q = ls.load(key) || [];
  q.push({
    id: `q_${Date.now()}`,
    payload,
    createdAt: new Date().toISOString(),
  });
  ls.save(key, q);
}

export async function flushQueue(key, poster) {
  const q = ls.load(key);
  if (!Array.isArray(q)) return;

  const remaining = [];

  for (const item of q) {
    try {
      const res = await poster(item.payload);
      if (!res || (res.status && res.status >= 400)) throw new Error();
    } catch {
      remaining.push(item);
    }
  }

  ls.save(key, remaining);
}

export const nowISO = () =>
  new Date().toISOString().slice(0, 10);