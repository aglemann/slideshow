/**
Private method: thumbnails
  Builds the optional thumbnails element, adds interactivity.
  This method can safely be removed if the thumbnails option is not enabled.
*/

Thumbnails = Class({
  options: {
    columns: null,
    position: null,
    rows: null,
    scroll: null,
    template: '<div class="{thumbnails}" role="menubar"><ul role="menu">{<li id="{uid}" class="{thumbnails-item} {hidden}" role="menuitem" tabindex="{i}"><img src="{src}">}</ul></div>'
  },
  
  initialize: function(slideshow, options){
    if (!slideshow instanceof Slideshow) return;
    this.slideshow = slideshow;
    xui.extend(this.options, (options === true ? {} : options));
    var el = slideshow.el.getElement(slideshow.classes.get('thumbnails'));
    var thumbnails = el ? el.empty() 
      : new Element('div', {'class': slideshow.classes.get('thumbnails').substr(1)}).inject(slideshow.el);
    thumbnails.set({'role': 'menubar', 'styles': {'overflow': 'hidden'}});
    var uid = thumbnails.retrieve('uid', 'Slideshow-' + $time());
    var ul = new Element('ul', {'role': 'menu', 'styles': {'left': 0, 'position': 'absolute', 'top': 0}, 'tween': {'link': 'cancel'}}).inject(thumbnails);

    var el = slideshow.el.find('.thumbnails'), html = xui.fn.template(this.options.template, slideshow.data);
    this.el = el.length ? el.html('outer', html) : xui(html);

    slideshow.data.thumbnails.each(function(thumbnail, i){
      var li = new Element('li', {'id': uid + i}).inject(ul);
      var a = new Element('a', {
        'class': slideshow.classes.get('thumbnails', 'hidden').substr(1),
        'events': {
          'click': this.click.pass(i, slideshow)
        },
        'href': slideshow.options.hu + slideshow.data.images[i],
        'morph': $merge(options, {'link': 'cancel'}),
        'role': 'menuitem',
        'tabindex': i
      }).store('uid', i).inject(li);
      if (slideshow.options.titles)
        a.set('title', slideshow.data.titles[i]);
      new Asset.image(slideshow.options.hu + thumbnail, {
        'onload': this.onload.pass(i, slideshow)
      }).inject(a);
    }, this);
    thumbnails.set('events', {
      'scroll': this.scroll.bind(thumbnails),
      'update': this.update.bind(slideshow)
    });
    var coords = thumbnails.getCoordinates();
    if (!options.scroll)
      options.scroll = (coords.height > coords.width) ? 'y' : 'x';
    var props = (options.scroll == 'y') ? ['top', 'bottom', 'height', 'y', 'width'] 
      : ['left', 'right', 'width', 'x', 'height'];
    thumbnails.store('props', props);
    this.events.push('mousemove', this.mousemode.bind(thumbnails));
    return thumbnails;  
  },
  
  click: function(i){
    this.go(i); 
    return false; 
  },
  
  mousemove: function(e){
    var coords = this.getCoordinates();
    if (e.page.x > coords.left && e.page.x < coords.right && e.page.y > coords.top && e.page.y < coords.bottom){
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
  },
  
  onload: function(i){
    var thumbnails = this.slideshow.retrieve('thumbnails');
    var a = thumbnails.getElements('a')[i];
    if (a){
      (function(a){              
        a.store('loaded', true).get('morph').set(this.classes.get('thumbnails', 'hidden')).start(this.classes.get('thumbnails', 'inactive'));  
      }).delay(50 * i, this, a);
    }          
    if (thumbnails.retrieve('limit'))
      return;
    var props = thumbnails.retrieve('props'), options = this.options.thumbnails;
    var pos = props[1], length = props[2], width = props[4]; 
    var li = thumbnails.getElement('li:nth-child(' + (i + 1) + ')').getCoordinates();
    if (options.columns || options.rows){
      thumbnails.setStyles({'height': this.height, 'width': this.width});
      if (options.columns.toInt())
        thumbnails.setStyle('width', li.width * options.columns.toInt());
      if (options.rows.toInt())
        thumbnails.setStyle('height', li.height * options.rows.toInt());
    }
    var div = thumbnails.getCoordinates();
    if (options.position){
      if (options.position.test(/bottom|top/))
        thumbnails.setStyles({'bottom': 'auto', 'top': 'auto'}).setStyle(options.position, -div.height);
      if (options.position.test(/left|right/))
        thumbnails.setStyles({'left': 'auto', 'right': 'auto'}).setStyle(options.position, -div.width);
    }
    var n = Math.floor(div[width] / li[width]); // number of rows or columns
    var x = Math.ceil(this.data.images.length / n); // number of images per row or column
    var r = this.data.images.length % n; // remainder
    var len = x * li[length]; // length of a single row or column
    var ul = thumbnails.getElement('ul').setStyle(length, len);
    var lis = ul.getElements('li').setStyles({'height': li.height, 'width': li.width});
    if (options.scroll == 'y'){ // for vertical scrolling we have to resort the thumbnails in the container
      ul.innerHTML = '';
      var counter = this.data.images.length;
      for (i = 0; i < x; i++){
        for (var j = 0; j < n; j++){
          if (!counter) break;
          counter--;
          var m = i + (x * j);
          if (j > r) m -= (j - r);
          lis[m].inject(ul);
        }
      }
    }
    thumbnails.store('limit', div[length] - len);
  },
  
  scroll: function(n, fast){
    var div = this.getCoordinates();
    var ul = this.getElement('ul').getPosition();
    var props = this.retrieve('props');
    var axis = props[3], delta, pos = props[0], size = props[2], value;        
    var tween = this.getElement('ul').get('tween', {'property': pos});  
    if ($chk(n)){
      var uid = this.retrieve('uid');
      var li = $(uid + n).getCoordinates();
      delta = div[pos] + (div[size] / 2) - (li[size] / 2) - li[pos];
      value = (ul[axis] - div[pos] + delta).limit(this.retrieve('limit'), 0);
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
        value = (ul[axis] - div[pos] + delta).limit(this.retrieve('limit'), 0);
        tween.set(value);
      }
    }        
  },
  
  update: function(fast){
    var thumbnails = this.slideshow.retrieve('thumbnails');
    var uid = thumbnails.retrieve('uid');
    thumbnails.getElements('a').each(function(a, i){
      if (a.retrieve('loaded')){
        if (a.retrieve('uid') == this.slide){
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
      thumbnails.fireEvent('scroll', [this.slide, fast]);
  }
});