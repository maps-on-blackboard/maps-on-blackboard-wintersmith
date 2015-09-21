---
title: Rotate and pinch OSM map with geojson data
author: gagan
email: gaganbansal123@gmail.com 
date: 2015-09-21
template: article.jade
tags: ['gagan-bansal','geojson', 'svg', 'maps', 'geojson2svg', 'thematic-map', 'data-visualization','rotate-map','interactive-maps', 'maps-navigation','rotate','pan', 'drag','pinch', 'zoom', 'emptymapjs','hammerjs']
localcss: ['./css/maps.css']
---
Here goes the fully navigable (pinch, drag and rotate) OSM map overlaid with GeoJSON data. In fact many framework support that (except rotation) where you can configure source of the map tiles and your sloppy map is ready. While here my effort is to make the maps application modular you should be able to choose your own choice of modules like for interaction use Hammer.js or jQuery Touchy.
</br>
</br>
Two of my previous articles [Can you rotate and pinch the SVG map?][0] and [Map of OSM tiles with rotation][1] explain maps navigation of SVG map and mapping of OSM tiles respectively. For SVG map navigation I had used [emptymap.js][3] for maps calculations and [Hammer.js][4] for screen interaction. To make map with OSM tiles I had used [map-the-tiles][11] that calculates the image tiles for given map center, zoom and rotation. 

Now I have created a navigable map with OSM tiles and GeoJSON data overlaid as SVG. emptymap.js module has the functionality to handle maps interactions on SVG (scalable layer) and image tiles (non-scalable layer) by applying the transformation matrix to respective HTML elements. These two previous articles [Can you rotate and pinch the SVG map?][0] and [Map of OSM tiles with rotation][1] explains in detail the concept and functionality of emptymap.js and map-the-tiles. So please go through these articles before continuing here.
 
## 

I am excited to show the map first then in detail we'll discuss the code.
<pre id="viewJSON" style="background-color:#eee;font-size:12px;"> View </pre>

<div id="map" class="rt-map">
  <div class="pannel">
    <div id="zoomin" class="icon">
     <span>+</span> 
    </div>
    <div id="zoomout" class="icon">
     <span class="left-margin">-</span> 
    </div>
    <div id="anticlockwise" class="icon">
      <img src="./img/counterclockwise.png" />
    </div>
    <div id="clockwise" class="icon">
      <img src="./img/clockwise.png" />
    </div>
  </div> 
  <div class="credit">Icons made by <a href="http://www.flaticon.com/authors/linh-pham" title="Linh Pham">Linh Pham</a> from <a href="http://www.flaticon.com" title="Flaticon">www.flaticon.com</a> is licensed by <a href="http://creativecommons.org/licenses/by/3.0/" title="Creative Commons BY 3.0">CC BY 3.0</a>, Map Tiles © <a href="//www.openstreetmap.org/copyright">OpenStreetMap</a> contributors</div>
  <div class="rt-viewport">
    <div class="rt-nonscalable-stack">
      <div class="rt-tile-stack">
        <div id="osm" class="rt-tile-layer"></div> 
      </div>
    </div>
    <div class="rt-scalable-stack">
      <svg class="rt-svg" xmlns="http://www.w3.org/2000/svg" x="0" y="0" width="100%" height="100%">
        <g class="rt-svg-stack"></g>
      </svg>
    </div>
  </div>
</div> 
<ul id="legend">
  <li> Population map </li>
  <li> <span class="box l"></span><span class="label"> &lt;&#61; 30m</span>
  <li> <span class="box m"></span><span class="label"> &gt; 30m and &lt;&#61; 60m</span>
  <li> <span class="box h"></span><span class="label"> &gt; 60m</span>
</ul>
<script type="text/javascript" src="./js/build.min.js"></script>

Here is the HTML component of the map:
```html
<div id="map" class="rt-map">
  <div class="rt-viewport">
    <div class="rt-nonscalable-stack">
      <div class="rt-tile-stack">
        <div id="osm" class="rt-tile-layer"></div> 
      </div>
    </div>
    <div class="rt-scalable-stack">
      <svg class="rt-svg" xmlns="http://www.w3.org/2000/svg" x="0" y="0" width="100%" height="100%">
        <g class="rt-svg-stack"></g>
      </svg>
    </div>
  </div>
</div> 
```

