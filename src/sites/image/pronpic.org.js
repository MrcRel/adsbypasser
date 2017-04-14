_.register({
  rule: {
    host: /^pronpic\.org$/,
  },
  async ready () {
    const img = $('table.new_table2:nth-child(2) img.link');
    const url = img.src.replace('th_', '');
    await $.openImage(url);
  },
});
