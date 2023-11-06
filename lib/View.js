
class ViewAdapterBase{
	constructor(nativeView){
		Object.defineProperty(this,'$nativeView',{
			configurable: false,
			enumerable: false,
			writable: false,
			value: nativeView,
		});

	}
	update(){
		throw new Error("Not implemented");
	}
}

class ViewAdapterVue extends ViewAdapterBase{
	constructor(nativeView){
		super(nativeView);
	}
	update(){
		this.$nativeView.$forceUpdate();
	}
}

export { ViewAdapterVue };