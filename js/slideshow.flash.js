/*
Script: Slideshow.Flash.js
	Slideshow.Flash - Flash extension for Slideshow.

License:
	MIT-style license.

Copyright:
	Copyright (c) 2008 [Aeron Glemann](http://www.electricprism.com/aeron/).
*/

Slideshow.Flash = new Class({
	Extends: Slideshow,
	
	options: {
		color: ['#FFF']
	},
	
	// constructor

	initialize: function(el, data, options){
		options.overlap = true;
		if (options.color)
			options.color = $splat(options.color);
		this.parent(el, data, options);
	},

	// does the slideshow effect

	show: function(fast){
		if (!this.image.retrieve('tween'))
		  $$(this.a, this.b).set('tween', {'duration': this.options.duration, 'link': 'cancel', 'property': 'opacity'});
		this._center(this.image);
		if (fast)
			this.image.get('tween').cancel().set(1);
		else {
			this.slideshow.retrieve('images').setStyle('background', this.options.color[this.slide % this.options.color.length]);
			var img = (this.counter % 2) ? this.a : this.b;
			img.get('tween').cancel().set(0);
			this.image.get('tween').set(0).start(1);
		}
	}
});