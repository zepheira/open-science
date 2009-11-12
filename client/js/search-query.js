/**
 * Copyright 2008-2009 Zepheira LLC
 */

/** TODO
 *  - error handling
 */

var SearchQuery = {
    taggingURI: '/services/tagging',
    sourcesURI: '/services/content',
    OSRel: OS.constants.rel.os,
    LinkRel: OS.constants.rel.link,
    tagQueue: [],
    taggingServices: [],
    tokens: ['', ''],
    searchCountTotal: 0,
    searchCount: 0,
    data: { "items": [], "properties": {} },
    tagPayload: { "items": [], "properties": {} },
    status: null
};

SearchQuery.retrieveTaggingServices = function() {
    $.ajax({
        async: true,
        cache: doCache(),
        dataType: 'xml',
        error: SearchQuery.errorTaggingServices,
        success: SearchQuery.processTaggingServices,
        type: 'GET',
        url: SearchQuery.taggingURI
    });
}

SearchQuery.errorTaggingServices = function(xhr, status, ex) {
    // @@@ write this
}

SearchQuery.processTaggingServices = function(xml, status) {
    $('feed>entry',xml).each(function(){
        SearchQuery.taggingServices.push($(this).children('link[rel="'+SearchQuery.LinkRel+'"]').attr('href'));
    });
    SearchQuery.retrieveSources();
}

SearchQuery.retrieveSources = function() {
    $.ajax({
        async: true,
        cache: doCache(),
        dataType: 'xml',
        error: SearchQuery.errorSources,
        success: SearchQuery.processSources,
        type: 'GET',
        url: SearchQuery.sourcesURI
    });
}

SearchQuery.processSources = function(xml, status) {
    SearchQuery.status.startLocating($('feed>entry', xml).length);
    $('feed>entry', xml).each(function(){
        var id = $(this).find('id').text();
        var name = $(this).find('title').text();
        var uri = $(this).find('link[rel="'+SearchQuery.OSRel+'"]').attr('href');
        var type = $(this).find('link[rel="'+SearchQuery.OSRel+'"]').attr('type');
        if (uri &&
            ((Personal.getAdHocSources().length > 0 &&
              Personal.isAdHocSource(id)) ||
            Personal.getAdHocSources().length == 0)) {
            SearchQuery.status.registerSource(id, name);
            SearchQuery.searchCountTotal++;
            SearchQuery.retrieveSource(uri, type, id);
        } else {
            SearchQuery.status.removePotential();
        }
    });
}

SearchQuery.errorSources = function(xhr, status, ex) {
    SearchQuery.status.abort();
    notifyUser('<p>Searching failed.  Sorry for the inconvenience, please try again later.</p>');
}

SearchQuery.retrieveSource = function(sourceURI, contentType, id) {
    $.ajax({
        async: true,
        cache: doCache(),
        dataType: 'xml',
        error: function(xhr, status, ex) {
            SearchQuery.errorSource(xhr, status, ex, id);
        },
        success: function(xml, status) {
            SearchQuery.processSource(xml, status, id);
        },
        type: 'GET',
        url: sourceURI,
        beforeSend: function(xhr) {
            xhr.setRequestHeader("Accept", contentType); 
        }
    });
}

SearchQuery.processSource = function(xml, status, id) {
    SearchQuery.searchCount++;
    $('OpenSearchDescription',xml).each(function(){
// @@@ hack, not good if there is more than one Url
        var t = $(this).find('*[type="application/atom+xml"][template]:last').attr('template');
        var uri = t.replace(/\{searchTerms\?\}/, OS.map['q'].replace(/ /g,'+')).replace(/&[^=]*=\{[^\?]*\?\}/g, '');
        var nick = $(this).children('ShortName').text();
        if (uri) {
            SearchQuery.status.searchingSource(id);
            SearchQuery.search(uri, nick, id);
        }
    });
}

SearchQuery.errorSource = function(xhr, status, ex, id) {
    SearchQuery.searchCount++;
    SearchQuery.status.unregisterSource(id);
}

