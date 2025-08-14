import { supabase } from "./supabase"
import type {
  AttendanceSnapshot,
  AttendanceRecord,
  AttendanceDetail,
  AttendanceSummary,
  AttendanceModifyRequest,
  AttendanceCsvRow,
  CsvUploadResult,
  AttendanceFilter,
  OvertimeSettlement,
} from "@/types/attendance"

export class SupabaseAttendanceStorage {
  // ==================== 스냅샷 관리 ====================
  
  // 스냅샷 생성
  async createSnapshot(filename: string, uploadedBy: string): Promise<AttendanceSnapshot> {
    const uploadDate = new Date().toISOString().split('T')[0]
    
    const { data, error } = await supabase
      .from("attendance_snapshots")
      .insert({
        filename,
        upload_date: uploadDate,
        uploaded_by: uploadedBy,
        status: "uploaded",
      })
      .select()
      .single()
    
    if (error) throw error
    return data
  }
  
  // 스냅샷 상태 업데이트
  async updateSnapshotStatus(
    snapshotId: string, 
    status: AttendanceSnapshot["status"],
    totalRecords?: number,
    errorMessage?: string
  ): Promise<void> {
    const updateData: any = { status }
    if (totalRecords !== undefined) updateData.total_records = totalRecords
    if (errorMessage) updateData.error_message = errorMessage
    
    const { error } = await supabase
      .from("attendance_snapshots")
      .update(updateData)
      .eq("id", snapshotId)
    
    if (error) throw error
  }
  
  // 스냅샷 목록 조회
  async getSnapshots(limit = 10): Promise<AttendanceSnapshot[]> {
    const { data, error } = await supabase
      .from("attendance_snapshots")
      .select("*")
      .order("uploaded_at", { ascending: false })
      .limit(limit)
    
    if (error) throw error
    return data || []
  }
  
  // ==================== CSV 업로드 및 처리 ====================
  
