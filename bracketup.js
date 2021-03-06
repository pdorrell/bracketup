// Generated by CoffeeScript 1.6.3
(function() {
  var BaseAttribute, BaseNode, Bold, BracketParseException, BracketupCompiler, BracketupScanner, CompileError, CustomError, Document, ElementNode, EndOfLineNode, HrefAttribute, Italic, Link, MarkupNode, NDash, NodeCompiler, NodeParseException, NodeParser, RecordedLineOfTokens, RecordedToken, RecordedTokens, SourceFileInfo, SourceLine, SourceLinePosition, Span, TextElement, TextNode, WrapperMarkupNode, inspect, repeatedString, utils, _ref, _ref1, _ref2, _ref3, _ref4, _ref5,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  utils = require("./utils.js");

  inspect = utils.inspect;

  SourceFileInfo = (function() {
    function SourceFileInfo(fileName, lines) {
      this.fileName = fileName;
      this.lines = lines;
    }

    SourceFileInfo.prototype.toString = function() {
      return this.fileName;
    };

    SourceFileInfo.prototype.line = function(string, lineNumber) {
      return new SourceLine(this, string, lineNumber);
    };

    SourceFileInfo.prototype.endOfFilePosition = function() {
      var lastLine, numLines;
      numLines = this.lines.length;
      lastLine = numLines > 0 ? this.lines[numLines - 1] : null;
      if (lastLine !== null) {
        return this.line(lastLine, numLines - 1).position(lastLine.length + 1);
      } else {
        return this.line("", 0).position(1);
      }
    };

    return SourceFileInfo;

  })();

  SourceLine = (function() {
    function SourceLine(sourceFileInfo, line, lineNumber) {
      this.sourceFileInfo = sourceFileInfo;
      this.line = line;
      this.lineNumber = lineNumber;
    }

    SourceLine.prototype.toString = function() {
      return this.sourceFileInfo + ":" + this.lineNumber;
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

    SourceLinePosition.prototype.errorPointerLine = function(indent) {
      if (indent == null) {
        indent = 0;
      }
      return repeatedString(" ", indent + this.position - 1) + "^";
    };

    SourceLinePosition.prototype.logLineAndPosition = function() {
      var line1, line2, linePrefix;
      linePrefix = this.toString() + ":";
      line1 = linePrefix + this.sourceLine.line;
      line2 = this.errorPointerLine(linePrefix.length);
      return [line1, line2];
    };

    SourceLinePosition.prototype.addErrorInfo = function(document, dom, message) {
      var i, line, lines, _i, _ref, _results;
      lines = this.sourceLine.sourceFileInfo.lines;
      _results = [];
      for (i = _i = 0, _ref = lines.length; 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
        line = lines[i];
        if (i + 1 === this.sourceLine.lineNumber) {
          dom.appendChild(document.createNode("div", {
            cssClassName: "error-line",
            text: line
          }));
          _results.push(dom.appendChild(document.createNode("div", {
            cssClassName: "error-pointer",
            text: this.errorPointerLine(0)
          })));
        } else {
          _results.push(dom.appendChild(document.createNode("div", {
            cssClassName: "line",
            text: line
          })));
        }
      }
      return _results;
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

    CustomError.prototype.addSourceCodeErrorInfo = function(dom) {
      if (this.sourceLinePosition) {
        return this.sourceLinePosition.addErrorInfo(this.document, dom, this.message);
      }
    };

    CustomError.prototype.errorInfoDom = function() {
      var dom, messageDom, messageTextDom;
      dom = this.document.createNode("div", {
        cssClassName: "bracketup-error"
      });
      messageDom = this.document.createNode("div", {
        parent: dom,
        cssClassName: "message",
        text: "Compilation Error: "
      });
      messageTextDom = this.document.createNode("span", {
        parent: messageDom,
        cssClassName: "message-text",
        text: this.message
      });
      this.addSourceCodeErrorInfo(dom);
      return dom;
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

  RecordedToken = (function() {
    function RecordedToken(text, type, numOpens) {
      this.text = text;
      this.type = type;
      this.numOpens = numOpens != null ? numOpens : 0;
      this.balanced = this.numOpens === 0;
      this.unexpected = false;
    }

    RecordedToken.prototype.cssClassName = function() {
      if (this.unexpected) {
        return this.type + " unexpected";
      } else if (this.balanced) {
        return this.type;
      } else {
        return this.type + " unbalanced";
      }
    };

    RecordedToken.prototype.createDom = function(document) {
      var attributes;
      attributes = {};
      if (this.unexpected) {
        attributes.title = "Unexpected closing bracket";
      } else if (!this.balanced) {
        attributes.title = "Bracket is balanced by a bracket on a different line";
      }
      return document.createNode("span", {
        cssClassName: this.cssClassName(),
        text: this.text,
        attributes: attributes
      });
    };

    RecordedToken.prototype.toString = function() {
      return "{" + this.type + " " + this.text + " # " + this.balanced + "}";
    };

    return RecordedToken;

  })();

  RecordedLineOfTokens = (function() {
    function RecordedLineOfTokens(depth) {
      this.depth = depth;
      this.depthAtEnd = this.depth;
      this.openBracketStack = [];
      this.tokens = [];
      this.nonWhitespaceEncountered;
    }

    RecordedLineOfTokens.prototype.isEmpty = function() {
      return this.openBracketStack.length === 0;
    };

    RecordedLineOfTokens.prototype.addToken = function(token) {
      var matchingStart;
      if (!token.text.match(/^\s*$/)) {
        this.nonWhitespaceEncountered = true;
      }
      if (!this.nonWhitespaceEncountered) {
        token.text = "";
      }
      this.tokens.push(token);
      this.depthAtEnd += token.numOpens;
      if (this.depthAtEnd < 0) {
        token.unexpected = true;
      }
      if (token.numOpens === 1) {
        return this.openBracketStack.push(token);
      } else if (token.numOpens === -1) {
        if (this.openBracketStack.length > 0) {
          matchingStart = this.openBracketStack.pop();
          matchingStart.balanced = true;
          return token.balanced = true;
        }
      }
    };

    RecordedLineOfTokens.prototype.createDom = function(document) {
      var dom, i, token, _i, _j, _len, _ref, _ref1;
      dom = document.createNode("div", {
        cssClassName: "line"
      });
      if (this.depth > 0) {
        for (i = _i = 0, _ref = this.depth; 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
          document.createNode("div", {
            parent: dom,
            cssClassName: "depth-indent",
            text: "..."
          });
        }
      }
      _ref1 = this.tokens;
      for (_j = 0, _len = _ref1.length; _j < _len; _j++) {
        token = _ref1[_j];
        dom.appendChild(token.createDom(document));
      }
      return dom;
    };

    return RecordedLineOfTokens;

  })();

  RecordedTokens = (function() {
    function RecordedTokens() {
      this.lines = [];
      this.depth = 0;
      this.openBracketStack = [];
      this.currentLine = new RecordedLineOfTokens(this.depth);
      this.depths = [0];
    }

    RecordedTokens.prototype.checkDepth = false;

    RecordedTokens.prototype.addTokenToCurrentLine = function(recordedToken) {
      return this.currentLine.addToken(recordedToken);
    };

    RecordedTokens.prototype.recordStart = function(tokenString) {
      var recordedToken;
      recordedToken = new RecordedToken(tokenString, "open", 1);
      return this.addTokenToCurrentLine(recordedToken);
    };

    RecordedTokens.prototype.recordEnd = function(tokenString) {
      var recordedToken;
      recordedToken = new RecordedToken(tokenString, "close", -1);
      return this.addTokenToCurrentLine(recordedToken);
    };

    RecordedTokens.prototype.recordQuotedCharacter = function(tokenString) {
      var recordedToken;
      recordedToken = new RecordedToken(tokenString, "quoted");
      return this.addTokenToCurrentLine(recordedToken);
    };

    RecordedTokens.prototype.recordText = function(tokenString) {
      var recordedToken;
      recordedToken = new RecordedToken(tokenString, "text");
      return this.addTokenToCurrentLine(recordedToken);
    };

    RecordedTokens.prototype.startItem = function(itemArguments, whitespace, sourceLinePosition) {
      return {};
    };

    RecordedTokens.prototype.endItem = function(sourceLinePosition) {
      return {};
    };

    RecordedTokens.prototype.text = function(string, sourceLinePosition) {
      return {};
    };

    RecordedTokens.prototype.endOfLine = function(sourceLinePosition) {
      this.depth = this.currentLine.depthAtEnd;
      this.lines.push(this.currentLine);
      return this.currentLine = new RecordedLineOfTokens(this.depth);
    };

    RecordedTokens.prototype.endOfSource = function() {
      this.depth = this.currentLine.depthAtEnd;
      if (!this.currentLine.isEmpty) {
        return this.lines.push(this.currentLine);
      }
    };

    RecordedTokens.prototype.createDom = function(document) {
      var dom, line, _i, _len, _ref;
      dom = document.createNode("div", {
        cssClassName: "parsed-tokens"
      });
      _ref = this.lines;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        line = _ref[_i];
        dom.appendChild(line.createDom(document));
      }
      return dom;
    };

    return RecordedTokens;

  })();

  BracketParseException = (function(_super) {
    __extends(BracketParseException, _super);

    function BracketParseException(message, sourceLinePosition) {
      this.sourceLinePosition = sourceLinePosition;
      BracketParseException.__super__.constructor.call(this, message, this.sourceLinePosition);
    }

    BracketParseException.prototype.addSourceCodeErrorInfo = function(dom) {
      var bracketupScanner, fileName, linesDom, recordedTokens, sourceLines;
      linesDom = this.document.createNode("div", {
        text: "a bracket parse exception"
      });
      if (this.sourceLinePosition) {
        sourceLines = this.sourceLinePosition.sourceLine.sourceFileInfo.lines;
        fileName = this.sourceLinePosition.sourceLine.sourceFileInfo.fileName;
        bracketupScanner = new BracketupScanner;
        recordedTokens = new RecordedTokens;
        bracketupScanner.scanSourceLines(recordedTokens, sourceLines, fileName);
        return dom.appendChild(recordedTokens.createDom(this.document));
      }
    };

    return BracketParseException;

  })(NodeParseException);

  NodeParser = (function() {
    function NodeParser() {
      this.nodesStack = [];
      this.currentElementNode = null;
      this.rootElements = [];
    }

    NodeParser.prototype.checkDepth = true;

    NodeParser.prototype.recordStart = function(tokenString) {
      return {};
    };

    NodeParser.prototype.recordEnd = function(tokenString) {
      return {};
    };

    NodeParser.prototype.recordQuotedCharacter = function(tokenString) {
      return {};
    };

    NodeParser.prototype.recordText = function(tokenString) {
      return {};
    };

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

    NodeParser.prototype.endOfSource = function() {
      return {};
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
          tokenReceiver.recordStart(matchedSubstring);
          this.sendAnyTexts(tokenReceiver);
          itemArguments = match[2].split(",");
          whitespace = match[3];
          tokenReceiver.startItem(itemArguments, whitespace, sourceLinePosition);
          this.depth++;
        } else if (match[4]) {
          tokenReceiver.recordEnd(matchedSubstring);
          this.sendAnyTexts(tokenReceiver);
          if (this.depth <= 0 && tokenReceiver.checkDepth) {
            throw new BracketParseException("One or more unexpected ']'s", sourceLinePosition);
          }
          tokenReceiver.endItem(sourceLinePosition);
          this.depth--;
        } else if (match[5]) {
          tokenReceiver.recordQuotedCharacter(matchedSubstring);
          this.saveTextPortion(match[6], sourceLinePosition);
        } else if (match[7]) {
          tokenReceiver.recordText(matchedSubstring);
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

    BracketupScanner.prototype.scanSource = function(tokenReceiver, source, sourceFileName, onUnbalancedAtEnd) {
      var lines;
      if (onUnbalancedAtEnd == null) {
        onUnbalancedAtEnd = null;
      }
      lines = source.split("\n");
      return this.scanSourceLines(tokenReceiver, lines, sourceFileName, onUnbalancedAtEnd);
    };

    BracketupScanner.prototype.scanSourceLines = function(tokenReceiver, lines, sourceFileName, onUnbalancedAtEnd) {
      var i, line, sourceFileInfo, _i, _ref;
      this.depth = 0;
      sourceFileInfo = new SourceFileInfo(sourceFileName, lines);
      for (i = _i = 0, _ref = lines.length; 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
        line = lines[i];
        this.scanLine(tokenReceiver, line, sourceFileInfo.line(line, i + 1));
      }
      tokenReceiver.endOfSource;
      if (this.depth !== 0 && onUnbalancedAtEnd) {
        return onUnbalancedAtEnd(this.depth, sourceFileInfo);
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

    BracketupCompiler.prototype.compile = function(source, sourceFileInfo) {
      var bracketupScanner, compiledObjects, correspondence, nodeParser, parsedRootElements, rootElement, _i, _len;
      bracketupScanner = new BracketupScanner();
      nodeParser = new NodeParser();
      bracketupScanner.scanSource(nodeParser, source, sourceFileInfo, function(depth, sourceFileInfo) {
        throw new BracketParseException(depth + " unbalanced '['" + (depth === 1 ? "" : "s"), sourceFileInfo.endOfFilePosition());
      });
      parsedRootElements = nodeParser.rootElements;
      compiledObjects = [];
      for (_i = 0, _len = parsedRootElements.length; _i < _len; _i++) {
        rootElement = parsedRootElements[_i];
        correspondence = this.nodeCompiler.compile(rootElement);
        compiledObjects.push(correspondence);
      }
      return compiledObjects;
    };

    BracketupCompiler.prototype.compileDoms = function(source, document, sourceFileInfo) {
      var compiledDoms, compiledObject, compiledObjects, documentWrapper, error, _i, _len, _results;
      compiledDoms = [];
      documentWrapper = new Document(document);
      try {
        compiledObjects = this.compile(source, sourceFileInfo);
        _results = [];
        for (_i = 0, _len = compiledObjects.length; _i < _len; _i++) {
          compiledObject = compiledObjects[_i];
          _results.push(compiledObject.createDom(documentWrapper));
        }
        return _results;
      } catch (_error) {
        error = _error;
        if (error instanceof CustomError) {
          error.document = documentWrapper;
        }
        throw error;
      }
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

  exports.CustomError = CustomError;

  exports.BracketupCompiler = BracketupCompiler;

}).call(this);

/*
//@ sourceMappingURL=bracketup.map
*/
