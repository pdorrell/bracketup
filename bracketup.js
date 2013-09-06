(function() {
  var utils = require("./utils.js");
  var merge = utils.merge;
  var inspect = utils.inspect;
  
  var bracketup1 = require("./bracketup1.js");
  
  var CompileError = bracketup1.CompileError;
  var NodeCompiler = bracketup1.NodeCompiler;
  var NodeParser = bracketup1.NodeParser;
  var TestTokenReceiver = bracketup1.TestTokenReceiver;
  var BracketupScanner = bracketup1.BracketupScanner;
  var TextElement = bracketup1.TextElement;
  var BaseNode = bracketup1.BaseNode;
  var Document = bracketup1.Document;
  var BaseAttribute = bracketup1.BaseAttribute;
  var Bold = bracketup1.Bold;
  var Italic = bracketup1.Italic;
  var HrefAttribute = bracketup1.HrefAttribute;
  var Link = bracketup1.Link;
  
  function BracketupCompiler(topLevelClassMap) {
    this.nodeCompiler = new NodeCompiler(topLevelClassMap);
  }
  
  BracketupCompiler.prototype = {
    compile: function(source, sourceFileName) {
      var bracketupScanner = new BracketupScanner();
      var nodeParser = new NodeParser();
      bracketupScanner.scanSource(nodeParser, source, sourceFileName);
      var parsedRootElements = nodeParser.rootElements;
      var compiledObjects = [];
      for (var i=0; i<parsedRootElements.length; i++) {
        var rootElement = parsedRootElements[i];
        //console.log("Parsed root element " + rootElement);
        var correspondence = this.nodeCompiler.compile(rootElement);
        compiledObjects.push(correspondence);
      }
      return compiledObjects;
    }, 
    
    compileDoms: function(source, document, sourceFileName) {
      var compiledDoms = [];
      var compiledObjects = this.compile(source, sourceFileName);
      var documentWrapper = new Document(document);
      for (var i=0; i<compiledObjects.length; i++) {
        compiledDoms.push(compiledObjects[i].createDom(documentWrapper));
      }
      return compiledDoms;
    }
  };
  
  exports.BracketupScanner = BracketupScanner;
  exports.NodeParser = NodeParser;
  exports.NodeCompiler = NodeCompiler;
  exports.TestTokenReceiver = TestTokenReceiver;
  exports.CompileError = CompileError;
  
  exports.TextElement = TextElement;
  exports.BaseNode = BaseNode;
  exports.BaseAttribute = BaseAttribute;
  exports.Bold = Bold;
  exports.Italic = Italic;
  exports.HrefAttribute = HrefAttribute;
  exports.Link = Link;

  exports.BracketupCompiler = BracketupCompiler;
  
})();
