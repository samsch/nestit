'use strict';

module.exports = async function selectSubquery(knex, dataset, singleId = null) {
	function withArray(name, subquery, orderByField, orderByDesc) {
		const direction = orderByDesc ? 'desc' : 'asc';
		const orderBy = orderByField ? ` order by ?? ${direction}` : '';
		const parameters = orderByField
			? [`a.${orderByField}`, subquery, name]
			: [subquery, name];
		return knex.raw(
			`(select json_agg(a${orderBy}) from ? a) as ??`,
			parameters,
		);
	}
	function withRelation({
		table, // required
		combiner, // required OR modifer required
		modifier, // required if no combiner
		name, // optional, will use tablename for column name if not provided
		orderByField, // optional, field of table to order by.
		orderByDesc, // optional, reverses order
	}) {
		if (!table) {
			throw new Error('Must pass table name argument');
		}
		const subquery = knex.select('*').from(table);
		if (Array.isArray(combiner)) {
			subquery.where({
				[combiner[0]]: knex.raw('??', [combiner[1]]),
			});
		} else if (!modifier) {
			throw new Error('Must pass either combiner or modifier argument');
		}
		if (modifier) {
			subquery.modify(modifier);
		}
		return withArray(name ?? table, subquery, orderByField, orderByDesc);
	}
	return knex
		.select([
			'users.*',
			withRelation({
				table: 'posts',
				orderByField: 'id',
				combiner: ['posts.user_id', 'users.id'],
				modifier: query => {
					query.select(
						withRelation({
							table: 'comments',
							orderByField: 'id',
							combiner: ['comments.post_id', 'posts.id'],
						}),
					);
				},
			}),
		])
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
		.orderBy('users.id');
};
