'use strict';

const fs = require('fs');
const path = require('path');

const nestit = require('./index');

function p(...args) {
	// eslint-disable-next-line no-console
	console.log(...args);
}

function e(...args) {
	// eslint-disable-next-line no-console
	console.error(...args);
}

function countAndLogObjects(result) {
	const userCount = result.length;
	const { postCount, commentCount } = result.reduce(
		(counts, user) => {
			// eslint-disable-next-line no-param-reassign
			counts.postCount += user.posts.length;
			// eslint-disable-next-line no-param-reassign
			counts.commentCount += user.posts.reduce((comments, post) => {
				return comments + (post?.comments.length ?? 0);
			}, 0);
			return counts;
		},
		{ postCount: 0, commentCount: 0 },
	);
	p(
		`total objects: ${
			userCount + postCount + commentCount
		}, users: ${userCount}, posts: ${postCount}, comments: ${commentCount}`,
	);
}

const massiveJoin = JSON.parse(
	fs.readFileSync(path.resolve(__dirname, 'massivejoin.json')),
);
const massiveRows = massiveJoin.rows;
massiveRows.fields = massiveJoin.fields;

const oldJoinResultJSON = String(
	fs.readFileSync(path.resolve(__dirname, 'oldernest.json')),
);
// const prevJoinResultJSON = String(
// 	fs.readFileSync(path.resolve(__dirname, 'prevnest.json')),
// );

const output = nestit(massiveRows, [
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

const outputJSON = JSON.stringify(output, null, 2);

// fs.writeFileSync(path.resolve(__dirname, 'newnest.json'), outputJSON);

if (outputJSON === oldJoinResultJSON) {
	p('Matches output!');
} else {
	e('Does not match output!');
}

countAndLogObjects(output);
