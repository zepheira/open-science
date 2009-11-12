/**
 * Copyright 2008-2009 Zepheira LLC
 */

Exhibit.UI.showBusyIndicator = function() {

}

Exhibit.UI.hideBusyIndicator = function() {

}

Exhibit.ViewPanel.addView = function(viewPanel, div, uiContext) {
    if (div != null && div.nodeType == 1) {
        var node = div;
        node.style.display = "none";
        var role = Exhibit.getRoleAttribute(node);
        if (role == "view") {
            var viewClass = Exhibit.TileView;
                
            var viewClassString = Exhibit.getAttribute(node, "viewClass");
            if (viewClassString != null && viewClassString.length > 0) {
                viewClass = Exhibit.UI.viewClassNameToViewClass(viewClassString);
                if (viewClass == null) {
                    SimileAjax.Debug.warn("Unknown viewClass " + viewClassString);
                }
            }
                
            var viewLabel = Exhibit.getAttribute(node, "viewLabel");
            var label = (viewLabel != null && viewLabel.length > 0) ? viewLabel : Exhibit.getAttribute(node, "label");
            var tooltip = Exhibit.getAttribute(node, "title");
            var id = node.id;
                
            if (label == null) {
                if ("viewLabel" in viewClass.l10n) {
                    label = viewClass.l10n.viewLabel;
                } else {
                    label = "" + viewClass;
                }
            }
            if (tooltip == null) {
                if ("l10n" in viewClass && "viewTooltip" in viewClass.l10n) { 
                    tooltip = viewClass.l10n.viewTooltip;
                } else {
                    tooltip = label;
                }
            }
            if (id == null || id.length == 0) {
                id = viewPanel._generateViewID();
            }
          
            viewPanel._viewConstructors.push(viewClass);
            viewPanel._viewConfigs.push(null);
            viewPanel._viewLabels.push(label);
            viewPanel._viewTooltips.push(tooltip);
            viewPanel._viewDomConfigs.push(node);
            viewPanel._viewIDs.push(id);
        } 
    }
    viewPanel._internalValidate();
    viewPanel._initializeUI();
}

