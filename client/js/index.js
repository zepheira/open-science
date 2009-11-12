/**
 * Copyright 2008-2009 Zepheira LLC
 */

var qTrigger = {
    forward: function(cb) {
        $('#q').val('stem cells');
        $('#q').focus();
        if (cb) cb();
    },
    backward: function(cb) {
        $('#suggestions').hide();
        if (cb) cb();
    }
};

var suggestTrigger = {
    forward: function(cb) {
        $('#suggestions').show();
        if (cb) cb();
    },
    backward: function(cb) {
        $('#advanced-search-title').removeClass('open');
        $('#advanced-search-options').hide('slide', { direction: 'up' }, 'slow');
        $('#suggestions').show();
        if (cb) cb();
    }
};

var advancedTrigger = {
    forward: function(cb) {
        $('#suggestions').hide();
        $('#advanced-search-title').addClass('open');
        if (cb) {
            $('#advanced-search-options').show('slide', { direction: 'up' }, 'slow', cb);
        } else {
            $('#advanced-search-options').show('slide', { direction: 'up' }, 'slow');
        }
    },
    backward: function(cb) {
        $('#advanced-search-title').addClass('open');
        if (cb) {
            $('#advanced-search-options').show('slide', { direction: 'up' }, 'slow', cb);
        } else {
            $('#advanced-search-options').show('slide', { direction: 'up' }, 'slow');
        }
    }
};

var preferencesTrigger = {
    forward: function(cb) {
        $('#advanced-search-title').removeClass('open');
        $('#advanced-search-options').hide('slide', { direction: 'up' }, 'slow');
        if (cb) cb();
    },
    backward: function(cb) {
        if (cb) cb();
    }
};

$(document).ready(function(){
    prepareOS();
    prepareMarketplaceFeatured();
    prepareSearch();
    prepareAnnotations();
    prepareContentSources('content-sources');
    prepareAvailableResultsApps('results-apps');
});
