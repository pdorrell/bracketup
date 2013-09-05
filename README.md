Bracketup
=========

**Bracketup** is a simple generic markup language which provides a framework
for defining application-specific markup languages.

I have designed it primarily to allow creation of structured content that supports specific
interaction models in a web browser.

It has evolved from the application-specific
markup language [https://github.com/pdorrell/correspondence-markup](correspondence-markup), 
which is implemented in Ruby. 

**Bracketup** has been implemented in Javascript, which allows it to run in the browser, avoiding
any dependence on separate CMS or other server-side generation.

But, you can still run it server-side if you want to, for example using **Node**.

Perhaps unsurprisingly, given this history,
the one current working example of an application-specific **bracketup**-based markup language
is **correspondence-bracketup**, which provides
markup to support [Correspondence](http://pdorrell.github.io/correspondence/).
An actual page example is at http://pdorrell.github.io/bracketup/correspondence/rhoScriptExample.html,
and the markup can be seen inside the source for that web page.

Syntax Rules
------------

The syntax rules for **Bracketup** are fairly simple:

* A **Bracketup** document consists of one or more **elements**, where each element consists of the following:
  * Opening square bracket, i.e. **[**.
  * Zero or more comma-separated **identifiers** (with no whitespace before or after the commas)
  * Optional whitespace following the identifiers. (If the identifiers
    are followed by alphabet plain text, then there has to be at least one whitespace character between
    the last identifier and the beginning of the plain text.)
  * One or more **children**.
  * Closing square bracket, i.e. **]**.

**Children** can be either of the following:
  * Plain text
  * Elements

Plain text consists of any characters, but the characters "]", "[" and "\" must be quoted
by the backslash character "\".

Identifiers may contain any alphabetic characters, digits, or the characters "_" "-".
The character "_" at the beginning of an identifier is given a special meaning. Identifiers are suitable
for specifying things such as HTML element ids and CSS class names. Application data requiring a larger
character set, for example URLs, can be nested within appropriate child elements.

Every element has a **function**, which is specified by the first identifier in the comma-separated
list. Any other identifiers in the list are passed as arguments to the functions.

However, a function may specify a default function for child elements, in which case this function
does not need to be specified, and any identifiers given in child elements are treated as arguments
to the default function.

Where there is a default child element function, a function can be specified explicitly by prepending
"_" to the function name. This initial "_" will be removed, and the remainder of the name specifies the
actual function name. (It follows that "_" should not be used as a prefix for argument values, as this
will lead to confusion in certain cases.)

Interpretation
--------------

The syntax and markup structure given above does not specify any particular interpretation of the data.
However the **Bracketup** Javascript code provided in this project does support a specify type of interpretation.

Typically, an element will correspond to a Javascript object which is used to generate a DOM element
in the browser. Most child elements will represent child DOM elements of the parent's DOM element.
However in some cases a child element may indicate an action performed on the parent element, for example
setting an attribute value that cannot be specified as a function argument (because it requires a larger
character set than allowed for identifiers). A specific example would be specifying the "href" attribute 
on an element that generates an **<a>** HTML link element.

**bracketup.js** provides a simple implementation of functions, where the function names are mapped to
Javascript constructor functions, and the constructors construct Javascript objects, which, by default,
have a **createDom** element, which given a suitable **document** object, generates an HTML DOM element.
Any additional function arguments are passed as string arguments to the corresponding constructor function.
Default child element functions are specified by the **defaultChildFunction** property
on the parent element's constructor prototype.

(I call the initial map of function names the "top-level" map, because it is provided to the compiler
which uses it to interpret the function name on the top-level element. Inner elements can provide their
own maps, which will map functions relating to their own child elements, but which will typically fall
back to the top-level map to map functions that might occur anywhere within the source.)

### Parsing and Compiling

Compilation of **bracketup** markup occurs in four main stages:

* Scanning of source into tokens. There are four types of token:
  * "[" + comma-separated list of identifiers + optional whitespace
  * Backslash-quoted plain text
  * All other plain text
  * Closing "]"
* Compilation of tokens into elements.
* Compilation of elements into application-specific objects.
* Generation of HTML DOM elements from application-specific objects.

#### Error-handling

An essential element of any parsing or compiling application is the handling of errors.

If something goes wrong, we want to know what went wrong, and *where* it went wrong.

To support this, **bracketup.js** retains precise information about the location of
source code when initially parsed into tokens, and preserves this information as the tokens
are parsed into elements and then into application-specific objects, so that errors can
be properly reported, at whichever stage of compilation they occur.

### A Worked Example

The following is a cut-down version of the example at http://pdorrell.github.io/bracketup/correspondence/rhoScriptExample.html:

```
[correspondence [_title Queens Puzzle]
 [rhoscript [_languageTitle rhoScript]
  [A [1 8] [2 range]]
  [B [1 permutations]]
  [C ([1 with-index]]
  [D ...]
  [K [1 keep-maxes-by]]
 ]
 [english [_languageTitle English]
  [A For [2 the sequence of numbers from 0 to 1 less than] [1 8],]
  [B consider [1 all possible permutations].]
  [C For a given permutation, [1 specify X and Y co-ordinates for 8 queens] as an array of arrays
    of the form \[[b x], [b y]\]]
  [D ...]
  [K [1 Having done that for each [a [href http://en.wikipedia.org/wiki/Permutation]permutation], 
     keep those permutations that have the maximum number of diagonals occupied.]]
 ]
]
```

Here is some explanation of what is going on in this example:

* `correspondence` is a function name which is mapped at the top-level to the Javascript **Correspondence**
constructor which constructs the top-level object, which has a **createDom** method which will generate
the HTML DOM to be shown in the web page.
* The **Correspondence** object defines a default child function `text`. So `rhoScript` and `english` are the
first arguments passed to this function in each case.
* `_title` starts with the "_" character, so it specifies a non-default function `title`. This function maps
  to a Javascript **TitleAttribute** constructor, which constructs an object which sets a property **title**
  on the parent **Correspondence** object, which gets output in the HTML as a child **&lt;div&gt;** element. 
  (The title is specified within a child element rather than a function argument, because it can
   contain non-identifier characters such as space characters.)
* The `text` function maps to the Javascript **Text** constructor which accepts one argument of a CSS class name.
* The default child function for a **Text** object is `sentence`, which maps to **Sentence**.
* `languageTitle` is a non-default child function that maps to a **LanguageTitleAttribute** which sets
  a **languageTitle** property on the parent **Text** object, which uses that value (if provided) to output
  a child **&lt;div&gt;** element displaying the language title.
* The **Sentence** constructor takes one **id** argument.
* A **Sentence** object has a default child function `word`, which maps to the **Word** class, which accepts
  a single **id** argument in its constructor.
* `a` and `b` map to Javascript constructors which define objects representing the corresponding HTML element
  types. (Also `i`, but that doesn't appear in this example.)
* `a` maps to the **Link** class which has a child function `href` which maps to **HrefAttribute**, which sets
  the "href" attribute on the HTML link DOM element.
* The text `\[[b x], [b y]\]]` includes a backslash-quoted "[" and a backslash-quoted "]", so that these characters
  appear in the final output. (The inner "x" and "y" characters are displayed as bold in the final output.)

### Bracketup Javascript Classes

#### Base Classes

Three base classes are provide to support the most common use cases:

* **BaseNode** which represents an object that outputs a DOM from the **createDom** method.
* **TextElement** - an object representing the standard implementation of plain text added to a **BaseNode**.
* **BaseAttribute** - an object representing a child element which acts on the parent element by
  setting an attribute value on the DOM element created by the parent.

#### Implementation Classes

Other classes defined in **bracketup.js** which are relevant to implementing application-specific
markup languages are:

* **BracketupCompiler** constructed with a map of function names to constructor functions, this object 
  compiles elements into the application-specific objects
* **Document** this is a wrapper for the browser **document** object which provides two convenience methods
  for creating DOM nodes:
    * **addTextNode(dom, text)** which adds a text node to a DOM element.
    * **createNode(tag,options)** which creates a DOM element with the given **tag**, and the following options:
        * **parent** the parent DOM element to append the new DOM element onto
        * **className** the CSS class name
        * **attributes** a map of attributes to set as attribute values on the DOM element
        * **text** text for a text node to be added to the DOM element
* **Bold**, **Italic**, **Link** - classes representing HTML nodes of type **&lt;b&gt;**, **&lt;i&gt;** and **&lt;a&gt;** respectively.
* **HrefAttribute** - an object which, as a child element of a **Link** object, sets the **href** attribute
  of the **&lt;a&gt;** element.

#### Internal Classes


Other classes defined in **bracketup.js** are, by category:

##### Source Location

* **SourceFileName** representation of the name of a source file (which may be a URL, or 
  an id of a DOM element within HTML source, or whatever)
* **EndOfSourceFilePosition** representation of the end of a source file, for errors
  where source code is missing closing brackets
* **SourceLine** representation of a line of source code and its location
* **SourceLinePosition** representation of a specific character position within a line of source code

##### Element Structure
* **TextNode** plain text, as parsed, with associated source location information.
* **EndOfLineNode** end of a line, as parsed,  with associated source location information ( **bracketup.js**
  parses source line-by-line, so line endings are parsed separately from other plain text, and implementation
  objects can easily give special treatment to line endings).
* **ElementNode** an element, as parsed, with associated source location information.

##### Error Classes
* **CustomError** a base class that supports defining specific custom error classes that
  can have source location information added to them.
* **NodeParseException** an exception when parsing the **bracketup** markup.

* **CompileError** base class for errors that occur when compiling (i.e. when interpreting parsed elements).

##### Scanning and Compiling

* **BracketupScanner** which uses a single Javascript regex to scan the source code into tokens.
* **NodeParser** the object which receives tokens from **BracketupScanner** and compiles them into elements.
* **NodeCompiler** the object which, given a function-to-constructor map, compiles a parsed element into
  an application-specific object.
* **TestTokenReceiver** a test object which receives tokens from **BracketupScanner** and displays them
  in a readable fasion.
