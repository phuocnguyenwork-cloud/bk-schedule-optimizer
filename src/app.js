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

// Make functions available globally for inline onclick handlers
window.selectCourse = selectCourse;
window.removeCourse = removeCourse;
window.toggleGroup = toggleGroup;
