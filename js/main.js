var $ = require('jquery'),
  geojson2svg = require('geojson2svg'),
  parseSVG = require('parse-svg'),
  extendGeoJSON = require('extend-geojson-properties');

// get countires geojson data and population data
$.when(
  $.getJSON('./data/countries.geo.json'),
  $.getJSON('./data/population.json')
).then(drawGeoJSON, function() {
  console.log('data not found');
})

function drawGeoJSON(respGeojson,respPopulation) {
  var geojson = respGeojson[0],
    population = respPopulation[0];
  // extend geojson properties with country's population
  var joinMap = {
    geoKey: 'properties.name',
    dataKey: 'countryName'
  };
  extendGeoJSON(geojson,population.countries,joinMap);

  // get the width and height of svg element.
  // as the width of the map container is 100%, we have to set the width and 
  // height of the svgElement as per the current width/height of the container.
  var container = document.getElementById('mapArea'),
    width = container.offsetWidth,
    svgMap = document.getElementById('map');
  svgMap.setAttribute('width', width);
  svgMap.setAttribute('height', width * 0.5);
  // initiate geojson2svg 
  var convertor = geojson2svg(
    {width: width, height: width * 0.5},
    { 
      mapExtent: {
        left: -180,
        right: 180,
        bottom: -90,
        top: 90
      }
    }
  );
  // process every feature
  geojson.features.forEach(function(f) {
    var popCat, svgString, svg;
    if (f.properties.population <= 30000000) {
      popCat = 'low';
    } else if ( f.properties.population > 30000000 
    && f.properties.population <= 60000000) {
      popCat = 'medium';
    } else {
      popCat = 'high';
    }
    svgString = convertor.convert(
      f,
      {attributes: {'class': popCat}});
    svg = parseSVG(svgString);
    svgMap.appendChild(svg);
  });
}
