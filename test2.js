// Generated by CoffeeScript 1.6.3
(function() {
  var inspect, myTest, utils;

  require('source-map-support').install();

  utils = require("./utils");

  inspect = utils.inspect;

  myTest = function() {
    console.log(inspect("Hello world number 2"));
    throw new Error("Bad");
  };

  myTest();

}).call(this);

/*
//@ sourceMappingURL=test2.map
*/
