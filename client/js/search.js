/**
 * Copyright 2008-2009 Zepheira LLC
 */

var prepareSearch = function() {
    $('#advanced-search-title').bind('click',function(){
        if($('#advanced-search-options:visible').length == 0) {
            $('#advanced-search-title').addClass('open');
        } else {
            $('#advanced-search-title').removeClass('open');
        }
        $('#advanced-search-options').toggle('slide', { direction: 'up' }, 'slow');
    });
    $('#q').bind('blur', function(e) {
        if($('#suggestions p.hovered').length == 0) {
            $('#suggestions').hide();
            $('#q').attr('store','');
        }
    });
    $('#q').bind('keyup',function(e) {
        if ($(this).val().length <= 1) {
            $('#suggestions').hide();
            $('#q').attr('store','');
        } else if (e.keyCode == 27) { // esc
            $('#suggestions').hide();
            $('#q').val($('#q').attr('store'));
        } else if (e.keyCode == 40 && !e.shiftKey) { // down
            $('#suggestions').show();
            if($('#suggestions p.hovered').length > 0) {
                $('#suggestions p').each(function() {
                    if($(this).hasClass('hovered')) {
                        $(this).removeClass('hovered');
                        $('#suggestions p').eq(($('#suggestions p').index(this)+1)%$('#suggestions p').length).addClass('hovered');
                        $('#q').val($('#suggestions p').eq(($('#suggestions p').index(this)+1)%$('#suggestions p').length).text());
                        return false;
                    }
                });
            } else {
                $('#suggestions p:first').addClass('hovered');
                $('#q').attr('store',$('#q').val());
                $('#q').val($('#suggestions p:first').text());
            }
        } else if (e.keyCode == 38 && !e.shiftKey) { // up
            $('#suggestions').show();
            if($('#suggestions p.hovered').length > 0) {
                $('#suggestions p').each(function() {
                    if($(this).hasClass('hovered')) {
                        $(this).removeClass('hovered');
                        var pidx = $('#suggestions p').index(this)-1;
                        if(pidx >= 0) {
                            $('#suggestions p').eq(pidx%$('#suggestions p').length).addClass('hovered');
                            $('#q').val($('#suggestions p').eq(pidx%$('#suggestions p').length).text());
                        } else {
                            $('#suggestions p:last').addClass('hovered');
                            $('#q').val($('#suggestions p:last').text());
                        }
                        return false;
                    }
                });
            } else {
                $('#suggestions p:last').addClass('hovered');
                $('#q').attr('store',$('#q').val());
                $('#q').val($('#suggestions p:last').text());
            }                
        } else {
            $('#suggestions').show();
            $('#q').attr('store',$('#q').val());
        }
    });
    $('#suggestions p').bind('click', function() {
        $('#q').val($(this).text());
        $('#suggestions').hide();
    });
    $('#suggestions p').bind('mouseover', function() {
        $('#suggestions p.hovered').removeClass('hovered');
        $(this).addClass('hovered');
    });
    $('#suggestions p').bind('mouseout', function() {
        $(this).removeClass('hovered');
    });
    $('#suggestions').width($('#q').width()+4);
    $('#suggestions').css('left',$('#q').offset().left);
    $('#advanced-search-options').css('left',$('#q').offset().left+13);
    $('#advanced-search-title').css('margin-left',$('#q').offset().left);
};

