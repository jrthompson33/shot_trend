/**
 * Created by John Thompson
 */

// Just example code for now - use prototypes later
DataType = function (classname, displayname, color) {
    this.classname = classname;
    this.displayname = displayname;
    this.color = color;
};

Round = function(r,h,c){
    this.playerId = r['player_id'];
    this.firstName = r['player_first_name'];
    this.lastName = r['player_last_name'];
    this.course = c;
    this.round = convNum(r['round']);
    this.holes = h;
    this.numStrokes = 0;
    for(var i = 0; i < h.length; i++){
        this.numStrokes += h[i].numStrokes;
    }
    this.out = new RoundOutIn(this.holes.slice(0,9),'Out');
    this.in = new RoundOutIn(this.holes.slice(9,18),'In');
    this.total = new RoundOutIn(this.holes,'T');
};

Course = function(courseId, holes) {

};

CourseHole = function(ch,courseId,roundId,holeId) {
    this.id = holeId;
    this.courseId = courseId;
    this.roundId = roundId;
    this.tee = {sl:ch['sl_tee'],geo:ch['tee']};
    this.tee.sl[2] = 78;
    this.flag = {sl:ch['sl_flag'],geo:ch['flag']};
};

Stroke = function(s,h) {
    this.id = s['year']+'-'+s['tournament_id']+'-'+s['round']+'-'+s['player_id']+'-'+s['hole']+'-'+s['shot'];
    this.strokeNumber = convNum(s['num_of_strokes']);
    this.club = s['club'];
    this.shotNumber = convNum(s['shot']);
    this.parValue = convNum(s['par_value']);
    this.strokeType = s['shot_type'];
    this.fromLocation = [s['from_location_scorer'],s['from_location_enhanced']];
    this.toLocation = [s['to_location_laser'],s['to_location_enhanced']];
    this.distance = convNum(s['distance']);
    this.distanceCenter = convNum(s['dist_from_center']);
    this.distanceEdge = convNum(s['dist_from_edge']);
    this.distanceToPinBefore = convNum(s['distance_to_pin']);
    this.distanceToPinAfter = convNum(s['distance_to_hole_after_shot']);
    this.inHole = s['in_the_hole_flag'] == 'Y';
    this.aroundGreen = s['around_the_green_flag'] == 'Y';
    this.firstPutt = s['first_putt_flag'] == 'Y';
    this.time = s['time'];
    this.lie = s['lie'];
    this.round = convNum(s['round']);
    this.elevation = s['elevation'];
    this.numStrokes = convNum(s['hole_score']);
    this.slope = s['slope'];
    this.hole = h;
    this.sl = [convNum(s['x']),convNum(s['y']),convNum(s['z'])];
    this.geo = s.geo;
    this.rightLeftCenter = (s['right_left_center'])?convNum(s['right_left_center']):0;
    this.rightLeftPin = (s['right_left_pin'])?-1*convNum(s['right_left_pin']):0;
    this.shortLongPin = (s['long_short_pin'])?convNum(s['long_short_pin']):0;
    this.rightLeftAngle = (s['right_left_angle'])? convNum(s['right_left_angle']):0;
    this.rightLeftPoint = (s['center_point_x'])? [convNum(s['center_point_x']),convNum(s['center_point_y'])]:[0,0];
};

/**
 * Needed to show a shot as a path, need individual legs
 * @param f
 * @param t
 * @param s
 * @constructor
 */
StrokePair = function(f,t,s){
    this.to = t;
    this.from = f;
    this.shot = s;
    var m = [(this.to.cam[0]- this.from.cam[0])/2+this.from.cam[0],(this.to.cam[1]-this.from.cam[1])/2+ this.from.cam[1]];
    var dist = distancePoints(this.from.cam, this.to.cam);
    var theta = Math.atan((this.from.cam[1]-this.to.cam[1])/(this.from.cam[0]-this.to.cam[0]))-Math.PI/2;
    m[0] -= Math.cos(theta)*dist/8;
    m[1] += Math.sin(theta)*dist/2;
    this.mid = m;
    var a1 = Math.atan2((this.to.cam[1]-this.from.cam[1]),(this.to.cam[0]-this.from.cam[0]))*180/Math.PI;
    var a2 = Math.atan2((this.shot.rightLeftPoint[1]-this.from.cam[1]),(this.shot.rightLeftPoint[0]-this.from.cam[0]))*180/Math.PI;
    if(a1-a2<0){
        s.rightLeftPin *= -1;
    } else {
        s.rightLeftCenter *= -1;
    }
};

