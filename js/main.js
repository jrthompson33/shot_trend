/**
 * Created by John Thompson
 */

(function(){

    // The global objects for the visualization
    main = {};
    data = {'geo':{'pebble':{}}};

    var chart, svg, height, width, shotlink;

    /**
     * Initialize the visualization
     * @param params - functions as the context of the tool
     */
    main.init = function (params) {
        main.tools = [oTool,rTool,cTool,aTool,pTool,sTool,tTool];

        //tip = d3.tip()
        //    .attr('class', 'd3-tip')
        //    .offset([-10, 0])
        //    .html(function(d) {
        //        var dist = parseFloat(Math.round(d.shot['distance']/36 * 100) / 100).toFixed(2) + " yd";
        //        if(d.shot['from_location_scorer']=='Green'||d.shot['from_location_scorer']=='Fringe')dist = parseFloat(Math.round(d.shot['distance']/12 * 100) / 100).toFixed(2) + " ft";
        //        return "<strong>Club:</strong> <span style='color:greenyellow'>" + d.shot['club'] + "</span><br>"
        //            +"<strong>From:</strong> <span style='color:whitesmoke'>" + d.shot['from_location_scorer'] + "</span><br>"
        //            +"<strong>Distance:</strong> <span style='color:whitesmoke'>" + dist+"</span>";
        //    });
        //
        //svg.call(tip);

        shotlink = d3.geo.mercator()
            .center([-121.9366373, 36.5651794])
            .scale(1650000)
            .translate([729,1408]);

        var m = matrix(0.09799246148686,0,0,-0.09799246148686,-284.2,2437.7);
        shotlink.reverse = function(p){
            return shotlink.invert(m(p[0],p[1]));
        };

        // Load the data after we've set up the vis
        main.loadData(params, function(){
            // Initialize all of the helper tools for the visualization
            main.tools.forEach(function(t){t.init(params);});

            // Have the relevant tools draw the visualization
            oTool.draw(params);
        });
    };

    main.loadData = function(params, callback) {
        // Load data for the visualization here

        var loadShots = function(){
            d3.csv('data/shot_trend_data.csv', function(e,datum){
                // Error loading the csv file
                if(e)console.log('Issue loading shotlink data.');

                // Load shots for Pebble beach
                data.shots = datum.filter(function(d){return d['course_id']==='5';});

                // Find the geolocation for each shot
                data.shots.forEach(function(s){
                    s.geo = shotlink.reverse([convNum(s['x']),convNum(s['y'])]);
                });

                // Nest the shots for each round, hole and player
                var rounds = d3.nest()
                    .key(function(d){return d['round'];})
                    .key(function(d){return d['player_id'];})
                    .key(function(d){return d['hole'];})
                    .entries(data.shots);

                data.rounds = [];

                rounds.forEach(function(t){
                    t.values.forEach(function(r){
                        var holes = [];
                        var rs = 0;
                        r.values.forEach(function(h,i){
                            var hole = new Hole(h.values[0],rs, data.camera.holes[i], data.holes);
                            rs = hole.roundScore;
                            var strokes = [];
                            h.values.forEach(function(s){
                                strokes.push(new Stroke(s,hole));
                            });
                            hole.setStrokes(strokes);
                            holes.push(hole);
                        });
                        data.rounds.push(new Round(r.values[0].values[0],holes));
                    });
                });

                data.rounds.sort(function(a,b){return b.numStrokes - a.numStrokes;});

                data.rounds = data.rounds.slice(0,30);

                var start = new Date(2015,0,1);
                var end = new Date();

                data.rounds.forEach(function(r,i){
                    r.date = randomDateSkewed(start,end,(Math.floor(i/5))/6);
                    r.holes.forEach(function(h){
                        h.strokes.forEach(function(s){
                            s.date = r.date;
                        });
                    });
                });


                // Callback to the init function to start the tool
                callback();

            });
        };

        var loadCameras = function(){
            d3.json('data/pebble_hole_cameras.json', function(e,d){
                // Error loading the json file
                if(e)console.log('Issue loading camera data.');

                // Load the camera data for each hole
                data.camera = d;

                // Loop through each hole to generate geo positions and rotations for showing on the map
                data.camera.holes.forEach(function(h){
                    h.geo = shotlink.reverse([convNum(h['hole_target_x']),convNum(h['hole_target_y'])]);
                    h.camera = shotlink.reverse([convNum(h['hole_camera_x']),convNum(h['hole_camera_y'])]);
                    h.url = 'img/holes_2016_005_005_overhead_full_'+ h['hole_id']+'.png';
                    h.greenUrl = 'img/holes_2016_005_005_overhead_green_'+ h['hole_id']+'.png';
                    var img = new Image();
                    img.onload = function(){
                        h.imageWidth = img.width/600*400;
                        h.imageHeight = img.height/600*400;
                        var t = [convNum(h['hole_target_x']), convNum(h['hole_target_y']), convNum(h['hole_target_z'])];
                        var c = [convNum(h['hole_camera_x']), convNum(h['hole_camera_y']), convNum(h['hole_camera_z'])];
                        var d = Math.sqrt(Math.pow(c[0]-t[0],2)+Math.pow(c[1]-t[1],2)+Math.pow(c[2]-t[2],2));
                        var a = Math.atan2((c[1]-t[1]),(c[0]-t[0]));
                        var e = Math.asin((c[2]-t[2])/d);
                        var beta =  Math.PI/2 - e;
                        var y = a + Math.PI/2;
                        var tau = (convNum(h['hole_roll']))*Math.PI/180;
                        var fov = convNum(h['hole_fov'])*Math.PI/180;

                        var rotZ0 = math.matrix([[Math.cos(tau),Math.sin(tau),0],[-Math.sin(tau),Math.cos(tau),0],[0,0,1]]);
                        var rotZ1 = math.matrix([[Math.cos(y),Math.sin(y),0],[-Math.sin(y),Math.cos(y),0],[0,0,1]]);
                        var rotX = math.matrix([[1,0,0],[0,Math.cos(beta),Math.sin(beta)],[0,-Math.sin(beta),Math.cos(beta)]]);

                        var proj = math.multiply(math.multiply(rotZ0,rotX),rotZ1);
                        var imgDist = (200)/(Math.tan(fov/2));


                        h.iproj = math.inv(proj);
                        h.dist = d;
                        h.scale = imgDist;
                    };
                    img.src = h.url;
                    if(!img.complete || img.readyState != 4) img.onload();
                });

                // Load the shots
                loadShots();
            });
        };

        var loadHoles = function(){
            d3.json('data/pebble_hole_locations.json',function(e,d){
                // Error loading the json file
                if(e)console.log('Issue loading hole location data.');

                var courseId = 5;

                data.holes = [];
                for(var r = 0; r < d.length; r++){
                    for(var h = 0; h < d[r].length; h++) {
                        data.holes.push(new CourseHole(d[r][h],courseId,r,h));
                    }
                }
                // Keep loading data
                loadCameras();
            });
        };

        d3.json('data/pebble_osm.json',function(e,d){
            // Error loading the topojson file
            if(e)console.log('Issue loading Open Street Map data.');

            // Load the features from topojson - expands them into geojson
            var p = topojson.feature(d, d['objects']['cypress']).features;
            // Filter out all objects that are not golf
            var all = p.filter(function(f){
                return 'properties' in f
                    && ('golf' in f['properties']
                    || ('leisure' in f['properties']
                    && 'golf_course' == f['properties']['leisure']));
            });

            // Load polygons into the geo dataset - seperate by their golf type
            data.geo.pebble.bunker = all.filter(function(f){return ('golf' in f['properties'] && f['properties']['golf']==='bunker')});
            data.geo.pebble.tee = all.filter(function(f){return ('golf' in f['properties'] && f['properties']['golf']==='tee')});
            data.geo.pebble.fairway = all.filter(function(f){return ('golf' in f['properties'] && f['properties']['golf']==='fairway')});
            data.geo.pebble.green = all.filter(function(f){return ('golf' in f['properties'] && f['properties']['golf']==='green')});
            data.geo.pebble.course = all.filter(function(f){return ('leisure' in f['properties'] && f['properties']['leisure']==='golf_course')});

            // Keep loading data
            loadHoles();
        });
    };

    main.resizeWindow = function() {
        var h = $(window).height() - $('.navbar.navbar-default').height();
        var w = $(window).width();
        var params = {width:w,height:h};
        $('#main').height(h).width(w);

        // Resize the visualization
        main.tools.forEach(function(t){t.resizeWindow(params);});
    };

    function matrix(a, b, c, d, tx, ty) {
        return function(x, y) {return [a * x + b * y + tx, c * x + d * y + ty];}
    }
})();
