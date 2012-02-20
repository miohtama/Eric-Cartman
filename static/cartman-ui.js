/*global jQuery,JSON2,window*/

(function($) {

    "use strict";


    /**
     * From jQuery 1.7 - start using the real thing when 1.7 is widely used
     */
    function isNumeric(obj) {
        return !isNaN( parseFloat(obj) ) && isFinite( obj );
    }


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

        // Some trickery to have nested options

        $.extend(this, options);

        var selectors = {

            minicart : "#mini-cart",

            minicartTemplate : "#mini-cart-template",

            checkoutPopup : "#checkout-popup",

            // Which element used for animating fly Add button -> cart
            addToCartAnimator : "img"
        };

        if(options.selectors) {
            $.extend(selectors, options.selectors);
        }

        this.selectors = selectors;
    }

    CartmanUI.prototype = {

        /** Cartman implementation */
        cartman : null,

        /**
         * Where cart data will be POST'ed when user presses checkout
         */
        checkoutURL : null,

        /**
         * Various jQuery element selectors used in jQuery actions
         */
        selectors : {},

        init : function() {
            var self = this;

            //this.initMiniCart($(this.miniCartId));

            this.initProducts();

            var minicart = $(this.selectors.minicart);
            if(minicart.size() === 0) {
                console.error("Mini cart missing on the page:" + this.selectors.minicart);
            }

            var checkout = $(this.selectors.checkoutPopup);

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

            var source = this.getCartTemplateData();

            var tid = this.selectors.minicartTemplate;

            var template = $(tid);
            if(template.size() === 0) {
                console.error("Mini cart tempate missing:" + tid);
                return;
            }

            var data = {

                filled : {
                    count : source.count,
                    total : source.total
                }
            };

            var directives = {
                // Hide empty cart message element if we have any items in the cart
                empty : function(elem) { if(source.count) { elem.remove(); } },

                // Hide cart controls if there are no picked items
                filled : function(elem) { if(!source.count) { elem.remove(); } }
            };

            elem.empty();
            elem.append(template.children().clone());

            elem.render(data, directives);

            // Bind minicart link to open the checkout dialog
            elem.find("button").click(function(e) {
                self.openCheckoutPopup();
                e.preventDefault();
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
            // than cart populated with items
            if(data.count > 0) {
                template = $("#checkout-popup-template");
            } else {
                // Empty :/
                template = $("#checkout-popup-empty-template");
            }

            // Explicitly set Transparency template
            // https://github.com/leonidas/transparency/issues/11
            elem.data("template", template);

            // Template directives
            var directives = {
                // Nested directives for product lines
                products : {
                    "checkout-line@data-id" : function() { return this.id; },
                    "count@value" : function() { return this.count; },
                    price : function() { return self.formatPrice(this.price); },
                    total : function() { return self.formatPrice(this.count*this.price); },
                    // Fill in image column only if image URL is available
                    "img-url@href" : function(elem) { return this.url; },
                    "img@src" : function(elem) { if(this.img) { return this.img; } else { elem.remove(); } },
                    "name@href" : function(elem) { return this.url; }
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

                // Loop through all checkout item lines, extract their
                // new count and build an updated id -> count mappings
                elem.find(".checkout-line").each(function() {
                    var $this = $(this);
                    var id = $this.attr("data-id");

                    var count = $this.find("input[data-bind=count]");
                    count = count.val();

                    updateAllData[id] = { count : count };
                });

                self.cartman.updateAll(updateAllData);

            });

            elem.find(".checkout").click(function() {
                // This will move forward in the checkout process
                self.doCheckout();
            });

            elem.find(".remove-all").click(function() {
                // This will move forward in the checkout process
                self.cartman.clear();
            });

            elem.find(".checkout-line a").click(function() {
                // Close pop-up when an item link in checkout pop-up is clicked
                // because the link might point to the current page
                elem.data("overlay").close();
            });

            self.setupCheckoutPopup(elem);

        },

        /**
         * Override to use your favorite Javascript UI toolkit modal dialog functionality.
         *
         * By default, we assume jQuery tools is present.
         *
         * @param {Object} elem Checkout pop-up elem as jQuery selection
         */
        setupCheckoutPopup : function(elem) {

            if(elem.overlay === undefined) {
                throw new Error("Please include jQuery Tools or your own setupCheckoutPop()");
            }

            elem.find(".close").click(function() {
                // Because close comes from the template and is not jQuery Tools
                // autogenerated we need to handle events ourselves
                elem.data("overlay").close();
            });


            // User jQuery tools to init pop-up
            elem.overlay({
                close : null,
                load : false,
                fixed : true,

                // some mask tweaks suitable for modal dialogs
                mask : {
                    color: '#aaa',
                    loadSpeed: 200,
                    opacity: 0.9
                }
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
            var api = $("#checkout-popup").data("overlay");
            api.load();
        },

        /**
         * Finalize cart data and POST it to the server
         */
        doCheckout : function() {
            throw new Error("You must implement doCheckout() functionality yourself");
        },

        /**
         * Call at the end of succesful checkout process to clear the cart contents.
         */
        doPurge : function() {
            this.cartman.clear();
        },

        /**
         * Initialize product add-to-cart action handlers.
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
            var products = $("[data-product]");

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
                        self.animateAdd(product);
                    }

                });
            });

        },

        /**
         * Extract product data JSON payload from DOM.
         *
         * Each product must come with data-product="" attribute which contains
         * JSON payload of data for the product.
         *
         * @param {Object} elem jQuery selection of a product DOM
         */
        getItemData : function(elem) {
            var val = elem.attr("data-product");

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
         * Do item add into basket animation.
         */
        animateAdd : function(elem) {

            var source = elem.find(this.selectors.addToCartAnimator);
            var target = $(this.selectors.minicart);

            var sourcePosition = source.offset();
            if(!sourcePosition) {
                console.log("sourcePosition not available for animateAdd()");
                return;
            }

            var stop = sourcePosition.top;
            var sleft = sourcePosition.left;

            var targetPosition = target.offset();
            if(!targetPosition) {
                console.log("targetPosition not available for animateAdd()");
                return;
            }

            var targetArea = target;

            // Create clone of the source element which will
            // be imposed on the fly animation
            source = source.clone().appendTo($("body"));

            source.css({
                "position": "absolute",
                "top": stop,
                "left": sleft,
                "z-index" : 5000,
                "opacity" : 0.5
            });

            source.animate(
            {
                top: targetPosition.top + targetArea.height(),
                left: targetPosition.left
            },
            {
                duration: 500,
                // We must remove the element - even if it's invisible
                // it will block form fields and buttons beneath it
                complete : function() { $(this).remove(); }
            });

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

            if(!isNumeric(sum)) {
                // Logic error somewhere
                // Let's push through somehow...
                return "XXX";
            }

            return sum.toFixed(2);
        }

    };


    window.CartmanUI = CartmanUI;

}(jQuery));

