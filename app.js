"use strict";

let DATA = [];
let VILLAGES_COST = [];
let currentSelected = null;
let dataLoaded = false;
let villagesCostLoaded = false;

let calendarViewDate = new Date();
let selectedCalendarDateKey = "";
let selectedCalendarDate = new Date();

const $ = id => document.getElementById(id);

const searchInput = $("searchInput");
const clearBtn = $("clearBtn");
const resultList = $("resultList");
const resultCount = $("resultCount");
const detailSection = $("detailSection");
const detailEmpty = $("detailEmpty");
const detailBox = $("detailBox");
const detailCommand = $("detailCommand");
const todayBadge = $("todayBadge");
const detailTitle = $("detailTitle");
const scheduleView = $("scheduleView");
const detailDescription = $("detailDescription");
const detailMedia = $("detailMedia");
const quickButtons = $("quickButtons");
const toast = $("toast");

const copyBtn = $("copyBtn");
const rawToggleBtn = $("rawToggleBtn");

const imageLightbox = $("imageLightbox");
const imageLightboxImg = $("imageLightboxImg");
const imageLightboxClose = $("imageLightboxClose");
const imageLightboxPrev = $("imageLightboxPrev");
const imageLightboxNext = $("imageLightboxNext");
const imageLightboxCounter = $("imageLightboxCounter");

let lightboxImages = [];
let lightboxIndex = 0;
let lightboxTouchStartX = 0;
let lightboxTouchEndX = 0;

const calendarTitle = $("calendarTitle");
const calendarSubtitle = $("calendarSubtitle");
const calendarGrid = $("calendarGrid");
const prevMonthBtn = $("prevMonthBtn");
const todayBtn = $("todayBtn");
const nextMonthBtn = $("nextMonthBtn");

if (copyBtn) copyBtn.style.display = "none";
if (rawToggleBtn) rawToggleBtn.style.display = "none";

const pad2 = number => String(number).padStart(2, "0");

const escapeHtml = text => String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const getDateKey = date => `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
const getDisplayDate = date => `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
const getWeekdayCommandByDate = date => date.getDay() === 0 ? "/7" : `/${date.getDay()}`;
const getWeekdayNameByDate = date => ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"][date.getDay()];
const getShortWeekdayNameByDate = date => ["日", "一", "二", "三", "四", "五", "六"][date.getDay()];

const normalizeText = text => String(text)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "")
    .replace(/^\/+/, "")
    .replace(/週/g, "周")
    .replace(/禮拜/g, "星期")
    .replace(/拜/g, "星期")
    .replace(/星期天/g, "星期日")
    .replace(/周天/g, "周日")
    .replace(/金鎚/g, "金槌")
    .replace(/金錘/g, "金槌")
    .replace(/攀爬/g, "攀登")
    .replace(/\/+/g, "");

const findItemByCommand = command => DATA.find(item => normalizeText(item.command) === normalizeText(command));

const resetDetailView = () => {
    detailEmpty.style.display = "block";
    detailBox.classList.remove("show");
    detailDescription.innerHTML = "";
    detailDescription.style.display = "none";
    detailDescription.classList.remove("show");
    scheduleView.innerHTML = "";
    detailMedia.innerHTML = "";
    detailMedia.classList.remove("media-thumb-grid", "media-grid");
};

const linkifyText = text => escapeHtml(text || "").replace(
    /(https?:\/\/[^\s<]+)/g,
    url => `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`
);

const normalizeTime = time => {
    const [hour, minute] = String(time).split(":");
    return `${pad2(Number(hour))}:${pad2(Number(minute))}`;
};

const getUpdateText = text => {
    const match = String(text || "").match(/(\d{4}\/\d{1,2}更新|\d{4}\/\d{1,2})/);
    return match ? match[1] : "";
};

const removeUpdateText = text => String(text || "")
    .replace(/\d{4}\/\d{1,2}更新/g, "")
    .replace(/\d{4}\/\d{1,2}/g, "")
    .trim();

const renderLinkButton = item => {
    if (!item.link) return "";

    const label = item.linkLabel || "開啟連結";

    return `
        <div class="link-button-wrap">
            <a class="link-button" href="${escapeHtml(item.link)}" target="_blank" rel="noopener noreferrer">
                ${escapeHtml(label)}
            </a>
        </div>
    `;
};

async function loadData() {
    try {
        resultList.innerHTML = `<div class="loading-box">資料載入中...<br />正在讀取 <strong>data.json</strong></div>`;
        resultCount.textContent = "載入中";

        const [dataResponse, villagesResponse] = await Promise.all([
            fetch("data.json", { cache: "no-store" }),
            fetch("villages_cost.json", { cache: "no-store" })
        ]);

        if (!dataResponse.ok) {
            throw new Error(`無法載入 data.json，HTTP 狀態碼：${dataResponse.status}`);
        }

        if (!villagesResponse.ok) {
            throw new Error(`無法載入 villages_cost.json，HTTP 狀態碼：${villagesResponse.status}`);
        }

        const jsonData = await dataResponse.json();
        const villagesCostData = await villagesResponse.json();

        if (!Array.isArray(jsonData)) {
            throw new Error("data.json 格式錯誤：最外層必須是陣列 []");
        }

        if (!Array.isArray(villagesCostData)) {
            throw new Error("villages_cost.json 格式錯誤：最外層必須是陣列 []");
        }

        DATA = jsonData.map(item => ({
            command: item.command || "",
            title: item.title || "",
            type: item.type || "",
            description: item.description || "",
            image: item.image || "",
            images: Array.isArray(item.images) ? item.images : [],
            video: item.video || "",
            videos: Array.isArray(item.videos) ? item.videos : [],
            link: item.link || "",
            linkLabel: item.linkLabel || ""
        }));

        VILLAGES_COST = villagesCostData.map(item => ({
            編號: Number(item.編號),
            名稱: item.名稱 || "",
            成本: item.成本 || ""
        })).filter(item => Number.isFinite(item.編號));

        dataLoaded = true;
        villagesCostLoaded = true;

        renderResults();
    } catch (error) {
        dataLoaded = false;
        villagesCostLoaded = false;
        DATA = [];
        VILLAGES_COST = [];

        resultList.innerHTML = `
            <div class="error-box">
                <strong>資料載入失敗</strong><br />
                請確認 <code>data.json</code> 與 <code>villages_cost.json</code> 是否存在，且 JSON 格式正確。<br />
                <span>${escapeHtml(error.message)}</span>
            </div>
        `;

        resultCount.textContent = "0 筆";
    }
}

