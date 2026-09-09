/**
 * Test script cho parser - sử dụng dữ liệu mẫu thật từ trang đăng ký môn học HCMUT
 */
const {
  parseCourseData,
  parsePeriods,
  parseWeeks,
  hasTimeConflict,
  formatSchedule,
  formatWeekRanges,
  printParseSummary,
} = require('./src/parser.js');

// ──────────────────────────────────────────────
// Unit tests cho helper functions
// ──────────────────────────────────────────────

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

console.log('\n🧪 Test parsePeriods():');
assertArrayEqual(
  parsePeriods('- - - - - - - 8 9 10 11 12 - - - -'),
  [8, 9, 10, 11, 12],
  'Parse tiết 8-12'
);
assertArrayEqual(
  parsePeriods('- 2 3 - - - - - - - - - - - - -'),
  [2, 3],
  'Parse tiết 2-3'
);
assertArrayEqual(
  parsePeriods('- 2 3 4 5 6 - - - - - - - - - -'),
  [2, 3, 4, 5, 6],
  'Parse tiết 2-6'
);
assertArrayEqual(
  parsePeriods('- - - - - - - - 9 10 - - - - - -'),
  [9, 10],
  'Parse tiết 9-10'
);
assertArrayEqual(
  parsePeriods('- - - 4 5 - - - - - - - - - - -'),
  [4, 5],
  'Parse tiết 4-5'
);
assertArrayEqual(
  parsePeriods('- - - - - - - - - - 11 12 - - - -'),
  [11, 12],
  'Parse tiết 11-12'
);
assertArrayEqual(parsePeriods(''), [], 'Parse chuỗi rỗng');

console.log('\n🧪 Test parseWeeks():');
assertArrayEqual(
  parseWeeks('-----6---0-2-4----------------'),
  [6, 10, 12, 14],
  'Parse tuần 6, 10, 12, 14'
);
assertArrayEqual(
  parseWeeks('1234567-90123456--------------'),
  [1, 2, 3, 4, 5, 6, 7, 9, 10, 11, 12, 13, 14, 15, 16],
  'Parse tuần 1-7, 9-16'
);
assertArrayEqual(
  parseWeeks('------7-9-1-3-----------------'),
  [7, 9, 11, 13],
  'Parse tuần 7, 9, 11, 13'
);
assertArrayEqual(parseWeeks(''), [], 'Parse chuỗi rỗng');

console.log('\n🧪 Test formatWeekRanges():');
assert(
  formatWeekRanges([1, 2, 3, 4, 5, 6, 7, 9, 10, 11, 12, 13, 14, 15, 16]) === '1-7, 9-16',
  'Format tuần 1-7, 9-16'
);
assert(
  formatWeekRanges([6, 10, 12, 14]) === '6, 10, 12, 14',
  'Format tuần rời rạc'
);
assert(
  formatWeekRanges([7, 9, 11, 13]) === '7, 9, 11, 13',
  'Format tuần lẻ'
);

// ──────────────────────────────────────────────
// Integration test với dữ liệu mẫu thật
// ──────────────────────────────────────────────

const sampleData = `STT\t\tMã MH\tTên MH\tSố tín chỉ\tBB/TC\t
1\t\tCO3093\tMạng máy tính\t3.0\t\t
CO3093 - Mạng máy tính
Nhóm lớp\tDK/ Sĩ số\tNgôn ngữ\tNhóm LT\tGiảng viên\tNhóm BT\tGiảng viên BT/TN\tSĩ số LT\t#
A01_A01\t40/40\tV\tA01\t\tA01\t\t80\t
Thứ\tTiết\tPhòng\tCS\tBT/TN\tTuần học
Thứ 4\t- - - - - - - 8 9 10 11 12 - - - -\tC6-509\t1\t\t-----6---0-2-4----------------
Thứ 5\t- 2 3 - - - - - - - - - - - - -\tB1-214\t1\t\t1234567-90123456--------------
A01_A02\t22/40\tV\tA01\t\tA02\t\t80\t
Thứ\tTiết\tPhòng\tCS\tBT/TN\tTuần học
Thứ 3\t- - - - - - - 8 9 10 11 12 - - - -\tC6-102\t1\t\t-----6---0-2-4----------------
Thứ 5\t- 2 3 - - - - - - - - - - - - -\tB1-214\t1\t\t1234567-90123456--------------
CC01_CC01\t38/40\tTA\tCC01\t\tCC01\t\t80\t
Thứ\tTiết\tPhòng\tCS\tBT/TN\tTuần học
Thứ 4\t- - - - - - - - 9 10 - - - - - -\tB1-208\t1\t\t1234567-90123456--------------
Thứ 5\t- - - - - - - 8 9 10 11 12 - - - -\tC6-103\t1\t\t------7-9-1-3-----------------
L01_L01\t40/40\tV\tL01\t\tL01\t\t120\t
Thứ\tTiết\tPhòng\tCS\tBT/TN\tTuần học
Thứ 4\t- 2 3 4 5 6 - - - - - - - - - -\tH6-708\t2\t\t------7-9-1-3-----------------
Thứ 6\t- - - 4 5 - - - - - - - - - - -\tH6-510\t2\t\t1234567-90123456--------------
TN01_TN01\t21/40\tV\tTN01\t\tTN01\t\t80\t
Thứ\tTiết\tPhòng\tCS\tBT/TN\tTuần học
Thứ 3\t- - - - - - - 8 9 10 11 12 - - - -\tC6-509\t1\t\t------7-9-1-3-----------------
Thứ 5\t- - - - - - - 8 9 - - - - - - -\tC5-504\t1\t\t1234567-90123456--------------`;

