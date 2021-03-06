utils = require("./utils.js")
inspect = utils.inspect

class SourceFileInfo
  constructor: (@fileName, @lines) ->
    
  toString: ->
    @fileName
    
  line: (string, lineNumber) ->
    new SourceLine this, string, lineNumber
    
  endOfFilePosition: () ->
    numLines = @lines.length
    lastLine = if numLines > 0 then @lines[numLines-1] else null
    if lastLine != null
      @line(lastLine, numLines-1).position(lastLine.length+1)
    else
      @line("",0).position(1)

class SourceLine
  constructor: (@sourceFileInfo, @line, @lineNumber) ->
  toString: ->
    @sourceFileInfo + ":" + @lineNumber
  position: (linePosition) ->
    new SourceLinePosition this, linePosition

repeatedString = (string, numRepeats) ->
  return (string for i in [1..numRepeats]).join ""

class SourceLinePosition
  constructor: (@sourceLine, @position) ->
  toString: ->
    @sourceLine + ":" + @position
  errorPointerLine: (indent=0) ->
    repeatedString(" ", indent + @position - 1) + "^"
  logLineAndPosition: () ->
    linePrefix = @toString() + ":"
    line1 = linePrefix + @sourceLine.line
    line2 = @errorPointerLine(linePrefix.length)
    [line1, line2]
  addErrorInfo: (document, dom, message) ->
    lines = @sourceLine.sourceFileInfo.lines
    for i in [0...lines.length]
      line = lines[i]
      if (i+1 == @sourceLine.lineNumber)
        dom.appendChild(document.createNode("div", {cssClassName: "error-line", text: line}))
        dom.appendChild(document.createNode("div", {cssClassName: "error-pointer", text: @errorPointerLine(0)}))
        #dom.appendChild(document.createNode("div", {cssClassName: "error-message", text: message}))
      else
        dom.appendChild(document.createNode("div", {cssClassName: "line", text: line}))

class TextNode
  constructor: (@string, @sourceLinePosition) ->
  toString: ->
    "[TextNode " + inspect(@string) + "]"
  addToResult: (compiler, result) ->
    compiler.compileTextChild result, @string

class EndOfLineNode
  constructor: (@sourceLinePosition) ->
  toString: ->
    "[EndOfLineNode]"
  addToResult: (compiler, result) ->
    compiler.compileEndOfLineChild result

class ElementNode
  constructor: (@args, @whitespace, @sourceLinePosition) ->
    @children = []
  addChild: (child) ->
    child.parent = this
    @children.push child
  toString: ->
    childStrings = (child.toString() for child in @children)
    "[ElementNode(" + @args.join(", ") + ") " + childStrings.join(", ") + "]"
  addToResult: (compiler, result) ->
    compiler.compileElementChild(result, this)

class CustomError
  constructor: (className, @message) ->
    this.error = new Error @message
    this.stack = @error.stack.replace(/^Error:/g, className + ":")
  logSourceError: ->
    if @sourceLinePosition
      console.log ""
      console.log @getMessageLine()
      console.log ""
      console.log @sourceLinePosition.logLineAndPosition().join("\n")
  addSourceCodeErrorInfo: (dom) ->
    if @sourceLinePosition
      @sourceLinePosition.addErrorInfo(@document, dom, @message)
      
  errorInfoDom: ->
    dom = @document.createNode("div", {cssClassName: "bracketup-error"})
    messageDom = @document.createNode("div", {parent: dom, cssClassName: "message", text: "Compilation Error: "})
    messageTextDom = @document.createNode("span", {parent: messageDom, cssClassName: "message-text", text: @message});
    @addSourceCodeErrorInfo(dom)
    dom

class CompileError extends CustomError
  constructor: (message, @sourceLinePosition) ->
    super "CompileError", message
  getMessageLine: ->
    "Compile error: " + @message

