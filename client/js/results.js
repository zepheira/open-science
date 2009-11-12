/**
 * Copyright 2008-2009 Zepheira LLC
 */

var preFacetDisplayTrigger = {
    forward: function(cb) {
        if (cb) cb();
    },
    backward: function(cb) {        
        $('#facet-display-controls').hide('slide', { direction: 'up' }, 'slow', cb);
        $('#facet-display-control-title').removeClass('open');
    }
}

var facetDisplayTrigger ={
    forward: function(cb) {
        $('#facet-display-control-title').addClass('open');        
        $('#facet-display-controls').show('slide', { direction: 'up' }, 'slow', cb);
    },
    backward: function(cb) {
        window.exhibit.getCollection('default').clearAllRestrictions();
        $('#facet-display-control-title').addClass('open');        
        $('#facet-display-controls').show('slide', { direction: 'up' }, 'slow', cb);
    }
}

var textSearchTrigger = {
    forward: function(cb) {
        $('#facet-display-controls').hide('slide', { direction: 'up' }, 'slow', cb);
        $('#facet-display-control-title').removeClass('open');
        $('.exhibit-text-facet input').focus();
    },
    backward: function(cb) {
        window.exhibit.getCollection('default').clearAllRestrictions();
        $('.exhibit-text-facet input').focus();
        if (cb) cb();
    }
}

var sourceFacetTrigger = {
    forward: function(cb) {
        window.exhibit.getCollection('default').clearAllRestrictions();
        if (cb) cb();
    },
    backward: function(cb) {
        if (cb) cb();
    }
}

var preApplicationMenuTrigger = {
    forward: function(cb) {
        if (cb) cb();
    },
    backward: function(cb) {
        $('#application-menu').hide('slide',{direction:'up'},'slow', cb);
    }
};

var applicationMenuTrigger = {
    forward: function(cb) {
        $('#application-menu').show('slide',{direction:'up'},'slow', cb);
    },
    backward: function(cb) {
        $('#application-menu').show('slide',{direction:'up'},'slow', cb);
    }
};

var postApplicationMenuTrigger = {
    forward: function(cb) {
        $('#application-menu').hide('slide',{direction:'up'},'slow', cb);
    },
    backward: function(cb) {
        if (cb) cb();
    }
};

var SearchResults = {
    apps: false,
    lenses: false,
    bound: false,
    setup: null,
    lensCountTotal: 0,
    lensCount: 0
};

