/**
 * BK Schedule Optimizer — Frontend Application Logic
 * Handles UI interactions, course management, and parse result rendering.
 */

// ──────────────────────────────────────────────
// State
// ──────────────────────────────────────────────

/** @type {import('./parser.js').Course[]} */
const allCourses = [];

/** @type {number|null} Index of currently selected course for detail view */
let activeCourseIndex = null;

// ──────────────────────────────────────────────
// DOM Elements
// ──────────────────────────────────────────────

const $input = document.getElementById('courseInput');
const $btnParse = document.getElementById('btnParse');
const $btnClear = document.getElementById('btnClear');
const $btnSample = document.getElementById('btnSample');
const $warnings = document.getElementById('warnings');
const $warningsList = document.getElementById('warningsList');
const $coursesSection = document.getElementById('coursesSection');
const $coursesList = document.getElementById('coursesList');
const $resultSection = document.getElementById('resultSection');
const $resultTitle = document.getElementById('resultTitle');
const $resultDesc = document.getElementById('resultDesc');
const $resultContent = document.getElementById('resultContent');
const $headerStats = document.getElementById('headerStats');
const $btnCollapseResult = document.getElementById('btnCollapseResult');

const $filterA = document.getElementById('filterA');
const $filterCC = document.getElementById('filterCC');
const $filterL = document.getElementById('filterL');
const $filterTN = document.getElementById('filterTN');

const $optimizeSection = document.getElementById('optimizeSection');
const $btnOptimize = document.getElementById('btnOptimize');

// ──────────────────────────────────────────────
// Sample Data
// ──────────────────────────────────────────────

const SAMPLE_DATA = `STT\t\tMã MH\tTên MH\tSố tín chỉ\tBB/TC\t
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
Thứ 5\t- - - - - - - 8 9 10 11 12 - - - -\tC6-103\t1\t\t------7-9-1-3-----------------`;

// ──────────────────────────────────────────────
// Event Listeners
// ──────────────────────────────────────────────

$input.addEventListener('input', () => {
  const hasData = $input.value.trim().length > 0;
  $btnParse.disabled = !hasData;
  if (hasData) {
    $input.classList.add('textarea--has-data');
  } else {
    $input.classList.remove('textarea--has-data');
  }
});

$btnParse.addEventListener('click', handleParse);
$btnClear.addEventListener('click', handleClear);
$btnSample.addEventListener('click', handleSample);
$btnCollapseResult.addEventListener('click', () => {
  $resultSection.style.display = 'none';
  activeCourseIndex = null;
  renderCoursesList(); // update active state
});

[$filterA, $filterCC, $filterL, $filterTN].forEach(el => {
  if (el) {
    el.addEventListener('change', () => {
      if (activeCourseIndex !== null) {
        renderCourseDetail(activeCourseIndex);
      }
    });
  }
});

// Allow Ctrl+Enter to parse
$input.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && !$btnParse.disabled) {
    handleParse();
  }
});

// ──────────────────────────────────────────────
// Handlers
// ──────────────────────────────────────────────

