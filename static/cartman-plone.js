/**
 * Plone bindings
 */
(function(jQuery) {

    "use strict";

    var cartman = new Cartman();
    var ui = new CartmanUI({
        cartman : cartman
    });

    // Bootstrap UI
    ui.init();

    // Load cart from localStorage,
    cartman.refreshStore();

})(jQuery);

