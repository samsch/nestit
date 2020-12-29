'use strict';

module.exports = async function lateralJson(knex, dataset, singleId = null) {
	return knex
		.select([
			'users.*',
			knex.raw('json_agg("posts" order by "posts"."id") as posts'),
		])
		.joinRaw(
			`left join lateral (
				select 
					"posts".*, 
					json_agg("comments" order by "comments"."id") as comments 
				from 
					"posts" 
					left join "comments" on "posts"."id" = "comments"."post_id" 
				where "posts"."user_id" = "users"."id"
				group by 
					"posts"."id"
			) as "posts" on true
		`,
		)
		.from('users')
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
