'use strict';

const activeTimers = {
	startTime: undefined,
};
function tstart() {
	if (activeTimers.startTime != null) {
		throw new Error(
			'⚠⚠⚠ Tried to start second timer with already active timer! ⚠⚠⚠',
		);
	}
	activeTimers.startTime = process.hrtime.bigint();
}

function tend() {
	const end = process.hrtime.bigint();
	const time = Number((end - activeTimers.startTime) / 1000n) / 1000;
	activeTimers.startTime = undefined;
	return time;
}

module.exports = {
	tstart,
	tend,
};
