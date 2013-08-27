var fs = require('fs');

function inspect(object) {
  return JSON.stringify(object);
}

function TextNode(string) {
  this.string = string;
}

TextNode.prototype = {
  toString: function() {
    return "[TextNode " + inspect(this.string) + "]";
  }
};

function EndOfLineNode() {
}

EndOfLineNode.prototype = {
  toString: function() {
    return "[EndOfLineNode]";
  }
}

function ElementNode(args) {
  this.args = args;
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
  }
};

function NodeParseException(message) {
  this.message = message;
}

function NodeParser() {
  this.nodesStack = [];
  this.currentElementNode = null;
  this.rootElementNode = null;
}

NodeParser.prototype = {
  startItem: function(itemArguments, whitespace) {
    var elementNode = new ElementNode(itemArguments);
    if (this.currentElementNode != null) {
      this.currentElementNode.addChild(elementNode);
    }
    else {
      this.rootElement = elementNode;
    }
    this.currentElementNode = elementNode;
    this.nodesStack.push(elementNode);
  }, 
  endItem: function() {
    if (this.currentElementNode != null) {
      this.currentElementNode = this.nodesStack.pop();
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
        console.log("Ignoring whitespace outside of root element: " + inspect(string));
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
        console.log("Ignoring end-of-line outside of root element");
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
  
var bracketupScanner = new BracketupScanner();

//bracketupScanner.scanLine(new TestTokenReceiver(), testLine);

var testFileName = "sample.bracketup";

var fileContents = fs.readFileSync(testFileName, {encoding: "utf-8"});

//var fileLines = fileContents.split("\n");

//console.log("fileLines = " + inspect(fileLines));

var nodeParser = new NodeParser();
bracketupScanner.scanSource(nodeParser, fileContents);

console.log("root element = " + nodeParser.rootElement);