class NodeCompiler
  constructor: (@topLevelClassMap) ->

  createFromFunctionClass: (functionClass, constructorArgs, initialWhitespace,
                            parentObject,
                            childNodes, sourceLinePosition) ->
    object = Object.create(functionClass.prototype)
    functionClass.apply(object, constructorArgs)
    if object.prependWhitespace
      object.prependWhitespace(initialWhitespace)
    object.parent=parentObject
    for childNode in childNodes
      @compileChild(object, childNode)
    object.sourceLinePosition = sourceLinePosition
    object

  compile: (rootElementNode) ->
    elementArgs = rootElementNode.args;
    if elementArgs.length == 0
      throw new CompileError("No node function name given for root element", 
                             rootElementNode.sourceLinePosition)
    functionName = elementArgs[0]
    if functionName.match(/^_/)
      functionName = functionName.substring(1)
    nodeFunctionClass = @topLevelClassMap[functionName]
    if !nodeFunctionClass
      throw new CompileError("Unknown top-level function for root element: " + functionName, 
                             rootElementNode.sourceLinePosition)
    rootObject = @createFromFunctionClass(nodeFunctionClass, elementArgs.slice(1), 
                                          rootElementNode.whitespace, null,
                                          rootElementNode.children, 
                                          rootElementNode.sourceLinePosition);
    if rootObject.setIndentInsertString
      rootObject.setIndentInsertString("\n");
    rootObject

  compileChild: (parentObject, childNode) ->
    childNode.addToResult(this, parentObject)

  compileTextChild: (parentObject, string) ->
    parentObject.addTextChild(string)

  compileEndOfLineChild: (parentObject) ->
    parentObject.addEndOfLineChild()

  compileElementChild: (parentObject, childNode) ->
    semanticParent = parentObject.getSemanticParentOfChild()
    elementArgs = childNode.args.slice(0);
    if elementArgs.length>0 && elementArgs[0].match(/^_/)
      elementArgs[0] = elementArgs[0].substring(1)
    else
      if semanticParent.defaultChildFunction
        elementArgs = [semanticParent.defaultChildFunction].concat(elementArgs)
    if elementArgs.length == 0
      throw new CompileError("No function argument given and no default child function for parent element", 
                             childNode.sourceLinePosition)
    functionName = elementArgs[0]
    elementArgs = elementArgs.slice(1)
    childFunctionClass = null
    parentClassMap = semanticParent.classMap
    if parentClassMap
      childFunctionClass = parentClassMap[functionName]
    if !childFunctionClass
      childFunctionClass = this.topLevelClassMap[functionName]
    if !childFunctionClass
      throw new CompileError("No function class found for " + inspect(functionName) + 
                             " in either parent class map or top-level class map", 
                             childNode.sourceLinePosition)
    childObject = this.createFromFunctionClass(childFunctionClass, elementArgs, 
                                               childNode.whitespace,
                                               parentObject,
                                               childNode.children, 
                                               childNode.sourceLinePosition)
    if childObject.addToParent
      childObject.addToParent(parentObject)
    else
      parentObject.addChild(childObject)

class NodeParseException extends CustomError
  constructor: (message, @sourceLinePosition) ->
    super("NodeParseException", message)

  getMessageLine: ->
    "Syntax error: " + @message

class RecordedToken
  constructor: (@text, @type, @numOpens = 0) ->
    @balanced = @numOpens == 0
    @unexpected = false
  cssClassName: ->
    if @unexpected
      @type + " unexpected"
    else if @balanced
      @type
    else
      @type + " unbalanced"
  createDom: (document) ->
    attributes = {}
    if @unexpected
      attributes.title = "Unexpected closing bracket"
    else if !@balanced
      attributes.title = "Bracket is balanced by a bracket on a different line"
    document.createNode("span", {cssClassName: @cssClassName(), text: @text, attributes: attributes})
  toString: ->
    "{" + @type + " " + @text + " # " + @balanced + "}"

class RecordedLineOfTokens
  constructor: (@depth) ->
    @depthAtEnd = @depth
    @openBracketStack = []
    @tokens = []
    @nonWhitespaceEncountered
  isEmpty: ->
    @openBracketStack.length == 0
  addToken: (token) ->
    if !token.text.match(/^\s*$/)
      @nonWhitespaceEncountered = true
    if !@nonWhitespaceEncountered
      token.text = "" # hide whitespace at beginning of lines (indent is shown separately)
    @tokens.push(token)
    @depthAtEnd += token.numOpens
    if @depthAtEnd < 0
      token.unexpected = true
    if token.numOpens == 1
      @openBracketStack.push(token)
    else if token.numOpens == -1
      if @openBracketStack.length > 0
        matchingStart = @openBracketStack.pop()
        matchingStart.balanced = true
        token.balanced = true

  createDom: (document) ->
    dom = document.createNode("div", {cssClassName: "line"})
    if @depth > 0
      for i in [0...@depth]
        document.createNode("div", {parent: dom, cssClassName: "depth-indent", text: "..."})
    for token in @tokens
      dom.appendChild(token.createDom(document))
    dom