function renderCalendar() {
    const year = calendarViewDate.getFullYear();
    const month = calendarViewDate.getMonth();
    const today = new Date();
    const todayKey = getDateKey(today);
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const cells = [];

    calendarTitle.textContent = `${year} 年 ${month + 1} 月`;
    calendarSubtitle.textContent = `今天：${getDisplayDate(today)}（${getWeekdayNameByDate(today)}）`;

    for (let i = 0; i < firstDay.getDay(); i += 1) {
        cells.push(`<div class="calendar-day empty"></div>`);
    }

    for (let day = 1; day <= lastDay.getDate(); day += 1) {
        const date = new Date(year, month, day);
        const dateKey = getDateKey(date);
        const command = getWeekdayCommandByDate(date);
        const weekName = getShortWeekdayNameByDate(date);
        const classNames = ["calendar-day"];

        if (dateKey === todayKey) classNames.push("today");
        if (dateKey === selectedCalendarDateKey) classNames.push("selected");

        cells.push(`
            <button class="${classNames.join(" ")}" type="button"
                data-date-key="${dateKey}"
                data-command="${command}"
                data-year="${year}"
                data-month="${month}"
                data-day="${day}">
                <span class="calendar-day-number">${day}</span>
                <span class="calendar-day-week">週${weekName}</span>
            </button>
        `);
    }

    calendarGrid.innerHTML = cells.join("");

    calendarGrid.querySelectorAll(".calendar-day:not(.empty)").forEach(button => {
        button.addEventListener("click", () => {
            const { command, dateKey } = button.dataset;
            const date = new Date(Number(button.dataset.year), Number(button.dataset.month), Number(button.dataset.day));

            selectedCalendarDate = date;
            selectedCalendarDateKey = dateKey;

            renderCalendar();

            selectWeekdayCommand(command, {
                updateSearch: true,
                scrollToDetail: true,
                toastMessage: `${getDisplayDate(date)} ${getWeekdayNameByDate(date)}`
            });
        });
    });
}

const goPrevMonth = () => {
    calendarViewDate = new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() - 1, 1);
    renderCalendar();
};

const goNextMonth = () => {
    calendarViewDate = new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() + 1, 1);
    renderCalendar();
};

function goToday() {
    const today = new Date();

    calendarViewDate = new Date(today.getFullYear(), today.getMonth(), 1);
    selectedCalendarDate = today;
    selectedCalendarDateKey = getDateKey(today);

    renderCalendar();

    selectTodayWeekday({
        updateSearch: true,
        scrollToDetail: true
    });
}

function selectWeekdayCommand(command, options = {}) {
    const item = findItemByCommand(command);

    if (!item) {
        showToast(`找不到 ${command} 的資料`);
        return;
    }

    if (options.updateSearch) {
        searchInput.value = command;
    }

    currentSelected = item;
    renderResults();
    selectItem(item, false, options.scrollToDetail ?? false);

    if (options.toastMessage) {
        showToast(options.toastMessage);
    }
}

function selectTodayWeekday(options = {}) {
    const today = new Date();
    const command = getWeekdayCommandByDate(today);
    const hasToastMessage = Object.prototype.hasOwnProperty.call(options, "toastMessage");

    selectedCalendarDate = today;
    selectedCalendarDateKey = getDateKey(today);

    renderCalendar();

    selectWeekdayCommand(command, {
        updateSearch: options.updateSearch ?? false,
        scrollToDetail: options.scrollToDetail ?? false,
        toastMessage: hasToastMessage ? options.toastMessage : `今日活動：${command}`
    });
}

const normalizeWeekdayLine = line => {
    const map = {
        星期一: "週一", 禮拜一: "週一", 周一: "週一", 週一: "週一",
        星期二: "週二", 禮拜二: "週二", 周二: "週二", 週二: "週二",
        星期三: "週三", 禮拜三: "週三", 周三: "週三", 週三: "週三",
        星期四: "週四", 禮拜四: "週四", 周四: "週四", 週四: "週四",
        星期五: "週五", 禮拜五: "週五", 周五: "週五", 週五: "週五",
        星期六: "週六", 禮拜六: "週六", 周六: "週六", 週六: "週六",
        星期日: "週日", 星期天: "週日", 禮拜日: "週日", 禮拜天: "週日", 周日: "週日", 週日: "週日"
    };

    return map[String(line || "").trim()] || "";
};

const getHammerStatus = note => {
    const value = String(note || "");

    if (/✅|有出|有金槌|有鎚|有槌/.test(value)) return "good";
    if (/❌|無鎚|無槌|沒有/.test(value)) return "bad";

    return "normal";
};

function parseHammerSummary(lines) {
    const result = { title: "", good: [], bad: [] };
    let mode = "";

    lines.forEach(line => {
        if (/^🎯/.test(line)) {
            result.title = line;
            return;
        }

        if (/^✅/.test(line)) {
            mode = "good";
            return;
        }

        if (/^❌/.test(line)) {
            mode = "bad";
            return;
        }

        if (mode === "good") result.good.push(line);
        if (mode === "bad") result.bad.push(line);
    });

    return result;
}