var prepareResults = function() {
    SimileAjax.History._plainDocumentTitle = document.title;

    $('#facet-display-control-title').bind('click',function(){
        if($('#facet-display-controls:visible').length == 0) {
            $('#facet-display-control-title').addClass('open');
        } else {
            $('#facet-display-control-title').removeClass('open');
        }
        $('#facet-display-controls').toggle('slide', { direction: 'up' }, 'slow');
    });

    $('#date-facet-check').bind('click',function(){
        if ($(this).attr('checked')) {
            $('#date-facet').fadeIn('slow');
        } else {
            $('#date-facet').fadeOut('slow');
        }
    });

    $('#authors-facet-check').bind('click',function(){
        if ($(this).attr('checked')) {
            $('#authors-facet').fadeIn('slow');
        } else {
            $('#authors-facet').fadeOut('slow');
        }
    });

    $('#subject-facet-check').bind('click',function(){
        if ($(this).attr('checked')) {
            $('#subject-facet').fadeIn('slow');
        } else {
            $('#subject-facet').fadeOut('slow');
        }
    });

// @@@ manifesting a twofold bug
//     not setting initial count even after firing after db load
//     hidden elements not showing when something is selected, to reset
//       filters, show 'out of' message, etc.  did slide effect screw up
//       normal hiding and showing?
    var total = 0;
    var setInitialResultCount = function() {
        total = parseInt($('.exhibit-collectionSummaryWidget-count').text());
        $('#results-total-count').text(total);
        $('.reset-results').bind('click',function(){
            var state = {};
            var collection = window.exhibit.getCollection('default');
            SimileAjax.History.addLengthyAction(
                function() { state.restrictions = collection.clearAllRestrictions(); },
                function() { collection.applyRestrictions(state.restrictions); },
                Exhibit.CollectionSummaryWidget.l10n.resetActionTitle
            );
        });
        updateResultCount();
    };
    var updateResultCount = function() {
        var f = function() {
        var count = parseInt($('.exhibit-collectionSummaryWidget-count').text());
        if (isNaN(count)) count = 0;
        $('#results-count').text(count);
        if(count<total){
            $('#results-total').css('display','inline');
            $('#facet-reset').css('display','block');
        } else {
            $('#results-total').css('display','none');
            $('#facet-reset').css('display','none');
        }
        };
        // ugly hack, but not doing this introduces a race condition and
        // the count is from the last action instead of the most recent one
        setTimeout(f, 100);
    };

    var onItemsChangedUpdate = function() {
        updateResultCount();
    }

    $('#q').val(OS.map['q']);

    $('h3.result-main-link a').live('click',function(e){
        e.preventDefault();
        var dest = $(this).attr('href');
        dest += '&q=' + OS.map['q'];
        dest += (typeof(OS.map['annotate'])=='undefined' || dest.indexOf('annotate=') > 0) ? '' : '&annotate=' + OS.map['annotate'];
        document.location = dest;
    });

    var viewSelector;
    for (var i in window.exhibit._componentMap) {
        if (window.exhibit._componentMap[i]._viewConstructors) {
            viewSelector = window.exhibit._componentMap[i];
            break;
        }
    }

    $('#results-format-select option:eq(0)').attr('selected',true);
    $('#results-format-select').data('current', 0);
    $('#results-format-select').bind('change',function(){
        var viewIdx, viewName;
        viewIdx = $(this).val();
        viewName = $(this).find('option').eq(viewIdx).text();
        var perform = function() {
            viewSelector._switchView(viewIdx);
            $(this).data('current', viewIdx);
        };
        var undo = function() {
            viewSelector._switchView($(this).data('current'));
        };
        SimileAjax.History.addAction({
            perform: perform,
            undo: undo,
            label: "select "+viewName+" view",
            uiLayer: SimileAjax.WindowManager.getBaseLayer()
        });
    });

    var toggleUp = function(which, select) {
        if (select) {
            which.addClass('prioritize-up-selected').removeClass('prioritize-up').attr('title',"You've given a thumbs up rating to this result");
        } else {
            which.addClass('prioritize-up').removeClass('prioritize-up-selected').attr('title',"Give a thumbs up rating to this result");
        }
    };
    var toggleDown = function(which, select) {
        if (select) {
            which.addClass('prioritize-down-selected').removeClass('prioritize-down').attr('title',"You've given a thumbs down rating to this result");
        } else {
            which.addClass('prioritize-down').removeClass('prioritize-down-selected').attr('title',"Give a thumbs down rating to this result");
        }
    };

    $('.prioritize-up').live('click',function(){
        toggleUp($(this), true);
        toggleDown($(this).parents('.prioritize-widget').eq(0).children('.prioritize-down-selected'), false);
    });
    $('.prioritize-down').live('click',function(){
        toggleDown($(this), true);
        toggleUp($(this).parents('.prioritize-widget').eq(0).children('.prioritize-up-selected'), false);
    });

    $('.prioritize-up-selected').live('click',function(){
        toggleUp($(this), false);
    });
    $('.prioritize-down-selected').live('click',function(){
        toggleDown($(this), false);
    });

    $('#current-app').bind('click',function(e){
        e.stopPropagation();
        if ($('#application-menu:visible').length > 0) {
            $('#current-app').removeClass('open').addClass('closed');
            $('#application-menu').hide('slide',{direction:'up'},'slow');
        } else {
            $('#current-app').removeClass('closed').addClass('open');
            $('#application-menu').show('slide',{direction:'up'},'slow');
        }
    });

    $('#current-app').bind('mouseover',function(){
        $('.active-application').addClass('which-application');
    });

    $('#current-app').bind('mouseout',function(){
        $('.active-application').removeClass('which-application');        
    });

    $('.result-authors span span').live('click',function(){
        window.exhibit.getComponent("authors-facet")._filter($(this).text(), $(this).text(), true);
    });

    window.exhibit.getCollection("default").addListener({
        onItemsChanged: onItemsChangedUpdate
    });

    window.exhibit.getDatabase().addListener({
        onAfterLoadingItems: setInitialResultCount
    });

    var setupViews = function() {
        if (Personal.isPreferredLens('default-lens')) {
            $('#results-format-select').append('<option id="default-list" value="0" selected="true">List</option>').append('<option id="default-timeline" value="1">Timeline</option>');
        } else if (Personal.isPreferredLens('default-timeline')) {
            $('#results-format-select').append('<option id="default-list" value="0">List</option>').append('<option id="default-timeline" value="1" selected="true">Timeline</option>');
        } else {
            $('#results-format-select').append('<option id="default-list" value="0">List</option>').append('<option id="default-timeline" value="1">Timeline</option>');
        }
    }

    var setupApps = function() {
        if (!SearchResults.apps && Personal.getActiveResults().length > 0) {
            var resultsApps = Personal.getActiveResults();
            for (var i = 0; i < resultsApps.length; i++) {
                var resapp = resultsApps[i];
                var resicon = window.exhibit.getDatabase().getObject(resapp, 'icon');
                var restitle = window.exhibit.getDatabase().getObject(resapp, 'title');
                var resdesc =  window.exhibit.getDatabase().getObject(resapp, 'description');
                var reslinkrel = window.exhibit.getDatabase().getObject(resapp, 'linkrel');
                if (Personal.isAdHocApp(resapp)) {
                    $('.current-app').removeClass('current-app');
                    $('#application-menu').append('<li class="current-app" rel="'+reslinkrel+'"><img title="'+resdesc+'" src="'+resicon+'" /><br />'+restitle+'</li>');
                    $('#current-app').empty().append($('#application-menu li:last').clone().contents());
                } else {
                    $('#application-menu').append('<li rel="'+reslinkrel+'"><img title="'+resdesc+'" src="'+resicon+'" /><br />'+restitle+'</li>');
                }
            }
            SearchResults.apps = true;
        }

        var checkLensFinished = function() {
            if (SearchResults.lensCount == SearchResults.lensCountTotal) {
                viewSelector._switchView($('#results-format-select').val());
            }
        }

        if (!SearchResults.lenses) {
            var viewApps = Personal.getActiveLenses().sort();
            SearchResults.lensCountTotal = viewApps.length;
	    setupViews();
            for (var i = 0; i < viewApps.length; i++) {
                var vapp = viewApps[i];
                var vtitle = window.exhibit.getDatabase().getObject(vapp, 'title');
                var getrel = window.exhibit.getDatabase().getObject(vapp, 'getrel');
		if (Personal.isPreferredLens(vapp)) {
                    $('#results-format-select').append('<option id="'+vapp+'" value="'+(i+2)+'" selected="true">'+vtitle+'</option>');
                } else {
                    $('#results-format-select').append('<option id="'+vapp+'" value="'+(i+2)+'">'+vtitle+'</option>');
                }
                var addComponent = function(data, status) {
                    $('#exhibit-view-panel').append(data);
                    Exhibit.ViewPanel.addView(window.exhibit.getComponent('exhibit-view-panel'), $('#exhibit-view-panel>div:last').get(0), window.exhibit.getUIContext());
                    SearchResults.lensCount++;
                    checkLensFinished();
                };
                $.get(getrel, null, addComponent, 'html');
            }
            SearchResults.lenses = true;
        }

        if (SearchResults.bound) return;
        $('#application-menu li').bind('click',function(e){
            $('.current-app').removeClass('current-app');
            $(this).addClass('current-app');
            var cur = $(this).clone();
            $('#current-app').empty().append(cur.contents());
            $('#current-app').removeClass('open').addClass('closed');
            $('#application-menu').hide();
            var rel = $(this).attr('rel');
            var showTagging = function() {
                if (rel == 'none') {
                } else {
                    var preds = window.exhibit.getDatabase().getAllProperties();
                    var appProp;
                    for (var i = 0; i < preds.length; i++) {
                        if (window.exhibit.getDatabase()._properties[preds[i]]._uri == rel) {
                            appProp = preds[i];
                            break;
                        }
                    }
                    if (appProp != null) {
                        // @@@ how to pick the view associated with this too?
                        var fEl = $('<div style="display: none;"></div>');
                        $('#marketplace').before(fEl);
                        Exhibit.CloudFacet.create({
                            "showMissing": false,
                            "minimumCount": 2,
                            "expression": "." + appProp,
                            "facetLabel": $('#current-app').text() + " Terms"
                        }, fEl.get(0), window.exhibit.getUIContext());
                        fEl.addClass('active-application');
                        fEl.attr('id','active-application-cloud');
                        $('.active-application').fadeIn('slow');
                        fEl = $('<div style="display: none;"></div>');
                        $('#marketplace').before(fEl);
                        Exhibit.ListFacet.create({
                            "expression": "." + appProp,
                            "facetLabel": $('#current-app').text() + " Terms",
                            "showMissing": false,
                            "sortMode": "count"
                        }, fEl.get(0), window.exhibit.getUIContext());
                        fEl.addClass('active-application');
                        fEl.attr('id','active-application-list');
                        fEl = $('<div id="active-application-switcher" class="fake-link active-application">toggle facet type &raquo;</div>');
                        $('#active-application-cloud').before(fEl);
                        fEl.bind('click',function(){
                            if ($('#active-application-cloud:visible').length > 0) {
                                $('#active-application-cloud').fadeOut('slow', function(){
                                    $('#active-application-list').fadeIn('slow');
                                });
                            } else {
                                $('#active-application-list').fadeOut('slow', function(){
                                    $('#active-application-cloud').fadeIn('slow');
                                });
                            }
                        });
                    }
                }
            };
            if ($('.active-application').length > 0) {
                $('.active-application').fadeOut('slow',function(){
                    $('.active-application').remove();
                    showTagging();
                });
            } else {
                showTagging();
            }
        });
        SearchResults.bound = true;
    };
    if (OS.services) {
	SearchResults.setup = setupApps; 
    } else {
	SearchResults.setup = function() {
	    setupViews();
            viewSelector._switchView($('#results-format-select').val());
	};
    }
};

$(document).ready(function(){
    var fDone = function() {
        window.exhibit = Exhibit.create();
        var ctxt = window.exhibit.getUIContext();
        ctxt.putSetting("format/list/last-separator",", ");
        ctxt.putSetting("format/list/pair-separator",", ");
        window.exhibit.configureFromDOM();
        prepareOS();
        prepareAnnotations();
        prepareResults();
        prepareSearchQuery();
        if (OS.services) {
            prepareMarketData(SearchResults.setup);
        } else {
	    SearchResults.setup();
	}
        prepareContentSources('content-sources');
        if (OS.services)
            prepareAvailableResultsApps('results-apps');
        var delay = function() {
            $('.hide-initial').removeClass('hide-initial');
            prepareSearch();
        };
        setTimeout(delay, '2000');
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
