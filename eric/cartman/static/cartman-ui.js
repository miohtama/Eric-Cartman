/*global jQuery*/

(function($) {

    "use strict";

    /**
     * Default shopping cart UI implementation.
     *
     * You get
     *
     * - Product click configuration so that something is added and removed from the cart
     *
     * - Mini cart (shows total)
     *
     * - Checkout page
     *
     * UI is based on Javascript Transparency templating framework.
     *
     */
    function CartmanyUI(options) {
    }

    CartmanUI.prototype = {

        /** Cartman implementation */
        cart : null,

        miniCartTemplateId : null,

        checkoutListTemplateId : null,

        init : function() {
            var self = this;
            $(".mini-cart").each(function() {
                self.iintMiniCart(elem);
            });
        },

        initMiniCart : function(elem) {

        }
    }
};

}(jQuery));

