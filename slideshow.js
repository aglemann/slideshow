/*
Script: Slideshow.js
	Slideshow - A javascript class for Mootools to stream and animate the presentation of images on your website.

License:
	MIT-style license.

Copyright:
	Copyright (c) 2008 [Aeron Glemann](http://www.electricprism.com/aeron/).
*/

Slideshow = new Class({
	Implements: [Chain, Events, Options],
	
	options: {
		captions: false,
		center: true,
		classes: [],
		controller: false,
		delay: 2000,
		duration: 750,
		fast: false,
		height: false,
		href: '',
		hu: '/',
		linked: false,
		loader: true,
		loop: true,
		match: /\?slide=(\d+)$/,
		overlap: true,
		paused: false,
		quick: false,
		random: false,
		replace: [/\.(.{3})$/, 't.$1'],
		resize: true,
		slide: 0,
		thumbnails: false,
		transition: function(p){ return -(Math.cos(Math.PI * p) - 1) / 2; },
		width: false
	},
	
	// constructor

	initialize: function(el, data, options){	
		this.setOptions(options);
		this.slideshow = $(el);
		if (!this.slideshow) 
			return;
		this.slideshow.set('styles', { display: 'block', position: 'relative' });
		var keys = [ 'first', 'prev', 'play', 'pause', 'next', 'last', 'controller', 'thumbnails', 'captions', 'images', 'hidden', 'visible', 'inactive', 'active', 'hover', 'loader' ];
		var values = keys.map(function(key, i){
			return this.options.classes[i] || key;
		}, this);
		this.classes = values.associate(keys);
		var anchor = this.slideshow.getElement('a[href]') || new Element('a');
		if (!this.options.href)
			this.options.href = anchor.get('href') || '';
		if (this.options.hu.substr(-1) != '/') 
			this.options.hu += '/';
		if (!data){
			data = {};
			this.slideshow.getElements('.' + this.classes.images + ' img').each(function(img){ 
				var el = img.getParent();
				var href = el.get('href') || '';
				var src = img.get('src').split('/').getLast();
				data[src] = { caption: img.get('alt'), href: href };
			});
		}
		if ($type(data) == 'array'){ 
			this.options.captions = false;			
			data = new Array(data.length).associate(data); 
		}
		this.data = { images: [], captions: [], hrefs: [], thumbnails: [] };
		for (image in data){
			this.data.images.push(image);
			var obj = data[image] || {};
			this.data.captions.push(obj.caption || '');
			this.data.hrefs.push(obj.href || ((this.options.linked) ? this.options.hu + image : this.options.href));
			this.data.thumbnails.push(obj.thumbnail || image.replace(this.options.replace[0], this.options.replace[1]));
		}
		if (!this.data.images.length)
			return; 
		var match = window.location.href.match(this.options.match);
		this.counter = 0;
		this.slide = (this.options.match && match) ? match[1] % this.data.images.length : this.options.slide;
		this.paused = false;
		this.transition = 0;
		if (!this.options.overlap)
			this.options.duration *= 2;
		var el = this.slideshow.getElement('img');
		this.a = this.image = (el) ? el : new Asset.image(this.options.hu + this.data.images[this.slide]);
		this.a.set({
			'src': this.options.hu + this.data.images[this.slide],
			'styles': { display: 'block', position: 'absolute', zIndex: 1 }
		});
		var image = this.a.getSize();
		this.width = (this.options.width || image.x);
		this.height = (this.options.height || image.y);		
		if (this.options.width || this.options.height)		
			this._resize(this.a, image.x, image.y);
		var el = this.slideshow.getElement('.' + this.classes.images);
		var images = (el) ? el.empty() : new Element('div', { 'class': this.classes.images }).inject(this.slideshow);
		images.set({ 'styles': { display: 'block', height: this.height, overflow: 'hidden', position: 'relative', width: this.width }});
		this.slideshow.store('images', images);
		anchor.clone().grab(this.a).inject(images);
		this.b = this.a.clone().setStyle('visibility', 'hidden');
		anchor.clone().grab(this.b).inject(images);
		if (this.options.loader)
 			this.loader();
		if (this.options.captions)
 			this.captions();
		if (this.options.controller)
			this.controller();
		if (this.options.thumbnails)
			this.thumbnails();
		document.addEvent('keyup', function(e){
			switch(e.key){
				case 'left': 
					this.prev(e.shift); break;
				case 'right': 
					this.next(e.shift); break;
				case 'space': 
					this.pause(); break;
			}
		}.bind(this));
		this.loaded(this.options.quick);
	},
	
	// preloads the next slide in the show, once loaded triggers the show, updates captions, thumbnails, etc

	preload: function(fast){
		if (this.preloader.complete && $time() > this.delay && $time() > this.transition){			
			this.image = (this.counter % 2) ? this.b : this.a;
			this.image.set({
				'src': this.preloader.get('src'),
				'styles': { height: 'auto', visibility: 'hidden', width: 'auto', zIndex: this.counter }
			});	
			this._resize(this.image, this.preloader.width, this.preloader.height);
			var anchor = this.image.getParent();
			if (this.data.hrefs[this.slide])
				anchor.set('href', this.data.hrefs[this.slide]);			
			else
				anchor.erase('href');	
			if (this.options.loader)
				this.slideshow.retrieve('loader').morph('.' + this.classes.loader + '-' + this.classes.hidden);
			if (this.options.captions)
				this.slideshow.retrieve('captions').fireEvent('update', fast);				
			if (this.options.thumbnails)
				this.slideshow.retrieve('thumbnails').fireEvent('update', fast); 			
			this.show(fast);
			this.loaded();
		} 
		else {
			if ($time() > this.delay && this.options.loader)
				this.slideshow.retrieve('loader').get('morph').set('.' + this.classes.loader + '-' + this.classes.visible);
			this.timer = (this.paused) ? null : this.preload.delay(100, this, fast); 
		}
	},

	// does the slideshow effect

	show: function(fast){
		this._center(this.image);
		if (!this.image.retrieve('morph')){
			var options = (this.options.overlap) ? { duration: this.options.duration, link: 'cancel' } : { duration: this.options.duration / 2, link: 'chain' };
			$$(this.a, this.b).set('morph', $merge(this.options.captions, { transition: this.options.transition }));
		}
		var hidden = '.' + this.classes.images + '-' + ((this.direction == 'left') ? this.classes.next : this.classes.prev);
		var visible = '.' + this.classes.images + '-' + this.classes.visible;
		if (fast)
			this.image.get('morph').cancel().set(visible); 			
		else {
			var img = (this.counter % 2) ? this.a : this.b;
			if (this.options.overlap){	
				img.get('morph').set(visible);
				this.image.get('morph').set(hidden).start(visible);
			} 
			else	{
				var fn = function(hidden, visible){
					this.image.get('morph').set(hidden).start(visible);
				}.pass([hidden, visible], this);
				var hidden = '.' + this.classes.images + '-' + ((this.direction == 'left') ? this.classes.prev : this.classes.next);
				img.get('morph').set(visible).start(hidden).chain(fn);
			}
		}
	},
	
	// run after the current image has been loaded, sets up the next image to be shown

	loaded: function(quick){
		this.counter++;
		this.delay = (this.paused) ? Number.MAX_VALUE : ((quick) ? 0 : $time() + this.options.duration + this.options.delay);
		this.transition = (this.paused) ? 0 : ((this.options.fast) ? 0 : $time() + this.options.duration);
		this.direction = 'left';
		this.slide = (this.options.random && !this.paused) ? $random(0, this.data.images.length - 1) : (this.slide + 1) % this.data.images.length;
		if (this.slide == 0 && !this.options.loop)
			return;
		if (this.preloader)
			this.preloader.destroy();
		this.preloader = new Asset.image(this.options.hu + this.data.images[this.slide]);		
		this.preload();
	},

	// go to the first image in the show

	first: function(){ 
		this.prev(true); 
	},

	// jump to any image in the show

	go: function(n, direction){
		if ((this.slide - 1 + this.data.images.length) % this.data.images.length == n || $time() < this.transition)
			return;		
		$clear(this.timer);
		this.delay = 0;		
		this.direction = (direction) ? direction : ((n < this.slide) ? 'right' : 'left');
		this.slide = n;
		this.preloader.destroy();
		this.preloader = new Asset.image(this.options.hu + this.data.images[this.slide]);
		this.preload(this.options.fast || this.paused);
	},

	// go to the last image in the show

	last: function(){ 
		this.next(true); 
	},

	// go to the next image in the show

	next: function(last){
		var n = (last === true) ? this.data.images.length - 1 : this.slide;
		this.go(n, 'left');
	},

	// toggle whether the slideshow is paused or not

	pause: function(){
		if (this.paused){
			this.paused = false;
			this.delay = 0;
			this.timer = this.preload.delay(100, this);
			[this.a, this.b].each(function(img){
				if (img.retrieve('tween')) img.get('tween').resume();
				if (img.retrieve('morph')) img.get('morph').resume();			
			});
		} 
		else {
			this.paused = true;
			this.delay = Number.MAX_VALUE;
			$clear(this.timer);
			[this.a, this.b].each(function(img){
				if (img.retrieve('tween')) img.get('tween').pause();
				if (img.retrieve('morph')) img.get('morph').pause();			
			});
		}
		if (this.options.controller)
			this.slideshow.getElement('.' + this.classes.pause).toggleClass(this.classes.play);
	},

	// go to the previous image in the show

	prev: function(first){
		var n = (first === true) ? 0 : (this.slide - 2 + this.data.images.length) % this.data.images.length;
		
		this.go(n, 'right');
	},

	// builds the optional streaming loader

	loader: function(){
 		if (this.options.loader === true) 
 			this.options.loader = {}; 		
		var loader = new Element('div', { 
			'class': this.classes.loader,
			'morph': $merge(this.options.loader, { link: 'cancel' })			
		}).inject(this.slideshow.retrieve('images'));
		this.slideshow.retrieve('loader', loader).get('morph').set('.' + this.classes.loader + '-' + this.classes.hidden);
	},
	
	// builds the caption element, adds interactivity

	captions: function(){
 		if (this.options.captions === true) 
 			this.options.captions = {};
		var el = this.slideshow.getElement('.' + this.classes.captions);
		var captions = (el) ? el.empty() : new Element('div', { 'class': this.classes.captions }).inject(this.slideshow);
		captions.set({
			'events': {
				'update': function(fast){	
					var captions = this.slideshow.retrieve('captions');
					var visible = '.' + this.classes.captions + '-' + this.classes.visible;				
					if (fast)
						captions.set('html', this.data.captions[this.slide]).get('morph').cancel().set(visible);
					else {
						var fn = function(n){
							this.slideshow.retrieve('captions').set('html', this.data.captions[n]).morph(visible)
						}.pass(this.slide, this);		
						captions.get('morph').cancel().start('.' + this.classes.captions + '-' + this.classes.hidden).chain(fn);
					}
				}.bind(this)
			},
			'morph': $merge(this.options.captions, { link: 'chain' })
		});
		this.slideshow.retrieve('captions', captions).fireEvent('update');
	},

	// builds the controller element, adds interactivity

	controller: function(){
 		if (this.options.controller === true)
 			this.options.controller = {};
		var el = this.slideshow.getElement('.' + this.classes.controller);
		var controller = (el) ? el.empty() : new Element('div', { 'class': this.classes.controller }).inject(this.slideshow);
		var ul = new Element('ul').inject(controller);
		$H({ first: '⇧←', prev: '←', pause: 'space', next: '→', last: '⇧→' }).each(function(accesskey, action){
			var li = new Element('li', { 'class': this.classes[action] }).inject(ul);
			var a = this.slideshow.retrieve(action, new Element('a', {
				'title': ((action == 'pause') ? this.classes.play.capitalize() + ' / ' : '') + this.classes[action].capitalize() + ' [' + accesskey + ']'				
			}).inject(li));			
			a.set('events', { 
				'click': function(action){ this[action](); }.pass(action, this),
				'mouseenter': function(a){ a.addClass(this.classes.hover); }.pass(a, this),
				'mouseleave': function(a){ a.removeClass(this.classes.hover); }.pass(a, this)
			});
		}, this);
		if (this.options.paused)
			this.pause();
		controller.set({
			'events': {
				'hide': function(hidden){   
					if (!this.retrieve('hidden'))
						this.store('hidden', true).morph(hidden);
				}.pass('.' + this.classes.controller + '-' + this.classes.hidden, controller),
				'show': function(visible){   
					if (this.retrieve('hidden'))
						this.store('hidden', false).morph(visible);
				}.pass('.' + this.classes.controller + '-' + this.classes.visible, controller)
			},
			'morph': $merge(this.options.controller, { link: 'cancel' })
		}).store('hidden', false);
		document.addEvents({
			'keydown': function(e){
				if (e.key.test(/left|right|space/)){
					var controller = this.slideshow.retrieve('controller');
					if (controller.retrieve('hidden'))
						controller.get('morph').set('.' + this.classes.controller + '-' + this.classes.visible); 			
					switch(e.key){
						case 'left': 
							this.slideshow.retrieve((e.shift) ? 'first' : 'prev').fireEvent('mouseenter'); break;
						case 'right':
							this.slideshow.retrieve((e.shift) ? 'last' : 'next').fireEvent('mouseenter'); break;
						default: // space
							this.slideshow.retrieve('pause').fireEvent('mouseenter');
					}
				}
			}.bind(this),
			'keyup': function(e){
				if (e.key.test(/left|right|space/)){
					var controller = this.slideshow.retrieve('controller');
					if (controller.retrieve('hidden'))
						controller.store('hidden', false).fireEvent('hide'); 
					switch(e.key){
						case 'left': 
							this.slideshow.retrieve((e.shift) ? 'first' : 'prev').fireEvent('mouseleave'); break;
						case 'right': 
							this.slideshow.retrieve((e.shift) ? 'last' : 'next').fireEvent('mouseleave'); break;
						default: // space 
							this.slideshow.retrieve('pause').fireEvent('mouseleave');
					}
				}
			}.bind(this),
			'mousemove': function(e){
				var images = this.slideshow.retrieve('images').getCoordinates();
				if (e.page.x > images.left && e.page.x < images.right && e.page.y > images.top && e.page.y < images.bottom)
					this.slideshow.retrieve('controller').fireEvent('show');
				else
					this.slideshow.retrieve('controller').fireEvent('hide');
			}.bind(this)
		});
		this.slideshow.retrieve('controller', controller).fireEvent('hide');
	},

	// builds the thumbnails element, adds interactivity

	thumbnails: function(){
 		if (this.options.thumbnails === true) 
 			this.options.thumbnails = {}; 
		var el = this.slideshow.getElement('.' + this.classes.thumbnails);
		var thumbnails = (el) ? el.empty() : new Element('div', { 'class': this.classes.thumbnails }).inject(this.slideshow);
		thumbnails.setStyle('overflow', 'hidden');
		var ul = new Element('ul', { 'tween': { link: 'cancel' }}).inject(thumbnails);
		this.data.thumbnails.each(function(thumbnail, i){
			var li = new Element('li').inject(ul);
			var a = new Element('a', {
				'class': this.classes.thumbnails + '-' + this.classes.hidden,
				'href': this.options.hu + this.data.images[i],
				'morph': $merge(this.options.thumbnails, { link: 'cancel' }),
				'title': this.data.captions[i]
			}).store('active', true).inject(li);
			a.set('events', {
				'click': function(i){ 
					this.go(i); 
					return false; 
				}.pass(i, this),
				'loaded': function(a){ 
					a.morph('.' + this.classes.thumbnails + '-' + this.classes.visible);
					this.data.thumbnails.pop();
					if (!this.data.thumbnails.length){
						var div = thumbnails.getCoordinates();
						var props = thumbnails.retrieve('props');			
						var limit = 0, pos = props[1], size = props[2];		
						thumbnails.getElements('li').each(function(li){			
							var li = li.getCoordinates();		
							if (li[pos] > limit){ limit = li[pos]; }
						}, this);			
						thumbnails.store('limit', div[size] + div[props[0]] - limit);
					}
				}.pass(a, this)
			});
			var img = new Asset.image(this.options.hu + thumbnail, { 
				'onload': function(){ this.fireEvent('loaded'); }.bind(a) 
			}).inject(a);
		}, this);
		thumbnails.set('events', {
			'scroll': function(n, fast){
				var div = this.getCoordinates();
				var ul = this.getElement('ul').getPosition();
				var props = this.retrieve('props');
				var axis = props[3], delta, pos = props[0], size = props[2];				
				var tween = this.getElement('ul').get('tween', pos);	
				tween.property = pos;
				if ($chk(n)){
					var li = this.getElements('li')[n].getCoordinates();
					var delta = div[pos] + (div[size] / 2) - (li[size] / 2) - li[pos]	
					var value = (ul[axis] - div[pos] + delta).limit(this.retrieve('limit'), 0);
					if (fast)	
						tween.set(value);
					else						 
						this.getElement('ul').tween(pos, value);
				}
				else{
					var area = div[props[2]] / 3, page = this.retrieve('page'), velocity = -0.2;			
					if (page[axis] < (div[pos] + area))
						delta = (page[axis] - div[pos] - area) * velocity;
					else if (page[axis] > (div[pos] + div[size] - area))
						delta = (page[axis] - div[pos] - div[size] + area) * velocity;			
					if (delta){			
						var value = (ul[axis] - div[pos] + delta).limit(this.retrieve('limit'), 0);
						tween.set(value);
					}
				}				
			}.bind(thumbnails),
			'update': function(fast){
				var thumbnails = this.slideshow.retrieve('thumbnails');
				thumbnails.getElements('a').each(function(a, i){	
					if (i == this.slide){
						if (!a.retrieve('active')){ 
							a.store('active', true);
							var active = '.' + this.classes.thumbnails + '-' + this.classes.active;							
							if (fast) 
								a.get('morph').set(active);
							else 
								a.morph(active);
						}
					} 
					else {
						if (a.retrieve('active')){
							a.store('active', false);
							var inactive = '.' + this.classes.thumbnails + '-' + this.classes.inactive;						
							if (fast) 
								a.get('morph').set(inactive);
							else 
								a.morph(inactive);
						}
					}
				}, this);
				if (!thumbnails.retrieve('mouseover'))
					thumbnails.fireEvent('scroll', [this.slide, fast]);
			}.bind(this)
		})
		var div = thumbnails.getCoordinates();
		thumbnails.store('props', (div.height > div.width) ? ['top', 'bottom', 'height', 'y'] : ['left', 'right', 'width', 'x']);
		document.addEvent('mousemove', function(e){
			var div = this.getCoordinates();
			if (e.page.x > div.left && e.page.x < div.right && e.page.y > div.top && e.page.y < div.bottom){
				this.store('page', e.page);			
				if (!this.retrieve('mouseover')){
					this.store('mouseover', true);
					this.store('timer', function(){ this.fireEvent('scroll'); }.periodical(50, this));
				}
			}
			else {
				if (this.retrieve('mouseover')){
					this.store('mouseover', false);				
					$clear(this.retrieve('timer'));
				}
			}
		}.bind(thumbnails));
		this.slideshow.retrieve('thumbnails', thumbnails).fireEvent('update', true);
	},
	
	// helper function to center an image

	_center: function(img){
		if (this.options.center){
			var size = img.getSize();
			img.set('styles', { left: (size.x - this.width) / -2, top: (size.y - this.height) / -2 });
		}
	},

	// helper function to resize an image

	_resize: function(img, w, h){
		if (this.options.resize){
			var dh = this.height / h;
			var dw = this.width / w;
			var delta = (dw > dh) ? dw : dh;
			img.set('styles', { height: Math.ceil(h * delta), width: Math.ceil(w * delta) });
		}	
	}
});