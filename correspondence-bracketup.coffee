utils = require("./utils.js");
merge = utils.merge;
inspect = utils.inspect;

bracketup = require("./bracketup.js");

class TitleAttribute extends bracketup.BaseAttribute
  constructor: ->
    super("title")

class LanguageTitleAttribute extends bracketup.BaseAttribute
  constructor: ->
    super("languageTitle")

class Word extends bracketup.BaseNode
  constructor: (@id) ->
    super()

  createInitialDom: (document) ->
    id = @id
    if id.match(/^[0-9]+$/)
      id = @parent.id + id
    document.createNode("span", {className: "item", attributes: {"data-id": id}})

class Sentence extends bracketup.BaseNode
  constructor: (@id) ->
    super()

  defaultChildFunction: "word"
  classMap: {word: Word}
  childIndent: "  "
  
  createInitialDom: (document) ->
    document.createNode("div", {className: "item-group", attributes: {"data-group-id": @id}})

class Text extends bracketup.BaseNode
  constructor: (@languageCssClass) ->
    super()

  defaultChildFunction: "sentence"
  classMap: {sentence: Sentence, languageTitle: LanguageTitleAttribute}
  childIndent: "  "
  indentAllChildren: true
  ignoreWhiteSpaceText: true
  
  createInitialDom: (document) ->
    className = if @languageCssClass then ("structure " + @languageCssClass + "-structure") else "structure"
    div = document.createNode("div", {className: className})
    languageTitle = @attributes.languageTitle
    if languageTitle
      document.createNode("div", {parent: div, className: "language", text: languageTitle})
    div

class Correspondence extends bracketup.BaseNode
  defaultChildFunction: "text"
  classMap: {text: Text, title: TitleAttribute}
  childIndent: "  "
  indentAllChildren: true
  ignoreWhiteSpaceText: true
  
  createInitialDom: (document) ->
    div = document.createNode("div", {className: "structure-group"})
    title = @attributes.title
    if title
      document.createNode("div", {parent: div, className: "description", text: title})
    div

correspondenceTopLevelFunctionMap =
  correspondence: Correspondence
  b: bracketup.Bold
  i: bracketup.Italic
  a: bracketup.Link

correspondenceCompiler = 
  new bracketup.BracketupCompiler(correspondenceTopLevelFunctionMap)

exports.correspondenceCompiler = correspondenceCompiler
