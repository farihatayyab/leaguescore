globalThis.__fake ||= { offset: 0, now: () => Date.now() + globalThis.__fake.offset };
export const fake = globalThis.__fake;
