'use strict';

const activeTimers = {};
function tstart(name) {
	if (activeTimers[name]) {
		console.error(
			'⚠⚠⚠ Tried to start second timer with already active timer name! ⚠⚠⚠',
		);
		return;
	}
	activeTimers[name] = process.hrtime.bigint();
}

function tend(name) {
	const end = process.hrtime.bigint();
	console.log(
		`timer ${name}: ${Number((end - activeTimers[name]) / 1000n) / 1000} ms`,
	);
	activeTimers[name] = undefined;
}

function tgroup(name) {
	if (activeTimers[name]) {
		console.error(
			'⚠⚠⚠ Tried to start second timer with already active timer name! ⚠⚠⚠',
		);
		return;
	}
	if (!activeTimers[name]) {
		activeTimers[name] = {
			collected: 0n,
			started: undefined,
			completed: 0,
		};
	}
}

function tgroupstart(name) {
	if (activeTimers[name].started) {
		throw new Error(
			'⚠⚠⚠ Tried to start second group timer while already active! ⚠⚠⚠',
		);
	}
	activeTimers[name].started = process.hrtime.bigint();
}

function tgroupend(name) {
	const end = process.hrtime.bigint();
	const time = end - activeTimers[name].started;
	activeTimers[name].started = undefined;
	activeTimers[name].collected += time;
	activeTimers[name].completed += 1;
}

function tgroupresult(name) {
	console.log(
		`timer group ${name}: ${
			Number(activeTimers[name].collected / 1000n) / 1000
		} ms  with ${activeTimers[name].completed} laps`,
	);
	activeTimers[name] = undefined;
}

module.exports = {
	tstart,
	tend,
	tgroup,
	tgroupstart,
	tgroupend,
	tgroupresult,
};



const ptLimits = {};
function pt(name, limit, ...args) {
	if (ptLimits[name] == null) {
		ptLimits[name] = 0;
	}
	if (ptLimits[name] < limit) {
		console.log(...args);
		ptLimits[name] += 1;
	}
}