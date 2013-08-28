(function() {

  // merge any number of objects, creating a new object
  function merge() {
    var result = {};
    for (var i=0; i<arguments.length; i++ ) {
      var object = arguments[i];
      var name;
      for (name in object) {
        var value = object[ name ];
        if ( value !== undefined ) {
	  result[name] = value;
        }
      }
    }
    return result;
  };

  function inspect(object) {return JSON.stringify(object);}

  exports.merge = merge;
  exports.inspect = inspect;
})();
