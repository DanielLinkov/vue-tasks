import CheckboxComponent from "./CheckboxComponent.js";
import { ViewAdapterVue } from "../lib/View.js";

export default {
	components: {
		'labeled-checkbox': CheckboxComponent,
	},
	inject: [ 'editedTaskId' ],
	props: [ 'task' ],
	data(){
		return {
			editing: false,
			draggingItem: null,
		}
	},
	watch: {
		editing(val){
			if(val){
				this.$emit('update:editing',this.task.$ckey);
				setTimeout(()=>{
					this.$refs.input.focus();
				},0);
			}
		},
		editedTaskId(val){
			if(val != this.task.$ckey){
				this.editing = false;
			}
		}
	},
	methods: {
		onUpdateEditing(){
			this.task.$validate('title');
			if(!this.task.$hasErrors('title')){
				this.task.$collection.$save();
			}else{
				this.task.$revert();
			}
			this.editing = false;
		},
	},
	mounted(){
		this.task.$attachToView(new ViewAdapterVue(this)).$watch('done',(val,propName,model)=>{
			model.$updateView();
		});
	},
	created(){
		this.elId = _.uniqueId('_vue_checkbox_');
	},
	template: /* html */`
		<div class="list-group-item d-flex align-items-center hover-visible-container" :class="{'list-group-item-success': task.done,'task-done': task.done}">
			<span
				class="hover-visible-item drag-handle me-2"
			><i class="bi bi-grip-horizontal"></i></span>
			<div class="form-check me-auto" v-show="!editing">
				<input type="checkbox" v-model="task.done" class="form-check-input" :id="elId">
				<label class="form-check-label" :for="elId" ref="label"><slot>
					<span class="label">{{ task.title }}</span> <sup v-if="task.done">(completed)</sup>
				</slot></label>
			</div>
			<input
				v-show="editing"
				v-model="task.title"
				@keypress.enter="onUpdateEditing"
				ref="input"
				type="text"
				class="form-control"
			/>
			<div class="btn-group hover-visible-item">
				<button class="btn btn-secondary" title="Edit task" v-if="!editing" @click="this.editing = true"><i class="bi bi-pencil"></i></button>
				<button class="btn btn-link" v-if="editing" @click="this.editing = false">cancel</button>
				<button
					@click="$emit('delete:task')"
					type="button" class="btn btn-danger btn-sm"
				>Delete</button>
			</div>
		</div>
	`,
}