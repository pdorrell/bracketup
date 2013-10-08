utils = require("./utils.js");
inspect = utils.inspect;

bracketup = require("./bracketup.js");
BaseAttribute = bracketup.BaseAttribute
BaseNode = bracketup.BaseNode
BracketupCompiler = bracketup.BracketupCompiler

class Word extends BaseNode
  constructor: (@id) ->
    super()

  createInitialDom: (document) ->
    id = @id
    if id.match(/^[0-9]+$/)
      id = @parent.id + id
    nodeOptions =
      className: "item"
      attributes:
        "data-id": id
    document.createNode("span", nodeOptions)

class Sentence extends BaseNode
  constructor: (@id) ->
    super()

  defaultChildFunction: "word"
  
  classMap:
    word: Word
    
  childIndent: "  "
  
  createInitialDom: (document) ->
    nodeOptions =
      className: "item-group"
      attributes:
        "data-group-id": @id
    document.createNode("div", nodeOptions)

class LanguageTitleAttribute extends BaseAttribute
  constructor: ->
    super("languageTitle")

class Text extends BaseNode
  constructor: (@languageCssClass) ->
    super()

  defaultChildFunction: "sentence"
  
  classMap:
    sentence: Sentence
    languageTitle: LanguageTitleAttribute
    
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

class TitleAttribute extends BaseAttribute
  constructor: ->
    super("title")

class Correspondence extends BaseNode
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
  new BracketupCompiler(correspondenceTopLevelFunctionMap)

exports.correspondenceCompiler = correspondenceCompiler
