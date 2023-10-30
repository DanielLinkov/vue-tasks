
export default {
	props: [ 'modelValue','editing','editedValue' ],
	emits: [ 'update:model-value','update:editing' ],
	data(){
		return {
			elId: null,
			textEdited: null,
		}
	},
	created(){
		this.elId = _.uniqueId('_vue_checkbox_');
	},
	mounted(){
	},
	watch: {
		editing(val){
			if(val){
				this.textEdited = this.editedValue;
				setTimeout(() => {
					this.$refs.editor.focus();
				}, 0);
			}
		}
	},
	methods: {
	},
	template: /* html */`
		<div>
		<div class="form-check" v-if="!editing">
			<input type="checkbox" :checked="modelValue" @change="$emit('update:model-value',$event.target.checked)" class="form-check-input" :id="elId">
			<label class="form-check-label" :for="elId" ref="label"><slot></slot></label>
		</div>
		<input
			v-show="editing"
			v-model="textEdited"
			@keyup.escape="$emit('update:editing',false)"
			@keyup.enter="textEdited.trim().length ? $emit('update:editing',textEdited.trim()) : $emit('update:editing',editedValue)"
			type="text"
			class="form-control"
			ref="editor"
		/>
		</div>
	`,
}