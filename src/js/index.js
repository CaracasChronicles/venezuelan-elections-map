
var map;
var overlay;
var appdata = {};

// controls
var election_selector;
var div_selector;
var legend;

// state vars
var election_options = null;
var selected_election = null;
var selected_sub = null;
var selected_div = null;

var app_options = {
    opacity: 0.75  // Opacity of the colored polygons
};

var sidebar_width = 260;

var topglass;
var tooltip;

google.maps.event.addDomListener(window, 'load', function() {

    // on resize, adjust SVG dimensions and reposition/resize some overlays
    var on_resize = function() {
        var vport = get_viewport();
        d3.select("#top-glass")
            .attr("width", vport[0])
            .attr("height", vport[1]);
        if (legend) legend.render(); // legend
        // description
        d3.select("#description").attr("style", "top:100px;left:5px;width:" + (sidebar_width - 10) + "px;height:" + Math.max(vport[1] - 150,0) + "px;");
    };

    d3.select(window).on('resize', on_resize);
    on_resize();

    // perform asynchronous tasks
    async.auto({

        data: function(cb) {
            d3.json('appdata.min.json', function(data) {
                appdata = data;
                cb();
            });
        },

        map: ['data', function(cb) {
            map = new google.maps.Map(document.getElementById('map-canvas'), {
                center: {lat: 7, lng: -66.1},
                zoom: 6,
                minZoom: 6,
                maxZoom: 12,
                mapTypeControl: true,
                mapTypeControlOptions: {
                    style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
                    position: google.maps.ControlPosition.RIGHT_BOTTOM
                },
                scaleControl: true,
                scaleControlOptions: {},
                streetViewControl: false,
                zoomControl: true,
                zoomControlOptions: {
                    style: google.maps.ZoomControlStyle.LARGE,
                    position: google.maps.ControlPosition.RIGHT_TOP
                },
                panControl: true,
                panControlOptions: {
                    position: google.maps.ControlPosition.RIGHT_TOP
                },
                // source: https://snazzymaps.com/style/4183/mostly-grayscale
                styles: [{"featureType":"landscape","stylers":[{"saturation":-100},{"lightness":65},{"visibility":"on"}]},{"featureType":"poi","stylers":[{"saturation":-100},{"lightness":51},{"visibility":"simplified"}]},{"featureType":"road.highway","stylers":[{"saturation":-100},{"visibility":"simplified"}]},{"featureType":"road.arterial","stylers":[{"saturation":-100},{"lightness":30},{"visibility":"on"}]},{"featureType":"road.local","stylers":[{"saturation":-100},{"lightness":40},{"visibility":"on"}]},{"featureType":"transit","stylers":[{"saturation":-100},{"visibility":"simplified"}]},{"featureType":"administrative.province","stylers":[{"visibility":"off"}]},{"featureType":"water","elementType":"labels","stylers":[{"visibility":"on"},{"lightness":-25},{"saturation":-100}]},{"featureType":"water","elementType":"geometry","stylers":[{"hue":"#3178C8"},{"lightness":-25},{"saturation":-85}]}]
            });

            google.maps.event.addListener(map.data, 'addfeature', function(event) {
                event.feature.setProperty('color', '#359');
            });

            overlay = new google.maps.OverlayView();
            overlay.draw = function() {};
            overlay.setMap(map);

            map.data.setStyle(function(feature) {
                var isHover = feature.getProperty('hover');
                var color = feature.getProperty('color') || "#999";
                return {
                    strokeWeight: isHover ? 2.0 : 0.5,
                    strokeOpacity: 1.0,
                    strokeColor: isHover ? "red" : "#345",
                    fillColor: isHover ? d3.rgb(color).brighter(1.2) : color,
                    fillOpacity: app_options.opacity,
                    zIndex: isHover ? 1 : 0
                };
            });
            cb();
        }],

        overlays: ['data', 'map', function(cb) {

            topglass = d3.select("#top-glass");

            function show_tooltip(event) {
                if (!event || !event.feature) return;
                var pos = overlay.getProjection().fromLatLngToContainerPixel(event.latLng);
                var feat = event.feature;
                if (tooltip) tooltip.remove();
                tooltip = new Tooltip({
                    container: topglass,
                    x: pos.x,
                    y: pos.y,
                    width: 280,
                    height: 150,
                    template: _.template(
                        "<div style='width:100%;padding:10px 15px;'>" +
                            "<span style='font-size:16px;color:#000;'><%=name || \"<span style='font-style:italic;color:#444;'>unknown</span>\"%></span><br>" +
                            "<span style='color:#B98640;font-size:12px;'><%=loc%></span><br>" +
                            "<br>" +
                            "<table><tbody>" +
                                "<tr><th><%=election.vtype%></th><td><%=value||'.'%></td></tr>" +
                                "<tr><th>Turnout</th><td><%=turnout%></td></tr>" +
                            "</tbody></table>" +
                        "</div>")
                });

                if (selected_election) {
                    var elec_id = selected_election.id;
                    var elec_sub = selected_sub && selected_sub[1] || ''; // nominal + lista suboptions (_nom, _lst)
                    var props = {};
                    event.feature.forEachProperty(function(val, key) {
                        props[key] = val;
                    });
                    tooltip.render(_.extend(props, {
                        numformat: d3.format(','), // format numbers with thousands commas
                        value: ((Math.round(feat.getProperty(elec_id + "_c" + elec_sub) * 1000) / 10).toString() + '%'),
                        rep_text: (elec_id === "pr12" || elec_id === "pr13" ? "Counted Voters<br> (<i>escrutados</i>)" : "Registered Voters"),
                        registered: feat.getProperty(elec_id + "_n"),
                        loc: feat.getProperty("MUNICIPIO") ? feat.getProperty("MUNICIPIO") + ", " + feat.getProperty("ESTADO") : (feat.getProperty("ESTADO") || ""),
                        election: appdata.elections[elec_id],
                        area: google.maps.geometry.spherical.computeArea(feat.getGeometry()),
                        repinc: (function(){
                            if (feat.getProperty(appdata.elections[elec_id].prev + "_n") === undefined || feat.getProperty(elec_id + "_n") === undefined || parseInt(feat.getProperty(appdata.elections[elec_id].prev + "_n")) === 0 || parseInt(feat.getProperty(elec_id + "_n")) === 0) {
                                return "<span style='font-style:italic;color:#777;'>N/A</span>";
                            } else {
                                return (Math.round((parseInt(feat.getProperty(elec_id + "_n")) - parseInt(feat.getProperty(appdata.elections[elec_id].prev + "_n"))) * 10000 / parseInt(feat.getProperty(appdata.elections[elec_id].prev + "_n"))) / 100).toString() + "%";
                            }
                        }()),
                        turnout: (function(){
                            if (feat.getProperty(elec_id + "_to" + elec_sub) === undefined) {
                                return "<span style='font-style:italic;color:#777;'>N/A</span>";
                            } else {
                                return (Math.round(parseFloat(feat.getProperty(elec_id + "_to" + elec_sub)) * 10000) / 100).toString() + "%";
                            }
                        }()),
                        vdensity: (function(){
                            // TODO
                        }())
                    }));
                }
            }

            google.maps.event.addListener(map.data, 'mouseover', function(event) {
                if (event && event.feature) {
                    event.feature.setProperty('hover', true);
                    show_tooltip(event);
                }
            });
            google.maps.event.addListener(map.data, 'mouseout', function(event) {
                if (event && event.feature) {
                    event.feature.setProperty('hover', false);
                    if (tooltip) tooltip.remove();
                }
            });
            map.addListener('dragstart', function(event) {
                topglass.selectAll(".tooltip").remove();
            });

            // set up D3 widgets

            election_options = _.map(appdata.elections, function(val, key) {
                return {
                    id: key,
                    name: val.label,
                    desc: val.desc,
                    maps: val.maps,
                    scale_type: val.scale_type,
                    action: load_election,
                    disabled: val.disabled,
                    subs: val.subs,
                    selected: val.selected
                };
            });

            // map subdivision menu
            div_selector = new Menu({
                classed: {menu: 1, divsel: 1},
                span: "horizontal",
                options: [
                    {id: "parroquias", name: "PARISH", action: load_div, selected: true},
                    {id: "municipios", name: "MUNICIP.", action: load_div},
                    {id: "estados", name: "STATE", action: load_div},
                    {id: "circuitos", name: "CIRCUIT", action: load_div}
                ],
                margin: {
                    top: 20,
                    left: 5
                },
                container: topglass,
                width: sidebar_width / 4,
                height: 15,
                text_yoffset: 11
            });

            legend = new ColorLegend({
                swatch_size: 10,
                intrapadding: 3,
                position: {
                    top: 35,
                    right: 40
                },
                margin: {
                    top: 15,
                    bottom: 10,
                    left: 5,
                    right: 45
                },
                extra: [
                    ["#777", "No data"]
                ],
                container: topglass,
                format: function(val) {return Math.round(val * 100) + "%"},
            });

            div_selector.render();

            ///////////////////////////////////////////////////////////////////////////////////////////

            // auto-load default options
            load_div(div_selector.options[0]);
            load_election(election_options[election_options.length - 1]);

        }]

    }, function(err) {
        if (err) console.error(err);
    });

});

