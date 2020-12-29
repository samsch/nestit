'use strict';

const Promise = require('bluebird');
const generateData = require('./generate-data');
const knex = require('./knexcli');
const nestit = require('../index');
const { tstart, tend } = require('./timer');

const simpleJoin = require('./queries/simple-join');
const jsonJoin = require('./queries/json-join');
const selectSubquery = require('./queries/select-subquery');
const lateralJson = require('./queries/lateral-json');

function mapObj(obj, func) {
	return Object.fromEntries(Object.entries(obj).map(func));
}

async function runQueries(queryFunc) {
	const times = {};
	const data = {};
	tstart();
	data.full = await queryFunc(knex, 'full');
	times.full = `${tend()}ms`;
	tstart();
	data.quarter = await queryFunc(knex, 'quarter');
	times.quarter = `${tend()}ms`;
	tstart();
	data.small = await queryFunc(knex, 'small');
	times.small = `${tend()}ms`;
	tstart();
	data.single = await queryFunc(knex, 'single', generateData.singleUserId);
	times.single = `${tend()}ms`;
	return [data, times];
}

function runNestIt(rawJoinData) {
	tstart();
	const data = nestit(rawJoinData, [
		{
			name: 'users',
			id: 'id',
			children: ['posts'],
			foreign: undefined,
		},
		{
			name: 'posts',
			id: 'id',
			children: ['comments'],
			foreign: 'user_id',
		},
		{
			name: 'comments',
			id: 'id',
			children: [],
			foreign: 'post_id',
		},
	]);
	const time = tend();
	return [data, time];
}

async function test() {
	const queries = Object.entries({
		jsonJoin,
		selectSubquery,
		lateralJson,
		simpleJoin,
	});
	const dataResults = Object.fromEntries(
		await Promise.mapSeries(queries, async ([queryName, query]) => {
			const [data, times] = await runQueries(query);
			console.log(queryName, times);
			return [queryName, { times, data }];
		}),
	);
	const nestData = {};
	const nestResult = mapObj(
		dataResults.simpleJoin.data,
		([dataset, joinData]) => {
			const [data, time] = runNestIt(joinData);
			nestData[dataset] = data;
			return [dataset, { time, data }];
		},
	);
	console.log(
		'nestIt time',
		mapObj(nestResult, ([key, { time }]) => [key, `${time}ms`]),
	);
	const joinPlusNestIt = mapObj(nestResult, ([dataset, { time: nestTime }]) => {
		return [
			dataset,
			`${(
				nestTime + Number(dataResults.simpleJoin.times[dataset].slice(0, -2))
			).toFixed(3)}ms`,
		];
	});
	console.log('simpleJoin + nestIt', joinPlusNestIt);
}

Promise.try(async () => {
	const hasUsers = await knex.schema.hasTable('users');
	if (!hasUsers) {
		await knex.migrate.latest();
		await generateData(knex);
	}
})
	.then(() => {
		return test();
	})
	.catch(error => {
		console.error(error);
	})
	.finally(async () => {
		// Comment this line to run tests quicker by skipping
		// migration + datagen after first run
		await knex.migrate.rollback();
		await knex.destroy();
	});
