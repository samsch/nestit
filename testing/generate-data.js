'use strict';

const faker = require('faker');
const uuid = require('uuid').v4;

const singleUserId = 'ffec23f8-a3c6-4d2a-a229-e76b51573349';

module.exports = async function generateData(knex) {
	function range(length) {
		return Array.from({ length });
	}

	const fixedUserIndexes = [12, 2403, 3370];

	const generatedUsers = range(5000).map((_, index) => {
		const name = faker.name.findName();
		let username = null;
		if (fixedUserIndexes.includes(index)) {
			username = `fixedvalue---${name.split(' ')[0]}`;
			console.log(`Generated User: ${index}`);
		} else if (index % 4 === 0) {
			username = `quarter---${name.split(' ')[0]}`;
		} else {
			username = name.split(' ')[0];
		}
		return {
			id: index === 2670 ? singleUserId : uuid(),
			name,
			login: username,
		};
	});

	let generatedPosts = [];
	let generatedComments = [];

	generatedUsers.forEach(({ id: userId }, index) => {
		let postCount = 0;
		const fixedDataItem = fixedUserIndexes.includes(index);
		if (fixedDataItem) {
			postCount = 7;
			console.log(`Generating Posts for: ${index}`);
		} else {
			postCount = faker.random.number({ min: 0, max: 12 });
		}
		const postIds = [];
		generatedPosts = generatedPosts.concat(
			range(postCount).map(() => {
				const id = uuid();
				postIds.push(id);
				return {
					id,
					user_id: userId,
					title: faker.lorem.words(),
					text: faker.lorem.sentence(),
				};
			}),
		);
		postIds.forEach(postId => {
			let commentCount = 0;
			if (fixedDataItem) {
				commentCount = 7;
			} else {
				commentCount = faker.random.number({ min: 0, max: 12 });
			}
			generatedComments = generatedComments.concat(
				range(commentCount).map(() => {
					return {
						id: uuid(),
						post_id: postId,
						text: faker.lorem.sentence(),
					};
				}),
			);
		});
	});

	console.log('Inserting users');
	await knex.batchInsert('users', generatedUsers);
	console.log('Inserting posts');
	await knex.batchInsert('posts', generatedPosts);
	console.log('Inserting comments');
	await knex.batchInsert('comments', generatedComments);
	console.log('All data inserted');
};

module.exports.singleUserId = singleUserId;
