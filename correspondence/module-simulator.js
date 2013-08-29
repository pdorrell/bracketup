/* A script to manage require/exports in Javascript files loaded by the browser, so that the
   same files can be synchronously loaded and executed in either Node or the browser */

/** Javascript files can (and should) be wrapped in anonymous function calls, which use
    "require" and "exports" as global variables. */

/** exports as filled in by each module */
exports={};

/** Accumulated list of loaded modules */
requires={};

/** Call this method after loading a specific Javascript file, to save it's
    CommonJS exports as a module with a name of your choice.*/
function saveExports(moduleName) {
  requires[moduleName] = exports;
  exports = {};
}

/** Call this method before loading a specific Javascript file, to specify
    the resolution of all CommonJS "require" calls within the Javascript file.
    Each resolution entry maps a URL to a named module (as saved by saveExports) */
function setRequires(requireMap) {
  require = function(url) {
    var moduleName = requireMap[url];
    if (!moduleName) {
      throw new Error("Module for URL " + url + " not found");
    }
    var module = requires[moduleName];
    if (!module) {
      throw new Error("Module " + moduleName + " does not exist");
    }
    return module;
  }
}

