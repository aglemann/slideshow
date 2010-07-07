/**
TODO
  change classes.get to take first param array, second param bool / whether to output with . or not
  don't ever emprty slideshow el?
  check for security probs parsing in stylesheets and throw errors
*/

Slideshow = Class({
  
  accesskeys: {},
  counter: 0,
  delay: 0,
  direction: left, 
  el: null,
  events: {},
  paused: false,
  ns: 'slideshow',
  transition: 0,
  
  options: {/*
     onComplete: $empty,
     onEnd: $empty,
     onStart: $empty,*/
     accesskeys: {'first': {'key': 'shift left', 'label': 'Shift + Leftwards Arrow'}, 'prev': {'key': 'left', 'label': 'Leftwards Arrow'}, 'pause': {'key': 'p', 'label': 'P'}, 'next': {'key': 'right', 'label': 'Rightwards Arrow'}, 'last': {'key': 'shift right', 'label': 'Shift + Rightwards Arrow'}},
     captions: true,
     center: true,
     controller: true,
     delay: 2000,
     duration: 750,
     fast: false,
     height: false,
     href: '',
     hu: '',
     linked: false,
     loader: true,
     loop: true,
     match: /\?slide=(\d+)$/,
     overlap: false,
     paused: false,
     preload: false,
     random: false,
     replace: [/(\.[^\.]+)$/, 't$1'],
     resize: 'width',
     slide: 0,
     thumbnails: false,
     titles: true,
     transition: function(p){return -(Math.cos(Math.PI * p) - 1) / 2;},
     width: false
   },
 
  init: function(el, data, options){
    xui.extend(this.options, options);
    this.el = xui(el);
    if (!this.el) return;
    this.uid = +new Date;
    if (!this.el.attr('id'))
      this.el.attr('id', this.uid);
    if (!this.options.overlap)
      this.options.duration *= 2;
    var anchor = this.el.find('a') || xui('<a />');
    if (!this.options.href)
      this.options.href = anchor.get('href') || '';
    if (this.options.hu.length && !this.options.hu.test(/\/$/)) 
      this.options.hu += '/';
    if (this.options.fast === true)
      this.options.fast = 2;
    this.tabindex = 0;  
                
    // events
    
    this.events = {
      push: function(type, fn){
        if (!this[type])
          this[type] = [];
        this[type].push(fn);
        document.addEvent(type, fn);
        return this;      
    };
    
    this.accesskeys = {};
    xui.each(this.options.accesskeys, function(obj, action){
      this.accesskeys[action] = accesskey = {'label': obj.label};
      ['shift', 'control', 'alt', 'meta'].each(function(modifier){
        var re = new RegExp(modifier, 'i');
        accesskey[modifier] = obj.key.test(re);
        obj.key = obj.key.replace(re, '');
      });
      accesskey.key = obj.key.trim();
    }, this);

    this.events.push('keyup', function(e){
      this.accesskeys.each(function(accesskey, action){
        if (e.key == accesskey.key && e.shift == accesskey.shift && e.control == accesskey.control && e.alt == accesskey.alt && e.meta == accesskey.meta)
          this[action]();
      }, this);      
    }.bind(this));   

    // data  
      
    if (!data){
      this.options.hu = '';
      data = {};
      var thumbnails = this.el.getElements(this.classes.get('thumbnails') + ' img');
      this.el.getElements(this.classes.get('images') + ' img').each(function(img, i){
        var caption = $pick(img.get('alt'), img.get('title'), '');
        var href = '';
        var thumbnail = thumbnails[i] ? thumbnails[i].get('src') : '';
        var parent = img.getParent();
        if (parent.get('tag') == 'a') {
          caption = $pick(caption, parent.get('title'), '');          
          href = parent.get('href');
        }
        data[img.get('src')] = {'caption': caption, 'href': href, 'thumbnail': thumbnail};
      });
    }

    // load data
    
    var loaded = this.load(data);
    if (!loaded)
      return;     

    // required elements
      
    var div = this.el.getElement(this.classes.get('images'));
    var images = div ? div.empty() 
      : new Element('div', {'class': this.classes.get('images').substr(1)}).inject(this.el);
    imagesSize = images.getSize();
    this.height = this.options.height || imagesSize.y;    
    this.width = this.options.width || imagesSize.x;
    images.set({
      'aria-busy': false,
      'role': 'img',
      'styles': {'display': 'block', 'height': this.height, 'overflow': 'hidden', 'position': 'relative', 'width': this.width}
    });
    this.el.store('images', images);
    
    this.a = this.image = this.el.getElement('img') || new Element('img');
    if (Browser.Engine.trident && Browser.Engine.version > 4)
      this.a.style.msInterpolationMode = 'bicubic';
    this.a.set({'aria-hidden': false, 'styles': {'display': 'none', 'position': 'absolute', 'zIndex': 1}});
    this.b = this.a.clone();
    [this.a, this.b].each(function(img){
      anchor.clone().cloneEvents(anchor).grab(img).inject(images);
    });    
      
    // optional elements
    
    if (this.options.captions)
      this.caption = new Caption(this);
    if (this.options.controller)
      this.controller = new Controller(this);
    if (this.options.loader)
      this.loader = new Loader(this);
    if (this.options.thumbnails)
      this.thumbnails = new Thumbnails(this);
      
    // setup first slide  
      
    this.slide = this.options.slide;
    var match = window.location.href.match(this.options.match);
    if (this.options.match && match){
      if (this.data.images.contains(match[1]))
        this.slide = this.data.images.indexOf(match[1]);
      else if ($type(match[1].toInt()) == 'number')
        this.slide = match[1] % this.data.images.length;
    }

    // begin show
    
    this._preload();
    
  }
  
});

Slideshow = new Class({
  Implements: [Chain, Events, Options],
  
  options: {/*
    onComplete: $empty,
    onEnd: $empty,
    onStart: $empty,*/
    accesskeys: {'first': {'key': 'shift left', 'label': 'Shift + Leftwards Arrow'}, 'prev': {'key': 'left', 'label': 'Leftwards Arrow'}, 'pause': {'key': 'p', 'label': 'P'}, 'next': {'key': 'right', 'label': 'Rightwards Arrow'}, 'last': {'key': 'shift right', 'label': 'Shift + Rightwards Arrow'}},
    captions: true,
    center: true,
    classes: [],
    controller: true,
    delay: 2000,
    duration: 750,
    fast: false,
    height: false,
    href: '',
    hu: '',
    linked: false,
    loader: true,
    loop: true,
    match: /\?slide=(\d+)$/,
    overlap: false,
    paused: false,
    preload: false,
    random: false,
    replace: [/(\.[^\.]+)$/, 't$1'],
    resize: 'width',
    slide: 0,
    thumbnails: false,
    titles: true,
    transition: function(p){return -(Math.cos(Math.PI * p) - 1) / 2;},
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
    this.el = this.slideshow = document.id(el);
    if (!this.el) {      
      throw new Error('The element "' + el.toString() + '" does not exist.');
      return;
    }
    this.el.store('html', this.el.get('html'));
    this.uid = 'Slideshow-' + $time();
    this.el.set({'aria-live': 'polite', 'role': 'widget', 'styles': {'display': 'block', 'position': 'relative', 'z-index': 0}});
    if (!this.el.get('id'))
      this.el.set('id', this.uid);
    this.counter = this.delay = this.transition = 0;
    this.direction = 'left';
    this.paused = false;
    if (!this.options.overlap)
      this.options.duration *= 2;
    var anchor = this.el.getElement('a') || new Element('a');
    if (!this.options.href)
      this.options.href = anchor.get('href') || '';
    if (this.options.hu.length && !this.options.hu.test(/\/$/)) 
      this.options.hu += '/';
    if (this.options.fast === true)
      this.options.fast = 2;
      
    // styles
    
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
    }.bind(this.classes);
          
    // events
    
    this.events = new Hash();
    this.events.push = function(type, fn){
      if (!this[type])
        this[type] = [];
      this[type].push(fn);
      document.addEvent(type, fn);
      return this;
    }.bind(this.events);
    
    this.accesskeys = new Hash();
    xui.each(this.options.accesskey, function(obj, action){
      this.accesskeys[action] = accesskey = {'label': obj.label};
      ['shift', 'control', 'alt', 'meta'].each(function(modifier){
        var re = new RegExp(modifier, 'i');
        accesskey[modifier] = obj.key.test(re);
        obj.key = obj.key.replace(re, '');
      });
      accesskey.key = obj.key.trim();
    }, this);

    this.events.push('keyup', function(e){
      xui.each(this.accesskeys, function(accesskey, action){
        if (e.key == accesskey.key && e.shift == accesskey.shift && e.control == accesskey.control && e.alt == accesskey.alt && e.meta == accesskey.meta)
          this[action]();
      }, this);      
    });   

    // data  
      
    if (!data){
      this.options.hu = '';
      data = {};
      var thumbnails = this.el.find(this.classes.get('thumbnails') + ' img');
      xui.each(this.el.find(this.classes.get('images') + ' img', function(img, i){
        var caption = img.attr('alt') || img.attr('title') || '';
        var href = '';
        var thumbnail = thumbnails[i] ? thumbnails[i].attr('src') : '';
        var parent = img.parentNode;
        if (parent.tagName.toLowerCase() == 'a') {
          caption = caption || parent.attr('title') || '';          
          href = parent.attr('href');
        }
        data[img.attr('src')] = {'caption': caption, 'href': href, 'thumbnail': thumbnail};
      });
    }

    // load data
    
    var loaded = this.load(data);
    if (!loaded)
      return;     

    // required elements
      
    var div = this.el.find(this.classes.get('images'));
    var images = div ? div.html('outer', '')
      : xui('<div />';
    images.addClass(this.classes.get('images').substr(1)).append(this.el);
    imagesSize = images.getSize();
    this.height = this.options.height || imagesSize.y;    
    this.width = this.options.width || imagesSize.x;
    images.set({
      'aria-busy': false,
      'role': 'img',
      'styles': {'display': 'block', 'height': this.height, 'overflow': 'hidden', 'position': 'relative', 'width': this.width}
    });
    this.el.store('images', images);
    
    this.a = this.image = this.el.getElement('img') || new Element('img');
    if (Browser.Engine.trident && Browser.Engine.version > 4)
      this.a.style.msInterpolationMode = 'bicubic';
    this.a.set({'aria-hidden': false, 'styles': {'display': 'none', 'position': 'absolute', 'zIndex': 1}});
    this.b = this.a.clone();
    [this.a, this.b].each(function(img){
      anchor.clone().cloneEvents(anchor).grab(img).inject(images);
    });    
      
    // optional elements
    
    if (this.options.captions)
      this.caption = new Caption(this);
    if (this.options.controller)
      this.controller = new Controller(this);
    if (this.options.loader)
      this.loader = new Loader(this);
    if (this.options.thumbnails)
      this.thumbnails = new Thumbnails(this);
      
    // setup first slide  
      
    this.slide = this.options.slide;
    var match = window.location.href.match(this.options.match);
    if (this.options.match && match){
      if (this.data.images.contains(match[1]))
        this.slide = this.data.images.indexOf(match[1]);
      else if ($type(match[1].toInt()) == 'number')
        this.slide = match[1] % this.data.images.length;
    }

    // begin show
    
    this._preload();
  },
  
  /**
  Public method: go
    Jump directly to a slide in the show.

  Arguments:
    n - (integer) The index number of the image to jump to, 0 being the first image in the show.
    direction - (string) The direction the slideshow animates, either right or left.
  
  Syntax:
    myShow.go(n);  
  */

  go: function(n, direction){
    if ((this.slide - 1 + this.data.images.length) % this.data.images.length == n || +new Date < this.transition)
      return;    
    clearTimeout(this.timer);
    this.delay = 0;    
    this.direction = direction ? direction 
      : ((n < this.slide) ? 'right' : 'left');
    this.slide = n;
    if (this.preloader) 
      this.preloader = this.preloader.destroy();
    this._preload(this.options.fast == 2 || (this.options.fast == 1 && this.paused));
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

 Arguments:
   first - (undefined or true) Go to first frame instead of previous.
 
  Syntax:
    myShow.prev();  
  */

  prev: function(first){
    var n = 0;
    if (!first){
      if (this.options.random){
        
        // if it's a random show get the previous slide from the showed array

        if (this.showed.i < 2)
          return;
        this.showed.i -= 2;
        n = this.showed.array[this.showed.i];
      }
      else
        n = (this.slide - 2 + this.data.images.length) % this.data.images.length;                  
    }
    this.go(n, 'right');
  },

  /**
  Public method: pause
    Toggles play / pause state of the show.

  Arguments:
    p - (undefined, 1 or 0) Call pause with no arguments to toggle the pause state. Call pause(1) to force pause, or pause(0) to force play.

  Syntax:
    myShow.pause(p);  
  */

  pause: function(p){
    if ($chk(p))
      this.paused = p ? false : true;
    if (this.paused){
      this.paused = false;
      this.delay = this.state.delay;
      this.transition = this.state.transition;    
      this.timer = this._preload.delay(100, this);
      [this.a, this.b].each(function(img){
        ['morph', 'tween'].each(function(p){
          if (this.retrieve(p)) this.get(p).resume();
        }, img);
      });
      if (this.options.controller)
        this.el.retrieve('pause').removeClass(this.classes.play);
    } 
    else {
      this.paused = true;
      this.state = {'delay': this.delay, 'transition': this.transition};
      this.delay = Number.MAX_VALUE;
      this.transition = 0;
      $clear(this.timer);
      [this.a, this.b].each(function(img){
        ['morph', 'tween'].each(function(p){
          if (this.retrieve(p)) this.get(p).pause();
        }, img);
      });
      if (this.options.controller)
        this.el.retrieve('pause').addClass(this.classes.play);
    }
  },
  
  /**
  Public method: next
    Goes to the next image in the show.

  Arguments:
    last - (undefined or true) Go to last frame instead of next.

  Syntax:
    myShow.next();  
  */

  next: function(last){
    var n = last ? this.data.images.length - 1 : this.slide;
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
    if ($type(data) == 'array'){
      this.options.captions = false;      
      data = new Array(data.length).associate(data.map(function(image, i){ return image + '?' + i; })); 
    }
    this.data = {'images': [], 'captions': [], 'delays': [], 'hrefs': [], 'thumbnails': [], 'titles': []};
    for (var image in data){
      if (data.hasOwnProperty(image)){
        var obj = data[image] || {};
        var caption = obj.caption ? obj.caption.trim() : '';
        var delay = obj.delay || this.delay;
        var href = obj.href ? obj.href.trim() 
          : (this.options.linked ? this.options.hu + image 
          : this.options.href);
        var thumbnail = obj.thumbnail ? obj.thumbnail.trim() 
          : image.replace(this.options.replace[0], this.options.replace[1]);
        var title = caption ? caption.replace(/<.+?>/gm, '').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, "'") : '';
        this.data.images.push(image);
        this.data.captions.push(caption);
        this.data.delays.push(delay);
        this.data.hrefs.push(href);
        this.data.thumbnails.push(thumbnail);
        this.data.titles.push(title);
      }      
    }
    if (this.options.random)
      this.slide = $random(0, this.data.images.length - 1);
    if (this.options.preload){
      this.data.images.each(function(image){
        new Asset.image(this.options.hu + image);
      }, this);
    }
    
    // only run when data is loaded dynamically into an existing slideshow instance
    
    if (this.options.thumbnails && this.thumbnails)
      this.thumbnails.initialize();
    if (this.el.retrieve('images')){
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
  
  /**
  Public method: destroy
    Destroys a Slideshow instance.

  Arguments:
    p - (string) The images and optional thumbnails, captions and links for the show.

  Syntax:
    myShow.destroy(p);
  */

  destroy: function(p){
    this.events.each(function(arr, e){
      if ($type(arr) == 'array')
        arr.each(function(fn){ document.removeEvent(e, fn); });
    });
    this.pause(1);
    if (this.options.loader)
      $clear(this.loader.retrieve('timer'));    
    if (this.options.thumbnails)
      $clear(this.thumbnails.retrieve('timer'));
    if (p){
      if (p == 'reset')
        this.el.set('html', this.slideshow.retrieve('html'));
      else
        this.el[p]();
    }
    this.el.uid = Native.UID++; // once the internal ID is changed the pointer to all stored data is broken
  },
  
  /**
  Private method: preload
    Preloads the next slide in the show, once loaded triggers the show, updates captions, thumbnails, etc.
    
  Arguments:
    fast - (boolean) Whether the slideshow operates in fast-mode or not.
  */

  _preload: function(fast){
    if (!this.preloader)
       this.preloader = new Asset.image(this.options.hu + this.data.images[this.slide], {
        'onerror': function(){
          ['images', 'captions', 'hrefs', 'titles'].each(function(key){
            this.data[key].splice(this.slide, 1);
          }, this);
          if (this.options.thumbnails && this.thumbnails){
            $(thumbnails.retrieve('uid') + this.slide).destroy();
          }
          this.preloader = this.preloader.destroy();
          this._preload();
        }.bind(this),
        'onload': function(){
          this.store('loaded', true);
        }
      });  
    if (this.preloader.retrieve('loaded') && $time() > this.delay && $time() > this.transition){
      if (this.stopped){
        if (this.options.captions)
          this.caption.get('morph').cancel().start(this.classes.get('captions', 'hidden'));
        this.pause(1);
        if (this.end)
          this.fireEvent('end');
        this.stopped = this.end = false;
        return;        
      }          
      this.image = (this.counter % 2) ? this.b : this.a;
      this.image.set('styles', {'display': 'block', 'height': 'auto', 'visibility': 'hidden', 'width': 'auto', 'zIndex': this.counter});
      ['src', 'height', 'width'].each(function(prop){
        this.image.set(prop, this.preloader.get(prop));
      }, this);
      this._resize(this.image);
      this._center(this.image);
      var anchor = this.image.getParent();
      if (this.data.hrefs[this.slide])
        anchor.set('href', this.data.hrefs[this.slide])
      else
        anchor.erase('href');
      if (this.options.titles) {
        this.image.set('alt', this.data.titles[this.slide]);    
        anchor.set('title', this.data.titles[this.slide]);
      }
      if (this.options.loader)
        this.loader.fireEvent('hide');
      if (this.options.captions)
        this.caption.fireEvent('update', fast);        
      if (this.options.thumbnails)
        this.thumbnails.fireEvent('update', fast);       
      this._show(fast);
      this._loaded();
    } 
    else {
      if ($time() > this.delay && this.options.loader)
        this.loader.fireEvent('show');
      this.timer = (this.paused && this.preloader.retrieve('loaded')) ? null 
        : this._preload.delay(100, this, fast); 
    }
  },

  /**
  Private method: show
    Does the slideshow effect.

  Arguments:
    fast - (boolean) Whether the slideshow operates in fast-mode or not.
  */

  _show: function(fast){
    if (!this.image.retrieve('morph')){
      var options = this.options.overlap ? {'duration': this.options.duration, 'link': 'cancel'} 
        : {'duration': this.options.duration / 2, 'link': 'chain'};
      $$(this.a, this.b).set('morph', $merge(options, {'onStart': this._start.bind(this), 'onComplete': this._complete.bind(this), 'transition': this.options.transition}));
    }
    var hidden = this.classes.get('images', ((this.direction == 'left') ? 'next' : 'prev'));
    var visible = this.classes.get('images', 'visible');
    var img = (this.counter % 2) ? this.a : this.b;
    if (fast){      
      img.set('aria-hidden', true).get('morph').cancel().set(hidden);
      this.image.set('aria-hidden', false).get('morph').cancel().set(visible);       
    } 
    else {
      if (this.options.overlap){
        img.get('morph').set(visible);
        this.image.get('morph').set(hidden).start(visible);
      } 
      else  {
        var fn1 = function(img, hidden, visible){
          img.set({'aria-busy': false, 'aria-hidden': true});
          this.image.set({'aria-busy': true}).get('morph').set(hidden).start(visible);
        }.pass([img, hidden, visible], this);
        var fn2 = function(){
          this.image.set({'aria-busy': false, 'aria-hidden': false});
        }.bind(this);
        hidden = this.classes.get('images', ((this.direction == 'left') ? 'prev' : 'next'));
        img.set('aria-busy', true).get('morph').set(visible).start(hidden).chain(fn1, fn2);
      }
    }
  },

  /**
  Private method: loaded
    Run after the current image has been loaded, sets up the next image to be shown.
  */

  _loaded: function(){
    this.counter++;
    this.delay = this.paused ? Number.MAX_VALUE : $time() + this.options.duration + this.data.delays[this.slide];
    this.direction = 'left';
    this.transition = (this.options.fast == 2 || (this.options.fast == 1 && this.paused)) ? 0 : $time() + this.options.duration;      
    if (this.slide + 1 == this.data.images.length && !this.options.loop && !this.options.random)
      this.stopped = this.end = true;      
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
    if (this.image.getStyle('visibility') != 'visible')
      (function(){ this.image.setStyle('visibility', 'visible'); }).delay(1, this);      
    if (this.preloader) 
      this.preloader = this.preloader.destroy();
    this._preload();
  },

  /**
  Private method: center
    Center an image.

  Arguments:
    img - (element) Image that the transform is applied to.
  */

  _center: function(img){
    if (this.options.center){
      var h = img.get('height'), w = img.get('width');
      img.set('styles', {'left': (w - this.width) / -2, 'top': (h - this.height) / -2});
    }
  },

  /**
  Private method: resize
    Resizes an image.

  Arguments:
    img - (element) Image that the transform is applied to.
  */

  _resize: function(img){
    if (this.options.resize){
      var h = this.preloader.get('height'), w = this.preloader.get('width');
      var dh = this.height / h, dw = this.width / w, d;
      if (this.options.resize == 'length')
        d = (dh > dw) ? dw : dh;
      else
        d = (dh > dw) ? dh : dw;
      img.set('styles', {height: Math.ceil(h * d), width: Math.ceil(w * d)});
    }  
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
    if (this.firstrun && this.options.paused){
      this.firstrun = false;
      this.pause(1);
    }
    this.fireEvent('complete');
  }
});