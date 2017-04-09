_.register({
  rule: {
    host: /^igg-games\.com?$/,
    query: /\?xurl=([^?]*)$/,
  },
  async start (m) {
    const url = 'http' + decodeURIComponent(m.query[1]);
    await $.openLink(url);
  },
});
