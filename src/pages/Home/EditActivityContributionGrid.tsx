import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { Tooltip } from 'tdesign-react';
import { ChevronLeftIcon, ChevronRightIcon } from 'tdesign-icons-react';
import type { WorkspaceDailyEditStats } from '../../api/pageTemplate';

type Props = {
  stats: WorkspaceDailyEditStats | null;
  colorMode: 'light' | 'dark';
};

type Cell = {
  date: string;
  inRange: boolean;
  total: number;
  newCount: number;
  saveCount: number;
};

const WEEKDAY_LABELS = ['一', '二', '三', '四', '五', '六', '日'];

/** 滑动窗口起点：1=1–6 月 … 7=7–12 月，共 7 屏 */
const WINDOW_COUNT = 7;

function mondayOf(d: dayjs.Dayjs): dayjs.Dayjs {
  const dow = d.day();
  const diff = dow === 0 ? -6 : 1 - dow;
  return d.add(diff, 'day').startOf('day');
}

function sundayOf(d: dayjs.Dayjs): dayjs.Dayjs {
  const dow = d.day();
  const diff = dow === 0 ? 0 : 7 - dow;
  return d.add(diff, 'day').startOf('day');
}

function isInDisplayedMonth(dateStr: string, y: number, month: number): boolean {
  const d = dayjs(dateStr);
  return d.isValid() && d.year() === y && d.month() + 1 === month;
}

function levelForCell(total: number, max: number, inRange: boolean): 0 | 1 | 2 | 3 | 4 {
  if (!inRange) {
    return 0;
  }
  if (total <= 0) {
    return 0;
  }
  if (max <= 0) {
    return 1;
  }
  const t = total / max;
  if (t <= 0.25) {
    return 1;
  }
  if (t <= 0.5) {
    return 2;
  }
  if (t <= 0.75) {
    return 3;
  }
  return 4;
}

/** 公历：每月日历块为「当月首日前一周一」至「当月末日所在周周日」，天数恒为 7 的整数倍（4–6 周）；闰年由 dayjs.endOf('month') 处理 */
function buildMonthBoard(
  year: number,
  month: number,
  dataStart: dayjs.Dayjs,
  dataEnd: dayjs.Dayjs,
  detailMap: Map<string, { newCount: number; saveCount: number }>,
): { cells: Cell[]; numWeeks: number } {
  const monthStart = dayjs().year(year).month(month - 1).date(1).startOf('day');
  const monthEnd = monthStart.endOf('month');
  const gridStart = mondayOf(monthStart);
  const gridEnd = sundayOf(monthEnd);
  const cells: Cell[] = [];

  for (let d = gridStart.clone(); !d.isAfter(gridEnd); d = d.add(1, 'day')) {
    const key = d.format('YYYY-MM-DD');
    const inCalendarMonth = !d.isBefore(monthStart) && !d.isAfter(monthEnd);
    const inRange = inCalendarMonth && !d.isBefore(dataStart) && !d.isAfter(dataEnd);
    const det = detailMap.get(key);
    const newCount = det?.newCount ?? 0;
    const saveCount = det?.saveCount ?? 0;
    const total = inRange ? newCount + saveCount : 0;
    cells.push({ date: key, inRange, total, newCount, saveCount });
  }

  while (cells.length % 7 !== 0) {
    cells.push({
      date: '',
      inRange: false,
      total: 0,
      newCount: 0,
      saveCount: 0,
    });
  }

  const numWeeks = Math.max(1, cells.length / 7);
  return { cells, numWeeks };
}

type MonthBoardModel = {
  month: number;
  label: string;
  cells: Cell[];
  numWeeks: number;
};

