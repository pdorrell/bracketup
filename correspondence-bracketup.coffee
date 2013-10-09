utils = require("./utils.js");
inspect = utils.inspect;

bracketup = require("./bracketup.js");
BaseAttribute = bracketup.BaseAttribute
BaseNode = bracketup.BaseNode
BracketupCompiler = bracketup.BracketupCompiler

# And Item (or a group of items with the same ID) is a translatable unit of meaning (often just a word)
# The supplied id argument is prefixed with the Line ID (if it doesn't already have an alphabetic prefix)
class Item extends BaseNode
  constructor: (@id) ->
    super()

  createInitialDom: (document) ->
    id = @id
    if id.match(/^[0-9]+$/) # if ID is purely numeric
      id = @parent.id + id  # prefix with ID of parent (Line)
    nodeOptions =
      cssClassName: "item"
      attributes:
        "data-id": id
    document.createNode("span", nodeOptions)

# A Line is a sequence of Items and non-Item text
# It typically corresponds to a sentence, or an actual line of text.
# A Line has an alphabetic ID which matches it with corresponding lines in other blocks in a translation,
# and which also supplies the default prefix to any contained Item IDs.
class Line extends BaseNode
  constructor: (@id) ->
    super()

  defaultChildFunction: "item"
  
  classMap:
    item: Item
    
  childIndent: "  "
  
  createInitialDom: (document) ->
    nodeOptions =
      cssClassName: "line"
      attributes:
        "data-line-id": @id
    document.createNode("div", nodeOptions)

class LanguageTitleAttribute extends BaseAttribute
  constructor: ->
    super("languageTitle")

class Block extends BaseNode
  constructor: (@languageCssClass) ->
    super()

  defaultChildFunction: "line"
  
  classMap:
    line: Line
    languageTitle: LanguageTitleAttribute
    
  childIndent: "  "
  indentAllChildren: true
  ignoreWhiteSpaceText: true
  
  createInitialDom: (document) ->
    cssClassName = if @languageCssClass then ("block " + @languageCssClass + "-block") else "block"
    div = document.createNode("div", {cssClassName: cssClassName})
    languageTitle = @attributes.languageTitle
    if languageTitle
      document.createNode("div", {parent: div, cssClassName: "language", text: languageTitle})
    div

class TitleAttribute extends BaseAttribute
  constructor: ->
    super("title")

class Translation extends BaseNode
  defaultChildFunction: "block"
  classMap: {block: Block, title: TitleAttribute}
  childIndent: "  "
  indentAllChildren: true
  ignoreWhiteSpaceText: true
  
  createInitialDom: (document) ->
    div = document.createNode("div", {cssClassName: "translation"})
    title = @attributes.title
    if title
      document.createNode("div", {parent: div, cssClassName: "description", text: title})
    div

correspondenceTopLevelFunctionMap =
  translation: Translation
  b: bracketup.Bold
  i: bracketup.Italic
  a: bracketup.Link

correspondenceCompiler = 
  new BracketupCompiler(correspondenceTopLevelFunctionMap)

exports.correspondenceCompiler = correspondenceCompiler
