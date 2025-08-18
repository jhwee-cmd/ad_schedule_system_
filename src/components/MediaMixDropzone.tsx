'use client';
import { useCallback, useMemo, useState } from 'react';
import { parseWorkbook, parsePlainText, rowsToBookings, ParsedRow } from '@/lib/mediaMixParser';
import { createBookingsBulk } from '@/app/actions/createBookingsBulk';
import { PRODUCT_OPTIONS } from '@/lib/screenIdMap';
import { spreadsheetLayout } from '@/data/mockSchedules';

export default function MediaMixDropzone({ onDone }: { onDone?: () => void }) {
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingRow, setEditingRow] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // 스프레드시트 레이아웃에서 rowIdsByBase 생성
  const rowIdsByBase = useMemo(() => {
    const mapping: Record<string, string[]> = {};
    
    // 스프레드시트 레이아웃에서 모든 banner_id 수집
    spreadsheetLayout.forEach(category => {
      category.placements.forEach(placement => {
        placement.slots.forEach(slot => {
          const base = slot.banner_id.replace(/(_t\d+|_p\d+|[-_.]?v\d+|-\d+)$/, '').toLowerCase();
          if (!mapping[base]) {
            mapping[base] = [];
          }
          mapping[base].push(slot.banner_id);
        });
      });
    });
    
    console.log('생성된 rowIdsByBase:', mapping);
    return mapping;
  }, []);
  
  const bookings = useMemo(() => {
    try {
      return rowsToBookings(rows);
    } catch (err) {
      console.error('bookings 계산 중 에러:', err);
      setError(`데이터 변환 중 오류: ${err}`);
      return [];
    }
  }, [rows]);

  const handleFiles = useCallback(async (files: FileList) => {
    console.log('파일 처리 시작:', files.length, '개 파일');
    
    const f = files[0];
    console.log('처리할 파일:', f.name, f.type, f.size);
    
    try {
      const buf = await f.arrayBuffer();
      console.log('파일 버퍼 크기:', buf.byteLength);
      
      const parsedRows = parseWorkbook(buf);
      console.log('파싱된 행 수:', parsedRows.length);
      
      setRows(parsedRows);
    } catch (error) {
      console.error('파일 처리 중 에러:', error);
      alert(`파일 처리 중 오류가 발생했습니다: ${error}`);
    }
  }, []);

  const onDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    console.log('드롭 이벤트 발생');
    
    const dt = e.dataTransfer;
    console.log('드롭된 파일 수:', dt.files.length);
    console.log('드롭된 텍스트 타입:', dt.types);
    
    const file = Array.from(dt.files)[0];
    if (file) {
      console.log('파일 드롭됨:', file.name);
      return handleFiles(dt.files);
    }

    // 선택 영역 드래그 등 텍스트 떨어지는 경우
    const text = dt.getData('text/plain') || dt.getData('text/html');
    if (text) {
      console.log('텍스트 드롭됨, 길이:', text.length);
      const parsedRows = parsePlainText(text.replace(/<[^>]+>/g,''));
      console.log('텍스트에서 파싱된 행 수:', parsedRows.length);
      setRows(parsedRows);
    }
  }, [handleFiles]);

  const onPaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const text = e.clipboardData.getData('text/plain') || e.clipboardData.getData('text/html');
    if (text) { 
      e.preventDefault(); 
      console.log('붙여넣기 텍스트 길이:', text.length);
      const parsedRows = parsePlainText(text.replace(/<[^>]+>/g,''));
      console.log('붙여넣기에서 파싱된 행 수:', parsedRows.length);
      setRows(parsedRows); 
    }
  }, []);

  // 파일 선택 핸들러
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      console.log('파일 선택됨:', files[0].name);
      handleFiles(files);
    }
  }, [handleFiles]);

  // 행 수정 함수
  const updateRow = (index: number, field: keyof ParsedRow, value: any) => {
    setRows(prev => prev.map((row, i) => 
      i === index ? { ...row, [field]: value } : row
    ));
  };

  // 편집 모드 토글
  const toggleEdit = (index: number) => {
    setEditingRow(editingRow === index ? null : index);
  };

  // 행 삭제
  const deleteRow = (index: number) => {
    if (window.confirm('이 행을 삭제하시겠습니까?')) {
      setRows(prev => prev.filter((_, i) => i !== index));
      if (editingRow === index) {
        setEditingRow(null);
      }
    }
  };

  // 새 행 추가
  const addNewRow = () => {
    const newRow: ParsedRow = {
      section: 'display',
      product: '인터랙티브 배너',
      target: null,
      startYmd: '2025-07-01',
      endYmd: '2025-07-07',
      dailyImps: null,
      totalImps: null,
    };
    setRows(prev => [...prev, newRow]);
    setEditingRow(rows.length); // 새로 추가된 행을 편집 모드로
  };

  async function save() {
    if (!bookings.length) {
      alert('생성된 Booking이 없습니다.');
      return;
    }
    
    // 저장 확인 알럿
    const confirmed = window.confirm(
      `정말 ${bookings.length.toLocaleString()}건의 Booking을 저장하시겠습니까?\n\n` +
      `저장 후에는 수정이 어려울 수 있습니다.`
    );
    
    if (!confirmed) return;
    
    setIsLoading(true);
    try {
      await createBookingsBulk(bookings, { 
        rowIdsByBase, 
        revalidateTarget: '/' 
      });
      alert(`Booking ${bookings.length.toLocaleString()}건 저장 완료`);
      onDone?.();
    } catch (e: any) {
      if (e?.code === 'CAPACITY_EXCEEDED') {
        const details = (e.failures ?? []).map((f: any) =>
          `• ${f.basis_dt} / ${f.base} : ${f.reason}${f.capacity ? ` (행수 ${f.capacity})` : ''}`
        ).join('\n');
        alert(`저장 실패: 행 수 초과 또는 점유 중입니다.\n\n${details}`);
      } else {
        alert(`저장 실패: ${e?.message ?? e}`);
      }
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          <strong>오류:</strong> {error}
          <button 
            onClick={() => setError(null)} 
            className="ml-2 text-red-500 hover:text-red-700"
          >
            ✕
          </button>
        </div>
      )}
      
      <div
        onDrop={onDrop}
        onDragOver={(e)=>e.preventDefault()}
        className="grid h-40 place-items-center rounded border-2 border-dashed border-gray-300 hover:border-gray-400 transition-colors"
      >
        <div className="text-center">
          <div className="font-medium">여기로 파일을 드래그하거나,</div>
          <div className="text-sm text-gray-600 mb-2">스프레드시트 범위를 복사해 아래 입력창에 붙여넣기</div>
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileSelect}
            className="hidden"
            id="file-upload"
          />
          <label
            htmlFor="file-upload"
            className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 cursor-pointer"
          >
            파일 선택
          </label>
        </div>
      </div>
      
      <div className="text-sm text-gray-500 text-center">
        미디어믹스 업로드 컴포넌트가 로드되었습니다. 파일을 드래그하거나 붙여넣기해보세요.
        <br />
        <span className="text-xs text-gray-400">
          지원 형식: Excel(.xlsx, .xls), CSV, 또는 스프레드시트 복사/붙여넣기
        </span>
      </div>

      <textarea
        placeholder="여기에 붙여넣기 (Ctrl/Cmd+V)"
        onPaste={onPaste}
        className="h-28 w-full rounded border p-2 font-mono text-sm resize-none"
      />

      <div className="text-sm text-gray-600">
        파싱 결과: 행 {rows.length}개 → Booking {bookings.length}건
      </div>

      <div className="max-h-56 overflow-auto rounded border">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-2 py-1 text-left">section</th>
              <th className="px-2 py-1 text-left">product</th>
              <th className="px-2 py-1 text-left">target</th>
              <th className="px-2 py-1">start~end</th>
              <th className="px-2 py-1 text-right">daily</th>
              <th className="px-2 py-1 text-right">total</th>
              <th className="px-2 py-1 text-center">편집</th>
              <th className="px-2 py-1 text-center">삭제</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0,50).map((r,i)=>(
              <tr key={i} className={`border-t ${editingRow === i ? 'bg-blue-50' : ''}`}>
                <td className="px-2 py-1">
                  {editingRow === i ? (
                    <select
                      value={r.section}
                      onChange={(e) => updateRow(i, 'section', e.target.value)}
                      className="w-full px-1 py-0.5 text-xs border rounded"
                    >
                      <option value="display">display</option>
                      <option value="alert">alert</option>
                      <option value="other">other</option>
                    </select>
                  ) : (
                    r.section
                  )}
                </td>
                <td className="px-2 py-1">
                  {editingRow === i ? (
                    <select
                      value={r.product}
                      onChange={(e) => updateRow(i, 'product', e.target.value)}
                      className="w-full px-1 py-0.5 text-xs border rounded"
                    >
                      {PRODUCT_OPTIONS.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    r.product
                  )}
                </td>
                <td className="px-2 py-1">
                  {editingRow === i ? (
                    <input
                      type="text"
                      value={r.target ?? ''}
                      onChange={(e) => updateRow(i, 'target', e.target.value)}
                      className="w-full px-1 py-0.5 text-xs border rounded"
                      placeholder="타겟팅"
                    />
                  ) : (
                    r.target ?? ''
                  )}
                </td>
                <td className="px-2 py-1 text-center">
                  {editingRow === i ? (
                    <div className="flex gap-1">
                      <input
                        type="text"
                        value={r.startYmd}
                        onChange={(e) => updateRow(i, 'startYmd', e.target.value)}
                        className="w-20 px-1 py-0.5 text-xs border rounded"
                        placeholder="YYYY-MM-DD"
                      />
                      <span className="text-xs">~</span>
                      <input
                        type="text"
                        value={r.endYmd}
                        onChange={(e) => updateRow(i, 'endYmd', e.target.value)}
                        className="w-20 px-1 py-0.5 text-xs border rounded"
                        placeholder="YYYY-MM-DD"
                      />
                    </div>
                  ) : (
                    `${r.startYmd} ~ ${r.endYmd}`
                  )}
                </td>
                <td className="px-2 py-1 text-right">
                  {editingRow === i ? (
                    <input
                      type="number"
                      value={r.dailyImps ?? ''}
                      onChange={(e) => updateRow(i, 'dailyImps', e.target.value ? Number(e.target.value) : null)}
                      className="w-16 px-1 py-0.5 text-xs border rounded text-right"
                      placeholder="0"
                    />
                  ) : (
                    r.dailyImps ?? ''
                  )}
                </td>
                <td className="px-2 py-1 text-right">
                  {editingRow === i ? (
                    <input
                      type="number"
                      value={r.totalImps ?? ''}
                      onChange={(e) => updateRow(i, 'totalImps', e.target.value ? Number(e.target.value) : null)}
                      className="w-16 px-1 py-0.5 text-xs border rounded text-right"
                      placeholder="0"
                    />
                  ) : (
                    r.totalImps ?? ''
                  )}
                </td>
                <td className="px-2 py-1 text-center">
                  <button
                    onClick={() => toggleEdit(i)}
                    className="px-2 py-0.5 text-xs border rounded hover:bg-gray-100"
                  >
                    {editingRow === i ? '저장' : '편집'}
                  </button>
                </td>
                <td className="px-2 py-1 text-center">
                  <button
                    onClick={() => deleteRow(i)}
                    className="px-2 py-0.5 text-xs border rounded hover:bg-red-100 text-red-600"
                  >
                    삭제
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between items-center">
        <button 
          className="rounded border px-3 py-2 hover:bg-gray-50 text-sm" 
          onClick={addNewRow}
          disabled={isLoading}
        >
          + 새 행 추가
        </button>
        
        <div className="flex gap-2">
          <button 
            className="rounded border px-3 py-2 hover:bg-gray-50" 
            onClick={()=>setRows([])}
            disabled={isLoading}
          >
            초기화
          </button>
          <button 
            className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50" 
            onClick={save}
            disabled={isLoading || bookings.length === 0}
          >
            {isLoading ? '저장 중...' : '자동 Booking 저장'}
          </button>
        </div>
      </div>
    </div>
  );
}