function parseWeeklyScheduleDescription(description) {
    const lines = String(description || "").split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    const titleLines = [];
    const weekNames = ["週一", "週二", "週三", "週四", "週五", "週六", "週日"];
    const weekMap = new Map(weekNames.map(day => [day, []]));
    let currentDay = "";

    lines.forEach(line => {
        const normalizedDay = normalizeWeekdayLine(line);

        if (normalizedDay) {
            currentDay = normalizedDay;
            return;
        }

        const eventMatch = line.match(/^(\d{1,2}:\d{2})\s*(?:開始)?(?:[，,]\s*持續\s*(\d+)\s*(分鐘|分|Min|mins|min|小時|H|Hr|hrs))?\s*(.*)$/i);

        if (eventMatch && currentDay) {
            const [, rawTime, amount = "", unit = "", rawNote = ""] = eventMatch;
            let note = rawNote.trim().replace(/^開始\s*/, "").trim();
            let durationText = "";

            if (amount && unit) {
                durationText = `${amount}${unit}`;

                if (/分鐘|分|Min|mins|min/i.test(unit)) durationText = `${amount}Min`;
                if (/小時|H|Hr|hrs/i.test(unit)) durationText = `${amount}H`;
            }

            weekMap.get(currentDay).push({
                time: normalizeTime(rawTime),
                durationText,
                note
            });

            return;
        }

        if (!currentDay) titleLines.push(line);
    });

    return {
        title: titleLines.join(" "),
        weekMap
    };
}

function parseHammerScheduleDescription(description) {
    const lines = String(description || "").split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    const titleLines = [];
    const weekNames = ["週一", "週二", "週三", "週四", "週五", "週六", "週日"];
    const weekMap = new Map(weekNames.map(day => [day, []]));
    const summaryLines = [];
    let currentDay = "";
    let summaryMode = false;

    lines.forEach(line => {
        if (/^🎯/.test(line)) {
            summaryMode = true;
            summaryLines.push(line);
            currentDay = "";
            return;
        }

        if (summaryMode) {
            summaryLines.push(line);
            return;
        }

        const normalizedDay = normalizeWeekdayLine(line);

        if (normalizedDay) {
            currentDay = normalizedDay;
            return;
        }

        const eventMatch = line.match(/^(\d{1,2}:\d{2})\s*開始\s*(.*)$/);

        if (eventMatch && currentDay) {
            const [, time, note] = eventMatch;

            weekMap.get(currentDay).push({
                time: normalizeTime(time),
                note: note.trim(),
                status: getHammerStatus(note)
            });

            return;
        }

        if (!currentDay) titleLines.push(line);
    });

    return {
        title: titleLines.join(" "),
        weekMap,
        summary: parseHammerSummary(summaryLines)
    };
}

function renderWeeklyScheduleView(item) {
    const parsed = parseWeeklyScheduleDescription(item.description);
    const weekNames = ["週一", "週二", "週三", "週四", "週五", "週六", "週日"];
    const updateText = getUpdateText(parsed.title || item.title);
    const cleanTitle = removeUpdateText(parsed.title || item.title);

    const cards = weekNames.map(day => {
        const events = parsed.weekMap.get(day) || [];

        return `
            <div class="weekly-day-card">
                <div class="weekly-day-title">${escapeHtml(day)}</div>
                <div class="weekly-time-list">
                    ${events.length ? events.map(event => `
                        <div class="weekly-time-row">
                            <div class="weekly-time">${escapeHtml(event.time)}~</div>
                            <div class="weekly-duration">
                                ${event.durationText ? `持續 ${escapeHtml(event.durationText)}` : "特殊時段"}
                                ${event.note ? `<div class="weekly-note">${escapeHtml(event.note)}</div>` : ""}
                            </div>
                        </div>
                    `).join("") : `<div class="weekly-empty">目前無活動時段</div>`}
                </div>
            </div>
        `;
    }).join("");

    scheduleView.innerHTML = `
        <div class="weekly-coin-card">
            <div class="weekly-coin-header">
                <div class="weekly-coin-title">${escapeHtml(cleanTitle || "每週活動時段")}</div>
                ${updateText ? `<div class="weekly-coin-subtitle">${escapeHtml(updateText)}</div>` : ""}
            </div>
            <div class="weekly-coin-grid">${cards}</div>
        </div>
    `;
}

