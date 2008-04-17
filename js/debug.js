// Debugger

var debug = function(obj, n){
	if (!n) n = 0;	
	
	var indent = '';
	for (var i = 0; i < n; i++) indent += '  ';
	
	var str = [];

	switch ($type(obj)){
		case 'array':
			str.push('[');
			obj.each(function(value, key){	
				str.push(indent + '[' + key + '] => ' + debug(value, n + 1));
			});
			str.push(indent + ']'); break;
		case 'function':
			str.push('function()'); break;
		case 'object':
			str.push('{');
			$H(obj).each(function(value, key){	
				str.push(indent + '[' + key + '] => ' + debug(value, n + 1));
			});
			str.push(indent + '}'); break;
		case 'string':
			str.push('"' + obj + '"'); break;
		default:
			str.push(obj + '');
	}

	str = str.join('\n');

	if (n > 0) return str;

	var el = $('debug');

	if (!el) return alert(str);

	var html = el.get('html');

	el.set('html', html + '<br />' + str);
}