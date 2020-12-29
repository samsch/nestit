'use strict';

module.exports = async function jsonJoin(knex, dataset, singleId = null) {
	if (!['full', 'quarter', 'small', 'single'].includes(dataset)) {
		throw new Error('dataset option must be "full", "partial", or "single"');
	}
	return knex
		.select([
			'users.*',
			knex.raw('json_agg("posts" order by "posts"."id") as posts'),
		])
		.from('users')
		.leftJoin(
			function () {
				this.select([
					'posts.*',
					knex.raw('json_agg("comments" order by "comments"."id") as comments'),
				])
					.from('posts')
					.leftJoin('comments', { 'posts.id': 'comments.post_id' })
					.groupBy('posts.id')
					.as('posts');
			},
			{ 'users.id': 'posts.user_id' },
		)
		.modify(builder => {
			if (dataset === 'single') {
				builder.where({ 'users.id': singleId });
			} else if (dataset === 'small') {
				builder.where('users.login', 'like', 'fixedvalue---%');
			} else if (dataset === 'quarter') {
				builder.where('users.login', 'like', 'quarter---%');
			}
		})
		.groupBy('users.id')
		.orderBy('users.id');
};
