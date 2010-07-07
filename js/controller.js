/**
Private method: controller
  Builds the optional controller element, adds interactivity.
  This method can safely be removed if the controller option is not enabled.
*/

Controller = Class({
  options: {
    template: '<div class="<%= controller %>" role="menubar" aria-hidden="false"><ul role="menu"><% for (var i = 0, l = actions.length; i < l; i++){ %><li><a class="<%= actions[i] %>" role="menuitem" title="<%= title %>"><% } %></ul></div>'
  },
  
  el: null,
  
  init: function(slideshow, options){
    if (!slideshow) return;
    this.slideshow = slideshow;
    xui.extend(this.options, (options === true ? {} : options));
    var el = slideshow.el.find(slideshow.classes.get('controller'));
    this.el = el = el.length ? el.remove() : xui('<div>');
    el.html('outer', this.options.template);
    slideshow.el.append(el);
    var i = 0;
    
    var data = {  
      actions: 
      controller: slideshow.classes.get('controller')
    }
    
    xui.each(slideshow.accesskeys, function(accesskey, action){
      var data = {
        className: (action == 'pause' && slideshow.options.paused) ? this.classes.get('play pause', true) : this.classes[action],
        title: accesskey.label
      }
      var li = xui(xui.substitute(this.options.template, data));
      var a = li.find('a');
      ul.append(li);

      a.set('events', {
        'click': function(action){this[action]();}.pass(action, this),
        'mouseenter': function(active){this.addClass(active);}.pass(this.classes.active, a),
        'mouseleave': function(active){this.removeClass(active);}.pass(this.classes.active, a)
      });    
    }, slideshow);
    controller.on({
      'hide': this.hide,
      'show': this.show
    });
    slideshow.events
      .push('keydown', this.keydown)
      .push('keyup', this.keyup)
      .push('mousemove', this.mousemove);
    controller.fire('hide');
  },
  
  hide: function(){
    if (!this.el.attr('aria-hidden')){
      this.el.attr('aria-hidden', true).morph('.hidden');
    }
  },
  
  keydown: function(e){
    this.accesskeys.each(function(accesskey, action){
      if (e.key == accesskey.key && e.shift == accesskey.shift && e.control == accesskey.control && e.alt == accesskey.alt && e.meta == accesskey.meta){
        if (this.controller.get('aria-hidden'))
          this.controller.get('morph').set(this.classes.get('controller', 'visible'));
        this.slideshow.retrieve(action).fireEvent('mouseenter');
      }          
    }, this);    
  },
  
  keyup: function(e){
    this.accesskeys.each(function(accesskey, action){
      if (e.key == accesskey.key && e.shift == accesskey.shift && e.control == accesskey.control && e.alt == accesskey.alt && e.meta == accesskey.meta){
        if (this.controller.get('aria-hidden'))
          this.controller.set('aria-hidden', false).fireEvent('hide'); 
        this.slideshow.retrieve(action).fireEvent('mouseleave');
      }          
    }, this);      
  },
  
  mousemove: function(e){
    var images = this.slideshow.images.getCoordinates();
    var action = (e.page.x > images.left && e.page.x < images.right && e.page.y > images.top && e.page.y < images.bottom) ? 'show' : 'hide';
    this[action]();
  },
  
  show: function(){
    if (this.el.attr('aria-hidden')){
      this.el.attr('aria-hidden', false).morph('.visible');
    }
  }
});
