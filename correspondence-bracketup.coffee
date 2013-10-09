utils = require("./utils.js");
inspect = utils.inspect;

bracketup = require("./bracketup.js");
BaseAttribute = bracketup.BaseAttribute
BaseNode = bracketup.BaseNode
BracketupCompiler = bracketup.BracketupCompiler

class Item extends BaseNode
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

class ItemGroup extends BaseNode
  constructor: (@id) ->
    super()

  defaultChildFunction: "item"
  
  classMap:
    item: Item
    
  childIndent: "  "
  
  createInitialDom: (document) ->
    nodeOptions =
      className: "line"
      attributes:
        "data-line-id": @id
    document.createNode("div", nodeOptions)

class LanguageTitleAttribute extends BaseAttribute
  constructor: ->
    super("languageTitle")

class Structure extends BaseNode
  constructor: (@languageCssClass) ->
    super()

  defaultChildFunction: "line"
  
  classMap:
    line: ItemGroup
    languageTitle: LanguageTitleAttribute
    
  childIndent: "  "
  indentAllChildren: true
  ignoreWhiteSpaceText: true
  
  createInitialDom: (document) ->
    className = if @languageCssClass then ("block " + @languageCssClass + "-block") else "block"
    div = document.createNode("div", {className: className})
    languageTitle = @attributes.languageTitle
    if languageTitle
      document.createNode("div", {parent: div, className: "language", text: languageTitle})
    div

class TitleAttribute extends BaseAttribute
  constructor: ->
    super("title")

class StructureGroup extends BaseNode
  defaultChildFunction: "block"
  classMap: {block: Structure, title: TitleAttribute}
  childIndent: "  "
  indentAllChildren: true
  ignoreWhiteSpaceText: true
  
  createInitialDom: (document) ->
    div = document.createNode("div", {className: "translation"})
    title = @attributes.title
    if title
      document.createNode("div", {parent: div, className: "description", text: title})
    div

correspondenceTopLevelFunctionMap =
  translation: StructureGroup
  b: bracketup.Bold
  i: bracketup.Italic
  a: bracketup.Link

correspondenceCompiler = 
  new BracketupCompiler(correspondenceTopLevelFunctionMap)

exports.correspondenceCompiler = correspondenceCompiler
