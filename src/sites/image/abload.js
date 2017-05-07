_.register({
  rule: {
    host: /^(www\.)?image(pearl|crest)\.com$/,
    path: /^\/verify\/(.+)$/,
  },
  async start (m) {
    await $.openLink('/view/' + m.path[1], {
      referer: false,
    });
  },
});

_.register({
  rule: [
    'http://*.abload.de/image.php?img=*',
    'http://www.imageup.ru/*/*/*.html',
    // different layout same handler
    'http://itmages.ru/image/view/*/*',
    // different layout same handler
    {
      host: /^(www\.)?image(pearl|crest)\.com$/,
      path: /^\/view\//,
    },
  ],
  async ready () {
    const i = $('#image');
    await $.openImage(i.src);
  },
});
