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
	
/**
Private method: show
	Does the slideshow effect.
*/

	_show: function(fast){
		if (!this.image.retrieve('tween')){
			var options = (this.options.overlap) ? {'duration': this.options.duration} : {'duration': this.options.duration / 2};
			$$(this.a, this.b).set('tween', Object.merge(options, {'link': 'chain', 'onStart': this._start.bind(this), 'onComplete': this._complete.bind(this), 'property': 'clip', 'transition': this.options.transition}));
		}
		var img = (this.counter % 2) ? this.a : this.b,
			rect = this._rect(this.image),
			half = Math.ceil(rect.top + (rect.bottom - rect.top) / 2),
			rects = [
				(rect.top + ' ' + rect.left + ' ' + half + ' ' + rect.left),
				(rect.top + ' ' + rect.right + ' ' + half + ' ' + rect.left),
				(rect.top + ' ' + rect.right + ' ' + rect.bottom + ' ' + rect.left)
			];
			
		if (fast){			
			img.get('tween').cancel().set('rect(0, 0, 0, 0)');
			this.image.get('tween').cancel().set('rect(auto, auto, auto, auto)'); 			
		} 
		else {
			this.direction == 'right' && rects.reverse();
			if (this.options.overlap){	
				img.get('tween').set('rect(auto, auto, auto, auto)');
				this.image.get('tween').set(rects[0]).start(rects[1]).start(rects[2]);
			} 
			else	{
				var fn = function(rects){
					this.image.get('tween').set(rects[0]).start(rects[1]).start(rects[2]);
				}.pass(rects, this);
				if (this.firstrun)
					return fn();
				rect = this._rect(img);
				rects = [
					(rect.top + ' ' + rect.right + ' ' + rect.bottom + ' ' + rect.left),
					(rect.top + ' ' + rect.right + ' ' + half + ' ' + rect.left),
					(rect.top + ' ' + rect.left + ' ' + half + ' ' + rect.left)
				];
				this.direction == 'right' && rects.reverse();
				img.get('tween').set(rects[0]).start(rects[1]).start(rects[2]).chain(fn);
			}
		}
	},
	
	/**
	Private method: rect
		Calculates the clipping rect
	*/

	_rect: function(img){
		var rect = img.getCoordinates(this.el.retrieve('images'));
		rect.left = (rect.left < 0) ? Math.abs(rect.left) : 0;
		rect.top = (rect.top < 0) ? Math.abs(rect.top) : 0;
		rect.right = (rect.right > this.width) ? rect.left + this.width : rect.width;
		rect.bottom = (rect.bottom > this.height) ? rect.top + this.height : rect.height;
		return rect;		
	}
});