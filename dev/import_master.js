'use strict';

var fs = require('fs');
var async = require('async');
var _ = require('lodash');

/////////////////////////////////////////////////////////////////////////////////////////

// Contains existing polygon and election data
var estados;
var municipios;
var parroquias;
var circuitos;

// Contains incoming election data
var estados_data;
var municipios_data;
var parroquias_data;
var circuitos_data;

var election_data;

async.series([

	// Import existing ESTADOS polygon and election data
	function(cb) {
		console.log("Parsing estados...");
		fs.readFile('./estados.old.geo.json', function(err, contents) {
			try {
				estados = JSON.parse(contents);
				cb();
			} catch (e) {
				return cb(e);
			}
		});
	},

	// Import existing MUNICIPIOS polygon and election data
	function(cb) {
		console.log("Parsing municipios...");
		fs.readFile('./municipios.old.geo.json', function(err, contents) {
			try {
				municipios = JSON.parse(contents);
				cb();
			} catch (e) {
				return cb(e);
			}
		});
	},

	// Import existing PARROQUIAS polygon and election data
	function(cb) {
		console.log("Parsing parroquias...");
		fs.readFile('./parroquias.old.geo.json', function(err, contents) {
			try {
				parroquias = JSON.parse(contents);
				cb();
			} catch (e) {
				return cb(e);
			}
		});
	},

	// Import CIRCUITOS data
	function(cb) {
		console.log("Parsing circuitos...");
		fs.readFile('./circuitos.old.geo.json', function(err, contents) {
			try {
				circuitos = JSON.parse(contents);
				cb();
			} catch (e) {
				return cb(e);
			}
		});
	},

	// Import incoming election data
	function(cb) {
		fs.readFile('vzelections_master_data.json', function(err, contents) {
			try {
				election_data = JSON.parse(contents);
				cb();
			} catch (e) {
				return cb(e);
			}
		});
	},

	// Merge ESTADO data
	function(cb) {

		console.log('==========================================');
		console.log('ESTADOS')
		console.log('==========================================');

		estados_data = {};
		_.each(election_data, function(rec) {
			if (rec.estado && !_.has(estados_data, rec.estado)) {
				estados_data[rec.estado] = _.fromPairs(_.map(rec, function(val, key) {
					var num = parseFloat(val);
					if (num) {
						return [key, num];
					} else {
						return [key, val];
					}
				}));
			}
		});

		estados = {
			type: 'FeatureCollection',
			features: _.map(estados.features, function(feat) {
				var prop = feat.properties;
				var key = prop.name;

				if (_.has(estados_data, key)) {

					//prop['name'] = estados_data[key].estado;

					// estado data
					prop['id'] = estados_data[key].cod_estado;
					prop['ine_cod'] = estados_data[key].cod_estado;
					prop['cne_cod'] = estados_data[key].edo_CNE;
					prop['cap'] = estados_data[key].cap_estado;

					// election data
					prop['pr98_c'] = estados_data[key].share_ofic_estado_pres1998;
					prop['pr98_to'] = estados_data[key].turnout_estado_pres1998;
					prop['pr00_c'] = estados_data[key].share_ofic_estado_pres2000;
					prop['pr00_to'] = estados_data[key].turnout_estado_pres2000;
					prop['rc04_c'] = estados_data[key].share_ofic_estado_rr2004;
					prop['rc04_to'] = estados_data[key].turnout_estado_rr2004;
					prop['rg04_c'] = estados_data[key].share_ofic_estado_gob2004;
					prop['rg04_to'] = estados_data[key].turnout_estado_gob2004;
					prop['pr06_c'] = estados_data[key].share_ofic_estado_pres2006;
					prop['pr06_to'] = estados_data[key].turnout_estado_pres2006;
					prop['rf07_c'] = estados_data[key].share_ofic_estado_ref2007;
					//prop['rf07_to'] = prop.rf07_n;
					prop['rg08_c'] = estados_data[key].share_ofic_estado_gob2008;
					prop['rg08_to'] = estados_data[key].turnout_estado_gob2008;
					prop['rf09_c'] = estados_data[key].share_ofic_estado_ref2009;
					prop['rf09_to'] = estados_data[key].turnout_estado_ref2009;
					prop['pm10_c_nom'] = estados_data[key].share_ofic_estado_nominal_2010;
					prop['pm10_c_lst'] = estados_data[key].share_ofic_estado_lista_2010;
					prop['pm10_to_nom'] = estados_data[key].turnout_estado_nominal_2010;
					prop['pm10_to_lst'] = estados_data[key].turnout_estado_lista_2010;
					prop['pr12_c'] = estados_data[key].share_ofic_estado_pres2012;
					prop['pr12_to'] = estados_data[key].turnout_estado_pres2012;
					prop['pr13_c'] = estados_data[key].share_ofic_estado_pres2013;
					prop['pr13_to'] = estados_data[key].turnout_estado_pres2013;
					prop['pm15_c_nom'] = estados_data[key].share_ofic_estado_nominal2015;
					prop['pm15_c_lst'] = estados_data[key].share_ofic_estado_lista2015;
					prop['pm15_to_nom'] = estados_data[key].turnout_estado_nominal2015;
					prop['pm15_to_lst'] = estados_data[key].turnout_estado_lista2015;

				} else {
					console.log("NO MATCH: ", key)
				}
				return feat;
			})
		};
		cb();
	},

	// Merge MUNICIPIO data
	function(cb) {

		console.log('==========================================');
		console.log('MUNICIPIOS')
		console.log('==========================================');

		var municipios_data = [
			{}, {},
			{}, {}, {},
			{}, {}, {},
			{}, {}, {},
			{}
		];

		// Track matched IDs against total IDs to see what doesn't match
		var total_ids = [];
		var matching_ids = [];

		_.each(election_data, function(rec) {

			var payload = _.fromPairs(_.map(rec, function(val, key) {
				var num = parseFloat(val);
				if (num) {
					return [key, num];
				} else {
					return [key, val];
				}
			}));

			var keys = [
				normalize_name(rec.estado),
				normalize_name(rec.municipio),

				Math.round(rec.share_ofic_mun_pres1998 * 1000),
				Math.round(rec.share_ofic_mun_pres2000 * 1000),
				Math.round(rec.share_ofic_mun_gob2004 * 1000),

				Math.round(rec.share_ofic_mun_pres2006 * 1000),
				Math.round(rec.share_ofic_mun_ref2007 * 1000),
				Math.round(rec.share_ofic_mun_ref2009 * 1000),

				Math.round(rec.share_ofic_mun_lista_2010 * 1000),
				Math.round(rec.share_ofic_mun_nominal_2010 * 1000),
				Math.round(rec.share_ofic_mun_pres2012 * 1000),

				Math.round(rec.share_ofic_mun_pres2013 * 1000)
			];

			payload.keys = keys;

			_.each(keys, function(key, idx) {
				if (!key) return;
				if (!_.has(municipios_data[idx], key)) municipios_data[idx][key] = [];
				municipios_data[idx][key].push(payload);
			});

			total_ids.push(rec.id_municip);

		});

		municipios = {
			type: 'FeatureCollection',
			features: _.map(municipios.features, function(feat) {

				var prop = feat.properties;
				_.each(prop, function(val, key) {
					if (key.match(/^[a-z]{2}[0-9]{2}/)) {
						prop[key] = parseFloat(val);
					}
				});

				var keys = [
					normalize_name(prop.ESTADO),
					normalize_name(prop.name),

					Math.round(prop.pr98_c * 1000),
					Math.round(prop.pr00_c * 1000),
					Math.round(prop.rg04_c * 1000),

					Math.round(prop.pr06_c * 1000),
					Math.round(prop.rf07_c * 1000),
					Math.round(prop.rf09_c * 1000),

					Math.round(prop.pm10_c_lst * 1000),
					Math.round(prop.pm10_c_nom * 1000),
					Math.round(prop.pr12_c * 1000),

					Math.round(prop.pr13_c * 1000)
				];

				// Try to find the best match on all keys
				var matches = _.reduce(_.toPairs(keys), function(memo, pair) {
					var idx = pair[0];
					var key = pair[1];
					if (_.isArray(municipios_data[idx][key])) {
						if (memo[1] === null) { // nothing previously matched
							return [memo[0].concat(key), municipios_data[idx][key]];
						} else {
							var inter = _.intersection(municipios_data[idx][key], memo[1]);
							if (!_.isEmpty(inter)) {
								return [memo[0].concat(key), inter];
							} else {
								return [memo[0], memo[1]];
							}
						}
					} else {

						return [memo[0], memo[1]];
					}
				}, [[], null]);

				var obj = _.first(matches[1]);

				//console.log('###', matches[0].length + ': ', matches[0].join(' | '));

				if (matches[0].length >= 4) { // match on at least 4 keys

					//prop['ESTADO'] = obj.estado;
					if (!prop['name']) prop['name'] = obj.municipio;

					// municip data
					prop['id'] = obj.id_municip;
					prop['ine_cod'] = obj.cod_munic;
					prop['cne_cod'] = obj.mun_CNE;
					prop['cap'] = obj.cap_munic;

					// election data
					prop['pr98_c'] = obj.share_ofic_mun_pres1998;
					prop['pr98_to'] = obj.turnout_mun_pres1998;
					prop['pr00_c'] = obj.share_ofic_mun_pres2000;
					prop['pr00_to'] = obj.turnout_mun_pres2000;
					prop['rc04_c'] = obj.share_ofic_mun_rr2004;
					prop['rc04_to'] = obj.turnout_mun_rr2004;
					prop['rg04_c'] = obj.share_ofic_mun_gob2004;
					prop['rg04_to'] = obj.turnout_mun_gob2004;
					prop['pr06_c'] = obj.share_ofic_mun_pres2006;
					prop['pr06_to'] = obj.turnout_mun_pres2006;
					prop['rf07_c'] = obj.share_ofic_mun_ref2007;
					//prop['rf07_to'] = prop.rf07_n;
					prop['rg08_c'] = obj.share_ofic_mun_gob2008;
					prop['rg08_to'] = obj.turnout_mun_gob2008;
					prop['rf09_c'] = obj.share_ofic_mun_ref2009;
					prop['rf09_to'] = obj.turnout_mun_ref2009;
					prop['pm10_c_nom'] = obj.share_ofic_mun_nominal_2010;
					prop['pm10_c_lst'] = obj.share_ofic_mun_lista_2010;
					prop['pm10_to_nom'] = obj.turnout_mun_nominal_2010;
					prop['pm10_to_lst'] = obj.turnout_mun_lista_2010;
					prop['pr12_c'] = obj.share_ofic_mun_pres2012;
					prop['pr12_to'] = obj.turnout_mun_pres2012;
					prop['pr13_c'] = obj.share_ofic_mun_pres2013;
					prop['pr13_to'] = obj.turnout_mun_pres2013;
					prop['pm15_c_nom'] = obj.share_ofic_mun_nominal2015;
					prop['pm15_c_lst'] = obj.share_ofic_mun_lista2015;
					prop['pm15_to_nom'] = obj.turnout_mun_nominal2015;
					prop['pm15_to_lst'] = obj.turnout_mun_lista2015;

					matching_ids.push(obj.id_municip);

				} else {
					console.log('NOMATCH>>')
					console.log('prev [' + prop.ESTADO + ',' + prop.name + ']');
					console.log('prev keys: ' + keys.join('|'));
					if (obj) {
						console.log('best(' + matches[0].length + ') [' + obj.estado + ',' + obj.municipio + ']');
						console.log('matching keys: ', matches[0]);
						console.log('best keys: ' + obj.keys.join('|'));
					}
				}
				return feat;
			})
		};

		console.log('UNMATCHED IDs>', _.difference(total_ids, matching_ids).join('|'));

		cb();
	},

	// Merge PARROQUIA data
	function(cb) {

		console.log('==========================================');
		console.log('PARROQUIAS')
		console.log('==========================================');

		var parroquias_data = [
			{}, {}, {},
			{}, {}, {},
			{}, {}, {},
			{}, {}, {},
			{}
		];

		// Track matched IDs against total IDs to see what doesn't match
		var total_ids = [];
		var matching_ids = [];

		var thickness = {}; // lookup by "thickness"

		_.each(election_data, function(rec) {

			var payload = _.fromPairs(_.map(rec, function(val, key) {
				var num = parseFloat(val);
				if (num) {
					return [key, num];
				} else {
					return [key, val];
				}
			}));

			var keys = [
				normalize_name(rec.estado),
				normalize_name(rec.municipio),
				normalize_name(rec.parroquia),

				Math.round(rec.share_ofic_par_pres1998 * 1000),
				Math.round(rec.share_ofic_par_pres2000 * 1000),
				Math.round(rec.share_ofic_par_gob2004 * 1000),

				Math.round(rec.share_ofic_par_pres2006 * 1000),
				Math.round(rec.share_ofic_par_ref2007 * 1000),
				Math.round(rec.share_ofic_par_ref2009 * 1000),

				Math.round(rec.share_ofic_par_lista_2010 * 1000),
				Math.round(rec.share_ofic_par_nominal_2010 * 1000),
				Math.round(rec.share_ofic_par_pres2012 * 1000),

				Math.round(rec.share_ofic_par_pres2013 * 1000)
			];

			payload.keys = keys;

			_.each(keys, function(key, idx) {
				if (!key) return;
				if (!_.has(parroquias_data[idx], key)) parroquias_data[idx][key] = [];
				parroquias_data[idx][key].push(payload);
			});

			thickness[rec.thickness] = rec;
			total_ids.push(rec.thickness);

		});

		parroquias = {
			type: 'FeatureCollection',
			features: _.compact(_.map(parroquias.features, function(feat) {

				var prop = feat.properties;
				_.each(prop, function(val, key) {
					if (key.match(/^[a-z]{2}[0-9]{2}/)) {
						prop[key] = parseFloat(val);
					}
				});

				var keys = [

					normalize_name(prop.ESTADO),
					normalize_name(prop.MUNICIPIO),
					normalize_name(prop.name),

					Math.round(prop.pr98_c * 1000),
					Math.round(prop.pr00_c * 1000),
					Math.round(prop.rg04_c * 1000),

					Math.round(prop.pr06_c * 1000),
					Math.round(prop.rf07_c * 1000),
					Math.round(prop.rf09_c * 1000),

					Math.round(prop.pm10_c_lst * 1000),
					Math.round(prop.pm10_c_nom * 1000),
					Math.round(prop.pr12_c * 1000),

					Math.round(prop.pr13_c * 1000)
				];

				// Try to find the best match on all keys
				var matches = _.reduce(_.toPairs(keys), function(memo, pair) {
					var idx = pair[0];
					var key = pair[1];
					if (_.isArray(parroquias_data[idx][key])) {
						if (memo[1] === null) { // nothing previously matched
							return [memo[0].concat(key), parroquias_data[idx][key]];
						} else {
							// see if previously matched object matches with current key

							var inter = _.intersection(parroquias_data[idx][key], memo[1]);
							if (!_.isEmpty(inter)) {
								return [memo[0].concat(key), inter];
							} else {
								return [memo[0], memo[1]];
							}
						}
					} else {

						return [memo[0], memo[1]];
					}
				}, [[], null]);

				var obj = null;

				if (matches[0].length >= 4) { // Declare match if 4/10 keys match
					obj = _.first(matches[1]);
					//console.log('KEY MATCH [' + matches[0].length + ']:', matches[0].join(' | '));
					if (matches[1].length > 1) console.log('!!! MULTIPLE MATCHES (' + matches[1].length + ')');
				} else {
					// try matching 'thickness' to what is saved as parroquia name
					var id = prop.name;
					if (_.has(thickness, id)) {
						obj = thickness[id];
						// override names
						prop['ESTADO'] = obj.estado;
						prop['MUNICIPIO'] = obj.municipio;
						prop['name'] = obj.parroquia;
						//console.log('THICKNESS [' + id + ']:', obj.estado + ' | ' + obj.municipio + ' | ' + obj.parroquia);
					}
				}

				if (obj) {

					//prop['ESTADO'] = obj.estado;
					if (!prop['MUNICIPIO']) prop['MUNICIPIO'] = obj.municipio;
					if (!prop['name']) prop['name'] = obj.parroquia;

					// parroquia data
					prop['id'] = obj.thickness;
					prop['ine_cod'] = obj.cod_parroq;
					prop['cne_cod'] = obj.par_CNE;
					prop['cap'] = obj.cap_parroq;

					// election data
					prop['pr98_c'] = obj.share_ofic_par_pres1998;
					prop['pr98_to'] = obj.turnout_par_pres1998;
					prop['pr00_c'] = obj.share_ofic_par_pres2000;
					prop['pr00_to'] = obj.turnout_par_pres2000;
					prop['rc04_c'] = obj.share_ofic_par_rr2004;
					prop['rc04_to'] = obj.turnout_par_rr2004;
					prop['rg04_c'] = obj.share_ofic_par_gob2004;
					prop['rg04_to'] = obj.turnout_par_gob2004;
					prop['pr06_c'] = obj.share_ofic_par_pres2006;
					prop['pr06_to'] = obj.turnout_par_pres2006;
					prop['rf07_c'] = obj.share_ofic_par_ref2007;
					//prop['rf07_to'] = prop.rf07_n;
					prop['rg08_c'] = obj.share_ofic_par_gob2008;
					prop['rg08_to'] = obj.turnout_par_gob2008;
					prop['rf09_c'] = obj.share_ofic_par_ref2009;
					prop['rf09_to'] = obj.turnout_par_ref2009;
					prop['pm10_c_nom'] = obj.share_ofic_par_nominal_2010;
					prop['pm10_c_lst'] = obj.share_ofic_par_lista_2010;
					prop['pm10_to_nom'] = obj.turnout_par_nominal_2010;
					prop['pm10_to_lst'] = obj.turnout_par_lista_2010;
					prop['pr12_c'] = obj.share_ofic_par_pres2012;
					prop['pr12_to'] = obj.turnout_par_pres2012;
					prop['pr13_c'] = obj.share_ofic_par_pres2013;
					prop['pr13_to'] = obj.turnout_par_pres2013;
					prop['pm15_c_nom'] = obj.share_ofic_par_nominal2015;
					prop['pm15_c_lst'] = obj.share_ofic_par_lista2015;
					prop['pm15_to_nom'] = obj.turnout_par_nominal2015;
					prop['pm15_to_lst'] = obj.turnout_par_lista2015;

					matching_ids.push(obj.thickness);

					return feat;
				} else {
					console.log('NOMATCH>>')
					console.log('prev [' + prop.ESTADO + ',' + prop.MUNICIPIO + ',' + prop.name + ']');
					console.log('prev keys: ' + keys.join('|'));
					if (obj) {
						console.log('best(' + matches[0].length + ') [' + obj.estado + ',' + obj.municipio + ',' + obj.parroquia + ']');
						console.log('matching keys: ', matches[0]);
						console.log('best keys: ' + obj.keys.join('|'));
					}
					return null;
				}
			}))
		};

		console.log('UNMATCHED IDs>', _.difference(total_ids, matching_ids).join('|'));

		cb();
	},

	// Create CIRCUITOS data
	function(cb) {

		console.log('==========================================');
		console.log('CIRCUITOS')
		console.log('==========================================');

		circuitos_data = {};
		_.each(election_data, function(rec) {
			if (rec.c_id) {
				var key = rec.c_id;
				circuitos_data[key] = _.fromPairs(_.map(rec, function(val, key) {
					var num = parseFloat(val);
					if (num) {
						return [key, num];
					} else {
						return [key, val];
					}
				}));
			}
		});

		circuitos = {
			type: 'FeatureCollection',
			features: _.map(circuitos.features, function(feat) {

				var prop = feat.properties;
				_.each(prop, function(val, key) {
					if (key.match(/^[a-z]{2}[0-9]{2}/)) {
						prop[key] = parseFloat(val);
					}
				});

				var key = prop.Circuitos_;

				if (_.has(circuitos_data, key)) {
					prop['id'] = circuitos_data[key].id;
					prop['ESTADO'] = circuitos_data[key].estado;
					prop['name'] = 'Circuit ' + parseInt(circuitos_data[key].c_id.toString().slice(-2));
					prop['pm10_to'] = circuitos_data[key].turnout_circuito_nominal_2010;
					prop['pm10_c'] = circuitos_data[key].share_ofic_circuito_nominal_2010;
					prop['pm15_to'] = circuitos_data[key].turnout_circuito_nominal2015;
					prop['pm15_c'] = circuitos_data[key].share_ofic_circuito_nominal2015;
				} else {
					console.log('NOMATCH>', key);
				}

				return feat;
			})
		};

		cb();
	},

	function(cb) {
		var contents = JSON.stringify(estados, null, 4);
		fs.writeFile('../src/data/estados.geo.json', contents, function(err) {
			console.log('estados written.');
			cb();
		});
	},

	function(cb) {
		var contents = JSON.stringify(municipios, null, 4);
		fs.writeFile('../src/data/municipios.geo.json', contents, function(err) {
			console.log('municipios written.');
			cb();
		});
	},

	function(cb) {
		var contents = JSON.stringify(parroquias, null, 4);
		fs.writeFile('../src/data/parroquias.geo.json', contents, function(err) {
			console.log('parroquias written.');
			cb();
		});
	},

	function(cb) {
		var contents = JSON.stringify(circuitos, null, 4);
		fs.writeFile('../src/data/circuitos.geo.json', contents, function(err) {
			console.log('circuitos written.');
			cb();
		});
	}

], function(err) {
	if (err) {
		console.error('ERROR:', err);
		var stack = err.stack.replace(/^[^\(]+?[\n$]/gm, '')
			.replace(/^\s+at\s+/gm, '')
			.replace(/^Object.<anonymous>\s*\(/gm, '{anonymous}()@')
			.split('\n');
		console.log(stack);
	}
	process.exit();
});

/////////////////////////////////////////////////////////////////////////////////////////

function normalize_name(name) {
	if (name === undefined || name === null) return '';
	var val = name.toString().replace(/[^A-Za-z0-9\.\- ]/g, '_');
	val = val.trim().replace(/\s+/g, '_');
	return val;
}
