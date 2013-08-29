var utils = require("../utils.js");
inspect = utils.inspect;

$(document).ready(function(){
  compileCorrespondenceSource($("script[type='text/correspondence-bracketup']"));
  initialiseInteraction();
});

var bracketup = require("../bracketup.js");
var correspondenceBracketup = require("../correspondence-bracketup.js");

function compileCorrespondenceSource(sourceElements) {
  sourceElements.each(function(index, sourceElement) {
    var sourceElementSelector = $(sourceElement);
    var correspondenceSource = sourceElementSelector.html();
    var compiledDoms = correspondenceBracketup.compileCorrespondenceIntoDoms(correspondenceSource, document);
    for (var i=0; i<compiledDoms.length; i++) {
      sourceElementSelector.after(compiledDoms[i]);
    }
  });
}
  
function initialiseInteraction() {
  var structureGroups = new CORRESPONDENCE.StructureGroups($(".structure-group"));
  
  structureGroups.setupInterleaving();

  var showSiblings = true;
  var alwaysShowCousins = true;
  var ctrlKeyIsDown = false;
  $(structureGroups).on("mouseEnterItem", 
                        function(event, item) { 
                          structureGroups.setSelected(item, showSiblings, 
                                                      alwaysShowCousins || ctrlKeyIsDown); 
                        });
  
  $(document).keydown(function(event) {
    if (event.which == 17) { // ctrl
      if (!alwaysShowCousins) {
        structureGroups.showCousinsOfSelectedItem();
      }
      ctrlKeyIsDown = true;
    }
  });
  
  $("#showCousinsWithCtrl").change(function(event) {
    alwaysShowCousins = !this.checked;
  });
  
  $(document).keyup(function(event) {
    if (event.which == 17) { // ctrl
      ctrlKeyIsDown = false;
    }
  });
  
  $(structureGroups).on("clickOutsideItems", 
                        function(event) { structureGroups.clearCurrentSelection(); });
}

