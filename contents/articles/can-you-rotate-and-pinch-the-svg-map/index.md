---
title: Can you rotate and pinch the SVG map?
author: gagan
email: gaganbansal123@gmail.com 
date: 2015-08-02
template: article.jade
tags: ['geojson', 'svg', 'maps', 'geojson2svg', 'thematic-map', 'data-visualization','rotate-map','interactive-maps', 'maps-navigation','rotate','pan', 'drag','pinch', 'zoom', 'emptymap.js','hammer.js']
localcss: ['./css/maps.css']
---
As I am writing the blog you might have guessed that answer is going to be yes. I mean not only drag, pinch and rotation but also retrieving map's view (center coordinate, zoom level/ resolution and rotation angle) after applying many touch operations. So I want to create all maps navigation features and along with handling of maps view state in maps coordinate system. In some of my previous articles like [Thematic map with geojson2svg][1] and [Interactive map for data visualization][2] I have explained how easily we can create the SVG maps with GeoJSON data. In this article I'll implement [emptymap.js][3] with [Hammer.js][4] to achieve maps navigation.

 
## 

Maps navigation is composition of two concepts, screen interaction and maps rendering. Screen interactions are pinch, drag, double tap and rotation. The second part is maps rendering according to the screen interaction like double tap as zoom in and drag as pan. Hammer.js is wonderful library for screen interactions, it support all touch interactions/gestures with appropriate measurements like drag/pan as movement in pixels in x and y direction. So given movement in pixels how much should the map be shifted? For this purpose I have developed the [emptymap.js][3] module. As the name suggests it does not contain the maps rather helps in maps navigation. emptymap.js helps in calculating the [transformation matrix][5] for given drag movement or other interactions measurement. This transformation matrix can be set to SVG as CSS transform property or SVG attribute to achieve the interaction effect on maps. emptymap.js also maintains the maps current state so at any point of time you can retrieve the maps view values center, zoom level/resolution and rotation.    

Before discussing the code in detail let's pinch and rotate this SVG map: 
<pre id="viewJSON" style="background-color:#eee;font-size:12px;"> View </pre>
<div id="mapArea">
  <div class="pannel">
    <div id="zoomin" class="icon">
     <span>+</span> 
    </div>
    <div id="zoomout" class="icon">
     <span class="left-margin">-</span> 
    </div>
  </div> 
  <div id="viewPort" >
    <svg id="map" xmlns="http://www.w3.org/2000/svg" x="0" y="0" width="100%" height="100%">
      <g id="worldpop"></g>
    </svg>
  </div>
</div>  
<ul id="legend">
  <li> Population map </li>
  <li> <span class="box l"></span><span class="label"> &lt;&#61; 30m</span>
  <li> <span class="box m"></span><span class="label"> &gt; 30m and &lt;&#61; 60m</span>
  <li> <span class="box h"></span><span class="label"> &gt; 60m</span>
</ul>
**Use [this map](./map1.html) to emulate touch for desktop.**
<script type="text/javascript" src="./js/build.min.js"></script>

Here is the HTML component of the map:
```html
<div id="mapArea" >
  <div class="pannel"> 
    <div id="zoomin" class="icon"><span>+</span></div>
    <div id="zoomout" class="icon"><span class="left-margin">-</span></div>
  </div> 
  <div id="viewPort" >
      <svg id="map" xmlns="http://www.w3.org/2000/svg" 
        x="0" y="0" width="100%" height="100%">
        <g id="worldpop"></g>
      </svg>
    </div>
  </div>
</div> 
```

The `viewport` div would be used to capture the screen interaction with Hammer.js and the group `worldpop` in svg would be used to draw the SVG map. Hammer.js instance would calculate the measurement of interaction in `viewport` and instance of emptymap.js would be used to calculate the transformation matrix. 

Seems simplified as we have separated the interaction part and maps calculations, for interaction part any other library can also be used. I'll focus here in detail the implementation of emptymap.js. Complete code base is available on [github][6] and [this][7] is the main JavaScript file for the map. We'll discuss all important functions/code now.

