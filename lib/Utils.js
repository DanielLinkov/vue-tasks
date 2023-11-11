function uuidv4(){
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'
		.replace(/[xy]/g, function (c) { 
			const r = Math.random() * 16 | 0,  
				v = c == 'x' ? r : (r & 0x3 | 0x8); 
			return v.toString(16); 
		}); 
}

function isPlainObject(obj){
	return typeof obj == 'object' && obj !== null && Object.getPrototypeOf(obj) === Object.prototype;
}

function getValType(val){
	switch(typeof val){
		case 'object':
			if(val === null)
				return 'null';
			if(Array.isArray(val))
				return 'array';
			return 'object';
		case 'function':
			return 'function';
		case 'undefined':
			return 'undefined';
		default:
			return 'primitive';

	}
}

export { uuidv4,isPlainObject,getValType }