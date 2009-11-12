/**
 * Copyright 2008-2009 Zepheira LLC
 */

var ResultControl = {
    apps: false,
    setup: null
};

var prepareResultControl = function() {
    $('#applications-widget-select option:eq(0)').attr('selected','selected');

    $('select#applications-widget-select').bind('change',function(){
        $('#applications-describe').html($('#applications-widget-select option:selected').attr('title'));
    });

    var setupApps = function() {
        if (!ResultControl.apps && Personal.getActiveLone().length > 0) {
            var loneApps = Personal.getActiveLone();
            for (var i = 0; i < loneApps.length; i++) {
                var lapp = loneApps[i];
                var ltitle = window.exhibit.getDatabase().getObject(lapp, 'title');
                var ldesc =  window.exhibit.getDatabase().getObject(lapp, 'description');
                $('#applications-widget-select').append('<option value="'+lapp+'" title="'+ldesc+'">'+ltitle+'</option>');
            }
            ResultControl.apps = true;
        }
    }
    ResultControl.setup = setupApps;

    $('#advanced-search-title').css('margin-left',0);
    $('#q').val(OS.map['q']);
    $('#main-search-return em').text(OS.map['q']);
    var searchhref = $('#main-search-return').attr('href');
    $('#main-search-return').attr('href',searchhref+'?q='+escape(OS.map['q'].replace(/ /g,'+')));
    $('#frames-break').append('<a href="'+OS.map['url']+'" target="_top">Remove Frame</a>');
};

$(document).ready(function(){
    var fDone = function() {
        window.exhibit = Exhibit.create();
        prepareOS();
        prepareSearch();
        prepareAnnotations();
        prepareResultControl();
        if (OS.services) {
            prepareMarketData(ResultControl.setup);
            prepareResultData();
        }
        prepareContentSources('content-sources');
        if (OS.services) {
            prepareAvailableResultsApps('results-apps');
        }
    }

    window.database = Exhibit.Database.create();
    window.database.loadDataLinks(fDone);
});
