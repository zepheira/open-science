/**
 * Copyright 2008-2009 Zepheira LLC
 */

var AvailableLenses = {
    lensesURI: '/services/lenses',
    GetRel: OS.constants.rel.get,
    elementId: null,
    callback: function(){},
    errorFlag: false,
    lensesCountTotal: 0,
    lensesCount: 0,
    lenses: []
};

AvailableLenses.retrieveLenses = function() {
    $.ajax({
        async: true,
        cache: doCache(),
        dataType: 'xml',
        error: AvailableLenses.errorLenses,
        success: AvailableLenses.processLenses,
        type: 'GET',
        url: AvailableLenses.lensesURI
    });
}

AvailableLenses.processLenses = function(xml, status) {
    AvailableLenses.lensCountTotal = $('feed>entry', xml).length;
    $('feed>entry', xml).each(function(){
        var uri = $(this).children('link[rel="'+AvailableLenses.GetRel+'"]').attr('href');
        if (typeof uri != 'undefined') {
            var full = $(this).children('title').text();
            var id = $(this).children('id').text();
            var nick = id.substring(uri.lastIndexOf('/')-1);
            if (Personal.isPurchasedLens(id)) {
                AvailableLenses.lenses.push({'name': full, 'nick': nick, 'uri': uri, 'id': id});
            }
        } else {
            AvailableLenses.lensesCountTotal--;
        }
    });
    AvailableLenses.generateLenses();
}

AvailableLenses.errorLenses = function(xhr, status, ex) {
    // @@@ write this
    // log exception somewhere
}

AvailableLenses.generateLenses = function() {
    var lenses = [];
    var map = {};
    for (var i = 0; i < AvailableLenses.lenses.length; i++) {
       lenses.push(AvailableLenses.lenses[i].id); 
        map[AvailableLenses.lenses[i].id] = i;
    }
    lenses.sort();
    var el = $('<ul></ul>');
    if (Personal.getPreferredLens().length == 0 || Personal.isPreferredLens('default-list')) {
        el.append('<li><input type="radio" id="list" name="lens" value="default-list" checked="true" /><label for="list">List</li>');
	el.append('<li><input type="radio" id="timeline" name="lens" value="default-timeline" /><label for="timeline">Timeline</label></li>');
	el.append('<li><input type="radio" id="map" name="lens" value="default-map" /><label for="map">Map</label></li>');
    } else if (Personal.isPreferredLens('default-timeline')) {
        el.append('<li><input type="radio" id="list" name="lens" value="default-list" /><label for="list">List</li>');
	el.append('<li><input type="radio" id="timeline" name="lens" value="default-timeline" checked="true" /><label for="timeline">Timeline</label></li>');
	el.append('<li><input type="radio" id="map" name="lens" value="default-map" /><label for="map">Map</label></li>');
    } else if (Personal.isPreferredLens('default-map')) {
        el.append('<li><input type="radio" id="list" name="lens" value="default-list" /><label for="list">List</li>');
	el.append('<li><input type="radio" id="timeline" name="lens" value="default-timeline" /><label for="timeline">Timeline</label></li>');
	el.append('<li><input type="radio" id="map" name="lens" value="default-map" checked="true" /><label for="map">Map</label></li>');
    } else {
        el.append('<li><input type="radio" id="list" name="lens" value="default-list" /><label for="list">List</li>');
	el.append('<li><input type="radio" id="timeline" name="lens" value="default-timeline" /><label for="timeline">Timeline</label></li>');
	el.append('<li><input type="radio" id="map" name="lens" value="default-map" /><label for="map">Map</label></li>');
    }
    for (var i = 0; i < lenses.length; i++) {
        var lens = AvailableLenses.lenses[map[lenses[i]]];
        var htmlid = "lens-" + lens.nick.toLowerCase();
        var li = $('<li></li>');
        if (Personal.isPreferredLens(lens.id)) {
            li.append('<input id="'+htmlid+'" value="'+lens.id+'" type="radio" name="lens" checked="true" />');
        } else {
            li.append('<input id="'+htmlid+'" value="'+lens.id+'" type="radio" name="lens" />');
        }
        li.append('<label for="'+htmlid+'">'+lens.name+'</label>');
        el.append(li);
    }
    el.attr('id', AvailableLenses.elementId);
    $('#'+AvailableLenses.elementId).replaceWith(el);
    AvailableLenses.callback('lens');
    return el;
}

var prepareAvailableLenses = function(id, callback) {
    AvailableLenses.elementId = id;
    if (typeof callback != 'undefined')
        AvailableLenses.callback = callback;
    AvailableLenses.retrieveLenses(); 
}