# An object that records tokens parsed (to help with tracing missing "[" or "]" errors)
class RecordedTokens
  constructor: ->
    @lines = []
    @depth = 0
    @openBracketStack = []
    @currentLine = new RecordedLineOfTokens(@depth)
    @depths = [0]

  checkDepth: false

  addTokenToCurrentLine: (recordedToken) ->
    @currentLine.addToken(recordedToken)

  recordStart: (tokenString) ->
    recordedToken = new RecordedToken(tokenString, "open", 1)
    @addTokenToCurrentLine(recordedToken)

  recordEnd: (tokenString) ->
    recordedToken = new RecordedToken(tokenString, "close", -1)
    @addTokenToCurrentLine(recordedToken)
    
  recordQuotedCharacter: (tokenString) ->
    recordedToken = new RecordedToken(tokenString, "quoted")
    @addTokenToCurrentLine(recordedToken)

  recordText: (tokenString) ->
    recordedToken = new RecordedToken(tokenString, "text")
    @addTokenToCurrentLine(recordedToken)

  startItem: (itemArguments, whitespace, sourceLinePosition) -> {}  
  endItem: (sourceLinePosition) -> {}
  text: (string, sourceLinePosition) -> {}
  
  endOfLine: (sourceLinePosition) ->
    @depth = @currentLine.depthAtEnd
    @lines.push(@currentLine)
    @currentLine = new RecordedLineOfTokens(@depth)

  endOfSource: ->
    @depth = @currentLine.depthAtEnd
    if !@currentLine.isEmpty
      @lines.push(@currentLine)

  createDom: (document) ->
    dom = document.createNode("div", {cssClassName: "parsed-tokens"})
    for line in @lines
      dom.appendChild(line.createDom(document))
    dom

class BracketParseException extends NodeParseException
  constructor: (message, @sourceLinePosition) ->
    super(message, @sourceLinePosition)
  addSourceCodeErrorInfo: (dom) ->
    linesDom = @document.createNode("div", {text: "a bracket parse exception"})
    if @sourceLinePosition
      sourceLines = @sourceLinePosition.sourceLine.sourceFileInfo.lines
      fileName = @sourceLinePosition.sourceLine.sourceFileInfo.fileName
      bracketupScanner = new BracketupScanner
      recordedTokens = new RecordedTokens
      bracketupScanner.scanSourceLines(recordedTokens, sourceLines, fileName)
      dom.appendChild(recordedTokens.createDom(@document))

class NodeParser
  constructor: ->
    @nodesStack = []
    @currentElementNode = null
    @rootElements = []

  checkDepth: true

  recordStart: (tokenString) -> {}
  recordEnd: (tokenString) -> {}
  recordQuotedCharacter: (tokenString) -> {}
  recordText: (tokenString) -> {}

  startItem: (itemArguments, whitespace, sourceLinePosition) ->
    elementNode = new ElementNode(itemArguments, whitespace, sourceLinePosition)
    if @currentElementNode == null
      @rootElements.push(elementNode)
    else
      @currentElementNode.addChild(elementNode)
      @nodesStack.push(@currentElementNode)
    @currentElementNode = elementNode


  endItem: (sourceLinePosition) ->
    if @currentElementNode != null
      if @nodesStack.length > 0
        @currentElementNode = @nodesStack.pop()
      else
        @currentElementNode = null
    else
      throw new NodeParseException("Unexpected end of element node", sourceLinePosition)

  text: (string, sourceLinePosition) ->
    if @currentElementNode != null
      @currentElementNode.addChild(new TextNode(string, sourceLinePosition))
    else
      if string.match(/^\s*$/)
        #console.log("Ignoring whitespace outside of root element: " + inspect(string))
      else
        throw new NodeParseException("Unexpected text outside of root element: " + inspect(string), 
                                     sourceLinePosition)

  endOfLine: (sourceLinePosition) ->
    if @currentElementNode != null
      @currentElementNode.addChild(new EndOfLineNode(sourceLinePosition))
    else
      # console.log("Ignoring end-of-line outside of root element")

  endOfSource: -> {}
  
