import AddTaskComponent from "./AddTaskComponent.js";
import TaskListComponent from "./TaskListComponent.js";
import CheckboxComponent from "./CheckboxComponent.js";
import { ConfigModel, TaskCollection, TaskModel } from "./Classes.js";
import { ViewAdapterVue } from "../lib/View.js";

const configModel = new ConfigModel();
const taskCollection = new TaskCollection();

const task1 = new TaskModel({title: 'Task 1', done: false});
taskCollection.$add(task1);
taskCollection.$add(new TaskModel({title: 'Task 2', done: true}));
taskCollection.$add({title: 'Task 3'});
taskCollection.$save();

console.log(taskCollection);

const viewAdapter = new ViewAdapterVue();

export default {
	components: {
		'add-task-box': AddTaskComponent,
		'task-list': TaskListComponent,
		'labeled-checkbox': CheckboxComponent,
	},
	data(){
		return {
			config: configModel.$propState,
			stateVersion: 0,
		}
	},
	watch: {
		'config.theme': (val)=>{
			document.body.setAttribute('data-bs-theme',val);
		}
	},
	computed:{
		tasks(){
			this.stateVersion;
			if(this.config.showCompleted){
				return taskCollection.$items;
			}
			return taskCollection.$all(task => !task.done);
		},
		count_tasks_left(){
			return taskCollection.$all(task => !task.done).length;
		},
		count_tasks_completed(){
			return taskCollection.$all(task => task.done).length;
		}
	},
	methods: {
		addTask(data) {
			taskCollection.$add(data);
			viewAdapter.touch();
		},
		deleteTask(ckey) {
			taskCollection.$removeOne(ckey);
			viewAdapter.touch();
			this.$refs.taskList.$forceUpdate();
		},
		clearCompleted() {
			taskCollection.$removeWhere(task => task.done);
			this.$refs.taskList.$forceUpdate();
		},
	},
	created(){
		viewAdapter.setNativeView(this,'stateVersion');
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