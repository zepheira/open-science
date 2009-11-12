/**
 * Copyright 2008-2009 Zepheira LLC
 */

SearchQueryStatus = function(element) {
    this.initialized = false;
    this.el = $('#'+element);
    this.sources = {};
    this.potentialSources = 0;
    this.potentialSourceCount = 0;
    this.sourceCountTotal = 0;
    this.sourceCount = 0;
    this.sourcesDone = false;
    this.searchCountTotal = 0;
    this.searchFailures = 0;
    this.results = {};
    this.resultCountTotal = 0;
    this.resultCount = 0;
    this.resultsDone = false;
    this.tagCountTotal = 0;
    this.tagCount = 0;
    this.tagDone = false;
}

SearchQueryStatus.collapseName = function(name) {
    return name.replace(/ +/g, '-');
}

SearchQueryStatus.prototype.abort = function() {
    this.el.fadeOut('fast');
    this.dispose();
}

SearchQueryStatus.prototype.dispose = function() {
    this.el = null;
    this.sources = null;
    this.results = null;
};

SearchQueryStatus.prototype.addSource = function(source) {
    this.el.find('ul').append('<li id="source-'+this.sources[source].id+'"><strong>'+this.sources[source].name+'</strong> <span class="source-status"></span></li>');    
}

SearchQueryStatus.prototype.updateSource = function(source, phase) {
    var sel = $('#source-'+this.sources[source].id+' span.source-status');
    switch(phase) {
        case 'fail':
            sel.html('<em class="fail">Searching failed</em>');
            break;
        case 'results':
            sel.text('Found '+this.sources[source].size+' results');
            break;
        case 'tagging':
            sel.text('Tagging '+this.sources[source].size+' results');
            break;
        case 'tag':
//            sel.text('Tagged '+this.sources[source].tagged+' of '+this.sources[source].size+' results');
            break;
        case 'tagfail':
//            sel.text('Tagged '+this.sources[source].tagged+' of '+this.sources[source].size+' results');
            break;
        default:
            break;
    }
}

// content list length
SearchQueryStatus.prototype.startLocating = function(sources) {
    this.initialized = true;
    this.potentialSourceCount = sources;
}

SearchQueryStatus.prototype.removePotential = function() {
    this.potentialSourceCount--;
}

// from content list
SearchQueryStatus.prototype.registerSource = function(source, name) {
    this.sources[source] = { 'size': 0, 'tagged': 0, 'error': false, 'returned': false, 'name': name, 'id': SearchQueryStatus.collapseName(name) };
    this.potentialSources++;
    this.sourceCountTotal++;
}

// from failed description
SearchQueryStatus.prototype.unregisterSource = function(source) {
    this.sources[source].error = true;
    this.sourceCountTotal--;
    this.checkSourcesFinished();
}

// from successful description
SearchQueryStatus.prototype.searchingSource = function(source) {
    this.sourceCount++;
    this.checkSourcesFinished();
    this.addSource(source);
}

// from failed search
SearchQueryStatus.prototype.errorSearchingSource = function(source) {
    this.sources[source].error = true;
    this.sources[source].returned = true;
    this.searchFailures++;
    this.checkSourcesFinished();
    this.checkSearchFinished();
    this.updateSource(source, 'fail');
}

// check
SearchQueryStatus.prototype.checkSourcesFinished = function() {
    var self = this;
    if (this.initialized && !this.sourcesDone && this.sourceCount > 0) {
        $('.searching', self.el).fadeIn('fast');
    }
    if (this.potentialSources == this.potentialSourceCount) {
        this.sourcesDone = true;
        $('.locating', self.el).fadeOut('fast');
        this.searchCountTotal = this.sourceCountTotal;
    } else if ((this.sourceCountTotal == 0 || this.potentialSourceCount == 0) && this.initialized) { 
        notifyUser('<p>Sources failed.  Sorry for the inconvenience, please try again later.</p>');
        this.abort();
    }
}

// from successful search
SearchQueryStatus.prototype.searchedSource = function(source, size) {
    if (size == 0) {
        this.sources[source].error = true;
        this.sourceCountTotal--;
        this.sourceCount--;
    }
    this.sources[source].size = size;
    this.sources[source].returned = true;
    this.resultCountTotal += size;
    this.tagCountTotal += size;
    this.checkSearchFinished();
    this.updateSource(source, 'results');
}

// from iterating through successful search
SearchQueryStatus.prototype.registerResult = function(source, result) {
    this.results[result] = { 'source': source, 'tagged': false, 'error': false };
    this.resultCount++;
    this.checkSearchFinished();
    if (OS.services) {
        this.updateSource(source, 'tagging');
    }
}

// check
SearchQueryStatus.prototype.checkSearchFinished = function() {
    var self = this;
    if (this.sourcesDone && this.searchFailures == this.searchCountTotal) {
        this.abort();
        notifyUser('<p>Searching failed.  Sorry for the inconvenience, please try again later.</p>');
        return;
    }
    if (OS.services && this.resultCount > 0) {
        $('.tagging', self.el).fadeIn('fast');
    }
    var done = true;
    for (var s in this.sources) {
        done = done && (this.sources[s].returned || this.sources[s].error);
    }
    if (done) {
        $('.searching', self.el).fadeOut('fast');
        this.resultsDone = true;
        this.checkTaggingFinished();
    }
}

// from successful tag retrieval
SearchQueryStatus.prototype.registerResultTagging = function(source, result) {
    this.results[result].tagged = true;
    this.tagCount++;
    this.sources[source].tagged++;
    this.checkTaggingFinished();
    this.updateSource(source, 'tag');
}

// from failed tag retrieval
SearchQueryStatus.prototype.unregisterResultTagging = function(source, result) {
    this.results[result].error = true;
    this.tagCountTotal--;
    this.checkTaggingFinished();
    this.updateSource(source, 'tagfail');
}

// check
SearchQueryStatus.prototype.checkTaggingFinished = function() {
    var self = this;
    if ((this.resultsDone && this.tagCount == this.tagCountTotal) || !OS.services) {
        this.tagDone = true;
        $('.tagging', self.el).fadeOut('fast');
        $('.done', self.el).fadeIn('fast', function(){
            self.el.fadeOut('slow', function(){
                $('.current-app').click();
                self.dispose();
            });
        });
    }
}