function renderHammerScheduleView(item) {
    const parsed = parseHammerScheduleDescription(item.description);
    const weekNames = ["週一", "週二", "週三", "週四", "週五", "週六", "週日"];
    const updateText = getUpdateText(parsed.title || item.title);
    const cleanTitle = removeUpdateText(parsed.title || item.title);

    const imageHtml = item.image ? `
        <div class="weekly-hammer-image-wrap">
            <img class="weekly-hammer-image lightbox-enabled"
                src="${escapeHtml(item.image)}"
                alt="${escapeHtml(item.title || "金槌活動圖片")}"
                loading="lazy"
                data-lightbox-src="${escapeHtml(item.image)}" />
        </div>
    ` : "";

    const cards = weekNames.map(day => {
        const events = parsed.weekMap.get(day) || [];

        return `
            <div class="weekly-hammer-day-card">
                <div class="weekly-hammer-day-title">${escapeHtml(day)}</div>
                <div class="weekly-hammer-time-list">
                    ${events.length ? events.map(event => `
                        <div class="weekly-hammer-time-row">
                            <div class="weekly-hammer-time">${escapeHtml(event.time)}~</div>
                            <div class="weekly-hammer-note ${escapeHtml(event.status)}">
                                ${event.note ? escapeHtml(event.note) : "開始"}
                            </div>
                        </div>
                    `).join("") : `<div class="weekly-empty">目前無活動時段</div>`}
                </div>
            </div>
        `;
    }).join("");

    const summaryHtml = parsed.summary.title || parsed.summary.good.length || parsed.summary.bad.length ? `
        <div class="weekly-hammer-summary">
            <div class="weekly-hammer-summary-title">${escapeHtml(parsed.summary.title || "🎯 版本重點整理")}</div>
            <div class="weekly-hammer-summary-body">
                ${parsed.summary.good.length ? `
                    <div class="weekly-hammer-summary-block">
                        <div class="weekly-hammer-summary-label good">✅ 有金槌的時段</div>
                        <div class="weekly-hammer-summary-text">${escapeHtml(parsed.summary.good.join("\n"))}</div>
                    </div>
                ` : ""}
                ${parsed.summary.bad.length ? `
                    <div class="weekly-hammer-summary-block">
                        <div class="weekly-hammer-summary-label bad">❌ 沒有金槌的時段</div>
                        <div class="weekly-hammer-summary-text">${escapeHtml(parsed.summary.bad.join("\n"))}</div>
                    </div>
                ` : ""}
            </div>
        </div>
    ` : "";

    scheduleView.innerHTML = `
        <div class="weekly-hammer-card">
            <div class="weekly-hammer-header">
                <div class="weekly-hammer-title">${escapeHtml(cleanTitle || "每週金槌時段")}</div>
                ${updateText ? `<div class="weekly-hammer-subtitle">${escapeHtml(updateText)}</div>` : ""}
            </div>
            <div class="weekly-hammer-layout">
                ${imageHtml}
                <div class="weekly-hammer-content">
                    <div class="weekly-hammer-grid">${cards}</div>
                    ${summaryHtml}
                </div>
            </div>
        </div>
    `;
}

const parseDuration = text => {
    const match = String(text).match(/（([^）]*(?:Min|mins|min|分鐘|分|H|Hr|hrs|小時)[^）]*)）/i);

    return match
        ? { label: match[1], raw: match[0] }
        : { label: "", raw: "" };
};

function splitEventText(text, durationRaw) {
    let name = String(text || "").trim();
    let note = "";

    if (durationRaw) {
        const index = name.indexOf(durationRaw);

        if (index >= 0) {
            const before = name.slice(0, index).trim();
            const after = name.slice(index + durationRaw.length).trim();

            name = before || name;
            note = after;
        }
    } else {
        const noteMatch = name.match(/（(.+)）/);

        if (noteMatch) {
            const before = name.slice(0, noteMatch.index).trim();
            const inside = noteMatch[1].trim();

            if (before) {
                name = before;
                note = inside;
            }
        }
    }

    return {
        name: name.replace(/（\s*）/g, "").trim(),
        note
    };
}

const getEventCategory = text => {
    const value = String(text || "");

    if (/村落|建村|完村|村/i.test(value)) return "village";
    if (/金幣|狂歡|150%|coin/i.test(value)) return "coin";
    if (/金槌|金鎚|槌|鎚|🔨|hammer/i.test(value)) return "hammer";
    if (/卡牌|card/i.test(value)) return "card";
    if (/任務|維京|攀登|攀爬|保險箱|活動|雷幣|財寶/i.test(value)) return "mission";

    return "default";
};

const getCategoryLabel = category => ({
    village: "村落",
    coin: "金幣",
    hammer: "金槌",
    card: "卡牌",
    mission: "活動",
    default: "其他"
}[category] || "其他");

function parseScheduleDescription(description) {
    const lines = String(description || "").split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    const headerLines = [];
    const events = [];

    lines.forEach((line, index) => {
        const match = line.match(/^(\d{1,2}:\d{2})\s+(.+)$/);

        if (!match) {
            headerLines.push(line);
            return;
        }

        const time = normalizeTime(match[1]);
        const text = match[2].trim();
        const durationInfo = parseDuration(text);
        const cleanInfo = splitEventText(text, durationInfo.raw);

        events.push({
            id: index,
            time,
            hour: Number(time.split(":")[0]),
            name: cleanInfo.name,
            note: cleanInfo.note,
            durationText: durationInfo.label,
            original: text,
            category: getEventCategory(text)
        });
    });

    events.sort((a, b) => a.hour !== b.hour ? a.hour - b.hour : a.time.localeCompare(b.time));

    return {
        header: headerLines.join(" "),
        events
    };
}

