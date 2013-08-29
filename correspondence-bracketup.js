(function() {
  var utils = require("./utils.js");
  var merge = utils.merge;
  var inspect = utils.inspect;

  var bracketup = require("./bracketup.js");

  var bracketupScanner = new bracketup.BracketupScanner();

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
    bracketup.BaseNode.call(this);
  }

  Bold.prototype = merge(bracketup.BaseNode.prototype, {
    createInitialDom: function(document) {
      return document.createNode("b");
    }
  });

  function Italic() {
    bracketup.BaseNode.call(this);
  }

  Italic.prototype = merge(bracketup.BaseNode.prototype, {
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
    bracketup.BaseNode.call(this);
  }

  Link.prototype = merge(bracketup.BaseNode.prototype, {
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
