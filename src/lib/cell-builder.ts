import { parse, format } from "date-fns";
import { TYPE_RULE, TOKENS } from "@/config/calendarMaps";

export type Booking = {
  basis_dt: string;            // 'YYYY-MM-DD'
  screen_id: string;           // 예: main_home_popup_t1
  country_nm?: string | null;
  guaranteed_exposure?: number | null;
};

// base id로 정규화(접미사 제거)
export const toBase = (id: string) =>
  String(id ?? "").toLowerCase().replace(/\s+/g,"").replace(/(_t\d+|[-_.]?v\d+|-\d+)$/,"");

export const isSameSlot = (bannerId: string, screenId: string) =>
  toBase(bannerId) === toBase(screenId);

export const parseYmd = (s: string) => parse(s, "yyyy-MM-dd", new Date());
export const ymd = (d: Date) => format(d, "yyyy-MM-dd");

export const comma = (n: number) => n.toLocaleString();

export const screenType = (id: string) => (TYPE_RULE as any)[toBase(id)]?.type ?? "banner";

export function buildLabel(b: Booking): { top: string; bottom?: string } {
  const t = screenType(b.screen_id);
  if (t === "interactive") {
    return { top: "Booking", bottom: b.guaranteed_exposure ? comma(b.guaranteed_exposure) : "0" };
  }
  // banner/funnel/alert
  return { top: b.country_nm ?? "", bottom: "" };
}

export type CellRun = {
  dayStartIdx: number;
  span: number;
  labelTop: string;
  labelBottom?: string;
  screen_id: string;
};

// ⛔️ 스택 금지: 같은 날짜에 2건 이상이면 첫 건만 사용(표시)
// 저장 단계에서 중복 자체를 막으므로 여기선 표시만 일관되게.
export function buildCellRuns(params: {
  rowBannerId: string;
  weekDays: Date[];
  bookings: Booking[];
}) {
  const { rowBannerId, weekDays, bookings } = params;

  // 날짜→해당 날짜의 row booking 리스트
  const at: Record<string, Booking[]> = {};
  bookings
    .filter(b => isSameSlot(rowBannerId, b.screen_id))
    .forEach(b => {
      const k = b.basis_dt;
      (at[k] ||= []).push(b);
    });

  const runs: CellRun[] = [];
  let i = 0;
  while (i < weekDays.length) {
    const key = ymd(weekDays[i]);
    const list = at[key] || [];

    if (list.length === 0) {
      // 빈칸 colSpan 1칸(그려야 격자 유지)
      runs.push({ dayStartIdx: i, span: 1, labelTop: "", screen_id: "" });
      i += 1;
      continue;
    }

    const main = list[0];                    // 첫 건만
    const { top, bottom } = buildLabel(main);

    // 연속 span 계산(같은 라벨이 이어질 때만 확장)
    let span = 1;
    while (i + span < weekDays.length) {
      const k2 = ymd(weekDays[i + span]);
      const lst2 = at[k2] || [];
      if (!lst2.length) break;
      const l2 = buildLabel(lst2[0]);
      if (l2.top !== top || l2.bottom !== bottom) break;
      span++;
    }

    runs.push({
      dayStartIdx: i,
      span,
      labelTop: top,
      labelBottom: bottom,
      screen_id: main.screen_id,
    });
    i += span;
  }

  return runs;
}
