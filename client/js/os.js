/**
 * Copyright 2008-2009 Zepheira LLC
 */

// This file must be included on every page.

// common library
var OS = {
    map: null,
    constants: {
        "purl": "http://purl.zepheira.com/osci/" // This setting is key.
    },
    // This setting can be altered to turn off anything related
    // to the marketplace
    services: false
};

OS.constants.rel = {
    "os": OS.constants.purl + "search",
    "get": OS.constants.purl + "get",
    "link": OS.constants.purl + "linkrel",
    "type": OS.constants.purl + "service-type"
};

OS.constants.serviceTypes = {
    "set": OS.constants.purl + "service-types/set",
    "individual": OS.constants.purl + "service-types/individual",
    "content": OS.constants.purl + "service-types/content",
    "lens": OS.constants.purl + "service-types/lens"
};

var prepareOS = function() {
    $('h1:eq(0),.home').bind('click',function(){
        window.top.document.location = 'index.html';
    }).attr('title','Back to the initial OS search page');
    OS.map = parseQueryString(document.location.search.substring(1));
    if (typeof OS.map['q'] === 'undefined') {
        OS.map = parseQueryString(window.parent.document.location.search.substring(1));
    }
    if (typeof OS.map['q'] === 'undefined') {
        OS.map['q'] = '';
    }
    if (!OS.services) {
	$('.services').hide();
    }
};

var parseQueryString = function(qs) {
    var map = {};
    var params = qs.split(/&/);
    for (var p in params) {
        var info = params[p].split("=");
        var key = info.shift();
        var val = unescape(info.join("=")).replace(/\+/g,' ');
        if (typeof map[key] === 'undefined') {
            map[key] = val;
        } else if (typeof map[key] === 'string') {
            var first = map[key];
            map[key] = [first, val];
        } else {
            map[key].push(val);
        }
    }
    return map;
}

var doCache = function() {
    return (typeof OS.map['nocache'] === 'undefined');
}

var busy = function(isBusy) {
    if (window.exhibit) {
        if (isBusy) {
            Exhibit.UI.showBusyIndicator();
        } else {
            Exhibit.UI.hideBusyIndicator();
        }
    }
}

var notifyUser = function(msg) {
    if ($('#screen').length == 0) {
        $('body').prepend($('<div id="screen"></div>)'));
    }
    if ($('#warning-dialog').length == 0) {
        $('body').prepend($('<div id="warning-dialog"></div>').html(msg));
    } else {
        $('#warning-dialog').empty();
        $('#warning-dialog').html(msg);
    }
    $('#warning-dialog').append('<p><button>OK</button></p>');
    $('#warning-dialog button').one('click', function(){
        $('#warning-dialog').fadeOut('fast');
        $('#screen').hide();
    });
    $('#screen').show();
    $('#warning-dialog').fadeIn('fast');
}

var Personal = {};

Personal.get = function(key) {
    var set = $.cookie(key);
    if (set) {
        return $.secureEvalJSON(set);
    } else {
        return [];
    }
}

/**
 * Application ownership
 */

Personal.getActiveLenses = function() {
    return Personal.get('app-lenses');
}

Personal.getActiveResults = function() {
    return Personal.get('app-apps');
}

Personal.getActiveLone = function() {
    return Personal.get('app-lone');
}

Personal.getActiveApplications = function() {
    var apps = [];
    var lenses = Personal.getActiveLenses();
    var results = Personal.getActiveResults();
    var lone = Personal.getActiveLone();
    apps = apps.concat(lenses);
    apps = apps.concat(results);
    apps = apps.concat(lone);
    return apps;
}

Personal.isPurchasedApp = function(app) {
    var apps = Personal.getActiveResults();
    for (var i = 0; i < apps.length; i++) {
        if (apps[i] == app) {
            return true;
        }
    }
    return false;   
}