function handleParse() {
  const raw = $input.value.trim();
  if (!raw) return;



  // ── DEBUG: Log phân tích dữ liệu đầu vào ──
  const lines = raw.split('\n');
  console.group('🔍 DEBUG: Phân tích dữ liệu đầu vào');
  console.log(`Tổng dòng: ${lines.length}`);
  lines.slice(0, 15).forEach((line, i) => {
    const tabCount = (line.match(/\t/g) || []).length;
    const maxSpaces = Math.max(...(line.match(/ +/g) || ['']).map(s => s.length));
    const hasTab = tabCount > 0;
    console.log(`  Dòng ${i + 1}: tabs=${tabCount} maxSpaces=${maxSpaces} ${hasTab ? '✅TAB' : '⚠️SPACE'} | "${line.substring(0, 80)}"`);
  });
  console.groupEnd();

  const result = window.CourseParser.parseCourseData(raw);

  // ── DEBUG: Log kết quả parse ──
  console.group('📊 DEBUG: Kết quả parse');
  console.log(`Courses: ${result.courses.length}, Warnings: ${result.warnings.length}`);
  result.courses.forEach(c => {
    console.log(`  ${c.code}: ${c.classGroups.length} nhóm`);
    c.classGroups.forEach(g => {
      console.log(`    ${g.groupCode}: ${g.schedules.length} schedules`);
      g.schedules.forEach(s => {
        console.log(`      ${s.dayLabel} | Tiết ${s.periods.join(',')} | ${s.room} (CS${s.campus})`);
      });
    });
  });
  if (result.warnings.length > 0) {
    console.log('⚠️ Warnings:');
    result.warnings.forEach(w => console.log(`  ${w}`));
  }
  console.groupEnd();



  // Show warnings
  if (result.warnings.length > 0) {
    $warnings.style.display = 'block';
    $warningsList.innerHTML = result.warnings
      .map((w) => `<li>${escapeHtml(w)}</li>`)
      .join('');
  } else {
    $warnings.style.display = 'none';
  }

  // Add parsed courses
  if (result.courses.length === 0) {
    showToast('Không tìm thấy môn học nào trong dữ liệu!', true);
    return;
  }

  let addedCount = 0;
  for (const course of result.courses) {
    // Check duplicate
    const exists = allCourses.find((c) => c.code === course.code);
    if (exists) {
      showToast(`Môn ${course.code} đã tồn tại! hihi Bỏ qua.`, true);
      allCourses.pop(course);
      allCourses.push(course);

      continue;
    }
    allCourses.push(course);
    addedCount++;
  }

  if (addedCount > 0) {
    showToast(`✅ Đã thêm ${addedCount} môn học (${result.courses.reduce((s, c) => s + c.classGroups.length, 0)} nhóm lớp)`);

    // Clear input
    $input.value = '';
    $input.classList.remove('textarea--has-data');
    $btnParse.disabled = true;

    // Show and render courses
    renderCoursesList();
    updateHeaderStats();

    // Auto-show detail of the last added course
    activeCourseIndex = allCourses.length - 1;
    renderCourseDetail(activeCourseIndex);
    renderCoursesList();
  }
}

function handleClear() {
  $input.value = '';
  $input.classList.remove('textarea--has-data');
  $btnParse.disabled = true;
  $warnings.style.display = 'none';
}

function handleSample() {
  $input.value = SAMPLE_DATA;
  $input.classList.add('textarea--has-data');
  $btnParse.disabled = false;
  $input.focus();
  showToast('Đã điền dữ liệu mẫu. Nhấn "Phân tích dữ liệu" để tiếp tục.');
}

// ──────────────────────────────────────────────
// Renderers
// ──────────────────────────────────────────────

function renderCoursesList() {
  if (allCourses.length === 0) {
    $coursesSection.style.display = 'none';
    if ($optimizeSection) $optimizeSection.style.display = 'none';
    return;
  }

  $coursesSection.style.display = 'block';
  if ($optimizeSection) $optimizeSection.style.display = 'block';

  $coursesList.innerHTML = allCourses
    .map((course, idx) => {
      const isActive = idx === activeCourseIndex;
      const groupCount = course.classGroups.length;
      const availCount = course.classGroups.filter((g) => g.enrolled < g.capacity).length;

      return `
        <div class="course-chip ${isActive ? 'course-chip--active' : ''} fade-in" 
             onclick="selectCourse(${idx})" 
             data-idx="${idx}">
          <div class="course-chip__info">
            <span class="course-chip__code">${escapeHtml(course.code)}</span>
            <span class="course-chip__name">${escapeHtml(course.name)}</span>
          </div>
          <div class="course-chip__meta">
            <span class="course-chip__badge badge--credits">${course.credits} TC</span>
            <span class="course-chip__badge badge--groups">${availCount}/${groupCount} nhóm còn chỗ</span>
            <button class="btn btn--small btn--danger" onclick="event.stopPropagation(); removeCourse(${idx})" title="Xóa môn này">✕</button>
          </div>
        </div>
      `;
    })
    .join('');
}

