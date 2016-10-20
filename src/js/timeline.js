var settings = {
  width: 800,
  height: 100,

  top_margin: 23,
  bottom_margin: 40,
  left_margin: 50,
  right_margin: 100,

  dot_size: 3,
  selected_dot_size: 5,
  selected_dot_color: '#BD660A',
  dot_spacing: 15,
  selected_dot_spacing: 110,
  font_size: 12,
  selected_font_size: 18,
  short_color: '#b8a87c',
  long_color: '#c78435',

  anim_duration: 400
};

var choices = {
  'pr98': {
    short: '1998',
    long: '1998 Presidential'
  },
  'rf99': {
    short: '1999',
    long: '1999 Referendum'
  },
  'pr00': {
    short: '2000',
    long: '2000 Presidential'
  },
  'rc04': {
    short: '2004',
    long: '2004 Referendum'
  },
  'rg04': {
    short: '2004',
    long: '2004 Regional'
  },
  'pr06': {
    short: '2006',
    long: '2006 Presidential'
  },
  'rf07': {
    short: '2007',
    long: '2007 Referendum'
  },
  'rg08': {
    short: '2008',
    long: '2008 Regional'
  },
  'rf09': {
    short: '2009',
    long: '2009 Referendum'
  },
  'pm10': {
    short: '2010',
    long: '2010 Parliamentary'
  },
  'pr11': {
    short: '2011',
    long: '2011 Primary'
  },
  'pr12': {
    short: '2012',
    long: '2012 Presidential'
  },
  'pr13': {
    short: '2013',
    long: '2013 Presidential'
  },
  'pm15': {
    short: '2015',
    long: '2015 Parliamentary'
  }
};

var selected_choice = 'pm15';

var svg, dotnav, timeline;

$(function() {

  svg = d3.select('#header').append('svg')
    .style('position', 'absolute')
    .attr('width', settings.width)
    .attr('height', settings.height);

  dotnav = svg.append('g')
    .attr('transform', 'translate(0,' + (settings.top_margin) + ')');

  timeline = dotnav.append('line')
    .attr('class', 'timeline')
    .attr('x1', 0)
    .attr('y1', 0)
    .attr('x2', settings.left_margin + (_.keys(choices).length - 1) * (settings.dot_spacing * 2) + (settings.selected_dot_spacing * 2) + settings.right_margin)
    .attr('y2', 0);

  render_dot_navigation();

});

/////////////////////////////////////////////////////////////////////////////////////////////////////

function render_dot_navigation() {

  var choice_pairs = _.toPairs(choices);
  var selected_idx = _.findIndex(choice_pairs, function(d) {
    return d[0] === selected_choice;
  });

  var choice_trans = function(d, i) {
    if (i < selected_idx) {
      return 'translate(' + (settings.left_margin + (i * settings.dot_spacing * 2)) + ',0)';
    } else if (i === selected_idx) {
      return 'translate(' + (settings.left_margin + (i * settings.dot_spacing * 2) + settings.selected_dot_spacing) + ',0)';
    } else if (i > selected_idx) {
      return 'translate(' + (settings.left_margin + (i * settings.dot_spacing * 2) + settings.selected_dot_spacing * 2) + ',0)';
    }
  };

  var text_trans = function(d) {
    if (d[0] === selected_choice) {
      return 'translate(10,' + (17 + settings.selected_dot_size) + ') rotate(0)';
    } else {
      return 'translate(-3,' + (7 + settings.dot_size) + ') rotate(45)';
    }
  };

  var choice = dotnav.selectAll('g.choice')
    .data(choice_pairs);

  choice
    .transition().duration(settings.anim_duration)
    .attr('transform', choice_trans);

  choice.select('rect')
    .attr('x', function(d) {
      return (d[0] === selected_choice ? -settings.selected_dot_spacing : 0) - settings.dot_size * 2;
    })
    .attr('width', function(d) {
      return d[0] === selected_choice ? settings.selected_dot_spacing * 2 + settings.dot_spacing * 2 : settings.dot_spacing * 2;
    });

  choice.select('circle.dot')
    .classed({
      'dot': true,
      'selected': function(d) {
        return d[0] === selected_choice;
      }
    })
    .transition().duration(settings.anim_duration)
    .attr('r', function(d) {
      return d[0] === selected_choice ? settings.selected_dot_size : settings.dot_size;
    })
    .style('stroke', function(d) {
      return d[0] === selected_choice ? settings.selected_dot_color : '#aaaaaa';
    })
    .style('fill', function(d) {
      return d[0] === selected_choice ? settings.selected_dot_color : '#ffffff';
    });

  choice.select('text')
    .style('text-anchor', function(d) {
      return d[0] === selected_choice ? 'middle' : 'start';
    })
    .style('fill', function(d) {
      return d[0] === selected_choice ? settings.long_color  : settings.short_color ;
    })
    .text(function(d) {
      return d[0] === selected_choice ? d[1].long : d[1].short;
    })
    .transition().duration(settings.anim_duration)
    .attr('transform', text_trans)
    .styleTween("font-size", function(d) {
      if (d[0] === selected_choice) {
        return d3.interpolate(0, settings.selected_font_size);
      } else {
        return d3.interpolate(settings.font_size, settings.font_size);
      }
    });

  var choiceEnter = choice.enter().append('g')
    .attr('class', 'choice')
    .attr('transform', choice_trans)
    .on('click', function(d) {
      selected_choice = d[0];
      render_dot_navigation();
      load_election(_.find(election_options, function(opt) {return opt.id === d[0]}));
    });

  choiceEnter.append('rect')
    .attr('class', 'trect')
    .attr('x', function(d) {
      return (d[0] === selected_choice ? -settings.selected_dot_spacing : 0) - settings.dot_size * 2;
    })
    .attr('y', -settings.top_margin)
    .attr('width', function(d) {
      return d[0] === selected_choice ? settings.selected_dot_spacing * 2 + settings.dot_spacing * 2 : settings.dot_spacing * 2;
    })
    .attr('height', settings.top_margin + settings.bottom_margin);

  choiceEnter.append('circle')
    .classed({
      'dot': true,
      'selected': function(d) {
        return d[0] === selected_choice;
      }
    })
    .attr('cx', 0)
    .attr('cy', 0)
    .attr('r', function(d) {
      return d[0] === selected_choice ? settings.selected_dot_size : settings.dot_size;
    })
    .style('stroke', function(d) {
      return d[0] === selected_choice ? settings.selected_dot_color : '#aaaaaa';
    })
    .style('fill', function(d) {
      return d[0] === selected_choice ? settings.selected_dot_color : '#ffffff';
    });

  choiceEnter.append('text')
    .attr('transform', text_trans)
    .style('text-anchor', function(d) {
      return d[0] === selected_choice ? 'middle' : 'start';
    })
    .style('font-size', function(d) {
      return d[0] === selected_choice ? settings.selected_font_size : settings.font_size;
    })
    .style('fill', function(d) {
      return d[0] === selected_choice ? settings.long_color : settings.short_color;
    })
    .text(function(d) {
      return d[0] === selected_choice ? d[1].long : d[1].short;
    });
}
