// define some variables in the global scope
var w = 0 // chart width
  , h = 0 // chart height
  , chart = d3.select("#chart") // save a selection for the chart
  , svg = chart.append("svg") // save a selection for the svg within the chart
  // topojson file containing the country boundaries for the world
  , worldBoundariesURL = "https://raw.githubusercontent.com/Ryshackleton/json_resources/master/world-topo-min.json"
  // json feed for earthquake data: all earthquakes past day:
, earthquakesJSON = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson";

// color scale for the earthquakes
// color scale from: http://colorbrewer2.org/?type=sequential&scheme=OrRd&n=9
var eqDomain = [-1, 0, 1, 2, 3, 4, 5, 6, 9 ];
var eqColorScale = d3.scale.linear()
                       .domain(eqDomain)
                       .range(['#fff7ec','#fee8c8',
                             '#fdd49e','#fdbb84',
                             '#fc8d59','#ef6548',
                               '#d7301f','#b30000','#7f0000'
                              ]);  
var eqSizeScale = d3.scale.linear()
                    .domain(eqDomain)
                    .range([1,1,1.5,3,4.5,6,7.5,9,13.5])
           


var buildEarthquakeMap = function() {
  
  // width / height of svg in pixels
  w = document.getElementById('chart').clientWidth;
  h = document.getElementById('chart').clientHeight;

  var projection = d3.geo.mercator()
      .scale((w - 1) / 2 / Math.PI)
      .translate([w/2, h/2]);
  
  // size the svg appropriately
  svg.attr({
      width: w,
      height: h
    });
   
  // Draw the world map boundaries
  d3.json(worldBoundariesURL, function(err,world) {
    if (err) {
      throw err;
    }
    var path = d3.geo.path()
      .projection(projection);

    // country boundaries as paths
    var countryBoundaries = svg.selectAll("path");

    // remove all previous country boundaries: on resize, we need to redraw from scratch
    // (could probably transition this nicely, but that's not the focus of this animation)
    countryBoundaries.remove();

    // append the data 
    countryBoundaries.data(topojson.feature(world,                             world.objects.countries).features) .enter()
      .append("path")
      .attr("class", "countries")
      .attr("d", path);

    // DRAW EARTHQUAKES 
    d3.json(earthquakesJSON, function(err, json) {
      if (err) {
        throw err
      }
      // Filter out any data with no geometry info 
      var earthquakes = json.features.filter(
        function(d) {
          return d.geometry !== null;
        }
      );
      
      // earthquake times in json are descending,
      // so reverse the array so we're
      // moving forward in time (faster than sort)
      earthquakes.reverse();
      
      // get the circle selection and add the data
      var circles = svg.selectAll("circle")
         .remove() // this clears any existing circles we have, which will need updated x/y data on resize
         .data(earthquakes);
      
      
      // on the enter selection, add x,y, radius, and color
      circles.enter()
        .append("circle")
        .attr("cx", function(d) {
              return projection(d.geometry.coordinates)[0];
            })
        .attr("cy", function(d) {
              return projection(d.geometry.coordinates)[1];
            })
        .attr("r", 0)
        .transition()
        .duration(900)
        .delay(function(d,i){ return 200*i; })
        .ease('elastic')
        .attr("r", function(d) {
              return eqSizeScale(d.properties.mag);
            }) 
        .style("fill", function(d) {
                return eqColorScale(d.properties.mag);
            })
        .attr("class", "earthquake");
      
      // remove any exit selection
      circles.exit().remove();
      
    addMagnitudeLegend();
    });      
  });   
}

var update = function() {
  buildEarthquakeMap();
};

var addMagnitudeLegend = function()
{
  // create a list of objects representing a legend entry
  // so we can add x,y coordinates to each object and apply text
  // to each magnitude circle:
  // example here: http://stackoverflow.com/questions/11857615/placing-labels-at-the-center-of-nodes-in-d3-js
  var legendObjs = [];
  eqDomain.forEach(function(d,i) {
     legendObjs[i] = { mag: d };
  });
  
  // some sizing and location info
  var lNodeSize = 40;
  var lXOffset = 15; 
  var lYOffset = 5;
  var lTopLeft = [lXOffset, h - lNodeSize - lNodeSize / 3 - lYOffset ];
  var lBottomRight = [ (lNodeSize + 1) * legendObjs.length, h - lYOffset];
  
  // add a bounding rectangle
  svg.append("svg:rect")
      .attr("class", "legend-box")
      .attr("width", lBottomRight[0] - lTopLeft[0] + "px")
      .attr("height", lBottomRight[1] - lTopLeft[1])
      .attr("transform","translate("+lTopLeft[0]+","+lTopLeft[1]+")");
   
  // append the data and get the enter selection
  var lnodes = svg.append("svg:g")
      .selectAll("g") 
      .data(legendObjs, function(d,i){ return d.mag; })
      .enter();
          
  // append the circles to the enter selection
  lnodes.append("circle")
        .attr("r", function(d){ return eqSizeScale(d.mag); })
        .attr("class", "earthquake")
        .style("fill", function(d){ return eqColorScale(d.mag); })
        .attr("transform", function(d, i) {
                               d.x = 2 * lXOffset + lNodeSize * i;
                               d.y = lBottomRight[1] - lNodeSize / 2;
                               return "translate("
                                        + d.x + ","+ d.y 
                                        + ")";
                            });
  // append the text to each "svg:g" node, which also contains a circle
  lnodes.append("text")
        .text(function(d) { return "M"+d.mag; })
        .attr("class", "legend-mag-text")
        .attr("text-anchor", "middle" )
        // the transform here contains an offset from the
        // middle of the g element, which is also the middle of the circle
        .attr("transform", function(d) {
                                return "translate("
                                   + d.x + ","
                                   + (d.y-15) + ")"; });
}

window.addEventListener("resize", update);

update();
