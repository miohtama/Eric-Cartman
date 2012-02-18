/*global jQuery,JSON2,window*/

(function($) {

    "use strict";

    /**
     * Default shopping cart UI implementation.
     *
     * You get
     *
     * - Product listing page click configuration so that something is added and removed from the cart
     *
     * - Mini cart (shows total)
     *
     * - Checkout page
     *
     * Each product consists of
     *
     * - Id
     *
     * - Name
     *
     * - Count (not warehouse count, but how many products in a cart)
     *
     * - Price (flaoting point accurate to two decimals)
     *
     * When the user presses the checkout button the cart contents is HTTP POST'ed
     * to a given URL. On this data, you MUST do server-side validation for item prices
     * and counts (they are positive) and calculates the contents total on the server-side.
     *
     * UI is based on Javascript Transparency templating framework.
     *
     *
     *
     * Following selectors are used
     *
     * - #mini-cart
     *
     * - #mini-cart-template
     *
     * - #checkout-popup
     *
     * - #checkout-popup-template
     *
     * - .product
     */
    function CartmanUI(options) {
        $.extend(this, options);
    }

    CartmanUI.prototype = {

        /** Cartman implementation */
        cartman : null,

        miniCartTemplateId : null,

        checkoutListTemplateId : null,

        /**
         * Where cart data will be POST'ed when user presses checkout
         */
        checkoutURL : null,

        init : function() {
            var self = this;

            //this.initMiniCart($(this.miniCartId));

            this.initProducts();

            var minicart = $("#mini-cart");
            var checkout = $("#checkout-popup");

            $(document).bind("cartchanged", function() {
                console.log("cartchanged");
                self.refreshMiniCart(minicart);
                self.refreshCheckout(checkout);
            });

        },

        /**
         * Update minicart nd event handlers DOM based on the cart contents.
         */
        refreshMiniCart : function(elem) {

            var self = this;

            var data = this.getCartTemplateData();

            var template = $("#mini-cart-template");

            elem.empty();
            elem.append(template.children().clone());

            elem.render(data);

            // Bind minicart link to open the checkout dialog
            elem.find("a").click(function() {
                self.openCheckoutPopup();
            });
        },

        /**
         * Update checkout pop-up DOM based on cart contents
         */
        refreshCheckout : function(elem) {

            var self = this;

            var data = this.getCartTemplateData();

            var template;

            // Use different template for the empty cart
            if(data.count > 0) {
                template = $("#checkout-popup-template");
            } else {
                // Empty :/
                template = $("#checkout-popup-empty-template");
            }
            // Don't use empty() here as it would nuke jQuery Tools pop-up close controls also
            elem.children().not(".close").remove();
            elem.append(template.children().clone());

            // Template directives
            var directives = {
                // Nested directives for product lines
                products : {
                    "checkout-line@data-id" : function() { return this.id; },
                    "count@value" : function() { return this.count; },
                    total : function() { return self.formatPrice(this.count*this.price); }
                }
            };

            // Apply template
            elem.render(data, directives);

            // Bind remote element
            elem.find(".column-remove").click(function() {
                console.log("remove");
                var product = $(this).parents(".checkout-line");
                var id = product.attr("data-id");
                self.cartman.remove(id);
            });

            // Bind Update button to refresh all item counts
            elem.find(".update").click(function() {
                // This will rewrite product counts
                var updateAllData = {};

                elem.find(".checkout-line").each(function() {
                    var $this = $(this);
                    var id = $this.attr("data-id");

                    updateAllData[id] = {};
                });

            });

            elem.find(".checkout").click(function() {
                // This will move forward in the checkout process
                self.doCheckout();
            });

            elem.find(".remove-all").click(function() {
                // This will move forward in the checkout process
                self.cartman.clear();
            });

        },

        /**
         * Data used to populate mini-cart and checkout pop-up templates
         */
        getCartTemplateData : function() {
            var data = {
                total : this.formatPrice(this.getTotalPrice()),
                count : this.getItemCount(),
                products : this.cartman.getContents()
            };
            return data;
        },

        /**
         * Open checkout pop-up window.
         */
        openCheckoutPopup : function() {

            console.log("openCheckoutPopup()");

            // User jQuery tools to open pop-up
            $("#checkout-popup").overlay({
                load : true
            });
        },

        /**
         * Finalize cart data and POST it to the server
         */
        doCheckout : function() {

        },

        /**
         * Call at the end of succesful checkout process to clear the cart contents.
         */
        doPurge : function() {
            this.cartman.clear();
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
            var products = $(".product");

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

                product.find(".add-button").click(function() {
                    console.log("Click");

                    var count = product.find(".add-count").val();

                    try {
                        count = parseFloat(count);
                    } catch(e) {
                        // User enters text
                        count = 0;
                    }

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
            return total;
        },

        /**
         * Formats a price (raw, no currency).
         *
         * Fail-safe fallback to XXX string if the sum is not for some reason a good number
         * (e.g. missing data)
         */
        formatPrice : function(sum) {

            if(!$.isNumeric(sum)) {
                // Logic error somewhere
                // Let's push through somehow...
                return "XXX";
            }

            return sum.toFixed(2);
        }


    };

    window.CartmanUI = CartmanUI;

}(jQuery));

