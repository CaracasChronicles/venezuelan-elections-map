
var map;
var overlay;
var appdata = {};

// controls
var election_selector;
var div_selector;
var legend;

// state vars
var selected_election = null;
var selected_div = null;

var app_options = {
    opacity: 0.75  // Opacity of the colored polygons
};

google.maps.event.addDomListener(window, 'load', function() {

    // title background
    d3.select("#top-glass").insert("rect", "#title-text-1")
        .attr("id", "title-bg")
        .attr("x", 10.5)
        .attr("y", 10.5)
        .attr("rx", 2)
        .attr("ry", 2)
        .attr("width", function() {return d3.select("#title-text-1").node().getBBox().width + 22})
        .attr("height", 58)
                    
    // on resize, adjust SVG dimensions and reposition/resize some overlays
    var on_resize = function() {
        var vport = get_viewport();
        d3.select("#top-glass")
            .attr("width", vport[0])
            .attr("height", vport[1]);            
        if (legend) legend.render(); // legend        
        // description
        var width = Math.round(d3.select("#title-bg").attr("width")-10);
        d3.select("#description").attr("style", "top:420px;left:10px;width:"+width+"px;height:"+Math.max(vport[1]-480,0)+"px;");
        d3.select("#source").attr("style", "top:"+Math.max(vport[1]-50,0)+"px;left:10px;width:"+width+"px;height:10px;");
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
            
            var topglass = d3.select("#top-glass");

            var tooltip;
            
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
                    height: 300,
                    template: _.template(
                        "<div style='width:100%;padding:10px 15px;'>"+
                            "<span style='font-size:16px;color:#000;'><%=name || \"<span style='font-style:italic;color:#444;'>unknown</span>\"%></span><br>"+
                            "<span style='color:#B98640;font-size:12px;'><%=loc%></span><br>"+
                            "<br>"+
                            "<table><tbody>"+
                                "<tr><th><%=rep_text%></th><td><%=registered ? numformat(registered) : '.'%></td></tr>"+
                                "<tr><th><%=election.vtype%></th><td><%=value ? ((Math.round(value*1000)/10).toString()+'%') : '.'%></td></tr>"+
                                "<tr><th>% REP increase</th><td><%=repinc%></td></tr>"+
                                "<tr><th>REP/km<sup>2</sup></th><td></td></tr>"+
                                "<tr><th>Area</th><td><%=numformat(area)%> km<sup>2</sup></td></tr>"+
                                "<tr><th>Turnout</th><td><%=turnout%></td></tr>"+
                            "</tbody></table>"+
                        "</div>")
                });
                
                if (selected_election) {
                    var elec_id = selected_election.id;
                    var props = {};
                    event.feature.forEachProperty(function(val, key) {
                        props[key] = val;
                    });
                    tooltip.render(_.extend(props, {
                        numformat: d3.format(','), // format numbers with thousands commas
                        value: feat.getProperty(elec_id + "_c"),
                        rep_text: (elec_id == "pr12" || elec_id == "pr13" ? "Counted Voters<br> (<i>escrutados</i>)" : "Registered Voters"),
                        registered: feat.getProperty(elec_id + "_n"),
                        loc: feat.getProperty("MUNICIPIO") ? feat.getProperty("MUNICIPIO")+", "+feat.getProperty("ESTADO") : (feat.getProperty("ESTADO") || ""),
                        election: appdata.elections[elec_id],
                        area: google.maps.geometry.spherical.computeArea(feat.getGeometry()),
                        repinc: (function(){
                            if (feat.getProperty(appdata.elections[elec_id].prev+"_n") === undefined || feat.getProperty(elec_id+"_n") === undefined || parseInt(feat.getProperty(appdata.elections[elec_id].prev+"_n")) == 0 || parseInt(feat.getProperty(elec_id+"_n")) == 0) {
                                return "<span style='font-style:italic;color:#777;'>N/A</span>";
                            } else {
                                return (Math.round((parseInt(feat.getProperty(elec_id+"_n")) - parseInt(feat.getProperty(appdata.elections[elec_id].prev+"_n"))) * 10000 / parseInt(feat.getProperty(appdata.elections[elec_id].prev+"_n"))) / 100).toString() + "%";	 
                            }                        
                        }()),
                        turnout: (function(){
                            if (feat.getProperty(elec_id+"_to") === undefined || parseInt(feat.getProperty(elec_id+"_to")) == 0) {
                                return "<span style='font-style:italic;color:#777;'>N/A</span>";
                            } else {
                                return (Math.round(parseFloat(feat.getProperty(elec_id+"_to")) * 10000) / 100).toString() + "%";
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
            
            election_selector = new Menu({
                classed: {menu: 1, elecsel: 1},
                span: "vertical",
                options: _.map(appdata.elections, function(val, key) {
                    return {
                        id: key,
                        name: val.label,
                        desc: val.desc,
                        scale_type: val.scale_type,
                        action: load_election,
                        disabled: val.disabled
                    };
                }),
                margin: {
                    top: 89,
                    bottom: 100,
                    left: 10,
                    right: 100        
                },                
                container: topglass,
                width: Math.round(d3.select("#title-bg").attr("width"))
            });
            
            div_selector = new Menu({
                classed: {menu: 1, divsel: 1},
                span: "horizontal",
                options: [
                    {id: "parroquias", name: "PARISHES", action: load_div},
                    {id: "municipios", name: "MUNICIPAL.", action: load_div},
                    {id: "estados", name: "STATES", action: load_div}
                ],
                margin: {
                    top: 68,
                    left: 10                    
                },
                container: topglass,
                width: d3.select("#title-bg").attr("width") / 3,
                height: 15,
                text_yoffset: 11
            });
            
            legend = new ColorLegend({
                swatch_size: 10,
                intrapadding: 3,                
                position: {
                    top: 15,
                    right: 110 
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
                format: function(val) {return Math.round(val*100)+"%"},
            });
            
            ///////////////////////////////////////////////////////////////////////////////////////////
            
            // called when a division type is selected
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
            
            // called when an election is selected
            function load_election(option) {

                selected_election = option;
                var elec_id = option.id;
                
                /*
                var values = _.filter(_.map(_.values(appdata.demographic), function(v) {return parseFloat(v[selection])}), _.isFinite);               
                var mean = ss.mean(values);
                var std_dev = ss.standard_deviation(values);
                */
                
                var color_scale;
                if (option.scale_type == 'sequential') {
                    // Sequential color scale - http://colorbrewer2.org/?type=sequential&scheme=BuGn&n=9
                    var color_range = ["#F7FCFD", "#E5F5F9", "#CCECE6", "#99D8C9", "#66C2A4", "#41AE76", "#238B45", "#006D2C", "#00441B"];
                    color_scale = d3.scale.linear()
                        .domain(color_range.map(function(e,i) {return i/(color_range.length-1)}))
                        .range(color_range)
                        .clamp(true);
                } else { // assume diverging color scale
                    // Diverging color scale - http://colorbrewer2.org/?type=diverging&scheme=RdBu&n=10
                    var color_range = ["#053061", "#2166ac", "#4393c3", "#92c5de", "#d1e5f0", "#fddbc7", "#f4a582", "#d6604d", "#b2182b", "#67001f"];                    
                    color_scale = d3.scale.linear()
                        .domain(color_range.map(function(e,i) {return i/(color_range.length-1)}))
                        .range(color_range)
                        .clamp(true);
                }
           
                map.data.forEach(function(feat) {
                    var id = feat.getId();
                    var val = feat.getProperty(elec_id+"_c");
                    if (val && val != 0) {
                        feat.setProperty('color', color_scale(val));
                    } else {
                        feat.setProperty('color', '#666');                        
                    }                    
                });
                
                // update legend
                legend.set_scale(color_scale);
                legend.render();
                
                // update description
                d3.select("#description").html(option.desc);
            }
                        
            election_selector.render();
            div_selector.render();
            
            // auto-load first menu option
            load_div(div_selector.options[0]);
            d3.select(".divsel .option").classed({selected:true});
            load_election(election_selector.options[election_selector.options.length-1]);
            d3.select(".elecsel .option:last-child").classed({selected:true});
            
        }]
    
    }, function(err) {
        if (err) console.error(err);
    });
    
});
