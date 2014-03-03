dojo.require('esri.map', 'esri.tasks.locator', 'esri.geometry.webMercatorUtils');
dojo.addOnLoad(function () {//run after page load
var AppView = Backbone.View.extend({
el: 'body',
events: {
  	'keypress #message-input': 'saveMsg',
  	'click .share-message': 'saveMsg',
  	'click #add-event-btn': 'enableEventClickHandler'
},
initialize: function() {
	_.bindAll.apply(_, [this].concat(_.functions(this)));
	var $this = this;
	this.fb = new Firebase('https://luminous-fire-5575.firebaseio.com/users');
	this.userLocation = null;
	this.pointSymbol = new esri.symbol.SimpleMarkerSymbol();
	this.pointSymbol.setSize(14);
	this.pointSymbol.setOutline(new esri.symbol.SimpleLineSymbol(esri.symbol.SimpleLineSymbol.STYLE_SOLID, new dojo.Color([255, 0, 0]), 1));
	this.pointSymbol.setColor(new dojo.Color([0, 255, 0, 0.25]));
	this.map = new esri.Map('map', {basemap: 'gray', center: [-116.538208, 33.826077], zoom: 10 }); //The first slash of this comment marks 100 characters
	$('.about-modal').on('click',function() { $('#about-modal').modal()});
	$('.search-modal').on('click',function() { $('#search-modal').modal()});
	$('.share-modal').on('click',function() { $('#share-modal').modal()});
	$('.chat-modal').on('click',function() { $('#chat-modal').modal()});

	$('#search-input').on('typeahead:selected', function (evt, datum, name) {
		//probably  use this...
	});
	$('.current-location').on('click',function() { $this.getLocation() });
	this.fb.on('value', function (ss) {
		var val = ss.val();
		var user;
		$this.users = [];
		$this.messages = [];
		_.each(val, function (item) {
			user = item.text;
			$this.users.push({text: item.text});
			_.each(item.messages, function (item2) {
				item2['name'] = user;
				$this.messages.push(item2)
			});
		});
		$this.displayChatMessages();
		$this.activateClickListener();//TODO: Need a new place for this
		$this.initTypeahead('msgs');
	});
},
saveMsg: function (evt) {
	if (evt.keyCode === 13 || !evt.keyCode) {
		var exists;
		var currentTimeStamp = new Date().getTime(); //get time of day and then display how many minutes its been since last post??
		var name = $('#name-input').val();
		var title = $('#title-input').val();
		var text = $('#message-input').val();
		if (!this.userLocation || !this.userLocation.lat || !this.userLocation.lon) {
			$('#alert-modal').modal(); return;
		}
		this.fb.on('value', function (ss) {
			exists = (ss.val() !== null)
		});
		if(!exists){ this.fb.child(name).set({text: name}) };
		this.fb.child(name).child('messages').push({ title: title, text: text, lat: this.userLocation.lat, lon: this.userLocation.lon, timeStamp: currentTimeStamp });
		$('#message-input').val('');
	}
},
getLocation: function () {
	if (navigator.geolocation) {
		navigator.geolocation.getCurrentPosition(this.onLocationSuccess);
	} else { $('#alert-modal').modal(); }	
},
onLocationSuccess: function(position) {
	this.userLocation = {lat: String(position.coords.latitude), lon: String(position.coords.longitude)};
},
//yo jeremy these next like 4 functions i stole from my windshield code, really ghetto
enableEventClickHandler: function() {
	this.target = this.$('#add-event-btn');
    this.target.toggleClass('btn-warning');
    var activate = this.target.hasClass('btn-warning');
    this.target.text('Click Map!');
    var action = (activate) ? 'enableClickHandler' : 'disableClickHandler';
	if (action === 'enableClickHandler') {
	    this.enableMapClick();
	}
	if (action === 'disableClickHandler') {
	    this.disableMapClick();
	}
},
enableMapClick: function () {
    this.mapClickHandler = dojo.connect(this.map, 'onClick', dojo.hitch(this, this.onMapClick));
},
disableMapClick: function () {
    dojo.disconnect(this.mapClickHandler);
    this.target.removeClass('btn-warning');
    this.target.text('Add event to map');
},
onMapClick: function (evt) {
	var x = esri.geometry.xyToLngLat(evt.mapPoint.x, evt.mapPoint.y, true);
	this.userLocation = { lat: x[1], lon: x[0] };
	this.disableMapClick();
},        
activateClickListener: function() {//new place for this
	var $this = this;
	$('.chatItem').on('click', function(evt) {
	var lon = evt.currentTarget.dataset.lon;
	var lat = evt.currentTarget.dataset.lat;
	var pt = new esri.geometry.Point(lon, lat)
	$this.map.centerAndZoom(pt, 25);
	});
},
displayChatMessages: function() {
	var $this = this;
	_.each(this.messages, function (message) {
		var currentTimeStamp = new Date().getTime();
		timeElapsed =  Math.floor((currentTimeStamp - message.timeStamp) / 1000 / 60); //get time elapsed since the previous messages in firebase
		$('<div/>').addClass('chatItem').attr('data-lat', message.lat).attr('data-lon', message.lon).text(message.name + ' says: ' + message.text).append($('<em/>').text('--' + timeElapsed + ' minutes ago.')).appendTo($('#msg-container'));
		if (message.lat && message.lon) {
			var pt = new esri.geometry.Point(message.lon, message.lat);
			var graphic = new esri.Graphic(pt, $this.pointSymbol);
			$this.map.graphics.add(graphic);
		};
	});
},
initTypeahead: function (src) {
	var localSrc = (src === 'users') ? this.users : this.messages;
	if (!localSrc) { return; }
	$('#search-input').typeahead('destroy');
	var bloodhound = new Bloodhound({
		datumTokenizer: function(d) { 
			return Bloodhound.tokenizers.whitespace(d.text); },
		queryTokenizer: Bloodhound.tokenizers.whitespace,
        local: localSrc
	});
	bloodhound.initialize();
    var options = {
		displayKey: 'text',
		source: bloodhound.ttAdapter(),
        templates: { suggestion: _.template('<strong><%=text%></strong>')},
        minLength: 0
    };
    $('#search-input').typeahead(null, options);
}
});
new AppView();//spin it up!
});