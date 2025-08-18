import { read, utils } from 'xlsx';
import { parse, addDays, differenceInCalendarDays } from 'date-fns';
import { z } from 'zod';
import { PRODUCT_TO_BASE, resolveScreenId } from './screenIdMap';
import { spreadsheetLayout } from '@/data/mockSchedules';

export type ParsedRow = {
  section: 'display' | 'alert' | 'other';
  product: string;
  target?: string | null;          // 국가/대상(그대로 저장)
  startYmd: string;                // 'YYYY-MM-DD'
  endYmd: string;                  // 'YYYY-MM-DD'
  dailyImps?: number | null;       // 일 노출(있으면)
  totalImps?: number | null;       // 총 노출(없으면 null)
  advertiser?: string | null;      // 광고주명
};

export type BookingItem = {
  basis_dt: string;
  screen_id: string;
  country_nm?: string | null;
  guaranteed_exposure?: number | null;
  advertiser_name?: string | null;
};

// '2025. 7. 1' → '2025-07-01'
const ymd = (s: string) => {
  if (!s || s.trim() === '') return '';
  
  console.log('날짜 파싱 시도:', s);
  
  // 여러 날짜 포맷 시도
  const formats = [
    'yyyy. M. d',    // 2025. 7. 1
    'yyyy.M.d',      // 2025.7.1
    'yyyy-MM-dd',    // 2025-07-01
    'yyyy/MM/dd',    // 2025/07/01
    'yyyy. M. d.',   // 2025. 7. 1.
    'yyyy.M.d.',     // 2025.7.1.
  ];
  
  for (const fmt of formats) {
    try {
      const d = parse(String(s).trim(), fmt, new Date());
      if (!isNaN(d.getTime())) {
        const Y = d.getFullYear(), M = String(d.getMonth()+1).padStart(2,'0'), D = String(d.getDate()).padStart(2,'0');
        const result = `${Y}-${M}-${D}`;
        console.log('날짜 파싱 성공:', s, '→', result);
        return result;
      }
    } catch (e) {
      console.log('날짜 파싱 실패 (포맷:', fmt, '):', s, e);
      continue;
    }
  }
  
  console.warn('모든 날짜 포맷 파싱 실패:', s);
  return '';
};
const toInt = (v?: any) => {
  if (v == null || v === '') return null;
  const n = String(v).replace(/[^0-9\-]/g,'');
  return n ? Number(n) : null;
};

const RowSchema = z.object({
  section: z.enum(['display','alert','other']),
  product: z.string(),
  target: z.string().optional().nullable(),
  startYmd: z.string(),
  endYmd: z.string(),
  dailyImps: z.number().nullable().optional(),
  totalImps: z.number().nullable().optional(),
  advertiser: z.string().optional().nullable(),
});

// 시트(2D 배열)에서 섹션 감지 + 행 파싱
function parseSheetRows(rows: any[][]): ParsedRow[] {
  let section: ParsedRow['section'] | null = null;
  let advertiser: string | null = null; // 광고주명 추출
  const out: ParsedRow[] = [];
  let processedCount = 0;
  let skippedCount = 0;

  console.log('파싱 시작, 총 행 수:', rows.length);
  
  // 300행까지만 검사 (성능 최적화)
  const maxRows = Math.min(rows.length, 300);
  console.log(`성능 최적화: ${maxRows}행까지만 검사`);

  for (let i = 0; i < maxRows; i++) {
    const r = rows[i];
    
    // 빈 행은 빠르게 건너뛰기
    if (!r || r.length === 0 || r.every(cell => !cell || cell.toString().trim() === '')) {
      skippedCount++;
      if (skippedCount % 1000 === 0) {
        console.log(`빈 행 ${skippedCount}개 건너뜀...`);
      }
      continue;
    }
    
    const line = r.map(c => (c ?? '').toString().trim());

    // 광고주명 추출 (캠페인 제목에서)
    const txt = line.join(' ');
    if (!advertiser && /광고\s*제안/.test(txt)) {
      // "마이리얼트립 광고 제안_1안" 같은 패턴에서 광고주명 추출
      const match = txt.match(/([^\s]+)\s*광고\s*제안/);
      if (match) {
        advertiser = match[1];
        console.log('광고주명 추출:', advertiser);
      }
    }

    // 섹션 헤더 인식
    if (/디스플레이\s*광고\s*상품명/.test(txt)) { 
      section = 'display'; 
      console.log('디스플레이 섹션 감지');
      continue; 
    }
    if (/알람\s*광고\s*상품\s*명/.test(txt)) { 
      section = 'alert'; 
      console.log('알람 섹션 감지');
      continue; 
    }
    if (/기타\s*상품\s*명/.test(txt)) { 
      section = 'other'; 
      console.log('기타 섹션 감지');
      continue; 
    }

    // 번호 시작 행만 데이터로 간주
    if (!section) {
      continue;
    }
    
    if (!/^\d+/.test(line[0] ?? '')) {
      continue;
    }
    
    // 빈 행이나 총합 행은 건너뛰기
    if (line.join('').trim() === '' || line[1]?.includes('총합')) {
      continue;
    }

    // 컬럼 추출(유연 매핑)
    const product = line[1] ?? '';
    const target  = line[3] || null;

    // 날짜는 뒤에서 2,1번째 열에 위치한다고 가정(표 패턴)
    const start = ymd(line[line.length - 2] ?? '');
    const end   = ymd(line[line.length - 1] ?? '');

    // 일/총 노출 수치 추출(없으면 null)
    const daily   = toInt(line[4] ?? ''); // "예상 수치 (일)" 컬럼
    const total   = toInt(line[6] ?? ''); // "예상 수치 (총 기간)" 컬럼

    // 날짜가 유효하지 않으면 건너뛰기
    if (!start || !end) {
      continue;
    }

    const parsed: ParsedRow = RowSchema.parse({
      section, product, target, startYmd:start, endYmd:end, dailyImps: daily, totalImps: total, advertiser,
    });
    
    processedCount++;
    console.log(`파싱 성공 (${processedCount}번째):`, { product, target, start, end, daily, total });
    out.push(parsed);
  }
  
  console.log(`파싱 완료: 총 ${processedCount}개 행 파싱, ${skippedCount}개 빈 행 건너뜀 (${maxRows}행 검사)`);
  return out;
}

