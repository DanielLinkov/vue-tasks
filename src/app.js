import AddTaskComponent from "./AddTaskComponent.js";
import TaskListComponent from "./TaskListComponent.js";
import CheckboxComponent from "./CheckboxComponent.js";

export default {
	components: {
		'add-task-box': AddTaskComponent,
		'task-list': TaskListComponent,
		'labeled-checkbox': CheckboxComponent,
	},
	data(){
		return {
			showCompleted: true,
			tasks_:[{
				id: 1,
				title: 'Task 1',
				done: false,
			},{
				id: 2,
				title: 'Task 2',
				done: true,
			}]
		}
	},
	computed:{
		tasks(){
			if(this.showCompleted){
				return this.tasks_;
			}
			return this.tasks_.filter(task => !task.done);
		}	
	},
	methods: {
		addTask(title) {
			this.tasks.push({
				id: +_.uniqueId(),
				title,
				done: false,
			})
		},
		deleteTask(id) {
		}
	}
}