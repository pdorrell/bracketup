/* A script to manage require/exports in Javascript files loaded by the browser, so that the
   same files can be synchronously loaded and executed in either Node or the browser */

/** Javascript files to be loaded can (and should) be wrapped in anonymous function calls, which use
    "require" and "exports" as global variables, which this library manipulates directly. */

var MODULE_SIMULATOR = window.MODULE_SIMULATOR || {};

(function() {
  /** exports as filled in by each module */
  exports={};  // create empty exports map ready for first script to be loaded

  /** Accumulated list of loaded modules */
  var requires={};

  /** Call this method after loading a specific Javascript file, to save its
      CommonJS exports as a module with a name of your choice.*/
  MODULE_SIMULATOR.saveExports = function(moduleName) {
    requires[moduleName] = exports;
    exports = {}; // reset to empty exports map ready for next script to be loaded
  }

  /** Call this method before loading a specific Javascript file, to specify
      the resolution of all CommonJS "require" calls within the Javascript file.
      Each resolution entry maps a URL to a named module (as saved by saveExports) */
  MODULE_SIMULATOR.setRequires = function(requireMap) {
    require = function(url) {
      var moduleName = requireMap[url]; // look up module name by URL
      if (!moduleName) {
        throw new Error("Module for URL " + url + " not found");
      }
      var module = requires[moduleName]; // look up module by module name
      if (!module) {
        throw new Error("Module " + moduleName + " does not exist");
      }
      return module;
    }
  }

})();
