/**
 * Copyright 2008-2009 Zepheira LLC
 */

var nextApplication = function() {
    var len = $('#marketplace-featured li').length;
    var idx = $('#marketplace-featured li').index($('#marketplace-featured li:visible'));
    $('#marketplace-featured li:visible').hide('slide', { direction: 'left' }, 'slow', function(){
        $('#marketplace-indicator td').eq(idx%len).removeClass('active-app');
        $('#marketplace-indicator td').eq((idx+1)%len).addClass('active-app');
        $('#marketplace-featured li').eq((idx+1)%len).show('slide', { direction: 'right' }, 'slow');
    });
};

var previousApplication = function() {
    var len = $('#marketplace-featured li').length;
    var idx = $('#marketplace-featured li').index($('#marketplace-featured li:visible'));
    $('#marketplace-featured li:visible').hide('slide', { direction: 'right' }, 'slow', function(){
        if (idx-1 <0) {
            $('#marketplace-indicator td').eq(idx%len).removeClass('active-app');
            $('#marketplace-indicator td:last').addClass('active-app');
            $('#marketplace-featured li:last').show('slide', { direction: 'left' }, 'slow');            
        } else {
            $('#marketplace-indicator td').eq(idx%len).removeClass('active-app');
            $('#marketplace-indicator td').eq((idx-1)%len).addClass('active-app');
            $('#marketplace-featured li').eq((idx-1)%len).show('slide', { direction: 'left' }, 'slow');
        }
    });
};

var specificApplication = function(spec) {
    var len = $('#marketplace-featured li').length;
    var idx = $('#marketplace-featured li').index($('#marketplace-featured li:visible'));
    if (idx == len - 1 && spec == 0) {
        nextApplication();
    } else if (spec == len - 1 && idx == 0) {
        previousApplication();
    } else if (spec > idx) {
        nextApplication();
    } else if (spec < idx) {
        previousApplication();
    }
};

var prepareMarketplaceFeatured = function() {
    if (!OS.services) return;
    $('#marketplace-featured').before('<a id="marketplace-previous" title="View previous featured application"> </a>');
    $('#marketplace-featured').after('<a id="marketplace-next" title="View next featured application"> </a>');
    $('#marketplace-featured li').each(function(){
        $(this).width(($('#q + input').offset().left+$('#q + input').outerWidth())-$('#q').offset().left);
    });
    $('#marketplace-featured li').eq(2).show();
    $('#marketplace-previous').css('margin-left',$('#q').offset().left-$('#marketplace-previous').width());

    $('#marketplace-previous').bind('click',previousApplication);
    $('#marketplace-next').bind('click',nextApplication);

    $('#marketplace-indicator td').bind('click',function(){
        specificApplication($('#marketplace-indicator td').index(this));
    });
};
