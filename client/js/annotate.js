/**
 * Copyright 2008-2009 Zepheira LLC
 */

// configuration info
var AC = {
    step: 0,
    deck: null,
    selector: function() {
        return (!AC.deck) ? '.annotations:eq(0) div' : '#' + AC.deck + ' div';
    },
    ref: 'an:rel',
    trigger: 'an:trigger',
    highlight: 'annotate-highlight',
    screenId: 'screen',
    screen: '#screen',
    annotateId: 'show-annotations',
    annotate: '#show-annotations',
    nav: '#annotation-navigation',
};

var prepareAnnotation = function(idx, el) {
    var rel = $(el).attr(AC.ref);

    var positionAnnotation = function(r, e) {
        if (r) {
            var where = $(r).eq(0).offset();
            var height = $(r).eq(0).outerHeight();
            $(e).css('top',height+where.top+2);
            if (10+where.left+$(e).width()>$(document).width()) {
                $(e).css('left',$(document).width()-$(e).outerWidth()-10);
            } else {
                $(e).css('left',10+where.left);
            }
        } else {
            var vWidth = $(document).width();
            var width = $(e).width();
            $(e).css('left',(vWidth/2)-(width/2));
            $(e).css('top',60);
        }
    };
    positionAnnotation(rel, el);

    $('#annotation-navigation-next').bind('click', function() {
        if(AC.step == idx) {
            if(rel) removeHighlight(rel);
            $(el).fadeOut('slow',function() {
                if(AC.step+1 < $(AC.selector()).length) {
                    if($(AC.selector()).eq(AC.step+1).attr(AC.ref)) {
                        highlight($($(AC.selector()).eq(AC.step+1).attr(AC.ref)));
                    }
                    var fIn = function() {
                        positionAnnotation($(AC.selector()).eq(AC.step+1).attr(AC.ref), $(AC.selector()).eq(AC.step+1));
                        $(AC.selector()).eq(++AC.step).fadeIn('slow');
                        $('#annotation-counter-index').text(AC.step+1);
                        $('#annotation-navigation-previous').show();
                        $('#annotation-navigation-next').show();
                        if (AC.step+1 == $(AC.selector()).length) {
                            $('#annotation-navigation-next').text('close');
                        }
                    };
                    if($(AC.selector()).eq(AC.step+1).attr(AC.trigger)) {
                        var triggerForward = $(AC.selector()).eq(AC.step+1).attr(AC.trigger)+".forward";
                        eval(triggerForward+"("+fIn+")");
                    } else {
                        fIn();
                    }
                } else {
                    toggleScreen();
                }
            });
        }
    });

    $('#annotation-navigation-previous').bind('click', function() {
        if(AC.step == idx && AC.step > 0) {
            if(rel) removeHighlight(rel);
            $(el).fadeOut('slow',function() {
                if(AC.step > 0) {
                    if($(AC.selector()).eq(AC.step-1).attr(AC.ref)) {
                        highlight($($(AC.selector()).eq(AC.step-1).attr(AC.ref)));
                    }
                    var fOut = function() {
                        positionAnnotation($(AC.selector()).eq(AC.step-1).attr(AC.ref), $(AC.selector()).eq(AC.step-1));
                        $(AC.selector()).eq(--AC.step).fadeIn('slow');
                        $('#annotation-counter-index').text(AC.step+1);
                        if (AC.step == 0) {
                            $('#annotation-navigation-previous').hide();
                            $('#annotation-navigation-next').show();
                            $('#annotation-navigation-next').text('next');
                        } else {
                            $('#annotation-navigation-previous').show();
                            $('#annotation-navigation-next').show();
                            $('#annotation-navigation-next').text('next');
                        }
                    };
                    if($(AC.selector()).eq(AC.step-1).attr(AC.trigger)) {
                        var triggerBackward = $(AC.selector()).eq(AC.step-1).attr(AC.trigger)+".backward";
                        eval(triggerBackward+"("+fOut+")");
                    } else {
                        fOut();
                    }
                }
            });
        }
    });
};

var highlight = function(el) {
    $(el).each(function(){
        $(this).addClass(AC.highlight);
    });
};

var removeHighlight = function(el) {
    $(el).each(function(){
        $(this).removeClass(AC.highlight);
    });
}

var toggleScreen = function() {
    if ($(AC.screen+':hidden').length > 0) {
        $(AC.annotate).hide('slide', { direction: 'up' }, 'slow');
        $(AC.nav).show('slide', { direction: 'up' }, 'slow');
        $(AC.screen).fadeIn();
    } else {
        $(AC.screen).fadeOut();
        $(AC.nav).hide('slide', { direction: 'up' }, 'slow');
        $(AC.annotate).show('slide', { direction: 'up' }, 'slow');
        $(AC.selector()).hide(); // just in case, put everything away
    }
}

var prepareAnnotations = function() {
    // do nothing; to get annotations back, 
    // remove this 'function' and rename 
    // prepareAnnotationsOrig to prepareAnnotations
}

var prepareAnnotationsOrig = function() {
    AC.step = (typeof(OS.map['start'])=='undefined') ? 0 : parseInt(OS.map['start'])-1;
    AC.deck = (typeof(OS.map['deck'])=='undefined') ? null : OS.map['deck'];
    $('body').prepend('<div id="annotation-navigation"><a id="annotation-navigation-previous">previous</a><a id="annotation-navigation-next">next</a><div id="annotation-counter">annotation <span id="annotation-counter-index"></span> of <span id="annotation-counter-total"></span> <a id="annotation-navigation-close">[close]</a></div></div>');
    $('body').prepend('<div id="'+AC.annotateId+'">show annotations</div>');
    $('body').prepend('<div id="'+AC.screenId+'"></div>');
    $(AC.selector()).each(prepareAnnotation);
    $('#annotation-navigation-close').bind('click',function(){
        $(AC.selector()).eq(AC.step).fadeOut('slow');
        toggleScreen();
    });
    var initialize = function() {
        $('#annotation-counter-index').text(AC.step+1);
        if($(AC.selector()).eq(AC.step).attr(AC.ref)) {
            highlight($($(AC.selector()).eq(AC.step).attr(AC.ref)));
        }
        if (AC.step == 0) {
            $('#annotation-navigation-previous').hide();
        }
        if (AC.step+1 == $(AC.selector()).length) {
            $('#annotation-navigation-next').text('close');
        }
        $('#annotation-counter-total').text($(AC.selector()).length);
        $(document).bind('keyup.hide',function(e){
            if ($(AC.screen+":visible").length==1 && e.keyCode == 27) {
                toggleScreen();
                $(document).unbind('keyup.hide');
            }
        });
        toggleScreen();
    };
    $(AC.annotate).bind('click',function(){
        $(AC.selector()).eq(AC.step).fadeIn('slow', initialize);
    });
    if(OS.map['annotate'] != 'off') {
        $(AC.selector()).eq(AC.step).fadeIn('slow', initialize);
    } else {
        $(AC.annotate).show();
        $('a').each(function(){
            var href = $(this).attr('href');
            if (href) {
                if (href.indexOf('?')>=0) {
                    $(this).attr('href',href+"&annotate=off");
                } else {
                    $(this).attr('href',href+"?annotate=off");
                }
            }
        });
        $('form').each(function(){
            $(this).append('<input type="hidden" name="annotate" value="off" />');
        });
    }
};
