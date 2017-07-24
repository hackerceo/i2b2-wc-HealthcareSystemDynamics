/**
 * @projectDescription	Visualizes locally computed Healthcare System Dynamics information using TimeGrid Heat Map.
 * @inherits	i2b2
 * @namespace	i2b2.HealthcareSystemDynamicsTime
 * @author		Nick Benik
 * @version 	1.0
 * ----------------------------------------------------------------------------------------
 * 2016-06-08:  Initial Launch [Nick Benik]
 */


i2b2.HealthcareSystemDynamicsTime.render = {
	config: {
		width: 773,
		height: 475 
	},
	build: function(el_svg, colCnt, rowCnt) {

		// make the data matrix

		this.config.cellWidth = (this.config.width / colCnt);
		this.config.cellHeight = (this.config.height / rowCnt);

		stubMatrix = [];
		for(var x=0; x < colCnt; x++) {
			stubMatrix[x] = [];
			for(var y=0; y < rowCnt; y++) {
				stubMatrix[x][y] = {
					'x': (function() { return x; })(),
					'y': (function() { return y; })(),
					'width': this.config.cellWidth,
					'height': this.config.cellHeight
				};
			}
		}


/*
		var stubRows = [];
		stubRows[rowCnt-1] = 0;
		stubRows.fill({width: (this.config.width / colCnt), height: (this.config.height / rowCnt)});
	
		var stubMatrix = [];
		stubMatrix[colCnt-1] = 0;
		stubMatrix.fill(stubRows);


		var xl = stubMatrix.length;
		var yl = stubMatrix[0].length;
		for(var x=0; x < xl; x++) {
			for(var y=0; y < yl; y++) {
				stubMatrix[x][y].x = x;
				stubMatrix[x][y].y = y;
			}
		}
*/

		// clear the SVG
		alert("clear the SVG");

		var matrix_d3 = d3.select(el_svg);
//		matrix_d3.selectAll("*").remove();  // clear the SVG
		var grid_d3 = matrix_d3.append('g');
		grid_d3.attr('transform','translate(0,0)')
			.classed('HSDHeatMap-grid', true);

		// nested building of col/row elements
		var cells = grid_d3.selectAll("g.col")
			.data(stubMatrix)
			.enter()
			.append('g')
			.attr('class', function(v,i) { return "col col-"+i; })
			.attr('transform', (function(v,i) { return "translate("+(175+(this*i))+",75)"}).bind(this.config.cellWidth))
			.selectAll("g.row")
				.data(function(d) { return d; })
				.enter()
				.append('g')
				.attr('transform',(function(v,i){ return "translate(0,"+(this*i)+")"; }).bind(this.config.cellHeight))
				.attr('class',function(v,i){ return "row row-"+i; });

		// add the individual cells now
		cell_gs = cells.append('g').attr('class', function(v,i) { return "cell cell-"+v.x+"-"+v.y; });
		cell_gs.append("rect")
			.attr("width",function(d){ return d.width})
			.attr("height",function(d){ return d.height})
			.attr("fill","lightgrey");
		cell_gs.append("text")
			.attr("class","l2")
			.attr("y", function(d) { return 11 + ((d.height-11)/2)})
			.attr("x",function(d){ return d.width / 2;})
			.attr("text-anchor","middle")
			.text("-");
			


		
	}
};
