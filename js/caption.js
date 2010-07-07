/**
Private method: captions
  Builds the optional caption element, adds interactivity.
  This method can safely be removed if the captions option is not enabled.
*/

Caption = Class({
  options: {
    duration: 400,
    easing: 'ease-in-out',
    template: '<div class="<%= caption %>" />'
  },
  
  init: function(slideshow, options){
    if (!slideshow instanceof Slideshow) return;
    this.slideshow = slideshow;
    xui.extend(this.options, (options === true ? {} : options));
    var data = {
      caption: slideshow.cls.get('caption')
    }
    var el = slideshow.el.find(slideshow.cls.get('caption'));
    this.el = el = el.length ? el.html('') : xui(xui.fn.template(this.options.template, data));
    el.attr({ 
      'aria-busy': false, 
      'aria-hidden': false, 
      'role': 'description' 
    });
    if (!el.attr('id'))
      el.attr('id', 'caption' + slideshow.uid);    
    slideshow.images.attr('aria-labelledby', el.attr('id'));
  },
  
  update: function(caption, fast){
    var empty = !caption.length;
    if (fast){
      var cls = this.slideshow.cls.get(empty ? 'hidden' : 'visible');
      this.el.attr('aria-hidden', empty).html(caption).morph(cls, { duration: 0 });
    }
    else {
      var fn = empty ? function(){} : xui.proxy(this, function(str){
        this.el.html(str).morph(this.slideshow.cls.get('hidden'), {
          after: xui.fn.proxy(this, function(){
            this.el.attr('aria-busy', false);
          });
        });
      }, caption);    
      this.el.attr('aria-busy', true).morph(this.slideshow.cls.hidden, { after: p, duration: this.options.duration, easing: this.options.easing });
    }
  }
});
