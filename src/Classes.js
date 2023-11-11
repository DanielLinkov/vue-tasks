import { ModelFactory } from '../lib/ModelFactory.js';
import { CollectionFactory } from "../lib/CollectionFactory.js";
import { RestApiJsonClient,LocalStorage } from "../lib/Storages.js";

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


const TaskModel = ModelFactory.createPersistent({
	className : 'TaskModel',
	props: {
		title: '',
		done: false,
	},
	persistent: {
	},
	methods: {
		color(){
			return this.done ? 'green' : 'red';
		}
	},
	events: [
		// ['sync',function(event){
		// 	console.log("TaskModel.sync",event);
		// }],
		// ['attach',function(event){
		// 	console.log("TaskModel.attach",event);
		// }],
		// ['detach',function(event){
		// 	console.log("TaskModel.detach",event);
		// }]
	],
	validators: {
		title: [(val,model,addError)=>{
			if(typeof val != 'string')
				addError("Invalid title property type");
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
		// 'add.sync': function(event){
		// 	console.log("TaskCollection.add",event);
		// },
		// 'remove.sync': function(event){
		// 	console.log("TaskCollection.remove",event);
		// },
		// 'delete.sync': function(event){
		// 	console.log("TaskCollection.delete",event);
		// }
	}
});

export { ConfigModel, TaskModel, TaskCollection }