function renderCourseDetail(idx) {
  const course = allCourses[idx];
  if (!course) return;

  const showA = $filterA ? $filterA.checked : true;
  const showCC = $filterCC ? $filterCC.checked : true;
  const showL = $filterL ? $filterL.checked : true;
  const showTN = $filterTN ? $filterTN.checked : true;

  const filteredGroups = course.classGroups.filter((group) => {
    const gc = group.groupCode;
    if (gc.startsWith('CC')) return showCC;
    if (gc.startsWith('A')) return showA;
    if (gc.startsWith('L')) return showL;
    if (gc.startsWith('TN')) return showTN;
    return true; // Hiển thị các nhóm có tiền tố lạ không nằm trong tiêu chí
  });

  $resultSection.style.display = 'block';
  $resultTitle.textContent = `${course.code} — ${course.name}`;
  $resultDesc.textContent = `${course.credits} tín chỉ • Có ${course.classGroups.length} nhóm lớp (Đang hiển thị ${filteredGroups.length})`;

  if (filteredGroups.length === 0) {
    $resultContent.innerHTML = '<div class="empty-state">Không có nhóm lớp nào khớp với bộ lọc.</div>';
    return;
  }

  $resultContent.innerHTML = filteredGroups
    .map((group, gIdx) => {
      const isFull = group.enrolled >= group.capacity;
      const capacityClass = isFull ? 'capacity--full' : 'capacity--avail';
      const capacityIcon = isFull ? '🔴' : '🟢';
      const langClass = group.language === 'V' ? 'lang--vi' : 'lang--en';
      const langLabel = group.language === 'V' ? 'VN' : 'EN';

      const scheduleRows = group.schedules
        .map((s) => {
          const periodsStr = s.periods.length > 0
            ? `${s.periods[0]}-${s.periods[s.periods.length - 1]}`
            : '—';
          const weeksStr = window.CourseParser.formatWeekRanges(s.weeks);

          return `
            <tr>
              <td class="td-day">${escapeHtml(s.dayLabel)}</td>
              <td class="td-periods">Tiết ${periodsStr}</td>
              <td class="td-room">${escapeHtml(s.room)}</td>
              <td>CS${escapeHtml(s.campus)}</td>
              <td class="td-weeks">Tuần ${escapeHtml(weeksStr)}</td>
            </tr>
          `;
        })
        .join('');

      return `
        <div class="group-card fade-in" id="group-${idx}-${gIdx}">
          <div class="group-card__header" onclick="toggleGroup('group-${idx}-${gIdx}')">
            <div class="group-card__left">
              <span class="group-card__code">${escapeHtml(group.groupCode)}</span>
              <span class="group-card__lang ${langClass}">${langLabel}</span>
              <span class="group-card__lt-bt">LT: ${escapeHtml(group.theoryGroup)} | BT: ${escapeHtml(group.practiceGroup)}</span>
            </div>
            <div class="group-card__right">
              <span class="group-card__capacity ${capacityClass}">
                ${capacityIcon} ${group.enrolled}/${group.capacity}
              </span>
              <span class="group-card__arrow">▶</span>
            </div>
          </div>
          <div class="group-card__body">
            <table class="schedule-table">
              <thead>
                <tr>
                  <th>Thứ</th>
                  <th>Tiết</th>
                  <th>Phòng</th>
                  <th>CS</th>
                  <th>Tuần học</th>
                </tr>
              </thead>
              <tbody>
                ${scheduleRows}
              </tbody>
            </table>
          </div>
        </div>
      `;
    })
    .join('');

  // Smooth scroll to result
  $resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function updateHeaderStats() {
  const totalCourses = allCourses.length;
  const totalGroups = allCourses.reduce((s, c) => s + c.classGroups.length, 0);
  const totalCredits = allCourses.reduce((s, c) => s + c.credits, 0);

  if (totalCourses === 0) {
    $headerStats.innerHTML = '';
    return;
  }

  $headerStats.innerHTML = `
    <div class="stat-chip">
      📚 <span class="stat-chip__value">${totalCourses}</span> môn
    </div>
    <div class="stat-chip">
      📝 <span class="stat-chip__value">${totalCredits}</span> TC
    </div>
    <div class="stat-chip">
      👥 <span class="stat-chip__value">${totalGroups}</span> nhóm
    </div>
  `;
}

// ──────────────────────────────────────────────
// Actions
// ──────────────────────────────────────────────

function selectCourse(idx) {
  activeCourseIndex = idx;
  renderCourseDetail(idx);
  renderCoursesList();
}

function removeCourse(idx) {
  const course = allCourses[idx];
  allCourses.splice(idx, 1);

  if (activeCourseIndex === idx) {
    activeCourseIndex = null;
    $resultSection.style.display = 'none';
  } else if (activeCourseIndex !== null && activeCourseIndex > idx) {
    activeCourseIndex--;
  }

  renderCoursesList();
  updateHeaderStats();
  showToast(`Đã xóa môn ${course.code}`);
}

function toggleGroup(id) {
  const el = document.getElementById(id);
  if (el) {
    el.classList.toggle('group-card--expanded');
  }
}

// ──────────────────────────────────────────────
// Utilities
// ──────────────────────────────────────────────

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function showToast(message, isError = false) {
  // Remove existing toast
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = `toast ${isError ? 'toast--error' : ''}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => toast.remove(), 3000);
}

// ──────────────────────────────────────────────
// Optimize Handler
// ──────────────────────────────────────────────


if ($btnOptimize) {
  $btnOptimize.addEventListener('click', handleOptimize);
}

function handleOptimize() {
  if (allCourses.length === 0) {
    showToast('Vui lòng thêm ít nhất 1 môn học trước khi tối ưu!', true);
    return;
  }

  // Thu thập tiêu chí đã chọn
  const criteriaIds = [
    'critFewestDays', 'critMostDays', 'critEarlyWeek', 'critLateWeek',
    'critMorning', 'critAfternoon', 'critClose', 'critFar'
  ];
  const activeCriteria = {};
  let hasCriteria = false;
  for (const id of criteriaIds) {
    const el = document.getElementById(id);
    if (el && el.checked) {
      activeCriteria[id] = 1;
      hasCriteria = true;
    }
  }

  if (!hasCriteria) {
    showToast('Vui lòng chọn ít nhất 1 tiêu chí tối ưu!', true);
    return;
  }

  // Disable nút trong lúc chạy
  $btnOptimize.disabled = true;
  $btnOptimize.innerHTML = '<span class="btn__icon">⏳</span> Đang tối ưu...';

  // Chạy solver (dùng setTimeout để UI kịp update)
  setTimeout(() => {
    try {
      const result = window.BKOptimizerModel.solveSchedule(allCourses, activeCriteria, {
        maxSolutions: 500,
        topK: 10,
        timeoutMs: 15000,
      });

      console.group('🧠 DEBUG: Kết quả Solver');
      console.log(`Tổng giải pháp hợp lệ: ${result.stats.totalValid}`);
      console.log(`Tổng nhánh đã duyệt: ${result.stats.totalExplored}`);
      console.log(`Thời gian: ${result.stats.elapsedMs}ms`);
      console.log(`Timeout: ${result.stats.timedOut}`);
      console.log(`Top ${result.results.length} kết quả:`);
      result.results.forEach(r => {
        console.log(`  #${r.rank}: Score=${r.totalScore}`, r.breakdown,
          r.groups.map(g => `${g.courseCode}(${g.groupCode})`).join(', '));
      });
      console.groupEnd();

      renderOptimizeResults(result);

    } catch (err) {
      console.error('Solver error:', err);
      showToast('Lỗi khi chạy thuật toán tối ưu: ' + err.message, true);
    } finally {
      $btnOptimize.disabled = false;
      $btnOptimize.innerHTML = '<span class="btn__icon">✨</span> Tối ưu lịch học';
    }
  }, 50);
}

