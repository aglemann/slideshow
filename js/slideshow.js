/*
Script: Slideshow.js
	Slideshow - A javascript class for Mootools to stream and animate the presentation of images on your website.

License:
	MIT-style license.

Copyright:
	Copyright (c) 2008 [Aeron Glemann](http://www.electricprism.com/aeron/).
	
Dependencies:
	Assets, Fx.Morph, Fx.Tween, Selectors, Element.Dimensions.
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
		loader: {'animate': ['../css/loader-#.png', 12]},
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
		transition: function(p){return -(Math.cos(Math.PI * p) - 1) / 2;},
		width: false
	},
	
	// constructor

	initialize: function(el, data, options){	
		this.setOptions(options);
		this.slideshow = $(el);
		if (!this.slideshow) 
			return;
		this.slideshow.set('styles', {'display': 'block', 'position': 'relative'});
		var keys = ['slideshow', 'first', 'prev', 'play', 'pause', 'next', 'last', 'images', 'captions', 'controller', 'thumbnails', 'hidden', 'visible', 'inactive', 'active', 'loader'];
		var values = keys.map(function(key, i){
			return this.options.classes[i] || key;
		}, this);
		this.classes = values.associate(keys);
		this.classes.get = function(){
			var str = '.' + this.slideshow;
			for (var i = 0, l = arguments.length; i < l; i++)
				str += ('-' + this[arguments[i]]);
			return str;
		}.bind(this.classes)
		var anchor = this.slideshow.getElement('a') || new Element('a');
		if (!this.options.href)
			this.options.href = anchor.get('href') || '';
		if (this.options.hu.substr(-1) != '/') 
			this.options.hu += '/';
		if (!data){
			data = {};
			this.slideshow.getElements(this.classes.get('images') + ' img').each(function(img){
				var el = img.getParent();
				var href = el.get('href') || '';
				var src = img.get('src').split('/').getLast();
				data[src] = {caption: img.get('alt'), href: href};
			});
		}
		this.load(data);
		if (!this.data.images.length)
			return; 
		var match = window.location.href.match(this.options.match);
		this.counter = 0;
		this.slide = (this.options.match && match) ? match[1] % this.data.images.length : this.options.slide;
		this.paused = this.stopped = false;
		if (!this.options.overlap)
			this.options.duration *= 2;
		var el = this.slideshow.getElement('img');
		this.a = this.image = (el) ? el : new Element('img');
		this.a.set({
			'src': this.options.hu + this.data.images[this.slide],
			'styles': {'display': 'block', 'position': 'absolute', 'zIndex': 1}
		});
		var image = this.a.getSize();
		this.width = (this.options.width || image.x);
		this.height = (this.options.height || image.y);		
		if (this.options.width || this.options.height)		
			this._resize(this.a, image.x, image.y);
		var el = this.slideshow.getElement(this.classes.get('images'));
		var images = (el) ? el.empty() : new Element('div', {'class': this.classes.get('images').substr(1)}).inject(this.slideshow);
		images.set({'styles': {'display': 'block', 'height': this.height, 'overflow': 'hidden', 'position': 'relative', 'width': this.width}});
		this.slideshow.store('images', images);
		if (this.data.hrefs[this.slide])
			anchor.set('href', this.data.hrefs[this.slide]);		
		anchor.clone().grab(this.a).inject(images);
		this.b = this.a.clone().setStyle('visibility', 'hidden');
		anchor.clone().grab(this.b).inject(images);
		this.events = $H({'keydown': [], 'keyup': [], 'mousemove': []});
		if (this.options.loader)
 			this.loader();
		if (this.options.captions)
 			this.captions();
		if (this.options.controller)
			this.controller();
		if (this.options.thumbnails)
			this.thumbnails();
		var keyup = function(e){
			switch(e.key){
				case 'left': 
					this.prev(e.shift); break;
				case 'right': 
					this.next(e.shift); break;
				case 'space': 
					this.pause(); break;
			}
		}.bind(this);		
		this.events.keyup.push(keyup);
		document.addEvent('keyup', keyup);
		if (this.options.paused)
			this.pause();
		if (this.data.images.length > 1)
			this.loaded(this.options.quick);
	},
	
	// loads data

	load: function(data){
		this.showed = {'array': [], 'i': 0};
		if ($type(data) == 'array'){
			this.options.captions = false;			
			data = new Array(data.length).associate(data); 
		}
		this.data = {'images': [], 'captions': [], 'hrefs': [], 'thumbnails': []};
		for (image in data){
			var obj = data[image] || {};
			var caption = (obj.caption) ? obj.caption.trim() : '';
			var href = (obj.href) ? obj.href.trim() : ((this.options.linked) ? this.options.hu + image : this.options.href);
			var thumbnail = (obj.thumbnail) ? obj.thumbnail.trim() : image.replace(this.options.replace[0], this.options.replace[1]);
			this.data.images.push(image);
			this.data.captions.push(caption);
			this.data.hrefs.push(href);
			this.data.thumbnails.push(thumbnail);
		}
		if (this.options.thumbnails && this.slideshow.retrieve('thumbnails'))
			this.thumbnails();
		if (this.slideshow.retrieve('images')){
			[this.a, this.b].each(function(img){
				['morph', 'tween'].each(function(p){
					if (this.retrieve(p)) this.get(p).cancel();
				}, img);
			});
			this.slide = this.transition = 0;
			this.go(0);		
		}
		return this.data.images.length;
	},
	
	// preloads the next slide in the show, once loaded triggers the show, updates captions, thumbnails, etc

	preload: function(fast){
		if (this.preloader.complete && $time() > this.delay && $time() > this.transition){
			if (this.stopped){
				if (this.options.captions)
					this.slideshow.retrieve('captions').get('morph').cancel().start(this.classes.get('captions', 'hidden'));
				this.pause(1);
				return;				
			}					
			this.image = (this.counter % 2) ? this.b : this.a;
			this.image.set({
				'src': this.preloader.get('src'),
				'styles': {'height': 'auto', 'visibility': 'hidden', 'width': 'auto', 'zIndex': this.counter}
			});	
			this._resize(this.image, this.preloader.width, this.preloader.height);
			var anchor = this.image.getParent();
			if (this.data.hrefs[this.slide])
				anchor.set('href', this.data.hrefs[this.slide]);			
			else
				anchor.erase('href');	
			if (this.options.loader)
				this.slideshow.retrieve('loader').fireEvent('hide');
			if (this.options.captions)
				this.slideshow.retrieve('captions').fireEvent('update', fast);				
			if (this.options.thumbnails)
				this.slideshow.retrieve('thumbnails').fireEvent('update', fast); 			
			this.show(fast);
			this.loaded();
		} 
		else {
			if ($time() > this.delay && this.options.loader)
				this.slideshow.retrieve('loader').fireEvent('show');
			this.timer = (this.paused) ? null : this.preload.delay(100, this, fast); 
		}
	},

	// does the slideshow effect

	show: function(fast){
		if (!this.image.retrieve('morph')){
			var options = (this.options.overlap) ? {'duration': this.options.duration, 'link': 'cancel'} : {'duration': this.options.duration / 2, 'link': 'chain'};
			$$(this.a, this.b).set('morph', $merge(options, {'transition': this.options.transition}));
		}
		this._center(this.image);
		var hidden = this.classes.get('images', ((this.direction == 'left') ? 'next' : 'prev'));
		var visible = this.classes.get('images', 'visible');
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
				var hidden = this.classes.get('images', ((this.direction == 'left') ? 'prev' : 'next'));
				img.get('morph').set(visible).start(hidden).chain(fn);
			}
		}
	},
	
	// run after the current image has been loaded, sets up the next image to be shown

	loaded: function(quick){
		this.counter++;
		if (this.paused){
			this.delay = Number.MAX_VALUE;
			this.transition = 0;			
		}
		else {
			this.delay = (quick) ? 0 : $time() + this.options.duration + this.options.delay;
			this.transition = (quick || this.options.fast) ? 0 : $time() + this.options.duration;			
		}
		this.direction = 'left';
		if (this.slide + 1 == this.data.images.length && !this.options.loop && !this.options.random)
			this.stopped = true;
		if (this.options.random){
			this.showed.i++;
			if (this.showed.i >= this.showed.array.length){
				var n = this.slide;
				if (this.showed.array.getLast() != n) this.showed.array.push(n);
				while (this.slide == n)
					this.slide = $random(0, this.data.images.length - 1);				
			}
			else
				this.slide = this.showed.array[this.showed.i];
		}
		else
			this.slide = (this.slide + 1) % this.data.images.length;
		if (this.preloader) this.preloader.destroy();
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
		if (this.preloader) this.preloader.destroy();
		this.preloader = new Asset.image(this.options.hu + this.data.images[this.slide]);
		this.preload(this.options.fast || this.paused);
	},

	// go to the last image in the show

	last: function(){
		this.next(true); 
	},

	// go to the next image in the show

	next: function(last){
		var n = (last) ? this.data.images.length - 1 : this.slide;
		this.go(n, 'left');
	},

	// toggle whether the slideshow is paused or not

	pause: function(p){
		if ($chk(p))
			this.paused = (p) ? false : true;
		if (this.paused){
			this.paused = this.stopped = false;
			this.delay = this.transition = 0;		
			this.timer = this.preload.delay(100, this);
			[this.a, this.b].each(function(img){
				['morph', 'tween'].each(function(p){
					if (this.retrieve(p)) this.get(p).resume();
				}, img);
			});
			if (this.options.controller)
				this.slideshow.getElement('.' + this.classes.pause).removeClass(this.classes.play);
		} 
		else {
			this.paused = true;
			this.delay = Number.MAX_VALUE;
			this.transition = 0;
			$clear(this.timer);
			[this.a, this.b].each(function(img){
				['morph', 'tween'].each(function(p){
					if (this.retrieve(p)) this.get(p).pause();
				}, img);
			});
			if (this.options.controller)
				this.slideshow.getElement('.' + this.classes.pause).addClass(this.classes.play);
		}
	},
	
	// go to the previous image in the show

	prev: function(first){
		if (first)
			var n = 0;
		else {
			if (this.options.random){
				if (this.showed.i < 2)
					return;
				this.showed.i -= 2;
				var n = this.showed.array[this.showed.i];
			}
			else
				var n = (this.slide - 2 + this.data.images.length) % this.data.images.length;									
		}
		this.go(n, 'right');
	},

	// builds the optional streaming loader

	loader: function(){
 		if (this.options.loader === true) 
 			this.options.loader = {};
		var loader = new Element('div', {
			'class': this.classes.get('loader').substr(1),				
			'morph': $merge(this.options.loader, {'link': 'cancel'})
		}).store('hidden', false).store('i', 1).inject(this.slideshow.retrieve('images'));
		if (this.options.loader.animate){
			for (var i = 0; i < this.options.loader.animate[1]; i++)
				img = new Asset.image(this.options.loader.animate[0].replace(/#/, i));
			if (Browser.trident4 && this.options.loader.animate[0].contains('png'))
				loader.setStyle('backgroundImage', 'none');					
		}
		loader.set('events', {
			'animate': function(){  
				var loader = this.slideshow.retrieve('loader');				
				var i = (loader.retrieve('i').toInt() + 1) % this.options.loader.animate[1];
				loader.store('i', i);
				var img = this.options.loader.animate[0].replace(/#/, i);
				if (Browser.trident4 && this.options.loader.animate[0].contains('png'))
					loader.style.filter = 'progid:DXImageTransform.Microsoft.AlphaImageLoader(src="' + img + '", sizingMethod="scale")';
				else 
					loader.setStyle('backgroundImage', 'url(' + img + ')');
			}.bind(this),
			'hide': function(){  
				var loader = this.slideshow.retrieve('loader');
				if (!loader.retrieve('hidden')){
					loader.store('hidden', true).morph(this.classes.get('loader', 'hidden'));
					if (this.options.loader.animate)
						$clear(loader.retrieve('timer'));					
				}
			}.bind(this),
			'show': function(){  
				var loader = this.slideshow.retrieve('loader');
				if (loader.retrieve('hidden')){
					loader.store('hidden', false).morph(this.classes.get('loader', 'visible'));
					if (this.options.loader.animate)
						loader.store('timer', function(){this.fireEvent('animate');}.periodical(50, loader));
				}
			}.bind(this)
		});
		this.slideshow.retrieve('loader', loader).fireEvent('hide');
	},
	
	// builds the optional caption element, adds interactivity

	captions: function(){
 		if (this.options.captions === true) 
 			this.options.captions = {};
		var el = this.slideshow.getElement(this.classes.get('captions'));
		var captions = (el) ? el.empty() : new Element('div', {'class': this.classes.get('captions').substr(1)}).inject(this.slideshow);
		captions.set({
			'events': {
				'update': function(fast){	
					var captions = this.slideshow.retrieve('captions');
					var empty = (this.data.captions[this.slide] == '');
					if (fast){
						var p = (empty) ? 'hidden' : 'visible';
						captions.set('html', this.data.captions[this.slide]).get('morph').cancel().set(this.classes.get('captions', p));						
					}
					else {
						var fn = (empty) ? $empty : function(n){
							this.slideshow.retrieve('captions').set('html', this.data.captions[n]).morph(this.classes.get('captions', 'visible'))
						}.pass(this.slide, this);		
						captions.get('morph').cancel().start(this.classes.get('captions', 'hidden')).chain(fn);
					}
				}.bind(this)
			},
			'morph': $merge(this.options.captions, {'link': 'chain'})
		});
		this.slideshow.retrieve('captions', captions).fireEvent('update');
	},

	// builds the optional controller element, adds interactivity

	controller: function(){
 		if (this.options.controller === true)
 			this.options.controller = {};
		var el = this.slideshow.getElement(this.classes.get('controller'));
		var controller = (el) ? el.empty() : new Element('div', {'class': this.classes.get('controller').substr(1)}).inject(this.slideshow);
		var ul = new Element('ul').inject(controller);
		$H({'first': '⇧←', 'prev': '←', 'pause': 'space', 'next': '→', 'last': '⇧→'}).each(function(accesskey, action){
			var li = new Element('li', {'class': this.classes[action]}).inject(ul);
			var a = this.slideshow.retrieve(action, new Element('a', {
				'title': ((action == 'pause') ? this.classes.play.capitalize() + ' / ' : '') + this.classes[action].capitalize() + ' [' + accesskey + ']'				
			}).inject(li));
			a.set('events', {
				'click': function(action){this[action]();}.pass(action, this),
				'mouseenter': function(active){this.addClass(active);}.pass(this.classes.active, a),
				'mouseleave': function(active){this.removeClass(active);}.pass(this.classes.active, a)
			});		
		}, this);
		controller.set({
			'events': {
				'hide': function(hidden){  
					if (!this.retrieve('hidden'))
						this.store('hidden', true).morph(hidden);
				}.pass(this.classes.get('controller', 'hidden'), controller),
				'show': function(visible){  
					if (this.retrieve('hidden'))
						this.store('hidden', false).morph(visible);
				}.pass(this.classes.get('controller', 'visible'), controller)
			},
			'morph': $merge(this.options.controller, {'link': 'cancel'})
		}).store('hidden', false);
		var keydown = function(e){
			if (e.key.test(/left|right|space/)){
				var controller = this.slideshow.retrieve('controller');
				if (controller.retrieve('hidden'))
					controller.get('morph').set(this.classes.get('controller', 'visible')); 			
				switch(e.key){
					case 'left': 
						this.slideshow.retrieve((e.shift) ? 'first' : 'prev').fireEvent('mouseenter'); break;
					case 'right':
						this.slideshow.retrieve((e.shift) ? 'last' : 'next').fireEvent('mouseenter'); break;
					default:
						this.slideshow.retrieve('pause').fireEvent('mouseenter');
				}
			}
		}.bind(this);
		this.events.keydown.push(keydown);
		var keyup = function(e){
			if (e.key.test(/left|right|space/)){
				var controller = this.slideshow.retrieve('controller');
				if (controller.retrieve('hidden'))
					controller.store('hidden', false).fireEvent('hide'); 
				switch(e.key){
					case 'left': 
						this.slideshow.retrieve((e.shift) ? 'first' : 'prev').fireEvent('mouseleave'); break;
					case 'right': 
						this.slideshow.retrieve((e.shift) ? 'last' : 'next').fireEvent('mouseleave'); break;
					default:
						this.slideshow.retrieve('pause').fireEvent('mouseleave');
				}
			}
		}.bind(this);
		this.events.keyup.push(keyup);
		var mousemove = function(e){
			var images = this.slideshow.retrieve('images').getCoordinates();
			if (e.page.x > images.left && e.page.x < images.right && e.page.y > images.top && e.page.y < images.bottom)
				this.slideshow.retrieve('controller').fireEvent('show');
			else
				this.slideshow.retrieve('controller').fireEvent('hide');
		}.bind(this);
		this.events.mousemove.push(mousemove);
		document.addEvents({'keydown': keydown, 'keyup': keyup, 'mousemove': mousemove});
		this.slideshow.retrieve('controller', controller).fireEvent('hide');
	},

	// builds the optional thumbnails element, adds interactivity

	thumbnails: function(){
 		if (this.options.thumbnails === true) 
 			this.options.thumbnails = {}; 
		var el = this.slideshow.getElement(this.classes.get('thumbnails'));
		var thumbnails = (el) ? el.empty() : new Element('div', {'class': this.classes.get('thumbnails').substr(1)}).inject(this.slideshow);
		thumbnails.setStyle('overflow', 'hidden');
		var ul = new Element('ul', {'tween': {'link': 'cancel'}}).inject(thumbnails);
		this.data.thumbnails.each(function(thumbnail, i){
			var li = new Element('li').inject(ul);
			var a = new Element('a', {
				'events': {
					'click': function(i){
						this.go(i); 
						return false; 
					}.pass(i, this),
					'loaded': function(){
						this.data.thumbnails.pop();
						if (!this.data.thumbnails.length){
							var div = thumbnails.getCoordinates();
							var props = thumbnails.retrieve('props');			
							var limit = 0, pos = props[1], size = props[2];		
							thumbnails.getElements('li').each(function(li){			
								var li = li.getCoordinates();		
								if (li[pos] > limit) limit = li[pos];
							}, this);			
							thumbnails.store('limit', div[size] + div[props[0]] - limit);
						}
					}.bind(this)
				},
				'href': this.options.hu + this.data.images[i],
				'morph': $merge(this.options.thumbnails, {'link': 'cancel'}),
				'title': this.data.captions[i]
			}).inject(li);
			var img = new Asset.image(this.options.hu + thumbnail, {
				'onload': function(){this.fireEvent('loaded');}.bind(a) 
			}).inject(a);
		}, this);
		thumbnails.set('events', {
			'scroll': function(n, fast){
				var div = this.getCoordinates();
				var ul = this.getElement('ul').getPosition();
				var props = this.retrieve('props');
				var axis = props[3], delta, pos = props[0], size = props[2];				
				var tween = this.getElement('ul').get('tween', {'property': pos});	
				if ($chk(n)){
					var li = this.getElements('li')[n].getCoordinates();
					var delta = div[pos] + (div[size] / 2) - (li[size] / 2) - li[pos]	
					var value = (ul[axis] - div[pos] + delta).limit(this.retrieve('limit'), 0);
					if (fast)	
						tween.set(value);
					else						 
						tween.start(value);
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
						if (!a.retrieve('active', false)){
							a.store('active', true);
							var active = this.classes.get('thumbnails', 'active');							
							if (fast) a.get('morph').set(active);
							else a.morph(active);
						}
					} 
					else {
						if (a.retrieve('active', true)){
							a.store('active', false);
							var inactive = this.classes.get('thumbnails', 'inactive');						
							if (fast) a.get('morph').set(inactive);
							else a.morph(inactive);
						}
					}
				}, this);
				if (!thumbnails.retrieve('mouseover'))
					thumbnails.fireEvent('scroll', [this.slide, fast]);
			}.bind(this)
		})
		var div = thumbnails.getCoordinates();
		thumbnails.store('props', (div.height > div.width) ? ['top', 'bottom', 'height', 'y'] : ['left', 'right', 'width', 'x']);
		var mousemove = function(e){
			var div = this.getCoordinates();
			if (e.page.x > div.left && e.page.x < div.right && e.page.y > div.top && e.page.y < div.bottom){
				this.store('page', e.page);			
				if (!this.retrieve('mouseover')){
					this.store('mouseover', true);
					this.store('timer', function(){this.fireEvent('scroll');}.periodical(50, this));
				}
			}
			else {
				if (this.retrieve('mouseover')){
					this.store('mouseover', false);				
					$clear(this.retrieve('timer'));
				}
			}
		}.bind(thumbnails);
		this.events.mousemove.push(mousemove);
		document.addEvent('mousemove', mousemove);
		this.slideshow.retrieve('thumbnails', thumbnails).fireEvent('update', true);
	},
	
	// destroy a slideshow instance, remove document events, clear callbacks, clear fx

	destroy: function(p){
		this.events.each(function(array, e){
			array.each(function(fn){ document.removeEvent(e, fn); });
		});
		this.pause(1);
		if (this.options.loader)
			$clear(this.slideshow.retrieve('loader').retrieve('timer'));		
		if (this.options.thumbnails)
			$clear(this.slideshow.retrieve('thumbnails').retrieve('timer'));
		Element.Storage[this.slideshow.uid] = {};
		if (p)
			$try(this.slideshow[p]());
	},
	
	// helper function to center an image

	_center: function(img){
		if (this.options.center){
			var size = img.getSize();
			img.set('styles', {left: (size.x - this.width) / -2, top: (size.y - this.height) / -2});
		}
	},

	// helper function to resize an image

	_resize: function(img, w, h){
		if (this.options.resize){
			var dh = this.height / h;
			var dw = this.width / w;
			var delta = (dw > dh) ? dw : dh;
			img.set('styles', {height: Math.ceil(h * delta), width: Math.ceil(w * delta)});
		}	
	}
});