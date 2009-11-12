/**
 * Copyright 2008-2009 Zepheira LLC
 */

var researchAreaTrigger = {
    forward: function(cb) {
        $.scrollTo('#research-prefs',{duration:500});
        $('#research-area-bio').attr('checked',true);
        $('#research-area-bio').parents('li').eq(0).children('ul').eq(0).show('slide',{direction:'up'},'slow');
        $('#experts-starter').hide();
        $('#biomedical-experts').fadeIn('slow');
        if (cb) cb();
    },
    backward: function(cb) {
        $.scrollTo('#research-prefs',{duration:500});
        $('#research-area-bio').attr('checked',true);
        $('#research-area-bio').parents('li').eq(0).show('slide',{direction:'down'},'slow');
        $('#experts-starter').hide();
        $('#biomedical-experts').fadeIn('slow');
        if (cb) cb();
    }
};

var expertTrigger = {
    forward: function(cb) {
        $.scrollTo('#experts-prefs',{duration:500});
        if (cb) cb();
    },
    backward: function(cb) {
        $.scrollTo('#experts-prefs',{duration:500});
        if (cb) cb();
    }
};

var endTrigger = {
    forward: function(cb) {
        $.scrollTo(0,{duration:500});
        if (cb) cb();
    },
    backward: function(cb) {
        if (cb) cb();
    }
};

var Preferences = {
    contentURI: '/services/content'
};

var preparePreferences = function() {
    $('input.expands').attr('checked', false);
    $('#view-3').removeAttr('disabled');
    $('#view-4').removeAttr('disabled');

    $('#saver').data('available', { 'sources': false, 'apps': false, 'lens': false });

    $('#preferences-form').bind('submit',function(e){
        e.preventDefault();
        var sources = [], apps = [], lens = [];
        $('input[name="source"]:checkbox:checked').each(function(){
            sources.push($(this).val());
        });
        $('input[name="app"]:radio:checked').each(function(){
            if ($(this).val() != '') {
                apps.push($(this).val());
            }
        });
        lens.push($('input[name="lens"]:radio:checked').val());
        Personal.savePreferences(sources, apps, lens);
        $('#saver').attr('disabled','true').val('Preferences Saved!');
        return false;
    });

    $('#resetter').bind('click',function(){
        Personal.clearPreferences();
        $('input[name="source"]:checkbox').attr('checked',false);
        $('input[name="app"][value=""]:radio').attr('checked',true);
    });

    $('input:enabled').live('click',function(){
        $('#saver').removeAttr('disabled').val('Save Preferences');
    });

    $('input.expands').bind('click',function(){
        if ($(this).parents('li').eq(0).children('ul').length > 0) {
            if ($(this).attr('checked')) {
                $(this).parents('li').eq(0).children('ul').show('slide', { direction: 'up' }, 'slow');
                $(this).siblings('label.expands').eq(0).addClass('open');
            } else {
                $(this).parents('li').eq(0).children('ul').hide('slide', { direction: 'up' }, 'slow');
                $(this).siblings('label.expands').eq(0).removeClass('open');
            }
        }
    });

    $('#research-area-bio').bind('click',function(){
        if ($(this).attr('checked')) {
            $('#experts-starter').hide();
            $('#biomedical-experts').fadeIn('slow');
        } else {
            $('#biomedical-experts').fadeOut('slow');
            $('#experts-starter').show();
        }
    });

    $('#type-images').bind('click',function(){
        if ($(this).attr('checked')) {
            $('#view-3').removeAttr('disabled');
        } else {
            $('#view-3').attr('disabled','on');
        }
    });

    $('#type-video').bind('click',function(){
        if ($(this).attr('checked')) {
            $('#view-4').removeAttr('disabled');
        } else {
            $('#view-4').attr('disabled','on');
        }
    });

    var registrationError = function(xhr, status, ex) {
// @@@ write this
    };

    var registrationSuccess = function(endpoint, name) {
        $('.new-source-form').html('<input name="source" value="'+endpoint+'" id="source-'+endpoint+'" type="checkbox" checked="true" /><label for="source-'+endpoint+'">'+name+'</label>');
        $('.new-source-form').removeClass('new-source-form');
        $('#add-source').show();
    };

    var registerSource = function(endpoint, name, description) {
        var xmlstr = '<entry xmlns="http://www.w3.org/2005/Atom"><id>'+endpoint+'</id><title type="text">'+name+'</title><summary type="text">'+description+'</summary><link href="'+endpoint+'" type="application/opensearchdescription+xml" /></entry>';
        $.ajax({
            async: true,
            cache: false,
            dataType: 'xml',
            error: registrationError,
            success: function(xml, status) {
                registrationSuccess(endpoint, name);
            },
            type: 'POST',
            data: xmlstr,
            contentType: 'application/atom+xml',
            url: Preferences.contentURI 
        });
    };

    $('#add-source-button').bind('click',function(){
        $('#add-source').before('<li class="new-source-form"><label for="new-name">Name</label> <input name="new-name" id="new-name" type="text" value=""/><br /><label for="new-endpoint">Endpoint</label> <input name="new-endpoint" id="new-endpoint" type="text" value="" /><br /><label for="new-description">Description</label><input name="new-description" id="new-description" type="text" value="" /><br /><input name="new-source-save" id="new-source-save" type="button" value="Save" /></li>');
        $('#add-source').hide();
        $('#new-source-save').bind('click',function(){
            registerSource($('#new-endpoint').val(), $('#new-name').val(), $('#new-description').val());
        });
    });
};

var enableButtons = function(key) {
    var av = $('#saver').data('available');
    av[key] = true;
    $('#saver').data('available', av);
    if (av.sources && av.apps) {
        $('#saver').removeData('available');
        $('#saver').attr('disabled', false);
        $('#resetter').attr('disabled', false);
    }
}

$(document).ready(function(){
    prepareOS();
    prepareAnnotations();
    preparePreferences();
    prepareContentSources('content-sources', enableButtons);
    prepareAvailableResultsApps('results-apps', enableButtons);
    prepareAvailableLenses('results-lens', enableButtons);
});
