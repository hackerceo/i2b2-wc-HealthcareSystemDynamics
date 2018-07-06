/**
 * @projectDescription	Visualizes locally computed Healthcare System Dynamics information using TimeGrid Heat Map.
 * @inherits	i2b2
 * @namespace	i2b2.HSDLabTests
 * @author		Nick Benik
 * @version 	1.0
 * ----------------------------------------------------------------------------------------
 * 2016-06-08:  Initial Launch [Nick Benik]
 */


i2b2.HSDLabTests.render = {
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
		var matrix_d3 = d3.select(el_svg);
		matrix_d3.selectAll("*").remove();  // clear the SVG

		// add axis labels and underlines
		matrix_d3.append("path")
			.attr("class","arrow")
			.attr("stroke","black")
			.attr("d","M175,20L948,20");
        matrix_d3.append("path")
            .attr("class","arrow")
            .attr("stroke","black")
            .attr("d","M20,75L20,550");
        matrix_d3.append("text")
			.attr("class","l2 HSDLabTests-svgXAxis")
			.attr("x","558.5")
			.attr("y","15")
			.attr("text-anchor","middle");
        matrix_d3.append("text")
            .attr("class","l2 HSDLabTests-svgYAxis")
            .attr("x","-315.5")
            .attr("y","15")
            .attr("text-anchor","middle")
			.attr("transform","rotate(270)");


        // add the grid container
        var grid_d3 = matrix_d3.append('g');
        grid_d3.attr('transform','translate(0,0)')
            .classed('HSDLabTests-grid', true);

		// data structure for nested building of col/row elements
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
		var cell_gs = cells.append('g').attr('class', function(v,i) { return "cell cell-"+v.x+"-"+v.y; });
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
			
		// Build the row labels
		var label_group = matrix_d3.selectAll("g.yaxis")
			.data(stubMatrix[0])
			.enter()
			.append("g")
			.attr("class", function(v,i){ return "l yaxis yaxis-"+i; })
			.attr("transform", (function(v,i) { 
				return "translate(170,"+(81+(this*i)+(this/2))+")"; 
			}).bind(this.config.cellHeight));
		label_group.append("text")
			.attr("class", "l2")
			.attr("text-anchor", "end")
			.text("-----");


		// Build the column labels
		var label_group = matrix_d3.selectAll("g.xaxis")
			.data(stubMatrix)
			.enter()
			.append("g")
			.attr("class", function(v,i){ return "l xaxis xaxis-"+i; })
			.attr("transform", (function(v,i) { 
				return "translate("+(170+(this*i))+", 70)";
			}).bind(this.config.cellWidth));
		label_group.append("text")
			.attr("class", "l2")
			.attr("text-anchor", "middle")
			.attr("x", this.config.cellWidth / 2)
			.text("-----");


		// Build the column summary
		var summary = matrix_d3.append('g');
		summary.attr('transform','translate(0,575)')
			.classed('HSDLabTests-SummaryCol', true);

		var bars = summary.selectAll("g.col-bar")
			.data(stubMatrix)
			.enter()
			.append("g")
			.attr("class", function(v,i) { return "bar col-bar col-bar-"+i; })
			.attr("transform", (function(v,i) { 
				return "translate("+((this*i)+175)+", 0)";
			}).bind(this.config.cellWidth));
        bars.append("rect")
            .attr("stroke", "white")
            .attr("fill", "lightgrey")
            .attr("width", (function(v,i) {
                return this;
            }).bind(this.config.cellWidth));
		bars.append("text")
			.attr("class", "l2")
			.attr("text-anchor", "middle")
			.attr("x", this.config.cellWidth / 2)
			.attr("y", "22")
			.text("---%");
        // column summary axes
		var axis = summary.append("g")
			.attr("transform","translate(948,0)")
			.attr("class", "x axis");
        // tick "0"
		var tick = axis.append("g")
            .attr("class", "tick")
			.attr("style","opacity:1;");
		tick.append("line")
            .attr("x2","-773")
            .attr("y2","0");
        tick.append("text")
            .attr("x","-776")
            .attr("y","0")
            .attr("dy",".32em")
            .attr("style","text-anchor: end;")
			.text("0");
        // tick "100"
        var tick = axis.append("g")
            .attr("class", "tick minor")
			.attr("transform", "translate(0,50)")
            .attr("style","opacity:1;");
        tick.append("line")
            .attr("x2","-773")
            .attr("y2","0");
        tick.append("text")
            .attr("x","-776")
            .attr("y","0")
            .attr("dy",".32em")
            .attr("style","text-anchor: end;")
            .text("50");
        var tick = axis.append("g")
            .attr("class", "tick minor")
            .attr("transform", "translate(0,100)")
            .attr("style","opacity:1;");
        tick.append("line")
            .attr("x2","-773")
            .attr("y2","0");
        tick.append("text")
            .attr("x","-776")
            .attr("y","0")
            .attr("dy",".32em")
            .attr("style","text-anchor: end;")
            .text("100");
        // ending line
        axis.append("path")
			.attr("class","domain")
			.attr("d","M0,0H0V100H0");


        // Build the row summary
        var summary = matrix_d3.append('g');
        summary.attr('transform','translate(973,0)')
            .classed('HSDLabTests-SummaryRow', true);

        var bars = summary.selectAll("g.row-bar")
            .data(stubMatrix[0])
            .enter()
            .append("g")
            .attr("class", function(v,i) { return "bar row-bar row-bar-"+i; })
            .attr("transform", (function(v,i) {
                return "translate(0,"+((this*i)+75)+")";
            }).bind(this.config.cellHeight));
        bars.append("rect")
            .attr("stroke", "white")
            .attr("fill", "lightgrey")
            .attr("height", (function(v,i) {
                return this;
            }).bind(this.config.cellHeight));
        bars.append("text")
            .attr("class", "l2")
            .attr("text-anchor", "start")
            .attr("x", "7")
            .attr("y", (function(v){ return this; }).bind((this.config.cellHeight/2)))
            .attr("dy", ".4em")
            .text("---%");

		// row summary axes
        var axis = summary.append("g")
            .attr("transform","translate(0,550)")
            .attr("class", "y axis");
        // tick "0"
        var tick = axis.append("g")
            .attr("class", "tick")
            .attr("style","opacity:1;");
        tick.append("line")
            .attr("x2","0")
            .attr("y2","-475");
        tick.append("text")
            .attr("x","0")
            .attr("y","-478")
            .attr("dy","0em")
            .attr("style","text-anchor: middle;")
            .text("0");
        // tick "50"
        var tick = axis.append("g")
            .attr("class", "tick minor")
            .attr("transform", "translate(50,0)")
            .attr("style","opacity:1;");
        tick.append("line")
            .attr("x2","0")
            .attr("y2","-475");
        tick.append("text")
            .attr("x","0")
            .attr("y","-478")
            .attr("dy","0em")
            .attr("style","text-anchor: middle;")
            .text("50");
        // tick "100"
        var tick = axis.append("g")
            .attr("class", "tick minor")
            .attr("transform", "translate(100,0)")
            .attr("style","opacity:1;");
        tick.append("line")
            .attr("x2","0")
            .attr("y2","-475");
        tick.append("text")
            .attr("x","0")
            .attr("y","-478")
            .attr("dy","0em")
            .attr("style","text-anchor: middle;")
            .text("100");
        // ending line
        axis.append("path")
            .attr("class","domain")
            .attr("d","M0,0V0H100V0");


	}
};
