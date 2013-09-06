// Generated by CoffeeScript 1.6.3
(function() {
  var BracketupScanner, CompileError, CustomError, ElementNode, EndOfLineNode, EndOfSourceFilePosition, NodeCompiler, NodeParseException, NodeParser, SourceFileName, SourceLine, SourceLinePosition, TestTokenReceiver, TextNode, inspect, merge, repeatedString, utils,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  utils = require("./utils.js");

  merge = utils.merge;

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
      return new EndOfSourceFilePosition(this, numLines, lastLine);
    };

    return SourceFileName;

  })();

  EndOfSourceFilePosition = (function() {
    function EndOfSourceFilePosition(sourceFileName, numLines, lastLine) {
      this.sourceFileName = sourceFileName;
      this.numLines = numLines;
      this.lastLine = lastLine;
    }

    EndOfSourceFilePosition.prototype.toString = function() {
      return this.sourceFileName + ":" + this.numLines;
    };

    return EndOfSourceFilePosition;

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

    NodeCompiler.prototype.createFromFunctionClass = function(functionClass, constructorArgs, initialWhitespace, childNodes, sourceLinePosition) {
      var childNode, object, _i, _len;
      object = Object.create(functionClass.prototype);
      functionClass.apply(object, constructorArgs);
      if (object.prependWhitespace) {
        object.prependWhitespace(initialWhitespace);
      }
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
      rootObject = this.createFromFunctionClass(nodeFunctionClass, elementArgs.slice(1), rootElementNode.whitespace, rootElementNode.children, rootElementNode.sourceLinePosition);
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
      var childFunctionClass, childObject, elementArgs, functionName;
      elementArgs = childNode.args.slice(0);
      if (elementArgs.length > 0 && elementArgs[0].match(/^_/)) {
        elementArgs[0] = elementArgs[0].substring(1);
      } else {
        if (parentObject.defaultChildFunction) {
          elementArgs = [parentObject.defaultChildFunction].concat(elementArgs);
        }
      }
      if (elementArgs.length === 0) {
        throw new CompileError("No function argument given and no default child function for parent element", childNode.sourceLinePosition);
      }
      functionName = elementArgs[0];
      elementArgs = elementArgs.slice(1);
      childFunctionClass = null;
      if (parentObject.classMap) {
        childFunctionClass = parentObject.classMap[functionName];
      }
      if (!childFunctionClass) {
        childFunctionClass = this.topLevelClassMap[functionName];
      }
      if (!childFunctionClass) {
        throw new CompileError("No function class found for " + inspect(functionName) + " in either parent class map or top-level class map", childNode.sourceLinePosition);
      }
      childObject = this.createFromFunctionClass(childFunctionClass, elementArgs, childNode.whitespace, childNode.children, childNode.sourceLinePosition);
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

  TestTokenReceiver = (function() {
    function TestTokenReceiver() {
      this.indent = "";
    }

    TestTokenReceiver.prototype.indentIncrement = "  ";

    TestTokenReceiver.prototype.startItem = function(itemArguments, whitespace, sourceLinePosition) {
      console.log(this.indent + "START " + inspect(itemArguments) + "  (whitespace = " + inspect(whitespace) + ") [" + sourceLinePosition + "]");
      return this.indent = this.indent + this.indentIncrement;
    };

    TestTokenReceiver.prototype.endItem = function(sourceLinePosition) {
      if (this.indent.length < this.indentIncrement.length) {
        throw new CompileError("Unexpected end of item", sourceLinePosition);
      }
      this.indent = this.indent.substring(this.indentIncrement.length);
      return console.log(this.indent + "END [" + sourceLinePosition + "]");
    };

    TestTokenReceiver.prototype.text = function(string, sourceLinePosition) {
      return console.log(this.indent + "TEXT " + inspect(string) + " [" + sourceLinePosition + "]");
    };

    TestTokenReceiver.prototype.endOfLine = function(sourceLinePosition) {
      return console.log(this.indent + "EOLN [" + sourceLinePosition + "]");
    };

    return TestTokenReceiver;

  })();

  BracketupScanner = (function() {
    function BracketupScanner() {}

    BracketupScanner.prototype.regex = /(?:(\[)([A-Za-z0-9_\-,]*)([\s]*))|(\])|(\\(.))|([^[\]\\]+)/g;

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

  exports.CompileError = CompileError;

  exports.NodeCompiler = NodeCompiler;

  exports.NodeParser = NodeParser;

  exports.TestTokenReceiver = TestTokenReceiver;

  exports.BracketupScanner = BracketupScanner;

}).call(this);

/*
//@ sourceMappingURL=bracketup1.map
*/