First we need to set map's view i.e. setting the map's center, zoom and rotation. emptymap.js has this facility or function to set desired view. Another critical thing is rendering the geojson data on SVG that I achieve with [geojson2svg][8], check my previous articles. `drawGeoJSON`  function is the function that does maps rendering. 

Now setting the map's initial view: 
```javascript
 10 vp = document.getElementById('viewPort');
 11 size = {width: vp.offsetWidth, height: vp.offsetHeight};
 12 emap = new emptyMap(size);
 13 emap.setView({
 14   view: {"center":[1104009.9356444478,4736381.1012214925],"zoom":2,"rotation":-20},
 15   callback: function(err,state) {
 16     if(err) {
 17       console.log('setview err: '+ err);
 18       return;
 19     }
 20     var svgLayer = document.getElementById('worldpop');
 21     svgLayer.setAttribute('transform', 'matrix('+state.matrix.join(', ')+')');
 22     //show maps current view above map
 23     document.getElementById('viewJSON').innerHTML = JSON.stringify(
 24       state.map.getView(),null, 2);
 25     // get countires geojson data and population data
 26     $.when(
 27       $.getJSON('./data/countries.geo.json'),
 28       $.getJSON('./data/population.json')
 29     ).then(drawGeoJSON, function() {
 30       console.log('data not found');
 31     })
 32   }
 33 });
```

First we initiate emptymap.js instance by passing the size of viewport div. In any function of emptymap.js pixel coordinates should be with respect to viewport, read [API of emptymap.js][9] in detail. You can also pass the projection extent if projection is other than spherical mercator. To set the initial map's view `.setView` function is used and parameters are passed as object. There are wo parameters in the passed object, one is obviously the view itself whereas center coordinates are in projected coordinate system and rotation is degrees clock wise positive. The second parameter is callback function, lets understand this clearly. The function gets passed two arguments first error object and second is the map's state after setting the view. The `state` argument is: 
```
{
  matrix: array of 6 transformation coefficients for svg map
  tileMatrix: array of 6 transformation coefficient for tile map
  map: reference to the map itself
}
```
So `matrix` key has the matrix transformation values. We attach this matrix' values to `worldPop` group of SVG as transform property and the svg group is scaled, rotated and translated to desired position. For any other interaction function of emptymap.js also we need to pass callback function. And that function get passed same error and map's state, so we can make maps state handler as a function: 
```javascript
 41 function handleMapState(err,state) {
 42   if(err) {
 43     console.log('map state error: '+ err);
 44     return;
 45   }
 46   var svgLayer = document.getElementById('worldpop');
 47   svgLayer.setAttribute('transform','matrix('+state.matrix.join(', ')+')');
 48   //show maps current view above map
 49   document.getElementById('viewJSON').innerHTML = JSON.stringify(
 50     state.map.getView(),null, 2);
 51 }
```
Hammerjs' event object has event (interaction) center coordinates relative to the upper-left corner of the browser's client area. That need to be converted as relative to map's viewprot. `getEventCenterPx` is used for that. 
```javascript
 34 function getEventCenterPx(ev) {
 35   var viewPort = document.getElementById('viewPort');
 36   return [
 37     ev.center.x - viewPort.getBoundingClientRect().left,
 38     ev.center.y - viewPort.getBoundingClientRect().top];
 39 }
``` 

Now we'll check how the interactions or gestures are handled with Hammerjs. There is nice [documentation][10] also available for Hammerjs. Hammer is quite flexible library to handle the screen as well as mouse interaction. First create Hammer instance by passing the map's viewport div then attach event handler. 

Now lets look at the panning of map. First we initiate the Hammer instance and add pan gesture.
```javascript
 54 var viewPort = document.getElementById('viewPort');
 55 var mc = new Hammer.Manager(viewPort);
 56 mc.add( new Hammer.Pan({
 57   direction: Hammer.DIRECTION_ALL,
 58   threshold: 0,
 59   pointers: 1,
 60   preventDefault: true
 61 }) );
```

