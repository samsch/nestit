/* eslint-disable no-param-reassign */

'use strict';

function nest(result, joinPairs) {
	const { fields } = result;
	const parentTableIndexMap = {};
	const tableReaders = fields
		.reduce(
			([table, tables], field, rowIndex) => {
				if (!table || table.tableID !== field.tableID) {
					if (table) {
						table.columnEnd = rowIndex;
					}
					table = {
						tableID: field.tableID,
						columnStart: rowIndex,
						columnEnd: undefined,
						columns: [],
						idIndex: null,
						foreignName: null,
						foreignIndex: null,
					};
					tables.push(table);
				}
				table.columns.push(field.name);
				return [table, tables];
			},
			[null, []],
		)[1]
		.map((tableData, tableIndex) => {
			const { name: tableName, id, children, foreign } = joinPairs[tableIndex];
			tableData.getData = row => {
				const out = {};
				for (let coli = 0; coli < tableData.columns.length; coli += 1) {
					out[tableData.columns[coli]] = row[coli + tableData.columnStart];
				}
				children.forEach(child => {
					out[child] = [];
				});
				return out;
			};
			tableData.name = tableName;
			tableData.idIndex = tableData.columns.indexOf(id) + tableData.columnStart;
			if (foreign) {
				tableData.foreignName = foreign;
				tableData.foreignIndex = parentTableIndexMap[tableName];
				if (tableData.foreignIndex == null) {
					throw new Error(
						`Parent table must ordered first. Did not find parent for "${tableName}.${foreign}" in [${joinPairs
							.slice(0, tableIndex)
							.map(({ name }) => name)
							.join(', ')}]`,
					);
				}
			}
			children.forEach(child => {
				parentTableIndexMap[child] = tableIndex;
			});
			return tableData;
		});
	const output = {
		rows: [],
		idMap: {},
	};
	// eslint-disable-next-line no-plusplus
	for (let n = 0; n < result.length; n++) {
		const row = result[n];
		// eslint-disable-next-line no-plusplus
		for (let index = 0; index < tableReaders.length; index++) {
			const {
				idIndex,
				name,
				foreignName,
				foreignIndex,
				getData,
			} = tableReaders[index];
			if (!output.idMap[index]) {
				output.idMap[index] = {};
			}
			const id = row[idIndex];
			if (id !== null && !output.idMap[index][id]) {
				const data = getData(row);
				output.idMap[index][id] = data;
				if (foreignIndex !== null) {
					const parentTable = output.idMap[foreignIndex][data[foreignName]];
					parentTable[name].push(data);
				} else if (index === 0) {
					output.rows.push(data);
				}
			}
		}
	}

	return output.rows;
}

module.exports = nest;