  // CSV 데이터 업로드 및 처리 (최적화 버전)
  async uploadCsvData(
    snapshotId: string,
    csvRows: AttendanceCsvRow[],
    uploadedBy: string
  ): Promise<CsvUploadResult> {
    const result: CsvUploadResult = {
      snapshot_id: snapshotId,
      total_rows: csvRows.length,
      processed_rows: 0,
      new_records: 0,
      updated_records: 0,
      skipped_records: 0,
      errors: [],
    }
    
    try {
      const startTime = Date.now()
      console.log(`[CSV Upload] 최적화된 배치 처리 시작: ${csvRows.length}개 행`)
      
      // 스냅샷 상태를 processing으로 변경
      await this.updateSnapshotStatus(snapshotId, "processing")
      
      // ========== 1단계: 필요한 모든 데이터 사전 로드 ==========
      console.log("[CSV Upload] 1단계: 데이터 사전 로드")
      
      // 1-1. 모든 구성원 정보 한 번에 로드
      const { data: members } = await supabase
        .from("members")
        .select("id, employee_number, name")
      
      const memberMap = new Map(
        members?.map(m => [m.employee_number, { id: m.id, name: m.name }]) || []
      )
      
      // 1-2. 모든 work_types 정보 한 번에 로드
      const { data: workTypes } = await supabase
        .from("work_types")
        .select("id, name, start_time, end_time, is_leave, is_holiday")
      
      const workTypeMap = new Map(
        workTypes?.map(wt => [wt.id, wt]) || []
      )
      
      // 1-3. 날짜 범위 계산
      const allDates = new Set<string>()
      const allMemberIds = new Set<string>()
      
      csvRows.forEach(row => {
        const workDate = row.work_date.replace(/\//g, '-')
        allDates.add(workDate)
        const memberInfo = memberMap.get(row.employee_number)
        if (memberInfo) {
          allMemberIds.add(memberInfo.id)
        }
      })
      
      // 1-4. 해당 기간의 모든 근무표 한 번에 로드
      let scheduleMap = new Map<string, any>()
      if (allMemberIds.size > 0 && allDates.size > 0) {
        const { data: schedules } = await supabase
          .from("work_schedule_entries")
          .select("id, member_id, date, work_type_id, original_work_type_id")
          .in("member_id", Array.from(allMemberIds))
          .in("date", Array.from(allDates))
        
        schedules?.forEach(s => {
          const key = `${s.member_id}_${s.date}`
          scheduleMap.set(key, s)
        })
      }
      
      // 1-5. 기존 출퇴근 기록 한 번에 로드
      const { data: existingRecords } = await supabase
        .from("attendance_records")
        .select("id, employee_number, work_date, check_in_time, check_out_time, schedule_id, work_type_id, scheduled_start_time, scheduled_end_time")
        .in("work_date", Array.from(allDates))
      
      const existingMap = new Map<string, any>()
      existingRecords?.forEach(r => {
        const key = `${r.employee_number}_${r.work_date}`
        existingMap.set(key, r)
      })
      
      console.log(`[CSV Upload] 데이터 로드 완료: 구성원 ${members?.length}명, 근무유형 ${workTypes?.length}개, 근무표 ${scheduleMap.size}개`)
      
      // ========== 2단계: 배치 처리를 위한 데이터 준비 ==========
      console.log("[CSV Upload] 2단계: 배치 처리 데이터 준비")
      
      const toInsert: any[] = []
      const toUpdate: any[] = []
      const mileageUpdates: any[] = []
      
      // 각 행을 처리하여 배치 데이터 준비
      for (let i = 0; i < csvRows.length; i++) {
        const row = csvRows[i]
        
        try {
          // 날짜 형식 변환
          const workDate = row.work_date.replace(/\//g, '-')
          
          // 구성원 정보 확인
          const memberInfo = memberMap.get(row.employee_number)
          if (!memberInfo) {
            console.warn(`[CSV Upload] 구성원 미발견: ${row.employee_number}`)
            result.errors.push({
              row: i + 1,
              employee_number: row.employee_number,
              error: "등록되지 않은 사원번호"
            })
            continue
          }
          
          // 근무표 정보 조회 (사전 로드된 데이터에서)
          let scheduleInfo = null
          let hasSchedule = false
          
          const scheduleKey = `${memberInfo.id}_${workDate}`
          const schedule = scheduleMap.get(scheduleKey)
          
          if (schedule && schedule.work_type_id) {
            hasSchedule = true
            const workType = workTypeMap.get(schedule.work_type_id)
            
            if (workType && workType.is_leave && schedule.original_work_type_id) {
              // 휴가 처리
              const originalWorkType = workTypeMap.get(schedule.original_work_type_id)
              
              if (originalWorkType) {
                const leaveStart = this.timeToMinutes(workType.start_time)
                const leaveEnd = this.timeToMinutes(workType.end_time)
                const workStart = this.timeToMinutes(originalWorkType.start_time)
                const workEnd = this.timeToMinutes(originalWorkType.end_time)
                
                const isFullDayLeave = 
                  (leaveStart === 0 && leaveEnd >= 1439) ||
                  (leaveStart <= workStart && leaveEnd >= workEnd)
                
                if (isFullDayLeave) {
                  scheduleInfo = {
                    schedule_id: schedule.id,
                    work_type_id: schedule.work_type_id,
                    scheduled_start_time: null,
                    scheduled_end_time: null,
                    is_holiday: true
                  }
                } else {
                  let actualWorkStart = originalWorkType.start_time
                  let actualWorkEnd = originalWorkType.end_time
                  
                  if (leaveStart <= workStart && leaveEnd > workStart && leaveEnd < workEnd) {
                    actualWorkStart = workType.end_time
                  } else if (leaveStart > workStart && leaveStart < workEnd && leaveEnd >= workEnd) {
                    actualWorkEnd = workType.start_time
                  }
                  
                  scheduleInfo = {
                    schedule_id: schedule.id,
                    work_type_id: schedule.work_type_id,
                    scheduled_start_time: actualWorkStart,
                    scheduled_end_time: actualWorkEnd,
                    is_holiday: false,
                    is_partial_leave: true
                  }
                }
              } else {
                scheduleInfo = {
                  schedule_id: schedule.id,
                  work_type_id: schedule.work_type_id,
                  scheduled_start_time: null,
                  scheduled_end_time: null,
                  is_holiday: true
                }
              }
            } else if (workType && (workType.is_leave || workType.is_holiday)) {
              scheduleInfo = {
                schedule_id: schedule.id,
                work_type_id: schedule.work_type_id,
                scheduled_start_time: null,
                scheduled_end_time: null,
                is_holiday: true
              }
            } else if (workType) {
              scheduleInfo = {
                schedule_id: schedule.id,
                work_type_id: schedule.work_type_id,
                scheduled_start_time: workType.start_time,
                scheduled_end_time: workType.end_time,
                is_holiday: false
              }
            }
          }
          
          // 지각, 조기퇴근, 초과근무 계산
          // 근무표가 없으면 계산하지 않음
          const calculations = hasSchedule 
            ? this.calculateAttendanceMetrics(
                row.check_in_time,
                row.check_out_time,
                scheduleInfo?.scheduled_start_time,
                scheduleInfo?.scheduled_end_time,
                scheduleInfo?.is_holiday
              )
            : {
                is_late: false,
                late_minutes: 0,
                is_early_leave: false,
                early_leave_minutes: 0,
                overtime_minutes: 0,
                actual_work_minutes: row.check_in_time && row.check_out_time 
                  ? this.timeToMinutes(row.check_out_time) - this.timeToMinutes(row.check_in_time)
                  : 0,
              }
          
          // 기존 레코드 확인 (사전 로드된 데이터에서)
          const existingKey = `${row.employee_number}_${workDate}`
          const existing = existingMap.get(existingKey)
          
          // 기존 레코드가 있는지 확인하고 배치 데이터 준비
          if (existing) {
            // 업데이트 정책: 비어있던 셀만 채움
            let hasUpdate = false
            const updatedCheckIn = !existing.check_in_time && row.check_in_time ? row.check_in_time : existing.check_in_time
            const updatedCheckOut = !existing.check_out_time && row.check_out_time ? row.check_out_time : existing.check_out_time
            
            if ((!existing.check_in_time && row.check_in_time) || (!existing.check_out_time && row.check_out_time)) {
              hasUpdate = true
            }
            
            if (hasUpdate) {
              // 재계산
              const newCalculations = hasSchedule
                ? this.calculateAttendanceMetrics(
                    updatedCheckIn,
                    updatedCheckOut,
                    scheduleInfo?.scheduled_start_time,
                    scheduleInfo?.scheduled_end_time,
                    scheduleInfo?.is_holiday
                  )
                : {
                    is_late: false,
                    late_minutes: 0,
                    is_early_leave: false,
                    early_leave_minutes: 0,
                    overtime_minutes: 0,
                    actual_work_minutes: updatedCheckIn && updatedCheckOut
                      ? this.timeToMinutes(updatedCheckOut) - this.timeToMinutes(updatedCheckIn)
                      : 0,
                  }
              
              // 업데이트 배치에 추가
              toUpdate.push({
                id: existing.id,
                check_in_time: updatedCheckIn,
                check_out_time: updatedCheckOut,
                ...newCalculations,
                snapshot_id: snapshotId,
                schedule_id: scheduleInfo?.schedule_id || existing.schedule_id,
                work_type_id: scheduleInfo?.work_type_id || existing.work_type_id,
                scheduled_start_time: scheduleInfo?.scheduled_start_time !== undefined ? scheduleInfo.scheduled_start_time : existing.scheduled_start_time,
                scheduled_end_time: scheduleInfo?.scheduled_end_time !== undefined ? scheduleInfo.scheduled_end_time : existing.scheduled_end_time,
              })
              
              // 마일리지 업데이트 준비
              if (memberInfo?.id && (updatedCheckIn || updatedCheckOut)) {
                mileageUpdates.push({
                  member_id: memberInfo.id,
                  work_date: workDate,
                  reference_id: existing.id,
                  late_minutes: newCalculations.late_minutes,
                  early_leave_minutes: newCalculations.early_leave_minutes,
                  overtime_minutes: newCalculations.overtime_minutes,
                })
              }
              
              result.updated_records++
            } else {
              result.skipped_records++
            }
          } else {
            // 새 레코드 생성 준비 - 중복 체크를 위해 키 확인
            const insertKey = `${row.employee_number}_${workDate}`
            const alreadyInInsertList = toInsert.some(
              item => `${item.employee_number}_${item.work_date}` === insertKey
            )
            
            if (!alreadyInInsertList) {
              const insertData = {
                snapshot_id: snapshotId,
                employee_number: row.employee_number,
                member_id: memberInfo?.id,
                member_name: row.member_name,
                work_date: workDate,
                check_in_time: row.check_in_time || null,
                check_out_time: row.check_out_time || null,
                schedule_id: scheduleInfo?.schedule_id || null,
                work_type_id: scheduleInfo?.work_type_id || null,
                scheduled_start_time: scheduleInfo?.scheduled_start_time || null,
                scheduled_end_time: scheduleInfo?.scheduled_end_time || null,
                ...calculations,
              }
              
              toInsert.push(insertData)
              
              // 마일리지 업데이트 준비 (삽입 후 ID를 모르므로 나중에 처리)
              if (memberInfo?.id && (row.check_in_time || row.check_out_time)) {
                mileageUpdates.push({
                  member_id: memberInfo.id,
                  work_date: workDate,
                  employee_number: row.employee_number, // ID 대신 사원번호 사용
                  late_minutes: calculations.late_minutes,
                  early_leave_minutes: calculations.early_leave_minutes,
                  overtime_minutes: calculations.overtime_minutes,
                })
              }
              
              result.new_records++
            } else {
              console.warn(`[CSV Upload] 중복된 행 건너뜀: ${row.employee_number} on ${workDate}`)
              result.skipped_records++
            }
          }
          
          result.processed_rows++
        } catch (error) {
          result.errors.push({
            row: i + 1,
            employee_number: row.employee_number,
            error: error instanceof Error ? error.message : "처리 중 오류 발생",
          })
        }
      }
      
      console.log(`[CSV Upload] 배치 데이터 준비 완료: 삽입 ${toInsert.length}건, 업데이트 ${toUpdate.length}건`)
      
      // ========== 3단계: 배치 삽입 ==========
      if (toInsert.length > 0) {
        console.log(`[CSV Upload] 3단계: ${toInsert.length}건 배치 삽입`)
        
        // 청크 단위로 나누어 삽입 (너무 많으면 타임아웃 방지)
        const chunkSize = 50
        for (let i = 0; i < toInsert.length; i += chunkSize) {
          const chunk = toInsert.slice(i, i + chunkSize)
          
          // upsert 사용하여 중복 키 오류 방지
          const { data: insertedRecords, error: insertError } = await supabase
            .from("attendance_records")
            .upsert(chunk, {
              onConflict: 'employee_number,work_date',
              ignoreDuplicates: false
            })
            .select("id, employee_number, work_date")
          
          if (insertError) {
            console.error(`[CSV Upload] 배치 삽입 오류:`, insertError)
            // 중복 키 오류는 무시하고 계속 진행
            if (insertError.code !== '23505') {
              throw new Error(`근태 기록 배치 삽입 실패: ${insertError.message}`)
            }
            console.warn(`[CSV Upload] 일부 중복 레코드 건너뜀`)
          }
          
          // 삽입된 레코드의 ID로 마일리지 업데이트 준비
          insertedRecords?.forEach(record => {
            const mileageUpdate = mileageUpdates.find(
              m => m.employee_number === record.employee_number && m.work_date === record.work_date
            )
            if (mileageUpdate) {
              mileageUpdate.reference_id = record.id
              delete mileageUpdate.employee_number // 사원번호 제거
            }
          })
          
          console.log(`[CSV Upload] 배치 삽입 진행: ${Math.min(i + chunkSize, toInsert.length)}/${toInsert.length}`)
        }
      }
      
      // ========== 4단계: 배치 업데이트 ==========
      if (toUpdate.length > 0) {
        console.log(`[CSV Upload] 4단계: ${toUpdate.length}건 배치 업데이트`)
        
        // 각 레코드별로 업데이트 (배치 업데이트는 Supabase에서 직접 지원 안함)
        const updatePromises = toUpdate.map(record => {
          const { id, ...updateData } = record
          return supabase
            .from("attendance_records")
            .update(updateData)
            .eq("id", id)
        })
        
        // 병렬 처리
        const chunkSize = 10
        for (let i = 0; i < updatePromises.length; i += chunkSize) {
          const chunk = updatePromises.slice(i, i + chunkSize)
          await Promise.all(chunk)
          console.log(`[CSV Upload] 배치 업데이트 진행: ${Math.min(i + chunkSize, toUpdate.length)}/${toUpdate.length}`)
        }
      }
      
      // ========== 5단계: 마일리지 배치 업데이트 ==========
      if (mileageUpdates.length > 0) {
        console.log(`[CSV Upload] 5단계: ${mileageUpdates.length}건 마일리지 업데이트`)
        
        const { supabaseWorkMileageStorage } = await import("./supabase-work-mileage-storage")
        
        // 마일리지 업데이트를 병렬로 처리
        const mileagePromises = mileageUpdates
          .filter(m => m.reference_id) // ID가 있는 것만
          .map(m => 
            supabaseWorkMileageStorage.syncFromAttendance(
              m.member_id,
              m.work_date,
              m.reference_id,
              m.late_minutes,
              m.early_leave_minutes,
              m.overtime_minutes,
              'attendance'
            )
          )
        
        // 청크 단위로 병렬 처리
        const chunkSize = 10
        for (let i = 0; i < mileagePromises.length; i += chunkSize) {
          const chunk = mileagePromises.slice(i, i + chunkSize)
          await Promise.all(chunk)
          console.log(`[CSV Upload] 마일리지 업데이트 진행: ${Math.min(i + chunkSize, mileagePromises.length)}/${mileagePromises.length}`)
        }
      }
      
      const endTime = Date.now()
      console.log(`[CSV Upload] 최적화된 배치 처리 완료: ${endTime - startTime}ms`)
      
      // 스냅샷 상태 업데이트
      await this.updateSnapshotStatus(
        snapshotId, 
        result.errors.length > 0 ? "completed" : "completed",
        result.processed_rows
      )
      
    } catch (error) {
      await this.updateSnapshotStatus(
        snapshotId,
        "failed",
        0,
        error instanceof Error ? error.message : "업로드 실패"
      )
      throw error
    }
    
    return result
  }
  
  // 출퇴근 시간 기반 계산
  private calculateAttendanceMetrics(
    checkIn?: string | null,
    checkOut?: string | null,
    scheduledStart?: string | null,
    scheduledEnd?: string | null,
    isHoliday?: boolean
  ) {
    const result = {
      is_late: false,
      late_minutes: 0,
      is_early_leave: false,
      early_leave_minutes: 0,
      overtime_minutes: 0,
      actual_work_minutes: 0,
    }
    
    if (!checkIn || !checkOut) return result
    
    // 실제 근무 시간 계산
    const checkInTime = this.timeToMinutes(checkIn)
    const checkOutTime = this.timeToMinutes(checkOut)
    result.actual_work_minutes = checkOutTime - checkInTime
    
    // 휴무일/오프/휴가에 출근한 경우: 전체 근무시간이 초과근무
    if (isHoliday || !scheduledStart || !scheduledEnd) {
      result.overtime_minutes = result.actual_work_minutes
      // 휴무일에는 지각/조기퇴근 없음
      result.is_late = false
      result.late_minutes = 0
      result.is_early_leave = false
      result.early_leave_minutes = 0
      return result
    }
    
    // 정규 근무일 처리
    const scheduledStartTime = this.timeToMinutes(scheduledStart)
    const scheduledEndTime = this.timeToMinutes(scheduledEnd)
    
    // 지각 계산
    if (checkInTime > scheduledStartTime) {
      result.is_late = true
      result.late_minutes = checkInTime - scheduledStartTime
    }
    
    // 조기퇴근 계산
    if (checkOutTime < scheduledEndTime) {
      result.is_early_leave = true
      result.early_leave_minutes = scheduledEndTime - checkOutTime
    }
    
    // 초과근무 계산 (정규 근무시간 종료 후의 근무만 계산)
    // 일찍 출근한 시간은 초과근무에 포함하지 않음
    if (checkOutTime > scheduledEndTime) {
      result.overtime_minutes = checkOutTime - scheduledEndTime
    }
    
    return result
  }
  
  // 시간 문자열을 분 단위로 변환
  private timeToMinutes(time: string | null | undefined): number {
    if (!time) return 0
    const [hours, minutes] = time.split(':').map(Number)
    return hours * 60 + minutes
  }
  
  // ==================== 근태 기록 조회 ====================
  
  // 근태 기록 조회 (근무표 기반 가상 레코드 포함)
  async getAttendanceRecords(filter: AttendanceFilter): Promise<AttendanceDetail[]> {
    // 1. 먼저 근무표 엔트리 조회 (기준 데이터)
    let scheduleQuery = supabase
      .from("work_schedule_entries")
      .select(`
        id,
        member_id,
        date,
        work_type_id,
        original_work_type_id
      `)
    
    if (filter.member_id) {
      scheduleQuery = scheduleQuery.eq("member_id", filter.member_id)
    }
    
    if (filter.start_date) {
      scheduleQuery = scheduleQuery.gte("date", filter.start_date)
    }
    
    if (filter.end_date) {
      scheduleQuery = scheduleQuery.lte("date", filter.end_date)
    }
    
    const { data: schedules, error: scheduleError } = await scheduleQuery
      .order("date", { ascending: false })
    
    if (scheduleError) throw scheduleError
    
    if (!schedules || schedules.length === 0) {
      return []
    }
    
    // 2. 해당 날짜들의 실제 출퇴근 기록 조회
    const memberDates = schedules.map(s => `${s.member_id}_${s.date}`)
    
    let attendanceQuery = supabase
      .from("attendance_records")
      .select("*")
    
    if (filter.member_id) {
      attendanceQuery = attendanceQuery.eq("member_id", filter.member_id)
    }
    
    if (filter.start_date) {
      attendanceQuery = attendanceQuery.gte("work_date", filter.start_date)
    }
    
    if (filter.end_date) {
      attendanceQuery = attendanceQuery.lte("work_date", filter.end_date)
    }
    
    const { data: attendances, error: attendanceError } = await attendanceQuery
    
    if (attendanceError) throw attendanceError
    
    // 출퇴근 기록을 맵으로 변환 (빠른 조회용)
    const attendanceMap = new Map()
    attendances?.forEach(a => {
      const key = `${a.member_id}_${a.work_date}`
      attendanceMap.set(key, a)
    })
    
    // 3. 필요한 member와 work_type 정보 수집
    const memberIds = [...new Set(schedules.map(s => s.member_id))]
    const workTypeIds = [...new Set(schedules.map(s => s.work_type_id).filter(Boolean))]
    const originalWorkTypeIds = [...new Set(schedules.map(s => s.original_work_type_id).filter(Boolean))]
    const allWorkTypeIds = [...new Set([...workTypeIds, ...originalWorkTypeIds])]
    
    // 4. member 정보 조회
    const memberMap = new Map()
    if (memberIds.length > 0) {
      const { data: members } = await supabase
        .from("members")
        .select("id, name, team_name, employee_number")
        .in("id", memberIds)
      
      members?.forEach(m => memberMap.set(m.id, m))
    }
    
    // 5. work_type 정보 조회
    const workTypeMap = new Map()
    if (allWorkTypeIds.length > 0) {
      const { data: workTypes } = await supabase
        .from("work_types")
        .select("id, name, bgcolor, fontcolor, is_leave, deduction_days, start_time, end_time, is_holiday")
        .in("id", allWorkTypeIds)
      
      workTypes?.forEach(wt => workTypeMap.set(wt.id, wt))
    }
    
    // 6. 근무표와 출퇴근 기록 결합 (가상 레코드 생성)
    const results: AttendanceDetail[] = []
    
    for (const schedule of schedules) {
      const key = `${schedule.member_id}_${schedule.date}`
      const attendance = attendanceMap.get(key)
      const member = memberMap.get(schedule.member_id)
      const workType = workTypeMap.get(schedule.work_type_id)
      
      // 휴가 처리를 위한 실제 근무 시간 계산
      let scheduledStart = workType?.start_time || null
      let scheduledEnd = workType?.end_time || null
      
      if (workType?.is_leave && schedule.original_work_type_id) {
        const originalWorkType = workTypeMap.get(schedule.original_work_type_id)
        if (originalWorkType) {
          // 스마트한 휴가 시간 계산 (부분 휴가 처리)
          const leaveStart = this.timeToMinutes(workType.start_time)
          const leaveEnd = this.timeToMinutes(workType.end_time)
          const workStart = this.timeToMinutes(originalWorkType.start_time)
          const workEnd = this.timeToMinutes(originalWorkType.end_time)
          
          const isFullDayLeave = 
            (leaveStart === 0 && leaveEnd >= 1439) || 
            (leaveStart <= workStart && leaveEnd >= workEnd)
          
          if (!isFullDayLeave) {
            if (leaveStart <= workStart && leaveEnd > workStart && leaveEnd < workEnd) {
              scheduledStart = workType.end_time
              scheduledEnd = originalWorkType.end_time
            } else if (leaveStart > workStart && leaveStart < workEnd && leaveEnd >= workEnd) {
              scheduledStart = originalWorkType.start_time
              scheduledEnd = workType.start_time
            }
          } else {
            scheduledStart = null
            scheduledEnd = null
          }
        }
      } else if (workType?.is_leave || workType?.is_holiday) {
        scheduledStart = null
        scheduledEnd = null
      }
      
      // 출퇴근 기록이 있으면 사용, 없으면 가상 레코드 생성
      if (attendance) {
        // 실제 기록이 있는 경우
        results.push({
          ...attendance,
          team_name: member?.team_name,
          work_type_name: workType?.name,
          work_type_bgcolor: workType?.bgcolor,
          work_type_fontcolor: workType?.fontcolor,
          is_leave: workType?.is_leave || false,
          is_holiday: workType?.is_holiday || false,
          deduction_days: workType?.deduction_days || null,
        })
      } else {
        // 가상 레코드 생성 (근무표는 있지만 출퇴근 기록이 없는 경우)
        const virtualRecord: AttendanceDetail = {
          // 기본 필드
          id: `virtual_${key}`,
          snapshot_id: '',
          employee_number: member?.employee_number || '',
          member_id: schedule.member_id,
          member_name: member?.name || '',
          work_date: schedule.date,
          
          // 출퇴근 시간 (없음)
          check_in_time: null,
          check_out_time: null,
          
          // 근무표 정보
          schedule_id: schedule.id,
          work_type_id: schedule.work_type_id,
          scheduled_start_time: scheduledStart,
          scheduled_end_time: scheduledEnd,
          
          // 계산 필드 (초기값)
          is_late: false,
          late_minutes: 0,
          is_early_leave: false,
          early_leave_minutes: 0,
          overtime_minutes: 0,
          actual_work_minutes: 0,
          
          // 수정 추적
          is_modified: false,
          modified_by: null,
          modified_at: null,
          modification_reason: null,
          
          // 타임스탬프
          created_at: schedule.date,
          updated_at: schedule.date,
          
          // 추가 정보
          team_name: member?.team_name,
          work_type_name: workType?.name,
          work_type_bgcolor: workType?.bgcolor,
          work_type_fontcolor: workType?.fontcolor,
          is_leave: workType?.is_leave || false,
          is_holiday: workType?.is_holiday || false,
          deduction_days: workType?.deduction_days || null,
        }
        
        results.push(virtualRecord)
      }
    }
    
    // 필터 적용 (지각, 초과근무 등)
    let filteredResults = results
    
    if (filter.is_late !== undefined) {
      filteredResults = filteredResults.filter(r => r.is_late === filter.is_late)
    }
    
    if (filter.has_overtime) {
      filteredResults = filteredResults.filter(r => r.overtime_minutes > 0)
    }
    
    if (filter.is_modified !== undefined) {
      filteredResults = filteredResults.filter(r => r.is_modified === filter.is_modified)
    }
    
    return filteredResults
  }
  
  // 특정 구성원의 월별 근태 요약
  async getMonthlySummary(
    memberId: string,
    yearMonth: string
  ): Promise<AttendanceSummary> {
    const [year, month] = yearMonth.split("-")
    const startDate = `${yearMonth}-01`
    // 해당 월의 마지막 날 계산 (다음 달 1일에서 하루 빼기)
    const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate()
    const endDate = `${yearMonth}-${lastDay.toString().padStart(2, '0')}`
    
    // 기본 summary 객체 생성
    const summary: AttendanceSummary = {
      member_id: memberId,
      member_name: "",
      period: yearMonth,
      work_days: 0,
      late_days: 0,
      early_leave_days: 0,
      total_late_minutes: 0,
      total_overtime_minutes: 0,
      net_overtime_minutes: 0,
    }
    
    // 먼저 구성원 정보 가져오기
    const { data: member, error: memberError } = await supabase
      .from("members")
      .select("name, team_name")
      .eq("id", memberId)
      .single()
    
    if (memberError) {
      console.error("Error fetching member:", memberError)
      // 에러가 있어도 기본 summary 반환
      return summary
    }
    
    if (member) {
      summary.member_name = member.name
      summary.team_name = member.team_name || undefined
    }
    
    // 근태 기록 조회
    const { data: records, error } = await supabase
      .from("attendance_records")
      .select("*")
      .eq("member_id", memberId)
      .gte("work_date", startDate)
      .lte("work_date", endDate)
    
    if (error) {
      console.error("Error fetching attendance records:", error)
      // 에러가 있어도 구성원 정보가 있는 summary 반환
      return summary
    }
    
    // 레코드가 있는 경우만 계산
    if (records && records.length > 0) {
      summary.work_days = records.length
      
      for (const record of records) {
        if (record.is_late) {
          summary.late_days++
          summary.total_late_minutes += record.late_minutes
        }
        if (record.is_early_leave) {
          summary.early_leave_days++
        }
        summary.total_overtime_minutes += record.overtime_minutes
      }
      
      summary.net_overtime_minutes = 
        summary.total_overtime_minutes - summary.total_late_minutes
    }
    
    return summary
  }
  
  // ==================== 근태 수정 ====================
  
  // 근태 기록 수정
  async modifyAttendanceRecord(request: AttendanceModifyRequest): Promise<void> {
    const { record_id, check_in_time, check_out_time, modification_reason, modified_by } = request
    
    // 가상 레코드인 경우 새로 생성
    if (record_id.startsWith('virtual_')) {
      // virtual_memberId_date 형식에서 정보 추출
      const parts = record_id.replace('virtual_', '').split('_')
      const memberId = parts[0]
      const workDate = parts[1]
      
      // 근무표 정보 조회
      const { data: schedule } = await supabase
        .from("work_schedule_entries")
        .select("*")
        .eq("member_id", memberId)
        .eq("date", workDate)
        .single()
      
      if (!schedule) throw new Error("근무표를 찾을 수 없습니다.")
      
      // 구성원 정보 조회
      const { data: member } = await supabase
        .from("members")
        .select("name, employee_number")
        .eq("id", memberId)
        .single()
      
      // 새 근태 기록 생성
      const { error: insertError } = await supabase
        .from("attendance_records")
        .insert({
          member_id: memberId,
          work_date: workDate,
          check_in_time: check_in_time || null,
          check_out_time: check_out_time || null,
          schedule_id: schedule.id,
          work_type_id: schedule.work_type_id,
          employee_number: member?.employee_number || '',
          member_name: member?.name || '',
          is_late: false,
          late_minutes: 0,
          is_early_leave: false,
          early_leave_minutes: 0,
          overtime_minutes: 0,
          actual_work_minutes: 0,
          is_modified: true,
          modified_by,
          modified_at: new Date().toISOString(),
          modification_reason,
          snapshot_id: ''
        })
      
      if (insertError) {
        console.error(`Failed to create attendance from virtual for ${memberId} on ${workDate}:`, insertError)
        throw new Error(`가상 레코드에서 실제 근태 기록 생성 실패: ${insertError.message}`)
      }
      
      // 근태 정보 업데이트 (지각, 초과근무 등 재계산)
      await this.updateAttendanceFromSchedule(memberId, workDate)
      return
    }
    
    // 기존 레코드 조회
    const { data: record, error: fetchError } = await supabase
      .from("attendance_records")
      .select("*")
      .eq("id", record_id)
      .single()
    
    if (fetchError) throw fetchError
    if (!record) throw new Error("근태 기록을 찾을 수 없습니다.")
    
    // 반차 처리를 위해 work_schedule 조회
    let actualScheduledStart = record.scheduled_start_time
    let actualScheduledEnd = record.scheduled_end_time
    let isHoliday = !record.scheduled_start_time || !record.scheduled_end_time
    
    if (record.work_type_id && record.member_id) {
      // work_schedule_entries에서 original_work_type_id 확인
      const { data: schedule } = await supabase
        .from("work_schedule_entries")
        .select("original_work_type_id")
        .eq("member_id", record.member_id)
        .eq("date", record.work_date)
        .single()
      
      if (schedule?.original_work_type_id) {
        // 현재 work_type과 원래 work_type 정보 조회
        const [{ data: currentWorkType }, { data: originalWorkType }] = await Promise.all([
          supabase
            .from("work_types")
            .select("name, is_leave, start_time, end_time")  // start_time, end_time 추가
            .eq("id", record.work_type_id)
            .single(),
          supabase
            .from("work_types")
            .select("start_time, end_time")
            .eq("id", schedule.original_work_type_id)
            .single()
        ])
        
        if (currentWorkType?.is_leave && originalWorkType && currentWorkType.start_time && currentWorkType.end_time) {
          // 스마트한 휴가 시간 계산
          const leaveStart = this.timeToMinutes(currentWorkType.start_time)
          const leaveEnd = this.timeToMinutes(currentWorkType.end_time)
          const workStart = this.timeToMinutes(originalWorkType.start_time)
          const workEnd = this.timeToMinutes(originalWorkType.end_time)
          
          // 종일 휴가 체크
          const isFullDayLeave = 
            (leaveStart === 0 && leaveEnd >= 1439) || 
            (leaveStart <= workStart && leaveEnd >= workEnd)
          
          if (!isFullDayLeave) {
            // 부분 휴가: 휴가 시간을 제외한 나머지가 근무 시간
            if (leaveStart <= workStart && leaveEnd > workStart && leaveEnd < workEnd) {
              // 휴가가 근무 시작을 포함: 휴가 종료 후부터 근무
              actualScheduledStart = currentWorkType.end_time
              actualScheduledEnd = originalWorkType.end_time
              isHoliday = false
            } else if (leaveStart > workStart && leaveStart < workEnd && leaveEnd >= workEnd) {
              // 휴가가 근무 종료를 포함: 휴가 시작 전까지 근무
              actualScheduledStart = originalWorkType.start_time
              actualScheduledEnd = currentWorkType.start_time
              isHoliday = false
            }
          }
        }
      }
    }
    
    // 새로운 시간으로 재계산
    const newCheckIn = check_in_time !== undefined ? check_in_time : record.check_in_time
    const newCheckOut = check_out_time !== undefined ? check_out_time : record.check_out_time
    
    const calculations = this.calculateAttendanceMetrics(
      newCheckIn,
      newCheckOut,
      actualScheduledStart,
      actualScheduledEnd,
      isHoliday
    )
    
    // 업데이트
    const { error: updateError } = await supabase
      .from("attendance_records")
      .update({
        check_in_time: newCheckIn,
        check_out_time: newCheckOut,
        ...calculations,
        is_modified: true,
        modified_by,
        modified_at: new Date().toISOString(),
        modification_reason,
      })
      .eq("id", record_id)
    
    if (updateError) throw updateError
    
    // 근무 마일리지 동기화
    const { supabaseWorkMileageStorage } = await import("./supabase-work-mileage-storage")
    await supabaseWorkMileageStorage.syncFromAttendance(
      record.member_id,
      record.work_date,
      record_id,
      calculations.late_minutes,
      calculations.early_leave_minutes,
      calculations.overtime_minutes,
      'manual'  // 수동 수정
    )
  }
  
  // ==================== 근태 기록 업데이트 ====================
  
  // 근무표 변경 시 근태 기록 업데이트
  async updateAttendanceFromSchedule(
    memberId: string,
    workDate: string
  ): Promise<void> {
    console.log(`[updateAttendanceFromSchedule] Starting update for member ${memberId} on ${workDate}`)
    
    // 1. 근무표 정보 조회 (original_work_type_id 포함)
    const { data: schedule, error: scheduleError } = await supabase
      .from("work_schedule_entries")
      .select("id, work_type_id, original_work_type_id")
      .eq("member_id", memberId)
      .eq("date", workDate)
      .maybeSingle()
    
    if (scheduleError) {
      console.error(`[updateAttendanceFromSchedule] Error fetching schedule:`, scheduleError)
      throw scheduleError
    }
    
    console.log(`[updateAttendanceFromSchedule] Schedule found:`, schedule)
    
    if (!schedule) {
      // 근무표가 없으면 근태 기록에서 근무 정보 제거 및 계산 초기화
      const { data: attendance } = await supabase
        .from("attendance_records")
        .select("id")
        .eq("member_id", memberId)
        .eq("work_date", workDate)
        .maybeSingle()
      
      if (attendance) {
        await supabase
          .from("attendance_records")
          .update({
            schedule_id: null,
            work_type_id: null,
            scheduled_start_time: null,
            scheduled_end_time: null,
            // 근무표가 없으면 지각/초과근무 계산 초기화
            is_late: false,
            late_minutes: 0,
            is_early_leave: false,
            early_leave_minutes: 0,
            overtime_minutes: 0
          })
          .eq("member_id", memberId)
          .eq("work_date", workDate)
        
        // 마일리지도 초기화 (기존 트랜잭션 삭제)
        const { supabaseWorkMileageStorage } = await import("./supabase-work-mileage-storage")
        await supabaseWorkMileageStorage.syncFromAttendance(
          memberId,
          workDate,
          attendance.id,
          0, // late_minutes
          0, // early_leave_minutes
          0, // overtime_minutes
          'leave' // 연차로 인한 초기화
        )
      }
      return
    }
    
    // 2. work_type 정보 조회
    const { data: workType } = await supabase
      .from("work_types")
      .select("name, start_time, end_time, is_leave, is_holiday")
      .eq("id", schedule.work_type_id)
      .single()
    
    // 3. 근태 기록 조회
    const { data: attendance, error: attendanceError } = await supabase
      .from("attendance_records")
      .select("id, check_in_time, check_out_time")
      .eq("member_id", memberId)
      .eq("work_date", workDate)
      .maybeSingle()
    
    if (attendanceError) {
      console.error(`[updateAttendanceFromSchedule] Error fetching attendance:`, attendanceError)
      throw attendanceError
    }
    
    if (!attendance) {
      console.log(`[updateAttendanceFromSchedule] No attendance record found for member ${memberId} on ${workDate}`)
      
      // 근태 기록이 없어도 연차/근무표 변경 시 마일리지 0으로 설정
      if (workType?.is_leave || schedule.original_work_type_id) {
        console.log(`[updateAttendanceFromSchedule] Leave day detected, setting mileage to 0`)
        const { supabaseWorkMileageStorage } = await import("./supabase-work-mileage-storage")
        await supabaseWorkMileageStorage.syncFromAttendance(
          memberId,
          workDate,
          undefined,  // attendance ID 없음
          0,  // late_minutes
          0,  // early_leave_minutes
          0,  // overtime_minutes
          'leave'  // source
        )
      }
      return
    }
    
    console.log(`[updateAttendanceFromSchedule] Attendance record found:`, attendance)
    
    // 휴가 처리 (스마트한 방식)
    if (workType?.is_leave && schedule.original_work_type_id) {
      // 원래 근무 유형 조회
      const { data: originalWorkType } = await supabase
        .from("work_types")
        .select("start_time, end_time")
        .eq("id", schedule.original_work_type_id)
        .single()
      
      let scheduledStart = null
      let scheduledEnd = null
      let isHoliday = false
      
      if (originalWorkType) {
        // 스마트한 휴가 시간 계산
        const leaveStart = this.timeToMinutes(workType.start_time)
        const leaveEnd = this.timeToMinutes(workType.end_time)
        const workStart = this.timeToMinutes(originalWorkType.start_time)
        const workEnd = this.timeToMinutes(originalWorkType.end_time)
        
        // 종일 휴가 체크
        const isFullDayLeave = 
          (leaveStart === 0 && leaveEnd >= 1439) || 
          (leaveStart <= workStart && leaveEnd >= workEnd)
        
        if (isFullDayLeave) {
          isHoliday = true
        } else {
          // 부분 휴가: 휴가 시간을 제외한 나머지가 근무 시간
          if (leaveStart <= workStart && leaveEnd > workStart && leaveEnd < workEnd) {
            // 휴가가 근무 시작을 포함: 휴가 종료 후부터 근무
            scheduledStart = workType.end_time
            scheduledEnd = originalWorkType.end_time
          } else if (leaveStart > workStart && leaveStart < workEnd && leaveEnd >= workEnd) {
            // 휴가가 근무 종료를 포함: 휴가 시작 전까지 근무
            scheduledStart = originalWorkType.start_time
            scheduledEnd = workType.start_time
          } else if (leaveStart > workStart && leaveEnd < workEnd) {
            // 휴가가 근무 중간에 있음: 복잡한 케이스, 일단 종일 휴가로 처리
            // TODO: 향후 분할 근무 지원 시 개선 필요
            isHoliday = true
          }
        }
      } else {
        // original_work_type을 찾을 수 없는 경우 종일 휴가로 처리
        isHoliday = true
      }
      
      const calculations = this.calculateAttendanceMetrics(
        attendance.check_in_time,
        attendance.check_out_time,
        scheduledStart,
        scheduledEnd,
        isHoliday
      )
      
      const { error: updateError } = await supabase
        .from("attendance_records")
        .update({
          schedule_id: schedule.id,
          work_type_id: schedule.work_type_id,
          scheduled_start_time: scheduledStart,
          scheduled_end_time: scheduledEnd,
          ...calculations,
        })
        .eq("id", attendance.id)
      
      if (updateError) {
        console.error(`[updateAttendanceFromSchedule] Error updating leave attendance:`, updateError)
        throw updateError
      }
      
      // 마일리지 동기화
      const { supabaseWorkMileageStorage } = await import("./supabase-work-mileage-storage")
      await supabaseWorkMileageStorage.syncFromAttendance(
        memberId,
        workDate,
        attendance.id,
        calculations.late_minutes,
        calculations.early_leave_minutes,
        calculations.overtime_minutes,
        'attendance'  // source 추가
      )
      return
    }
    
    // 일반 휴가, 휴무일인 경우
    if (workType?.is_leave || workType?.is_holiday) {
      // 휴무일에 출근한 경우 전체 근무시간을 초과근무로 계산
      const calculations = this.calculateAttendanceMetrics(
        attendance.check_in_time,
        attendance.check_out_time,
        null,
        null,
        true
      )
      
      const { error: updateError } = await supabase
        .from("attendance_records")
        .update({
          schedule_id: schedule.id,
          work_type_id: schedule.work_type_id,
          scheduled_start_time: null,
          scheduled_end_time: null,
          ...calculations,
        })
        .eq("id", attendance.id)
      
      if (updateError) {
        console.error(`[updateAttendanceFromSchedule] Error updating holiday/off attendance:`, updateError)
        throw updateError
      }
      
      // 마일리지 동기화
      const { supabaseWorkMileageStorage } = await import("./supabase-work-mileage-storage")
      await supabaseWorkMileageStorage.syncFromAttendance(
        memberId,
        workDate,
        attendance.id,
        calculations.late_minutes,
        calculations.early_leave_minutes,
        calculations.overtime_minutes,
        'attendance'  // source 추가
      )
      return
    }
    
    // 정규 근무일: 지각, 초과근무 재계산
    const calculations = this.calculateAttendanceMetrics(
      attendance.check_in_time,
      attendance.check_out_time,
      workType?.start_time,
      workType?.end_time,
      false
    )
    
    // 근태 기록 업데이트
    console.log(`[updateAttendanceFromSchedule] Updating regular work day attendance with:`, {
      schedule_id: schedule.id,
      work_type_id: schedule.work_type_id,
      scheduled_start_time: workType?.start_time,
      scheduled_end_time: workType?.end_time,
      calculations
    })
    
    const { error: updateError } = await supabase
      .from("attendance_records")
      .update({
        schedule_id: schedule.id,
        work_type_id: schedule.work_type_id,
        scheduled_start_time: workType?.start_time,
        scheduled_end_time: workType?.end_time,
        ...calculations,
      })
      .eq("id", attendance.id)
    
    if (updateError) {
      console.error(`[updateAttendanceFromSchedule] Error updating attendance record:`, updateError)
      throw updateError
    }
    
    console.log(`[updateAttendanceFromSchedule] Successfully updated attendance record`)
    
    // 마일리지 동기화
    const { supabaseWorkMileageStorage } = await import("./supabase-work-mileage-storage")
    await supabaseWorkMileageStorage.syncFromAttendance(
      memberId,
      workDate,
      attendance.id,
      calculations.late_minutes,
      calculations.early_leave_minutes,
      calculations.overtime_minutes,
      'schedule'  // 근무표 변경에 의한 업데이트
    )
  }
  
  // 특정 날짜의 모든 근태 기록 업데이트
  async refreshAttendanceForDate(workDate: string): Promise<void> {
    console.log(`[refreshAttendanceForDate] Starting refresh for date: ${workDate}`)
    
    // 해당 날짜의 모든 근태 기록 조회
    const { data: records, error } = await supabase
      .from("attendance_records")
      .select("member_id")
      .eq("work_date", workDate)
    
    if (error) {
      console.error(`[refreshAttendanceForDate] Error fetching records for ${workDate}:`, error)
      return
    }
    
    if (!records || records.length === 0) {
      console.log(`[refreshAttendanceForDate] No attendance records found for ${workDate}`)
      return
    }
    
    console.log(`[refreshAttendanceForDate] Found ${records.length} attendance records for ${workDate}`)
    
    // 각 구성원별로 업데이트
    const uniqueMemberIds = [...new Set(records.map(r => r.member_id).filter(Boolean))]
    console.log(`[refreshAttendanceForDate] Updating ${uniqueMemberIds.length} unique members:`, uniqueMemberIds)
    
    for (const memberId of uniqueMemberIds) {
      if (memberId) {
        try {
          console.log(`[refreshAttendanceForDate] Updating attendance for member ${memberId} on ${workDate}`)
          await this.updateAttendanceFromSchedule(memberId, workDate)
          console.log(`[refreshAttendanceForDate] Successfully updated attendance for member ${memberId}`)
        } catch (error) {
          console.error(`[refreshAttendanceForDate] Failed to update attendance for member ${memberId}:`, error)
        }
      }
    }
    
    console.log(`[refreshAttendanceForDate] Completed refresh for date: ${workDate}`)
  }
  
  // ==================== 초과근무 정산 ====================
  
  // 월별 초과근무 정산 생성
  async createOvertimeSettlement(
    memberId: string,
    yearMonth: string
  ): Promise<OvertimeSettlement> {
    // 해당 월의 근태 요약 가져오기
    const summary = await this.getMonthlySummary(memberId, yearMonth)
    
    // 기존 정산 확인
    const { data: existing } = await supabase
      .from("overtime_settlements")
      .select("*")
      .eq("member_id", memberId)
      .eq("settlement_month", yearMonth)
      .single()
    
    if (existing && existing.settlement_status === "completed") {
      throw new Error("이미 정산 완료된 월입니다.")
    }
    
    const settlementData = {
      member_id: memberId,
      member_name: summary.member_name,
      settlement_month: yearMonth,
      total_overtime_minutes: summary.total_overtime_minutes,
      total_late_minutes: summary.total_late_minutes,
      late_count: summary.late_days,
      net_overtime_minutes: summary.net_overtime_minutes,
      settlement_status: "pending" as const,
    }
    
    if (existing) {
      // 업데이트
      const { data, error } = await supabase
        .from("overtime_settlements")
        .update(settlementData)
        .eq("id", existing.id)
        .select()
        .single()
      
      if (error) throw error
      return data
    } else {
      // 생성
      const { data, error } = await supabase
        .from("overtime_settlements")
        .insert(settlementData)
        .select()
        .single()
      
      if (error) throw error
      return data
    }
  }
  
  // 초과근무 정산 완료 처리
  async completeOvertimeSettlement(
    settlementId: string,
    convertedLeaveDays: number,
    settledBy: string,
    note?: string
  ): Promise<void> {
    const { error } = await supabase
      .from("overtime_settlements")
      .update({
        converted_leave_days: convertedLeaveDays,
        settlement_status: "completed",
        settled_by: settledBy,
        settled_at: new Date().toISOString(),
        settlement_note: note,
      })
      .eq("id", settlementId)
    
    if (error) throw error
  }
  
  // 초과근무 정산 목록 조회
  async getOvertimeSettlements(
    memberId?: string,
    status?: OvertimeSettlement["settlement_status"]
  ): Promise<OvertimeSettlement[]> {
    let query = supabase
      .from("overtime_settlements")
      .select("*")
    
    if (memberId) {
      query = query.eq("member_id", memberId)
    }
    
    if (status) {
      query = query.eq("settlement_status", status)
    }
    
    const { data, error } = await query
      .order("settlement_month", { ascending: false })
    
    if (error) throw error
    return data || []
  }
  
  // ==================== 근태 기록 삭제 ====================
  
  // 근태 기록 삭제
  async deleteAttendanceRecord(recordId: string): Promise<void> {
    // 1. 삭제하기 전에 기록 정보 조회
    const { data: record, error: fetchError } = await supabase
      .from("attendance_records")
      .select("member_id, work_date")
      .eq("id", recordId)
      .single()
    
    if (fetchError) {
      console.error("Error fetching attendance record:", fetchError)
      throw new Error("근태 기록 조회 중 오류가 발생했습니다.")
    }
    
    // 2. 근태 기록 삭제
    const { error: deleteError } = await supabase
      .from("attendance_records")
      .delete()
      .eq("id", recordId)
    
    if (deleteError) {
      console.error("Error deleting attendance record:", deleteError)
      throw new Error("근태 기록 삭제 중 오류가 발생했습니다.")
    }
    
    // 3. 마일리지 업데이트 (삭제된 근태의 마일리지를 0으로 설정)
    if (record) {
      const { supabaseWorkMileageStorage } = await import("./supabase-work-mileage-storage")
      await supabaseWorkMileageStorage.syncFromAttendance(
        record.member_id,
        record.work_date,
        undefined,  // attendance ID 없음 (삭제됨)
        0,  // late_minutes
        0,  // early_leave_minutes
        0,  // overtime_minutes
        'attendance'  // source
      )
    }
  }
}

// 싱글톤 인스턴스
export const supabaseAttendanceStorage = new SupabaseAttendanceStorage()