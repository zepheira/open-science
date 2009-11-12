/**
 * Copyright 2008-2009 Zepheira LLC
 */

var Market = {
    LinkRel: OS.constants.rel.link,
    TypeRel: OS.constants.rel.type,
    GetRel: OS.constants.rel.get,
    types: {},
    servicesURI: '/services/',
    serviceTypeCountTotal: 0,
    serviceTypeCount: 0,
    errorFlag: false,
    finished: null,
    data: { "items": [] }
};

Market.types[OS.constants.serviceTypes.set] = 'set';
Market.types[OS.constants.serviceTypes.individual] = 'individual';
Market.types[OS.constants.serviceTypes.content] = 'content';
Market.types[OS.constants.serviceTypes.lens] = 'lens';

Market.ServiceType = function(uri) {
    this._uri = uri;
    this._name = this._uri.substring(this._uri.lastIndexOf('/')+1);
}

Market.ServiceType.prototype.getUri = function() {
    return this._uri;
}

Market.ServiceType.prototype.getName = function() {
    return this._name;
}

Market.Service = function(id, name, uri, linkrel, getrel, published, description, icon, category, context) {
    this._id = id;
    this._name = name;
    this._uri = uri;
    this._getrel = getrel;
    this._linkrel = linkrel;
    this._published = published;
    this._description = description;
    this._icon = icon;
    this._category = category;
    this._context = context;
}

Market.Service.prototype.getId = function() {
    return this._id;
}

Market.Service.prototype.getName = function() {
    return this._name;
}

Market.Service.prototype.getUri = function() {
    return this._uri;
}

Market.Service.prototype.getLinkrel = function() {
    return this._linkrel;
}

Market.Service.prototype.getGetrel = function() {
    return this._getrel;
}

Market.Service.prototype.getPublished = function() {
    return this._published;
}

Market.Service.prototype.getDescription = function() {
    return this._description;
}

Market.Service.prototype.getIcon = function() {
    return this._icon;
}

Market.Service.prototype.getCategory = function() {
    return this._category;
}

Market.Service.prototype.getContext = function() {
    return this._context;
}

Market.Service.prototype.toJSON = function() {
    var json = {
        "type" : "Application",
        "applicationlink" : "application.html",
        "label" : this.getName(),
        "title" : this.getName(),
        "uri" : this.getId(),
        "id" : this.getId(),
        "category": this.getCategory(),
        "contextClassification": this.getContext() 
    };
//        "isodate" : this.getPublished(),
    if (typeof this.getLinkrel() != 'undefined') {
        json['linkrel'] = this.getLinkrel();
    }
    if (typeof this.getGetrel() != 'undefined') {
        json['getrel'] = this.getGetrel();
    }
    return json;
}

function processTypeResponse(xml, status) {
    var marketServiceTypes = [];
    $('service>workspace>collection', xml).each(function(){
        // do not want content sources
        if ($(this).attr('href').indexOf('services/content') == -1) {
            var st = new Market.ServiceType($(this).attr('href'));
            marketServiceTypes.push(st);
            Market.serviceTypeCountTotal++;
        }
    });
    for (var i = 0; i < marketServiceTypes.length; i++) {
        retrieveApplications(marketServiceTypes[i]);
    }
}

function processTypeError(xhr, status, ex) {
    Market.errorFlag = true;
    busy(false);
    notifyUser('<p>Services failed to load.  Sorry for the inconvenience, please try again later.</p>');
}

function prepareMarketData(fDone) {
    Market.finished = fDone;
    busy(true);
    $.ajax({
        async: true,
        cache: doCache(),
        dataType: 'xml',
        error: processTypeError,
        success: processTypeResponse,
        type: 'GET',
        url: Market.servicesURI
    });
}

function retrieveApplications(serviceType) {
    $.ajax({
        async: true,
        cache: doCache(),
        dataType: 'xml',
        error: processApplicationError,
        success: function(xml, status) { 
            processApplicationResponse(xml, status, serviceType);
        },
        type: 'GET',
        url: serviceType.getUri()
    });
}

function processApplicationResponse(xml, status, serviceType) {
    var context = Market.types[$('feed>link[rel="'+Market.TypeRel+'"]', xml).attr('href')];
    $('feed>entry', xml).each(function(){
        var name = $('title', this).text();
        var id = $('id', this).text();
        var uri = $('link[rel="self"]', this).attr('href');
        var linkrel = $('link[rel="'+Market.LinkRel+'"]', this).attr('href');
        var getrel = $('link[rel="'+Market.GetRel+'"]', this).attr('href');
        var published = $('published', this).text();
        var description = $('content', this).text();
        var icon = $('link[rel="related"]', this).attr('href');
        var m = new Market.Service(id, name, uri, linkrel, getrel, published, description, icon, serviceType.getName(), context);
        Market.data.items.push(m.toJSON());
    });
    Market.serviceTypeCount++;
    checkFinished();
}

function processApplicationError(xhr, status, ex) {
    Market.errorFlag = true;
    Market.serviceTypeCountTotal--;
    checkFinished();
}

function checkFinished() {
    if ((Market.serviceTypeCount > 0 &&
        !Market.errorFlag &&
        Market.serviceTypeCount == Market.serviceTypeCountTotal) ||
       (Market.errorFlag &&
        Market.serviceTypeCount == Market.serviceTypeCountTotal)) {
        if (window.exhibit) {
            window.exhibit.getDatabase().loadData(Market.data);
            if (Market.finished) {
                Exhibit.ExhibitJSONImporter.load('/data/ratings.json', window.exhibit.getDatabase(), Market.finished);
            } else {
                Exhibit.ExhibitJSONImporter.load('/data/ratings.json', window.exhibit.getDatabase());
            }
        }
        busy(false);
    }
}