export const EditActivityContributionGrid: React.FC<Props> = ({ stats, colorMode }) => {
  /** 0..6 对应 1–6 月 … 7–12 月 */
  const [slideIndex, setSlideIndex] = useState(0);

  const { boards, maxTotal, year } = useMemo(() => {
    const dataEnd = stats?.toDate
      ? dayjs(stats.toDate.slice(0, 10)).startOf('day')
      : dayjs().startOf('day');
    const dataStart = stats?.fromDate
      ? dayjs(stats.fromDate.slice(0, 10)).startOf('day')
      : dayjs().startOf('year').startOf('day');

    const y = dataStart.year();

    const detailMap = new Map<string, { newCount: number; saveCount: number }>();
    for (const row of stats?.daily ?? []) {
      detailMap.set(row.date.slice(0, 10), { newCount: row.newCount, saveCount: row.saveCount });
    }

    let maxTotal = 0;
    const boards: MonthBoardModel[] = [];
    for (let m = 1; m <= 12; m++) {
      const { cells, numWeeks } = buildMonthBoard(y, m, dataStart, dataEnd, detailMap);
      for (const c of cells) {
        if (c.inRange && c.total > maxTotal) {
          maxTotal = c.total;
        }
      }
      boards.push({
        month: m,
        label: `${m}月`,
        cells,
        numWeeks,
      });
    }

    return {
      year: y,
      boards,
      maxTotal,
    };
  }, [stats]);

  useEffect(() => {
    setSlideIndex(0);
  }, [year, stats?.fromDate, stats?.toDate]);

  const themeClass = colorMode === 'dark' ? 'edit-activity-grid--dark' : 'edit-activity-grid--light';

  const windowLabel = `${slideIndex + 1}月—${slideIndex + 6}月`;

  const renderMonthWindow = (months: MonthBoardModel[], rowKey: string) => (
    <div className="edit-activity-grid__half-year" key={rowKey}>
      <div
        className="edit-activity-grid__month-label-row"
        style={{ gridTemplateColumns: `28px repeat(6, minmax(0, 1fr))` }}
      >
        <span className="edit-activity-grid__month-corner" aria-hidden />
        {months.map((m) => (
          <span key={`lbl-${rowKey}-${m.month}`} className="edit-activity-grid__month-title">
            {m.label}
          </span>
        ))}
      </div>
      <div
        className="edit-activity-grid__body-row"
        style={{ gridTemplateColumns: `28px repeat(6, minmax(0, 1fr))` }}
      >
        <div className="edit-activity-grid__weekday-col" aria-hidden>
          {WEEKDAY_LABELS.map((t) => (
            <span key={`${rowKey}-${t}`} className="edit-activity-grid__weekday">
              {t}
            </span>
          ))}
        </div>
        {months.map((m) => (
          <div key={`board-${rowKey}-${m.month}`} className="edit-activity-grid__month-board">
            <div
              className="edit-activity-grid__board edit-activity-grid__board--fluid"
              style={{
                gridAutoFlow: 'column',
                gridTemplateColumns: `repeat(${m.numWeeks}, minmax(0, 1fr))`,
                gridTemplateRows: 'repeat(7, minmax(0, 1fr))',
              }}
            >
              {m.cells.map((cell, idx) => {
                const lv = levelForCell(cell.total, maxTotal, cell.inRange);
                const pad = !cell.inRange;
                const outsideMonth = Boolean(cell.date && !isInDisplayedMonth(cell.date, year, m.month));

                const tip =
                  !cell.date ? (
                    <span className="edit-activity-grid__tip" />
                  ) : outsideMonth ? null : pad ? (
                    <span className="edit-activity-grid__tip">
                      {cell.date}
                      （不在统计范围内）
                    </span>
                  ) : (
                    <span className="edit-activity-grid__tip">
                      {cell.date}
                      <br />
                      新建 {cell.newCount} · 保存 {cell.saveCount}
                      <br />
                      合计 {cell.total}
                    </span>
                  );

                if (!cell.date) {
                  return (
                    <span
                      key={`pad-${rowKey}-${m.month}-${idx}`}
                      className="edit-activity-grid__cell edit-activity-grid__cell--fluid edit-activity-grid__cell--pad-empty"
                      aria-hidden
                    />
                  );
                }

                if (outsideMonth) {
                  return (
                    <span
                      key={`${cell.date}-${rowKey}-${m.month}-${idx}`}
                      className="edit-activity-grid__cell edit-activity-grid__cell--fluid edit-activity-grid__cell--outside-month"
                      aria-hidden
                    />
                  );
                }

                const inner = (
                  <button
                    type="button"
                    className={[
                      'edit-activity-grid__cell',
                      'edit-activity-grid__cell--fluid',
                      pad && 'edit-activity-grid__cell--pad',
                      !pad && `edit-activity-grid__cell--lv${lv}`,
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    aria-label={pad ? `${cell.date} 无数据` : `${cell.date} 合计 ${cell.total}`}
                  />
                );

                return (
                  <Tooltip key={`${cell.date}-${rowKey}-${m.month}-${idx}`} content={tip} placement="top" showArrow={false}>
                    {inner}
                  </Tooltip>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className={`edit-activity-grid ${themeClass}`} aria-label={`${year} 年编辑活跃度`}>
      <div className="edit-activity-grid__toolbar" role="group" aria-label="切换半年区间">
        <button
          type="button"
          className="edit-activity-grid__nav"
          disabled={slideIndex <= 0}
          aria-label="上一段月份"
          onClick={() => setSlideIndex((i) => Math.max(0, i - 1))}
        >
          <ChevronLeftIcon size="18" />
        </button>
        <span className="edit-activity-grid__window-label">{windowLabel}</span>
        <button
          type="button"
          className="edit-activity-grid__nav"
          disabled={slideIndex >= WINDOW_COUNT - 1}
          aria-label="下一段月份"
          onClick={() => setSlideIndex((i) => Math.min(WINDOW_COUNT - 1, i + 1))}
        >
          <ChevronRightIcon size="18" />
        </button>
      </div>

      <div className="edit-activity-grid__viewport">
        <div
          className="edit-activity-grid__track"
          style={{
            transform: `translateX(calc(-100% * ${slideIndex} / ${WINDOW_COUNT}))`,
          }}
        >
          {Array.from({ length: WINDOW_COUNT }, (_, i) => (
            <div key={`slide-${i}`} className="edit-activity-grid__slide">
              {renderMonthWindow(boards.slice(i, i + 6), `w${i}`)}
            </div>
          ))}
        </div>
      </div>

      <div className="edit-activity-grid__legend">
        <span className="edit-activity-grid__legend-text">少</span>
        {[0, 1, 2, 3, 4].map((lv) => (
          <span
            key={lv}
            className={`edit-activity-grid__cell edit-activity-grid__cell--lv${lv} edit-activity-grid__legend-swatch`}
            aria-hidden
          />
        ))}
        <span className="edit-activity-grid__legend-text">多</span>
        <span className="edit-activity-grid__legend-hint">相对强弱</span>
      </div>
    </div>
  );
};
