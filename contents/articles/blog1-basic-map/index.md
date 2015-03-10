---
title: Basic map with geojson2svg
author: gagan
email: gaganbansal123@gmail.com 
date: 2015-03-06
template: article.jade
---
Now a days its very easy to publish a map using online API like Google maps or using open framework OpenLayers or Leaflet with OSM data. Mapbox and CartoDB make the map publishing even more simplified. So where does this tool [geojson2svg] [1] stands in mapping domain?

## 

To understand this first let us go through the components involved in online maps publishing. Here we are considering only maps creation or rendering on browser with HTML, JavaScript and SVG. Maps publishing with static image tiles is different concept, map created with Mapbox is an example of this. Here is an [example] [2] of online map using JavaScript components by The New York Times. So there are different scenarios where each of the method has advantages over other. Generally for data visualization on maps JavaScript components are preferred due to dynamic rendering and  interaction capabilities .

Now let us break up the map publishing with JavaScript into different components. The first one is geographic data itself, there are many open data source for spatial data. Important thing is the format that is supported by JavaScript and obvious choice is GeoJSON. Third (yes second after this) component is rendering of geographic or geometry features. To draw geometry features, SVG supports all type of shapes and styling functionality as well. Now the only thing required is conversion from GeoJSON to SVG, yes this is the second component.  [geojson2svg][1] serves this purpose. There is forth and the last component navigation i.e. zoom and pan. To visualize the data of higher depth map navigation helps a lot like showing population for different administrative levels. 

In this blog series I will demonstrate how a map can be published with different open source modules keeping in mind above mentioned four components. This approach gives flexibility to developers to choose and play with the component of their choice like there are many SVG tools and library for drawing and styling. Easily different animations also can be achieved.

To start with here we<single quote>ll draw a plain map using geojson. Here is the map container div:

```html
1 <div id="mapArea" class="blackboard" style="width: 100%;border: 1px solid #c0c0c0;"> 
2   <svg id="map" xmlns="http://www.w3.org/2000/svg" width="100%" x="0" y="0" >
4   </svg>
5 <div>
6 <script type="text/javascript" src="./js/build.min.js"></script>
```

``div#mapArea`` is map container div and ``svg#map`` is the actual svg where We'll add features. ``build.min.js`` is the file containing our all code including the modules required. But our main file is [main.js][3] that contains the actual code you need to write for map publishing. So now I<single quote>ll explain the code in ``main.js``

First we have to get the geojson. Jquery getJSON is simple and very useful method for this.

```javascript
1  var $ = require('jquery'),
2  geojson2svg = require('geojson2svg'),
3  parseSVG = require('parse-svg');
4
5  // get wountires geojson data
6  $.getJSON('./data/countries.geo.json',drawGeoJSON);
7
```

First three lines are for the modules that we _**require**_ for this code, wherever these are used I<single quote>ll explain.

Next we fetch countries' boundaries (MultyPolygon) geojson using Jquery ``getJSON`` method. ``drawGeoJSON`` is callback function. Following is the code for ``drawGeoJSON`` 

```javascript
 8 function drawGeoJSON(geojson) {
 9 
10   // get the width and height of svg element.
11   // as the width of the map container is 100%, we have to set the width and 
12   // height of the svgElement as per the current width/height of the container.
13   var container = document.getElementById('mapArea'),
14     width = container.offsetWidth,
15     svgMap = document.getElementById('map');
16   svgMap.setAttribute('width', width);
17   svgMap.setAttribute('height', width*.5);
```
Map container and svg container width has to be responsive. I mean width of the map should be according to device width and proportionately I set the map height. 

Now second component i.e. conversion of geojson to SVG. For this I am using the module [geojson2svg][4].  

```javascript
18   // convert geojson to svg string 
19   var convertor = geojson2svg(
20     {width: width, height: width},
21     {
22       attributes: {
23         'style': 'stroke:#006600; fill: #F0F8FF;stroke-width:0.5px;',
24       },
25       mapExtent: {
26         left: -180,
27         right: 180,
28         bottom: -90,
29         top: 90
30       }
31     }
32   );
33   var svgStrings = convertor.convert(geojson);
34
```

To initiate an instance of geojson2svg first parameter(line 20) is svg viewport size and the second object of options. First option _**attributes**_ (line 22) is svg attributes here we are passing svg polygon _**style**_ that will be attached to each country path(svg node path). Second option is _**mapExtent**_ (line 25) i.e. very clear map extent. _**convert**_ API of geojson2svg convert the geojson to array of SVG path strings. I'll describe in detail geojson2svg module a later blog.

Now for rendering on the map each SVG string has to be converted into DOM elements. For this I am using a module [parse-svg][5] and each svg DOM element is appended to main SVG element.   

```javascript  
37   // parse each svg string and append to svg element 
38   svgStrings.forEach(function(svgStr) {
39     var svg = parseSVG(svgStr);
40     svgMap.appendChild(svg);
41   });
42 }

```

And here is our simple map of countries that we created using geojson2svg.

<div id="mapArea" class="blackboard" style="width: 100%;height:50%;border: 1px solid #c0c0c0;"> 
  <svg id="map" xmlns="http://www.w3.org/2000/svg"
    width="100%" height="50%" x="0" y="0" >
  </svg>
</div>
<script type="text/javascript" src="./js/build.js"></script>

This map is actual map generated from the above code, please check this page source code. 

**Note: Each article in this blog is an individual project. Here is the [source code][6] for this article. In the source repository there are maps[n].html files that are used to show maps in the blog.**

[1]: https://github.com/gagan-bansal/geojson2svg
[2]: http://www.nytimes.com/2014/08/16/upshot/mapping-migration-in-the-united-states-since-1900.html?abt=0002&abg=0
[3]: https://github.com/maps-on-blackboard/maps-on-blackboard.github.io/blob/master/src/contents/articles/basic-map/js/main.js
[4]: https://www.npmjs.com/package/geojson2svg
[5]: https://www.npmjs.com/package/parse-svg
[6]: https://github.com/maps-on-blackboard/blog1-basic-map/ 
