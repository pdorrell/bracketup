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
  var BracketupCompiler = bracketup1.BracketupCompiler;
  
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
