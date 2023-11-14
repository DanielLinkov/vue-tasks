import { isPlainObject } from "./Utils.js";

class StorageBase{
	read(){
		throw new Error("Not implemented");
	}
	search(){
		throw new Error("Not implemented");
	}
	create(){
		throw new Error("Not implemented");
	}
	update(){
		throw new Error("Not implemented");
	}
	delete(){
		throw new Error("Not implemented");
	}
	isPartialUpdateSupported(){
		return false;
	}
	getPrimaryKeyName(){
		return null;
	}
}

class LocalStorage extends StorageBase{
	prefix = '';
	constructor(config){
		super();
		this.prefix = config.hasOwnProperty('prefix') ? config.prefix : '';
		if(typeof this.prefix != 'string')
			throw new Error("Invalid prefix type");
	}
	read(request){
		const item = localStorage.getItem(this.prefix + request.entityName);
		if(item === null)
			return Promise.resolve(null);
		try{
			request.onProgress && request.onProgress(item.length,item.length);
			const data = JSON.parse(item);
			return Promise.resolve(data);
		}catch(e){
			return Promise.reject(e);
		}
	}
	create(request){
		try{
			const _data = JSON.stringify(request.data);
			localStorage.setItem(this.prefix + request.entityName,_data);
			return Promise.resolve(request.data);
		}catch(e){
			return Promise.reject(e);
		}
	}
	update(request){
		try{
			const _data = JSON.stringify(request.data);
			localStorage.setItem(this.prefix + request.entityName,_data);
			return Promise.resolve(request.data);
		}catch(e){
			return Promise.reject(e);
		}
	}
	delete(request){
		localStorage.removeItem(this.prefix + request.entityName);
		return Promise.resolve(true);
	}
}

class RestApiJsonClient extends StorageBase{
	_baseUrl = '';
	constructor(config){
		super();
		this._baseUrl = config.baseUrl || 'http://localhost';
	}
	isPartialUpdateSupported(){
		return true;
	}
	getPrimaryKeyName(){
		return 'id';
	}
	async read(request){
		let url = [this._baseUrl,request.entityName].join('/');
		if(request.key !== null && request.key !== undefined)
			url += `/${encodeURIComponent(request.key)}`;

		const response = await fetch(url);
		if(!response.ok)
			throw new Error(response.statusText);
		if(!response.headers.get('Content-Type').startsWith('application/json'))
			throw new Error(`Invalid content type: ${response.headers.get('Content-Type')}`);
		return await response.json();	
	}
	async search(request,setAbortControllerCallback=null){
		let url = [this._baseUrl,request.entityName].join('/');
		if(request.key !== null && request.key !== undefined)
			url += `/${encodeURIComponent(request.key)}`;

		if(isPlainObject(request.filter)){
			const filter = Object.entries(request.filter).map(([key,value])=>{
				return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
			}).join('&');
			if(filter.length > 0)
				url += '?' + filter;
		}
		const abortController = new AbortController();
		setAbortControllerCallback && setAbortControllerCallback(abortController);
		const response = await fetch(url,{
			signal: abortController.signal,
		});
		if(!response.ok)
			throw new Error(response.statusText);
		if(!response.headers.get('Content-Type').startsWith('application/json'))
			throw new Error(`Invalid content type: ${response.headers.get('Content-Type')}`);
		return await response.json();	
	}
	async create(request){
		let url = [this._baseUrl,request.entityName].join('/');
		const response = await fetch(url,{
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(request.data),
		});
		if(!response.ok)
			throw new Error(response.statusText);
		if(!response.headers.get('Content-Type').startsWith('application/json'))
			throw new Error(`Invalid content type: ${response.headers.get('Content-Type')}`);

		return await response.json();
	}
	async update(request){
		let url = [this._baseUrl,request.entityName].join('/');
		if(request.key !== null && request.key !== undefined)
			url += `/${encodeURIComponent(request.key)}`;
		const response = await fetch(url,{
			method: request.patch ? 'PATCH' : 'PUT',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(request.data),
		});
		if(!response.ok)
			throw new Error(response.statusText);
		if(!response.headers.get('Content-Type').startsWith('application/json'))
			throw new Error(`Invalid content type: ${response.headers.get('Content-Type')}`);
		return await response.json();
	}
	async delete(request){
		let url = [this._baseUrl,request.entityName].join('/');
		if(request.key !== null && request.key !== undefined)
			url += `/${encodeURIComponent(request.key)}`;
		const response = await fetch(url,{
			method: 'DELETE',
		});
		if(!response.ok)
			throw new Error(response.statusText);
	}
}


export { StorageBase, LocalStorage, RestApiJsonClient };
