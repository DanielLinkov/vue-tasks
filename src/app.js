import AddTaskComponent from "./AddTaskComponent.js";
import TaskListComponent from "./TaskListComponent.js";
import CheckboxComponent from "./CheckboxComponent.js";
import { ConfigModel, TaskCollection, TaskModel } from "./Classes.js";

const configModel = new ConfigModel();
const taskCollection = new TaskCollection();

let task1 = new TaskModel({title: 'Task 1', done: false});
taskCollection.$add(task1);
taskCollection.$add(new TaskModel({title: 'Task 2', done: true}));
taskCollection.$add({title: 'Task 3'});

console.log(taskCollection);

export default {
	components: {
		'add-task-box': AddTaskComponent,
		'task-list': TaskListComponent,
		'labeled-checkbox': CheckboxComponent,
	},
	data(){
		return {
			config: configModel.$propState,
		}
	},
	watch: {
		'config.theme': (val)=>{
			document.body.setAttribute('data-bs-theme',val);
		}
	},
	computed:{
		tasks(){
			if(this.config.showCompleted){
				return taskCollection.$items;
			}
			return taskCollection.$items.filter(task => !task.done);
		},
		count_tasks_left(){
			return taskCollection.$items.filter(task => !task.done).length;
		},
		count_tasks_completed(){
			return taskCollection.$items.filter(task => task.done).length;
		}
	},
	methods: {
		addTask(model) {
			taskCollection.$add(model);
			this.$refs.taskList.$forceUpdate();
		},
		deleteTask(cid) {
			taskCollection.$removeAt(cid);
			this.$refs.taskList.$forceUpdate();
		},
		clearCompleted() {
			this.tasks_ = this.tasks_.filter(task => !task.done);
		},
	},
	created(){
		configModel.$fetch().then(result => {
			if(result === true)	//Config exists and was updated
				this.config = configModel.$propState;
		},result=>{
			console.error('fetch error:',result);
		})
		.finally(()=>{
			const fnChange = ()=>{
				configModel.$update(this.config);
				configModel.$save()
					.then(result=>{
						if(!result)
							console.warn(configModel.$errors);
					})
					.catch(result=>{
						configModel.$revert();
						this.config = configModel.$propState;
					});
			}
			this.$watch('config.theme',fnChange);
			this.$watch('config.showCompleted',fnChange);
		});

	}
}