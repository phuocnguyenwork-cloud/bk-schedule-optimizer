/**
 * BK Schedule Optimizer — Data Modeling, Constraints & Objective Functions
 * 
 * File này định nghĩa:
 * 1. Mô hình hóa dữ liệu (Bitmasking cho Tiết học, Tuần học, Thứ học)
 * 2. Biến quyết định và biểu diễn giải pháp (Assignments)
 * 3. Kiểm tra các ràng buộc cứng (Hard Constraints - Không trùng lịch, chọn đủ môn)
 * 4. Các hàm tính điểm tiêu chí tối ưu mềm (Soft Constraints / Objective Functions)
 * 
 * Lưu ý: File này CHƯA chứa thuật toán giải (Solver/Backtracking), 
 * chỉ đóng vai trò là tầng mô hình toán học (Model layer).
 */

(function (global) {
  'use strict';

  // ──────────────────────────────────────────────
  // 1. DATA MODELING & BITMASK HELPERS
  // ──────────────────────────────────────────────

  /**
   * Chuyển đổi mảng tiết học thành Bitmask (12 bits cho tiết 1 - 12).
   * Ví dụ: [8, 9, 10] -> bit 8, 9, 10 bật -> (1 << 7) | (1 << 8) | (1 << 9)
   * 
   * @param {number[]} periods - Mảng tiết học (1-based)
   * @returns {number} Bitmask đại diện cho các tiết học
   */
  function periodsToBitmask(periods) {
    if (!Array.isArray(periods)) return 0;
    let mask = 0;
    for (let i = 0; i < periods.length; i++) {
      const p = periods[i];
      if (p >= 1 && p <= 16) {
        mask |= (1 << (p - 1));
      }
    }
    return mask;
  }

  /**
   * Chuyển đổi mảng tuần học thành Bitmask (tối đa 32 tuần).
   * Ví dụ: [1, 2, 3] -> bit 1, 2, 3 bật -> (1 << 0) | (1 << 1) | (1 << 2)
   * 
   * @param {number[]} weeks - Mảng tuần học (1-based)
   * @returns {number} Bitmask đại diện cho các tuần học
   */
  function weeksToBitmask(weeks) {
    if (!Array.isArray(weeks)) return 0;
    let mask = 0;
    for (let i = 0; i < weeks.length; i++) {
      const w = weeks[i];
      if (w >= 1 && w <= 30) {
        mask |= (1 << (w - 1));
      }
    }
    return mask;
  }

  /**
   * Kiểm tra xem môn học có phải là môn chuyên ngành hay không.
   * Quy tắc mặc định:
   * - Môn chuyên ngành thường có tiền tố khoa: CO (Máy tính), EE (Điện), ME (Cơ khí),
   *   CE (Xây dựng), CH (Hóa), IM (QLCN), v.v.
   * - Môn đại cương / không ngành: MT/MATH (Toán), PH/PHYS (Vật lý), SP/POL (Chính trị/Mác-Lênin),
   *   PE (Thể dục), MIL (Quân sự), EN/FL (Ngoại ngữ), MS (Khoa học vật liệu)...
   *
   * @param {string} courseCode - Mã môn học, ví dụ "CO3093", "MT1003"
   * @returns {boolean} true nếu là môn ngành, false nếu là môn không ngành
   */
  function isMajorCourse(courseCode) {
    if (!courseCode || typeof courseCode !== 'string') return false;
    const code = courseCode.toUpperCase().trim();

    // Danh sách tiền tố môn đại cương / không thuộc chuyên ngành
    const generalPrefixes = ['MT', 'MATH', 'PH', 'PHYS', 'CH', 'SP', 'POL', 'PE', 'MIL', 'EN', 'FL', 'LA'];
    for (let i = 0; i < generalPrefixes.length; i++) {
      if (code.startsWith(generalPrefixes[i])) {
        return false;
      }
    }

    // Tiền tố khoa chuyên ngành tiêu biểu (CO, EE, ME, CE, IM, ...)
    const majorPrefixes = ['CO', 'EE', 'ME', 'CE', 'IM', 'TR', 'GE', 'EN', 'AS', 'BT'];
    for (let i = 0; i < majorPrefixes.length; i++) {
      if (code.startsWith(majorPrefixes[i])) {
        return true;
      }
    }

    // Mặc định nếu không thuộc nhóm đại cương thì xem là môn ngành
    return true;
  }

  /**
   * Chuẩn hóa dữ liệu từ Parser thành mô hình tối ưu (Model Format).
   * Gắn kèm bitmask và phân loại môn ngành để thuật toán kiểm tra nhanh.
   * 
   * @param {Object} course - Object môn học từ parser.js
   * @returns {Object} OptimizedCourse
   */
  function modelCourse(course) {
    const isMajor = isMajorCourse(course.code);

    const modeledGroups = (course.classGroups || []).map((group, groupIdx) => {
      const modeledSchedules = (group.schedules || []).map((sched) => {
        return {
          dayOfWeek: sched.dayOfWeek,             // 2 .. 8
          dayLabel: sched.dayLabel,
          periodMask: periodsToBitmask(sched.periods), // Bitmask tiết
          weekMask: weeksToBitmask(sched.weeks),       // Bitmask tuần
          periods: sched.periods || [],
          weeks: sched.weeks || [],
          room: sched.room || '',
          campus: sched.campus || '',
        };
      });

      return {
        id: `${course.code}_${group.groupCode}_${groupIdx}`,
        courseCode: course.code,
        courseName: course.name,
        groupCode: group.groupCode,
        isMajor: isMajor,
        credits: course.credits || 0,
        schedules: modeledSchedules,
        rawGroup: group,
      };
    });

    return {
      courseCode: course.code,
      courseName: course.name,
      credits: course.credits || 0,
      isMajor: isMajor,
      classGroups: modeledGroups,
    };
  }

  // ──────────────────────────────────────────────
  // 2. HARD CONSTRAINTS (RÀNG BUỘC CỨNG)
  // ──────────────────────────────────────────────

  /**
   * Ràng buộc 2.1: Kiểm tra xung đột thời gian giữa 2 buổi học.
   * Hai buổi học xung đột khi: Cùng Thứ VÀ Trùng Tiết VÀ Trùng Tuần.
   * 
   * @param {Object} s1 - Buổi học 1
   * @param {Object} s2 - Buổi học 2
   * @returns {boolean} true nếu bị trùng/xung đột lịch
   */
  function hasScheduleConflict(s1, s2) {
    // 1. Phải cùng thứ
    if (s1.dayOfWeek !== s2.dayOfWeek) {
      return false;
    }

    // 2. Phải có ít nhất 1 tiết trùng nhau (phép AND bitmask > 0)
    if ((s1.periodMask & s2.periodMask) === 0) {
      return false;
    }

    // 3. Phải có ít nhất 1 tuần học trùng nhau (phép AND bitmask > 0)
    if ((s1.weekMask & s2.weekMask) === 0) {
      return false;
    }

    return true; // Trùng cả thứ, tiết và tuần
  }

  /**
   * Ràng buộc 2.2: Kiểm tra thời gian di chuyển giữa 2 cơ sở khác nhau trong cùng một ngày.
   * Quy tắc: Nếu 2 buổi học diễn ra trong cùng 1 ngày, có tuần học chung,
   * nhưng ở 2 cơ sở khác nhau (ví dụ: Cơ sở 1 - Q.10 và Cơ sở 2 - Dĩ An)
   * thì khoảng cách giữa 2 ca học phải tối thiểu 2 giờ (tương đương cách nhau ít nhất 2 tiết).
   * 
   * Ví dụ:
   * - Ca 1 kết thúc tiết 3 ở CS1, Ca 2 bắt đầu tiết 4 ở CS2 (cách 0 tiết) -> XUNG ĐỘT (< 2 tiết).
   * - Ca 1 kết thúc tiết 3 ở CS1, Ca 2 bắt đầu tiết 5 ở CS2 (cách 1 tiết 4) -> XUNG ĐỘT (< 2 tiết).
   * - Ca 1 kết thúc tiết 3 ở CS1, Ca 2 bắt đầu tiết 6 ở CS2 (cách 2 tiết 4, 5) -> HỢP LỆ (>= 2 tiết).
   * 
   * @param {Object} s1 - Buổi học 1
   * @param {Object} s2 - Buổi học 2
   * @param {number} [minGapPeriods=2] - Số tiết trống tối thiểu giữa 2 cơ sở (mặc định 2 tiết)
   * @returns {boolean} true nếu vi phạm (không đủ thời gian di chuyển)
   */
  function hasCampusTravelConflict(s1, s2, minGapPeriods = 2) {
    // 1. Phải cùng thứ
    if (s1.dayOfWeek !== s2.dayOfWeek) {
      return false;
    }

    // 2. Phải có ít nhất 1 tuần học trùng nhau
    if ((s1.weekMask & s2.weekMask) === 0) {
      return false;
    }

    // 3. Phải ở 2 cơ sở khác nhau và đều có thông tin cơ sở xác định
    const c1 = String(s1.campus || '').trim();
    const c2 = String(s2.campus || '').trim();
    if (!c1 || !c2 || c1 === c2) {
      return false;
    }

    // 4. Nếu 1 trong 2 buổi không có tiết học thì không xét
    if (!s1.periods || !s1.periods.length || !s2.periods || !s2.periods.length) {
      return false;
    }

    const min1 = Math.min(...s1.periods);
    const max1 = Math.max(...s1.periods);
    const min2 = Math.min(...s2.periods);
    const max2 = Math.max(...s2.periods);

    // Nếu s1 diễn ra trước s2
    if (max1 < min2) {
      const gap = min2 - max1 - 1; // Số tiết trống giữa 2 ca
      if (gap < minGapPeriods) {
        return true; // Không đủ 2 tiết trống
      }
    }
    // Nếu s2 diễn ra trước s1
    else if (max2 < min1) {
      const gap = min1 - max2 - 1;
      if (gap < minGapPeriods) {
        return true; // Không đủ 2 tiết trống
      }
    }
    // Trùng hoặc lồng tiết nhau
    else {
      return true;
    }

    return false;
  }

  /**
   * Ràng buộc 2.3: Kiểm tra xung đột giữa 2 nhóm lớp bất kỳ.
   * Xung đột xảy ra khi:
   * 1. Trùng lịch học (cùng thứ, tiết, tuần), HOẶC
   * 2. Không đủ thời gian di chuyển giữa 2 cơ sở khác nhau trong cùng ngày (cách nhau < 2 tiết).
   * 
   * @param {Object} groupA - Modeled ClassGroup A
   * @param {Object} groupB - Modeled ClassGroup B
   * @returns {boolean} true nếu 2 nhóm lớp xung đột
   */
  function hasGroupConflict(groupA, groupB) {
    for (let i = 0; i < groupA.schedules.length; i++) {
      const sA = groupA.schedules[i];
      for (let j = 0; j < groupB.schedules.length; j++) {
        const sB = groupB.schedules[j];
        // Kiểm tra trùng lịch trực tiếp
        if (hasScheduleConflict(sA, sB)) {
          return true;
        }
        // Kiểm tra thời gian di chuyển giữa 2 cơ sở
        if (hasCampusTravelConflict(sA, sB, 2)) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Ràng buộc 2.4: Kiểm tra tính hợp lệ toàn cục của một giải pháp (Assignment).
   * Giải pháp hợp lệ khi:
   * 1. Không có 2 nhóm lớp nào bị trùng lịch.
   * 2. Không có 2 ca học ở 2 cơ sở khác nhau trong cùng ngày bị cách nhau < 2 tiết.
   * 
   * @param {Object[]} selectedGroups - Danh sách các nhóm lớp được chọn
   * @returns {{ valid: boolean, conflictReason?: string }}
   */
  function validateAssignment(selectedGroups) {
    if (!Array.isArray(selectedGroups)) {
      return { valid: false, conflictReason: 'Dữ liệu không hợp lệ' };
    }

    for (let i = 0; i < selectedGroups.length; i++) {
      const gA = selectedGroups[i];

      // Kiểm tra xung đột nội bộ trong chính nhóm lớp (nếu có)
      for (let si = 0; si < gA.schedules.length; si++) {
        for (let sj = si + 1; sj < gA.schedules.length; sj++) {
          if (hasScheduleConflict(gA.schedules[si], gA.schedules[sj])) {
            return {
              valid: false,
              conflictReason: `Trùng lịch nội bộ trong nhóm ${gA.courseCode} (${gA.groupCode})`
            };
          }
          if (hasCampusTravelConflict(gA.schedules[si], gA.schedules[sj], 2)) {
            return {
              valid: false,
              conflictReason: `Không đủ thời gian di chuyển giữa 2 cơ sở trong nội bộ nhóm ${gA.courseCode} (${gA.groupCode})`
            };
          }
        }
      }

      // Kiểm tra xung đột với các nhóm lớp khác
      for (let j = i + 1; j < selectedGroups.length; j++) {
        const gB = selectedGroups[j];
        for (let si = 0; si < gA.schedules.length; si++) {
          const sA = gA.schedules[si];
          for (let sj = 0; sj < gB.schedules.length; sj++) {
            const sB = gB.schedules[sj];

            if (hasScheduleConflict(sA, sB)) {
              return {
                valid: false,
                conflictReason: `Trùng lịch học giữa môn ${gA.courseCode} (${gA.groupCode}) và môn ${gB.courseCode} (${gB.groupCode}) vào Thứ ${sA.dayOfWeek}`
              };
            }

            if (hasCampusTravelConflict(sA, sB, 2)) {
              return {
                valid: false,
                conflictReason: `Không đủ thời gian di chuyển (cần cách ít nhất 2 tiết) giữa môn ${gA.courseCode} (${gA.groupCode} - CS${sA.campus}) và môn ${gB.courseCode} (${gB.groupCode} - CS${sB.campus}) vào Thứ ${sA.dayOfWeek}`
              };
            }
          }
        }
      }
    }

    return { valid: true };
  }

  // ──────────────────────────────────────────────
  // 3. OBJECTIVE FUNCTIONS & CRITERIA SCORING (TIÊU CHÍ TỐI ƯU MỀM)
  // ──────────────────────────────────────────────

  /**
   * Lấy tập hợp các ngày trong tuần có lịch học từ danh sách nhóm lớp đã chọn.
   * @param {Object[]} selectedGroups 
   * @returns {Set<number>} Set các thứ (2..8)
   */
  function getActiveDays(selectedGroups) {
    const days = new Set();
    for (let i = 0; i < selectedGroups.length; i++) {
      const g = selectedGroups[i];
      for (let j = 0; j < g.schedules.length; j++) {
        if (g.schedules[j].periods.length > 0) {
          days.add(g.schedules[j].dayOfWeek);
        }
      }
    }
    return days;
  }

  /**
   * Tiêu chí 1: Số ngày học trong tuần ít nhất (Gom ngày).
   * Điểm cao nhất khi số ngày học ít nhất.
   * Công thức: Điểm = 7 - (số ngày học thực tế).
   * 
   * @param {Object[]} selectedGroups 
   * @returns {number} Điểm (0 đến 6)
   */
  function scoreFewestDays(selectedGroups) {
    const daysCount = getActiveDays(selectedGroups).size;
    if (daysCount === 0) return 0;
    return (7 - daysCount) * 10;
  }

  /**
   * Tiêu chí 2: Số ngày học trong tuần nhiều nhất (Dàn trải đều).
   * Điểm cao nhất khi số ngày học nhiều nhất.
   * Công thức: Điểm = số ngày học thực tế.
   * 
   * @param {Object[]} selectedGroups 
   * @returns {number} Điểm (0 đến 7)
   */
  function scoreMostDays(selectedGroups) {
    const daysCount = getActiveDays(selectedGroups).size;
    return daysCount * 10;
  }

  /**
   * Tiêu chí 3: Ưu tiên các ngày đầu tuần (Thứ 2, 3, 4).
   * Trọng số ngày: Thứ 2 (6), Thứ 3 (5), Thứ 4 (4), Thứ 5 (3), Thứ 6 (2), Thứ 7 (1), CN (0).
   * Mỗi tiết học rơi vào ngày đó sẽ cộng điểm tương ứng với trọng số của ngày.
   * 
   * @param {Object[]} selectedGroups 
   * @returns {number} Điểm
   */
  function scoreEarlyWeek(selectedGroups) {
    const dayWeights = { 2: 6, 3: 5, 4: 4, 5: 3, 6: 2, 7: 1, 8: 0 };
    let totalScore = 0;

    for (let i = 0; i < selectedGroups.length; i++) {
      const g = selectedGroups[i];
      for (let j = 0; j < g.schedules.length; j++) {
        const s = g.schedules[j];
        const w = dayWeights[s.dayOfWeek] || 0;
        totalScore += s.periods.length * w;
      }
    }
    return totalScore;
  }

  /**
   * Tiêu chí 4: Ưu tiên các ngày cuối tuần (Thứ 5, 6, 7, CN).
   * Trọng số ngày: Thứ 2 (0), Thứ 3 (1), Thứ 4 (2), Thứ 5 (3), Thứ 6 (4), Thứ 7 (5), CN (6).
   * 
   * @param {Object[]} selectedGroups 
   * @returns {number} Điểm
   */
  function scoreLateWeek(selectedGroups) {
    const dayWeights = { 2: 0, 3: 1, 4: 2, 5: 3, 6: 4, 7: 5, 8: 6 };
    let totalScore = 0;

    for (let i = 0; i < selectedGroups.length; i++) {
      const g = selectedGroups[i];
      for (let j = 0; j < g.schedules.length; j++) {
        const s = g.schedules[j];
        const w = dayWeights[s.dayOfWeek] || 0;
        totalScore += s.periods.length * w;
      }
    }
    return totalScore;
  }

  /**
   * Tiêu chí 5: Ưu tiên buổi sáng (Tiết 1 đến tiết 6).
   * Cộng 1 điểm cho mỗi tiết học nằm trong khoảng [1, 6].
   * 
   * @param {Object[]} selectedGroups 
   * @returns {number} Số lượng tiết sáng
   */
  function scoreMorning(selectedGroups) {
    let morningPeriods = 0;
    for (let i = 0; i < selectedGroups.length; i++) {
      const g = selectedGroups[i];
      for (let j = 0; j < g.schedules.length; j++) {
        const periods = g.schedules[j].periods;
        for (let k = 0; k < periods.length; k++) {
          if (periods[k] >= 1 && periods[k] <= 6) {
            morningPeriods++;
          }
        }
      }
    }
    return morningPeriods * 2;
  }

  /**
   * Tiêu chí 6: Ưu tiên buổi trưa/chiều (Tiết 7 đến tiết 12).
   * Cộng 1 điểm cho mỗi tiết học nằm trong khoảng [7, 12].
   * 
   * @param {Object[]} selectedGroups 
   * @returns {number} Số lượng tiết chiều
   */
  function scoreAfternoon(selectedGroups) {
    let afternoonPeriods = 0;
    for (let i = 0; i < selectedGroups.length; i++) {
      const g = selectedGroups[i];
      for (let j = 0; j < g.schedules.length; j++) {
        const periods = g.schedules[j].periods;
        for (let k = 0; k < periods.length; k++) {
          if (periods[k] >= 7 && periods[k] <= 12) {
            afternoonPeriods++;
          }
        }
      }
    }
    return afternoonPeriods * 2;
  }

  /**
   * Hàm phụ trợ: Tính khoảng cách tiết trống giữa các môn trong cùng 1 ngày
   * theo nhóm môn (môn ngành hoặc không ngành).
   * 
   * @param {Object[]} selectedGroups 
   * @param {boolean} targetIsMajor - true: xét môn ngành, false: xét môn không ngành
   * @returns {number} Điểm phạt thời gian trống (càng trống nhiều càng âm)
   */
  function calculateGapPenaltyForCategory(selectedGroups, targetIsMajor) {
    // Gom các ca học theo từng ngày: dayOfWeek -> list of { periods, courseCode }
    const dayMap = {};

    for (let i = 0; i < selectedGroups.length; i++) {
      const g = selectedGroups[i];
      if (g.isMajor !== targetIsMajor) continue;

      for (let j = 0; j < g.schedules.length; j++) {
        const s = g.schedules[j];
        if (s.periods.length === 0) continue;

        if (!dayMap[s.dayOfWeek]) {
          dayMap[s.dayOfWeek] = [];
        }

        dayMap[s.dayOfWeek].push({
          minPeriod: Math.min(...s.periods),
          maxPeriod: Math.max(...s.periods),
          courseCode: g.courseCode,
        });
      }
    }

    let totalGap = 0;
    let bonusContiguous = 0;

    // Xét từng ngày
    for (const d in dayMap) {
      const sessions = dayMap[d];
      if (sessions.length < 2) continue; // Chỉ 1 ca thì không có khoảng cách

      // Sắp xếp các ca theo thứ tự tiết bắt đầu
      sessions.sort((a, b) => a.minPeriod - b.minPeriod);

      for (let i = 0; i < sessions.length - 1; i++) {
        const currentEnd = sessions[i].maxPeriod;
        const nextStart = sessions[i + 1].minPeriod;
        const gap = nextStart - currentEnd - 1;

        if (gap === 0) {
          // Liền kề nhau -> Thưởng điểm
          bonusContiguous += 10;
        } else if (gap > 0) {
          // Trống tiết ở giữa -> Phạt điểm tỉ lệ với số tiết trống
          totalGap += gap;
        }
      }
    }

    // Điểm = Điểm thưởng liền kề - Điểm phạt khoảng trống
    return bonusContiguous - (totalGap * 5);
  }

  /**
   * Tiêu chí 7: Các môn chuyên ngành gần nhau.
   * Ưu tiên các môn chuyên ngành trong cùng một ngày được học liền kề hoặc ít trống tiết.
   * 
   * @param {Object[]} selectedGroups 
   * @returns {number} Điểm
   */
  function scoreCloseMajorCourses(selectedGroups) {
    return calculateGapPenaltyForCategory(selectedGroups, true);
  }

  /**
   * Tiêu chí 8: Các môn không chuyên ngành gần nhau.
   * Ưu tiên các môn đại cương / không ngành học liền kề hoặc ít trống tiết.
   * 
   * @param {Object[]} selectedGroups 
   * @returns {number} Điểm
   */
  function scoreCloseNonMajorCourses(selectedGroups) {
    return calculateGapPenaltyForCategory(selectedGroups, false);
  }

  // ──────────────────────────────────────────────
  // 4. COMPOSITE SCORING (TỔNG HỢP ĐIỂM)
  // ──────────────────────────────────────────────

  /**
   * Bảng ánh xạ hàm tính điểm cho từng tiêu chí
   */
  const SCORING_FUNCTIONS = {
    critFewestDays: scoreFewestDays,
    critMostDays: scoreMostDays,
    critEarlyWeek: scoreEarlyWeek,
    critLateWeek: scoreLateWeek,
    critMorning: scoreMorning,
    critAfternoon: scoreAfternoon,
    critClose: scoreCloseMajorCourses,
    critFar: scoreCloseNonMajorCourses,
  };

  /**
   * Tính tổng điểm số cho một phương án lịch học dựa trên các tiêu chí được chọn.
   * 
   * @param {Object[]} selectedGroups - Danh sách các nhóm lớp đã chọn
   * @param {Object.<string, boolean|number>} activeCriteria - Trạng thái tick của các checkbox
   * @returns {{ totalScore: number, breakdown: Object.<string, number> }}
   */
  function evaluateSchedule(selectedGroups, activeCriteria) {
    let totalScore = 0;
    const breakdown = {};

    for (const critKey in SCORING_FUNCTIONS) {
      if (activeCriteria && activeCriteria[critKey]) {
        const weight = typeof activeCriteria[critKey] === 'number' ? activeCriteria[critKey] : 1;
        const scoreFn = SCORING_FUNCTIONS[critKey];
        const rawScore = scoreFn(selectedGroups);
        const weightedScore = rawScore * weight;

        breakdown[critKey] = weightedScore;
        totalScore += weightedScore;
      }
    }

    return {
      totalScore,
      breakdown,
    };
  }

  // ──────────────────────────────────────────────
  // 5. SOLVER ENGINE — Backtracking (DFS) + Branch & Prune
  // ──────────────────────────────────────────────

  /**
   * Kiểm tra nhanh xem một nhóm lớp mới có xung đột với bất kỳ nhóm lớp
   * nào đã chọn trước đó hay không (incremental check).
   * 
   * Thay vì gọi validateAssignment() trên toàn bộ danh sách mỗi lần,
   * ta chỉ kiểm tra nhóm mới vs. tất cả nhóm đã chọn → O(k) thay vì O(k²).
   * 
   * @param {Object} newGroup - Nhóm lớp mới muốn thêm vào
   * @param {Object[]} selectedGroups - Các nhóm lớp đã chọn trước đó
   * @returns {boolean} true nếu hợp lệ (không xung đột), false nếu xung đột
   */
  function canAddGroup(newGroup, selectedGroups) {
    for (let i = 0; i < selectedGroups.length; i++) {
      if (hasGroupConflict(newGroup, selectedGroups[i])) {
        return false;
      }
    }
    return true;
  }

  /**
   * Thuật toán giải lịch học tối ưu bằng Backtracking (DFS) kết hợp Branch & Prune.
   * 
   * Mô tả thuật toán:
   * ─────────────────
   * 1. Mô hình hóa (Modeling):
   *    - Input: Mảng các Course đã parse (từ parser.js).
   *    - Mỗi Course có nhiều ClassGroup (nhóm lớp). Ta cần chọn đúng 1 nhóm/môn.
   *    - Gọi modelCourse() để gắn bitmask cho mỗi schedule.
   * 
   * 2. Duyệt tổ hợp (DFS Backtracking):
   *    - Duyệt đệ quy qua từng môn (courseIndex = 0, 1, ..., N-1).
   *    - Tại mỗi bước: thử lần lượt từng classGroup của môn hiện tại.
   *    - Kiểm tra ràng buộc cứng với canAddGroup() (pruning): 
   *      nếu xung đột → bỏ qua nhánh này (Branch & Prune).
   *    - Nếu hợp lệ → đệ quy tiếp cho môn tiếp theo.
   *    - Khi đã chọn đủ N môn → thu thập giải pháp hợp lệ.
   * 
   * 3. Chấm điểm & xếp hạng (Ranking):
   *    - Duyệt qua tất cả giải pháp hợp lệ, tính Total_Score(L) bằng evaluateSchedule().
   *    - Sắp xếp giảm dần theo totalScore.
   *    - Trả về top K kết quả (mặc định top 10).
   * 
   * @param {Object[]} allCourses - Mảng các Course thô từ parser (chưa model)
   * @param {Object.<string, boolean|number>} activeCriteria - Tiêu chí đánh giá
   * @param {Object} [options={}] - Tùy chọn
   * @param {number} [options.maxSolutions=500] - Số giải pháp tối đa tìm kiếm
   * @param {number} [options.topK=10] - Số kết quả top trả về
   * @param {number} [options.timeoutMs=10000] - Thời gian tối đa (ms)
   * @returns {{ 
   *   results: Array<{ groups: Object[], totalScore: number, breakdown: Object, rank: number }>,
   *   stats: { totalValid: number, totalExplored: number, elapsedMs: number, timedOut: boolean }
   * }}
   */
  function solveSchedule(allCourses, activeCriteria, options = {}) {
    const maxSolutions = options.maxSolutions || 500;
    const topK = options.topK || 10;
    const timeoutMs = options.timeoutMs || 10000;

    const startTime = Date.now();

    // ── Bước 1: Mô hình hóa tất cả các Course ──
    const modeledCourses = allCourses.map(c => modelCourse(c));

    // Nếu không có môn nào → trả về rỗng
    if (modeledCourses.length === 0) {
      return {
        results: [],
        stats: { totalValid: 0, totalExplored: 0, elapsedMs: 0, timedOut: false }
      };
    }

    // ── Bước 2: DFS Backtracking ──
    const validSolutions = [];  // Chứa tất cả giải pháp hợp lệ
    let totalExplored = 0;      // Tổng số nhánh đã duyệt (bao gồm bị cắt)
    let timedOut = false;

    /**
     * Hàm đệ quy Backtracking.
     * @param {number} courseIdx - Index của môn đang xét (0..N-1)
     * @param {Object[]} currentSelection - Danh sách nhóm lớp đã chọn
     */
    function backtrack(courseIdx, currentSelection) {
      // Kiểm tra timeout
      if (Date.now() - startTime > timeoutMs) {
        timedOut = true;
        return;
      }

      // Kiểm tra đã tìm đủ số giải pháp tối đa chưa
      if (validSolutions.length >= maxSolutions) {
        return;
      }

      // ── Base case: Đã chọn xong tất cả các môn ──
      if (courseIdx === modeledCourses.length) {
        // Đây là một giải pháp hợp lệ → lưu lại (clone selection)
        validSolutions.push([...currentSelection]);
        return;
      }

      const course = modeledCourses[courseIdx];
      const groups = course.classGroups;

      // ── Recursive case: Thử từng nhóm lớp của môn hiện tại ──
      for (let g = 0; g < groups.length; g++) {
        totalExplored++;

        const candidateGroup = groups[g];

        // ── Branch & Prune: Kiểm tra ràng buộc cứng ──
        // Nếu nhóm mới xung đột với bất kỳ nhóm đã chọn → cắt nhánh
        if (!canAddGroup(candidateGroup, currentSelection)) {
          continue; // Prune: bỏ qua nhánh này
        }

        // Hợp lệ → thêm vào danh sách chọn và đệ quy tiếp
        currentSelection.push(candidateGroup);
        backtrack(courseIdx + 1, currentSelection);
        currentSelection.pop(); // Backtrack: gỡ nhóm vừa thêm

        // Thoát sớm nếu đã đạt giới hạn
        if (validSolutions.length >= maxSolutions || timedOut) {
          return;
        }
      }
    }

    // Bắt đầu DFS từ môn đầu tiên
    backtrack(0, []);

    const elapsedMs = Date.now() - startTime;

    // ── Bước 3: Chấm điểm & Xếp hạng ──
    const scoredResults = validSolutions.map((groups) => {
      const { totalScore, breakdown } = evaluateSchedule(groups, activeCriteria);
      return {
        groups,       // Danh sách các nhóm lớp trong giải pháp
        totalScore,   // Tổng điểm
        breakdown,    // Chi tiết điểm từng tiêu chí
      };
    });

    // Sắp xếp giảm dần theo totalScore
    scoredResults.sort((a, b) => b.totalScore - a.totalScore);

    // Gán rank và cắt lấy top K
    const topResults = scoredResults.slice(0, topK).map((result, idx) => ({
      ...result,
      rank: idx + 1,
    }));

    return {
      results: topResults,
      stats: {
        totalValid: validSolutions.length,
        totalExplored,
        elapsedMs,
        timedOut,
      },
    };
  }

  // ──────────────────────────────────────────────
  // 6. PUBLIC EXPORTS
  // ──────────────────────────────────────────────

  const BKOptimizerModel = {
    // Model helpers
    periodsToBitmask,
    weeksToBitmask,
    isMajorCourse,
    modelCourse,

    // Hard constraints
    hasScheduleConflict,
    hasCampusTravelConflict,
    hasGroupConflict,
    validateAssignment,
    canAddGroup,

    // Soft constraints (Criteria scoring)
    scoreFewestDays,
    scoreMostDays,
    scoreEarlyWeek,
    scoreLateWeek,
    scoreMorning,
    scoreAfternoon,
    scoreCloseMajorCourses,
    scoreCloseNonMajorCourses,

    // Composite evaluation
    evaluateSchedule,
    SCORING_FUNCTIONS,

    // Solver
    solveSchedule,
  };

  // Hỗ trợ môi trường Browser lẫn Node.js/Test
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = BKOptimizerModel;
  }
  if (typeof window !== 'undefined') {
    window.BKOptimizerModel = BKOptimizerModel;
  }

})(typeof window !== 'undefined' ? window : global);
