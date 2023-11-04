import AddTaskComponent from "./AddTaskComponent.js";
import TaskListComponent from "./TaskListComponent.js";
import CheckboxComponent from "./CheckboxComponent.js";
import { ModelFactory } from "../lib/ModelFactory.js";
import { RestApiJsonClient,LocalStorage } from "../lib/Persistence.js";

const storage = new RestApiJsonClient({
	baseUrl : 'http://localhost:3000',
});
const storage2 = new LocalStorage({
	prefix: 'todo_',
});

const ConfigModel = ModelFactory.createPersistent({
	className : 'ConfigModel',
	props: {
		theme: 'light',
		showCompleted: true,
	},
	storage: storage,
	storageEntityName: 'config',
});

const configModel = new ConfigModel();
console.log(configModel);

export default {
	components: {
		'add-task-box': AddTaskComponent,
		'task-list': TaskListComponent,
		'labeled-checkbox': CheckboxComponent,
	},
	data(){
		return {
			config: configModel.$propState,
			tasks_:[
				{
					id: 1,
					title: 'Task 1',
					done: false,
				},{
					id: 2,
					title: 'Task 2',
					done: true,
				},{
					id: 2,
					title: 'Marvel Task',
					done: false
				},
			]
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
				return this.tasks_;
			}
			return this.tasks_.filter(task => !task.done);
		},
		count_tasks_left(){
			return this.tasks_.filter(task => !task.done).length;
		},
		count_tasks_completed(){
			return this.tasks_.filter(task => task.done).length;
		}
	},
	methods: {
		addTask(title) {
			this.tasks_.push({
				id: +_.uniqueId(),
				title,
				done: false,
			})
		},
		deleteTask(id) {
			this.tasks_ = this.tasks_.filter(task=>task.id != id);
		},
		clearCompleted() {
			this.tasks_ = this.tasks_.filter(task => !task.done);
		},
	},
	created(){
		configModel.$watch('theme',(val,unwatch)=>{
			console.log('Theme changed to',val);
		});
		configModel.$fetch().then(result => {
			if(result === true)	//Config exists and was updated
				this.config = configModel.$propState;
			const fnChange = async ()=>{
				console.log('Config changed',this.config);
				configModel.$update(this.config,{ callWatchers: true });
				configModel.$save();
			}
			this.$watch('config.theme',fnChange);
			this.$watch('config.showCompleted',fnChange);
		},result=>{
			console.error(result);
		});

	}
}