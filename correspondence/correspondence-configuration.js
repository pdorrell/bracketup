var utils = require("../utils.js");
inspect = utils.inspect;

$(document).ready(function(){
  compileCorrespondenceSource($("script[type='text/correspondence-bracketup']"));
  initialiseInteraction();
});

var bracketup = require("../bracketup.js");
var correspondenceBracketup = require("../correspondence-bracketup.js");

var correspondenceCompiler = correspondenceBracketup.correspondenceCompiler;

function nth(n){
    if(isNaN(n) || n%1) return n;   
    var s= n%100;
    if(s>3 && s<21) return n+'th';
    switch(s%10){
        case 1: return n+'st';
        case 2: return n+'nd';
        case 3: return n+'rd';
        default: return n+'th';
    }
}
function ordinalSuffix(n) {
  var nMod100 = n%100;
  if(nMod100 > 3 && nMod100 < 21) {
    return "th";
  }
  else {
    var lastDigit = nMod100%10;
    return lastDigit < 4 ? ["th", "st", "nd", "rd"][lastDigit] : "th";
  }
}

function compileCorrespondenceSource(sourceElements) {
  sourceElements.each(function(index, sourceElement) {
    var sourceElementSelector = $(sourceElement);
    var correspondenceSource = sourceElementSelector.html();
    try {
      var scriptNumber = index+1;
      var id = sourceElementSelector.attr("id");
      var sourceFileName = scriptNumber + ordinalSuffix(scriptNumber) + 
        " Correspondence script element" + 
        (id ? " (id = " + id + ")" : "");
      var compiledDoms = correspondenceCompiler.compileDoms(correspondenceSource, document, sourceFileName);
      for (var i=0; i<compiledDoms.length; i++) {
        sourceElementSelector.after(compiledDoms[i]);
      }
    }
    catch (error) {
      alert("Error compiling Correspondence source: \"" + error.message + "\"\n\n" + 
            "See browser console for further details.");
      if (error.logSourceError) {
        error.logSourceError();
      }
      throw error;
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

