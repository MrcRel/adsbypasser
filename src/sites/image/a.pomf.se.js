_.register({
  rule: [
    {
      host: /^a\.pomf\.se$/,
      path: /^\/.+\.htm$/,
      // filter lbGate
      query: /^$/,
    },
    {
      host: /^empireload\.com$/,
      path: /^\/sexy\/.+\.htm$/,
      // filter lbGate
      query: /^$/,
    },
  ],
  async ready () {
    const a = $.$('body > a');
    if (a) {
      await $.openImage(a.href);
      return;
    }
    $.remove('#boxes, iframe');
  },
});
