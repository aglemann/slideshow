/*
Script: Demo.js.
License: Creative Commons license.
Copyright: Copyright (c) 2008 [Aeron Glemann](http://www.electricprism.com/aeron/).
*/

window.addEvent('domready', function() { 
  form = new Element('form', {
    'action': 'https://www.paypal.com/cgi-bin/webscr',
    'html': '<input type="hidden" name="cmd" value="_s-xclick"><input type="hidden" name="encrypted" value="-----BEGIN PKCS7-----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-----END PKCS7-----">',
    'method': 'post',
    'style': {'display': 'none'}
  }).inject(document.body);
  
  $('donate').addClass('donate').addEvent('click', function(){ this.submit(); }.bind(form));
  
	var p = $('colophon').fade('hide');
	$(document.body).getElement('h3.colophon a').addEvent('click', function(){ this.fade('toggle'); }.bind(p));
	
	window.demo = new demo();
	
	this.show = new Slideshow.KenBurns(this.el, null, { captions: true, controller: true, delay: 4000, duration: 1000, height: 400, hu: 'images/', thumbnails: true, width: 500, zoom: 0 });
  
});