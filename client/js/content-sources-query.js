/**
 * Copyright 2008-2009 Zepheira LLC
 */

var ContentSources = {
    sourcesURI: '/services/content',
    OSRel: OS.constants.rel.os,
    LinkRel: OS.constants.rel.link,
    elementId: null,
    errorFlag: false,
    callback: function(){},
    sourcesCountTotal: 0,
    sourcesCount: 0,
    sources: []
};

ContentSources.retrieveSources = function() {
    $.ajax({
        async: true,
        cache: doCache(),
        dataType: 'xml',
        error: ContentSources.errorSources,
        success: ContentSources.processSources,
        type: 'GET',
        url: ContentSources.sourcesURI
    });
}

ContentSources.processSources = function(xml, status) {
    ContentSources.sourcesCountTotal = $('feed>entry', xml).length;
    $('feed>entry', xml).each(function(){
        var uri = $(this).children('link[rel="'+ContentSources.OSRel+'"]').attr('href');
        var type = $(this).children('link[rel="'+ContentSources.OSRel+'"]').attr('type');
        var id = $(this).children('id').text();
        if (uri) {
            ContentSources.retrieveSource(uri, type, id);
        }
    });
}

ContentSources.errorSources = function(xhr, status, ex) {
    // @@@ write this
    // log exception somewhere
}

ContentSources.retrieveSource = function(sourceURI, contentType, id) {
    $.ajax({
        async: true,
        cache: doCache(),
        dataType: 'xml',
        error: ContentSources.errorSource,
        success: function(xml, status) {
            ContentSources.processSource(xml, status, sourceURI, id);
        },
        type: 'GET',
        url: sourceURI,
        beforeSend: function(xhr) {
            xhr.setRequestHeader("Accept", contentType); 
        }
    });
}

// here we should count off as sources roll in
ContentSources.processSource = function(xml, status, uri, id) {
    $('OpenSearchDescription',xml).each(function(){
        var nick = $(this).children('ShortName').text();
        var full = $(this).children('LongName').text();
        ContentSources.sources.push({'name': full, 'nick': nick, 'uri': uri, 'id': id});
    });
// @@@ this increment should be inside the above each block, not doing it
// while the dummy blog is still available
    ContentSources.sourcesCount++;
    ContentSources.checkFinished();
}

ContentSources.errorSource = function(xhr, status, ex) {
    ContentSources.sourcesCountTotal--;
    ContentSources.checkFinished();
}

ContentSources.checkFinished = function() {
    if ((!ContentSources.errorFlag &&
        ContentSources.sourcesCountTotal > 0 &&
        ContentSources.sourcesCount == ContentSources.sourcesCountTotal) ||
       (ContentSources.errorFlag &&
        ContentSources.sourcesCount == ContentSources.sourcesCountTotal)) {
        ContentSources.generateSources();
    }
}

ContentSources.generateSources = function() {
    var el = $('<ul></ul>');
    for (var i = 0; i < ContentSources.sources.length; i++) {
        var source = ContentSources.sources[i];
        var htmlid = "sources-" + source.nick.toLowerCase();
        var li = $('<li></li>');
        if ((Personal.hasAdHoc() &&
             Personal.isAdHocSource(source.id))
            || (!Personal.hasAdHoc() && Personal.isPreferredSource(source.id))) {
            li.append('<input id="'+htmlid+'" value="'+source.id+'" type="checkbox" name="source" checked="true" />');
        } else {
            li.append('<input id="'+htmlid+'" value="'+source.id+'" type="checkbox" name="source" />');
        }
        li.append('<label for="'+htmlid+'" title="'+source.name+'">'+source.nick+'</label>');
        el.append(li);
    }
    el.attr('id', ContentSources.elementId);
    $('#'+ContentSources.elementId).replaceWith(el);
    ContentSources.callback('sources');
    return el;
}

var prepareContentSources = function(id, callback) {
    ContentSources.elementId = id;
    if (typeof callback != 'undefined')
        ContentSources.callback = callback;
    ContentSources.retrieveSources(); 
}
