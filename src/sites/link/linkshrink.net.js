_.register({
  rule: {
    host: /^linkshrink\.net$/,
    path: /^\/[a-zA-Z0-9]+$/,
  },
  async start () {
    $.window._impspcabe = 0;
  },
  async ready () {
    const l = $('#skip .bt');
    await $.openLink(l.href);
  },
});

_.register({
  rule: {
    host: /^linkshrink\.net$/,
    path: /=(.+)$/,
  },
  async start (m) {
    await $.openLink(m.path[1]);
  },
});
