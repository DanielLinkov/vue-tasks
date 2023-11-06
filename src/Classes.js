import { ModelFactory } from '../lib/ModelFactory.js';
import { CollectionFactory } from "../lib/CollectionFactory.js";
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
	validators: {
		theme: (val,model,addError)=>{
			if(val != 'light' && val != 'dark')
				addError("Invalid theme");
		},
	},
});


const TaskModel = ModelFactory.createPersistent({
	className : 'TaskModel',
	props: {
		title: '',
		done: false,
	},
	storage: storage,
	storageEntityName: 'tasks',
	validators: {
		title: [(val,model,addError)=>{
			if(typeof val != 'string')
				addError("Invalid title property type");
			val = val.trim();
			if(val.length == 0)
				addError("Title is empty");
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

const TaskCollection = CollectionFactory.create({
	className : 'TaskCollection',
	modelClass: TaskModel,
	storage: storage,
	storageEntityName: 'tasks',
});

export { ConfigModel, TaskModel, TaskCollection }