utils = require("./utils.js");
inspect = utils.inspect;

bracketup = require("./bracketup.js");
BaseAttribute = bracketup.BaseAttribute
BaseNode = bracketup.BaseNode
BracketupCompiler = bracketup.BracketupCompiler

# And Item (or a group of items with the same ID) is a translatable unit of meaning (often just a word)
# The supplied id argument is prefixed with the Line ID (if it doesn't already have an alphabetic prefix)
# Example: [3 value] represents an Item with id 3 (which will be prefixed by the line ID) and text "value"
class Item extends BaseNode
  constructor: (@id) ->
    super()

  # create DOM like <span class="item" data-id="A3"></span> (e.g. if @parent.id = "A" and @id = "3")
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
# Example: [A [1 hello] world[B2 !]] is a line with id "A", an item [1 hello] (with id "A1"),
#   non-item text " world", and another item [B2 !] (with id "B2").
class Line extends BaseNode
  constructor: (@id) ->
    super()

  defaultChildFunction: "item"
  
  classMap:
    item: Item
    
  childIndent: "  "

  # create DOM like <div class="line" data-line-id="A"></div> (e.g. if @id = "A")
  createInitialDom: (document) ->
    nodeOptions =
      cssClassName: "line"
      attributes:
        "data-line-id": @id
    document.createNode("div", nodeOptions)

# A child element of a Block that sets the languageTitle property of the Block
# Example [_languageTitle Old English] represents a languageTitle value of "Old English"
class LanguageTitleAttribute extends BaseAttribute
  constructor: ->
    super("languageTitle")

# A Block of text, a sequence of Lines, which is one of two or more Blocks in a Translation representing the same
# content in a specified language.
# Typically a Block would represent a paragraph, or a verse of a song. (Ideally it should be small enough that the
# reader can see different Blocks in the same translation on the screen at once.)
# Example: [english [_languageTitle Old English] [A [1 Ye] [2 olde shoppe.]] [B [1 Behold]]], represents
#   a Block with CSS class "english", language title "Old English", and two Lines: [A [1 Ye] [2 olde shoppe.]] and [B [1 Behold]].
#   (note: "languageTitle" is prefixed with "_", otherwise it would be interpreted as a Line with line ID "languageTitle")
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

  # create DOM like <div class="block english-block"><div class="language">Old English</div></div> (from example above)
  createInitialDom: (document) ->
    cssClassName = if @languageCssClass then ("block " + @languageCssClass + "-block") else "block"
    div = document.createNode("div", {cssClassName: cssClassName})
    languageTitle = @attributes.languageTitle
    if languageTitle
      document.createNode("div", {parent: div, cssClassName: "language", text: languageTitle})
    div

# A child element of a Translation that sets the 'title' property of the Translation
# Example [_title The Ides of March]
class TitleAttribute extends BaseAttribute
  constructor: ->
    super("title")

# A Translation is a group of Block's where each Block represents the same content in a different language.
# Example: [[_title Hello and Goodbye] [english [A [1 Hello] [2 World]] [B [1 Goodbye]]] [spanish [A [1 Hola] [2 Mundo]] [B [1 Adios]]]]
#  (note, for brevity I have omitted 'languageTitle' attributes from that example)
class Translation extends BaseNode
  defaultChildFunction: "block"
  classMap: {block: Block, title: TitleAttribute}
  childIndent: "  "
  indentAllChildren: true
  ignoreWhiteSpaceText: true

  # create DOM like <div class="translation"><div class="title">Hello and Goodbye</div></div>
  createInitialDom: (document) ->
    div = document.createNode("div", {cssClassName: "translation"})
    title = @attributes.title
    if title
      document.createNode("div", {parent: div, cssClassName: "title", text: title})
    div

# Function map, major node type is 'translation', but also allow 'b', 'i' and 'a' markup to occur anywhere within a translation
correspondenceTopLevelFunctionMap =
  translation: Translation
  b: bracketup.Bold
  i: bracketup.Italic
  a: bracketup.Link
  span: bracketup.Span

# The Correspondence-Bracketup compiler, to be exported
correspondenceCompiler = 
  new BracketupCompiler(correspondenceTopLevelFunctionMap)

exports.correspondenceCompiler = correspondenceCompiler