Now the pan event's handlers are:
```javascript
 62 var lastDelta = {x: 0, y: 0};
 63 mc.on('panstart', function(ev) {
 64   console.log('panstart');
 65   lastDelta = {x: 0, y: 0};
 66 });
 67 mc.on('pan', function(ev) {
 68   var cont = document.getElementById('container');
 69   emap.applyDeltaMove({
 70     deltaX: ev.deltaX - lastDelta.x,
 71     deltaY: ev.deltaY - lastDelta.y,
 72     callback: handleMapState
 73   });
 74   lastDelta.x = ev.deltaX;
 75   lastDelta.y = ev.deltaY;
 76 });
```
In Hammer callback's event(`ev`) object `deltaX` and `deltaY` are from starting of the pan event. But we want to apply the continues pan so I store the last delta while pan is in action and sort of recalculating the delta move (for x: `ev.deltaX - lastDelta.x`) that has not been applied to map. So now implementation is simple just pass deltaX, deltaY and map state handler (`handleMapState`) to `.applyDeltaMove` API and your map is pan enabled for touch screen (mobile, tab etc) or desktop. 

Aren't we excited, what about zoom in on double tap. Not difficult, use `.applyDeltaScaleRotation` API, pass the tapped position on viewport and scale factor. In case of zoom in scale factor should be 2. Finally our callback `handleMapState` will set the zoomed in map.
```javascript
 79 mc.add(new Hammer.Tap({event: 'doubletap',taps: 2}));
 80 mc.on('doubletap', handleDoubleTap);
 81 function handleDoubleTap(ev) {
 82   console.log('doubletapped');
 83   var tapX = ev.center.x - viewPort.getBoundingClientRect().left;
 84   var tapY = ev.center.y - viewPort.getBoundingClientRect().top;
 85   emap.applyDeltaScaleRotation({
 86     position: [tapX, tapY],
 87     factor: 2,
 88     callback: handleMapState
 89   });
 90 }
```
Now we are too excited lets pinch and rotate the map. For pinch and rotation to work simultaneously there is function in Hammer `.recognizeWith` and used like this:
```javascript
 92 var pinch = new Hammer.Pinch();
 93 var rotate = new Hammer.Rotate(
 94   {event:'rotate',pointers:2,threshold: 0});
 95 pinch.recognizeWith(rotate);
 96 mc.add(pinch);
 97 mc.add(rotate);
```

Like `lastDelta` for pan, `lastScale` and `lastRot` are used to store the intermediate scale during pinch and rotation respectively. Pinch and rotation both are handled by `.applyDeltaScaleRotation` API of emptymap.js. In case of pinch pass scale factor to which the map would be zoomed in or zoomed out. And in case of rotation we pass the rotation angle in degrees clockwise positive. Again `handleMapState` callback function set the map's state to SVG map. Check the detailed code for pinch and rotation interaction/gesture handler [here][7]. 

Now I think for zoom in/out buttons you can easily guess what should be the click event handler function. Yes its `.applyDeltaScaleRotation` with scale factor 2 for zoom in and scale factor 0.5 for zoom out.

I hope your SVG map is navigable now with pinch, drag and rotation. 

**Note: Each article in this blog is an individual project. Here is the [source code][6] for this article's map.**

[1]: http://maps-on-blackboard.com/articles/blog2-thematic-map/
[2]: http://maps-on-blackboard.com/articles/interactive-map/
[3]: https://github.com/gagan-bansal/emptymap.js
[4]: http://hammerjs.github.io/
[5]: https://developer.mozilla.org/en/docs/Web/SVG/Attribute/transform
[6]: https://github.com/maps-on-blackboard/can-you-rotate-and-pinch-the-svg-map
[7]: https://github.com/maps-on-blackboard/can-you-rotate-and-pinch-the-svg-map/blob/master/js/main.js
[8]: https://www.npmjs.com/package/geojson2svg
[9]: https://github.com/gagan-bansal/emptymap.js/blob/master/README.md
[10]: http://hammerjs.github.io/getting-started/














