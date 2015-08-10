---
title: Thematic map with geojson2svg
author: gagan
email: gaganbansal123@gmail.com 
date: 2015-03-15
template: article.jade
tags: ['geojson', 'svg', 'maps', 'geojson2svg', 'thematic-map', 'data-visualization']
localcss: ['./css/maps.css']
---
In my previous blog [Basic map with geojson2svg][2] we have seen that how easily we can create svg world map using [geojson2svg][1]. The previous map was a basic map without any information of any country. Now we are going to create world population map showing low, medium and high population countries with different colors. 

## 

First I am showing the output, countries population thematic map color-coded as low, medium and high.
<ul id="legend">
  <li> <span class="box l"></span><span class="label">Low</span>
  <li> <span class="box m"></span><span class="label">Medium</span>
  <li> <span class="box h"></span><span class="label">High</span>
</ul>
<div id="mapArea" style="width: 100%;height:50%;border: 1px solid #c0c0c0;"> 
  <svg id="map" xmlns="http://www.w3.org/2000/svg" x="0" y="0" >
  </svg>
</div>
<script type="text/javascript" src="./js/build.min.js"></script>

Now the approach for the map creation is assemble the data (geojson and population) then convert to svg and render on maps with styles required.

**Please clone the project [blog2-thematic-map][6] so that while going through this blog you can execute also.**

Code below shows the HTML component from [map1.html][8] for the above map. 

```javascript 
<ul id="legend">
  <li> <span class="box l"></span><span class="label">Low</span>
  <li> <span class="box m"></span><span class="label">Medium</span>
  <li> <span class="box h"></span><span class="label">High</span>
</ul>
<div id="mapArea" style="width: 100%;height:50%;border: 1px solid #c0c0c0;"> 
  <svg id="map" xmlns="http://www.w3.org/2000/svg" x="0" y="0" >
  </svg>
</div>
<script type="text/javascript" src="./js/build.js"></script>
```

We'll discuss each step of the JavaScript code [main.js][9] in detail, the first is the data i.e. geographic boundaries of countries and population of each country. As discussed in the last blog, geojson is well suited for countries' boundaries. Though geojson has a structure to store the attributes of the feature like population, I prefer to store the feature information in a separate json file. Advantage is that we have to maintain just one geojson file and any information can be linked at run time. To join geojson with json I am using module [extend-geojson-properties][3]. Let's see the code now:

```javascript
 1 var $ = require('jquery'),
 2   geojson2svg = require('geojson2svg'),
 3   parseSVG = require('parse-svg'),
 4   extendGeoJSON = require('extend-geojson-properties');
 5 
 6 // get countires geojson data and population data
 7 $.when(
 8   $.getJSON('./data/countries.geo.json'),
 9   $.getJSON('./data/population.json')
10 ).then(drawGeoJSON, function() {
11   console.log('data not found');
12 })
```

In first four lines we just include the modules that we _require_. Then with ajax' _promise_ approach I fetch geojson and population json data. The response from the both request are passed in _drawGeoJSON_ function. Next in _drawGeoJSON_ function we'll see how to join the geojson and json data.

```javascript
14 function drawGeoJSON(respGeojson,respPopulation) {
15   var geojson = respGeojson[0],
16     population = respPopulation[0];
17   // extend geojson properties with country's population
18   var joinMap = {
19     geoKey: 'properties.name',
20     dataKey: 'countryName'
21   };
22   extendGeoJSON(geojson,population.countries,joinMap);
```

In jQuery's ajax response objects _respGeojson_ and _respPopulation_, zeroth value is _data_. Now we need to join the geojson and population data. [extend-geojson-properties][3] is very simple module for this purpose, we have to just specify the joining keys for each in _joinMap_. This module is function that accepts parameters, first - geojson (_geojson_), second - json data set (_population_) and third - object of join keys (_joinMap_). The function extends all the json fields of json data set to geojson properties object. You can read more about extend-geojson-properties module [here][7].

Now we need to convert geojson to svg:

```javascript
24   // get the width and height of svg element.
25   // as the width of the map container is 100%, we have to set the width and 
26   // height of the svgElement as per the current width/height of the container.
27   var container = document.getElementById('mapArea'),
28     width = container.offsetWidth,
29     svgMap = document.getElementById('map');
30   svgMap.setAttribute('width', width);
31   svgMap.setAttribute('height', width * 0.5);
32   // initiate geojson2svg 
33   var convertor = geojson2svg(
34     {width: width, height: width * 0.5},
35     {
36       mapExtent: {
37         left: -180,
38         right: 180,
39         bottom: -90,
40         top: 90
41       }
42     }
43   );
```
In the above code we initialize the [geojson2svg][4] instance as explained in the last blog [Basic map with geojson2svg][2].

Next we categorize every feature according to the population and convert to svg by assigning css class accordingly.

```javascript
44   // process every feature
45   geojson.features.forEach(function(f) {
46     var popCat, svgString, svg;
47     if (f.properties.population <= 30000000) {
48       popCat = 'low';
49     } else if ( f.properties.population > 30000000
50     && f.properties.population <= 60000000) {
51       popCat = 'medium';
52     } else {
53       popCat = 'high';
54     }
55     svgString = convertor.convert(
56       f,
57       {attributes: {'class': popCat}});
58     svg = parseSVG(svgString);
59     svgMap.appendChild(svg);
60   });
61 }
```

For each feature we first check to which category the feature belongs. Once we get the category (_popCat_) feature is converted to svg string (_svgString_) by _convert_  function. Two parameters are passed to this function first - feature (_f_) and second options. In options here we are passing the svg class name that will apply the style to svg according to population category (line no 57). Here _attributes_ are the attributes of svg DOM element, we can pass any attribute while converting the geojson as per our requirement. Next (line 58) with _parse-svg_ module svg string is converted to svg DOM element and then appended to main svg element (_svgMap_). And we are done, our thematic map is ready.  

The map included in this blog is svg map generated from the above code.  

**Note: Each article in this blog is an individual project. Here is the [source code][6] for this article. In the source repository there are maps[n].html files that are used to show maps in the blog.**

[1]: https://github.com/gagan-bansal/geojson2svg
[2]: http://maps-on-blackboard.com/articles/blog1-basic-map/
[3]: https://www.npmjs.com/package/extend-geojson-properties
[4]: https://www.npmjs.com/package/geojson2svg
[5]: https://www.npmjs.com/package/parse-svg
[6]: https://github.com/maps-on-blackboard/blog2-thematic-map/
[7]: https://github.com/gagan-bansal/extend-geojson-properties
[8]: https://github.com/maps-on-blackboard/blog2-thematic-map/blob/master/map1.html
[9]: https://github.com/maps-on-blackboard/blog2-thematic-map/blob/master/js/main.js 
