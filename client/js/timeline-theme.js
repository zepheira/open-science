/**
 * Copyright 2008-2009 Zepheira LLC
 */

OSTimelineTheme = new Object();

OSTimelineTheme.implementations = [];

OSTimelineTheme.create = function(locale) {
    if (locale == null) {
        locale = Timeline.getDefaultLocale();
    }
    
    var f = OSTimelineTheme.implementations[locale];
    if (f == null) {
        f = OSTimelineTheme._Impl;
    }
    return new f();
};

OSTimelineTheme._Impl = function() {
    this.firstDayOfWeek = 0; // Sunday
    
    this.ether = {
        backgroundColors: [
            "#fff",
            "#fe7",
            "#aaa",
            "#999"
        ],
        highlightColor:     "#fff",
        highlightOpacity:   100,
        interval: {
            line: {
                show:       true,
                color:      "#999",
                opacity:    25
            },
            weekend: {
                color:      "#888",
                opacity:    30
            },
            marker: {
                hAlign:     "Bottom",
                hBottomStyler: function(elmt) {
                    elmt.className = "timeline-ether-marker-bottom";
                },
                hBottomEmphasizedStyler: function(elmt) {
                    elmt.className = "timeline-ether-marker-bottom-emphasized";
                },
                hTopStyler: function(elmt) {
                    elmt.className = "timeline-ether-marker-top";
                },
                hTopEmphasizedStyler: function(elmt) {
                    elmt.className = "timeline-ether-marker-top-emphasized";
                },
                vAlign:     "Right",
                vRightStyler: function(elmt) {
                    elmt.className = "timeline-ether-marker-right";
                },
                vRightEmphasizedStyler: function(elmt) {
                    elmt.className = "timeline-ether-marker-right-emphasized";
                },
                vLeftStyler: function(elmt) {
                    elmt.className = "timeline-ether-marker-left";
                },
                vLeftEmphasizedStyler:function(elmt) {
                    elmt.className = "timeline-ether-marker-left-emphasized";
                }
            }
        }
    };
    
    this.event = {
        track: {
            height:         10, // px
            gap:            2   // px
        },
        overviewTrack: {
            offset:     20,     // px
            tickHeight: 6,      // px
            height:     2,      // px
            gap:        1       // px
        },
        tape: {
            height:         4 // px
        },
        instant: {
            icon:              "i/marker.png",
            iconWidth:         10,
            iconHeight:        10,
            color:             "#4C4B4B",
            impreciseColor:    "#555555",
            impreciseOpacity:  20
        },
        duration: {
            color:            "#FF8807",
            impreciseColor:   "#FF8807",
            impreciseOpacity: 20
        },
        label: {
            width:             500,
            backgroundColor:   "white",
            backgroundOpacity: 50,
            lineColor:         "#FF8807",
            offsetFromLine:    3 // px
        },
        highlightColors: [
            "#FFFF00",
            "#FFC000",
            "#FF0000",
            "#0000FF"
        ],
        bubble: {
            width:          350, // px
            height:         200, // px
            titleStyler: function(elmt) {
                elmt.className = "timeline-event-bubble-title";
            },
            bodyStyler: function(elmt) {
                elmt.className = "timeline-event-bubble-body";
            },
            imageStyler: function(elmt) {
                elmt.className = "timeline-event-bubble-image";
            },
            wikiStyler: function(elmt) {
                elmt.className = "timeline-event-bubble-wiki";
            },
            timeStyler: function(elmt) {
                elmt.className = "timeline-event-bubble-time";
            }
        }
    };
};

/*
SimileAjax.Graphics._FontRenderingContext.prototype.computeSize = function(text) {
    this._elmt.innerHTML = text;
    return {
        width:  this._elmt.offsetWidth + 5,
        height: this._elmt.offsetHeight
    };
};
*/
var timelineConfig = {
    timelineConstructor: function (div, eventSource) {   
        div.style.height="400px";
        var theme = OSTimelineTheme.create();
            
        var date = new Date();
        var bandInfos = [
            Timeline.createBandInfo({
                width:          "80%", 
                intervalUnit:   Timeline.DateTime.MONTH,
                intervalPixels: 400,
                eventPainter:    Timeline.CompactEventPainter,
                eventPainterParams: {
                    collapseConcurrentPreciseInstantEvents: false,
// hack.  original event painter in api/timeline/2.3.1 is allowing
// long labels to overlap.  using compact painter is marginally better
// but that code is expecting the below object to exist and fails if
// it does not.  this should not be necessary.
                    stackConcurrentPreciseInstantEvents: {} 
                },
                eventSource:    eventSource,
                date:           date,
                timeZone:       0,
                theme:          theme
            }),
            Timeline.createBandInfo({
                overview:       true,
                width:          "20%", 
                intervalUnit:   Timeline.DateTime.YEAR,
                intervalPixels: 200,
                eventSource:    eventSource,
                date:           date, 
                timeZone:       0,
                theme:          theme,
                trackHeight:    0.5,
                trackGap:       0.2
            })
        ];
        bandInfos[1].syncWith = 0;
        bandInfos[1].highlight = true;
        tl = Timeline.create(div, bandInfos, Timeline.HORIZONTAL);
        return tl;
    }
}

Timeline.OriginalEventPainter.prototype._showBubble = function(x, y, evt) {
    var div = document.createElement("div");
    var themeBubble = this._params.theme.event.bubble;
    evt.fillInfoBubble(div, this._params.theme, this._band.getLabeller());
    div.className = "timeline-bubble-body";
    
    SimileAjax.WindowManager.cancelPopups();
    SimileAjax.Graphics.createBubbleForContentAndPoint(div, x, y,
        themeBubble.width, null, themeBubble.maxHeight);
};
