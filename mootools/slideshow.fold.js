/**
Script: Slideshow.Fold.js
	Slideshow.Fold - Flash extension for Slideshow.

License:
	MIT-style license.

Copyright:
	Copyright (c) 2008 [Aeron Glemann](http://www.electricprism.com/aeron/).

Dependencies:
	Slideshow.
*/

Slideshow.Fold = new Class({
	Extends: Slideshow,
	
	options: {},
	
/**
Constructor: initialize
	Creates an instance of the Slideshow class.

Arguments:
	element - (element) The wrapper element.
	data - (array or object) The images and optional thumbnails, captions and links for the show.
	options - (object) The options below.

Syntax:
	var myShow = new Slideshow.Fold(element, data, options);
*/

	initialize: function(el, data, options){
		this.parent(el, data, options);
	},

/**
Private method: show
	Does the slideshow effect.
*/

	_show: function(fast){
		if (!this.image.retrieve('tween')){
			var options = (this.options.overlap) ? {'duration': this.options.duration} : {'duration': this.options.duration / 2};
			$$(this.a, this.b).set('tween', $merge(options, {'link': 'chain', 'property': 'clip', 'transition': this.options.transition}));
		}
		var size = {
			'x': this.image.get('width'),
			'y': this.image.get('height')
		}
		if (size.x > this.width)
			size.x = this.width;
		if (size.y > this.height)
			size.y = this.height;
		var img = (this.counter % 2) ? this.a : this.b;
		if (fast){			
			img.get('tween').cancel().set('rect(0, 0, 0, 0)');
			this.image.setStyle('visibility', 'visible').get('tween').cancel().set('auto'); 			
		} 
		else {
			if (this.options.overlap){	
				img.setStyle('visibility', 'visible').get('tween').set('auto');
				this.image.setStyle('visibility', 'visible').get('tween').set('rect(0px, 0px, ' + Math.ceil(size.y / 2) + 'px, 0px)').start('rect(0px, ' + size.x + 'px, ' + Math.ceil(size.y / 2) + 'px, 0px)').start('rect(0px, ' + size.x + 'px, ' + size.y + 'px, 0px)');
			} 
			else	{
				var fn = function(hidden, visible){
					this.image.get('morph').set(hidden).start(visible);
				}.pass([hidden, visible], this);
				var hidden = this.classes.get('images', ((this.direction == 'left') ? 'prev' : 'next'));
				img.get('morph').set(visible).start(hidden).chain(fn);
			}
		}
	}
});