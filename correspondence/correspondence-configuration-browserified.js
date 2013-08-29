;(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function() {
  var utils = require("./utils.js");
  var merge = utils.merge;
  var inspect = utils.inspect;

  function TextNode(string) {
    this.string = string;
  }

  TextNode.prototype = {
    toString: function() {
      return "[TextNode " + inspect(this.string) + "]";
    }, 
    addToResult: function(compiler, result) {
      compiler.compileTextChild(result, this.string);
    }
  };

  function EndOfLineNode() {
  }

  EndOfLineNode.prototype = {
    toString: function() {
      return "[EndOfLineNode]";
    }, 
    addToResult: function(compiler, result) {
      compiler.compileEndOfLineChild(result);
    }
  }

  function ElementNode(args, whitespace) {
    this.args = args;
    this.whitespace = whitespace;
    this.children = [];
  }

  ElementNode.prototype = {
    addChild: function(child) {
      child.parent = this;
      this.children.push(child);
    }, 
    toString: function() {
      var childStrings = [];
      for (var i=0; i<this.children.length; i++) {
        childStrings.push(this.children[i].toString());
      }
      return "[ElementNode(" + this.args.join(", ") + ") " + childStrings.join(", ") + "]";
    }, 
    addToResult: function(compiler, result) {
      compiler.compileElementChild(result, this);
    }
  };

  function CustomError(className, message) {
    this.error = new Error(message);
    this.stack = this.error.stack.replace(/^Error:/g, className + ":")
  }

  function CompileError(message) {
    CustomError.call(this, "CompileError", message);
  }

  function NodeCompiler(topLevelClassMap) {
    this.topLevelClassMap = topLevelClassMap;
  }

  NodeCompiler.prototype = {
    createFromFunctionClass: function(functionClass, constructorArgs, initialWhitespace, 
                                      childNodes) {
      var object = Object.create(functionClass.prototype);
      functionClass.apply(object, constructorArgs);
      if (object.prependWhitespace) {
        object.prependWhitespace(initialWhitespace);
      }
      for (var i=0; i<childNodes.length; i++) {
        var childNode = childNodes[i];
        this.compileChild(object, childNode);
      }
      return object;
    }, 
    compile: function(rootElementNode) {
      var elementArgs = rootElementNode.args;
      if (elementArgs.length == 0) {
        throw new CompileError("No node function name given for root element");
      }
      var functionName = elementArgs[0];
      if (functionName.match(/^_/)) {
        functionName = functionName.substring(1);
      }
      var nodeFunctionClass = this.topLevelClassMap[functionName];
      if (!nodeFunctionClass) {
        throw new CompileError("Unknown top-level function for root element: " + functionName);
      }
      var rootObject = this.createFromFunctionClass(nodeFunctionClass, elementArgs.slice(1), 
                                                    rootElementNode.whitespace, 
                                                    rootElementNode.children);
      if (rootObject.setIndentInsertString) {
        rootObject.setIndentInsertString("\n");
      }
      return rootObject;
    }, 
    compileChild: function(parentObject, childNode) {
      childNode.addToResult(this, parentObject);
    }, 
    compileTextChild: function(parentObject, string) {
      parentObject.addTextChild(string);
    }, 
    compileEndOfLineChild: function(parentObject) {
      parentObject.addEndOfLineChild();
    }, 
    compileElementChild: function(parentObject, childNode) {
      var elementArgs = childNode.args.slice(0);
      if(elementArgs.length>0 && elementArgs[0].match(/^_/)) {
        elementArgs[0] = elementArgs[0].substring(1);
      }
      else {
        if(parentObject.defaultChildFunction) {
          elementArgs = [parentObject.defaultChildFunction].concat(elementArgs);
        }
      }
      if (elementArgs.length == 0) {
        throw new CompileError("No function argument given and no default child function for parent element");
      }
      var functionName = elementArgs[0];
      elementArgs = elementArgs.slice(1);
      var childFunctionClass = null;
      if (parentObject.classMap) {
        childFunctionClass = parentObject.classMap[functionName];
      }
      if (!childFunctionClass) {
        childFunctionClass = this.topLevelClassMap[functionName];
      }
      if (!childFunctionClass) {
        throw new CompileError("No function class found for " + inspect(functionName) + 
                               " in either parent class map or top-level class map");
      }
      var childObject = this.createFromFunctionClass(childFunctionClass, elementArgs, 
                                                     childNode.whitespace, 
                                                     childNode.children);
      if(childObject.addToParent) {
        childObject.addToParent(parentObject);
      }
      else {
        parentObject.addChild(childObject);
      }
    }
  };

  function NodeParseException(message) {
    CustomError.call(this, "NodeParseException", message);
  }

  function NodeParser() {
    this.nodesStack = [];
    this.currentElementNode = null;
    this.rootElements = [];
  }

  NodeParser.prototype = {
    startItem: function(itemArguments, whitespace) {
      var elementNode = new ElementNode(itemArguments, whitespace);
      if (this.currentElementNode == null) {
        this.rootElements.push(elementNode);
      }    
      else {
        this.currentElementNode.addChild(elementNode);
        this.nodesStack.push(this.currentElementNode);
      }
      this.currentElementNode = elementNode;
    }, 
    endItem: function() {
      if (this.currentElementNode != null) {
        if (this.nodesStack.length > 0) {
          this.currentElementNode = this.nodesStack.pop();
        }
        else {
          this.currentElementNode = null;
        }
      }
      else {
        throw new NodeParseException("Unexpected end of element node");
      }
    }, 
    text: function(string) {
      if (this.currentElementNode != null) {
        this.currentElementNode.addChild(new TextNode(string));
      }
      else {
        if (string.match("^\s*$")) {
          //console.log("Ignoring whitespace outside of root element: " + inspect(string));
        }
        else {
          throw new NodeParseException("Unexpected text outside of root element: " + inspect(string));
        }
      }
    }, 
    endOfLine: function() {
      if (this.currentElementNode != null) {
        this.currentElementNode.addChild(new EndOfLineNode());
      }
      else {
        //console.log("Ignoring end-of-line outside of root element");
      }
    }
  };

  function TestTokenReceiver() {
    this.indent = "";
  }

  TestTokenReceiver.prototype = {
    indentIncrement: "  ", 
    
    startItem: function(itemArguments, whitespace) {
      console.log(this.indent + "START " + inspect(itemArguments) + 
                  "  (whitespace = " + inspect(whitespace) + ")");
      this.indent = this.indent + this.indentIncrement;
    }, 
    endItem: function() {
      if (this.indent.length < this.indentIncrement.length) {
        throw new CompileError("Unexpected end of item");
      }
      this.indent = this.indent.substring(this.indentIncrement.length);
      console.log(this.indent + "END");
    }, 
    text: function(string) {
      console.log(this.indent + "TEXT " + inspect(string));
    }, 
    endOfLine: function() {
      console.log(this.indent + "EOLN");
    }
  };

  var testLine = "[correspondence  [_title \\[Queens\\] Puzzle] " + 
    "[_text,rhoscript [_title rhoScript] [A [_word,1 8] [2 range]]";

  function BracketupScanner() {
  }

  BracketupScanner.prototype = {
    regex: /(?:(\[)([A-Za-z0-9_\-,]*)([\s]*))|(\])|(\\(.))|([^[\]\\]+)/g, 
    
    sendAnyTexts: function(tokenReceiver) {
      if (this.textPortions.length > 0) {
        tokenReceiver.text(this.textPortions.join(""));
        this.textPortions = [];
      }
    }, 
    
    scanLine: function(tokenReceiver, line) {
      var scanningRegex = new RegExp(this.regex.source, "g");
      // console.log("Scanning " + inspect(line) + "\n  with " + scanningRegex + " ..."); 
      var matchedSubstrings = [];
      this.textPortions = [];
      while ((match = scanningRegex.exec(line)) !== null) {
        // console.log("  match = " + inspect(match));
        matchedSubstrings.push(match[0]);
        // console.log("==> " + inspect(match[0]));
        if(match[1]) {
          this.sendAnyTexts(tokenReceiver);
          var itemArguments = match[2].split(",");
          var whitespace = match[3];
          tokenReceiver.startItem(itemArguments, whitespace);
          this.depth++;
        }
        else if (match[4]) {
          this.sendAnyTexts(tokenReceiver);
          if(this.depth <= 0) {
            throw new NodeParseException("Unexpected ']'");
          }
          tokenReceiver.endItem();
          this.depth--;
        }
        else if (match[5]) {
          this.textPortions.push(match[6]);
        }
        else if (match[7]) {
          this.textPortions.push(match[7]);
        }
        else {
          console.log("match = " + inspect(match));
          throw new NodeParseException("No match found in lexer");
        }
      }
      this.sendAnyTexts(tokenReceiver);
      tokenReceiver.endOfLine();

      var reconstitutedMatches = matchedSubstrings.join("");
      if (reconstitutedMatches != line) {
        throw new NodeParseException("Reconstituted " + inspect(reconstitutedMatches) + 
                                     "\n                  != " + inspect(line));
      }
      // console.log("matched substrings = " + inspect(matchedSubstrings.join("")));
    }, 
    
    scanSource: function(tokenReceiver, source) {
      this.depth = 0;
      var lines = source.split("\n");
      for (var i=0; i<lines.length; i++) {
        this.scanLine(tokenReceiver, lines[i]);
      }
      if (this.depth != 0) {
        throw new NodeParseException(this.depth + " unbalanced '['s at end of file");
      }
    }
  };

  exports.BracketupScanner = BracketupScanner;
  exports.NodeParser = NodeParser;
  exports.NodeCompiler = NodeCompiler;
  exports.TestTokenReceiver = TestTokenReceiver;
  exports.CompileError = CompileError;
  
})();

},{"./utils.js":4}],2:[function(require,module,exports){
(function() {
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

})();

},{"./bracketup.js":1,"./utils.js":4}],3:[function(require,module,exports){
var utils = require("../utils.js");
inspect = utils.inspect;

$(document).ready(function(){
  compileCorrespondenceSource($("#rhoscript-example-source"));
  initialiseInteraction();
});

var correspondenceBracketup = require("../correspondence-bracketup.js");

function compileCorrespondenceSource(sourceElementSelector) {
  var documentObject = new correspondenceBracketup.Document(window.document);
  var correspondenceSource = sourceElementSelector.html();
  var compiledObjects = correspondenceBracketup.compileCorrespondence(correspondenceSource);
  var correspondence = compiledObjects[0];
  var correspondenceDom = correspondence.createDom(documentObject);
  sourceElementSelector.after(correspondenceDom);
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


},{"../correspondence-bracketup.js":2,"../utils.js":4}],4:[function(require,module,exports){
(function() {

  // merge any number of objects, creating a new object
  function merge() {
    var result = {};
    for (var i=0; i<arguments.length; i++ ) {
      var object = arguments[i];
      var name;
      for (name in object) {
        var value = object[ name ];
        if ( value !== undefined ) {
	  result[name] = value;
        }
      }
    }
    return result;
  };

  function inspect(object) {return JSON.stringify(object);}

  exports.merge = merge;
  exports.inspect = inspect;
})();

},{}]},{},[3])
;