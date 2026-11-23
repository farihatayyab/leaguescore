globalThis.__mails ||= [];
export default {
  createTransport: (cfg) => ({
    cfg,
    sendMail: async (m) => { globalThis.__mails.push(m); return { messageId: `<test-${globalThis.__mails.length}>` }; },
  }),
};
