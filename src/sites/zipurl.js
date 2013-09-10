// ==UserScript==
// @match          http://zipurl.fr/*
// @match          http://ah-informatique.com/ZipUrl/*
// ==/UserScript==

(function () {
  'use strict';

  $.register({
    rule: {
      host: /$zipurl\.fr|ah-informatique\.com$/
    },
    run: function () {
      var a = $('#zip3 a');
      $.redirect(a.href);
    }
  });

})();

// vim: ts=2 sts=2 sw=2 et
// sublime: tab_size 2; translate_tabs_to_spaces true; detect_indentation false; use_tab_stops true;
// kate: space-indent on; indent-width 2;
