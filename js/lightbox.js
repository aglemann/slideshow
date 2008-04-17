// Lightbox 1.6 - Extended version of Slimbox with some fixes for Mootools 1.2 by Aeron Glemann
// Copyright (c) 2007 Samuel Birch <http://phatfusion.net>
// MIT-style license

var Lightbox = {
	init: function(options){
		this.options = Object.extend({
			resizeDuration: 400,
			resizeTransition: Fx.Transitions.Sine.easeInOut,
			initialWidth: 250,
			initialHeight: 250,
			animateCaption: {In:true,Out:true},
			container: document.body,
			showControls: false,
			showNumbers: true,
			descriptions: false,
			opacity: 0.8
		}, options || {});

		this.anchors = [];
		$each(document.links, function(el){
			if (el.rel && el.rel.test(/^lightbox/i)){
				el.onclick = this.click.pass(el, this);
				this.anchors.push(el);
			}
		}, this);
		this.eventPosition = this.position.bind(this);

		this.overlay = new Element('div').setProperty('id', 'lbOverlay').injectInside(this.options.container);

		this.center = new Element('div').setProperty('id', 'lbCenter').setStyles({width: this.options.initialWidth+'px', height: this.options.initialHeight+'px', marginLeft: '-'+(this.options.initialWidth/2)+'px', display: 'none'}).injectInside(this.options.container);
		this.image = new Element('div').setProperty('id', 'lbImage').injectInside(this.center);
		
		this.bottomContainer = new Element('div').setProperty('id', 'lbBottomContainer').setStyle('display', 'none').injectInside(this.options.container);
		this.bottom = new Element('div').setProperty('id', 'lbBottom').injectInside(this.bottomContainer);
		
		if(this.options.showControls){
			this.controlDiv = new Element('div').setProperty('id','lbControls').injectInside(this.bottom);
		}else{
			this.controlDiv = this.image;
		}
		this.prevLink = new Element('a').setProperties({id: 'lbPrevLink', href: '#'}).setStyle('display', 'none').injectInside(this.controlDiv);
		this.nextLink = this.prevLink.clone().setProperty('id', 'lbNextLink').injectInside(this.controlDiv);
		this.prevLink.onclick = this.previous.bind(this);
		this.nextLink.onclick = this.next.bind(this);

		this.closeButton = new Element('a').setProperties({id: 'lbCloseLink', href: '#'}).injectInside(this.bottom)
		this.closeButton.onclick = this.overlay.onclick = this.close.bind(this);
		
		this.caption = new Element('div').setProperty('id', 'lbCaption').injectInside(this.bottom);
		if(this.options.descriptions != false){
			this.options.descriptions = $$(this.options.descriptions);
			this.description = new Element('div').setProperty('id', 'lbDescription').injectInside(this.bottom);
		}
		if(this.options.showNumbers){
			this.number = new Element('div').setProperty('id', 'lbNumber').injectInside(this.bottom);
		}
		new Element('div').setStyle('clear', 'both').injectInside(this.bottom);

		var nextEffect = this.nextEffect.bind(this);
		this.fx = {
			overlay: new Fx.Tween(this.overlay, 'opacity', {duration: 500}),
			resize: new Fx.Morph(this.center, {duration: this.options.resizeDuration, transition: this.options.resizeTransition, onComplete: nextEffect}),
			image: new Fx.Tween(this.image, 'opacity', {duration: 500, onComplete: nextEffect}),
			bottom: new Fx.Tween(this.bottom, 'margin-top', {duration: 400, onComplete: nextEffect})
		};

		this.overlay.fade('hide');

		this.preloadPrev = new Image();
		this.preloadNext = new Image();
	},

	click: function(link){
		if (this.options.descriptions != false){
			this.options.descriptions.each(function(el,i){
				if(el.hasClass(link.id)){
					this.linkLoc = i;
				}
			},this);
		}
				
		if (link.rel.length == 8) return this.show(link.href, link.title);

		var j, imageNum, images = [];
		this.anchors.each(function(el){
			if (el.rel == link.rel){
				for (j = 0; j < images.length; j++) if(images[j][0] == el.href) break;
				if (j == images.length){
					images.push([el.href, el.title]);
					if (el.href == link.href) imageNum = j;
				}
			}
		}, this);
		return this.open(images, imageNum);
	},

	show: function(url, title){
		return this.open([[url, title]], 0);
	},

	open: function(images, imageNum){
		this.images = images;
		this.position();
		this.setup(true);
		this.top = window.getScrollTop() + (window.getHeight() / 15);
		this.window = {};
		this.window.height = window.getScrollHeight();
		this.window.width = window.getScrollWidth();
		this.window.top = window.getScrollTop();
		this.window.left = window.getScrollLeft();
		this.center.setStyles({top: this.top+'px', display: ''});
		this.overlay.fade(this.options.opacity);
		return this.changeImage(imageNum);
	},

	position: function(){ 
		if(this.options.container == document.body){ 
			var h = window.getScrollHeight()+'px'; 
			var w = window.getScrollWidth()+'px';
			this.overlay.setStyles({top: '0px', height: h, width: w}); 
		}else{ 
			var myCoords = this.options.container.getCoordinates(); 
			this.overlay.setStyles({
				top: myCoords.top+'px', 
				height: myCoords.height+'px', 
				left: myCoords.left+'px', 
				width: myCoords.width+'px'
			}); 
		} 
	},

	setup: function(open){
		var elements = $A(document.getElementsByTagName('object'));
		if (window.ie) elements.extend(document.getElementsByTagName('select'));
		elements.each(function(el){ el.style.visibility = open ? 'hidden' : ''; });
		var fn = open ? 'addEvent' : 'removeEvent';
		window[fn]('scroll', this.eventPosition)[fn]('resize', this.eventPosition);
		this.step = 0;
	},

	previous: function(){
		this.linkLoc --;
		return this.changeImage(this.activeImage-1);
	},

	next: function(){
		this.linkLoc ++;
		return this.changeImage(this.activeImage+1);
	},

	changeImage: function(imageNum){
		if (this.step || (imageNum < 0) || (imageNum >= this.images.length)) return false;
		this.step = 1;
		this.activeImage = imageNum;
		if(this.options.animateCaption.In && this.bottom.offsetHeight){
			this.prevLink.style.display = this.nextLink.style.display = 'none';
			this.bottom.set('tween', {duration: 300, onComplete: this.loadImage.bind(this)}).tween('margin-top', -this.bottom.offsetHeight);
		}else{
			this.bottomContainer.style.display = this.prevLink.style.display = this.nextLink.style.display = 'none';
			this.loadImage();
		}
		this.image.fade('hide');
		this.center.className = 'lbLoading';
		
		return false;
	},
	
	loadImage: function(){
		this.preload = new Image();
		this.preload.onload = this.nextEffect.bind(this);
		this.preload.src = this.images[this.activeImage][0];
	},

	nextEffect: function(){
		switch (this.step++){
		case 1:
			this.center.className = '';
			this.image.style.backgroundImage = 'url('+this.images[this.activeImage][0]+')';
			this.image.style.width = this.bottom.style.width = this.preload.width+'px';
			if(this.options.showControls){
				this.image.style.height = this.preload.height+'px';
			}else{
				this.image.style.height = this.prevLink.style.height = this.nextLink.style.height = this.preload.height+'px';
			}

			this.caption.set('html', this.images[this.activeImage][1] || '');
			if(this.options.descriptions != false){
				if(this.description.getFirst()){this.description.getFirst().remove()};
				var cl = this.options.descriptions[this.linkLoc].clone();
				cl.setStyle('display', 'block').injectInside(this.description);
			}
			if(this.options.showNumbers){
				this.number.set('html', (this.images.length == 1) ? '' : 'Image '+(this.activeImage+1)+' of '+this.images.length);
			}

			if (this.activeImage) this.preloadPrev.src = this.images[this.activeImage-1][0];
			if (this.activeImage != (this.images.length - 1)) this.preloadNext.src = this.images[this.activeImage+1][0];
			if (this.center.clientHeight != this.image.offsetHeight){
				this.fx.resize.start({height: this.image.offsetHeight});
				break;
			}
			this.step++;
		case 2:
			if (this.center.clientWidth != this.image.offsetWidth){
				this.fx.resize.start({width: this.image.offsetWidth, marginLeft: -this.image.offsetWidth/2});
				break;
			}
			this.step++;
		case 3:
			this.bottomContainer.setStyles({top: (this.top + this.center.clientHeight)+'px', height: '0px', marginLeft: this.center.style.marginLeft, display: ''});
			this.image.fade('in');
			var extra = this.caption.getStyle('height').toInt();
			if(this.options.descriptions != false){extra += this.description.getStyle('height').toInt()}
			if(this.options.showControls){extra += this.controlDiv.getStyle('height').toInt()}
			if(this.options.showNumbers){extra += this.number.getStyle('height').toInt()}
			var num = (extra-(this.closeButton.getStyle('height').toInt()*2));
			if(num < 0){num=0}
			this.closeButton.setStyle('marginTop', num+'px');
			if(this.activeImage != 0) this.prevLink.style.display = '';
			if(this.activeImage != (this.images.length - 1)) this.nextLink.style.display = '';
			break;
		case 4:
			if (this.options.animateCaption.Out){
				this.fx.bottom.set(-this.bottom.offsetHeight);
				this.bottomContainer.style.height = '';
				this.fx.bottom.start(0);
				break;
			}
			this.bottomContainer.style.height = '';
		case 5:
			this.step = 0;
		}
	},

	close: function(){
		if (this.step < 0) return;
		this.step = -1;
		if (this.preload){
			this.preload.onload = $empty;
			this.preload = null;
		}
		for (var f in this.fx) this.fx[f].cancel();
		this.center.style.display = this.bottomContainer.style.display = 'none';
		this.overlay.fade('out');
		this.setup.pass(false, this);
		this.overlay.setStyles({height: this.window.height+'px', width: this.window.width+'px'});
		return false;
	}

};