function renderScheduleView(item) {
    const parsed = parseScheduleDescription(item.description);

    if (!parsed.events.length) {
        scheduleView.innerHTML = "";
        return;
    }

    const grouped = new Map(Array.from({ length: 24 }, (_, hour) => [hour, []]));
    parsed.events.forEach(event => grouped.get(event.hour).push(event));

    const firstEvent = parsed.events[0];
    const lastEvent = parsed.events[parsed.events.length - 1];
    const today = new Date();
    const isSelectedToday = getDateKey(today) === getDateKey(selectedCalendarDate);
    const currentHour = today.getHours();
    const headerTitle = parsed.header || item.title || "活動時間";
    const updateText = getUpdateText(headerTitle);

    const rows = Array.from({ length: 24 }, (_, hour) => {
        const events = grouped.get(hour) || [];
        const isCurrent = isSelectedToday && hour === currentHour;

        const eventRows = events.length ? events.map(event => `
            <div class="event-cell-row">
                <span class="event-start">${escapeHtml(event.time)}~</span>
                <span class="event-badge ${escapeHtml(event.category)}">${escapeHtml(getCategoryLabel(event.category))}</span>
                <div class="event-title-wrap">
                    <div class="event-name">${escapeHtml(event.name)}</div>
                    ${event.note ? `<div class="event-note">${escapeHtml(event.note)}</div>` : ""}
                </div>
            </div>
        `).join("") : `<div class="empty-event-row"></div>`;

        const durationRows = events.length ? events.map(event => `
            <div class="duration-cell-row">${event.durationText ? escapeHtml(event.durationText) : ""}</div>
        `).join("") : `<div class="empty-duration-row"></div>`;

        return `
            <div class="schedule-hour-row ${isCurrent ? "current-hour" : ""}">
                <div class="hour-time-cell">${hour}:00~</div>
                <div class="hour-events-cell">${eventRows}</div>
                <div class="hour-duration-cell">${durationRows}</div>
            </div>
        `;
    }).join("");

    scheduleView.innerHTML = `
        <div class="schedule-summary">
            <div class="summary-card"><div class="summary-label">活動數量</div><div class="summary-value">${parsed.events.length}</div></div>
            <div class="summary-card"><div class="summary-label">第一個活動</div><div class="summary-value">${escapeHtml(firstEvent.time)}</div></div>
            <div class="summary-card"><div class="summary-label">最後活動</div><div class="summary-value">${escapeHtml(lastEvent.time)}</div></div>
            <div class="summary-card"><div class="summary-label">目前時段</div><div class="summary-value">${isSelectedToday ? `${currentHour}:00` : "-"}</div></div>
        </div>

        <div class="schedule-shell" id="scheduleShell">
            <div class="schedule-fit" id="scheduleFit">
                <div class="schedule-board" id="scheduleBoard">
                    <div class="schedule-board-head">
                        <div class="schedule-head-cell">時間</div>
                        <div class="schedule-head-cell">
                            <div>
                                <div>${escapeHtml(removeUpdateText(headerTitle))}</div>
                                ${updateText ? `<div class="schedule-update">${escapeHtml(updateText)}</div>` : ""}
                            </div>
                        </div>
                        <div class="schedule-head-cell">持續時間</div>
                    </div>
                    ${rows}
                </div>
            </div>
        </div>
    `;

    requestAnimationFrame(() => {
        fitScheduleBoard();

        const currentRow = scheduleView.querySelector(".schedule-hour-row.current-hour");

        if (currentRow && window.innerWidth > 820) {
            currentRow.scrollIntoView({
                behavior: "smooth",
                block: "center"
            });
        }
    });
}

function findVillageCostByNumber(number) {
    const villageNumber = Number(number);

    if (!Number.isInteger(villageNumber)) return null;

    return VILLAGES_COST.find(item => Number(item.編號) === villageNumber) || null;
}

function renderVillageCostView(initialNumber = null) {
    const totalCount = VILLAGES_COST.length;

    scheduleView.innerHTML = `
        <div class="village-cost-card">
            <div class="village-cost-header">
                <div>
                    <div class="village-cost-title">🏘️ 村落價格查詢</div>
                    <div class="village-cost-subtitle">
                        請輸入村莊編號，例如：1、73、277、523
                    </div>
                </div>
                <div class="village-cost-count">${escapeHtml(totalCount)} 筆資料</div>
            </div>

            <div class="village-cost-search">
                <input
                    id="villageCostInput"
                    class="village-cost-input"
                    type="number"
                    inputmode="numeric"
                    min="1"
                    placeholder="輸入村莊編號"
                    autocomplete="off"
                />
                <button id="villageCostSearchBtn" class="village-cost-btn" type="button">
                    查詢
                </button>
            </div>

            <div id="villageCostResult" class="village-cost-result">
                輸入村莊編號後，這裡會顯示對應村落價格。
            </div>

            <div class="village-cost-tips">
                小提醒：也可以在上方搜尋列輸入 <strong>/村價</strong> 開啟這個查詢工具。
            </div>
        </div>
    `;

    const input = $("villageCostInput");
    const button = $("villageCostSearchBtn");
    const result = $("villageCostResult");
    const parsedCommand = parseVillageCostCommand(searchInput.value);
    const numberFromSearch = parsedCommand && parsedCommand.number ? parsedCommand.number : initialNumber;


    const renderResult = () => {
        const value = String(input.value || "").trim();

        if (!value) {
            result.innerHTML = `
                <div class="village-cost-placeholder">
                    請先輸入村莊編號。
                </div>
            `;
            return;
        }

        const number = Number(value);

        if (!Number.isInteger(number) || number <= 0) {
            result.innerHTML = `
                <div class="village-cost-not-found">
                    請輸入有效的村莊編號。
                </div>
            `;
            return;
        }

        const village = findVillageCostByNumber(number);

        if (!village) {
            result.innerHTML = `
                <div class="village-cost-not-found">
                    找不到編號 <strong>${escapeHtml(number)}</strong> 的村落價格。
                </div>
            `;
            return;
        }

        result.innerHTML = `
            <div class="village-cost-result-card">
                <div class="village-cost-number">村莊 ${escapeHtml(village.編號)}</div>
                <div class="village-cost-name">${escapeHtml(village.名稱)}</div>
                <div class="village-cost-price">${escapeHtml(village.成本)}</div>
            </div>
        `;
    };

    button.addEventListener("click", renderResult);

    input.addEventListener("keydown", event => {
        if (event.key === "Enter") {
            renderResult();
        }
    });

    input.addEventListener("input", () => {
        const value = String(input.value || "").trim();

        if (!value) {
            result.innerHTML = `
                <div class="village-cost-placeholder">
                    輸入村莊編號後，這裡會顯示對應村落價格。
                </div>
            `;
            return;
        }

        renderResult();
    });

    if (numberFromSearch) {
        input.value = String(numberFromSearch);
        renderResult();
    }

    setTimeout(() => {
        input.focus();
    }, 80);
}

