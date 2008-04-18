/*
Script: Slideshow.KenBurns.js
	Slideshow.KenBurns - A javascript class for Mootools to stream and animate the presentation of images on your website.

License:
	MIT-style license.

Copyright:
	Copyright (c) 2008 [Aeron Glemann](http://www.electricprism.com/aeron/).
*/

Slideshow.KenBurns = new Class({
	Extends: Slideshow,
	
	options: {
		pan: 100,
		zoom: 50
	},
	
	// constructor

	initialize: function(el, data, options){
		options.overlap = true;
		options.resize = true;				
		this.parent(el, data, options);
		['pan', 'zoom'].each(function(p){
				if ($type(this.options[p] != 'array')) this.options[p] = [this.options[p], this.options[p]];
				this.options[p].map(function(n){ return (n.toInt() || 0).limit(0, 100); });
		}, this);
		$$(this.a, this.b).set({
			'morph': { duration: (this.options.delay + this.options.duration * 2), link: 'cancel', transition: Fx.Transitions.linear },
			'tween': { duration: this.options.duration, link: 'cancel' }
		});
	},

	// does the slideshow effect

	show: function(fast){
		this.image.set('styles', { bottom: 'auto', left: 'auto', right: 'auto', top: 'auto' });
		var props = ['top left', 'top right', 'bottom left', 'bottom right'][this.counter % 4].split(' ');
		props.each(function(prop){ this.image.setStyle(prop, 0); }, this);
		dh = this.height / this.preloader.height;
		dw = this.width / this.preloader.width;
		delta = (dw > dh) ? dw : dh;
		var values = {};
		var zoom = ($random.run(this.options.zoom) / 100.0) + 1;
		var pan = Math.abs(($random.run(this.options.pan) / 100.0) - 1);
		['height', 'width'].each(function(prop, i){
			var e = Math.ceil(this.preloader[prop] * delta);
			var s = (e * zoom).toInt();		
			values[prop] = [s, e];
			if (dw > dh || i){
				var e = (this[prop] - this.image[prop]);
				var s = (e * pan).toInt();			
				values[props[i]] = [s, e];
			}
		}, this);
		if (fast){
			this._center(this.image);
			this.image.get('tween').cancel();
			this.image.get('morph').cancel();
			this.image.fade('show');
		} 
		else{
			this.image.set('styles', { opacity: 0, visibility: 'visible' });
			this.image.fade('in');
			this.image.morph(values);
		}
	}
});