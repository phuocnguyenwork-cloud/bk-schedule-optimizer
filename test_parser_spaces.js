/**
 * Test parser với dữ liệu space-separated (giả lập browser paste)
 * 
 * Khi copy từ browser, bảng HTML thường được paste với spaces thay vì tabs.
 * Test này verify rằng parser hoạt động đúng với kiểu dữ liệu đó.
 */
const {
  parseCourseData,
  formatWeekRanges,
  printParseSummary,
} = require('./src/parser.js');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`  ✅ ${message}`);
  } else {
    failed++;
    console.error(`  ❌ ${message}`);
  }
}

function assertArrayEqual(actual, expected, message) {
  const eq = JSON.stringify(actual) === JSON.stringify(expected);
  if (!eq) {
    console.error(`     Expected: ${JSON.stringify(expected)}`);
    console.error(`     Actual:   ${JSON.stringify(actual)}`);
  }
  assert(eq, message);
}

// ──────────────────────────────────────────────
// Space-separated data (giả lập browser paste)
// Giữa các cột dùng NHIỀU spaces (2-14) thay vì tabs
// ──────────────────────────────────────────────

const spaceSeparatedData = 
`STT            Mã MH  Tên MH  Số tín chỉ   BB/TC
1              CO3093  Mạng máy tính  3.0
CO3093 - Mạng máy tính
Nhóm lớp      DK/ Sĩ số    Ngôn ngữ      Nhóm LT Giảng viên      Nhóm BT Giảng viên BT/TN      Sĩ số LT
#
A01_A01 40/40   V         A01              A01              80
Thứ     Tiết     Phòng    CS   BT/TN   Tuần học
Thứ 4   - - - - - - - 8 9 10 11 12 - - - -   C6-509   1              -----6---0-2-4----------------
Thứ 5   - 2 3 - - - - - - - - - - - - -      B1-214   1              1234567-90123456--------------
A01_A02 22/40   V         A01              A02              80
Thứ     Tiết     Phòng    CS   BT/TN   Tuần học
Thứ 3   - - - - - - - 8 9 10 11 12 - - - -   C6-102   1              -----6---0-2-4----------------
Thứ 5   - 2 3 - - - - - - - - - - - - -      B1-214   1              1234567-90123456--------------
CC01_CC01 38/40   TA        CC01             CC01             80
Thứ     Tiết     Phòng    CS   BT/TN   Tuần học
Thứ 4   - - - - - - - - 9 10 - - - - - -     B1-208   1              1234567-90123456--------------
Thứ 5   - - - - - - - 8 9 10 11 12 - - - -   C6-103   1              ------7-9-1-3-----------------
L01_L01 40/40   V         L01              L01              120
Thứ     Tiết     Phòng    CS   BT/TN   Tuần học
Thứ 4   - 2 3 4 5 6 - - - - - - - - - -      H6-708   2              ------7-9-1-3-----------------
Thứ 6   - - - 4 5 - - - - - - - - - - -      H6-510   2              1234567-90123456--------------
TN01_TN02 19/40   V       TN01             TN02             80
Thứ     Tiết     Phòng    CS   BT/TN   Tuần học
Thứ 5   - - - - - - - 8 9 - - - - - - -      C5-504   1              1234567-90123456--------------
Thứ 6   - 2 3 4 5 6 - - - - - - - - - -      C6-509   1              ------7-9-1-3-----------------`;

// ──────────────────────────────────────────────

console.log('🧪 Test parser với dữ liệu SPACE-SEPARATED (browser paste):');
console.log('');

const result = parseCourseData(spaceSeparatedData);

assert(result.courses.length === 1, `Số môn = 1 (actual: ${result.courses.length})`);

if (result.warnings.length > 0) {
  console.log(`  ⚠️  ${result.warnings.length} warnings:`);
  result.warnings.forEach(w => console.log(`     ${w}`));
}

const c = result.courses[0];
assert(c.code === 'CO3093', `Mã MH = CO3093`);
assert(c.name === 'Mạng máy tính', `Tên MH = Mạng máy tính`);
assert(c.credits === 3.0, `Tín chỉ = 3.0`);
assert(c.classGroups.length === 5, `Nhóm lớp = 5 (actual: ${c.classGroups.length})`);

