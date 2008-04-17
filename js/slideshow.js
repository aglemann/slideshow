// Slideshow: a Javascript class for Mootools to stream and animate the presentation of images on your website <http://electricprism.com/aeron/slideshow>
// Slideshow 2b2, Copyright (c) 2008 Aeron Glemann <http://electricprism.com/aeron>, MIT Style License.

Slideshow = new Class({
	Implements: [Chain, Events, Options],
	
	options: {
		captions: false, // show captions
		center: true, // center images if applicable
		classes: [], // [ 'first', 'prev', 'play', 'pause', 'next', 'last', 'controller', 'thumbnails', 'captions', 'images', 'hidden', 'visible', 'inactive', 'active', 'hover', 'loader' ]
		controller: false, // show controller
		delay: 2000, // the delay between slide changes in milliseconds (1000 = 1 second)
		duration: 750, // the duration of the effect in milliseconds (1000 = 1 second)
		fast: false, // fast mode navigation: the slideshow will not wait until the current transition completes, but update the slide change instantly
		height: false, // optional height value for the slideshow as a whole integer. If a height value is not given the height of the default image will be used
		href: '', // a single link for the slideshow, inherited from the href of the slideshow html
		hu: '/', // path to the image directory(relative or absolute) default is the same directory as the web page
		linked: false, // link each image to fullsize picture
		loader: true, // show the loader gfx?
		loop: true, // looping slideshow?
		match: /\?slide=(\d+)$/, // check for slide passed in url
		overlap: true, // whether images overlap in the basic slideshow or if the first image morphs out before the second morphs in
		paused: false, // start paused
		quick: false, // quick start
		random: false, // random show
		replace: [/\.(.{3})$/, 't.$1'], // find regexp, replace str for thumbnails
		resize: true, // resize images if applicable
		slide: 0,
		thumbnails: false, // show thumbnails
		transition: function(p){ return -(Math.cos(Math.PI * p) - 1) / 2; }, // name of Robert Penner transition to use with base and push type slideshows
		width: false // optional width value for the slideshow as a whole integer. If a width value is not given the width of the default image will be used
	},
	

	/**
	 * Constructor
	 *
	 * @param mixed $el An element id or node reference for the slideshow wrapper
	 * @param mixed $data An array ['image1.jpg', 'image2.jpg', ... ] or hash { image1.jpg: { caption: 'string', href: 'string', thumbnail: 'image1t.jpg' }, ... }
	 * @param hash $options A hash containing any of the above options
	 */

	initialize: function(el, data, options){	
		this.setOptions(options);

		// get slideshow element
		this.slideshow = $(el);

		if (!this.slideshow) 
			return; // if no slideshow element abort

		this.slideshow.set('styles', { display: 'block', position: 'relative' });

		// prepare our css classes
		var keys = [ 'first', 'prev', 'play', 'pause', 'next', 'last', 'controller', 'thumbnails', 'captions', 'images', 'hidden', 'visible', 'inactive', 'active', 'hover', 'loader' ];

		var values = keys.map(function(key, i){
			return this.options.classes[i] || key;
		}, this);

		this.classes = values.associate(keys);

		// see if the slideshow has a default url
		var anchor = this.slideshow.getElement('a[href]') || new Element('a');

		if (!this.options.href)
			this.options.href = anchor.get('href') || '';
			
		// make sure image path has a trailing slash
		if (this.options.hu.substr(-1) != '/') 
			this.options.hu += '/';

		// if no data try to build from existing images
		if (!data){
			data = {};
			this.slideshow.getElements('.' + this.classes.images + ' img').each(function(img){ 
				var el = img.getParent();
				var href = el.get('href') || '';
				var src = img.get('src').split('/').getLast();
				data[src] = { caption: img.get('alt'), href: href };
			});
		}
		
		// compile data for slideshow
		if ($type(data) == 'array'){ 
			this.options.captions = false; // force disable captions
			
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

		if (!this.data.images.length) // if no images abort
			return; 

		var match = window.location.href.match(this.options.match); // pull current slide from url if possible

		this.counter = 0; // this increments for each transition and is used to determine the z-index
		this.slide = (this.options.match && match) ? match[1] % this.data.images.length : this.options.slide; // this marks the current slide in the show
		this.paused = false; // paused state
		this.transition = 0;
		
		if (!this.options.overlap) // for non-overlapping slideshows we have to compensate the delay for the time of the exit effect
			this.options.duration *= 2;

		// get the slideshow image
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

		// images appear within a bounding element inside of the slideshow
		var el = this.slideshow.getElement('.' + this.classes.images);

		var images = (el) ? el.empty() : new Element('div', { 'class': this.classes.images }).inject(this.slideshow);

		images.set({
			'styles': { display: 'block', height: this.height, overflow: 'hidden', position: 'relative', width: this.width }
		});

		this.slideshow.store('images', images);

		anchor.clone().grab(this.a).inject(images);

		// our transitional image
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

		// keyboard control
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


	/**
	 * Preloads the next slide in the show
	 * Once loaded triggers the show, updates captions, thumbnails, etc
	 *
	 * @param bool $fast Whether fast mode is active or not, this is set in the options and triggered by navigational click
	 */

	preload: function(fast){
		if (this.preloader.complete && $time() > this.delay && $time() > this.transition){			
			this.image = (this.counter % 2) ? this.b : this.a;
			this.image.set({
				'src': this.preloader.get('src'),
				'styles': { height: 'auto', visibility: 'hidden', width: 'auto', zIndex: this.counter }
			});	

			this._resize(this.image, this.preloader.width, this.preloader.height);

			var anchor = this.image.getParent(); // parent anchor

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


	/**
	 * Does the slideshow effect
	 *
	 * @param bool $fast Whether fast mode is active or not, this is set in the options and triggered by navigation
	 */

	show: function(fast){
		this._center(this.image);

		if (!this.image.retrieve('morph')){
			var options = (this.options.overlap) ? { duration: this.options.duration, link: 'cancel' } : { duration: this.options.duration / 2, link: 'chain' };
			$$(this.a, this.b).set('morph', $merge(this.options.captions, { transition: this.options.transition }));
		}

		var hidden = '.' + this.classes.images + '-' + ((this.direction == 'left') ? this.classes.next : this.classes.prev);
		var visible = '.' + this.classes.images + '-' + this.classes.visible;

		if (fast){
			this.image.get('morph').cancel().set(visible); 			
		} 
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


	/**
	 * Run after the current image has been loaded
	 * Sets up the next image to be shown
	 */

	loaded: function(quick){
		this.counter++; // increment counter
		this.delay = (this.paused) ? Number.MAX_VALUE : ((quick) ? 0 : $time() + this.options.duration + this.options.delay); // time until next transition begins
		this.transition = (this.paused) ? 0 : ((this.options.fast) ? 0 : $time() + this.options.duration);
		this.direction = 'left'; // reset direction since the slideshow goes forward normally
		this.slide = (this.options.random && !this.paused) ? $random(0, this.data.images.length - 1) : (this.slide + 1) % this.data.images.length; // determine current slide

		if (this.slide == 0 && !this.options.loop) // don't loop
			return;

		if (this.preloader)
			this.preloader.destroy();
		this.preloader = new Asset.image(this.options.hu + this.data.images[this.slide]);
		
		this.preload();
	},


	/**
	 * Go to the first image in the show
	 */

	first: function(){ 
		this.prev(true); 
	},


	/**
	 * Jump to any image in the show
	 *
	 * @param int $n Number of the slide to jump to
	 */

	go: function(n, direction){
		// abort if we're already showing desired image to avoid re-transitioning the same image
		// also abort if image is still transitioning (slow mode only)
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


	/**
	 * Go to the last image in the show
	 */

	last: function(){ 
		this.next(true); 
	},


	/**
	 * Go to the next image in the show
	 *
	 * @param bool $last Whether to jump to the last or not
	 */

	next: function(last){
		var n = (last === true) ? this.data.images.length - 1 : this.slide;

		this.go(n, 'left');
	},


	/**
	 * Toggle whether the slideshow is paused or not
	 */

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


	/**
	 * Go to the previous image in the show
	 *
	 * @param bool $last Whether to jump to the first or not
	 */

	prev: function(first){
		var n = (first === true) ? 0 : (this.slide - 2 + this.data.images.length) % this.data.images.length;
		
		this.go(n, 'right');
	},

	/**
	 * Builds the optional "ajax" loader
	 * Define FX options as an object set to the loader key in the class options
	 */

	loader: function(){
 		if (this.options.loader === true) 
 			this.options.loader = {};
 		
		var loader = new Element('div', { 
			'class': this.classes.loader,
			'morph': $merge(this.options.loader, { link: 'cancel' })			
		}).inject(this.slideshow.retrieve('images'));

		this.slideshow.retrieve('loader', loader).get('morph').set('.' + this.classes.loader + '-' + this.classes.hidden);
	},

	/**
	 * Builds captions element, adds interactivity
	 * Captions includes the following events: update
	 * Define FX options as an object set to the controller key in the class options
	 */

	captions: function(){
 		if (this.options.captions === true) 
 			this.options.captions = {};
 		
		// build the captions element
		var el = this.slideshow.getElement('.' + this.classes.captions);

		var captions = (el) ? el.empty() : new Element('div', { 'class': this.classes.captions }).inject(this.slideshow);

		// add captions interactivity
		captions.set({
			'events': {
				'update': function(fast){	
					var captions = this.slideshow.retrieve('captions');
					var visible = '.' + this.classes.captions + '-' + this.classes.visible;
				
					if (fast){
						captions.set('html', this.data.captions[this.slide]).get('morph').cancel().set(visible);
					} 
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
		
		// initialize
		this.slideshow.retrieve('captions', captions).fireEvent('update');
	},


	/**
	 * Builds controller element, adds interactivity
	 * Controller includes the following events: hide, show
	 * Define FX options as an object set to the controller key in the class options
	 */

	controller: function(){
 		if (this.options.controller === true)
 			this.options.controller = {};

		// build the controller element
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

		// add keyboard control
		document.addEvents({
			'keydown': function(e){
				if (e.key.test(/left|right|space/)){
					var controller = this.slideshow.retrieve('controller');

					if (controller.retrieve('hidden')) // force show
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

					if (controller.retrieve('hidden')) // force hide
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

		// initialize controller
		this.slideshow.retrieve('controller', controller).fireEvent('hide');
	},


	/**
	 * Builds thumbnails element, adds interactivity
	 * Thumbnails includes the following events: scroll, update
	 * Define FX options as an object set to the controller key in the class options
	 */

	thumbnails: function(){
 		if (this.options.thumbnails === true) 
 			this.options.thumbnails = {}; 

		// build the thumbnails element
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

					// if the last thumb has been loaded determine dimensions of wrapper
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

		// add thumbnails interactivity
		thumbnails.set('events', {
			'scroll': function(n, fast){
				var div = this.getCoordinates(); // div pos
				var ul = this.getElement('ul').getPosition(); // ul pos
				var props = this.retrieve('props'); // top, bottom, height, y
				var axis = props[3], delta, pos = props[0], size = props[2];
				
				var tween = this.getElement('ul').get('tween', pos);	
				tween.property = pos;

				if ($chk(n)){
					var li = this.getElements('li')[n].getCoordinates(); // li pos

					var delta = div[pos] + (div[size] / 2) - (li[size] / 2) - li[pos]
		
					var value = (ul[axis] - div[pos] + delta).limit(this.retrieve('limit'), 0); // new value
		
					if (fast)	
						tween.set(value);
					else						 
						this.getElement('ul').tween(pos, value);
				}
				else{
					var area = div[props[2]] / 3, page = this.retrieve('page'), velocity = -0.2;
			
					if (page[axis] < (div[pos] + area)) // scroll back
						delta = (page[axis] - div[pos] - area) * velocity;
					else if (page[axis] > (div[pos] + div[size] - area)) // scroll fwd
						delta = (page[axis] - div[pos] - div[size] + area) * velocity;
			
					if (delta){			
						var value = (ul[axis] - div[pos] + delta).limit(this.retrieve('limit'), 0); // new value
						tween.set(value);
					}
				}				
			}.bind(thumbnails),
			'update': function(fast){
				var thumbnails = this.slideshow.retrieve('thumbnails');
				
				// de + activate thumbnail
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
	
				// scroll all thumbs but only if mouse is not over
				if (!thumbnails.retrieve('mouseover'))
					thumbnails.fireEvent('scroll', [this.slide, fast]);
			}.bind(this)
		})
		
		// get the scroll limit
		var div = thumbnails.getCoordinates();

		// portrait or landscape ?
		thumbnails.store('props', (div.height > div.width) ? ['top', 'bottom', 'height', 'y'] : ['left', 'right', 'width', 'x']);

		// add mouseover scrolling
		document.addEvent('mousemove', function(e){
			var div = this.getCoordinates();

			if (e.page.x > div.left && e.page.x < div.right && e.page.y > div.top && e.page.y < div.bottom){
				this.store('page', e.page); // update mouse coords
				
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

		// initialize
		this.slideshow.retrieve('thumbnails', thumbnails).fireEvent('update', true);
	},


	/**
	 * Helper function to center an image
	 */

	_center: function(img){
		if (this.options.center){
			var size = img.getSize();
	
			img.set('styles', { left: (size.x - this.width) / -2, top: (size.y - this.height) / -2 });
		}
	},


	/**
	 * Helper function to resize an image
	 */

	_resize: function(img, w, h){
		if (this.options.resize){
			var dh = this.height / h;
			var dw = this.width / w;
	
			var delta = (dw > dh) ? dw : dh;
	
			img.set('styles', { height: Math.ceil(h * delta), width: Math.ceil(w * delta) });
		}	
	}
});


// Slideshow.Flash: flashing slideshow
// Slideshow.Flash, Copyright (c) 2008 Aeron Glemann <http://electricprism.com/aeron>, MIT Style License.

Slideshow.Flash = new Class({
	Extends: Slideshow,
	
	options: {
		color: '#FFF' // hex string or array of values
	},

	initialize: function(el, data, options){
		options.overlap = true; // force overlapping
				
		this.parent(el, data, options);

		if ($type(this.options.color) == 'string') this.options.color = [this.options.color];

		$$(this.a, this.b).set('tween', { duration: this.options.duration, link: 'cancel' });
	},


	/**
	 * Does the slideshow effect
	 *
	 * @param bool $fast Whether fast mode is active or not, this is set in the options and triggered by navigation
	 */

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


// Slideshow.KenBurns: panning, zooming and fading slideshow in the Ken Burns style
// Slideshow.KenBurns, Copyright (c) 2008 Aeron Glemann <http://electricprism.com/aeron>, MIT Style License.

Slideshow.KenBurns = new Class({
	Extends: Slideshow,
	
	options: {
		pan: 100, // whole integers between 1 and 100 or an array with a range of numbers such as [25, 75]
		zoom: 50 // whole integers between 1 and 100 or an array with a range of numbers such as [25, 75]
	},

	initialize: function(el, data, options){
		options.overlap = true; // force overlapping
		options.resize = true; // force resizing
				
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


	/**
	 * Does the slideshow effect
	 *
	 * @param bool $fast Whether fast mode is active or not, this is set in the options and triggered by navigation
	 */

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


// Slideshow.Push: pushing slideshow
// Slideshow.Push, Copyright (c) 2008 Aeron Glemann <http://electricprism.com/aeron>, MIT Style License.

Slideshow.Push = new Class({
	Extends: Slideshow,
	
	initialize: function(el, data, options){
		options.overlap = true; // force overlapping
		
		this.parent(el, data, options);
	},


	/**
	 * Does the slideshow effect
	 *
	 * @param bool $fast Whether fast mode is active or not, this is set in the options and triggered by navigation
	 */

	show: function(fast){
		// first unanchor left and right positioning, then move image out of view, and make visible		
		this.image.set('styles', { left: 'auto', right: 'auto' }).setStyle(this.direction, this.width).setStyle('visibility', 'visible');

		var images = [this.image, ((this.counter % 2) ? this.a : this.b)];

		var values = { '0': {}, '1': {} };

		values['0'][this.direction] = [this.width, 0];
		values['1'][this.direction] = [0, -this.width];

		// navigation has changed direction causing an image shift which well need to correct
		if (images[1].getStyle(this.direction) == 'auto'){
			var width = this.width - images[1].width;
		
			images[1].set('styles', { left: 'auto', right: 'auto' }).setStyle(this.direction, width);
			 
			values['1'][this.direction] = [width, -this.width];
		}

		if (!this.image.retrieve('fx'))
			this.image.store('fx', new Fx.Elements(images, { duration: this.options.duration, link: 'cancel', transition: this.options.transition }));

		if (fast){
		 	for (var prop in values)
		 		values[prop][this.direction] = values[prop][this.direction][1];
			
			this.image.retrieve('fx').cancel().set(values);
		} 
		else {
			this.image.retrieve('fx').start(values);
		}
	}
});