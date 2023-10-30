import { computed } from 'vue';
import TaskItemRowComponent from './TaskItemRowComponent.js';

export default {
	components: {
		'task-item': TaskItemRowComponent,
	},
	data(){
		return {
			editedTaskId: null,
		}
	},
	provide(){
		return {
			editedTaskId: computed(() => this.editedTaskId),
		}
	},
	props:[ 'tasks' ],
	methods: {
		onUpdateEditing(val){
			if(val){
				this.editedTaskId = val;
			}	
		}
	},
	template: /* html */`
		<ul class="list-group">
			<task-item v-for="task in tasks" @update:editing="onUpdateEditing" :key="task.id" :task="task"></task-item>
		</ul>
	`,
}