console.log('\n🧪 Test parseCourseData() với dữ liệu mẫu:');

const result = parseCourseData(sampleData);

assert(result.courses.length === 1, `Số môn học = 1 (actual: ${result.courses.length})`);

const course = result.courses[0];
assert(course.code === 'CO3093', `Mã MH = CO3093 (actual: ${course.code})`);
assert(course.name === 'Mạng máy tính', `Tên MH = Mạng máy tính (actual: ${course.name})`);
assert(course.credits === 3.0, `Số tín chỉ = 3.0 (actual: ${course.credits})`);
assert(course.classGroups.length === 5, `Số nhóm lớp = 5 (actual: ${course.classGroups.length})`);

// Test nhóm A01_A01
const g1 = course.classGroups[0];
assert(g1.groupCode === 'A01_A01', `Nhóm 1: code = A01_A01 (actual: ${g1.groupCode})`);
assert(g1.enrolled === 40 && g1.capacity === 40, `Nhóm 1: sĩ số = 40/40`);
assert(g1.language === 'V', `Nhóm 1: ngôn ngữ = V (actual: ${g1.language})`);
assert(g1.theoryGroup === 'A01', `Nhóm 1: nhóm LT = A01 (actual: ${g1.theoryGroup})`);
assert(g1.practiceGroup === 'A01', `Nhóm 1: nhóm BT = A01 (actual: ${g1.practiceGroup})`);
assert(g1.theoryCapacity === 80, `Nhóm 1: sĩ số LT = 80 (actual: ${g1.theoryCapacity})`);
assert(g1.schedules.length === 2, `Nhóm 1: số buổi = 2 (actual: ${g1.schedules.length})`);

// Test lịch buổi 1 của A01_A01
const s1 = g1.schedules[0];
assert(s1.dayOfWeek === 4, `Buổi 1: Thứ 4 (actual: Thứ ${s1.dayOfWeek})`);
assertArrayEqual(s1.periods, [8, 9, 10, 11, 12], 'Buổi 1: tiết 8-12');
assert(s1.room === 'C6-509', `Buổi 1: phòng = C6-509 (actual: ${s1.room})`);
assert(s1.campus === '1', `Buổi 1: CS = 1 (actual: ${s1.campus})`);
assertArrayEqual(s1.weeks, [6, 10, 12, 14], 'Buổi 1: tuần 6, 10, 12, 14');

// Test nhóm A01_A02
const g2 = course.classGroups[1];
assert(g2.groupCode === 'A01_A02', `Nhóm 2: code = A01_A02 (actual: ${g2.groupCode})`);
assert(g2.enrolled === 22, `Nhóm 2: đã ĐK = 22 (actual: ${g2.enrolled})`);

// Test nhóm CC01_CC01 (tiếng Anh)
const g3 = course.classGroups[2];
assert(g3.groupCode === 'CC01_CC01', `Nhóm 3: code = CC01_CC01 (actual: ${g3.groupCode})`);
assert(g3.language === 'TA', `Nhóm 3: ngôn ngữ = TA (actual: ${g3.language})`);

// Test nhóm L01_L01 (CS2)
const g4 = course.classGroups[3];
assert(g4.groupCode === 'L01_L01', `Nhóm 4: code = L01_L01 (actual: ${g4.groupCode})`);
assert(g4.schedules[0].campus === '2', `Nhóm 4 buổi 1: CS = 2 (actual: ${g4.schedules[0].campus})`);
assert(g4.theoryCapacity === 120, `Nhóm 4: sĩ số LT = 120 (actual: ${g4.theoryCapacity})`);

// ──────────────────────────────────────────────
// Test conflict detection
// ──────────────────────────────────────────────

console.log('\n🧪 Test hasTimeConflict():');

// A01_A01 Thứ 5 tiết 2-3 vs A01_A02 Thứ 5 tiết 2-3 → trùng
const conflictResult = hasTimeConflict(g1.schedules[1], g2.schedules[1]);
assert(conflictResult === true, 'A01_A01 vs A01_A02 Thứ 5 → TRÙNG');

// A01_A01 Thứ 4 vs A01_A02 Thứ 3 → không trùng (khác ngày)
const noConflict = hasTimeConflict(g1.schedules[0], g2.schedules[0]);
assert(noConflict === false, 'A01_A01 Thứ 4 vs A01_A02 Thứ 3 → KHÔNG TRÙNG');

// ──────────────────────────────────────────────
// Print summary
// ──────────────────────────────────────────────

console.log('\n');
printParseSummary(result);

// ──────────────────────────────────────────────
// Kết quả
// ──────────────────────────────────────────────

console.log('\n═══════════════════════════════════════════');
console.log(`📊 Kết quả: ${passed} passed, ${failed} failed, ${passed + failed} total`);
console.log('═══════════════════════════════════════════');

if (result.warnings.length > 0) {
  console.log(`\n⚠️  ${result.warnings.length} warnings (xem chi tiết bên trên)`);
}

process.exit(failed > 0 ? 1 : 0);
