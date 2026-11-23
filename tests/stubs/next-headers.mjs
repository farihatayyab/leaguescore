// Browser cookie jar ki jagah: globalThis.__jar
globalThis.__jar ||= new Map();
export async function cookies() {
  return {
    get: (n) => (globalThis.__jar.has(n) ? { name: n, value: globalThis.__jar.get(n) } : undefined),
    set: (n, v) => void globalThis.__jar.set(n, v),
    delete: (n) => void globalThis.__jar.delete(n),
  };
}
