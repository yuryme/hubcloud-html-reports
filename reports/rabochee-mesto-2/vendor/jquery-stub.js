window.$ = window.jQuery = {
  ajax: function() {
    throw new Error('jQuery is not loaded in sandbox mode');
  }
};
