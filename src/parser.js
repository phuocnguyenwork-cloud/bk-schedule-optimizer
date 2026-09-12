/**
 * Parser cho dữ liệu đăng ký môn học HCMUT (mybk.hcmut.edu.vn)
 *
 * Dữ liệu đầu vào là text được copy-paste từ trang đăng ký môn học,
 * có dạng tab-separated với cấu trúc:
 *
 *   Môn học (Course)
 *   └── Nhóm lớp (ClassGroup)  — ví dụ A01_A02, L01_L03
 *       └── Buổi học (Schedule) — Thứ, tiết, phòng, tuần
 */

const PARSER_VERSION = 'v3-pattern-based';
if (typeof window !== 'undefined') {
  console.log(`%c[Parser] Loaded ${PARSER_VERSION}`, 'color: #10b981; font-weight: bold');
}

// ──────────────────────────────────────────────
// Data structures (JSDoc typedefs)
// ──────────────────────────────────────────────

/**
 * @typedef {Object} Schedule
 * @property {number}   dayOfWeek  - Thứ trong tuần (2 = Thứ 2, ..., 7 = Thứ 7, 8 = Chủ nhật)
 * @property {string}   dayLabel   - Nhãn hiển thị, ví dụ "Thứ 4"
 * @property {number[]} periods    - Danh sách tiết học, ví dụ [8, 9, 10, 11, 12]
 * @property {string}   room       - Phòng học, ví dụ "C6-509"
 * @property {string}   campus     - Cơ sở, ví dụ "1" hoặc "2"
 * @property {string}   practiceFlag - Cờ BT/TN nếu có
 * @property {number[]} weeks      - Danh sách tuần học, ví dụ [1, 2, 3, 4, 5]
 * @property {string}   rawWeeks   - Chuỗi tuần học gốc, ví dụ "1234567-90123456--------------"
 */

/**
 * @typedef {Object} ClassGroup
 * @property {string}     groupCode          - Mã nhóm lớp, ví dụ "A01_A02"
 * @property {number}     enrolled           - Số lượng đã đăng ký
 * @property {number}     capacity           - Sĩ số tối đa nhóm BT/TN
 * @property {string}     language           - Ngôn ngữ giảng dạy: "V" hoặc "TA"
 * @property {string}     theoryGroup        - Nhóm lý thuyết, ví dụ "A01"
 * @property {string}     theoryInstructor   - Giảng viên LT
 * @property {string}     practiceGroup      - Nhóm BT/TN, ví dụ "A02"
 * @property {string}     practiceInstructor - Giảng viên BT/TN
 * @property {number}     theoryCapacity     - Sĩ số lớp LT
 * @property {Schedule[]} schedules          - Danh sách buổi học
 */

/**
 * @typedef {Object} Course
 * @property {number}       stt         - Số thứ tự
 * @property {string}       code        - Mã môn học, ví dụ "CO3093"
 * @property {string}       name        - Tên môn học, ví dụ "Mạng máy tính"
 * @property {number}       credits     - Số tín chỉ
 * @property {string}       type        - BB (bắt buộc) / TC (tự chọn)
 * @property {ClassGroup[]} classGroups - Danh sách nhóm lớp
 */

/**
 * @typedef {Object} ParseResult
 * @property {Course[]} courses  - Danh sách môn học đã parse
 * @property {string[]} warnings - Danh sách cảnh báo (dòng không parse được, v.v.)
 */

// ──────────────────────────────────────────────
// Input normalization
// ──────────────────────────────────────────────

/**
 * Normalize dòng dữ liệu để parser hoạt động với mọi kiểu input:
 * - Dữ liệu paste từ browser (tab thật hoặc multiple spaces giữa cột)
 * - Dữ liệu trong test/string literal (có literal \t)
 *
 * Chiến lược:
 * 1. Chuyển literal \t thành tab thật
 * 2. Nếu dòng KHÔNG có tab nào → chuyển 2+ spaces thành tab
 *    (an toàn vì trong cùng 1 field, các giá trị chỉ cách nhau 1 space)
 *
 * @param {string} line - Dòng dữ liệu thô
 * @returns {string} Dòng đã chuẩn hóa
 */
