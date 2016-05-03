/**
 * Created by John Thompson
 */

(function () {

    // Global object that can be called by other methods
    rTool = {};

    var svg, height, width, roundG, shotsG, tipG, mapG, imgG, annotG, teaseG, backList, frontList, prev, next, backHole;

    var similarYardage = 25, similarFeet = 5;

    var compareMode = false;

    var cDist = {scale:d3.scale.linear()};
    var cDir = {scale:d3.scale.linear()};
    var cRound = {scale:d3.time.scale()};
    cDist.axis = d3.svg.axis().scale(cDist.scale).orient('left');
    cDir.axis = d3.svg.axis().scale(cDir.scale).orient('left');
    cRound.axis = d3.svg.axis().scale(cRound.scale).orient('bottom');


    var currRound, currHole, currStroke;

    var projection, path;


    var zoom = d3.behavior.zoom()
        .scaleExtent([1, 100])
        .on("zoom", zoomed);

    /**
     * Initialize the tool
     * @param params - the context of the visualization
     */
    rTool.init = function (params) {
        var content = d3.select('#rp-hole-vis');
        height = params.height || 500;
        width = params.width*0.75 || 960;
        content.selectAll("svg").data([{height: height, width: width}]).enter().append("svg");
        svg = content.select("svg")
            .attr("height", function(d) {return d.height;})
            .attr("width", function(d) {return d.width;});

        //svg.call(tip);

        frontList = $('#rp-hole-list .list-container > ul.front');
        backList = $('#rp-hole-list .list-container > ul.back');

        zoom.scale(1650000);

        var defs = svg.append('defs');

        var filter = defs.append('filter')
            .attr('id','drop-shadow2')
            .attr('x',0).attr('y',0)
            .attr('width','120%').attr('height','150%');

        filter.append('feOffset')
            .attr('in', 'SourceAlpha')
            .attr('dx', 0.2).attr('dy',0.8)
            .attr('result', 'offOut');

        filter.append('feGaussianBlur')
            .attr('result', 'blurOut')
            .attr('in', 'offOut')
            .attr('stDeviation',10);

        filter.append('feBlend')
            .attr('in','SourceGraphic')
            .attr('in2', 'blurOut')
            .attr('mode', 'normal');

        imgG = svg.append('g');

        var pattern = [];
        for(var i = 0; i < 5; i++) {
            for(var j = 1; j < 5; j++) {
                pattern.push([j*500,i*500]);
            }
        }
        var select = imgG.append('g')
            .attr('transform', 'translate(-1000,-1000)')
            .selectAll('.pattern')
            .data(pattern);

        var enter = select.enter()
            .append('svg:image')
            .attr('xlink:href', 'pattern.png')
            .attr('width', 500)
            .attr('height', 500)
            .attr('class', 'pattern')
            .attr('transform', function(d){return 'translate('+d+')';});

        mapG = svg.append('g')
            .attr('opacity', 0.5);

        roundG = svg.append('g');

        teaseG = roundG.append('g')
            .attr('class','tease');

        shotsG = roundG.append('g');

        tipG = roundG.append('g')
            .attr('class', 'tip');

        annotG = svg.append('g');

        prev = annotG.append('g')
            .attr('class', 'rp-hole-vis-btn prev')
            .attr('transform','translate('+(width-300)+',10)');

        prev.append('path')
            .attr('class', 'bg-rect')
            .attr('d',leftRoundedRect(0,0,125,32,2));

        prev.append('path')
            .attr('class', 'chevron')
            .attr('d','M14,10.5l-4,6l4,6');

        prev.append('text')
            .attr('x',125/2+8).attr('y',18)
            .text('Previous Hole');

        prev.append('path')
            .attr('class', 'bg-hover')
            .attr('d',leftRoundedRect(0,0,125,32,2));

        prev.on('mouseout',function(){d3.select(this).attr('class', 'rp-hole-vis-btn prev');})
            .on('mouseenter',function(){d3.select(this).attr('class', 'rp-hole-vis-btn prev hover');})
            .on('click',function(){
                if(compareMode) prevCompare();
                else rTool.prevHole()
            });

        next = annotG.append('g')
            .attr('class', 'rp-hole-vis-btn next')
            .attr('transform','translate('+(width-165)+',10)');

        next.append('path')
            .attr('class', 'bg-rect')
            .attr('d',rightRoundedRect(0,0,125,32,2));

        next.append('path')
            .attr('class', 'chevron')
            .attr('d','M111,10.5l4,6l-4,6');

        next.append('text')
            .attr('x',125/2-8).attr('y',18)
            .text('Next Hole');

        next.append('path')
            .attr('class', 'bg-hover')
            .attr('d',rightRoundedRect(0,0,125,32,2));

        next.on('mouseout',function(){d3.select(this).attr('class', 'rp-hole-vis-btn next');})
            .on('mouseenter',function(){d3.select(this).attr('class', 'rp-hole-vis-btn prev hover');})
            .on('click',function(){
                if(compareMode) nextCompare();
                else rTool.nextHole()
            });

        backHole = annotG.append('g')
            .attr('class', 'rp-hole-vis-btn')
            .style('display','none')
            .attr('transform','translate(30,10)');

        backHole.append('path')
            .attr('class', 'bg-rect')
            .attr('d',leftRoundedRect(0,0,125,32,2));

        backHole.append('path')
            .attr('class', 'chevron')
            .attr('d','M14,10.5l-4,6l4,6');

        backHole.append('text')
            .attr('x',125/2+8).attr('y',18)
            .text('Back to Hole');

        backHole.append('path')
            .attr('class', 'bg-hover')
            .attr('d',leftRoundedRect(0,0,125,32,2));

        backHole.on('mouseout',function(){d3.select(this).attr('class', 'rp-hole-vis-btn');})
            .on('mouseenter',function(){d3.select(this).attr('class', 'rp-hole-vis-btn hover');})
            .on('click',function(){
                exitCompare();
            });

        svg.call(zoom);
    };

    rTool.draw = function(params) {
        projection = d3.geo.mercator()
            .center([-121.9366373, 36.5651794])
            .scale(1650000)
            .translate([width / 2, height / 2]);

        path = d3.geo.path()
            .projection(projection);

        currRound = params.round?params.round:data.rounds[29];

        // TODO set up the name of the round, move the svg and display back to Rounds
        $('#backToRounds').css('visibility','visible');
        $('#navTitle').text('Round at Pebble Beach GL ('+moment(currRound.date).fromNow()+')');
        $('.navbar-svg').css({margin:'-42px 0 0 25%','left':'-240px'});

        // need to add the in & out into scorecard
        ko.cleanNode(document.getElementById('rp-hole-list'));
        backList.empty().load('templates/hole.html li');
        frontList.empty().load('templates/hole.html li', function() {
            ko.applyBindings(currRound, document.getElementById('rp-hole-list'));
            rTool.holeClick($('.front .rp-hole-item:first-child'),currRound.holes[0]);
        });

    };

    rTool.backToRounds = function(){
        $('#panel-overview').addClass('active');
        $('#panel-round').removeClass('active');

        $('#backToRounds').css('visibility','hidden');
        $('#navTitle').text('Shot Trend');
        $('.navbar-svg').css({margin:'-78px 0 0 100%','left':'-240px'});
    };

    rTool.nextHole = function(){
        var h = (currHole.hole!=18)?currHole.hole:0;
        var hole = (h<9)?$('.list-container ul.front li:eq('+h+')'):$('.list-container ul.back li:eq('+(h-9)+')');
        rTool.holeClick(hole,currRound.holes[h]);
    };

    rTool.prevHole = function(){
        var h = (currHole.hole!=1)?currHole.hole-2:17;
        var hole = (h<9)?$('.list-container ul.front li:eq('+h+')'):$('.list-container ul.back li:eq('+(h-9)+')');
        rTool.holeClick(hole,currRound.holes[h]);
    };

    rTool.holeClick = function(e,d) {
        if(compareMode)exitCompare(true);
        $('.rp-hole-item.selected').removeClass('selected');
        $(e).addClass('selected');
        currHole = d;

        resetZoom();
        drawHole();
        drawShots();
    };

    rTool.resizeWindow = function(params) {
        height = params.height || 500;
        width = $('#rp-hole-vis').width() || 960;
        svg.attr("height", height)
            .attr("width", width);

        // TODO recenter or readjust the current hole display
    };

    function resetZoom() {

        var t = [width/2-currHole.camera.imageWidth/2,
                    height/2-currHole.camera.imageHeight/2];

        // reset the zoom
        zoom.scale(1).translate(t);

        // translate the strokes view
        imgG.attr('transform', 'translate('+t+')');
        roundG.attr('transform', 'translate('+t+')');
    }

    function drawHole(){

        var select = imgG.selectAll('.hole-map')
            .data([currHole.camera], function(d){return d['hole_id'];});

        var enter = select.enter();

        enter.append('svg:image')
            .attr('class', 'hole-map')
            .attr('xlink:href', function(d){return d.url})
            .attr('height',function(d){return d.imageHeight})
            .attr('width',function(d){return d.imageWidth});

        select.exit().remove();

        var p = (currHole.hole!==1)?currHole.hole-1:18;
        var n = (currHole.hole!==18)?currHole.hole+1:1;
        prev.select('text').text('Hole '+p);
        next.select('text').text('Hole '+n);

        // TODO draw tee and flag

    }

    function drawShots(){

        var select = shotsG.selectAll('.stroke')
            .data(currHole.pairs, function(d){return d.shot.id;});

        var enter = select.enter().append('g')
            .attr('class', 'stroke');

        enter.append('circle')
            .filter(function(d){return d.shot.strokeType=='S';})
            .attr('class', function(d){return 'stroke-circle-outer s'+ d.shot['shot']+' '+ d.shot['from_location_scorer'];})
            .attr('cx', function(d){return d.shot.cam[0];})
            .attr('cy', function(d){return d.shot.cam[1];})
            .attr('r', 3.6);

        enter.append('circle')
            .filter(function(d){return d.shot.strokeType=='S';})
            .attr('class', function(d){return 'stroke-circle-inner s'+ d.shot['shot']+' '+ d.shot['from_location_scorer'];})
            .attr('cx', function(d){return d.shot.cam[0];})
            .attr('cy', function(d){return d.shot.cam[1];})
            .attr('r', 2);

        enter.append('path')
            .filter(function(d){return d.shot.strokeType=='S';})
            .attr('class', function(d){return 'golfstroke id-'+ d.shot.id+' '+ d.shot['from_location_scorer'];})
            .attr('d', function(d){
                return d.shot.checkFrom('green')?('M'+d.from.cam+'L'+ d.to.cam):('M'+d.from.cam+'Q'+ d.mid+' '+d.to.cam);
            });

        //TODO Add overlay distance or putts for each stroke

        select.exit().remove();

        select = annotG.selectAll('.stroke-panel-title')
            .data([currHole], function(d){return d.id;});

        enter = select.enter().append('g')
            .attr('class', 'stroke-panel-title');

        enter.append('rect')
            .attr('height', 20)
            .attr('width', 76)
            .attr('rx',2).attr('ry',2)
            .attr('transform', function(d,i){return 'translate(42,10)';});

        enter.append('text').attr('x',66).attr('y',24).text('Strokes');

        enter.append('circle').attr('r', 4).attr('cx', 54).attr('cy',20);

        enter.append('path').attr('d', 'M23,32.5L34,20L48,20');

        select.exit().remove();

        select = annotG.selectAll('.stroke-panel')
            .data(currHole.pairs, function(d){return d.shot.id;});

        enter = select.enter().append('g')
            .attr('transform', function(d,i){return 'translate(42,'+(35+i*55)+')';})
            .attr('class', function(d){return 'stroke-panel id-'+ d.shot.id+' num-'+ d.shot.shotNumber;});

        enter.append('rect')
            .attr('class', 'bg-rect')
            .attr('height', 50).attr('width', 250)
            .attr('rx',2).attr('ry',2);


        enter.append('path').attr('d','M-19,-2.5L-19,19');

        enter.append('circle').attr('r', 4).attr('cx',-19).attr('cy', 25);

        enter.append('path')
            .filter(function(d,i){return !d.shot.inHole})
            .attr('d', 'M-19,31L-19,52.5');

        // Info about this stroke

        // distance
        enter.append('text').attr('class', 'distance').attr('x',7).attr('y',22)
            .text(function(d){return d.shot.distanceString();});

        // club
        enter.append('text').attr('class', 'club').attr('x',134).attr('y',22)
            .text(function(d){return d.shot.club;});

        // from
        enter.append('text').attr('class', 'label').attr('x',7).attr('y',44).text('from');
        enter.append('text').attr('class', 'location').attr('x',26).attr('y',44)
            .text(function(d){return d.shot.fromLocationString();});

        // to
        enter.append('text').attr('class', 'label').attr('x',134).attr('y',44).text('to');
        enter.append('text').attr('class', 'location').attr('x',145).attr('y',44)
            .text(function(d){return d.shot.toLocationString();});

        enter.append('rect')
            .attr('class', 'hover')
            .attr('height', 50).attr('width', 204)
            .on('mouseenter',function(d){shotsG.select('.golfstroke.id-'+d.shot.id).style('fill-opacity',0.3)})
            .on('mouseout',function(d){shotsG.select('.golfstroke.id-'+d.shot.id).style('fill-opacity',0.0001)});

        // set up compare shots
        enter.each(function(d,i){
            // TODO pretty poor programming style do this with a class
            d.similar = [];
            data.rounds.forEach(function(r){
                // Show tee shots
                if(i==0 && r.holes[currHole.hole-1].pairs[0].shot.strokeType=='S') d.similar.push(r.holes[currHole.hole-1].pairs[0]);
                else if(d.shot.checkFrom('green') && !d.shot.checkFrom('bunker')){
                    // TODO Strokes to hole out
                    r.holes[currHole.hole-1].pairs.forEach(function(p) {
                        if (p.shot.strokeType=='S'&&(Math.abs(d.shot.distanceToPinBefore - p.shot.distanceToPinBefore) < similarFeet * 12 && (p.shot.checkFrom('green') && !p.shot.checkFrom('bunker')))) {
                            d.similar.push(p);
                        }
                    });
                } else{
                    // Check all shots on hole to see if they're within 50 yds to pin
                    r.holes[currHole.hole-1].pairs.forEach(function(p){
                        if(p.shot.strokeType=='S'&&(Math.abs(d.shot.distanceToPinBefore - p.shot.distanceToPinBefore) < similarYardage*36 && !(p.shot.checkFrom('green') && !p.shot.checkFrom('bunker')))){
                            d.similar.push(p);
                        }
                    });
                }
            });
            d.similar = d.similar.sort(function(a,b){return a.shot.date.getTime()- b.shot.date.getTime();})
        });

        // compare link
        var compare = enter.append('g').attr('class', 'compare');
        compare.append('path').attr('d', rightRoundedRect(204,0,46,50,2));
        compare.append('text').attr('x',212).attr('y',17.8).text('compare');
        compare.append('text').attr('x',212).attr('y',29).text(function(d){return d.similar.length-1+' similar';});
        compare.append('text').attr('x',212).attr('y',40.2).text('shots');
        compare.append('path').attr('d', rightRoundedRect(204,0,46,50,2)).style('fill-opacity',0.0001);
        compare
            .on('click', compareStrokes)
            .on('mouseenter',teaseCompareStrokes)
            .on('mouseout',removeCompareTease);


        select.exit().remove();

    }

    function nextCompare(){
        exitCompare();
        var s = currHole.pairs[currStroke.shot.shotNumber];
        if(currStroke.shot.shotNumber == currHole.pairs.length){
            rTool.nextHole();
            s = currHole.pairs[0]
        }
        compareStrokes(s);
    }

    function prevCompare(){
        exitCompare();
        var i = currStroke.shot.shotNumber-2;
        var s;
        if(i<0){
            rTool.nextHole();
            s = currHole.pairs[currHole.pairs.length-1];
        } else {
            s = currHole.pairs[i];
        }
        compareStrokes(s);
    }

    function compareStrokes(stroke){
        compareMode = true;

        currStroke = stroke;

        // Set up the vis from the previous hole view
        backHole.style('display','block').select('text')
            .text('Back to Hole '+currHole.hole);

        var nText = (stroke.shot.shotNumber == currHole.pairs.length)?'Next Tee Shot':'Next Shot';
        var pText = (stroke.shot.shotNumber == 1)?'Prev. Putt':'Prev. Shot';
        next.select('text').text(nText);
        prev.select('text').text(pText);

        // Remove all of the
        annotG.selectAll('.stroke-panel-title,.stroke-panel').remove();
        teaseG.selectAll('.tease').remove();
        shotsG.selectAll('.stroke').remove();
        tipG.selectAll('.puttstroke-tip,.golfstroke-tip').remove();

        // Draw just this shot's stroke panel as a title

        select = annotG.selectAll('.stroke-panel')
            .data([stroke], function(d){return d.shot.id;});

        enter = select.enter().append('g')
            .attr('transform', function(d,i){return 'translate('+(width/2-105)+',10)';})
            .attr('class', function(d){return 'stroke-panel stroke-panel-'+ d.shot.id+'stroke-panel-'+ d.shot.shotNumber;});

        enter.append('rect')
            .attr('class', 'bg-rect')
            .attr('height', 50).attr('width', 210)
            .attr('rx',2).attr('ry',2);

        // Info about this stroke

        // distance
        enter.append('text').attr('class', 'distance').attr('x',7).attr('y',22)
            .text(function(d){return d.shot.distanceString();});

        // club
        enter.append('text').attr('class', 'club').attr('x',134).attr('y',22)
            .text(function(d){return d.shot.club;});

        // from
        enter.append('text').attr('class', 'label').attr('x',7).attr('y',44).text('from');
        enter.append('text').attr('class', 'location').attr('x',26).attr('y',44)
            .text(function(d){return d.shot.fromLocationString();});

        // to
        enter.append('text').attr('class', 'label').attr('x',134).attr('y',44).text('to');
        enter.append('text').attr('class', 'location').attr('x',145).attr('y',44)
            .text(function(d){return d.shot.toLocationString();});

        // If from the green then show the avg number of putts (strokes gained?)
        if(stroke.shot.checkFrom('green') && !stroke.shot.checkFrom('bunker')){

            //zoom to stroke
            zoomToStroke(stroke);

            cDist.property = function(d){return d.shot.shortLongPin/12};
            cDist.stringify = function(n){var abs = Math.abs(n);return n==0?'in hole':(n<0?'short ':'long ')+(abs<10?(abs<2?Math.round((abs*12))+' in':Math.round(abs)+' ft '+Math.round((abs*12)%12)+' in'):Math.round(abs)+' ft');};
            cDist.label = 'Short/Long from Pin (ft)';
            cDir.property = function(d){return d.shot.rightLeftPin/12};
            cDir.stringify = function(n){var abs = Math.abs(n);return n==0?'in hole':(n<0?'right ':'left ')+(abs<10?(abs<2?Math.round((abs*12))+' in':Math.round(abs)+' ft '+Math.round((abs*12)%12)+' in'):Math.round(abs)+' ft');};
            cDir.label = 'Right/Left of Pin (ft)';

            var avg = d3.mean(stroke.similar,function(d,i){return d.shot.holeOutNum()});

            var select = shotsG.selectAll('.stroke')
                .data([stroke], function(d){return d.shot.id;});

            var enter = select.enter().append('g')
                .attr('class', function(d){return 'stroke id-'+d.shot.id;});

            enter.append('circle')
                .attr('class', function(d){return 'stroke-circle-outer s'+ d.shot['shot']+' '+ d.shot['from_location_scorer'];})
                .attr('cx', function(d){return d.from.cam[0];})
                .attr('cy', function(d){return d.from.cam[1];})
                .attr('r', 3.6);

            enter.append('circle')
                .attr('class', function(d){return 'stroke-circle-inner s'+ d.shot['shot']+' '+ d.shot['from_location_scorer'];})
                .attr('cx', function(d){return d.from.cam[0];})
                .attr('cy', function(d){return d.from.cam[1];})
                .attr('r', 2);

            enter.append('circle')
                .attr('class', function(d){return 'stroke-circle-outer s'+ d.shot['shot']+' '+ d.shot['from_location_scorer'];})
                .attr('cx', function(d){return d.to.cam[0];})
                .attr('cy', function(d){return d.to.cam[1];})
                .attr('r', 3.6);

            enter.append('circle')
                .attr('class', function(d){return 'stroke-circle-inner s'+ d.shot['shot']+' '+ d.shot['from_location_scorer'];})
                .attr('cx', function(d){return d.to.cam[0];})
                .attr('cy', function(d){return d.to.cam[1];})
                .attr('r', 2);

            enter.append('path')
                .attr('class', function(d){return 'golfstroke compare s'+ d.shot['shot']+' '+ d.shot['from_location_scorer'];})
                .attr('d', function(d){
                    return d.shot.checkFrom('green')?('M'+d.from.cam+'L'+ d.to.cam):('M'+d.from.cam+'Q'+ d.mid+' '+d.to.cam);
                });

            var golfTip = shotsG.append('g')
                .attr('class','puttstroke-tip')
                .style('display','none');

            var goltTipScale = golfTip.append('g')
                .attr('class', 'scale-invert');

            goltTipScale.append('rect')
                .attr('height', 21).attr('width', 44)
                .attr('x', -54).attr('y',-10.5)
                .attr('rx',2).attr('ry',2);

            goltTipScale.append('path')
                .attr('d', 'M-4,0l-3,-2.4v6z');

            goltTipScale.append('text')
                .attr('class','value')
                .attr('x',-32)
                .attr('dy','-.25em');

            goltTipScale.append('text')
                .attr('x',-32)
                .attr('dy','1em')
                .style('font-size','6px')
                .style('font-weight','300')
                .text('to pin');

            var aim = currHole.courseHole.flag.cam;

            select = shotsG.selectAll('.aim-point')
                .data([stroke]);

            enter = select.enter().append('g')
                .attr('class', 'aim-point');

            enter.append('path')
                .style('stroke-dasharray', '0.5 0.25')
                .attr('d', function(d){
                    var a = Math.atan2(d.from.cam[1]-aim[1],d.from.cam[0]-aim[0]);
                    var p1 = [aim[0]+10*Math.cos(a),aim[1]+10*Math.sin(a)];
                    var p2 = [aim[0]-10*Math.cos(a),aim[1]-10*Math.sin(a)];
                    return 'M'+p1+'L'+p2;
                });

            enter.append('path')
                .style('stroke-dasharray', '0.5 0.25')
                .attr('d', function(d){
                    var a = Math.atan2(d.from.cam[1]-aim[1],d.from.cam[0]-aim[0])+Math.PI/2;
                    var p1 = [aim[0]+10*Math.cos(a),aim[1]+10*Math.sin(a)];
                    var p2 = [aim[0]-10*Math.cos(a),aim[1]-10*Math.sin(a)];
                    return 'M'+p1+'L'+p2;
                });

            select = teaseG.selectAll('.compare')
                .data(stroke.similar.filter(function(d){return d!=stroke;}), function(d){return d.shot.id;});

            enter = select.enter().append('g')
                .attr('class', function(d){return 'compare id-'+d.shot.id;})
                .on('mouseenter', function(d){
                    tip.style('display','block').attr('transform','translate('+(hm.l+cRound.scale(d.shot.date))+',0)');
                    tipDate.select('text').text(moment(d.shot.date).fromNow());
                    tipDist.attr('transform', 'translate(10,'+(cDist.scale(cDist.property(d))+vm.t+h+vm.m-5)+')rotate(-15)')
                        .select('text').text(cDist.stringify(cDist.property(d)));
                    tipDir.attr('transform', 'translate(10,'+(cDir.scale(cDir.property(d))+vm.t-5)+')rotate(-15)')
                        .select('text').text(cDir.stringify(cDir.property(d)));
                    teaseG.selectAll('.compare').style('opacity',0.1);
                    teaseG.selectAll('.compare.id-'+ d.shot.id).style('opacity',1)
                        .select('.golfstroke').style('display','block');
                    golfTip.style('display','block').attr('transform','translate('+d.from.cam+')')
                        .select('text.value').text(d.shot.fromDistanceString());
                    teaseG.selectAll('.compare.id-'+ d.shot.id+' .putt-align,.compare.id-'+ d.shot.id+' .golfball.putt.to, .compare.id-'+ d.shot.id+' .pin').style('display','block');
                })
                .on('mouseout', function(d){
                    tip.style('display','none');
                    golfTip.style('display','none');
                    teaseG.selectAll('.compare').style('opacity',1)
                        .select('.golfstroke').style('display','none');
                    chart.selectAll('.stat.id-'+ d.shot.id+' .select').style('opacity',0);
                    teaseG.selectAll('.compare.id-'+ d.shot.id+' .putt-align,.compare.id-'+ d.shot.id+' .golfball.putt.to, .pin').style('display','none');
                });

            enter.append('circle')
                .filter(function(d){return d.shot.strokeType === 'S';})
                .attr('class', 'golfball putt')
                .attr('r',4)
                .style('fill-opacity',0.8)
                .attr('cx',function(d){return d.from.cam[0];})
                .attr('cy',function(d){return d.from.cam[1];});

            enter.append('circle')
                .attr('class', 'pin')
                .style('display', 'none')
                .attr('r',5)
                .style('fill-opacity',0.8)
                .attr('cx',function(d){return d.shot.hole.courseHole.flag.cam[0];})
                .attr('cy',function(d){return d.shot.hole.courseHole.flag.cam[1];});

            enter.append('circle')
                .filter(function(d){return d.shot.strokeType === 'S' && !d.shot.inHole;})
                .attr('class', 'golfball putt to')
                .style('display', 'none')
                .attr('r',4)
                .style('fill-opacity',0.8)
                .attr('cx',function(d){return d.to.cam[0];})
                .attr('cy',function(d){return d.to.cam[1];});

            enter.append('path')
                .filter(function(d){return d.shot.strokeType === 'S';})
                .attr('class', 'golfstroke')
                .style('display', 'none')
                .attr('d', function(d) {
                    return 'M' + d.from.cam + 'L'+ d.to.cam;
                });

            enter.append('path')
                .filter(function(d){return d.shot.strokeType === 'S' && !d.shot.inHole;})
                .attr('class', 'putt-align')
                .style('display', 'none')
                .attr('d', function(d) {
                    var p = d.shot.hole.courseHole.flag.cam;
                    var f = d.from.cam;
                    var a = Math.atan2(p[1]-f[1],p[0]-f[0]);
                    var dx = Math.cos(a);
                    var dy = Math.sin(a);
                    var tx = Math.cos(a+(cDir.property(d)<0?-Math.PI/2:Math.PI/2));
                    var ty = Math.sin(a+(cDir.property(d)<0?-Math.PI/2:Math.PI/2));
                    var rl1 = [d.to.cam[0]+dx*0.8,d.to.cam[1]+dy*0.8];
                    var rl2 = [d.shot.rightLeftPoint[0]+dx*0.8,d.shot.rightLeftPoint[1]+dy*0.8];
                    var sl1 = [p[0]+tx*0.8,p[1]+ty*0.8];
                    var sl2 = [d.shot.rightLeftPoint[0]+tx*0.8,d.shot.rightLeftPoint[1]+ty*0.8];

                    return 'M'+rl1+'L'+rl2+'M'+rl1+'l'+(dx*0.15)+','+(dy*0.15)+'M'+rl1+'l'+(dx*-0.15)+','+(dy*-0.15)
                            + 'M'+rl2+'l'+(dx*0.15)+','+(dy*0.15)+'M'+rl2+'l'+(dx*-0.15)+','+(dy*-0.15)
                            + 'M'+sl1+'L'+sl2+' M'+sl1+'l'+(tx*0.15)+','+(ty*0.15)+'M'+sl1+'l'+(tx*-0.15)+','+(ty*-0.15)
                            + 'M'+sl2+'l'+(tx*0.15)+','+(ty*0.15)+'M'+sl2+'l'+(tx*-0.15)+','+(ty*-0.15);
                });

            enter.append('circle')
                .attr('class', 'putt hover')
                .attr('r',4)
                .attr('cx',function(d){return d.from.cam[0];})
                .attr('cy',function(d){return d.from.cam[1];});


            //var select = tipG.selectAll('.tease.puttstroke-tip')
            //    .data([avg], function(d){return d;});
            //
            //var enter = select.enter().append('g')
            //    .attr('class', 'puttstroke-tip')
            //    .attr('transform', 'translate('+stroke.from.cam+')');
            //
            //enter.append('rect')
            //    .attr('height', 22.8).attr('width', 54)
            //    .attr('x', 8).attr('y',-11.4)
            //    .attr('rx',2).attr('ry',2);
            //
            //enter.append('path')
            //    .attr('d', 'M4,0L7,-2.4,L7,2.4L4,0');
            //
            //enter.append('text')
            //    .attr('x', 14).attr('y',-0.8)
            //    .text(function(d){return parseFloat(Math.round(d * 100) / 100).toFixed(2)+' putts'});
            //
            //enter.append('text')
            //    .attr('x', 14).attr('y',7.8)
            //    .text('to hole out');

            var h = 120, vm = {t:30,m:24,b:20},hm={l:60,r:100};
            var w = (width-60-hm.l-hm.r);
            var distNums = [];
            var distAbs = [];
            var dirNums = [];
            var dirAbs = [];
            stroke.similar.forEach(function(d){
                dirNums.push(cDir.property(d));
                dirAbs.push(Math.abs(cDir.property(d)));
                distNums.push(cDist.property(d));
                distAbs.push(Math.abs(cDist.property(d)));
            });
            distNums = distNums.sort(d3.ascending);
            dirNums = dirNums.sort(d3.ascending);
            cDist.median = d3.median(distNums);
            cDist.min = d3.min(distNums);
            cDist.max = d3.max(distNums);
            cDist.eighty = d3.quantile(distNums,0.8);
            cDist.twentyLow = d3.quantile(distAbs,0.2)/-2;
            cDist.twentyHigh = d3.quantile(distAbs,0.2)/2;
            cDir.median = d3.median(dirNums);
            cDir.max = d3.max(dirNums);
            cDir.min = d3.min(dirNums);
            cDir.tenLeft = d3.quantile(dirAbs,0.2)/-2;
            cDir.tenRight = d3.quantile(dirAbs,0.2)/2;
            cDist.holeOut = d3.mean(stroke.similar,function(d){return d.shot.holeOutNum()});
            // Set up axises and other metrics for the chart
            cDir.scale.range([h,0]).domain([cDir.min*0.95,cDir.max*1.05]);
            cDist.scale.range([h,0]).domain([cDist.min*0.95,cDist.max*1.05]);
            cRound.scale.domain([new Date(2015,0,1),new Date()]).range([0,w]);

            // Set up chart at the bottom of the overlays
            var chart = annotG.append('g')
                .attr('class','chart compare')
                .attr('transform','translate(20,'+(height-20-(h*2+vm.t+vm.b+vm.m))+')');

            chart.append('rect')
                .attr('class', 'bg-rect')
                .attr('rx',2).attr('ry',2)
                .attr('height',(h*2+vm.t+vm.b+vm.m)).attr('width',width-40);

            var distChart = chart.append('g')
                .attr('transform','translate('+hm.l+','+(vm.t+vm.m+h)+')');

            var dirChart = chart.append('g')
                .attr('transform','translate('+hm.l+','+(vm.t)+')');

            var tip = chart.append('g')
                .attr('class', 'tool-tip')
                .attr('transform', 'translate('+hm.l+',0)')
                .style('display','none');

            tip.append('line')
                .attr('x1',0).attr('y1',vm.t/2)
                .attr('x2',0).attr('y2',h*2+vm.t+vm.m);

            var tipDate = tip.append('g')
                .attr('transform', 'translate('+(-35)+','+(vm.t/2)+')');

            tipDate.append('path')
                .attr('d', 'M0,0l10,-10h50l10,10l-10,10h-50z');

            tipDate.append('text')
                .style('text-anchor','middle')
                .attr('dy', '.35em')
                .attr('x',35);

            var tipDist = tip.append('g')
                .attr('transform', 'translate(0,'+(vm.t+vm.m+h)+')rotate(-15)');

            tipDist.append('path')
                .attr('d', 'M0,0l10,-10h70v20h-70z');

            tipDist.append('text')
                .attr('dy', '.35em')
                .attr('x',35);

            var tipDir = tip.append('g')
                .attr('transform', 'translate(0,'+(vm.t)+')rotate(-15)');

            tipDir.append('path')
                .attr('d', 'M0,0l10,-10h70v20h-70z');

            tipDir.append('text')
                .attr('dy', '.35em')
                .attr('x',35);

            distChart.append('g')
                .attr('class','axis dist')
                .attr('transform','translate(0,0)')
                .call(cDist.axis);

            dirChart.append('g')
                .attr('class','axis dir')
                .attr('transform','translate(0,0)')
                .call(cDir.axis);

            dirChart.append('path')
                .attr('class', 'aim-point')
                .attr('d', 'M0,'+cDir.scale(0)+'h'+w+'');

            distChart.append('path')
                .attr('class', 'aim-point')
                .attr('d', 'M0,'+cDist.scale(0)+'h'+w+'');

            distChart.append('g')
                .attr('class','axis round')
                .attr('transform','translate(0,'+h+')')
                .call(cRound.axis);

            var median = distChart.append('g')
                .attr('class','median marker')
                .attr('transform','translate(0,'+cDist.scale(cDist.median)+')');

            median.append('path')
                .attr('d', 'M0,0h'+w+'')
                .style('stroke','#94aacf');

            median.append('path')
                .attr('d', 'M'+(w+8)+',0l10,-10h90v20h-90z')
                .attr('class', 'arrow');

            median.append('text')
                .attr('class','label')
                .attr('x',w+24).attr('dy','.35em')
                .text(cDist.stringify(cDist.median)+' (median)');

            median = dirChart.append('g')
                .attr('class','median marker')
                .attr('transform','translate(0,'+cDir.scale(cDir.median)+')');

            median.append('path')
                .attr('d', 'M0,0h'+w+'')
                .style('stroke','#94aacf');

            median.append('path')
                .attr('d', 'M'+(w+8)+',0l10,-10h90v20h-90z')
                .attr('class', 'arrow');

            median.append('text')
                .attr('class','label')
                .attr('x',w+24).attr('dy','.35em')
                .text(cDir.stringify(cDir.median)+' (median)');

            var low = distChart.append('g')
                .attr('class','low marker')
                .attr('transform','translate(0,'+cDist.scale(cDist.twentyHigh)+')');

            low.append('path')
                .attr('d', 'M0,0h'+w+'v'+(cDist.scale(cDist.twentyLow)-cDist.scale(cDist.twentyHigh))+'h-'+w+'z')
                .style('fill-opacity',0.2)
                .style('fill',showDistance?'#ff8585':'#AFF59A');

            low.append('path')
                .attr('d', 'M'+(w+8)+','+((cDist.scale(cDist.twentyLow)-cDist.scale(cDist.twentyHigh))/2)+'l10,-10h90v20h-90z')
                .attr('class', 'arrow');

            low.append('text')
                .attr('class','label')
                .attr('x',w+24).attr('y',(cDist.scale(cDist.twentyLow)-cDist.scale(cDist.twentyHigh))/2)
                .attr('dy','.35em')
                .text(parseFloat(Math.round(cDist.holeOut * 100) / 100).toFixed(2)+' putts to hole out');

            low = dirChart.append('g')
                .attr('class','low marker')
                .attr('transform','translate(0,'+cDir.scale(cDir.tenLeft)+')');

            low.append('path')
                .attr('d', 'M0,0h'+w+'v'+(cDir.scale(cDir.tenRight)-cDir.scale(cDir.tenLeft))+'h-'+w+'z')
                .style('fill-opacity',0.2)
                .style('fill','#AFF59A');

            low.append('path')
                .attr('d', 'M'+(w+8)+','+((cDir.scale(cDir.tenRight)-cDir.scale(cDir.tenLeft))/2)+'l10,-10h90v20h-90z')
                .attr('class', 'arrow');

            low.append('text')
                .attr('class','label')
                .attr('x',w+24).attr('y',(cDir.scale(cDir.tenRight)-cDir.scale(cDir.tenLeft))/2)
                .attr('dy','.35em')
                .text(parseFloat(Math.round(cDist.holeOut * 100) / 100).toFixed(2)+' putts to hole out');

            var hint = dirChart.append('g')
                .attr('class', 'chart-hint')
                .attr('transform', 'translate('+(w/2)+',0)');

            var l = cDir.scale(0) - cDir.scale(cDir.max);
            var s = cDir.scale(cDir.min) - cDir.scale(0);

            if(cDir.max > 0 && l > 10){
                hint.append('text')
                    .attr('dy','.35em')
                    .attr('y',cDir.scale(0)-l/2)
                    .text('LEFT');
            }
            if(cDir.min < 0 && s > 10){
                hint.append('text')
                    .attr('dy','.35em')
                    .attr('y',cDir.scale(0)+s/2)
                    .text('RIGHT');
            }

            distChart.append('text')
                .attr('class','y chart-label')
                .attr('dy','.35em')
                .attr('transform', 'translate(-38.5,'+h/2+')rotate(-90)')
                .text(cDist.label);

            dirChart.append('text')
                .attr('class','y chart-label')
                .attr('dy','.35em')
                .attr('transform', 'translate(-38.5,'+h/2+')rotate(-90)')
                .text(cDir.label);

            hint = distChart.append('g')
                .attr('class', 'chart-hint')
                .attr('transform', 'translate('+(w/2)+',0)');

            l = cDist.scale(0) - cDist.scale(cDist.max);
            s = cDist.scale(cDist.min) - cDist.scale(0);

            if(cDist.max > 0 && l > 10){
                hint.append('text')
                    .attr('dy','.35em')
                    .attr('y',cDist.scale(0)-l/2)
                    .text('LONG');
            }
            if(cDist.min < 0 && s > 10){
                hint.append('text')
                    .attr('dy','.35em')
                    .attr('y',cDist.scale(0)+s/2)
                    .text('SHORT');
            }

            select = distChart.selectAll('circle')
                .data(stroke.similar, function(d){return d.shot.id;});

            enter = select.enter().append('g')
                .attr('class', function(d){return 'stat id-'+d.shot.id+((d==stroke)?' current':'');})
                .on('mouseenter', function(d){
                    tip.style('display','block').attr('transform','translate('+(hm.l+cRound.scale(d.shot.date))+',0)');
                    tipDate.select('text').text(moment(d.shot.date).fromNow());
                    tipDist.attr('transform', 'translate(10,'+(cDist.scale(cDist.property(d))+vm.t+h+vm.m-5)+')rotate(-15)')
                        .select('text').text(cDist.stringify(cDist.property(d)));
                    tipDir.attr('transform', 'translate(10,'+(cDir.scale(cDir.property(d))+vm.t-5)+')rotate(-15)')
                        .select('text').text(cDir.stringify(cDir.property(d)));
                    teaseG.selectAll('.compare').style('opacity',0.1);
                    teaseG.selectAll('.compare.id-'+ d.shot.id).style('opacity',1)
                        .select('.golfstroke').style('display','block');
                    golfTip.style('display','block').attr('transform','translate('+d.from.cam+')')
                        .select('text.value').text(d.shot.fromDistanceString());
                    teaseG.selectAll('.compare.id-'+ d.shot.id+' .putt-align,.compare.id-'+ d.shot.id+' .golfball.putt.to, .compare.id-'+ d.shot.id+' .pin').style('display','block');
                })
                .on('mouseout', function(d){
                    tip.style('display','none');
                    golfTip.style('display','none');
                    teaseG.selectAll('.compare').style('opacity',1)
                        .select('.golfstroke').style('display','none');
                    chart.selectAll('.stat.id-'+ d.shot.id+' .select').style('opacity',0);
                    teaseG.selectAll('.compare.id-'+ d.shot.id+' .putt-align,.compare.id-'+ d.shot.id+' .golfball.putt.to, .pin').style('display','none');
                });

            enter.append('circle')
                .attr('r', 2.5)
                .attr('cx',function(d){return cRound.scale(d.shot.date);})
                .attr('cy',function(d){return cDist.scale(cDist.property(d))});

            enter.filter(function(d){return d==stroke;})
                .append('line')
                .attr('x1',function(d){return cRound.scale(d.shot.date)}).attr('y1',0)
                .attr('x2',function(d){return cRound.scale(d.shot.date)}).attr('y2',h);

            enter.append('path')
                .attr('class', 'hover')
                .attr('d', function(d,i){
                    var px = cRound.scale(d.shot.date);
                    var sx = i==0?0:px-(px-cRound.scale(enter.data()[i-1].shot.date))/2;
                    var ex = (i==enter.data().length-1)?w:px+(cRound.scale(enter.data()[i+1].shot.date)-px)/2;
                    return 'M'+sx+',0L'+sx+','+h+'L'+ex+','+h+'L'+ex+',0L'+sx+',0';
                });

            select = dirChart.selectAll('circle')
                .data(stroke.similar, function(d){return d.shot.id;});

            enter = select.enter().append('g')
                .attr('class', function(d){return 'stat id-'+d.shot.id+((d==stroke)?' current':'');})
                .on('mouseenter', function(d){
                    tip.style('display','block').attr('transform','translate('+(hm.l+cRound.scale(d.shot.date))+',0)');
                    tipDate.select('text').text(moment(d.shot.date).fromNow());
                    tipDist.attr('transform', 'translate(10,'+(cDist.scale(cDist.property(d))+vm.t+h+vm.m-5)+')rotate(-15)')
                        .select('text').text(cDist.stringify(cDist.property(d)));
                    tipDir.attr('transform', 'translate(10,'+(cDir.scale(cDir.property(d))+vm.t-5)+')rotate(-15)')
                        .select('text').text(cDir.stringify(cDir.property(d)));
                    teaseG.selectAll('.compare').style('opacity',0.1);
                    teaseG.selectAll('.compare.id-'+ d.shot.id).style('opacity',1)
                        .select('.golfstroke').style('display','block');
                    golfTip.style('display','block').attr('transform','translate('+d.from.cam+')')
                        .select('text.value').text(d.shot.fromDistanceString());
                    teaseG.selectAll('.compare.id-'+ d.shot.id+' .putt-align,.compare.id-'+ d.shot.id+' .golfball.putt.to, .compare.id-'+ d.shot.id+' .pin').style('display','block');
                })
                .on('mouseout', function(d){
                    tip.style('display','none');
                    golfTip.style('display','none');
                    teaseG.selectAll('.compare').style('opacity',1)
                        .select('.golfstroke').style('display','none');
                    chart.selectAll('.stat.id-'+ d.shot.id+' .select').style('opacity',0);
                    teaseG.selectAll('.compare.id-'+ d.shot.id+' .putt-align,.compare.id-'+ d.shot.id+' .golfball.putt.to, .pin').style('display','none');
                });

            enter.append('circle')
                .attr('r', 2.5)
                .attr('cx',function(d){return cRound.scale(d.shot.date);})
                .attr('cy',function(d){return cDir.scale(cDir.property(d))});

            enter.filter(function(d){return d==stroke;})
                .append('line')
                .attr('x1',function(d){return cRound.scale(d.shot.date)}).attr('y1',0)
                .attr('x2',function(d){return cRound.scale(d.shot.date)}).attr('y2',h);

            enter.append('path')
                .attr('class', 'hover')
                .attr('d', function(d,i){
                    var px = cRound.scale(d.shot.date);
                    var sx = i==0?0:px-(px-cRound.scale(enter.data()[i-1].shot.date))/2;
                    var ex = (i==enter.data().length-1)?w:px+(cRound.scale(enter.data()[i+1].shot.date)-px)/2;
                    return 'M'+sx+',0L'+sx+','+h+'L'+ex+','+h+'L'+ex+',0L'+sx+',0';
                });

        } else {
            var showDistance = (stroke.shot.shotNumber==1&&stroke.shot.parValue!=3) || stroke.shot.distanceToPinBefore>250*36;
            cDist.property = showDistance?function(d){return d.shot.distance/36}:function(d){return d.shot.shortLongPin/12};
            cDist.stringify = showDistance?function(n){return Math.round(n)+' yds'}:function(n){return (n<0?'short ':'long ')+n>50?Math.round(Math.abs(n/3))+' yds':(n<0?'short ':'long ')+Math.round(Math.abs(n))+' ft'};
            cDist.label = showDistance?'Distance from Tee (yds)':'Short/Long from Pin (ft)';
            var showCenter = (stroke.shot.shotNumber==1&&stroke.shot.parValue!=3) || stroke.shot.distanceToPinBefore>250*36;
            cDir.property = showCenter?function(d){return d.shot.rightLeftCenter/36}:function(d){return d.shot.rightLeftPin/12};
            cDir.stringify = showDistance?function(n){return (n<0?'right ':'left ')+Math.round(Math.abs(n))+' yds'}:function(n){return (n<0?'right ':'left ')+n>50?Math.round(Math.abs(n/3))+' yds':(n<0?'right ':'left ')+Math.round(Math.abs(n))+' ft'};
            cDir.label = showDistance?'Right/Left from Center (yds)':'Right/Left of Pin (ft)';
            // TODO zoom to all of the shots in frame

            var select = shotsG.selectAll('.stroke')
                .data([stroke], function(d){return d.shot.id;});

            var enter = select.enter().append('g')
                .attr('class', function(d){return 'stroke id-'+d.shot.id;});

            enter.append('circle')
                .attr('class', function(d){return 'stroke-circle-outer s'+ d.shot['shot']+' '+ d.shot['from_location_scorer'];})
                .attr('cx', function(d){return d.shot.cam[0];})
                .attr('cy', function(d){return d.shot.cam[1];})
                .attr('r', 3.6);

            enter.append('circle')
                .attr('class', function(d){return 'stroke-circle-inner s'+ d.shot['shot']+' '+ d.shot['from_location_scorer'];})
                .attr('cx', function(d){return d.shot.cam[0];})
                .attr('cy', function(d){return d.shot.cam[1];})
                .attr('r', 2);

            enter.append('path')
                .attr('class', function(d){return 'golfstroke compare s'+ d.shot['shot']+' '+ d.shot['from_location_scorer'];})
                .attr('d', function(d){
                    return d.shot.checkFrom('green')?('M'+d.from.cam+'L'+ d.to.cam):('M'+d.from.cam+'Q'+ d.mid+' '+d.to.cam);
                });

            select.exit().remove();

            var golfTip = shotsG.append('g')
                .attr('class','golfstroke-tip')
                .style('display','none');

            var goltTipScale = golfTip.append('g')
                .attr('class', 'scale-invert');

            goltTipScale.append('rect')
                .attr('height', 21).attr('width', 44)
                .attr('x', -54).attr('y',-10.5)
                .attr('rx',2).attr('ry',2);

            goltTipScale.append('path')
                .attr('d', 'M-4,0l-3,-2.4v6z');

            goltTipScale.append('text')
                .attr('class','value')
                .attr('x',-32)
                .attr('dy','-.25em');

            goltTipScale.append('text')
                .attr('x',-32)
                .attr('dy','1em')
                .style('font-size','6px')
                .style('font-weight','300')
                .text('to pin');

            var aim = showDistance ? stroke.shot.rightLeftPoint:currHole.courseHole.flag.cam;

            select = shotsG.selectAll('.aim-point')
                .data([stroke]);

            enter = select.enter().append('g')
                .attr('class', 'aim-point');

            enter.append('path')
                .attr('d', function(d){
                    var a = Math.atan2(d.from.cam[1]-aim[1],d.from.cam[0]-aim[0]);
                    var p1 = [aim[0]+50*Math.cos(a),aim[1]+50*Math.sin(a)];
                    var p2 = [aim[0]-50*Math.cos(a),aim[1]-50*Math.sin(a)];
                    return 'M'+p1+'L'+p2;
                });

            if(!showDistance){
                enter.append('path')
                    .attr('d', function(d){
                        var a = Math.atan2(d.from.cam[1]-aim[1],d.from.cam[0]-aim[0])+Math.PI/2;
                        var p1 = [aim[0]+20*Math.cos(a),aim[1]+20*Math.sin(a)];
                        var p2 = [aim[0]-20*Math.cos(a),aim[1]-20*Math.sin(a)];
                        return 'M'+p1+'L'+p2;
                    });
            }

            select = teaseG.selectAll('.compare')
                .data(stroke.similar.filter(function(d){return d!=stroke;}), function(d){return d.shot.id;});

            enter = select.enter().append('g')
                .attr('class', function(d){return 'compare id-'+d.shot.id;})
                .on('mouseenter', function(d){
                    tip.style('display','block').attr('transform','translate('+(hm.l+cRound.scale(d.shot.date))+',0)');
                    tipDate.select('text').text(moment(d.shot.date).fromNow());
                    tipDist.attr('transform', 'translate(10,'+(cDist.scale(cDist.property(d))+vm.t+h+vm.m-5)+')rotate(-15)')
                        .select('text').text(cDist.stringify(cDist.property(d)));
                    tipDir.attr('transform', 'translate(10,'+(cDir.scale(cDir.property(d))+vm.t-5)+')rotate(-15)')
                        .select('text').text(cDir.stringify(cDir.property(d)));
                    teaseG.selectAll('.compare').style('opacity',0.1);
                    teaseG.selectAll('.compare.id-'+ d.shot.id).style('opacity',1)
                        .select('.golfstroke').style('display','block');
                    if(!showDistance){
                        golfTip.style('display','block').attr('transform','translate('+d.from.cam+')')
                            .select('text.value').text(d.shot.fromDistanceString());
                    }
                })
                .on('mouseout', function(d){
                    tip.style('display','none');
                    teaseG.selectAll('.compare').style('opacity',1)
                        .select('.golfstroke').style('display','none');
                    golfTip.style('display','none');
                    chart.selectAll('.stat.id-'+ d.shot.id+' .select').style('opacity',0);
                });

            enter.append('circle')
                .filter(function(d){return d.shot.strokeType === 'S';})
                .attr('class', 'golfball')
                .attr('filter','url(#drop-shadow2)')
                .attr('r',2)
                .attr('cx',function(d){return d.to.cam[0];})
                .attr('cy',function(d){return d.to.cam[1];});

            enter.append('path')
                .filter(function(d){return d.shot.strokeType === 'S';})
                .attr('class', 'golfstroke')
                .style('display', 'none')
                .attr('d', function(d) {
                    return 'M' + d.from.cam + 'Q' + d.mid + ' ' + d.to.cam;
                });

            enter.append('circle')
                .attr('class', 'hover')
                .attr('r',4)
                .attr('cx',function(d){return d.to.cam[0];})
                .attr('cy',function(d){return d.to.cam[1];});

            var h = 120, vm = {t:30,m:10,b:20},hm={l:60,r:100};
            var w = (width-60-hm.l-hm.r);
            var distNums = [];
            var distAbs = [];
            var dirNums = [];
            var dirAbs = [];
            stroke.similar.forEach(function(d){
                dirNums.push(cDir.property(d));
                dirAbs.push(Math.abs(cDir.property(d)));
                distNums.push(cDist.property(d));
                distAbs.push(Math.abs(cDist.property(d)));
            });
            distNums = distNums.sort(d3.ascending);
            dirNums = dirNums.sort(d3.ascending);
            cDist.median = d3.median(distNums);
            cDist.min = d3.min(distNums);
            cDist.max = d3.max(distNums);
            cDist.eighty = d3.quantile(distNums,0.8);
            cDist.twentyLow = cDist.min;
            cDist.twentyHigh = d3.quantile(distNums,0.1);
            if(!showDistance){
                cDist.twentyLow = d3.quantile(distAbs,0.2)/-2;
                cDist.twentyHigh = d3.quantile(distAbs,0.2)/2;
            }
            cDir.median = d3.median(dirNums);
            cDir.max = d3.max(dirNums);
            cDir.min = d3.min(dirNums);
            cDir.tenLeft = d3.quantile(dirAbs,0.2)/-2;
            cDir.tenRight = d3.quantile(dirAbs,0.2)/2;
            // Set up axises and other metrics for the chart
            cDir.scale.range([h,0]).domain([cDir.min*0.95,cDir.max*1.05]);
            cDist.scale.range([h,0]).domain([cDist.min*0.95,cDist.max*1.05]);
            cRound.scale.domain([new Date(2015,0,1),new Date()]).range([0,w]);

            // Set up chart at the bottom of the overlays
            var chart = annotG.append('g')
                .attr('class','chart compare')
                .attr('transform','translate(20,'+(height-20-(h*2+vm.t+vm.b+vm.m))+')');

            chart.append('rect')
                .attr('class', 'bg-rect')
                .attr('rx',2).attr('ry',2)
                .attr('height',(h*2+vm.t+vm.b+vm.m)).attr('width',width-40);

            var distChart = chart.append('g')
                .attr('transform','translate('+hm.l+','+(vm.t+vm.m+h)+')');

            var dirChart = chart.append('g')
                .attr('transform','translate('+hm.l+','+(vm.t)+')');

            var tip = chart.append('g')
                .attr('class', 'tool-tip')
                .attr('transform', 'translate('+hm.l+',0)')
                .style('display','none');

            tip.append('line')
                .attr('x1',0).attr('y1',vm.t/2)
                .attr('x2',0).attr('y2',h*2+vm.t+vm.m);

            var tipDate = tip.append('g')
                .attr('transform', 'translate('+(-35)+','+(vm.t/2)+')');

            tipDate.append('path')
                .attr('d', 'M0,0l10,-10h50l10,10l-10,10h-50z');

            tipDate.append('text')
                .style('text-anchor','middle')
                .attr('dy', '.35em')
                .attr('x',35);

            var tipDist = tip.append('g')
                .attr('transform', 'translate(0,'+(vm.t+vm.m+h)+')rotate(-15)');

            tipDist.append('path')
                .attr('d', 'M0,0l10,-10h70v20h-70z');

            tipDist.append('text')
                .attr('dy', '.35em')
                .attr('x',35);

            var tipDir = tip.append('g')
                .attr('transform', 'translate(0,'+(vm.t)+')rotate(-15)');

            tipDir.append('path')
                .attr('d', 'M0,0l10,-10h70v20h-70z');

            tipDir.append('text')
                .attr('dy', '.35em')
                .attr('x',35);

            distChart.append('g')
                .attr('class','axis dist')
                .attr('transform','translate(0,0)')
                .call(cDist.axis);

            dirChart.append('g')
                .attr('class','axis dir')
                .attr('transform','translate(0,0)')
                .call(cDir.axis);

            dirChart.append('path')
                .attr('class', 'aim-point')
                .attr('d', 'M0,'+cDir.scale(0)+'h'+w+'');

            if(!showDistance){
                distChart.append('path')
                    .attr('class', 'aim-point')
                    .attr('d', 'M0,'+cDist.scale(0)+'h'+w+'');
            }

            distChart.append('g')
                .attr('class','axis round')
                .attr('transform','translate(0,'+h+')')
                .call(cRound.axis);

            var median = distChart.append('g')
                .attr('class','median marker')
                .attr('transform','translate(0,'+cDist.scale(cDist.median)+')');

            median.append('path')
                .attr('d', 'M0,0h'+w+'')
                .style('stroke','#94aacf');

            median.append('path')
                .attr('d', 'M'+(w+8)+',0l10,-10h90v20h-90z')
                .attr('class', 'arrow');

            median.append('text')
                .attr('class','label')
                .attr('x',w+24).attr('dy','.35em')
                .text(cDist.stringify(cDist.median)+' (median)');

            median = dirChart.append('g')
                .attr('class','median marker')
                .attr('transform','translate(0,'+cDir.scale(cDir.median)+')');

            median.append('path')
                .attr('d', 'M0,0h'+w+'')
                .style('stroke','#94aacf');

            median.append('path')
                .attr('d', 'M'+(w+8)+',0l10,-10h90v20h-90z')
                .attr('class', 'arrow');

            median.append('text')
                .attr('class','label')
                .attr('x',w+24).attr('dy','.35em')
                .text(cDir.stringify(cDir.median)+' (median)');

            var low = distChart.append('g')
                .attr('class','low marker')
                .attr('transform','translate(0,'+cDist.scale(cDist.twentyHigh)+')');

            low.append('path')
                .attr('d', 'M0,0h'+w+'v'+(cDist.scale(cDist.twentyLow)-cDist.scale(cDist.twentyHigh))+'h-'+w+'z')
                .style('fill-opacity',0.2)
                .style('fill',showDistance?'#ff8585':'#AFF59A');

            low.append('path')
                .attr('d', 'M'+(w+8)+','+((cDist.scale(cDist.twentyLow)-cDist.scale(cDist.twentyHigh))/2)+'l10,-10h90v20h-90z')
                .attr('class', 'arrow');

            low.append('text')
                .attr('class','label')
                .attr('x',w+24).attr('y',(cDist.scale(cDist.twentyLow)-cDist.scale(cDist.twentyHigh))/2)
                .attr('dy','.35em')
                .text(cDist.stringify(cDist.twentyHigh)+(showDistance?' ( < 20%)':' ( > 80%)'));

            low = dirChart.append('g')
                .attr('class','low marker')
                .attr('transform','translate(0,'+cDir.scale(cDir.tenLeft)+')');

            low.append('path')
                .attr('d', 'M0,0h'+w+'v'+(cDir.scale(cDir.tenRight)-cDir.scale(cDir.tenLeft))+'h-'+w+'z')
                .style('fill-opacity',0.2)
                .style('fill','#AFF59A');

            low.append('path')
                .attr('d', 'M'+(w+8)+','+((cDir.scale(cDir.tenRight)-cDir.scale(cDir.tenLeft))/2)+'l10,-10h90v20h-90z')
                .attr('class', 'arrow');

            low.append('text')
                .attr('class','label')
                .attr('x',w+24).attr('y',(cDir.scale(cDir.tenRight)-cDir.scale(cDir.tenLeft))/2)
                .attr('dy','.35em')
                .text(cDir.stringify(cDir.tenLeft)+' ( > 80%)');

            var hint = dirChart.append('g')
                .attr('class', 'chart-hint')
                .attr('transform', 'translate('+(w/2)+',0)');

            var l = cDir.scale(0) - cDir.scale(cDir.max);
            var s = cDir.scale(cDir.min) - cDir.scale(0);

            if(cDir.max > 0 && l > 10){
                hint.append('text')
                    .attr('dy','.35em')
                    .attr('y',cDir.scale(0)-l/2)
                    .text('LEFT');
            }
            if(cDir.min < 0 && s > 10){
                hint.append('text')
                    .attr('dy','.35em')
                    .attr('y',cDir.scale(0)+s/2)
                    .text('RIGHT');
            }

            distChart.append('text')
                .attr('class','y chart-label')
                .attr('dy','.35em')
                .attr('transform', 'translate(-38.5,'+h/2+')rotate(-90)')
                .text(cDist.label);

            dirChart.append('text')
                .attr('class','y chart-label')
                .attr('dy','.35em')
                .attr('transform', 'translate(-38.5,'+h/2+')rotate(-90)')
                .text(cDir.label);

            if(showDistance){
                var high = distChart.append('g')
                    .attr('class','low marker')
                    .attr('transform','translate(0,'+cDist.scale(cDist.max)+')');

                high.append('path')
                    .attr('d', 'M0,0h'+w+'v'+(cDist.scale(cDist.eighty)-cDist.scale(cDist.max))+'h-'+w+'z')
                    .style('fill-opacity',0.2)
                    .style('fill', showDistance?'#AFF59A':'#ff8585');

                high.append('path')
                    .attr('d', 'M'+(w+8)+','+((cDist.scale(cDist.eighty)-cDist.scale(cDist.max))/2)+'l10,-10h90v20h-90z')
                    .attr('class', 'arrow');

                high.append('text')
                    .attr('class','label')
                    .attr('x',w+24).attr('y',(cDist.scale(cDist.eighty)-cDist.scale(cDist.max))/2)
                    .attr('dy','.35em')
                    .text(cDist.stringify(cDist.eighty)+(showDistance?' ( > 80%)':' ( < 20%)'));

            } else {
                hint = distChart.append('g')
                    .attr('class', 'chart-hint')
                    .attr('transform', 'translate('+(w/2)+',0)');

                l = cDist.scale(0) - cDist.scale(cDist.max);
                s = cDist.scale(cDist.min) - cDist.scale(0);

                if(cDist.max > 0 && l > 10){
                    hint.append('text')
                        .attr('dy','.35em')
                        .attr('y',cDist.scale(0)-l/2)
                        .text('LONG');
                }
                if(cDist.min < 0 && s > 10){
                    hint.append('text')
                        .attr('dy','.35em')
                        .attr('y',cDist.scale(0)+s/2)
                        .text('SHORT');
                }
            }

            select = distChart.selectAll('circle')
                .data(stroke.similar, function(d){return d.shot.id;});

            enter = select.enter().append('g')
                .attr('class', function(d){return 'stat id-'+d.shot.id+((d==stroke)?' current':'');})
                .on('mouseenter', function(d){
                    tip.style('display','block').attr('transform','translate('+(hm.l+cRound.scale(d.shot.date))+',0)');
                    tipDate.select('text').text(moment(d.shot.date).fromNow());
                    tipDist.attr('transform', 'translate(10,'+(cDist.scale(cDist.property(d))+vm.t+h+vm.m-5)+')rotate(-15)')
                        .select('text').text(cDist.stringify(cDist.property(d)));
                    tipDir.attr('transform', 'translate(10,'+(cDir.scale(cDir.property(d))+vm.t-5)+')rotate(-15)')
                        .select('text').text(cDir.stringify(cDir.property(d)));
                    teaseG.selectAll('.compare').style('opacity',0.1);
                    teaseG.selectAll('.compare.id-'+ d.shot.id).style('opacity',1)
                        .select('.golfstroke').style('display','block');
                    if(!showDistance){
                        golfTip.style('display','block').attr('transform','translate('+d.from.cam+')')
                            .select('text.value').text(d.shot.fromDistanceString());
                    }
                })
                .on('mouseout', function(d){
                    tip.style('display','none');
                    golfTip.style('display','none');
                    teaseG.selectAll('.compare').style('opacity',1)
                        .select('.golfstroke').style('display','none');
                    chart.selectAll('.stat.id-'+ d.shot.id+' .select').style('opacity',0);
                });

            enter.append('circle')
                .attr('r', 2.5)
                .attr('cx',function(d){return cRound.scale(d.shot.date);})
                .attr('cy',function(d){return cDist.scale(cDist.property(d))});

            enter.filter(function(d){return d==stroke;})
                .append('line')
                .attr('x1',function(d){return cRound.scale(d.shot.date)}).attr('y1',0)
                .attr('x2',function(d){return cRound.scale(d.shot.date)}).attr('y2',h);

            enter.append('path')
                .attr('class', 'hover')
                .attr('d', function(d,i){
                    var px = cRound.scale(d.shot.date);
                    var sx = i==0?0:px-(px-cRound.scale(enter.data()[i-1].shot.date))/2;
                    var ex = (i==enter.data().length-1)?w:px+(cRound.scale(enter.data()[i+1].shot.date)-px)/2;
                    return 'M'+sx+',0L'+sx+','+h+'L'+ex+','+h+'L'+ex+',0L'+sx+',0';
                });

            select = dirChart.selectAll('circle')
                .data(stroke.similar, function(d){return d.shot.id;});

            enter = select.enter().append('g')
                .attr('class', function(d){return 'stat id-'+d.shot.id+((d==stroke)?' current':'');})
                .on('mouseenter', function(d){
                    tip.style('display','block').attr('transform','translate('+(hm.l+cRound.scale(d.shot.date))+',0)');
                    tipDate.select('text').text(moment(d.shot.date).fromNow());
                    tipDist.attr('transform', 'translate(10,'+(cDist.scale(cDist.property(d))+vm.t+h+vm.m-5)+')rotate(-15)')
                        .select('text').text(cDist.stringify(cDist.property(d)));
                    tipDir.attr('transform', 'translate(10,'+(cDir.scale(cDir.property(d))+vm.t-5)+')rotate(-15)')
                        .select('text').text(cDir.stringify(cDir.property(d)));
                    teaseG.selectAll('.compare').style('opacity',0.1);
                    teaseG.selectAll('.compare.id-'+ d.shot.id).style('opacity',1)
                        .select('.golfstroke').style('display','block');
                    if(!showDistance){
                        golfTip.style('display','block').attr('transform','translate('+d.from.cam+')')
                            .select('text.value').text(d.shot.fromDistanceString());
                    }
                })
                .on('mouseout', function(d){
                    tip.style('display','none');
                    golfTip.style('display','none');
                    teaseG.selectAll('.compare').style('opacity',1)
                        .select('.golfstroke').style('display','none');
                    chart.selectAll('.stat.id-'+ d.shot.id+' .select').style('opacity',0);
                });

            enter.append('circle')
                .attr('r', 2.5)
                .attr('cx',function(d){return cRound.scale(d.shot.date);})
                .attr('cy',function(d){return cDir.scale(cDir.property(d))});

            enter.filter(function(d){return d==stroke;})
                .append('line')
                .attr('x1',function(d){return cRound.scale(d.shot.date)}).attr('y1',0)
                .attr('x2',function(d){return cRound.scale(d.shot.date)}).attr('y2',h);

            enter.append('path')
                .attr('class', 'hover')
                .attr('d', function(d,i){
                    var px = cRound.scale(d.shot.date);
                    var sx = i==0?0:px-(px-cRound.scale(enter.data()[i-1].shot.date))/2;
                    var ex = (i==enter.data().length-1)?w:px+(cRound.scale(enter.data()[i+1].shot.date)-px)/2;
                    return 'M'+sx+',0L'+sx+','+h+'L'+ex+','+h+'L'+ex+',0L'+sx+',0';
                });

        }


    }

    function exitCompare(newHole){
        compareMode = false;
        shotsG.selectAll('.aim-point').remove();
        teaseG.selectAll('.compare').remove();
        annotG.selectAll('.chart').remove();
        annotG.selectAll('.stroke-panel').remove();
        backHole.style('display','none');

        if(!newHole){
            var h = currHole.hole-1;
            var hole = (h<9)?$('.list-container ul.front li:eq('+h+')'):$('.list-container ul.back li:eq('+(h-9)+')');
            rTool.holeClick(hole,currHole);
        }
    }

    function teaseCompareStrokes(d,i){
        d3.select(this).attr('class','compare hover');

        // Hide tips momentarily for this shot

        // If from the green then show the avg number of putts (strokes gained?)
        if(d.shot.checkFrom('green') && !d.shot.checkFrom('bunker')){
            var avg = d3.mean(d.similar,function(d,i){return d.shot.holeOutNum()});

            var select = tipG.selectAll('.tease.puttstroke-tip')
                .data([avg], function(d){return d;});

            var enter = select.enter().append('g')
                .attr('class', 'tease puttstroke-tip')
                .attr('transform', 'translate('+d.from.cam+')');

            var goltTipScale = enter.append('g')
                .attr('class', 'scale-invert');

            goltTipScale.append('rect')
                .attr('height', 21).attr('width', 44)
                .attr('x', -54).attr('y',-10.5)
                .attr('rx',2).attr('ry',2);

            goltTipScale.append('path')
                .attr('d', 'M-4,0l-3,-2.4v6z');

            goltTipScale.append('text')
                .attr('class','value')
                .attr('x',-32)
                .attr('dy','-.25em')
                .text(function(d){return parseFloat(Math.round(d * 100) / 100).toFixed(2)+' putts'});;

            goltTipScale.append('text')
                .attr('x',-32)
                .attr('dy','1em')
                .style('font-size','6px')
                .style('font-weight','300')
                .text('to hole out');

        } else {
            var select = teaseG.selectAll('.tease')
                .data(d.similar, function(d){return d.shot.id;});

            var enter = select.enter().append('g')
                .attr('class', function(d){return 'tease id-'+d.shot.id;});

            enter.append('path')
                .filter(function(d){return d.shot.strokeType === 'S';})
                .attr('class', 'golfstroke')
                .attr('d', function(d) {
                    return 'M' + d.from.cam + 'Q' + d.mid + ' ' + d.to.cam;
                });

            enter.append('circle')
                .filter(function(d){return d.shot.strokeType === 'S';})
                .attr('class', 'golfball')
                .attr('r',2)
                .attr('cx',function(d){return d.to.cam[0];})
                .attr('cy',function(d){return d.to.cam[1];});

        }
    }

    function removeCompareTease(d,i){
        if(!compareMode){
            d3.select(this).attr('class','compare');
            teaseG.selectAll('.tease').remove();
            tipG.selectAll('.puttstroke-tip').remove();
        }
    }

    function zoomToStroke(stroke){
        console.log(stroke.from.cam);
        console.log(stroke.to.cam);
        var xMin = 10000000, xMax = -100000;
        var yMin = 10000000, yMax = -100000;
        stroke.similar.forEach(function(d){
            xMin = d.from.cam[0]<xMin? d.from.cam[0]:xMin;
            yMin = d.from.cam[1]<yMin? d.from.cam[1]:yMin;
            xMax = d.from.cam[0]>xMax? d.from.cam[0]:xMax;
            yMax = d.from.cam[1]>yMax? d.from.cam[1]:yMax;
            xMin = d.to.cam[0]<xMin? d.to.cam[0]:xMin;
            yMin = d.to.cam[1]<yMin? d.to.cam[1]:yMin;
            xMax = d.to.cam[0]>xMax? d.to.cam[0]:xMax;
            yMax = d.to.cam[1]>yMax? d.to.cam[1]:yMax;
        });

        var dx = xMax - xMin,
            dy = yMax - yMin,
            x = (xMax + xMin) / 2,
            y = (yMax + yMin) / 2,
            scale = .5 / Math.max(dx / width, dy / height * 2),
            translate = [width / 2 - scale * x, height / 4 - scale * y];

        console.log(translate);

        svg.transition()
            .duration(1500)
            .call(zoom.translate(translate).scale(scale).event);
    }

    function zoomed() {
        roundG.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
        imgG.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale+ ")");
        //shotsG.selectAll('.flag rect,.teebox rect').attr('width', 5/zoom.scale()).attr('height', 5/zoom.scale()*scale0)
        //    .attr('x', -2.5/zoom.scale()*scale0).attr('y', -2.5/zoom.scale()*scale0);
        roundG.selectAll('.golfstroke').style('stroke-width', 1.5/zoom.scale());
        roundG.selectAll('.golfball.putt').attr('r', 4/zoom.scale());
        roundG.selectAll('.putt.hover').attr('r', 6/zoom.scale());
        roundG.selectAll('.pin').attr('r', 5/zoom.scale()).style('stroke-width', 1/zoom.scale());
        roundG.selectAll('.stroke-circle-outer').attr('r', 3.6/zoom.scale()).style('stroke-width', 0.5/zoom.scale());
        roundG.selectAll('.stroke-circle-inner').attr('r', 2/zoom.scale());
        shotsG.selectAll('.aim-point path').style('stroke-width',1/zoom.scale());
        roundG.selectAll('.putt-align').style('stroke-width',1/zoom.scale());
        shotsG.selectAll('.golfstroke-tip .scale-invert').attr('transform', 'scale('+1/d3.event.scale+')');
        shotsG.selectAll('.puttstroke-tip .scale-invert').attr('transform', 'scale('+1/d3.event.scale+')');
        //imgG.selectAll('.target rect,.camera rect').attr('width', 5/zoom.scale()*scale0).attr('height', 5/zoom.scale()*scale0)
        //    .attr('x', -2.5/zoom.scale()*scale0).attr('y', -2.5/zoom.scale()*scale0)
        //    .attr('stroke-width',-2.5/zoom.scale()*scale0);


        var t = zoom.translate();
        projection
            .translate([t[0]+width/2*zoom.scale(), t[1]+height/2*zoom.scale()])
            .scale(zoom.scale());

        mapG.selectAll("path")
            .attr("d", path);
    }

})();