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
  
  /** A class to receive output from BracketupScanner and display it nicely described and indented. */
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
