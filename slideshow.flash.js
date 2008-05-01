/*
Script: Slideshow.Flash.js
	Slideshow.Flash - A javascript class for Mootools to stream and animate the presentation of images on your website.

License:
	MIT-style license.

Copyright:
	Copyright (c) 2008 [Aeron Glemann](http://www.electricprism.com/aeron/).
*/

Slideshow.Flash = new Class({
	Extends: Slideshow,
	
	options: {
		color: '#FFF'
	},
	
	// constructor

	initialize: function(el, data, options){
		options.overlap = true;			
		this.parent(el, data, options);
		if ($type(this.options.color) == 'string') this.options.color = [this.options.color];
		$$(this.a, this.b).set('tween', { 'duration': this.options.duration, 'link': 'cancel' });
	},

	// does the slideshow effect

	show: function(fast){
		this._center(this.image);
		if (fast){
			this.image.get('tween').cancel();
			this.image.fade('show');
		} 
		else {
			this.slideshow.retrieve('images').setStyle('background', this.options.color[this.slide % this.options.color.length]);
			var img = (this.counter % 2) ? this.a : this.b;
			img.get('tween').cancel().set('opacity', 0);
			this.image.fade('hide').fade('in');
		}
	}
});