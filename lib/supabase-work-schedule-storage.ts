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

              if (workTypeId === "off") {
                workTypeName = "오프"
                workTypeColor = "bg-gray-200 text-gray-600"
              } else {
                const workType = workTypes.find((wt) => wt.id === workTypeId)
                if (workType) {
                  workTypeName = workType.name
                  startTime = workType.start_time
                  endTime = workType.end_time
                  // 동적 색상 적용
                  workTypeColor = `${workType.bgcolor} ${workType.fontcolor}`
                }
              }
            }

            // 연차인 경우 편집 불가 (deduction_days가 있는 휴가 유형)
            const workType = workTypes.find((wt) => wt.id === workTypeId)
            const isLeaveSchedule = workType && workType.deduction_days !== null && workType.deduction_days !== undefined
            
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

      // 연차 근무 유형들 조회 (보호할 근무 유형들) - deduction_days가 있는 휴가 유형
      const { data: leaveWorkTypes } = await supabase
        .from("work_types")
        .select("id")
        .not("deduction_days", "is", null)

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

  async bulkDeleteSchedule(memberIds: string[], startDate: string, endDate: string): Promise<{deleted: number, protectedLeave: number}> {
    try {
      console.log("Starting bulk delete for date range:", startDate, "to", endDate)
      console.log("Member IDs:", memberIds)

      if (memberIds.length === 0) {
        console.log("No members selected for deletion")
        return {deleted: 0, protectedLeave: 0}
      }

      // 연차 근무 유형들 조회 (보호할 근무 유형들) - deduction_days가 있는 휴가 유형
      const { data: leaveWorkTypes } = await supabase
        .from("work_types")
        .select("id")
        .not("deduction_days", "is", null)

      const leaveWorkTypeIds = leaveWorkTypes?.map(wt => wt.id) || []

      // 삭제할 엔트리 조회 (연차 구분)
      const { data: existingEntries, error: selectError } = await supabase
        .from("work_schedule_entries")
        .select("id, work_type_id")
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

      // 연차가 아닌 엔트리만 삭제
      const regularEntryIds = regularEntries.map(entry => entry.id)
      const { error: deleteError } = await supabase
        .from("work_schedule_entries")
        .delete()
        .in("id", regularEntryIds)

      if (deleteError) {
        console.error("Error deleting schedule entries:", deleteError)
        console.error("Error details:", JSON.stringify(deleteError, null, 2))
        throw deleteError
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
