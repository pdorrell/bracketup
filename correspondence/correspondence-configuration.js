function inspect(object) {return JSON.stringify(object);}

$(document).ready(function(){
  compileCorrespondenceSource($("#rhoscript-example-source"), $("#rhoscript-example-compiled"));
  initialiseInteraction();
});

var correspondenceBracketup = require("../correspondence-bracketup.js");

function compileCorrespondenceSource(sourceElementSelector, compiledElementSelector) {
  var documentObject = new correspondenceBracketup.Document(window.document);
  var correspondenceSource = sourceElementSelector.html();
  var compiledObjects = correspondenceBracketup.compileCorrespondence(correspondenceSource);
  var correspondence = compiledObjects[0];
  var correspondenceDom = correspondence.createDom(documentObject);
  compiledElementSelector.append(correspondenceDom);
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

