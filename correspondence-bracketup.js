var utils = require("./utils.js");
var merge = utils.merge;
var inspect = utils.inspect;

var bracketup = require("./bracketup.js");

var bracketupScanner = new bracketup.BracketupScanner();

function TextElement(string) {
  this.string = string;
}

TextElement.prototype = {
  createDom: function(document) {
    return document.createTextNode(this.string);
  }
};

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
    child.parent = this;
  }, 
  addTextChild: function(string) {
    if (!(this.ignoreWhiteSpaceText && string.match(/^\s*$/))) {
      this.children.push(new TextElement(string));
    }
  }, 
  
  setIndentInsertString: function(parentIndentInsertString) {
    if (this.childIndent) {
      this.indentInsertString = parentIndentInsertString + this.childIndent;
      for (var i=0; i<this.children.length; i++) {
        var child = this.children[i];
        if (child.setIndentInsertString) {
          child.setIndentInsertString(this.indentInsertString);
        }
      }
    }
  }, 
  addEndOfLineChild: function() {
    if (this.endOfLineNode) {
      this.children.push(this.endOfLineNode);
    } 
  }, 
  setAttribute: function(attributeName, value) {
    this.attributes[attributeName] = value;
  }, 
  createDom: function(document) {
    if (this.createInitialDom) {
      var dom = this.createInitialDom(document);
      for (var i=0; i<this.children.length; i++) {
        var child = this.children[i];
        if (child.createDom) {
          var childDom = child.createDom(document);
          if (childDom) {
            if (this.indentInsertString && (this.indentAllChildren || i == 0)) {
              document.addTextNode(dom, this.indentInsertString);
            }
            dom.appendChild(childDom);
          }
        }
      }
      if (this.indentInsertString) {
        document.addTextNode(dom, this.parent ? this.parent.indentInsertString : "\n");
      }
      return dom;
    }
    else {
      return null;
    }
  }
};

// A wrapper for a browser DOM with easier method for creating nodes
function Document(document) {
  this.document = document;
}

Document.prototype = {
  createNode: function(tag, options) {
    if(!options) {
      options = {};
    }
    var dom = this.document.createElement(tag);
    var parent = options.parent;
    if (parent) {
      parent.appendChild(dom);
    }
    var className = options.className;
    if (className) {
      dom.className = className;
    }
    var attributes = options.attributes;
    if (attributes) {
      for (name in attributes) {
        dom.setAttribute(name, attributes[name]);
      }
    }
    var text = options.text;
    if (text) {
      dom.appendChild(this.document.createTextNode(text));
    }
    return dom;
  }, 
  addTextNode: function(dom, text) {
    dom.appendChild(this.document.createTextNode(text));
  }, 
  createTextNode: function(text) {
    return this.document.createTextNode(text);
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
  createInitialDom: function(document) {
    return document.createNode("b");
  }
});

function Italic() {
  BaseNode.call(this);
}

Italic.prototype = merge(BaseNode.prototype, {
  createInitialDom: function(document) {
    return document.createNode("b");
  }
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
  classMap: {href: HrefAttribute}, 
  
  createInitialDom: function(document) {
    var dom = document.createNode("a");
    var href = this.attributes.href;
    if (href) {
      dom.setAttribute("href", href);
    }
    return dom;
  }
});

function TitleAttribute() {
  BaseAttribute.call(this, "title");
}

TitleAttribute.prototype = merge(BaseAttribute.prototype, {
});

function LanguageTitleAttribute() {
  BaseAttribute.call(this, "languageTitle");
}

LanguageTitleAttribute.prototype = merge(BaseAttribute.prototype, {
});

function Word(id) {
  BaseNode.call(this);
  this.id = id;
}

Word.prototype = merge(BaseNode.prototype, {
  createInitialDom: function(document) {
    var id = this.id;
    if (id.match(/^[0-9]+$/)) {
      id = this.parent.id + id;
    }
    return document.createNode("span", {className: "item", 
                                        attributes: {"data-id": id}});
  }
});

function Sentence(id) {
  BaseNode.call(this);
  this.id = id;
}

Sentence.prototype = merge(BaseNode.prototype, {
  defaultChildFunction: "word", 
  classMap: {word: Word}, 
  childIndent: "  ", 
  
  createInitialDom: function(document) {
    return document.createNode("div", {className: "item-group", 
                                       attributes: {"data-group-id": this.id}});
  }
});

function Text(languageCssClass) {
  BaseNode.call(this);
  this.languageCssClass = languageCssClass;
}

Text.prototype = merge(BaseNode.prototype, {
  defaultChildFunction: "sentence", 
  classMap: {sentence: Sentence, languageTitle: LanguageTitleAttribute}, 
  childIndent: "  ", 
  indentAllChildren: true, 
  ignoreWhiteSpaceText: true, 
  
  createInitialDom: function(document) {
    var className = this.languageCssClass ? ("structure " + this.languageCssClass + "-structure") : "structure";
    var div = document.createNode("div", {className: className});
    var languageTitle = this.attributes.languageTitle;
    if (languageTitle) {
      document.createNode("div", {parent: div, className: "language", 
                                  text: languageTitle});
    }
    return div;
  }
});

function Correspondence() {
  BaseNode.call(this);
}

Correspondence.prototype = merge(BaseNode.prototype, {
  defaultChildFunction: "text", 
  classMap: {text: Text, title: TitleAttribute}, 
  childIndent: "  ", 
  indentAllChildren: true, 
  ignoreWhiteSpaceText: true, 
  
  createInitialDom: function (document) {
    var div = document.createNode("div", {className: "structure-group"});
    var title = this.attributes.title;
    if (title) {
      document.createNode("div", {parent: div, className: "description", 
                                  text: title});
    }
    return div;
  }
});

var correspondenceNodeCompiler = new bracketup.NodeCompiler({correspondence: Correspondence, 
                                                             b: Bold, i: Italic, a: Link});

function compileCorrespondence(source) {
  var bracketupScanner = new bracketup.BracketupScanner();
  var nodeParser = new bracketup.NodeParser();
  bracketupScanner.scanSource(nodeParser, source);
  var parsedRootElements = nodeParser.rootElements;
  var compiledObjects = [];
  for (var i=0; i<parsedRootElements.length; i++) {
    var rootElement = parsedRootElements[i];
    //console.log("Parsed root element " + rootElement);
    var correspondence = correspondenceNodeCompiler.compile(rootElement);
    compiledObjects.push(correspondence);
  }
  return compiledObjects;
}

exports.Document = Document;
exports.compileCorrespondence = compileCorrespondence;
