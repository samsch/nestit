'use strict';

module.exports = async function simpleJoin(knex, dataset, singleId = null) {
	if (!['full', 'quarter', 'small', 'single'].includes(dataset)) {
		throw new Error('dataset option must be "full", "partial", or "single"');
	}
	return knex
		.select(['users.*', 'posts.*', 'comments.*'])
		.from('users')
		.leftJoin('posts', { 'users.id': 'posts.user_id' })
		.leftJoin('comments', { 'posts.id': 'comments.post_id' })
		.modify(builder => {
			if (dataset === 'single') {
				builder.where({ 'users.id': singleId });
			} else if (dataset === 'small') {
				builder.where('users.login', 'like', 'fixedvalue---%');
			} else if (dataset === 'quarter') {
				builder.where('users.login', 'like', 'quarter---%');
			}
		})
		.orderBy(['users.id', 'posts.id', 'comments.id'])
		.options({ rowMode: 'array' })
		.on('query-response', (response, obj) => {
			response.fields = obj.response.fields;
		});
};