function normalizeLine(line) {
  let result = line.replace(/\r$/, '');         // Loại bỏ \r cuối dòng
  result = result.replace(/\\t/g, '\t');          // Chuyển literal \t thành tab thật

  // Chuẩn hóa Unicode (NFC) để gộp các ký tự dấu (ví dụ: 'o' + '́' thành 'ó')
  // Rất quan trọng khi copy từ các trang web dùng NFD (như BK)
  if (result.normalize) {
    result = result.normalize('NFC');
  }

  // Nếu không có tab nào → dữ liệu dùng spaces, chuyển 2+ spaces thành tab
  if (!result.includes('\t')) {
    result = result.replace(/ {2,}/g, '\t');
  }

  return result;
}

// ──────────────────────────────────────────────
// Regex patterns
// ──────────────────────────────────────────────

/** Dòng header bảng môn học: "STT ... Mã MH ... Tên MH ..." */
const RE_COURSE_TABLE_HEADER = /^STT[\t\s]/;

/**
 * Dòng dữ liệu môn học: "1\t\tCO3093\tMạng máy tính\t3.0"
 * Linh hoạt: chấp nhận tab hoặc space làm separator
 */
const RE_COURSE_DATA = /^(\d+)[\t ]+([A-Z]{2}\d{3,5}[A-Z]?)[\t ]+(.+?)[\t ]+([\d.]+)[\t ]*(.*)$/;

/** Dòng tiêu đề môn học: "CO3093 - Mạng máy tính" */
const RE_COURSE_TITLE = /^([A-Z]{2}\d{3,5}[A-Z]?)\s*[-–—]\s*(.+)$/;

/** Dòng header bảng nhóm lớp: "Nhóm lớp ..." */
const RE_GROUP_TABLE_HEADER = /^Nhóm lớp[\t\s]/;

/**
 * Dòng dữ liệu nhóm lớp: "A01_A01 40/40 V ..."
 * Chấp nhận tab hoặc space giữa groupCode và số đăng ký
 */
const RE_GROUP_DATA = /^([A-Za-z]+\d+(?:_[A-Za-z]*\d+)?)[\t ]+(\d+)\/(\d+)[\t ]+/;

/** Dòng header bảng lịch học: "Thứ Tiết Phòng ..." */
const RE_SCHEDULE_HEADER = /^Thứ[\t ]+Tiết[\t ]+/;

/** Dòng dữ liệu lịch học: "Thứ 4 ..." hoặc "Thứ4 ..." */
const RE_SCHEDULE_DATA = /^Thứ\s*(\d)/;

// ──────────────────────────────────────────────
// Parsing helpers
// ──────────────────────────────────────────────

/**
 * Parse chuỗi tiết học thành mảng số.
 *
 * Input:  "- - - - - - - 8 9 10 11 12 - - - -"
 * Output: [8, 9, 10, 11, 12]
 *
 * @param {string} raw - Chuỗi tiết học, các phần tử cách nhau bởi dấu cách
 * @returns {number[]} Danh sách tiết học (sorted)
 */
function parsePeriods(raw) {
  if (!raw || !raw.trim()) return [];

  return raw
    .trim()
    .split(/\s+/)
    .filter((token) => token !== '-' && token !== '')
    .map((token) => parseInt(token, 10))
    .filter((n) => !isNaN(n))
    .sort((a, b) => a - b);
}

/**
 * Parse chuỗi tuần học thành mảng số tuần.
 *
 * Format: Mỗi ký tự đại diện cho 1 tuần (vị trí 0-indexed → tuần = vị_trí + 1).
 *   - Ký tự '-' = không học tuần đó
 *   - Ký tự số  = có học tuần đó (số hiển thị = tuần % 10)
 *
 * Input:  "-----6---0-2-4----------------"
 * Output: [6, 10, 12, 14]
 *
 * Input:  "1234567-90123456--------------"
 * Output: [1, 2, 3, 4, 5, 6, 7, 9, 10, 11, 12, 13, 14, 15, 16]
 *
 * @param {string} raw - Chuỗi tuần học
 * @returns {number[]} Danh sách tuần học (sorted, 1-indexed)
 */
function parseWeeks(raw) {
  if (!raw || !raw.trim()) return [];

  const weeks = [];
  const cleaned = raw.trim();

  for (let i = 0; i < cleaned.length; i++) {
    if (cleaned[i] !== '-') {
      weeks.push(i + 1); // Tuần = vị trí + 1 (1-indexed)
    }
  }

  return weeks;
}

