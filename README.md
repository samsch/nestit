# PostgreSQL Join data relation hydrator

Turns the denormalized output of a normal join into the nested data structure you actually want!

Note that normally you should write your queries to use json_agg and similar PostgreSQL functions rather than doing this aggregation on your client. This tool is for cases where you can't or you find the performance of this to be better.

```js
// Input
// Fields data from `pg`, a little config:
[
	// All fields required
	{
		name: 'users', // Name of table (must be unique)
		id: 'id',  // ID column
		children: ['hobbies'],  // Children relations. Must match `name` of a subsquent table
		foreign: undefined,  // undefined if no parent
	},
	{
		name: 'hobbies',  // Must be in a previous children column
		id: 'id',
		children: [],  // empty array if no children
		foreign: 'user',  // Must be the foreign key field that matches the ID on the parent
	},
]
// and the row data
[
	[
		// users.id
		1,
		// users.name
		'Sam',
		// hobbies.id
		1,
		// hobbies.user
		1,
		// hobbies.name
		'Drawing',
	],
	[
		1,
		'Sam',
		3,
		1,
		'Singing',
	],
	[
		2,
		'Clara',
		2,
		2,
		'Coding',
	],
	[
		2,
		'Clara',
		4,
		2,
		'Skiing',
	],
]

// Output
[
	{
		id: 1,
		name: 'Sam',
		hobbies: [
			{
				id: 1,
				user: 1,
				name: 'Drawing',
			},
			{
				id: 3,
				user: 1,
				name: 'Singing',
			},
		],
	},
	{
		id: 2,
		name: 'Clara',
		hobbies: [
			{
				id: 2,
				user: 2,
				name: 'Coding',
			},
			{
				id: 4,
				user: 2,
				name: 'Skiing',
			},
		],
	}
]
```

Limitations:

- Requires your select has the parent relations ordered first
- Requires some annoying fiddling with knex options and query-response event
- Requires you to give it relation data.
- [Performance implications](#Performance-notes)

So, it's common for ORMs to do this kinda thing, and they solve these above
problems by having the relation data pre-defined in "models", ordering the
select statements automatically, adding naming prefixes (and sometimes
requiring all fields to be defined on the model), and sometimes by simply
making a bunch of separate queries.

Pretty much any of that could be built over this, but since you're getting the
lower level tool, you can abstract it the best way for your app.

## Usage example

```js
const nestit = require('@samsch/nestit');

Promise.try(() => {
	return knex('users')
		// We need the array rowMode to get duplicated named fields
		.options({ rowMode: 'array' })
		// We need the column data, easiest to just attach it to the row data
		// ...and that's what nestit expects
		.on('query-response', (response, obj) => {
			response.fields = obj.response.fields;
		})
		.select(['users.*', 'posts.*', 'comments.*'])
		.leftJoin('posts', { 'users.id': 'posts.user' })
		.leftJoin('comments', { 'posts.id': 'comments.post' })
		.orderBy(['users.id', 'posts.id', 'comments.id']);
}).then(rows => {
	const result = nestit(rows, [
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
			foreign: 'user',
		},
		{
			name: 'comments',
			id: 'id',
			children: [],
			foreign: 'post',
		},
	]);

	console.log(result);
});
```

## Performance notes

UPDATED:

Previously my notes here state that using Nestit was probably a good performance choice for normal amounts of query data. This was based on some flawed tests which didn't have the appropriate data indexes on the foreign key fields. Missing those indexes causes the json_agg queries to take *much* longer.

With indexes on the foreign keys, using json_agg with various types of joins will generally perform the best across a variety of query result sizes and nesting levels.

### Some very un-scientifically sourced numbers.

The dataset is generated 5000 users, 29810 posts, 177741 comments. About 6 posts per user, 6 comments per post on average. The real data has random amounts of posts and comments per parent row. For the numbers below, I made sure the single record had at least several posts and comments. I'm personally biased a bit against using Nestit instead of json_agg solutions. I think having the database do it is better.

||**1 base row**|**3 base rows**|**1250 base rows**|**5000 base rows (full dataset)**
:-----:|:-----:|:-----:|:-----:|:-----:
Simple Join|4.4ms|2.8ms|400ms|1587ms
Nestit|.1ms|8.6ms|66ms|332ms
Sum (Simple Join + Nestit)|4.5ms|11.3ms|466ms|1919ms
Lateral json\_agg|1.1ms|2.1ms|243ms|1026ms
Select Subquery json\_agg|1.1ms|2.2ms|232ms|1002ms
Join Subquery json\_agg|1.4ms|576ms|640ms|860ms

The queries used can be seen in `testing/queries/`.

### My performance takeaways

Lateral joins are a fairly new feature, but for "normal" amounts of data you'd be dealing with for building user interfaces and such, it has really great performance. Unfortunately, Knex doesn't directly support this yet (https://github.com/knex/knex/issues/3732). Select subqueries are the most practical to use with Knex currently, and in my opinion the easiest to write an automatic nesting abstraction for. On the flipside, the SQL output is the hardest of all of them to read. Join subqueries are easy to write, pretty easy to understand, but they have severe performance issues for small amounts of data beyond a single base row. My guess here is the query planner is optimizing for the full size of the dataset when it knows it's getting more than a single record. This would also explain why this query takes the least time for the full dataset.

If your application is performance sensitive, I would recommend doing your own testing with realistic data. Don't forget indexes on the foreign keys!
