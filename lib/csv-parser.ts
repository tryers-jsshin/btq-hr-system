import type { AttendanceCsvRow } from "@/types/attendance"

export class CsvParser {
  // CSV 파일 파싱
  static async parseAttendanceCsv(file: File): Promise<AttendanceCsvRow[]> {
    const text = await file.text()
    const lines = text.split('\n').filter(line => line.trim())
    
    if (lines.length < 2) {
      throw new Error("CSV 파일에 데이터가 없습니다.")
    }
    
    // 헤더 확인
    const headers = this.parseCsvLine(lines[0])
    const requiredHeaders = ['사원번호', '이름', '근무일자', '출근', '퇴근']
    
    // 헤더 인덱스 매핑
    const headerMap = new Map<string, number>()
    headers.forEach((header, index) => {
      headerMap.set(header.trim(), index)
    })
    
    // 필수 헤더 확인
    for (const required of requiredHeaders) {
      if (!headerMap.has(required)) {
        throw new Error(`필수 헤더 "${required}"가 없습니다.`)
      }
    }
    
    // 데이터 파싱
    const rows: AttendanceCsvRow[] = []
    const errors: string[] = []
    
    for (let i = 1; i < lines.length; i++) {
      try {
        const values = this.parseCsvLine(lines[i])
        if (values.length === 0) continue
        
        const row: AttendanceCsvRow = {
          employee_number: values[headerMap.get('사원번호')!]?.trim() || '',
          member_name: values[headerMap.get('이름')!]?.trim() || '',
          work_date: values[headerMap.get('근무일자')!]?.trim() || '',
          check_in_time: values[headerMap.get('출근')!]?.trim() || undefined,
          check_out_time: values[headerMap.get('퇴근')!]?.trim() || undefined,
        }
        
        // 유효성 검사
        if (!row.employee_number) {
          errors.push(`${i + 1}행: 사원번호가 없습니다.`)
          continue
        }
        
        if (!row.member_name) {
          errors.push(`${i + 1}행: 이름이 없습니다.`)
          continue
        }
        
        if (!row.work_date) {
          errors.push(`${i + 1}행: 근무일자가 없습니다.`)
          continue
        }
        
        // 날짜 형식 검증 (YYYY/MM/DD 또는 YYYY-MM-DD)
        const datePattern = /^\d{4}[\/\-](0[1-9]|1[0-2])[\/\-](0[1-9]|[12]\d|3[01])$/
        if (!datePattern.test(row.work_date)) {
          errors.push(`${i + 1}행: 날짜 형식이 올바르지 않습니다. (${row.work_date})`)
          continue
        }
        
        // 시간 형식 검증 (HH:mm 또는 H:mm)
        const timePattern = /^([0-9]|0[0-9]|1[0-9]|2[0-3]):([0-5][0-9])$/
        if (row.check_in_time && !timePattern.test(row.check_in_time)) {
          errors.push(`${i + 1}행: 출근 시간 형식이 올바르지 않습니다. (${row.check_in_time})`)
          continue
        }
        
        if (row.check_out_time && !timePattern.test(row.check_out_time)) {
          errors.push(`${i + 1}행: 퇴근 시간 형식이 올바르지 않습니다. (${row.check_out_time})`)
          continue
        }
        
        rows.push(row)
      } catch (error) {
        errors.push(`${i + 1}행: 파싱 오류 - ${error instanceof Error ? error.message : '알 수 없는 오류'}`)
      }
    }
    
    if (errors.length > 0) {
      console.warn("CSV 파싱 경고:", errors)
    }
    
    if (rows.length === 0) {
      throw new Error("유효한 데이터가 없습니다. CSV 파일을 확인해주세요.")
    }
    
    return rows
  }
  
  // CSV 라인 파싱 (쉼표 구분, 따옴표 처리)
  private static parseCsvLine(line: string): string[] {
    const values: string[] = []
    let current = ''
    let inQuotes = false
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      const nextChar = line[i + 1]
      
      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // 이스케이프된 따옴표
          current += '"'
          i++
        } else {
          // 따옴표 시작/종료
          inQuotes = !inQuotes
        }
      } else if (char === ',' && !inQuotes) {
        // 필드 구분자
        values.push(current)
        current = ''
      } else {
        current += char
      }
    }
    
    // 마지막 필드 추가
    values.push(current)
    
    return values
  }
  
  // CSV 내보내기용 포맷팅
  static formatToCsv(data: any[], headers: string[]): string {
    const csvHeaders = headers.join(',')
    const csvRows = data.map(row => {
      return headers.map(header => {
        const value = row[header] || ''
        // 쉼표나 따옴표가 포함된 경우 따옴표로 감싸기
        if (String(value).includes(',') || String(value).includes('"')) {
          return `"${String(value).replace(/"/g, '""')}"`
        }
        return String(value)
      }).join(',')
    })
    
    return [csvHeaders, ...csvRows].join('\n')
  }
  
  // Blob 생성 (다운로드용)
  static createCsvBlob(csvContent: string): Blob {
    // BOM 추가 (Excel에서 한글 깨짐 방지)
    const BOM = '\uFEFF'
    return new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })
  }
  
  // CSV 다운로드
  static downloadCsv(filename: string, csvContent: string): void {
    const blob = this.createCsvBlob(csvContent)
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }
}