/**
 * Copyright 2008-2009 Zepheira LLC
 */

var AvailableResultsApps = {
    taggingURI: '/services/tagging',
    LinkRel: OS.constants.rel.link,
    elementId: null,
    callback: function(){},
    errorFlag: false,
    appsCountTotal: 0,
    appsCount: 0,
    apps: []
};

AvailableResultsApps.retrieveApplications = function() {
    $.ajax({
        async: true,
        cache: doCache(),
        dataType: 'xml',
        error: AvailableResultsApps.errorApplications,
        success: AvailableResultsApps.processApplications,
        type: 'GET',
        url: AvailableResultsApps.taggingURI
    });
}

AvailableResultsApps.processApplications = function(xml, status) {
    AvailableResultsApps.appsCountTotal = $('feed>entry', xml).length;
    $('feed>entry', xml).each(function(){
        var uri = $(this).children('link[rel="'+AvailableResultsApps.LinkRel+'"]').attr('href');
        if (typeof uri != 'undefined') {
            var full = $(this).children('title').text();
            var id = $(this).children('id').text();
            var nick = uri.substring(uri.lastIndexOf('/')+1);
            if (Personal.isPurchasedApp(id)) {
                AvailableResultsApps.apps.push({'name': full, 'nick': nick, 'uri': uri, 'id': id});
            }
        } else {
            AvailableResultsApps.appsCountTotal--;
        }
    });
    AvailableResultsApps.generateApplications();
}

AvailableResultsApps.errorApplications = function(xhr, status, ex) {
    // @@@ write this
    // log exception somewhere
}

AvailableResultsApps.generateApplications = function() {
    var el = $('<ul></ul>');
    if ((Personal.hasAdHoc() &&
        (Personal.getAdHocApps().length == 0 || Personal.getAdHocApps == ''))
         || (!Personal.hasAdHoc() && Personal.getPreferredApps().length == 0)) {
        el.append('<li><input type="radio" id="app-1" name="app" checked="true" value="" /><label for="app-1"><em>None</em></label></li>');
    } else {
        el.append('<li><input type="radio" id="app-1" name="app" value="" /><label for="app-1"><em>None</em></label></li>');
    }
    for (var i = 0; i < AvailableResultsApps.apps.length; i++) {
        var app = AvailableResultsApps.apps[i];
        var htmlid = "app-" + app.nick.toLowerCase();
        var li = $('<li></li>');
        if ((Personal.hasAdHoc() &&
             Personal.isAdHocApp(app.id))
            || (!Personal.hasAdHoc() && Personal.isPreferredApp(app.id))) {
            li.append('<input id="'+htmlid+'" value="'+app.id+'" type="radio" name="app" checked="true" />');
        } else {
            li.append('<input id="'+htmlid+'" value="'+app.id+'" type="radio" name="app" />');
        }
        li.append('<label for="'+htmlid+'">'+app.name+'</label>');
        el.append(li);
    }
    el.attr('id', AvailableResultsApps.elementId);
    $('#'+AvailableResultsApps.elementId).replaceWith(el);
    AvailableResultsApps.callback('apps');
    return el;
}

var prepareAvailableResultsApps = function(id, callback) {
    AvailableResultsApps.elementId = id;
    if (typeof callback != 'undefined')
        AvailableResultsApps.callback = callback;
    AvailableResultsApps.retrieveApplications(); 
}