There are two way to render the map one is with SVG that can be scaled and other way is pre rendered png image or rendering on canvas. In second option we can not scale the data at browser. So handling of navigation (zoom, pan and rotation) is slightly different for each. Transformation matrix is calculated in [emptymap.js][3] for given interaction at viewport. The calculated  matrix values are attached to the scalable stack and SVG is scaled accordingly. Same transformation matrix can also be applied to the non scalable stack also during the interaction. So while zooming in map tile images would be scaled if same transformation is applied but we need to load the new map tiles at every increment of the zoom level or end of interaction. Reloading the map tiles is done in two steps first we apply another transformation matrix (tileMatrix) that emptymap.js passes in callback. This (tileMatrix) transformation matrix contains only rotation. Now in second step set of tiles to cover viewport for given maps' center, zoom and rotation can be calculated with help of [map-the-tiles][11] module.

Now we'll see what changes are done in two previous articles code base to get the combined map of SVG and map tiles. You can go through the complete code in [main.js][13] file.

In `loadTiles` function we attach `tileMatrix` to map tiles container div with plain JavaScript. And in `getTiles` function we pass rotation also along with center and zoom.     
```javascript
263   var cont = document.querySelector('.rt-nonscalable-stack');
264   cont.style.transform = 'matrix('+ tileMatrix.join(',') + ')';
265   var tiles = tiler.getTiles(
266     {x:view.center[0], y: view.center[1]}, 
267     view.zoom,
268     view.rotation
269   );
```

To handle the map's state after or during interaction `handleMapState` function is used
```javascript
 58 function handleMapState(err,state,refreshTiles) {
 59   if(err) {
 60     console.log('map state error: '+ err);
 61     return;
 62   }
 63   var svgLayer = document.querySelector('.rt-svg-stack');
 64   svgLayer.setAttribute('transform','matrix('+state.matrix.join(', ')+')');
 65   var cont = document.querySelector('.rt-nonscalable-stack');
 66   cont.style.transform = 'matrix('+ state.tileMatrix.join(',') + ')';
 67   if (refreshTiles) {
 68     emap.resetTileMatrix({
 69       callback: function(err, state) {
 70         loadTiles(state.map.getView(), state.tileMatrix,'osm');
 71       }
 72     });
 73   }
 74   //show maps current view above map
 75   document.getElementById('viewJSON').innerHTML = JSON.stringify(
 76     state.map.getView(),null, 2);
 77 }
``` 

During the interaction `state.matrix` (line 66) is attached to tile container div. At the end of interaction `refreshTiles` is set `true` and now `state.tileMatrix` is attached insisted of `state.matrix`.

Another case where change is required is pinch. At the end of pinch event its not necessary that scale change is multiple of 2 or aligned with map tile resolution. So first we need to get nearest zoom level then set that zoom level to the map and load tiles. Here is snippet for 'pinchend' event callback:

```javascript
147 mc.on('pinchend', function(ev) {
148   console.log('pinchend');
149   var view = emap.getView();
150   console.log('nearest zoom: '+ emap.getNearestZoom());
151   view.zoom = emap.getNearestZoom();
152   emap.setView({
153     view: view,
154     callback: function(err, state) {
155       var svgLayer = document.querySelector('.rt-svg-stack');
156       svgLayer.setAttribute('transform','matrix('+state.matrix.join(', ')+')');
157       loadTiles(state.map.getView(), state.tileMatrix,'osm');
158       //show maps current view above map
159       document.getElementById('viewJSON').innerHTML = JSON.stringify(
160       state.map.getView(),null, 2);
161     }
162   });
163 });
```

So we get a fully navigable map with combination of different modules. Well there is lot of coding but at the end you get very flexible map that you can bend very easily the way you want. Basically for data visualization applications where a standard map is very boring and will not server your purpose as you always need a new way for presenting the data such type of modular code is very handy. 

**Note: Each article in this blog is an individual project. Here is the [source code][14] for this article's map.**
[0]: http://maps-on-blackboard.com/articles/can-you-rotate-and-pinch-the-svg-map/
[1]: http://maps-on-blackboard.com/articles/osm-tiles-map-with-rotation/
[3]: https://github.com/gagan-bansal/emptymap.js
[4]: http://hammerjs.github.io/
[11]: https://github.com/gagan-bansal/map-the-tiles
[13]: https://github.com/maps-on-blackboard/rotate-and-pinch-osm-map-with-geojson-data/blob/master/js/main.js
[14]: https://github.com/maps-on-blackboard/rotate-and-pinch-osm-map-with-geojson-data













