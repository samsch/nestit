'use strict';

/**
 * This query "cheats" by knowing all the columns and specifically selecting them
 */

module.exports = async function doubleGroupByJson(
	knex,
	dataset,
	singleId = null,
) {
	return knex
		.select([
			'users.id',
			'users.name',
			'users.login',
			knex.raw(`
		      json_agg(jsonb_build_object(
		        'id', "users"."p_id", 'title', "users"."p_title", 'comments', "users"."comments"
		      ) order by "users"."p_id") as posts`),
		])
		.from(
			knex
				.select([
					'users.*',
					'posts.id as p_id',
					'posts.title as p_title',
					knex.raw('json_agg("comments" order by "comments"."id") as comments'),
				])
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
				.groupBy(['posts.id', 'users.id'])
				.orderBy(['users.id'])
				.as('users'),
		)
		.groupBy(['users.id', 'users.name', 'users.login']);
};
