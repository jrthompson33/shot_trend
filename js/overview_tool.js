/**
 * Created by John Thompson
 */

(function () {

    var roundList;

    var xScale = d3.scale.linear()
        .range([60,360]).domain([1,18]);

    var yScale = d3.scale.linear()
        .range([8,56]).domain([3,-2]);

    // Global object that can be called by other methods
    oTool = {};

    /**
     * Initialize the tool
     * @param params - the context of the visualization
     */
    oTool.init = function (params) {
        $('#panel-overview').css('background-image','url(pattern.png)');
        roundList = $('#round-list ul');
    };

    oTool.draw = function (params) {
        $('#backToRounds').css('visibility','hidden');
        $('#navTitle').text('Shot Trend');
        $('.navbar-svg').css({margin:'-78px 0 0 100%','left':'-240px'});

        // need to add the in & out into scorecard
        ko.cleanNode(document.getElementById('round-list'));

        roundList.empty().load('templates/round.html li', function() {
            ko.applyBindings({rounds:data.rounds.sort(function(a,b){return b.date.getTime()- a.date.getTime()})}, document.getElementById('round-list'));
        });
    };

    oTool.drawRound = function(e,d){
        var chart = d3.select(e);

        var defs = chart.append('defs');

        var filter = defs.append('filter')
            .attr('id','drop-shadow')
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

        chart.append('text')
            .style('font-size', '9px')
            .attr('y', yScale(0))
            .attr('x', 36)
            .style('text-anchor','end')
            .text('E');

        chart.append('text')
            .style('font-size', '9px')
            .attr('y', yScale(-1))
            .attr('x', 36)
            .style('text-anchor','end')
            .text('-1');

        chart.append('text')
            .style('font-size', '9px')
            .attr('y', yScale(1))
            .attr('x', 36)
            .style('text-anchor','end')
            .text('+1');

        chart.append('text')
            .style('font-size', '9px')
            .attr('y', 68)
            .attr('x', 36)
            .style('text-anchor','end')
            .text('Holes');

        var select = chart.selectAll('.hole')
            .data(d.holes,function(d){return d.hole;});

        var enter = select.enter().append('g')
            .attr('class', 'hole')
            .attr('transform',function(d,i){return 'translate('+xScale(d.hole)+',0)'});

        enter.append('text')
            .attr('y', '68')
            .text(function(d){return d.hole;})

        select = enter.selectAll('circle').data(function(d){
            var circles = [];
            var color = d.scoreColor();
            var score = d.numStrokes-d.parValue;
            var count = Math.abs(score)+1;
            for(var c = 0; c < count; c++){
                if(score!=0)circles.push({fill:color,y:c*score/Math.abs(score)});
                else circles.push({fill:color,y:c});
            }
            return circles;
        });

        select.enter().append('rect')
            .attr('width', 10)
            .attr('height', 8)
            .attr('x', -4)
            .attr('y', function(d){console.log(d.y);return yScale(d.y)-4;})
            .style('filter', 'url(#drop-shadow)')
            .style('fill',function(d){return d.fill;});

        return true;
    };

    oTool.roundClick = function(e,d) {
        $('.rp-hole-item.selected').removeClass('selected');
        $(e).addClass('selected');

        $('#panel-overview').removeClass('active');
        $('#panel-round').addClass('active');


        var h = $(window).height() - $('.navbar.navbar-default').height();
        var w = $(window).width();
        $('#main').height(h).width(w);

        // Set params for size of visualization
        var params = {width: w, height: h,round:d};

        rTool.resizeWindow(params);
        rTool.draw(params);
    };

    oTool.resizeWindow = function(params) {

    };

})();