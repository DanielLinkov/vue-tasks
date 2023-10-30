import CheckboxComponent from "./CheckboxComponent.js";

export default {
	components: {
		'labeled-checkbox': CheckboxComponent,
	},
	inject: [ 'editedTaskId' ],
	props: [ 'task' ],
	data(){
		return {
			editing: false,
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
	template: /* html */`
		<li class="list-group-item d-flex align-items-center" :class="{'list-group-item-success': task.done}">
			<labeled-checkbox
				class="me-auto"
				:editing="editing"
				:edited-value="task.title"
				:class="{'task-done': task.done}"
				v-model="task.done"
				@update:editing="onUpdateEditing"
				><span class="label">{{ task.title }}</span> <sup v-if="task.done">(completed)</sup>
			</labeled-checkbox>
			<div class="btn-group">
				<button class="btn btn-secondary" title="Edit task" v-if="!editing" @click="this.editing = true"><i class="bi bi-pencil"></i></button>
				<button class="btn btn-link" v-if="editing" @click="this.editing = false">cancel</button>
				<button
					@click="$emit('delete:task',task.id)"
					type="button" class="btn btn-danger btn-sm"
				>Delete</button>
			</div>
		</li>
	`,
}