'use strict';

const { migrator, types } = require('@samsch/smart-migrations');

module.exports = migrator([
	{
		tables: [],
		up: async knex => {
			await knex.raw(`
CREATE FUNCTION raise_exception() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'May not update created_at timestamps - on table %', TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;`);
		},
		down: async knex => {
			await knex.raw('DROP FUNCTION raise_exception;');
		},
	},
	{
		tables: 'users',
		easyTable: {
			id: 'uuid|primary',
			name: 'text',
			login: 'text',
			...types.timestamps(),
		},
	},
	{
		tables: 'posts',
		easyTable: {
			id: 'uuid|primary',
			user_id: 'uuid|references:users.id|index',
			title: 'text',
			text: 'text',
			...types.timestamps(),
		},
	},
	{
		tables: 'comments',
		easyTable: {
			id: 'uuid|primary',
			post_id: 'uuid|references:posts.id|index',
			text: 'text',
			...types.timestamps(),
		},
	},
]);
