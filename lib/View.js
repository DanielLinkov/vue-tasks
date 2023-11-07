
class ViewAdapterBase{
	#nativeView = null;
	#stateVersionProperty = null;
	constructor(nativeView = null, stateVersionProperty = null){
		this.#nativeView = nativeView;
		this.#stateVersionProperty = stateVersionProperty;
		Object.defineProperty(this,'$nativeView',{
			configurable: false,
			enumerable: true,
			get: ()=>this.#nativeView,
		});
	}
	setNativeView(nativeView, stateVersionProperty = null){
		this.#nativeView = nativeView;
		this.#stateVersionProperty = stateVersionProperty;
	}
	update(){
		throw new Error("Not implemented");
	}
	touch(){
		typeof this.#stateVersionProperty == 'string' && this.#nativeView[this.#stateVersionProperty]++;
		return this;
	}
}

class ViewAdapterVue extends ViewAdapterBase{
	update(){
		this.$nativeView.$forceUpdate();
		return this;
	}
}

export { ViewAdapterVue };