SearchQuery.search = function(searchURI, source, id) {
    $.ajax({
        async: true,
        cache: doCache(),
        dataType: 'xml',
        error: function(xhr, status, ex) {
            SearchQuery.errorSearch(xhr, status, ex, id);
        },
        success: function(xml, status) {
            SearchQuery.processSearch(xml, status, source, id);
        },
        type: 'GET',
        url: searchURI
    });
}

SearchQuery.processSearch = function(xml, status, source, id) {
    var payload = {'items':[]};
    SearchQuery.status.searchedSource(id, $('feed>entry',xml).length);
    $('feed>entry',xml).each(function(){
        var rid = $(this).children('id').text();
        var resultURI = $(this).children('link[rel="self"]').attr('href');
        if (resultURI) {
            SearchQuery.status.registerResult(id, rid);
            payload.items.push(SearchQuery.processBaseResult($(this), source, resultURI).toJSON());
            SearchQuery.retrieveResult(resultURI, source, id, rid);
        }
    });
    window.exhibit.getDatabase().loadData(payload);
    SearchQuery.checkSearchFinish();
}

SearchQuery.errorSearch = function(xhr, status, ex, id) {
    SearchQuery.status.errorSearchingSource(id);
    SearchQuery.checkSearchFinish();
}

SearchQuery.checkSearchFinish = function() {
    if (SearchQuery.status.resultsDone && OS.services) {
        SearchQuery.tagCheckpoint();
    }
}

SearchQuery.tagCheckpoint = function() {
    while (typeof SearchQuery.tokens.pop() != 'undefined') {
        if (SearchQuery.tagQueue.length > 0) {
            var t = SearchQuery.tagQueue.pop();
            t();
        } else {
            break;
        }
    }
    if (SearchQuery.status.tagDone) {
        window.exhibit.getDatabase().loadData(SearchQuery.tagPayload);
    }
}

SearchQuery.retrieveResult = function(resultURI, source, sid, rid) {
    var f = function() {
        $.ajax({
            async: true,
            cache: doCache(),
            dataType: 'xml',
            error: function(xhr, status, ex) {
                SearchQuery.errorResult(xhr, status, ex, sid, rid);
            },
            complete: function(xhr, status) {
                if (status == "success" || status == "notmodified") {
                    SearchQuery.processResult(xhr, status, source, resultURI, sid, rid);
                }
            },
            type: 'GET',
            url: resultURI
        });
    };
    SearchQuery.tagQueue.push(f);
}

SearchQuery.serviceToProperty = function(serviceURI) {
    return serviceURI.substring(serviceURI.lastIndexOf('/')+1);
}

SearchQuery.Result = function(id, type, title, link, resultURI, updated, description, source, subjects, authors, tags, cover, frame) {
    this._id = id;
    this._type = type;
    this._title = title;
    this._link = link;
    this._resultURI = resultURI;
    this._updated = updated;
    this._description = description;
    this._source = source;
    this._subjects = subjects;
    this._authors = authors;
    this._tags = tags;
    this._cover = cover;
    this._frame = frame;
    this._relevance = Math.round(Math.random()*10000);
}

SearchQuery.Result.prototype.getId = function() {
    return this._id;
}

SearchQuery.Result.prototype.getType = function() {
    return this._type;
}

SearchQuery.Result.prototype.getTitle = function() {
    return this._title;
}

SearchQuery.Result.prototype.getLink = function() {
    return this._link;
}

SearchQuery.Result.prototype.getEscapedLink = function() {
    return escape(this._link);
}

SearchQuery.Result.prototype.getResultURI = function() {
    return this._resultURI;
}

SearchQuery.Result.prototype.getUpdated = function() {
    return this._updated.substring(0,10);
}

SearchQuery.Result.prototype.getYear = function() {
    return this._updated.substring(0,4);
}

SearchQuery.Result.prototype.getDescription = function() {
    return this._description;
}

SearchQuery.Result.prototype.getDataSource = function() {
    return this._source;
}

SearchQuery.Result.prototype.getSubjects = function() {
    return this._subjects;
}

SearchQuery.Result.prototype.getAuthors = function() {
    return this._authors;
}