/**
 * Parse dòng dữ liệu nhóm lớp.
 * Hoạt động với cả tab-separated và space-separated data.
 *
 * Chiến lược:
 * - Dùng regex để lấy groupCode, enrolled, capacity (luôn chính xác)
 * - Suy ra theoryGroup/practiceGroup từ groupCode (A01_A02 → LT:A01, BT:A02)
 * - Parse phần còn lại để tìm language và theoryCapacity
 *
 * @param {string} line - Dòng dữ liệu nhóm lớp
 * @returns {ClassGroup|null}
 */
function parseGroupLine(line) {
  const match = line.match(RE_GROUP_DATA);
  if (!match) return null;

  const groupCode = match[1];
  const enrolled = parseInt(match[2], 10);
  const capacity = parseInt(match[3], 10);

  // Suy ra nhóm LT/BT từ groupCode
  const codeParts = groupCode.split('_');
  const theoryGroup = codeParts[0] || '';
  const practiceGroup = codeParts[1] || '';

  // Parse phần còn lại sau prefix đã match
  const rest = line.substring(match[0].length).trim();
  const tokens = rest.split(/\t|  +/).map((s) => s.trim()).filter((s) => s !== '');

  // Token đầu tiên thường là ngôn ngữ (V, TA, E, ...)
  const language = tokens.length > 0 ? tokens[0] : '';

  // Tìm sĩ số LT: số thuần cuối cùng trong tokens (thường là 80, 120, ...)
  let theoryCapacity = 0;
  let theoryInstructor = '';
  let practiceInstructor = '';

  for (let i = tokens.length - 1; i >= 1; i--) {
    if (/^\d+$/.test(tokens[i])) {
      theoryCapacity = parseInt(tokens[i], 10);
      break;
    }
  }

  // Nếu dữ liệu có tab → thử lấy instructor từ vị trí cột cố định
  if (line.includes('\t')) {
    const tabParts = line.split('\t');
    if (tabParts.length >= 5) {
      theoryInstructor = tabParts[4]?.trim() || '';
    }
    if (tabParts.length >= 7) {
      practiceInstructor = tabParts[6]?.trim() || '';
    }
  }

  return {
    groupCode,
    enrolled,
    capacity,
    language,
    theoryGroup,
    theoryInstructor,
    practiceGroup,
    practiceInstructor,
    theoryCapacity,
    schedules: [],
  };
}

/**
 * Parse dòng dữ liệu lịch học.
 * Hoạt động với cả tab-separated và space-separated data.
 *
 * Chiến lược pattern-based (không phụ thuộc vào vị trí cột):
 * 1. Ngày (Thứ N) → regex ở đầu dòng
 * 2. Tuần học → regex ở cuối dòng (chuỗi dài ≥10 ký tự chỉ gồm số và dấu -)
 * 3. Phòng → regex ở giữa (pattern chữ+số-số, ví dụ C6-509)
 * 4. Tiết → phần text giữa ngày và phòng (chứa "- - -" hoặc "2 3 4")
 * 5. Cơ sở → chữ số ngay sau phòng
 *
 * @param {string} line - Dòng dữ liệu lịch học
 * @returns {Schedule|null}
 */
function parseScheduleLine(line) {
  // ── 1. Ngày: "Thứ 4" ở đầu dòng ──
  const dayMatch = line.match(RE_SCHEDULE_DATA);
  if (!dayMatch) return null;
  const dayOfWeek = parseInt(dayMatch[1], 10);

  // ── 2. Tuần học: chuỗi dài ≥10 ký tự chỉ gồm số và - ở cuối dòng ──
  const weeksMatch = line.match(/([\d-]{10,})\s*$/);
  const rawWeeks = weeksMatch ? weeksMatch[1] : '';

  // ── 3. Phòng: pattern chữ+số-số (e.g., C6-509, B1-214, H6-708, A4-511) ──
  const afterDay = line.substring(dayMatch[0].length);
  const beforeWeeks = weeksMatch
    ? afterDay.substring(0, afterDay.lastIndexOf(weeksMatch[1]))
    : afterDay;

  const roomMatch = beforeWeeks.match(/([A-Za-z]\d+-\d+)/);
  let room = '';
  let rawPeriods = '';
  let campus = '';
  let practiceFlag = '';

  if (roomMatch) {
    const roomIdx = beforeWeeks.indexOf(roomMatch[0]);

    // ── 4. Tiết: mọi thứ giữa "Thứ N" và phòng ──
    rawPeriods = beforeWeeks.substring(0, roomIdx).trim();

    room = roomMatch[0];

    // ── 5. Sau phòng: cơ sở (1 chữ số) + optional BT/TN flag ──
    const afterRoom = beforeWeeks.substring(roomIdx + room.length).trim();
    const campusMatch = afterRoom.match(/^(\d)/);
    if (campusMatch) {
      campus = campusMatch[1];
      practiceFlag = afterRoom.substring(campusMatch[0].length).trim();
    }
  } else {
    rawPeriods = beforeWeeks.trim();
  }

  return {
    dayOfWeek,
    dayLabel: `Thứ ${dayOfWeek}`,
    periods: parsePeriods(rawPeriods),
    room,
    campus,
    practiceFlag,
    weeks: parseWeeks(rawWeeks),
    rawWeeks,
  };
}

