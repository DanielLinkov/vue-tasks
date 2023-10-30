import CheckboxComponent from "./CheckboxComponent.js";

export default {
	components: {
		'labeled-checkbox': CheckboxComponent,
	},
	props: [ 'task' ],
	data(){
		return {
			editing: false,
		}
	},
	methods: {
		onUpdateEditing(val){
			if(typeof val == 'string'){
				this.editing = false;
				this.task.title = val;
			}else
				this.editing = false;
		}
	},
	template: /* html */`
		<li class="list-group-item d-flex align-items-center">
			<labeled-checkbox
				class="me-auto"
				:editing="editing"
				:class="{'task-done': task.done}"
				v-model="task.done"
				@update:editing="onUpdateEditing"
				>{{ task.title }}</labeled-checkbox>
			<div class="btn-group">
				<button class="btn btn-secondary" v-if="!editing" @click="this.editing = true"><i class="bi bi-pencil"></i></button>
				<button class="btn btn-link" v-if="editing" @click="this.editing = false">cancel</button>
				<button type="button" class="btn btn-danger btn-sm">Delete</button>
			</div>
		</li>
	`,
}