class BracketupScanner
  constructor: ->

  regex: /(?:(\[)([A-Za-z0-9_\-,]*)([\s]|))|(\])|(\\(.))|([^[\]\\]+)/g
  
  sendAnyTexts: (tokenReceiver) ->
    if @textPortions.length > 0
      tokenReceiver.text(@textPortions.join(""), @textPortionsSourceLinePosition)
      @textPortions = []

  saveTextPortion: (textPortion, sourceLinePosition) ->
    if @textPortions.length == 0
      @textPortionsSourceLinePosition = sourceLinePosition
    @textPortions.push(textPortion)

  scanLine: (tokenReceiver, line, sourceLine) ->
    scanningRegex = new RegExp(@regex.source, "g")
    #console.log("Scanning " + inspect(line) + "\n  with " + scanningRegex + " ..."); 
    matchedSubstrings = []
    @textPortions = []
    linePosition = 1
    sourceLinePosition = sourceLine.position(linePosition)
    while (match = scanningRegex.exec(line))
      # console.log("  match = " + inspect(match))
      matchedSubstring = match[0]
      matchedSubstrings.push(matchedSubstring)
      #console.log("==> " + inspect(match[0]))
      if match[1]
        tokenReceiver.recordStart(matchedSubstring)
        @sendAnyTexts(tokenReceiver)
        itemArguments = match[2].split(",")
        whitespace = match[3]
        tokenReceiver.startItem(itemArguments, whitespace, sourceLinePosition)
        @depth++
      else if match[4]
        tokenReceiver.recordEnd(matchedSubstring)
        @sendAnyTexts(tokenReceiver)
        if @depth <= 0 && tokenReceiver.checkDepth
          throw new BracketParseException("One or more unexpected ']'s", sourceLinePosition)
        tokenReceiver.endItem(sourceLinePosition)
        @depth--
      else if match[5]
        tokenReceiver.recordQuotedCharacter(matchedSubstring)
        @saveTextPortion(match[6], sourceLinePosition)
      else if match[7]
        tokenReceiver.recordText(matchedSubstring)
        @saveTextPortion(match[7], sourceLinePosition)
      else
        console.log("match = " + inspect(match))
        throw new NodeParseException("No match found in lexer", sourceLinePosition)
      linePosition += matchedSubstring.length
      sourceLinePosition = sourceLine.position(linePosition)
    @sendAnyTexts(tokenReceiver)
    tokenReceiver.endOfLine(sourceLinePosition)

    reconstitutedMatches = matchedSubstrings.join("")
    if reconstitutedMatches != line
      throw new NodeParseException("Reconstituted " + inspect(reconstitutedMatches) + 
                                   "\n                  != " + inspect(line), sourceLinePosition)
    # console.log("matched substrings = " + inspect(matchedSubstrings.join("")))
  
  scanSource: (tokenReceiver, source, sourceFileName, onUnbalancedAtEnd = null) ->
    lines = source.split("\n")
    @scanSourceLines(tokenReceiver, lines, sourceFileName, onUnbalancedAtEnd)

  scanSourceLines: (tokenReceiver, lines, sourceFileName, onUnbalancedAtEnd) ->
    @depth = 0
    sourceFileInfo = new SourceFileInfo(sourceFileName, lines)
    for i in [0...lines.length]
      line = lines[i]
      @scanLine(tokenReceiver, line, sourceFileInfo.line(line, i+1))
    tokenReceiver.endOfSource
    if @depth != 0 && onUnbalancedAtEnd
      onUnbalancedAtEnd(@depth, sourceFileInfo)

class TextElement
  constructor: (@string) ->

  createDom: (document) ->
    document.createTextNode(@string)

#Base and generic classes for application-specific Bracketup interpreters
class BaseNode
  constructor: ->
    @children = []
    @attributes = {}

  classMap: {}

  getSemanticParentOfChild: ()->
    this

  getSemanticParent: ()->
    if @parent
      @parent.getSemanticParentOfChild()

  addChild: (child) ->
    @children.push(child)

  addTextChild: (string) ->
    if !(@ignoreWhiteSpaceText && string.match(/^\s*$/))
      if @children.length == 0 && string.match(/^\s*$/)
        string = string.replace(/[\s]/g, "\u00A0")
      @children.push(new TextElement(string))
  
  setIndentInsertString: (parentIndentInsertString) ->
    if @childIndent
      @indentInsertString = parentIndentInsertString + @childIndent
      for child in @children
        if child.setIndentInsertString
          child.setIndentInsertString(@indentInsertString)

  addEndOfLineChild: () ->
    if @endOfLineNode
      @children.push(@endOfLineNode)

  setAttribute: (attributeName, value) ->
    @attributes[attributeName] = value

  createDom: (document) ->
    if @createInitialDom
      dom = @createInitialDom(document)
      for i in [0...@children.length]
        child = @children[i]
        if child.createDom
          childDom = child.createDom(document)
          if childDom
            if @indentInsertString && (@indentAllChildren || i == 0)
              document.addTextNode(dom, @indentInsertString)
            dom.appendChild(childDom)
      if @indentInsertString
        document.addTextNode(dom, if @parent then @parent.indentInsertString else "\n")
      dom
    else
      null

