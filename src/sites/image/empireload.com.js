_.register({
  rule: {
    host: /^(www\.)?empireload\.com$/,
    path: /^(\/images(\/files\/\w)?)\/.\.php$/,
    query: /^\?link=(.+)$/,
  },
  async start (m) {
    await $.openImage(m.path[1] + '/link/' + m.query[1]);
  },
});
