var utils = require("./utils.js");
var merge = utils.merge;
var inspect = utils.inspect;

var fs = require('fs');
var bracketup = require("./bracketup.js");

var bracketupScanner = new bracketup.BracketupScanner();

function TextElement(string) {
  this.string = string;
}

function EndOfLineElement() {
}

function BaseNode() {
  this.children = [];
  this.attributes = {};
}

BaseNode.prototype = {
  classMap: {}, 
  addChild: function(child) {
    this.children.push(child);
  }, 
  addTextChild: function(string) {
    this.children.push(new TextElement(string));
  }, 
  addEndOfLineChild: function() {
    if (this.endOfLineNode) {
      this.children.push(this.endOfLineNode);
    } 
  }, 
  setAttribute: function(attributeName, value) {
    this.attributes[attributeName] = value;
  }
};

function BaseAttribute(attributeName) {
  this.attributeName = attributeName;
  this.value = "";
}

BaseAttribute.prototype = {
  addTextChild: function(string) {
    this.value = this.value + string;
  }, 
  addChild: function(child) {
    throw new CompileError("Unexpected non-text element inside " + this.attributeName + " attribute node");
  }, 
  addEndOfLineChild: function() {
    this.addTextChild("\n");
  }, 
  addToParent: function(parent) {
    parent.setAttribute(this.attributeName, this.value);
  }
};

function Bold() {
  BaseNode.call(this);
}

Bold.prototype = merge(BaseNode.prototype, {
});

function Italic() {
  BaseNode.call(this);
}

Italic.prototype = merge(BaseNode.prototype, {
});

function HrefAttribute() {
  BaseAttribute.call(this, "href");
}

HrefAttribute.prototype = merge(BaseAttribute.prototype, {
});

function Link() {
  BaseNode.call(this);
}

Link.prototype = merge(BaseNode.prototype, {
  classMap: {href: HrefAttribute}
});

function TitleAttribute() {
  BaseAttribute.call(this, "title");
}

TitleAttribute.prototype = merge(BaseAttribute.prototype, {
});

function Word(id) {
  BaseNode.call(this);
  this.id = id;
}

Word.prototype = merge(BaseNode.prototype, {
});

function Sentence(id) {
  BaseNode.call(this);
  this.id = id;
}

Sentence.prototype = merge(BaseNode.prototype, {
  defaultChildFunction: "word", 
  classMap: {word: Word}
});

function Text(cssClass) {
  BaseNode.call(this);
  this.cssClass = cssClass;
}

Text.prototype = merge(BaseNode.prototype, {
  defaultChildFunction: "sentence", 
  classMap: {sentence: Sentence, title: TitleAttribute}
});


function Correspondence() {
  BaseNode.call(this);
}

Correspondence.prototype = merge(BaseNode.prototype, {
  defaultChildFunction: "text", 
  classMap: {text: Text, title: TitleAttribute}
});

var correspondenceNodeCompiler = new bracketup.NodeCompiler({correspondence: Correspondence, 
                                                             b: Bold, i: Italic, a: Link});

function compileCorrespondence(source) {
  var bracketupScanner = new bracketup.BracketupScanner();
  var nodeParser = new bracketup.NodeParser();
  bracketupScanner.scanSource(nodeParser, source);
  var parsedRootElements = nodeParser.rootElements;
  for (var i=0; i<parsedRootElements.length; i++) {
    var rootElement = parsedRootElements[i];
    console.log("Parsed root element " + rootElement);
    var correspondence = correspondenceNodeCompiler.compile(rootElement);
    console.log("");
    console.log("Compiled into " + inspect(correspondence));
    console.log("");
  }
}

exports.compileCorrespondence = compileCorrespondence;
