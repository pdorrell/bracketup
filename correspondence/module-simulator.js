/* A script to manage require/exports in Javascript files loaded by the browser, so that the
   same files can be synchronously loaded and executed in either Node or the browser */

/** Javascript files can (and should) be wrapped in anonymous function calls, which use
    "require" and "exports" as global variables. */

/** exports as filled in by each module */
exports={};

/** Accumulated list of loaded modules */
requires={};

function saveExports(moduleName) {
  console.log("Saving exports for module " + moduleName + " ...");
  requires[moduleName] = exports;
  exports = {};
}