# A wrapper for a browser DOM with convenience methods for creating nodes
class Document
  constructor: (@document) ->

  createNode: (tag, options) ->
    if !options
      options = {}
    dom = @document.createElement(tag)
    parent = options.parent
    if parent
      parent.appendChild(dom)
    cssClassName = options.cssClassName
    if cssClassName
      dom.className = cssClassName
    attributes = options.attributes
    if attributes
      for key, value of attributes
        dom.setAttribute(key, value)
    text = options.text
    if text
      dom.appendChild(@document.createTextNode(text))
    dom

  createTextNode: (text) ->
    @document.createTextNode(text)

  addTextNode: (dom, text) ->
    dom.appendChild(@document.createTextNode(text))


class BaseAttribute
  constructor: (@attributeName) ->
    @value = ""

  getSemanticParentOfChild: ()->
    this

  addTextChild: (string) ->
    @value = @value + string
 
  addChild: (child) ->
    throw new CompileError("Unexpected non-text element inside " + @attributeName + " attribute node", 
                           child.sourceLinePosition)
 
  addEndOfLineChild: ->
    @addTextChild("\n")
 
  addToParent: (parent) ->
    parent.setAttribute(@attributeName, @value)

class MarkupNode extends BaseNode

# Parsing of child nodes of a WrapperMarkupNode is determined
# by it's parent
class WrapperMarkupNode extends MarkupNode
  getSemanticParentOfChild: () ->
    @parent.getSemanticParentOfChild()

class Bold extends WrapperMarkupNode
  createInitialDom: (document) ->
    document.createNode("b")

class Span extends WrapperMarkupNode
  constructor: (@cssClassName) ->
    super()

  createInitialDom: (document) ->
    document.createNode("span", {cssClassName: @cssClassName})

class Italic extends WrapperMarkupNode
  createInitialDom: (document) ->
    document.createNode("i")

class NDash extends MarkupNode
  createInitialDom: (document) ->
    document.createTextNode("\u2013")

class HrefAttribute extends BaseAttribute
  constructor: ->
    super("href")


class Link extends MarkupNode
  classMap:
    href: HrefAttribute
  
  createInitialDom: (document) ->
    dom = document.createNode("a")
    href = @attributes.href
    if href
      dom.setAttribute("href", href)
    dom

class BracketupCompiler
  constructor: (topLevelClassMap) ->
    @nodeCompiler = new NodeCompiler(topLevelClassMap)

  compile: (source, sourceFileInfo) ->
    bracketupScanner = new BracketupScanner()
    nodeParser = new NodeParser()
    bracketupScanner.scanSource(nodeParser, source, sourceFileInfo,
      (depth, sourceFileInfo) ->
        throw new BracketParseException(depth + " unbalanced '['" +
                                        (if depth == 1 then "" else "s"),
                                        sourceFileInfo.endOfFilePosition()))
        
    parsedRootElements = nodeParser.rootElements
    compiledObjects = []
    for rootElement in parsedRootElements
      # console.log("Parsed root element " + rootElement)
      correspondence = @nodeCompiler.compile(rootElement)
      compiledObjects.push(correspondence)
    compiledObjects
  
  compileDoms: (source, document, sourceFileInfo) ->
    compiledDoms = []
    documentWrapper = new Document(document)
    try
      compiledObjects = @compile(source, sourceFileInfo)
      (compiledObject.createDom(documentWrapper) for compiledObject in compiledObjects)
    catch error
      if error instanceof CustomError
        error.document = documentWrapper
      throw error

exports.BracketupScanner = BracketupScanner
exports.NodeParser = NodeParser
exports.NodeCompiler = NodeCompiler
exports.CompileError = CompileError
  
exports.TextElement = TextElement
exports.BaseNode = BaseNode
exports.BaseAttribute = BaseAttribute
exports.Bold = Bold
exports.Italic = Italic
exports.HrefAttribute = HrefAttribute
exports.Link = Link
exports.Span = Span
exports.NDash = NDash

exports.CustomError = CustomError
exports.BracketupCompiler = BracketupCompiler
