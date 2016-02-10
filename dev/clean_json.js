// Script to convert numbers defined as string values into their native number values (not recursive)

var fs = require('fs');
var _ = require('lodash');

fs.readFile('vzelections_master_data.json', function(err, data) {
	if (err) return console.error(err);
	var json = JSON.parse(data);
	_.each(json, function(elem) {
		_.each(elem, function(val, key) {
			if (parseFloat(val)) {
				elem[key] = parseFloat(val);
			}
		});
	});
	process.stdout.write(JSON.stringify(json, null, 4) + '\n');
});
