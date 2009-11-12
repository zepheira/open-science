/**
 * Copyright 2008-2009 Zepheira LLC
 */

var preCartTrigger = {
    forward: function(cb) {
        if(cb) cb();
    },
    backward: function(cb) {
        $('#cart').hide('slide',{direction:'up'},'slow', cb);
    }
}

var cartTrigger = {
    forward: function(cb) {
        $('#cart').show('slide',{direction:'up'},'slow', cb);
    },
    backward: function(cb) {
        $('#cart').show('slide',{direction:'up'},'slow', cb);
    }
};

var postCartTrigger = {
    forward: function(cb) {
        $('#cart').hide('slide',{direction:'up'},'slow', cb);
    },
    backward: function(cb) {
        if(cb) cb();
    }
}

var Cart = {};

var prepareMarket = function() {
    SimileAjax.History._plainDocumentTitle = document.title;

    var setupCart = function() {
        var apps = window.exhibit.getCollection('default').getAllItems().toArray();
        for (var i = 0; i < apps.length; i++) {
            Cart[apps[i]] = false;
        }

        $('.cart-remove').live('click',function(){
            Cart[$(this).attr('link')] = false;
            $('div[link='+$(this).attr('link')+']').removeClass('added-widget');
            $(this).parents('tr').eq(0).remove();
            if ($('#cart tr').length == 1) {
                $('#cart-checkout').hide();
                $('#cart-empty').show();
                $('#cart').hide();
            }
            $('.cart-size').text($('#cart tr').length-1);
        });
    }

    window.exhibit.getDatabase().addListener({
        onAfterLoadingItems: setupCart
    });

    var addRss = function() {
        $('.exhibit-collectionView-header div:eq(0)').append('<div id="rss" title="[not a real link] RSS Feed of latest applications"> </div>');
    };
    addRss();

    var setThemFree = function() {
        $('.add-widget[price=0]').siblings('span.app-price-tag').text('Free!');
        $('.purchased[price=0]').siblings('span.app-price-tag').text('Free!');
    }
    setThemFree();

    var fillAddWidgets = function() {
        $('.add-widget').append('<ul class="add-widget-actions"><li class="add-me">Purchase myself</li><li class="add-librarian">Notify my librarian</li></ul>');
    }

    var setPurchased = function() {
        var boughtApps = Personal.getActiveApplications();
        for (var i = 0; i < boughtApps.length; i++) {
            var app = boughtApps[i];
            $('.add-widget[link="'+app+'"]').replaceWith('<span class="purchased" title="Already purchased"> </span>');
            $('div').filter(function(){return $(this).attr('ex:itemid')==app;}).find('span.if-purchased').removeClass('if-purchased');
        }
    }

    var bindCartEvents = function() {
        $('.add-widget').bind('click',function(e){
            e.stopPropagation();
            e.stopImmediatePropagation();
            if ($(this).hasClass('added-widget')) {
                $(this).removeClass('added-widget');
                Cart[$(this).attr('link')] = false;
                $('tr[itemid="'+$(this).attr('link')+'"]').remove();
                if ($('#cart tr').length == 1) {
                    $('#cart-checkout').hide();
                    $('#cart-empty').show();
                }
                $('.cart-size').text($('#cart tr').length-1);
            } else {
                $(this).children('.add-widget-actions').show();
                $(document).one('click.hideadd',function(){
                    $('.add-widget-actions:visible').hide();
                });
            }
        });

        $('.add-me,.add-librarian').bind('click',function(e){
            e.stopPropagation();
            e.stopImmediatePropagation();
            $(document).unbind('click.hideadd');
            var widget = $(this).parents('.add-widget');
            $(this).parents('ul').eq(0).hide();
            if (!Cart[widget.attr('link')]) {
                Cart[widget.attr('link')] = true;
                widget.addClass('added-widget');
                if (('#cart tr').length > 0) {
                    $('#cart-empty').hide();
                    $('#cart-checkout').show();
                } else {
                    $('#cart-empty').show();
                    $('#cart-checkout').hide();
                }
                $('#cart').append('<tr itemid="'+widget.attr('link')+'"><td><span link="'+widget.attr('link')+'" class="cart-remove"><img src="i/remove-app-mini.png" title="Remove from cart" /></span></td><td><a href="'+widget.attr('link')+'">'+widget.attr('label')+'</a></td><td class="cart-price">'+widget.attr('price')+'</td></tr>');
                $('.cart-size').text($('#cart tr').length-1);
            } else {
                widget.removeClass('added-widget');
                Cart[widget.attr('link')] = false;
                $('tr[itemid="'+widget.attr('link')+'"]').remove();
                if ($('#cart tr').length == 1) {
                    $('#cart-checkout').hide();
                    $('#cart-empty').show();
                }
                $('.cart-size').text($('#cart tr').length-1);
            }
        });
    }

    var onChange = function() {
        addRss();
        setThemFree();
        fillAddWidgets();
        setPurchased();
        bindCartEvents();
    }

    window.exhibit.getCollection("default").addListener({
        onItemsChanged: onChange
    });

    $('#cart-title').bind('click',function(){
        if($('#cart:visible').length == 0) {
            $('#cart-title').addClass('open');
        } else {
            $('#cart-title').removeClass('open');
        }
        $('#cart').toggle();
    });

    // set as purchased, and keep there
    $('#cart-checkout').bind('click',function(){
        Personal.purchaseApps(window.exhibit.getDatabase(), $('#cart'), 'tr[itemid]', 'itemid');
        $('#cart tr[itemid]').each(function(){
            Cart[$(this).attr('itemid')] = false;
        });
        setPurchased();

        $('#cart tr[itemid]').remove();
        $('.cart-size').text($('#cart tr').length-1);
        $('#cart-empty').show();
        $('#cart-checkout').hide();
    });

    $('#pref-reset-button').bind('click',function(){
        Personal.clearPurchases();
        window.exhibit.getDatabase()._listeners.fire('onAfterLoadingItems',[]);
    });
};

$(document).ready(function() {
    var fDone = function() {
        window.exhibit = Exhibit.create();
        window.exhibit.configureFromDOM();
        prepareOS();
        prepareAnnotations();
        prepareMarket();
        prepareMarketData();
    };
    
    try {
        var s = Exhibit.getAttribute(document.body, "ondataload");
        if (s != null && typeof s == "string" && s.length > 0) {
            fDone = function() {
                var f = eval(s);
                if (typeof f == "function") {
                    f.call();
                }
            }
        }
    } catch (e) {
        // silent
    }
    
    window.database = Exhibit.Database.create();
    window.database.loadDataLinks(fDone);
});
