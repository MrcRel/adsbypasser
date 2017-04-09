_.register({
  rule: {
    host: /empireload\.com$/,
    path: /^\/plugin\.php$/,
    query: /^\?id=linkout&url=([^&]+)$/,
  },
  async start (m) {
    await $.openLink(m.query[1]);
  },
});