// ──────────────────────────────────────────────
// Main parser
// ──────────────────────────────────────────────

/**
 * Parse toàn bộ dữ liệu đăng ký môn học từ text copy-paste.
 *
 * @param {string} rawText - Text được copy từ trang đăng ký môn học
 * @returns {ParseResult} Kết quả parse gồm danh sách courses và warnings
 */
function parseCourseData(rawText) {
  if (!rawText || !rawText.trim()) {
    return { courses: [], warnings: ['Dữ liệu đầu vào trống.'] };
  }

  const lines = rawText.split('\n');
  const courses = [];
  const warnings = [];

  /** @type {Course|null} */
  let currentCourse = null;
  /** @type {ClassGroup|null} */
  let currentGroup = null;

  for (let i = 0; i < lines.length; i++) {
    const line = normalizeLine(lines[i]);
    const trimmed = line.trim();

    // Bỏ qua dòng trống
    if (!trimmed) continue;

    // ── 1. Dòng header bảng môn học → bỏ qua ──
    if (RE_COURSE_TABLE_HEADER.test(trimmed)) {
      continue;
    }

    // ── 2. Dòng dữ liệu môn học → tạo course mới ──
    const courseMatch = trimmed.match(RE_COURSE_DATA);
    if (courseMatch) {
      currentCourse = {
        stt: parseInt(courseMatch[1], 10),
        code: courseMatch[2],
        name: courseMatch[3].trim(),
        credits: parseFloat(courseMatch[4]),
        type: courseMatch[5]?.trim() || '',
        classGroups: [],
      };
      courses.push(currentCourse);
      currentGroup = null;
      continue;
    }

    // ── 3. Dòng tiêu đề môn (lặp lại) → bỏ qua, hoặc tạo course nếu chưa có ──
    const titleMatch = trimmed.match(RE_COURSE_TITLE);
    if (titleMatch) {
      // Nếu chưa có course hiện tại hoặc code khác → tạo mới
      if (!currentCourse || currentCourse.code !== titleMatch[1]) {
        currentCourse = {
          stt: courses.length + 1,
          code: titleMatch[1],
          name: titleMatch[2].trim(),
          credits: 0,
          type: '',
          classGroups: [],
        };
        courses.push(currentCourse);
        currentGroup = null;
      }
      continue;
    }

    // ── 4. Dòng header bảng nhóm lớp → bỏ qua ──
    if (RE_GROUP_TABLE_HEADER.test(trimmed)) {
      continue;
    }

    // ── 5. Dòng header bảng lịch học → bỏ qua ──
    if (RE_SCHEDULE_HEADER.test(trimmed)) {
      if (typeof window !== 'undefined') console.log(`  [PARSE] Dòng ${i + 1}: ✓ SCHEDULE_HEADER (skip)`);
      continue;
    }

    // ── 6. Dòng dữ liệu lịch học → thêm vào group hiện tại ──
    if (RE_SCHEDULE_DATA.test(trimmed)) {
      if (typeof window !== 'undefined') console.log(`  [PARSE] Dòng ${i + 1}: ✓ SCHEDULE_DATA → parseScheduleLine...`);
      const schedule = parseScheduleLine(trimmed);
      if (typeof window !== 'undefined') console.log(`  [PARSE]   → schedule =`, schedule ? `OK (${schedule.dayLabel}, ${schedule.periods.length} tiết)` : 'NULL');
      if (typeof window !== 'undefined') console.log(`  [PARSE]   → currentGroup =`, currentGroup ? currentGroup.groupCode : 'NULL');
      if (schedule && currentGroup) {
        currentGroup.schedules.push(schedule);
        if (typeof window !== 'undefined') console.log(`  [PARSE]   → ADDED to ${currentGroup.groupCode} (now ${currentGroup.schedules.length} schedules)`);
      } else if (schedule && !currentGroup) {
        warnings.push(`Dòng ${i + 1}: Tìm thấy lịch học nhưng không có nhóm lớp: "${trimmed.substring(0, 60)}..."`);
      } else if (!schedule) {
        warnings.push(`Dòng ${i + 1}: Không parse được lịch học: "${trimmed.substring(0, 80)}"`);
      }
      continue;
    }

    // ── 7. Dòng dữ liệu nhóm lớp → tạo group mới ──
    if (RE_GROUP_DATA.test(trimmed)) {
      if (typeof window !== 'undefined') console.log(`  [PARSE] Dòng ${i + 1}: ✓ GROUP_DATA`);
      const group = parseGroupLine(trimmed);
      if (group && currentCourse) {
        currentCourse.classGroups.push(group);
        currentGroup = group;
      } else if (group && !currentCourse) {
        warnings.push(`Dòng ${i + 1}: Tìm thấy nhóm lớp nhưng không có môn học: "${trimmed.substring(0, 60)}..."`);
      }
      continue;
    }

    // ── 8. Dòng không nhận diện được → ghi warning (nếu có nội dung đáng kể) ──
    if (trimmed.length > 2 && !trimmed.match(/^\d+$/)) {
      if (typeof window !== 'undefined') {
        console.log(`  [PARSE] Dòng ${i + 1}: ❌ UNRECOGNIZED "${trimmed.substring(0, 60)}"`);
        // Debug: test each regex to see which ones fail
        console.log(`    STT: ${/^STT[\t\s]/.test(trimmed)}, CourseData: ${RE_COURSE_DATA.test(trimmed)}, Title: ${RE_COURSE_TITLE.test(trimmed)}, GroupH: ${RE_GROUP_TABLE_HEADER.test(trimmed)}, SchedH: ${RE_SCHEDULE_HEADER.test(trimmed)}, SchedD: ${RE_SCHEDULE_DATA.test(trimmed)}, GroupD: ${RE_GROUP_DATA.test(trimmed)}`);
        // Log char codes for first 10 chars
        console.log(`    CharCodes: ${[...trimmed.substring(0, 10)].map(c => c.charCodeAt(0).toString(16)).join(' ')}`);
      }
      // Bỏ qua các dòng quá ngắn hoặc chỉ có số (có thể là STT đứng riêng)
      warnings.push(`Dòng ${i + 1}: Không nhận diện được: "${trimmed.substring(0, 80)}"`);
    }
  }

  return { courses, warnings };
}

