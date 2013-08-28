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

function CompileError(message) {
  this.message = message;
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
    return this.createFromFunctionClass(nodeFunctionClass, elementArgs.slice(1), 
                                        rootElementNode.whitespace, 
                                        rootElementNode.children);
  }, 
  compileChild: function(rootObject, childNode) {
    childNode.addToResult(this, rootObject);
  }, 
  compileTextChild: function(rootObject, string) {
    rootObject.addTextChild(string);
  }, 
  compileEndOfLineChild: function(rootObject) {
    rootObject.addEndOfLineChild();
  }, 
  compileElementChild: function(parentObject, childNode) {
    var elementArgs = childNode.args.slice(0);
    if(elementArgs.length>0 && elementArgs[0].match(/^_/)) {
      elementArgs[0] = elementArgs[0].substring(1);
    }
    else {
      if(parentObject.defaultChildFunction) {
        elementArgs = [parentObject.defaultChildFunction] + elementArgs;
      }
    }
    if (elementArgs.length == 0) {
      throw new CompileError("No function argument given and no default child function for parent element");
    }
    var functionName = elementArgs[0];
    console.log("functionName = " + inspect(functionName));
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
  this.message = message;
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
      throw new Error("Unexpected end of item");
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
          throw new Error("Unexpected ']'");
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
        throw new Error("No match found");
      }
    }
    this.sendAnyTexts(tokenReceiver);
    tokenReceiver.endOfLine();

    var reconstitutedMatches = matchedSubstrings.join("");
    if (reconstitutedMatches != line) {
      throw new Error("Reconstituted " + inspect(reconstitutedMatches) + 
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
      throw new Error(this.depth + " unbalanced '['s at end of file");
    }
  }
};

exports.BracketupScanner = BracketupScanner;
exports.NodeParser = NodeParser;
exports.NodeCompiler = NodeCompiler;
exports.TestTokenReceiver = TestTokenReceiver;
exports.CompileError = CompileError;

