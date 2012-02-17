/*global jQuery,JSON2,window*/

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
     * Each product consists of
     *
     * - Id
     *
     * - Count (not warehouse count, but how many products in a cart)
     *
     * - Price (flaoting point accurate to two decimals)
     *
     * UI is based on Javascript Transparency templating framework.
     *
     */
    function CartmanUI(options) {
        $.extend(this, options);
    }

    CartmanUI.prototype = {

        /** Cartman implementation */
        cartman : null,

        minitCartSelector : "#minicart",

        checkoutSelecor : "checkout-popup",

        productSelector : ".product",

        miniCartTemplateId : null,

        checkoutListTemplateId : null,

        init : function() {
            var self = this;

            //this.initMiniCart($(this.miniCartId));

            this.initProducts();

            var minicart = $(this.minitCartSelector);

            $(document).bind("cartchanged", function() {
                console.log("cartchanged");
                self.refreshMiniCart(minicart);
                self.refreshCheckout();

            });

        },

        refreshMiniCart : function(elem) {

            var data = {
                total : this.getTotalPrice(),
                count : this.getItemCount()
            };

            var template = $("#mini-cart-template");

            elem.empty();
            elem.append(template.clone());

            elem.render(data);
        },

        refreshCheckout : function() {
        },

        /**
         * Initialize product action handlers.
         *
         * Assume each product has
         *
         * - Input field for add count
         *
         * - Hidden input field containing JSON serialized product data
         */
        initProducts : function(elem) {

            var self = this;

            // All products on this page
            var products = $(this.productSelector);

            products.each(function() {

                var product = $(this);

                var item = self.getItemData(product);
                if(!item) {
                    // Badly constructed DOM - does not have JSON data payload
                    return;
                }

                // Out of stock, don't install click handlers
                if(!self.isProductAvailable(product, item)) {
                    return;
                }

                console.log("Foobar");

                product.find(".add-button").click(function() {
                    console.log("Click");

                    var count = product.find(".add-count").val();

                    if(count > 0) {
                        item.count = count;
                        self.cartman.add(item);
                    }

                });
            });

        },

        /**
         * Scrape UI for product data
         *
         * @param {Object} elem jQuery selection of a product DOM
         */
        getItemData : function(elem) {
            var val = elem.find(".product-data").val();

            if(!val) {
                console.error("Product data missing for element:");
                console.log(elem.get(0));
                return null;
            }

            try {
                return JSON.parse(val);
            } catch(e) {
                console.error("Bad product JSON data:" + val);
                throw e;
            }
        },

        /**
         * Check if product can be ordered or is it unavail.
         */
        isProductAvailable : function(elem, item) {
            return elem.attr("data-unvail") === undefined;
        },


        /**
         * UI helper to get total item count
         */
        getItemCount : function() {
            return this.cartman.getContents().length;
        },

        /**
         * UI helper to get total sum of cart
         */
        getTotalPrice : function() {
            var total = 0;
            $(this.cartman.getContents()).each(function() {
                total += this.price * this.count;
            });
        }

    };

    window.CartmanUI = CartmanUI;

}(jQuery));

