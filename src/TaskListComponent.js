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
		},
		onHandleMouseDown(e){
		},
		onHandleMouseMove(e){
		},
		onHandleMouseUp(e){
		},
	},
	template: /* html */`
		<div class="list-group">
			<div class="task-item-placeholder bg-body-secondary">
				<task-item
					v-for="task in tasks"
					@delete:task="this.$emit('delete:task',task.$ckey)"
					@update:editing="onUpdateEditing"
					@mousedown="onHandleMouseDown"
					@mousemove="onHandleMouseMove"
					@mouseup="onHandleMouseUp"
					:key="task.$ckey"
					:task="task"
				></task-item>
			</div>
		</div>
	`,
}