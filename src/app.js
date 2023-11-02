import { nextTick, reactive, ref } from "vue";
import AddTaskComponent from "./AddTaskComponent.js";
import TaskListComponent from "./TaskListComponent.js";
import CheckboxComponent from "./CheckboxComponent.js";
import { PersistentModel } from "../lib/Model.js";
import { RestApiJsonClient } from "../lib/Persistence.js";

const storage = new RestApiJsonClient({
	baseUrl : 'http://localhost:3000',
});

const ConfigModel = PersistentModel.extend({
	props: {
		theme: 'light',
		showCompleted: false,
	},
	storage,
	storageEntryKey: '/config',
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
			config: {
				theme: null,
				showCompleted: false,
			},
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
		onThemeSelected(event){
			document.body.setAttribute('data-bs-theme',event.target.value);
		}
	},
	created(){
		configModel.fetch().then(res => {
			this.config.theme = configModel.props.theme.get();
			this.config.showCompleted = configModel.props.showCompleted.get();
			document.body.setAttribute('data-bs-theme',this.config.theme);

			this.$watch('config', val => {
				console.log(val);
				configModel.props.theme.set(val.theme);
				configModel.props.showCompleted.set(val.showCompleted);
				configModel.save();
			},{deep : true});
			if(res == false)	//Config not found
				return configModel.save();
		});
	}
}