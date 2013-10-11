;(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// Generated by CoffeeScript 1.6.3
(function() {
  var BaseAttribute, BaseNode, Bold, BracketupCompiler, BracketupScanner, CompileError, CustomError, Document, ElementNode, EndOfLineNode, HrefAttribute, Italic, Link, MarkupNode, NDash, NodeCompiler, NodeParseException, NodeParser, SourceFileName, SourceLine, SourceLinePosition, Span, TextElement, TextNode, WrapperMarkupNode, inspect, repeatedString, utils, _ref, _ref1, _ref2, _ref3, _ref4, _ref5,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  utils = require("./utils.js");

  inspect = utils.inspect;

  SourceFileName = (function() {
    function SourceFileName(fileName) {
      this.fileName = fileName;
    }

    SourceFileName.prototype.toString = function() {
      return this.fileName;
    };

    SourceFileName.prototype.line = function(string, lineNumber) {
      return new SourceLine(this, string, lineNumber);
    };

    SourceFileName.prototype.endOfFilePosition = function(lines) {
      var lastLine, numLines;
      numLines = lines.length;
      lastLine = numLines > 0 ? lines[numLines - 1] : null;
      if (lastLine !== null) {
        return this.line(lastLine, numLines - 1).position(lastLine.length + 1);
      } else {
        return this.line("", 0).position(1);
      }
    };

    return SourceFileName;

  })();

  SourceLine = (function() {
    function SourceLine(sourceFileName, line, lineNumber) {
      this.sourceFileName = sourceFileName;
      this.line = line;
      this.lineNumber = lineNumber;
    }

    SourceLine.prototype.toString = function() {
      return this.sourceFileName + ":" + this.lineNumber;
    };

    SourceLine.prototype.position = function(linePosition) {
      return new SourceLinePosition(this, linePosition);
    };

    return SourceLine;

  })();

  repeatedString = function(string, numRepeats) {
    var i;
    return ((function() {
      var _i, _results;
      _results = [];
      for (i = _i = 1; 1 <= numRepeats ? _i <= numRepeats : _i >= numRepeats; i = 1 <= numRepeats ? ++_i : --_i) {
        _results.push(string);
      }
      return _results;
    })()).join("");
  };

  SourceLinePosition = (function() {
    function SourceLinePosition(sourceLine, position) {
      this.sourceLine = sourceLine;
      this.position = position;
    }

    SourceLinePosition.prototype.toString = function() {
      return this.sourceLine + ":" + this.position;
    };

    SourceLinePosition.prototype.logLineAndPosition = function() {
      var line1, line2, linePrefix;
      linePrefix = this.toString() + ":";
      line1 = linePrefix + this.sourceLine.line;
      line2 = repeatedString(" ", linePrefix.length + this.position - 1) + "^";
      return [line1, line2];
    };

    return SourceLinePosition;

  })();

  TextNode = (function() {
    function TextNode(string, sourceLinePosition) {
      this.string = string;
      this.sourceLinePosition = sourceLinePosition;
    }

    TextNode.prototype.toString = function() {
      return "[TextNode " + inspect(this.string) + "]";
    };

    TextNode.prototype.addToResult = function(compiler, result) {
      return compiler.compileTextChild(result, this.string);
    };

    return TextNode;

  })();

  EndOfLineNode = (function() {
    function EndOfLineNode(sourceLinePosition) {
      this.sourceLinePosition = sourceLinePosition;
    }

    EndOfLineNode.prototype.toString = function() {
      return "[EndOfLineNode]";
    };

    EndOfLineNode.prototype.addToResult = function(compiler, result) {
      return compiler.compileEndOfLineChild(result);
    };

    return EndOfLineNode;

  })();

  ElementNode = (function() {
    function ElementNode(args, whitespace, sourceLinePosition) {
      this.args = args;
      this.whitespace = whitespace;
      this.sourceLinePosition = sourceLinePosition;
      this.children = [];
    }

    ElementNode.prototype.addChild = function(child) {
      child.parent = this;
      return this.children.push(child);
    };

    ElementNode.prototype.toString = function() {
      var child, childStrings;
      childStrings = (function() {
        var _i, _len, _ref, _results;
        _ref = this.children;
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          child = _ref[_i];
          _results.push(child.toString());
        }
        return _results;
      }).call(this);
      return "[ElementNode(" + this.args.join(", ") + ") " + childStrings.join(", ") + "]";
    };

    ElementNode.prototype.addToResult = function(compiler, result) {
      return compiler.compileElementChild(result, this);
    };

    return ElementNode;

  })();

  CustomError = (function() {
    function CustomError(className, message) {
      this.message = message;
      this.error = new Error(this.message);
      this.stack = this.error.stack.replace(/^Error:/g, className + ":");
    }

    CustomError.prototype.logSourceError = function() {
      if (this.sourceLinePosition) {
        console.log("");
        console.log(this.getMessageLine());
        console.log("");
        return console.log(this.sourceLinePosition.logLineAndPosition().join("\n"));
      }
    };

    return CustomError;

  })();

  CompileError = (function(_super) {
    __extends(CompileError, _super);

    function CompileError(message, sourceLinePosition) {
      this.sourceLinePosition = sourceLinePosition;
      CompileError.__super__.constructor.call(this, "CompileError", message);
    }

    CompileError.prototype.getMessageLine = function() {
      return "Compile error: " + this.message;
    };

    return CompileError;

  })(CustomError);

  NodeCompiler = (function() {
    function NodeCompiler(topLevelClassMap) {
      this.topLevelClassMap = topLevelClassMap;
    }

    NodeCompiler.prototype.createFromFunctionClass = function(functionClass, constructorArgs, initialWhitespace, parentObject, childNodes, sourceLinePosition) {
      var childNode, object, _i, _len;
      object = Object.create(functionClass.prototype);
      functionClass.apply(object, constructorArgs);
      if (object.prependWhitespace) {
        object.prependWhitespace(initialWhitespace);
      }
      object.parent = parentObject;
      for (_i = 0, _len = childNodes.length; _i < _len; _i++) {
        childNode = childNodes[_i];
        this.compileChild(object, childNode);
      }
      object.sourceLinePosition = sourceLinePosition;
      return object;
    };

    NodeCompiler.prototype.compile = function(rootElementNode) {
      var elementArgs, functionName, nodeFunctionClass, rootObject;
      elementArgs = rootElementNode.args;
      if (elementArgs.length === 0) {
        throw new CompileError("No node function name given for root element", rootElementNode.sourceLinePosition);
      }
      functionName = elementArgs[0];
      if (functionName.match(/^_/)) {
        functionName = functionName.substring(1);
      }
      nodeFunctionClass = this.topLevelClassMap[functionName];
      if (!nodeFunctionClass) {
        throw new CompileError("Unknown top-level function for root element: " + functionName, rootElementNode.sourceLinePosition);
      }
      rootObject = this.createFromFunctionClass(nodeFunctionClass, elementArgs.slice(1), rootElementNode.whitespace, null, rootElementNode.children, rootElementNode.sourceLinePosition);
      if (rootObject.setIndentInsertString) {
        rootObject.setIndentInsertString("\n");
      }
      return rootObject;
    };

    NodeCompiler.prototype.compileChild = function(parentObject, childNode) {
      return childNode.addToResult(this, parentObject);
    };

    NodeCompiler.prototype.compileTextChild = function(parentObject, string) {
      return parentObject.addTextChild(string);
    };

    NodeCompiler.prototype.compileEndOfLineChild = function(parentObject) {
      return parentObject.addEndOfLineChild();
    };

    NodeCompiler.prototype.compileElementChild = function(parentObject, childNode) {
      var childFunctionClass, childObject, elementArgs, functionName, parentClassMap, semanticParent;
      semanticParent = parentObject.getSemanticParentOfChild();
      elementArgs = childNode.args.slice(0);
      if (elementArgs.length > 0 && elementArgs[0].match(/^_/)) {
        elementArgs[0] = elementArgs[0].substring(1);
      } else {
        if (semanticParent.defaultChildFunction) {
          elementArgs = [semanticParent.defaultChildFunction].concat(elementArgs);
        }
      }
      if (elementArgs.length === 0) {
        throw new CompileError("No function argument given and no default child function for parent element", childNode.sourceLinePosition);
      }
      functionName = elementArgs[0];
      elementArgs = elementArgs.slice(1);
      childFunctionClass = null;
      parentClassMap = semanticParent.classMap;
      if (parentClassMap) {
        childFunctionClass = parentClassMap[functionName];
      }
      if (!childFunctionClass) {
        childFunctionClass = this.topLevelClassMap[functionName];
      }
      if (!childFunctionClass) {
        throw new CompileError("No function class found for " + inspect(functionName) + " in either parent class map or top-level class map", childNode.sourceLinePosition);
      }
      childObject = this.createFromFunctionClass(childFunctionClass, elementArgs, childNode.whitespace, parentObject, childNode.children, childNode.sourceLinePosition);
      if (childObject.addToParent) {
        return childObject.addToParent(parentObject);
      } else {
        return parentObject.addChild(childObject);
      }
    };

    return NodeCompiler;

  })();

  NodeParseException = (function(_super) {
    __extends(NodeParseException, _super);

    function NodeParseException(message, sourceLinePosition) {
      this.sourceLinePosition = sourceLinePosition;
      NodeParseException.__super__.constructor.call(this, "NodeParseException", message);
    }

    NodeParseException.prototype.getMessageLine = function() {
      return "Syntax error: " + this.message;
    };

    return NodeParseException;

  })(CustomError);

  NodeParser = (function() {
    function NodeParser() {
      this.nodesStack = [];
      this.currentElementNode = null;
      this.rootElements = [];
    }

    NodeParser.prototype.startItem = function(itemArguments, whitespace, sourceLinePosition) {
      var elementNode;
      elementNode = new ElementNode(itemArguments, whitespace, sourceLinePosition);
      if (this.currentElementNode === null) {
        this.rootElements.push(elementNode);
      } else {
        this.currentElementNode.addChild(elementNode);
        this.nodesStack.push(this.currentElementNode);
      }
      return this.currentElementNode = elementNode;
    };

    NodeParser.prototype.endItem = function(sourceLinePosition) {
      if (this.currentElementNode !== null) {
        if (this.nodesStack.length > 0) {
          return this.currentElementNode = this.nodesStack.pop();
        } else {
          return this.currentElementNode = null;
        }
      } else {
        throw new NodeParseException("Unexpected end of element node", sourceLinePosition);
      }
    };

    NodeParser.prototype.text = function(string, sourceLinePosition) {
      if (this.currentElementNode !== null) {
        return this.currentElementNode.addChild(new TextNode(string, sourceLinePosition));
      } else {
        if (string.match(/^\s*$/)) {

        } else {
          throw new NodeParseException("Unexpected text outside of root element: " + inspect(string), sourceLinePosition);
        }
      }
    };

    NodeParser.prototype.endOfLine = function(sourceLinePosition) {
      if (this.currentElementNode !== null) {
        return this.currentElementNode.addChild(new EndOfLineNode(sourceLinePosition));
      } else {

      }
    };

    return NodeParser;

  })();

  BracketupScanner = (function() {
    function BracketupScanner() {}

    BracketupScanner.prototype.regex = /(?:(\[)([A-Za-z0-9_\-,]*)([\s]|))|(\])|(\\(.))|([^[\]\\]+)/g;

    BracketupScanner.prototype.sendAnyTexts = function(tokenReceiver) {
      if (this.textPortions.length > 0) {
        tokenReceiver.text(this.textPortions.join(""), this.textPortionsSourceLinePosition);
        return this.textPortions = [];
      }
    };

    BracketupScanner.prototype.saveTextPortion = function(textPortion, sourceLinePosition) {
      if (this.textPortions.length === 0) {
        this.textPortionsSourceLinePosition = sourceLinePosition;
      }
      return this.textPortions.push(textPortion);
    };

    BracketupScanner.prototype.scanLine = function(tokenReceiver, line, sourceLine) {
      var itemArguments, linePosition, match, matchedSubstring, matchedSubstrings, reconstitutedMatches, scanningRegex, sourceLinePosition, whitespace;
      scanningRegex = new RegExp(this.regex.source, "g");
      matchedSubstrings = [];
      this.textPortions = [];
      linePosition = 1;
      sourceLinePosition = sourceLine.position(linePosition);
      while ((match = scanningRegex.exec(line))) {
        matchedSubstring = match[0];
        matchedSubstrings.push(matchedSubstring);
        if (match[1]) {
          this.sendAnyTexts(tokenReceiver);
          itemArguments = match[2].split(",");
          whitespace = match[3];
          tokenReceiver.startItem(itemArguments, whitespace, sourceLinePosition);
          this.depth++;
        } else if (match[4]) {
          this.sendAnyTexts(tokenReceiver);
          if (this.depth <= 0) {
            throw new NodeParseException("Unexpected ']'", sourceLinePosition);
          }
          tokenReceiver.endItem(sourceLinePosition);
          this.depth--;
        } else if (match[5]) {
          this.saveTextPortion(match[6], sourceLinePosition);
        } else if (match[7]) {
          this.saveTextPortion(match[7], sourceLinePosition);
        } else {
          console.log("match = " + inspect(match));
          throw new NodeParseException("No match found in lexer", sourceLinePosition);
        }
        linePosition += matchedSubstring.length;
        sourceLinePosition = sourceLine.position(linePosition);
      }
      this.sendAnyTexts(tokenReceiver);
      tokenReceiver.endOfLine(sourceLinePosition);
      reconstitutedMatches = matchedSubstrings.join("");
      if (reconstitutedMatches !== line) {
        throw new NodeParseException("Reconstituted " + inspect(reconstitutedMatches) + "\n                  != " + inspect(line), sourceLinePosition);
      }
    };

    BracketupScanner.prototype.scanSource = function(tokenReceiver, source, sourceFileName) {
      var i, line, lines, _i, _ref;
      this.depth = 0;
      lines = source.split("\n");
      sourceFileName = new SourceFileName(sourceFileName);
      for (i = _i = 0, _ref = lines.length; 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
        line = lines[i];
        this.scanLine(tokenReceiver, line, sourceFileName.line(line, i + 1));
      }
      if (this.depth !== 0) {
        throw new NodeParseException(this.depth + " unbalanced '['s at end of file", sourceFileName.endOfFilePosition(lines));
      }
    };

    return BracketupScanner;

  })();

  TextElement = (function() {
    function TextElement(string) {
      this.string = string;
    }

    TextElement.prototype.createDom = function(document) {
      return document.createTextNode(this.string);
    };

    return TextElement;

  })();

  BaseNode = (function() {
    function BaseNode() {
      this.children = [];
      this.attributes = {};
    }

    BaseNode.prototype.classMap = {};

    BaseNode.prototype.getSemanticParentOfChild = function() {
      return this;
    };

    BaseNode.prototype.getSemanticParent = function() {
      if (this.parent) {
        return this.parent.getSemanticParentOfChild();
      }
    };

    BaseNode.prototype.addChild = function(child) {
      return this.children.push(child);
    };

    BaseNode.prototype.addTextChild = function(string) {
      if (!(this.ignoreWhiteSpaceText && string.match(/^\s*$/))) {
        if (this.children.length === 0 && string.match(/^\s*$/)) {
          string = string.replace(/[\s]/g, "\u00A0");
        }
        return this.children.push(new TextElement(string));
      }
    };

    BaseNode.prototype.setIndentInsertString = function(parentIndentInsertString) {
      var child, _i, _len, _ref, _results;
      if (this.childIndent) {
        this.indentInsertString = parentIndentInsertString + this.childIndent;
        _ref = this.children;
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          child = _ref[_i];
          if (child.setIndentInsertString) {
            _results.push(child.setIndentInsertString(this.indentInsertString));
          } else {
            _results.push(void 0);
          }
        }
        return _results;
      }
    };

    BaseNode.prototype.addEndOfLineChild = function() {
      if (this.endOfLineNode) {
        return this.children.push(this.endOfLineNode);
      }
    };

    BaseNode.prototype.setAttribute = function(attributeName, value) {
      return this.attributes[attributeName] = value;
    };

    BaseNode.prototype.createDom = function(document) {
      var child, childDom, dom, i, _i, _ref;
      if (this.createInitialDom) {
        dom = this.createInitialDom(document);
        for (i = _i = 0, _ref = this.children.length; 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
          child = this.children[i];
          if (child.createDom) {
            childDom = child.createDom(document);
            if (childDom) {
              if (this.indentInsertString && (this.indentAllChildren || i === 0)) {
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
      } else {
        return null;
      }
    };

    return BaseNode;

  })();

  Document = (function() {
    function Document(document) {
      this.document = document;
    }

    Document.prototype.createNode = function(tag, options) {
      var attributes, cssClassName, dom, key, parent, text, value;
      if (!options) {
        options = {};
      }
      dom = this.document.createElement(tag);
      parent = options.parent;
      if (parent) {
        parent.appendChild(dom);
      }
      cssClassName = options.cssClassName;
      if (cssClassName) {
        dom.className = cssClassName;
      }
      attributes = options.attributes;
      if (attributes) {
        for (key in attributes) {
          value = attributes[key];
          dom.setAttribute(key, value);
        }
      }
      text = options.text;
      if (text) {
        dom.appendChild(this.document.createTextNode(text));
      }
      return dom;
    };

    Document.prototype.createTextNode = function(text) {
      return this.document.createTextNode(text);
    };

    Document.prototype.addTextNode = function(dom, text) {
      return dom.appendChild(this.document.createTextNode(text));
    };

    return Document;

  })();

  BaseAttribute = (function() {
    function BaseAttribute(attributeName) {
      this.attributeName = attributeName;
      this.value = "";
    }

    BaseAttribute.prototype.getSemanticParentOfChild = function() {
      return this;
    };

    BaseAttribute.prototype.addTextChild = function(string) {
      return this.value = this.value + string;
    };

    BaseAttribute.prototype.addChild = function(child) {
      throw new CompileError("Unexpected non-text element inside " + this.attributeName + " attribute node", child.sourceLinePosition);
    };

    BaseAttribute.prototype.addEndOfLineChild = function() {
      return this.addTextChild("\n");
    };

    BaseAttribute.prototype.addToParent = function(parent) {
      return parent.setAttribute(this.attributeName, this.value);
    };

    return BaseAttribute;

  })();

  MarkupNode = (function(_super) {
    __extends(MarkupNode, _super);

    function MarkupNode() {
      _ref = MarkupNode.__super__.constructor.apply(this, arguments);
      return _ref;
    }

    return MarkupNode;

  })(BaseNode);

  WrapperMarkupNode = (function(_super) {
    __extends(WrapperMarkupNode, _super);

    function WrapperMarkupNode() {
      _ref1 = WrapperMarkupNode.__super__.constructor.apply(this, arguments);
      return _ref1;
    }

    WrapperMarkupNode.prototype.getSemanticParentOfChild = function() {
      return this.parent.getSemanticParentOfChild();
    };

    return WrapperMarkupNode;

  })(MarkupNode);

  Bold = (function(_super) {
    __extends(Bold, _super);

    function Bold() {
      _ref2 = Bold.__super__.constructor.apply(this, arguments);
      return _ref2;
    }

    Bold.prototype.createInitialDom = function(document) {
      return document.createNode("b");
    };

    return Bold;

  })(WrapperMarkupNode);

  Span = (function(_super) {
    __extends(Span, _super);

    function Span(cssClassName) {
      this.cssClassName = cssClassName;
      Span.__super__.constructor.call(this);
    }

    Span.prototype.createInitialDom = function(document) {
      return document.createNode("span", {
        cssClassName: this.cssClassName
      });
    };

    return Span;

  })(WrapperMarkupNode);

  Italic = (function(_super) {
    __extends(Italic, _super);

    function Italic() {
      _ref3 = Italic.__super__.constructor.apply(this, arguments);
      return _ref3;
    }

    Italic.prototype.createInitialDom = function(document) {
      return document.createNode("i");
    };

    return Italic;

  })(WrapperMarkupNode);

  NDash = (function(_super) {
    __extends(NDash, _super);

    function NDash() {
      _ref4 = NDash.__super__.constructor.apply(this, arguments);
      return _ref4;
    }

    NDash.prototype.createInitialDom = function(document) {
      return document.createTextNode("\u2013");
    };

    return NDash;

  })(MarkupNode);

  HrefAttribute = (function(_super) {
    __extends(HrefAttribute, _super);

    function HrefAttribute() {
      HrefAttribute.__super__.constructor.call(this, "href");
    }

    return HrefAttribute;

  })(BaseAttribute);

  Link = (function(_super) {
    __extends(Link, _super);

    function Link() {
      _ref5 = Link.__super__.constructor.apply(this, arguments);
      return _ref5;
    }

    Link.prototype.classMap = {
      href: HrefAttribute
    };

    Link.prototype.createInitialDom = function(document) {
      var dom, href;
      dom = document.createNode("a");
      href = this.attributes.href;
      if (href) {
        dom.setAttribute("href", href);
      }
      return dom;
    };

    return Link;

  })(MarkupNode);

  BracketupCompiler = (function() {
    function BracketupCompiler(topLevelClassMap) {
      this.nodeCompiler = new NodeCompiler(topLevelClassMap);
    }

    BracketupCompiler.prototype.compile = function(source, sourceFileName) {
      var bracketupScanner, compiledObjects, correspondence, nodeParser, parsedRootElements, rootElement, _i, _len;
      bracketupScanner = new BracketupScanner();
      nodeParser = new NodeParser();
      bracketupScanner.scanSource(nodeParser, source, sourceFileName);
      parsedRootElements = nodeParser.rootElements;
      compiledObjects = [];
      for (_i = 0, _len = parsedRootElements.length; _i < _len; _i++) {
        rootElement = parsedRootElements[_i];
        correspondence = this.nodeCompiler.compile(rootElement);
        compiledObjects.push(correspondence);
      }
      return compiledObjects;
    };

    BracketupCompiler.prototype.compileDoms = function(source, document, sourceFileName) {
      var compiledDoms, compiledObject, compiledObjects, documentWrapper, _i, _len, _results;
      compiledDoms = [];
      compiledObjects = this.compile(source, sourceFileName);
      documentWrapper = new Document(document);
      _results = [];
      for (_i = 0, _len = compiledObjects.length; _i < _len; _i++) {
        compiledObject = compiledObjects[_i];
        _results.push(compiledObject.createDom(documentWrapper));
      }
      return _results;
    };

    return BracketupCompiler;

  })();

  exports.BracketupScanner = BracketupScanner;

  exports.NodeParser = NodeParser;

  exports.NodeCompiler = NodeCompiler;

  exports.CompileError = CompileError;

  exports.TextElement = TextElement;

  exports.BaseNode = BaseNode;

  exports.BaseAttribute = BaseAttribute;

  exports.Bold = Bold;

  exports.Italic = Italic;

  exports.HrefAttribute = HrefAttribute;

  exports.Link = Link;

  exports.Span = Span;

  exports.NDash = NDash;

  exports.BracketupCompiler = BracketupCompiler;

}).call(this);

/*
//@ sourceMappingURL=bracketup.map
*/

},{"./utils.js":4}],2:[function(require,module,exports){
// Generated by CoffeeScript 1.6.3
(function() {
  var BaseAttribute, BaseNode, Block, BracketupCompiler, Item, LanguageTitleAttribute, Line, Translation, TranslationTitle, bracketup, correspondenceCompiler, correspondenceTopLevelFunctionMap, inspect, utils, _ref, _ref1,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  utils = require("./utils.js");

  inspect = utils.inspect;

  bracketup = require("./bracketup.js");

  BaseAttribute = bracketup.BaseAttribute;

  BaseNode = bracketup.BaseNode;

  BracketupCompiler = bracketup.BracketupCompiler;

  Item = (function(_super) {
    __extends(Item, _super);

    function Item(id) {
      this.id = id;
      Item.__super__.constructor.call(this);
    }

    Item.prototype.createInitialDom = function(document) {
      var id, nodeOptions;
      id = this.id;
      if (id.match(/^[0-9]+$/)) {
        id = this.getSemanticParent().id + id;
      }
      nodeOptions = {
        cssClassName: "item",
        attributes: {
          "data-id": id
        }
      };
      return document.createNode("span", nodeOptions);
    };

    return Item;

  })(BaseNode);

  Line = (function(_super) {
    __extends(Line, _super);

    function Line(id) {
      this.id = id;
      Line.__super__.constructor.call(this);
    }

    Line.prototype.defaultChildFunction = "item";

    Line.prototype.classMap = {
      item: Item
    };

    Line.prototype.childIndent = "  ";

    Line.prototype.createInitialDom = function(document) {
      var nodeOptions;
      nodeOptions = {
        cssClassName: "line",
        attributes: {
          "data-line-id": this.id
        }
      };
      return document.createNode("div", nodeOptions);
    };

    return Line;

  })(BaseNode);

  LanguageTitleAttribute = (function(_super) {
    __extends(LanguageTitleAttribute, _super);

    function LanguageTitleAttribute() {
      LanguageTitleAttribute.__super__.constructor.call(this, "languageTitle");
    }

    return LanguageTitleAttribute;

  })(BaseAttribute);

  Block = (function(_super) {
    __extends(Block, _super);

    function Block(languageCssClass) {
      this.languageCssClass = languageCssClass;
      Block.__super__.constructor.call(this);
    }

    Block.prototype.defaultChildFunction = "line";

    Block.prototype.classMap = {
      line: Line,
      languageTitle: LanguageTitleAttribute
    };

    Block.prototype.childIndent = "  ";

    Block.prototype.indentAllChildren = true;

    Block.prototype.ignoreWhiteSpaceText = true;

    Block.prototype.createInitialDom = function(document) {
      var cssClassName, div, languageTitle;
      cssClassName = this.languageCssClass ? "block " + this.languageCssClass + "-block" : "block";
      div = document.createNode("div", {
        cssClassName: cssClassName
      });
      languageTitle = this.attributes.languageTitle;
      if (languageTitle) {
        document.createNode("div", {
          parent: div,
          cssClassName: "language",
          text: languageTitle
        });
      }
      return div;
    };

    return Block;

  })(BaseNode);

  TranslationTitle = (function(_super) {
    __extends(TranslationTitle, _super);

    function TranslationTitle() {
      _ref = TranslationTitle.__super__.constructor.apply(this, arguments);
      return _ref;
    }

    TranslationTitle.prototype.createInitialDom = function(document) {
      return document.createNode("div", {
        cssClassName: "title"
      });
    };

    return TranslationTitle;

  })(BaseNode);

  Translation = (function(_super) {
    __extends(Translation, _super);

    function Translation() {
      _ref1 = Translation.__super__.constructor.apply(this, arguments);
      return _ref1;
    }

    Translation.prototype.defaultChildFunction = "block";

    Translation.prototype.classMap = {
      block: Block,
      title: TranslationTitle
    };

    Translation.prototype.childIndent = "  ";

    Translation.prototype.indentAllChildren = true;

    Translation.prototype.ignoreWhiteSpaceText = true;

    Translation.prototype.createInitialDom = function(document) {
      var div;
      return div = document.createNode("div", {
        cssClassName: "translation"
      });
    };

    return Translation;

  })(BaseNode);

  correspondenceTopLevelFunctionMap = {
    translation: Translation,
    b: bracketup.Bold,
    i: bracketup.Italic,
    a: bracketup.Link,
    ndash: bracketup.NDash,
    span: bracketup.Span
  };

  correspondenceCompiler = new BracketupCompiler(correspondenceTopLevelFunctionMap);

  exports.correspondenceCompiler = correspondenceCompiler;

}).call(this);

/*
//@ sourceMappingURL=correspondence-bracketup.map
*/

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
      var translationsDom = $("<div class='translations'/>");
      sourceElementSelector.after(translationsDom);
      for (var i=0; i<compiledDoms.length; i++) {
        translationsDom.append(compiledDoms[i]);
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
  var translations = new CORRESPONDENCE.Translations($(".translation"));
  
  translations.setupInterleaving();

  var showSiblings = true;
  var alwaysShowCousins = true;
  var ctrlKeyIsDown = false;
  $(translations).on("mouseEnterItem", 
                     function(event, item) { 
                       translations.setSelected(item, showSiblings, 
                                                alwaysShowCousins || ctrlKeyIsDown); 
                     });
  
  $(document).keydown(function(event) {
    if (event.which == 17) { // ctrl
      if (!alwaysShowCousins) {
        translations.showCousinsOfSelectedItem();
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
  
  $(translations).on("clickOutsideItems", 
                     function(event) { translations.clearCurrentSelection(); });
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