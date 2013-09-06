(function() {
  var utils = require("./utils.js");
  var merge = utils.merge;
  var inspect = utils.inspect;
  
  var bracketup1 = require("./bracketup1.js");
  
  var SourceFileName = bracketup1.SourceFileName;
  var TextNode = bracketup1.TextNode;
  var EndOfLineNode = bracketup1.EndOfLineNode;
  var ElementNode = bracketup1.ElementNode;
  var CustomError = bracketup1.CustomError;
  var CompileError = bracketup1.CompileError;
  var NodeCompiler = bracketup1.NodeCompiler;
  var NodeParseException = bracketup1.NodeParseException;
  var NodeParser = bracketup1.NodeParser;
  var TestTokenReceiver = bracketup1.TestTokenReceiver;
  var BracketupScanner = bracketup1.BracketupScanner;
  
  /** Base and generic classes for application-specific Bracketup interpreters */
  
  function TextElement(string) {
    this.string = string;
  }

  TextElement.prototype = {
    createDom: function(document) {
      return document.createTextNode(this.string);
    }
  };

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
    createTextNode: function(text) {
      return this.document.createTextNode(text);
    }, 
    addTextNode: function(dom, text) {
      dom.appendChild(this.document.createTextNode(text));
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
      throw new CompileError("Unexpected non-text element inside " + this.attributeName + " attribute node", 
                             child.sourceLinePosition);
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