function fitScheduleBoard() {
    const fit = $("scheduleFit");
    const board = $("scheduleBoard");

    if (!fit || !board) return;

    board.style.transform = "";
    fit.style.height = "";

    if (window.innerWidth > 820) return;

    const availableWidth = fit.clientWidth;
    const boardWidth = board.offsetWidth;

    if (!availableWidth || !boardWidth) return;

    const scale = Math.min(availableWidth / boardWidth, 1);

    board.style.transform = `scale(${scale})`;
    fit.style.height = `${board.offsetHeight * scale}px`;
}

const getSearchableText = item => [
    item.command,
    item.title,
    item.type,
    item.description
].join(" ");

function isSubsequence(query, target) {
    if (!query) return true;

    let qi = 0;

    for (let ti = 0; ti < target.length; ti += 1) {
        if (query[qi] === target[ti]) {
            qi += 1;

            if (qi === query.length) return true;
        }
    }

    return false;
}

function getScore(item, query) {
    const q = normalizeText(query);

    if (!q) return 1;

    const command = normalizeText(item.command || "");
    const title = normalizeText(item.title || "");
    const description = normalizeText(item.description || "");
    const allText = normalizeText(getSearchableText(item));
    let score = 0;

    if (command === q) score += 1000;
    if (title === q) score += 800;
    if (command.includes(q)) score += 650;
    if (title.includes(q)) score += 500;
    if (description.includes(q)) score += 180;
    if (allText.includes(q)) score += 100;
    if (isSubsequence(q, allText)) score += 40;

    return score;
}

function searchData(query) {
    const villageCostCommand = parseVillageCostCommand(query);

    if (villageCostCommand) {
        const item = DATA.find(dataItem => dataItem.type === "villageCost");

        return item ? [{ item, score: 10000 }] : [];
    }

    const q = normalizeText(query);

    if (!dataLoaded) return [];

    if (!q) {
        return DATA.map(item => ({ item, score: 1 }));
    }

    const exactCommandMatches = DATA
        .filter(item => normalizeText(item.command || "") === q)
        .map(item => ({ item, score: 9999 }));

    if (exactCommandMatches.length) return exactCommandMatches;

    return DATA
        .map(item => ({ item, score: getScore(item, q) }))
        .filter(result => result.score > 0)
        .sort((a, b) => b.score - a.score);
}

function parseVillageCostCommand(query) {
    const text = String(query || "").trim();
    const match = text.match(/^\/?(村價|村落價格|村莊價格|村落成本|村莊成本)\s*(\d+)?$/);

    if (!match) return null;

    return {
        command: "/村價",
        number: match[2] ? Number(match[2]) : null
    };
}

function highlightText(text, query) {
    const rawQuery = String(query).trim();

    if (!rawQuery) return escapeHtml(text);

    const escaped = escapeHtml(text);
    const safeQuery = rawQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    try {
        return escaped.replace(new RegExp(`(${safeQuery})`, "gi"), "<mark>$1</mark>");
    } catch (error) {
        return escaped;
    }
}

function renderResults() {
    if (!dataLoaded) {
        resultList.innerHTML = `<div class="loading-box">資料尚未載入完成。</div>`;
        resultCount.textContent = "0 筆";
        return;
    }

    const query = searchInput.value;
    const results = searchData(query);

    resultList.innerHTML = "";
    resultCount.textContent = `${results.length} 筆`;

    if (!results.length) {
        resultList.innerHTML = `
            <div class="no-result">
                找不到符合「<strong>${escapeHtml(query)}</strong>」的資料。<br />
                請輸入 data.json 裡指定的名稱、指令或內容關鍵字。
            </div>
        `;
        return;
    }

    results.forEach(({ item }) => {
        const div = document.createElement("div");

        div.className = "result-item";

        if (currentSelected && currentSelected.command === item.command) {
            div.classList.add("active");
        }

        div.innerHTML = `
            <div class="result-main">
                <div>
                    <div class="title">${highlightText(item.title, query)}</div>
                </div>
                <div class="command">${highlightText(item.command, query)}</div>
            </div>
        `;

        div.addEventListener("click", () => {
            selectItem(item, true, true);

            if (item.command) {
                searchInput.value = item.command;
            }
        });

        resultList.appendChild(div);
    });
}

function renderMedia(item) {
    const mediaParts = [];
    const imageList = [];
    const videoList = [];

    if (item.image) imageList.push(item.image);
    if (Array.isArray(item.images)) imageList.push(...item.images);
    if (item.video) videoList.push(item.video);
    if (Array.isArray(item.videos)) videoList.push(...item.videos);

    detailMedia.classList.remove("media-thumb-grid", "media-grid");

    imageList.forEach((src, index) => {
        mediaParts.push(`
            <div class="media-item">
                <img class="detail-image lightbox-enabled"
                    src="${escapeHtml(src)}"
                    alt="${escapeHtml(item.title || "活動圖片")} ${index + 1}"
                    loading="lazy"
                    data-lightbox-src="${escapeHtml(src)}" />
            </div>
        `);
    });

    videoList.forEach(src => {
        mediaParts.push(`
            <div class="media-item">
                <video class="detail-video" controls preload="metadata" playsinline>
                    <source src="${escapeHtml(src)}" type="video/mp4" />
                    你的瀏覽器不支援影片播放。
                </video>
            </div>
        `);
    });

    detailMedia.innerHTML = mediaParts.join("");

    const thumbGridCommands = ["/魔法", "/小徑", "/維京", "/孵化", "/耕種", "/首領", "/雪崩", "/宇宙", "/合併", "/兌換", "/代幣", "/衝刺"];

    detailMedia.classList.toggle(
        "media-thumb-grid",
        thumbGridCommands.includes(String(item.command || "").trim())
    );
}

