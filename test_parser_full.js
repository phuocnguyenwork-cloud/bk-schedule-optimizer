/**
 * Test toàn diện parser với TOÀN BỘ dữ liệu mẫu (20 nhóm lớp)
 */
const {
  parseCourseData,
  checkGroupConflict,
  formatSchedule,
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
// Toàn bộ dữ liệu thật từ trang đăng ký
// ──────────────────────────────────────────────

const fullData = `STT\t\tMã MH\tTên MH\tSố tín chỉ\tBB/TC\t
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
CC01_CC02\t33/40\tTA\tCC01\t\tCC02\t\t80\t
Thứ\tTiết\tPhòng\tCS\tBT/TN\tTuần học
Thứ 3\t- - - - - - - 8 9 10 11 12 - - - -\tC6-103\t1\t\t------7-9-1-3-----------------
Thứ 4\t- - - - - - - - 9 10 - - - - - -\tB1-208\t1\t\t1234567-90123456--------------
CC02_CC03\t32/40\tTA\tCC02\t\tCC03\t\t80\t
Thứ\tTiết\tPhòng\tCS\tBT/TN\tTuần học
Thứ 4\t- - - - - - - - - - 11 12 - - - -\tB8-303\t1\t\t1234567-90123456--------------
Thứ 6\t- - - - - - - 8 9 10 11 12 - - - -\tC6-103\t1\t\t------7-9-1-3-----------------
CC02_CC04\t39/40\tTA\tCC02\t\tCC04\t\t80\t
Thứ\tTiết\tPhòng\tCS\tBT/TN\tTuần học
Thứ 3\t- 2 3 4 5 6 - - - - - - - - - -\tA4-511\t1\t\t-----6---0-2-4----------------
Thứ 4\t- - - - - - - - - - 11 12 - - - -\tB8-303\t1\t\t1234567-90123456--------------
CC03_CC05\t38/40\tTA\tCC03\t\tCC05\t\t80\t
Thứ\tTiết\tPhòng\tCS\tBT/TN\tTuần học
Thứ 2\t- 2 3 4 5 6 - - - - - - - - - -\tC6-104\t1\t\t------7-9-1-3-----------------
Thứ 3\t- - - - - - - 8 9 - - - - - - -\tB1-305\t1\t\t1234567-90123456--------------
CC03_CC06\t40/40\tTA\tCC03\t\tCC06\t\t80\t
Thứ\tTiết\tPhòng\tCS\tBT/TN\tTuần học
Thứ 3\t- - - - - - - 8 9 - - - - - - -\tB1-305\t1\t\t1234567-90123456--------------
Thứ 6\t- 2 3 4 5 6 - - - - - - - - - -\tA4-511\t1\t\t------7-9-1-3-----------------
L01_L01\t40/40\tV\tL01\t\tL01\t\t120\t
Thứ\tTiết\tPhòng\tCS\tBT/TN\tTuần học
Thứ 4\t- 2 3 4 5 6 - - - - - - - - - -\tH6-708\t2\t\t------7-9-1-3-----------------
Thứ 6\t- - - 4 5 - - - - - - - - - - -\tH6-510\t2\t\t1234567-90123456--------------
L01_L02\t37/40\tV\tL01\t\tL02\t\t120\t
Thứ\tTiết\tPhòng\tCS\tBT/TN\tTuần học
Thứ 3\t- - - - - - - 8 9 10 11 12 - - - -\tH6-708\t2\t\t------7-9-1-3-----------------
Thứ 6\t- - - 4 5 - - - - - - - - - - -\tH6-510\t2\t\t1234567-90123456--------------
L01_L03\t21/40\tV\tL01\t\tL03\t\t120\t
Thứ\tTiết\tPhòng\tCS\tBT/TN\tTuần học
Thứ 2\t- 2 3 4 5 6 - - - - - - - - - -\tH6-708\t2\t\t------7-9-1-3-----------------
Thứ 6\t- - - 4 5 - - - - - - - - - - -\tH6-510\t2\t\t1234567-90123456--------------
L02_L04\t40/40\tV\tL02\t\tL04\t\t120\t
Thứ\tTiết\tPhòng\tCS\tBT/TN\tTuần học
Thứ 3\t- 2 3 4 5 6 - - - - - - - - - -\tH6-707\t2\t\t------7-9-1-3-----------------
Thứ 5\t- - - - - - - 8 9 - - - - - - -\tH1-805\t2\t\t1234567-90123456--------------
L02_L05\t40/40\tV\tL02\t\tL05\t\t120\t
Thứ\tTiết\tPhòng\tCS\tBT/TN\tTuần học
Thứ 5\t- - - - - - - 8 9 - - - - - - -\tH1-805\t2\t\t1234567-90123456--------------
Thứ 6\t- 2 3 4 5 6 - - - - - - - - - -\tH6-604\t2\t\t-----6---0-2-4----------------
L02_L06\t32/40\tV\tL02\t\tL06\t\t120\t
Thứ\tTiết\tPhòng\tCS\tBT/TN\tTuần học
Thứ 2\t- - - - - - - 8 9 10 11 12 - - - -\tH6-703\t2\t\t------7-9-1-3-----------------
Thứ 5\t- - - - - - - 8 9 - - - - - - -\tH1-805\t2\t\t1234567-90123456--------------
L03_L07\t32/40\tV\tL03\t\tL07\t\t120\t
Thứ\tTiết\tPhòng\tCS\tBT/TN\tTuần học
Thứ 3\t- - - - - - - 8 9 - - - - - - -\tH1-101\t2\t\t1234567-90123456--------------
Thứ 5\t- 2 3 4 5 6 - - - - - - - - - -\tH6-707\t2\t\t------7-9-1-3-----------------
L03_L08\t40/40\tV\tL03\t\tL08\t\t120\t
Thứ\tTiết\tPhòng\tCS\tBT/TN\tTuần học
Thứ 2\t- - - - - - - 8 9 10 11 12 - - - -\tH6-604\t2\t\t------7-9-1-3-----------------
Thứ 3\t- - - - - - - 8 9 - - - - - - -\tH1-101\t2\t\t1234567-90123456--------------
L03_L09\t40/40\tV\tL03\t\tL09\t\t120\t
Thứ\tTiết\tPhòng\tCS\tBT/TN\tTuần học
Thứ 3\t- - - - - - - 8 9 - - - - - - -\tH1-101\t2\t\t1234567-90123456--------------
Thứ 5\t- 2 3 4 5 6 - - - - - - - - - -\tH6-603\t2\t\t------7-9-1-3-----------------
TN01_TN01\t21/40\tV\tTN01\t\tTN01\t\t80\t
Thứ\tTiết\tPhòng\tCS\tBT/TN\tTuần học
Thứ 3\t- - - - - - - 8 9 10 11 12 - - - -\tC6-509\t1\t\t------7-9-1-3-----------------
Thứ 5\t- - - - - - - 8 9 - - - - - - -\tC5-504\t1\t\t1234567-90123456--------------
TN01_TN02\t19/40\tV\tTN01\t\tTN02\t\t80\t
Thứ\tTiết\tPhòng\tCS\tBT/TN\tTuần học
Thứ 5\t- - - - - - - 8 9 - - - - - - -\tC5-504\t1\t\t1234567-90123456--------------
Thứ 6\t- 2 3 4 5 6 - - - - - - - - - -\tC6-509\t1\t\t------7-9-1-3-----------------`;

// ──────────────────────────────────────────────
// Test parse đầy đủ
// ──────────────────────────────────────────────

console.log('🧪 Test parse TOÀN BỘ dữ liệu mẫu (20 nhóm lớp):');
const result = parseCourseData(fullData);

assert(result.courses.length === 1, `Số môn = 1`);
assert(result.warnings.length === 0, `Không có warning (actual: ${result.warnings.length})`);

const c = result.courses[0];
assert(c.code === 'CO3093', 'Mã MH đúng');
assert(c.classGroups.length === 19, `Tổng nhóm lớp = 19 (actual: ${c.classGroups.length})`);

// Verify từng nhóm
const expectedGroups = [
  { code: 'A01_A01', enrolled: 40, capacity: 40, lang: 'V', lt: 'A01', bt: 'A01', ltCap: 80 },
  { code: 'A01_A02', enrolled: 22, capacity: 40, lang: 'V', lt: 'A01', bt: 'A02', ltCap: 80 },
  { code: 'CC01_CC01', enrolled: 38, capacity: 40, lang: 'TA', lt: 'CC01', bt: 'CC01', ltCap: 80 },
  { code: 'CC01_CC02', enrolled: 33, capacity: 40, lang: 'TA', lt: 'CC01', bt: 'CC02', ltCap: 80 },
  { code: 'CC02_CC03', enrolled: 32, capacity: 40, lang: 'TA', lt: 'CC02', bt: 'CC03', ltCap: 80 },
  { code: 'CC02_CC04', enrolled: 39, capacity: 40, lang: 'TA', lt: 'CC02', bt: 'CC04', ltCap: 80 },
  { code: 'CC03_CC05', enrolled: 38, capacity: 40, lang: 'TA', lt: 'CC03', bt: 'CC05', ltCap: 80 },
  { code: 'CC03_CC06', enrolled: 40, capacity: 40, lang: 'TA', lt: 'CC03', bt: 'CC06', ltCap: 80 },
  { code: 'L01_L01', enrolled: 40, capacity: 40, lang: 'V', lt: 'L01', bt: 'L01', ltCap: 120 },
  { code: 'L01_L02', enrolled: 37, capacity: 40, lang: 'V', lt: 'L01', bt: 'L02', ltCap: 120 },
  { code: 'L01_L03', enrolled: 21, capacity: 40, lang: 'V', lt: 'L01', bt: 'L03', ltCap: 120 },
  { code: 'L02_L04', enrolled: 40, capacity: 40, lang: 'V', lt: 'L02', bt: 'L04', ltCap: 120 },
  { code: 'L02_L05', enrolled: 40, capacity: 40, lang: 'V', lt: 'L02', bt: 'L05', ltCap: 120 },
  { code: 'L02_L06', enrolled: 32, capacity: 40, lang: 'V', lt: 'L02', bt: 'L06', ltCap: 120 },
  { code: 'L03_L07', enrolled: 32, capacity: 40, lang: 'V', lt: 'L03', bt: 'L07', ltCap: 120 },
  { code: 'L03_L08', enrolled: 40, capacity: 40, lang: 'V', lt: 'L03', bt: 'L08', ltCap: 120 },
  { code: 'L03_L09', enrolled: 40, capacity: 40, lang: 'V', lt: 'L03', bt: 'L09', ltCap: 120 },
  { code: 'TN01_TN01', enrolled: 21, capacity: 40, lang: 'V', lt: 'TN01', bt: 'TN01', ltCap: 80 },
  { code: 'TN01_TN02', enrolled: 19, capacity: 40, lang: 'V', lt: 'TN01', bt: 'TN02', ltCap: 80 },
];

console.log('\n🧪 Verify từng nhóm lớp:');
for (let i = 0; i < expectedGroups.length; i++) {
  const expected = expectedGroups[i];
  const actual = c.classGroups[i];
  if (!actual) {
    assert(false, `Nhóm ${i + 1} (${expected.code}): KHÔNG TÌM THẤY`);
    continue;
  }
  
  const allMatch =
    actual.groupCode === expected.code &&
    actual.enrolled === expected.enrolled &&
    actual.capacity === expected.capacity &&
    actual.language === expected.lang &&
    actual.theoryGroup === expected.lt &&
    actual.practiceGroup === expected.bt &&
    actual.theoryCapacity === expected.ltCap &&
    actual.schedules.length === 2; // Mỗi nhóm đều có 2 buổi

  assert(allMatch, `Nhóm ${expected.code} [${expected.enrolled}/${expected.capacity}] ${expected.lang} LT:${expected.lt} BT:${expected.bt} (2 buổi)`);
  
  if (!allMatch && actual) {
    console.error(`     groupCode: ${actual.groupCode} (expected: ${expected.code})`);
    console.error(`     enrolled: ${actual.enrolled} (expected: ${expected.enrolled})`);
    console.error(`     capacity: ${actual.capacity} (expected: ${expected.capacity})`);
    console.error(`     language: ${actual.language} (expected: ${expected.lang})`);
    console.error(`     theoryGroup: ${actual.theoryGroup} (expected: ${expected.lt})`);
    console.error(`     practiceGroup: ${actual.practiceGroup} (expected: ${expected.bt})`);
    console.error(`     theoryCapacity: ${actual.theoryCapacity} (expected: ${expected.ltCap})`);
    console.error(`     schedules: ${actual.schedules.length} (expected: 2)`);
  }
}

// ──────────────────────────────────────────────
// Verify chi tiết lịch học của một số nhóm đặc trưng
// ──────────────────────────────────────────────

console.log('\n🧪 Verify chi tiết lịch học:');

// CC02_CC04: Thứ 3 tiết 2-6 và Thứ 4 tiết 11-12
const cc02_cc04 = c.classGroups.find(g => g.groupCode === 'CC02_CC04');
assert(cc02_cc04 !== undefined, 'Tìm thấy CC02_CC04');
if (cc02_cc04) {
  assert(cc02_cc04.schedules[0].dayOfWeek === 3, 'CC02_CC04 buổi 1: Thứ 3');
  assertArrayEqual(cc02_cc04.schedules[0].periods, [2, 3, 4, 5, 6], 'CC02_CC04 buổi 1: tiết 2-6');
  assert(cc02_cc04.schedules[0].room === 'A4-511', 'CC02_CC04 buổi 1: phòng A4-511');
  assertArrayEqual(cc02_cc04.schedules[0].weeks, [6, 10, 12, 14], 'CC02_CC04 buổi 1: tuần 6,10,12,14');
  
  assert(cc02_cc04.schedules[1].dayOfWeek === 4, 'CC02_CC04 buổi 2: Thứ 4');
  assertArrayEqual(cc02_cc04.schedules[1].periods, [11, 12], 'CC02_CC04 buổi 2: tiết 11-12');
  assert(cc02_cc04.schedules[1].room === 'B8-303', 'CC02_CC04 buổi 2: phòng B8-303');
}

// L02_L05: CS2
const l02_l05 = c.classGroups.find(g => g.groupCode === 'L02_L05');
assert(l02_l05 !== undefined, 'Tìm thấy L02_L05');
if (l02_l05) {
  assert(l02_l05.schedules[0].campus === '2', 'L02_L05 buổi 1: CS2');
  assert(l02_l05.schedules[1].campus === '2', 'L02_L05 buổi 2: CS2');
  assert(l02_l05.schedules[1].room === 'H6-604', 'L02_L05 buổi 2: phòng H6-604');
  assertArrayEqual(l02_l05.schedules[1].weeks, [6, 10, 12, 14], 'L02_L05 buổi 2: tuần 6,10,12,14');
}

// TN01_TN02: Nhóm cuối
const tn01_tn02 = c.classGroups.find(g => g.groupCode === 'TN01_TN02');
assert(tn01_tn02 !== undefined, 'Tìm thấy TN01_TN02');
if (tn01_tn02) {
  assert(tn01_tn02.enrolled === 19, 'TN01_TN02: enrolled = 19');
  assert(tn01_tn02.schedules[0].dayOfWeek === 5, 'TN01_TN02 buổi 1: Thứ 5');
  assertArrayEqual(tn01_tn02.schedules[0].periods, [8, 9], 'TN01_TN02 buổi 1: tiết 8-9');
  assert(tn01_tn02.schedules[1].dayOfWeek === 6, 'TN01_TN02 buổi 2: Thứ 6');
  assertArrayEqual(tn01_tn02.schedules[1].periods, [2, 3, 4, 5, 6], 'TN01_TN02 buổi 2: tiết 2-6');
}

// ──────────────────────────────────────────────
// Test conflict detection giữa các nhóm
// ──────────────────────────────────────────────

console.log('\n🧪 Test conflict detection:');

// A01_A01 vs A01_A02: cùng LT A01 nên Thứ 5 tiết 2-3 giống nhau → trùng
const g_a01 = c.classGroups.find(g => g.groupCode === 'A01_A01');
const g_a02 = c.classGroups.find(g => g.groupCode === 'A01_A02');
const conflict1 = checkGroupConflict(g_a01, g_a02);
assert(conflict1.conflict === true, 'A01_A01 vs A01_A02: TRÙNG (cùng LT Thứ 5 tiết 2-3)');

// L01_L01 vs TN01_TN01: Kiểm tra cross-group conflict  
const g_l01 = c.classGroups.find(g => g.groupCode === 'L01_L01');
const g_tn01 = c.classGroups.find(g => g.groupCode === 'TN01_TN01');
const conflict2 = checkGroupConflict(g_l01, g_tn01);
// L01_L01: Thứ 4 tiết 2-6 (tuần 7,9,11,13), Thứ 6 tiết 4-5 (tuần 1-7,9-16)
// TN01_TN01: Thứ 3 tiết 8-12 (tuần 7,9,11,13), Thứ 5 tiết 8-9 (tuần 1-7,9-16)
// → Khác ngày hoàn toàn → không trùng
assert(conflict2.conflict === false, 'L01_L01 vs TN01_TN01: KHÔNG TRÙNG (khác ngày)');

// CC03_CC05 vs L01_L03: Cả hai đều có Thứ 2
// CC03_CC05: Thứ 2 tiết 2-6 (tuần 7,9,11,13)
// L01_L03: Thứ 2 tiết 2-6 (tuần 7,9,11,13)
// → TRÙNG!
const g_cc05 = c.classGroups.find(g => g.groupCode === 'CC03_CC05');
const g_l03 = c.classGroups.find(g => g.groupCode === 'L01_L03');
const conflict3 = checkGroupConflict(g_cc05, g_l03);
assert(conflict3.conflict === true, 'CC03_CC05 vs L01_L03: TRÙNG (Thứ 2 tiết 2-6 cùng tuần)');
if (conflict3.conflict) {
  console.log(`     Chi tiết: ${conflict3.details.length} cặp trùng`);
}

// ──────────────────────────────────────────────
// Test thống kê
// ──────────────────────────────────────────────

console.log('\n🧪 Test thống kê:');
const fullGroups = c.classGroups.filter(g => g.enrolled >= g.capacity);
const availGroups = c.classGroups.filter(g => g.enrolled < g.capacity);
console.log(`   Nhóm đầy: ${fullGroups.length}, Nhóm còn chỗ: ${availGroups.length}`);
assert(fullGroups.length + availGroups.length === 19, `Tổng nhóm đầy + còn chỗ = 19`);

const vnGroups = c.classGroups.filter(g => g.language === 'V');
const enGroups = c.classGroups.filter(g => g.language === 'TA');
assert(vnGroups.length + enGroups.length === 19, `Tổng VN + TA = 19`);
console.log(`   Nhóm tiếng Việt: ${vnGroups.length}, Nhóm tiếng Anh: ${enGroups.length}`);

// ──────────────────────────────────────────────
// Print full summary
// ──────────────────────────────────────────────

console.log('\n');
printParseSummary(result);

// ──────────────────────────────────────────────
// Kết quả
// ──────────────────────────────────────────────

console.log('\n═══════════════════════════════════════════');
console.log(`📊 TỔNG KẾT: ${passed} passed, ${failed} failed, ${passed + failed} total`);
if (result.warnings.length > 0) {
  console.log(`⚠️  ${result.warnings.length} warnings`);
  result.warnings.forEach(w => console.log(`   ${w}`));
}
console.log('═══════════════════════════════════════════');

process.exit(failed > 0 ? 1 : 0);
