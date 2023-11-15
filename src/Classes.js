import { ModelFactory } from '../lib/ModelFactory.js';
import { CollectionFactory } from "../lib/CollectionFactory.js";
import { RestApiJsonClient,LocalStorage } from "../lib/Storage.js";

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
	validators: {
		theme: (val,model,addError)=>{
			if(val != 'light' && val != 'dark')
				addError("Invalid theme");
		},
	},
	events: {
	},
});

const NewTaskModel = ModelFactory.create({
	className : 'NewTaskModel',
	props: {
		title: ''
	},
	validators: {
		title: (val,model,addError)=>{
			if(typeof val != 'string')
				addError("Invalid title property type");
			val = val.replace(/\s+/g,' ');
			val = val.trim();
			if(val.length == 0)
				addError("Title is empty");
		},
	},
	methods: {
		transform: function(){
			this.title = this.title.trim();
		}
	}
});

const TaskModel = ModelFactory.createPersistent({
	className : 'TaskModel',
	props: {
		title: '',
		done: false,
	},
	persistent: {
	},
	methods: {
		transform: function(){
			this.title = this.title.replace(/\s+/g,' ');
			this.title = this.title.toUpperCase();
			this.title = this.title.trim();
		},
		color(){
			return this.done ? 'green' : 'red';
		}
	},
	events: [
	],
	validators: {
		title: [(val,model,addError)=>{
			if(typeof val != 'string')
				addError("Invalid title property type");
			val = val.replace(/\s+/g,' ');
			val = val.trim();
			if(val.length == 0)
				addError("Title is empty");
			return val;
		},(val)=>{
			return val.toUpperCase();
		},(val)=>{
			return val
				.replace(/[oO]/g,'🐵')
				.replace(/[yY]/g,'🦒')
				.replace(/[tT]/g,'✝')
				.replace(/[mM]/g,'🐻')
				;
		}],
	}
});


const TaskCollection = CollectionFactory.createPersistent({
	className : 'TaskCollection',
	modelClass: TaskModel,
	storage: storage,
	storageEntityName: 'tasks',
	saveOptions: {
		timeout: 1000,
	},	
	events:	{
	}
});

const TaskCollectionModel = ModelFactory.createPersistent({
	className : 'TaskCollectionModel',
	props: {
		name: '',
		list: null,
	},
	persistent: { list: false }
});

const TaskListCollection = CollectionFactory.createPersistent({
	className : 'TaskListCollection',
	modelClass: TaskCollectionModel,
	storage: storage,
	storageEntityName: 'task_lists',
});

export { ConfigModel, TaskModel, NewTaskModel, TaskCollection, TaskCollectionModel, TaskListCollection }