// ──────────────────────────────────────────────
// Utility / Display helpers
// ──────────────────────────────────────────────

/**
 * Kiểm tra 2 schedule có bị trùng thời gian (cùng ngày, cùng tiết, cùng tuần) hay không.
 *
 * @param {Schedule} s1
 * @param {Schedule} s2
 * @returns {boolean} true nếu bị trùng
 */
function hasTimeConflict(s1, s2) {
  // Khác ngày → không trùng
  if (s1.dayOfWeek !== s2.dayOfWeek) return false;

  // Kiểm tra trùng tiết
  const periodsOverlap = s1.periods.some((p) => s2.periods.includes(p));
  if (!periodsOverlap) return false;

  // Kiểm tra trùng tuần
  const weeksOverlap = s1.weeks.some((w) => s2.weeks.includes(w));
  return weeksOverlap;
}

/**
 * Kiểm tra 2 class group có bị trùng lịch hay không.
 *
 * @param {ClassGroup} g1
 * @param {ClassGroup} g2
 * @returns {{conflict: boolean, details: Array<{s1: Schedule, s2: Schedule}>}}
 */
function checkGroupConflict(g1, g2) {
  const conflicts = [];

  for (const s1 of g1.schedules) {
    for (const s2 of g2.schedules) {
      if (hasTimeConflict(s1, s2)) {
        conflicts.push({ s1, s2 });
      }
    }
  }

  return {
    conflict: conflicts.length > 0,
    details: conflicts,
  };
}

