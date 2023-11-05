import AddTaskComponent from "./AddTaskComponent.js";
import TaskListComponent from "./TaskListComponent.js";
import CheckboxComponent from "./CheckboxComponent.js";
import { ConfigModel, TaskCollection } from "./Classes.js";

const configModel = new ConfigModel();
const taskCollection = new TaskCollection();

// taskCollection.$append(new TaskModel({)

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
						console.log('save result:',result);
						if(!result)
							console.warn(configModel.$errors);
					})
					.catch(result=>{
						console.error('save error:',result);
						configModel.$revert();
						this.config = configModel.$propState;
					});
			}
			this.$watch('config.theme',fnChange);
			this.$watch('config.showCompleted',fnChange);
		});

	}
}