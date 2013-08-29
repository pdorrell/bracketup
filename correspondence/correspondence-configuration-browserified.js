;(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function() {
  var utils = require("./utils.js");
  var merge = utils.merge;
  var inspect = utils.inspect;
  
  function SourceFileName(fileName) {
    this.fileName = fileName;
  }
  
  SourceFileName.prototype = {
    toString: function() {
      return this.fileName;
    }, 
    line: function (string, lineNumber) {
      return new SourceLine(this, string, lineNumber);
    }, 
    endOfFilePosition: function(lines) {
      var numLines = lines.length;
      var lastLine = numLines > 0 ? lines[numLines-1] : null;
      return new EndOfSourceFilePosition(this, numLines, lastLine);
    }
  };
  
  function EndOfSourceFilePosition(sourceFileName, numLines, lastLine) {
    this.sourceFileName = sourceFileName;
    this.numLines = numLines;
    this.lastLine = lastLine;
  };
  
  EndOfSourceFilePosition.prototype = {
    toString: function() {
      return this.sourceFileName + ":" + this.numLines;
    }
  };
  
  function SourceLine(sourceFileName, line, lineNumber) {
    this.sourceFileName = sourceFileName;
    this.line = line;
    this.lineNumber = lineNumber;
  }
  
  SourceLine.prototype = {
    toString: function() {
      return this.sourceFileName + ":" + this.lineNumber;
    }, 
    position: function(linePosition) {
      return new SourceLinePosition(this, linePosition);
    }
  };
  
  function SourceLinePosition(sourceLine, position) {
    this.sourceLine = sourceLine;
    this.position = position;
  }
  
  function repeatedString(string, numRepeats) {
    var array = [];
    for (var i=0; i<numRepeats; i++) {
      array.push(string);
    }
    return array.join("");
  }

  SourceLinePosition.prototype = {
    toString: function() {
      return this.sourceLine + ":" + this.position;
    }, 
    logLineAndPosition: function() {
      var linePrefix = this.toString() + ":";
      var line1 = linePrefix + this.sourceLine.line;
      var line2 = repeatedString(" ", linePrefix.length + this.position - 1) + "^";
      return [line1, line2];
    }
  };
  
  function TextNode(string, sourceLinePosition) {
    this.string = string;
    this.sourceLinePosition = sourceLinePosition;
  }

  TextNode.prototype = {
    toString: function() {
      return "[TextNode " + inspect(this.string) + "]";
    }, 
    addToResult: function(compiler, result) {
      compiler.compileTextChild(result, this.string);
    }
  };

  function EndOfLineNode(sourceLinePosition) {
    this.sourceLinePosition = sourceLinePosition;
  }

  EndOfLineNode.prototype = {
    toString: function() {
      return "[EndOfLineNode]";
    }, 
    addToResult: function(compiler, result) {
      compiler.compileEndOfLineChild(result);
    }
  }

  function ElementNode(args, whitespace, sourceLinePosition) {
    this.args = args;
    this.whitespace = whitespace;
    this.sourceLinePosition = sourceLinePosition;
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
    this.message = message;
    this.error = new Error(message);
    this.stack = this.error.stack.replace(/^Error:/g, className + ":")
  }
  
  CustomError.prototype = {
    logSourceError: function() {
      if (this.sourceLinePosition) {
        console.log("");
        console.log(this.getMessageLine());
        console.log("");
        console.log(this.sourceLinePosition.logLineAndPosition().join("\n"));
      }
    }
  };

  function CompileError(message, sourceLinePosition) {
    CustomError.call(this, "CompileError", message);
    this.sourceLinePosition = sourceLinePosition;
  }
  
  CompileError.prototype = merge(CustomError.prototype, {
    getMessageLine: function() {
      return "Compile error: " + this.message;
    }
  });

  function NodeCompiler(topLevelClassMap) {
    this.topLevelClassMap = topLevelClassMap;
  }

  NodeCompiler.prototype = {
    createFromFunctionClass: function(functionClass, constructorArgs, initialWhitespace, 
                                      childNodes, sourceLinePosition) {
      var object = Object.create(functionClass.prototype);
      functionClass.apply(object, constructorArgs);
      if (object.prependWhitespace) {
        object.prependWhitespace(initialWhitespace);
      }
      for (var i=0; i<childNodes.length; i++) {
        var childNode = childNodes[i];
        this.compileChild(object, childNode);
      }
      object.sourceLinePosition = sourceLinePosition;
      return object;
    }, 
    compile: function(rootElementNode) {
      var elementArgs = rootElementNode.args;
      if (elementArgs.length == 0) {
        throw new CompileError("No node function name given for root element", 
                               rootElementNode.sourceLinePosition);
      }
      var functionName = elementArgs[0];
      if (functionName.match(/^_/)) {
        functionName = functionName.substring(1);
      }
      var nodeFunctionClass = this.topLevelClassMap[functionName];
      if (!nodeFunctionClass) {
        throw new CompileError("Unknown top-level function for root element: " + functionName, 
                               rootElementNode.sourceLinePosition);
      }
      var rootObject = this.createFromFunctionClass(nodeFunctionClass, elementArgs.slice(1), 
                                                    rootElementNode.whitespace, 
                                                    rootElementNode.children, 
                                                    rootElementNode.sourceLinePosition);
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
        throw new CompileError("No function argument given and no default child function for parent element", 
                               childNode.sourceLinePosition);
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
                               " in either parent class map or top-level class map", 
                               childNode.sourceLinePosition);
      }
      var childObject = this.createFromFunctionClass(childFunctionClass, elementArgs, 
                                                     childNode.whitespace, 
                                                     childNode.children, 
                                                     childNode.sourceLinePosition);
      if(childObject.addToParent) {
        childObject.addToParent(parentObject);
      }
      else {
        parentObject.addChild(childObject);
      }
    }
  };

  function NodeParseException(message, sourceLinePosition) {
    CustomError.call(this, "NodeParseException", message);
    this.sourceLinePosition = sourceLinePosition;
  }
  
  NodeParseException.prototype = merge(CustomError.prototype, {
    getMessageLine: function() {
      return "Syntax error: " + this.message;
    }
  });

  function NodeParser() {
    this.nodesStack = [];
    this.currentElementNode = null;
    this.rootElements = [];
  }

  NodeParser.prototype = {
    startItem: function(itemArguments, whitespace, sourceLinePosition) {
      var elementNode = new ElementNode(itemArguments, whitespace, sourceLinePosition);
      if (this.currentElementNode == null) {
        this.rootElements.push(elementNode);
      }    
      else {
        this.currentElementNode.addChild(elementNode);
        this.nodesStack.push(this.currentElementNode);
      }
      this.currentElementNode = elementNode;
    }, 
    endItem: function(sourceLinePosition) {
      if (this.currentElementNode != null) {
        if (this.nodesStack.length > 0) {
          this.currentElementNode = this.nodesStack.pop();
        }
        else {
          this.currentElementNode = null;
        }
      }
      else {
        throw new NodeParseException("Unexpected end of element node", sourceLinePosition);
      }
    }, 
    text: function(string, sourceLinePosition) {
      if (this.currentElementNode != null) {
        this.currentElementNode.addChild(new TextNode(string, sourceLinePosition));
      }
      else {
        if (string.match("^\s*$")) {
          //console.log("Ignoring whitespace outside of root element: " + inspect(string));
        }
        else {
          throw new NodeParseException("Unexpected text outside of root element: " + inspect(string), 
                                       sourceLinePosition);
        }
      }
    }, 
    endOfLine: function(sourceLinePosition) {
      if (this.currentElementNode != null) {
        this.currentElementNode.addChild(new EndOfLineNode(sourceLinePosition));
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
    
    startItem: function(itemArguments, whitespace, sourceLinePosition) {
      console.log(this.indent + "START " + inspect(itemArguments) + 
                  "  (whitespace = " + inspect(whitespace) + ") [" + sourceLinePosition + "]");
      this.indent = this.indent + this.indentIncrement;
    }, 
    endItem: function(sourceLinePosition) {
      if (this.indent.length < this.indentIncrement.length) {
        throw new CompileError("Unexpected end of item", sourceLinePosition);
      }
      this.indent = this.indent.substring(this.indentIncrement.length);
      console.log(this.indent + "END [" + sourceLinePosition + "]");
    }, 
    text: function(string, sourceLinePosition) {
      console.log(this.indent + "TEXT " + inspect(string) + " [" + sourceLinePosition + "]");
    }, 
    endOfLine: function(sourceLinePosition) {
      console.log(this.indent + "EOLN [" + sourceLinePosition + "]");
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
        tokenReceiver.text(this.textPortions.join(""), this.textPortionsSourceLinePosition);
        this.textPortions = [];
      }
    }, 
    saveTextPortion: function(textPortion, sourceLinePosition) {
      if (this.textPortions.length == 0) {
        this.textPortionsSourceLinePosition = sourceLinePosition;
      }
      this.textPortions.push(textPortion);
    }, 
    scanLine: function(tokenReceiver, line, sourceLine) {
      var scanningRegex = new RegExp(this.regex.source, "g");
      // console.log("Scanning " + inspect(line) + "\n  with " + scanningRegex + " ..."); 
      var matchedSubstrings = [];
      this.textPortions = [];
      var linePosition = 1;
      while ((match = scanningRegex.exec(line)) !== null) {
        var sourceLinePosition = sourceLine.position(linePosition);
        // console.log("  match = " + inspect(match));
        var matchedSubstring = match[0];
        matchedSubstrings.push(matchedSubstring);
        // console.log("==> " + inspect(match[0]));
        if(match[1]) {
          this.sendAnyTexts(tokenReceiver);
          var itemArguments = match[2].split(",");
          var whitespace = match[3];
          tokenReceiver.startItem(itemArguments, whitespace, sourceLinePosition);
          this.depth++;
        }
        else if (match[4]) {
          this.sendAnyTexts(tokenReceiver);
          if(this.depth <= 0) {
            throw new NodeParseException("Unexpected ']'", sourceLinePosition);
          }
          tokenReceiver.endItem(sourceLinePosition);
          this.depth--;
        }
        else if (match[5]) {
          this.saveTextPortion(match[6], sourceLinePosition);
        }
        else if (match[7]) {
          this.saveTextPortion(match[7], sourceLinePosition);
        }
        else {
          console.log("match = " + inspect(match));
          throw new NodeParseException("No match found in lexer", sourceLinePosition);
        }
        linePosition += matchedSubstring.length;
      }
      this.sendAnyTexts(tokenReceiver);
      tokenReceiver.endOfLine(sourceLinePosition);

      var reconstitutedMatches = matchedSubstrings.join("");
      if (reconstitutedMatches != line) {
        throw new NodeParseException("Reconstituted " + inspect(reconstitutedMatches) + 
                                     "\n                  != " + inspect(line), sourceLinePosition);
      }
      // console.log("matched substrings = " + inspect(matchedSubstrings.join("")));
    }, 
    
    scanSource: function(tokenReceiver, source, sourceFileName) {
      this.depth = 0;
      var lines = source.split("\n");
      var sourceFileName = new SourceFileName(sourceFileName);
      for (var i=0; i<lines.length; i++) {
        var line = lines[i];
        this.scanLine(tokenReceiver, line, sourceFileName.line(line, i+1));
      }
      if (this.depth != 0) {
        throw new NodeParseException(this.depth + " unbalanced '['s at end of file", 
                                     sourceFileName.endOfFilePosition(lines));
      }
    }
  };
  
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

},{"./utils.js":4}],2:[function(require,module,exports){
(function() {
  var utils = require("./utils.js");
  var merge = utils.merge;
  var inspect = utils.inspect;

  var bracketup = require("./bracketup.js");

  function TitleAttribute() {
    bracketup.BaseAttribute.call(this, "title");
  }

  TitleAttribute.prototype = merge(bracketup.BaseAttribute.prototype, {
  });

  function LanguageTitleAttribute() {
    bracketup.BaseAttribute.call(this, "languageTitle");
  }

  LanguageTitleAttribute.prototype = merge(bracketup.BaseAttribute.prototype, {
  });

  function Word(id) {
    bracketup.BaseNode.call(this);
    this.id = id;
  }

  Word.prototype = merge(bracketup.BaseNode.prototype, {
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
    bracketup.BaseNode.call(this);
    this.id = id;
  }

  Sentence.prototype = merge(bracketup.BaseNode.prototype, {
    defaultChildFunction: "word", 
    classMap: {word: Word}, 
    childIndent: "  ", 
    
    createInitialDom: function(document) {
      return document.createNode("div", {className: "item-group", 
                                         attributes: {"data-group-id": this.id}});
    }
  });

  function Text(languageCssClass) {
    bracketup.BaseNode.call(this);
    this.languageCssClass = languageCssClass;
  }

  Text.prototype = merge(bracketup.BaseNode.prototype, {
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
    bracketup.BaseNode.call(this);
  }

  Correspondence.prototype = merge(bracketup.BaseNode.prototype, {
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
  
  var correspondenceCompiler = 
    new bracketup.BracketupCompiler({correspondence: Correspondence, 
                                     b: bracketup.Bold, 
                                     i: bracketup.Italic, 
                                     a: bracketup.Link});

  exports.correspondenceCompiler = correspondenceCompiler;
})();

},{"./bracketup.js":1,"./utils.js":4}],3:[function(require,module,exports){
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


},{"../bracketup.js":1,"../correspondence-bracketup.js":2,"../utils.js":4}],4:[function(require,module,exports){
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