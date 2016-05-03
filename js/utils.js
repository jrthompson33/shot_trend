// Util functions that are usually helpful

function classname(str){
	return str.replace("[\\p{Punct}\\s]+","_").toLowerCase();
}

function convNum(num) {
	return Number(num.replace(',',''));
}

var distancePoints = function(p1, p2) {
	// Find the distance between two points
	return Math.sqrt(Math.pow(p2[0] - p1[0], 2) + Math.pow(p2[1] - p1[1], 2));
};

function rightRoundedRect(x, y, width, height, radius) {
	return "M" + x + "," + y
		+ "h" + (width - radius)
		+ "a" + radius + "," + radius + " 0 0 1 " + radius + "," + radius
		+ "v" + (height - 2 * radius)
		+ "a" + radius + "," + radius + " 0 0 1 " + -radius + "," + radius
		+ "h" + (radius - width)
		+ "z";
}

function leftRoundedRect(x, y, width, height, radius) {
	return "M" + (x+radius)+ "," + y
		+ "h" + width
		+ "v" + height
		+ "h" + -(width-radius)
		+ "a" + -radius + "," + -radius + " 0 0 1 " + -radius + "," + -radius
		+ "v" + -(height - 2 * radius)
		+ "a" + -radius + "," + -radius + " 0 0 1 " + radius + "," + -radius
		+ "z";
}

function randomDate(start, end) {
	return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function randomDateSkewed(start, end, skew) {
	var s = skew + Math.random()/6;
	var dif = end.getTime() - start.getTime();
	return new Date(start.getTime() + dif * s);
}