SearchQuery.Result.prototype.getAllTags = function() {
    return this._tags;
}

SearchQuery.Result.prototype.getTags = function(service) {
    return this._tags[service];
}

SearchQuery.Result.prototype.getCover = function() {
    return this._cover;
}

SearchQuery.Result.prototype.getFrame = function() {
    return this._frame;
}

SearchQuery.Result.prototype.getRelevance = function() {
    return this._relevance;
}

SearchQuery.Result.prototype.toJSON = function() {
    var json = {
        "id": this.getId(),
        "label": this.getTitle(),
        "title": this.getTitle(),
        "link": this.getLink(),
        "escaped_link": this.getEscapedLink(),
        "resultURI": this.getResultURI(),
        "dataSource": this.getDataSource(),
        "subject": this.getSubjects(),
        "authors": this.getAuthors(),
        "pubDate": this.getUpdated(),
        "pubYear": this.getYear(),
        "description": this.getDescription(),
        "relevance": this.getRelevance(),
        "type": this.getType()
    }

    if (this.getType() == 'Video' && this.getFrame() != "") {
        json['snapshot'] = this.getFrame();
    } else if (this.getCover() != "") {
        json['journal_cover'] = this.getCover();
    }

    return json;
}

// and here we tick up results, firing off a page update when all have
// rolled in - but subtracting from the necessary count when errors
// arise; generally the strategy, lower the quota when an error occurs
SearchQuery.processResult = function(xhr, status, source, resultURI, sid, rid) {
    SearchQuery.status.registerResultTagging(sid, rid);
    SearchQuery.processTags($('entry', xhr.responseXML), xhr.status, rid);
}

SearchQuery.processBaseResult = function(r, source, resultURI) {
    var id = r.children('id').text();
    var title = r.children('title').text();
    var updated = r.children('updated').text();
    var description = r.children('summary').text();
    var link = r.children('content').attr('src');
 
    var authors = [];
    r.children('author').each(function(){
        var author = $(this).children('name').text();
        authors.push(author);
    });

    var subjects = [];
    r.children('category').each(function(){
        var subject = $(this).attr('term');
        if (subject != '') subjects.push(subject);
    });

    // unsure of whether this can be used
    var cover = '';

    var frame = r.find('link[rel="icon"]').attr('href');

    var itemType = (source == 'JoVE') ? 'Video' : 'Publication';

    // bundle all of this into a JSON object and load into exhibit 
    var result = new SearchQuery.Result(id, itemType, title, link, resultURI, updated, description, source, subjects, authors, {}, cover, frame);
    return result;
}

SearchQuery.processTags = function(r, status, id) {
    var tags = {};
    if (status == 202) {
        // do nothing with tags
    } else {
        r.children('link[title]').each(function(){
            var service = $(this).attr('rel');
            var tag = $(this).attr('title');
            if (!(service in tags)) {
                tags[service] = [tag];
            } else {
                tags[service].push(tag);
            }
        });

        var json = {
            "id": id
        };
        for (var i = 0; i < SearchQuery.taggingServices.length; i++) {
            var service = SearchQuery.taggingServices[i];
            for (var j in tags) {
                if (service == j) {
                    json[SearchQuery.serviceToProperty(service)] = tags[service];
                    if (!(SearchQuery.serviceToProperty(service) in SearchQuery.tagPayload.properties)) {
                       SearchQuery.tagPayload.properties[SearchQuery.serviceToProperty(service)] = {'uri': service};
                    }
                }
            }
        }
        SearchQuery.tagPayload.items.push(json);
    }
    SearchQuery.tokens.push('');
    SearchQuery.tagCheckpoint();
}

SearchQuery.errorResult = function(xhr, status, ex, sid, rid) {
    SearchQuery.status.unregisterResultTagging(sid, rid);
}

var prepareSearchQuery = function() {
    SearchQuery.status = new SearchQueryStatus('status-dialog');
    if (OS.services) {
        SearchQuery.retrieveTaggingServices();
    } else {
        SearchQuery.retrieveSources();
    }
}

