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
				this.$emit('update:editing',this.task.id);
			}
		},
		editedTaskId(val){
			if(val != this.task.id){
				this.editing = false;
			}
		}
	},
	methods: {
		onUpdateEditing(val){
			if(typeof val == 'string'){
				this.task.title = val;
			}
			this.editing = false;
		},
	},
	mounted(){
		this.task.$watch('done',()=>{
			// this.$forceUpdate();
		});
	},
	template: /* html */`
		<div class="list-group-item d-flex align-items-center hover-visible-container" :class="{'list-group-item-success': task.done}">
			<span
				class="hover-visible-item drag-handle me-2"
				@mousedown="$emit('mousedown')"
				@mousemove="$emit('mousemove')"
				@mouseup="$emit('mouseup')"
			><i class="bi bi-grip-horizontal"></i></span>
			<labeled-checkbox
				class="me-auto"
				:editing="editing"
				:edited-value="task.title"
				:class="{'task-done': task.done}"
				v-model="task.done"
				@update:editing="onUpdateEditing"
				><span class="label">{{ task.title }}</span> <sup v-if="task.done">(completed)</sup>
			</labeled-checkbox>
			<div class="btn-group hover-visible-item">
				<button class="btn btn-secondary" title="Edit task" v-if="!editing" @click="this.editing = true"><i class="bi bi-pencil"></i></button>
				<button class="btn btn-link" v-if="editing" @click="this.editing = false">cancel</button>
				<button
					@click="$emit('delete:task',task.id)"
					type="button" class="btn btn-danger btn-sm"
				>Delete</button>
			</div>
		</div>
	`,
}