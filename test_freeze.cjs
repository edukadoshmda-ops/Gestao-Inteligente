const XLSX = require('xlsx-js-style');
const ws = XLSX.utils.aoa_to_sheet([["A","B"],["1","2"],["3","4"],["5","6"]]);
ws["A1"].s = { fill: { fgColor: { rgb: "FF0000" } } };

// Test 1: freeze using views
ws['!views'] = [{ state: 'frozen', xSplit: 0, ySplit: 2, topLeftCell: 'A3', activeCell: 'A3' }];

const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
XLSX.writeFile(wb, "test.xlsx");
console.log("Done");