// ── Verify A01_A01 ──
console.log('\n🔍 A01_A01:');
const g1 = c.classGroups[0];
assert(g1.groupCode === 'A01_A01', `  groupCode = A01_A01`);
assert(g1.enrolled === 40, `  enrolled = 40`);
assert(g1.capacity === 40, `  capacity = 40`);
assert(g1.language === 'V', `  language = V (actual: "${g1.language}")`);
assert(g1.theoryGroup === 'A01', `  theoryGroup = A01`);
assert(g1.practiceGroup === 'A01', `  practiceGroup = A01`);
assert(g1.theoryCapacity === 80, `  theoryCapacity = 80 (actual: ${g1.theoryCapacity})`);
assert(g1.schedules.length === 2, `  schedules = 2 (actual: ${g1.schedules.length})`);

// Verify schedule 1 of A01_A01
const s1 = g1.schedules[0];
assert(s1.dayOfWeek === 4, `  Buổi 1: Thứ 4`);
assertArrayEqual(s1.periods, [8, 9, 10, 11, 12], '  Buổi 1: tiết 8-12');
assert(s1.room === 'C6-509', `  Buổi 1: phòng = C6-509 (actual: "${s1.room}")`);
assert(s1.campus === '1', `  Buổi 1: CS = 1 (actual: "${s1.campus}")`);
assertArrayEqual(s1.weeks, [6, 10, 12, 14], '  Buổi 1: tuần 6, 10, 12, 14');

// Verify schedule 2 of A01_A01
const s2 = g1.schedules[1];
assert(s2.dayOfWeek === 5, `  Buổi 2: Thứ 5`);
assertArrayEqual(s2.periods, [2, 3], '  Buổi 2: tiết 2-3');
assert(s2.room === 'B1-214', `  Buổi 2: phòng = B1-214 (actual: "${s2.room}")`);
assertArrayEqual(s2.weeks, [1, 2, 3, 4, 5, 6, 7, 9, 10, 11, 12, 13, 14, 15, 16], '  Buổi 2: tuần 1-7, 9-16');

// ── Verify CC01_CC01 (tiếng Anh) ──
console.log('\n🔍 CC01_CC01:');
const g3 = c.classGroups[2];
assert(g3.groupCode === 'CC01_CC01', `  groupCode = CC01_CC01`);
assert(g3.language === 'TA', `  language = TA (actual: "${g3.language}")`);
assert(g3.schedules.length === 2, `  schedules = 2 (actual: ${g3.schedules.length})`);
assertArrayEqual(g3.schedules[0].periods, [9, 10], '  Buổi 1: tiết 9-10');
assert(g3.schedules[0].room === 'B1-208', `  Buổi 1: phòng = B1-208 (actual: "${g3.schedules[0].room}")`);

// ── Verify L01_L01 (CS2) ──
console.log('\n🔍 L01_L01:');
const g4 = c.classGroups[3];
assert(g4.groupCode === 'L01_L01', `  groupCode = L01_L01`);
assert(g4.theoryCapacity === 120, `  theoryCapacity = 120 (actual: ${g4.theoryCapacity})`);
assert(g4.schedules[0].campus === '2', `  Buổi 1: CS = 2 (actual: "${g4.schedules[0].campus}")`);
assertArrayEqual(g4.schedules[0].periods, [2, 3, 4, 5, 6], '  Buổi 1: tiết 2-6');
assert(g4.schedules[0].room === 'H6-708', `  Buổi 1: phòng = H6-708 (actual: "${g4.schedules[0].room}")`);

// ── Verify TN01_TN02 (nhóm cuối) ──
console.log('\n🔍 TN01_TN02:');
const g5 = c.classGroups[4];
assert(g5.groupCode === 'TN01_TN02', `  groupCode = TN01_TN02`);
assert(g5.enrolled === 19, `  enrolled = 19`);
assert(g5.theoryGroup === 'TN01', `  theoryGroup = TN01`);
assert(g5.practiceGroup === 'TN02', `  practiceGroup = TN02`);
assertArrayEqual(g5.schedules[0].periods, [8, 9], '  Buổi 1: tiết 8-9');
assert(g5.schedules[0].room === 'C5-504', `  Buổi 1: phòng = C5-504 (actual: "${g5.schedules[0].room}")`);
assertArrayEqual(g5.schedules[1].periods, [2, 3, 4, 5, 6], '  Buổi 2: tiết 2-6');

// ──────────────────────────────────────────────
// Print summary
// ──────────────────────────────────────────────

console.log('\n');
printParseSummary(result);

console.log('\n═══════════════════════════════════════════');
console.log(`📊 TỔNG KẾT (space-separated): ${passed} passed, ${failed} failed, ${passed + failed} total`);
if (result.warnings.length > 0) {
  console.log(`⚠️  ${result.warnings.length} warnings`);
}
console.log('═══════════════════════════════════════════');

process.exit(failed > 0 ? 1 : 0);