Hole = function(h,rs,c,ch){
    this.id = h['hole'];
    this.numStrokes = convNum(h['hole_score']);
    this.parValue = convNum(h['par_value']);
    this.player = h['player_id'];
    this.roundScore = rs + this.numStrokes-this.parValue;
    this.hole = convNum(h['hole']);
    this.camera = c;
    this.round = convNum(h['round']);
    this.courseHole = ch[(this.round-1)*18+this.hole-1];
    this.yardage = convNum(h['yardage']);
};

RoundOutIn = function(holes,oi){
    this.hole = oi;
    this.yardage = 0;
    this.parValue = 0;
    this.fairwayHit = 0;
    this.greenInReg = 0;
    this.upAndDown = 0;
    this.sandSave = 0;
    this.numStrokes = 0;
    this.numPutts = 0;
    var self = this;
    var numFairways = 0;
    var numBunkers = 0;
    self.roundScore = holes[holes.length-1].roundScore;
    holes.forEach(function(h){
        self.yardage += h.yardage;
        self.parValue += h.parValue;
        numFairways += h.parValue > 3?1:0;
        numBunkers += h.bunkerShot?1:0;
        self.fairwayHit += h.fairwayHit?1:0;
        self.greenInReg += h.greenInReg?1:0;
        self.upAndDown += h.upAndDown?1:0;
        self.sandSave += h.sandSave?1:0;
        self.numStrokes += h.numStrokes;
        self.numPutts += h.numPutts;
    });
    this.fairwayHit = this.fairwayHit/numFairways*100;
    this.upAndDown = this.upAndDown/(holes.length-this.greenInReg)*100;
    this.greenInReg = this.greenInReg/holes.length*100;
    this.sandSave = this.sandSave/numBunkers*100;
};

RoundOutIn.prototype.fairwayHitString = function() {
    return this.fairwayHit==100?'100 %':isNaN(this.fairwayHit)?'N/A':parseFloat(Math.round(this.fairwayHit * 10) / 10).toFixed(1) + " %";
};

RoundOutIn.prototype.greenInRegString = function() {
    return this.greenInReg==100?'100 %':isNaN(this.greenInReg)?'N/A':parseFloat(Math.round(this.greenInReg * 10) / 10).toFixed(1) + " %";
};

RoundOutIn.prototype.upAndDownString = function() {
    return this.upAndDown==100?'100 %':isNaN(this.upAndDown)?'N/A':parseFloat(Math.round(this.upAndDown * 10) / 10).toFixed(1) + " %";
};

RoundOutIn.prototype.sandSaveString = function() {
    return this.sandSave==100?'100 %':isNaN(this.sandSave)?'N/A':parseFloat(Math.round(this.sandSave * 10) / 10).toFixed(1) + " %";
};

Hole.prototype.setStrokes = function(s) {
    this.strokes = s;

    var pairs = [];

    // Figure out the number of putts
    var p = 0;
    var c = this.camera;
    var tee = this.courseHole.tee;
    projectPoint(tee,c);
    var flag = this.courseHole.flag;
    projectPoint(flag,c);
    var last = this.strokes.length-1;
    var bunker = false;
    this.strokes.forEach(function(d,i){
        projectPoint(d,c);
        if(d.rightLeftPoint[0]!=0&&d.rightLeftPoint[1]!=0){
            d.rightLeftPoint = projectPoint2d(d.rightLeftPoint,d,c);
        } else {
            d.rightLeftPoint = flag.cam;
        }


        if(d.checkFrom('bunker')) bunker = true;

        if(d.firstPutt || p > 0) p++;
        // Create pairs of strokes so we can display paths
        if(i==0)pairs.push(new StrokePair(tee, d,d));
        else if(i==last)pairs.push(new StrokePair(s[i-1],flag,d));
        else pairs.push(new StrokePair(s[i-1],d,d));
    });
    this.bunkerShot = bunker;
    this.numPutts = p;
    this.pairs = pairs;

    // Figure out if GIR
    this.greenInReg = false;
    for(var i = 0; i < this.parValue-1; i++){
        // if shot is in the hole
        // if to location is in on the green
        this.greenInReg = this.strokes[i].inHole || (this.strokes[i].checkFrom('green') && !this.strokes[i].checkFrom('bunker')) || this.strokes[i].firstPutt;

        // if true then break
        if(this.greenInReg) break;
    }

    // Figure out if fairway hit
    this.fairwayHit = this.strokes[0].checkTo('fairway') && this.parValue > 3;

    // Figure out if sand save
    this.sandSave = this.numStrokes == this.parValue && this.bunkerShot;

    // Figure out if up&down
    this.upAndDown = this.numStrokes == this.parValue && (this.strokes[this.parValue-2].checkFrom('fairway') ||
        this.strokes[this.parValue-2].checkFrom('rough') || this.strokes[this.parValue-2].checkFrom('fringe')) && !this.strokes[this.parValue-2].checkFrom('bunker');
};