// 엑셀(.xlsx/.xls/.csv) ArrayBuffer → ParsedRow[]
export function parseWorkbook(buf: ArrayBuffer): ParsedRow[] {
  console.log('엑셀 파일 파싱 시작');
  
  const wb = read(buf, { type:'array' });
  console.log('시트 이름들:', wb.SheetNames);
  
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const aoa: any[][] = utils.sheet_to_json(sheet, { header: 1, raw: true }) as any[][];
  
  console.log('엑셀 데이터:', aoa);
  return parseSheetRows(aoa);
}

// 붙여넣기 텍스트(탭/다중 공백/CSV) → ParsedRow[]
export function parsePlainText(text: string): ParsedRow[] {
  console.log('텍스트 파싱 시작:', text.substring(0, 200) + '...');
  
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l);
  console.log('분리된 라인 수:', lines.length);
  
  const table: string[][] = [];
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    console.log(`라인 ${i}:`, l);
    
    let cells: string[];
    if (l.includes('\t')) {
      cells = l.split('\t');
    } else if (l.includes('  ')) {
      // 연속된 공백으로 분리
      cells = l.split(/\s{2,}/);
    } else {
      // 단일 공백으로 분리
      cells = l.split(' ');
    }
    
    console.log(`라인 ${i} 셀:`, cells);
    table.push(cells);
  }
  
  console.log('최종 테이블:', table);
  return parseSheetRows(table);
}

// ParsedRow[] → BookingItem[] (일자 확장)
export function rowsToBookings(rows: ParsedRow[]): BookingItem[] {
  const out: BookingItem[] = [];
  for (const r of rows) {
    // 스프레드시트 레이아웃에서 실제 screen_id 찾기
    let screen_id = '';
    
    // 스프레드시트 레이아웃에서 해당 제품의 첫 번째 slot 찾기
    for (const category of spreadsheetLayout) {
      for (const placement of category.placements) {
        for (const slot of placement.slots) {
          const slotBase = slot.banner_id.replace(/(_t\d+|_p\d+|[-_.]?v\d+|-\d+)$/, '').toLowerCase();
          const productBase = (PRODUCT_TO_BASE[r.product] ?? r.product).toLowerCase();
          
          if (slotBase === productBase) {
            screen_id = slot.banner_id;
            break;
          }
        }
        if (screen_id) break;
      }
      if (screen_id) break;
    }
    
    // 못 찾으면 기본값 사용
    if (!screen_id) {
      const base = PRODUCT_TO_BASE[r.product] ?? r.product;
      screen_id = resolveScreenId(base);
    }

    // 인터랙티브는 일노출 저장; 퍼널/배너는 국가만 저장
    let daily = r.dailyImps ?? null;
    if (daily == null && r.totalImps != null) {
      const days = Math.max(1, differenceInCalendarDays(new Date(r.endYmd), new Date(r.startYmd)) + 1);
      daily = Math.floor(r.totalImps / days);
    }

    for (let d = new Date(r.startYmd); d <= new Date(r.endYmd); d = addDays(d, 1)) {
      const Y=d.getFullYear(), M=String(d.getMonth()+1).padStart(2,'0'), D=String(d.getDate()).padStart(2,'0');
      out.push({
        basis_dt: `${Y}-${M}-${D}`,
        screen_id: screen_id,
        country_nm: /funnel_|checklist|main_home(_banner|_front)?/.test(screen_id) ? (r.target ?? null) : null,
        guaranteed_exposure: /interactive/.test(screen_id) ? (daily ?? 0) : null,
        advertiser_name: r.advertiser ?? null,
      });
    }
  }
  return out;
}
