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

  var correspondenceNodeCompiler = new bracketup.NodeCompiler({correspondence: Correspondence, 
                                                               b: bracketup.Bold, 
                                                               i: bracketup.Italic, 
                                                               a: bracketup.Link});

  function compileCorrespondence(source) {
    return bracketup.compile(correspondenceNodeCompiler, source);
  }
  
  function compileCorrespondenceIntoDoms(source, document) {
    return bracketup.compileIntoDoms(correspondenceNodeCompiler, source, document);
  }

  exports.compileCorrespondence = compileCorrespondence;
  exports.compileCorrespondenceIntoDoms = compileCorrespondenceIntoDoms;
})();