function projectPoint(d,c){
    var iproj = c.iproj._data;
    var tx = d.sl[0]-convNum(c['hole_target_x']);
    var ty = d.sl[1]-convNum(c['hole_target_y']);
    var tz = d.sl[2]-convNum(c['hole_target_z']);

    var pz = tx*iproj[2][0]+ty*iproj[1][2]+tz*iproj[2][2];
    var s = c.scale/Math.abs((c.dist-pz));

    d.cam = [];

    d.cam[0] = 881.3333333333333/2 + (tx*iproj[0][0]+ty*iproj[1][0])*s;
    d.cam[1] = 400/2 - (tx*iproj[0][1]+ty*iproj[1][1])*s;
}

function projectPoint2d(p,d,c){
    var iproj = c.iproj._data;
    var tx = p[0]-convNum(c['hole_target_x']);
    var ty = p[1]-convNum(c['hole_target_y']);
    var tz = d.sl[2]-convNum(c['hole_target_z']);

    var pz = tx*iproj[2][0]+ty*iproj[1][2]+tz*iproj[2][2];
    var s = c.scale/Math.abs((c.dist-pz));

    var cam = [];

    cam[0] = 881.3333333333333/2 + (tx*iproj[0][0]+ty*iproj[1][0])*s;
    cam[1] = 400/2 - (tx*iproj[0][1]+ty*iproj[1][1])*s;
    return cam;
}

function projectPoint3d(p,c){
    var iproj = c.iproj._data;
    var tx = p[0]-convNum(c['hole_target_x']);
    var ty = p[1]-convNum(c['hole_target_y']);
    var tz = p[2]-convNum(c['hole_target_z']);

    var pz = tx*iproj[2][0]+ty*iproj[1][2]+tz*iproj[2][2];
    var s = c.scale/Math.abs((c.dist-pz));

    var cam = [];

    cam[0] = 881.3333333333333/2 + (tx*iproj[0][0]+ty*iproj[1][0])*s;
    cam[1] = 400/2 - (tx*iproj[0][1]+ty*iproj[1][1])*s;
    return cam;
}

function shortenedLocation(loc){
    if(loc.toLowerCase().indexOf('bunker')>-1)return 'Bunker';
    if(loc.toLowerCase().indexOf('fairway')>-1)return 'Fairway';
    if(loc.toLowerCase().indexOf('primary rough')>-1)return '1st Rough';
    if(loc.toLowerCase().indexOf('secondary rough')>-1)return '2nd Rough';
    if(loc.toLowerCase().indexOf('intermediate rough')>-1)return 'Int Rough';
    return loc;
}

Stroke.prototype.distanceString = function(){
    var dist = Math.round(this.distance/36) + " yd";
    if(this.checkFrom('green')||this.checkFrom('fringe'))dist = parseFloat(Math.round(this.distance/12 * 10) / 10).toFixed(1) + " ft";
    return dist;
};

Stroke.prototype.fromLocationString = function(){
    var dist = Math.round(this.distanceToPinBefore/36) + " yd";
    if(this.checkFrom('green')||this.checkFrom('fringe'))dist = parseFloat(Math.round(this.distanceToPinBefore/12 * 10) / 10).toFixed(1) + " ft";
    return shortenedLocation(this.fromLocation[0])+' / '+dist;
};

Stroke.prototype.fromDistanceString = function(){
    var dist = Math.round(this.distanceToPinBefore/36) + " yd";
    if(this.checkFrom('green')||this.checkFrom('fringe'))dist = parseFloat(Math.round(this.distanceToPinBefore/12 * 10) / 10).toFixed(1) + " ft";
    return dist;
};

Stroke.prototype.holeOutNum = function(){
    return this.numStrokes-this.shotNumber+1;
};

Stroke.prototype.toLocationString = function(){
    return this.inHole?'In Hole':shortenedLocation(this.toLocation[0]);
};

Stroke.prototype.checkFrom = function(loc){
    return this.fromLocation[0].toLowerCase().indexOf(loc) > -1 || this.fromLocation[1].toLowerCase().indexOf(loc) > -1;
};

Stroke.prototype.checkTo = function(loc){
    return this.toLocation[0].toLowerCase().indexOf(loc) > -1 || this.toLocation[1].toLowerCase().indexOf(loc) > -1;
};

Hole.prototype.scoreColor = function(){
    var color = d3.scale.linear()
        .domain([-3,-2, -1, 0, 1, 2, 3,20])
        .range(["#1a9641", "#1a9641", "#a6d96a", "#ffffbf","#f7b942", "#ee5a00", "#d43028", "#d43028"]);
    return color(this.numStrokes-this.parValue);
};

Round.prototype.dateString = function() {
    return moment(this.date).format('dddd, MMM D, YYYY') +' ('+moment(this.date).fromNow()+')';
};