'use strict';

module.exports = {
	client: 'pg',
	connection: {
		host: 'localhost',
		user: 'test',
		password: 'test',
		database: 'test',
		port: 54320,
	},
	migrations: {
		stub: require('@samsch/smart-migrations').getDefaultStubPath(),
	},
	pool: { min: 1, max: 1 },
	acquireConnectionTimeout: 1000,
};
