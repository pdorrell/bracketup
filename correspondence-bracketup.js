// Generated by CoffeeScript 1.6.3
(function() {
  var BaseAttribute, BaseNode, Block, BracketupCompiler, Item, LanguageTitleAttribute, Line, TitleAttribute, Translation, bracketup, correspondenceCompiler, correspondenceTopLevelFunctionMap, inspect, utils, _ref,
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
        id = this.parent.id + id;
      }
      nodeOptions = {
        className: "item",
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
        className: "line",
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
      var className, div, languageTitle;
      className = this.languageCssClass ? "block " + this.languageCssClass + "-block" : "block";
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

    return Block;

  })(BaseNode);

  TitleAttribute = (function(_super) {
    __extends(TitleAttribute, _super);

    function TitleAttribute() {
      TitleAttribute.__super__.constructor.call(this, "title");
    }

    return TitleAttribute;

  })(BaseAttribute);

  Translation = (function(_super) {
    __extends(Translation, _super);

    function Translation() {
      _ref = Translation.__super__.constructor.apply(this, arguments);
      return _ref;
    }

    Translation.prototype.defaultChildFunction = "block";

    Translation.prototype.classMap = {
      block: Block,
      title: TitleAttribute
    };

    Translation.prototype.childIndent = "  ";

    Translation.prototype.indentAllChildren = true;

    Translation.prototype.ignoreWhiteSpaceText = true;

    Translation.prototype.createInitialDom = function(document) {
      var div, title;
      div = document.createNode("div", {
        className: "translation"
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

    return Translation;

  })(BaseNode);

  correspondenceTopLevelFunctionMap = {
    translation: Translation,
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
