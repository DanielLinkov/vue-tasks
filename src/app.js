import AddTaskComponent from "./AddTaskComponent.js";
import TaskListComponent from "./TaskListComponent.js";

export default {
	data(){
		return {
			tasks:[{
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
	components: {
		'add-task-box': AddTaskComponent,
		'task-list': TaskListComponent,
	},
	methods: {
		addTask(title) {
			console.log(title);
		},
		deleteTask(id) {
		}
	}
}