function renderVisibleDescription(item) {
    const description = String(item.description || "").trim();

    if (!description) {
        detailDescription.innerHTML = "";
        detailDescription.style.display = "none";
        detailDescription.classList.remove("show");
        return;
    }

    detailDescription.innerHTML = linkifyText(description).replace(/\n/g, "<br>");
    detailDescription.style.display = "block";
    detailDescription.classList.add("show");
}

function renderDescription() {
    detailDescription.innerHTML = "";
    detailDescription.style.display = "none";
    detailDescription.classList.remove("show");
}

function selectItem(item, rerender = true, scrollToDetail = false) {
    currentSelected = item;

    detailEmpty.style.display = "none";
    detailBox.classList.add("show");

    detailCommand.textContent = item.command || "";
    detailTitle.textContent = item.title || "";

    todayBadge.textContent = ["weeklySchedule", "hammerSchedule"].includes(item.type)
        ? "每週固定時段"
        : `${getDisplayDate(selectedCalendarDate)} ${getWeekdayNameByDate(selectedCalendarDate)}`;

    if (item.type === "mediaText") {
        renderVisibleDescription(item);
    } else {
        renderDescription(item);
    }

    if (item.type === "weeklySchedule") {
        renderWeeklyScheduleView(item);
    } else if (item.type === "hammerSchedule") {
        renderHammerScheduleView(item);
    } else if (item.type === "villageCost") {
        renderVillageCostView();
    } else if (item.type === "imageOnly") {
        scheduleView.innerHTML = renderLinkButton(item);
    } else if (item.type === "mediaText") {
        scheduleView.innerHTML = "";
    } else {
        renderScheduleView(item);
    }

    if (item.type === "hammerSchedule") {
        detailMedia.innerHTML = "";
        detailMedia.classList.remove("media-thumb-grid", "media-grid");
    } else {
        renderMedia(item);
    }

    if (copyBtn) copyBtn.style.display = "none";
    if (rawToggleBtn) rawToggleBtn.style.display = "none";

    bindLightboxImages(detailBox);

    if (rerender) renderResults();

    if (scrollToDetail) {
        requestAnimationFrame(() => {
            setTimeout(() => {
                detailSection.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });
            }, 80);
        });
    }
}

function clearSearch() {
    searchInput.value = "";
    currentSelected = null;

    resetDetailView();
    renderResults();
    searchInput.focus();
}

function showToast(message) {
    if (!message) return;

    toast.textContent = message;
    toast.classList.add("show");

    setTimeout(() => {
        toast.classList.remove("show");
    }, 1600);
}

function openImageLightbox(src, alt = "圖片預覽", images = []) {
    if (!src) return;

    lightboxImages = Array.isArray(images) && images.length ? images : [{ src, alt }];
    lightboxIndex = lightboxImages.findIndex(image => image.src === src);

    if (lightboxIndex < 0) lightboxIndex = 0;

    updateImageLightbox();

    imageLightbox.classList.add("show");
    imageLightbox.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
}

function updateImageLightbox() {
    const current = lightboxImages[lightboxIndex];

    if (!current) return;

    imageLightboxImg.src = current.src;
    imageLightboxImg.alt = current.alt || "圖片預覽";

    const hasMultipleImages = lightboxImages.length > 1;

    if (imageLightboxCounter) {
        imageLightboxCounter.textContent = hasMultipleImages ? `${lightboxIndex + 1} / ${lightboxImages.length}` : "";
    }

    if (imageLightboxPrev) {
        imageLightboxPrev.style.display = hasMultipleImages ? "flex" : "none";
    }

    if (imageLightboxNext) {
        imageLightboxNext.style.display = hasMultipleImages ? "flex" : "none";
    }
}

const showPrevLightboxImage = () => {
    if (lightboxImages.length <= 1) return;

    lightboxIndex = (lightboxIndex - 1 + lightboxImages.length) % lightboxImages.length;
    updateImageLightbox();
};

const showNextLightboxImage = () => {
    if (lightboxImages.length <= 1) return;

    lightboxIndex = (lightboxIndex + 1) % lightboxImages.length;
    updateImageLightbox();
};

function closeImageLightbox() {
    imageLightbox.classList.remove("show");
    imageLightbox.setAttribute("aria-hidden", "true");
    imageLightboxImg.src = "";
    imageLightboxImg.alt = "圖片預覽";

    lightboxImages = [];
    lightboxIndex = 0;
    lightboxTouchStartX = 0;
    lightboxTouchEndX = 0;

    if (imageLightboxCounter) imageLightboxCounter.textContent = "";
    if (imageLightboxPrev) imageLightboxPrev.style.display = "none";
    if (imageLightboxNext) imageLightboxNext.style.display = "none";

    document.body.style.overflow = "";
}

function bindLightboxImages(scope = document) {
    const imageNodes = Array.from(scope.querySelectorAll("[data-lightbox-src]"));
    const images = imageNodes
        .map(img => ({
            src: img.getAttribute("data-lightbox-src") || img.getAttribute("src"),
            alt: img.getAttribute("alt") || "圖片預覽"
        }))
        .filter(image => image.src);

    imageNodes.forEach(img => {
        img.addEventListener("click", event => {
            event.stopPropagation();

            openImageLightbox(
                img.getAttribute("data-lightbox-src") || img.getAttribute("src"),
                img.getAttribute("alt") || "圖片預覽",
                images
            );
        });
    });
}

