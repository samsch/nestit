# PostgreSQL Join data relation hydrator

Turns the denormalized output of a normal join into the nested data structure you actually want!

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
- [Performance implications](#Performance-notes) for large datasets

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

For small amounts of rows, maybe into hundreds, maybe not, this will probably
perform better than using json_agg or similar in PostgreSQL to have the
database do the nesting for you. However, for larger row counts, at some point
doing it in the database will become faster, and would be slow enough here to
start blocking for significant amounts of time.

As an example, with 171 rows, 3 users, 21 posts, 147 comments, the nesting time
measures at ~.5ms on my desktop. Query time around 33ms including retrieval.

With 215576 rows, 5001 users, 30057 posts, 180518 comments, the nesting time is
over 300ms. Query times are 750ms+.

Here's an example of a json_agg implementation for the same query as above,
which will take around 750ms for the 200k+ rows, but not require the 300ms
nesting time. The flipside is that for the smaller dataset, it still takes over
500ms, so the other option is much faster in that case.

```js
knex
  .select([
    'users.*',
    knex.raw('json_agg("posts" order by "posts"."id") as posts')
  ])
  .from('users')
  .leftJoin(function () {
    this.select(['posts.*', knex.raw('json_agg("comments" order by "comments"."id") as comments')])
      .from('posts')
      .leftJoin('comments', { 'posts.id': 'comments.post' })
      .groupBy('posts.id')
      .as('posts')
  }, { 'users.id': 'posts.user' })
  .where('users.login', 'like', 'fixedvalue---%')
  .groupBy('users.id')
  .orderBy('users.id');
```

`pg` and thus `knex` will automatically parse the json column output, and this
will give you relatively faster results when looking at hundreds of thousands
of rows.

If you are concerned about performance, you should test these options with
your real data, rather than trying to guess.
