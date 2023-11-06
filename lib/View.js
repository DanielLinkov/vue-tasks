
class ViewAdapterBase{
	#nativeView = null;
	#stateVersionProperty = null;
	constructor(){
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
	}
}

class ViewAdapterVue extends ViewAdapterBase{
	constructor(){
		super();
	}
	update(){
		this.$nativeView.$forceUpdate();
	}
}

export { ViewAdapterVue };