// called when an election is selected
function load_election(option) {

    selected_election = option;
    var elec_id = option.id;
    var quit = false;

    // update map selector
    _.each(div_selector.options, function(div) {
        div.disabled = !!(selected_election.maps.indexOf(div.id) === -1);
        if (selected_div.id === div.id && div.disabled) {
            _.each(div_selector.options, function(opt) {
                opt.selected = false;
            });
            _.first(div_selector.options).selected = true;
            load_div(_.first(div_selector.options));
            quit = true;
        }
    });
    if (quit) return;

    div_selector.render();

    // disable nominal/lista suboptions for circuitos
    if (selected_election.subs && selected_div.id !== 'circuitos') {
        if (!selected_sub) {
            selected_sub = _.first(selected_election.subs);
            load_voting_system(selected_sub[1]);
            return;
        }
    } else {
        selected_sub = null;
    }

    var color_scale;
    if (option.scale_type == 'sequential') {
        // Sequential color scale - http://colorbrewer2.org/?type=sequential&scheme=BuGn&n=9
        var color_range = ["#F7FCFD", "#E5F5F9", "#CCECE6", "#99D8C9", "#66C2A4", "#41AE76", "#238B45", "#006D2C", "#00441B"];
        color_scale = d3.scale.linear()
            .domain(color_range.map(function(e, i) {return i / (color_range.length - 1)}))
            .range(color_range)
            .clamp(true);
    } else { // assume diverging color scale
        // Diverging color scale - http://colorbrewer2.org/?type=diverging&scheme=RdBu&n=10
        var color_range = ["#053061", "#2166ac", "#4393c3", "#92c5de", "#d1e5f0", "#fddbc7", "#f4a582", "#d6604d", "#b2182b", "#67001f"];
        color_scale = d3.scale.linear()
            .domain(color_range.map(function(e, i) {return i / (color_range.length - 1)}))
            .range(color_range)
            .clamp(true);
    }

    map.data.forEach(function(feat) {
        //var id = feat.getId();
        var val = feat.getProperty(elec_id + "_c" + (selected_sub ? selected_sub[1] : ''));
        if (val && val !== 0) {
            feat.setProperty('color', color_scale(val));
        } else {
            feat.setProperty('color', '#666');
        }
    });

    // update legend
    legend.set_scale(color_scale);
    legend.render();

    // update description
    $('#description').text('');
    if (option.subs && selected_div.id !== 'circuitos') {
        var sel = $('<select>');
        _.each(option.subs, function(sub) {
            var opt = $('<option>').text(sub[0]).val(sub[1]);
            sel.append(opt);
        });
        sel.val(selected_sub);
        sel.on('change', function() {
            load_voting_system(sel.val());
        });
        $('#description').append('<span>Use electoral system:</span><br>').append(sel).append('<br><br>');
    }
    $('<div>').html(option.desc).appendTo('#description');
}

// called when a subdivision type is selected
function load_div(option) {

    selected_div = option;
    var div_id = option.id;

    // remove all features currently on map
    map.data.forEach(function(feat) {
        map.data.remove(feat);
    });

    map.data.addGeoJson(appdata[div_id]);
    if (selected_election) load_election(selected_election);
}

// called when voting system dropdown is changed, where applicable
function load_voting_system(suffix) {

    if (!_.isArray(selected_election.subs)) return;

    selected_sub = _.find(selected_election.subs, function(sub) {
        return sub[1] === suffix;
    });

    load_election(selected_election);
}
