import { supabase } from "./supabase"
import type { Database } from "@/types/database"
import type {
  WorkScheduleEntry,
  WeeklyScheduleView,
  TeamSchedule,
  MemberSchedule,
  DailySchedule,
} from "@/types/work-schedule"

type WorkScheduleEntryDB = Database["public"]["Tables"]["work_schedule_entries"]["Row"]
type WorkScheduleEntryInsert = Database["public"]["Tables"]["work_schedule_entries"]["Insert"]

export const supabaseWorkScheduleStorage = {
  async getMonthlyScheduledDays(memberId: string, yearMonth: string): Promise<number> {
    const [year, month] = yearMonth.split("-")
    const startDate = `${yearMonth}-01`
    const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate()
    const endDate = `${yearMonth}-${lastDay}`

    // 먼저 해당 기간의 work_schedule_entries 가져오기
    const { data: scheduleData, error: scheduleError } = await supabase
      .from("work_schedule_entries")
      .select("date, work_type_id")
      .eq("member_id", memberId)
      .gte("date", startDate)
      .lte("date", endDate)

    if (scheduleError) {
      console.error("Error fetching schedule entries:", scheduleError)
      return 0
    }

    if (!scheduleData || scheduleData.length === 0) {
      return 0
    }

    // work_types 정보 가져오기
    const workTypeIds = [...new Set(scheduleData.map(s => s.work_type_id).filter(Boolean))]
    const { data: workTypes, error: typesError } = await supabase
      .from("work_types")
      .select("id, name, is_leave, is_holiday")
      .in("id", workTypeIds)

    if (typesError) {
      console.error("Error fetching work types:", typesError)
      return 0
    }

    // work_types를 맵으로 변환
    const workTypeMap = new Map(workTypes?.map(wt => [wt.id, wt]) || [])

    // 연차와 휴일이 아닌 실제 근무일만 카운트
    const workDays = scheduleData.filter((entry) => {
      // pending이나 none은 제외
      if (!entry.work_type_id || entry.work_type_id === "pending" || entry.work_type_id === "none") {
        return false
      }
      
      // work_type 정보 확인
      const workType = workTypeMap.get(entry.work_type_id)
      
      // is_leave나 is_holiday가 true인 경우 제외
      if (workType && (workType.is_leave || workType.is_holiday)) {
        return false
      }
      
      return true
    }).length

    return workDays
  },

  async getScheduleEntries(): Promise<WorkScheduleEntry[]> {
    const { data, error } = await supabase.from("work_schedule_entries").select("*").order("date", { ascending: true })

    if (error) {
      console.error("Error fetching schedule entries:", error)
      return []
    }

    return (
      data?.map((entry) => ({
        id: entry.id,
        memberId: entry.member_id,
        date: entry.date,
        workTypeId: entry.work_type_id,
        createdAt: entry.created_at,
        updatedAt: entry.updated_at,
      })) || []
    )
  },

  async getWeeklySchedule(weekStart: string): Promise<WeeklyScheduleView> {
    const startDate = new Date(weekStart)
    const endDate = new Date(startDate)
    endDate.setDate(startDate.getDate() + 6)

    // 팀, 모든 구성원, 근무 유형, 스케줄 엔트리 데이터 가져오기
    const [teamsResult, membersResult, workTypesResult, entriesResult] = await Promise.all([
      supabase.from("teams").select("*").order("name"),
      supabase
        .from("members")
        .select("*")
        .order("name"), // 모든 구성원 조회 (활성/퇴사 상관없이)
      supabase.from("work_types").select("*"),
      supabase
        .from("work_schedule_entries")
        .select("*")
        .gte("date", weekStart)
        .lte("date", endDate.toISOString().split("T")[0]),
    ])

    const teams = teamsResult.data || []
    const members = membersResult.data || []
    const workTypes = workTypesResult.data || []
    const entries = entriesResult.data || []

    // 팀별로 그룹화
    const teamSchedules: TeamSchedule[] = teams.map((team) => {
      const teamMembers = members.filter((member) => member.team_id === team.id)

      const memberSchedules: MemberSchedule[] = teamMembers
        .map((member) => {
          const dailySchedules: DailySchedule[] = []
          let hasVisibleSchedule = false // 해당 주에 표시할 일정이 있는지 확인

          for (let i = 0; i < 7; i++) {
            const currentDate = new Date(startDate)
            currentDate.setDate(startDate.getDate() + i)
            const dateStr = currentDate.toISOString().split("T")[0]

            // 입사일 확인
            const joinDate = new Date(member.join_date)
            const isBeforeJoinDate = currentDate < joinDate

            // 퇴사일 확인 - 퇴사일 다음날부터 숨김
            let isAfterTerminationDate = false
            if (member.termination_date && member.status === "terminated") {
              const terminationDate = new Date(member.termination_date)
              // 퇴사일까지는 표시, 그 다음날부터 숨김
              isAfterTerminationDate = currentDate > terminationDate
            }

            if (isBeforeJoinDate || isAfterTerminationDate) {
              dailySchedules.push({
                date: dateStr,
                workTypeId: "none",
                workTypeName: "",
                workTypeColor: "bg-gray-100",
                isEditable: false,
              })
              continue
            }

            // 이 날짜는 표시 가능한 날짜
            hasVisibleSchedule = true

            // 해당 날짜의 스케줄 찾기
            const scheduleEntry = entries.find((entry) => entry.member_id === member.id && entry.date === dateStr)

            let workTypeId = "pending"
            let workTypeName = "미정"
            let workTypeColor = "bg-gray-200 text-gray-600"
            let startTime: string | undefined
            let endTime: string | undefined

            if (scheduleEntry) {
              workTypeId = scheduleEntry.work_type_id

              const workType = workTypes.find((wt) => wt.id === workTypeId)
              if (workType) {
                workTypeName = workType.name
                startTime = workType.start_time
                endTime = workType.end_time
                // 동적 색상 적용
                workTypeColor = `${workType.bgcolor} ${workType.fontcolor}`
              }
            }

            // 연차인 경우 편집 불가 (is_leave가 true인 휴가 유형)
            const workType = workTypes.find((wt) => wt.id === workTypeId)
            const isLeaveSchedule = workType && workType.is_leave === true
            
            dailySchedules.push({
              date: dateStr,
              workTypeId,
              workTypeName,
              workTypeColor,
              startTime,
              endTime,
              isEditable: member.status === "active" && !isLeaveSchedule, // 활성 구성원이면서 연차가 아닌 경우만 편집 가능
            })
          }

          // 해당 주에 표시할 일정이 없으면 null 반환 (필터링됨)
          if (!hasVisibleSchedule) {
            return null
          }

          return {
            memberId: member.id,
            memberName: member.name,
            joinDate: member.join_date,
            schedule: dailySchedules,
          }
        })
        .filter((memberSchedule) => memberSchedule !== null) as MemberSchedule[] // null 제거

      return {
        teamId: team.id,
        teamName: team.name,
        members: memberSchedules,
      }
    })

    return {
      weekStart,
      weekEnd: endDate.toISOString().split("T")[0],
      teams: teamSchedules,
    }
  },

  async updateScheduleEntry(memberId: string, date: string, workTypeId: string): Promise<void> {
    const { error } = await supabase.from("work_schedule_entries").upsert({
      member_id: memberId,
      date,
      work_type_id: workTypeId,
    })

    if (error) {
      console.error("Error updating schedule entry:", error)
    }
  },

  async batchUpdateSchedule(updates: Array<{ memberId: string; date: string; workTypeId: string }>): Promise<void> {
    try {
      console.log("Starting batch update with", updates.length, "entries")
      console.log("Sample updates:", updates.slice(0, 3))

      if (updates.length === 0) {
        console.log("No updates to process")
        return
      }

      const entries = updates.map((update) => ({
        member_id: update.memberId,
        date: update.date,
        work_type_id: update.workTypeId,
      }))

      console.log("Mapped entries:", entries.slice(0, 3))

      // 배치 크기를 줄여서 처리
      const batchSize = 50
      let totalUpdated = 0
      const allUpdatedInfo = new Map<string, Set<string>>() // date -> memberIds

      for (let i = 0; i < entries.length; i += batchSize) {
        const batch = entries.slice(i, i + batchSize)
        console.log(`Processing batch ${Math.floor(i / batchSize) + 1}, entries: ${batch.length}`)

        const { data, error } = await supabase
          .from("work_schedule_entries")
          .upsert(batch, {
            onConflict: "member_id,date",
            ignoreDuplicates: false,
          })
          .select()

        if (error) {
          console.error("Error in batch upsert:", error)
          console.error("Error code:", error.code)
          console.error("Error message:", error.message)
          console.error("Error details:", error.details)
          console.error("Error hint:", error.hint)
          console.error("Failed batch:", batch)
          throw new Error(`Database error: ${error.message || "Unknown error"}`)
        }

        totalUpdated += data?.length || batch.length
        console.log(`Batch ${Math.floor(i / batchSize) + 1} completed, updated: ${data?.length || batch.length}`)
        
        // 업데이트된 날짜와 구성원 정보 수집
        batch.forEach(entry => {
          if (!allUpdatedInfo.has(entry.date)) {
            allUpdatedInfo.set(entry.date, new Set())
          }
          allUpdatedInfo.get(entry.date)?.add(entry.member_id)
        })
      }

      // 최적화: 근태 기록이 있는 경우만 업데이트
      console.log(`[Optimization] Checking attendance for ${allUpdatedInfo.size} dates`)
      
      // 모든 업데이트된 날짜와 구성원에 대한 근태 기록 조회
      const allDates = Array.from(allUpdatedInfo.keys())
      const allMemberIds = Array.from(new Set(
        Array.from(allUpdatedInfo.values()).flatMap(set => Array.from(set))
      ))
      
      const { data: attendanceRecords } = await supabase
        .from("attendance_records")
        .select("work_date, member_id")
        .in("work_date", allDates)
        .in("member_id", allMemberIds)
      
      if (attendanceRecords && attendanceRecords.length > 0) {
        // 날짜별로 근태가 있는 구성원 그룹화
        const attendanceByDate = new Map<string, Set<string>>()
        attendanceRecords.forEach(record => {
          if (!attendanceByDate.has(record.work_date)) {
            attendanceByDate.set(record.work_date, new Set())
          }
          attendanceByDate.get(record.work_date)?.add(record.member_id)
        })
        
        console.log(`[Optimization] Found attendance records on ${attendanceByDate.size} dates`)
        
        // 모든 업데이트를 Promise 배열로 준비
        const updatePromises: Array<() => Promise<void>> = []
        
        for (const [date, memberIdsWithAttendance] of attendanceByDate) {
          const updatedMemberIds = allUpdatedInfo.get(date)
          if (updatedMemberIds) {
            // 업데이트된 구성원 중 근태가 있는 구성원만 필터링
            const membersToUpdate = Array.from(memberIdsWithAttendance).filter(
              memberId => updatedMemberIds.has(memberId)
            )
            
            if (membersToUpdate.length > 0) {
              updatePromises.push(() => 
                this.batchUpdateAttendanceAndMileage(date, membersToUpdate)
              )
            }
          }
        }
        
        // 청크 단위로 병렬 처리
        const chunkSize = 5 // 날짜별 처리이므로 청크 크기를 작게
        console.log(`[Optimization] Processing ${updatePromises.length} date batches in parallel`)
        
        for (let i = 0; i < updatePromises.length; i += chunkSize) {
          const chunk = updatePromises.slice(i, i + chunkSize)
          await Promise.all(chunk.map(fn => fn()))
          console.log(`[Optimization] Processed ${Math.min(i + chunkSize, updatePromises.length)}/${updatePromises.length} date batches`)
        }
      } else {
        console.log(`[Optimization] No attendance records found for updated schedules, skipping updates`)
      }

      console.log(`Successfully updated ${totalUpdated} schedule entries`)
    } catch (error) {
      console.error("Error batch updating schedule:", error)
      console.error("Error type:", typeof error)

      // 타입 안전한 에러 처리
      if (error instanceof Error) {
        console.error("Error name:", error.name)
        console.error("Error message:", error.message)
        console.error("Error stack:", error.stack)
      } else {
        console.error("Unknown error format:", error)
      }

      throw error // 에러를 다시 던져서 상위에서 처리할 수 있도록 함
    }
  },

  getCurrentWeekStart(): string {
    const today = new Date()
    const currentWeekStart = new Date(today)
    currentWeekStart.setDate(today.getDate() - today.getDay() + 1)
    return currentWeekStart.toISOString().split("T")[0]
  },

  getWeekStart(date: string): string {
    const targetDate = new Date(date)
    const weekStart = new Date(targetDate)
    weekStart.setDate(targetDate.getDate() - targetDate.getDay() + 1)
    return weekStart.toISOString().split("T")[0]
  },

  addWeeks(weekStart: string, weeks: number): string {
    const date = new Date(weekStart)
    date.setDate(date.getDate() + weeks * 7)
    return date.toISOString().split("T")[0]
  },

  async bulkCreateSchedule(memberIds: string[], startDate: string, endDate: string): Promise<{created: number, skippedLeave: number}> {
    try {
      // 활성 구성원만 조회
      const { data: members } = await supabase.from("members").select("*").in("id", memberIds).eq("status", "active")

      if (!members || members.length === 0) {
        console.error("No active members found for the given IDs")
        return {created: 0, skippedLeave: 0}
      }

      // 연차 근무 유형들 조회 (보호할 근무 유형들) - is_leave가 true인 휴가 유형
      const { data: leaveWorkTypes } = await supabase
        .from("work_types")
        .select("id")
        .eq("is_leave", true)

      const leaveWorkTypeIds = leaveWorkTypes?.map(wt => wt.id) || []

      // 해당 기간의 기존 연차 일정 조회
      const { data: existingLeaveSchedules } = await supabase
        .from("work_schedule_entries")
        .select("member_id, date, work_type_id")
        .in("member_id", memberIds)
        .gte("date", startDate)
        .lte("date", endDate)
        .in("work_type_id", leaveWorkTypeIds)

      // 연차가 있는 날짜들을 맵으로 저장
      const leaveScheduleMap = new Map<string, Set<string>>()
      existingLeaveSchedules?.forEach(schedule => {
        const key = `${schedule.member_id}:${schedule.date}`
        if (!leaveScheduleMap.has(schedule.member_id)) {
          leaveScheduleMap.set(schedule.member_id, new Set())
        }
        leaveScheduleMap.get(schedule.member_id)?.add(schedule.date)
      })

      const entries: WorkScheduleEntryInsert[] = []
      const start = new Date(startDate)
      const end = new Date(endDate)
      let skippedLeaveCount = 0

      console.log("Creating schedule for date range:", startDate, "to", endDate)
      console.log("Active members found:", members.length)
      console.log("Protected leave schedules found:", existingLeaveSchedules?.length || 0)

      for (const member of members) {
        const joinDate = new Date(member.join_date)
        console.log(`Processing member: ${member.name}, join date: ${member.join_date}`)

        for (let currentDate = new Date(start); currentDate <= end; currentDate.setDate(currentDate.getDate() + 1)) {
          const dateStr = currentDate.toISOString().split("T")[0]

          // 입사일 이전은 건너뛰기
          if (currentDate < joinDate) {
            console.log(`Skipping ${dateStr} for ${member.name} (before join date)`)
            continue
          }

          // 퇴사일 이후는 건너뛰기
          if (member.termination_date) {
            const terminationDate = new Date(member.termination_date)
            if (currentDate > terminationDate) {
              console.log(`Skipping ${dateStr} for ${member.name} (after termination date)`)
              continue
            }
          }

          // 연차가 있는 날짜는 건너뛰기 (연차 보호)
          if (leaveScheduleMap.get(member.id)?.has(dateStr)) {
            console.log(`Skipping ${dateStr} for ${member.name} (protected leave schedule)`)
            skippedLeaveCount++
            continue
          }

          // 요일 계산 (0: 일요일, 1: 월요일, ..., 6: 토요일)
          const dayOfWeek = currentDate.getDay()
          const dayKeys = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]
          const dayKey = dayKeys[dayOfWeek]

          // 해당 요일의 근무 유형 가져오기
          const workTypeId = member.weekly_schedule[dayKey]

          if (!workTypeId) {
            console.warn(`No work type found for ${member.name} on ${dayKey}`)
            continue
          }

          entries.push({
            member_id: member.id,
            date: dateStr,
            work_type_id: workTypeId,
          })
        }
      }

      console.log(`Total entries to create: ${entries.length}`)

      if (entries.length === 0) {
        console.log("No entries to create")
        return {created: 0, skippedLeave: skippedLeaveCount}
      }

      // 배치 크기를 줄여서 처리 (한 번에 너무 많은 데이터를 처리하지 않도록)
      const batchSize = 100
      let totalCreated = 0
      const allCreatedDates = new Set<string>()

      for (let i = 0; i < entries.length; i += batchSize) {
        const batch = entries.slice(i, i + batchSize)
        console.log(`Processing batch ${Math.floor(i / batchSize) + 1}, entries: ${batch.length}`)

        const { data, error } = await supabase
          .from("work_schedule_entries")
          .upsert(batch, {
            onConflict: "member_id,date",
            ignoreDuplicates: false,
          })
          .select()

        if (error) {
          console.error("Error in batch upsert:", error)
          console.error("Error details:", JSON.stringify(error, null, 2))
          console.error("Failed batch sample:", batch.slice(0, 3))
          throw error
        }

        totalCreated += data?.length || batch.length
        console.log(`Batch completed, created: ${data?.length || batch.length}`)
        
        // 생성된 날짜들 수집
        batch.forEach(entry => allCreatedDates.add(entry.date))
      }

      // 최적화: 근태 기록이 있는 날짜만 필터링해서 업데이트
      console.log(`[Optimization] Checking attendance records for ${allCreatedDates.size} dates`)
      
      // 해당 기간 내 근태 기록이 있는 날짜와 구성원 조회
      const { data: attendanceRecords } = await supabase
        .from("attendance_records")
        .select("work_date, member_id")
        .in("member_id", memberIds)
        .gte("work_date", startDate)
        .lte("work_date", endDate)
      
      if (attendanceRecords && attendanceRecords.length > 0) {
        // 날짜별로 그룹화
        const attendanceByDate = new Map<string, Set<string>>()
        attendanceRecords.forEach(record => {
          if (!attendanceByDate.has(record.work_date)) {
            attendanceByDate.set(record.work_date, new Set())
          }
          attendanceByDate.get(record.work_date)?.add(record.member_id)
        })
        
        console.log(`[Optimization] Found attendance records on ${attendanceByDate.size} dates`)
        
        // 모든 업데이트를 Promise 배열로 준비
        const updatePromises: Array<() => Promise<void>> = []
        
        for (const [date, memberIdsWithAttendance] of attendanceByDate) {
          if (allCreatedDates.has(date)) {
            updatePromises.push(() => 
              this.batchUpdateAttendanceAndMileage(date, Array.from(memberIdsWithAttendance))
            )
          }
        }
        
        // 청크 단위로 병렬 처리
        const chunkSize = 5 // 날짜별 처리이므로 청크 크기를 작게
        console.log(`[Optimization] Processing ${updatePromises.length} date batches in parallel`)
        
        for (let i = 0; i < updatePromises.length; i += chunkSize) {
          const chunk = updatePromises.slice(i, i + chunkSize)
          await Promise.all(chunk.map(fn => fn()))
          console.log(`[Optimization] Processed ${Math.min(i + chunkSize, updatePromises.length)}/${updatePromises.length} date batches`)
        }
      } else {
        console.log(`[Optimization] No attendance records found in the date range, skipping updates`)
      }

      console.log(`Successfully created ${totalCreated} schedule entries`)
      console.log(`Skipped ${skippedLeaveCount} entries due to existing leave schedules`)
      return {created: totalCreated, skippedLeave: skippedLeaveCount}
    } catch (error) {
      console.error("Error bulk creating schedule:", error)
      console.error("Error type:", typeof error)

      // 타입 안전한 에러 처리
      if (error instanceof Error) {
        console.error("Error message:", error.message)
      } else {
        console.error("Unknown error format:", error)
      }

      console.error("Error details:", JSON.stringify(error, null, 2))
      return {created: 0, skippedLeave: 0}
    }
  },

  // 새로운 배치 업데이트 함수
  async batchUpdateAttendanceAndMileage(workDate: string, memberIds: string[]): Promise<void> {
    try {
      console.log(`[Batch Update] Starting for ${memberIds.length} members on ${workDate}`)
      
      // 1. 필요한 데이터 한 번에 조회
      const [scheduleResult, attendanceResult, workTypeResult] = await Promise.all([
        // 근무표 조회
        supabase
          .from("work_schedule_entries")
          .select("id, member_id, work_type_id, original_work_type_id")
          .eq("date", workDate)
          .in("member_id", memberIds),
        
        // 근태 기록 조회
        supabase
          .from("attendance_records")
          .select("*")
          .eq("work_date", workDate)
          .in("member_id", memberIds),
        
        // 근무 유형 조회
        supabase
          .from("work_types")
          .select("*")
      ])
      
      const schedules = scheduleResult.data || []
      const attendances = attendanceResult.data || []
      const workTypes = workTypeResult.data || []
      
      // 맵으로 변환 (빠른 조회)
      const scheduleMap = new Map(schedules.map(s => [s.member_id, s]))
      const workTypeMap = new Map(workTypes.map(w => [w.id, w]))
      
      // 2. 각 근태 기록에 대해 계산
      const attendanceUpdates = []
      const mileageUpdates = []
      
      for (const attendance of attendances) {
        const schedule = scheduleMap.get(attendance.member_id)
        if (!schedule) continue
        
        const workType = workTypeMap.get(schedule.work_type_id)
        if (!workType) continue
        
        // 근무 시간 계산 (휴가 처리 포함)
        let scheduledStart = workType.start_time
        let scheduledEnd = workType.end_time
        let isHoliday = workType.is_holiday || workType.is_leave || workType.name === "오프"
        
        // 반차 처리
        if (workType.is_leave && schedule.original_work_type_id) {
          const originalWorkType = workTypeMap.get(schedule.original_work_type_id)
          if (originalWorkType) {
            // 스마트한 휴가 시간 계산
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
                isHoliday = false
              } else if (leaveStart > workStart && leaveStart < workEnd && leaveEnd >= workEnd) {
                scheduledStart = originalWorkType.start_time
                scheduledEnd = workType.start_time
                isHoliday = false
              }
            }
          }
        }
        
        // 지각, 조기퇴근, 초과근무 계산
        const metrics = this.calculateAttendanceMetrics(
          attendance.check_in_time,
          attendance.check_out_time,
          scheduledStart,
          scheduledEnd,
          isHoliday
        )
        
        // 근태 업데이트 데이터 준비
        attendanceUpdates.push({
          id: attendance.id,
          schedule_id: schedule.id,
          work_type_id: schedule.work_type_id,
          scheduled_start_time: isHoliday ? null : scheduledStart,
          scheduled_end_time: isHoliday ? null : scheduledEnd,
          is_late: metrics.is_late,
          late_minutes: metrics.late_minutes,
          is_early_leave: metrics.is_early_leave,
          early_leave_minutes: metrics.early_leave_minutes,
          overtime_minutes: metrics.overtime_minutes,
          actual_work_minutes: metrics.actual_work_minutes
        })
        
        // 마일리지 업데이트 데이터 준비
        mileageUpdates.push({
          memberId: attendance.member_id,
          attendanceId: attendance.id,
          lateMinutes: metrics.late_minutes,
          earlyLeaveMinutes: metrics.early_leave_minutes,
          overtimeMinutes: metrics.overtime_minutes
        })
      }
      
      // 3. 진짜 배치로 업데이트 (병렬 처리)
      if (attendanceUpdates.length > 0) {
        console.log(`[Batch Update] Updating ${attendanceUpdates.length} attendance records`)
        
        // 근태 기록 병렬 업데이트 (청크 단위)
        const chunkSize = 10
        for (let i = 0; i < attendanceUpdates.length; i += chunkSize) {
          const chunk = attendanceUpdates.slice(i, i + chunkSize)
          const updatePromises = chunk.map(update => {
            const { id, ...updateData } = update
            return supabase
              .from("attendance_records")
              .update(updateData)
              .eq("id", id)
          })
          
          await Promise.all(updatePromises)
          console.log(`[Batch Update] Attendance updated: ${Math.min(i + chunkSize, attendanceUpdates.length)}/${attendanceUpdates.length}`)
        }
        
        // 마일리지 병렬 업데이트
        const { supabaseWorkMileageStorage } = await import("./supabase-work-mileage-storage")
        
        for (let i = 0; i < mileageUpdates.length; i += chunkSize) {
          const chunk = mileageUpdates.slice(i, i + chunkSize)
          const mileagePromises = chunk.map(mileage => 
            supabaseWorkMileageStorage.syncFromAttendance(
              mileage.memberId,
              workDate,
              mileage.attendanceId,
              mileage.lateMinutes,
              mileage.earlyLeaveMinutes,
              mileage.overtimeMinutes,
              'schedule'
            )
          )
          
          await Promise.all(mileagePromises)
          console.log(`[Batch Update] Mileage updated: ${Math.min(i + chunkSize, mileageUpdates.length)}/${mileageUpdates.length}`)
        }
        
        console.log(`[Batch Update] Completed for ${workDate}`)
      }
    } catch (error) {
      console.error(`[Batch Update] Error for date ${workDate}:`, error)
    }
  },

  // 시간 문자열을 분 단위로 변환 (헬퍼 함수)
  timeToMinutes(time: string | null | undefined): number {
    if (!time) return 0
    const [hours, minutes] = time.split(':').map(Number)
    return hours * 60 + minutes
  },

  // 근태 메트릭 계산 (헬퍼 함수)
  calculateAttendanceMetrics(
    checkIn: string | null,
    checkOut: string | null,
    scheduledStart: string | null,
    scheduledEnd: string | null,
    isHoliday: boolean
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
    
    const checkInTime = this.timeToMinutes(checkIn)
    const checkOutTime = this.timeToMinutes(checkOut)
    result.actual_work_minutes = checkOutTime - checkInTime
    
    if (isHoliday || !scheduledStart || !scheduledEnd) {
      result.overtime_minutes = result.actual_work_minutes
      return result
    }
    
    const scheduledStartTime = this.timeToMinutes(scheduledStart)
    const scheduledEndTime = this.timeToMinutes(scheduledEnd)
    
    if (checkInTime > scheduledStartTime) {
      result.is_late = true
      result.late_minutes = checkInTime - scheduledStartTime
    }
    
    if (checkOutTime < scheduledEndTime) {
      result.is_early_leave = true
      result.early_leave_minutes = scheduledEndTime - checkOutTime
    }
    
    if (checkOutTime > scheduledEndTime) {
      result.overtime_minutes = checkOutTime - scheduledEndTime
    }
    
    return result
  },

  async bulkDeleteSchedule(memberIds: string[], startDate: string, endDate: string): Promise<{deleted: number, protectedLeave: number}> {
    try {
      console.log("Starting bulk delete for date range:", startDate, "to", endDate)
      console.log("Member IDs:", memberIds)

      if (memberIds.length === 0) {
        console.log("No members selected for deletion")
        return {deleted: 0, protectedLeave: 0}
      }

      // 연차 근무 유형들 조회 (보호할 근무 유형들) - is_leave가 true인 휴가 유형
      const { data: leaveWorkTypes } = await supabase
        .from("work_types")
        .select("id")
        .eq("is_leave", true)

      const leaveWorkTypeIds = leaveWorkTypes?.map(wt => wt.id) || []

      // 삭제할 엔트리 조회 (연차 구분)
      const { data: existingEntries, error: selectError } = await supabase
        .from("work_schedule_entries")
        .select("id, work_type_id, member_id, date")
        .in("member_id", memberIds)
        .gte("date", startDate)
        .lte("date", endDate)

      if (selectError) {
        console.error("Error selecting entries for deletion:", selectError)
        throw selectError
      }

      const totalEntries = existingEntries?.length || 0
      const leaveEntries = existingEntries?.filter(entry => 
        leaveWorkTypeIds.includes(entry.work_type_id)
      ) || []
      const regularEntries = existingEntries?.filter(entry => 
        !leaveWorkTypeIds.includes(entry.work_type_id)
      ) || []

      console.log(`Found ${totalEntries} entries total`)
      console.log(`- ${leaveEntries.length} leave entries (protected)`)
      console.log(`- ${regularEntries.length} regular entries (will be deleted)`)

      if (regularEntries.length === 0) {
        console.log("No regular entries found to delete (only protected leave entries)")
        return {deleted: 0, protectedLeave: leaveEntries.length}
      }

      // 삭제하기 전에 관련 근태 기록의 schedule_id를 null로 업데이트
      const regularEntryIds = regularEntries.map(entry => entry.id)
      const deletedDates = [...new Set(regularEntries.map(entry => entry.date))]
      const deletedMemberIds = [...new Set(regularEntries.map(entry => entry.member_id))]
      
      console.log("Updating attendance records to remove schedule references...")
      const { error: updateAttendanceError } = await supabase
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
        .in("schedule_id", regularEntryIds)
      
      if (updateAttendanceError) {
        console.error("Error updating attendance records:", updateAttendanceError)
        throw updateAttendanceError
      }

      // 이제 근무표 삭제
      const { error: deleteError } = await supabase
        .from("work_schedule_entries")
        .delete()
        .in("id", regularEntryIds)

      if (deleteError) {
        console.error("Error deleting schedule entries:", deleteError)
        console.error("Error details:", JSON.stringify(deleteError, null, 2))
        throw deleteError
      }

      // 최적화: 삭제된 근무표와 관련된 근태 기록이 있는 경우만 마일리지 업데이트
      console.log(`[Optimization] Checking affected attendance records for ${deletedDates.length} dates`)
      
      // 삭제된 날짜와 구성원에 해당하는 근태 기록 조회
      const { data: affectedAttendance } = await supabase
        .from("attendance_records")
        .select("id, member_id, work_date")
        .in("member_id", deletedMemberIds)
        .in("work_date", deletedDates)
      
      if (affectedAttendance && affectedAttendance.length > 0) {
        console.log(`[Optimization] Found ${affectedAttendance.length} attendance records affected by deletion`)
        
        // 마일리지를 0으로 설정 (근무표가 삭제되었으므로)
        const { supabaseWorkMileageStorage } = await import("./supabase-work-mileage-storage")
        
        // 날짜별로 그룹화
        const attendanceByDate = new Map<string, Array<{id: string, member_id: string}>>()
        affectedAttendance.forEach(record => {
          if (!attendanceByDate.has(record.work_date)) {
            attendanceByDate.set(record.work_date, [])
          }
          attendanceByDate.get(record.work_date)?.push({
            id: record.id,
            member_id: record.member_id
          })
        })
        
        // 배치로 마일리지 초기화 (병렬 처리)
        const allMileageUpdates: Array<() => Promise<any>> = []
        
        for (const [date, records] of attendanceByDate) {
          console.log(`[Optimization] Preparing mileage reset for ${records.length} members on ${date}`)
          
          for (const record of records) {
            // 마일리지 업데이트 Promise 준비
            allMileageUpdates.push(() => 
              supabaseWorkMileageStorage.syncFromAttendance(
                record.member_id,
                date,
                record.id,
                0,  // late_minutes
                0,  // early_leave_minutes
                0,  // overtime_minutes
                'schedule'  // source
              )
            )
          }
        }
        
        // 청크 단위로 병렬 처리
        const chunkSize = 10
        console.log(`[Optimization] Processing ${allMileageUpdates.length} mileage updates in chunks`)
        
        for (let i = 0; i < allMileageUpdates.length; i += chunkSize) {
          const chunk = allMileageUpdates.slice(i, i + chunkSize)
          await Promise.all(chunk.map(fn => fn()))
          console.log(`[Optimization] Mileage reset progress: ${Math.min(i + chunkSize, allMileageUpdates.length)}/${allMileageUpdates.length}`)
        }
        
        console.log(`[Optimization] Completed mileage reset for affected attendance records`)
      } else {
        console.log(`[Optimization] No attendance records affected by deletion, skipping mileage updates`)
      }
      
      console.log(`Successfully deleted ${regularEntries.length} schedule entries`)
      console.log(`Protected ${leaveEntries.length} leave entries from deletion`)
      return {deleted: regularEntries.length, protectedLeave: leaveEntries.length}
    } catch (error) {
      console.error("Error bulk deleting schedule:", error)
      console.error("Error type:", typeof error)

      // 타입 안전한 에러 처리
      if (error instanceof Error) {
        console.error("Error message:", error.message)
      } else {
        console.error("Unknown error format:", error)
      }

      console.error("Error details:", JSON.stringify(error, null, 2))
      return {deleted: 0, protectedLeave: 0}
    }
  },

  // 연차 관련 근무표 연동 메서드들
  async upsertWorkSchedule(memberId: string, date: string, workTypeId: string): Promise<void> {
    try {
      console.log(`Upserting work schedule: member=${memberId}, date=${date}, workType=${workTypeId}`)
      
      // 현재 근무표 확인
      const { data: existingSchedule } = await supabase
        .from("work_schedule_entries")
        .select("work_type_id")
        .eq("member_id", memberId)
        .eq("date", date)
        .single()
      
      // 휴무일 여부 확인
      if (existingSchedule) {
        const { data: workType } = await supabase
          .from("work_types")
          .select("is_holiday, name")
          .eq("id", existingSchedule.work_type_id)
          .single()
        
        if (workType?.is_holiday) {
          console.log(`${date}은(는) 휴무일(${workType.name})이므로 근무표를 변경하지 않음`)
          return // 휴무일은 근무표 변경하지 않음
        }
      }
      
      const { error } = await supabase
        .from("work_schedule_entries")
        .upsert({
          member_id: memberId,
          date,
          work_type_id: workTypeId,
        }, {
          onConflict: "member_id,date",
          ignoreDuplicates: false,
        })

      if (error) {
        console.error("Error upserting work schedule:", error)
        throw error
      }

      console.log(`Successfully updated work schedule for ${date}`)
      
      // 근태 기록 업데이트
      const { supabaseAttendanceStorage } = await import("./supabase-attendance-storage")
      await supabaseAttendanceStorage.updateAttendanceFromSchedule(memberId, date)
    } catch (error) {
      console.error("Error in upsertWorkSchedule:", error)
      throw error
    }
  },

  async deleteWorkSchedule(memberId: string, date: string): Promise<void> {
    try {
      console.log(`Deleting work schedule: member=${memberId}, date=${date}`)
      
      const { error } = await supabase
        .from("work_schedule_entries")
        .delete()
        .eq("member_id", memberId)
        .eq("date", date)

      if (error) {
        console.error("Error deleting work schedule:", error)
        throw error
      }

      console.log(`Successfully deleted work schedule for ${date}`)
      
      // 근태 기록 업데이트 (근무표가 삭제되었으므로 근무 정보 제거)
      const { supabaseAttendanceStorage } = await import("./supabase-attendance-storage")
      await supabaseAttendanceStorage.updateAttendanceFromSchedule(memberId, date)
    } catch (error) {
      console.error("Error in deleteWorkSchedule:", error)
      throw error
    }
  },

  async getWorkScheduleForDateRange(memberId: string, startDate: string, endDate: string): Promise<WorkScheduleEntry[]> {
    try {
      const { data, error } = await supabase
        .from("work_schedule_entries")
        .select("*")
        .eq("member_id", memberId)
        .gte("date", startDate)
        .lte("date", endDate)
        .order("date")

      if (error) {
        console.error("Error fetching work schedule for date range:", error)
        throw error
      }

      return (data || []).map((entry) => ({
        id: entry.id,
        memberId: entry.member_id,
        date: entry.date,
        workTypeId: entry.work_type_id,
        createdAt: entry.created_at,
        updatedAt: entry.updated_at,
      }))
    } catch (error) {
      console.error("Error in getWorkScheduleForDateRange:", error)
      throw error
    }
  },

  async hasConflictingSchedule(memberId: string, startDate: string, endDate: string, excludeWorkTypes: string[] = []): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from("work_schedule_entries")
        .select("work_type_id")
        .eq("member_id", memberId)
        .gte("date", startDate)
        .lte("date", endDate)

      if (error) {
        console.error("Error checking conflicting schedule:", error)
        return false
      }

      if (!data || data.length === 0) {
        return false
      }

      // 제외할 근무 유형이 아닌 경우 충돌로 간주
      return data.some((entry) => !excludeWorkTypes.includes(entry.work_type_id))
    } catch (error) {
      console.error("Error in hasConflictingSchedule:", error)
      return false
    }
  },
}
