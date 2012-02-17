/*global jQuery,store*/

(function($) {

    "use strict";

    /**
     * Shopping cart manager.
     *
     * Manages item list and fires UI events when the list is being manipulated.
     * The list is stored in localStorage wrapper managed by store.js.
     *
     * Each item is a Javascript object. The only (configurable) properties it
     * must have are id and count.
     *
     * When cart item changes occur jQuery events are fired against
     * document object. It is possible to have several shopping cart UI
     * listeners on the same page.
     *
     */
    function Cartman(options) {

        this.fields = {
            id : "id",
            count : "count"
        };

        $.extend(this, options);

    }

    // List of cart events
    Cartman.events = [

        /**
         * @event
         *
         * Item added to the cart (cartman, item)
         */
        "cartadd",

        /**
         * @event
         *
         * Item removed from the cart (cartman, item)
         */
        "cartremove",

        /**
         * @event
         *
         * Cart contents changed.
         */
        "cartchanged",

        /**
         * @event
         *
         * Cart contents cleared.
         */
        "cartclear",

        /**
         * @event
         *
         * Fired after the cart contents have been retrived from persistent store,
         * so that page initial UI state can be set. Also fies cartchanged.
         */
        "cartinit"

    ];

    Cartman.prototype = {

        /**
         * LocalStorage identifier.
         */
        storeId : "cart",

        /**
         * @cfg
         *
         * Which field in item object is unique id for the item
         */
        fields : {
            // XXX: Not that this is properly initialized in constructor
            id : "id",
            count : "count"
        },

        /**
         * @type Array
         *
         * Internal list of cart items.
         *
         * If changed call updateStore().
         *
         */
        contents : [],

        refreshStore : function() {
            this.contents = store.get(this.storeId) || [];
            this.trigger("cartinit");
            this.trigger("cartchanged");
        },

        /**
         * Adds to existing item count.
         *
         * Replaces also all other item data with new passed in data.
         *
         * @param {Object} item must have id and count attributes.
         */
        add : function(item) {


            var itemId = this.getItemId(item);
            if(!itemId) {
                throw new Error("Missing item id");
            }

            if(item.count === undefined) {
                throw new Error("Item does not have count");
            }

            var existingRecord = this.get(itemId);
            var existingCount;

            if(!existingRecord) {
                // Goes to the cart for the first time
                existingRecord = {};
                this.contents.push(existingRecord);
                existingCount = 0;
            } else {
                // Update existing count in the cart
                existingCount = existingRecord.count;
            }

            $.extend(existingRecord, item);

            existingRecord.count += existingCount;

            this.updateStore();

            this.trigger("cartadd", [item]);
            this.trigger("cartchanged");
        },

        remove : function(id) {
            var i;
            var item;

            for(i=0; i<this.contents.length; i++) {
                item = this.contents[i];
                var itemId = this.getItemId(item);
                if(itemId == id) {
                    break;
                }
            }

            // Remove by index
            if(i < this.contents.length) {
                this.contents.splice(i, i);
                this.updateStore();
                this.trigger("cartremove", [item]);
                this.trigger("cartchanged");
            }

        },

        clear : function() {
            this.cart = [];
            this.updateStore();
            this.trigger("cartclear");
            this.trigger("cartchanged");
        },

        /**
         * Extract id field from item.
         */
        getItemId : function(item) {
            return item[this.fields.id];
        },

        /**
         * Makes an item stub or retrieves an existing item.
         */
        get : function(id) {
            var i;
            for(i=0; i<this.contents.length; i++) {
                var item = this.contents[i];
                var itemId = this.getItemId(item);
                if(itemId == id) {
                    return item;
                }
            }
            return null;
        },

        /**
         * @return {Array} Cart contents as array of stored item
         */
        getContents : function() {
            return this.contents;
        },

        /**
         * Reflect cart content changes to persistent storage
         */
        updateStore : function() {
            store.set("cart", this.contents);
        },

        /**
         * Fire a cart event.
         *
         * First event parameter is always this cart manager itself.
         */
        trigger :function(event, args) {
            $(document).trigger(event, [this] + args);
        }
};

window.Cartman = Cartman;

}(jQuery));