function renderQuickButtons() {
    const quickGroups = [
        {
            colorClass: "quick-red",
            items: [
                { label: "打鬼牌時間", keyword: "鬼牌" },
                { label: "右上競賽", keyword: "小盃" }
            ]
        },
        {
            colorClass: "quick-yellow",
            items: [
                { label: "金幣加倍", keyword: "金球" },
                { label: "攻擊加倍", keyword: "金鎚" },
                { label: "建村特價", keyword: "建村" },
                { label: "完村獎勵", keyword: "完村" },
                { label: "村落價格", keyword: "村價" }
            ]
        },
        {
            colorClass: "quick-orange",
            items: [
                { label: "卡牌+50%", keyword: "/50" },
                { label: "完冊+30%", keyword: "/30" }
            ]
        },
        {
            colorClass: "quick-blue",
            items: [
                { label: "魔法王國資訊", keyword: "魔法" }
            ]
        },
        {
            colorClass: "quick-green",
            items: [
                { label: "宇宙之旅", keyword: "宇宙" },
                { label: "魔法小徑", keyword: "小徑" },
                { label: "合併島嶼", keyword: "合併" },
                { label: "維京任務", keyword: "維京" },
                { label: "蜥蜴孵化", keyword: "孵化" },
                { label: "植物耕種", keyword: "耕種" },
                { label: "首領戰", keyword: "首領" },
                { label: "雪崩派對", keyword: "雪崩" }
            ]
        },
        {
            colorClass: "quick-indigo",
            items: [
                { label: "結束兌換能量", keyword: "兌換" }
            ]
        },
        {
            colorClass: "quick-lavender",
            items: [
                { label: "雷神代幣歷險", keyword: "代幣" },
                { label: "雷神任務衝刺", keyword: "衝刺" }
            ]
        },
        {
            colorClass: "quick-purple",
            items: [
                { label: "洗分", keyword: "洗分" }
            ]
        }
    ];

    quickButtons.innerHTML = quickGroups.map(group => `
        <div class="quick-group">
            ${group.items.map(item => `
                <button class="quick-btn ${group.colorClass}" type="button" data-keyword="${escapeHtml(item.keyword)}">
                    ${escapeHtml(item.label)}
                </button>
            `).join("")}
        </div>
    `).join("");

    quickButtons.querySelectorAll(".quick-btn").forEach(button => {
        button.addEventListener("click", () => {
            const { keyword } = button.dataset;

            searchInput.value = keyword;
            currentSelected = null;
            renderResults();

            const firstResult = searchData(keyword)[0];

            if (firstResult) {
                selectItem(firstResult.item, true, true);
            }

            searchInput.focus();
        });
    });
}

function loadQueryFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const q = params.get("q");

    if (q) {
        searchInput.value = q;
    }

    return q;
}

searchInput.addEventListener("input", () => {
    currentSelected = null;
    renderResults();

    const firstResult = searchData(searchInput.value)[0];

    if (searchInput.value.trim() && firstResult) {
        selectItem(firstResult.item, false, false);
    } else {
        resetDetailView();
    }
});

searchInput.addEventListener("keydown", event => {
    if (event.key === "Enter") {
        const firstResult = searchData(searchInput.value)[0];

        if (firstResult) {
            selectItem(firstResult.item, true, true);
            showToast(`已選擇 ${firstResult.item.command}`);
        }
    }

    if (event.key === "Escape") {
        if (imageLightbox.classList.contains("show")) {
            closeImageLightbox();
            return;
        }

        clearSearch();
    }
});

clearBtn.addEventListener("click", clearSearch);
imageLightboxClose.addEventListener("click", closeImageLightbox);

if (imageLightboxPrev) {
    imageLightboxPrev.addEventListener("click", event => {
        event.stopPropagation();
        showPrevLightboxImage();
    });
}

if (imageLightboxNext) {
    imageLightboxNext.addEventListener("click", event => {
        event.stopPropagation();
        showNextLightboxImage();
    });
}

imageLightbox.addEventListener("click", event => {
    if (event.target === imageLightbox) {
        closeImageLightbox();
    }
});

imageLightbox.addEventListener("touchstart", event => {
    if (!imageLightbox.classList.contains("show")) return;

    lightboxTouchStartX = event.changedTouches[0].screenX;
}, { passive: true });

imageLightbox.addEventListener("touchend", event => {
    if (!imageLightbox.classList.contains("show")) return;

    lightboxTouchEndX = event.changedTouches[0].screenX;

    const diffX = lightboxTouchEndX - lightboxTouchStartX;
    const threshold = 50;

    if (Math.abs(diffX) < threshold) return;

    if (diffX > 0) {
        showPrevLightboxImage();
    } else {
        showNextLightboxImage();
    }
}, { passive: true });

document.addEventListener("keydown", event => {
    if (!imageLightbox.classList.contains("show")) return;

    if (event.key === "Escape") {
        closeImageLightbox();
        return;
    }

    if (event.key === "ArrowLeft") {
        event.preventDefault();
        showPrevLightboxImage();
        return;
    }

    if (event.key === "ArrowRight") {
        event.preventDefault();
        showNextLightboxImage();
    }
});

prevMonthBtn.addEventListener("click", goPrevMonth);
nextMonthBtn.addEventListener("click", goNextMonth);
todayBtn.addEventListener("click", goToday);

window.addEventListener("resize", fitScheduleBoard);
window.addEventListener("orientationchange", () => setTimeout(fitScheduleBoard, 250));

async function initApp() {
    const today = new Date();

    calendarViewDate = new Date(today.getFullYear(), today.getMonth(), 1);
    selectedCalendarDate = today;
    selectedCalendarDateKey = getDateKey(today);

    renderCalendar();
    renderQuickButtons();

    await loadData();

    if (!dataLoaded) return;

    const q = loadQueryFromUrl();

    if (q) {
        renderResults();

        const firstResult = searchData(searchInput.value)[0];

        if (firstResult) {
            selectItem(firstResult.item, true, false);
        }

        return;
    }

    searchInput.value = getWeekdayCommandByDate(today);

    selectTodayWeekday({
        updateSearch: true,
        scrollToDetail: false,
        toastMessage: ""
    });
}

initApp();
