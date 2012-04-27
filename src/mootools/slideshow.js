/**
Script: Slideshow.js
	Slideshow - A javascript class for Mootools to stream and animate the presentation of images on your website.

License:
	MIT-style license.

Copyright:
	Copyright (c) 2011 [Aeron Glemann](http://www.electricprism.com/aeron/).

Dependencies:
	Mootools 1.3.1 Core: Fx.Morph, Fx.Tween, Selectors, Element.Dimensions.
	Mootools 1.3.1.1 More: Assets.
*/
(function(){
	WhenPaused = 1 << 0;
	WhenPlaying = 1 << 1;
	OnStart = 1 << 2;
	
	Slideshow = new Class({
		Implements: [Chain, Events, Options],

		options: {/*
			onComplete: $empty,
			onEnd: $empty,
			onStart: $empty,*/
		  accesskeys: {'first': {'key': 'shift left', 'label': 'Shift + Leftwards Arrow'}, 'prev': {'key': 'left', 'label': 'Leftwards Arrow'}, 'pause': {'key': 'p', 'label': 'P'}, 'next': {'key': 'right', 'label': 'Rightwards Arrow'}, 'last': {'key': 'shift right', 'label': 'Shift + Rightwards Arrow'}},
			captions: true,
			center: true,
			classes: [/*'slideshow', 'first', 'prev', 'play', 'pause', 'next', 'last', 'images', 'captions', 'controller', 'thumbnails', 'hidden', 'visible', 'inactive', 'active', 'loader'*/],
			controller: true,
			data: null,
			delay: 2000,
			duration: 1000,
			fast: false,
			height: false,
			href: '',
			hu: '',
			linked: false,
			loader: true,
			loop: true,
			match: /\?slide=(\d+)$/,
			overlap: true,
			paused: false,
			random: false,
			replace: [/(\.[^\.]+)$/, 't$1'],
			resize: 'fill',
			slide: 0,
			thumbnails: true,
			titles: false,
			transition: 'sine:in:out',
			width: false
		},

	/**
	Constructor: initialize
		Creates an instance of the Slideshow class.

	Arguments:
		element - (element) The wrapper element.
		data - (array or object) The images and optional thumbnails, captions and links for the show.
		options - (object) The options below.

	Syntax:
		var myShow = new Slideshow(element, data, options);
	*/

		initialize: function(el, data, options){
			this.setOptions(options);
			this.el = document.id(el);
			if (!this.el) 
				return;
			var match = window.location.href.match(this.options.match);
			this.slide = this._slide = this.options.match && match ? match[1].toInt() 
				: this.options.slide;
			this.counter = this.timeToNextTransition = this.timeToTransitionComplete = 0;
			this.direction = 'left';
			this.cache = {};
			this.paused = false;
			if (!this.options.overlap)
				this.options.duration *= 2;
			var anchor = this.el.getElement('a') || new Element('a');
			if (!this.options.href)
				this.options.href = anchor.get('href') || '';
			if (this.options.hu.length && !this.options.hu.test(/\/$/)) 
				this.options.hu += '/';
			if (this.options.fast === true)
				this.options.fast = WhenPaused | WhenPlaying;

			// styles

			var keys = 'slideshow first prev play pause next last images captions controller thumbnails hidden visible inactive active loader'.split(' '),
				values = keys.map(function(key, i){
					return this.options.classes[i] || key;
				}, this);
			this.classes = values.associate(keys);
			this.classes.get = function(){
				var str = this.slideshow,
					args = arguments,
					i = nameOnly = 0;
				for (; i < args.length; i++){
					if (args[i] === true)
						nameOnly = 1;
					else	
						str += '-' + this[args[i]];
				}
				return nameOnly ? str
					: '.' + str;
			}.bind(this.classes);

			// data	
			
			if (!data){
				this.options.hu = '';
				data = {};
				var thumbnails = this.el.getElements(this.classes.get('thumbnails') + ' img');
				this.el.getElements(this.classes.get('images') + ' img').each(function(img, i){
					var src = img.src,
						caption = img.alt || img.title,
						href = img.getParent().href,
						thumbnail = thumbnails[i] ? thumbnails[i].src 
							: '';
					data[src] = {'caption': caption, 'href': href, 'thumbnail': thumbnail};
				});
			}
			var loaded = this.load(data);
			if (!loaded)
				return; 

			// events

			this.events = {};
			this.events.push = function(type, fn){
				if (!this[type])
					this[type] = [];
				this[type].push(fn);
				document.addEvent(type, fn);
				return this;
			}.bind(this.events);

			this.accesskeys = {};
			for (action in this.options.accesskeys){
				var obj = this.options.accesskeys[action];
				this.accesskeys[action] = accesskey = {'label': obj.label};
				['shift', 'control', 'alt'].each(function(modifier){
					var re = new RegExp(modifier, 'i');
					accesskey[modifier] = obj.key.test(re);
					obj.key = obj.key.replace(re, '');
				});
				accesskey.key = obj.key.trim();
			}

			this.events.push('keyup', function(e){
				Object.each(this.accesskeys, function(accesskey, action){
					if (e.key == accesskey.key && e.shift == accesskey.shift && e.control == accesskey.control && e.alt == accesskey.alt)
						this[action]();
				}, this);			
			}.bind(this));	 

			// required elements

			var el = this.el.getElement(this.classes.get('images')),
				img = this.el.getElement('img') || new Element('img'),
				images = el ? el.empty() 
					: new Element('div', {'class': this.classes.get('images', true)}).inject(this.el),
				div = images.getSize();
			this.height = this.options.height || div.y;		
			this.width = this.options.width || div.x;
			images.set({'styles': {'height': this.height, 'width': this.width}});
			this.el.store('images', images);
			this.a = this.image = img;
			if (Browser.ie && Browser.version >= 7)
				this.a.style.msInterpolationMode = 'bicubic';
			this.a.set('styles', {'display': 'none'});
			this.b = this.a.clone();
			[this.a, this.b].each(function(img){
				anchor.clone().cloneEvents(anchor).grab(img).inject(images);
			});

			// optional elements

			this.options.captions && new Caption(this);
			this.options.controller && new Controller(this);
			this.options.loader && new Loader(this);
			this.options.thumbnails && new Thumbnails(this);

			// begin show

			this._preload(this.options.fast & OnStart);
		},

	/**
	Public method: go
		Jump directly to a slide in the show.

	Arguments:
		n - (integer) The index number of the image to jump to, 0 being the first image in the show.

	Syntax:
		myShow.go(n);	
	*/

		go: function(n, direction){
			var nextSlide = (this.slide + this.data.images.length) % this.data.images.length;
			if (n == nextSlide || Date.now() < this.timeToTransitionComplete)
				return;		
			clearTimeout(this.timer);
			this.timeToNextTransition = 0;		
			this.direction = direction ? direction 
				: n < this._slide ? 'right' 
				: 'left';
			this.slide = this._slide = n;
			if (this.preloader) 
				this.preloader = this.preloader.destroy();
			this._preload((this.options.fast & WhenPlaying) || (this.paused && this.options.fast & WhenPaused));
		},

	/**
	Public method: first
		Goes to the first image in the show.

	Syntax:
		myShow.first();	
	*/

		first: function(){
			this.prev(true); 
		},

	/**
	Public method: prev
		Goes to the previous image in the show.

	Syntax:
		myShow.prev();	
	*/

		prev: function(first){
			var n = 0;
			if (!first){
				if (this.options.random){
					if (this.showed.i < 2)
						return;
					this.showed.i -= 2;
					n = this.showed.array[this.showed.i];
				}
				else
					n = (this.slide - 1 + this.data.images.length) % this.data.images.length;									
			}
			this.go(n, 'right');
		},

	/**
	Public method: pause
		Toggles play / pause state of the show.

	Arguments:
		p - (undefined, 1 (true) or 0 (false)) Call pause with no arguments to toggle the pause state. Call pause(1) to force pause, or pause(0) to force play.

	Syntax:
		myShow.pause(p);	
	*/

		pause: function(p){
			if (p == undefined) {
				this.paused = !this.paused; // toggle pause state
			} else if (p != this.paused) {
				this.paused = p; // set pause state
			} else {
				return; // just return if pause state is the same
			}
			if (this.paused){ // pause
				this.timeToTransitionComplete -= Date.now();
				clearTimeout(this.timer);
				[this.a, this.b].each(function(img){
					['morph', 'tween'].each(function(p){
						if (this.retrieve(p)) this.get(p).pause();
					}, img);
				});
				this.controller && this.el.retrieve('pause').getParent().addClass(this.classes.play);
			} else { // play
				this.timeToTransitionComplete += Date.now();
				this.timer = this._preload.delay(50, this);
				[this.a, this.b].each(function(img){
					['morph', 'tween'].each(function(p){
						if (this.retrieve(p)) this.get(p).resume();
					}, img);
				});
				this.controller && this.el.retrieve('pause').getParent().removeClass(this.classes.play);
			}
		},

	/**
	Public method: next
		Goes to the next image in the show.

	Syntax:
		myShow.next();	
	*/

		next: function(last){
			var n = last ? this.data.images.length - 1 
				: this._slide;
			this.go(n, 'left');
		},

	/**
	Public method: last
		Goes to the last image in the show.

	Syntax:
		myShow.last();	
	*/

		last: function(){
			this.next(true); 
		},

	/**
	Public method: load
		Loads a new data set into the show: will stop the current show, rewind and rebuild thumbnails if applicable.

	Arguments:
		data - (array or object) The images and optional thumbnails, captions and links for the show.

	Syntax:
		myShow.load(data);
	*/

		load: function(data){
			this.firstrun = true;
			this.showed = {'array': [], 'i': 0};
			var now = Date.now();
			if (typeOf(data) == 'array'){
				this.options.captions = false;	
				data = new Array(data.length).associate(data.map(function(image, i){ return image + '#' + now + i })); 
			}
			this.data = {'images': [], 'captions': [], 'hrefs': [], 'thumbnails': [], 'targets': [], 'titles': []};
			for (var image in data){
				var obj = data[image] || {},
					hash = new RegExp('#' + now + '\\d+$'),
					image = this.options.hu + image.replace(hash, ''),
					caption = obj.caption ? obj.caption.trim() 
						: '',
					href = obj.href ? obj.href.trim() 
						: this.options.linked ? image 
						: this.options.href,
					target = obj.target ? obj.target.trim() 
						: '_self',
					thumbnail = obj.thumbnail ? this.options.hu + obj.thumbnail.trim() 
						: image.replace(this.options.replace[0], this.options.replace[1]),
					title = caption.replace(/<.+?>/gm, '').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, "'");
				this.data.images.push(image);
				this.data.captions.push(caption);
				this.data.hrefs.push(href);
				this.data.targets.push(target);
				this.data.thumbnails.push(thumbnail);
				this.data.titles.push(title);
			}
			if (this.options.random)
				this.slide = this._slide = Number.random(0, this.data.images.length - 1);

			// only run when data is loaded dynamically into an existing slideshow instance
			// TODO
			
			if (this.options.thumbnails && this.el.retrieve('thumbnails'))
				this._thumbnails();
			if (this.el.retrieve('images')){
				[this.a, this.b].each(function(img){
					['morph', 'tween'].each(function(p){
						if (this.retrieve(p)) this.get(p).cancel();
					}, img);
				});
				this.slide = this._slide = this.timeToTransitionComplete = 0;
				this.go(0);		
			}
			return this.data.images.length;
		},

	/**
	Public method: destroy
		Destroys a Slideshow instance.

	Arguments:
		p - (string) The images and optional thumbnails, captions and links for the show.

	Syntax:
		myShow.destroy(p);
	*/

		destroy: function(p){
			Object.each(this.events, function(array, e){
				if ('each' in array)
					array.each(function(fn){ document.removeEvent(e, fn); });
			});
			this.pause(1);
			'caption loader thumbnails'.split(' ').each(function(i, timer){
				this.options[i] && (timer = this[i].retrieve('timer')) && clearTimeout(timer);
			}, this);
			typeOf(this.el[p]) == 'function' && this.el[p]();
			delete this.el.uid;
		},

	/**
	Private method: preload
		Preloads the next slide in the show, once loaded triggers the show, updates captions, thumbnails, etc.
	*/

		_preload: function(fast){
			var src = this.data.images[this._slide],
				cached = loaded = !!this.cache[src],
				now = Date.now();
			if (!cached){
				if (!this.preloader)
				 	this.preloader = new Asset.image(src, {
						'onerror': function(){
							this.store('error', true);
						},
						'onload': function(){
							this.store('loaded', true);
						}
					});
				if (this.preloader.retrieve('error')){
					this._loaded(fast);
					return;
				}
				loaded = this.preloader.retrieve('loaded') && this.preloader.get('width');
			}
			if (loaded && now > this.timeToNextTransition && now > this.timeToTransitionComplete){
				if (this.preloader){
					this.cache[src] = {
						'height': this.preloader.get('height'),
						'src': src,
						'width': this.preloader.get('width')
					}
				}
				if (this.stopped){
					if (this.options.captions)
						this.caption.get('morph').cancel().start(this.classes.get('captions', 'hidden'));
					this.pause(1);
					if (this.end)
						this.fireEvent('end');
					this.stopped = this.end = false;
					return;				
				}
				this.image = this.counter % 2 ? this.b 
					: this.a;
				this.image.set('styles', {'display': 'block', 'height': null, 'visibility': 'hidden', 'width': null, 'zIndex': this.counter});
				this.image.set(this.cache[src]);
				this.image.width = this.cache[src].width;
				this.image.height = this.cache[src].height;
				this.options.resize && this._resize(this.image);
				this.options.center && this._center(this.image);
				var anchor = this.image.getParent();
				if (this.data.hrefs[this._slide]){
					anchor.set('href', this.data.hrefs[this._slide]);
					anchor.set('target', this.data.targets[this._slide]);			
				} 
				else {
					anchor.erase('href');
					anchor.erase('target');
				}
				var title = this.data.titles[this._slide];
				this.image.set('alt', title);		
				this.options.titles && anchor.set('title', title);
				this.options.loader && this.loader.fireEvent('hide');
				this.options.captions && this.caption.fireEvent('update', fast);				
				this.options.thumbnails && this.thumbnails.fireEvent('update', fast); 			
				this._show(fast);
				this._loaded(fast);
			} 
			else {
				if (now > this.timeToNextTransition)
					this.options.loader && this.loader.fireEvent('show');
				this.timer = this._preload.delay(50, this, fast); 
			}
		},

	/**
	Private method: show
		Does the slideshow effect.
	*/

		_show: function(fast){
			if (!this.image.retrieve('morph')){
				var options =  this.options.overlap ? {'link': 'cancel'} : {'link': 'chain'};
				$$(this.a, this.b).set('morph', Object.merge(options, {'duration': this.options.duration, 'onStart': this._start.bind(this), 'onComplete': this._complete.bind(this), 'transition': this.options.transition}));
			}
			var hidden = this.classes.get('images', (this.direction == 'left' ? 'next' 
				: 'prev')),
				visible = this.classes.get('images', 'visible'),
				img = this.counter % 2 ? this.a 
					: this.b;
			if (fast){			
				img.get('morph').cancel().set(hidden);
				this.image.get('morph').cancel().set(visible); 			
			} 
			else {
				if (this.options.overlap){
					img.get('morph').set(visible);
					this.image.get('morph').set(hidden).start(visible);
				} 
				else {
					var fn = function(visible){
						this.image.get('morph').start(visible);
					}.pass(visible, this);
					if (this.firstrun)
						return fn();
					hidden = this.classes.get('images', (this.direction == 'left' ? 'prev' 
						: 'next'));
					this.image.get('morph').set(hidden);				
					img.get('morph').set(visible).start(hidden).chain(fn);
				}
			}
		},

	/**
	Private method: loaded
		Run after the current image has been loaded, sets up the next image to be shown.
	*/

		_loaded: function(fast){
			this.counter++;
			this.timeToNextTransition = Date.now() + this.options.duration + this.options.delay;
			this.direction = 'left';			
			this.timeToTransitionComplete = fast || this.paused ? 0 
				: Date.now() + this.options.duration;
			if (this._slide == (this.data.images.length - 1) && !this.options.loop && !this.options.random)
				this.stopped = this.end = true;
			if (this.options.random){
				this.showed.i++;
				if (this.showed.i >= this.showed.array.length){
					var n = this._slide;
					if (this.showed.array.getLast() != n) this.showed.array.push(n);
					while (this._slide == n)
						this.slide = this._slide = Number.random(0, this.data.images.length - 1);				
				}
				else
					this.slide = this._slide = this.showed.array[this.showed.i];
			}
			else {
				this.slide = this._slide;
				this._slide = (this.slide + 1) % this.data.images.length;
			}
			if (this.image.getStyle('visibility') != 'visible')
				(function(){ this.image.setStyle('visibility', 'visible'); }).delay(1, this);			
			if (this.preloader) 
				this.preloader = this.preloader.destroy();
			this.paused || this._preload();
		},

	/**
	Private method: center
		Center an image.
	*/

		_center: function(img){
			var size = img.getSize(), 
				h = size.y, w = size.x; 
			img.set('styles', {'left': (w - this.width) / -2, 'top': (h - this.height) / -2});
		},

	/**
	Private method: resize
		Resizes an image.
	*/

		_resize: function(img){
			var h = img.get('height').toFloat(), w = img.get('width').toFloat(),
				dh = this.height / h, dw = this.width / w;
			if (this.options.resize == 'fit')
				dh = dw = dh > dw ? dw 
					: dh;
			if (this.options.resize == 'fill')
				dh = dw = dh > dw ? dh 
					: dw;
			img.set('styles', {'height': Math.ceil(h * dh), 'width': Math.ceil(w * dw)});
		},

	/**
	Private method: start
		Callback on start of slide change.
	*/

		_start: function(){		
			this.fireEvent('start');
		},

	/**
	Private method: complete
		Callback on start of slide change.
	*/

		_complete: function(){
			if (this.firstrun && this.options.paused)
				this.pause(1);
			this.firstrun = false;
			this.fireEvent('complete');
		}	
	});

	/**
	Private method: captions
		Builds the optional caption element, adds interactivity.
		This method can safely be removed if the captions option is not enabled.
	*/

	var Caption = new Class({
		Implements: [Chain, Events, Options],

		options: {/*
			duration: 500,
			fps: 50,
			transition: 'sine:in:out',
			unit: false, */
			delay: 0,
			link: 'cancel'			
		},

		initialize: function(slideshow){
			if (!slideshow)
				return;
			var options = slideshow.options.captions;
			if (options === true)
				options = {};
			this.setOptions(options);
			var el = slideshow.el.getElement(slideshow.classes.get('captions')),
				caption = el ? el.empty()
					: new Element('div', {'class': slideshow.classes.get('captions', true)}).inject(slideshow.el);
			slideshow.caption = caption;
			caption
				.set({
			    	'aria-busy': false,
			    	'aria-hidden': false,
					'events': { 'update': this.update.bind(slideshow) },
					'morph': this.options,
					'role': 'description'
				})
				.store('delay', this.options.delay);
		    if (!caption.get('id'))
		    	caption.set('id', 'Slideshow-' + Date.now());
		    slideshow.el.retrieve('images').set('aria-labelledby', caption.get('id'));
		},

		update: function(fast){
		    var empty = !this.data.captions[this._slide].length, 
				timer;
			if (timer = this.caption.retrieve('timer'))
				clearTimeout(timer);
		    if (fast){
		      var p = empty ? 'hidden' 
				: 'visible';
		      this.caption
				.set({'aria-hidden': empty, 'html': this.data.captions[this._slide]})
				.get('morph')
					.cancel()
					.set(this.classes.get('captions', p));
		    }
		    else {
		      var fn1 = empty ? function(){} 
				: function(caption){
					this.caption.store('timer', setTimeout(function(caption){
				        this.caption
							.set('html', caption)
							.morph(this.classes.get('captions', 'visible'));
					}.pass(caption, this), this.caption.retrieve('delay')));
			      }.pass(this.data.captions[this._slide], this);    
		      var fn2 = function(){ 
		        this.caption.set('aria-busy', false); 
		      }.bind(this);
		      this.caption
				.set('aria-busy', true)
				.get('morph')
					.clearChain()
					.cancel()
					.start(this.classes.get('captions', 'hidden'))
					.chain(fn1, fn2);
		    }
		}
	});

	/**
	Private method: controller
	  Builds the optional controller element, adds interactivity.
	  This method can safely be removed if the controller option is not enabled.
	*/

	var Controller = new Class({
		Implements: [Chain, Events, Options],

		options: {/*
			duration: 500,
			fps: 50,
			transition: 'sine:in:out',
			unit: false, */
			link: 'cancel'			
		},

		initialize: function(slideshow){
			if (!slideshow)
				return;
			var options = slideshow.options.captions;
			if (options === true)
				options = {};
			this.setOptions(options);
			var el = slideshow.el.getElement(slideshow.classes.get('controller')),
				controller = el ? el.empty()
					: new Element('div', {'class': slideshow.classes.get('controller', true)}).inject(slideshow.el);
			slideshow.controller = controller;
			controller.set({
				'aria-hidden': false, 
				'events': {
					'hide': this.hide.pass(slideshow.classes.get('controller', 'hidden'), controller),
					'show': this.show.pass(slideshow.classes.get('controller', 'visible'), controller)
				},
				'role': 'menubar',
				'morph': this.options
			});
			var ul = new Element('ul', {'role': 'menu'}).inject(controller),
				i = 0;
			Object.each(slideshow.accesskeys, function(accesskey, action){
				var li = new Element('li', {
					'class': (action == 'pause' && this.options.paused) ? this.classes.play + ' ' + this.classes[action] 
						: this.classes[action]
				}).inject(ul);
				var a = this.el.retrieve(action, new Element('a', {
					'role': 'menuitem', 
					'tabindex': i++, 
					'title': accesskey.label
				}).inject(li));
				a.set('events', {
					'click': function(action){
						this[action]()
					}.pass(action, this),
					'mouseenter': function(active){
						this.addClass(active)
					}.pass(this.classes.active, a),
					'mouseleave': function(active){
						this.removeClass(active)
					}.pass(this.classes.active, a)
				});		
			}, slideshow);
			slideshow.events
				.push('keydown', this.keydown.bind(slideshow))
				.push('keyup',	this.keyup.bind(slideshow))
				.push('mousemove',	this.mousemove.bind(slideshow));
			controller.fireEvent('hide');
		},

		hide: function(hidden){
			if (this.get('aria-hidden') == 'false')
				this.set('aria-hidden', true).morph(hidden);
		},

		keydown: function(e){
			Object.each(this.accesskeys, function(accesskey, action){
				if (e.key == accesskey.key && e.shift == accesskey.shift && e.control == accesskey.control && e.alt == accesskey.alt){
					if (this.controller.get('aria-hidden') == 'true')
						this.controller.get('morph').set(this.classes.get('controller', 'visible'));
					this.el.retrieve(action).fireEvent('mouseenter');
				}					
			}, this);		
		},

		keyup: function(e){
			Object.each(this.accesskeys, function(accesskey, action){
				if (e.key == accesskey.key && e.shift == accesskey.shift && e.control == accesskey.control && e.alt == accesskey.alt){
					if (this.controller.get('aria-hidden') == 'true')
						this.controller.set('aria-hidden', false).fireEvent('hide'); 
					this.el.retrieve(action).fireEvent('mouseleave');
				}					
			}, this);			
		},

		mousemove: function(e){
			var images = this.el.retrieve('images').getCoordinates(),
				action = (e.page.x > images.left && e.page.x < images.right && e.page.y > images.top && e.page.y < images.bottom) ? 'show' 
					: 'hide';
			this.controller.fireEvent(action);
		},

		show: function(visible){
			if (this.get('aria-hidden') == 'true')
				this.set('aria-hidden', false).morph(visible);
		}
	});

	/**
	Private method: loader
		Builds the optional loader element, adds interactivity.
		This method can safely be removed if the loader option is not enabled.
	*/

	var Loader = new Class({
		Implements: [Chain, Events, Options],

		options: {/*
			duration: 500,
			transition: 'sine:in:out',
			unit: false, */
			fps: 20,
			link: 'cancel'			
		},

		initialize: function(slideshow){
			if (!slideshow)
				return;
			var options = slideshow.options.loader;
			if (options === true)
				options = {};
			this.setOptions(options);
			var loader = new Element('div', {'class': slideshow.classes.get('loader', true)});
			slideshow.loader = loader;
			loader
				.set({
					'aria-hidden': false,
					'events': {
						'animate': this.animate.bind(loader),
						'hide': this.hide.pass(slideshow.classes.get('loader', 'hidden'), loader),
						'show': this.show.pass(slideshow.classes.get('loader', 'visible'), loader)
					},					
					'morph': this.options,
					'role': 'progressbar'
				})
				.store('animate', false)
				.store('delay', 1000 / this.options.fps)
				.store('frame', 0)
				.inject(slideshow.el); // Must be in DOM in order to get backgroundImage
			var url = loader.getStyle('backgroundImage').replace(/url\(['"]?(.*?)['"]?\)/, '$1').trim();
			if (url){
				if (url.test(/\.png$/) && Browser.ie && Browser.version < 7)
					loader.setStyles({'backgroundImage': 'none', 'filter': 'progid:DXImageTransform.Microsoft.AlphaImageLoader(src="' + url + '", sizingMethod="crop")'});					
				new Asset.image(url, {'onload': function(){
					var size = loader.getSize(),
						width = this.get('width'), 
						height = this.get('height');
					if (width > size.x)
						loader.store('animate', 'x').store('frames', (width / size.x).toInt()).store('x', size.x);
					if (height > size.y)
						loader.store('animate', 'y').store('frames', (height / size.y).toInt()).store('y', size.y);
					loader.fireEvent('show');
				}});
			}
			loader.fireEvent('hide');
		},

		animate: function(){
			var animate = this.retrieve('animate');
			if (animate){
				var frame = (this.retrieve('frame').toInt() + 1) % this.retrieve('frames');
				this.store('frame', frame);
				var n = (frame * this.retrieve(animate)) + 'px';
				this.setStyle('backgroundPosition', animate == 'x' ? n + ' 0px' : '0px ' + n);			
			}
		},

		hide: function(hidden){
			if (this.get('aria-hidden') == 'false'){ // Since it's an element attribute value is always string
				this.set('aria-hidden', true).morph(hidden);
				if (this.retrieve('animate'))
					clearTimeout(this.retrieve('timer'));
			}
		},

		show: function(visible){
			if (this.get('aria-hidden') == 'true'){ // Since it's an element attribute value is always string
				this.set('aria-hidden', false).morph(visible);
				if (this.retrieve('animate')){
					this.store('timer', function(){ 
						this.fireEvent('animate') 
					}.periodical(this.retrieve('delay'), this));			
				}
			}
		}
	});

	/**
	Private method: thumbnails
		Builds the optional thumbnails element, adds interactivity.
		This method can safely be removed if the thumbnails option is not enabled.
	*/

	var Thumbnails = new Class({
		Implements: [Chain, Events, Options],

		options: {/*
			duration: 500,
			transition: 'sine:in:out',
			unit: false, */
			fps: 50,
			link: 'cancel'
		},

		initialize: function(slideshow){
			var options = slideshow.options.thumbnails;
			if (options === true)
				options = {};
			this.setOptions(options);
			var el = slideshow.el.getElement(slideshow.classes.get('thumbnails')),
				thumbnails = el ? el.empty() 
					: new Element('div', {'class': slideshow.classes.get('thumbnails', true)}).inject(slideshow.el);
			slideshow.thumbnails = thumbnails;
			thumbnails.set({
				'events': {
					'scroll': this.scroll.bind(thumbnails),
					'update': this.update.bind(slideshow)
				},
				'role': 'menubar', 
				'styles': {'overflow': 'hidden'}
			});
			var uid = thumbnails.retrieve('uid', 'Slideshow-' + Date.now()),
				ul = new Element('ul', {
					'role': 'menu', 
					'styles': {
						'left': 0, 
						'position': 'absolute', 
						'top': 0
					}, 
					'tween': {'link': 'cancel'}
				}).inject(thumbnails);
			slideshow.data.thumbnails.each(function(thumbnail, i){
				var li = new Element('li', {'id': uid + i}).inject(ul),
					a = new Element('a', {
						'class': slideshow.classes.get('thumbnails', 'hidden', true),
						'events': {'click': this.click.pass(i, slideshow)},
						'href': slideshow.data.images[i],
						'morph': this.options,
						'role': 'menuitem',
						'tabindex': i
					}).store('uid', i).inject(li);
				if (slideshow.options.titles)
					a.set('title', slideshow.data.titles[i]);
				new Asset.image(thumbnail, {
					'onload': this.onload.pass(i, slideshow)
				}).inject(a);
			}, this);
			var coords = thumbnails.getCoordinates();
			var props = (coords.height > coords.width ? 'top bottom height y width' : 'left right width x height').split(' ');
			thumbnails.store('props', props).store('delay', 1000 / this.options.fps);
			slideshow.events.push('mousemove', this.mousemove.bind(thumbnails));
		},

		click: function(i){
			this.go(i); 
			return false; 
		},

		mousemove: function(e){
			var thumbnailsDimensions = this.getCoordinates();
			if (e.page.x > thumbnailsDimensions.left && e.page.x < thumbnailsDimensions.right && e.page.y > thumbnailsDimensions.top && e.page.y < thumbnailsDimensions.bottom){
				this.store('page', e.page);			
				if (!this.retrieve('mouseover')){
					this
						.store('mouseover', true)
						.store('timer', function(){this.fireEvent('scroll')}.periodical(this.retrieve('delay'), this));
				}
			}
			else {
				if (this.retrieve('mouseover')){
					this.store('mouseover', false);				
					clearTimeout(this.retrieve('timer'));
				}
			}			
		},

		onload: function(i){
			var thumbnails = this.thumbnails,
				limit = thumbnails.retrieve('limit', 0),
				uid = thumbnails.retrieve('uid'),
				props = thumbnails.retrieve('props'), 
				nearSide = props[0], farSide = props[1], length = props[2], width = props[4],
				li = document.id(uid + i),
				ul = li.getParent(),
				a = li.getElement('a'),
				thumbnailsDimensions = thumbnails.getCoordinates(),
				thumbnailsItemDimensions = li.getCoordinates(ul),
				margins = li.getStyle('margin-' + nearSide).toInt() + li.getStyle('margin-' + farSide).toInt();
			thumbnailsItemDimensions[length] += margins;
			thumbnailsItemDimensions[farSide] += margins;
			thumbnails.store('limit', Math.min(limit, thumbnailsDimensions[length] - thumbnailsItemDimensions[farSide]));
			(function(a){
				var visible = i == this.slide ? 'active' 
					: 'inactive';					
				a.store('loaded', true).get('morph').set(this.classes.get('thumbnails', 'hidden')).start(this.classes.get('thumbnails', visible));	
			}).delay(Math.max(1000 / this.data.thumbnails.length, 100) * i, this, a);
		},

		scroll: function(n, fast){
			var thumbnailsDimensions = this.getCoordinates(),
				thumbnailsListPosition = this.getElement('ul').getPosition(this),
				props = this.retrieve('props'),
				nearSide = props[0], length = props[2], axis = props[3],		
				tween = this.getElement('ul').set('tween', {'property': nearSide}).get('tween'),
				delta, value;
			if (n != undefined){
				var uid = this.retrieve('uid'),
					thumbnailsItemDimensions = document.id(uid + n).getCoordinates();
				delta = thumbnailsDimensions[nearSide] + (thumbnailsDimensions[length] / 2) - (thumbnailsItemDimensions[length] / 2) - thumbnailsItemDimensions[nearSide];
				value = (thumbnailsListPosition[axis] + delta).limit(this.retrieve('limit'), 0);
				tween[fast ? 'set' : 'start'](value);
			}
			else{
				var area = thumbnailsDimensions[length] / 3, 
					page = this.retrieve('page'), 
					velocity = -(this.retrieve('delay') * 0.01);			
				if (page[axis] < (thumbnailsDimensions[nearSide] + area))
					delta = (page[axis] - thumbnailsDimensions[nearSide] - area) * velocity;
				else if (page[axis] > (thumbnailsDimensions[nearSide] + thumbnailsDimensions[length] - area))
					delta = (page[axis] - thumbnailsDimensions[nearSide] - thumbnailsDimensions[length] + area) * velocity;			
				if (delta){			
					value = (thumbnailsListPosition[axis] + delta).limit(this.retrieve('limit'), 0);
					tween.set(value);
				}
			}				
		},

		update: function(fast){
			var thumbnails = this.thumbnails,
				uid = thumbnails.retrieve('uid');
			thumbnails.getElements('a').each(function(a, i){
				if (a.retrieve('loaded')){
					if (a.retrieve('uid') == this._slide){
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
				}
			}, this);
			if (!thumbnails.retrieve('mouseover'))
				thumbnails.fireEvent('scroll', [this._slide, fast]);
		}
	});
})();