/**
 * Format schedule thành chuỗi dễ đọc.
 *
 * @param {Schedule} schedule
 * @returns {string} Ví dụ: "Thứ 4 | Tiết 8-12 | C6-509 (CS1) | Tuần 6,10,12,14"
 */
function formatSchedule(schedule) {
  const periodsStr =
    schedule.periods.length > 0
      ? `Tiết ${schedule.periods[0]}-${schedule.periods[schedule.periods.length - 1]}`
      : 'Không có tiết';

  const weeksStr =
    schedule.weeks.length > 0
      ? `Tuần ${formatWeekRanges(schedule.weeks)}`
      : 'Không có tuần';

  const campusStr = schedule.campus ? ` (CS${schedule.campus})` : '';
  const practiceStr = schedule.practiceFlag ? ` [${schedule.practiceFlag}]` : '';

  return `${schedule.dayLabel} | ${periodsStr} | ${schedule.room}${campusStr}${practiceStr} | ${weeksStr}`;
}

/**
 * Gom các tuần liên tiếp thành dạng range.
 *
 * Input:  [1, 2, 3, 4, 5, 6, 7, 9, 10, 11, 12, 13, 14, 15, 16]
 * Output: "1-7, 9-16"
 *
 * @param {number[]} weeks - Danh sách tuần (sorted)
 * @returns {string}
 */
function formatWeekRanges(weeks) {
  if (!weeks || weeks.length === 0) return '';

  const sorted = [...weeks].sort((a, b) => a - b);
  const ranges = [];
  let start = sorted[0];
  let end = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === end + 1) {
      end = sorted[i];
    } else {
      ranges.push(start === end ? `${start}` : `${start}-${end}`);
      start = sorted[i];
      end = sorted[i];
    }
  }
  ranges.push(start === end ? `${start}` : `${start}-${end}`);

  return ranges.join(', ');
}

/**
 * In tóm tắt kết quả parse ra console (dùng cho debug).
 *
 * @param {ParseResult} result
 */
function printParseSummary(result) {
  console.log('═══════════════════════════════════════════');
  console.log(`📚 Tổng số môn học: ${result.courses.length}`);
  console.log('═══════════════════════════════════════════');

  for (const course of result.courses) {
    console.log(`\n📖 [${course.code}] ${course.name} — ${course.credits} tín chỉ ${course.type ? `(${course.type})` : ''}`);
    console.log(`   Số nhóm lớp: ${course.classGroups.length}`);

    for (const group of course.classGroups) {
      const fullStatus = group.enrolled >= group.capacity ? '🔴 ĐẦY' : '🟢 CÒN CHỖ';
      console.log(`\n   ┌─ Nhóm ${group.groupCode} [${group.enrolled}/${group.capacity}] ${fullStatus}`);
      console.log(`   │  Ngôn ngữ: ${group.language === 'V' ? '🇻🇳 Tiếng Việt' : '🇬🇧 Tiếng Anh'}`);
      console.log(`   │  LT: ${group.theoryGroup || '—'}${group.theoryInstructor ? ` (${group.theoryInstructor})` : ''} | BT: ${group.practiceGroup || '—'}${group.practiceInstructor ? ` (${group.practiceInstructor})` : ''}`);
      console.log(`   │  Sĩ số LT: ${group.theoryCapacity}`);

      for (const schedule of group.schedules) {
        console.log(`   │  📅 ${formatSchedule(schedule)}`);
      }

      console.log(`   └──────────────────────────────────`);
    }
  }

  if (result.warnings.length > 0) {
    console.log('\n⚠️  Cảnh báo:');
    for (const w of result.warnings) {
      console.log(`   - ${w}`);
    }
  }
}

// ──────────────────────────────────────────────
// Exports
// ──────────────────────────────────────────────

// Support both ES modules and CommonJS
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    parseCourseData,
    parsePeriods,
    parseWeeks,
    hasTimeConflict,
    checkGroupConflict,
    formatSchedule,
    formatWeekRanges,
    printParseSummary,
  };
}

// Also export for browser usage
if (typeof window !== 'undefined') {
  window.CourseParser = {
    PARSER_VERSION,
    parseCourseData,
    parsePeriods,
    parseWeeks,
    hasTimeConflict,
    checkGroupConflict,
    formatSchedule,
    formatWeekRanges,
    printParseSummary,
  };
}
