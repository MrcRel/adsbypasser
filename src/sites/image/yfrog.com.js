_.register({
  rule: {
    host: /\.yfrog\.com$/,
  },
  async ready () {
    if (/^\/z/.test(window.location.pathname)) {
      const i = $('#the-image img');
      await $.openImage(i.src);
      return;
    }
    const a = $.$('#continue-link a, #main_image');
    if (a) {
      await $.openLink('/z' + window.location.pathname);
      return;
    }
  },
});
