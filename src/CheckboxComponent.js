import { uniqueId } from "../lib/Utils.js";

export default {
	props: [ 'modelValue'],
	data(){
		return {
			elId: null,
			textEdited: null,
		}
	},
	created(){
		this.elId = uniqueId('_vue_checkbox_');
	},
	template: /* html */`
		<div class="form-check">
			<input type="checkbox" :checked="modelValue" @change="$emit('update:model-value',$event.target.checked)" class="form-check-input" :id="elId">
			<label class="form-check-label" :for="elId" ref="label"><slot></slot></label>
		</div>
	`,
}