Personal.isPurchasedLens = function(lens) {
    var lenses = Personal.getActiveLenses();
    for (var i = 0; i < lenses.length; i++) {
        if (lenses[i] == lens) {
            return true;
        }
    }
    return false;   
}

Personal.purchaseApps = function(db, el, pat, att) {
    var lenses = [], results = [], result = [];
    el.find(pat).each(function() {
        var itemid = $(this).attr(att);
        var classification = db.getObject(itemid, 'contextClassification');
        switch(classification.toLowerCase()) {
            case("lens"):
                lenses.push(itemid);
                break;
            case("individual"):
                result.push(itemid);
                break;
            case("set"):
                results.push(itemid);
                break;
        }
    });

    Personal.setActiveLenses(lenses);
    Personal.setActiveResults(results);
    Personal.setActiveLone(result);
}

Personal.setActiveLenses = function(apps) {
    var existing = Personal.getActiveLenses();
    $.cookie('app-lenses', $.toJSON(existing.concat(apps)));
}

Personal.setActiveResults = function(apps) {
    var existing = Personal.getActiveResults();
    $.cookie('app-apps', $.toJSON(existing.concat(apps)));
}

Personal.setActiveLone = function(apps) {
    var existing = Personal.getActiveLone();
    $.cookie('app-lone', $.toJSON(existing.concat(apps)));
}

Personal.clearPurchases = function() {
    $.cookie('app-lenses', null);
    $.cookie('app-apps', null);
    $.cookie('app-lone', null);
}

/**
 * Preferred search service and application
 */
Personal.hasAdHoc = function() {
    return (document.location.search.length > 0);
}

Personal.getPreferredSources = function() {
    return Personal.get('pref-sources');
}

Personal.getAdHocSources = function() {
    var sources = OS.map['source'] || [];
    if (typeof sources === 'string') {
        return [sources];
    } else {
        return sources;
    }
}

Personal.getPreferredApps = function() {
    return Personal.get('pref-apps');
}

Personal.getAdHocApps = function() {
    var apps = OS.map['app'] || [];
    if (typeof apps === 'string') {
        return [apps];
    } else {
        return apps;
    }
}

Personal.getPreferredLens = function() {
    return Personal.get('pref-lens');
}

Personal.isPreferredSource = function(source) {
    var sources = Personal.getPreferredSources();
    for (var i = 0; i < sources.length; i++) {
        if (sources[i] == source) {
            return true;
        }
    }
    return false;
}

Personal.isAdHocSource = function(source) {
    var sources = Personal.getAdHocSources();
     for (var i = 0; i < sources.length; i++) {
        if (sources[i] == source) {
            return true;
        }
    }
    return false;
}

Personal.isPreferredApp = function(app) {
    var apps = Personal.getPreferredApps();
    for (var i = 0; i < apps.length; i++) {
        if (apps[i] == app) {
            return true;
        }
    }
    return false;
}

Personal.isAdHocApp = function(app) {
    var apps = Personal.getAdHocApps(); 
     for (var i = 0; i < apps.length; i++) {
        if (apps[i] == app) {
            return true;
        }
    }
    return false;
}

Personal.isPreferredLens = function(lens) {
    var l = Personal.getPreferredLens();
    for (var i = 0; i < l.length; i++) {
        if (l[i] == lens) {
            return true;
        }
    }
    return false;
}

Personal.setPreferredSources = function(sources) {
    $.cookie('pref-sources', $.toJSON(sources));
}

Personal.setPreferredApps = function(apps) {
    $.cookie('pref-apps', $.toJSON(apps));
}

Personal.setPreferredLens = function(lens) {
    $.cookie('pref-lens', $.toJSON(lens));
}

Personal.savePreferences = function(sources, apps, lens) {
    Personal.setPreferredSources(sources);
    Personal.setPreferredApps(apps);
    Personal.setPreferredLens(lens);
}

Personal.clearPreferences = function() {
    $.cookie('pref-sources', null);
    $.cookie('pref-apps', null);
    $.cookie('pref-lens', null);
}
