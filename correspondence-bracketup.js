// Generated by CoffeeScript 1.6.3
(function() {
  var BaseAttribute, BaseNode, BracketupCompiler, Correspondence, LanguageTitleAttribute, Sentence, Text, TitleAttribute, Word, bracketup, correspondenceCompiler, correspondenceTopLevelFunctionMap, inspect, merge, utils, _ref,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  utils = require("./utils.js");

  merge = utils.merge;

  inspect = utils.inspect;

  bracketup = require("./bracketup.js");

  BaseAttribute = bracketup.BaseAttribute;

  BaseNode = bracketup.BaseNode;

  BracketupCompiler = bracketup.BracketupCompiler;

  TitleAttribute = (function(_super) {
    __extends(TitleAttribute, _super);

    function TitleAttribute() {
      TitleAttribute.__super__.constructor.call(this, "title");
    }

    return TitleAttribute;

  })(BaseAttribute);

  LanguageTitleAttribute = (function(_super) {
    __extends(LanguageTitleAttribute, _super);

    function LanguageTitleAttribute() {
      LanguageTitleAttribute.__super__.constructor.call(this, "languageTitle");
    }

    return LanguageTitleAttribute;

  })(BaseAttribute);

  Word = (function(_super) {
    __extends(Word, _super);

    function Word(id) {
      this.id = id;
      Word.__super__.constructor.call(this);
    }

    Word.prototype.createInitialDom = function(document) {
      var id;
      id = this.id;
      if (id.match(/^[0-9]+$/)) {
        id = this.parent.id + id;
      }
      return document.createNode("span", {
        className: "item",
        attributes: {
          "data-id": id
        }
      });
    };

    return Word;

  })(BaseNode);

  Sentence = (function(_super) {
    __extends(Sentence, _super);

    function Sentence(id) {
      this.id = id;
      Sentence.__super__.constructor.call(this);
    }

    Sentence.prototype.defaultChildFunction = "word";

    Sentence.prototype.classMap = {
      word: Word
    };

    Sentence.prototype.childIndent = "  ";

    Sentence.prototype.createInitialDom = function(document) {
      return document.createNode("div", {
        className: "item-group",
        attributes: {
          "data-group-id": this.id
        }
      });
    };

    return Sentence;

  })(BaseNode);

  Text = (function(_super) {
    __extends(Text, _super);

    function Text(languageCssClass) {
      this.languageCssClass = languageCssClass;
      Text.__super__.constructor.call(this);
    }

    Text.prototype.defaultChildFunction = "sentence";

    Text.prototype.classMap = {
      sentence: Sentence,
      languageTitle: LanguageTitleAttribute
    };

    Text.prototype.childIndent = "  ";

    Text.prototype.indentAllChildren = true;

    Text.prototype.ignoreWhiteSpaceText = true;

    Text.prototype.createInitialDom = function(document) {
      var className, div, languageTitle;
      className = this.languageCssClass ? "structure " + this.languageCssClass + "-structure" : "structure";
      div = document.createNode("div", {
        className: className
      });
      languageTitle = this.attributes.languageTitle;
      if (languageTitle) {
        document.createNode("div", {
          parent: div,
          className: "language",
          text: languageTitle
        });
      }
      return div;
    };

    return Text;

  })(BaseNode);

  Correspondence = (function(_super) {
    __extends(Correspondence, _super);

    function Correspondence() {
      _ref = Correspondence.__super__.constructor.apply(this, arguments);
      return _ref;
    }

    Correspondence.prototype.defaultChildFunction = "text";

    Correspondence.prototype.classMap = {
      text: Text,
      title: TitleAttribute
    };

    Correspondence.prototype.childIndent = "  ";

    Correspondence.prototype.indentAllChildren = true;

    Correspondence.prototype.ignoreWhiteSpaceText = true;

    Correspondence.prototype.createInitialDom = function(document) {
      var div, title;
      div = document.createNode("div", {
        className: "structure-group"
      });
      title = this.attributes.title;
      if (title) {
        document.createNode("div", {
          parent: div,
          className: "description",
          text: title
        });
      }
      return div;
    };

    return Correspondence;

  })(BaseNode);

  correspondenceTopLevelFunctionMap = {
    correspondence: Correspondence,
    b: bracketup.Bold,
    i: bracketup.Italic,
    a: bracketup.Link
  };

  correspondenceCompiler = new BracketupCompiler(correspondenceTopLevelFunctionMap);

  exports.correspondenceCompiler = correspondenceCompiler;

}).call(this);

/*
//@ sourceMappingURL=correspondence-bracketup.map
*/