// ──────────────────────────────────────────────
// Optimize Result Renderers
// ──────────────────────────────────────────────

/** @type {number|null} Index of currently selected schedule result */
let activeResultIndex = 0;

function renderOptimizeResults(solverResult) {
  // Tạo hoặc lấy container kết quả
  let $optimizeResult = document.getElementById('optimizeResultSection');
  if (!$optimizeResult) {
    $optimizeResult = document.createElement('section');
    $optimizeResult.id = 'optimizeResultSection';
    $optimizeResult.className = 'card card--optimize-result';
    $optimizeSection.parentNode.insertBefore($optimizeResult, $optimizeSection.nextSibling);
  }

  const { results, stats } = solverResult;

  if (results.length === 0) {
    $optimizeResult.innerHTML = `
      <div class="card__header">
        <span class="step-badge">4</span>
        <div>
          <h2 class="card__title">Kết quả tối ưu</h2>
          <p class="card__desc">Không tìm thấy giải pháp hợp lệ nào!</p>
        </div>
      </div>
      <div class="optimize-empty">
        <div class="optimize-empty__icon">😢</div>
        <p>Không có tổ hợp nhóm lớp nào thỏa mãn tất cả ràng buộc cứng (trùng lịch, di chuyển cơ sở).</p>
        <p class="optimize-empty__hint">Thử giảm bớt số môn hoặc kiểm tra lại dữ liệu đầu vào.</p>
      </div>
    `;
    $optimizeResult.style.display = 'block';
    $optimizeResult.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }

  // Thống kê
  const statsHtml = `
    <div class="optimize-stats">
      <div class="stat-chip stat-chip--solver">
        🔍 <span class="stat-chip__value">${stats.totalValid}</span> lịch hợp lệ
      </div>
      <div class="stat-chip stat-chip--solver">
        🌿 <span class="stat-chip__value">${stats.totalExplored.toLocaleString()}</span> nhánh duyệt
      </div>
      <div class="stat-chip stat-chip--solver">
        ⏱️ <span class="stat-chip__value">${stats.elapsedMs}</span>ms
      </div>
      ${stats.timedOut ? '<div class="stat-chip stat-chip--warning">⚠️ Timeout — kết quả chưa đầy đủ</div>' : ''}
    </div>
  `;

  // Thanh chọn phương án (Tab bar)
  const tabsHtml = results.map((r, i) => `
    <button class="result-tab ${i === 0 ? 'result-tab--active' : ''}" 
            onclick="selectResult(${i})" 
            data-result-idx="${i}">
      <span class="result-tab__rank">#${r.rank}</span>
      <span class="result-tab__score">${r.totalScore.toFixed(1)} điểm</span>
    </button>
  `).join('');

  $optimizeResult.innerHTML = `
    <div class="card__header">
      <span class="step-badge">4</span>
      <div>
        <h2 class="card__title">Kết quả tối ưu</h2>
        <p class="card__desc">Tìm thấy ${stats.totalValid} lịch hợp lệ. Hiển thị Top ${results.length}.</p>
      </div>
    </div>
    ${statsHtml}
    <div class="result-tabs" id="resultTabs">
      ${tabsHtml}
    </div>
    <div class="result-detail" id="optimizeResultDetail">
      <!-- Rendered by selectResult() -->
    </div>
  `;

  // Lưu results vào window để selectResult truy cập
  window._solverResults = results;
  activeResultIndex = 0;

  $optimizeResult.style.display = 'block';
  renderResultDetail(0);
  $optimizeResult.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function selectResult(idx) {
  activeResultIndex = idx;

  // Update tab active state
  const tabs = document.querySelectorAll('.result-tab');
  tabs.forEach((tab, i) => {
    tab.classList.toggle('result-tab--active', i === idx);
  });

  renderResultDetail(idx);
}

function renderResultDetail(idx) {
  const results = window._solverResults;
  if (!results || !results[idx]) return;

  const result = results[idx];
  const $detail = document.getElementById('optimizeResultDetail');
  if (!$detail) return;

  // Bảng phân tích điểm
  const CRITERIA_LABELS = {
    critFewestDays: '📅 Số ngày học ít nhất',
    critMostDays: '📅 Số ngày học nhiều nhất',
    critEarlyWeek: '🌅 Ưu tiên đầu tuần',
    critLateWeek: '🌆 Ưu tiên cuối tuần',
    critMorning: '☀️ Ưu tiên buổi sáng',
    critAfternoon: '🌙 Ưu tiên buổi chiều',
    critClose: '🔗 Môn ngành gần nhau',
    critFar: '🔗 Môn không ngành gần nhau',
  };

  const breakdownRows = Object.entries(result.breakdown)
    .map(([key, val]) => `
      <tr>
        <td>${CRITERIA_LABELS[key] || key}</td>
        <td class="td-score ${val >= 0 ? 'score--positive' : 'score--negative'}">${val >= 0 ? '+' : ''}${val.toFixed(1)}</td>
      </tr>
    `).join('');

  // Danh sách nhóm lớp được chọn
  const groupsList = result.groups.map(g => `
    <div class="selected-group">
      <span class="selected-group__code">${escapeHtml(g.courseCode)}</span>
      <span class="selected-group__name">${escapeHtml(g.courseName)}</span>
      <span class="selected-group__group badge--groups">${escapeHtml(g.groupCode)}</span>
    </div>
  `).join('');

  // Timetable Grid
  const timetableHtml = renderTimetableGrid(result.groups);

  $detail.innerHTML = `
    <div class="result-detail__header">
      <h3 class="result-detail__title">Phương án #${result.rank}</h3>
      <div class="result-detail__total-score">
        Tổng điểm: <strong>${result.totalScore.toFixed(1)}</strong>
      </div>
    </div>

    <div class="result-detail__grid">
      <!-- Left: Timetable -->
      <div class="result-detail__timetable">
        <h4>📋 Lịch học theo tuần</h4>
        ${timetableHtml}
      </div>

      <!-- Right: Analysis -->
      <div class="result-detail__analysis">
        <h4>📊 Phân tích điểm</h4>
        <table class="breakdown-table">
          <thead><tr><th>Tiêu chí</th><th>Điểm</th></tr></thead>
          <tbody>${breakdownRows}</tbody>
          <tfoot>
            <tr>
              <td><strong>Tổng</strong></td>
              <td class="td-score"><strong>${result.totalScore.toFixed(1)}</strong></td>
            </tr>
          </tfoot>
        </table>

        <h4>🎯 Nhóm lớp được chọn</h4>
        <div class="selected-groups-list">
          ${groupsList}
        </div>
      </div>
    </div>
  `;
}

/**
 * Render lưới thời khóa biểu (Timetable Grid) từ danh sách nhóm lớp.
 * Cột: Thứ 2 → CN (7 cột). Hàng: Tiết 1 → 12/16.
 */
function renderTimetableGrid(groups) {
  // Xác định max tiết (thường 12, nhưng check 16)
  let maxPeriod = 12;
  const grid = {}; // key: "day_period" → { courseCode, groupCode, room, campus, color }

  // Bảng màu cho mỗi môn
  const courseColors = {};
  const COLOR_PALETTE = [
    '#4f8cff', '#ff6b6b', '#51cf66', '#ffd43b', '#cc5de8', 
    '#ff922b', '#22b8cf', '#f06595', '#7950f2', '#20c997'
  ];
  let colorIdx = 0;

  for (const g of groups) {
    if (!courseColors[g.courseCode]) {
      courseColors[g.courseCode] = COLOR_PALETTE[colorIdx % COLOR_PALETTE.length];
      colorIdx++;
    }
    const color = courseColors[g.courseCode];

    for (const s of g.schedules) {
      for (const p of s.periods) {
        if (p > maxPeriod) maxPeriod = p;
        const key = `${s.dayOfWeek}_${p}`;
        grid[key] = {
          courseCode: g.courseCode,
          groupCode: g.groupCode,
          room: s.room,
          campus: s.campus,
          color,
        };
      }
    }
  }

  const days = [
    { num: 2, label: 'T2' }, { num: 3, label: 'T3' }, { num: 4, label: 'T4' },
    { num: 5, label: 'T5' }, { num: 6, label: 'T6' }, { num: 7, label: 'T7' },
    { num: 8, label: 'CN' },
  ];

  let html = '<table class="timetable">';
  html += '<thead><tr><th class="timetable__period-header">Tiết</th>';
  for (const d of days) {
    html += `<th class="timetable__day-header">${d.label}</th>`;
  }
  html += '</tr></thead><tbody>';

  for (let p = 1; p <= maxPeriod; p++) {
    html += `<tr><td class="timetable__period-cell">${p}</td>`;
    for (const d of days) {
      const key = `${d.num}_${p}`;
      const cell = grid[key];
      if (cell) {
        html += `<td class="timetable__cell timetable__cell--filled" style="background-color: ${cell.color}20; border-left: 3px solid ${cell.color};">
          <div class="timetable__course-code" style="color: ${cell.color}">${escapeHtml(cell.courseCode)}</div>
          <div class="timetable__cell-detail">${escapeHtml(cell.groupCode)}</div>
          <div class="timetable__cell-detail">${escapeHtml(cell.room)} CS${escapeHtml(cell.campus)}</div>
        </td>`;
      } else {
        html += '<td class="timetable__cell timetable__cell--empty"></td>';
      }
    }
    html += '</tr>';
  }

  html += '</tbody></table>';
  return html;
}

// Make functions available globally for inline onclick handlers
window.selectCourse = selectCourse;
window.removeCourse = removeCourse;
window.toggleGroup = toggleGroup;
window.selectResult = selectResult;

