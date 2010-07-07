/**
Private method: loader
  Builds the optional loader element, adds interactivity.
  This method can safely be removed if the loader option is not enabled.
*/

Loader = Class({
  options: {
    template: '<div class="<%= caption %>" />'
  },
  
  initialize: function(slideshow, options){
    if (!slideshow instanceof Slideshow) return;
    this.slideshow = slideshow;
    xui.extend(this.options, (options === true ? {} : options));

    var loader = new Element('div', {
      'aria-hidden': false,
      'class': slideshow.classes.get('loader').substr(1),        
      'morph': $merge(options, {'link': 'cancel'}),
      'role': 'progressbar'
    }).store('animate', false).store('i', 0).inject(slideshow.el.retrieve('images'));
    var url = loader.getStyle('backgroundImage').replace(/url\(['"]?(.*?)['"]?\)/, '$1');
    if (url){
      if (url.test(/\.apng$/) && !(Browser.Engine.gecko19 || Browser.Engine.presto950))
        url = url.replace(/(.*?)\.apng$/, '$1.png');
      if (url.test(/\.png$/)){
        if (Browser.Engine.trident4)
          loader.setStyles({'backgroundImage': 'none', 'filter': 'progid:DXImageTransform.Microsoft.AlphaImageLoader(src="' + url + '", sizingMethod="crop")'});          
        new Asset.image(url, {'onload': function() {
          var size = loader.getSize(), w = this.get('width'), h = this.get('height'), img = url.split('/').pop();
          if (w > size.x)
            loader.store('animate', 'x').store('frames', (w / size.x).toInt());
          else if (h > size.y)
            loader.store('animate', 'y').store('frames', (h / size.y).toInt());
          else if (img.test(/\d+/))
            loader.store('animate', url).store('frames', 1).fireEvent('preload');
        }});
      }
    }
    loader.set('events', {
      'animate': this.animate.bind(slideshow),
      'hide': this.hide.bind(slideshow),
      'preload': this.preload.bind(slideshow),
      'show': this.show.bind(slideshow)
    });
    loader.fireEvent('hide');
    return loader;
  },
  
  animate: function(){
    var i = (this.loader.retrieve('i').toInt() + 1) % this.loader.retrieve('frames');
    this.loader.store('i', i);
    var animate = loader.retrieve('animate');        
    if (animate == 'x')
      this.loader.setStyle('backgroundPosition', (i * this.loader.getSize().x) + ' 0');
    else if (animate == 'y')
      this.loader.setStyle('backgroundPosition', '0 ' + (i * this.loader.getSize().y));
    else { // animate frames
      var url = animate.split('/');
      var img = url.pop().replace(/\d+/, i);
      url = url.push(img).join('/');
      if (Browser.Engine.trident4)
        this.loader.setStyle('filter', 'progid:DXImageTransform.Microsoft.AlphaImageLoader(src="' + url + '", sizingMethod="scale")');
      else 
        this.loader.setStyle('backgroundImage', 'url(' + url + ')');
    }  
  },
  
  hide: function(){
    if (!this.loader.get('aria-hidden')){
      this.loader.set('aria-hidden', true).morph(this.classes.get('loader', 'hidden'));
      if (this.loader.retrieve('animate'))
        $clear(this.loader.retrieve('timer'));          
    }
  },
  
  preload: function(){
    var url = this.loader.retrieve('animate').split('/');
    var img = url.pop().replace(/\d+/, this.loader.retrieve('frames') + 1);
    url = url.push(img).join('/');
    new Asset.image(url, {'onload': function(){
      this.store('frames', this.retrieve('frames') + 1).fireEvent('preload');
    }.bind(this.loader) });
  },
  
  show: function(){
    if (this.loader.get('aria-hidden')){
      this.loader.set('aria-hidden', false).morph(this.classes.get('loader', 'visible'));
      if (this.loader.retrieve('animate'))
        this.loader.store('timer', function(){this.fireEvent('animate');}.periodical(50, loader));
    }
  }
});
