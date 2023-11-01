import AddTaskComponent from "./AddTaskComponent.js";
import TaskListComponent from "./TaskListComponent.js";
import CheckboxComponent from "./CheckboxComponent.js";
import { PersitentModel } from "../lib/Model.js";
import { LocalStorage } from "../lib/Persistence.js";

const storage = new LocalStorage({
	prefix: 'vue-todo_',
});

const ConfigModel = PersitentModel.extend({
	props: {
		theme: {
			type: String,
			default: 'light',
		},
		showCompleted: false,
	},
	storage,
	storageEntryId: '/config',
});

const configModel = new ConfigModel();

export default {
	components: {
		'add-task-box': AddTaskComponent,
		'task-list': TaskListComponent,
		'labeled-checkbox': CheckboxComponent,
	},
	data(){
		return {
			config: configModel,
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
		onThemeChanged(val){
			document.body.setAttribute('data-bs-theme',val);
			this.config.theme = val;
			this.config.save();
		}
	},
	created(){
		this.$watch('config.theme',this.onThemeChanged);
		this.$watch('config.showCompleted',val=>{
			this.config.showCompleted = val;
			this.config.save();
		});
		this.config.fetch().then(res => {
			if(res == false)	//Config not found
				return this.config.save();
		});
	}
}