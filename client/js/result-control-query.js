/**
 * Copyright 2008-2009 Zepheira LLC
 */

var ResultQuery = {
    highlightingURI: '/services/highlighting',  
    LinkRel: OS.constants.rel.link,
    highlightingServices: [],
    resultErrorFlag: false,
    resultCountTotal: 0,
    resultCount: 0,
};

ResultQuery.retrieveHighlightingServices = function() {
    $.ajax({
        async: true,
        cache: doCache(),
        dataType: 'xml',
        error: ResultQuery.errorHighlightingServices,
        success: ResultQuery.processHighlightingServices,
        type: 'GET',
        url: ResultQuery.highlightingURI
    });
}

ResultQuery.errorHighlightingServices = function(xhr, status, ex) {
    // @@@ write this
}

ResultQuery.processHighlightingServices = function(xml, status) {
    $('feed>entry',xml).each(function(){
        ResultQuery.highlightingServices.push($(this).children('link[rel="'+ResultQuery.LinkRel+'"]').attr('href'));
    });
    ResultQuery.retrieveResult(OS.map['uri']);
}

ResultQuery.retrieveResult = function(resultURI) {
    $.ajax({
        async: true,
        cache: doCache(),
        dataType: 'xml',
        error: ResultQuery.errorResult,
        success: ResultQuery.processResult,
        type: 'GET',
        url: resultURI
    });
}

ResultQuery.processResult = function(xml, status) {
    var r = $('entry', xml);

    var highlights = {};
    for (var i = 0; i < ResultQuery.highlightingServices.length; i++) {
        service = ResultQuery.highlightingServices[i];
        r.children('link').filter(function(){
            return ($(this).attr('rel') == service);
        }).each(function(){
            if (!(service in highlights)) {
                highlights[service] = $(this).attr('href');
            }
        });
    }

    $('#applications-widget-select').bind('change',function(){
        for (var i = 0; i < ResultQuery.highlightingServices.length; i++) {
            service = ResultQuery.highlightingServices[i];
            if (typeof highlights[service] != 'undefined') {
                window.parent.$('#body').attr('src', highlights[service]);
            }
        }
    });
}

ResultQuery.errorResult = function(xhr, status, ex) {
    // @@@ write this
}

var prepareResultData = function() {
    ResultQuery.retrieveHighlightingServices();
}
